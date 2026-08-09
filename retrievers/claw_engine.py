"""
retrievers/claw_engine.py — Claw 1.0: Unified Contract Intelligence Retrieval Engine.

Architecture:
  1. Clause-aware structural parsing → parent clauses
  2. Child chunk creation from each parent
  3. MMR search across child chunks for diverse, relevant evidence
  4. Parent clause resolution & deduplication
  5. Evidence validation against source document
  6. Controlled fallback with expanded search
  7. Deterministic clause query templates (no LLM query generation)

User-visible name: "Claw 1.0"
Internal components (MMR, parent-doc, embeddings) are never exposed to the user.
"""

import re
import uuid
import logging
import hashlib
from typing import List, Dict, Any, Tuple, Optional

from langchain_core.documents import Document
from langchain_community.vectorstores import Chroma

from retrievers.base_retriever import get_embedding_function
from config import CHROMA_DB_DIR

logger = logging.getLogger("contractclaw.claw_engine")

# ─── Engine Configuration ────────────────────────────────────────────────────

CLAW_ENGINE_CONFIG = {
    "engine_id": "claw_1_0",
    "engine_name": "Claw 1.0",
    "engine_version": "1.0",
    "description": "Contract intelligence engine",
    "subtitle": "Precise clause retrieval with full section context",
    # Parent (clause-level) chunking
    "parent_target_size": 4800,     # ~1200 tokens
    "parent_overlap_size": 400,     # ~100 tokens
    # Child (search) chunking
    "child_chunk_size": 1000,       # ~250 tokens
    "child_chunk_overlap": 160,     # ~40 tokens
    # MMR search parameters
    "mmr_k": 6,
    "mmr_fetch_k": 20,
    "mmr_lambda_mult": 0.65,
    # Retrieval quality
    "min_retrieval_confidence": 0.62,
    "fallback_fetch_k": 40,
    "max_retrieval_attempts": 2,
    # Result limits
    "max_parent_results": 4,
}

# ─── Deterministic Clause Query Templates ─────────────────────────────────────

CLAUSE_QUERY_TEMPLATES: Dict[str, List[str]] = {
    "intellectual_property": [
        "intellectual property", "work product", "assignment of rights",
        "employee inventions", "prior inventions", "moral rights",
        "third party materials", "IP ownership", "inventions",
    ],
    "confidentiality": [
        "confidential information", "trade secrets", "non-disclosure",
        "proprietary information", "duty of confidentiality", "exclusions",
        "confidentiality obligations", "post-employment confidentiality",
    ],
    "termination": [
        "termination", "notice period", "cause", "severance",
        "resignation", "termination for cause", "at-will",
        "probation termination", "garden leave",
    ],
    "payment": [
        "salary", "compensation", "bonus", "benefits", "pension",
        "health insurance", "base salary", "annual salary",
        "payment terms", "payroll", "deductions",
    ],
    "liability": [
        "limitation of liability", "liability cap", "damages",
        "consequential damages", "aggregate liability", "uncapped liability",
        "indemnification", "hold harmless",
    ],
    "non_compete": [
        "non-compete", "non-solicitation", "restrictive covenant",
        "competing business", "restraint of trade", "geographic restriction",
    ],
    "governing_law": [
        "governing law", "jurisdiction", "dispute resolution",
        "arbitration", "venue", "applicable law", "courts",
    ],
    "general_review": [
        "termination", "liability", "payment", "intellectual property",
        "confidentiality", "indemnification", "non-compete",
        "dispute resolution", "governing law",
    ],
}


# ─── Clause-Aware Structural Splitter ─────────────────────────────────────────

# Regex patterns that identify clause boundaries in legal documents
_CLAUSE_BOUNDARY_PATTERNS = [
    # Numbered clauses: "1.", "1.1", "1.1.1", "Article 1", "Section 1"
    r"(?:^|\n)(?:\d+\.(?:\d+\.?)*)\s+[A-Z]",
    r"(?:^|\n)(?:Article|Section|ARTICLE|SECTION)\s+\d+",
    # Uppercase titled sections: "CONFIDENTIALITY", "TERM AND TERMINATION"
    r"(?:^|\n)(?:[A-Z][A-Z\s&]{4,}\.?\s*\n)",
    # Schedule/Exhibit markers
    r"(?:^|\n)(?:SCHEDULE|EXHIBIT|APPENDIX|ANNEX)\s+[A-Z0-9]",
    # Signature block
    r"(?:^|\n)(?:EMPLOYER SIGNATURE|EMPLOYEE SIGNATURE|IN WITNESS WHEREOF|SIGNED BY)",
]


