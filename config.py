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

# Text Splitter Settings
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
PARENT_CHUNK_SIZE = 2000
PARENT_CHUNK_OVERLAP = 400
CHILD_CHUNK_SIZE = 400
CHILD_CHUNK_OVERLAP = 50

# Limits
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB
FREE_TIER_CREDITS = 15
