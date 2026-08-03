from typing import List
from langchain_core.documents import Document
from langchain_community.vectorstores import Chroma

# Similarity Search Retriever Module
# Concept: Baseline vector retrieval that measures cosine angle between query and chunk vectors.

def get_similarity_retriever(vector_store: Chroma, k: int = 3):
    """
    Creates a LangChain retriever configured for standard Cosine Similarity Search.
    
    Parameters:
        vector_store (Chroma): The Chroma vector store collection.
        k (int): Top k most similar document chunks to retrieve.
    """
    return vector_store.as_retriever(
        search_type="similarity",
        search_kwargs={"k": k}
    )


def similarity_search_with_scores(vector_store: Chroma, query: str, k: int = 3) -> List[tuple[Document, float]]:
    """
    Performs similarity search and returns documents along with their similarity scores.
    """
    return vector_store.similarity_search_with_score(query=query, k=k)
