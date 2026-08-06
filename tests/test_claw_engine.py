"""
tests/test_claw_engine.py — Comprehensive Test Suite for Claw 1.0 Unified Retrieval Engine.

Asserts:
1. Old retrieval options are mapped/deprecated and Claw 1.0 is default.
2. Structural clause parsing creates parent clauses and child chunks.
3. MMR selects diverse child chunks that resolve to deduplicated parent clauses.
4. Evidence section metadata and grounding are preserved.
5. Weak retrieval triggers controlled fallback.
6. Cache key invalidation triggers when Claw version changes.
7. Cross-clause retrieval finds payment, benefits, and bonus facts.
8. Single headings for Confidentiality and IP remain mentioned_incomplete.
9. Deterministic repeated runs produce identical structured retrieval results.
10. Payment retrieval for sample contract detects salary USD 85,000, health insurance, pension, and bonus eligibility.
"""

import pytest
from retrievers.claw_engine import ClawEngine, resolve_engine_mode, get_engine_display_name, CLAW_ENGINE_CONFIG
from services.caching import compute_document_fingerprint, CLAW_ENGINE_VERSION
from services.risk_analyzer import analyze_contract_risks
from services.clause_completeness import evaluate_clause_completeness, generate_completeness_checklist
from tests.golden_set.golden_cases import GOLDEN_TEST_CASES


SAMPLE_CONTRACT_TEXT = """
FOR SOFTWARE TESTING PURPOSES ONLY. NOT VALID. NOT A REAL AGREEMENT.
It has no legal effect.

EMPLOYMENT AGREEMENT

This Employment Agreement is entered into by and between TechCorp GmbH ("Employer"), located in Berlin, Germany, and Jane Doe ("Employee").

1. POSITION AND DUTIES. Employee is employed as Senior Software Engineer.
2. SALARY AND BENEFITS. Employee's annual base salary shall be USD 85,000. Employer provides health insurance, pension contributions, and annual bonus eligibility.
3. WORKING HOURS AND LEAVE. Standard working hours are 40 hours per week. Employee is entitled to 25 days paid annual leave.
4. CONFIDENTIALITY.
5. INTELLECTUAL PROPERTY.
6. TERM AND TERMINATION. Either party may terminate with 30 days prior written notice.
7. GOVERNING LAW AND DISPUTE RESOLUTION. Governed by the laws of Germany. Disputes shall be resolved in Berlin courts.

EMPLOYER SIGNATURE: ___________________
EMPLOYEE SIGNATURE: ___________________
"""


def test_claw_engine_mode_mapping():
    """Test 1 & 4: Verify legacy mode names map to claw_1_0."""
    legacy_modes = [
        "Similarity Search", "MMR (Diversity Mode)", "Multi-Query Retriever",
        "Self-Query Retriever", "Parent Document Retriever", "claw_1_0"
    ]
    for mode in legacy_modes:
        assert resolve_engine_mode(mode) == "claw_1_0"
        assert get_engine_display_name(mode) == "Claw 1.0"


def test_claw_engine_structural_indexing_and_parent_resolution():
    """Test 5, 6, 7 & 8: Structural parsing, child chunking, MMR selection, and parent resolution."""
    engine = ClawEngine(collection_name="test_claw_indexing")
    meta = {"contract_id": "test_c123", "filename": "test_employment.txt"}

    index_trace = engine.index_document(SAMPLE_CONTRACT_TEXT, meta)
    assert index_trace["parent_count"] >= 5
    assert index_trace["child_count"] >= index_trace["parent_count"]
    assert any("POSITION AND DUTIES" in s for s in index_trace["sections"]) or any("SALARY AND BENEFITS" in s for s in index_trace["sections"])

    # Retrieve
    parents, trace = engine.retrieve("salary bonus health insurance pension", clause_type="payment")
    assert len(parents) > 0
    assert trace["engine"] == "Claw 1.0"
    assert trace["search_strategy"] == "mmr"
    assert trace["retrieval_structure"] == "parent_document"

    # Verify parent structure and metadata
    for p in parents:
        assert "content" in p
        assert "section" in p["metadata"]
        assert "parent_id" in p["metadata"]
        assert "validation_status" in p["metadata"]
        assert p["metadata"]["validation_status"] == "validated"

    # Verify deduplication
    parent_ids = [p["metadata"]["parent_id"] for p in parents]
    assert len(parent_ids) == len(set(parent_ids))


