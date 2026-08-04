from __future__ import annotations

from io import BytesIO

from fpdf import FPDF
from pypdf import PdfReader, PdfWriter


def merge_pdf_documents(*documents: bytes) -> bytes:
    writer = PdfWriter()
    for document in documents:
        if not document:
            continue
        reader = PdfReader(BytesIO(document))
        for page in reader.pages:
            writer.add_page(page)
    output = BytesIO()
    writer.write(output)
    return output.getvalue()


def _safe_text(value: str) -> str:
    return str(value).encode("latin-1", errors="replace").decode("latin-1")


def attachment_bytes_to_pdf(
    content: bytes,
    *,
    title: str,
    content_type: str | None = None,
    filename: str | None = None,
) -> bytes | None:
    if not content:
        return None

    lowered_type = (content_type or "").lower()
    lowered_name = (filename or "").lower()

    if lowered_type == "application/pdf" or lowered_name.endswith(".pdf"):
        if content.startswith(b"%PDF"):
            return content

    if lowered_type.startswith("image/") or lowered_name.endswith((".jpg", ".jpeg", ".png", ".webp")):
        try:
            from PIL import Image

            image = Image.open(BytesIO(content))
            pdf = FPDF()
            pdf.set_auto_page_break(auto=False)
            pdf.add_page()
            pdf.set_font("Helvetica", "B", 12)
            pdf.cell(0, 8, _safe_text(title), ln=True)
            pdf.ln(2)
            page_width = pdf.epw
            page_height = pdf.page_break_trigger - pdf.get_y() - 10
            image_width, image_height = image.size
            scale = min(page_width / image_width, page_height / image_height)
            draw_width = image_width * scale
            draw_height = image_height * scale
            x = pdf.l_margin + (page_width - draw_width) / 2
            y = pdf.get_y()
            pdf.image(image, x=x, y=y, w=draw_width, h=draw_height)
            output = pdf.output()
            if isinstance(output, bytearray):
                return bytes(output)
            if isinstance(output, str):
                return output.encode("latin-1")
            return output
        except Exception:
            pass

    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, _safe_text(title), ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(
        0,
        6,
        _safe_text(
            f"The attached funding proof file '{filename or 'document'}' "
            f"is stored with this Form B submission."
        ),
    )
    output = pdf.output()
    if isinstance(output, bytearray):
        return bytes(output)
    if isinstance(output, str):
        return output.encode("latin-1")
    return output
