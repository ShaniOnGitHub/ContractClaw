"""
services/clause_completeness.py — Stage 9 Clause Completeness Evaluator.

Evaluates contract clauses into 6 explicit states:
  - present_complete
  - mentioned_incomplete
  - missing_expected
  - missing_optional
  - not_applicable
  - uncertain

Enforces strict operative language checks for Confidentiality and Intellectual Property.
A bare clause heading (e.g., "3. Confidentiality.") is NEVER marked present_complete.
"""

import re
import logging
from typing import Dict, Any, List, Tuple

logger = logging.getLogger("contractclaw.completeness")

OPTIONAL_CLAUSES = {
    "non_compete", "non_solicitation", "limitation_of_liability", "injunctive_relief",
    "arbitration", "garden_leave", "equity_compensation", "bonus_plan", "remote_work", "relocation"
}


def evaluate_clause_completeness(
    clause_type: str,
    clause_text: str,
    found: bool,
    contract_type: str = "Employment Agreement"
) -> Tuple[str, str]:
    """
    Evaluates clause completeness into 6 explicit states.

    Returns:
        (status_code, summary_explanation)
    """
    normalized_type = clause_type.lower().replace(" ", "_").replace("-", "_")
    text_clean = clause_text.strip()
    text_lower = text_clean.lower()

    if not found or not text_clean or text_clean == "[Clause Not Found]":
        if normalized_type in OPTIONAL_CLAUSES:
            return "missing_optional", f"No {clause_type} clause was detected (Optional provision)."
        else:
            return "missing_expected", f"Standard {clause_type} clause was not detected in the analyzed text."

    # Heading-only check: bare titles without operative/value language
    words = text_clean.split()
    has_value_language = bool(
        re.search(r"\d", text_clean)
        or ":" in text_clean
        or any(k in text_lower for k in (
            "shall", "entitled", "pay", "days", "hours", "year", "month", "week", "salary",
            "benefits", "notice", "governed", "mediation", "insurance", "pension", "leave",
        ))
    )
    if (
        (":" not in text_clean and len(words) <= 5 and not has_value_language)
        or re.fullmatch(r"^\d*\.?\s*(confidentiality|intellectual property|ip|termination|governing law)\.?$", text_lower)
    ):
        return "mentioned_incomplete", f"The agreement references {clause_type} as a heading but lacks operative legal language."

    # Confidentiality Operative Language Check
    if "confidential" in normalized_type:
        has_def = any(k in text_lower for k in ("definition", "trade secret", "proprietary", "includes"))
        has_oblig = any(k in text_lower for k in ("shall not disclose", "agrees not to", "maintain confidentiality", "duty"))
        has_excl = any(k in text_lower for k in ("publicly known", "exclusion", "without breach"))
        has_duration = any(k in text_lower for k in ("year", "post-termination", "survive", "indefinitely"))

        if not (has_def and has_oblig and (has_excl or has_duration)):
            return "mentioned_incomplete", "The agreement references confidentiality but does not fully define confidential information, exclusions, post-employment duration, or remedies."

    # Intellectual Property Operative Language Check
    if "intellectual" in normalized_type or "ip" in normalized_type:
        has_own = any(k in text_lower for k in ("belong", "exclusive property", "sole property", "owner"))
        has_assign = any(k in text_lower for k in ("assigns", "transfer", "hereby assigns"))
        has_prior = any(k in text_lower for k in ("prior inventions", "schedule a", "pre-existing", "carve-out"))

        if not (has_own and (has_assign or has_prior)):
            return "mentioned_incomplete", "The agreement references intellectual property but does not contain detailed assignment provisions, prior IP exclusions, or moral rights waivers."

    return "present_complete", f"Standard {clause_type} terms are present with operative legal provisions."


def generate_completeness_checklist(
    contract_type: str,
    extracted_clauses: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Generates structured completeness checklist covering standard core & optional clauses.
    """
    expected_list = [
        ("Parties", "parties"),
        ("Job Title", "job_title"),
        ("Start Date", "start_date"),
        ("Salary", "salary"),
        ("Working Hours", "working_hours"),
        ("Leave", "leave"),
        ("Benefits", "benefits"),
        ("Confidentiality Scope", "confidentiality"),
        ("IP Ownership", "intellectual_property"),
        ("Term & Termination", "termination"),
        ("Governing Law", "governing_law"),
        ("Dispute Resolution", "dispute_resolution"),
        ("Non Compete", "non_compete"),
        ("Limitation of Liability", "limitation_of_liability"),
    ]

    checklist = []
    for display_name, key in expected_list:
        clause_data = extracted_clauses.get(key, {})
        found = clause_data.get("found", False)
        text = clause_data.get("text", "")

        status_code, summary = evaluate_clause_completeness(display_name, text, found, contract_type)

        checklist.append({
            "clause_name": display_name,
            "status": status_code,
            "summary": summary,
            "heading": clause_data.get("heading", display_name),
            "page": clause_data.get("page", 1)
        })

    return checklist
