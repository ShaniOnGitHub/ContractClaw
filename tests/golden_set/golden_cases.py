"""
tests/golden_set/golden_cases.py — Golden Test Cases & Expected Results Data.

Maintains manually reviewed expected results for the 6 golden regression test cases.
"""

GOLDEN_TEST_CASES = [
    {
        "test_case_id": "employment_complete_001",
        "description": "Employment agreement with complete standard clauses",
        "filename": "complete_employment_agreement.txt",
        "text": """
EMPLOYMENT AGREEMENT

This Employment Agreement is entered into by and between Apex Tech Solutions Inc. ("Employer") and John Smith ("Employee").

1. POSITION AND DUTIES. Employee is employed as Lead Software Architect. Salary is $160,000 annually.
2. TERM AND TERMINATION. Either party may terminate with 30 days prior written notice or immediately for Cause.
3. CONFIDENTIALITY. Employee agrees not to disclose trade secrets, source code, or proprietary information for 3 years post-termination. Excludes publicly known information.
4. INTELLECTUAL PROPERTY. All inventions, code, and improvements created during employment belong to Employer. Excludes pre-existing inventions listed on Schedule A.
5. GOVERNING LAW. Governed by the laws of the State of California.
""",
        "expected_document_types": ["Employment Agreement"],
        "minimum_classification_confidence": 0.80,
        "expected_risk_band": "Low Risk",
        "allowed_score_range": {"minimum": 0, "maximum": 35},
        "required_findings": [
            {"category": "Informational", "clause_type": "Term & Termination"},
            {"category": "Informational", "clause_type": "Confidentiality"}
        ],
        "forbidden_findings": [
            {"claim": "The employer has unlimited liability"}
        ]
    },
    {
        "test_case_id": "employment_incomplete_002",
        "description": "Employment agreement with incomplete confidentiality and IP language",
        "filename": "incomplete_employment_agreement.txt",
        "text": """
EMPLOYMENT AGREEMENT

This Employment Agreement is between Beta Corp ("Employer") and Jane Doe ("Employee").

1. POSITION. Employee is hired as Senior Engineer at $140,000 salary.
2. TERMINATION. Either party may terminate with 30 days notice.
3. CONFIDENTIALITY. Employee agrees to maintain confidentiality.
4. INTELLECTUAL PROPERTY. Work product created belongs to Employer.
""",
        "expected_document_types": ["Employment Agreement"],
        "minimum_classification_confidence": 0.80,
        "expected_risk_band": "Moderate Risk",
        "allowed_score_range": {"minimum": 12, "maximum": 50},
        "required_findings": [
            {"category": "Incomplete Clause", "clause_type": "Confidentiality"},
            {"category": "Incomplete Clause", "clause_type": "IP"}
        ],
        "forbidden_findings": [
            {"claim": "The employer has unlimited liability"}
        ]
    },
    {
        "test_case_id": "nda_mutual_003",
        "description": "Mutual Non-Disclosure Agreement",
        "filename": "mutual_nda.txt",
        "text": """
MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement is made by and between Company A Inc. and Company B LLC ("Parties").

1. PURPOSE. The Parties intend to evaluate a potential commercial partnership.
2. CONFIDENTIAL INFORMATION. Confidential Information includes technical data, trade secrets, business plans, and software code.
3. EXCLUSIONS. Does not include information that is publicly known or independently developed.
4. TERM. This Agreement remains effective for 2 years from the Effective Date.
5. GOVERNING LAW. Governed by Delaware law.
""",
        "expected_document_types": ["NDA"],
        "minimum_classification_confidence": 0.80,
        "expected_risk_band": "Low Risk",
        "allowed_score_range": {"minimum": 0, "maximum": 30},
        "required_findings": [
            {"category": "Informational", "clause_type": "Confidentiality"}
        ],
        "forbidden_findings": [
            {"claim": "Employee salary missing"}
        ]
    },
    {
        "test_case_id": "service_indemnity_004",
        "description": "Service Agreement with Indemnity Clause",
        "filename": "service_indemnity_agreement.txt",
        "text": """
MASTER SERVICES AGREEMENT

This Master Services Agreement is entered into by Service Provider LLC and Client Corp.

1. SERVICES. Provider shall perform software consulting services as set forth in Statements of Work.
2. INDEMNIFICATION. Provider shall defend, indemnify, and hold harmless Client against all third-party claims, losses, and damages arising out of Provider's performance without cap or limit.
3. LIMITATION OF LIABILITY. Provider's total aggregate liability shall be uncapped for indemnification claims.
4. GOVERNING LAW. State of New York.
""",
        "expected_document_types": ["Master Services Agreement (MSA)", "Service Agreement"],
        "minimum_classification_confidence": 0.70,
        "expected_risk_band": "High Risk",
        "allowed_score_range": {"minimum": 65, "maximum": 100},
        "required_findings": [
            {"category": "Critical Risk", "clause_type": "Indemnification"}
        ],
        "forbidden_findings": []
    },
    {
        "test_case_id": "lease_agreement_005",
        "description": "Commercial Lease Agreement",
        "filename": "commercial_lease.txt",
        "text": """
COMMERCIAL LEASE AGREEMENT

This Commercial Lease Agreement is made between Commercial Real Estate LLC ("Lessor") and Tech Startup Inc. ("Lessee").

1. PREMISES. Lessor leases to Lessee Suite 400 located at 100 Main Street.
2. RENT. Lessee shall pay monthly rent of $8,500 due on the first day of each month.
3. TERM. Lease term is 36 months starting October 1, 2026.
4. MAINTENANCE. Lessee is responsible for interior maintenance and repairs.
""",
        "expected_document_types": ["Lease Agreement"],
        "minimum_classification_confidence": 0.80,
        "expected_risk_band": "Low Risk",
        "allowed_score_range": {"minimum": 0, "maximum": 35},
        "required_findings": [],
        "forbidden_findings": []
    },
    {
        "test_case_id": "mixed_uncertain_006",
        "description": "Mixed Agreement containing traits of Employment and Consulting",
        "filename": "mixed_agreement.txt",
        "text": """
AGREEMENT FOR SERVICES AND WORK

This Agreement is made between Generic Corp and Consultant Alex.

1. WORK. Alex shall perform miscellaneous tasks as assigned.
2. PAYMENT. Alex will be paid $50 per hour.
3. CONFIDENTIALITY. Keep info secret.
""",
        "expected_document_types": ["Consulting Agreement", "Independent Contractor Agreement", "Service Agreement", "Employment Agreement"],
        "minimum_classification_confidence": 0.40,
        "expected_risk_band": "Moderate Risk",
        "allowed_score_range": {"minimum": 6, "maximum": 60},
        "required_findings": [],
        "forbidden_findings": []
    },
    {
        "test_case_id": "permanent_sample_contract_007",
        "description": "Permanent Sample Employment Agreement (FOR SOFTWARE TESTING PURPOSES ONLY)",
        "filename": "jane_doe_employment_agreement.pdf",
        "text": """
FOR SOFTWARE TESTING PURPOSES ONLY. NOT VALID. NOT A REAL AGREEMENT.
It has no legal effect.

EMPLOYMENT AGREEMENT

This Employment Agreement is entered into by and between TechCorp GmbH ("Employer"), located in Berlin, Germany, and Jane Doe ("Employee").

1. POSITION AND DUTIES. Employee is employed as Senior Software Engineer.
2. SALARY AND BENEFITS. Employee's annual base salary shall be USD 85,000. Employer provides health insurance, pension contributions, and annual bonus eligibility.
3. WORKING HOURS AND LEAVE. Standard working hours are 40 hours per week. Employee is entitled to 25 days paid annual leave.
4. CONFIDENTIALITY.
5. INTELLECTUAL PROPERTY.
6. TERM AND TERMINATION. Either party may terminate with 30 days prior written notice.
7. GOVERNING LAW AND DISPUTE RESOLUTION. Governed by the laws of Germany. Disputes shall be resolved in Berlin courts.

EMPLOYER SIGNATURE: ___________________
EMPLOYEE SIGNATURE: ___________________
""",
        "expected_document_types": ["Employment Agreement"],
        "minimum_classification_confidence": 0.80,
        "expected_risk_band": "Low Risk",
        "allowed_score_range": {"minimum": 0, "maximum": 35},
        "expected_usability_status": "Test Document",
        "expected_execution_status": "Unsigned",
        "required_findings": [
            {"category": "Document Status", "title": "Document Validity"},
            {"category": "Execution Status", "title": "Execution Status"},
            {"category": "Consistency Check", "title": "Currency Mismatch Check"}
        ],
        "forbidden_findings": [
            {"claim": "The employer is exposed to unlimited liability"},
            {"claim": "Bonuses are not addressed"},
            {"claim": "Benefits are not addressed"}
        ]
    }
]
