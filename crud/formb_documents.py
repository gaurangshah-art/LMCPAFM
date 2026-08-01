from __future__ import annotations

from fpdf import FPDF
from sqlalchemy.orm import Session

from crud.exceptions import CRUDNotFoundError
from crud.formb_application_pdf import render_cpcsea_form_b_application_pdf
from crud.formb_internal import get_meeting_form_b_summary
from crud.formb_study_plan import load_study_plan_for_pdf
from crud.project_certificate import (
    FINAL_ATTESTATION,
    PROVISIONAL_DISCLAIMER,
    build_project_certificate_data,
)
from database.lmcpafm_models import FormB, IAECMeeting, IAECProject
from utils.branding import get_college_display_name
from utils.institution import get_cpcsea_registration_number, get_establishment_name
from utils.pdf_branding import BrandedPDF, _safe_text


class _SimplePDF(BrandedPDF):
    def header(self):
        super().header()
        self.set_font("Helvetica", "B", 10)
        self.cell(0, 6, "LMCP Institutional Animal Ethics Committee", ln=True, align="C")
        self.ln(1)


def _write_multiline(pdf: FPDF, text: str, height: float = 6, bold: bool = False) -> None:
    pdf.set_x(pdf.l_margin)
    size = 10 if not bold else 11
    pdf.set_font("Helvetica", "B" if bold else "", size)
    pdf.multi_cell(pdf.epw, height, _safe_text(text))


def _init_annexure_pdf() -> _SimplePDF:
    pdf = _SimplePDF()
    pdf.set_margins(15, 38, 15)
    pdf.set_auto_page_break(auto=True, margin=18)
    return pdf


def _write_evaluation_parameters(pdf: FPDF, endpoints: list[dict]) -> None:
    _write_multiline(pdf, "Study evaluation parameters", 6, bold=True)
    if not endpoints:
        _write_multiline(pdf, "Not recorded.", 5)
        return
    for endpoint in endpoints:
        schedule_type = endpoint.get("schedule_type") or "-"
        line = (
            f"  - {endpoint.get('parameter_name') or '-'} "
            f"({schedule_type}): {endpoint.get('schedule_detail') or '-'}"
        )
        if endpoint.get("method"):
            line += f"; method: {endpoint['method']}"
        _write_multiline(pdf, line, 5)
    pdf.ln(1)


def _write_phase_procedures(pdf: FPDF, phase: dict) -> None:
    _write_multiline(pdf, "Blood withdrawal and surgical procedures", 6, bold=True)
    volume = (phase.get("blood_withdrawal_volume") or "").strip() or "Not recorded"
    site = (phase.get("blood_withdrawal_site") or "").strip() or "Not recorded"
    surgery = (phase.get("surgical_procedure") or "").strip() or "None"
    _write_multiline(pdf, f"  Amount of blood to be withdrawn: {volume}", 5)
    _write_multiline(pdf, f"  Site of blood withdrawal: {site}", 5)
    _write_multiline(pdf, f"  Surgical procedure, if any: {surgery}", 5)
    pdf.ln(1)


