"""
database.py — SQLite persistence layer for ContractClaw (v3 with Auth & Multi-User Support).

Tables:
  users      — user authentication, credentials, and credits
  contracts  — uploaded PDF metadata + processing status (scoped by user_id)
  analyses   — risk analysis results per contract (scoped by user_id)
"""

import sqlite3
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from config import DB_PATH, FREE_TIER_CREDITS
from services.auth import hash_password


# ─── Schema ──────────────────────────────────────────────────────────────────

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id                  TEXT PRIMARY KEY,
    email               TEXT UNIQUE NOT NULL,
    password_hash       TEXT NOT NULL,
    credits_remaining   INTEGER DEFAULT 15,
    tier                TEXT DEFAULT 'free',
    created_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contracts (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL,
    filename        TEXT NOT NULL,
    contract_type   TEXT DEFAULT 'Other',
    parties         TEXT DEFAULT '',
    upload_date     TEXT NOT NULL,
    status          TEXT DEFAULT 'pending',   -- pending | indexing | indexed | error
    raw_text        TEXT DEFAULT '',
    risk_score      INTEGER DEFAULT 0,
    risk_level      TEXT DEFAULT 'Low',       -- Low | Medium | High
    error_message   TEXT DEFAULT '',
    file_path       TEXT DEFAULT '',
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS analyses (
    id              TEXT PRIMARY KEY,
    contract_id     TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    query           TEXT NOT NULL,
    retriever_mode  TEXT NOT NULL,
    results_json    TEXT NOT NULL,
    overall_score   INTEGER DEFAULT 0,
    timestamp       TEXT NOT NULL,
    credits_used    INTEGER DEFAULT 1,
    FOREIGN KEY(contract_id) REFERENCES contracts(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS playbooks (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT DEFAULT '',
    rules_json      TEXT NOT NULL,
    is_default      INTEGER DEFAULT 0,
    created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS redline_history (
    id              TEXT PRIMARY KEY,
    contract_id     TEXT NOT NULL,
    clause_category TEXT NOT NULL,
    original_text   TEXT NOT NULL,
    proposed_text   TEXT NOT NULL,
    position        TEXT NOT NULL,
    rationale       TEXT DEFAULT '',
    created_at      TEXT NOT NULL
);


CREATE TABLE IF NOT EXISTS clause_annotations (
    id              TEXT PRIMARY KEY,
    contract_id     TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    clause_index    INTEGER NOT NULL,
    flagged         INTEGER DEFAULT 0,
    note            TEXT DEFAULT '',
    updated_at      TEXT NOT NULL,
    UNIQUE(contract_id, user_id, clause_index)
);

CREATE TABLE IF NOT EXISTS contract_obligations (
    id              TEXT PRIMARY KEY,
    contract_id     TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    title           TEXT NOT NULL,
    deadline_date   TEXT DEFAULT '',
    days_remaining  INTEGER DEFAULT 0,
    obligation_type TEXT DEFAULT 'notice',
    summary         TEXT DEFAULT '',
    created_at      TEXT NOT NULL,
    FOREIGN KEY(contract_id) REFERENCES contracts(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_playbooks (
    user_id                     TEXT PRIMARY KEY,
    max_liability_cap           TEXT DEFAULT '$100,000',
    min_notice_days             INTEGER DEFAULT 30,
    flag_unlimited_liability    INTEGER DEFAULT 1,
    updated_at                  TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
);
"""



# ─── Connection helper ────────────────────────────────────────────────────────

def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn


# ─── Initialise DB ────────────────────────────────────────────────────────────

def init_db() -> None:
    """Create tables and ensure columns exist."""
    with _connect() as conn:
        conn.executescript(SCHEMA)
        
        # Check and add missing columns for backward compatibility if schema evolved
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(contracts)")
        cols = [col[1] for col in cursor.fetchall()]
        
        if "user_id" not in cols:
            conn.execute("ALTER TABLE contracts ADD COLUMN user_id TEXT DEFAULT 'default'")
        if "risk_level" not in cols:
            conn.execute("ALTER TABLE contracts ADD COLUMN risk_level TEXT DEFAULT 'Low'")
        if "error_message" not in cols:
            conn.execute("ALTER TABLE contracts ADD COLUMN error_message TEXT DEFAULT ''")
        if "file_path" not in cols:
            conn.execute("ALTER TABLE contracts ADD COLUMN file_path TEXT DEFAULT ''")

        cursor.execute("PRAGMA table_info(users)")
        u_cols = [col[1] for col in cursor.fetchall()]
        if "password_hash" not in u_cols:
            conn.execute("ALTER TABLE users ADD COLUMN password_hash TEXT DEFAULT ''")
        if "created_at" not in u_cols:
            conn.execute("ALTER TABLE users ADD COLUMN created_at TEXT DEFAULT ''")

        cursor.execute("PRAGMA table_info(analyses)")
        a_cols = [col[1] for col in cursor.fetchall()]
        if "user_id" not in a_cols:
            conn.execute("ALTER TABLE analyses ADD COLUMN user_id TEXT DEFAULT 'default'")

        # Ensure default seed account exists
        seed_default_user(conn)
        conn.commit()


def seed_default_user(conn: sqlite3.Connection) -> None:
    """Seed default admin@contractclaw.ai account if missing or update missing hash/email."""
    pwd = hash_password("password123")
    now = datetime.now(timezone.utc).isoformat()
    row = conn.execute(
        "SELECT id, email, password_hash FROM users WHERE id = ? OR email = ?",
        ("default", "admin@contractclaw.ai"),
    ).fetchone()
    if not row:
        conn.execute(
            """INSERT INTO users (id, email, password_hash, credits_remaining, tier, created_at)
               VALUES (?, ?, ?, ?, 'free', ?)""",
            ("default", "admin@contractclaw.ai", pwd, FREE_TIER_CREDITS, now),
        )
    else:
        conn.execute(
            "UPDATE users SET email = ?, password_hash = ? WHERE id = ?",
            ("admin@contractclaw.ai", pwd, row["id"]),
        )


# ─── User Authentication & Credits ───────────────────────────────────────────

def create_user(email: str, password_hash: str) -> Dict[str, Any]:
    """Create a new user record. Raises ValueError if email exists."""
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    with _connect() as conn:
        try:
            conn.execute(
                """INSERT INTO users (id, email, password_hash, credits_remaining, tier, created_at)
                   VALUES (?, ?, ?, ?, 'free', ?)""",
                (user_id, email.lower().strip(), password_hash, FREE_TIER_CREDITS, now),
            )
            conn.commit()
        except sqlite3.IntegrityError:
            raise ValueError(f"User with email '{email}' already exists.")
    return get_user_by_id(user_id)  # type: ignore


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email.lower().strip(),)).fetchone()
    return dict(row) if row else None


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return dict(row) if row else None


def delete_user_account(user_id: str) -> None:
    """Delete a user account and purge all associated contracts and analyses."""
    with _connect() as conn:
        conn.execute("DELETE FROM analyses WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM contracts WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()


def deduct_credit(user_id: str) -> int:
    """Deducts 1 credit for user_id; returns remaining credits."""
    user = get_user_by_id(user_id)
    if not user:
        raise ValueError(f"User {user_id} not found.")
    remaining = user["credits_remaining"]
    if remaining <= 0:
        raise ValueError("No credits remaining. Upgrade account for unlimited analyses.")
    new_remaining = remaining - 1
    with _connect() as conn:
        conn.execute(
            "UPDATE users SET credits_remaining = ? WHERE id = ?",
            (new_remaining, user_id),
        )
        conn.commit()
    return new_remaining


# ─── Contracts (User Scoped) ──────────────────────────────────────────────────

def create_contract(
    user_id: str,
    filename: str,
    contract_type: str = "Other",
    parties: str = "",
    raw_text: str = "",
    file_path: str = "",
    status: str = "pending",
) -> str:
    """Insert a new contract row; returns generated contract_id."""
    contract_id = str(uuid.uuid4())
    upload_date = datetime.now(timezone.utc).isoformat()
    with _connect() as conn:
        conn.execute(
            """INSERT INTO contracts
               (id, user_id, filename, contract_type, parties, upload_date, status, raw_text, file_path)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (contract_id, user_id, filename, contract_type, parties, upload_date, status, raw_text, file_path),
        )
        conn.commit()
    return contract_id


def get_contract(contract_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    with _connect() as conn:
        if user_id:
            row = conn.execute(
                "SELECT * FROM contracts WHERE id = ? AND user_id = ?", (contract_id, user_id)
            ).fetchone()
        else:
            row = conn.execute(
                "SELECT * FROM contracts WHERE id = ?", (contract_id,)
            ).fetchone()
    return dict(row) if row else None


def list_contracts(user_id: str) -> List[Dict[str, Any]]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM contracts WHERE user_id = ? ORDER BY upload_date DESC", (user_id,)
        ).fetchall()
    return [dict(r) for r in rows]


def update_contract_status(
    contract_id: str,
    status: str,
    raw_text: Optional[str] = None,
    contract_type: Optional[str] = None,
    parties: Optional[str] = None,
    risk_score: Optional[int] = None,
    risk_level: Optional[str] = None,
    error_message: Optional[str] = None,
) -> None:
    """Update contract fields during processing / analysis pipeline."""
    fields = ["status = ?"]
    params: List[Any] = [status]

    if raw_text is not None:
        fields.append("raw_text = ?")
        params.append(raw_text)
    if contract_type is not None:
        fields.append("contract_type = ?")
        params.append(contract_type)
    if parties is not None:
        fields.append("parties = ?")
        params.append(parties)
    if risk_score is not None:
        fields.append("risk_score = ?")
        params.append(risk_score)
        if risk_level is None:
            risk_level = "High" if risk_score >= 70 else ("Medium" if risk_score >= 40 else "Low")
        fields.append("risk_level = ?")
        params.append(risk_level)
    elif risk_level is not None:
        fields.append("risk_level = ?")
        params.append(risk_level)
    if error_message is not None:
        fields.append("error_message = ?")
        params.append(error_message)

    params.append(contract_id)
    sql = f"UPDATE contracts SET {', '.join(fields)} WHERE id = ?"

    with _connect() as conn:
        conn.execute(sql, params)
        conn.commit()


# ─── Analyses (User Scoped) ───────────────────────────────────────────────────

def create_analysis(
    contract_id: str,
    user_id: str,
    query: str,
    retriever_mode: str,
    results: Any,
    overall_score: int = 0,
) -> str:
    analysis_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()
    results_json = json.dumps(results)
    with _connect() as conn:
        conn.execute(
            """INSERT INTO analyses
               (id, contract_id, user_id, query, retriever_mode, results_json, overall_score, timestamp)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (analysis_id, contract_id, user_id, query, retriever_mode, results_json, overall_score, timestamp),
        )
        conn.commit()
    return analysis_id


def list_analyses(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    with _connect() as conn:
        rows = conn.execute(
            """SELECT a.*, c.filename, c.contract_type
               FROM analyses a
               LEFT JOIN contracts c ON a.contract_id = c.id
               WHERE a.user_id = ?
               ORDER BY a.timestamp DESC
               LIMIT ?""",
            (user_id, limit),
        ).fetchall()
    records = []
    for r in rows:
        d = dict(r)
        try:
            d["results"] = json.loads(d.pop("results_json"))
        except Exception:
            d["results"] = []
        records.append(d)
    return records


# ─── User-Scoped Dashboard Metrics ────────────────────────────────────────────

def get_dashboard_metrics(user_id: str) -> Dict[str, Any]:
    """Compute real dashboard statistics scoped to user_id."""
    with _connect() as conn:
        total = conn.execute(
            "SELECT COUNT(*) FROM contracts WHERE user_id = ?", (user_id,)
        ).fetchone()[0]
        
        high_risk = conn.execute(
            """SELECT COUNT(*) FROM contracts 
               WHERE user_id = ? AND (risk_score >= 70 OR risk_level = 'High')""",
            (user_id,)
        ).fetchone()[0]
        
        pending = conn.execute(
            """SELECT COUNT(*) FROM contracts 
               WHERE user_id = ? AND status IN ('uploaded', 'pending', 'indexing')""",
            (user_id,)
        ).fetchone()[0]
        
        avg_score_row = conn.execute(
            """SELECT AVG(risk_score) FROM contracts 
               WHERE user_id = ? AND risk_score > 0""",
            (user_id,)
        ).fetchone()[0]

    return {
        "total_contracts": total,
        "high_risk_count": high_risk,
        "pending_review": pending,
        "avg_risk_score": round(avg_score_row or 0.0, 1),
    }


# ─── Clause Annotations & Notes ───────────────────────────────────────────────

def save_clause_annotation(
    contract_id: str,
    user_id: str,
    clause_index: int,
    flagged: bool,
    note: str,
) -> None:
    ann_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    with _connect() as conn:
        conn.execute(
            """INSERT INTO clause_annotations (id, contract_id, user_id, clause_index, flagged, note, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(contract_id, user_id, clause_index) DO UPDATE SET
               flagged = excluded.flagged,
               note = excluded.note,
               updated_at = excluded.updated_at""",
            (ann_id, contract_id, user_id, clause_index, 1 if flagged else 0, note, now),
        )
        conn.commit()


def get_clause_annotations(contract_id: str, user_id: str) -> List[Dict[str, Any]]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM clause_annotations WHERE contract_id = ? AND user_id = ?",
            (contract_id, user_id),
        ).fetchall()
    return [dict(r) for r in rows]


# ─── Contract Obligations & Deadlines ─────────────────────────────────────────

def save_contract_obligations(
    contract_id: str, user_id: str, obligations: List[Dict[str, Any]]
) -> None:
    """Save extracted obligations for a contract."""
    now = datetime.now(timezone.utc).isoformat()
    today = date.today()

    with _connect() as conn:
        conn.execute("DELETE FROM contract_obligations WHERE contract_id = ? AND user_id = ?", (contract_id, user_id))
        for ob in obligations:
            ob_id = str(uuid.uuid4())
            deadline_str = ob.get("deadline_date", "")
            days_rem = 30
            
            if deadline_str and re.match(r"^\d{4}-\d{2}-\d{2}$", deadline_str):
                try:
                    dt = date.fromisoformat(deadline_str)
                    days_rem = (dt - today).days
                except Exception:
                    days_rem = 30

            conn.execute(
                """INSERT INTO contract_obligations (id, contract_id, user_id, title, deadline_date, days_remaining, obligation_type, summary, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    ob_id,
                    contract_id,
                    user_id,
                    ob.get("title", "Obligation Deadline"),
                    deadline_str,
                    days_rem,
                    ob.get("obligation_type", "notice"),
                    ob.get("summary", ""),
                    now,
                ),
            )
        conn.commit()


def get_contract_obligations(contract_id: str, user_id: str) -> List[Dict[str, Any]]:
    with _connect() as conn:
        rows = conn.execute(
            """SELECT o.*, c.filename as contract_name FROM contract_obligations o
               JOIN contracts c ON o.contract_id = c.id
               WHERE o.contract_id = ? AND o.user_id = ?
               ORDER BY o.days_remaining ASC""",
            (contract_id, user_id),
        ).fetchall()
    return [dict(r) for r in rows]


def get_upcoming_deadlines(user_id: str, max_days: int = 30) -> List[Dict[str, Any]]:
    """Get obligations due within max_days across all user contracts."""
    with _connect() as conn:
        rows = conn.execute(
            """SELECT o.*, c.filename as contract_name FROM contract_obligations o
               JOIN contracts c ON o.contract_id = c.id
               WHERE o.user_id = ? AND o.days_remaining >= 0 AND o.days_remaining <= ?
               ORDER BY o.days_remaining ASC LIMIT 10""",
            (user_id, max_days),
        ).fetchall()
    return [dict(r) for r in rows]


# ─── Custom Risk Playbook ─────────────────────────────────────────────────────

def get_user_playbook(user_id: str) -> Dict[str, Any]:
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM user_playbooks WHERE user_id = ?", (user_id,)
        ).fetchone()
    if row:
        return dict(row)
    return {
        "user_id": user_id,
        "max_liability_cap": "$100,000",
        "min_notice_days": 30,
        "flag_unlimited_liability": 1,
    }


def save_user_playbook(
    user_id: str,
    max_liability_cap: str,
    min_notice_days: int,
    flag_unlimited_liability: bool,
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    with _connect() as conn:
        conn.execute(
            """INSERT INTO user_playbooks (user_id, max_liability_cap, min_notice_days, flag_unlimited_liability, updated_at)
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(user_id) DO UPDATE SET
               max_liability_cap = excluded.max_liability_cap,
               min_notice_days = excluded.min_notice_days,
               flag_unlimited_liability = excluded.flag_unlimited_liability,
               updated_at = excluded.updated_at""",
            (
                user_id,
                max_liability_cap,
                min_notice_days,
                1 if flag_unlimited_liability else 0,
                now,
            ),
        )
        conn.commit()
    return get_user_playbook(user_id)


def create_playbook(user_id: str, name: str, description: str, rules: List[Dict[str, Any]]) -> Dict[str, Any]:
    playbook_id = f"pb_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    rules_json = json.dumps(rules)
    with _connect() as conn:
        conn.execute(
            """INSERT INTO playbooks (id, user_id, name, description, rules_json, is_default, created_at)
               VALUES (?, ?, ?, ?, ?, 0, ?)""",
            (playbook_id, user_id, name, description, rules_json, now)
        )
        conn.commit()
    return {"id": playbook_id, "user_id": user_id, "name": name, "description": description, "rules": rules, "created_at": now}


def list_playbooks(user_id: str) -> List[Dict[str, Any]]:
    with _connect() as conn:
        rows = conn.execute("SELECT * FROM playbooks WHERE user_id = ? ORDER BY created_at DESC", (user_id,)).fetchall()
    results = []
    for r in rows:
        item = dict(r)
        item["rules"] = json.loads(item["rules_json"]) if item.get("rules_json") else []
        results.append(item)
    return results


def save_redline_history(contract_id: str, clause_category: str, original_text: str, proposed_text: str, position: str, rationale: str = "") -> Dict[str, Any]:
    redline_id = f"red_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    with _connect() as conn:
        conn.execute(
            """INSERT INTO redline_history (id, contract_id, clause_category, original_text, proposed_text, position, rationale, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (redline_id, contract_id, clause_category, original_text, proposed_text, position, rationale, now)
        )
        conn.commit()
    return {"id": redline_id, "contract_id": contract_id, "clause_category": clause_category, "position": position, "created_at": now}



