from pathlib import Path
from utils.pdf_parser import extract_pdf_text_and_metadata
from config import SAMPLE_CONTRACTS_DIR

def test_samples():
    for pdf_path in SAMPLE_CONTRACTS_DIR.glob("*.pdf"):
        print(f"\n--- Testing: {pdf_path.name} ---")
        with open(pdf_path, "rb") as f:
            data = f.read()
        res = extract_pdf_text_and_metadata(data, filename=pdf_path.name)
        print("Metadata extracted:")
        print(res["metadata"])
        print("Text snippet (first 150 chars):")
        print(res["text"][:150] + "...")

if __name__ == "__main__":
    test_samples()
