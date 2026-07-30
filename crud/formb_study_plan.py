from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session, joinedload

from crud.exceptions import CRUDValidationError
from crud.formb_membership import get_editable_form_b, get_member_form_b
from database.lmcpafm_models import (
    ExperimentGroup,
    FormB,
    FormBAnimalRequirement,
    FormBGroupDosing,
    FormBGroupEndpoint,
    FormBGroupFate,
    FormBStudyGroup,
    FormBStudyPhase,
    IAECProject,
    Species,
    Strain,
)
from models.user import User
from schemas.schemas_formb_study_plan import (
    FATE_TYPES,
    GROUP_ROLES,
    SCHEDULE_TYPES,
    STUDY_PHASE_CODES,
    FormBStudyPlanSave,
)

STEP2B_KEY = "step2b"


def _get_form_b_animal_total(db: Session, form_b_id: int) -> int | None:
    rows = (
        db.query(FormBAnimalRequirement)
        .filter(FormBAnimalRequirement.form_b_id == form_b_id)
        .all()
    )
    if not rows:
        return None
    return sum(row.count for row in rows)


def _phase_to_dict(phase: FormBStudyPhase) -> dict:
    return {
        "id": phase.id,
        "phase_code": phase.phase_code,
        "phase_name": phase.phase_name,
        "sequence_order": phase.sequence_order,
        "objective": phase.objective,
        "planned_start_date": phase.planned_start_date.isoformat() if phase.planned_start_date else None,
        "planned_duration_weeks": phase.planned_duration_weeks,
        "animal_cap": phase.animal_cap,
        "contingency_note": phase.contingency_note,
        "depends_on_phase_id": phase.depends_on_phase_id,
        "reuse_animals_allowed": phase.reuse_animals_allowed,
        "groups": [_group_to_dict(group) for group in phase.groups],
    }


def _group_to_dict(group: FormBStudyGroup) -> dict:
    return {
        "id": group.id,
        "group_code": group.group_code,
        "group_name": group.group_name,
        "role": group.role,
        "animal_count": group.animal_count,
        "species_id": group.species_id,
        "species_name": group.species.name if group.species else None,
        "strain_id": group.strain_id,
        "strain_name": group.strain.name if group.strain else None,
        "sex": group.sex,
        "age": group.age,
        "weight_range": group.weight_range,
        "feeding_diet": group.feeding_diet,
        "housing_notes": group.housing_notes,
        "treatment_summary": group.treatment_summary,
        "dosing": [
            {
                "agent_name": row.agent_name,
                "dose": row.dose,
                "route": row.route,
                "frequency": row.frequency,
                "start_day": row.start_day,
                "end_day": row.end_day,
                "volume": row.volume,
                "notes": row.notes,
            }
            for row in group.dosing_entries
        ],
        "endpoints": [
            {
                "parameter_code": row.parameter_code,
                "parameter_name": row.parameter_name,
                "schedule_type": row.schedule_type,
                "schedule_detail": row.schedule_detail,
                "method": row.method,
                "notes": row.notes,
            }
            for row in group.endpoints
        ],
        "fates": [
            {
                "fate_type": row.fate_type,
                "count": row.count,
                "method_or_destination": row.method_or_destination,
                "timing": row.timing,
            }
            for row in group.fates
        ],
    }


