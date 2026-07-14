from __future__ import annotations

import os
from datetime import date, datetime
from typing import Any

import requests


class ZohoConfigError(Exception):
    pass


class ZohoFetchError(Exception):
    pass


def _required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise ZohoConfigError(f"Missing required environment variable: {name}")
    return value


def _parse_key_list(env_name: str, default: str) -> list[str]:
    raw = os.getenv(env_name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


def _pick_value(record: dict[str, Any], keys: list[str]) -> Any:
    for key in keys:
        if key in record and record[key] not in (None, ""):
            return record[key]
    return None


def _to_date(value: Any) -> date | None:
    if value is None:
        return None

    if isinstance(value, date):
        return value

    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None

        for fmt in ("%Y-%m-%d", "%d-%b-%Y", "%d/%m/%Y"):
            try:
                return datetime.strptime(text, fmt).date()
            except ValueError:
                continue

        try:
            return date.fromisoformat(text)
        except ValueError:
            return None

    return None


def fetch_formb_by_protocol(protocol_id: int) -> dict[str, Any]:
    owner = _required_env("ZOHO_CREATOR_OWNER_NAME")
    app = _required_env("ZOHO_CREATOR_APP_LINK_NAME")
    report = _required_env("ZOHO_CREATOR_FORMB_REPORT_LINK_NAME")
    token = _required_env("ZOHO_CREATOR_ACCESS_TOKEN")

    base_url = os.getenv("ZOHO_CREATOR_BASE_URL", "https://creator.zoho.com/api/v2").rstrip("/")
    criteria_field = os.getenv("ZOHO_FORMB_PROTOCOL_CRITERIA_FIELD", "Protocol_ID")
    criteria = f"({criteria_field}=={protocol_id})"

    url = f"{base_url}/{owner}/{app}/report/{report}"
    headers = {
        "Authorization": f"Zoho-oauthtoken {token}",
        "Accept": "application/json",
    }

    try:
        response = requests.get(url, headers=headers, params={"criteria": criteria}, timeout=12)
    except requests.RequestException as exc:
        raise ZohoFetchError(f"Unable to contact Zoho Creator: {exc}") from exc

    if response.status_code >= 400:
        raise ZohoFetchError(f"Zoho Creator request failed ({response.status_code}): {response.text}")

    try:
        payload = response.json()
    except ValueError as exc:
        raise ZohoFetchError("Zoho Creator returned non-JSON response") from exc

    rows = payload.get("data")
    if not isinstance(rows, list) or not rows:
        raise ZohoFetchError("No Form B records found for selected protocol")

    record = rows[0]
    if not isinstance(record, dict):
        raise ZohoFetchError("Zoho Creator response format is not supported")

    protocol_number = _pick_value(
        record,
        _parse_key_list("ZOHO_FORMB_PROTOCOL_NUMBER_KEYS", "protocol_number,Protocol_Number,Protocol Number"),
    )
    title = _pick_value(
        record,
        _parse_key_list("ZOHO_FORMB_TITLE_KEYS", "title,Title,Project_Title,Project Title"),
    )
    principal_investigator = _pick_value(
        record,
        _parse_key_list("ZOHO_FORMB_PI_KEYS", "principal_investigator,Principal_Investigator,Principal Investigator,investigator_name"),
    )
    purpose = _pick_value(
        record,
        _parse_key_list("ZOHO_FORMB_PURPOSE_KEYS", "purpose,Purpose,Objective"),
    )
    approval_raw = _pick_value(
        record,
        _parse_key_list("ZOHO_FORMB_APPROVAL_DATE_KEYS", "approval_date,Approval_Date,Approval Date"),
    )

    return {
        "protocol_id": protocol_id,
        "protocol_number": str(protocol_number) if protocol_number is not None else None,
        "title": str(title) if title is not None else None,
        "principal_investigator": str(principal_investigator) if principal_investigator is not None else None,
        "purpose": str(purpose) if purpose is not None else None,
        "approval_date": _to_date(approval_raw),
        "source": "zoho_creator",
    }
