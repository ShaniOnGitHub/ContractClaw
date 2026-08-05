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
        "explanation":   "3-part objective template: Fact + Consideration + Unaddressed scope",
        "recommendation": "1 sentence on what to negotiate or add",
        "suggested_rewrite": "Formal replacement clause",
        "detection_confidence": 94,
        "assessment_confidence": 76
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
    "risk_level": "Low Risk | Moderate Risk | High Risk",
    "summary": "2-3 sentence plain-English summary synchronized with overall_score and risk_level"
  }
"""

import os
import json
import re
import time
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
      "explanation": "Must follow this 3-part objective template strictly: 1) State factually what the clause says. 2) State what to confirm or consider without asserting a conclusion. 3) State what the clause does not address (if relevant). Example: 'The agreement provides 30 days notice for both parties. Confirm whether this period complies with applicable employment law and company policy for this role. The clause does not address termination during probation, termination for cause, or payment in lieu of notice.' NEVER state conclusions like 'this exposes the employer to unlimited liability' or 'this may not provide sufficient time'.",
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
  ]
}}

Rules:
- Categorize EVERY finding into one of the 6 finding_types:
  1) 'critical_risk': A clause exists and is actively dangerous (unlimited liability, immediate termination without cause, non-compete with unreasonable scope).
  2) 'missing_clause': A standard clause for this contract type was not found. State plainly what is missing and why it can matter; do NOT assert it as an alarmed risk.
  3) 'ambiguous_language': A clause exists but is vague enough that its actual effect is unclear.
  4) 'negotiation_opportunity': Not dangerous, but a place where better terms are reasonably available.
  5) 'compliance_check': Relevant to a legal or regulatory requirement, flagged for review.
  6) 'informational': Standard, unremarkable terms worth noting.

- Format ALL explanations using the 3-part objective template: Fact + Consideration + Unaddressed Scope.
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
        dict with keys: risks, checklist, obligations, overall_score, risk_level, summary
    """
    from services.pipeline_tracing import RunTracer
    from services.llm_client import call_deterministic_llm
    from services.deterministic_scoring import calculate_contract_score
    from services.validation_gates import validate_legal_assessment
    from services.cost_tracker import ContractCostTracker
    from services.caching import get_cached_stage_output, set_cached_stage_output

    text_excerpt = _build_text_excerpt(chunks)
    if not text_excerpt.strip():
        return {
            "risks": [],
            "checklist": [],
            "obligations": [],
            "overall_score": 0,
            "risk_level": "Low Risk",
            "summary": "No contract text available for analysis.",
        }

    tracer = RunTracer(contract_id="contract_analysis")
    cost_tracker = ContractCostTracker()
    run_id = tracer.run_id

    # Check Cache
    cached_output = get_cached_stage_output(text_excerpt, "risk_analysis")
    if cached_output:
        cached_output["run_id"] = run_id
        score = cached_output.get("overall_score", 0)
        cached_output["risk_level"] = "High Risk" if score >= 65 else "Moderate Risk" if score >= 30 else "Low Risk"
        tracer.log_stage("cache_lookup", "completed", 1, data={"cache_hit": True})
        tracer.finish_run(cached_output.get("contract_type", contract_type), score, cached_output["risk_level"])
        return cached_output

    start_ms = int(time.time() * 1000)

    # Stage 1: Document Parsing / Chunk Assembly Log
    tracer.log_stage("document_parsing", "completed", 5, data={"chunks_count": len(chunks), "chars": len(text_excerpt)})

    # Stage 3: Document Classification Log
    from services.document_classifier import classify_document
    clf = classify_document(text_excerpt)
    primary_type = clf.get("primary_type") or contract_type
    tracer.log_stage("document_classification", "completed", 10, data=clf)

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
        contract_type=primary_type,
        playbook_rules_text=rules_str,
        text=text_excerpt,
    )

    # Stage 7 & Deterministic LLM Execution
    llm_res = call_deterministic_llm(
        prompt=prompt,
        system_prompt="You are a precise legal contract analyst. Always return valid JSON only.",
        prompt_version="risk_analyzer_v4",
        schema_version="risk_schema_v2"
    )

    metrics = llm_res["metrics"]
    cost_tracker.record_stage_metrics("legal_assessment", metrics["input_tokens"], metrics["output_tokens"], metrics["estimated_cost_usd"], metrics["duration_ms"])
    tracer.log_stage("legal_assessment", "completed", metrics["duration_ms"], model=llm_res["metadata"]["model"], input_tokens=metrics["input_tokens"], output_tokens=metrics["output_tokens"], estimated_cost_usd=metrics["estimated_cost_usd"], data=llm_res["metadata"])

    # Stage 5 & 11: Deterministic Rule Engine Checks (Zero LLM)
    from services.rule_engine import detect_document_validity, detect_signature_status, check_currency_jurisdiction_consistency
    from services.cross_clause_validator import aggregate_payment_facts, validate_cross_clause_findings
    from services.clause_completeness import generate_completeness_checklist

    usability_status, is_valid, validity_finding = detect_document_validity(text_excerpt)
    execution_status, sig_finding = detect_signature_status(text_excerpt)
    currency_finding = check_currency_jurisdiction_consistency(text_excerpt)
    payment_facts = aggregate_payment_facts(text_excerpt)
    result = llm_res["parsed"]

    # Validate and normalize findings
    risks = result.get("risks", [])
    if not isinstance(risks, list):
        risks = []

    normalized_risks = []

    # Insert deterministic findings at top
    if validity_finding:
        normalized_risks.append(validity_finding)
    if sig_finding:
        normalized_risks.append(sig_finding)
    if currency_finding:
        normalized_risks.append(currency_finding)

    for r in risks:
        if not isinstance(r, dict):
            continue
        
        ftype = r.get("finding_type", "informational").lower()
        rtype = str(r.get("risk_type", "")).lower()

        # Section 8 & 9: Optional clause handling (Non-compete & Limitation of liability)
        if rtype in ("non-compete", "non_compete", "limitation of liability", "liability") and ftype == "missing_clause":
            ftype = "missing_optional"
            r["category"] = "Optional Clause Review"

        if ftype not in ("critical_risk", "missing_clause", "missing_expected", "missing_optional", "ambiguous_language", "negotiation_opportunity", "compliance_check", "informational", "positive_finding"):
            if r.get("severity") == "High":
                ftype = "critical_risk"
            elif r.get("severity") == "Medium":
                ftype = "ambiguous_language"
            else:
                ftype = "informational"

        r["finding_type"] = ftype

        # Section 9: Prohibited liability phrasing replacement
        explanation = _format_objective_explanation(r)
        if "unlimited liability" in explanation.lower() and ftype != "critical_risk":
            explanation = "No dedicated limitation of liability clause was detected. The practical effect depends on applicable law, mandatory employment protections, insurance, and the type of claim."
        r["explanation"] = explanation

        # Card Render Fallbacks
        if not r.get("clause_text") or not r["clause_text"].strip():
            r["clause_text"] = "[Clause Not Found]" if "missing" in ftype else "[No specific excerpt extracted - general clause finding]"
        if not r.get("recommendation"):
            r["recommendation"] = f"Confirm whether standard {r.get('risk_type', 'clause')} terms align with operational requirements."
        if not r.get("suggested_rewrite"):
            r["suggested_rewrite"] = f"Standard {r.get('risk_type', 'Clause')} Provision: The parties agree to standard terms in accordance with governing law."

        det_conf, ass_conf = _compute_dual_confidence(r, text_excerpt, chunks)
        r["detection_confidence"] = det_conf
        r["assessment_confidence"] = ass_conf
        normalized_risks.append(r)

    # Cross-clause validation & payment fact syncing
    normalized_risks = validate_cross_clause_findings(normalized_risks, payment_facts)
    result["risks"] = normalized_risks

    # Stage 9: Generate 6-State Completeness Checklist
    extracted_clauses = {}
    for r in normalized_risks:
        rtype = str(r.get("risk_type", "")).lower()
        extracted_clauses[rtype] = {"found": True if r.get("clause_text") != "[Clause Not Found]" else False, "text": r.get("clause_text", ""), "heading": r.get("grounded_citation", rtype)}

    result["checklist"] = generate_completeness_checklist(primary_type, extracted_clauses)

    # Stage 13: Deterministic Scoring Engine
    scoring_res = calculate_contract_score(
        findings=normalized_risks,
        document_type=primary_type,
        usability_status=usability_status,
        execution_status=execution_status
    )

    overall_score = scoring_res["overall_score"]
    risk_level = scoring_res["risk_level"]

    result["overall_score"] = overall_score
    result["contract_risk_score"] = overall_score
    result["contract_risk_band"] = scoring_res["contract_risk_band"]
    result["risk_level"] = risk_level
    result["document_usability_status"] = usability_status
    result["execution_status"] = execution_status

    # Stage 16: Executive Summary Generation
    client, provider, model_name = _get_llm_client()
    result["summary"] = _generate_synced_summary(client, provider, model_name, primary_type, overall_score, risk_level, normalized_risks)

    result["run_id"] = run_id
    tracer.finish_run(primary_type, overall_score, risk_level)
    set_cached_stage_output(text_excerpt, "risk_analysis", result)

    return result


