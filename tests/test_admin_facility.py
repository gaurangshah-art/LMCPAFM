from uuid import uuid4

from database.database import SessionLocal
from database.lmcpafm_models import Species, Strain


def test_admin_facility_requires_admin(client, staff_auth_headers):
    response = client.get("/admin/facility/summary", headers=staff_auth_headers)
    assert response.status_code == 403


def test_admin_facility_workflow(client, admin_auth_headers):
    suffix = uuid4().hex[:6]

    room_res = client.post(
        "/admin/facility/rooms",
        json={"code": f"R-{suffix}", "name": "Rodent Room A", "building": "Block A"},
        headers=admin_auth_headers,
    )
    assert room_res.status_code == 200, room_res.text
    room_id = room_res.json()["id"]

    cage_res = client.post(
        "/admin/facility/cages",
        json={"label": f"C-{suffix}", "location": "Rack 1", "room_id": room_id, "capacity": 4},
        headers=admin_auth_headers,
    )
    assert cage_res.status_code == 200, cage_res.text
    cage_id = cage_res.json()["id"]

    db = SessionLocal()
    try:
        species = Species(name=f"FacSpecies-{suffix}")
        db.add(species)
        db.commit()
        db.refresh(species)
        strain = Strain(name=f"FacStrain-{suffix}", species_id=species.id)
        db.add(strain)
        db.commit()
        db.refresh(strain)
    finally:
        db.close()

    procurement_res = client.post(
        "/admin/facility/procurements",
        json={
            "species_id": species.id,
            "strain_id": strain.id,
            "count": 2,
            "date": "2026-07-27",
            "supplier_name": "External Breeder",
            "acquired_from": "ABC Bio Supplies",
            "voucher_or_bill_number": "INV-1001",
            "create_animals": True,
            "start_quarantine": True,
        },
        headers=admin_auth_headers,
    )
    assert procurement_res.status_code == 200, procurement_res.text
    assert procurement_res.json()["animals_created"] == 2

    animals_res = client.get("/admin/facility/animals?status=quarantine", headers=admin_auth_headers)
    assert animals_res.status_code == 200
    quarantined = animals_res.json()
    assert len(quarantined) >= 2
    animal_id = quarantined[0]["id"]

    release_res = client.post(
        f"/admin/facility/animals/{animal_id}/release-quarantine",
        headers=admin_auth_headers,
    )
    assert release_res.status_code == 200
    assert release_res.json()["status"] == "available"

    move_res = client.post(
        f"/admin/facility/animals/{animal_id}/move",
        json={"to_cage_id": cage_id, "reason": "Post-quarantine housing"},
        headers=admin_auth_headers,
    )
    assert move_res.status_code == 200
    assert move_res.json()["cage_id"] == cage_id

    weight_res = client.post(
        f"/admin/facility/animals/{animal_id}/weights",
        json={"date": "2026-07-27", "weight_g": 220},
        headers=admin_auth_headers,
    )
    assert weight_res.status_code == 200

    breeding_res = client.post(
        "/admin/facility/breeding",
        json={
            "date": "2026-07-27",
            "species_id": species.id,
            "strain_id": strain.id,
            "offspring_count": 1,
            "litter_count": 1,
            "create_offspring": True,
            "start_quarantine": True,
        },
        headers=admin_auth_headers,
    )
    assert breeding_res.status_code == 200
    assert breeding_res.json()["animals_created"] == 1

    care_res = client.post(
        "/admin/facility/care-logs",
        json={
            "log_type": "feeding",
            "room_id": room_id,
            "date": "2026-07-27",
            "details": "Standard chow provided",
            "performed_by_name": "Facility Attendant",
        },
        headers=admin_auth_headers,
    )
    assert care_res.status_code == 200

    outcome_res = client.post(
        "/admin/facility/outcomes",
        json={
            "animal_id": animal_id,
            "date": "2026-07-28",
            "outcome_type": "natural_death",
            "reason": "Found dead during morning check",
        },
        headers=admin_auth_headers,
    )
    assert outcome_res.status_code == 200
    assert outcome_res.json()["animal_status"] == "dead"

    summary_res = client.get("/admin/facility/summary", headers=admin_auth_headers)
    assert summary_res.status_code == 200
    assert summary_res.json()["total_rooms"] >= 1
    assert summary_res.json()["total_cages"] >= 1
