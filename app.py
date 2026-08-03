import os
import streamlit as st

from config import SAMPLE_CONTRACTS_DIR
from utils.pdf_parser import extract_pdf_text_and_metadata
from retrievers.base_retriever import ContractVectorStoreManager
from retrievers.similarity_retriever import similarity_search_with_scores
from retrievers.mmr_retriever import mmr_search_documents
from ui.components import render_header, render_metadata_card, render_retrieved_chunks

# Initialize VectorStore Manager (cached in session state)
if "vector_manager" not in st.session_state:
    st.session_state.vector_manager = ContractVectorStoreManager(collection_name="contractclaw_similarity")

def main():
    render_header()
    
    st.sidebar.title("⚙️ Retriever Control Panel")
    
    # Mode Selection Dropdown
    search_mode = st.sidebar.selectbox(
        "Search Mode:",
        ["Similarity Search", "MMR (Diversity Mode)", "Side-by-Side Comparison (Similarity vs MMR)"],
        help="MMR (Maximal Marginal Relevance) balances query relevance against result diversity."
    )
    
    # Sidebar Controls
    k_slider = st.sidebar.slider("Top K Chunks:", min_value=1, max_value=5, value=3)
    
    lambda_mult = 0.5
    if "MMR" in search_mode or "Side-by-Side" in search_mode:
        lambda_mult = st.sidebar.slider(
            "Diversity Lambda (λ):",
            min_value=0.0,
            max_value=1.0,
            value=0.5,
            step=0.1,
            help="1.0 = Pure Similarity (Redundant) | 0.0 = Pure Diversity (Varied)"
        )
    
    # Input Selection: Sample or Upload
    input_source = st.sidebar.radio("Select Input Source:", ["Sample Contracts", "Upload PDF"])
    
    selected_text = ""
    selected_metadata = {}
    filename = ""
    
    if input_source == "Sample Contracts":
        sample_files = list(SAMPLE_CONTRACTS_DIR.glob("*.pdf"))
        sample_names = [f.name for f in sample_files]
        
        if sample_names:
            chosen_sample = st.sidebar.selectbox("Choose a Sample PDF:", sample_names)
            if chosen_sample:
                sample_path = SAMPLE_CONTRACTS_DIR / chosen_sample
                filename = chosen_sample
                with open(sample_path, "rb") as f:
                    pdf_bytes = f.read()
                result = extract_pdf_text_and_metadata(pdf_bytes, filename=filename)
                selected_text = result["text"]
                selected_metadata = result["metadata"]
    else:
        uploaded_file = st.sidebar.file_uploader("Upload a Contract (PDF)", type=["pdf"])
        if uploaded_file:
            filename = uploaded_file.name
            pdf_bytes = uploaded_file.read()
            result = extract_pdf_text_and_metadata(pdf_bytes, filename=filename)
            selected_text = result["text"]
            selected_metadata = result["metadata"]

    # Index Document & Search
    if selected_text:
        render_metadata_card(selected_metadata)
        
        # Automatically Index into ChromaDB
        v_manager = st.session_state.vector_manager
        with st.spinner("Indexing contract into ChromaDB vector store..."):
            chunks = v_manager.index_document(selected_text, selected_metadata)
        
        st.success(f"Indexed {len(chunks)} chunks into vector collection `{v_manager.collection_name}`.")
        
        st.markdown("---")
        st.subheader("🔍 Query Contract Lab")
        
        default_query = "What are the risks, restrictions, and obligations in this contract?"
        user_query = st.text_input("Ask a question about this contract:", default_query)
        
        if user_query:
            vector_store = v_manager.get_vector_store()
            
            if search_mode == "Similarity Search":
                results_with_scores = similarity_search_with_scores(vector_store, user_query, k=k_slider)
                docs = [doc for doc, score in results_with_scores]
                scores = [score for doc, score in results_with_scores]
                render_retrieved_chunks(docs, scores=scores, retriever_name="Similarity Search")
                
            elif search_mode == "MMR (Diversity Mode)":
                mmr_docs = mmr_search_documents(vector_store, user_query, k=k_slider, lambda_mult=lambda_mult)
                render_retrieved_chunks(mmr_docs, retriever_name=f"MMR (Diversity λ={lambda_mult})")
                
            elif search_mode == "Side-by-Side Comparison (Similarity vs MMR)":
                st.subheader("⚖️ Side-by-Side Retriever Comparison")
                
                col1, col2 = st.columns(2)
                
                with col1:
                    st.markdown("### 🔵 Standard Similarity Search")
                    st.caption("Focuses purely on highest vector similarity scores (can be redundant).")
                    sim_results = similarity_search_with_scores(vector_store, user_query, k=k_slider)
                    sim_docs = [doc for doc, score in sim_results]
                    sim_scores = [score for doc, score in sim_results]
                    render_retrieved_chunks(sim_docs, scores=sim_scores, retriever_name="Similarity Search")
                    
                with col2:
                    st.markdown(f"### 🟢 MMR Diversity Mode (λ={lambda_mult})")
                    st.caption("Penalizes redundancy to return diverse contractual clauses.")
                    mmr_docs = mmr_search_documents(vector_store, user_query, k=k_slider, lambda_mult=lambda_mult)
                    render_retrieved_chunks(mmr_docs, retriever_name=f"MMR (λ={lambda_mult})")
    else:
        st.info("👈 Upload a contract or select a sample contract from the sidebar to begin testing vector retrieval.")

if __name__ == "__main__":
    main()
