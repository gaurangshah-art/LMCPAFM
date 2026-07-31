from __future__ import annotations

from datetime import date

from database.database import SessionLocal
from database.lmcpafm_models import FormB, FormBAnimalRequirement, IAECProject


def create_iaec_project_db(
    *,
    title: str = "Test Project",
    investigator_name: str = "Dr. Test",
    objective: str | None = "Testing",
    start_date: date | str | None = "2026-01-01",
    protocol_number: str | None = None,
    approval_date: date | str | None = None,
    status: str | None = "draft",
    principal_investigator: str | None = None,
    purpose: str | None = None,
) -> IAECProject:
    if isinstance(start_date, str):
        start_date = date.fromisoformat(start_date)
    if isinstance(approval_date, str):
        approval_date = date.fromisoformat(approval_date)

    db = SessionLocal()
    try:
        project = IAECProject(
            title=title,
            investigator_name=investigator_name,
            objective=objective,
            start_date=start_date,
            protocol_number=protocol_number,
            approval_date=approval_date,
            status=status,
            principal_investigator=principal_investigator or investigator_name,
            purpose=purpose,
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        return project
    finally:
        db.close()


def seed_project_animal_cap(
    db,
    project_id: int,
    cap: int,
    species_id: int,
    strain_id: int,
) -> None:
    form_b = FormB(project_id=project_id, date=date(2026, 1, 1))
    db.add(form_b)
    db.flush()
    db.add(
        FormBAnimalRequirement(
            form_b_id=form_b.id,
            species_id=species_id,
            strain_id=strain_id,
            count=cap,
        )
    )
    db.commit()


def create_experiment_group(client, headers, project_id: int, name: str, planned_count: int):
    return client.post(
        "/iaec/group",
        json={
            "project_id": project_id,
            "name": name,
            "planned_animal_count": planned_count,
        },
        headers=headers,
    )
