from __future__ import annotations

from datetime import date

from database.lmcpafm_models import FormB, FormBAnimalRequirement


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
