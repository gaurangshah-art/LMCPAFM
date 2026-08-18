from __future__ import annotations

import re

from fpdf import FPDF
from sqlalchemy.orm import Session

from crud.exceptions import CRUDNotFoundError
from crud.formb_study_plan import load_study_plan_for_pdf
from database.lmcpafm_models import (
    FormB,
    FormBInvestigator,
    IAECProject,
)
from utils.date_format import format_display_date
from utils.pdf_branding import BrandedPDF, _safe_text

FORM_B_TITLE = (
    "Form B (per rule 8(a)* for Submission of Research Protocol (s) "
    "Application for Permission for Animal Experiments"
)
FORM_B_SUBTITLE = (
    "Application to be submitted to the CPCSEA, New Delhi after approval of "
    "Institutional Animal Ethics Committee (IAEC)"
)
SECTION_II_INTRO = (
    "Protocol form for research proposals to be submitted to the Institutional "
    "Animal Ethics Committee/ CPCSEA, for new experiments or extensions of ongoing "
    "experiments using animals."
)

DECLARATION_LABELS = {
    "declaration_not_duplicative": (
        "I certify that the research proposal submitted is not unnecessarily "
        "duplicative of previously reported research."
    ),
    "declaration_qualified": (
        "I certify that, I am qualified and have experience in the experimentation on animals."
    ),
    "declaration_no_alternative": (
        "For procedures listed under item 10, I certify that I have reviewed the pertinent "
        "scientific literature and have found no valid alternative to any procedure described "
        "herein which may cause less pain or distress."
    ),
    "declaration_iaec_approval_for_changes": (
        "I will obtain approval from the IAEC/ CPCSEA before initiating any changes in this study."
    ),
    "declaration_scientific_review": (
        "I certify that performance of experiment will be initiated only upon review and approval "
        "of scientific intent by appropriate expert body (Institutional Scientific Advisory "
        "Committee / funding agency / other body)."
    ),
    "declaration_hazardous_certificates": (
        "I certify that I will submit appropriate certification of review and concurrence for "
        "studies mentioned in point 14."
    ),
    "declaration_form_d_records": (
        "I shall maintain all the records as per format (Form D) and submit to Institutional "
        "Animal Ethics Committee (IAEC)."
    ),
    "declaration_no_start_before_approval": (
        "I certify that, I will not initiate the study before approval from IAEC/ CPCSEA received "
        "in writing. Further, I certify that I will follow the recommendations of IAEC/ CPCSEA."
    ),
    "declaration_rehabilitation": (
        "I certify that I will ensure the rehabilitation policies are adopted (wherever required)."
    ),
}


class _FormBPDF(BrandedPDF):
    def header(self):
        super().header()
        self.set_font("Helvetica", "B", 9)
        self.cell(0, 5, "LMCP Institutional Animal Ethics Committee", ln=True, align="C")
        self.ln(1)


def _d(value, fallback: str = "-") -> str:
    if value is None:
        return fallback
    text = str(value).strip()
    return text if text else fallback


def _date(value, fallback: str = "-") -> str:
    formatted = format_display_date(value, fallback=fallback)
    return formatted if formatted != "—" else fallback


def _compact_text(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def _name_address_display(name: str | None, address: str | None) -> str:
    name_text = (name or "").strip()
    address_text = (address or "").strip()
    if not address_text:
        return name_text or "-"
    if not name_text:
        return address_text
    compact_address = _compact_text(address_text)
    for candidate in (name_text, name_text.split(",")[0].strip()):
        compact_candidate = _compact_text(candidate)
        if compact_candidate and compact_candidate in compact_address:
            return address_text
    return f"{name_text}\n{address_text}"


def _format_breeder_details(name: str | None, address: str | None, reg_no: str | None) -> str:
    body = _name_address_display(name, address)
    reg = (reg_no or "").strip()
    if reg and reg != "-":
        return f"{body}\nReg. No.: {reg}"
    return body


def _ensure_space(pdf: FPDF, height: float = 12) -> None:
    if pdf.get_y() + height > pdf.page_break_trigger:
        pdf.add_page()


def _write_paragraph(pdf: FPDF, text: str, *, bold: bool = False, size: int = 9) -> None:
    _ensure_space(pdf, 8)
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "B" if bold else "", size)
    pdf.multi_cell(pdf.epw, 4.5, _safe_text(text))


