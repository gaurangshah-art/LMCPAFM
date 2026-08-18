from datetime import date
from uuid import uuid4

from database.database import SessionLocal
from database.lmcpafm_disposal import Disposal
from database.lmcpafm_models import Animal, BreedingRecord, Cage, FacilityRoom, Species, Strain


def test_staff_facility_read_only(client, staff_auth_headers, admin_auth_headers):
    suffix = uuid4().hex[:6]
    room_res = client.post(
        "/admin/facility/rooms",
        json={"code": f"SR-{suffix}", "name": "Staff Read Room"},
        headers=admin_auth_headers,
    )
    assert room_res.status_code == 200, room_res.text

    summary = client.get("/facility/summary", headers=staff_auth_headers)
    assert summary.status_code == 200
    assert summary.json()["total_rooms"] >= 1

    map_res = client.get("/facility/cage-map", headers=staff_auth_headers)
    assert map_res.status_code == 200

    blocked = client.post(
        "/admin/facility/rooms",
        json={"code": "BLOCK", "name": "Should fail"},
        headers=staff_auth_headers,
    )
    assert blocked.status_code == 403


def test_form_c_pdf_and_extended_rows(client, staff_auth_headers, admin_auth_headers):
    suffix = uuid4().hex[:6]
    db = SessionLocal()
    try:
        species = Species(name=f"FC-{suffix}")
        db.add(species)
        db.commit()
        db.refresh(species)
        strain = Strain(name=f"St-{suffix}", species_id=species.id)
        db.add(strain)
        db.commit()
        db.refresh(strain)

        room = FacilityRoom(code=f"FR-{suffix}", name="Form C Room")
        db.add(room)
        db.commit()
        db.refresh(room)

        cage = Cage(label=f"C-{suffix}", location="Rack", room_id=room.id, capacity=2)
        db.add(cage)
        db.commit()
        db.refresh(cage)

        animal = Animal(
            animal_number=f"RAT-2026-{suffix}",
            species_id=species.id,
            strain_id=strain.id,
            cage_id=cage.id,
            status="available",
        )
        db.add(animal)
        db.flush()

        db.add(
            BreedingRecord(
                date=date.today(),
                species_id=species.id,
                strain_id=strain.id,
                offspring_count=2,
                litter_count=1,
            )
        )
        db.add(
            Disposal(
                animal_id=animal.id,
                date=date.today(),
                method="natural_death",
                reason="Test disposal row",
                remarks="",
            )
        )
        db.commit()
    finally:
        db.close()

    data_res = client.get("/inventory/form-c-data", headers=staff_auth_headers)
    assert data_res.status_code == 200
    payload = data_res.json()
    assert len(payload["breeding_rows"]) >= 1
    assert len(payload["disposal_rows"]) >= 1

    pdf_res = client.get("/inventory/form-c/download", headers=staff_auth_headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF")


def test_animal_timeline_and_label(client, admin_auth_headers):
    suffix = uuid4().hex[:6]
    db = SessionLocal()
    try:
        species = Species(name=f"TL-{suffix}")
        db.add(species)
        db.commit()
        db.refresh(species)
        strain = Strain(name=f"St-{suffix}", species_id=species.id)
        db.add(strain)
        db.commit()
        db.refresh(strain)
        animal = Animal(
            animal_number=f"TL-{suffix}",
            species_id=species.id,
            strain_id=strain.id,
            status="quarantine",
            source_type="procurement",
            quarantine_start_date=date.today(),
        )
        db.add(animal)
        db.commit()
        db.refresh(animal)
        animal_id = animal.id
    finally:
        db.close()

    timeline = client.get(f"/admin/facility/animals/{animal_id}/timeline", headers=admin_auth_headers)
    assert timeline.status_code == 200
    assert len(timeline.json()) >= 1

    label = client.get(f"/facility/animals/{animal_id}/label/download", headers=admin_auth_headers)
    assert label.status_code == 200
    assert label.content.startswith(b"%PDF")
