from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from crud import admin_facility as facility_crud
from crud import facility_dashboard as dashboard_crud
from crud import facility_environment as environment_crud
from crud import supply_inventory as supply_crud
from database.lmcpafm_models import FacilityEnvironmentLog, FacilityRoom


def get_operations_summary(db: Session, *, stale_days: int = 7) -> dict:
    today = date.today()
    summary = facility_crud.get_facility_summary(db)
    room_dashboard = dashboard_crud.get_room_dashboard(db, stale_days=stale_days)
    supply_items = supply_crud.list_supply_items(db)

    stale_rooms = [room for room in room_dashboard["rooms"] if room["care_stale"]]
    low_stock = [item for item in supply_items if item["low_stock"]]

    rooms = db.query(FacilityRoom).all()
    rooms_logged_today = (
        db.query(FacilityEnvironmentLog.room_id)
        .filter(FacilityEnvironmentLog.date == today)
        .distinct()
        .count()
    )
    rooms_missing_env_today = max(len(rooms) - rooms_logged_today, 0)

    recent_care = facility_crud.list_care_logs(db)[:8]
    recent_supply = supply_crud.list_supply_transactions(db, limit=8)
    recent_environment = environment_crud.list_environment_logs(db, limit=8)

    activity: list[dict] = []
    for row in recent_care:
        activity.append(
            {
                "kind": "care",
                "date": row["date"],
                "title": f"Care: {row['log_type']}",
                "subtitle": row.get("room_code") or row.get("cage_label") or "-",
                "details": row["details"],
            }
        )
    for row in recent_supply:
        activity.append(
            {
                "kind": "supply",
                "date": row["date"],
                "title": f"Supply {row['txn_type'].upper()}: {row['item_name']}",
                "subtitle": row.get("room_code") or "-",
                "details": row.get("notes") or f"{row['quantity']} {row['item_unit']}",
            }
        )
    for row in recent_environment:
        parts = []
        if row.get("temperature_c") is not None:
            parts.append(f"{row['temperature_c']}°C")
        if row.get("humidity_pct") is not None:
            parts.append(f"{row['humidity_pct']}% RH")
        activity.append(
            {
                "kind": "environment",
                "date": row["date"],
                "title": f"Environment: {row.get('room_code') or row['room_id']}",
                "subtitle": row.get("hvac_status") or "normal",
                "details": row.get("notes") or ", ".join(parts) or "-",
            }
        )

    activity.sort(key=lambda item: (item["date"], item["title"]), reverse=True)

    return {
        "as_of_date": today,
        "facility_summary": summary,
        "stale_care_room_count": len(stale_rooms),
        "stale_care_rooms": stale_rooms[:10],
        "low_stock_count": len(low_stock),
        "low_stock_items": low_stock[:10],
        "rooms_logged_today": rooms_logged_today,
        "rooms_missing_env_today": rooms_missing_env_today,
        "total_rooms": len(rooms),
        "recent_activity": activity[:15],
    }