def _write_animal_summary_table(pdf: FPDF, summary: dict) -> None:
    _write_multiline(pdf, "Animal use summary", 6, bold=True)
    pdf.ln(1)
    col_w = pdf.epw / 2
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(col_w, 7, _safe_text("Category"), border=1)
    pdf.cell(col_w, 7, _safe_text("Count"), border=1, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    rows = [
        ("Total animals used", summary.get("total_used", 0)),
        ("Sacrificed / euthanized", summary.get("sacrificed", 0)),
        ("Rehabilitated", summary.get("rehabilitated", 0)),
    ]
    if summary.get("reused"):
        rows.append(("Reused", summary["reused"]))
    if summary.get("other"):
        rows.append(("Other disposition", summary["other"]))
    for label, count in rows:
        pdf.set_x(pdf.l_margin)
        pdf.cell(col_w, 7, _safe_text(label), border=1)
        pdf.cell(col_w, 7, str(count), border=1, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)


def _format_group_name(group: dict) -> str:
    code = group.get("group_code") or ""
    name = group.get("group_name") or "Group"
    role = group.get("role") or ""
    label = f"{code}: {name}" if code else name
    if role:
        label = f"{label} ({role})"
    return label


def _format_group_animal_cell(group: dict) -> str:
    species = group.get("species_name") or "-"
    strain = group.get("strain_name") or "-"
    gender = group.get("sex") or "-"
    return f"{species}, {strain}, {gender}"


def _format_group_treatment_cell(group: dict) -> str:
    dosing = group.get("dosing") or []
    if dosing:
        dose = dosing[0]
        parts = [
            dose.get("agent_name") or "-",
            dose.get("dose") or "-",
            dose.get("route") or "-",
            dose.get("frequency") or "-",
            dose.get("duration") or "-",
        ]
        return "; ".join(str(part) for part in parts)
    if group.get("treatment_summary"):
        return str(group["treatment_summary"])
    if group.get("role") == "control":
        return "Vehicle / NA"
    return "-"


def _table_row_height(pdf: FPDF, col_widths: list[float], cells: list[str], line_height: float = 4) -> float:
    max_lines = 1
    for width, cell in zip(col_widths, cells):
        lines = pdf.multi_cell(width, line_height, _safe_text(cell), split_only=True)
        max_lines = max(max_lines, len(lines))
    return line_height * max_lines


def _write_table_row(
    pdf: FPDF,
    col_widths: list[float],
    cells: list[str],
    *,
    header: bool = False,
    font_size: int = 8,
    line_height: float = 4,
) -> None:
    pdf.set_font("Helvetica", "B" if header else "", font_size)
    row_height = _table_row_height(pdf, col_widths, cells, line_height)
    if pdf.get_y() + row_height > pdf.page_break_trigger:
        pdf.add_page()
    y_start = pdf.get_y()
    x_start = pdf.l_margin
    x = x_start
    for width, cell in zip(col_widths, cells):
        pdf.set_xy(x, y_start)
        pdf.multi_cell(width, line_height, _safe_text(cell), border=1)
        x += width
    pdf.set_y(y_start + row_height)


def _write_phase_groups_table(pdf: FPDF, groups: list[dict]) -> None:
    if not groups:
        _write_multiline(pdf, "No groups recorded.", 5)
        return

    pdf.ln(1)
    _write_multiline(pdf, "Experimental groups", 6, bold=True)
    col_widths = [pdf.epw * 0.18, pdf.epw * 0.27, pdf.epw * 0.10, pdf.epw * 0.45]
    _write_table_row(
        pdf,
        col_widths,
        [
            "Group name",
            "Animal (species, strain, gender)",
            "No. of animals",
            "Treatment (drug; dose; route; frequency; duration)",
        ],
        header=True,
    )
    for group in groups:
        _write_table_row(
            pdf,
            col_widths,
            [
                _format_group_name(group),
                _format_group_animal_cell(group),
                str(group.get("animal_count") or 0),
                _format_group_treatment_cell(group),
            ],
        )
    pdf.ln(1)


def _write_group_disposition(pdf: FPDF, groups: list[dict]) -> None:
    has_fates = any(group.get("fates") for group in groups)
    if not has_fates:
        return
    _write_multiline(pdf, "Animal disposition by group", 6, bold=True)
    for group in groups:
        fates = group.get("fates") or []
        if not fates:
            continue
        label = _format_group_name(group)
        parts = []
        for fate in fates:
            parts.append(
                f"{fate.get('fate_type')}: {fate.get('count')} "
                f"({fate.get('method_or_destination') or '-'}, {fate.get('timing') or '-'})"
            )
        _write_multiline(pdf, f"  {label}: {'; '.join(parts)}", 5)
    pdf.ln(1)


def _pdf_output_bytes(pdf: FPDF) -> bytes:
    output = pdf.output()
    if isinstance(output, bytearray):
        return bytes(output)
    if isinstance(output, str):
        return output.encode("latin-1")
    return output


def render_form_b_application_pdf(db: Session, project_id: int) -> bytes:
    return render_cpcsea_form_b_application_pdf(db, project_id)


def render_study_plan_annexure_pdf(db: Session, form_b_id: int) -> bytes:
    plan = load_study_plan_for_pdf(db, form_b_id)
    pdf = _init_annexure_pdf()
    pdf.add_page()
    _write_multiline(pdf, "Annexure I - Experimental Study Plan", 8, bold=True)
    pdf.ln(2)
    _write_multiline(pdf, f"Project: {plan['project_title']}", 6)
    _write_multiline(pdf, f"Principal Investigator: {plan['principal_investigator']}", 6)
    if plan.get("proposed_start_date"):
        _write_multiline(
            pdf,
            f"Proposed period: {plan['proposed_start_date']} to "
            f"{plan.get('proposed_completion_date') or '-'}",
            6,
        )
    _write_multiline(pdf, f"Total animals across phases: {plan['total_animals']}", 6)
    if plan.get("design_rationale"):
        pdf.ln(2)
        _write_multiline(pdf, "Design rationale", 6, bold=True)
        _write_multiline(pdf, plan["design_rationale"], 6)

    for phase in plan["phases"]:
        pdf.ln(3)
        _write_multiline(
            pdf,
            f"Phase {phase['sequence_order']}: {phase['phase_name']} ({phase['phase_code']})",
            7,
            bold=True,
        )
        _write_multiline(pdf, f"Animal cap: {phase['animal_cap']}", 5)
        if phase.get("planned_start_date"):
            _write_multiline(pdf, f"Planned start: {phase['planned_start_date']}", 5)
        if phase.get("planned_duration_weeks"):
            _write_multiline(pdf, f"Duration (weeks): {phase['planned_duration_weeks']}", 5)
        if phase.get("objective"):
            _write_multiline(pdf, f"Objective: {phase['objective']}", 5)
        if phase.get("contingency_note"):
            _write_multiline(pdf, f"Contingency: {phase['contingency_note']}", 5)

        _write_evaluation_parameters(pdf, phase.get("endpoints") or [])
        _write_phase_procedures(pdf, phase)
        _write_phase_groups_table(pdf, phase.get("groups") or [])
        _write_group_disposition(pdf, phase.get("groups") or [])

    if plan.get("animal_summary"):
        pdf.ln(4)
        _write_animal_summary_table(pdf, plan["animal_summary"])

    return _pdf_output_bytes(pdf)


def render_meeting_summary_pdf(db: Session, meeting_id: int) -> bytes:
    meeting = db.query(IAECMeeting).filter(IAECMeeting.id == meeting_id).first()
    if meeting is None:
        raise CRUDNotFoundError("Meeting not found")

    rows = get_meeting_form_b_summary(db, meeting_id)
    pdf = _SimplePDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "IAEC Meeting Form B Summary", ln=True)
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 8, _safe_text(f"Meeting date: {meeting.date}"), ln=True)
    pdf.cell(0, 8, _safe_text(f"Meeting number: {meeting.meeting_number or '-'}"), ln=True)
    pdf.ln(4)

    for row in rows:
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 8, _safe_text(row["project_title"]), ln=True)
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 6, _safe_text(f"Investigator: {row['investigator_name']}"), ln=True)
        pdf.cell(0, 6, _safe_text(f"Protocol: {row.get('protocol_number') or 'Pending'}"), ln=True)
        pdf.cell(0, 6, _safe_text(f"Decision: {row.get('decision') or 'Pending'}"), ln=True)
        pdf.ln(2)

    return _pdf_output_bytes(pdf)


