from __future__ import annotations

import logging
import os
import smtplib
from types import SimpleNamespace

from email.message import EmailMessage
from sqlalchemy import func
from sqlalchemy.orm import Session

from crud.exceptions import CRUDNotFoundError, CRUDValidationError
from crud.formb_documents import render_form_b_application_pdf
from crud.formb_internal import (
    ensure_form_b_protocol_number_for_invitation,
    get_form_b_by_id,
    get_meeting_form_b_summary,
)
from crud.formb_pdf_bundle import render_form_b_complete_pdf
from crud.iaec_meeting_review_checklist_pdf import render_iaec_meeting_review_agenda_pdf
from crud.iaec_members import list_iaec_members
from database.database import SessionLocal
from database.lmcpafm_models import FormB, FormBInvestigator, IAECMeeting, IAECProject
from models.investigator_profile import InvestigatorProfile
from models.user import User
from utils.date_format import format_display_date
from utils.pdf_merge import merge_pdf_documents

logger = logging.getLogger(__name__)


def _build_meeting_invitation_email_subject(context) -> str:
    if context.protocol_number:
        return f"IAEC Meeting Invitation – Protocol {context.protocol_number}"
    return f"IAEC Meeting Invitation – {context.title}"


def _build_meeting_invitation_email_body(context) -> str:
    google_form_url = os.getenv("IAEC_PPT_GOOGLE_FORM_URL", "").strip()
    support_contact = os.getenv("IAEC_SUPPORT_CONTACT", "").strip()

    lines = [
        f"Dear {context.principal_investigator},",
        "",
    ]

    if context.protocol_number:
        lines.extend([
            f"Your Form B submission for project '{context.title}' has been assigned protocol number '{context.protocol_number}'.",
            "Please find attached the Form B PDF with protocol number.",
        ])
    else:
        lines.extend([
            f"Your Form B submission for project '{context.title}' has been scheduled for IAEC review.",
            "Please find attached your submitted Form B PDF.",
        ])

    lines.append("You are invited to participate in the IAEC meeting and present the protocol.")

    if context.meeting_date:
        lines.extend([
            "",
            "Meeting details:",
            f"- Date: {format_display_date(context.meeting_date)}",
        ])
        if context.meeting_time:
            lines.append(f"- Time: {context.meeting_time}")
        if context.meeting_venue:
            lines.append(f"- Venue: {context.meeting_venue}")
        if context.meeting_number:
            lines.append(f"- Meeting number: {context.meeting_number}")

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


def _send_email_with_attachments(
    to_emails: list[str],
    subject: str,
    body: str,
    attachments: list[tuple[bytes, str]],
) -> None:
    recipients = [email.strip() for email in to_emails if email and email.strip()]
    if not recipients:
        raise CRUDValidationError("No recipient email addresses provided.")
    if not attachments:
        raise CRUDValidationError("No attachments provided.")

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
    msg["To"] = ", ".join(recipients)
    msg.set_content(body)

    for attachment_bytes, attachment_filename in attachments:
        msg.add_attachment(
            attachment_bytes,
            maintype="application",
            subtype="pdf",
            filename=attachment_filename,
        )

    with smtplib.SMTP(smtp_host, smtp_port, timeout=120) as server:
        if smtp_use_tls:
            server.starttls()
        if smtp_username and smtp_password:
            server.login(smtp_username, smtp_password)
        server.send_message(msg, to_addrs=recipients)
    logger.info(
        "Sent email to %s with subject %r (%s attachment(s))",
        ", ".join(recipients),
        subject,
        len(attachments),
    )


def _send_email_with_attachment(
    to_email: str,
    subject: str,
    body: str,
    attachment_bytes: bytes,
    attachment_filename: str,
) -> None:
    _send_email_with_attachments(
        [to_email],
        subject,
        body,
        [(attachment_bytes, attachment_filename)],
    )


