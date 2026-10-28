from utils.pdf_merge import merge_pdf_documents


def test_merge_pdf_documents_combines_pages():
    from fpdf import FPDF

    def one_page(label: str) -> bytes:
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Helvetica", "", 12)
        pdf.cell(0, 10, label, ln=True)
        return bytes(pdf.output())

    merged = merge_pdf_documents(one_page("A"), one_page("B"))
    assert merged.startswith(b"%PDF")
    assert merged.count(b"/Type /Page") >= 2
