from pathlib import Path
from utils.pdf_parser import extract_pdf_text_and_metadata
from retrievers.parent_doc_retriever import ContractParentDocumentRetriever
from config import SAMPLE_CONTRACTS_DIR

def test_parent_doc():
    print("\n--- Testing Module 6: Parent Document Retriever ---")
    sample_path = SAMPLE_CONTRACTS_DIR / "sample_service_agreement.pdf"
    
    with open(sample_path, "rb") as f:
        pdf_bytes = f.read()
        
    parsed = extract_pdf_text_and_metadata(pdf_bytes, filename=sample_path.name)
    parent_retriever = ContractParentDocumentRetriever(collection_name="test_parent_doc_collection")
    num_parents, num_children = parent_retriever.index_document(parsed["text"], parsed["metadata"])
    print(f"Indexed {num_parents} parent docs and {num_children} child docs.")
    
    query = "Explain termination for cause and liability caps"
    
    # 1. Child Mode (full_context=False)
    child_matches = parent_retriever.retrieve(query, k=2, full_context=False)
    print(f"\n[Child Snippet Mode] Retrieved {len(child_matches)} child chunks:")
    for idx, doc in enumerate(child_matches, 1):
        print(f"  Child #{idx} ({len(doc.page_content)} chars): {doc.page_content[:100]}...")
        
    # 2. Parent Mode (full_context=True)
    parent_matches = parent_retriever.retrieve(query, k=2, full_context=True)
    print(f"\n[Parent Full Context Mode] Retrieved {len(parent_matches)} parent chunks:")
    for idx, doc in enumerate(parent_matches, 1):
        print(f"  Parent #{idx} ({len(doc.page_content)} chars): {doc.page_content[:100]}...")
        assert len(doc.page_content) >= len(child_matches[0].page_content)

    print("\n[OK] Parent Document Retriever Test Passed!")

if __name__ == "__main__":
    test_parent_doc()
