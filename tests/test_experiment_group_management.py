from uuid import uuid4

from database.database import SessionLocal
from database.lmcpafm_models import Species, Strain

from tests.planning_helpers import create_experiment_group, create_iaec_project_db, seed_project_animal_cap


def _create_approved_project_with_cap(client, iaec_auth_headers, cap: int = 20):
    project_id = create_iaec_project_db(
        title="Manage Groups Project",
        investigator_name="Dr. Manage",
        protocol_number=f"MG-{uuid4().hex[:6]}",
        approval_date="2026-01-01",
        status="approved",
    ).id
    species_id, strain_id = _create_species_strain()
    db = SessionLocal()
    try:
        seed_project_animal_cap(db, project_id, cap=cap, species_id=species_id, strain_id=strain_id)
    finally:
        db.close()
    return project_id, species_id, strain_id


def _create_species_strain():
    db = SessionLocal()
    suffix = uuid4().hex[:8]
    try:
        species = Species(name=f"ManageSpecies-{suffix}")
        db.add(species)
        db.commit()
        db.refresh(species)
        strain = Strain(name=f"ManageStrain-{suffix}", species_id=species.id)
        db.add(strain)
        db.commit()
        db.refresh(strain)
        return species.id, strain.id
    finally:
        db.close()


def test_update_experiment_group(client, iaec_auth_headers):
    project_id, _, _ = _create_approved_project_with_cap(client, iaec_auth_headers, cap=10)
    create_res = create_experiment_group(client, iaec_auth_headers, project_id, "Control", 4)
    assert create_res.status_code == 200, create_res.text
    group_id = create_res.json()["id"]

    update_res = client.patch(
        f"/iaec/group/{group_id}",
        json={"name": "Control (IAEC amended)", "planned_animal_count": 3},
        headers=iaec_auth_headers,
    )
    assert update_res.status_code == 200, update_res.text
    body = update_res.json()
    assert body["name"] == "Control (IAEC amended)"
    assert body["planned_animal_count"] == 3


def test_update_experiment_group_validates_cap(client, iaec_auth_headers):
    project_id, _, _ = _create_approved_project_with_cap(client, iaec_auth_headers, cap=6)
    first = create_experiment_group(client, iaec_auth_headers, project_id, "Group A", 4)
    second = create_experiment_group(client, iaec_auth_headers, project_id, "Group B", 2)
    assert first.status_code == 200, first.text
    assert second.status_code == 200, second.text
    group_b_id = second.json()["id"]

    update_res = client.patch(
        f"/iaec/group/{group_b_id}",
        json={"planned_animal_count": 4},
        headers=iaec_auth_headers,
    )
    assert update_res.status_code == 400
    assert "exceed the approved limit" in update_res.json()["detail"]


def test_delete_experiment_group(client, iaec_auth_headers):
    project_id, _, _ = _create_approved_project_with_cap(client, iaec_auth_headers, cap=8)
    create_res = create_experiment_group(client, iaec_auth_headers, project_id, "Temporary", 2)
    assert create_res.status_code == 200, create_res.text
    group_id = create_res.json()["id"]

    delete_res = client.delete(f"/iaec/group/{group_id}", headers=iaec_auth_headers)
    assert delete_res.status_code == 200, delete_res.text

    planning_res = client.get(
        f"/iaec/project/{project_id}/experiment-planning",
        headers=iaec_auth_headers,
    )
    assert planning_res.status_code == 200, planning_res.text
    assert planning_res.json()["group_count"] == 0


def test_planning_status_includes_annexure_total(client, iaec_auth_headers):
    project_id, _, _ = _create_approved_project_with_cap(client, iaec_auth_headers, cap=12)
    create_experiment_group(client, iaec_auth_headers, project_id, "Group A", 5)

    planning_res = client.get(
        f"/iaec/project/{project_id}/experiment-planning",
        headers=iaec_auth_headers,
    )
    assert planning_res.status_code == 200, planning_res.text
    body = planning_res.json()
    assert body["approved_animal_count"] == 12
    assert "annexure_i_total" in body
    assert body["planned_animal_total"] == 5
