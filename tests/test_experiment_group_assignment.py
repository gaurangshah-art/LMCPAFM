from uuid import uuid4

from database.database import SessionLocal
from database.lmcpafm_models import Animal, Species, Strain

from tests.planning_helpers import create_experiment_group, create_iaec_project_db, seed_project_animal_cap


def _create_approved_project(client, iaec_auth_headers, suffix: str):
    project = create_iaec_project_db(
        title=f"Group Assign Project {suffix}",
        investigator_name="Dr. Assign",
        protocol_number=f"GA-{suffix}",
        approval_date="2026-01-01",
        status="approved",
    )
    return project.id


def _seed_group_cage(client, admin_auth_headers, suffix: str, project_id: int, group_id: int, count: int = 2):
    room_res = client.post(
        "/admin/facility/rooms",
        json={"code": f"GR-{suffix}", "name": "Group Room"},
        headers=admin_auth_headers,
    )
    room_id = room_res.json()["id"]
    cage_res = client.post(
        "/admin/facility/cages",
        json={"label": f"GC-{suffix}", "location": "Rack", "room_id": room_id, "capacity": 4},
        headers=admin_auth_headers,
    )
    cage_id = cage_res.json()["id"]

    db = SessionLocal()
    try:
        species = Species(name=f"GS-{suffix}")
        db.add(species)
        db.commit()
        db.refresh(species)
        strain = Strain(name=f"GT-{suffix}", species_id=species.id)
        db.add(strain)
        db.commit()
        db.refresh(strain)

        for index in range(count):
            db.add(
                Animal(
                    animal_number=f"GRP-{suffix}-{index}",
                    species_id=species.id,
                    strain_id=strain.id,
                    cage_id=cage_id,
                    status="allocated",
                    protocol_id=project_id,
                    experiment_group_id=group_id,
                )
            )
        db.commit()
    finally:
        db.close()
    return cage_id


def test_assign_animals_to_group(client, staff_auth_headers, iaec_auth_headers):
    suffix = uuid4().hex[:6]
    project_id = _create_approved_project(client, iaec_auth_headers, suffix)

    db = SessionLocal()
    try:
        species = Species(name=f"AS-{suffix}")
        db.add(species)
        db.commit()
        db.refresh(species)
        strain = Strain(name=f"AT-{suffix}", species_id=species.id)
        db.add(strain)
        db.commit()
        db.refresh(strain)
        seed_project_animal_cap(db, project_id, cap=10, species_id=species.id, strain_id=strain.id)
        animal = Animal(
            animal_number=f"A-{suffix}",
            species_id=species.id,
            strain_id=strain.id,
            status="allocated",
            protocol_id=project_id,
        )
        db.add(animal)
        db.commit()
        db.refresh(animal)
        animal_id = animal.id
    finally:
        db.close()

    group_res = create_experiment_group(client, iaec_auth_headers, project_id, f"Group {suffix}", 5)
    assert group_res.status_code == 200, group_res.text
    group_id = group_res.json()["id"]

    assign_res = client.post(
        f"/iaec/group/{group_id}/assign-animals",
        json={"animal_ids": [animal_id]},
        headers=staff_auth_headers,
    )
    assert assign_res.status_code == 200, assign_res.text
    payload = assign_res.json()
    assert payload["assigned_count"] == 1
    assert payload["group_id"] == group_id


def test_group_cage_label_download(client, staff_auth_headers, iaec_auth_headers, admin_auth_headers):
    suffix = uuid4().hex[:6]
    project_id = _create_approved_project(client, iaec_auth_headers, suffix)

    db = SessionLocal()
    try:
        species = Species(name=f"LS-{suffix}")
        db.add(species)
        db.commit()
        db.refresh(species)
        strain = Strain(name=f"LT-{suffix}", species_id=species.id)
        db.add(strain)
        db.commit()
        db.refresh(strain)
        seed_project_animal_cap(db, project_id, cap=10, species_id=species.id, strain_id=strain.id)
    finally:
        db.close()

    group_res = create_experiment_group(client, iaec_auth_headers, project_id, f"Label Group {suffix}", 5)
    group_id = group_res.json()["id"]
    cage_id = _seed_group_cage(client, admin_auth_headers, suffix, project_id, group_id)

    pdf_res = client.get(
        f"/facility/labels/groups/{group_id}/cages/download",
        headers=staff_auth_headers,
    )
    assert pdf_res.status_code == 200, pdf_res.text
    assert pdf_res.content.startswith(b"%PDF")

    preview_res = client.get(f"/facility/cages/{cage_id}/label", headers=staff_auth_headers)
    assert preview_res.status_code == 200
    assert preview_res.json()["category"] == "experiment"
    assert preview_res.json()["group_id"] == group_id


def test_allocation_with_experiment_group(client, staff_auth_headers, iaec_auth_headers):
    suffix = uuid4().hex[:6]
    project_id = _create_approved_project(client, iaec_auth_headers, suffix)

    db = SessionLocal()
    try:
        species = Species(name=f"PS-{suffix}")
        db.add(species)
        db.commit()
        db.refresh(species)
        strain = Strain(name=f"PT-{suffix}", species_id=species.id)
        db.add(strain)
        db.commit()
        db.refresh(strain)
        seed_project_animal_cap(db, project_id, cap=10, species_id=species.id, strain_id=strain.id)
        species_id = species.id
        strain_id = strain.id
        for index in range(3):
            db.add(
                Animal(
                    animal_number=f"P-{suffix}-{index}",
                    species_id=species_id,
                    strain_id=strain_id,
                    status="available",
                )
            )
        db.commit()
    finally:
        db.close()

    group_res = create_experiment_group(client, iaec_auth_headers, project_id, f"Alloc Group {suffix}", 5)
    group_id = group_res.json()["id"]

    req_res = client.post(
        "/iaec/requisition",
        json={
            "protocol_id": project_id,
            "date": "2026-07-28",
            "purpose": "Group allocation test",
            "items": [{"species_id": species_id, "strain_id": strain_id, "requested_count": 2}],
        },
        headers=staff_auth_headers,
    )
    assert req_res.status_code == 200, req_res.text
    req_item_id = req_res.json()["items"][0]["id"]

    alloc_res = client.post(
        "/iaec/allocation",
        json={
            "requisition_id": req_res.json()["id"],
            "date": "2026-07-28",
            "allocated_by": "Staff",
            "remarks": "Assign on issue",
            "experiment_group_id": group_id,
            "items": [{"requisition_item_id": req_item_id, "allocated_count": 2, "remaining_count": 0}],
        },
        headers=staff_auth_headers,
    )
    assert alloc_res.status_code == 200, alloc_res.text

    db = SessionLocal()
    try:
        assigned = (
            db.query(Animal)
            .filter(Animal.experiment_group_id == group_id, Animal.status == "allocated")
            .count()
        )
        assert assigned == 2
    finally:
        db.close()
