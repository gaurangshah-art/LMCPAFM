from __future__ import annotations

import shutil
import subprocess
import tempfile
from io import BytesIO
from pathlib import Path

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


def _fpdf_to_bytes(pdf: FPDF) -> bytes:
    output = pdf.output()
    if isinstance(output, bytearray):
        return bytes(output)
    if isinstance(output, str):
        return output.encode("latin-1")
    return output


def pdf_first_page(document: bytes) -> bytes:
    if not document.startswith(b"%PDF"):
        return document
    reader = PdfReader(BytesIO(document))
    if not reader.pages:
        return document
    writer = PdfWriter()
    writer.add_page(reader.pages[0])
    buffer = BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


def _libreoffice_binary() -> str | None:
    for name in ("soffice", "soffice.exe", "libreoffice"):
        path = shutil.which(name)
        if path:
            return path
    for candidate in (
        r"C:\Program Files\LibreOffice\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        "/usr/bin/libreoffice",
        "/usr/bin/soffice",
    ):
        if Path(candidate).is_file():
            return candidate
    return None


def _convert_office_bytes_to_pdf(content: bytes, extension: str) -> bytes | None:
    binary = _libreoffice_binary()
    if not binary:
        return None
    extension = extension if extension.startswith(".") else f".{extension}"
    with tempfile.TemporaryDirectory() as tmp:
        input_path = Path(tmp) / f"attachment{extension}"
        input_path.write_bytes(content)
        try:
            subprocess.run(
                [
                    binary,
                    "--headless",
                    "--nologo",
                    "--nofirststartwizard",
                    "--convert-to",
                    "pdf",
                    "--outdir",
                    tmp,
                    str(input_path),
                ],
                check=False,
                capture_output=True,
                timeout=90,
            )
        except (OSError, subprocess.TimeoutExpired):
            return None
        pdf_path = Path(tmp) / "attachment.pdf"
        if pdf_path.is_file() and pdf_path.stat().st_size > 0:
            return pdf_path.read_bytes()
    return None


def _docx_to_pdf(content: bytes, *, title: str | None) -> bytes | None:
    try:
        from docx import Document
    except ImportError:
        return None

    try:
        document = Document(BytesIO(content))
    except Exception:
        return None

    pdf = FPDF(unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    y_limit = pdf.page_break_trigger - 12
    if title:
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(0, 5, _safe_text(title), ln=True)
        pdf.ln(1)

    pdf.set_font("Helvetica", "", 9)
    wrote = False
    for paragraph in document.paragraphs:
        text = paragraph.text.strip()
        if not text:
            continue
        pdf.multi_cell(0, 4.2, _safe_text(text))
        wrote = True
        if pdf.get_y() >= y_limit:
            break

    if not wrote:
        return None
    return _fpdf_to_bytes(pdf)


def _compact_attachment_notice_pdf(title: str, filename: str | None) -> bytes:
    pdf = FPDF(unit="mm", format="A4")
    pdf.set_auto_page_break(auto=False)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 5, _safe_text(title), ln=True)
    pdf.set_font("Helvetica", "", 9)
    pdf.multi_cell(
        0,
        4.5,
        _safe_text(
            f"Could not render a preview of '{filename or 'document'}'. "
            "Upload a PDF (recommended) or DOCX for automatic inclusion. "
            "The original file remains stored with this Form B."
        ),
    )
    return _fpdf_to_bytes(pdf)


def attachment_bytes_to_pdf(
    content: bytes,
    *,
    title: str,
    content_type: str | None = None,
    filename: str | None = None,
    embed_first_page_only: bool = True,
    include_title_on_generated_pages: bool = False,
) -> bytes | None:
    if not content:
        return None

    lowered_type = (content_type or "").lower()
    lowered_name = (filename or "").lower()
    display_title = title if include_title_on_generated_pages else None

    if lowered_type == "application/pdf" or lowered_name.endswith(".pdf"):
        if content.startswith(b"%PDF"):
            return pdf_first_page(content) if embed_first_page_only else content

    if lowered_name.endswith(".docx") or lowered_type in (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ):
        converted = _convert_office_bytes_to_pdf(content, ".docx")
        if converted:
            return pdf_first_page(converted) if embed_first_page_only else converted
        generated = _docx_to_pdf(content, title=display_title or title)
        if generated:
            return pdf_first_page(generated) if embed_first_page_only else generated

    if lowered_name.endswith(".doc") or lowered_type == "application/msword":
        converted = _convert_office_bytes_to_pdf(content, ".doc")
        if converted:
            return pdf_first_page(converted) if embed_first_page_only else converted

    if lowered_type.startswith("image/") or lowered_name.endswith((".jpg", ".jpeg", ".png", ".webp")):
        try:
            from PIL import Image

            image = Image.open(BytesIO(content))
            pdf = FPDF(unit="mm", format="A4")
            pdf.set_auto_page_break(auto=False)
            pdf.add_page()
            y = pdf.t_margin
            if display_title:
                pdf.set_font("Helvetica", "B", 10)
                pdf.set_y(y)
                pdf.cell(0, 5, _safe_text(display_title), ln=True)
                y = pdf.get_y() + 2
            page_width = pdf.epw
            page_height = pdf.page_break_trigger - y - 8
            image_width, image_height = image.size
            scale = min(page_width / image_width, page_height / image_height)
            draw_width = image_width * scale
            draw_height = image_height * scale
            x = pdf.l_margin + (page_width - draw_width) / 2
            pdf.image(image, x=x, y=y, w=draw_width, h=draw_height)
            return _fpdf_to_bytes(pdf)
        except Exception:
            pass

    return _compact_attachment_notice_pdf(title, filename)
