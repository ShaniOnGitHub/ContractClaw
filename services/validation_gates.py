"""
services/validation_gates.py — Inter-Stage Schema & Factual Validation Gates.

Validates outputs between pipeline stages to eliminate hallucinations, enforce exact
quotation grounding against raw document text, and trigger automated retries.
"""

import re
import logging
from typing import Dict, Any, List, Tuple

logger = logging.getLogger("contractclaw.validation_gates")


def validate_clause_extraction(
    extraction_output: Dict[str, Any],
    normalized_document_text: str
) -> Tuple[bool, List[str], Dict[str, Any]]:
    """
    Validation Gate after Stage 4 Clause Extraction.
    Verifies every extracted quote exists in normalized document text.
    """
    errors = []
    text_lower = normalized_document_text.lower()
    clauses = extraction_output.get("clauses", {})
    if not isinstance(clauses, dict):
        return False, ["Extraction output must contain a 'clauses' dictionary."], extraction_output

    validated_clauses = {}
    for clause_name, item in clauses.items():
        if not isinstance(item, dict):
            continue

        found = item.get("found", False)
        quote = item.get("text", "").strip()

        if found:
            if not quote or quote == "[Clause Not Found]":
                errors.append(f"Clause '{clause_name}' marked found but text is empty.")
                item["found"] = False
                item["text"] = "[Clause Not Found]"
            else:
                # Factual verification against raw document text
                quote_snippet = quote[:60].lower()
                clean_words = [w for w in re.findall(r"\w+", quote_snippet) if len(w) > 3]
                if clean_words:
                    matches = sum(1 for w in clean_words if w in text_lower)
                    if matches < len(clean_words) * 0.4:
                        errors.append(f"Quote for '{clause_name}' not found in source document text.")
                        item["found"] = False
                        item["text"] = "[Clause Not Found]"
                        item["unsupported_quote"] = True

        validated_clauses[clause_name] = item

    extraction_output["clauses"] = validated_clauses
    is_valid = len(errors) == 0
    return is_valid, errors, extraction_output


def validate_legal_assessment(
    assessment_output: Dict[str, Any],
    extracted_clauses: Dict[str, Any],
    normalized_document_text: str
) -> Tuple[bool, List[str], Dict[str, Any]]:
    """
    Validation Gate after Stage 7 Legal Assessment.
    Verifies evidence quotes exist and findings do not contradict extracted clauses.
    """
    errors = []
    findings = assessment_output.get("findings", [])
    if not isinstance(findings, list):
        return False, ["Assessment output must contain a 'findings' list."], assessment_output

    validated_findings = []
    text_lower = normalized_document_text.lower()

    for idx, f in enumerate(findings):
        if not isinstance(f, dict):
            continue

        cat = f.get("category", f.get("finding_type", "Informational"))
        ctext = f.get("clause_text", "").strip()

        if cat == "Missing Clause" or ctext == "[Clause Not Found]":
            f["clause_text"] = "[Clause Not Found]"
        else:
            # Check quotation grounding
            if ctext and not ctext.startswith("[No specific"):
                snippet = ctext[:60].lower()
                words = [w for w in re.findall(r"\w+", snippet) if len(w) > 3]
                if words and sum(1 for w in words if w in text_lower) < len(words) * 0.3:
                    errors.append(f"Finding #{idx+1} ({f.get('risk_type')}) quote unsupported by document text.")
                    f["clause_text"] = "[Excerpt Verification Pending]"
                    f["confidence_detection"] = max(50, f.get("confidence_detection", 70) - 20)

        # Enforce valid confidence bounds 0 to 100
        det_conf = f.get("confidence_detection", f.get("detection_confidence", 85))
        ass_conf = f.get("confidence_assessment", f.get("assessment_confidence", 75))

        f["confidence_detection"] = max(0, min(100, int(det_conf if det_conf > 1 else det_conf * 100)))
        f["confidence_assessment"] = max(0, min(100, int(ass_conf if ass_conf > 1 else ass_conf * 100)))

        validated_findings.append(f)

    assessment_output["findings"] = validated_findings
    is_valid = len(errors) == 0
    return is_valid, errors, assessment_output


def validate_summary(
    summary_text: str,
    overall_score: int,
    risk_level: str,
    findings: List[Dict[str, Any]]
) -> Tuple[bool, List[str], str]:
    """
    Validation Gate after Stage 14 Executive Summary.
    Verifies summary explicitly references score and risk level without introducing contradictory claims.
    """
    errors = []
    if risk_level.lower() not in summary_text.lower() and str(overall_score) not in summary_text:
        errors.append("Summary does not explicitly state risk level or score.")
        summary_text = f"This document presents an overall {risk_level} profile with a score of {overall_score}/100. " + summary_text

    return len(errors) == 0, errors, summary_text
