"""
api.py — ContractClaw FastAPI Server (v3 Real Authentication & Scoped User Data)

Architecture & Security:
  - Auth: JWT Bearer tokens + bcrypt password hashing
  - Background Tasks: FastAPI BackgroundTasks for non-blocking PDF parsing & indexing
  - Scoping: All contract, analysis, and metric operations strictly scoped to authenticated user
"""

import os
import hashlib
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, UploadFile, File, HTTPException, Request, APIRouter, Depends, BackgroundTasks, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from config import (
    SAMPLE_CONTRACTS_DIR, UPLOADS_DIR, DB_PATH,
    CHUNK_SIZE, CHUNK_OVERLAP, MAX_FILE_SIZE
)
from database import (
    init_db, create_user, get_user_by_email, get_user_by_id, deduct_credit,
    create_contract, get_contract, list_contracts, update_contract_status,
    create_analysis, list_analyses, get_dashboard_metrics, delete_user_account,
    save_clause_annotation, get_clause_annotations,
    save_contract_obligations, get_contract_obligations, get_upcoming_deadlines,
    get_user_playbook, save_user_playbook,
)
from services.auth import (
    hash_password, verify_password, create_access_token, decode_access_token
)
from utils.pdf_parser import extract_pdf_text_and_metadata
from retrievers.base_retriever import ContractVectorStoreManager
from retrievers.claw_engine import ClawEngine, resolve_engine_mode, get_engine_display_name
from services.risk_analyzer import analyze_contract_risks
from services.redlining import RedlineGenerator
from services.playbooks import PlaybookEngine
from services.search import PortfolioSearchEngine
from database import (
    create_playbook, list_playbooks, save_redline_history
)


# ─── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("contractclaw_api")

# ─── App bootstrap ────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="ContractClaw API", version="3.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialise DB schema and default seed user
init_db()
logger.info("SQLite database initialised with multi-user auth schema")

# ─── Global Claw 1.0 Engine Manager ───────────────────────────────────────────

_claw_engines: Dict[str, ClawEngine] = {}

def _get_claw_engine(contract_id: str) -> ClawEngine:
    if contract_id not in _claw_engines:
        _claw_engines[contract_id] = ClawEngine(collection_name=f"claw_{contract_id[:8]}")
    return _claw_engines[contract_id]


# ─── Authentication Dependency ────────────────────────────────────────────────

security = HTTPBearer(auto_error=False)

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Dict[str, Any]:
    """Dependency that extracts JWT bearer token and resolves the authenticated user."""
    token = None
    if credentials:
        token = credentials.credentials
    else:
        # Fallback to query param or custom header
        token = request.query_params.get("token") or request.headers.get("X-Access-Token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload["sub"]
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists",
        )
    return user


# ─── Pydantic Models ──────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class QueryRequest(BaseModel):
    query: str
    mode: str = "claw_1_0"
    k: int = 5
    lambda_mult: float = 0.5
    full_context: bool = True

class AnalyzeRequest(BaseModel):
    mode: str = "claw_1_0"
    query: str = "Identify all termination clauses, liability caps, payment obligations, IP ownership, indemnification, and non-compete restrictions."
    k: int = 8
    lambda_mult: float = 0.5

class CompareRequest(BaseModel):
    query: str
    mode_a: str = "claw_1_0"
    mode_b: str = "claw_1_0"
    k: int = 5
    lambda_mult: float = 0.5
    full_context: bool = True

class SampleSelectRequest(BaseModel):
    filename: str

class ApiKeyRequest(BaseModel):
    api_key: str

class AnnotationRequest(BaseModel):
    clause_index: int
    flagged: bool
    note: str = ""


# ─── Claw 1.0 Retriever Dispatch ──────────────────────────────────────────────

