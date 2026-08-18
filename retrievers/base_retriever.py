import os
from typing import List, Dict, Any
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_community.embeddings import HuggingFaceEmbeddings

from config import CHROMA_DB_DIR, OPENAI_API_KEY
from utils.text_splitters import get_basic_text_splitter

OPENAI_API_EMBEDDINGS_BASE = "https://api.openai.com/v1"


def get_embedding_function():
    """
    Returns OpenAI text-embedding-3-small if an OpenAI API key is configured,
    otherwise falls back to HuggingFace all-MiniLM-L6-v2 for zero-config local runs.

    IMPORTANT: OpenAI-compatible proxy environments (e.g. those that set
    OPENAI_API_BASE / OPENAI_BASE_URL without an /embeddings endpoint)
    previously caused indexing to silently fail with 404. To avoid that,
    the OpenAI embedder is always created against the official OpenAI API
    endpoint (https://api.openai.com/v1), and any failure at EMBED time
    falls back to local HuggingFace embeddings so contracts always finish
    indexing.
    """
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if api_key and not api_key.startswith("your_"):
        try:
            openai_embed = OpenAIEmbeddings(
                model="text-embedding-3-small",
                openai_api_key=api_key,
                openai_api_base=OPENAI_API_EMBEDDINGS_BASE,
            )
            # Capability probe: verify the key actually works for embeddings
            # (previously, invalid or proxy keys crashed background indexing
            # with a 401/404 long after the embedder was selected).
            openai_embed.embed_query("health-check")
            return openai_embed
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
