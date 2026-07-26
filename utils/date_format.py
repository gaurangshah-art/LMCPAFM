from __future__ import annotations

from datetime import date, datetime

DISPLAY_DATE_FORMAT = "%d/%m/%Y"


def format_display_date(
    value: date | datetime | str | None,
    fallback: str = "—",
) -> str:
    """Format dates for user-facing output as dd/mm/yyyy."""
    if value is None:
        return fallback

    if isinstance(value, datetime):
        return value.strftime(DISPLAY_DATE_FORMAT)

    if isinstance(value, date):
        return value.strftime(DISPLAY_DATE_FORMAT)

    text = str(value).strip()
    if not text:
        return fallback

    if len(text) >= 10 and text[2] == "/" and text[5] == "/":
        return text[:10]

    try:
        return date.fromisoformat(text[:10]).strftime(DISPLAY_DATE_FORMAT)
    except ValueError:
        return text
