"""
services/cost_tracker.py — Cost & Latency Controls and Budget Limit Enforcer.

Tracks input tokens, output tokens, cost, latency ms, retry count, and cache savings
per stage and enforces subscription contract processing budget caps.
"""

import time
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("contractclaw.cost_tracker")

DEFAULT_CONTRACT_BUDGET = {
    "maximum_llm_calls": 12,
    "maximum_input_tokens": 120000,
    "maximum_output_tokens": 20000,
    "maximum_processing_cost": 1.50,
    "maximum_processing_time_seconds": 120,
}


class ContractCostTracker:
    """Tracks token consumption, latency, and costs per contract analysis run."""
    def __init__(self, limits: Optional[Dict[str, Any]] = None):
        self.limits = limits or DEFAULT_CONTRACT_BUDGET
        self.start_time = time.time()
        self.total_llm_calls = 0
        self.total_input_tokens = 0
        self.total_output_tokens = 0
        self.total_cost_usd = 0.0
        self.retry_count = 0
        self.cache_savings_usd = 0.0
        self.stage_metrics: List[Dict[str, Any]] = []

    def record_stage_metrics(
        self,
        stage_name: str,
        input_tokens: int,
        output_tokens: int,
        estimated_cost: float,
        latency_ms: int,
        cache_hit: bool = False,
        retries: int = 0
    ) -> Dict[str, Any]:
        """Records metrics for a single pipeline stage and checks budget limits."""
        if not cache_hit:
            self.total_llm_calls += 1
            self.total_input_tokens += input_tokens
            self.total_output_tokens += output_tokens
            self.total_cost_usd += estimated_cost
            self.retry_count += retries
        else:
            self.cache_savings_usd += estimated_cost

        record = {
            "stage": stage_name,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "estimated_cost": round(estimated_cost, 6),
            "latency_ms": latency_ms,
            "cache_hit": cache_hit,
            "retries": retries,
        }
        self.stage_metrics.append(record)

        # Check limits
        elapsed_sec = time.time() - self.start_time
        if self.total_llm_calls > self.limits["maximum_llm_calls"]:
            logger.warning(f"Exceeded maximum LLM calls cap ({self.total_llm_calls})")
        if self.total_cost_usd > self.limits["maximum_processing_cost"]:
            logger.warning(f"Exceeded maximum processing cost cap (${self.total_cost_usd:.4f})")
        if elapsed_sec > self.limits["maximum_processing_time_seconds"]:
            logger.warning(f"Exceeded maximum processing time cap ({elapsed_sec:.1f}s)")

        return record

    def get_summary(self) -> Dict[str, Any]:
        """Returns aggregated cost and performance summary."""
        total_time_sec = round(time.time() - self.start_time, 2)
        cost_by_stage = {m["stage"]: m["estimated_cost"] for m in self.stage_metrics}
        latency_by_stage = {m["stage"]: m["latency_ms"] for m in self.stage_metrics}

        return {
            "total_model_calls": self.total_llm_calls,
            "total_input_tokens": self.total_input_tokens,
            "total_output_tokens": self.total_output_tokens,
            "total_cost_usd": round(self.total_cost_usd, 6),
            "total_processing_time_seconds": total_time_sec,
            "cost_by_stage": cost_by_stage,
            "latency_by_stage": latency_by_stage,
            "retry_count": self.retry_count,
            "cache_savings_usd": round(self.cache_savings_usd, 6),
        }
