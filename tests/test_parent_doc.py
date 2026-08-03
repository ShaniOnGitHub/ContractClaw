import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from utils.pdf_parser import extract_pdf_text_and_metadata
from retrievers.parent_doc_retriever import ContractParentDocumentRetriever
from config import SAMPLE_CONTRACTS_DIR

def test_parent_doc():
    print("\n--- Testing Module 6: Parent Document Retriever ---")
    sample_path = SAMPLE_CONTRACTS_DIR / "sample_service_agreement.pdf"
    with open(sample_path, "rb") as f:
        pdf_bytes = f.read()
    parsed = extract_pdf_text_and_metadata(pdf_bytes, filename=sample_path.name)
    parent_retriever = ContractParentDocumentRetriever(collection_name="test_pd_collection")
    num_p, num_c = parent_retriever.index_document(parsed["text"], parsed["metadata"])
    p_matches = parent_retriever.retrieve("termination for cause", k=2, full_context=True)
    c_matches = parent_retriever.retrieve("termination for cause", k=2, full_context=False)
    assert len(p_matches) > 0
    assert len(c_matches) > 0
    print(f"[OK] Parent Document Retriever retrieved {len(c_matches)} child snippets and {len(p_matches)} full parent sections.")

if __name__ == "__main__":
    test_parent_doc()