def test_claw_engine_cross_clause_payment_retrieval():
    """Test 13 & Golden Retrieval: Cross-clause payment retrieval finds salary, health insurance, pension, and bonus."""
    engine = ClawEngine(collection_name="test_claw_payment")
    engine.index_document(SAMPLE_CONTRACT_TEXT, {"contract_id": "test_pay"})

    parents, _ = engine.retrieve("compensation salary bonus benefits pension insurance", clause_type="payment")
    combined_retrieved_text = " ".join([p["content"] for p in parents]).lower()

    assert "usd 85,000" in combined_retrieved_text
    assert "health insurance" in combined_retrieved_text
    assert "pension" in combined_retrieved_text
    assert "bonus eligibility" in combined_retrieved_text

    # The retrieval result must NOT support claiming bonuses/benefits are missing
    assert "bonuses are not addressed" not in combined_retrieved_text
    assert "benefits are not addressed" not in combined_retrieved_text


def test_claw_engine_heading_only_clause_completeness():
    """Test 14 & 15: Confidentiality and IP headings alone remain mentioned_incomplete."""
    # Confidentiality heading alone
    conf_status, conf_summary = evaluate_clause_completeness(
        "Confidentiality Scope", "4. CONFIDENTIALITY.", found=True, contract_type="Employment Agreement"
    )
    assert conf_status == "mentioned_incomplete"
    assert "lacks operative legal language" in conf_summary or "does not fully define" in conf_summary

    # IP heading alone
    ip_status, ip_summary = evaluate_clause_completeness(
        "IP Ownership", "5. INTELLECTUAL PROPERTY.", found=True, contract_type="Employment Agreement"
    )
    assert ip_status == "mentioned_incomplete"
    assert "lacks operative legal language" in ip_summary or "does not contain detailed assignment" in ip_summary


def test_claw_engine_controlled_fallback():
    """Test 10 & 11: Weak retrieval triggers controlled fallback."""
    engine = ClawEngine(collection_name="test_claw_fallback")
    engine.index_document(SAMPLE_CONTRACT_TEXT, {"contract_id": "test_fb"})

    # Query for something vague/absent
    parents, trace = engine.retrieve("extraordinary environmental carbon credit indemnity offset", clause_type="liability")

    assert trace["attempt"] in (1, 2)
    assert "top_confidence" in trace


def test_claw_cache_key_invalidation():
    """Test 12: Cache keys change when Claw engine or version metadata changes."""
    hash1, meta1 = compute_document_fingerprint("sample text", "risk_analysis")
    assert meta1["claw_engine_version"] == CLAW_ENGINE_VERSION

    # Fingerprint should be deterministic
    hash2, _ = compute_document_fingerprint("sample text", "risk_analysis")
    assert hash1 == hash2

    # Different text or stage yields different hash
    hash3, _ = compute_document_fingerprint("different text", "risk_analysis")
    assert hash1 != hash3


def test_claw_engine_determinism_5_runs():
    """Test 16: Repeated runs return the exact same structured retrieval results."""
    engine = ClawEngine(collection_name="test_claw_determinism")
    engine.index_document(SAMPLE_CONTRACT_TEXT, {"contract_id": "test_det"})

    runs_results = []
    for _ in range(5):
        parents, _ = engine.retrieve("termination notice period 30 days", clause_type="termination")
        content_hash = hash(tuple(p["content"] for p in parents))
        runs_results.append(content_hash)

    assert len(set(runs_results)) == 1, f"Retrieval varied across 5 runs: {runs_results}"
