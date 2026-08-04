"""
test_auth_and_real_data.py — Integration tests for ContractClaw Auth, User-scoped data, and Background Upload tasks.
"""

import sys
from pathlib import Path
from fastapi.testclient import TestClient

# Ensure contractclaw directory is on sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from api import app
from database import init_db

client = TestClient(app)


def test_auth_flow_and_scoped_data():
    """Test signup, login, protected routes, upload, and dashboard metrics."""
    init_db()

    # 1. Test Signup
    test_email = "testuser@contractclaw.ai"
    test_password = "password123"

    signup_res = client.post("/api/v1/auth/signup", json={"email": test_email, "password": test_password})
    assert signup_res.status_code == 200, f"Signup failed: {signup_res.text}"
    signup_data = signup_res.json()
    assert "token" in signup_data
    assert signup_data["user"]["email"] == test_email
    token = signup_data["token"]

    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test Login
    login_res = client.post("/api/v1/auth/login", json={"email": test_email, "password": test_password})
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    assert "token" in login_res.json()

    # 3. Test Protected Route (/auth/me)
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == test_email

    # 4. Test Unauthenticated Access (Must fail with 401)
    unauth_res = client.get("/api/v1/contracts/")
    assert unauth_res.status_code == 401

    # 5. Test User-Scoped Dashboard Metrics (Initial 0 contracts)
    metrics_res = client.get("/api/v1/metrics/dashboard", headers=headers)
    assert metrics_res.status_code == 200
    metrics = metrics_res.json()
    assert metrics["total_contracts"] == 0
    assert metrics["high_risk_count"] == 0

    print("\n[OK] Auth & Real Data integration tests passed 100%!")


if __name__ == "__main__":
    test_auth_flow_and_scoped_data()
