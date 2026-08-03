import re
import os
from typing import List, Dict, Any, Tuple
from langchain_core.documents import Document
from langchain_community.vectorstores import Chroma

# Metadata schema attribute info for Self-Querying Retriever
METADATA_FIELD_INFO = [
    {
        "name": "contract_type",
        "description": "Type of legal contract. One of ['NDA', 'Employment', 'SOW', 'Service Agreement', 'Other']",
        "type": "string"
    },
    {
        "name": "upload_date",
        "description": "The ISO format date when document was uploaded (YYYY-MM-DD)",
        "type": "string"
    },
    {
        "name": "filename",
        "description": "Original PDF file name",
        "type": "string"
    },
    {
        "name": "parties",
        "description": "Names of involved parties or signing entities in the agreement",
        "type": "string"
    }
]

def parse_self_query_filter(user_query: str) -> Tuple[str, Dict[str, Any]]:
    """
    Parses user natural language query to extract structured metadata filters
    and return clean semantic query text along with metadata filter dictionary.
    """
    query_lower = user_query.lower()
    filter_dict = {}
    semantic_query = user_query

    # Extract contract_type filter
    if "nda" in query_lower or "non-disclosure" in query_lower:
        filter_dict["contract_type"] = "NDA"
        semantic_query = re.sub(r"\b(only|show me|find|in|the|nda|ndas|non-disclosure)\b", "", semantic_query, flags=re.IGNORECASE).strip()
    elif "employment" in query_lower or "employee" in query_lower:
        filter_dict["contract_type"] = "Employment"
        semantic_query = re.sub(r"\b(only|show me|find|in|the|employment|contracts|agreements)\b", "", semantic_query, flags=re.IGNORECASE).strip()
    elif "service" in query_lower or "msa" in query_lower or "sow" in query_lower:
        filter_dict["contract_type"] = "Service Agreement"
        semantic_query = re.sub(r"\b(only|show me|find|in|the|service|agreements|msa|sow)\b", "", semantic_query, flags=re.IGNORECASE).strip()

    if not semantic_query.strip():
        semantic_query = user_query

    return semantic_query, filter_dict


def self_query_search(vector_store: Chroma, user_query: str, k: int = 3) -> Tuple[List[Document], Dict[str, Any], str]:
    """
    Executes Self-Query search applying extracted metadata filters to ChromaDB.
    """
    semantic_query, filter_dict = parse_self_query_filter(user_query)
    
    # Perform similarity search with metadata filter
    if filter_dict:
        docs = vector_store.similarity_search(query=semantic_query, k=k, filter=filter_dict)
    else:
        docs = vector_store.similarity_search(query=semantic_query, k=k)

    return docs, filter_dict, semantic_query
