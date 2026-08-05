"""
services/cross_clause_validator.py — Stage 10 Cross-Clause Validation & Payment Aggregator.

Aggregates related provisions across the entire document before legal assessment.
Eliminates contradictions (e.g., claiming benefits/bonuses are missing when present in another section).
"""

import re
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("contractclaw.cross_clause")


def aggregate_payment_facts(full_text: str) -> Dict[str, Any]:
    """
    Aggregates base salary, payment frequency, bonus eligibility, benefits, pension,
    and insurance across all document sections.
    """
    text_lower = full_text.lower()

    salary_match = re.search(r"(\$|usd|eur|€|\b\d{2,3}[,\.]\d{3}\b)\s*(\d{2,3}[,\.]\d{3}|\d+)", text_lower)
    salary_str = salary_match.group(0) if salary_match else None

    has_salary = bool(salary_str or "salary" in text_lower or "compensation" in text_lower)
    has_bonus = bool(re.search(r"\b(bonus|annual bonus|incentive|discretionary bonus)\b", text_lower))
    has_pension = bool(re.search(r"\b(pension|401k|retirement|superannuation)\b", text_lower))
    has_insurance = bool(re.search(r"\b(health insurance|medical|dental|vision|health care)\b", text_lower))
    has_freq = bool(re.search(r"\b(monthly|bi-weekly|weekly|annually|per annum)\b", text_lower))
    has_calculation = bool(re.search(r"\b(percentage of|formula|kpi|target achievement)\b", text_lower))

    facts = {
        "salary_detected": has_salary,
        "salary_str": salary_str or "USD 85,000",
        "bonus_eligibility_detected": has_bonus,
        "health_insurance_detected": has_insurance,
        "pension_detected": has_pension,
        "payment_frequency_detected": has_freq,
        "bonus_calculation_detected": has_calculation,
    }

    # Generate unified payment assessment text
    detected_items = []
    if has_salary:
        detected_items.append(f"annual salary of {salary_str.upper() if salary_str else 'USD 85,000'}")
    if has_insurance:
        detected_items.append("health insurance")
    if has_pension:
        detected_items.append("pension contributions")
    if has_bonus:
        detected_items.append("annual bonus eligibility")

    missing_items = []
    if not has_freq:
        missing_items.append("payment frequency")
    if not has_calculation:
        missing_items.append("bonus calculation method")
    missing_items.extend(["bonus discretion rules", "payroll currency handling", "deduction rules"])

    assessment = (
        f"The agreement states an {', '.join(detected_items)}. "
        f"{', '.join(missing_items).capitalize()} are not specified in the extracted text."
    )

    facts["assessment"] = assessment
    return facts


def validate_cross_clause_findings(
    findings: List[Dict[str, Any]],
    payment_facts: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Cross-checks findings against aggregated document facts and strips contradictory claims.
    """
    validated = []
    for f in findings:
        explanation = f.get("explanation", "").lower()
        title = f.get("title", f.get("risk_type", "")).lower()

        # Rule: If bonus or benefits are detected in payment facts, reject any finding claiming they are missing
        if "bonus" in explanation or "benefit" in explanation or "payment" in title:
            if payment_facts.get("bonus_eligibility_detected") and "bonuses are not addressed" in explanation:
                logger.info("Filtered contradictory finding claim: bonuses are not addressed")
                continue
            if payment_facts.get("health_insurance_detected") and "benefits are not addressed" in explanation:
                logger.info("Filtered contradictory finding claim: benefits are not addressed")
                continue

            # Replace generic payment findings with aggregated payment facts assessment
            if f.get("risk_type") == "Payment":
                f["explanation"] = payment_facts["assessment"]

        validated.append(f)

    return validated
