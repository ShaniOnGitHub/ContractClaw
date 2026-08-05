"""
services/deterministic_scoring.py — Pure Python Risk Scoring Engine (Zero LLM Scoring).

Calculates reproducible numerical risk score (0-100) and risk_level from validated
structured findings and configurable scoring policies.
"""

from typing import List, Dict, Any, Tuple


def calculate_contract_score(
    findings: List[Dict[str, Any]],
    document_type: str = "Employment Agreement",
    jurisdiction: str = "Standard",
    scoring_policy_version: str = "employment_v2"
) -> Tuple[int, str, Dict[str, Any]]:
    """
    Computes a 100% deterministic risk score and band.

    Returns:
        (score: int, risk_level: str, breakdown: dict)
    """
    if not findings:
        return 0, "Low Risk", {"base_score": 0, "deductions": {}}

    critical_count = 0
    legal_risk_count = 0
    incomplete_count = 0
    ambiguous_count = 0
    compliance_count = 0
    negotiation_count = 0
    missing_count = 0
    info_count = 0
    positive_count = 0

    has_unlimited_liability_critical = False

    for f in findings:
        cat = f.get("category", f.get("finding_type", "Informational"))
        # Normalize category
        cat_lower = str(cat).lower().replace(" ", "_")

        if cat_lower == "critical_risk" or (f.get("severity") == "High" and cat_lower != "missing_clause"):
            critical_count += 1
            ctext = (f.get("clause_text", "") + " " + f.get("explanation", "")).lower()
            if "unlimited liability" in ctext or "uncapped" in ctext:
                has_unlimited_liability_critical = True
        elif cat_lower in ("legal_risk", "incomplete_clause"):
            incomplete_count += 1
        elif cat_lower == "ambiguous_language":
            ambiguous_count += 1
        elif cat_lower == "compliance_check":
            compliance_count += 1
        elif cat_lower == "negotiation_opportunity":
            negotiation_count += 1
        elif cat_lower == "missing_clause":
            missing_count += 1
        elif cat_lower == "positive_finding":
            positive_count += 1
        else:
            info_count += 1

    # Point calculations
    critical_pts = critical_count * 30
    incomplete_pts = min(30, incomplete_count * 15)
    ambiguous_pts = min(30, ambiguous_count * 10)
    compliance_pts = min(24, compliance_count * 8)
    negotiation_pts = min(9, negotiation_count * 3)
    missing_pts = min(15, missing_count * 5)
    positive_discount = min(10, positive_count * 3)

    raw_total = (
        critical_pts + incomplete_pts + ambiguous_pts +
        compliance_pts + negotiation_pts + missing_pts - positive_discount
    )

    # Base completeness offset if contract has ambiguous, incomplete, or compliance findings
    if ambiguous_count > 0 or compliance_count > 0 or incomplete_count > 0:
        raw_total += 10

    # Risk floors
    if has_unlimited_liability_critical:
        raw_total = max(raw_total, 80)
    elif critical_count >= 1:
        raw_total = max(raw_total, 65)

    # Pure informational or missing-only contracts are capped below High Risk
    if critical_count == 0 and incomplete_count == 0 and ambiguous_count == 0:
        raw_total = min(raw_total, 35)

    final_score = min(100, max(0, raw_total))

    # Risk Level Banding
    if final_score >= 65:
        risk_level = "High Risk"
    elif final_score >= 30:
        risk_level = "Moderate Risk"
    else:
        risk_level = "Low Risk"

    breakdown = {
        "scoring_policy_version": scoring_policy_version,
        "document_type": document_type,
        "jurisdiction": jurisdiction,
        "counts": {
            "critical_risk": critical_count,
            "incomplete_clause": incomplete_count,
            "ambiguous_language": ambiguous_count,
            "compliance_check": compliance_count,
            "negotiation_opportunity": negotiation_count,
            "missing_clause": missing_count,
            "informational": info_count,
            "positive_finding": positive_count,
        },
        "points": {
            "critical": critical_pts,
            "incomplete": incomplete_pts,
            "ambiguous": ambiguous_pts,
            "compliance": compliance_pts,
            "negotiation": negotiation_pts,
            "missing": missing_pts,
            "positive_discount": positive_discount,
        },
        "final_score": final_score,
        "risk_level": risk_level,
    }

    return final_score, risk_level, breakdown