def _count_wrapped_lines(
    pdf: FPDF,
    width: float,
    text: str,
    *,
    line_height: float,
    font_size: int,
) -> int:
    pdf.set_font("Helvetica", "", font_size)
    lines = pdf.multi_cell(
        width,
        line_height,
        _safe_text(text),
        dry_run=True,
        output="LINES",
    )
    return max(len(lines), 1)


def _estimate_section_i_table_height(
    pdf: FPDF,
    rows: list[tuple[str, str]],
    *,
    label_width: float,
    value_width: float,
    font_size: int,
    line_height: float,
    cell_padding_h: float,
    cell_padding_v: float,
) -> float:
    total = 0.0
    label_text_width = label_width - (cell_padding_h * 2)
    value_text_width = value_width - (cell_padding_h * 2)
    for label, value in rows:
        label_lines = _count_wrapped_lines(
            pdf, label_text_width, label, line_height=line_height, font_size=font_size
        )
        value_lines = _count_wrapped_lines(
            pdf, value_text_width, value, line_height=line_height, font_size=font_size
        )
        content_lines = max(label_lines, value_lines)
        total += (content_lines * line_height) + (cell_padding_v * 2)
    return total


def _write_section_i_table(pdf: FPDF, rows: list[tuple[str, str]]) -> None:
    label_width = pdf.epw * 0.42
    value_width = pdf.epw - label_width
    line_height = 5.5
    font_size = 8
    cell_padding_h = 3.0
    cell_padding_v = 5.0
    label_text_width = label_width - (cell_padding_h * 2)
    value_text_width = value_width - (cell_padding_h * 2)

    estimated_height = _estimate_section_i_table_height(
        pdf,
        rows,
        label_width=label_width,
        value_width=value_width,
        font_size=font_size,
        line_height=line_height,
        cell_padding_h=cell_padding_h,
        cell_padding_v=cell_padding_v,
    )
    _ensure_space(pdf, estimated_height + 2)

    table_top = pdf.get_y()
    x_start = pdf.l_margin
    row_bounds: list[tuple[float, float]] = []
    y_cursor = table_top

    for label, value in rows:
        row_top = y_cursor
        text_top = row_top + cell_padding_v

        pdf.set_font("Helvetica", "", font_size)
        pdf.set_xy(x_start + cell_padding_h, text_top)
        pdf.multi_cell(label_text_width, line_height, _safe_text(label), border=0)
        label_bottom = pdf.get_y()

        pdf.set_xy(x_start + label_width + cell_padding_h, text_top)
        pdf.multi_cell(value_text_width, line_height, _safe_text(value), border=0)
        value_bottom = pdf.get_y()

        row_bottom = max(label_bottom, value_bottom) + cell_padding_v
        row_bounds.append((row_top, row_bottom))
        y_cursor = row_bottom

    table_height = y_cursor - table_top
    pdf.rect(x_start, table_top, pdf.epw, table_height)
    for index, (row_top, row_bottom) in enumerate(row_bounds):
        if index > 0:
            pdf.line(x_start, row_top, x_start + pdf.epw, row_top)
        pdf.line(x_start + label_width, row_top, x_start + label_width, row_bottom)

    pdf.set_y(y_cursor)


def _write_numbered_block(
    pdf: FPDF,
    number: str,
    title: str,
    lines: list[str],
) -> None:
    _ensure_space(pdf, 10)
    pdf.ln(1)
    _write_paragraph(pdf, f"{number}. {title}", bold=True)
    for line in lines:
        if line.strip():
            _write_paragraph(pdf, f"   {line}")


def _write_sub_items(pdf: FPDF, items: list[tuple[str, str]]) -> None:
    for label, value in items:
        _write_paragraph(pdf, f"   {label}: {_d(value)}")


def _format_year_wise_breakup(entries: list[dict]) -> str:
    if not entries:
        return "-"
    parts = [f"{entry.get('year', '-')}: {entry.get('count', 0)}" for entry in entries]
    total = sum(int(entry.get("count") or 0) for entry in entries)
    return f"{'; '.join(parts)} (Total: {total})"


