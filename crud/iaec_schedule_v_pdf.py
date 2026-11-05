from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.orm import Session

from crud.exceptions import CRUDNotFoundError
from crud.formb_internal import get_meeting_form_b_summary
from crud.formb_study_plan import get_study_plan_total_animals
from crud.iaec_members import get_meeting_attendance
from database.lmcpafm_models import Cage, IAECMeeting
from utils.date_format import format_display_date
from utils.institution import (
    get_cpcsea_registration_number,
    get_establishment_address,
    get_establishment_name,
)
from utils.pdf_branding import BrandedPDF, _safe_text


class _ScheduleVPDF(BrandedPDF):
    def header(self):
        super().header()
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "B", 10)
        self.cell(0, 6, "IAEC Meeting Minutes (Schedule V format)", ln=True, align="C")
        self.ln(1)


def _paragraph(pdf: BrandedPDF, text: str, height: float = 5) -> None:
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(pdf.epw, height, _safe_text(text))


def _pdf_bytes(pdf: BrandedPDF) -> bytes:
    out = pdf.output(dest="S")
    if isinstance(out, (bytes, bytearray)):
        return bytes(out)
    return out.encode("latin-1")


def get_total_housing_capacity(db: Session) -> int:
    total = db.query(func.coalesce(func.sum(Cage.capacity), 0)).scalar()
    return int(total or 0)


def _format_species_str(requirements: list[dict]) -> str:
    if not requirements:
        return "-"
    parts = []
    for row in requirements:
        species = (row.get("species_name") or "").strip()
        strain = (row.get("strain_name") or "").strip()
        count = row.get("count")
        label = species
        if strain:
            label = f"{species} / {strain}" if species else strain
        if count:
            label = f"{label} ({count})"
        if label:
            parts.append(label)
    return "; ".join(parts) if parts else "-"


def _proposed_animal_count(db: Session, form_b_id: int, requirements: list[dict]) -> int | None:
    from_study_plan = get_study_plan_total_animals(db, form_b_id)
    if from_study_plan is not None:
        return from_study_plan
    if requirements:
        return sum(int(row.get("count") or 0) for row in requirements)
    return None




def _default_item1_text(db: Session, meeting: IAECMeeting) -> str:
    previous = (
        db.query(IAECMeeting)
        .filter(IAECMeeting.date < meeting.date)
        .order_by(IAECMeeting.date.desc(), IAECMeeting.id.desc())
        .first()
    )
    if previous is None:
        return (
            "Not applicable - no prior IAEC meeting on record. "
            "Minutes of the previous meeting were not required."
        )
    prev_no = previous.meeting_number or str(previous.id)
    prev_date = format_display_date(previous.date)
    return (
        f"The minutes of IAEC meeting No. {prev_no} held on {prev_date} were read. "
        "The committee confirmed the minutes as recorded."
    )


