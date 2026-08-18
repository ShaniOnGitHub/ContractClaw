"""
services/llm_client.py — Deterministic LLM Wrapper & Token Estimator.

Enforces deterministic model settings (temperature=0, top_p=1, seed=1001) across
Groq and OpenAI calls, attaches metadata, and records token/cost usage.
"""

import os
import json
import re
import time
import logging
from typing import Dict, Any, Tuple, Optional
try:
    from dotenv import load_dotenv
except Exception:  # pragma: no cover - optional local dependency
    def load_dotenv(*args, **kwargs):
        return False

load_dotenv()

logger = logging.getLogger("contractclaw.llm_client")

# Cost multipliers per 1K tokens
COST_PER_1K_TOKENS = {
    "groq": {"input": 0.00059, "output": 0.00079},
    "openai": {"input": 0.00015, "output": 0.00060},
}


def get_deterministic_llm_client() -> Tuple[Any, str, str]:
    """
    Returns (client, provider_type, model_name).
    Prioritizes Groq (llama-3.3-70b-versatile), falling back to OpenAI (gpt-4o-mini).
    """
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    if groq_key and not groq_key.startswith("your_"):
        from groq import Groq
        return Groq(api_key=groq_key), "groq", "llama-3.3-70b-versatile"

    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    if openai_key and not openai_key.startswith("your_"):
        from openai import OpenAI
        # Pin the official OpenAI endpoint so this client never inherits
        # OPENAI_API_BASE / OPENAI_BASE_URL from proxy environments that
        # lack the /chat/completions endpoint (which caused 404 failures).
        return OpenAI(api_key=openai_key, base_url="https://api.openai.com/v1"), "openai", "gpt-4o-mini"

    raise ValueError("No LLM API key configured. Please set GROQ_API_KEY or OPENAI_API_KEY in .env.")


def _build_fallback_response(reason: str, prompt_version: str, schema_version: str, seed: int) -> Dict[str, Any]:
    duration_ms = 0
    safe_summary = f"Deterministic fallback used because {reason}. The analysis still completed with rule-based evidence."
    return {
        "parsed": {
            "risks": [
                {
                    "finding_type": "informational",
                    "risk_type": "Deterministic Fallback",
                    "severity": "Low",
                    "clause_text": "[LLM unavailable]",
                    "explanation": safe_summary,
                    "recommendation": "Review the deterministic findings shown below; connect an LLM key later for richer narrative output.",
                    "suggested_rewrite": "N/A",
                }
            ],
            "checklist": [],
            "obligations": [],
            "overall_score": 0,
            "risk_level": "Low Risk",
            "summary": safe_summary,
        },
        "raw_text": safe_summary,
        "metadata": {
            "provider": "fallback",
            "model": "rule-engine",
            "model_version": "rule-engine",
            "temperature": 0,
            "top_p": 1,
            "seed": seed,
            "prompt_version": prompt_version,
            "schema_version": schema_version,
            "fallback_triggered": True,
        },
        "metrics": {
            "duration_ms": duration_ms,
            "input_tokens": 0,
            "output_tokens": 0,
            "estimated_cost_usd": 0.0,
        },
    }


def call_deterministic_llm(
    prompt: str,
    system_prompt: str = "You are a precise legal contract analyst. Always return valid JSON.",
    prompt_version: str = "v1",
    schema_version: str = "v1",
    seed: int = 1001
) -> Dict[str, Any]:
    """
    Executes an LLM call enforcing temperature=0, top_p=1, seed=1001.

    Returns:
        dict containing:
          - "parsed": JSON dict output from LLM
          - "raw_text": raw string content
          - "metadata": dict with provider, model, temperature, top_p, seed, versions
          - "metrics": dict with duration_ms, input_tokens, output_tokens, estimated_cost_usd
    """
    start_time = time.time()
    try:
        client, provider, model = get_deterministic_llm_client()
    except Exception as e:
        logger.warning(f"Deterministic LLM client unavailable: {e}")
        return _build_fallback_response(str(e), prompt_version, schema_version, seed)

    kwargs: Dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.0,
        "top_p": 1.0,
    }

    # Pass seed if supported
    if provider == "openai":
        kwargs["seed"] = seed
        kwargs["response_format"] = {"type": "json_object"}
    elif provider == "groq":
        kwargs["response_format"] = {"type": "json_object"}

    response = None
    try:
        response = client.chat.completions.create(**kwargs)
    except Exception as e:
        logger.warning(f"Primary LLM call ({provider}/{model}) failed: {e}")
        
        # Fallback 1: If Groq failed, try OpenAI if key is available
        openai_key = os.getenv("OPENAI_API_KEY", "").strip()
        if provider == "groq" and openai_key and not openai_key.startswith("your_"):
            try:
                logger.info("Attempting fallback to OpenAI (gpt-4o-mini)...")
                from openai import OpenAI
                oai_client = OpenAI(api_key=openai_key, base_url="https://api.openai.com/v1")
                oai_kwargs = {
                    "model": "gpt-4o-mini",
                    "messages": kwargs["messages"],
                    "temperature": 0.0,
                    "top_p": 1.0,
                    "seed": seed,
                    "response_format": {"type": "json_object"}
                }
                response = oai_client.chat.completions.create(**oai_kwargs)
                provider = "openai"
                model = "gpt-4o-mini"
            except Exception as oai_err:
                logger.error(f"OpenAI fallback failed: {oai_err}")

        # Fallback 2: Retry Groq without response_format if json_object wasn't supported
        if response is None and "response_format" in kwargs:
            try:
                del kwargs["response_format"]
                response = client.chat.completions.create(**kwargs)
            except Exception as retry_err:
                logger.error(f"Groq retry without response_format failed: {retry_err}")

    # Fallback 3: Return safe rule-engine fallback if all API calls failed
    if response is None:
        logger.warning("LLM request failed; returning deterministic fallback response.")
        return _build_fallback_response(
            "the configured LLM request could not be completed",
            prompt_version,
            schema_version,
            seed,
        )

    duration_ms = int((time.time() - start_time) * 1000)
    raw_content = response.choices[0].message.content or ""

    # Token extraction
    usage = getattr(response, "usage", None)
    if usage:
        input_tokens = getattr(usage, "prompt_tokens", len(prompt) // 4)
        output_tokens = getattr(usage, "completion_tokens", len(raw_content) // 4)
    else:
        input_tokens = len(prompt) // 4
        output_tokens = len(raw_content) // 4

    cost_cfg = COST_PER_1K_TOKENS.get(provider, {"input": 0.0002, "output": 0.0005})
    estimated_cost = (input_tokens / 1000.0 * cost_cfg["input"]) + (output_tokens / 1000.0 * cost_cfg["output"])

    # Extract JSON
    parsed = _extract_json_from_raw(raw_content)

    metadata = {
        "provider": provider,
        "model": model,
        "model_version": model,
        "temperature": 0,
        "top_p": 1,
        "seed": seed,
        "prompt_version": prompt_version,
        "schema_version": schema_version,
    }

    metrics = {
        "duration_ms": duration_ms,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "estimated_cost_usd": round(estimated_cost, 6),
    }

    return {
        "parsed": parsed,
        "raw_text": raw_content,
        "metadata": metadata,
        "metrics": metrics,
    }


def _extract_json_from_raw(raw: str) -> Dict[str, Any]:
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
        return {}
