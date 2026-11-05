from fpdf import FPDF
from io import BytesIO

from pypdf import PdfReader

from utils.pdf_merge import (
    attachment_bytes_to_pdf,
    merge_pdf_documents,
    pdf_first_page,
)


def test_merge_pdf_documents_combines_pages():
    def one_page(label: str) -> bytes:
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Helvetica", "", 12)
        pdf.cell(0, 10, label, ln=True)
        return bytes(pdf.output())

    merged = merge_pdf_documents(one_page("A"), one_page("B"))
    assert merged.startswith(b"%PDF")
    assert merged.count(b"/Type /Page") >= 2


def test_pdf_first_page_keeps_single_page():
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "", 12)
    pdf.cell(0, 10, "Page 1", ln=True)
    pdf.add_page()
    pdf.cell(0, 10, "Page 2", ln=True)
    original = bytes(pdf.output())

    first = pdf_first_page(original)
    reader = PdfReader(BytesIO(first))
    assert len(reader.pages) == 1


def test_attachment_pdf_uses_first_page_only():
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "", 12)
    pdf.cell(0, 10, "Funding letter page 1", ln=True)
    pdf.add_page()
    pdf.cell(0, 10, "Funding letter page 2", ln=True)
    original = bytes(pdf.output())

    embedded = attachment_bytes_to_pdf(
        original,
        title="Annexure - Funding Proof",
        content_type="application/pdf",
        filename="proof.pdf",
    )
    assert embedded is not None
    reader = PdfReader(BytesIO(embedded))
    assert len(reader.pages) == 1
