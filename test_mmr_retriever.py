from pathlib import Path
from utils.pdf_parser import extract_pdf_text_and_metadata
from retrievers.base_retriever import ContractVectorStoreManager
from retrievers.similarity_retriever import similarity_search_with_scores
from retrievers.mmr_retriever import mmr_search_documents
from config import SAMPLE_CONTRACTS_DIR

def test_mmr_retriever():
    print("\n--- Testing Module 3: MMR Retriever ---")
    sample_path = SAMPLE_CONTRACTS_DIR / "sample_employment.pdf"
    
    with open(sample_path, "rb") as f:
        pdf_bytes = f.read()
        
    parsed = extract_pdf_text_and_metadata(pdf_bytes, filename=sample_path.name)
    v_manager = ContractVectorStoreManager(collection_name="test_mmr_collection")
    chunks = v_manager.index_document(parsed["text"], parsed["metadata"])
    print(f"Indexed {len(chunks)} chunks into ChromaDB.")
    
    query = "What are the employee duties, compensation, non-compete, and intellectual property rights?"
    
    # 1. Similarity Search
    sim_results = similarity_search_with_scores(v_manager.get_vector_store(), query, k=3)
    print(f"\n[Similarity Search] Retrieved {len(sim_results)} chunks.")
    
    # 2. MMR Search
    mmr_results = mmr_search_documents(v_manager.get_vector_store(), query, k=3, lambda_mult=0.5)
    print(f"[MMR Search lambda=0.5] Retrieved {len(mmr_results)} chunks.")
    
    for idx, doc in enumerate(mmr_results, 1):
        print(f"\nMMR Chunk #{idx}: {doc.page_content[:100]}...")
        
    print("\n[OK] MMR Retriever Test Passed!")

if __name__ == "__main__":
    test_mmr_retriever()