def get_study_plan(db: Session, user: User, form_b_id: int) -> dict:
    form_b = get_member_form_b(db, user, form_b_id)
    phases = (
        db.query(FormBStudyPhase)
        .options(
            joinedload(FormBStudyPhase.groups).joinedload(FormBStudyGroup.species),
            joinedload(FormBStudyPhase.groups).joinedload(FormBStudyGroup.strain),
            joinedload(FormBStudyPhase.groups).joinedload(FormBStudyGroup.dosing_entries),
            joinedload(FormBStudyPhase.groups).joinedload(FormBStudyGroup.endpoints),
            joinedload(FormBStudyPhase.groups).joinedload(FormBStudyGroup.fates),
        )
        .filter(FormBStudyPhase.form_b_id == form_b.id)
        .order_by(FormBStudyPhase.sequence_order.asc(), FormBStudyPhase.id.asc())
        .all()
    )
    application_data = form_b.application_data or {}
    step2b = application_data.get(STEP2B_KEY) or {}
    phase_dicts = [_phase_to_dict(phase) for phase in phases]
    group_count = sum(len(phase.groups) for phase in phases)
    total_animals = sum(phase.animal_cap for phase in phases)
    return {
        "form_b_id": form_b.id,
        "design_rationale": step2b.get("design_rationale") or "",
        "phases": phase_dicts,
        "total_animals": total_animals,
        "phase_count": len(phases),
        "group_count": group_count,
    }


def _validate_species_strain(db: Session, species_id: int | None, strain_id: int | None) -> None:
    if species_id is None or strain_id is None:
        raise CRUDValidationError("Each study group must specify both species and strain.")
    species = db.query(Species).filter(Species.id == species_id).first()
    strain = db.query(Strain).filter(Strain.id == strain_id).first()
    if species is None or strain is None:
        raise CRUDValidationError("Invalid species or strain selected for a study group.")
    if strain.species_id != species.id:
        raise CRUDValidationError("Selected strain does not belong to the selected species.")


def validate_study_plan_payload(db: Session, form_b_id: int, payload: FormBStudyPlanSave) -> None:
    if not payload.phases:
        raise CRUDValidationError("Add at least one study phase.")

    phase_total = 0
    for phase in payload.phases:
        if phase.phase_code not in STUDY_PHASE_CODES:
            raise CRUDValidationError(f"Invalid phase code: {phase.phase_code}")
        if phase.animal_cap <= 0:
            raise CRUDValidationError(f"Phase '{phase.phase_name}' must have animal cap greater than zero.")
        if not phase.groups:
            raise CRUDValidationError(f"Phase '{phase.phase_name}' must include at least one experimental group.")

        group_total = sum(group.animal_count for group in phase.groups)
        if group_total != phase.animal_cap:
            raise CRUDValidationError(
                f"Phase '{phase.phase_name}': group animal counts ({group_total}) "
                f"must equal phase animal cap ({phase.animal_cap})."
            )

        for group in phase.groups:
            if group.role not in GROUP_ROLES:
                raise CRUDValidationError(f"Invalid group role '{group.role}' in phase '{phase.phase_name}'.")
            _validate_species_strain(db, group.species_id, group.strain_id)

            fate_total = sum(fate.count for fate in group.fates)
            if fate_total != group.animal_count:
                raise CRUDValidationError(
                    f"Group '{group.group_name}': fate counts ({fate_total}) "
                    f"must equal group animal count ({group.animal_count})."
                )
            for fate in group.fates:
                if fate.fate_type not in FATE_TYPES:
                    raise CRUDValidationError(
                        f"Invalid fate type '{fate.fate_type}' in group '{group.group_name}'."
                    )

            for endpoint in group.endpoints:
                if endpoint.schedule_type not in SCHEDULE_TYPES:
                    raise CRUDValidationError(
                        f"Invalid schedule type '{endpoint.schedule_type}' in group '{group.group_name}'."
                    )

        phase_total += phase.animal_cap

    step3_total = _get_form_b_animal_total(db, form_b_id)
    if step3_total is not None and phase_total > step3_total:
        raise CRUDValidationError(
            f"Study plan requires {phase_total} animals across phases but "
            f"Step 3 requests only {step3_total}. Adjust phases or animal requirements."
        )

    sequence_orders = {phase.sequence_order for phase in payload.phases}
    order_to_depends = {
        phase.sequence_order: phase.depends_on_sequence_order for phase in payload.phases
    }
    for sequence_order, depends_on in order_to_depends.items():
        if depends_on is None:
            continue
        if depends_on >= sequence_order:
            raise CRUDValidationError(
                "A phase can only depend on an earlier phase (lower sequence order)."
            )
        if depends_on not in sequence_orders:
            raise CRUDValidationError(
                f"Phase order {sequence_order} depends on missing phase order {depends_on}."
            )


