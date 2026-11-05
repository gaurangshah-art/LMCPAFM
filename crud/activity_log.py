from sqlalchemy.orm import Session

from models.activity_log import ActivityLog
from models.user import User


def record_activity(
    db: Session,
    *,
    action: str,
    details: str,
    user: User | None = None,
) -> ActivityLog:
    entry = ActivityLog(
        user_id=user.id if user else None,
        user_name=user.name if user else "System",
        action=action,
        details=details,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def list_activity_logs(db: Session, limit: int = 100) -> list[ActivityLog]:
    return (
        db.query(ActivityLog)
        .order_by(ActivityLog.created_at.desc(), ActivityLog.id.desc())
        .limit(limit)
        .all()
    )
