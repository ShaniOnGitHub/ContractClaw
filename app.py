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
from ui.components import (
    render_header,
    render_metadata_card,
    render_retrieved_chunks,
    render_comparison_benchmark,
    render_pro_sidebar_hooks,
    render_pricing_modal
)

# Cache VectorStore Managers in session state
if "vector_manager" not in st.session_state:
    st.session_state.vector_manager = ContractVectorStoreManager(collection_name="contractclaw_similarity")

if "parent_retriever" not in st.session_state:
    st.session_state.parent_retriever = ContractParentDocumentRetriever(collection_name="contractclaw_parent_doc")


def execute_retriever(mode: str, query: str, k: int, lambda_mult: float, full_context: bool):
    """Executes requested retriever strategy and returns (documents, metadata_info)."""
    v_manager = st.session_state.vector_manager
    vector_store = v_manager.get_vector_store()
    parent_retriever = st.session_state.parent_retriever

    if mode == "Similarity Search":
        results = similarity_search_with_scores(vector_store, query, k=k)
        docs = [doc for doc, score in results]
        scores = [score for doc, score in results]
        return docs, {"scores": scores, "type": "similarity"}

    elif mode == "MMR (Diversity Mode)":
        docs = mmr_search_documents(vector_store, query, k=k, lambda_mult=lambda_mult)
        return docs, {"lambda": lambda_mult, "type": "mmr"}

    elif mode == "Multi-Query Retriever":
        docs, vars = multi_query_search(vector_store, query, k=k)
        return docs, {"variations": vars, "type": "multi_query"}

    elif mode == "Self-Query Retriever":
        docs, filter_dict, sem_q = self_query_search(vector_store, query, k=k)
        return docs, {"filter": filter_dict, "semantic_query": sem_q, "type": "self_query"}

    elif mode == "Parent Document Retriever":
        docs = parent_retriever.retrieve(query, k=k, full_context=full_context)
        return docs, {"full_context": full_context, "type": "parent_doc"}

    return [], {}


def main():
    render_header()
    
    st.sidebar.title("⚙️ Master Control Panel")
    
    # Mode Selection
    search_mode = st.sidebar.radio(
        "Select Retriever Strategy:",
        [
            "Similarity Search",
            "MMR (Diversity Mode)",
            "Multi-Query Retriever",
            "Self-Query Retriever",
            "Parent Document Retriever",
            "🔬 Compare Modes Lab",
            "💎 SaaS Plans & Monetization"
        ]
    )
    
    st.sidebar.markdown("---")
    
    if search_mode == "💎 SaaS Plans & Monetization":
        render_pricing_modal()
        return

    st.sidebar.subheader("🎛️ Hyperparameters")
    k_slider = st.sidebar.slider("Top K Results (k):", min_value=1, max_value=10, value=3)
    
    lambda_mult = 0.5
    if "MMR" in search_mode or "Compare" in search_mode:
        lambda_mult = st.sidebar.slider(
            "Diversity Lambda (λ):",
            min_value=0.0,
            max_value=1.0,
            value=0.5,
            step=0.1,
            help="1.0 = Pure Similarity | 0.0 = Pure Diversity"
        )

    full_context_mode = True
    if "Parent Document" in search_mode or "Compare" in search_mode:
        full_context_mode = st.sidebar.toggle(
            "Parent Full Context Mode:",
            value=True,
            help="ON = Returns 2000-char Parent section | OFF = Returns 400-char Child snippet"
        )
    
    # Input Selection: Sample or Upload
    st.sidebar.markdown("---")
    input_source = st.sidebar.radio("Select Input Document:", ["Sample Contracts", "Upload PDF"])
    
    selected_text = ""
    selected_metadata = {}
    filename = ""
    
    if input_source == "Sample Contracts":
        sample_files = list(SAMPLE_CONTRACTS_DIR.glob("*.pdf"))
        sample_names = [f.name for f in sample_files]
        
        if sample_names:
            chosen_sample = st.sidebar.selectbox("Choose a Sample Contract:", sample_names)
            if chosen_sample:
                sample_path = SAMPLE_CONTRACTS_DIR / chosen_sample
                filename = chosen_sample
                with open(sample_path, "rb") as f:
                    pdf_bytes = f.read()
                result = extract_pdf_text_and_metadata(pdf_bytes, filename=filename)
                selected_text = result["text"]
                selected_metadata = result["metadata"]
    else:
        uploaded_file = st.sidebar.file_uploader("Upload a PDF Contract", type=["pdf"])
        if uploaded_file:
            filename = uploaded_file.name
            pdf_bytes = uploaded_file.read()
            result = extract_pdf_text_and_metadata(pdf_bytes, filename=filename)
            selected_text = result["text"]
            selected_metadata = result["metadata"]

    # Pro Feature Hooks
    render_pro_sidebar_hooks()

    # Index Document & Search Execution
    if selected_text:
        render_metadata_card(selected_metadata)
        
        # Index Document into Vector Stores
        v_manager = st.session_state.vector_manager
        parent_retriever = st.session_state.parent_retriever
        
        with st.spinner("Indexing document into ChromaDB vector stores..."):
            chunks = v_manager.index_document(selected_text, selected_metadata)
            num_parents, num_children = parent_retriever.index_document(selected_text, selected_metadata)
        
        st.success(f"Indexed {len(chunks)} Base Chunks | Parent Store: {num_parents} Parents (2000c) & {num_children} Children (400c).")
        
        st.markdown("---")
        st.subheader("🔍 Master Contract Query Laboratory")
        
        user_query = st.text_input("Ask any question about this contract:", "What are the termination clauses, liability caps, and payment obligations?")
        
        if user_query:
            if search_mode != "🔬 Compare Modes Lab":
                docs, info = execute_retriever(search_mode, user_query, k_slider, lambda_mult, full_context_mode)
                
                # Render transparent inspect cards
                if info.get("type") == "multi_query":
                    with st.expander("🧠 AI Generated Query Variations (Multi-Query)", expanded=True):
                        for idx, var in enumerate(info.get("variations", []), 1):
                            st.markdown(f"{idx}. `{var}`")
                elif info.get("type") == "self_query":
                    with st.expander("🏷️ Extracted Metadata Filters (Self-Query)", expanded=True):
                        st.json(info.get("filter", {}))
                elif info.get("type") == "parent_doc":
                    with st.expander("🧩 Parent Document Architecture Status", expanded=True):
                        st.info(f"Full Context Mode: `{info.get('full_context')}`")

                scores = info.get("scores")
                render_retrieved_chunks(docs, scores=scores, retriever_name=search_mode)

            else:
                st.subheader("🔬 Compare Any 2 Retriever Modes")
                col_sel1, col_sel2 = st.columns(2)
                
                retriever_options = [
                    "Similarity Search",
                    "MMR (Diversity Mode)",
                    "Multi-Query Retriever",
                    "Self-Query Retriever",
                    "Parent Document Retriever"
                ]
                
                with col_sel1:
                    mode_a = st.selectbox("Select Mode A:", retriever_options, index=0)
                with col_sel2:
                    mode_b = st.selectbox("Select Mode B:", retriever_options, index=1)
                
                docs_a, _ = execute_retriever(mode_a, user_query, k_slider, lambda_mult, full_context_mode)
                docs_b, _ = execute_retriever(mode_b, user_query, k_slider, lambda_mult, full_context_mode)
                
                render_comparison_benchmark(mode_a, docs_a, mode_b, docs_b)

    else:
        st.info("👈 Select a sample contract or upload a PDF from the sidebar to launch the laboratory.")

if __name__ == "__main__":
    main()
