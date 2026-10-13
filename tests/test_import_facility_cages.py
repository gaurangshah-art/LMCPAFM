from pathlib import Path
from uuid import uuid4

from database.database import SessionLocal
from database.lmcpafm_models import Cage, FacilityRoom


def test_import_facility_cages_from_csv(client, admin_auth_headers):
    suffix = uuid4().hex[:6]
    db = SessionLocal()
    try:
        room = FacilityRoom(code=f"IMP-{suffix}", name="Import Room")
        db.add(room)
        db.commit()
        db.refresh(room)
        room_code = room.code
    finally:
        db.close()

    csv_path = Path(__file__).parent / f"_tmp_cages_{suffix}.csv"
    csv_path.write_text(
        f"label,location,room_code,capacity,status\n"
        f"C-{suffix}-1,Rack A / 1,{room_code},5,active\n"
        f"C-{suffix}-2,Rack A / 2,{room_code},5,active\n",
        encoding="utf-8",
    )

    try:
        from scripts.import_facility_cages import import_cages

        stats = import_cages(csv_path, dry_run=False)
        assert stats["created"] == 2
        assert stats["errors"] == 0

        db = SessionLocal()
        try:
            cages = db.query(Cage).filter(Cage.label.like(f"C-{suffix}-%")).all()
            assert len(cages) == 2
        finally:
            db.close()
    finally:
        if csv_path.exists():
            csv_path.unlink()
