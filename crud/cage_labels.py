from __future__ import annotations

from io import BytesIO

from fpdf import FPDF
from sqlalchemy.orm import Session, joinedload

from crud.exceptions import CRUDNotFoundError, CRUDValidationError
from crud.formb_documents import _safe_text
from database.lmcpafm_models import Animal, Cage, ExperimentGroup, FacilityRoom, IAECProject

CAGE_LABEL_CATEGORIES = frozenset({"quarantine", "available", "rehabilitated", "experiment"})
EXPERIMENT_STATUSES = frozenset({"allocated", "in_experiment"})

CATEGORY_BANNERS = {
    "quarantine": "QUARANTINE",
    "available": "AVAILABLE FOR EXPERIMENTS",
    "rehabilitated": "REHABILITATED",
    "experiment": "EXPERIMENT GROUP",
}

MAX_ANIMALS_ON_LABEL = 8


def _pdf_bytes(pdf: FPDF) -> bytes:
    output = pdf.output()
    if isinstance(output, bytearray):
        return bytes(output)
    if isinstance(output, str):
        return output.encode("latin-1")
    return output


def _resolve_cage_category(animals: list[Animal]) -> str:
    if not animals:
        raise CRUDValidationError("Cage has no animals; cannot print a cage label.")

    group_ids = {animal.experiment_group_id for animal in animals}
    statuses = {animal.status for animal in animals}

    if len(statuses) > 1:
        raise CRUDValidationError(
            "Cage has mixed animal statuses. Move animals so each cage has one category before printing."
        )

    if len(group_ids) == 1 and None not in group_ids and statuses <= EXPERIMENT_STATUSES:
        return "experiment"

    if len(group_ids) > 1 or (None in group_ids and any(gid is not None for gid in group_ids)):
        raise CRUDValidationError(
            "Cage has mixed experiment group assignments. Assign all animals to the same group first."
        )

    category = next(iter(statuses))
    if category not in CAGE_LABEL_CATEGORIES:
        raise CRUDValidationError(
            f"Cage labels for status '{category}' are not supported yet. "
            "Supported categories: quarantine, available, rehabilitated, experiment (allocated/in_experiment with group)."
        )
    return category


def _species_strain_summary(animals: list[Animal]) -> tuple[str | None, str | None]:
    species_names = sorted({animal.species.name for animal in animals if animal.species and animal.species.name})
    strain_names = sorted({animal.strain.name for animal in animals if animal.strain and animal.strain.name})
    return (
        ", ".join(species_names) if species_names else None,
        ", ".join(strain_names) if strain_names else None,
    )


def _subtitle_for_category(category: str, animals: list[Animal], context: dict | None = None) -> str | None:
    if category == "experiment" and context:
        parts = [f"Group: {context.get('group_name') or '-'}"]
        if context.get("protocol_number"):
            parts.append(f"Protocol: {context['protocol_number']}")
        return "  |  ".join(parts)
    if category == "quarantine":
        starts = [animal.quarantine_start_date for animal in animals if animal.quarantine_start_date]
        if starts:
            earliest = min(starts)
            return f"Quarantine from {earliest.isoformat()}"
    if category == "rehabilitated":
        dates = [animal.rehabilitation_date for animal in animals if animal.rehabilitation_date]
        if dates:
            latest = max(dates)
            return f"Rehabilitated on {latest.isoformat()}"
    if category == "available":
        return "Ready for allocation to approved projects"
    return None


def _load_cage(db: Session, cage_id: int) -> Cage:
    cage = (
        db.query(Cage)
        .options(joinedload(Cage.room))
        .filter(Cage.id == cage_id)
        .first()
    )
    if cage is None:
        raise CRUDNotFoundError("Cage not found.")
    return cage


def _load_cage_animals(db: Session, cage_id: int) -> list[Animal]:
    return (
        db.query(Animal)
        .options(
            joinedload(Animal.species),
            joinedload(Animal.strain),
            joinedload(Animal.experiment_group).joinedload(ExperimentGroup.project),
        )
        .filter(Animal.cage_id == cage_id)
        .order_by(Animal.animal_number.asc(), Animal.id.asc())
        .all()
    )


def _experiment_context(animals: list[Animal]) -> dict:
    group = animals[0].experiment_group if animals else None
    project: IAECProject | None = group.project if group else None
    return {
        "group_id": group.id if group else None,
        "group_name": group.name if group else None,
        "protocol_number": project.protocol_number if project else None,
        "project_title": project.title if project else None,
    }


def build_cage_label_context(db: Session, cage_id: int) -> dict:
    cage = _load_cage(db, cage_id)
    animals = _load_cage_animals(db, cage_id)
    category = _resolve_cage_category(animals)
    species_summary, strain_summary = _species_strain_summary(animals)
    room_code = cage.room.code if cage.room else None
    experiment_meta = _experiment_context(animals) if category == "experiment" else {}
    banner = CATEGORY_BANNERS[category]
    if category == "experiment" and experiment_meta.get("group_name"):
        banner = f"EXPERIMENT: {experiment_meta['group_name']}"
    return {
        "cage_id": cage.id,
        "cage_label": cage.label,
        "room_code": room_code,
        "location": cage.location,
        "category": category,
        "banner_text": banner,
        "species_summary": species_summary,
        "strain_summary": strain_summary,
        "subtitle": _subtitle_for_category(category, animals, experiment_meta),
        "barcode_value": f"CAGE-{cage.id}",
        "group_id": experiment_meta.get("group_id"),
        "group_name": experiment_meta.get("group_name"),
        "protocol_number": experiment_meta.get("protocol_number"),
        "animals": [
            {
                "id": animal.id,
                "animal_number": animal.animal_number,
                "status": animal.status,
            }
            for animal in animals
        ],
    }


