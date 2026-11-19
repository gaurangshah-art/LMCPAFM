from datetime import date
from uuid import uuid4

from database.database import SessionLocal
from database.lmcpafm_models import Animal, Cage, FacilityRoom, Species, Strain


def _seed_labeled_cage(client, admin_auth_headers, suffix: str, status: str, count: int = 2):
    room_res = client.post(
        "/admin/facility/rooms",
        json={"code": f"LR-{suffix}", "name": f"Label Room {suffix}"},
        headers=admin_auth_headers,
    )
    assert room_res.status_code == 200, room_res.text
    room_id = room_res.json()["id"]

    cage_res = client.post(
        "/admin/facility/cages",
        json={"label": f"C-{suffix}", "location": "Rack A", "room_id": room_id, "capacity": 4},
        headers=admin_auth_headers,
    )
    assert cage_res.status_code == 200, cage_res.text
    cage_id = cage_res.json()["id"]

    db = SessionLocal()
    try:
        species = Species(name=f"SP-{suffix}")
        db.add(species)
        db.commit()
        db.refresh(species)
        strain = Strain(name=f"ST-{suffix}", species_id=species.id)
        db.add(strain)
        db.commit()
        db.refresh(strain)

        for index in range(count):
            db.add(
                Animal(
                    animal_number=f"LBL-{suffix}-{index}",
                    species_id=species.id,
                    strain_id=strain.id,
                    cage_id=cage_id,
                    status=status,
                    quarantine_start_date=date.today() if status == "quarantine" else None,
                    rehabilitation_date=date.today() if status == "rehabilitated" else None,
                )
            )
        db.commit()
    finally:
        db.close()

    return cage_id, f"C-{suffix}"


def test_single_cage_label_download(client, staff_auth_headers, admin_auth_headers):
    suffix = uuid4().hex[:6]
    cage_id, cage_label = _seed_labeled_cage(client, admin_auth_headers, suffix, "quarantine")

    preview = client.get(f"/facility/cages/{cage_id}/label", headers=staff_auth_headers)
    assert preview.status_code == 200, preview.text
    payload = preview.json()
    assert payload["category"] == "quarantine"
    assert payload["banner_text"] == "QUARANTINE"
    assert len(payload["animals"]) == 2

    pdf_res = client.get(f"/facility/cages/{cage_id}/label/download", headers=staff_auth_headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF")
    assert len(pdf_res.content) > 500
    assert payload["cage_label"] == cage_label


def test_bulk_cage_labels_by_category(client, staff_auth_headers, admin_auth_headers):
    suffix = uuid4().hex[:6]
    _seed_labeled_cage(client, admin_auth_headers, f"{suffix}a", "available")
    _seed_labeled_cage(client, admin_auth_headers, f"{suffix}b", "available")

    pdf_res = client.get(
        "/facility/labels/cages/download",
        params={"category": "available"},
        headers=staff_auth_headers,
    )
    assert pdf_res.status_code == 200, pdf_res.text
    assert pdf_res.content.startswith(b"%PDF")

    empty_suffix = uuid4().hex[:6]
    room_res = client.post(
        "/admin/facility/rooms",
        json={"code": f"ER-{empty_suffix}", "name": "Empty label room"},
        headers=admin_auth_headers,
    )
    room_id = room_res.json()["id"]
    client.post(
        "/admin/facility/cages",
        json={"label": f"EMPTY-{empty_suffix}", "location": "Rack", "room_id": room_id},
        headers=admin_auth_headers,
    )

    missing = client.get(
        "/facility/labels/cages/download",
        params={"category": "rehabilitated", "room_id": room_id},
        headers=staff_auth_headers,
    )
    assert missing.status_code == 404


def test_mixed_cage_label_rejected(client, staff_auth_headers, admin_auth_headers):
    suffix = uuid4().hex[:6]
    cage_id, _ = _seed_labeled_cage(client, admin_auth_headers, suffix, "available", count=1)

    db = SessionLocal()
    try:
        species = db.query(Species).filter(Species.name == f"SP-{suffix}").first()
        strain = db.query(Strain).filter(Strain.name == f"ST-{suffix}").first()
        db.add(
            Animal(
                animal_number=f"LBL-{suffix}-mixed",
                species_id=species.id,
                strain_id=strain.id,
                cage_id=cage_id,
                status="quarantine",
            )
        )
        db.commit()
    finally:
        db.close()

    response = client.get(f"/facility/cages/{cage_id}/label/download", headers=staff_auth_headers)
    assert response.status_code == 400
    assert "mixed" in response.json()["detail"].lower()


def test_empty_cage_label_rejected(client, staff_auth_headers, admin_auth_headers):
    suffix = uuid4().hex[:6]
    room_res = client.post(
        "/admin/facility/rooms",
        json={"code": f"ER-{suffix}", "name": "Empty Room"},
        headers=admin_auth_headers,
    )
    cage_res = client.post(
        "/admin/facility/cages",
        json={"label": f"EMPTY-{suffix}", "location": "Rack", "room_id": room_res.json()["id"]},
        headers=admin_auth_headers,
    )
    cage_id = cage_res.json()["id"]

    response = client.get(f"/facility/cages/{cage_id}/label/download", headers=staff_auth_headers)
    assert response.status_code == 400
    assert "no animals" in response.json()["detail"].lower()
