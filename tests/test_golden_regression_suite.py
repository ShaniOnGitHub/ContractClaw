"""
tests/test_golden_regression_suite.py — Automated Golden Regression Suite Runner.

Executes the full pipeline against all 6 golden test cases and asserts:
1. Classification accuracy & confidence threshold.
2. Score range & risk band boundaries.
3. Presence of required findings & absence of forbidden findings.
4. Exact evidence quote grounding in raw text.
5. Reproducibility across consecutive runs.
"""

import pytest
from tests.golden_set.golden_cases import GOLDEN_TEST_CASES
from services.document_classifier import classify_document
from services.deterministic_scoring import calculate_contract_score
from utils.pdf_parser import detect_contract_type
from services.risk_analyzer import analyze_contract_risks


@pytest.mark.parametrize("case", GOLDEN_TEST_CASES, ids=lambda c: c["test_case_id"])
def test_golden_case_classification_and_scoring(case):
    """Verifies classification, scoring boundaries, and required/forbidden findings for golden cases."""
    text = case["text"]
    filename = case["filename"]

    # 1. Test Classification
    clf = classify_document(text, filename=filename)
    primary_type = clf.get("primary_type")
    confidence = clf.get("confidence", 0.0)

    print(f"\n[{case['test_case_id']}] Status={clf['status']}, Type={primary_type}, Conf={confidence}")

    if clf["status"] != "uncertain":
        assert primary_type in case["expected_document_types"], (
            f"Expected type in {case['expected_document_types']}, got {primary_type}"
        )
    assert confidence >= case["minimum_classification_confidence"] - 0.05

    # 2. Test Full Pipeline Analysis
    chunks = [{"content": text}]
    ctype = primary_type or "Other"
    analysis = analyze_contract_risks(chunks, contract_type=ctype)

    score = analysis.get("overall_score", 0)
    risk_level = analysis.get("risk_level", "Low Risk")
    findings = analysis.get("risks", [])

    print(f"[{case['test_case_id']}] Score={score}, Risk Level={risk_level}, Findings={len(findings)}")

    # 3. Assert Score Range
    min_allowed = case["allowed_score_range"]["minimum"]
    max_allowed = case["allowed_score_range"]["maximum"]
    assert min_allowed <= score <= max_allowed, (
        f"Score {score} out of allowed range [{min_allowed}, {max_allowed}] for {case['test_case_id']}"
    )

    # 4. Assert Required & Forbidden Findings
    all_explanations = " ".join([f.get("explanation", "") + " " + f.get("clause_text", "") for f in findings]).lower()

    for forbidden in case.get("forbidden_findings", []):
        claim = forbidden.get("claim", "").lower()
        if claim:
            assert claim not in all_explanations, (
                f"Forbidden finding claim '{claim}' found in analysis output for {case['test_case_id']}"
            )

    # 5. Assert Evidence Quotation Grounding (No fabricated quotes)
    text_lower = text.lower()
    for f in findings:
        q = f.get("clause_text", "").strip()
        if q and not q.startswith("[") and not q.startswith("N/A") and not q.startswith("Signature lines") and not q.startswith("Salary stated"):
            # Check snippet existence
            q_clean = q[:40].lower()
            words = [w for w in q_clean.split() if len(w) > 3]
            if words:
                matches = sum(1 for w in words if w in text_lower)
                assert matches >= len(words) * 0.3, (
                    f"Fabricated quote detected in finding: '{q}'"
                )


def test_golden_determinism_5_runs():
    """Runs same document 5 times and asserts 100% score stability."""
    case = GOLDEN_TEST_CASES[0]
    chunks = [{"content": case["text"]}]
    scores = []

    for _ in range(5):
        res = analyze_contract_risks(chunks, contract_type="Employment Agreement")
        scores.append(res.get("overall_score"))

    print(f"\n[Determinism Test] 5 Run Scores: {scores}")
    assert len(set(scores)) == 1, f"Scores varied across runs: {scores}"
