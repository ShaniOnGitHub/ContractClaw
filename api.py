import os
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import SAMPLE_CONTRACTS_DIR
from utils.pdf_parser import extract_pdf_text_and_metadata
from retrievers.base_retriever import ContractVectorStoreManager
from retrievers.similarity_retriever import similarity_search_with_scores
from retrievers.mmr_retriever import mmr_search_documents
from retrievers.multi_query_retriever import multi_query_search
from retrievers.self_query_retriever import self_query_search
from retrievers.parent_doc_retriever import ContractParentDocumentRetriever

app = FastAPI(title="ContractClaw API", version="2.0.0")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Vector Store Managers
vector_manager = ContractVectorStoreManager(collection_name="contractclaw_similarity")
parent_retriever = ContractParentDocumentRetriever(collection_name="contractclaw_parent_doc")

# Current Document State Storage
active_document = {
    "text": "",
    "metadata": {},
    "filename": ""
}

class QueryRequest(BaseModel):
    query: str
    mode: str = "Similarity Search"
    k: int = 3
    lambda_mult: float = 0.5
    full_context: bool = True

class CompareRequest(BaseModel):
    query: str
    mode_a: str = "Similarity Search"
    mode_b: str = "MMR (Diversity Mode)"
    k: int = 3
    lambda_mult: float = 0.5
    full_context: bool = True

class SampleSelectRequest(BaseModel):
    filename: str


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "ContractClaw API v2"}


@app.get("/api/samples")
def get_sample_contracts():
    sample_files = list(SAMPLE_CONTRACTS_DIR.glob("*.pdf"))
    return {"samples": [f.name for f in sample_files]}


@app.post("/api/select_sample")
def select_sample_contract(req: SampleSelectRequest):
    sample_path = SAMPLE_CONTRACTS_DIR / req.filename
    if not sample_path.exists():
        raise HTTPException(status_code=404, detail="Sample contract not found")
        
    with open(sample_path, "rb") as f:
        pdf_bytes = f.read()
        
    result = extract_pdf_text_and_metadata(pdf_bytes, filename=req.filename)
    active_document["text"] = result["text"]
    active_document["metadata"] = result["metadata"]
    active_document["filename"] = req.filename

    # Index into vector stores
    chunks = vector_manager.index_document(result["text"], result["metadata"])
    num_p, num_c = parent_retriever.index_document(result["text"], result["metadata"])

    return {
        "status": "success",
        "metadata": result["metadata"],
        "base_chunks": len(chunks),
        "parent_docs": num_p,
        "child_docs": num_c
    }


@app.post("/api/upload")
async def upload_pdf_contract(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
    contents = await file.read()
    result = extract_pdf_text_and_metadata(contents, filename=file.filename)
    
    active_document["text"] = result["text"]
    active_document["metadata"] = result["metadata"]
    active_document["filename"] = file.filename

    chunks = vector_manager.index_document(result["text"], result["metadata"])
    num_p, num_c = parent_retriever.index_document(result["text"], result["metadata"])

    return {
        "status": "success",
        "metadata": result["metadata"],
        "base_chunks": len(chunks),
        "parent_docs": num_p,
        "child_docs": num_c
    }


def execute_retriever_logic(mode: str, query: str, k: int, lambda_mult: float, full_context: bool):
    vector_store = vector_manager.get_vector_store()
    
    if mode == "Similarity Search":
        results = similarity_search_with_scores(vector_store, query, k=k)
        docs = [{"content": doc.page_content, "metadata": doc.metadata, "score": score} for doc, score in results]
        return docs, {"type": "similarity"}
        
    elif mode in ["MMR (Diversity Mode)", "MMR"]:
        raw_docs = mmr_search_documents(vector_store, query, k=k, lambda_mult=lambda_mult)
        docs = [{"content": doc.page_content, "metadata": doc.metadata} for doc in raw_docs]
        return docs, {"type": "mmr", "lambda": lambda_mult}

    elif mode in ["Multi-Query Retriever", "Multi-Query"]:
        raw_docs, vars = multi_query_search(vector_store, query, k=k)
        docs = [{"content": doc.page_content, "metadata": doc.metadata} for doc in raw_docs]
        return docs, {"type": "multi_query", "variations": vars}

    elif mode in ["Self-Query Retriever", "Self-Query"]:
        raw_docs, filter_dict, sem_q = self_query_search(vector_store, query, k=k)
        docs = [{"content": doc.page_content, "metadata": doc.metadata} for doc in raw_docs]
        return docs, {"type": "self_query", "filter": filter_dict, "semantic_query": sem_q}

    elif mode in ["Parent Document Retriever", "Parent-Doc"]:
        raw_docs = parent_retriever.retrieve(query, k=k, full_context=full_context)
        docs = [{"content": doc.page_content, "metadata": doc.metadata} for doc in raw_docs]
        return docs, {"type": "parent_doc", "full_context": full_context}

    return [], {}


@app.post("/api/query")
def query_retriever(req: QueryRequest):
    if not active_document["text"]:
        # Auto-load sample NDA if no active document
        select_sample_contract(SampleSelectRequest(filename="sample_nda.pdf"))
        
    docs, info = execute_retriever_logic(
        mode=req.mode,
        query=req.query,
        k=req.k,
        lambda_mult=req.lambda_mult,
        full_context=req.full_context
    )
    
    return {
        "query": req.query,
        "mode": req.mode,
        "metadata": active_document["metadata"],
        "results": docs,
        "info": info
    }


@app.post("/api/compare")
def compare_retrievers(req: CompareRequest):
    if not active_document["text"]:
        select_sample_contract(SampleSelectRequest(filename="sample_nda.pdf"))
        
    docs_a, info_a = execute_retriever_logic(req.mode_a, req.query, req.k, req.lambda_mult, req.full_context)
    docs_b, info_b = execute_retriever_logic(req.mode_b, req.query, req.k, req.lambda_mult, req.full_context)

    return {
        "query": req.query,
        "mode_a": {"name": req.mode_a, "results": docs_a, "info": info_a},
        "mode_b": {"name": req.mode_b, "results": docs_b, "info": info_b}
    }
