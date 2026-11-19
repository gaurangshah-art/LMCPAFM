from __future__ import annotations

import logging
import os
import smtplib
from email.message import EmailMessage

from crud.exceptions import CRUDValidationError

logger = logging.getLogger(__name__)


def send_plain_email(*, to_email: str, subject: str, body: str) -> None:
    recipient = to_email.strip()
    if not recipient:
        raise CRUDValidationError("Recipient email is required.")

    smtp_host = os.getenv("IAEC_SMTP_HOST")
    smtp_port = int(os.getenv("IAEC_SMTP_PORT", "587"))
    smtp_username = os.getenv("IAEC_SMTP_USERNAME")
    smtp_password = os.getenv("IAEC_SMTP_PASSWORD")
    smtp_use_tls = os.getenv("IAEC_SMTP_USE_TLS", "true").lower() == "true"
    sender_email = os.getenv("IAEC_SENDER_EMAIL")
    sender_name = os.getenv("IAEC_SENDER_NAME", "LMCPAFM")

    if not smtp_host or not sender_email:
        raise CRUDValidationError("Email settings are not configured.")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{sender_name} <{sender_email}>"
    msg["To"] = recipient
    msg.set_content(body)

    with smtplib.SMTP(smtp_host, smtp_port, timeout=120) as server:
        if smtp_use_tls:
            server.starttls()
        if smtp_username and smtp_password:
            server.login(smtp_username, smtp_password)
        server.send_message(msg, to_addrs=[recipient])

    logger.info("Sent email to %s with subject %r", recipient, subject)
