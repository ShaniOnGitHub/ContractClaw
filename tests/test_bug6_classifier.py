"""
tests/test_bug6_classifier.py — Verification test for Bug 6 (Dedicated Document Classifier).

Verifies that an Employment Agreement containing a confidentiality section
is correctly classified as "Employment Agreement" and NOT misclassified as "NDA".
"""

import pytest
from utils.pdf_parser import detect_contract_type

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

def test_employment_contract_classification():
    ctype = detect_contract_type(EMPLOYMENT_CONTRACT_SAMPLE, filename="jane_doe_employment_agreement.pdf")
    print(f"Detected contract type: {ctype}")
    assert ctype == "Employment Agreement"

def test_employment_contract_without_filename():
    ctype = detect_contract_type(EMPLOYMENT_CONTRACT_SAMPLE, filename="contract.pdf")
    print(f"Detected contract type without filename clue: {ctype}")
    assert ctype == "Employment Agreement"
