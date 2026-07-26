from sqlalchemy.orm import Session

from database.formd_generator import generate_form_d
from utils.date_format import format_display_date


def get_form_d(db: Session, protocol_id: int):
    data = generate_form_d(db, protocol_id)
    return {
        **data,
        "approval_date": format_display_date(data.get("approval_date")),
        "allocations": [
            {
                **row,
                "date": format_display_date(row.get("date")),
            }
            for row in data.get("allocations", [])
        ],
        "experiments": [
            {
                **row,
                "date": format_display_date(row.get("date")),
            }
            for row in data.get("experiments", [])
        ],
        "disposals": [
            {
                **row,
                "date": format_display_date(row.get("date")),
            }
            for row in data.get("disposals", [])
        ],
    }
