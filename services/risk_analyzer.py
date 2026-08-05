"""
services/risk_analyzer.py — Structured contract risk analysis via GroqCloud API / OpenAI.

Calls Groq (or OpenAI as fallback) with a strict JSON-output prompt and returns:
  {
    "risks": [
      {
        "finding_type": "critical_risk | missing_clause | ambiguous_language | negotiation_opportunity | compliance_check | informational",
        "risk_type":     "Termination | Liability | IP | Payment | Non-Compete | Indemnification | Confidentiality | Dispute Resolution | Other",
        "severity":      "Low | Medium | High",
        "clause_text":   "exact text from contract or [Clause Not Found]",
        "grounded_citation": "Section 4.2 or Page 2",
        "explanation":   "Fact + Consideration statement (e.g. 'The agreement provides X; consider Y')",
        "recommendation": "1 sentence on what to negotiate or add",
        "suggested_rewrite": "Formal replacement clause",
        "confidence_score": 0.95,
        "confidence_level": "HIGH | MEDIUM | LOW"
      }
    ],
    "checklist": [
      {
        "clause_name": "Standard Clause Name",
        "status": "present | needs_attention | missing",
        "summary": "Neutral 1-line note"
      }
    ],
    "overall_score": 0-100,
    "summary": "2-3 sentence plain-English summary"
  }
"""

import os
import json
import re
import logging
from typing import List, Dict, Any, Tuple, Optional
from dotenv import load_dotenv

# Ensure .env is loaded
load_dotenv()

logger = logging.getLogger("contractclaw.risk_analyzer")

RISK_PROMPT_TEMPLATE = """You are a senior commercial contracts attorney and AI legal analyst.

Analyze the following contract text for legal risks, standard clause completeness, key deadlines, obligations, and formal replacement clause language.

Contract Type: {contract_type}
Custom Playbook Rules: {playbook_rules_text}

Contract Text:
{text}

Return ONLY valid JSON in exactly this format:
{{
  "risks": [
    {{
      "finding_type": "one of: critical_risk | missing_clause | ambiguous_language | negotiation_opportunity | compliance_check | informational",
      "risk_type": "one of: Termination | Liability | IP | Payment | Non-Compete | Indemnification | Confidentiality | Dispute Resolution | Other",
      "severity": "one of: Low | Medium | High",
      "clause_text": "the exact excerpt from the contract, or '[Clause Not Found]' if missing_clause (max 250 chars)",
      "grounded_citation": "Page or Section citation where this clause appears, e.g. 'Section 4.2' or 'Section 8 (Termination)', or 'N/A - Missing Clause'",
      "explanation": "State what is in the document, followed by what to consider (Fact + Consideration format). Example: 'The agreement provides termination on 30 days written notice by either party; consider whether this aligns with standard practice for this contract type.' For missing clauses, state plainly what is missing and why it can matter, without an alarmed tone.",
      "recommendation": "1 concrete sentence on what to negotiate, clarify, or add",
      "suggested_rewrite": "A formal, lawyer-grade replacement or missing clause rewritten in contract-appropriate language. Must sound like actual contract language ready to paste.",
      "playbook_violations": ["List any specific Custom Playbook position violations if applicable, otherwise empty array"]
    }}
  ],
  "checklist": [
    {{
      "clause_name": "Standard expected clause name for {contract_type} (e.g. 'Confidentiality Scope', 'Term & Termination', 'Limitation of Liability', 'Governing Law', 'IP Ownership', 'Remedies / Injunctive Relief')",
      "status": "one of: present | needs_attention | missing",
      "summary": "1 sentence neutral statement of presence or omission"
    }}
  ],
  "obligations": [
    {{
      "title": "Title of deadline or obligation (e.g. 'Termination Notice Window', 'Annual Renewal Date', 'Payment Due Date')",
      "deadline_date": "ISO YYYY-MM-DD date if identifiable or relative deadline text e.g. '30 days before annual anniversary'",
      "obligation_type": "one of: renewal | notice | payment | expiration",
      "summary": "1 sentence describing the obligation and required action"
    }}
  ],
  "summary": "2-3 sentence objective plain-English summary of the contract's structure and finding profile"
}}

Rules:
- Categorize EVERY finding into one of the 6 finding_types:
  1) 'critical_risk': A clause exists and is actively dangerous (unlimited liability, immediate termination without cause, non-compete with unreasonable scope).
  2) 'missing_clause': A standard clause for this contract type was not found. State plainly what is missing and why it can matter; do NOT assert it as an alarmed risk with the same confidence as a Critical Risk finding.
  3) 'ambiguous_language': A clause exists but is vague enough that its actual effect is unclear.
  4) 'negotiation_opportunity': Not dangerous, but a place where better terms are reasonably available.
  5) 'compliance_check': Relevant to a legal or regulatory requirement, flagged for review.
  6) 'informational': Standard, unremarkable terms worth noting.

- Format ALL explanations as 'Fact + Consideration' (e.g. 'The agreement states X; consider Y.'). Do NOT tell the user what to conclude.
- Provide between 3 and 8 findings.
- Provide between 4 and 7 checklist items covering standard core clauses for {contract_type}.
- Respond ONLY with valid JSON.
"""


