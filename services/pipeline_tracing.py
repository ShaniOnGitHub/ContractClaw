"""
services/pipeline_tracing.py — Per-stage tracing, run observability, and provenance tracking.

Assigns a unique run_id to every contract analysis and logs stage inputs, outputs,
durations, token costs, model metadata, and origin trails.
"""

import time
import json
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import sqlite3
from config import DB_PATH

logger = logging.getLogger("contractclaw.tracing")


def generate_run_id() -> str:
    """Generates unique run identifier: run_YYYYMMDD_HHMMSS_xxxx."""
    now_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    short_uuid = str(uuid.uuid4())[:6]
    return f"run_{now_str}_{short_uuid}"


def init_tracing_db():
    """Initializes SQLite tables for run tracing and stage logs."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS analysis_runs (
                run_id TEXT PRIMARY KEY,
                contract_id TEXT,
                user_id TEXT,
                started_at TEXT,
                completed_at TEXT,
                status TEXT,
                total_duration_ms INTEGER,
                total_input_tokens INTEGER DEFAULT 0,
                total_output_tokens INTEGER DEFAULT 0,
                total_cost_usd REAL DEFAULT 0.0,
                document_type TEXT,
                overall_score INTEGER,
                risk_level TEXT,
                metadata_json TEXT
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS stage_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id TEXT,
                stage_id TEXT,
                attempt INTEGER DEFAULT 1,
                status TEXT,
                started_at TEXT,
                completed_at TEXT,
                duration_ms INTEGER,
                input_artifact_id TEXT,
                output_artifact_id TEXT,
                prompt_version TEXT,
                model TEXT,
                temperature REAL,
                seed INTEGER,
                input_tokens INTEGER DEFAULT 0,
                output_tokens INTEGER DEFAULT 0,
                estimated_cost_usd REAL DEFAULT 0.0,
                error_message TEXT,
                data_json TEXT,
                FOREIGN KEY (run_id) REFERENCES analysis_runs(run_id)
            )
        """)
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Failed to initialize tracing DB: {e}")


# Initialize tracing DB on module load
init_tracing_db()


class RunTracer:
    """Manages single run lifecycle and records stage metrics."""
    def __init__(self, run_id: Optional[str] = None, contract_id: str = "unknown", user_id: str = "default"):
        self.run_id = run_id or generate_run_id()
        self.contract_id = contract_id
        self.user_id = user_id
        self.started_at = datetime.now(timezone.utc).isoformat()
        self.stages: List[Dict[str, Any]] = []
        self.total_input_tokens = 0
        self.total_output_tokens = 0
        self.total_cost_usd = 0.0

        self._save_run_start()

    def _save_run_start(self):
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO analysis_runs
                (run_id, contract_id, user_id, started_at, status, metadata_json)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (self.run_id, self.contract_id, self.user_id, self.started_at, "running", json.dumps({})))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Failed to record run start: {e}")

    def log_stage(
        self,
        stage_id: str,
        status: str,
        duration_ms: int,
        attempt: int = 1,
        input_artifact_id: Optional[str] = None,
        output_artifact_id: Optional[str] = None,
        prompt_version: str = "v1",
        model: str = "llama-3.3-70b-versatile",
        temperature: float = 0.0,
        seed: int = 1001,
        input_tokens: int = 0,
        output_tokens: int = 0,
        estimated_cost_usd: float = 0.0,
        error_message: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Logs a completed or failed stage."""
        now_str = datetime.now(timezone.utc).isoformat()
        stage_record = {
            "run_id": self.run_id,
            "stage_id": stage_id,
            "attempt": attempt,
            "status": status,
            "started_at": self.started_at,
            "completed_at": now_str,
            "duration_ms": duration_ms,
            "input_artifact_id": input_artifact_id or f"{stage_id}_input",
            "output_artifact_id": output_artifact_id or f"{stage_id}_output",
            "prompt_version": prompt_version,
            "model": model,
            "temperature": temperature,
            "seed": seed,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "estimated_cost_usd": estimated_cost_usd,
            "error_message": error_message,
            "data": data or {}
        }
        self.stages.append(stage_record)
        self.total_input_tokens += input_tokens
        self.total_output_tokens += output_tokens
        self.total_cost_usd += estimated_cost_usd

        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO stage_logs
                (run_id, stage_id, attempt, status, started_at, completed_at, duration_ms,
                 input_artifact_id, output_artifact_id, prompt_version, model, temperature, seed,
                 input_tokens, output_tokens, estimated_cost_usd, error_message, data_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                self.run_id, stage_id, attempt, status, self.started_at, now_str, duration_ms,
                stage_record["input_artifact_id"], stage_record["output_artifact_id"],
                prompt_version, model, temperature, seed,
                input_tokens, output_tokens, estimated_cost_usd, error_message,
                json.dumps(data or {})
            ))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Failed to insert stage log: {e}")

        return stage_record

    def finish_run(self, document_type: str, overall_score: int, risk_level: str, status: str = "completed"):
        """Finalizes run metrics and status."""
        completed_at = datetime.now(timezone.utc).isoformat()
        try:
            start_dt = datetime.fromisoformat(self.started_at)
            end_dt = datetime.fromisoformat(completed_at)
            total_duration_ms = int((end_dt - start_dt).total_seconds() * 1000)
        except Exception:
            total_duration_ms = 0

        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE analysis_runs
                SET completed_at = ?, status = ?, total_duration_ms = ?,
                    total_input_tokens = ?, total_output_tokens = ?, total_cost_usd = ?,
                    document_type = ?, overall_score = ?, risk_level = ?
                WHERE run_id = ?
            """, (
                completed_at, status, total_duration_ms,
                self.total_input_tokens, self.total_output_tokens, self.total_cost_usd,
                document_type, overall_score, risk_level, self.run_id
            ))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Failed to finish run record: {e}")


def get_run_details(run_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves full run record and stage logs by run_id."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM analysis_runs WHERE run_id = ?", (run_id,))
        run_row = cursor.fetchone()
        if not run_row:
            conn.close()
            return None

        run_dict = dict(run_row)
        cursor.execute("SELECT * FROM stage_logs WHERE run_id = ? ORDER BY id ASC", (run_id,))
        stage_rows = cursor.fetchall()
        stages = []
        for s in stage_rows:
            sd = dict(s)
            if sd.get("data_json"):
                try:
                    sd["data"] = json.loads(sd["data_json"])
                except Exception:
                    sd["data"] = {}
            stages.append(sd)

        run_dict["stages"] = stages
        conn.close()
        return run_dict
    except Exception as e:
        logger.error(f"Error fetching run details for {run_id}: {e}")
        return None
