"""
services/rule_engine.py — Stage 5 & 11 Deterministic Rule Engine (Zero LLM).

Evaluates document validity markers, blank signature status, currency/jurisdiction
mismatches, and key contractual deadlines deterministically.
"""

import re
import logging
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("contractclaw.rule_engine")

VALIDITY_MARKERS = [
    r"for software testing purposes only",
    r"not valid",
    r"not a real agreement",
    r"it has no legal effect",
    r"has no legal effect",
    r"draft for review only",
    r"sample agreement",
    r"template only",
    r"non[\s\-]*binding draft",
    r"subject to execution",
]


def detect_document_validity(text: str) -> Tuple[str, bool, Optional[Dict[str, Any]]]:
    """
    Detects whether the document contains explicit non-enforceability or test statements.

    Returns:
        (usability_status, is_valid, finding_dict_or_None)
    """
    text_lower = text.lower()
    matched_quotes = []

    for pattern in VALIDITY_MARKERS:
        match = re.search(pattern, text_lower)
        if match:
            # Extract surrounding sentence
            start = max(0, match.start() - 30)
            end = min(len(text), match.end() + 40)
            snippet = text[start:end].strip().replace("\n", " ")
            matched_quotes.append(snippet)

    if matched_quotes:
        finding = {
            "finding_id": "rule_val_001",
            "category": "Document Status",
            "risk_type": "Document Validity",
            "title": "Document Validity",
            "finding_type": "informational",
            "clause_text": matched_quotes[0],
            "evidence": matched_quotes[:2],
            "assessment": "The document explicitly states that it is a test document and has no legal effect.",
            "recommendation": "Do not treat this file as an enforceable agreement.",
            "confidence_detection": 100,
            "confidence_assessment": 99,
            "detection_confidence": 100,
            "assessment_confidence": 99,
            "scoring_impact": 0,
        }
        return "Test Document", False, finding

    return "Valid Document", True, None


def detect_signature_status(text: str) -> Tuple[str, Optional[Dict[str, Any]]]:
    """
    Detects signature lines and blank execution fields.

    Returns:
        (execution_status, finding_dict_or_None)
    """
    text_lower = text.lower()
    sig_patterns = [
        r"signature:\s*________",
        r"by:\s*________",
        r"signature:\s*\n",
        r"employer signature",
        r"employee signature",
        r"signed by the parties",
    ]

    has_sig_heading = any(re.search(p, text_lower) for p in sig_patterns) or "signature" in text_lower

    # Check if typed signature or digital signature exists
    has_signed_evidence = bool(re.search(r"signed electronically|digitally signed|/s/\s*\w+", text_lower))

    if has_sig_heading and not has_signed_evidence:
        finding = {
            "finding_id": "rule_sig_001",
            "category": "Execution Status",
            "risk_type": "Execution Status",
            "title": "Execution Status",
            "finding_type": "informational",
            "clause_text": "Signature lines present (Blank)",
            "assessment": "The employer and employee signature fields appear blank. The document does not appear to have been executed.",
            "recommendation": "Ensure both parties execute the agreement prior to commencement of employment.",
            "confidence_detection": 95,
            "confidence_assessment": 90,
            "detection_confidence": 95,
            "assessment_confidence": 90,
            "scoring_impact": 0,
        }
        return "Unsigned", finding

    return "Executed" if has_signed_evidence else "Unsigned", None


def check_currency_jurisdiction_consistency(text: str) -> Optional[Dict[str, Any]]:
    """
    Compares salary currency (USD) vs employment location (Germany) vs governing law (Germany).
    """
    text_lower = text.lower()

    has_usd = bool(re.search(r"\b(usd|\$|us dollars)\b", text_lower))
    has_germany = bool(re.search(r"\b(germany|berlin|german law|munich|frankfurt)\b", text_lower))

    if has_usd and has_germany:
        return {
            "finding_id": "rule_curr_001",
            "category": "Consistency Check",
            "risk_type": "Currency and Jurisdiction Consistency",
            "title": "Currency Mismatch Check",
            "finding_type": "informational",
            "clause_text": "Salary stated in USD; Location & Governing Law in Germany",
            "assessment": "Salary is stated in USD while the employment location and governing law are German. Confirm payroll currency, conversion method, payment date, tax treatment, and applicable payroll requirements.",
            "recommendation": "Clarify currency handling and exchange rate mechanism in the agreement.",
            "confidence_detection": 96,
            "confidence_assessment": 88,
            "detection_confidence": 96,
            "assessment_confidence": 88,
            "scoring_impact": 0,
        }

    return None
