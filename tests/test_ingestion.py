import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from utils.pdf_parser import extract_pdf_text_and_metadata
from config import SAMPLE_CONTRACTS_DIR

def test_samples():
    print("\n--- Testing Module 1: Ingestion & Metadata Extraction ---")
    for pdf_path in SAMPLE_CONTRACTS_DIR.glob("*.pdf"):
        with open(pdf_path, "rb") as f:
            data = f.read()
        res = extract_pdf_text_and_metadata(data, filename=pdf_path.name)
        assert res["metadata"]["contract_type"] != "Unknown"
        print(f"[{pdf_path.name}] Type: {res['metadata']['contract_type']} | Parties: {res['metadata']['parties']}")

if __name__ == "__main__":
    test_samples()