def _split_into_structural_parents(text: str, max_parent_size: int = 4800) -> List[Dict[str, Any]]:
    """
    Splits contract text into parent clauses using structural legal boundaries.

    Prefers natural clause boundaries over fixed token limits.
    A clause under max_parent_size is kept as one parent.
    A clause over max_parent_size is split at sentence boundaries.

    Returns list of dicts: {parent_id, text, section, clause_number, start_offset, end_offset}
    """
    # Find all boundary positions
    boundaries = set()
    boundaries.add(0)

    for pattern in _CLAUSE_BOUNDARY_PATTERNS:
        for match in re.finditer(pattern, text):
            boundaries.add(match.start())

    boundaries.add(len(text))
    sorted_bounds = sorted(boundaries)

    # Create raw sections from boundaries
    raw_sections: List[Dict[str, Any]] = []
    for i in range(len(sorted_bounds) - 1):
        start = sorted_bounds[i]
        end = sorted_bounds[i + 1]
        section_text = text[start:end].strip()

        if not section_text or len(section_text) < 20:
            # Merge tiny fragments with previous section
            if raw_sections:
                raw_sections[-1]["text"] += "\n" + section_text
                raw_sections[-1]["end_offset"] = end
            continue

        # Extract section heading and clause number
        heading, clause_num = _extract_heading_and_number(section_text)

        raw_sections.append({
            "text": section_text,
            "section": heading,
            "clause_number": clause_num,
            "start_offset": start,
            "end_offset": end,
        })

    # Handle oversized sections: split at sentence boundaries
    parents = []
    for sec in raw_sections:
        if len(sec["text"]) <= max_parent_size:
            parent_id = f"parent_{uuid.uuid4().hex[:12]}"
            parents.append({
                "parent_id": parent_id,
                "text": sec["text"],
                "section": sec["section"],
                "clause_number": sec["clause_number"],
                "start_offset": sec["start_offset"],
                "end_offset": sec["end_offset"],
            })
        else:
            # Split oversized section at sentence boundaries
            sub_parts = _split_oversized_section(sec["text"], max_parent_size)
            for idx, part in enumerate(sub_parts):
                parent_id = f"parent_{uuid.uuid4().hex[:12]}"
                parents.append({
                    "parent_id": parent_id,
                    "text": part,
                    "section": f"{sec['section']} (Part {idx+1})",
                    "clause_number": sec["clause_number"],
                    "start_offset": sec["start_offset"],
                    "end_offset": sec["end_offset"],
                })

    # Fallback: if structural parsing produced nothing useful, use fixed-size chunking
    if len(parents) <= 1 and len(text) > max_parent_size:
        parents = _fallback_fixed_size_parents(text, max_parent_size)

    return parents


def _extract_heading_and_number(text: str) -> Tuple[str, str]:
    """Extracts section heading and clause number from the first line of a section."""
    first_line = text.split("\n")[0].strip()

    clause_num = ""
    title_raw = first_line

    num_match = re.match(r"^(\d+(?:\.\d+)*)\.?\s*(.*)", first_line)
    if num_match:
        clause_num = num_match.group(1)
        title_raw = num_match.group(2).strip()
    else:
        article_match = re.match(r"^(?:Article|Section|ARTICLE|SECTION)\s+(\d+)[:\.\s]*(.*)", first_line, re.IGNORECASE)
        if article_match:
            clause_num = article_match.group(1)
            title_raw = article_match.group(2).strip()

    # If title_raw contains sentence text after a period, extract heading before period
    if "." in title_raw:
        candidate = title_raw.split(".")[0].strip()
        if candidate and (candidate.isupper() or len(candidate.split()) <= 6):
            title_raw = candidate

    heading = title_raw[:60].rstrip(".") or "Untitled"
    return heading, clause_num


def _split_oversized_section(text: str, max_size: int) -> List[str]:
    """Splits an oversized section at sentence boundaries."""
    sentences = re.split(r"(?<=[.!?])\s+", text)
    parts = []
    current = ""

    for sent in sentences:
        if len(current) + len(sent) + 1 > max_size and current:
            parts.append(current.strip())
            current = sent
        else:
            current = current + " " + sent if current else sent

    if current.strip():
        parts.append(current.strip())

    return parts if parts else [text]