def _delete_existing_phases(db: Session, form_b_id: int) -> None:
    existing = (
        db.query(FormBStudyPhase)
        .filter(FormBStudyPhase.form_b_id == form_b_id)
        .all()
    )
    for phase in existing:
        db.delete(phase)
    db.flush()


def save_study_plan(db: Session, user: User, payload: FormBStudyPlanSave) -> dict:
    form_b = get_editable_form_b(db, user, payload.form_b_id)
    validate_study_plan_payload(db, form_b.id, payload)
    _delete_existing_phases(db, form_b.id)

    phase_by_sequence: dict[int, FormBStudyPhase] = {}
    for phase_entry in sorted(payload.phases, key=lambda item: item.sequence_order):
        phase = FormBStudyPhase(
            form_b_id=form_b.id,
            phase_code=phase_entry.phase_code,
            phase_name=phase_entry.phase_name.strip(),
            sequence_order=phase_entry.sequence_order,
            objective=(phase_entry.objective or "").strip() or None,
            planned_start_date=phase_entry.planned_start_date,
            planned_duration_weeks=phase_entry.planned_duration_weeks,
            animal_cap=phase_entry.animal_cap,
            contingency_note=(phase_entry.contingency_note or "").strip() or None,
            reuse_animals_allowed=phase_entry.reuse_animals_allowed,
        )
        db.add(phase)
        db.flush()
        phase_by_sequence[phase_entry.sequence_order] = phase

        for group_entry in phase_entry.groups:
            group = FormBStudyGroup(
                phase_id=phase.id,
                group_code=group_entry.group_code.strip(),
                group_name=group_entry.group_name.strip(),
                role=group_entry.role,
                animal_count=group_entry.animal_count,
                species_id=group_entry.species_id,
                strain_id=group_entry.strain_id,
                sex=(group_entry.sex or "").strip() or None,
                age=(group_entry.age or "").strip() or None,
                weight_range=(group_entry.weight_range or "").strip() or None,
                feeding_diet=(group_entry.feeding_diet or "").strip() or None,
                housing_notes=(group_entry.housing_notes or "").strip() or None,
                treatment_summary=(group_entry.treatment_summary or "").strip() or None,
            )
            db.add(group)
            db.flush()

            for dosing_entry in group_entry.dosing:
                db.add(
                    FormBGroupDosing(
                        study_group_id=group.id,
                        agent_name=dosing_entry.agent_name.strip(),
                        dose=dosing_entry.dose.strip(),
                        route=(dosing_entry.route or "").strip(),
                        frequency=(dosing_entry.frequency or "").strip(),
                        start_day=dosing_entry.start_day,
                        end_day=dosing_entry.end_day,
                        volume=(dosing_entry.volume or "").strip() or None,
                        notes=(dosing_entry.notes or "").strip() or None,
                    )
                )

            for endpoint_entry in group_entry.endpoints:
                db.add(
                    FormBGroupEndpoint(
                        study_group_id=group.id,
                        parameter_code=endpoint_entry.parameter_code.strip(),
                        parameter_name=endpoint_entry.parameter_name.strip(),
                        schedule_type=endpoint_entry.schedule_type,
                        schedule_detail=endpoint_entry.schedule_detail.strip(),
                        method=(endpoint_entry.method or "").strip() or None,
                        notes=(endpoint_entry.notes or "").strip() or None,
                    )
                )

            for fate_entry in group_entry.fates:
                db.add(
                    FormBGroupFate(
                        study_group_id=group.id,
                        fate_type=fate_entry.fate_type,
                        count=fate_entry.count,
                        method_or_destination=(fate_entry.method_or_destination or "").strip() or None,
                        timing=(fate_entry.timing or "").strip() or None,
                    )
                )

    for phase_entry in payload.phases:
        if phase_entry.depends_on_sequence_order is None:
            continue
        phase = phase_by_sequence[phase_entry.sequence_order]
        depends_on = phase_by_sequence.get(phase_entry.depends_on_sequence_order)
        if depends_on is not None:
            phase.depends_on_phase_id = depends_on.id

    application_data = dict(form_b.application_data or {})
    application_data[STEP2B_KEY] = {
        "completed": True,
        "design_rationale": (payload.design_rationale or "").strip(),
        "phase_count": len(payload.phases),
        "total_animals": sum(phase.animal_cap for phase in payload.phases),
    }
    form_b.application_data = application_data

    db.commit()
    db.refresh(form_b)
    return get_study_plan(db, user, form_b.id)


