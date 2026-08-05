import re
from datetime import date
from io import BytesIO
from typing import Dict, Any, Union
import pdfplumber
from pypdf import PdfReader


def detect_contract_type(text: str, filename: str = "") -> str:
    """
    Bug 6 Fix: Standalone multi-stage document classification.
    Classifies contract based on title headers, preamble roles, and structural term density.
    Prevents confidentiality clauses inside employment contracts from misclassifying as NDA.
    """
    head = f"{filename} {text[:1500]}".lower()

    # Stage 1: Explicit Header / Title Matching
    if re.search(r"\b(employment agreement|employment contract|executive employment|job offer|offer letter|employee agreement|work agreement)\b", head):
        return "Employment Agreement"
    if re.search(r"\b(non[\s\-]*disclosure agreement|mutual nda|confidentiality agreement|one-way nda)\b", head):
        return "NDA"
    if re.search(r"\b(statement of work|sow|scope of work|task order)\b", head):
        return "SOW"
    if re.search(r"\b(master services agreement|master service agreement|service agreement|services agreement|consulting agreement|subcontractor agreement)\b", head):
        return "Service Agreement"
    if re.search(r"\b(software license agreement|saas agreement|eula|license agreement)\b", head):
        return "License Agreement"
    if re.search(r"\b(lease agreement|rental agreement|tenancy agreement)\b", head):
        return "Lease Agreement"
    if re.search(r"\b(vendor agreement|supplier agreement|procurement agreement)\b", head):
        return "Vendor Agreement"

    # Stage 2: Structural Role & Domain Density Scoring
    full_lower = f"{filename} {text[:6000]}".lower()

    emp_keywords = ["employer", "employee", "salary", "duties", "position", "employment", "probation", "severance", "job title", "benefits", "compensation"]
    nda_keywords = ["disclosing party", "receiving party", "trade secret", "proprietary information", "non-disclosure"]
    srv_keywords = ["contractor", "services", "statement of work", "deliverables", "service provider", "client", "fees"]
    lease_keywords = ["lessor", "lessee", "premises", "rent", "landlord", "tenant"]

    emp_score = sum(full_lower.count(kw) * 3 for kw in emp_keywords)
    nda_score = sum(full_lower.count(kw) * 3 for kw in nda_keywords)
    srv_score = sum(full_lower.count(kw) * 2 for kw in srv_keywords)
    lease_score = sum(full_lower.count(kw) * 3 for kw in lease_keywords)

    # Confidentiality keyword adjustment: if employment roles exist, demote generic "nda" score
    if emp_score > 5:
        nda_score = 0

    scores = {
        "Employment Agreement": emp_score,
        "NDA": nda_score,
        "Service Agreement": srv_score,
        "Lease Agreement": lease_score,
    }

    best_type, best_score = max(scores.items(), key=lambda x: x[1])
    if best_score >= 6:
        return best_type

    # Stage 3: Fallback keyword check
    if "employment" in head or "employee" in head:
        return "Employment Agreement"
    if "nda" in head or "non-disclosure" in head:
        return "NDA"

    return "Other"


def detect_parties(text: str) -> str:
    """Extract involved parties using comprehensive legal preamble heuristics."""
    preamble = text[:3000]
    cleaned = re.sub(r"\s+", " ", preamble)
    
    def clean_party(name: str) -> str:
        name = re.sub(r'\s*\([^)]*\)', '', name)
        name = re.sub(r'\b(on|dated|effective|as of|this)\b.*$', '', name, flags=re.IGNORECASE)
        name = re.sub(r'^(a|an|the)\s+', '', name, flags=re.IGNORECASE)
        return name.strip().rstrip(',. ";:')

    patterns = [
        r"(?:entered into|made|effective|dated)?[^.\n]*?\b(?:by and between|between|among)\b\s+([^,\n;]+?(?:Inc\.|LLC|Corp\.|Corporation|Ltd\.|Limited|Co\.|GmbH|Pte\.)?)\s+(?:\(\"[^\"]+\"\)\s+)?(?:and|&)\s+([^,\n;]+?(?:Inc\.|LLC|Corp\.|Corporation|Ltd\.|Limited|Co\.|GmbH|Pte\.)?)",
        r"(?:Party\s*A|Company|Disclosing\s*Party|Client):\s*([^\n;]+)\s*(?:Party\s*B|Employee|Receiving\s*Party|Contractor):\s*([^\n;]+)",
        r"BY AND BETWEEN\s+([^\n,;]+)\s+AND\s+([^\n,;]+)",
    ]
    
    for pattern in patterns:
        match = re.search(pattern, cleaned, re.IGNORECASE)
        if match:
            p1 = clean_party(match.group(1))
            p2 = clean_party(match.group(2))
            if p1 and p2 and len(p1) > 2 and len(p2) > 2:
                return f"{p1} & {p2}"

    entities = re.findall(r"\b([A-Z][A-Za-z0-9\s&\.\-]{2,40}?(?:Inc\.|LLC|Corp\.|Corporation|Ltd\.|Limited))\b", preamble)
    if len(entities) >= 2:
        clean_entities = list(dict.fromkeys([clean_party(e) for e in entities if clean_party(e)]))
        if len(clean_entities) >= 2:
            return f"{clean_entities[0]} & {clean_entities[1]}"
        elif len(clean_entities) == 1:
            return clean_entities[0]

    return "Undetected Parties"


def extract_pdf_text_and_metadata(pdf_file: Union[bytes, str, BytesIO], filename: str = "uploaded_contract.pdf") -> Dict[str, Any]:
    extracted_text = ""
    
    try:
        if isinstance(pdf_file, bytes):
            pdf_file_obj = BytesIO(pdf_file)
        else:
            pdf_file_obj = pdf_file

        with pdfplumber.open(pdf_file_obj) as pdf:
            pages_text = []
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages_text.append(text)
            extracted_text = "\n\n".join(pages_text)
    except Exception as e:
        try:
            if isinstance(pdf_file, bytes):
                pdf_file_obj = BytesIO(pdf_file)
            else:
                pdf_file_obj = pdf_file
            
            reader = PdfReader(pdf_file_obj)
            pages_text = [page.extract_text() for page in reader.pages if page.extract_text()]
            extracted_text = "\n\n".join(pages_text)
        except Exception as fallback_e:
            extracted_text = f"Error reading PDF: {str(e)} | Fallback Error: {str(fallback_e)}"

    contract_type = detect_contract_type(extracted_text, filename=filename)
    parties = detect_parties(extracted_text)
    upload_date = date.today().isoformat()

    metadata = {
        "filename": filename,
        "upload_date": upload_date,
        "contract_type": contract_type,
        "parties": parties
    }

    return {
        "text": extracted_text,
        "metadata": metadata
    }