def _fallback_fixed_size_parents(text: str, max_size: int) -> List[Dict[str, Any]]:
    """Fallback: splits text into fixed-size parents with overlap."""
    overlap = min(400, max_size // 4)
    parents = []
    start = 0

    while start < len(text):
        end = min(start + max_size, len(text))
        # Try to break at a paragraph boundary
        if end < len(text):
            para_break = text.rfind("\n\n", start + max_size // 2, end)
            if para_break > start:
                end = para_break

        chunk = text[start:end].strip()
        if chunk:
            parent_id = f"parent_{uuid.uuid4().hex[:12]}"
            heading, clause_num = _extract_heading_and_number(chunk)
            parents.append({
                "parent_id": parent_id,
                "text": chunk,
                "section": heading,
                "clause_number": clause_num,
                "start_offset": start,
                "end_offset": end,
            })
        start = end - overlap if end < len(text) else len(text)

    return parents


# ─── Claw 1.0 Engine Class ───────────────────────────────────────────────────

class ClawEngine:
    """
    Claw 1.0 — Unified Contract Intelligence Retrieval Engine.

    User-visible: "Claw 1.0 · Contract intelligence engine"
    Internal: MMR child chunk search + parent clause resolution + evidence validation.
    """

    def __init__(self, collection_name: str = "claw_1_0"):
        self.config = CLAW_ENGINE_CONFIG.copy()
        self.collection_name = collection_name
        self.embeddings = get_embedding_function()
        self.persist_directory = str(CHROMA_DB_DIR / collection_name)

        # Parent store (in-memory, keyed by parent_id)
        self.parent_store: Dict[str, Dict[str, Any]] = {}
        # Child-to-parent mapping
        self.child_to_parent: Dict[str, str] = {}
        # Source document text for validation
        self.source_text: str = ""
        self.document_id: str = ""

        # ChromaDB vector store for child chunks
        self.vector_store = Chroma(
            collection_name=self.collection_name,
            embedding_function=self.embeddings,
            persist_directory=self.persist_directory,
        )

    def index_document(
        self,
        text: str,
        metadata: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Indexes a contract document using clause-aware structural parsing.

        Flow:
          1. Structural parsing → parent clauses
          2. Child chunk creation from each parent
          3. Vector indexing of child chunks

        Returns: indexing trace dict
        """
        self.source_text = text
        self.document_id = metadata.get("contract_id", "unknown")
        self.parent_store.clear()
        self.child_to_parent.clear()

        # Step 1: Parse into structural parent clauses
        parents = _split_into_structural_parents(
            text,
            max_parent_size=self.config["parent_target_size"],
        )

        # Step 2: Create child chunks from each parent
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        child_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.config["child_chunk_size"],
            chunk_overlap=self.config["child_chunk_overlap"],
            separators=["\n\n", "\n", ". ", " ", ""],
        )

        all_child_docs: List[Document] = []

        for p_idx, parent in enumerate(parents):
            parent_id = parent["parent_id"]
            self.parent_store[parent_id] = parent

            # Create child chunks
            parent_doc = Document(
                page_content=parent["text"],
                metadata={
                    **metadata,
                    "parent_id": parent_id,
                    "section": parent["section"],
                    "clause_number": parent["clause_number"],
                    "start_offset": parent["start_offset"],
                    "end_offset": parent["end_offset"],
                    "parent_index": p_idx,
                },
            )

            children = child_splitter.split_documents([parent_doc])
            for c_idx, child in enumerate(children):
                child_id = f"child_{uuid.uuid4().hex[:10]}"
                child.metadata["child_id"] = child_id
                child.metadata["child_index"] = c_idx
                self.child_to_parent[child_id] = parent_id
                all_child_docs.append(child)

        # Step 3: Index child chunks into ChromaDB
        try:
            self.vector_store.delete_collection()
        except Exception:
            pass

        self.vector_store = Chroma(
            collection_name=self.collection_name,
            embedding_function=self.embeddings,
            persist_directory=self.persist_directory,
        )
        if all_child_docs:
            self.vector_store.add_documents(all_child_docs)

        trace = {
            "engine": self.config["engine_name"],
            "engine_version": self.config["engine_version"],
            "parent_count": len(parents),
            "child_count": len(all_child_docs),
            "document_id": self.document_id,
            "parent_ids": [p["parent_id"] for p in parents],
            "sections": [p["section"] for p in parents],
        }
        logger.info(
            f"Claw 1.0 indexed document: {len(parents)} parents, {len(all_child_docs)} children"
        )
        return trace

    def retrieve(
        self,
        query: str,
        clause_type: str = "general_review",
        k: Optional[int] = None,
        lambda_mult: Optional[float] = None,
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Claw 1.0 retrieval flow:
          1. Build normalized query from clause template + user query
          2. MMR search across child chunks
          3. Resolve children → parent clauses
          4. Deduplicate parents
          5. Validate evidence
          6. Controlled fallback if confidence low

        Returns:
          (parent_docs, retrieval_trace)

        Each parent_doc dict contains:
          content, metadata (section, clause_number, parent_id, page, evidence_child_ids, ...)
        """
        # Step 1: Build normalized query
        normalized_query = self._build_query(query, clause_type)

        # Step 2-6: Execute retrieval with fallback
        parents, trace = self._execute_retrieval(
            normalized_query,
            attempt=1,
            k=k,
            lambda_mult=lambda_mult,
        )

        # Controlled fallback
        if trace.get("top_confidence", 1.0) < self.config["min_retrieval_confidence"]:
            if trace["attempt"] < self.config["max_retrieval_attempts"]:
                logger.info(
                    f"Claw 1.0 fallback: confidence {trace.get('top_confidence', 0):.2f} "
                    f"< {self.config['min_retrieval_confidence']}"
                )
                expanded_query = self._build_expanded_query(query, clause_type)
                parents_fb, trace_fb = self._execute_retrieval(
                    expanded_query,
                    attempt=2,
                    fetch_k=self.config["fallback_fetch_k"],
                    k=k,
                    lambda_mult=lambda_mult,
                )
                if len(parents_fb) > len(parents):
                    parents = parents_fb
                    trace = trace_fb
                trace["fallback_used"] = True

        # Final validation
        validated_parents = self._validate_evidence(parents)

        # Build final trace
        trace.update({
            "engine": self.config["engine_name"],
            "engine_version": self.config["engine_version"],
            "retrieval_structure": "parent_document",
            "search_strategy": "mmr",
            "child_chunk_size": self.config["child_chunk_size"],
            "parent_target_size": self.config["parent_target_size"],
            "k": self.config["mmr_k"],
            "fetch_k": trace.get("fetch_k", self.config["mmr_fetch_k"]),
            "lambda_mult": self.config["mmr_lambda_mult"],
            "resolved_parent_count": len(validated_parents),
            "query_used": normalized_query,
            "clause_type": clause_type,
        })

        return validated_parents, trace

    def _build_query(self, user_query: str, clause_type: str) -> str:
        """Builds a normalized retrieval query from clause templates."""
        template_terms = CLAUSE_QUERY_TEMPLATES.get(
            clause_type, CLAUSE_QUERY_TEMPLATES["general_review"]
        )
        # Combine user query with approved clause terms
        terms_str = ", ".join(template_terms[:6])
        return f"{user_query} {terms_str}"

    def _build_expanded_query(self, user_query: str, clause_type: str) -> str:
        """Builds an expanded query using all available clause terms for fallback."""
        template_terms = CLAUSE_QUERY_TEMPLATES.get(
            clause_type, CLAUSE_QUERY_TEMPLATES["general_review"]
        )
        terms_str = ", ".join(template_terms)
        return f"{user_query} {terms_str}"

    def _execute_retrieval(
        self,
        query: str,
        attempt: int = 1,
        fetch_k: Optional[int] = None,
        k: Optional[int] = None,
        lambda_mult: Optional[float] = None,
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Executes MMR search on child chunks and resolves to parent clauses.
        """
        k = k if k is not None else self.config["mmr_k"]
        fk = fetch_k or self.config["mmr_fetch_k"]
        lambda_mult = lambda_mult if lambda_mult is not None else self.config["mmr_lambda_mult"]

        # MMR search on child chunks
        try:
            child_results = self.vector_store.max_marginal_relevance_search(
                query=query,
                k=k,
                fetch_k=fk,
                lambda_mult=lambda_mult,
            )
        except Exception as e:
            logger.warning(f"Claw 1.0 MMR search failed: {e}")
            child_results = []

        # Calculate top confidence from child results
        top_confidence = 0.0
        if child_results:
            # Use word overlap as a proxy for confidence
            query_words = set(w.lower() for w in re.findall(r"\w+", query) if len(w) > 3)
            if query_words:
                for child in child_results[:3]:
                    child_words = set(w.lower() for w in re.findall(r"\w+", child.page_content) if len(w) > 3)
                    overlap = len(query_words & child_words) / max(len(query_words), 1)
                    top_confidence = max(top_confidence, overlap)

        # Resolve children → parents, deduplicate
        retrieved_child_ids = []
        resolved_parent_ids = []
        seen_parent_ids = set()
        parent_results: List[Dict[str, Any]] = []

        for child in child_results:
            child_id = child.metadata.get("child_id", "")
            parent_id = child.metadata.get("parent_id", "")
            retrieved_child_ids.append(child_id)

            if parent_id and parent_id in self.parent_store and parent_id not in seen_parent_ids:
                seen_parent_ids.add(parent_id)
                resolved_parent_ids.append(parent_id)

                parent_data = self.parent_store[parent_id]
                parent_results.append({
                    "content": parent_data["text"],
                    "metadata": {
                        "parent_id": parent_id,
                        "document_id": self.document_id,
                        "section": parent_data["section"],
                        "clause_number": parent_data["clause_number"],
                        "start_offset": parent_data["start_offset"],
                        "end_offset": parent_data["end_offset"],
                        "evidence_child_ids": [
                            cid for cid, pid in self.child_to_parent.items()
                            if pid == parent_id
                        ],
                        "mmr_rank": len(parent_results),
                        "retrieval_attempt": attempt,
                    },
                })

                if len(parent_results) >= self.config["max_parent_results"]:
                    break

        trace = {
            "attempt": attempt,
            "fetch_k": fk,
            "retrieved_child_ids": retrieved_child_ids,
            "resolved_parent_ids": resolved_parent_ids,
            "deduplicated_parent_ids": list(seen_parent_ids),
            "top_confidence": round(top_confidence, 3),
            "fallback_used": False,
        }

        return parent_results, trace

    def _validate_evidence(self, parents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Validates that each parent's text exists in the source document.
        Marks invalid parents with validation_status = 'unverified'.
        """
        if not self.source_text:
            return parents

        validated = []
        source_lower = self.source_text.lower()

        for parent in parents:
            content = parent["content"]
            # Check if parent text is grounded in source
            snippet = content[:100].lower().strip()
            words = [w for w in re.findall(r"\w+", snippet) if len(w) > 3]

            if words:
                matches = sum(1 for w in words if w in source_lower)
                ratio = matches / len(words)
                valid = ratio >= 0.5
            else:
                valid = True

            parent["metadata"]["validation_status"] = "validated" if valid else "unverified"
            validated.append(parent)

        return validated

    def get_engine_info(self) -> Dict[str, Any]:
        """Returns user-facing engine metadata."""
        return {
            "id": self.config["engine_id"],
            "name": self.config["engine_name"],
            "version": self.config["engine_version"],
            "description": self.config["description"],
        }

    def get_internal_trace_config(self) -> Dict[str, Any]:
        """Returns internal trace config (developer-only, not user-facing)."""
        return {
            "engine": self.config["engine_name"],
            "engine_version": self.config["engine_version"],
            "retrieval_structure": "parent_document",
            "search_strategy": "mmr",
            "child_chunk_size": self.config["child_chunk_size"],
            "child_chunk_overlap": self.config["child_chunk_overlap"],
            "parent_target_size": self.config["parent_target_size"],
            "parent_overlap_size": self.config["parent_overlap_size"],
            "k": self.config["mmr_k"],
            "fetch_k": self.config["mmr_fetch_k"],
            "lambda_mult": self.config["mmr_lambda_mult"],
            "min_retrieval_confidence": self.config["min_retrieval_confidence"],
            "fallback_fetch_k": self.config["fallback_fetch_k"],
            "max_retrieval_attempts": self.config["max_retrieval_attempts"],
        }


# ─── Module-Level Convenience ─────────────────────────────────────────────────

# Legacy mode mapping: all old retriever mode names → claw_1_0
LEGACY_MODE_MAP: Dict[str, str] = {
    "Similarity Search": "claw_1_0",
    "MMR (Diversity Mode)": "claw_1_0",
    "MMR": "claw_1_0",
    "Multi-Query Retriever": "claw_1_0",
    "Multi-Query": "claw_1_0",
    "Self-Query Retriever": "claw_1_0",
    "Self-Query": "claw_1_0",
    "Parent Document Retriever": "claw_1_0",
    "Parent-Doc": "claw_1_0",
    "claw_1_0": "claw_1_0",
}


def resolve_engine_mode(mode: str) -> str:
    """Maps any legacy or current mode string to the canonical engine id."""
    return LEGACY_MODE_MAP.get(mode, "claw_1_0")


def get_engine_display_name(mode: str) -> str:
    """Returns user-facing display name for any mode string."""
    return "Claw 1.0"