def _get_llm_client() -> Tuple[Any, str, str]:
    """
    Returns (client, provider_type, model_name).
    Prioritizes GroqCloud API key (GROQ_API_KEY) with llama-3.3-70b-versatile,
    falling back to OpenAI if Groq key is not present.
    """
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    if groq_key and not groq_key.startswith("your_"):
        from groq import Groq
        logger.info("Using GroqCloud API (llama-3.3-70b-versatile) for risk analysis")
        return Groq(api_key=groq_key), "groq", "llama-3.3-70b-versatile"

    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    if openai_key and not openai_key.startswith("your_"):
        from openai import OpenAI
        logger.info("Using OpenAI API (gpt-4o-mini) for risk analysis")
        return OpenAI(api_key=openai_key), "openai", "gpt-4o-mini"

    raise ValueError(
        "No LLM API key configured. Please set GROQ_API_KEY in your .env file or go to Settings."
    )


def _extract_json(raw: str) -> Dict[str, Any]:
    """Extract JSON even if the model wraps it in markdown fences."""
    raw = raw.strip()
    fence_match = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", raw)
    if fence_match:
        raw = fence_match.group(1).strip()
    
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        start = raw.find('{')
        end = raw.rfind('}')
        if start != -1 and end != -1 and end > start:
            return json.loads(raw[start:end+1])
        raise


def _build_text_excerpt(chunks: List[Dict[str, Any]], max_chars: int = 6000) -> str:
    """Combine retrieved chunks into a single text excerpt for the prompt."""
    parts = []
    total = 0
    for c in chunks:
        content = c.get("content", "")
        if total + len(content) > max_chars:
            remaining = max_chars - total
            if remaining > 100:
                parts.append(content[:remaining] + "…")
            break
        parts.append(content)
        total += len(content)
    return "\n\n---\n\n".join(parts)


