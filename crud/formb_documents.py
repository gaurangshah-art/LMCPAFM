from __future__ import annotations

import json

from fpdf import FPDF
from sqlalchemy.orm import Session

from crud.exceptions import CRUDNotFoundError
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


def _write_multiline(pdf: FPDF, text: str, height: float = 6) -> None:
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(pdf.epw, height, _safe_text(text))


def _pdf_output_bytes(pdf: FPDF) -> bytes:
    output = pdf.output()
    if isinstance(output, bytearray):
        return bytes(output)
    if isinstance(output, str):
        return output.encode("latin-1")
    return output


def render_form_b_application_pdf(db: Session, project_id: int) -> bytes:
    project = db.query(IAECProject).filter(IAECProject.id == project_id).first()
    if project is None:
        raise CRUDNotFoundError("Project not found")

    form_b = db.query(FormB).filter(FormB.project_id == project_id).first()
    if form_b is None:
        raise CRUDNotFoundError("Form B not found for project")

    pdf = _SimplePDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "Form B Application", ln=True)
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 8, _safe_text(f"Project: {project.title}"), ln=True)
    pdf.cell(0, 8, _safe_text(f"Principal Investigator: {project.principal_investigator}"), ln=True)
    if project.protocol_number:
        pdf.cell(0, 8, _safe_text(f"Protocol Number: {project.protocol_number}"), ln=True)
    pdf.ln(4)

    application_data = form_b.application_data or {}
    for step_key in ("step1", "step2", "step2b", "step3", "step4", "step5", "step6", "step7"):
        step_data = application_data.get(step_key)
        if not step_data:
            continue
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 8, step_key.upper(), ln=True)
        pdf.set_font("Helvetica", "", 10)
        _write_multiline(pdf, json.dumps(step_data, indent=2), 6)
        pdf.ln(2)

    return _pdf_output_bytes(pdf)


def render_study_plan_annexure_pdf(db: Session, form_b_id: int) -> bytes:
    plan = load_study_plan_for_pdf(db, form_b_id)
    pdf = _SimplePDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "Annexure I - Experimental Study Plan", ln=True, align="C")
    pdf.ln(2)
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 7, _safe_text(f"Project: {plan['project_title']}"), ln=True)
    pdf.cell(0, 7, _safe_text(f"Principal Investigator: {plan['principal_investigator']}"), ln=True)
    if plan.get("proposed_start_date"):
        pdf.cell(
            0,
            7,
            _safe_text(
                f"Proposed period: {plan['proposed_start_date']} to {plan.get('proposed_completion_date') or '-'}"
            ),
            ln=True,
        )
    pdf.cell(0, 7, _safe_text(f"Total animals across phases: {plan['total_animals']}"), ln=True)
    if plan.get("design_rationale"):
        pdf.ln(2)
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 7, "Design rationale", ln=True)
        pdf.set_font("Helvetica", "", 10)
        _write_multiline(pdf, plan["design_rationale"], 6)

    for phase in plan["phases"]:
        pdf.ln(4)
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(
            0,
            8,
            _safe_text(
                f"Phase {phase['sequence_order']}: {phase['phase_name']} ({phase['phase_code']})"
            ),
            ln=True,
        )
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 6, _safe_text(f"Animal cap: {phase['animal_cap']}"), ln=True)
        if phase.get("planned_start_date"):
            pdf.cell(0, 6, _safe_text(f"Planned start: {phase['planned_start_date']}"), ln=True)
        if phase.get("planned_duration_weeks"):
            pdf.cell(0, 6, _safe_text(f"Duration (weeks): {phase['planned_duration_weeks']}"), ln=True)
        if phase.get("objective"):
            _write_multiline(pdf, f"Objective: {phase['objective']}", 6)
        if phase.get("contingency_note"):
            _write_multiline(pdf, f"Contingency: {phase['contingency_note']}", 6)

        for group in phase.get("groups", []):
            pdf.ln(2)
            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(
                0,
                6,
                _safe_text(
                    f"Group {group['group_code']}: {group['group_name']} "
                    f"({group['role']}, n={group['animal_count']})"
                ),
                ln=True,
            )
            pdf.set_font("Helvetica", "", 9)
            species = group.get("species_name") or "-"
            strain = group.get("strain_name") or "-"
            pdf.cell(0, 5, _safe_text(f"Species/Strain: {species} / {strain}"), ln=True)
            if group.get("sex") or group.get("age") or group.get("weight_range"):
                pdf.cell(
                    0,
                    5,
                    _safe_text(
                        f"Sex/Age/Weight: {group.get('sex') or '-'} / "
                        f"{group.get('age') or '-'} / {group.get('weight_range') or '-'}"
                    ),
                    ln=True,
                )
            if group.get("feeding_diet"):
                pdf.cell(0, 5, _safe_text(f"Diet: {group['feeding_diet']}"), ln=True)
            if group.get("treatment_summary"):
                _write_multiline(pdf, f"Treatment: {group['treatment_summary']}", 5)

            if group.get("dosing"):
                pdf.cell(0, 5, _safe_text("Dosing schedule:"), ln=True)
                for dose in group["dosing"]:
                    line = (
                        f"  - {dose['agent_name']} {dose['dose']} "
                        f"({dose['route']}, {dose['frequency']})"
                    )
                    if dose.get("start_day") is not None:
                        line += f" from day {dose['start_day']}"
                    _write_multiline(pdf, line, 5)

            if group.get("endpoints"):
                pdf.cell(0, 5, _safe_text("Parameters / timelines:"), ln=True)
                for endpoint in group["endpoints"]:
                    _write_multiline(
                        pdf,
                        f"  - {endpoint['parameter_name']} ({endpoint['schedule_type']}): "
                        f"{endpoint['schedule_detail']}",
                        5,
                    )

            if group.get("fates"):
                pdf.cell(0, 5, _safe_text("Animal disposition:"), ln=True)
                for fate in group["fates"]:
                    _write_multiline(
                        pdf,
                        f"  - {fate['fate_type']}: {fate['count']} "
                        f"({fate.get('method_or_destination') or '-'}, "
                        f"{fate.get('timing') or '-'})",
                        5,
                    )

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