def render_schedule_v_pdf(db: Session, meeting_id: int) -> bytes:
    meeting = db.query(IAECMeeting).filter(IAECMeeting.id == meeting_id).first()
    if meeting is None:
        raise CRUDNotFoundError("Meeting not found.")

    housing_capacity = get_total_housing_capacity(db)
    protocol_rows = get_meeting_form_b_summary(db, meeting_id)
    attendance = get_meeting_attendance(db, meeting_id)

    item1 = (meeting.minutes_item1 or "").strip() or _default_item1_text(db, meeting)
    item2 = (meeting.minutes_item2 or meeting.minutes or "").strip()
    if not item2:
        item2 = "Other agenda items as discussed in the meeting."

    pdf = _ScheduleVPDF()
    pdf.set_auto_page_break(auto=True, margin=14)
    pdf.add_page()
    pdf.set_x(pdf.l_margin)

    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 7, "Format for submission of minutes of the meeting of IAEC (Schedule V)", ln=True)
    pdf.set_font("Helvetica", "I", 8)
    _paragraph(
        pdf,
        "Upload signed copy to CPCSEA Establishment Login within 15 days of the meeting. "
        "Minutes may be signed physically with ink or digitally.",
        height=4,
    )
    pdf.ln(2)

    pdf.set_font("Helvetica", "", 10)
    _paragraph(pdf, f"Name and address of establishment: {get_establishment_name()}")
    _paragraph(pdf, get_establishment_address())
    _paragraph(pdf, f"Registration number of establishment: {get_cpcsea_registration_number()}")
    _paragraph(
        pdf,
        f"Date and time of IAEC meeting: {format_display_date(meeting.date)}"
        f"{f' at {meeting.meeting_time}' if meeting.meeting_time else ''}",
    )
    _paragraph(pdf, f"Venue: {meeting.venue or '-'}")
    if meeting.meeting_number:
        _paragraph(pdf, f"IAEC meeting number: {meeting.meeting_number}")

    pdf.ln(3)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, "Minutes of the Meeting", ln=True)
    pdf.ln(1)

    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(0, 5, "Item No. 1: Reading and confirmation of minutes of last IAEC meeting", ln=True)
    pdf.set_font("Helvetica", "", 9)
    _paragraph(pdf, item1, height=4)
    pdf.ln(2)

    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(0, 5, "Item No. 2: Agenda (other business)", ln=True)
    pdf.set_font("Helvetica", "", 9)
    _paragraph(pdf, item2, height=4)
    pdf.ln(2)

    pdf.add_page(orientation="L")
    pdf.set_margins(10, 38, 10)
    pdf.set_x(pdf.l_margin)

    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(
        0,
        5,
        "Item No. 3: Decision / Recommendation of IAEC on research protocols",
        ln=True,
    )
    pdf.ln(1)

    col_widths = [8, 48, 22, 38, 42, 18, 18, 22, 18, 36]
    total_w = sum(col_widths)
    scale = pdf.epw / total_w
    col_widths = [w * scale for w in col_widths]
    headers = [
        "S.",
        "Title",
        "Protocol",
        "PI",
        "Species/strain",
        "Housing cap.",
        "Proposed",
        "Recommended",
        "Rej/Def",
        "Remarks",
    ]
    pdf.set_font("Helvetica", "B", 6)
    pdf.set_x(pdf.l_margin)
    for width, header in zip(col_widths, headers):
        pdf.cell(width, 5, _safe_text(header), border=1)
    pdf.ln()

    pdf.set_font("Helvetica", "", 6)
    if not protocol_rows:
        pdf.set_x(pdf.l_margin)
        pdf.cell(sum(col_widths), 6, _safe_text("No protocols assigned to this meeting."), border=1, ln=True)
    for index, row in enumerate(protocol_rows, start=1):
        requirements = row.get("animal_requirements") or []
        proposed = _proposed_animal_count(db, row["form_b_id"], requirements)
        decision = (row.get("decision") or "").strip().lower()
        rejected_deferred = "Rejected" if decision == "rejected" else ""
        recommended = (
            str(row["approved_animal_count"])
            if row.get("approved_animal_count") is not None
            else ("-" if not decision else decision.replace("_", " "))
        )
        remarks = (row.get("decision_remarks") or "").strip()
        cells = [
            str(index),
            (row.get("project_title") or "")[:80],
            (row.get("protocol_number") or "Pending")[:20],
            (row.get("investigator_name") or "")[:40],
            _format_species_str(requirements)[:50],
            str(housing_capacity),
            str(proposed if proposed is not None else "-"),
            recommended[:12],
            rejected_deferred[:12],
            remarks[:40],
        ]
        line_height = 5
        pdf.set_x(pdf.l_margin)
        for width, cell in zip(col_widths, cells):
            pdf.cell(width, line_height, _safe_text(cell), border=1)
        pdf.ln()

    pdf.add_page(orientation="P")
    pdf.set_margins(10, 38, 10)
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, _safe_text("Attendance sheet - IAEC members present"), ln=True)
    pdf.ln(2)

    att_cols = [10, 55, 65, 60]
    pdf.set_font("Helvetica", "B", 9)
    for width, label in zip(att_cols, ["S.No.", "Name", "Designation in IAEC", "Signature with date"]):
        pdf.cell(width, 7, _safe_text(label), border=1)
    pdf.ln()

    pdf.set_font("Helvetica", "", 9)
    if not attendance:
        pdf.cell(
            sum(att_cols),
            8,
            _safe_text("No IAEC members configured. Add members in LMCPAFM before exporting."),
            border=1,
            ln=True,
        )
    else:
        serial = 0
        for entry in attendance:
            if not entry.get("present"):
                continue
            serial += 1
            pdf.cell(att_cols[0], 8, str(serial), border=1)
            pdf.cell(att_cols[1], 8, _safe_text(entry["full_name"][:40]), border=1)
            pdf.cell(att_cols[2], 8, _safe_text(entry["designation"][:45]), border=1)
            pdf.cell(att_cols[3], 8, "", border=1)
            pdf.ln()

        absent = [e["full_name"] for e in attendance if not e.get("present")]
        if absent:
            pdf.ln(3)
            pdf.set_font("Helvetica", "", 9)
            _paragraph(pdf, f"Members absent: {', '.join(absent)}")

    pdf.ln(6)
    pdf.set_font("Helvetica", "I", 8)
    _paragraph(
        pdf,
        "Certification: Member Secretary and Chairperson signatures appear on the signed copy "
        "uploaded to CPCSEA.",
        height=4,
    )

    return _pdf_bytes(pdf)