def _format_objective_explanation(finding: Dict[str, Any]) -> str:
    """
    Bug 3: Formats explanation into a strict 3-part objective template:
    1) Fact: What the clause actually says.
    2) Consideration: What to confirm or consider (without asserting a conclusion).
    3) Unaddressed: What the clause does not address (if relevant).
    """
    raw_exp = finding.get("explanation", "").strip()
    ftype = finding.get("finding_type", "informational")
    rtype = finding.get("risk_type", "Clause")
    ctext = finding.get("clause_text", "").strip()

    # Sanitize opinionated phrases
    raw_exp = re.sub(r"may not provide sufficient time", "provides a defined timeframe to review", raw_exp, flags=re.IGNORECASE)
    raw_exp = re.sub(r"exposes the (employer|company|party) to unlimited liability", "contains no express liability cap in this section", raw_exp, flags=re.IGNORECASE)
    raw_exp = re.sub(r"this is a significant risk", "this clause represents an area for review", raw_exp, flags=re.IGNORECASE)

    # Check if raw explanation already has 3 distinct sentences/sections
    parts = [p.strip() for p in raw_exp.split('.') if p.strip()]

    if len(parts) >= 2 and any(k in raw_exp.lower() for k in ("confirm", "consider", "review", "align")):
        # Ensure third unaddressed note exists if needed
        if len(parts) == 2:
            parts.append(f"The section does not address specific exceptions or secondary remedies for {rtype.lower()}.")
        return ". ".join(parts[:3]) + "."

    # Construct clean template if model output freeform text
    if ftype == "missing_clause" or ctext == "[Clause Not Found]":
        fact = f"No dedicated {rtype} clause was identified in the analyzed text"
        consider = f"Whether one is needed depends on the governing law and how risk is otherwise allocated"
        unaddressed = f"Employment or commercial terms may already be governed by mandatory statutory law in the relevant jurisdiction"
    elif ftype == "informational":
        fact = f"The agreement includes standard {rtype.lower()} provisions ({ctext[:80]}...)"
        consider = f"Confirm whether these terms align with standard operational practice for {rtype.lower()}"
        unaddressed = f"The clause does not specify extraordinary performance penalties or custom remedies"
    else:
        fact = f"The agreement provides specific terms for {rtype.lower()} in the extracted clause text"
        consider = f"Confirm whether this provision complies with applicable law and company policy for this role"
        unaddressed = f"The clause does not address secondary contingencies or payment in lieu of notice"

    return f"{fact}. {consider}. {unaddressed}."


