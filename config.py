import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Base Directories
BASE_DIR = Path(__file__).resolve().parent
SAMPLE_CONTRACTS_DIR = BASE_DIR / "sample_contracts"
CHROMA_DB_DIR = BASE_DIR / "chroma_db"
UPLOADS_DIR = BASE_DIR / "uploads"
DB_PATH = BASE_DIR / "contractclaw.db"

# Ensure directories exist
SAMPLE_CONTRACTS_DIR.mkdir(parents=True, exist_ok=True)
CHROMA_DB_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# API Keys
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# ─── Claw 1.0 Engine Settings ─────────────────────────────────────────────────
CLAW_ENGINE_VERSION = "1.0"
CLAW_CHILD_CHUNK_SIZE = 1000       # ~250 tokens (used for MMR search)
CLAW_CHILD_CHUNK_OVERLAP = 160     # ~40 tokens
CLAW_PARENT_TARGET_SIZE = 4800     # ~1200 tokens (clause-level context)
CLAW_PARENT_OVERLAP_SIZE = 400     # ~100 tokens

# Legacy chunk settings (kept for backward compatibility during migration)
CHUNK_SIZE = CLAW_CHILD_CHUNK_SIZE
CHUNK_OVERLAP = CLAW_CHILD_CHUNK_OVERLAP
PARENT_CHUNK_SIZE = CLAW_PARENT_TARGET_SIZE
PARENT_CHUNK_OVERLAP = CLAW_PARENT_OVERLAP_SIZE
CHILD_CHUNK_SIZE = CLAW_CHILD_CHUNK_SIZE
CHILD_CHUNK_OVERLAP = CLAW_CHILD_CHUNK_OVERLAP

# Limits
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB
FREE_TIER_CREDITS = 15
