from uuid import uuid4

from database.database import SessionLocal
from database.lmcpafm_models import Species, Strain

from tests.planning_helpers import create_experiment_group, create_iaec_project_db, seed_project_animal_cap


def _create_approved_project(client, iaec_auth_headers):
    project = create_iaec_project_db(
        title="Planning Test Project",
        investigator_name="Dr. Plan",
        protocol_number="PLAN-001",
        approval_date="2026-01-01",
        status="approved",
    )
    return project.id


def _create_species_strain():
    db = SessionLocal()
    suffix = uuid4().hex[:8]
    try:
        species = Species(name=f"PlanSpecies-{suffix}")
        db.add(species)
        db.commit()
        db.refresh(species)

        strain = Strain(name=f"PlanStrain-{suffix}", species_id=species.id)
        db.add(strain)
        db.commit()
        db.refresh(strain)
        return species.id, strain.id
    finally:
        db.close()


def test_group_creation_requires_animal_cap(client, iaec_auth_headers):
    project_id = _create_approved_project(client, iaec_auth_headers)

    response = create_experiment_group(
        client,
        iaec_auth_headers,
        project_id,
        "Group A",
        5,
    )
    assert response.status_code == 400
    assert "approved animal count" in response.json()["detail"].lower()


def test_group_creation_validates_total_cap(client, iaec_auth_headers):
    project_id = _create_approved_project(client, iaec_auth_headers)
    species_id, strain_id = _create_species_strain()

    db = SessionLocal()
    try:
        seed_project_animal_cap(db, project_id, cap=10, species_id=species_id, strain_id=strain_id)
    finally:
        db.close()

    first = create_experiment_group(client, iaec_auth_headers, project_id, "Group A", 6)
    assert first.status_code == 200, first.text

    second = create_experiment_group(client, iaec_auth_headers, project_id, "Group B", 5)
    assert second.status_code == 400
    assert "exceed the approved limit" in second.json()["detail"]


def test_requisition_blocked_without_groups(client, staff_auth_headers, iaec_auth_headers):
    project_id = _create_approved_project(client, iaec_auth_headers)
    species_id, strain_id = _create_species_strain()

    db = SessionLocal()
    try:
        seed_project_animal_cap(db, project_id, cap=5, species_id=species_id, strain_id=strain_id)
    finally:
        db.close()

    response = client.post(
        "/iaec/requisition",
        json={
            "protocol_id": project_id,
            "date": "2026-01-02",
            "purpose": "Should fail",
            "items": [
                {"species_id": species_id, "strain_id": strain_id, "requested_count": 2}
            ],
        },
        headers=staff_auth_headers,
    )
    assert response.status_code == 400
    assert "experiment group" in response.json()["detail"].lower()


def test_requisition_allowed_with_complete_groups(client, staff_auth_headers, iaec_auth_headers):
    project_id = _create_approved_project(client, iaec_auth_headers)
    species_id, strain_id = _create_species_strain()

    db = SessionLocal()
    try:
        seed_project_animal_cap(db, project_id, cap=5, species_id=species_id, strain_id=strain_id)
    finally:
        db.close()

    group_res = create_experiment_group(client, iaec_auth_headers, project_id, "Group A", 5)
    assert group_res.status_code == 200, group_res.text

    planning = client.get(
        f"/iaec/project/{project_id}/experiment-planning",
        headers=iaec_auth_headers,
    )
    assert planning.status_code == 200
    planning_data = planning.json()
    assert planning_data["is_complete"] is True
    assert planning_data["can_create_requisition"] is True

    response = client.post(
        "/iaec/requisition",
        json={
            "protocol_id": project_id,
            "date": "2026-01-02",
            "purpose": "Ready after planning",
            "items": [
                {"species_id": species_id, "strain_id": strain_id, "requested_count": 5}
            ],
        },
        headers=staff_auth_headers,
    )
    assert response.status_code == 200, response.text


def test_requisition_blocked_when_exceeds_planned_total(
    client,
    staff_auth_headers,
    iaec_auth_headers,
):
    project_id = _create_approved_project(client, iaec_auth_headers)
    species_id, strain_id = _create_species_strain()

    db = SessionLocal()
    try:
        seed_project_animal_cap(db, project_id, cap=10, species_id=species_id, strain_id=strain_id)
    finally:
        db.close()

    group_res = create_experiment_group(client, iaec_auth_headers, project_id, "Group A", 3)
    assert group_res.status_code == 200, group_res.text

    response = client.post(
        "/iaec/requisition",
        json={
            "protocol_id": project_id,
            "date": "2026-01-02",
            "purpose": "Too many animals",
            "items": [
                {"species_id": species_id, "strain_id": strain_id, "requested_count": 4}
            ],
        },
        headers=staff_auth_headers,
    )
    assert response.status_code == 400
    assert "planned total" in response.json()["detail"].lower()
