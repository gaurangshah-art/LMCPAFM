from sqlalchemy.orm import Session
from database.formd_generator import generate_form_d


def get_form_d(db: Session, protocol_id: int):
    return generate_form_d(db, protocol_id)
