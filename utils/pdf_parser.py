import re
from datetime import date
from io import BytesIO
from typing import Dict, Any, Union
import pdfplumber
from pypdf import PdfReader


def detect_contract_type(text: str, filename: str = "") -> str:
    """Detect contract type from text and filename using robust legal pattern matching."""
    combined = f"{filename} {text[:2000]}".lower()
    
    if re.search(r"\b(non[\s\-]*disclosure|confidentiality|nda)\b", combined):
        return "NDA"
    elif re.search(r"\b(employment|job offer|offer letter|employee agreement|work agreement)\b", combined):
        return "Employment"
    elif re.search(r"\b(statement of work|sow|scope of work|task order)\b", combined):
        return "SOW"
    elif re.search(r"\b(master services|service agreement|services agreement|msa|consulting agreement|subcontractor)\b", combined):
        return "Service Agreement"
    elif re.search(r"\b(license agreement|software license|eula|saas agreement)\b", combined):
        return "License Agreement"
    elif re.search(r"\b(vendor agreement|supplier agreement|procurement)\b", combined):
        return "Vendor Agreement"
    elif re.search(r"\b(lease|rental agreement|tenancy)\b", combined):
        return "Lease Agreement"
    
    return "Other"


def detect_parties(text: str) -> str:
    """Extract involved parties using comprehensive legal preamble heuristics."""
    preamble = text[:3000]
    cleaned = re.sub(r"\s+", " ", preamble)
    
    def clean_party(name: str) -> str:
        # Strip date suffixes, effective clauses, and parentheticals
        name = re.sub(r'\s*\([^)]*\)', '', name)
        name = re.sub(r'\b(on|dated|effective|as of|this)\b.*$', '', name, flags=re.IGNORECASE)
        name = re.sub(r'^(a|an|the)\s+', '', name, flags=re.IGNORECASE)
        return name.strip().rstrip(',. ";:')

    patterns = [
        # Pattern 1: ...between [Party A] and [Party B]...
        r"(?:entered into|made|effective|dated)?[^.\n]*?\b(?:by and between|between|among)\b\s+([^,\n;]+?(?:Inc\.|LLC|Corp\.|Corporation|Ltd\.|Limited|Co\.|GmbH|Pte\.)?)\s+(?:\(\"[^\"]+\"\)\s+)?(?:and|&)\s+([^,\n;]+?(?:Inc\.|LLC|Corp\.|Corporation|Ltd\.|Limited|Co\.|GmbH|Pte\.)?)",
        
        # Pattern 2: Party A: ... Party B: ...
        r"(?:Party\s*A|Company|Disclosing\s*Party|Client):\s*([^\n;]+)\s*(?:Party\s*B|Employee|Receiving\s*Party|Contractor):\s*([^\n;]+)",

        # Pattern 3: BY AND BETWEEN ... AND ...
        r"BY AND BETWEEN\s+([^\n,;]+)\s+AND\s+([^\n,;]+)",
    ]
    
    for pattern in patterns:
        match = re.search(pattern, cleaned, re.IGNORECASE)
        if match:
            p1 = clean_party(match.group(1))
            p2 = clean_party(match.group(2))
            if p1 and p2 and len(p1) > 2 and len(p2) > 2:
                return f"{p1} & {p2}"

    # Fallback: Find capitalized entity names with Inc, LLC, Corp, etc.
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