def _email_for_user_id(db: Session, user_id: int | None) -> str | None:
    if not user_id:
        return None

    profile = db.query(InvestigatorProfile).filter(InvestigatorProfile.user_id == user_id).first()
    if profile and profile.institutional_email and profile.institutional_email.strip():
        return profile.institutional_email.strip()

    user = db.query(User).filter(User.id == user_id).first()
    if user and user.email and user.email.strip():
        return user.email.strip()

    return None


def _step1_contact_email(step1: dict) -> str | None:
    for key in ("contact_email", "email"):
        value = (step1.get(key) or "").strip()
        if value:
            return value
    return None


def _is_principal_investigator_role(role: str | None) -> bool:
    normalized = (role or "").strip().lower().replace(" ", "_")
    return normalized in {"principal_investigator", "pi"}


def _email_for_name(db: Session, name: str | None) -> str | None:
    cleaned = (name or "").strip()
    if not cleaned:
        return None

    user = db.query(User).filter(func.lower(User.name) == cleaned.lower()).first()
    if user is None:
        return None
    return _email_for_user_id(db, user.id)


def _email_for_investigator_row(db: Session, investigator: FormBInvestigator) -> str | None:
    for user_id in (investigator.investigator_profile_user_id, investigator.user_id):
        resolved = _email_for_user_id(db, user_id)
        if resolved:
            return resolved

    return _email_for_name(db, investigator.name)


def resolve_principal_investigator_email(
    db: Session,
    form_b_id: int,
    step1: dict,
    project: IAECProject | None = None,
) -> str | None:
    email = _step1_contact_email(step1)
    if email:
        return email

    investigators = (
        db.query(FormBInvestigator)
        .filter(FormBInvestigator.form_b_id == form_b_id)
        .order_by(FormBInvestigator.id.asc())
        .all()
    )
    prioritized = sorted(
        investigators,
        key=lambda row: (
            0 if _is_principal_investigator_role(row.project_role) else 1,
            0 if row.can_submit_form_b else 1,
            row.id,
        ),
    )
    for investigator in prioritized:
        resolved = _email_for_investigator_row(db, investigator)
        if resolved:
            return resolved

    for name in (
        step1.get("principal_investigator"),
        project.principal_investigator if project else None,
        project.investigator_name if project else None,
    ):
        resolved = _email_for_name(db, name)
        if resolved:
            return resolved

    return None


def _resolve_principal_investigator_email(db: Session, form_b_id: int, step1: dict) -> str | None:
    form_b = get_form_b_by_id(db, form_b_id)
    project = db.query(IAECProject).filter(IAECProject.id == form_b.project_id).first()
    return resolve_principal_investigator_email(db, form_b_id, step1, project)


def build_form_b_meeting_invitation_context(db: Session, form_b_id: int):
    form_b = get_form_b_by_id(db, form_b_id)
    project = db.query(IAECProject).filter(IAECProject.id == form_b.project_id).first()
    if project is None:
        raise CRUDNotFoundError("Linked project not found")

    step1 = (form_b.application_data or {}).get("step1") or {}
    pi_email = _resolve_principal_investigator_email(db, form_b.id, step1)
    protocol_number = (project.protocol_number or "").strip() or None

    meeting = None
    if form_b.meeting_id:
        meeting = db.query(IAECMeeting).filter(IAECMeeting.id == form_b.meeting_id).first()

    return SimpleNamespace(
        form_b_id=form_b.id,
        project_id=project.id,
        principal_investigator=step1.get("principal_investigator")
        or project.principal_investigator
        or project.investigator_name,
        title=project.title,
        protocol_number=protocol_number,
        principal_investigator_email=pi_email,
        meeting_id=form_b.meeting_id,
        meeting_date=meeting.date if meeting else None,
        meeting_number=meeting.meeting_number if meeting else None,
        meeting_time=meeting.meeting_time if meeting else None,
        meeting_venue=meeting.venue if meeting else None,
    )


