import os

DEFAULT_ESTABLISHMENT_NAME = "L.M. College of Pharmacy (LMCP)"
DEFAULT_ESTABLISHMENT_ADDRESS = (
    "L.M. College of Pharmacy, Navrangpura, Ahmedabad - 380009, Gujarat, India"
)
DEFAULT_CPCSEA_REGISTRATION_NUMBER = "228/PO/ReBi/S/2000/CPCSEA"
DEFAULT_CPCSEA_REGISTRATION_DATE = "16th June, 2000"
DEFAULT_ANIMAL_HOUSING_LOCATION = (
    "Institutional Animal House, L.M. College of Pharmacy, Ahmedabad - 380009"
)
DEFAULT_EXPERIMENT_LOCATION = (
    "L.M. College of Pharmacy, Ahmedabad - 380009 "
    f"(CPCSEA Reg. No. {DEFAULT_CPCSEA_REGISTRATION_NUMBER})"
)


def _env(name: str, default: str) -> str:
    return os.getenv(name, default).strip()


def get_establishment_name() -> str:
    return _env("LMCP_ESTABLISHMENT_NAME", DEFAULT_ESTABLISHMENT_NAME)


def get_establishment_address() -> str:
    return _env("LMCP_ESTABLISHMENT_ADDRESS", DEFAULT_ESTABLISHMENT_ADDRESS)


def get_cpcsea_registration_number() -> str:
    return _env("LMCP_CPCSEA_REGISTRATION_NUMBER", DEFAULT_CPCSEA_REGISTRATION_NUMBER)


def get_cpcsea_registration_date() -> str:
    return _env("LMCP_CPCSEA_REGISTRATION_DATE", DEFAULT_CPCSEA_REGISTRATION_DATE)


def get_animal_housing_location() -> str:
    return _env("LMCP_ANIMAL_HOUSING_LOCATION", DEFAULT_ANIMAL_HOUSING_LOCATION)


def get_experiment_location() -> str:
    reg = get_cpcsea_registration_number()
    default = (
        "L.M. College of Pharmacy, Ahmedabad - 380009 "
        f"(CPCSEA Reg. No. {reg})"
    )
    return _env("LMCP_EXPERIMENT_LOCATION", default)


def get_institutional_form_b_defaults() -> dict[str, str]:
    return {
        "establishment_name": get_establishment_name(),
        "establishment_address": get_establishment_address(),
        "registration_number": get_cpcsea_registration_number(),
        "registration_date": get_cpcsea_registration_date(),
        "animal_housing_location": get_animal_housing_location(),
        "experiment_location": get_experiment_location(),
    }