def has_complete_study_plan(db: Session, form_b_id: int) -> bool:
    try:
        validate_study_plan_exists(db, form_b_id)
        return True
    except CRUDValidationError:
        return False


def validate_study_plan_exists(db: Session, form_b_id: int) -> None:
    form_b = db.query(FormB).filter(FormB.id == form_b_id).first()
    if form_b is None:
        raise CRUDValidationError("Form B not found.")

    phases = (
        db.query(FormBStudyPhase)
        .options(
            joinedload(FormBStudyPhase.groups).joinedload(FormBStudyGroup.fates),
            joinedload(FormBStudyPhase.groups).joinedload(FormBStudyGroup.dosing_entries),
            joinedload(FormBStudyPhase.groups).joinedload(FormBStudyGroup.endpoints),
        )
        .filter(FormBStudyPhase.form_b_id == form_b_id)
        .order_by(FormBStudyPhase.sequence_order.asc())
        .all()
    )
    if not phases:
        raise CRUDValidationError(
            "Complete the experimental study plan (Annexure I) before continuing."
        )

    application_data = form_b.application_data or {}
    step2b = application_data.get(STEP2B_KEY) or {}
    design_rationale = (step2b.get("design_rationale") or "").strip()
    if not design_rationale:
        raise CRUDValidationError(
            "Complete the experimental study plan (Annexure I) before continuing."
        )

    payload_phases = []
    from schemas.schemas_formb_study_plan import (
        FormBGroupDosingEntry,
        FormBGroupEndpointEntry,
        FormBGroupFateEntry,
        FormBStudyGroupEntry,
        FormBStudyPhaseEntry,
        FormBStudyPlanSave,
    )

    for phase in phases:
        depends_on_sequence = None
        if phase.depends_on_phase_id is not None:
            parent = next((p for p in phases if p.id == phase.depends_on_phase_id), None)
            if parent is not None:
                depends_on_sequence = parent.sequence_order

        payload_phases.append(
            FormBStudyPhaseEntry(
                phase_code=phase.phase_code,
                phase_name=phase.phase_name,
                sequence_order=phase.sequence_order,
                objective=phase.objective,
                planned_start_date=phase.planned_start_date,
                planned_duration_weeks=phase.planned_duration_weeks,
                animal_cap=phase.animal_cap,
                contingency_note=phase.contingency_note,
                depends_on_sequence_order=depends_on_sequence,
                reuse_animals_allowed=phase.reuse_animals_allowed,
                groups=[
                    FormBStudyGroupEntry(
                        group_code=group.group_code,
                        group_name=group.group_name,
                        role=group.role,
                        animal_count=group.animal_count,
                        species_id=group.species_id,
                        strain_id=group.strain_id,
                        sex=group.sex,
                        age=group.age,
                        weight_range=group.weight_range,
                        feeding_diet=group.feeding_diet,
                        housing_notes=group.housing_notes,
                        treatment_summary=group.treatment_summary,
                        dosing=[
                            FormBGroupDosingEntry(
                                agent_name=row.agent_name,
                                dose=row.dose,
                                route=row.route,
                                frequency=row.frequency,
                                start_day=row.start_day,
                                end_day=row.end_day,
                                volume=row.volume,
                                notes=row.notes,
                            )
                            for row in group.dosing_entries
                        ],
                        endpoints=[
                            FormBGroupEndpointEntry(
                                parameter_code=row.parameter_code,
                                parameter_name=row.parameter_name,
                                schedule_type=row.schedule_type,
                                schedule_detail=row.schedule_detail,
                                method=row.method,
                                notes=row.notes,
                            )
                            for row in group.endpoints
                        ],
                        fates=[
                            FormBGroupFateEntry(
                                fate_type=fate.fate_type,
                                count=fate.count,
                                method_or_destination=fate.method_or_destination,
                                timing=fate.timing,
                            )
                            for fate in group.fates
                        ],
                    )
                    for group in phase.groups
                ],
            )
        )

    validate_study_plan_payload(
        db,
        form_b_id,
        FormBStudyPlanSave(
            form_b_id=form_b_id,
            design_rationale=design_rationale,
            phases=payload_phases,
        ),
    )