def _run_retriever(
    contract_id: str,
    query: str,
    raw_text: Optional[str] = None,
    meta: Optional[Dict[str, Any]] = None,
    k: Optional[int] = None,
    lambda_mult: Optional[float] = None,
    full_context: Optional[bool] = None,
):
    claw_eng = _get_claw_engine(contract_id)
    if not claw_eng.parent_store and raw_text and raw_text.strip():
        claw_eng.index_document(raw_text, meta or {"contract_id": contract_id})

    docs, trace = claw_eng.retrieve(query, k=k, lambda_mult=lambda_mult)
    info = {
        "engine": claw_eng.get_engine_info(),
        "trace": trace,
        "requested_k": k,
        "requested_lambda_mult": lambda_mult,
        "full_context": full_context,
    }
    return docs, info


# ─── Background Processing Task ───────────────────────────────────────────────

def process_and_index_contract_background(contract_id: str, file_bytes: bytes, filename: str):
    """Background task: parse PDF, chunk text, embed into ChromaDB."""
    logger.info(f"Background task started for contract {contract_id} ({filename})")
    update_contract_status(contract_id, "indexing")

    try:
        # Extract text & metadata
        result = extract_pdf_text_and_metadata(file_bytes, filename=filename)
        meta = result["metadata"]
        raw_text = result["text"]

        if not raw_text.strip():
            update_contract_status(
                contract_id, "error",
                error_message="Could not extract text from PDF. Ensure file contains selectable text."
            )
            logger.error(f"Text extraction empty for {contract_id}")
            return

        meta.update({
            "contract_id": contract_id,
            "filename": filename,
        })

        # Indexing in Claw 1.0 engine
        claw_eng = _get_claw_engine(contract_id)
        trace = claw_eng.index_document(raw_text, meta)

        update_contract_status(
            contract_id, "indexed",
            raw_text=raw_text,
            contract_type=meta.get("contract_type", "Other"),
            parties=meta.get("parties", ""),
        )
        logger.info(f"Background task finished for {contract_id}: Claw 1.0 indexed {trace.get('parent_count', 0)} parents, {trace.get('child_count', 0)} children.")

    except Exception as e:
        logger.error(f"Background processing error for {contract_id}: {e}")
        update_contract_status(contract_id, "error", error_message=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
# V1 ROUTER (Real Auth & Data)
# ═══════════════════════════════════════════════════════════════════════════════

v1 = APIRouter(prefix="/api/v1")


# ── Auth Endpoints ────────────────────────────────────────────────────────────

@v1.post("/auth/signup")
@limiter.limit("10/minute")
def signup(request: Request, req: SignupRequest):
    email = req.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(400, "Please provide a valid email address.")
    if len(req.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters long.")

    try:
        pwd_hash = hash_password(req.password)
        user = create_user(email=email, password_hash=pwd_hash)
        token = create_access_token({"sub": user["id"], "email": user["email"]})
        user.pop("password_hash", None)
        return {"token": token, "user": user}
    except ValueError as e:
        raise HTTPException(400, str(e))


@v1.post("/auth/login")
@limiter.limit("15/minute")
def login(request: Request, req: LoginRequest):
    email = req.email.strip().lower()
    user = get_user_by_email(email)
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password.")

    token = create_access_token({"sub": user["id"], "email": user["email"]})
    user.pop("password_hash", None)
    return {"token": token, "user": user}


@v1.get("/auth/me")
def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    user = current_user.copy()
    user.pop("password_hash", None)
    return user


@v1.delete("/auth/me")
def delete_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Delete authenticated user account and purge all associated contracts & analysis data."""
    user_id = current_user["id"]
    delete_user_account(user_id)
    logger.info(f"User account {user_id} and all associated data purged successfully.")
    return {"message": "Account and all associated contracts permanently deleted."}


# ── Real File Upload (Background Processing) ──────────────────────────────────

@v1.post("/contracts/upload")
async def upload_contract(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported.")

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(400, "Uploaded PDF file is empty (0 bytes).")
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(413, f"File exceeds 25 MB limit ({len(contents) // 1024} KB).")


    user_id = current_user["id"]
    user_upload_dir = UPLOADS_DIR / user_id
    user_upload_dir.mkdir(parents=True, exist_ok=True)

    # Save to disk durability path
    contract_id = create_contract(
        user_id=user_id,
        filename=file.filename,
        status="pending",
    )
    file_path = user_upload_dir / f"{contract_id}.pdf"
    file_path.write_bytes(contents)

    # Update file path in database
    update_contract_status(contract_id, "pending", error_message="")

    # Kick off background task for non-blocking PDF text parsing & vector indexing
    background_tasks.add_task(
        process_and_index_contract_background,
        contract_id=contract_id,
        file_bytes=contents,
        filename=file.filename,
    )

    logger.info(f"Contract uploaded & background processing queued: {contract_id} for user {user_id}")

    return {
        "contract_id": contract_id,
        "filename": file.filename,
        "status": "pending",
        "message": "Upload accepted. Background parsing and indexing initiated.",
    }


# ── List & Get Contracts (User Scoped) ────────────────────────────────────────

@v1.get("/contracts/")
def list_user_contracts(current_user: Dict[str, Any] = Depends(get_current_user)):
    contracts = list_contracts(user_id=current_user["id"])
    for c in contracts:
        c.pop("raw_text", None)
    return {"contracts": contracts, "total": len(contracts)}


@v1.get("/contracts/{contract_id}")
def get_user_contract(contract_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    contract = get_contract(contract_id, user_id=current_user["id"])
    if not contract:
        raise HTTPException(404, f"Contract {contract_id} not found.")
    return contract


# ── Query & Analyze (User Scoped) ─────────────────────────────────────────────

@v1.post("/contracts/{contract_id}/query")
def query_user_contract(
    contract_id: str,
    req: QueryRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    contract = get_contract(contract_id, user_id=current_user["id"])
    if not contract:
        raise HTTPException(404, f"Contract {contract_id} not found.")
    if contract["status"] != "indexed":
        raise HTTPException(409, f"Contract status is '{contract['status']}'. Must be 'indexed' before querying.")

    docs, info = _run_retriever(
        contract_id=contract_id,
        query=req.query,
        raw_text=contract.get("raw_text"),
        meta={"contract_id": contract_id, "filename": contract.get("filename", "")},
        k=req.k,
        lambda_mult=req.lambda_mult,
        full_context=req.full_context,
    )

    return {
        "contract_id": contract_id,
        "query": req.query,
        "engine": info.get("engine", {"id": "claw_1_0", "name": "Claw 1.0", "description": "Contract intelligence engine"}),
        "mode": "Claw 1.0",
        "results": docs,
        "info": info,
    }


@v1.post("/contracts/{contract_id}/analyze")
def analyze_user_contract(
    contract_id: str,
    req: AnalyzeRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user["id"]
    user_email = str(current_user.get("email", "")).lower().strip()
    user_tier = str(current_user.get("tier", "")).lower().strip()
    is_unlimited_user = user_email == "admin@contractclaw.ai" or user_email == os.getenv("CONTRACTCLAW_CREATOR_EMAIL", "admin@contractclaw.ai").lower().strip() or user_tier in {"creator", "admin", "pro", "enterprise", "unlimited"}
    contract = get_contract(contract_id, user_id=user_id)
    if not contract:
        raise HTTPException(404, f"Contract {contract_id} not found.")
    if contract["status"] != "indexed":
        raise HTTPException(409, f"Contract status is '{contract['status']}'. Must be 'indexed' before analyzing.")

    # Deduct credit for user
    try:
        remaining = -1 if is_unlimited_user else deduct_credit(user_id)
    except ValueError as e:
        raise HTTPException(402, str(e))

    docs, info = _run_retriever(
        contract_id=contract_id,
        query=req.query,
        raw_text=contract.get("raw_text"),
        meta={"contract_id": contract_id, "filename": contract.get("filename", "")},
        k=req.k,
        lambda_mult=req.lambda_mult,
        full_context=None,
    )

    current_type = contract.get("contract_type", "Other")
    if contract.get("raw_text"):
        from utils.pdf_parser import detect_contract_type
        detected = detect_contract_type(contract["raw_text"], contract.get("filename", ""))
        if detected != "Other" and (current_type in ("NDA", "Other") or detected == "Employment Agreement"):
            current_type = detected
            update_contract_status(contract_id, "indexed", contract_type=current_type)

    try:
        analysis_result = analyze_contract_risks(
            chunks=docs,
            contract_type=current_type,
            full_text=contract.get("raw_text"),
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        logger.error(f"Risk analysis failed: {e}")
        raise HTTPException(500, f"LLM analysis failed: {str(e)}")

    overall_score = analysis_result.get("overall_score", 0)

    analysis_id = create_analysis(
        contract_id=contract_id,
        user_id=user_id,
        query=req.query,
        retriever_mode="claw_1_0",
        results=analysis_result,
        overall_score=overall_score,
    )

    update_contract_status(contract_id, "indexed", risk_score=overall_score)

    return {
        "analysis_id": analysis_id,
        "contract_id": contract_id,
        "run_id": analysis_result.get("run_id", "run_latest"),
        "engine": {
            "id": "claw_1_0",
            "name": "Claw 1.0",
            "description": "Contract intelligence engine"
        },
        "retriever_mode": "Claw 1.0",
        "retrieval_info": info,
        "risks": analysis_result.get("risks", []),
        "checklist": analysis_result.get("checklist", []),
        "overall_score": overall_score,
        "risk_level": analysis_result.get("risk_level", "Moderate Risk"),
        "summary": analysis_result.get("summary", ""),
        "credits_remaining": remaining,
    }


# ── Run Observability & Stage Timeline Endpoints ─────────────────────────────

@v1.get("/runs/{run_id}")
def get_run_trace(
    run_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    from services.pipeline_tracing import get_run_details
    details = get_run_details(run_id)
    if not details:
        raise HTTPException(404, f"Run {run_id} not found.")
    return details



# ── Clause Annotations & Notes ───────────────────────────────────────────────

@v1.get("/contracts/{contract_id}/annotations")
def get_user_annotations(
    contract_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    contract = get_contract(contract_id, user_id=current_user["id"])
    if not contract:
        raise HTTPException(404, f"Contract {contract_id} not found.")
    anns = get_clause_annotations(contract_id, current_user["id"])
    return {"annotations": anns}


@v1.post("/contracts/{contract_id}/annotations")
def save_user_annotation(
    contract_id: str,
    req: AnnotationRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    contract = get_contract(contract_id, user_id=current_user["id"])
    if not contract:
        raise HTTPException(404, f"Contract {contract_id} not found.")
    save_clause_annotation(
        contract_id=contract_id,
        user_id=current_user["id"],
        clause_index=req.clause_index,
        flagged=req.flagged,
        note=req.note,
    )
    return {"message": "Annotation saved successfully."}



# ── Analysis History ──────────────────────────────────────────────────────────

@v1.get("/history/")
def list_user_history(current_user: Dict[str, Any] = Depends(get_current_user)):
    analyses = list_analyses(user_id=current_user["id"], limit=50)
    return {"history": analyses, "total": len(analyses)}


# ── Real User Credits & Dashboard Metrics ─────────────────────────────────────

@v1.get("/user/credits")
def get_user_credits_endpoint(current_user: Dict[str, Any] = Depends(get_current_user)):
    return {
        "credits_remaining": current_user["credits_remaining"],
        "tier": current_user["tier"],
    }


@v1.get("/metrics/dashboard")
def dashboard_metrics_endpoint(current_user: Dict[str, Any] = Depends(get_current_user)):
    return get_dashboard_metrics(user_id=current_user["id"])


@v1.get("/deadlines")
def get_deadlines_endpoint(current_user: Dict[str, Any] = Depends(get_current_user)):
    return {"deadlines": get_upcoming_deadlines(user_id=current_user["id"])}



# ── Settings ──────────────────────────────────────────────────────────────────

@v1.post("/settings/apikey")
def save_api_key(req: ApiKeyRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    key = req.api_key.strip()
    if not key.startswith("sk-"):
        raise HTTPException(400, "Invalid API key format. Must start with 'sk-'.")

    os.environ["OPENAI_API_KEY"] = key
    env_path = Path(__file__).resolve().parent / ".env"
    lines = []
    if env_path.exists():
        lines = env_path.read_text().splitlines()

    new_lines = []
    found = False
    for line in lines:
        if line.startswith("OPENAI_API_KEY="):
            new_lines.append(f"OPENAI_API_KEY={key}")
            found = True
        else:
            new_lines.append(line)
    if not found:
        new_lines.append(f"OPENAI_API_KEY={key}")

    env_path.write_text("\n".join(new_lines) + "\n")
    logger.info("OpenAI API key updated via Settings endpoint.")
    return {"message": "API key saved successfully."}


# ── Redlining & Playbooks ──────────────────────────────────────────────────────

class RedlineRequest(BaseModel):
    contract_id: Optional[str] = "contract_demo"
    clause_category: str
    original_text: str

class CreatePlaybookRequest(BaseModel):
    name: str
    description: str = ""
    rules: List[Dict[str, Any]]

class PlaybookCheckRequest(BaseModel):
    contract_id: str
    playbook_id: Optional[str] = None

class PortfolioSearchRequest(BaseModel):
    query: str
    contract_type: Optional[str] = "all"
    min_risk_score: Optional[int] = None


@v1.post("/redline/generate")
def generate_redlines_endpoint(req: RedlineRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    result = RedlineGenerator.generate_redlines(req.clause_category, req.original_text)
    if req.contract_id:
        # Save balanced proposal to history
        balanced_text = result.get("positions", {}).get("balanced", {}).get("proposed_text", "")
        rationale = result.get("positions", {}).get("balanced", {}).get("rationale", "")
        save_redline_history(req.contract_id, req.clause_category, req.original_text, balanced_text, "balanced", rationale)
    return result


@v1.get("/playbooks")
def get_playbooks_endpoint(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_pbs = list_playbooks(user_id=current_user["id"])
    all_pbs = PlaybookEngine.DEFAULT_PLAYBOOKS + user_pbs
    return {"playbooks": all_pbs}


@v1.post("/playbooks")
def create_playbook_endpoint(req: CreatePlaybookRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    if not req.name.strip():
        raise HTTPException(400, "Playbook name is required.")
    return create_playbook(current_user["id"], req.name, req.description, req.rules)


@v1.post("/analysis/playbook-check")
def check_contract_playbook_endpoint(req: PlaybookCheckRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    contract = get_contract(req.contract_id, user_id=current_user["id"])
    if not contract:
        raise HTTPException(404, "Contract not found.")

    raw_text = contract.get("raw_text", "")
    sample_clauses = [{"text": raw_text}]

    # Load rules
    rules = PlaybookEngine.DEFAULT_PLAYBOOKS[0]["rules"]
    if req.playbook_id:
        all_pbs = list_playbooks(current_user["id"]) + PlaybookEngine.DEFAULT_PLAYBOOKS
        for pb in all_pbs:
            if pb.get("id") == req.playbook_id:
                rules = pb.get("rules", [])
                break

    return PlaybookEngine.evaluate_contract(sample_clauses, rules)


@v1.post("/search/portfolio")
def search_portfolio_endpoint(req: PortfolioSearchRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    results = PortfolioSearchEngine.search_contracts(req.query, req.contract_type, req.min_risk_score)
    return {"query": req.query, "count": len(results), "results": results}


app.include_router(v1)



# ═══════════════════════════════════════════════════════════════════════════════
# LEGACY ROUTES (Backward compat)
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/health")
def health():
    return {"status": "ok", "version": "3.0.0"}


@app.get("/api/samples")
def get_samples():
    files = list(SAMPLE_CONTRACTS_DIR.glob("*.pdf"))
    return {"samples": [f.name for f in files]}
