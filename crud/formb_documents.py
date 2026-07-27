from __future__ import annotations

import json

from fpdf import FPDF
from sqlalchemy.orm import Session

from crud.exceptions import CRUDNotFoundError
from crud.formb_internal import get_meeting_form_b_summary
from crud.project_certificate import (
    FINAL_ATTESTATION,
    PROVISIONAL_DISCLAIMER,
    build_project_certificate_data,
)
from database.lmcpafm_models import FormB, FormBMeetingDecision, IAECMeeting, IAECProject
from utils.institution import get_cpcsea_registration_number, get_establishment_name


class _SimplePDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 12)
        self.cell(0, 8, "LMCP Institutional Animal Ethics Committee", ln=True, align="C")
        self.ln(2)


def _safe_text(value) -> str:
    if value is None:
        return ""
    return str(value).encode("latin-1", errors="replace").decode("latin-1")


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
    for step_key in ("step1", "step2", "step3", "step4", "step5", "step6", "step7"):
        step_data = application_data.get(step_key)
        if not step_data:
            continue
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 8, step_key.upper(), ln=True)
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(0, 6, _safe_text(json.dumps(step_data, indent=2)))
        pdf.ln(2)

    output = pdf.output()
    if isinstance(output, bytearray):
        return bytes(output)
    if isinstance(output, str):
        return output.encode("latin-1")
    return output


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

    output = pdf.output()
    if isinstance(output, bytearray):
        return bytes(output)
    if isinstance(output, str):
        return output.encode("latin-1")
    return output


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
    pdf.cell(0, 8, _safe_text(get_establishment_name()), ln=True)
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

    output = pdf.output()
    if isinstance(output, bytearray):
        return bytes(output)
    if isinstance(output, str):
        return output.encode("latin-1")
    return output
