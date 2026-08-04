import pytest
from services.redlining import RedlineGenerator
from services.playbooks import PlaybookEngine
from services.search import PortfolioSearchEngine
from database import init_db, create_playbook, list_playbooks, save_redline_history

def test_redline_generator_balanced_and_diffs():
    clause_category = "limitation_of_liability"
    original_text = "Vendor shall not be liable for any indirect or consequential damages whatsoever."

    res = RedlineGenerator.generate_redlines(clause_category, original_text)
    assert res["clause_type"] == clause_category
    assert res["original_text"] == original_text

    positions = res["positions"]
    assert "balanced" in positions
    assert "buyer_friendly" in positions
    assert "vendor_friendly" in positions

    balanced = positions["balanced"]
    assert len(balanced["proposed_text"]) > 10
    assert "diff_html" in balanced
    assert "<del" in balanced["diff_html"] or "<ins" in balanced["diff_html"] or "<span>" in balanced["diff_html"]

def test_playbook_engine_evaluation():
    clauses = [
        {"text": "This agreement involves perpetual confidentiality obligations and vendor liability capped at $100."}
    ]
    rules = PlaybookEngine.DEFAULT_PLAYBOOKS[0]["rules"]

    evaluation = PlaybookEngine.evaluate_contract(clauses, rules)
    assert "compliance_score" in evaluation
    assert "violations" in evaluation
    assert len(evaluation["violations"]) >= 1

    matched_rule_ids = [v["rule_id"] for v in evaluation["violations"]]
    assert "nda_term" in matched_rule_ids

def test_playbook_database_persistence():
    init_db()
    user_id = "test_user_pb_123"
    name = "Enterprise Vendor Playbook"
    description = "Testing custom playbook rules persistence."
    rules = [{"rule_id": "rule_1", "description": "No foreign arbitration"}]

    created = create_playbook(user_id, name, description, rules)
    assert created["id"].startswith("pb_")
    assert created["name"] == name

    user_playbooks = list_playbooks(user_id)
    assert len(user_playbooks) >= 1
    assert user_playbooks[0]["name"] == name
    assert user_playbooks[0]["rules"][0]["rule_id"] == "rule_1"

def test_redline_history_persistence():
    init_db()
    res = save_redline_history("contract_test_1", "governing_law", "Original Law", "Proposed Law", "balanced", "Rationale")
    assert res["id"].startswith("red_")
    assert res["contract_id"] == "contract_test_1"
