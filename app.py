import os
import streamlit as st

from config import SAMPLE_CONTRACTS_DIR
from utils.pdf_parser import extract_pdf_text_and_metadata
from retrievers.base_retriever import ContractVectorStoreManager
from retrievers.similarity_retriever import similarity_search_with_scores
from retrievers.mmr_retriever import mmr_search_documents
from retrievers.multi_query_retriever import multi_query_search
from retrievers.self_query_retriever import self_query_search
from retrievers.parent_doc_retriever import ContractParentDocumentRetriever
from ui.components import render_header, render_metadata_card, render_retrieved_chunks

# Initialize VectorStore Managers (cached in session state)
if "vector_manager" not in st.session_state:
    st.session_state.vector_manager = ContractVectorStoreManager(collection_name="contractclaw_similarity")

if "parent_retriever" not in st.session_state:
    st.session_state.parent_retriever = ContractParentDocumentRetriever(collection_name="contractclaw_parent_doc")

def main():
    render_header()
    
    st.sidebar.title("⚙️ Retriever Control Panel")
    
    # Mode Selection Dropdown
    search_mode = st.sidebar.selectbox(
        "Search Mode:",
        [
            "Similarity Search",
            "MMR (Diversity Mode)",
            "Multi-Query Retriever (AI Query Expansion)",
            "Self-Query Retriever (Smart Metadata Filters)",
            "Parent Document Retriever (Small-to-Big)",
            "Side-by-Side Comparison (Similarity vs MMR)"
        ],
        help="Parent Document Retriever embeds small child chunks (400 chars) for search accuracy while returning full parent chunks (2000 chars) for complete context."
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
            help="1.0 = Pure Similarity | 0.0 = Pure Diversity"
        )

    full_context_mode = True
    if "Parent Document" in search_mode:
        full_context_mode = st.sidebar.toggle(
            "Full Context Mode (Parent Chunks):",
            value=True,
            help="ON = Returns full 2000-char Parent section | OFF = Returns 400-char Child snippet"
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
        
        # Index into Base Vector Store
        v_manager = st.session_state.vector_manager
        parent_retriever = st.session_state.parent_retriever
        
        with st.spinner("Indexing contract into ChromaDB vector store..."):
            chunks = v_manager.index_document(selected_text, selected_metadata)
            num_parents, num_children = parent_retriever.index_document(selected_text, selected_metadata)
        
        st.success(f"Indexed {len(chunks)} base chunks | Parent-Doc Store: {num_parents} Parents (2000c) & {num_children} Children (400c).")
        
        st.markdown("---")
        st.subheader("🔍 Query Contract Lab")
        
        default_query = "Explain the termination clause and obligations" if "Parent Document" in search_mode else "What is the termination clause?"
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
                
            elif search_mode == "Multi-Query Retriever (AI Query Expansion)":
                with st.spinner("LLM generating multi-angle query variations..."):
                    mq_docs, query_variations = multi_query_search(vector_store, user_query, k=k_slider)
                
                with st.expander("🧠 AI Generated Query Variations (Multi-Query Expansion)", expanded=True):
                    st.markdown("**Original User Query:**")
                    st.code(user_query)
                    st.markdown("**LLM Generated Legal Perspectives:**")
                    for idx, q_var in enumerate(query_variations, 1):
                        st.markdown(f"{idx}. `{q_var}`")
                
                render_retrieved_chunks(mq_docs, retriever_name="Multi-Query Retriever")
                
            elif search_mode == "Self-Query Retriever (Smart Metadata Filters)":
                sq_docs, filter_dict, semantic_q = self_query_search(vector_store, user_query, k=k_slider)
                
                with st.expander("🏷️ Extracted Smart Metadata Filters (Self-Query Parsing)", expanded=True):
                    col_a, col_b = st.columns(2)
                    with col_a:
                        st.markdown("**Extracted Semantic Search Terms:**")
                        st.code(semantic_q if semantic_q else "(Empty - pure filter)")
                    with col_b:
                        st.markdown("**Extracted Metadata Filter Rules:**")
                        st.json(filter_dict if filter_dict else {"status": "No metadata filter required"})
                
                render_retrieved_chunks(sq_docs, retriever_name="Self-Query Retriever")

            elif search_mode == "Parent Document Retriever (Small-to-Big)":
                p_docs = parent_retriever.retrieve(user_query, k=k_slider, full_context=full_context_mode)
                mode_label = "Parent Full Section Context (2000 chars)" if full_context_mode else "Child Snippet (400 chars)"
                
                with st.expander("🧩 Parent Document Architecture Inspection", expanded=True):
                    st.info(f"**Current Mode:** `{mode_label}` | **Retrieved Documents:** `{len(p_docs)}`")
                
                render_retrieved_chunks(p_docs, retriever_name=f"Parent Document ({mode_label})")

            elif search_mode == "Side-by-Side Comparison (Similarity vs MMR)":
                st.subheader("⚖️ Side-by-Side Retriever Comparison")
                col1, col2 = st.columns(2)
                
                with col1:
                    st.markdown("### 🔵 Standard Similarity Search")
                    sim_results = similarity_search_with_scores(vector_store, user_query, k=k_slider)
                    sim_docs = [doc for doc, score in sim_results]
                    sim_scores = [score for doc, score in sim_results]
                    render_retrieved_chunks(sim_docs, scores=sim_scores, retriever_name="Similarity Search")
                    
                with col2:
                    st.markdown(f"### 🟢 MMR Diversity Mode (λ={lambda_mult})")
                    mmr_docs = mmr_search_documents(vector_store, user_query, k=k_slider, lambda_mult=lambda_mult)
                    render_retrieved_chunks(mmr_docs, retriever_name=f"MMR (λ={lambda_mult})")
    else:
        st.info("👈 Upload a contract or select a sample contract from the sidebar to begin testing vector retrieval.")

if __name__ == "__main__":
    main()
