from typing import List
from langchain_core.documents import Document
from langchain_community.vectorstores import Chroma

# MMR (Maximal Marginal Relevance) Retriever Module
# Concept: Balances query relevance against result diversity to prevent returning redundant chunks.
# Equation / Logic: MMR = argmax [ lambda * Sim1(doc, query) - (1 - lambda) * max_Sim2(doc, already_selected_docs) ]

def get_mmr_retriever(vector_store: Chroma, k: int = 3, lambda_mult: float = 0.5, fetch_k: int = 20):
    """
    Creates a LangChain retriever configured for Maximal Marginal Relevance (MMR).
    
    Parameters:
        vector_store (Chroma): The Chroma vector store collection.
        k (int): Number of final diverse documents to return.
        lambda_mult (float): Diversity factor between 0.0 (max diversity) and 1.0 (pure similarity). Default 0.5.
        fetch_k (int): Initial pool of candidate documents to fetch before applying MMR filtering.
    """
    return vector_store.as_retriever(
        search_type="mmr",
        search_kwargs={
            "k": k,
            "lambda_mult": lambda_mult,
            "fetch_k": fetch_k
        }
    )


def mmr_search_documents(vector_store: Chroma, query: str, k: int = 3, lambda_mult: float = 0.5) -> List[Document]:
    """
    Performs MMR search directly on the vector store.
    """
    return vector_store.max_marginal_relevance_search(
        query=query,
        k=k,
        lambda_mult=lambda_mult,
        fetch_k=k * 4
    )
