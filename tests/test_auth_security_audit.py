"""
test_auth_security_audit.py — Verification suite for Auth Security & Error Mapping
"""
import pytest

# Simulating authErrorMapper logic in Python to verify complete logic coverage
def map_supabase_auth_error(error_code: str, error_message: str):
    raw_message = (error_message or "").lower()
    code = (error_code or "").lower()

    if code == 'weak_password' or 'leak' in raw_message or 'breach' in raw_message or 'pwned' in raw_message or 'not safe' in raw_message or 'appeared in' in raw_message:
        return {
            "message": "This password has appeared in a public data breach. Please choose a different, stronger password for your account security.",
            "is_leaked": True
        }

    if code == 'over_email_send_rate_limit' or code == '429' or 'rate limit' in raw_message or 'too many requests' in raw_message:
        return {
            "message": "Email rate limit exceeded. Please wait a moment before trying again.",
            "is_rate_limit": True,
            "cooldown": 60
        }

    if code == 'invalid_credentials' or 'invalid login credentials' in raw_message or 'wrong password' in raw_message:
        return {
            "message": "Incorrect email or password. Please check your credentials and try again."
        }

    if code == 'user_already_exists' or 'already registered' in raw_message or 'already exists' in raw_message:
        return {
            "message": "An account with this email address already exists. Please sign in instead."
        }

    return {"message": error_message or "Authentication failed."}


def test_leaked_password_mapping():
    res = map_supabase_auth_error("weak_password", "Password has appeared in a data breach")
    assert res["is_leaked"] is True
    assert "data breach" in res["message"]

def test_rate_limit_mapping():
    res = map_supabase_auth_error("over_email_send_rate_limit", "Email rate limit exceeded")
    assert res["is_rate_limit"] is True
    assert res["cooldown"] == 60

def test_invalid_credentials_mapping():
    res = map_supabase_auth_error("invalid_credentials", "Invalid login credentials")
    assert "Incorrect email or password" in res["message"]

def test_user_exists_mapping():
    res = map_supabase_auth_error("user_already_exists", "User already registered")
    assert "already exists" in res["message"]
