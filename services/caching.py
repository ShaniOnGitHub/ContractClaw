"""
services/caching.py — Hash-based Document Fingerprinting & Stage Result Caching.

Prevents redundant LLM calls and expensive parsing by calculating document sha256
fingerprints and matching stage version metadata.
"""

import hashlib
import json
import logging
from typing import Dict, Any, Optional, Tuple
import sqlite3
from config import DB_PATH

logger = logging.getLogger("contractclaw.caching")

PARSER_VERSION = "parser_v4"
PROMPT_BUNDLE_VERSION = "legal_pipeline_v7"
PLAYBOOK_VERSION = "employment_v2"


def init_cache_db():
    """Initializes SQLite cache table."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS stage_cache (
                fingerprint_hash TEXT PRIMARY KEY,
                stage_id TEXT,
                parser_version TEXT,
                prompt_bundle_version TEXT,
                playbook_version TEXT,
                cached_data_json TEXT,
                created_at TEXT
            )
        """)
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Failed to initialize cache DB: {e}")


init_cache_db()


def compute_document_fingerprint(
    raw_text: str,
    stage_id: str,
    playbook_version: str = PLAYBOOK_VERSION
) -> Tuple[str, Dict[str, str]]:
    """
    Computes sha256 fingerprint combining document text, stage_id, and prompt/parser versions.
    """
    combined = f"{raw_text}:{stage_id}:{PARSER_VERSION}:{PROMPT_BUNDLE_VERSION}:{playbook_version}"
    doc_hash = hashlib.sha256(combined.encode("utf-8")).hexdigest()

    metadata = {
        "document_hash": doc_hash,
        "parser_version": PARSER_VERSION,
        "prompt_bundle_version": PROMPT_BUNDLE_VERSION,
        "playbook_version": playbook_version,
    }
    return doc_hash, metadata


def get_cached_stage_output(
    raw_text: str,
    stage_id: str,
    playbook_version: str = PLAYBOOK_VERSION
) -> Optional[Dict[str, Any]]:
    """Retrieves cached stage output if exact fingerprint and versions match."""
    doc_hash, meta = compute_document_fingerprint(raw_text, stage_id, playbook_version)

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT cached_data_json FROM stage_cache
            WHERE fingerprint_hash = ? AND parser_version = ? AND prompt_bundle_version = ? AND playbook_version = ?
        """, (doc_hash, PARSER_VERSION, PROMPT_BUNDLE_VERSION, playbook_version))
        row = cursor.fetchone()
        conn.close()

        if row and row[0]:
            logger.info(f"Cache HIT for stage '{stage_id}' (hash={doc_hash[:10]}...)")
            return json.loads(row[0])
    except Exception as e:
        logger.error(f"Cache lookup failed: {e}")

    return None


def set_cached_stage_output(
    raw_text: str,
    stage_id: str,
    data: Dict[str, Any],
    playbook_version: str = PLAYBOOK_VERSION
):
    """Saves stage output to SQLite cache."""
    doc_hash, meta = compute_document_fingerprint(raw_text, stage_id, playbook_version)
    import datetime

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO stage_cache
            (fingerprint_hash, stage_id, parser_version, prompt_bundle_version, playbook_version, cached_data_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            doc_hash, stage_id, PARSER_VERSION, PROMPT_BUNDLE_VERSION, playbook_version,
            json.dumps(data), datetime.datetime.now(datetime.timezone.utc).isoformat()
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Failed to cache stage output: {e}")
