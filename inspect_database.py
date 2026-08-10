"""
inspect_database.py — CLI Database Viewer for ContractClaw
Displays tables and metrics for Users, Contracts, and Analyses in SQL table format.
"""
import sqlite3
import os
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "contractclaw.db"

def inspect_db():
    if not DB_PATH.exists():
        print(f"[-] Database file not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("=" * 80)
    print("                      CONTRACTCLAW DATABASE REPORT                       ")
    print("=" * 80)

    # 1. Users Table
    cursor.execute("SELECT id, email, credits_remaining, tier, created_at FROM users ORDER BY created_at DESC")
    users = cursor.fetchall()

    print(f"\n[+] USERS TABLE ({len(users)} Total Registered Users)")
    print("-" * 80)
    print(f"{'User ID':<12} | {'Email':<38} | {'Credits':<8} | {'Tier':<8} | {'Created At'}")
    print("-" * 80)
    for u in users:
        uid_short = u[0][:8] + "..."
        email = u[1][:36]
        credits_rem = u[2]
        tier = u[3]
        created = u[4][:19] if u[4] else "N/A"
        print(f"{uid_short:<12} | {email:<38} | {credits_rem:<8} | {tier:<8} | {created}")

    # 2. Contracts Table
    cursor.execute("SELECT id, user_id, filename, contract_type, risk_score, risk_level, upload_date FROM contracts ORDER BY upload_date DESC")
    contracts = cursor.fetchall()

    print(f"\n[+] CONTRACTS TABLE ({len(contracts)} Uploaded Contracts)")
    print("-" * 80)
    print(f"{'Contract ID':<12} | {'Filename':<30} | {'Type':<18} | {'Score':<6} | {'Risk':<7}")
    print("-" * 80)
    for c in contracts:
        cid_short = c[0][:8] + "..."
        fname = c[2][:28]
        ctype = c[3][:16]
        score = c[4]
        risk = c[5]
        print(f"{cid_short:<12} | {fname:<30} | {ctype:<18} | {score:<6} | {risk:<7}")

    # 3. Summary Stats
    cursor.execute("SELECT COUNT(*) FROM analyses")
    analysis_count = cursor.fetchone()[0]

    print("\n" + "=" * 80)
    print(f"SUMMARY: {len(users)} Users | {len(contracts)} Contracts Stored | {analysis_count} Risk Analyses Executed")
    print("=" * 80 + "\n")

    conn.close()

if __name__ == "__main__":
    inspect_db()