def validate_form_b_meeting_invitation_ready(db: Session, form_b_id: int):
    form_b = get_form_b_by_id(db, form_b_id)
    if form_b.submitted_at is None:
        raise CRUDValidationError(
            "Only fully submitted Form B applications can receive meeting invitations."
        )

    context = build_form_b_meeting_invitation_context(db, form_b_id)

    if not context.principal_investigator_email:
        raise CRUDValidationError(
            "Principal investigator email is missing. Open Form B Step 1, confirm the contact email, "
            "click Save and continue, and ensure the principal investigator is linked to a user account."
        )
    if not context.meeting_id:
        raise CRUDValidationError("Form B is not assigned to a meeting.")
    if not os.getenv("IAEC_SMTP_HOST") or not os.getenv("IAEC_SENDER_EMAIL"):
        raise CRUDValidationError(
            "Email settings are not configured. Set IAEC_SMTP_HOST and IAEC_SENDER_EMAIL in the backend environment."
        )

    return context


def _invitation_attachment_filename(context) -> str:
    if context.protocol_number:
        return f"form_b_{context.protocol_number.replace('/', '_')}.pdf"
    return f"form_b_{context.form_b_id}.pdf"


def send_form_b_meeting_invitation_email(db: Session, form_b_id: int) -> dict[str, str]:
    validate_form_b_meeting_invitation_ready(db, form_b_id)
    protocol_number = ensure_form_b_protocol_number_for_invitation(db, form_b_id)
    context = build_form_b_meeting_invitation_context(db, form_b_id)

    pdf_bytes = render_form_b_application_pdf(db, context.project_id)
    subject = _build_meeting_invitation_email_subject(context)
    body = _build_meeting_invitation_email_body(context)

    _send_email_with_attachment(
        to_email=context.principal_investigator_email,
        subject=subject,
        body=body,
        attachment_bytes=pdf_bytes,
        attachment_filename=_invitation_attachment_filename(context),
    )
    logger.info(
        "Meeting invitation sent for Form B #%s to %s (protocol %s)",
        form_b_id,
        context.principal_investigator_email,
        protocol_number,
    )
    return {
        "sent_to": context.principal_investigator_email,
        "protocol_number": protocol_number,
    }


def _send_invitation_background(form_b_id: int) -> None:
    db = SessionLocal()
    try:
        send_form_b_meeting_invitation_email(db, form_b_id)
    except Exception:
        logger.exception("Failed to send IAEC meeting invitation for Form B #%s", form_b_id)
        raise
    finally:
        db.close()


def queue_form_b_meeting_invitation_email(background_tasks, form_b_id: int) -> None:
    background_tasks.add_task(_send_invitation_background, form_b_id)


def resolve_iaec_committee_recipient_emails(db: Session) -> list[str]:
    """Emails for IAEC members (roster user accounts + optional IAEC_MEMBER_EMAILS env)."""
    seen: set[str] = set()
    ordered: list[str] = []

    for member in list_iaec_members(db, active_only=True):
        if not member.user_id:
            continue
        email = _email_for_user_id(db, member.user_id)
        if email and email.lower() not in seen:
            seen.add(email.lower())
            ordered.append(email)

    extra = os.getenv("IAEC_MEMBER_EMAILS", "")
    for part in extra.replace(";", ",").split(","):
        email = part.strip()
        if email and email.lower() not in seen:
            seen.add(email.lower())
            ordered.append(email)

    return ordered


def _build_meeting_iaec_review_pack_subject(meeting: IAECMeeting) -> str:
    label = (meeting.meeting_number or str(meeting.id)).strip()
    date_text = format_display_date(meeting.date)
    return f"IAEC meeting {label} — Form B review packs ({date_text})"


