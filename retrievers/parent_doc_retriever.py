import uuid
from typing import List, Dict, Any, Tuple
from langchain_core.documents import Document
from langchain_community.vectorstores import Chroma

from utils.text_splitters import get_parent_child_splitters
from retrievers.base_retriever import ContractVectorStoreManager


class ContractParentDocumentRetriever:
    """
    Parent Document (Small-to-Big) Retriever Manager.
    - Embeds small child chunks (400 chars) into ChromaDB for high vector similarity precision.
    - Maps child chunks to large parent documents (2000 chars) stored in memory.
    - Returns full parent context when requested.
    """
    def __init__(self, collection_name: str = "contractclaw_parent_doc"):
        self.v_manager = ContractVectorStoreManager(collection_name=collection_name)
        self.parent_store: Dict[str, Document] = {}

    def index_document(
        self,
        text: str,
        metadata: Dict[str, Any],
        parent_chunk_size: int = 2000,
        parent_chunk_overlap: int = 400,
        child_chunk_size: int = 400,
        child_chunk_overlap: int = 50
    ) -> Tuple[int, int]:
        """
        Splits text into parent docs and child docs, tags child docs with parent_id,
        and indexes child docs into ChromaDB vector store.
        """
        parent_splitter, child_splitter = get_parent_child_splitters(
            parent_chunk_size=parent_chunk_size,
            parent_chunk_overlap=parent_chunk_overlap,
            child_chunk_size=child_chunk_size,
            child_chunk_overlap=child_chunk_overlap
        )

        # 1. Split into Parent Docs
        base_doc = Document(page_content=text, metadata=metadata)
        parent_docs = parent_splitter.split_documents([base_doc])
        
        self.parent_store.clear()
        child_docs = []

        # 2. For each Parent Doc, split into Child Docs and link via parent_id
        for p_idx, p_doc in enumerate(parent_docs):
            parent_id = str(uuid.uuid4())
            p_doc.metadata["parent_id"] = parent_id
            p_doc.metadata["parent_chunk_index"] = p_idx
            self.parent_store[parent_id] = p_doc

            # Create child chunks
            c_chunks = child_splitter.split_documents([p_doc])
            for c_idx, c_chunk in enumerate(c_chunks):
                c_chunk.metadata["parent_id"] = parent_id
                c_chunk.metadata["child_chunk_index"] = c_idx
                child_docs.append(c_chunk)

        # 3. Index child docs in ChromaDB
        self.v_manager.vector_store.delete_collection()
        self.v_manager.vector_store = Chroma.from_documents(
            documents=child_docs,
            embedding=self.v_manager.embeddings,
            collection_name=self.v_manager.collection_name,
            persist_directory=self.v_manager.persist_directory
        )

        return len(parent_docs), len(child_docs)

    def retrieve(self, query: str, k: int = 3, full_context: bool = True) -> List[Document]:
        """
        Retrieves matching child chunks from ChromaDB.
        If full_context=True, returns the corresponding full Parent Documents.
        Otherwise, returns the Child document snippets.
        """
        child_matches = self.v_manager.vector_store.similarity_search(query=query, k=k)
        
        if not full_context:
            return child_matches

        # Map back to parent documents and deduplicate
        parent_results = []
        seen_parent_ids = set()

        for c_doc in child_matches:
            parent_id = c_doc.metadata.get("parent_id")
            if parent_id and parent_id in self.parent_store:
                if parent_id not in seen_parent_ids:
                    seen_parent_ids.add(parent_id)
                    parent_results.append(self.parent_store[parent_id])

        return parent_results