def sync_experiment_groups_from_study_plan(db: Session, project_id: int) -> int:
    form_b = db.query(FormB).filter(FormB.project_id == project_id).first()
    if form_b is None:
        return 0

    phases = (
        db.query(FormBStudyPhase)
        .options(joinedload(FormBStudyPhase.groups))
        .filter(FormBStudyPhase.form_b_id == form_b.id)
        .order_by(FormBStudyPhase.sequence_order.asc())
        .all()
    )
    if not phases:
        return 0

    created = 0
    for phase in phases:
        for group in phase.groups:
            existing = (
                db.query(ExperimentGroup)
                .filter(
                    ExperimentGroup.project_id == project_id,
                    ExperimentGroup.form_b_study_group_id == group.id,
                )
                .first()
            )
            if existing is not None:
                existing.name = f"{phase.phase_name} – {group.group_name}"
                existing.planned_animal_count = group.animal_count
                continue

            db.add(
                ExperimentGroup(
                    project_id=project_id,
                    name=f"{phase.phase_name} – {group.group_name}",
                    planned_animal_count=group.animal_count,
                    form_b_study_group_id=group.id,
                )
            )
            created += 1

    db.flush()
    return created


def load_study_plan_for_pdf(db: Session, form_b_id: int) -> dict:
    form_b = db.query(FormB).filter(FormB.id == form_b_id).first()
    if form_b is None:
        raise CRUDValidationError("Form B not found")

    project = db.query(IAECProject).filter(IAECProject.id == form_b.project_id).first()
    phases = (
        db.query(FormBStudyPhase)
        .options(
            joinedload(FormBStudyPhase.groups).joinedload(FormBStudyGroup.species),
            joinedload(FormBStudyPhase.groups).joinedload(FormBStudyGroup.strain),
            joinedload(FormBStudyPhase.groups).joinedload(FormBStudyGroup.dosing_entries),
            joinedload(FormBStudyPhase.groups).joinedload(FormBStudyGroup.endpoints),
            joinedload(FormBStudyPhase.groups).joinedload(FormBStudyGroup.fates),
        )
        .filter(FormBStudyPhase.form_b_id == form_b.id)
        .order_by(FormBStudyPhase.sequence_order.asc())
        .all()
    )
    application_data = form_b.application_data or {}
    step2 = application_data.get("step2") or {}
    step2b = application_data.get(STEP2B_KEY) or {}
    return {
        "project_title": project.title if project else "",
        "principal_investigator": project.principal_investigator if project else "",
        "proposed_start_date": step2.get("proposed_start_date"),
        "proposed_completion_date": step2.get("proposed_completion_date"),
        "design_rationale": step2b.get("design_rationale") or "",
        "phases": [_phase_to_dict(phase) for phase in phases],
        "total_animals": sum(phase.animal_cap for phase in phases),
    }
