from datetime import date, datetime, timezone
from uuid import uuid4

from database.database import SessionLocal
from database.lmcpafm_models import (
    FormB,
    FormBAnimalRequirement,
    FormBInvestigator,
    FormBMeetingDecision,
    IAECMeeting,
    IAECProject,
    Species,
    Strain,
)

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


def test_planning_status_shows_pending_decision_message(client, iaec_auth_headers):
    db = SessionLocal()
    try:
        meeting = IAECMeeting(
            date=date(2026, 7, 23),
            meeting_number="4",
            meeting_time="10:30",
            venue="IAEC Room",
            minutes="minutes",
        )
        project = IAECProject(
            title="Pending Approval Project",
            investigator_name="Dr Pending",
            status="submitted",
            protocol_number="PEND-001",
        )
        db.add_all([meeting, project])
        db.flush()

        form_b = FormB(
            project_id=project.id,
            date=date(2026, 1, 1),
            meeting_id=meeting.id,
            submitted_at=datetime.now(timezone.utc),
        )
        db.add(form_b)
        db.flush()
        db.add(
            FormBMeetingDecision(
                form_b_id=form_b.id,
                meeting_id=meeting.id,
                decision="animal_count_amended",
                approved_animal_count=12,
            )
        )
        db.commit()
        project_id = project.id
    finally:
        db.close()

    planning = client.get(
        f"/iaec/project/{project_id}/experiment-planning",
        headers=iaec_auth_headers,
    )
    assert planning.status_code == 200, planning.text
    body = planning.json()
    assert body["approved_animal_count"] == 12
    assert body["animal_cap_source"] == "meeting_decision"
    assert body["iaec_approval_finalized"] is False
    assert body["is_complete"] is False
    assert "meeting decision (12 animals)" in body["message"]
    assert "not finalized yet" in body["message"]


def test_investigator_can_resync_after_submitted_form_b_when_approved(client, monkeypatch):
    monkeypatch.setenv("LMCP_INSTITUTIONAL_EMAIL_DOMAINS", "lmcp.ac.in")
    suffix = uuid4().hex[:8]
    email = f"pi_{suffix}@lmcp.ac.in"
    password = "StrongPass@123"
    client.post(
        "/auth/register-investigator",
        json={"name": "Planning PI", "email": email, "password": password},
    )
    login_res = client.post("/auth/login", json={"email": email, "password": password})
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}
    client.put(
        "/investigator-profile/me",
        json={
            "institution_name": "LMCP",
            "department": "Pharmacology",
            "designation": "Professor",
            "qualification": "PhD",
            "is_lmcp_faculty": True,
        },
        headers=headers,
    )

    project_id = create_iaec_project_db(
        title="Submitted Approved Project",
        investigator_name="Planning PI",
        protocol_number=f"SAP-{suffix}",
        approval_date="2026-01-01",
        status="approved",
    ).id

    db = SessionLocal()
    try:
        from models.user import User

        user = db.query(User).filter(User.email == email).first()
        assert user is not None

        species = Species(name=f"ResyncSpecies-{suffix}")
        db.add(species)
        db.flush()
        strain = Strain(name=f"ResyncStrain-{suffix}", species_id=species.id)
        db.add(strain)
        db.flush()

        form_b = FormB(
            project_id=project_id,
            date=date(2026, 1, 1),
            submitted_at=datetime.now(timezone.utc),
        )
        db.add(form_b)
        db.flush()
        db.add(
            FormBAnimalRequirement(
                form_b_id=form_b.id,
                species_id=species.id,
                strain_id=strain.id,
                count=10,
            )
        )
        db.add(
            FormBInvestigator(
                form_b_id=form_b.id,
                name="Planning PI",
                project_role="Principal Investigator",
                user_id=user.id,
                investigator_type="faculty",
                can_view_status=True,
                can_view_approval_letters=True,
                can_edit_forms=True,
                can_submit_form_b=True,
            )
        )
        db.commit()
    finally:
        db.close()

    resync_res = client.post(
        f"/iaec/project/{project_id}/resync-experiment-groups",
        headers=headers,
    )
    assert resync_res.status_code == 200, resync_res.text
