"""Shared minimal valid Form B step payloads for tests."""

from utils.institution import DEFAULT_CPCSEA_REGISTRATION_NUMBER

STEP3_REQUIREMENT = {
    "species": "Rat",
    "strain": "Wistar",
    "sex": "Both",
    "age": "8-10 weeks",
    "weight": "200-250 g",
    "number_required": 20,
    "source": "In-house",
    "justification": "Required for study",
    "year_wise_breakup": [{"year": "2026", "count": 20}],
    "days_housed": 30,
    "breeder_name": "Institutional Animal House",
    "breeder_address": "LMCP, Ahmedabad",
    "breeder_registration_number": DEFAULT_CPCSEA_REGISTRATION_NUMBER,
}

STEP3_BODY = {
    "why_animal_necessary": "In vivo pharmacology required",
    "in_vitro_study_details": "Cell culture insufficient for endpoint",
    "why_species_selected": "Rat is standard model",
    "why_number_essential": "Power analysis for n=20",
    "similar_experiments_in_establishment": "None",
    "justify_new_experiment": "Novel compound",
    "similar_experiments_elsewhere": "Published rat pain models",
    "requirements": [STEP3_REQUIREMENT],
}

STEP4_BODY = {
    "procedure_description": "Behavioral testing",
    "injection_substances": "Test compound",
    "injection_doses": "10 mg/kg",
    "injection_sites": "i.p.",
    "injection_volumes": "1 ml/kg",
    "blood_withdrawal_volumes": "0.5 ml",
    "blood_withdrawal_sites": "Retro-orbital",
    "radiation_dosage_schedule": "Not applicable",
    "compound_nce_details": "Small molecule NCE",
    "pain_category": "B",
    "anaesthesia": "None",
    "analgesia": "Meloxicam",
    "prohibit_analgesic_anesthetic": "No",
    "prohibit_analgesic_justification": "",
    "survival_surgery": "No",
    "surgical_procedures": "",
    "surgical_personnel": "",
    "post_operative_care": "",
    "repeat_surgery_justification": "",
    "euthanasia_method": "CO2",
    "alternatives_considered": "Cell culture",
    "rationale_3rs": "Replacement not feasible",
}

STEP5_BODY = {
    "housing_conditions": "Standard cages",
    "special_requirements": "None",
    "feeding": "Standard chow",
    "environmental_enrichment": "Nesting material",
    "animal_transportation_methods": "Not applicable (in-house)",
    "scope_for_reuse": "None",
    "rehabilitation_details": "Not applicable",
    "carcass_disposal_method": "Bio-medical waste disposal",
}

STEP6_BODY = {
    "authorized_personnel": [
        {
            "name": "Alice",
            "designation": "Research Scholar",
            "department": "Pharmacology",
            "telephone": "9999999999",
            "email": "alice@lmcp.ac.in",
            "experience": "2 years rodent handling",
        }
    ],
    "training_level": "CPCSEA certified",
    "training_details": "Annual refresher",
    "competency_certification": "Yes",
}

STEP7_BODY = {
    "hazardous_agents_used": "No",
    "hazardous_agent_details": "",
    "aerb_approval_reference": "",
    "ibsc_approval_reference": "",
    "rcgm_approval_reference": "",
    "other_hazardous_reference": "",
    "cpcsea_adherence": "Yes",
    "iaec_history": "None",
    "safety_measures": "PPE and SOPs",
    "endpoint_criteria": "Humane endpoints defined",
    "declaration_not_duplicative": True,
    "declaration_qualified": True,
    "declaration_no_alternative": True,
    "declaration_iaec_approval_for_changes": True,
    "declaration_scientific_review": True,
    "declaration_hazardous_certificates": True,
    "declaration_form_d_records": True,
    "declaration_no_start_before_approval": True,
    "declaration_rehabilitation": True,
    "declaration_signature_name": "Dr. Test",
    "declaration_date": "2026-07-27",
    "declaration_place": "Ahmedabad",
}


def step1_body(form_b_id: int, payload: dict) -> dict:
    return {
        "form_b_id": form_b_id,
        "principal_investigator": payload["name"],
        "designation": "Assistant Professor",
        "department": "Pharmacology",
        "contact_email": payload["email"],
        "contact_phone": "9999999999",
        "qualifications": "PhD",
        "experience": "6 years",
        "research_type": "Basic Research",
    }


def step2_body(form_b_id: int) -> dict:
    return {
        "form_b_id": form_b_id,
        "title": "Pain study",
        "duration_months": 12,
        "proposed_start_date": "2026-08-01",
        "proposed_completion_date": "2027-07-31",
        "funding_agency": "DST",
        "funding_address": "Department of Science and Technology, New Delhi",
        "funding_proof_reference": "Sanction letter attached",
        "summary": "Study summary",
        "objectives": "Study objectives",
        "expected_outcomes": "Expected outcomes",
        "study_plan_annexure_reference": "Annexure I attached",
    }


def wizard_steps_after_step1(form_b_id: int) -> list[tuple[str, dict]]:
    return [
        ("/formb/step-2", step2_body(form_b_id)),
        ("/formb/step-3", {"form_b_id": form_b_id, **STEP3_BODY}),
        ("/formb/step-4", {"form_b_id": form_b_id, **STEP4_BODY}),
        ("/formb/step-5", {"form_b_id": form_b_id, **STEP5_BODY}),
        ("/formb/step-6", {"form_b_id": form_b_id, **STEP6_BODY}),
        ("/formb/step-7", {"form_b_id": form_b_id, **STEP7_BODY}),
    ]


def upload_required_form_b_attachments(client, headers, form_b_id: int) -> None:
    for category, filename in (
        ("funding_proof", "funding-proof.pdf"),
        ("study_plan_annexure", "study-plan.pdf"),
    ):
        res = client.post(
            f"/formb/{form_b_id}/attachments?category={category}",
            files={"file": (filename, b"%PDF-1.4 test content", "application/pdf")},
            headers=headers,
        )
        assert res.status_code == 200, res.text
