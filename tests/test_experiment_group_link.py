from uuid import uuid4

from database.database import SessionLocal
from database.lmcpafm_models import Species, Strain, Animal

from tests.planning_helpers import create_experiment_group, seed_project_animal_cap


def test_experiment_requires_group(client, staff_auth_headers, iaec_auth_headers):
    project_res = client.post(
        "/iaec/project",
        json={
            "title": "Group Required Project",
            "investigator_name": "Dr. Group",
            "protocol_number": "GRP-001",
            "approval_date": "2026-01-01",
            "status": "approved",
        },
        headers=iaec_auth_headers,
    )
    assert project_res.status_code == 200, project_res.text
    project_id = project_res.json()["id"]

    suffix = uuid4().hex[:8]
    db = SessionLocal()
    try:
        species = Species(name=f"GrpSpecies-{suffix}")
        db.add(species)
        db.commit()
        db.refresh(species)
        strain = Strain(name=f"GrpStrain-{suffix}", species_id=species.id)
        db.add(strain)
        db.commit()
        db.refresh(strain)
        seed_project_animal_cap(db, project_id, cap=2, species_id=species.id, strain_id=strain.id)

        for _ in range(2):
            db.add(Animal(species_id=species.id, strain_id=strain.id, status="available"))
        db.commit()
    finally:
        db.close()

    group_res = create_experiment_group(client, iaec_auth_headers, project_id, "Group A", 2)
    assert group_res.status_code == 200, group_res.text
    group_id = group_res.json()["id"]

    req_res = client.post(
        "/iaec/requisition",
        json={
            "protocol_id": project_id,
            "date": "2026-01-02",
            "purpose": "Group test",
            "items": [{"species_id": species.id, "strain_id": strain.id, "requested_count": 2}],
        },
        headers=staff_auth_headers,
    )
    assert req_res.status_code == 200, req_res.text
    req_item_id = req_res.json()["items"][0]["id"]

    alloc_res = client.post(
        "/iaec/allocation",
        json={
            "requisition_id": req_res.json()["id"],
            "date": "2026-01-03",
            "allocated_by": "Staff",
            "remarks": "Allocate two",
            "items": [{"requisition_item_id": req_item_id, "allocated_count": 2, "remaining_count": 0}],
        },
        headers=staff_auth_headers,
    )
    assert alloc_res.status_code == 200, alloc_res.text
    alloc_id = alloc_res.json()["id"]
    animal_ids = [animal["id"] for animal in alloc_res.json()["items"][0]["animals"]]

    missing_group_res = client.post(
        "/experiment/",
        json={
            "protocol_id": project_id,
            "allocation_id": alloc_id,
            "date": "2026-01-04",
            "performed_by": "Dr. Group",
            "purpose": "Test",
            "procedure": "Procedure",
            "dose": "1 mg/kg",
            "observations": "None",
            "animals": [{"animal_id": animal_ids[0]}],
        },
    )
    assert missing_group_res.status_code == 422

    wrong_group_res = client.post(
        "/experiment/",
        json={
            "protocol_id": project_id,
            "allocation_id": alloc_id,
            "experiment_group_id": 99999,
            "date": "2026-01-04",
            "performed_by": "Dr. Group",
            "purpose": "Test",
            "procedure": "Procedure",
            "dose": "1 mg/kg",
            "observations": "None",
            "animals": [{"animal_id": animal_ids[0]}],
        },
    )
    assert wrong_group_res.status_code == 404

    ok_res = client.post(
        "/experiment/",
        json={
            "protocol_id": project_id,
            "allocation_id": alloc_id,
            "experiment_group_id": group_id,
            "date": "2026-01-04",
            "performed_by": "Dr. Group",
            "purpose": "Test",
            "procedure": "Procedure",
            "dose": "1 mg/kg",
            "observations": "None",
            "animals": [{"animal_id": animal_ids[0]}],
        },
    )
    assert ok_res.status_code == 200, ok_res.text
    assert ok_res.json()["experiment_group_id"] == group_id
