from __future__ import annotations

import re
from datetime import date, datetime

DISPLAY_DATE_FORMAT = "%d/%m/%Y"
_ORDINAL_DATE = re.compile(r"^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+),?\s+(\d{4})$", re.IGNORECASE)


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

    match = _ORDINAL_DATE.match(text)
    if match:
        day, month_name, year = match.groups()
        try:
            parsed = datetime.strptime(f"{day} {month_name} {year}", "%d %B %Y")
            return parsed.strftime(DISPLAY_DATE_FORMAT)
        except ValueError:
            pass

    try:
        return date.fromisoformat(text[:10]).strftime(DISPLAY_DATE_FORMAT)
    except ValueError:
        return text