def _format_requirement_row(req: dict) -> list[str]:
    return [
        f"Species and Strain: {_d(req.get('species'))} / {_d(req.get('strain'))}",
        f"Age and Weight: {_d(req.get('age'))} / {_d(req.get('weight'))}",
        f"Gender: {_d(req.get('sex'))}",
        f"Number to be used (year-wise): {_format_year_wise_breakup(req.get('year_wise_breakup') or [])}",
        f"Number of days each animal will be housed: {_d(req.get('days_housed'))}",
        f"Source: {_d(req.get('source'))}",
        f"Breeder: {_d(req.get('breeder_name'))}; {_d(req.get('breeder_address'))}; "
        f"Reg. No.: {_d(req.get('breeder_registration_number'))}",
        f"Justification for number: {_d(req.get('justification'))}",
    ]


def _load_application_context(db: Session, project_id: int) -> dict:
    project = db.query(IAECProject).filter(IAECProject.id == project_id).first()
    if project is None:
        raise CRUDNotFoundError("Project not found")

    form_b = db.query(FormB).filter(FormB.project_id == project_id).first()
    if form_b is None:
        raise CRUDNotFoundError("Form B not found for project")

    application_data = form_b.application_data or {}
    step1 = application_data.get("step1") or {}
    step2 = application_data.get("step2") or {}
    step2b = application_data.get("step2b") or {}
    step3 = application_data.get("step3") or {}
    step4 = application_data.get("step4") or {}
    step5 = application_data.get("step5") or {}
    step6 = application_data.get("step6") or {}
    step7 = application_data.get("step7") or {}

    investigators = (
        db.query(FormBInvestigator)
        .filter(FormBInvestigator.form_b_id == form_b.id)
        .order_by(FormBInvestigator.id.asc())
        .all()
    )
    co_investigators = [
        {"name": row.name, "role": row.project_role, "type": row.investigator_type or "-"}
        for row in investigators
        if row.project_role.lower() not in {"principal_investigator", "principal investigator"}
    ]

    study_plan = None
    try:
        study_plan = load_study_plan_for_pdf(db, form_b.id)
    except Exception:
        study_plan = None

    return {
        "project": project,
        "form_b": form_b,
        "step1": step1,
        "step2": step2,
        "step2b": step2b,
        "step3": step3,
        "step4": step4,
        "step5": step5,
        "step6": step6,
        "step7": step7,
        "co_investigators": co_investigators,
        "study_plan": study_plan,
    }


def _render_section_i(pdf: _FormBPDF, ctx: dict) -> None:
    step1 = ctx["step1"]
    step2 = ctx["step2"]
    animal_rationale = (ctx["step2b"].get("animal_rationale") or {})
    _write_paragraph(pdf, "Section -I", bold=True, size=10)
    pdf.ln(1)

    rows = [
        (
            "1. Name and address of establishment",
            _name_address_display(step1.get("establishment_name"), step1.get("establishment_address")),
        ),
        (
            "2. Registration number and date of registration.",
            f"{_d(step1.get('registration_number'))}\n{_date(step1.get('registration_date'))}",
        ),
        (
            "3. Name, address and registration number of breeder from which animals acquired "
            "(or to be acquired) for experiments mentioned in parts B & C",
            _format_breeder_details(
                animal_rationale.get("breeder_name"),
                animal_rationale.get("breeder_address"),
                animal_rationale.get("breeder_registration_number"),
            ),
        ),
        (
            "4. Place where the animals are presently kept (or proposed to be kept).",
            _d(step1.get("animal_housing_location")),
        ),
        (
            "5. Place where the experiment is to be performed (Please provide CPCSEA Reg. Number)",
            _d(step1.get("experiment_location")),
        ),
        (
            "6. Date and Duration of experiment.",
            f"From: {_date(step2.get('proposed_start_date'))}  To: {_date(step2.get('proposed_completion_date'))}\n"
            f"Duration: {_d(step2.get('duration_months'))} month(s)",
        ),
    ]
    _write_section_i_table(pdf, rows)

    research_type = _d(step1.get("research_type"))
    _write_paragraph(
        pdf,
        f"Type of research involved (Basic Research / Educational/ Regulatory/ Contract Research): {research_type}",
    )
    pdf.ln(2)
    _write_paragraph(pdf, "Signature", bold=True)
    _write_paragraph(
        pdf,
        f"Name and Designation of Investigator: {_d(step1.get('principal_investigator'))}, "
        f"{_d(step1.get('designation'))}",
    )
    _write_paragraph(
        pdf,
        f"Date: {_date((ctx['step7'] or {}).get('declaration_date'))}    "
        f"Place: {_d((ctx['step7'] or {}).get('declaration_place'))}",
    )


