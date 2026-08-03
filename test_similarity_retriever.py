from pathlib import Path
from utils.pdf_parser import extract_pdf_text_and_metadata
from retrievers.base_retriever import ContractVectorStoreManager
from retrievers.similarity_retriever import similarity_search_with_scores
from config import SAMPLE_CONTRACTS_DIR

def test_similarity_retriever():
    print("\n--- Testing Module 2: Similarity Search Retriever ---")
    sample_path = SAMPLE_CONTRACTS_DIR / "sample_nda.pdf"
    
    with open(sample_path, "rb") as f:
        pdf_bytes = f.read()
    
    parsed = extract_pdf_text_and_metadata(pdf_bytes, filename=sample_path.name)
    
    v_manager = ContractVectorStoreManager(collection_name="test_similarity_collection")
    chunks = v_manager.index_document(parsed["text"], parsed["metadata"])
    print(f"Indexed {len(chunks)} chunks into ChromaDB.")
    
    query = "What is the termination clause?"
    print(f"\nQuery: '{query}'")
    
    results = similarity_search_with_scores(v_manager.get_vector_store(), query, k=3)
    print(f"Retrieved {len(results)} chunks:")
    
    for idx, (doc, score) in enumerate(results, 1):
        print(f"\n[{idx}] Score: {score:.4f}")
        print(f"Content: {doc.page_content[:150]}...")
        assert "termination" in doc.page_content.lower() or "term" in doc.page_content.lower() or "agreement" in doc.page_content.lower()
    
    print("\n[OK] Similarity Search Retriever Test Passed!")

if __name__ == "__main__":
    test_similarity_retriever()
