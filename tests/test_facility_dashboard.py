from uuid import uuid4

from database.database import SessionLocal
from database.lmcpafm_models import Animal, Species, Strain

from tests.planning_helpers import create_experiment_group, seed_project_animal_cap


def _seed_facility_room(client, admin_auth_headers, suffix: str):
    room_res = client.post(
        "/admin/facility/rooms",
        json={"code": f"DB-{suffix}", "name": "Dashboard Room", "building": "Block B"},
        headers=admin_auth_headers,
    )
    assert room_res.status_code == 200, room_res.text
    return room_res.json()["id"]


def test_staff_can_create_extended_care_log(client, staff_auth_headers, admin_auth_headers):
    suffix = uuid4().hex[:6]
    room_id = _seed_facility_room(client, admin_auth_headers, suffix)

    care_res = client.post(
        "/facility/care-logs",
        json={
            "log_type": "autoclave",
            "room_id": room_id,
            "date": "2026-07-28",
            "details": "Load 2 — cages and bottles",
        },
        headers=staff_auth_headers,
    )
    assert care_res.status_code == 200, care_res.text
    body = care_res.json()
    assert body["log_type"] == "autoclave"
    assert body["room_id"] == room_id
    assert body["performed_by_name"] == "Staff Test User"

    list_res = client.get("/facility/care-logs?log_type=autoclave", headers=staff_auth_headers)
    assert list_res.status_code == 200
    assert any(row["id"] == body["id"] for row in list_res.json())


def test_autoclave_requires_room(client, staff_auth_headers, admin_auth_headers):
    suffix = uuid4().hex[:6]
    room_id = _seed_facility_room(client, admin_auth_headers, suffix)
    cage_res = client.post(
        "/admin/facility/cages",
        json={"label": f"C-{suffix}", "location": "Rack", "room_id": room_id, "capacity": 2},
        headers=admin_auth_headers,
    )
    cage_id = cage_res.json()["id"]

    bad_res = client.post(
        "/facility/care-logs",
        json={
            "log_type": "autoclave",
            "cage_id": cage_id,
            "date": "2026-07-28",
            "details": "Missing room",
        },
        headers=staff_auth_headers,
    )
    assert bad_res.status_code == 400


def test_room_dashboard_marks_stale_care(client, staff_auth_headers, admin_auth_headers):
    suffix = uuid4().hex[:6]
    room_id = _seed_facility_room(client, admin_auth_headers, suffix)

    dash_before = client.get("/facility/dashboard/rooms?stale_days=7", headers=staff_auth_headers)
    assert dash_before.status_code == 200
    row = next(item for item in dash_before.json()["rooms"] if item["room_id"] == room_id)
    assert row["care_stale"] is True

    client.post(
        "/facility/care-logs",
        json={
            "log_type": "room_sanitize",
            "room_id": room_id,
            "date": "2026-07-28",
            "details": "Floor mop and UV cycle",
        },
        headers=staff_auth_headers,
    )

    dash_after = client.get("/facility/dashboard/rooms?stale_days=7", headers=staff_auth_headers)
    row_after = next(item for item in dash_after.json()["rooms"] if item["room_id"] == room_id)
    assert row_after["care_stale"] is False
    assert row_after["last_care_date"] == "2026-07-28"


def test_pi_dashboard_groups_by_protocol(client, staff_auth_headers, iaec_auth_headers, admin_auth_headers):
    suffix = uuid4().hex[:6]
    project_res = client.post(
        "/iaec/project",
        json={
            "title": f"Dash Project {suffix}",
            "investigator_name": "Dr. Dash",
            "protocol_number": f"PD-{suffix}",
            "approval_date": "2026-01-01",
            "status": "approved",
        },
        headers=iaec_auth_headers,
    )
    project_id = project_res.json()["id"]

    db = SessionLocal()
    try:
        species = Species(name=f"DS-{suffix}")
        db.add(species)
        db.commit()
        db.refresh(species)
        strain = Strain(name=f"DT-{suffix}", species_id=species.id)
        db.add(strain)
        db.commit()
        db.refresh(strain)
        seed_project_animal_cap(db, project_id, cap=10, species_id=species.id, strain_id=strain.id)
    finally:
        db.close()

    group_res = create_experiment_group(client, iaec_auth_headers, project_id, f"Control {suffix}", 4)
    assert group_res.status_code == 200, group_res.text
    group_id = group_res.json()["id"]

    db = SessionLocal()
    try:
        species = db.query(Species).filter(Species.name == f"DS-{suffix}").one()
        strain = db.query(Strain).filter(Strain.name == f"DT-{suffix}").one()

        db.add(
            Animal(
                animal_number=f"DASH-{suffix}-1",
                species_id=species.id,
                strain_id=strain.id,
                status="allocated",
                protocol_id=project_id,
                experiment_group_id=group_id,
            )
        )
        db.commit()
    finally:
        db.close()

    dash_res = client.get(f"/facility/dashboard/pi?protocol_id={project_id}", headers=staff_auth_headers)
    assert dash_res.status_code == 200, dash_res.text
    protocols = dash_res.json()["protocols"]
    assert len(protocols) == 1
    assert protocols[0]["total_animals"] == 1
    assert protocols[0]["allocated_count"] == 1
    assert len(protocols[0]["groups"]) == 1
    assert protocols[0]["groups"][0]["animal_count"] == 1


def test_strain_dashboard_counts(client, staff_auth_headers, admin_auth_headers):
    suffix = uuid4().hex[:6]
    _seed_facility_room(client, admin_auth_headers, suffix)

    db = SessionLocal()
    try:
        species = Species(name=f"SS-{suffix}")
        db.add(species)
        db.commit()
        db.refresh(species)
        strain = Strain(name=f"ST-{suffix}", species_id=species.id)
        db.add(strain)
        db.commit()
        db.refresh(strain)

        db.add(
            Animal(
                animal_number=f"STR-{suffix}-1",
                species_id=species.id,
                strain_id=strain.id,
                status="available",
            )
        )
        db.add(
            Animal(
                animal_number=f"STR-{suffix}-2",
                species_id=species.id,
                strain_id=strain.id,
                status="quarantine",
            )
        )
        db.commit()
    finally:
        db.close()

    dash_res = client.get("/facility/dashboard/strains", headers=staff_auth_headers)
    assert dash_res.status_code == 200
    row = next(item for item in dash_res.json()["strains"] if item["strain_name"] == f"ST-{suffix}")
    assert row["total_animals"] == 2
    assert row["available_count"] == 1
    assert row["quarantine_count"] == 1
