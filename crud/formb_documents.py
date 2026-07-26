from __future__ import annotations

import json

from fpdf import FPDF
from sqlalchemy.orm import Session

from crud.exceptions import CRUDNotFoundError
from crud.formb_internal import get_meeting_form_b_summary
from database.lmcpafm_models import FormB, FormBMeetingDecision, IAECMeeting, IAECProject


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
    project = db.query(IAECProject).filter(IAECProject.id == project_id).first()
    if project is None:
        raise CRUDNotFoundError("Project not found")

    form_b = db.query(FormB).filter(FormB.project_id == project_id).first()
    meeting = None
    decision = None
    if form_b and form_b.meeting_id:
        meeting = db.query(IAECMeeting).filter(IAECMeeting.id == form_b.meeting_id).first()
        decision = (
            db.query(FormBMeetingDecision)
            .filter(
                FormBMeetingDecision.form_b_id == form_b.id,
                FormBMeetingDecision.meeting_id == form_b.meeting_id,
            )
            .first()
        )

    pdf = _SimplePDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "IAEC Approval Certificate", ln=True, align="C")
    pdf.ln(4)
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 8, _safe_text(f"Protocol: {project.protocol_number or 'Pending'}"), ln=True)
    pdf.cell(0, 8, _safe_text(f"Project: {project.title}"), ln=True)
    pdf.cell(0, 8, _safe_text(f"Principal Investigator: {project.principal_investigator}"), ln=True)
    if meeting:
        pdf.cell(0, 8, _safe_text(f"Meeting date: {meeting.date}"), ln=True)
        pdf.cell(0, 8, _safe_text(f"Meeting number: {meeting.meeting_number or '-'}"), ln=True)
    if decision:
        pdf.cell(0, 8, _safe_text(f"Decision: {decision.decision}"), ln=True)
        if decision.remarks:
            pdf.multi_cell(0, 6, _safe_text(f"Remarks: {decision.remarks}"))
    if project.approval_date:
        pdf.cell(0, 8, _safe_text(f"Approval date: {project.approval_date}"), ln=True)

    output = pdf.output()
    if isinstance(output, bytearray):
        return bytes(output)
    if isinstance(output, str):
        return output.encode("latin-1")
    return output


def build_project_certificate_data(db: Session, project_id: int) -> dict:
    project = db.query(IAECProject).filter(IAECProject.id == project_id).first()
    if project is None:
        raise CRUDNotFoundError("Project not found")

    form_b = db.query(FormB).filter(FormB.project_id == project_id).first()
    meeting = None
    decision = None
    if form_b and form_b.meeting_id:
        meeting = db.query(IAECMeeting).filter(IAECMeeting.id == form_b.meeting_id).first()
        decision = (
            db.query(FormBMeetingDecision)
            .filter(
                FormBMeetingDecision.form_b_id == form_b.id,
                FormBMeetingDecision.meeting_id == form_b.meeting_id,
            )
            .first()
        )

    step1 = (form_b.application_data or {}).get("step1", {}) if form_b else {}
    return {
        "lmcp_iaec_id": project.protocol_number or "",
        "title": project.title,
        "investigator": project.principal_investigator or project.investigator_name,
        "department": step1.get("department") or "",
        "meeting_year": meeting.date.year if meeting else None,
        "meeting_number": meeting.meeting_number if meeting else None,
        "meeting_date": meeting.date.isoformat() if meeting else None,
        "approval_date": project.approval_date.isoformat() if project.approval_date else None,
        "comments": decision.remarks if decision and decision.remarks else "",
        "chairperson_name": "IAEC Chairperson",
        "decision": decision.decision if decision else None,
    }
