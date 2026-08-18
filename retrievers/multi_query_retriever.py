import os
from typing import List, Tuple
from langchain_core.documents import Document
from langchain_community.vectorstores import Chroma
from langchain_openai import ChatOpenAI
from langchain_groq import ChatGroq

from config import OPENAI_API_KEY, GROQ_API_KEY


def get_llm():
    """
    Returns ChatGroq or ChatOpenAI LLM depending on configured environment API keys.
    """
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    if groq_key and not groq_key.startswith("your_"):
        try:
            return ChatGroq(model_name="llama-3.3-70b-versatile", groq_api_key=groq_key, temperature=0)
        except Exception:
            pass
            
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    if openai_key and not openai_key.startswith("your_"):
        try:
            return ChatOpenAI(
                model="gpt-4o-mini",
                openai_api_key=openai_key,
                openai_api_base="https://api.openai.com/v1",
                temperature=0,
            )
        except Exception:
            pass

    return None


def generate_query_variations(query: str) -> List[str]:
    """
    Generates 3 legal query variations.
    Uses LLM if available, otherwise uses legal rule-based expansion.
    """
    llm = get_llm()
    if llm:
        try:
            prompt = (
                f"You are a legal AI assistant. Generate 3 distinct, formal legal search query variations "
                f"for the following user question about a contract:\n"
                f"Question: '{query}'\n"
                f"Return ONLY the 3 variations, one per line."
            )
            response = llm.invoke(prompt)
            lines = [line.strip("- ").strip("123456789. ") for line in response.content.split("\n") if line.strip()]
            if len(lines) >= 3:
                return lines[:3]
        except Exception:
            pass
            
    # Rule-based legal query expansion for offline/zero-config mode
    return [
        f"{query} - unilateral termination, cancellation rights, and notice periods",
        f"{query} - limitation of liability, indemnification, and damage caps",
        f"{query} - payment terms, fee schedules, and late penalty provisions"
    ]


class ContractMultiQueryRetriever:
    """
    Production-grade Multi-Query Retriever for ContractClaw.
    Generates multiple legal query perspectives, searches ChromaDB across all variations,
    and deduplicates results to prevent redundant outputs.
    """
    def __init__(self, vector_store: Chroma, k: int = 3):
        self.vector_store = vector_store
        self.k = k

    def get_relevant_documents(self, query: str) -> List[Document]:
        docs, _ = multi_query_search(self.vector_store, query, k=self.k)
        return docs


def multi_query_search(vector_store: Chroma, query: str, k: int = 3) -> Tuple[List[Document], List[str]]:
    """
    Performs multi-query retrieval and returns both retrieved documents and generated query variations.
    """
    variations = generate_query_variations(query)
    all_queries = [query] + variations
    
    seen_contents = set()
    deduped_docs = []
    
    base_retriever = vector_store.as_retriever(search_kwargs={"k": k})
    
    for q in all_queries:
        docs = base_retriever.invoke(q)
        for doc in docs:
            if doc.page_content not in seen_contents:
                seen_contents.add(doc.page_content)
                deduped_docs.append(doc)
                
    return deduped_docs[:k * 2], variations
