from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session, joinedload

from crud.exceptions import CRUDNotFoundError, CRUDValidationError
from database.lmcpafm_models import FacilityEnvironmentLog, FacilityRoom
from models.user import User
from schemas.schemas_admin_facility import FacilityEnvironmentLogCreate

HVAC_STATUSES = frozenset({"normal", "alarm", "maintenance", "offline"})


def _normalize_hvac_status(value: str) -> str:
    status = value.strip().lower()
    if status not in HVAC_STATUSES:
        allowed = ", ".join(sorted(HVAC_STATUSES))
        raise CRUDValidationError(f"HVAC status must be one of: {allowed}.")
    return status


def _env_log_to_read(row: FacilityEnvironmentLog) -> dict:
    return {
        "id": row.id,
        "room_id": row.room_id,
        "room_code": row.room.code if row.room else None,
        "room_name": row.room.name if row.room else None,
        "date": row.date,
        "temperature_c": row.temperature_c,
        "humidity_pct": row.humidity_pct,
        "hvac_status": row.hvac_status,
        "light_cycle": row.light_cycle,
        "notes": row.notes,
        "performed_by_name": row.performed_by_name,
        "created_at": row.created_at,
    }


def create_environment_log(db: Session, user: User, payload: FacilityEnvironmentLogCreate) -> dict:
    if not db.query(FacilityRoom).filter(FacilityRoom.id == payload.room_id).first():
        raise CRUDNotFoundError("Room not found.")
    if payload.temperature_c is None and payload.humidity_pct is None and not (payload.notes or "").strip():
        raise CRUDValidationError("Provide temperature, humidity, or notes for the environment log.")

    performed_by = (payload.performed_by_name or user.name or user.email or "Staff").strip()
    row = FacilityEnvironmentLog(
        room_id=payload.room_id,
        date=payload.date,
        temperature_c=payload.temperature_c,
        humidity_pct=payload.humidity_pct,
        hvac_status=_normalize_hvac_status(payload.hvac_status),
        light_cycle=(payload.light_cycle or "").strip() or None,
        notes=(payload.notes or "").strip() or None,
        performed_by_name=performed_by,
        recorded_by_user_id=user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    row = (
        db.query(FacilityEnvironmentLog)
        .options(joinedload(FacilityEnvironmentLog.room))
        .filter(FacilityEnvironmentLog.id == row.id)
        .one()
    )
    return _env_log_to_read(row)


def list_environment_logs(
    db: Session,
    *,
    room_id: int | None = None,
    log_date: date | None = None,
    limit: int = 100,
) -> list[dict]:
    query = (
        db.query(FacilityEnvironmentLog)
        .options(joinedload(FacilityEnvironmentLog.room))
        .order_by(FacilityEnvironmentLog.date.desc(), FacilityEnvironmentLog.id.desc())
    )
    if room_id is not None:
        query = query.filter(FacilityEnvironmentLog.room_id == room_id)
    if log_date is not None:
        query = query.filter(FacilityEnvironmentLog.date == log_date)
    return [_env_log_to_read(row) for row in query.limit(limit).all()]
