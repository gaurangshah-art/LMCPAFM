from __future__ import annotations

from sqlalchemy.orm import Session

from crud.formb_application_pdf import DECLARATION_LABELS, _load_application_context
from crud.formb_attachments import read_attachment_bytes
from crud.formb_study_plan import get_study_plan_total_animals
from database.lmcpafm_models import FormBAttachment, FormBInvestigator
from utils.date_format import format_display_date
from utils.pdf_branding import BrandedPDF, _safe_text


class _IAECReviewChecklistPDF(BrandedPDF):
    def header(self):
        super().header()
        self.set_font("Helvetica", "B", 10)
        self.cell(0, 6, "IAEC Form B Protocol Review Checklist", ln=True, align="C")
        self.ln(1)


def _pdf_bytes(pdf: BrandedPDF) -> bytes:
    out = pdf.output(dest="S")
    if isinstance(out, (bytes, bytearray)):
        return bytes(out)
    return out.encode("latin-1")


def _status(ok: bool | None) -> str:
    if ok is True:
        return "OK"
    if ok is False:
        return "Review"
    return "-"


def _non_empty(value) -> bool:
    return bool(str(value or "").strip())


def _has_funding_attachment(db: Session, form_b_id: int) -> bool:
    row = (
        db.query(FormBAttachment)
        .filter(
            FormBAttachment.form_b_id == form_b_id,
            FormBAttachment.category == "funding_proof",
        )
        .first()
    )
    if row is None:
        return False
    content, _, _ = read_attachment_bytes(row)
    return bool(content)


def _has_faculty_co_investigator(db: Session, form_b_id: int) -> bool:
    rows = (
        db.query(FormBInvestigator)
        .filter(FormBInvestigator.form_b_id == form_b_id)
        .all()
    )
    for row in rows:
        role = (row.project_role or "").lower()
        if "principal" in role and "investigator" in role:
            continue
        inv_type = (row.investigator_type or "").lower()
        if "faculty" in inv_type:
            return True
    return False


def _declarations_complete(step7: dict) -> bool:
    if not step7:
        return False
    return all(bool(step7.get(key)) for key in DECLARATION_LABELS)


def summarize_form_b_system_checks(db: Session, project_id: int) -> tuple[int, int, int]:
    """Return (ok_count, review_count, automated_item_count) for meeting agenda summaries."""
    ctx = _load_application_context(db, project_id)
    rows = _build_checklist_rows(db, ctx)
    automated = [row for row in rows if row[2] != "-"]
    ok = sum(1 for _no, _item, status in automated if status == "OK")
    review = sum(1 for _no, _item, status in automated if status == "Review")
    return ok, review, len(automated)


def _build_checklist_rows(db: Session, ctx: dict) -> list[tuple[str, str, str]]:
    form_b = ctx["form_b"]
    project = ctx["project"]
    step1 = ctx["step1"]
    step2 = ctx["step2"]
    step2b = ctx["step2b"]
    step3 = ctx["step3"]
    step4 = ctx["step4"]
    step5 = ctx["step5"]
    step6 = ctx["step6"]
    step7 = ctx["step7"]
    study_plan = ctx.get("study_plan") or {}

    requirements = step3.get("requirements") or []
    if not requirements and form_b.id:
        from database.lmcpafm_models import FormBAnimalRequirement

        requirements = [
            {"species_name": r.species_name, "strain_name": r.strain_name, "count": r.count}
            for r in db.query(FormBAnimalRequirement)
            .filter(FormBAnimalRequirement.form_b_id == form_b.id)
            .all()
        ]

    total_animals = get_study_plan_total_animals(db, form_b.id)
    hazardous = (step7.get("hazardous_agents_used") or "").strip().lower()
    hazardous_yes = hazardous in {"yes", "y", "true"}

    rows: list[tuple[str, str, str]] = [
        (
            "1",
            "Form B submitted by investigator (not draft-only).",
            _status(form_b.submitted_at is not None),
        ),
        (
            "2",
            "Section I: project title, PI, department, and establishment details present.",
            _status(
                _non_empty(project.title or step1.get("project_title"))
                and _non_empty(step1.get("principal_investigator") or project.principal_investigator)
            ),
        ),
        (
            "3",
            "Funding source, grant/sponsor details, and funding proof attachment on file.",
            _status(
                _non_empty(step2.get("funding_source") or step2.get("sponsor_name"))
                and _has_funding_attachment(db, form_b.id)
            ),
        ),
        (
            "4",
            "Co-investigators listed; faculty member included where required.",
            _status(_has_faculty_co_investigator(db, form_b.id) or len(ctx["co_investigators"]) > 0),
        ),
        (
            "5",
            "Study plan annexure (phases, groups, endpoints) completed.",
            _status(bool(study_plan.get("phases"))),
        ),
        (
            "6",
            "Animal numbers in study plan align with scientific justification (Step 2b).",
            _status(
                total_animals is not None
                and total_animals > 0
                and _non_empty((step2b.get("animal_rationale") or {}).get("justification"))
            ),
        ),
        (
            "7",
            "Species, strain, sex, source, breeder, and housing duration documented (Step 3).",
            _status(bool(requirements)),
        ),
        (
            "8",
            "Replacement, reduction, and refinement (3Rs) addressed (Step 4).",
            _status(
                _non_empty(step4.get("replacement"))
                or _non_empty(step4.get("reduction"))
                or _non_empty(step4.get("refinement"))
            ),
        ),
        (
            "9",
            "Procedures: anesthesia, analgesia, surgery, and euthanasia described (Step 5).",
            _status(bool(step5)),
        ),
        (
            "10",
            "Personnel qualifications and training for procedures recorded (Step 6).",
            _status(bool(step6.get("personnel") or step6.get("training_details") or step6)),
        ),
        (
            "11",
            "Hazardous agents / biosafety: use declared; certificates referenced if applicable.",
            _status(
                _non_empty(step7.get("hazardous_agents_used"))
                and (not hazardous_yes or _non_empty(step7.get("hazardous_agent_details")))
            ),
        ),
        (
            "12",
            "All investigator declarations (Step 7) accepted.",
            _status(_declarations_complete(step7)),
        ),
        (
            "13",
            "Protocol number assigned or pending assignment before CPCSEA submission.",
            _status(_non_empty(project.protocol_number)),
        ),
        (
            "14",
            "IAEC decision, approved animal count, and remarks recorded (after meeting).",
            "-",
        ),
    ]
    return rows


