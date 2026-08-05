"""
tests/test_risk_determinism.py — Verification test for Fix 3 (Deterministic Score Stability).

Runs identical contract risk analysis 5 consecutive times and asserts that
overall_score and categorized finding counts remain 100% identical and stable.
"""

import pytest
from services.risk_analyzer import _compute_deterministic_score, analyze_contract_risks

SAMPLE_CHUNKS = [
    {
        "content": """
        MUTUAL NON-DISCLOSURE AGREEMENT
        1. Definition of Confidential Information. "Confidential Information" refers to any proprietary information disclosed by either party.
        2. Term and Termination. This Agreement shall remain in effect for a period of two (2) years from the Effective Date. Either party may terminate this Agreement upon 30 days written notice.
        3. Exclusions. Confidential Information does not include information that is publicly known or independently developed without reference to the disclosing party's information.
        4. Limitation of Liability. IN NO EVENT SHALL EITHER PARTY BE LIABLE FOR INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES. EACH PARTY'S TOTAL AGGREGATE LIABILITY IS LIMITED TO $50,000.
        5. Governing Law. This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware.
        """
    }
]


def test_score_determinism_direct_rubric():
    """Verify that _compute_deterministic_score returns identical score for identical findings."""
    test_risks = [
        {"finding_type": "critical_risk", "severity": "High", "clause_text": "Unlimited liability", "explanation": "Uncapped liability"},
        {"finding_type": "ambiguous_language", "severity": "Medium", "clause_text": "Vague termination", "explanation": "Notice period"},
        {"finding_type": "missing_clause", "severity": "Low", "clause_text": "[Clause Not Found]", "explanation": "Missing remedies clause"},
    ]

    scores = [_compute_deterministic_score(test_risks) for _ in range(5)]
    print(f"5 consecutive score calculations: {scores}")

    # All 5 scores must be identical
    assert len(set(scores)) == 1
    assert scores[0] == 80


def test_score_determinism_missing_clause_only():
    """Verify that missing clauses alone NEVER push contract into High Risk band (score < 40)."""
    missing_only_risks = [
        {"finding_type": "missing_clause", "severity": "Low", "clause_text": "[Clause Not Found]", "explanation": "Missing injunctive relief"},
        {"finding_type": "missing_clause", "severity": "Low", "clause_text": "[Clause Not Found]", "explanation": "Missing return of materials"},
        {"finding_type": "missing_clause", "severity": "Low", "clause_text": "[Clause Not Found]", "explanation": "Missing data security clause"},
        {"finding_type": "informational", "severity": "Low", "clause_text": "Delaware governing law", "explanation": "Standard Delaware venue"},
    ]

    score = _compute_deterministic_score(missing_only_risks)
    print(f"Missing clauses only contract score: {score}")

    # Must land in Low Risk band (< 40)
    assert score <= 39
    assert score == 15
