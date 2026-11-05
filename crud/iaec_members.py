from __future__ import annotations

from sqlalchemy.orm import Session

from crud.exceptions import CRUDNotFoundError, CRUDValidationError
from database.lmcpafm_models import IAECMember, IAECMeeting, IAECMeetingAttendance


def list_iaec_members(db: Session, *, active_only: bool = True) -> list[IAECMember]:
    query = db.query(IAECMember).order_by(
        IAECMember.display_order.asc(), IAECMember.id.asc()
    )
    if active_only:
        query = query.filter(IAECMember.active.is_(True))
    return query.all()


def create_iaec_member(
    db: Session,
    *,
    full_name: str,
    designation: str,
    display_order: int = 0,
    user_id: int | None = None,
) -> IAECMember:
    name = full_name.strip()
    role = designation.strip()
    if not name or not role:
        raise CRUDValidationError("Name and designation are required.")
    row = IAECMember(
        full_name=name,
        designation=role,
        display_order=display_order,
        user_id=user_id,
        active=True,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_iaec_member(
    db: Session,
    member_id: int,
    *,
    full_name: str | None = None,
    designation: str | None = None,
    display_order: int | None = None,
    active: bool | None = None,
    user_id: int | None = None,
) -> IAECMember:
    row = db.query(IAECMember).filter(IAECMember.id == member_id).first()
    if row is None:
        raise CRUDNotFoundError("IAEC member not found.")
    if full_name is not None:
        row.full_name = full_name.strip()
    if designation is not None:
        row.designation = designation.strip()
    if display_order is not None:
        row.display_order = display_order
    if active is not None:
        row.active = active
    if user_id is not None:
        row.user_id = user_id
    db.commit()
    db.refresh(row)
    return row


def get_meeting_attendance(db: Session, meeting_id: int) -> list[dict]:
    meeting = db.query(IAECMeeting).filter(IAECMeeting.id == meeting_id).first()
    if meeting is None:
        raise CRUDNotFoundError("Meeting not found.")

    members = list_iaec_members(db, active_only=False)
    attendance_rows = (
        db.query(IAECMeetingAttendance)
        .filter(IAECMeetingAttendance.meeting_id == meeting_id)
        .all()
    )
    present_by_member = {row.member_id: row.present for row in attendance_rows}

    result: list[dict] = []
    for member in members:
        if not member.active and member.id not in present_by_member:
            continue
        result.append(
            {
                "member_id": member.id,
                "full_name": member.full_name,
                "designation": member.designation,
                "active": member.active,
                "present": present_by_member.get(member.id, member.active),
            }
        )
    return result


def save_meeting_attendance(
    db: Session,
    meeting_id: int,
    entries: list[dict],
) -> list[dict]:
    meeting = db.query(IAECMeeting).filter(IAECMeeting.id == meeting_id).first()
    if meeting is None:
        raise CRUDNotFoundError("Meeting not found.")

    for entry in entries:
        member_id = entry["member_id"]
        present = bool(entry.get("present", True))
        member = db.query(IAECMember).filter(IAECMember.id == member_id).first()
        if member is None:
            raise CRUDValidationError(f"IAEC member {member_id} not found.")
        existing = (
            db.query(IAECMeetingAttendance)
            .filter(
                IAECMeetingAttendance.meeting_id == meeting_id,
                IAECMeetingAttendance.member_id == member_id,
            )
            .first()
        )
        if existing is None:
            db.add(
                IAECMeetingAttendance(
                    meeting_id=meeting_id,
                    member_id=member_id,
                    present=present,
                )
            )
        else:
            existing.present = present
    db.commit()
    return get_meeting_attendance(db, meeting_id)
