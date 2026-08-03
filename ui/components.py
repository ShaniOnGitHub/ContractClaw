import streamlit as st
from typing import Dict, Any, List
from langchain_core.documents import Document

def render_header():
    st.set_page_config(page_title="ContractClaw - AI Contract Analysis", page_icon="🦅", layout="wide")
    st.title("🦅 ContractClaw")
    st.caption("Production AI Contract Review & LangChain Retriever Masterclass Laboratory")
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
    Renders retrieved document chunks in visually appealing Streamlit expanders with citation source cards.
    """
    st.subheader(f"🎯 Retrieved Clauses ({len(chunks)} results via {retriever_name})")
    
    if not chunks:
        st.warning("No matching contract clauses retrieved for this query.")
        return

    for idx, doc in enumerate(chunks, 1):
        score_text = f" | Similarity Score: {scores[idx-1]:.4f}" if scores and idx-1 < len(scores) else ""
        chunk_id = doc.metadata.get("chunk_id", doc.metadata.get("parent_chunk_index", "N/A"))
        contract_type = doc.metadata.get("contract_type", "Unknown")
        filename = doc.metadata.get("filename", "Document.pdf")
        
        with st.expander(f"📌 Citation #{idx} — Chunk ID: {chunk_id}{score_text}", expanded=(idx == 1)):
            st.markdown(
                f"**Source Document:** `{filename}` | **Type:** `{contract_type}` | **Chunk Size:** `{len(doc.page_content)} chars`"
            )
            st.info(doc.page_content)
            st.caption(f"Citation Source: {filename} | Extracted via {retriever_name}")


def render_comparison_benchmark(mode_a_name: str, docs_a: List[Document], mode_b_name: str, docs_b: List[Document]):
    """
    Renders side-by-side comparative laboratory results for two retriever modes.
    """
    st.subheader("⚖️ Comparative Retriever Benchmark Laboratory")
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown(f"### 🔵 {mode_a_name}")
        render_retrieved_chunks(docs_a, retriever_name=mode_a_name)
        
    with col2:
        st.markdown(f"### 🟢 {mode_b_name}")
        render_retrieved_chunks(docs_b, retriever_name=mode_b_name)


def render_pro_sidebar_hooks():
    """Renders commercial SaaS Pro feature hooks in the sidebar."""
    st.sidebar.markdown("---")
    st.sidebar.subheader("⚡ ContractClaw Pro")
    st.sidebar.info("Free Plan: 3 contracts/month")
    
    if st.sidebar.button("🚀 Batch Upload PDFs (Pro)"):
        st.sidebar.warning("🔒 Pro Feature: Batch upload multi-file PDFs is available on the Pro plan ($19/mo).")
        
    if st.sidebar.button("📊 Export Audit Report (Pro)"):
        st.sidebar.warning("🔒 Pro Feature: Exporting PDF/Word executive risk reports is available on the Pro plan ($19/mo).")
        
    if st.sidebar.button("🛡️ Overall Risk Score (Pro)"):
        st.sidebar.warning("🔒 Pro Feature: Automated 1-100 Legal Risk Index scoring is available on the Pro plan ($19/mo).")


def render_pricing_modal():
    """Renders an informational SaaS pricing plan modal."""
    st.subheader("💎 ContractClaw Commercial SaaS Plans")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown("### 🆓 Free Starter")
        st.markdown("## **$0** / month")
        st.markdown("- 3 Contract Reviews / Month")
        st.markdown("- Standard Cosine Similarity Search")
        st.markdown("- Single PDF Upload")
        st.button("Current Plan", disabled=True, key="free_plan")
        
    with col2:
        st.markdown("### ⭐ Professional (Popular)")
        st.markdown("## **$19** / month")
        st.markdown("- **Unlimited** Contract Reviews")
        st.markdown("- **All 5 Advanced Retrievers**")
        st.markdown("- **Batch PDF Uploads**")
        st.markdown("- **Export PDF/Word Reports**")
        st.markdown("- **Automated Risk Scoring (1-100)**")
        st.button("Upgrade to Pro", key="pro_plan")
        
    with col3:
        st.markdown("### 🏢 Enterprise Legal")
        st.markdown("## **$49** / month")
        st.markdown("- Dedicated ChromaDB Vector Cluster")
        st.markdown("- Custom Fine-Tuned Embedding Models")
        st.markdown("- SSO & Team Collaboration")
        st.markdown("- Custom API Access")
        st.button("Contact Sales", key="enterprise_plan")
