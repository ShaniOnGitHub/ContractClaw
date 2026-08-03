import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from utils.pdf_parser import extract_pdf_text_and_metadata
from retrievers.base_retriever import ContractVectorStoreManager
from retrievers.multi_query_retriever import multi_query_search
from config import SAMPLE_CONTRACTS_DIR

def test_multi_query():
    print("\n--- Testing Module 4: Multi-Query Retriever ---")
    sample_path = SAMPLE_CONTRACTS_DIR / "sample_service_agreement.pdf"
    with open(sample_path, "rb") as f:
        pdf_bytes = f.read()
    parsed = extract_pdf_text_and_metadata(pdf_bytes, filename=sample_path.name)
    v_manager = ContractVectorStoreManager(collection_name="test_mq_collection")
    v_manager.index_document(parsed["text"], parsed["metadata"])
    mq_docs, vars = multi_query_search(v_manager.get_vector_store(), "Is this contract fair?", k=2)
    assert len(vars) >= 3
    assert len(mq_docs) > 0
    print(f"[OK] Multi-Query Retriever generated {len(vars)} variations and retrieved {len(mq_docs)} deduplicated chunks.")

if __name__ == "__main__":
    test_multi_query()
