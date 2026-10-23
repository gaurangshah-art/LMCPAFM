import os


def _allowed_domains() -> frozenset[str]:
    raw = os.getenv("LMCP_INSTITUTIONAL_EMAIL_DOMAINS", "lmcp.ac.in")
    return frozenset(part.strip().lower() for part in raw.split(",") if part.strip())


def normalize_email(email: str) -> str:
    return email.strip().lower()


def email_domain(email: str) -> str:
    normalized = normalize_email(email)
    if "@" not in normalized:
        return ""
    return normalized.rsplit("@", 1)[-1]


def is_lmcp_institutional_email(email: str) -> bool:
    domain = email_domain(email)
    if not domain:
        return False
    return domain in _allowed_domains()
