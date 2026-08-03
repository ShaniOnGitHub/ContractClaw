import re
from datetime import date
from io import BytesIO
from typing import Dict, Any, Union
import pdfplumber
from pypdf import PdfReader


def detect_contract_type(text: str) -> str:
    """Detect contract type from text using precise word-boundary patterns."""
    text_lower = text.lower()
    
    if re.search(r"\b(non-disclosure|nondisclosure|confidentiality agreement|nda)\b", text_lower):
        return "NDA"
    elif re.search(r"\b(employment agreement|employment contract|offer letter|employment)\b", text_lower):
        return "Employment"
    elif re.search(r"\b(statement of work|sow|scope of work)\b", text_lower):
        return "SOW"
    elif re.search(r"\b(master services agreement|service agreement|msa|services contract)\b", text_lower):
        return "Service Agreement"
    
    return "Other"


def detect_parties(text: str) -> str:
    """Extract involved parties using clean regex heuristics."""
    # Clean newlines for matching
    cleaned = re.sub(r"\s+", " ", text)
    
    patterns = [
        r"(?:entered into by and between|by and between|between)\s+([A-Z][A-Za-z0-9\s,\.]+?(?:Inc\.|LLC|Corp\.|Corporation|Ltd\.|Limited)?)\s+and\s+([A-Z][A-Za-z0-9\s,\.]+?(?:Inc\.|LLC|Corp\.|Corporation|Ltd\.|Limited)?)(?=\s+(?:effective|on|\,|\.|\"))",
        r"Party A:\s*([^\n]+)\s*Party B:\s*([^\n]+)",
    ]
    
    for pattern in patterns:
        match = re.search(pattern, cleaned, re.IGNORECASE)
        if match:
            party1 = match.group(1).strip().rstrip(",")
            party2 = match.group(2).strip().rstrip(",")
            return f"{party1} & {party2}"
    
    return "Undetected Parties"


def extract_pdf_text_and_metadata(pdf_file: Union[bytes, str, BytesIO], filename: str = "uploaded_contract.pdf") -> Dict[str, Any]:
    """
    Parses PDF bytes or file path, extracts full text and autodetects metadata schema:
    - filename
    - upload_date (ISO format)
    - contract_type
    - parties
    """
    extracted_text = ""
    
    # Try pdfplumber first
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
        # Fallback to PyPDF
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

    contract_type = detect_contract_type(extracted_text)
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
