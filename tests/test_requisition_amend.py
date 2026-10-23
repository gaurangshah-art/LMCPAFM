from uuid import uuid4

from database.database import SessionLocal
from database.lmcpafm_models import FormB, FormBInvestigator, Species, Strain

from tests.planning_helpers import create_iaec_project_db, create_experiment_group, seed_project_animal_cap


def _register_investigator(client, monkeypatch):
    monkeypatch.setenv("LMCP_INSTITUTIONAL_EMAIL_DOMAINS", "lmcp.ac.in")
    suffix = uuid4().hex[:8]
    payload = {
        "name": "Dr. Requisition PI",
        "email": f"reqpi_{suffix}@lmcp.ac.in",
        "password": "StrongPass@123",
    }
    client.post("/auth/register-investigator", json=payload)
    login_res = client.post(
        "/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}
    return headers, payload


def _setup_pi_project(client, iaec_auth_headers, inv_headers, inv_payload, *, cap: int = 30):
    suffix = uuid4().hex[:4]
    project = create_iaec_project_db(
        title="Amend Requisition Project",
        investigator_name=inv_payload["name"],
        protocol_number=f"AMD-{suffix}",
        approval_date="2026-02-01",
        status="approved",
        principal_investigator=inv_payload["name"],
    )

    with SessionLocal() as db:
        species = Species(name=f"AmendSp-{suffix}")
        db.add(species)
        db.flush()
        strain = Strain(name=f"AmendSt-{suffix}", species_id=species.id)
        db.add(strain)
        db.flush()
        seed_project_animal_cap(db, project.id, cap=cap, species_id=species.id, strain_id=strain.id)
        form_b = db.query(FormB).filter(FormB.project_id == project.id).one()
        db.add(
            FormBInvestigator(
                form_b_id=form_b.id,
                name=inv_payload["name"],
                project_role="principal_investigator",
                user_id=None,
                can_view_status=True,
                can_edit_forms=False,
                can_submit_form_b=False,
            )
        )
        db.commit()

        user_id = client.get("/users/me", headers=inv_headers).json()["id"]
        pi = (
            db.query(FormBInvestigator)
            .filter(
                FormBInvestigator.form_b_id == form_b.id,
                FormBInvestigator.project_role == "principal_investigator",
            )
            .one()
        )
        pi.user_id = user_id
        db.commit()
        species_id = species.id
        strain_id = strain.id

    group_res = create_experiment_group(
        client,
        iaec_auth_headers,
        project.id,
        "Main group",
        cap,
    )
    assert group_res.status_code == 200, group_res.text

    return project.id, species_id, strain_id


def test_pi_amends_requisition_before_allocation(client, monkeypatch, iaec_auth_headers):
    inv_headers, inv_payload = _register_investigator(client, monkeypatch)
    project_id, species_id, strain_id = _setup_pi_project(
        client, iaec_auth_headers, inv_headers, inv_payload
    )

    create_res = client.post(
        "/iaec/requisition",
        json={
            "protocol_id": project_id,
            "date": "2026-02-05",
            "purpose": "Initial request",
            "items": [{"species_id": species_id, "strain_id": strain_id, "requested_count": 15}],
        },
        headers=inv_headers,
    )
    assert create_res.status_code == 200, create_res.text
    req_id = create_res.json()["id"]
    assert create_res.json()["can_amend"] is True

    amend_res = client.put(
        f"/iaec/requisition/{req_id}",
        json={
            "date": "2026-02-06",
            "purpose": "Revised count",
            "items": [{"species_id": species_id, "strain_id": strain_id, "requested_count": 12}],
        },
        headers=inv_headers,
    )
    assert amend_res.status_code == 200, amend_res.text
    body = amend_res.json()
    assert body["purpose"] == "Revised count"
    assert body["items"][0]["requested_count"] == 12
    assert body["amended_at"] is not None


def test_pi_cannot_amend_after_allocation(client, monkeypatch, iaec_auth_headers, staff_auth_headers):
    inv_headers, inv_payload = _register_investigator(client, monkeypatch)
    project_id, species_id, strain_id = _setup_pi_project(
        client, iaec_auth_headers, inv_headers, inv_payload, cap=20
    )

    create_res = client.post(
        "/iaec/requisition",
        json={
            "protocol_id": project_id,
            "date": "2026-02-05",
            "purpose": "Allocate test",
            "items": [{"species_id": species_id, "strain_id": strain_id, "requested_count": 10}],
        },
        headers=inv_headers,
    )
    assert create_res.status_code == 200, create_res.text
    req = create_res.json()
    req_item_id = req["items"][0]["id"]

    with SessionLocal() as db:
        from database.lmcpafm_models import Animal

        for i in range(10):
            db.add(
                Animal(
                    species_id=species_id,
                    strain_id=strain_id,
                    status="available",
                    animal_number=f"AMD-{i}",
                )
            )
        db.commit()

    alloc_res = client.post(
        "/iaec/allocation",
        json={
            "requisition_id": req["id"],
            "date": "2026-02-07",
            "allocated_by": "Staff",
            "remarks": "Partial",
            "items": [
                {
                    "requisition_item_id": req_item_id,
                    "allocated_count": 3,
                    "remaining_count": 7,
                }
            ],
        },
        headers=staff_auth_headers,
    )
    assert alloc_res.status_code == 200, alloc_res.text

    amend_res = client.put(
        f"/iaec/requisition/{req['id']}",
        json={
            "date": "2026-02-08",
            "purpose": "Too late",
            "items": [{"species_id": species_id, "strain_id": strain_id, "requested_count": 8}],
        },
        headers=inv_headers,
    )
    assert amend_res.status_code == 400
    assert "allocation" in amend_res.json()["detail"].lower()
