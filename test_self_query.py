from pathlib import Path
from utils.pdf_parser import extract_pdf_text_and_metadata
from retrievers.base_retriever import ContractVectorStoreManager
from retrievers.self_query_retriever import self_query_search, parse_self_query_filter
from config import SAMPLE_CONTRACTS_DIR

def test_self_query():
    print("\n--- Testing Module 5: Self-Query Retriever ---")
    
    # Test parser
    query1 = "Find only NDA confidentiality obligations"
    semantic1, filter1 = parse_self_query_filter(query1)
    print(f"Query: '{query1}'")
    print(f"  Extracted Semantic: '{semantic1}'")
    print(f"  Extracted Filter: {filter1}")
    assert filter1.get("contract_type") == "NDA"

    # Test indexing and filtered search
    sample_path = SAMPLE_CONTRACTS_DIR / "sample_nda.pdf"
    with open(sample_path, "rb") as f:
        pdf_bytes = f.read()
        
    parsed = extract_pdf_text_and_metadata(pdf_bytes, filename=sample_path.name)
    v_manager = ContractVectorStoreManager(collection_name="test_selfquery_collection")
    chunks = v_manager.index_document(parsed["text"], parsed["metadata"])
    print(f"\nIndexed {len(chunks)} chunks with metadata {parsed['metadata']}.")
    
    docs, filter_dict, semantic_q = self_query_search(v_manager.get_vector_store(), query1, k=3)
    print(f"Retrieved {len(docs)} chunks matching filter {filter_dict}:")
    for idx, doc in enumerate(docs, 1):
        print(f"[{idx}] Type: {doc.metadata.get('contract_type')} | {doc.page_content[:100]}...")
        assert doc.metadata.get("contract_type") == "NDA"
        
    print("\n[OK] Self-Query Retriever Test Passed!")

if __name__ == "__main__":
    test_self_query()
