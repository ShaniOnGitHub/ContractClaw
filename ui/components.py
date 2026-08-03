import streamlit as st
from typing import Dict, Any, List
from langchain_core.documents import Document

def render_header():
    st.set_page_config(page_title="ContractClaw - AI Contract Analysis", page_icon="🦅", layout="wide")
    st.title("🦅 ContractClaw")
    st.caption("Learn LangChain Retrievers Interactively through Real Contract Analysis")
    st.markdown("---")


def render_metadata_card(metadata: Dict[str, Any]):
    """Displays contract metadata in stylized Streamlit metric cards."""
    st.subheader("📋 Document Metadata")
    
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Contract Type", metadata.get("contract_type", "Unknown"))
    with col2:
        st.metric("Upload Date", metadata.get("upload_date", "Unknown"))
    with col3:
        st.metric("File Name", metadata.get("filename", "Unknown"))
    with col4:
        st.metric("Parties Involved", metadata.get("parties", "Unknown"))


def render_retrieved_chunks(chunks: List[Document], scores: List[float] = None, retriever_name: str = "Similarity Search"):
    """
    Renders retrieved document chunks in visually appealing Streamlit expanders & cards.
    """
    st.subheader(f"🎯 Retrieved Chunks ({len(chunks)} results via {retriever_name})")
    
    if not chunks:
        st.warning("No matching contract chunks retrieved for this query.")
        return

    for idx, doc in enumerate(chunks, 1):
        score_text = f" | Similarity Score: {scores[idx-1]:.4f}" if scores and idx-1 < len(scores) else ""
        chunk_id = doc.metadata.get("chunk_id", "N/A")
        contract_type = doc.metadata.get("contract_type", "Unknown")
        
        with st.expander(f"📌 Result #{idx} (Chunk ID: {chunk_id}{score_text})", expanded=(idx == 1)):
            st.markdown(f"**Contract Type:** `{contract_type}` | **Source:** `{doc.metadata.get('filename', 'Doc')}`")
            st.info(doc.page_content)
