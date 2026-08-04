import re
from typing import Dict, Any, List, Optional
from database import list_contracts

class PortfolioSearchEngine:
    """
    Provides cross-contract search capabilities across all contracts in the database.
    """

    @classmethod
    def search_contracts(cls, query: str, contract_type: Optional[str] = None, min_risk_score: Optional[int] = None, user_id: str = "demo_user") -> List[Dict[str, Any]]:
        """
        Searches contract titles, extracted metadata, risk findings, and clauses.
        """
        contracts = list_contracts(user_id=user_id)

        results = []
        query_terms = [t.lower() for t in query.strip().split() if len(t) > 2]

        for contract in contracts:
            # Apply filters
            if contract_type and contract_type.lower() != "all":
                if contract.get("contract_type", "").lower() != contract_type.lower():
                    continue

            if min_risk_score is not None:
                if contract.get("risk_score", 0) < min_risk_score:
                    continue

            # Text content match scoring
            match_score = 0
            filename = contract.get("filename", "").lower()
            analysis_data = contract.get("analysis_result", {}) or {}
            findings = analysis_data.get("risk_findings", [])
            summary = analysis_data.get("summary", "").lower()

            # Check filename match
            for term in query_terms:
                if term in filename:
                    match_score += 3
                if term in summary:
                    match_score += 2

            # Check findings match
            matching_findings = []
            for finding in findings:
                finding_text = f"{finding.get('category', '')} {finding.get('description', '')} {finding.get('clause_text', '')}".lower()
                for term in query_terms:
                    if term in finding_text:
                        match_score += 1
                        matching_findings.append(finding)
                        break

            if match_score > 0 or not query_terms:
                results.append({
                    "id": contract.get("id"),
                    "filename": contract.get("filename"),
                    "contract_type": contract.get("contract_type", "Other"),
                    "risk_score": contract.get("risk_score", 0),
                    "risk_level": contract.get("risk_level", "LOW"),
                    "uploaded_at": contract.get("uploaded_at"),
                    "relevance_score": match_score,
                    "matching_findings_count": len(matching_findings),
                    "snippet": summary[:200] if summary else "Analyzed contract document."
                })

        # Sort by relevance score descending
        results.sort(key=lambda x: (x["relevance_score"], x["risk_score"]), reverse=True)
        return results
