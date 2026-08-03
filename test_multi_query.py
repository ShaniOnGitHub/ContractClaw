from pathlib import Path
from utils.pdf_parser import extract_pdf_text_and_metadata
from retrievers.base_retriever import ContractVectorStoreManager
from retrievers.multi_query_retriever import multi_query_search, generate_query_variations
from config import SAMPLE_CONTRACTS_DIR

def test_multi_query():
    print("\n--- Testing Module 4: Multi-Query Retriever ---")
    sample_path = SAMPLE_CONTRACTS_DIR / "sample_service_agreement.pdf"
    
    with open(sample_path, "rb") as f:
        pdf_bytes = f.read()
        
    parsed = extract_pdf_text_and_metadata(pdf_bytes, filename=sample_path.name)
    v_manager = ContractVectorStoreManager(collection_name="test_multiquery_collection")
    chunks = v_manager.index_document(parsed["text"], parsed["metadata"])
    print(f"Indexed {len(chunks)} chunks into ChromaDB.")
    
    user_query = "Is this contract fair and balanced?"
    print(f"\nUser Query: '{user_query}'")
    
    variations = generate_query_variations(user_query)
    print("Generated Query Variations:")
    for idx, var in enumerate(variations, 1):
        print(f"  {idx}. {var}")
        
    assert len(variations) >= 3, "Should generate at least 3 query variations"
    
    mq_docs, _ = multi_query_search(v_manager.get_vector_store(), user_query, k=3)
    print(f"\nRetrieved {len(mq_docs)} deduplicated chunks across all variations:")
    for idx, doc in enumerate(mq_docs, 1):
        print(f"[{idx}] {doc.page_content[:120]}...")
        
    print("\n[OK] Multi-Query Retriever Test Passed!")

if __name__ == "__main__":
    test_multi_query()
