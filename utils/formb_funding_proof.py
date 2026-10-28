"""Allowed funding proof reference choices for Form B Step 2."""

FUNDING_PROOF_REFERENCE_OPTIONS: tuple[str, ...] = (
    "Funding from Research Grants (GSBTM, GUJCOST, DBT, SSIP etc.)",
    "Workorder mutually signed between industry and institute",
    "Email confirmation from industry",
    (
        "PG/ PhD Dissertation project approved by Supervisor "
        "(Cost of project does not exceed the allowance limit provided by the institution)"
    ),
)

FUNDING_PROOF_REFERENCE_SET = frozenset(FUNDING_PROOF_REFERENCE_OPTIONS)
