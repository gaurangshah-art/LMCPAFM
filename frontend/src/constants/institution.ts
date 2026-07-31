export const INSTITUTIONAL_DEFAULTS = {
  establishmentName: "L. M. College of Pharmacy, Ahmedabad",
  establishmentAddress:
    "L.M. College of Pharmacy, Navrangpura, Ahmedabad - 380009, Gujarat, India",
  registrationNumber: "228/PO/ReBi/S/2000/CPCSEA",
  registrationDate: "16th June, 2000",
  animalHousingLocation:
    "Institutional Animal House, L.M. College of Pharmacy, Ahmedabad - 380009",
  experimentLocation:
    "L.M. College of Pharmacy, Ahmedabad - 380009 (CPCSEA Reg. No. 228/PO/ReBi/S/2000/CPCSEA)",
} as const;

export const RESEARCH_TYPES = [
  "Basic Research",
  "Educational",
  "Regulatory",
  "Contract Research",
] as const;

export const FORM_B_DECLARATIONS = [
  "declaration_not_duplicative",
  "declaration_qualified",
  "declaration_no_alternative",
  "declaration_iaec_approval_for_changes",
  "declaration_scientific_review",
  "declaration_hazardous_certificates",
  "declaration_form_d_records",
  "declaration_no_start_before_approval",
  "declaration_rehabilitation",
] as const;

export type FormBDeclarationKey = (typeof FORM_B_DECLARATIONS)[number];

export const FORM_B_DECLARATION_LABELS: Record<FormBDeclarationKey, string> = {
  declaration_not_duplicative:
    "I certify that the research proposal submitted is not unnecessarily duplicative of previously reported research.",
  declaration_qualified:
    "I certify that I am qualified and have experience in experimentation on animals.",
  declaration_no_alternative:
    "For painful procedures, I certify that I have reviewed pertinent scientific literature and found no valid alternative that may cause less pain or distress.",
  declaration_iaec_approval_for_changes:
    "I will obtain approval from the IAEC/CPCSEA before initiating any changes in this study.",
  declaration_scientific_review:
    "I certify that performance of the experiment will be initiated only upon review and approval of scientific intent by the appropriate expert body.",
  declaration_hazardous_certificates:
    "I certify that I will submit appropriate certification of review and concurrence for hazardous-agent studies.",
  declaration_form_d_records:
    "I shall maintain all records as per Form D and submit them to the IAEC.",
  declaration_no_start_before_approval:
    "I certify that I will not initiate the study before written IAEC/CPCSEA approval and will follow IAEC/CPCSEA recommendations.",
  declaration_rehabilitation:
    "I certify that rehabilitation policies will be adopted wherever required.",
};
