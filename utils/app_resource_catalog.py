"""In-app SOP / guide catalog (markdown under Docs/)."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class AppResourceDoc:
    slug: str
    title: str
    summary: str
    relative_path: str
    category: str
    """Role names that may view this doc. Empty tuple = all authenticated users."""
    audiences: tuple[str, ...] = ()
    sort_order: int = 100


CATALOG: tuple[AppResourceDoc, ...] = (
    AppResourceDoc(
        slug="personnel-index",
        title="Personnel SOP index",
        summary="Start here — which guide applies to your role.",
        relative_path="Docs/sop_personnel_index.md",
        category="Start here",
        sort_order=10,
    ),
    AppResourceDoc(
        slug="master-index",
        title="Master SOP index",
        summary="Review pack and publication notes for coordinators.",
        relative_path="Docs/sop_master_index.md",
        category="Start here",
        sort_order=20,
    ),
    AppResourceDoc(
        slug="faculty-guide",
        title="Faculty & investigator guide",
        summary="Registration, roster, Form B overview, post-approval workflow.",
        relative_path="Docs/sop_faculty_personnel.md",
        category="Investigator",
        audiences=("investigator",),
        sort_order=30,
    ),
    AppResourceDoc(
        slug="form-b-manual",
        title="Form B complete manual",
        summary="Field-by-field Form B wizard (Steps 1–7 and review).",
        relative_path="Docs/form_b_investigator_sop.md",
        category="Investigator",
        audiences=("investigator", "iaec"),
        sort_order=40,
    ),
    AppResourceDoc(
        slug="student-guide",
        title="Student / scholar guide",
        summary="Linked on Form B — permissions and responsibilities.",
        relative_path="Docs/sop_student_personnel.md",
        category="Investigator",
        audiences=("investigator",),
        sort_order=50,
    ),
    AppResourceDoc(
        slug="iaec-admin",
        title="IAEC administration SOP",
        summary="Meetings, review, decisions, certificates, Form C.",
        relative_path="Docs/lmcpafm_iaec_admin_sop.md",
        category="IAEC",
        audiences=("iaec",),
        sort_order=60,
    ),
    AppResourceDoc(
        slug="facility-daily-ops",
        title="Animal house daily operations",
        summary="Cleaning, environment logs, cages, feeding, quarantine.",
        relative_path="Docs/sop_facility_daily_operations.md",
        category="Staff",
        audiences=("staff",),
        sort_order=70,
    ),
    AppResourceDoc(
        slug="equipment-register",
        title="Facility equipment register",
        summary="Room setpoints, quarantine, disinfectants — template for in-charge.",
        relative_path="Docs/facility_equipment_register.md",
        category="Staff",
        audiences=("staff", "admin"),
        sort_order=80,
    ),
    AppResourceDoc(
        slug="admin-personnel",
        title="System administrator SOP",
        summary="Users, faculty roster CSV, master data, go-live.",
        relative_path="Docs/sop_admin_personnel.md",
        category="Administration",
        audiences=("admin",),
        sort_order=90,
    ),
    AppResourceDoc(
        slug="uat-guide",
        title="Staging evaluation guide (UAT)",
        summary="Structured test scenarios for all roles on staging.",
        relative_path="Docs/faculty_evaluation_sop.md",
        category="Quality assurance",
        sort_order=100,
    ),
    AppResourceDoc(
        slug="uat-checklist",
        title="UAT verification checklist",
        summary="Printable pass/fail sheet for evaluators.",
        relative_path="Docs/faculty_evaluation_checklist.md",
        category="Quality assurance",
        sort_order=110,
    ),
    AppResourceDoc(
        slug="qa-validation-pack",
        title="QA validation pack (combined)",
        summary="Single-document UAT pack with embedded role SOPs.",
        relative_path="Docs/lmcpafm_qa_validation_pack.md",
        category="Quality assurance",
        sort_order=120,
    ),
)

_SLUG_INDEX = {doc.slug: doc for doc in CATALOG}


def get_catalog_doc(slug: str) -> AppResourceDoc | None:
    return _SLUG_INDEX.get(slug)


def user_can_view_doc(user_roles: set[str], doc: AppResourceDoc) -> bool:
    if "admin" in user_roles:
        return True
    if not doc.audiences:
        return True
    return bool(user_roles.intersection(doc.audiences))


def available_docs_for_user(user_roles: set[str], repo_root: Path | None = None) -> list[AppResourceDoc]:
    root = repo_root or REPO_ROOT
    roles = set(user_roles)
    rows: list[AppResourceDoc] = []
    for doc in sorted(CATALOG, key=lambda row: (row.sort_order, row.title)):
        if not user_can_view_doc(roles, doc):
            continue
        if not (root / doc.relative_path).is_file():
            continue
        rows.append(doc)
    return rows


def read_doc_markdown(doc: AppResourceDoc, repo_root: Path | None = None) -> str:
    root = repo_root or REPO_ROOT
    path = (root / doc.relative_path).resolve()
    docs_dir = (root / "Docs").resolve()
    if not str(path).startswith(str(docs_dir)):
        raise ValueError("Invalid document path")
    if not path.is_file():
        raise FileNotFoundError(doc.relative_path)
    return path.read_text(encoding="utf-8")