def _compute_dual_confidence(
    finding: Dict[str, Any],
    text_excerpt: str,
    chunks: List[Dict[str, Any]]
) -> Tuple[int, int]:
    """
    Bug 4: Splits confidence into two separate integer percentage signals (0 to 100):
    1) detection_confidence: how certain clause was located/extracted (based on retrieval match).
    2) assessment_confidence: how certain legal implication is (lower than detection; varies by inference gap).
    """
    clause = finding.get("clause_text", "").strip()
    ftype = finding.get("finding_type", "informational")

    if ftype == "missing_clause" or "[clause not found]" in clause.lower():
        # High detection that clause is absent, medium assessment on structural omission
        return 92, 74

    if not clause or clause.startswith("[No specific"):
        return 78, 68

    clause_clean = clause.lower()[:80]
    
    # Calculate detection confidence based on exact or substring match in retrieved chunks
    if clause_clean in text_excerpt.lower():
        det_conf = 96
    else:
        words = [w for w in re.findall(r"\w+", clause_clean) if len(w) > 3]
        if words:
            matches = sum(1 for w in words if w in text_excerpt.lower())
            ratio = matches / len(words)
            det_conf = int(70 + (ratio * 25))
        else:
            det_conf = 80

    # Assessment confidence varies based on finding type (literal text vs inference)
    if ftype == "informational":
        ass_conf = det_conf - 8
    elif ftype == "critical_risk":
        ass_conf = det_conf - 12
    elif ftype in ("ambiguous_language", "negotiation_opportunity"):
        ass_conf = det_conf - 16
    else:
        ass_conf = det_conf - 14

    return max(60, min(99, det_conf)), max(50, min(95, ass_conf))


