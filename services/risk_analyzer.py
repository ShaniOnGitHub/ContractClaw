"""
services/risk_analyzer.py — Structured contract risk analysis via GroqCloud API (Llama-3.3-70b-versatile).

Calls Groq (or OpenAI as fallback) with a strict JSON-output prompt and returns:
  {
    "risks": [
      {
        "risk_type":     "Termination | Liability | IP | Payment | Non-Compete | Indemnification | Other",
        "severity":      "Low | Medium | High",
        "clause_text":   "exact text from contract",
        "explanation":   "1-2 sentences why this is risky",
        "recommendation": "1 sentence on what to negotiate"
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

Analyze the following contract text for legal risks, key deadlines, obligations, and formal replacement clause language.

Contract Type: {contract_type}
Custom Playbook Rules: {playbook_rules_text}

Contract Text:
{text}

Return ONLY valid JSON in exactly this format:
{{
  "risks": [
    {{
      "risk_type": "one of: Termination | Liability | IP | Payment | Non-Compete | Indemnification | Confidentiality | Dispute Resolution | Other",
      "severity": "one of: Low | Medium | High",
      "clause_text": "the exact excerpt from the contract containing this risk (max 250 chars)",
      "grounded_citation": "Page or Section citation where this clause appears, e.g. 'Section 4.2' or 'Section 8 (Termination)' or 'Page 1'",
      "explanation": "1-2 sentences explaining why this clause is risky",
      "recommendation": "1 concrete sentence on what to negotiate or add",
      "suggested_rewrite": "A formal, lawyer-grade replacement clause rewritten in contract-appropriate language that fixes the identified risk. Must sound like actual contract language ready to paste.",
      "playbook_violations": ["List any specific Custom Playbook position violations if applicable, otherwise empty array"]
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
  "overall_score": 75,
  "summary": "2-3 sentence plain-English summary of the contract's overall risk profile"
}}

Rules:
- Find between 3 and 8 risks.
- Provide a clear grounded_citation for EVERY risk.
- Provide a formal, lawyer-grade suggested_rewrite for EVERY risk.
- Extract all key dates, notice windows, payment terms, and renewal deadlines into obligations.
- overall_score must be an integer between 0 and 100.
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
    
    # Try parsing direct JSON
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Fallback: search for first '{' and last '}'
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

    Args:
        chunks:         List of retrieved chunk dicts with 'content' key.
        contract_type:  Auto-detected type (NDA, Employment, etc.)
        playbook_rules: Custom risk position thresholds (max_liability_cap, min_notice_days, etc.)

    Returns:
        dict with keys: risks, obligations, overall_score, summary
    """
    client, provider, model_name = _get_llm_client()
    text_excerpt = _build_text_excerpt(chunks)

    if not text_excerpt.strip():
        return {
            "risks": [],
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

    # Validate and normalise
    if "risks" not in result or not isinstance(result["risks"], list):
        result["risks"] = []

    # Enforce deterministic score based on extracted risks & unlimited liability rules
    result["overall_score"] = _compute_deterministic_score(result["risks"])

    if "summary" not in result:
        result["summary"] = ""

    return result


def _compute_deterministic_score(risks: List[Dict[str, Any]]) -> int:
    """Computes a 100% deterministic risk score based on extracted risk severities and unlimited liability rules."""
    if not risks:
        return 0

    high_count = sum(1 for r in risks if r.get("severity") == "High")
    med_count = sum(1 for r in risks if r.get("severity") == "Medium")
    low_count = sum(1 for r in risks if r.get("severity") == "Low")

    has_unlimited_liability = any(
        "unlimited liability" in (r.get("clause_text", "") + r.get("explanation", "")).lower() or
        "uncapped" in (r.get("clause_text", "") + r.get("explanation", "")).lower() or
        "consequential damages" in (r.get("clause_text", "") + r.get("explanation", "")).lower()
        for r in risks
    )

    score = (high_count * 25) + (med_count * 12) + (low_count * 5)

    if has_unlimited_liability:
        score = max(score, 80)
    elif high_count >= 1:
        score = max(score, 70)
    elif med_count >= 1:
        score = max(score, 40)

    return min(100, score)

