import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from utils.pdf_parser import extract_pdf_text_and_metadata
from retrievers.base_retriever import ContractVectorStoreManager
from retrievers.mmr_retriever import mmr_search_documents
from config import SAMPLE_CONTRACTS_DIR

def test_mmr_retriever():
    print("\n--- Testing Module 3: MMR Retriever ---")
    sample_path = SAMPLE_CONTRACTS_DIR / "sample_employment.pdf"
    with open(sample_path, "rb") as f:
        pdf_bytes = f.read()
    parsed = extract_pdf_text_and_metadata(pdf_bytes, filename=sample_path.name)
    v_manager = ContractVectorStoreManager(collection_name="test_mmr_collection")
    v_manager.index_document(parsed["text"], parsed["metadata"])
    mmr_results = mmr_search_documents(v_manager.get_vector_store(), "employee duties and compensation", k=2, lambda_mult=0.5)
    assert len(mmr_results) > 0
    print(f"[OK] MMR Retriever retrieved {len(mmr_results)} diverse chunks.")

if __name__ == "__main__":
    test_mmr_retriever()
