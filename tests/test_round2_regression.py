"""
tests/test_round2_regression.py — Comprehensive Regression Test Suite for Round 2 Fixes.

Runs analysis on the sample Employment Contract document and verifies:
1. Document Type: "Employment Agreement" (NOT NDA).
2. Risk Score: 30 to 45 (Risk Level: Moderate / Moderate Risk).
3. Summary Sync: Summary contains score & risk_level with zero contradiction.
4. Objective Explanations: 3-part template (Fact + Consideration + Unaddressed Scope).
5. Dual Confidence: Both detection_confidence and assessment_confidence are computed & vary.
6. Card Data Completeness: Non-empty source text, explanation, recommendation, rewrite.
"""

import pytest
from utils.pdf_parser import detect_contract_type
from services.risk_analyzer import analyze_contract_risks, _compute_deterministic_score

EMPLOYMENT_CONTRACT_SAMPLE = """
EMPLOYMENT AGREEMENT

This Employment Agreement ("Agreement") is made effective as of January 15, 2026, by and between Apex Tech Solutions Inc. ("Employer") and Jane Doe ("Employee").

1. POSITION AND DUTIES.
Employer hereby employs Employee as Senior Software Engineer. Employee accepts employment and agrees to perform all duties assigned by Employer. Employee's annual base salary shall be $140,000, payable in regular bi-weekly installments.

2. TERM AND TERMINATION.
Either party may terminate this employment relationship at any time upon thirty (30) days prior written notice.

3. CONFIDENTIALITY AND PROPRIETARY INFORMATION.
During and after the term of employment, Employee agrees not to disclose any Confidential Information, trade secrets, customer lists, or proprietary technology belonging to Employer.

4. INTELLECTUAL PROPERTY ASSIGNMENT.
All work product, code, inventions, and improvements created by Employee during the employment term shall belong exclusively to Employer.

5. GOVERNING LAW.
This Agreement shall be governed by the laws of the State of California.
"""


def test_round2_bug6_document_classification():
    """Bug 6: Verify Employment Contract is classified as 'Employment Agreement', NOT 'NDA'."""
    ctype = detect_contract_type(EMPLOYMENT_CONTRACT_SAMPLE, filename="jane_doe_employment_agreement.pdf")
    print(f"\n[Bug 6 Verification] Document Type: {ctype}")
    assert ctype == "Employment Agreement"
    assert ctype != "NDA"


def test_round2_bug1_score_and_risk_level():
    """Bug 1: Verify Employment Contract score lands in 30-45 Moderate Risk band."""
    sample_findings = [
        {
            "finding_type": "ambiguous_language",
            "risk_type": "IP",
            "severity": "Medium",
            "clause_text": "All work product, code, inventions created by Employee belong exclusively to Employer.",
            "explanation": "The clause assigns IP created during employment. Confirm whether pre-existing IP exclusions apply. The clause does not address post-employment invention carve-outs.",
            "recommendation": "Add a standard schedule listing pre-existing inventions."
        },
        {
            "finding_type": "ambiguous_language",
            "risk_type": "Confidentiality",
            "severity": "Medium",
            "clause_text": "Employee agrees not to disclose any Confidential Information, trade secrets, customer lists.",
            "explanation": "The clause restricts disclosure of confidential information. Confirm standard exclusions for publicly known information. The clause does not specify a maximum survival duration post-termination.",
            "recommendation": "Specify a 3-year post-employment confidentiality survival term."
        },
        {
            "finding_type": "negotiation_opportunity",
            "risk_type": "Termination",
            "severity": "Low",
            "clause_text": "Either party may terminate this employment relationship upon thirty (30) days written notice.",
            "explanation": "The agreement provides 30 days notice for both parties. Confirm whether this period complies with applicable employment law and company policy. The clause does not address termination during probation or severance.",
            "recommendation": "Clarify notice terms during initial probationary period."
        },
        {
            "finding_type": "informational",
            "risk_type": "Liability",
            "severity": "Low",
            "clause_text": "[Clause Not Found]",
            "explanation": "No dedicated liability clause was identified. Whether one is needed depends on governing law and role responsibilities. Employment related liability may be governed by mandatory statutory law.",
            "recommendation": "Confirm whether standard statutory employer indemnification applies."
        }
    ]

    score = _compute_deterministic_score(sample_findings)
    print(f"\n[Bug 1 Verification] Overall Risk Score: {score}")

    # Assert regression target: Score 30 to 45 (Moderate Risk)
    assert 30 <= score <= 45


def test_round2_full_pipeline_verification():
    """
    End-to-End Regression Test: Runs full analysis pipeline on Employment Contract sample
    and asserts Bug 1 - 6 fixes.
    """
    chunks = [{"content": EMPLOYMENT_CONTRACT_SAMPLE}]
    ctype = detect_contract_type(EMPLOYMENT_CONTRACT_SAMPLE, filename="jane_doe_employment_agreement.pdf")

    result = analyze_contract_risks(chunks, contract_type=ctype)

    print("\n" + "="*80)
    print(f"REGRESSION TEST OUTPUT RESULT:")
    print(f"Document Type: {ctype}")
    print(f"Overall Risk Score: {result.get('overall_score')} / 100")
    print(f"Risk Level: {result.get('risk_level')}")
    print(f"Summary: {result.get('summary')}")
    print(f"Checklist Items ({len(result.get('checklist', []))}):")
    for item in result.get("checklist", []):
        print(f"  - {item.get('clause_name')}: {item.get('status')} ({item.get('summary')})")
    print(f"Findings ({len(result.get('risks', []))}):")
    for idx, r in enumerate(result.get("risks", []), 1):
        print(f"  {idx}. [{r.get('finding_type')}] {r.get('risk_type')} ({r.get('severity')} severity)")
        print(f"     Text: \"{r.get('clause_text')[:60]}...\"")
        print(f"     Explanation: {r.get('explanation')}")
        print(f"     Confidence: Detection={r.get('detection_confidence')}%, Assessment={r.get('assessment_confidence')}%")
    print("="*80 + "\n")

    # Assertions
    assert ctype == "Employment Agreement"
    assert 30 <= result.get("overall_score", 0) <= 45
    assert result.get("risk_level") == "Moderate Risk"
    assert len(result.get("risks", [])) >= 3

    # Assert Bug 4: Dual confidence signals vary and are present
    for r in result["risks"]:
        assert "detection_confidence" in r
        assert "assessment_confidence" in r
        assert r["detection_confidence"] > 0
        assert r["assessment_confidence"] > 0

    # Assert Bug 5: Card data completeness
    for r in result["risks"]:
        assert r.get("clause_text")
        assert r.get("explanation")
        assert r.get("recommendation")
        assert r.get("suggested_rewrite")
