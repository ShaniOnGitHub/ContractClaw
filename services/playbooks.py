import json
from typing import Dict, Any, List, Optional

class PlaybookEngine:
    """
    Evaluates contract clauses against enterprise legal playbooks and compliance guidelines.
    """

    DEFAULT_PLAYBOOKS = [
        {
            "id": "playbook-standard-nda",
            "name": "Standard Commercial NDA Playbook",
            "description": "Rules for reviewing Non-Disclosure Agreements (NDAs). Focuses on mutual confidentiality, 2-year term, and standard exclusions.",
            "rules": [
                {
                    "rule_id": "nda_term",
                    "category": "Term & Duration",
                    "description": "Confidentiality obligation term should not exceed 3 years.",
                    "severity": "HIGH",
                    "disallowed_phrases": ["perpetual confidentiality", "in perpetuity", "5 years"],
                    "preferred_standard": "2 years from disclosure"
                },
                {
                    "rule_id": "nda_mutuality",
                    "category": "Mutuality",
                    "description": "NDA must be mutual, protecting both Disclosing and Receiving Parties equally.",
                    "severity": "CRITICAL",
                    "disallowed_phrases": ["one-way", "unilateral", "only Vendor discloses"],
                    "preferred_standard": "Mutual confidentiality for both parties"
                },
                {
                    "rule_id": "nda_jurisdiction",
                    "category": "Governing Law",
                    "description": "Jurisdiction should be Delaware, New York, or California.",
                    "severity": "MEDIUM",
                    "disallowed_phrases": ["foreign jurisdiction", "England and Wales", "Bermuda"],
                    "preferred_standard": "Delaware state or federal courts"
                }
            ]
        },
        {
            "id": "playbook-saas-enterprise",
            "name": "Enterprise Software & SaaS License Playbook",
            "description": "Strict procurement rules for incoming SaaS and software vendor contracts.",
            "rules": [
                {
                    "rule_id": "liability_cap",
                    "category": "Limitation of Liability",
                    "description": "Liability cap must be at least 12 months of fees; uncapped for data breaches.",
                    "severity": "CRITICAL",
                    "disallowed_phrases": ["$100", "fees paid in last 1 month", "sole remedy"],
                    "preferred_standard": "2x Annual Contract Value cap"
                },
                {
                    "rule_id": "data_security",
                    "category": "Data Protection",
                    "description": "Vendor must maintain SOC 2 Type II compliance and provide 48-hour breach notification.",
                    "severity": "HIGH",
                    "disallowed_phrases": ["no warranty", "as-is data protection"],
                    "preferred_standard": "SOC 2 Type II certification & 48-hour notification"
                },
                {
                    "rule_id": "ip_ownership",
                    "category": "Intellectual Property",
                    "description": "Customer retains all rights to Customer Data and derived insights.",
                    "severity": "HIGH",
                    "disallowed_phrases": ["Vendor owns Customer Data", "right to sell aggregated data"],
                    "preferred_standard": "Customer retains 100% ownership of all Customer Data"
                }
            ]
        }
    ]

    @classmethod
    def evaluate_contract(cls, clauses: List[Dict[str, Any]], playbook_rules: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Evaluates extracted contract clauses against playbook rules.
        Returns compliance breakdown, violations list, and compliance score (0 - 100%).
        """
        violations = []
        passed_rules = []
        total_rules = len(playbook_rules)

        if total_rules == 0:
            return {
                "compliance_score": 100,
                "status": "PASS",
                "violations": [],
                "passed_rules": []
            }

        full_contract_text = " ".join([c.get("text", "") for c in clauses]).lower()

        for rule in playbook_rules:
            rule_id = rule.get("rule_id", "rule_unknown")
            disallowed = rule.get("disallowed_phrases", [])
            matched_disallowed = [phrase for phrase in disallowed if phrase.lower() in full_contract_text]

            if matched_disallowed:
                violations.append({
                    "rule_id": rule_id,
                    "category": rule.get("category", "General"),
                    "severity": rule.get("severity", "MEDIUM"),
                    "description": rule.get("description"),
                    "matched_disallowed": matched_disallowed,
                    "preferred_standard": rule.get("preferred_standard")
                })
            else:
                passed_rules.append({
                    "rule_id": rule_id,
                    "category": rule.get("category", "General"),
                    "description": rule.get("description")
                })

        score = max(0, int(100 - (len(violations) / total_rules * 100)))
        status = "PASS" if score >= 80 else ("WARNING" if score >= 60 else "FAIL")

        return {
            "compliance_score": score,
            "status": status,
            "total_rules_checked": total_rules,
            "violations_count": len(violations),
            "violations": violations,
            "passed_rules": passed_rules
        }