def list_cage_ids_for_category(
    db: Session,
    category: str,
    room_id: int | None = None,
) -> list[int]:
    normalized = (category or "").strip().lower()
    if normalized not in CAGE_LABEL_CATEGORIES:
        raise CRUDValidationError(
            "Category must be one of: quarantine, available, rehabilitated."
        )

    cage_query = db.query(Cage.id)
    if room_id is not None:
        if not db.query(FacilityRoom).filter(FacilityRoom.id == room_id).first():
            raise CRUDNotFoundError("Room not found.")
        cage_query = cage_query.filter(Cage.room_id == room_id)

    matching: list[int] = []
    for (cage_id,) in cage_query.order_by(Cage.id.asc()).all():
        animals = _load_cage_animals(db, cage_id)
        if not animals:
            continue
        statuses = {animal.status for animal in animals}
        if len(statuses) == 1 and normalized in statuses:
            matching.append(cage_id)
    return matching


def _render_cage_label_page(pdf: FPDF, context: dict) -> None:
    category = context["category"]
    banner_colors = {
        "quarantine": (255, 220, 170),
        "available": (200, 240, 200),
        "rehabilitated": (210, 225, 255),
        "experiment": (230, 210, 255),
    }
    fill = banner_colors.get(category, (230, 230, 230))

    pdf.add_page()
    pdf.set_fill_color(*fill)
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, _safe_text(context["banner_text"]), ln=True, align="C", fill=True)
    pdf.ln(1)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 7, _safe_text(f"Cage: {context['cage_label']}"), ln=True)
    pdf.set_font("Helvetica", "", 9)
    room_line = context["room_code"] or "Unassigned room"
    pdf.cell(0, 5, _safe_text(f"Room: {room_line}  |  Location: {context['location']}"), ln=True)
    if context.get("subtitle"):
        pdf.cell(0, 5, _safe_text(context["subtitle"]), ln=True)
    if context.get("species_summary") or context.get("strain_summary"):
        pdf.cell(
            0,
            5,
            _safe_text(
                f"Species: {context.get('species_summary') or '-'}  |  "
                f"Strain: {context.get('strain_summary') or '-'}"
            ),
            ln=True,
        )

    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(0, 5, "Animals:", ln=True)
    pdf.set_font("Helvetica", "", 8)
    animals = context["animals"]
    shown = animals[:MAX_ANIMALS_ON_LABEL]
    for animal in shown:
        number = animal["animal_number"] or f"ID-{animal['id']}"
        pdf.cell(0, 4, _safe_text(f"- {number}"), ln=True)
    remaining = len(animals) - len(shown)
    if remaining > 0:
        pdf.cell(0, 4, _safe_text(f"... and {remaining} more"), ln=True)

    try:
        from barcode import Code128
        from barcode.writer import ImageWriter

        buffer = BytesIO()
        Code128(context["barcode_value"], writer=ImageWriter()).write(
            buffer, options={"write_text": False}
        )
        buffer.seek(0)
        pdf.image(buffer, x=25, y=pdf.get_y() + 2, w=50, h=12)
        pdf.ln(14)
    except Exception:
        pdf.set_font("Courier", "", 9)
        pdf.cell(0, 6, _safe_text(context["barcode_value"]), ln=True, align="C")


def render_cage_label_pdf(db: Session, cage_id: int) -> bytes:
    context = build_cage_label_context(db, cage_id)
    pdf = FPDF(orientation="L", unit="mm", format=(100, 70))
    pdf.set_margin(4)
    _render_cage_label_page(pdf, context)
    return _pdf_bytes(pdf)


def render_bulk_cage_labels_pdf(
    db: Session,
    category: str,
    room_id: int | None = None,
) -> bytes:
    cage_ids = list_cage_ids_for_category(db, category, room_id=room_id)
    if not cage_ids:
        raise CRUDNotFoundError(f"No cages found for category '{category}'.")

    pdf = FPDF(orientation="L", unit="mm", format=(100, 70))
    pdf.set_margin(4)
    for cage_id in cage_ids:
        context = build_cage_label_context(db, cage_id)
        _render_cage_label_page(pdf, context)
    return _pdf_bytes(pdf)


def list_cage_ids_for_group(db: Session, group_id: int) -> list[int]:
    group = db.query(ExperimentGroup).filter(ExperimentGroup.id == group_id).first()
    if group is None:
        raise CRUDNotFoundError("Experiment group not found.")

    cage_ids = (
        db.query(Animal.cage_id)
        .filter(
            Animal.experiment_group_id == group_id,
            Animal.cage_id.isnot(None),
        )
        .distinct()
        .order_by(Animal.cage_id.asc())
        .all()
    )

    matching: list[int] = []
    for (cage_id,) in cage_ids:
        animals = _load_cage_animals(db, cage_id)
        if not animals:
            continue
        group_ids = {animal.experiment_group_id for animal in animals}
        if group_ids == {group_id}:
            matching.append(cage_id)
    return matching


def render_group_cage_labels_pdf(db: Session, group_id: int) -> bytes:
    cage_ids = list_cage_ids_for_group(db, group_id)
    if not cage_ids:
        raise CRUDNotFoundError("No cages found for this experiment group.")

    pdf = FPDF(orientation="L", unit="mm", format=(100, 70))
    pdf.set_margin(4)
    for cage_id in cage_ids:
        context = build_cage_label_context(db, cage_id)
        _render_cage_label_page(pdf, context)
    return _pdf_bytes(pdf)