def _render_section_ii(pdf: _FormBPDF, ctx: dict) -> None:
    step1 = ctx["step1"]
    step2 = ctx["step2"]
    step2b = ctx["step2b"]
    step3 = ctx["step3"]
    step4 = ctx["step4"]
    step5 = ctx["step5"]
    step6 = ctx["step6"]
    step7 = ctx["step7"]
    animal_rationale = step2b.get("animal_rationale") or step3

    pdf.add_page()
    _write_paragraph(pdf, "Section -II", bold=True, size=10)
    _write_paragraph(pdf, SECTION_II_INTRO)
    pdf.ln(1)

    _write_numbered_block(pdf, "1", "Project / Dissertation / Thesis Title:", [_d(step2.get("title"))])

    pi_lines = [
        f"a. Name: {_d(step1.get('principal_investigator'))}",
        f"b. Designation: {_d(step1.get('designation'))}",
        f"c. Dept / Div/ Lab: {_d(step1.get('department'))}",
        f"d. Telephone No.: {_d(step1.get('contact_phone'))}",
        f"e. E-mail Id: {_d(step1.get('contact_email'))}",
        f"f. Experience in Lab animal experimentation: {_d(step1.get('experience'))}",
        f"Qualifications: {_d(step1.get('qualifications'))}",
    ]
    _write_numbered_block(
        pdf,
        "2",
        "Principal Investigator / Research Guide / Advisor:",
        pi_lines,
    )
    if ctx["co_investigators"]:
        co_lines = [
            f"- {row['name']} ({row['role']}, {row['type']})" for row in ctx["co_investigators"]
        ]
        _write_paragraph(pdf, "   Co-investigators / co-guides:")
        for line in co_lines:
            _write_paragraph(pdf, f"   {line}")

    personnel = step6.get("authorized_personnel") or []
    personnel_lines = []
    for index, person in enumerate(personnel, start=1):
        personnel_lines.extend(
            [
                f"Person {index}:",
                f"  a. Name: {_d(person.get('name'))}",
                f"  b. Designation: {_d(person.get('designation'))}",
                f"  c. Department: {_d(person.get('department'))}",
                f"  d. Telephone No.: {_d(person.get('telephone'))}",
                f"  e. E-mail Id: {_d(person.get('email'))}",
                f"  f. Experience in Lab animal experimentation: {_d(person.get('experience'))}",
            ]
        )
    if step6.get("training_level") or step6.get("training_details") or step6.get("competency_certification"):
        personnel_lines.extend(
            [
                f"Training level: {_d(step6.get('training_level'))}",
                f"Training details: {_d(step6.get('training_details'))}",
                f"Competency certification: {_d(step6.get('competency_certification'))}",
            ]
        )
    _write_numbered_block(
        pdf,
        "3",
        "List of all individuals authorized to conduct procedures under this proposal.",
        personnel_lines or ["-"],
    )

    funding_refs = step2.get("funding_proof_references") or []
    if isinstance(funding_refs, list):
        funding_proof = "; ".join(str(item) for item in funding_refs if item)
    else:
        funding_proof = _d(step2.get("funding_proof_reference"))
    _write_numbered_block(
        pdf,
        "4",
        "Funding Source / Proposed Funding Source with complete address (Please attach the proof)",
        [
            f"{_d(step2.get('funding_agency'))}\n{_d(step2.get('funding_address'))}",
            f"Funding proof reference(s): {_d(funding_proof)}",
        ],
    )

    _write_numbered_block(
        pdf,
        "5",
        "Duration of the animal experiment.",
        [
            f"a. Date of initiation (Proposed): {_date(step2.get('proposed_start_date'))}",
            f"b. Date of completion (Proposed): {_date(step2.get('proposed_completion_date'))}",
            f"Duration (months): {_d(step2.get('duration_months'))}",
        ],
    )

    study_plan_lines = [
        f"Summary: {_d(step2.get('summary'))}",
        f"Objectives: {_d(step2.get('objectives'))}",
        f"Expected outcomes: {_d(step2.get('expected_outcomes'))}",
        f"Design rationale: {_d(step2b.get('design_rationale'))}",
        f"Annexure reference: {_d(step2.get('study_plan_annexure_reference'))}",
        "Detailed experimental study plan is enclosed as Annexure I.",
    ]
    if ctx["study_plan"]:
        study_plan_lines.append(
            f"Total animals across phases (Annexure I): {ctx['study_plan'].get('total_animals', '-')}"
        )
    _write_numbered_block(
        pdf,
        "6",
        "Describe details of study plan to justify the use of animals (Enclose Annexure)",
        study_plan_lines,
    )

    requirements = step3.get("requirements") or []
    animal_lines: list[str] = []
    for index, req in enumerate(requirements, start=1):
        animal_lines.append(f"Requirement {index}:")
        animal_lines.extend(_format_requirement_row(req))
    _write_numbered_block(pdf, "7", "Animals required", animal_lines or ["-"])

    rationale_items = [
        ("a. Why is animal usage necessary for these studies?", animal_rationale.get("why_animal_necessary")),
        (
            "b. Whether similar study has been conducted on in vitro models? If yes, describe the leading points "
            "to justify the requirement of animal experiment.",
            animal_rationale.get("in_vitro_study_details"),
        ),
        ("c. Why are the particular species selected?", animal_rationale.get("why_species_selected")),
        ("d. Why is the estimated number of animals essential?", animal_rationale.get("why_number_essential")),
        (
            "e. Are similar experiments conducted in the past in your establishment?",
            animal_rationale.get("similar_experiments_in_establishment"),
        ),
        (
            "f. If yes, justify why new experiment is required?",
            animal_rationale.get("justify_new_experiment"),
        ),
        (
            "g. Have similar experiments been conducted by any other organization in same or other in vivo models? "
            "If yes, enclose the reference.",
            animal_rationale.get("similar_experiments_elsewhere"),
        ),
    ]
    _write_numbered_block(pdf, "8", "Rationale for animal usage", [])
    _write_sub_items(pdf, rationale_items)

    procedure_items = [
        (
            "a. Describe all invasive and potentially stressful non-invasive procedures that animals will be "
            "subjected to in the course of the experiments",
            step4.get("procedure_description"),
        ),
        (
            "b. Furnish details of injections schedule — Substances / Doses / Sites / Volumes",
            f"Substances: {_d(step4.get('injection_substances'))}; Doses: {_d(step4.get('injection_doses'))}; "
            f"Sites: {_d(step4.get('injection_sites'))}; Volumes: {_d(step4.get('injection_volumes'))}",
        ),
        (
            "c. Blood withdrawal Details — Volumes / Sites",
            f"Volumes: {_d(step4.get('blood_withdrawal_volumes'))}; Sites: {_d(step4.get('blood_withdrawal_sites'))}",
        ),
        ("d. Radiation (dosage and schedules)", step4.get("radiation_dosage_schedule")),
        (
            "e. Nature of compound/Broad Classification of drug/NCE",
            step4.get("compound_nce_details"),
        ),
        (f"Pain category: {_d(step4.get('pain_category'))}", ""),
        (f"Anaesthesia: {_d(step4.get('anaesthesia'))}; Analgesia: {_d(step4.get('analgesia'))}", ""),
        (f"3Rs alternatives considered: {_d(step4.get('alternatives_considered'))}", ""),
        (f"3Rs rationale: {_d(step4.get('rationale_3rs'))}", ""),
    ]
    _write_numbered_block(pdf, "9", "Describe the procedures in detail:", [])
    _write_sub_items(pdf, [(label, _d(value, "")) for label, value in procedure_items if label])

    _write_numbered_block(
        pdf,
        "10",
        "Does the protocol prohibit use of anesthetic or analgesic for the conduct of painful procedures? "
        "If yes, justify.",
        [
            f"Answer: {_d(step4.get('prohibit_analgesic_anesthetic'))}",
            f"Justification: {_d(step4.get('prohibit_analgesic_justification'))}",
        ],
    )

    surgery_lines = [f"Answer: {_d(step4.get('survival_surgery'))}"]
    if _d(step4.get("survival_surgery")) == "Yes":
        surgery_lines.extend(
            [
                f"a. List and describe all surgical procedures (including methods of asepsis): "
                f"{_d(step4.get('surgical_procedures'))}",
                f"b. Names, qualifications and experience levels of personnels involved: "
                f"{_d(step4.get('surgical_personnel'))}",
                f"c. Describe post-operative care: {_d(step4.get('post_operative_care'))}",
                f"d. Justify if major survival surgery is to be performed more than once on a single animal: "
                f"{_d(step4.get('repeat_surgery_justification'))}",
            ]
        )
    _write_numbered_block(pdf, "11", "Will survival surgery be done?", surgery_lines)

    post_exp_lines = [
        f"a. Scope for Reuse: {_d(step5.get('scope_for_reuse'))}",
        f"b. Rehabilitation (Name and Address): {_d(step5.get('rehabilitation_details'))}",
        f"c. Describe method of Euthanasia (If required in the protocol): {_d(step4.get('euthanasia_method'))}",
        f"d. Method of carcass disposal after euthanasia: {_d(step5.get('carcass_disposal_method'))}",
        f"Housing conditions: {_d(step5.get('housing_conditions'))}; Special requirements: "
        f"{_d(step5.get('special_requirements'))}",
        f"Feeding: {_d(step5.get('feeding'))}; Environmental enrichment: {_d(step5.get('environmental_enrichment'))}",
    ]
    _write_numbered_block(pdf, "12", "Describe post-experimentation procedures.", post_exp_lines)

    _write_numbered_block(
        pdf,
        "13",
        "Describe animal transportation methods if extra-institutional transport is envisaged.",
        [_d(step5.get("animal_transportation_methods"))],
    )

    hazardous_lines = [f"Hazardous agents used: {_d(step7.get('hazardous_agents_used'))}"]
    if _d(step7.get("hazardous_agents_used")) == "Yes":
        hazardous_lines.append(f"Agent details: {_d(step7.get('hazardous_agent_details'))}")
    hazardous_lines.extend(
        [
            f"(a) Radionucleotides (AERB): {_d(step7.get('aerb_approval_reference'))}",
            f"(b) Microorganisms / Biological infectious Agents (IBSC): {_d(step7.get('ibsc_approval_reference'))}",
            f"(c) Recombinant DNA (RCGM): {_d(step7.get('rcgm_approval_reference'))}",
            f"(d) Any other Hazardous Chemical / Drugs: {_d(step7.get('other_hazardous_reference'))}",
            f"CPCSEA adherence: {_d(step7.get('cpcsea_adherence'))}",
            f"IAEC history: {_d(step7.get('iaec_history'))}",
            f"Safety measures: {_d(step7.get('safety_measures'))}",
            f"Humane endpoint criteria: {_d(step7.get('endpoint_criteria'))}",
        ]
    )
    _write_numbered_block(
        pdf,
        "14",
        "Use of hazardous agents (attach approval certificates where applicable).",
        hazardous_lines,
    )