def render_iaec_form_b_review_checklist_pdf(db: Session, project_id: int) -> bytes:
    ctx = _load_application_context(db, project_id)
    project = ctx["project"]
    form_b = ctx["form_b"]

    pdf = _IAECReviewChecklistPDF()
    pdf.set_margins(12, 38, 12)
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.add_page()

    pdf.set_font("Helvetica", "", 9)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(
        pdf.epw,
        5,
        _safe_text(
            "Instructions: IAEC members complete this checklist while reviewing the attached Form B "
            "application, study plan annexure, and funding proof. Mark P (Pass), F (Fail), or N/A in "
            "the IAEC column. The System column is auto-filled from LMCPAFM data for convenience only."
        ),
    )
    pdf.ln(2)

    pdf.set_font("Helvetica", "", 9)
    meta_lines = [
        f"Project: {project.title or '-'}",
        f"Principal Investigator: {project.principal_investigator or '-'}",
        f"Protocol: {(project.protocol_number or 'Pending')}",
        f"Form B submitted: {format_display_date(form_b.submitted_at, fallback='Not submitted')}",
    ]
    for line in meta_lines:
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(pdf.epw, 5, _safe_text(line))
    pdf.ln(3)

    col_no = 8
    col_item = pdf.epw - col_no - 16 - 14 - 28
    col_system = 16
    col_iaec = 14
    col_notes = 28
    col_widths = [col_no, col_item, col_system, col_iaec, col_notes]
    headers = ["#", "Review item", "System", "P/F/N/A", "Notes"]

    pdf.set_font("Helvetica", "B", 8)
    pdf.set_x(pdf.l_margin)
    for width, header in zip(col_widths, headers):
        pdf.cell(width, 6, _safe_text(header), border=1)
    pdf.ln()

    pdf.set_font("Helvetica", "", 7)
    for number, item, system in _build_checklist_rows(db, ctx):
        cells = [number, item, system, "[ ]", ""]
        line_h = 4
        heights = []
        for width, cell in zip(col_widths, cells):
            lines = pdf.multi_cell(width, line_h, _safe_text(cell), split_only=True)
            heights.append(max(1, len(lines)))
        row_h = line_h * max(heights)
        if pdf.get_y() + row_h > pdf.page_break_trigger:
            pdf.add_page()
            pdf.set_font("Helvetica", "B", 8)
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

    pdf.ln(6)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(
        pdf.epw,
        5,
        _safe_text(
            "Reviewer name: _______________________________    "
            "Signature: _______________________________    "
            f"Date: ____________"
        ),
    )
    pdf.ln(2)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(
        pdf.epw,
        5,
        _safe_text(
            "Member Secretary / Chairperson (meeting record): "
            "Decision ______________    Approved animals ______________"
        ),
    )

    return _pdf_bytes(pdf)
