"""
services/document_classifier.py — Stage 3 Multi-Signal Classifier & Fallback Router.

Classifies contract based on title headers, structural preamble roles, and domain term density.
Supports three classification status outcomes: 'classified', 'mixed', and 'uncertain'.
"""

import re
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("contractclaw.classifier")

APPROVED_CONTRACT_TAXONOMY = [
    "Employment Agreement",
    "NDA",
    "Master Services Agreement (MSA)",
    "Service Agreement",
    "Consulting Agreement",
    "Purchase Agreement",
    "Lease Agreement",
    "Privacy Policy",
    "Terms of Service",
    "Software License",
    "Vendor Agreement",
    "Partnership Agreement",
    "Shareholders Agreement",
    "Loan Agreement",
    "Independent Contractor Agreement",
    "Statement of Work (SOW)",
]


def classify_document(text: str, filename: str = "") -> Dict[str, Any]:
    """
    Stage 3: Classifies contract into primary/secondary types with confidence scores and status.

    Returns:
        dict:
          - status: 'classified' | 'mixed' | 'uncertain'
          - primary_type: str or None
          - secondary_type: str or None
          - confidence: float
          - candidates: list of ranked candidate dicts
          - message: optional review warning string
    """
    head = f"{filename} {text[:2000]}".lower()
    full_lower = f"{filename} {text[:8000]}".lower()

    # Calculate domain scores per type
    type_scores: Dict[str, float] = {t: 0.0 for t in APPROVED_CONTRACT_TAXONOMY}

    # Header / Title matches (High weight)
    if re.search(r"\b(employment agreement|employment contract|executive employment|job offer|offer letter|employee agreement)\b", head):
        type_scores["Employment Agreement"] += 0.85
    if re.search(r"\b(non[\s\-]*disclosure agreement|mutual nda|confidentiality agreement)\b", head):
        type_scores["NDA"] += 0.85
    if re.search(r"\b(master services agreement|master service agreement|msa)\b", head):
        type_scores["Master Services Agreement (MSA)"] += 0.85
    if re.search(r"\b(statement of work|sow|scope of work)\b", head):
        type_scores["Statement of Work (SOW)"] += 0.85
    if re.search(r"\b(consulting agreement|consultant agreement)\b", head):
        type_scores["Consulting Agreement"] += 0.85
    if re.search(r"\b(lease agreement|rental agreement|tenancy)\b", head):
        type_scores["Lease Agreement"] += 0.85
    if re.search(r"\b(software license|saas agreement|eula)\b", head):
        type_scores["Software License"] += 0.85
    if re.search(r"\b(purchase agreement|asset purchase|stock purchase)\b", head):
        type_scores["Purchase Agreement"] += 0.85
    if re.search(r"\b(independent contractor|contractor agreement)\b", head):
        type_scores["Independent Contractor Agreement"] += 0.85

    # Term density scoring
    emp_terms = ["employer", "employee", "salary", "duties", "position", "employment", "probation", "severance"]
    nda_terms = ["disclosing party", "receiving party", "trade secret", "proprietary information", "non-disclosure"]
    msa_terms = ["services", "master agreement", "statement of work", "deliverables", "service provider"]
    lease_terms = ["lessor", "lessee", "premises", "rent", "landlord", "tenant"]

    emp_hits = sum(full_lower.count(k) for k in emp_terms)
    nda_hits = sum(full_lower.count(k) for k in nda_terms)
    msa_hits = sum(full_lower.count(k) for k in msa_terms)
    lease_hits = sum(full_lower.count(k) for k in lease_terms)

    # Demote NDA score if strong employment markers exist (confidentiality clause in employment agreement)
    if emp_hits >= 3:
        nda_hits = 0

    type_scores["Employment Agreement"] += min(0.60, emp_hits * 0.08)
    type_scores["NDA"] += min(0.60, nda_hits * 0.08)
    type_scores["Master Services Agreement (MSA)"] += min(0.60, msa_hits * 0.08)
    type_scores["Lease Agreement"] += min(0.60, lease_hits * 0.08)

    # Rank candidates
    ranked = sorted([{"type": k, "confidence": round(min(0.98, v), 2)} for k, v in type_scores.items()], key=lambda x: x["confidence"], reverse=True)
    candidates = [c for c in ranked if c["confidence"] > 0.10][:3]

    if not candidates or candidates[0]["confidence"] < 0.60:
        return {
            "status": "uncertain",
            "primary_type": None,
            "secondary_type": None,
            "confidence": candidates[0]["confidence"] if candidates else 0.40,
            "candidates": candidates,
            "message": "Document type is uncertain. Manual review is recommended."
        }

    top_1 = candidates[0]
    top_2 = candidates[1] if len(candidates) > 1 else {"type": None, "confidence": 0.0}

    conf_diff = top_1["confidence"] - top_2["confidence"]

    if top_1["confidence"] >= 0.80 and conf_diff >= 0.15:
        return {
            "status": "classified",
            "primary_type": top_1["type"],
            "secondary_type": None,
            "confidence": top_1["confidence"],
            "candidates": candidates,
            "message": None
        }
    elif top_1["confidence"] >= 0.60:
        return {
            "status": "mixed",
            "primary_type": top_1["type"],
            "secondary_type": top_2["type"],
            "confidence": top_1["confidence"],
            "candidates": candidates,
            "message": f"Mixed contract traits detected ({top_1['type']} & {top_2['type']})."
        }
    else:
        return {
            "status": "uncertain",
            "primary_type": None,
            "secondary_type": None,
            "confidence": top_1["confidence"],
            "candidates": candidates,
            "message": "Document type is uncertain. Manual review is recommended."
        }