def analyze_contract_risks(
    chunks: List[Dict[str, Any]],
    contract_type: str = "Other",
    playbook_rules: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Main entry point. Takes retrieved chunks, calls Groq (or OpenAI), returns structured risk dict.

    Returns:
        dict with keys: risks, checklist, obligations, overall_score, summary
    """
    client, provider, model_name = _get_llm_client()
    text_excerpt = _build_text_excerpt(chunks)

    if not text_excerpt.strip():
        return {
            "risks": [],
            "checklist": [],
            "obligations": [],
            "overall_score": 0,
            "summary": "No contract text available for analysis.",
        }

    rules_str = "Standard Legal Policy"
    if playbook_rules:
        r_parts = []
        if playbook_rules.get("max_liability_cap"):
            r_parts.append(f"Max Acceptable Liability Exposure: {playbook_rules['max_liability_cap']}")
        if playbook_rules.get("min_notice_days"):
            r_parts.append(f"Minimum Required Termination Notice: {playbook_rules['min_notice_days']} days")
        if playbook_rules.get("flag_unlimited_liability"):
            r_parts.append("Unlimited liability must ALWAYS be flagged HIGH severity")
        if r_parts:
            rules_str = "; ".join(r_parts)

    prompt = RISK_PROMPT_TEMPLATE.format(
        contract_type=contract_type,
        playbook_rules_text=rules_str,
        text=text_excerpt,
    )

    logger.info(f"Calling {provider.upper()} ({model_name}) for risk analysis ({len(text_excerpt)} chars, type={contract_type})")

    if provider == "groq":
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {
                    "role": "system",
                    "content": "You are a precise legal risk analyst. Always respond with valid JSON only.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.0,
            max_tokens=2048,
            response_format={"type": "json_object"}
        )
    else:
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {
                    "role": "system",
                    "content": "You are a precise legal risk analyst. Always respond with valid JSON only.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.0,
            max_tokens=2048,
        )

    raw_content = response.choices[0].message.content or ""
    logger.info(f"{provider.upper()} response received ({len(raw_content)} chars)")

    result = _extract_json(raw_content)

    # Validate and normalize findings
    risks = result.get("risks", [])
    if not isinstance(risks, list):
        risks = []

    normalized_risks = []
    for r in risks:
        if not isinstance(r, dict):
            continue
        
        ftype = r.get("finding_type", "informational").lower()
        if ftype not in ("critical_risk", "missing_clause", "ambiguous_language", "negotiation_opportunity", "compliance_check", "informational"):
            # Infer finding type if model output legacy schema
            if r.get("severity") == "High":
                ftype = "critical_risk"
            elif r.get("severity") == "Medium":
                ftype = "ambiguous_language"
            else:
                ftype = "informational"

        r["finding_type"] = ftype

        # Fix 4: Calculate retrieval confidence score per finding
        conf_score, conf_level = _compute_finding_confidence(r, text_excerpt, chunks)
        r["confidence_score"] = conf_score
        r["confidence_level"] = conf_level
        normalized_risks.append(r)

    result["risks"] = normalized_risks

    # Fix 5: Ensure checklist exists
    if "checklist" not in result or not isinstance(result["checklist"], list):
        result["checklist"] = _generate_fallback_checklist(contract_type, normalized_risks)

    # Fix 3: Enforce 100% deterministic rule-based score calculation
    result["overall_score"] = _compute_deterministic_score(normalized_risks)

    if "summary" not in result:
        result["summary"] = ""

    return result


def _compute_finding_confidence(
    finding: Dict[str, Any],
    text_excerpt: str,
    chunks: List[Dict[str, Any]]
) -> Tuple[float, str]:
    """
    Fix 4: Calculates confidence score (0.0 to 1.0) and level ('HIGH' | 'MEDIUM' | 'LOW')
    based on retrieval text match and chunk signal.
    """
    clause = finding.get("clause_text", "").strip()
    ftype = finding.get("finding_type", "")

    # Missing clause is a clear structural finding
    if ftype == "missing_clause" or "[clause not found]" in clause.lower():
        return 0.90, "HIGH"

    if not clause:
        return 0.70, "MEDIUM"

    # Check direct occurrence in text excerpt
    clause_clean = clause.lower()[:80]
    if clause_clean in text_excerpt.lower():
        return 0.96, "HIGH"

    # Substring / overlap check
    words = [w for w in re.findall(r"\w+", clause_clean) if len(w) > 3]
    if words:
        matches = sum(1 for w in words if w in text_excerpt.lower())
        ratio = matches / len(words)
        if ratio >= 0.7:
            return 0.88, "HIGH"
        elif ratio >= 0.4:
            return 0.75, "MEDIUM"

    return 0.65, "LOW"


def _compute_deterministic_score(risks: List[Dict[str, Any]]) -> int:
    """
    Fix 3: Computes a 100% deterministic risk score based on rule-weighted findings.
    
    Weights & Caps:
    - critical_risk: 30 pts each (uncapped)
    - ambiguous_language: 10 pts each (max cap 30 pts)
    - compliance_check: 8 pts each (max cap 24 pts)
    - negotiation_opportunity: 3 pts each (max cap 9 pts)
    - missing_clause: 5 pts each (max cap 15 pts TOTAL; missing clauses alone NEVER push into High Risk)
    - informational: 0 pts
    """
    if not risks:
        return 0

    critical_count = sum(1 for r in risks if r.get("finding_type") == "critical_risk" or (r.get("severity") == "High" and r.get("finding_type") != "missing_clause"))
    ambiguous_count = sum(1 for r in risks if r.get("finding_type") == "ambiguous_language")
    compliance_count = sum(1 for r in risks if r.get("finding_type") == "compliance_check")
    negotiation_count = sum(1 for r in risks if r.get("finding_type") == "negotiation_opportunity")
    missing_count = sum(1 for r in risks if r.get("finding_type") == "missing_clause")

    critical_pts = critical_count * 30
    ambiguous_pts = min(30, ambiguous_count * 10)
    compliance_pts = min(24, compliance_count * 8)
    negotiation_pts = min(9, negotiation_count * 3)
    missing_pts = min(15, missing_count * 5)

    total_score = critical_pts + ambiguous_pts + compliance_pts + negotiation_pts + missing_pts

    # Check for explicit uncapped liability / unlimited risk
    has_unlimited_liability = any(
        "unlimited liability" in (r.get("clause_text", "") + r.get("explanation", "")).lower() or
        "uncapped" in (r.get("clause_text", "") + r.get("explanation", "")).lower() or
        "consequential damages" in (r.get("clause_text", "") + r.get("explanation", "")).lower()
        for r in risks
        if r.get("finding_type") == "critical_risk"
    )

    if has_unlimited_liability:
        total_score = max(total_score, 80)
    elif critical_count >= 1:
        total_score = max(total_score, 70)
    elif (ambiguous_pts + compliance_pts + negotiation_pts) >= 20:
        total_score = max(total_score, 45)

    return min(100, max(0, total_score))


def _generate_fallback_checklist(contract_type: str, risks: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """Generates standard clause checklist if model omit checklist array."""
    std_clauses = {
        "NDA": ["Confidentiality Scope", "Term & Termination", "Exclusions from Confidentiality", "Return of Materials", "Governing Law & Jurisdiction"],
        "SaaS Agreement": ["Service Level Terms (SLA)", "Limitation of Liability", "Data Security & Privacy", "Intellectual Property Rights", "Auto-Renewal & Cancellation"],
        "Employment": ["Compensation & Benefits", "Termination Notice & Severance", "IP Assignment", "Non-Compete & Non-Solicit", "Confidentiality"],
    }.get(contract_type, ["Term & Termination", "Limitation of Liability", "IP Ownership", "Governing Law", "Indemnification"])

    missing_topics = {r.get("risk_type", "").lower() for r in risks if r.get("finding_type") == "missing_clause"}
    attention_topics = {r.get("risk_type", "").lower() for r in risks if r.get("finding_type") in ("critical_risk", "ambiguous_language")}

    checklist = []
    for cname in std_clauses:
        c_lower = cname.lower()
        if any(t in c_lower for t in missing_topics):
            status = "missing"
            summary = f"Standard {cname} clause was not detected in analyzed text."
        elif any(t in c_lower for t in attention_topics):
            status = "needs_attention"
            summary = f"{cname} clause is present but contains flagged terms."
        else:
            status = "present"
            summary = f"Standard {cname} terms are present."
        checklist.append({"clause_name": cname, "status": status, "summary": summary})

    return checklist