def _build_meeting_iaec_review_pack_body(meeting: IAECMeeting, protocol_labels: list[str]) -> str:
    lines = [
        "Dear IAEC member,",
        "",
        "Please review the attached Form B protocols scheduled for the upcoming IAEC meeting.",
        "",
        "Meeting details:",
        f"- Date: {format_display_date(meeting.date)}",
    ]
    if meeting.meeting_time:
        lines.append(f"- Time: {meeting.meeting_time}")
    if meeting.venue:
        lines.append(f"- Venue: {meeting.venue}")
    if meeting.meeting_number:
        lines.append(f"- Meeting number: {meeting.meeting_number}")
    lines.extend([
        "",
        "Attached is one PDF in this order:",
        "1. Meeting review agenda (checklist for all protocols on this meeting)",
    ])
    for index, label in enumerate(protocol_labels, start=2):
        lines.append(f"{index}. Form B review pack — {label} (IAEC checklist + submitted Form B bundle)")
    lines.extend([
        "",
        "Regards,",
        "IAEC Office",
    ])
    return "\n".join(lines)


def validate_meeting_iaec_review_pack_ready(db: Session, meeting_id: int) -> IAECMeeting:
    meeting = db.query(IAECMeeting).filter(IAECMeeting.id == meeting_id).first()
    if meeting is None:
        raise CRUDNotFoundError("Meeting not found.")

    rows = get_meeting_form_b_summary(db, meeting_id)
    if not rows:
        raise CRUDValidationError("Assign at least one Form B to this meeting before emailing review packs.")

    unsubmitted = []
    for row in rows:
        form_b = db.query(FormB).filter(FormB.id == row["form_b_id"]).first()
        if form_b is None or form_b.submitted_at is None:
            unsubmitted.append(row.get("project_title") or f"Form B #{row['form_b_id']}")
    if unsubmitted:
        raise CRUDValidationError(
            "All assigned Form B records must be fully submitted before emailing IAEC review packs. "
            f"Pending: {', '.join(unsubmitted)}"
        )

    if not resolve_iaec_committee_recipient_emails(db):
        raise CRUDValidationError(
            "No IAEC member email addresses found. Link IAEC members to user accounts with email, "
            "or set IAEC_MEMBER_EMAILS in the backend environment (comma-separated)."
        )
    if not os.getenv("IAEC_SMTP_HOST") or not os.getenv("IAEC_SENDER_EMAIL"):
        raise CRUDValidationError(
            "Email settings are not configured. Set IAEC_SMTP_HOST and IAEC_SENDER_EMAIL in the backend environment."
        )
    return meeting


def send_meeting_iaec_review_pack_email(db: Session, meeting_id: int) -> dict:
    meeting = validate_meeting_iaec_review_pack_ready(db, meeting_id)
    rows = get_meeting_form_b_summary(db, meeting_id)
    recipients = resolve_iaec_committee_recipient_emails(db)

    meeting_label = (meeting.meeting_number or str(meeting.id)).replace("/", "_")
    pdf_parts: list[bytes] = [render_iaec_meeting_review_agenda_pdf(db, meeting_id)]

    protocol_labels: list[str] = []
    for row in rows:
        label = row.get("protocol_number") or row.get("project_title") or f"Form B #{row['form_b_id']}"
        protocol_labels.append(str(label))
        pdf_parts.append(
            render_form_b_complete_pdf(db, row["project_id"], include_iaec_checklist=True)
        )

    merged_pdf = merge_pdf_documents(*pdf_parts)
    attachment_filename = f"IAEC_Meeting_{meeting_label}_Review_Pack.pdf"

    subject = _build_meeting_iaec_review_pack_subject(meeting)
    body = _build_meeting_iaec_review_pack_body(meeting, protocol_labels)
    _send_email_with_attachments(recipients, subject, body, [(merged_pdf, attachment_filename)])

    return {
        "sent_to": recipients,
        "attachment_count": 1,
        "protocol_count": len(rows),
        "protocols": protocol_labels,
    }


def _send_meeting_review_pack_background(meeting_id: int) -> None:
    db = SessionLocal()
    try:
        send_meeting_iaec_review_pack_email(db, meeting_id)
    except Exception:
        logger.exception("Failed to send IAEC meeting review packs for meeting #%s", meeting_id)
        raise
    finally:
        db.close()


def queue_meeting_iaec_review_pack_email(background_tasks, meeting_id: int) -> None:
    background_tasks.add_task(_send_meeting_review_pack_background, meeting_id)
