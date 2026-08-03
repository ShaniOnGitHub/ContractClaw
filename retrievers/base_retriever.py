import os
from typing import List, Dict, Any
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_community.embeddings import HuggingFaceEmbeddings

from config import CHROMA_DB_DIR, OPENAI_API_KEY
from utils.text_splitters import get_basic_text_splitter

def get_embedding_function():
    """
    Returns OpenAI text-embedding-3-small if API key is configured,
    otherwise falls back to HuggingFace all-MiniLM-L6-v2 for zero-config local runs.
    """
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if api_key and not api_key.startswith("your_"):
        try:
            return OpenAIEmbeddings(model="text-embedding-3-small", openai_api_key=api_key)
        except Exception:
            pass
    
    # Fallback to local HuggingFace embeddings
    return HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")


class ContractVectorStoreManager:
    """
    Manages local ChromaDB vector storage for ContractClaw.
    Handles document indexing, metadata tagging, and vector retrieval.
    """
    def __init__(self, collection_name: str = "contractclaw_similarity"):
        self.collection_name = collection_name
        self.embeddings = get_embedding_function()
        self.persist_directory = str(CHROMA_DB_DIR / collection_name)
        
        self.vector_store = Chroma(
            collection_name=self.collection_name,
            embedding_function=self.embeddings,
            persist_directory=self.persist_directory
        )

    def index_document(self, text: str, metadata: Dict[str, Any], chunk_size: int = 1000, chunk_overlap: int = 200) -> List[Document]:
        """
        Splits text into chunks, attaches document metadata, and indexes into ChromaDB.
        """
        splitter = get_basic_text_splitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        
        # Build base document
        doc = Document(page_content=text, metadata=metadata)
        chunks = splitter.split_documents([doc])
        
        # Add index tag to chunk metadata
        for idx, chunk in enumerate(chunks):
            chunk.metadata["chunk_id"] = idx
        
        # Reset collection and add new documents
        self.vector_store.delete_collection()
        self.vector_store = Chroma.from_documents(
            documents=chunks,
            embedding=self.embeddings,
            collection_name=self.collection_name,
            persist_directory=self.persist_directory
        )
        return chunks

    def get_vector_store(self) -> Chroma:
        return self.vector_store