def _render_declarations(pdf: _FormBPDF, ctx: dict) -> None:
    step7 = ctx["step7"]
    pdf.ln(2)
    _write_paragraph(pdf, "Investigator's declaration.", bold=True, size=10)
    for index, (key, label) in enumerate(DECLARATION_LABELS.items(), start=1):
        accepted = "Yes" if step7.get(key) else "No"
        _write_paragraph(pdf, f"{index}. [{accepted}] {label}")
    pdf.ln(2)
    _write_paragraph(pdf, f"Signature: {_d(step7.get('declaration_signature_name'))}")
    _write_paragraph(
        pdf,
        f"Name of Investigator: {_d(step7.get('declaration_signature_name'))}    "
        f"Date: {_date(step7.get('declaration_date'))}    Place: {_d(step7.get('declaration_place'))}",
    )


def render_cpcsea_form_b_application_pdf(db: Session, project_id: int) -> bytes:
    ctx = _load_application_context(db, project_id)
    pdf = _FormBPDF()
    pdf.set_margins(15, 38, 15)
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()
    _write_paragraph(pdf, FORM_B_TITLE, bold=True, size=11)
    _write_paragraph(pdf, FORM_B_SUBTITLE, size=9)
    protocol_number = (ctx["project"].protocol_number or "").strip()
    if protocol_number:
        pdf.ln(2)
        pdf.set_x(pdf.l_margin)
        pdf.set_font("Helvetica", "B", 14)
        pdf.cell(pdf.epw, 8, _safe_text(f"IAEC Protocol No.: {protocol_number}"), ln=True, align="C")
    pdf.ln(2)
    _render_section_i(pdf, ctx)
    _render_section_ii(pdf, ctx)
    _render_declarations(pdf, ctx)

    output = pdf.output()
    if isinstance(output, bytearray):
        return bytes(output)
    if isinstance(output, str):
        return output.encode("latin-1")
    return output
