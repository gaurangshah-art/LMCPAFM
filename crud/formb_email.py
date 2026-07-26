import os
import smtplib
import tempfile
from email.message import EmailMessage

from sqlalchemy.orm import Session

from crud.exceptions import CRUDNotFoundError, CRUDValidationError
from crud.formb_documents import render_form_b_application_pdf
from crud.formb_internal import get_form_b_by_id
from utils.date_format import format_display_date


def _build_meeting_invitation_email_subject(protocol_number: str) -> str:
    return f"IAEC Meeting Invitation – Protocol {protocol_number}"


def _build_meeting_invitation_email_body(form_b) -> str:
    google_form_url = os.getenv("IAEC_PPT_GOOGLE_FORM_URL", "").strip()
    support_contact = os.getenv("IAEC_SUPPORT_CONTACT", "").strip()

    meeting_date = getattr(form_b, "meeting_date", None)
    meeting_time = getattr(form_b, "meeting_time", None)
    meeting_venue = getattr(form_b, "meeting_venue", None)

    lines = [
        f"Dear {getattr(form_b, 'principal_investigator', 'Principal Investigator')},",
        "",
        f"Your Form B submission for project '{getattr(form_b, 'title', '')}' has been assigned protocol number '{getattr(form_b, 'protocol_number', '')}'.",
        "Please find attached the final Form B PDF with protocol number.",
        "You are invited to participate in the IAEC meeting and present the protocol.",
    ]

    if meeting_date or meeting_time or meeting_venue:
        lines.append("")
        lines.append("Meeting details:")
        if meeting_date:
            lines.append(f"- Date: {format_display_date(meeting_date)}")
        if meeting_time:
            lines.append(f"- Time: {meeting_time}")
        if meeting_venue:
            lines.append(f"- Venue: {meeting_venue}")

    if google_form_url:
        lines.extend([
            "",
            "Please upload a short PPT presentation before the meeting using the Google Form below:",
            google_form_url,
        ])

    if support_contact:
        lines.extend([
            "",
            f"For any clarification, please contact: {support_contact}",
        ])

    lines.extend([
        "",
        "Regards,",
        "IAEC Office",
    ])
    return "\n".join(lines)


def _send_email_with_attachment(
    to_email: str,
    subject: str,
    body: str,
    attachment_bytes: bytes,
    attachment_filename: str,
) -> None:
    smtp_host = os.getenv("IAEC_SMTP_HOST")
    smtp_port = int(os.getenv("IAEC_SMTP_PORT", "587"))
    smtp_username = os.getenv("IAEC_SMTP_USERNAME")
    smtp_password = os.getenv("IAEC_SMTP_PASSWORD")
    smtp_use_tls = os.getenv("IAEC_SMTP_USE_TLS", "true").lower() == "true"
    sender_email = os.getenv("IAEC_SENDER_EMAIL")
    sender_name = os.getenv("IAEC_SENDER_NAME", "IAEC Office")

    if not smtp_host or not sender_email:
        raise CRUDValidationError("Email settings are not configured.")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{sender_name} <{sender_email}>"
    msg["To"] = to_email
    msg.set_content(body)

    msg.add_attachment(
        attachment_bytes,
        maintype="application",
        subtype="pdf",
        filename=attachment_filename,
    )

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        if smtp_use_tls:
            server.starttls()
        if smtp_username and smtp_password:
            server.login(smtp_username, smtp_password)
        server.send_message(msg)


def send_form_b_meeting_invitation_email(db: Session, form_b_id: int) -> None:
    form_b = get_form_b_by_id(db, form_b_id)
    if not form_b:
        raise CRUDNotFoundError("Form B not found.")

    pi_email = getattr(form_b, "principal_investigator_email", None)
    protocol_number = getattr(form_b, "protocol_number", None)
    meeting_id = getattr(form_b, "meeting_id", None)

    if not pi_email:
        raise CRUDValidationError("Principal investigator email is missing.")
    if not meeting_id:
        raise CRUDValidationError("Form B is not assigned to a meeting.")
    if not protocol_number:
        raise CRUDValidationError("Protocol number is not assigned.")

    pdf_bytes = render_form_b_application_pdf(db, form_b.project_id)
    subject = _build_meeting_invitation_email_subject(protocol_number)
    body = _build_meeting_invitation_email_body(form_b)

    _send_email_with_attachment(
        to_email=pi_email,
        subject=subject,
        body=body,
        attachment_bytes=pdf_bytes,
        attachment_filename=f"form_b_{protocol_number}.pdf",
    )


def queue_form_b_meeting_invitation_email(background_tasks, db: Session, form_b_id: int) -> None:
    background_tasks.add_task(send_form_b_meeting_invitation_email, db, form_b_id)