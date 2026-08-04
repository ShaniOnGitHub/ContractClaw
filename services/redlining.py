import re
import difflib
from typing import Dict, Any, List, Optional
import os

class RedlineGenerator:
    """
    Generates AI & market-benchmark redline revisions for problematic contract clauses.
    Provides 3 distinct negotiation positions:
      - balanced: Market-standard compromise position
      - buyer_friendly: Customer / Buyer protective position
      - vendor_friendly: Provider / Vendor protective position
    """

    BENCHMARK_RULES = {
        "limitation_of_liability": {
            "balanced": "Except for confidentiality breaches or gross negligence, neither party's total liability under this Agreement shall exceed two times (2x) the total fees paid or payable in the twelve (12) months preceding the claim.",
            "buyer_friendly": "Vendor's liability under this Agreement shall be uncapped for indemnification, gross negligence, willful misconduct, or data breach claims. For all other claims, Vendor's liability shall not exceed three times (3x) total contract value.",
            "vendor_friendly": "Vendor's aggregate liability for all claims arising under or related to this Agreement shall be strictly limited to the actual fees paid by Customer in the three (3) months prior to the incident."
        },
        "indemnification": {
            "balanced": "Each party agrees to defend, indemnify, and hold harmless the other party against third-party claims arising from its gross negligence, willful misconduct, or infringement of intellectual property rights.",
            "buyer_friendly": "Vendor shall defend, indemnify, and hold harmless Customer, its affiliates, officers, and employees against any third-party claims, liabilities, or losses arising out of Vendor's performance, IP infringement, or security breaches.",
            "vendor_friendly": "Customer shall indemnify and defend Vendor against any third-party claims arising from Customer's misuse of the Services or breach of applicable laws."
        },
        "governing_law": {
            "balanced": "This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to conflict of laws principles.",
            "buyer_friendly": "This Agreement shall be governed by the laws of Customer's principal place of business, and any legal action shall be brought exclusively in the courts of Customer's jurisdiction.",
            "vendor_friendly": "This Agreement shall be governed exclusively by the laws of Vendor's corporate headquarters state, and any disputes shall be resolved via binding arbitration in Vendor's jurisdiction."
        },
        "termination": {
            "balanced": "Either party may terminate this Agreement for cause upon thirty (30) days' written notice if the other party materially breaches any provision and fails to cure within such period.",
            "buyer_friendly": "Customer may terminate this Agreement at any time for convenience upon fifteen (15) days' prior written notice without penalty or early termination fees.",
            "vendor_friendly": "Either party may terminate for material breach with sixty (60) days' cure period. Customer may not terminate for convenience prior to the expiration of the Initial Term."
        },
        "intellectual_property": {
            "balanced": "Customer owns all Work Product created specifically under a Statement of Work. Vendor retains ownership of its pre-existing IP and core technology tools.",
            "buyer_friendly": "Customer shall exclusively own all rights, title, and interest in all deliverables, code, data, and work product developed under this Agreement upon creation as work-for-hire.",
            "vendor_friendly": "Vendor retains sole and exclusive ownership of all software, tools, enhancements, and intellectual property. Customer is granted a non-exclusive, non-transferable internal license only."
        }
    }

    @classmethod
    def generate_redlines(cls, clause_type: str, original_text: str) -> Dict[str, Any]:
        """
        Generate redline proposals across 3 negotiation positions.
        Returns proposed texts, rationales, and diff representations.
        """
        normalized_type = clause_type.lower().replace(" ", "_")
        benchmarks = cls.BENCHMARK_RULES.get(normalized_type)

        if not benchmarks:
            # Generic smart revision fallbacks if category isn't pre-indexed
            benchmarks = {
                "balanced": f"Subject to mutual written consent, {original_text[:120]}... [Revised to include reasonable notice & mutual liability standards].",
                "buyer_friendly": f"Notwithstanding anything to the contrary, Customer reserves all rights regarding {original_text[:100]}... [Revised for maximum Buyer protection].",
                "vendor_friendly": f"To the maximum extent permitted by law, Vendor disclaims all warranties regarding {original_text[:100]}... [Revised for Vendor risk mitigation]."
            }

        positions_result = {}
        for pos_key, proposed in benchmarks.items():
            diff_html = cls.compute_diff_html(original_text, proposed)
            positions_result[pos_key] = {
                "proposed_text": proposed,
                "diff_html": diff_html,
                "rationale": cls._get_rationale(pos_key, normalized_type)
            }

        return {
            "clause_type": clause_type,
            "original_text": original_text,
            "positions": positions_result
        }

    @staticmethod
    def compute_diff_html(original: str, proposed: str) -> str:
        """
        Computes word-level diff HTML highlighting deletions (red strikethrough) and additions (green background).
        """
        matcher = difflib.SequenceMatcher(None, original.split(), proposed.split())
        output = []

        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            orig_words = " ".join(original.split()[i1:i2])
            prop_words = " ".join(proposed.split()[j1:j2])

            if tag == 'equal':
                output.append(f"<span>{orig_words}</span>")
            elif tag == 'replace':
                output.append(f"<del class='diff-del'>{orig_words}</del> <ins class='diff-ins'>{prop_words}</ins>")
            elif tag == 'delete':
                output.append(f"<del class='diff-del'>{orig_words}</del>")
            elif tag == 'insert':
                output.append(f"<ins class='diff-ins'>{prop_words}</ins>")

        return " ".join(output)

    @staticmethod
    def _get_rationale(position: str, clause_type: str) -> str:
        rationales = {
            "balanced": "Reflects customary market standards acceptable to both commercial parties without prolonged negotiation.",
            "buyer_friendly": "Optimized for the Customer/Buyer to minimize financial liability, retain IP ownership, and maximize flexibility.",
            "vendor_friendly": "Optimized for the Vendor/Provider to limit liability caps, protect proprietary tools, and restrict early termination."
        }
        return rationales.get(position, "Customized legal posture recommendation.")
