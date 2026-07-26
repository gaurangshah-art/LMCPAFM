from datetime import date, datetime

from utils.date_format import format_display_date


def test_format_display_date_from_date():
    assert format_display_date(date(2026, 2, 1)) == "01/02/2026"


def test_format_display_date_from_datetime():
    assert format_display_date(datetime(2026, 2, 1, 15, 30)) == "01/02/2026"


def test_format_display_date_from_iso_string():
    assert format_display_date("2026-02-01") == "01/02/2026"


def test_format_display_date_already_formatted():
    assert format_display_date("01/02/2026") == "01/02/2026"


def test_format_display_date_none():
    assert format_display_date(None) == "—"
