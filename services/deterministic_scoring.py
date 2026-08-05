"""
services/deterministic_scoring.py — Stage 13 Pure Python Risk Scoring Engine (Zero LLM Scoring).

Calculates reproducible numerical risk score (0-100), risk band, document usability status,
and execution status from validated structured findings and strict scoring policies.
"""

from typing import List, Dict, Any, Tuple


def calculate_contract_score(
    findings: List[Dict[str, Any]],
    document_type: str = "Employment Agreement",
    jurisdiction: str = "Standard",
    usability_status: str = "Valid Document",
    execution_status: str = "Unsigned",
    scoring_policy_version: str = "v3.0_deterministic"
) -> Dict[str, Any]:
    """
    Computes a 100% deterministic risk score and band.

    Returns:
        dict with keys: contract_risk_score, contract_risk_band, overall_score, risk_level,
        document_usability_status, execution_status, scoring_policy_version, breakdown
    """
    if not findings:
        return {
            "contract_risk_score": 0,
            "contract_risk_band": "Low",
            "overall_score": 0,
            "risk_level": "Low Risk",
            "document_usability_status": usability_status,
            "execution_status": execution_status,
            "scoring_policy_version": scoring_policy_version,
            "breakdown": {"base_score": 0}
        }

    critical_count = 0
    legal_risk_count = 0
    compliance_count = 0
    incomplete_expected_count = 0
    missing_expected_count = 0
    negotiation_count = 0
    consistency_count = 0
    optional_review_count = 0
    info_count = 0
    positive_count = 0

    has_unlimited_liability_critical = False

    for f in findings:
        cat = str(f.get("category", f.get("finding_type", "Informational"))).lower().replace(" ", "_")
        ftype = str(f.get("finding_type", "")).lower().replace(" ", "_")

        if cat == "critical_risk" or ftype == "critical_risk":
            critical_count += 1
            ctext = (f.get("clause_text", "") + " " + f.get("explanation", "")).lower()
            if "unlimited liability" in ctext or "uncapped" in ctext:
                has_unlimited_liability_critical = True
        elif cat == "legal_risk" or ftype == "legal_risk":
            legal_risk_count += 1
        elif cat == "compliance_check" or ftype == "compliance_check":
            compliance_count += 1
        elif cat == "incomplete_clause" or ftype == "mentioned_incomplete":
            incomplete_expected_count += 1
        elif cat == "missing_expected_clause" or ftype == "missing_expected":
            missing_expected_count += 1
        elif cat in ("optional_clause_review", "missing_optional_clause") or ftype == "missing_optional":
            optional_review_count += 1
        elif cat == "negotiation_opportunity" or ftype == "negotiation_opportunity":
            negotiation_count += 1
        elif cat == "consistency_check":
            consistency_count += 1
        elif cat == "positive_finding":
            positive_count += 1
        else:
            info_count += 1

    # Section 17 Explicit Weightings
    critical_pts = critical_count * 25
    legal_pts = legal_risk_count * 15
    compliance_pts = compliance_count * 8
    incomplete_pts = incomplete_expected_count * 6
    missing_expected_pts = missing_expected_count * 8
    negotiation_pts = negotiation_count * 4
    consistency_pts = consistency_count * 4
    optional_pts = optional_review_count * 1
    positive_discount = positive_count * 1

    raw_total = (
        critical_pts + legal_pts + compliance_pts + incomplete_pts +
        missing_expected_pts + negotiation_pts + consistency_pts +
        optional_pts - positive_discount
    )

    # Risk Floor overrides
    if has_unlimited_liability_critical:
        raw_total = max(raw_total, 80)
    elif critical_count >= 1:
        raw_total = max(raw_total, 65)

    # Cap raw_total to 100
    final_score = min(100, max(0, raw_total))

    # Section 17 Score Banding:
    # 0 to 29: Low
    # 30 to 59: Moderate
    # 60 to 79: High
    # 80 to 100: Critical
    if final_score >= 80:
        band = "Critical"
        risk_level = "High Risk"
    elif final_score >= 60:
        band = "High"
        risk_level = "High Risk"
    elif final_score >= 30:
        band = "Moderate"
        risk_level = "Moderate Risk"
    else:
        band = "Low"
        risk_level = "Low Risk"

    return {
        "contract_risk_score": final_score,
        "contract_risk_band": band,
        "overall_score": final_score,
        "risk_level": risk_level,
        "document_usability_status": usability_status,
        "execution_status": execution_status,
        "scoring_policy_version": scoring_policy_version,
        "breakdown": {
            "critical_pts": critical_pts,
            "legal_pts": legal_pts,
            "compliance_pts": compliance_pts,
            "incomplete_pts": incomplete_pts,
            "missing_expected_pts": missing_expected_pts,
            "negotiation_pts": negotiation_pts,
            "consistency_pts": consistency_pts,
            "optional_pts": optional_pts,
            "positive_discount": positive_discount,
        }
    }
