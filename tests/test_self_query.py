import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from utils.pdf_parser import extract_pdf_text_and_metadata
from retrievers.base_retriever import ContractVectorStoreManager
from retrievers.self_query_retriever import self_query_search
from config import SAMPLE_CONTRACTS_DIR

def test_self_query():
    print("\n--- Testing Module 5: Self-Query Retriever ---")
    sample_path = SAMPLE_CONTRACTS_DIR / "sample_nda.pdf"
    with open(sample_path, "rb") as f:
        pdf_bytes = f.read()
    parsed = extract_pdf_text_and_metadata(pdf_bytes, filename=sample_path.name)
    v_manager = ContractVectorStoreManager(collection_name="test_sq_collection")
    v_manager.index_document(parsed["text"], parsed["metadata"])
    docs, filter_dict, semantic_q = self_query_search(v_manager.get_vector_store(), "Find only NDA confidentiality", k=2)
    assert filter_dict.get("contract_type") == "NDA"
    assert len(docs) > 0
    print(f"[OK] Self-Query Retriever extracted filter {filter_dict} and retrieved {len(docs)} matching chunks.")

if __name__ == "__main__":
    test_self_query()