def render_project_certificate_pdf(db: Session, project_id: int) -> bytes:
    certificate = build_project_certificate_data(db, project_id)
    project = db.query(IAECProject).filter(IAECProject.id == project_id).first()
    if project is None:
        raise CRUDNotFoundError("Project not found")

    pdf = _SimplePDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)

    if certificate["is_final"]:
        pdf.cell(0, 10, "IAEC Experiment Completion Certificate", ln=True, align="C")
    else:
        pdf.cell(0, 10, "IAEC Project Approval Certificate (Provisional)", ln=True, align="C")

    pdf.ln(4)

    if not certificate["is_final"]:
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(180, 0, 0)
        pdf.multi_cell(0, 7, _safe_text(certificate["disclaimer"] or PROVISIONAL_DISCLAIMER))
        pdf.set_text_color(0, 0, 0)
        pdf.ln(4)

    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 8, _safe_text(get_establishment_name() or get_college_display_name()), ln=True)
    pdf.cell(0, 8, _safe_text(f"CPCSEA Reg. No.: {get_cpcsea_registration_number()}"), ln=True)
    pdf.cell(0, 8, _safe_text(f"Protocol: {certificate['lmcp_iaec_id'] or 'Pending'}"), ln=True)
    pdf.cell(0, 8, _safe_text(f"Project: {certificate['title']}"), ln=True)
    pdf.cell(0, 8, _safe_text(f"Principal Investigator: {certificate['investigator']}"), ln=True)
    if certificate.get("department"):
        pdf.cell(0, 8, _safe_text(f"Department: {certificate['department']}"), ln=True)

    if certificate.get("meeting_date"):
        pdf.cell(0, 8, _safe_text(f"IAEC meeting date: {certificate['meeting_date']}"), ln=True)
    if certificate.get("meeting_number"):
        pdf.cell(0, 8, _safe_text(f"IAEC meeting number: {certificate['meeting_number']}"), ln=True)
    if certificate.get("approval_date"):
        pdf.cell(0, 8, _safe_text(f"IAEC approval date: {certificate['approval_date']}"), ln=True)
    if certificate.get("decision"):
        pdf.cell(0, 8, _safe_text(f"Decision: {certificate['decision']}"), ln=True)
    if certificate.get("approved_animal_count") is not None:
        pdf.cell(
            0,
            8,
            _safe_text(f"Approved animal count: {certificate['approved_animal_count']}"),
            ln=True,
        )

    if certificate["is_final"]:
        pdf.ln(3)
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 8, "CPCSEA Compliance Attestation", ln=True)
        pdf.set_font("Helvetica", "", 11)
        pdf.multi_cell(0, 6, _safe_text(certificate["final_attestation"] or FINAL_ATTESTATION))
        usage = certificate.get("usage_summary") or {}
        pdf.cell(0, 8, _safe_text(f"Planned animals: {usage.get('planned_animals', 0)}"), ln=True)
        pdf.cell(0, 8, _safe_text(f"Allocated animals: {usage.get('allocated_animals', 0)}"), ln=True)
        pdf.cell(0, 8, _safe_text(f"Logged in experiments: {usage.get('logged_animals', 0)}"), ln=True)
        if certificate.get("completion_date"):
            pdf.cell(0, 8, _safe_text(f"Completion date: {certificate['completion_date']}"), ln=True)
        if not certificate.get("publication_ready"):
            pdf.ln(2)
            pdf.set_font("Helvetica", "B", 10)
            pdf.multi_cell(
                0,
                6,
                _safe_text(
                    "This system-generated certificate is NOT the signed hard copy for journal submission. "
                    "The official certificate requires signatures of the IAEC Chairperson, CPCSEA nominee, "
                    "and Member Secretary and will be uploaded after signing."
                ),
            )
            pdf.set_font("Helvetica", "", 11)
    else:
        pdf.ln(3)
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 8, "Current Experimental Status", ln=True)
        pdf.set_font("Helvetica", "", 11)
        work_state = certificate.get("work_state", "not_initiated")
        if work_state == "not_initiated":
            pdf.multi_cell(0, 6, _safe_text("Experimental work has not been initiated."))
        else:
            pdf.multi_cell(0, 6, _safe_text("Experimental work is in progress but not fully logged."))
        usage = certificate.get("usage_summary") or {}
        pdf.cell(0, 8, _safe_text(f"Planned animals: {usage.get('planned_animals', 0)}"), ln=True)
        pdf.cell(0, 8, _safe_text(f"Allocated animals: {usage.get('allocated_animals', 0)}"), ln=True)
        pdf.cell(0, 8, _safe_text(f"Logged in experiments: {usage.get('logged_animals', 0)}"), ln=True)
        blocking = (certificate.get("completion_status") or {}).get("blocking_reasons") or []
        for reason in blocking:
            pdf.multi_cell(0, 6, _safe_text(f"- {reason}"))

    if certificate.get("comments"):
        pdf.ln(2)
        pdf.multi_cell(0, 6, _safe_text(f"IAEC remarks: {certificate['comments']}"))

    pdf.ln(8)
    pdf.cell(0, 8, _safe_text(f"IAEC Chairperson: {certificate.get('chairperson_name', 'IAEC Chairperson')}"), ln=True)

    return _pdf_output_bytes(pdf)
