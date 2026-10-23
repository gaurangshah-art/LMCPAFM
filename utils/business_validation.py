from __future__ import annotations

import re
from datetime import date

from sqlalchemy.orm import Session

from crud.exceptions import CRUDValidationError
from database.lmcpafm_models import FormB, IAECMeeting, IAECProject

_WEIGHT_UNIT_SUFFIX = re.compile(r"\s*(g|grams?|gm)\.?\s*$", re.IGNORECASE)
_WEIGHT_RANGE_SPLIT = re.compile(r"\s*(?:-|–|—|\bto\b)\s*", re.IGNORECASE)
_NUMERIC_WEIGHT = re.compile(r"^\d+(\.\d+)?$")


def assert_date_on_or_after(
    value: date,
    minimum: date,
    *,
    value_label: str,
    minimum_label: str,
) -> None:
    if value < minimum:
        raise CRUDValidationError(
            f"{value_label} ({value.isoformat()}) cannot be earlier than "
            f"{minimum_label} ({minimum.isoformat()})."
        )


def get_project_meeting_date(db: Session, project_id: int) -> date | None:
    form_b = db.query(FormB).filter(FormB.project_id == project_id).first()
    if form_b is None or form_b.meeting_id is None:
        return None

    meeting = db.query(IAECMeeting).filter(IAECMeeting.id == form_b.meeting_id).first()
    return meeting.date if meeting else None


def get_project_approval_date(db: Session, project_id: int) -> date | None:
    project = db.query(IAECProject).filter(IAECProject.id == project_id).first()
    return project.approval_date if project else None


def assert_requisition_date_valid(db: Session, project_id: int, requisition_date: date) -> None:
    approval_date = get_project_approval_date(db, project_id)
    if approval_date is None:
        raise CRUDValidationError("Protocol is not approved by IAEC.")
    assert_date_on_or_after(
        requisition_date,
        approval_date,
        value_label="Requisition date",
        minimum_label="IAEC approval date",
    )


def assert_allocation_date_valid(
    db: Session,
    *,
    protocol_id: int,
    requisition_date: date,
    allocation_date: date,
) -> None:
    approval_date = get_project_approval_date(db, protocol_id)
    if approval_date is None:
        raise CRUDValidationError("Protocol is not approved by IAEC.")

    assert_date_on_or_after(
        allocation_date,
        approval_date,
        value_label="Animal issue date",
        minimum_label="IAEC approval date",
    )
    assert_date_on_or_after(
        allocation_date,
        requisition_date,
        value_label="Animal issue date",
        minimum_label="requisition date",
    )


def assert_experiment_date_valid(
    db: Session,
    *,
    project_id: int,
    allocation_date: date,
    experiment_date: date,
) -> None:
    meeting_date = get_project_meeting_date(db, project_id)
    approval_date = get_project_approval_date(db, project_id)

    if meeting_date is not None:
        assert_date_on_or_after(
            experiment_date,
            meeting_date,
            value_label="Experiment date",
            minimum_label="IAEC meeting date",
        )
    elif approval_date is not None:
        assert_date_on_or_after(
            experiment_date,
            approval_date,
            value_label="Experiment date",
            minimum_label="IAEC approval date",
        )
    else:
        raise CRUDValidationError("Protocol is not approved by IAEC.")

    assert_date_on_or_after(
        experiment_date,
        allocation_date,
        value_label="Experiment date",
        minimum_label="animal issue date",
    )


def _parse_single_weight_grams(part: str) -> float:
    cleaned = part.strip()
    if not _NUMERIC_WEIGHT.match(cleaned):
        raise ValueError(f"Weight must be numeric (grams): '{part.strip()}'")
    value = float(cleaned)
    if value <= 0:
        raise ValueError("Weight must be greater than zero.")
    return value


def normalize_weight_text(value: str) -> str:
    text = value.strip()
    text = _WEIGHT_UNIT_SUFFIX.sub("", text).strip()
    return text


def parse_weight_grams(value: str) -> tuple[float, float | None]:
    text = normalize_weight_text(value)
    if not text:
        raise ValueError("Weight is required.")

    parts = _WEIGHT_RANGE_SPLIT.split(text)
    if len(parts) == 2:
        minimum = _parse_single_weight_grams(parts[0])
        maximum = _parse_single_weight_grams(parts[1])
        if minimum > maximum:
            raise ValueError("Weight range minimum cannot exceed maximum.")
        return minimum, maximum

    if len(parts) != 1:
        raise ValueError(
            "Weight must be a numeric value or range in grams (e.g. 200 g or 200-250 g)."
        )

    return _parse_single_weight_grams(parts[0]), None


def validate_weight_grams(value: str) -> str:
    minimum, maximum = parse_weight_grams(value)
    if maximum is not None:
        if minimum == int(minimum) and maximum == int(maximum):
            return f"{int(minimum)}-{int(maximum)} g"
        return f"{minimum}-{maximum} g"
    if minimum == int(minimum):
        return f"{int(minimum)} g"
    return f"{minimum} g"


def assert_iso_date_on_or_after(
    value: str,
    minimum: str,
    *,
    value_label: str,
    minimum_label: str,
) -> None:
    try:
        value_date = date.fromisoformat(value)
        minimum_date = date.fromisoformat(minimum)
    except ValueError as exc:
        raise ValueError("Dates must be valid ISO dates (YYYY-MM-DD).") from exc
    assert_date_on_or_after(
        value_date,
        minimum_date,
        value_label=value_label,
        minimum_label=minimum_label,
    )