def _compute_deterministic_score(risks: List[Dict[str, Any]]) -> int:
    """
    Bug 1 Audit: Computes a 100% deterministic risk score based on rule-weighted findings.
    
    Informational findings contribute strictly 0 pts.
    Missing clauses contribute 5 pts each (max cap 15 pts total).
    Ambiguous language: 10 pts each (max cap 30 pts).
    Negotiation opportunity: 3 pts each (max cap 9 pts).
    Compliance check: 8 pts each (max cap 24 pts).
    Critical risk: 30 pts each.
    """
    if not risks:
        return 0

    critical_count = sum(1 for r in risks if r.get("finding_type") == "critical_risk")
    ambiguous_count = sum(1 for r in risks if r.get("finding_type") == "ambiguous_language")
    compliance_count = sum(1 for r in risks if r.get("finding_type") == "compliance_check")
    negotiation_count = sum(1 for r in risks if r.get("finding_type") == "negotiation_opportunity")
    missing_count = sum(1 for r in risks if r.get("finding_type") == "missing_clause")
    info_count = sum(1 for r in risks if r.get("finding_type") == "informational")

    # Informational contributes 0
    critical_pts = critical_count * 30
    ambiguous_pts = min(30, ambiguous_count * 10)
    compliance_pts = min(24, compliance_count * 8)
    negotiation_pts = min(9, negotiation_count * 3)
    missing_pts = min(15, missing_count * 5)

    total_score = critical_pts + ambiguous_pts + compliance_pts + negotiation_pts + missing_pts

    # Base completeness offset if contract has ambiguous or compliance findings
    if ambiguous_count > 0 or compliance_count > 0:
        total_score += 10

    # High Risk 80 floor MUST ONLY trigger if a finding is explicitly CRITICAL_RISK with High severity!
    has_unlimited_liability = any(
        r.get("finding_type") == "critical_risk" and
        r.get("severity") == "High" and
        ("unlimited liability" in (r.get("clause_text", "") + r.get("explanation", "")).lower() or
         "uncapped" in (r.get("clause_text", "") + r.get("explanation", "")).lower())
        for r in risks
    )

    if has_unlimited_liability:
        total_score = max(total_score, 80)
    if critical_count == 0 and ambiguous_count == 0 and missing_count == 0:
        total_score = min(total_score, 25)

    return min(100, max(0, total_score))


def _generate_synced_summary(
    client: Any,
    provider: str,
    model_name: str,
    contract_type: str,
    overall_score: int,
    risk_level: str,
    risks: List[Dict[str, Any]]
) -> str:
    """
    Section 18: Generates an executive summary synchronized directly with the computed overall_score,
    risk_level, document validity, and execution status.
    Must introduce ZERO ungrounded facts.
    """
    finding_summaries = [f"- [{r.get('category', r.get('finding_type', 'info'))}]: {r.get('risk_type')} - {r.get('explanation', '')}" for r in risks[:6]]
    findings_text = "\n".join(finding_summaries)

    prompt = f"""Write a 3-4 sentence grounded executive summary for a commercial contract analysis.

Contract Type: {contract_type}
Calculated Contract Risk Score: {overall_score} out of 100
Calculated Risk Level: {risk_level}

Validated Findings:
{findings_text}

Rules:
1. Synthesize ONLY the validated findings above.
2. Explicitly state the contract risk score of {overall_score} out of 100.
3. If document status states it is a test document or has no legal effect, explicitly state that it is a test document with no legal effect.
4. If execution status states signature fields are blank, explicitly state that signature fields are blank.
5. If salary is in USD while location/law are German, note that payroll currency handling should be confirmed.
6. Do NOT introduce any new claims or ungrounded facts not present in the validated findings above.
7. Return ONLY 3-4 plain-English sentences. No JSON, no markdown formatting.
"""

    try:
        if provider == "groq":
            resp = client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0,
                max_tokens=300
            )
        else:
            resp = client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0,
                max_tokens=300
            )
        raw_summary = resp.choices[0].message.content or ""
        return raw_summary.strip()
    except Exception as e:
        logger.warning(f"Executive summary generation error: {e}")
        return f"This contract has been analyzed as {risk_level} with a contract risk score of {overall_score} out of 100 based on standard policy parameters."


def _generate_fallback_checklist(contract_type: str, risks: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """Generates standard clause checklist if model omits checklist array."""
    std_clauses = {
        "NDA": ["Confidentiality Scope", "Term & Termination", "Exclusions from Confidentiality", "Return of Materials", "Governing Law & Jurisdiction"],
        "SaaS Agreement": ["Service Level Terms (SLA)", "Limitation of Liability", "Data Security & Privacy", "Intellectual Property Rights", "Auto-Renewal & Cancellation"],
        "Employment Agreement": ["Compensation & Benefits", "Termination Notice & Severance", "IP Assignment", "Non-Compete & Non-Solicit", "Confidentiality"],
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
