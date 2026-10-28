from __future__ import annotations

from sqlalchemy.orm import Session

from crud.exceptions import CRUDValidationError
from crud.formb_iaec_review_checklist_pdf import summarize_form_b_system_checks
from crud.formb_internal import get_meeting_form_b_summary, _get_meeting_or_raise
from utils.date_format import format_display_date
from utils.pdf_branding import BrandedPDF, _safe_text


class _MeetingAgendaPDF(BrandedPDF):
    def header(self):
        super().header()
        self.set_font("Helvetica", "B", 10)
        self.cell(0, 6, "IAEC Meeting - Form B Review Agenda", ln=True, align="C")
        self.ln(1)


def _pdf_bytes(pdf: BrandedPDF) -> bytes:
    out = pdf.output(dest="S")
    if isinstance(out, (bytes, bytearray)):
        return bytes(out)
    return out.encode("latin-1")


def render_iaec_meeting_review_agenda_pdf(db: Session, meeting_id: int) -> bytes:
    meeting = _get_meeting_or_raise(db, meeting_id)
    protocol_rows = get_meeting_form_b_summary(db, meeting_id)
    if not protocol_rows:
        raise CRUDValidationError("No Form B protocols are assigned to this meeting.")

    pdf = _MeetingAgendaPDF()
    pdf.set_margins(12, 38, 12)
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.add_page()

    pdf.set_font("Helvetica", "", 9)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(
        pdf.epw,
        5,
        _safe_text(
            "Use this agenda while reviewing the attached Form B review packs (checklist + application "
            "PDF for each protocol). Mark P/F/N/A during the meeting as needed."
        ),
    )
    pdf.ln(2)

    meta = [
        f"Meeting number: {meeting.meeting_number or '-'}",
        f"Date: {format_display_date(meeting.date)}"
        + (f" at {meeting.meeting_time}" if meeting.meeting_time else ""),
        f"Venue: {meeting.venue or '-'}",
        f"Protocols on agenda: {len(protocol_rows)}",
    ]
    for line in meta:
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(pdf.epw, 5, _safe_text(line))
    pdf.ln(3)

    col_widths = [8, 22, 52, 38, 22, 18, 18, 22]
    total = sum(col_widths)
    scale = pdf.epw / total
    col_widths = [w * scale for w in col_widths]
    headers = ["#", "Protocol", "Title", "PI", "System check", "P/F/N/A", "Present", "Notes"]

    pdf.set_font("Helvetica", "B", 7)
    pdf.set_x(pdf.l_margin)
    for width, header in zip(col_widths, headers):
        pdf.cell(width, 6, _safe_text(header), border=1)
    pdf.ln()

    pdf.set_font("Helvetica", "", 7)
    for index, row in enumerate(protocol_rows, start=1):
        ok, review, total_checks = summarize_form_b_system_checks(db, row["project_id"])
        if total_checks == 0:
            system = "-"
        elif review == 0:
            system = f"{ok}/{total_checks} OK"
        else:
            system = f"{ok}/{total_checks} OK; {review} review"
        cells = [
            str(index),
            (row.get("protocol_number") or "Pending")[:18],
            (row.get("project_title") or "")[:55],
            (row.get("investigator_name") or "")[:30],
            system[:22],
            "[ ]",
            "[ ]",
            "",
        ]
        line_h = 4
        heights = []
        for width, cell in zip(col_widths, cells):
            lines = pdf.multi_cell(width, line_h, _safe_text(cell), split_only=True)
            heights.append(max(1, len(lines)))
        row_h = line_h * max(heights)
        if pdf.get_y() + row_h > pdf.page_break_trigger:
            pdf.add_page()
            pdf.set_font("Helvetica", "B", 7)
            pdf.set_x(pdf.l_margin)
            for width, header in zip(col_widths, headers):
                pdf.cell(width, 6, _safe_text(header), border=1)
            pdf.ln()
            pdf.set_font("Helvetica", "", 7)
        y0 = pdf.get_y()
        x0 = pdf.l_margin
        x = x0
        for width, cell in zip(col_widths, cells):
            pdf.set_xy(x, y0)
            pdf.multi_cell(width, line_h, _safe_text(cell), border=1)
            x += width
        pdf.set_xy(x0, y0 + row_h)

    pdf.ln(5)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(
        pdf.epw,
        4,
        _safe_text(
            "This document is the first section of the emailed review pack, followed by each protocol's "
            "checklist and Form B bundle (application, study plan annexure, funding proof where uploaded)."
        ),
    )

    return _pdf_bytes(pdf)
