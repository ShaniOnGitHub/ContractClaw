import os
from pathlib import Path
from fpdf import FPDF

SAMPLE_DIR = Path(__file__).resolve().parent / "sample_contracts"
SAMPLE_DIR.mkdir(parents=True, exist_ok=True)

class PDFContract(FPDF):
    def header(self):
        self.set_font('Helvetica', 'B', 14)
        self.cell(0, 10, 'CONTRACTCLAW SAMPLE LEGAL DOCUMENT', border=0, ln=1, align='C')
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', align='C')

def create_pdf(filename: str, title: str, content: list):
    pdf = PDFContract()
    pdf.add_page()
    pdf.set_font('Helvetica', 'B', 16)
    pdf.cell(0, 10, title, ln=1, align='L')
    pdf.ln(5)

    for section_title, section_text in content:
        pdf.set_font('Helvetica', 'B', 12)
        pdf.cell(0, 8, section_title, ln=1)
        pdf.set_font('Helvetica', '', 10)
        pdf.multi_cell(0, 6, section_text)
        pdf.ln(4)

    filepath = SAMPLE_DIR / filename
    pdf.output(str(filepath))
    print(f"Generated sample contract: {filepath}")

# 1. NDA Sample
nda_content = [
    ("PREAMBLE", "This Mutual Non-Disclosure Agreement (\"Agreement\") is entered into by and between Apex Innovations Inc. and Beta Technologies LLC on August 15, 2025."),
    ("1. CONFIDENTIAL INFORMATION", "Confidential Information refers to any proprietary information, technical data, trade secrets, software code, customer lists, or financial projections disclosed by either party."),
    ("2. OBLIGATIONS & RESTRICTIONS", "The receiving party agrees to hold all Confidential Information in strict confidence and shall not disclose it to any third party without prior written consent."),
    ("3. TERM AND TERMINATION", "This Agreement shall remain in effect for a period of three (3) years from the Effective Date. Either party may terminate this Agreement upon 30 days written notice."),
    ("4. GOVERNING LAW", "This Agreement shall be governed by and construed in accordance with the laws of the State of California.")
]

# 2. Employment Sample
employment_content = [
    ("EMPLOYMENT AGREEMENT", "This Employment Agreement is made by and between Nexus Software Corp. and Jane Doe effective as of January 10, 2026."),
    ("1. POSITION AND DUTIES", "Employee shall serve as Senior AI Systems Engineer, performing duties related to full-stack machine learning engineering and RAG architecture development."),
    ("2. COMPENSATION & BENEFIT", "Employee shall receive a base salary of $165,000 per annum, payable bi-weekly, alongside standard medical insurance and 401(k) matching."),
    ("3. INTELLECTUAL PROPERTY", "All inventions, software, patents, and designs created during employment shall be the sole and exclusive property of Nexus Software Corp."),
    ("4. NON-COMPETE & NON-SOLICITATION", "Employee agrees not to engage in competing business activities or solicit company clients for a period of twelve (12) months following termination.")
]

# 3. Service Agreement Sample
service_content = [
    ("MASTER SERVICES AGREEMENT", "This Master Services Agreement is entered into by and between CloudScale Solutions Ltd. and Global Logistics Enterprise on March 1, 2026."),
    ("1. SCOPE OF SERVICES", "Provider agrees to deliver enterprise cloud infrastructure migration, database vector indexing, and 24/7 technical monitoring services as defined in attached SOWs."),
    ("2. PAYMENT & INVOICING", "Client shall pay invoices within thirty (30) days of receipt. Late payments shall accrue interest at the rate of 1.5% per month."),
    ("3. LIMITATION OF LIABILITY", "Neither party's total liability under this Agreement shall exceed the total fees paid by Client in the preceding six (6) months."),
    ("4. TERMINATION FOR CAUSE", "Either party may terminate this Agreement immediately if the other party materially breaches any term and fails to cure such breach within 15 calendar days.")
]

if __name__ == "__main__":
    create_pdf("sample_nda.pdf", "MUTUAL NON-DISCLOSURE AGREEMENT", nda_content)
    create_pdf("sample_employment.pdf", "EXECUTIVE EMPLOYMENT AGREEMENT", employment_content)
    create_pdf("sample_service_agreement.pdf", "MASTER SERVICES AGREEMENT", service_content)
