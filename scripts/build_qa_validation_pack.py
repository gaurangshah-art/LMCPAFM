"""Build single-file QA validation pack for PDF export.

Usage (from repo root):
  python scripts/build_qa_validation_pack.py

Output:
  Docs/lmcpafm_qa_validation_pack.md
"""

from __future__ import annotations

from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "Docs"
OUT = DOCS / "lmcpafm_qa_validation_pack.md"

APPEND_ORDER = [
    ("Part 4 — Personnel SOP index", "sop_personnel_index.md"),
    ("Part 5 — Faculty personnel SOP", "sop_faculty_personnel.md"),
    ("Part 6 — Form B investigator manual", "form_b_investigator_sop.md"),
    ("Part 7 — Student / scholar SOP", "sop_student_personnel.md"),
    ("Part 8 — IAEC administration SOP", "lmcpafm_iaec_admin_sop.md"),
    ("Part 9 — Animal house daily operations SOP", "sop_facility_daily_operations.md"),
    ("Part 10 — System administrator SOP", "sop_admin_personnel.md"),
]

FRONT_MATTER = """---
title: "LMCPAFM — QA Validation Pack"
subtitle: "L. M. College of Pharmacy — Animal Facility Management System"
date: "{today}"
---

# LMCPAFM — QA Validation Pack (single document)

**Institution:** L. M. College of Pharmacy, Ahmedabad  
**System:** LMCP Animal Facility Management (LMCPAFM)  
**Pack version:** 1.0  
**Generated:** {today}  
**Classification:** Internal use — QA / UAT only (not for public web)

This file combines **test procedures**, a **printable checklist**, and **role SOPs** so you can export **one PDF** for external or internal QA.

---

## How to share this pack

In LMCPAFM, open **SOPs & guides** and choose **Download QA pack (PDF)**. That file is already a PDF. Share it on **college-restricted** storage only (@lmcp.ac.in or approved QA contact).

---

## Part 1 — QA orientation

### 1.1 Purpose

Validate that LMCPAFM on **staging** matches documented workflows before wider rollout. Testers record **Pass / Fail / N/A** on the checklist (Part 3) and note defects with URL, role, steps, and screenshots.

### 1.2 Test environment

| Item | Value |
|:-----|:------|
| **Application URL** | https://lmcpafm-staging.lmcp.ac.in |
| **API health (optional)** | https://lmcpafm-staging.lmcp.ac.in/api/health/ready |
| **Local dev (if used)** | Frontend http://localhost:5173 — backend http://127.0.0.1:8000 |

Use **HTTPS** on staging (padlock visible). Staging data is for testing only; approvals are not official IAEC decisions unless stated by the coordinator.

### 1.3 Roles under test

| Role | Primary focus |
|:-----|:----------------|
| **Investigator** | Profile, Form B wizard, PDF, project workspace, post-approval entries |
| **IAEC** | Dashboard, meetings, assign/review, decisions, protocol, certificates, Form C |
| **Staff** | Allocations, facility records, Form C, facility SOP zip (in-app) |
| **Admin** | Users, master data, facility admin — no bypass of IAEC approval |

Credentials are issued by the **LMCPAFM coordinator**. Investigators may **self-register** with `@lmcp.ac.in` if roster policy allows, or receive **admin-created** logins (temporary password + mandatory change on first login). **Forgot password?** requires SMTP. **Certified animal-handling faculty** (~10–15) are admin-flagged for Form B submit and requisitions — see Part 5 and Part 10.

### 1.4 Suggested timeline

| Phase | Duration | Activity |
|:------|:---------|:---------|
| Orientation | 30 min | Login, navigation, role home page |
| Role workflows | 2–3 h | Scenarios in Part 2 for your role(s) |
| Cross-role (optional) | 1 h | Observe another role with coordinator |
| Sign-off | 30 min | Complete Part 3 checklist |

### 1.5 Defect reporting

Email or form (per coordinator) with: **name, role, date/time, URL, steps to reproduce, expected vs actual, screenshot**.

---

## Part 2 — Role test scenarios (current application)

### 2.1 All roles

1. **Login** with assigned credentials → correct dashboard for role.  
2. **Forgot password?** (optional) → email or clear SMTP error.  
3. Admin-created user → **Set your password** before other pages.  
4. Open a URL for another role → **Not authorized** or redirect.  
5. **Logout** → cannot access protected pages without login.  
6. Save a form → reload page → data persists.  
7. Download a PDF → opens; tables readable; LMCP branding present.

### 2.2 Investigator

1. **Profile** — complete required fields; Form B no longer blocked.  
2. **Dashboard** — optional **Copy previous Form B** creates a **new draft** (does not edit old submission).  
3. **Form B Step 1** — project metadata; required field markers.  
4. **Form B Step 2** — investigators; funding proof upload if applicable.  
5. **Form B Step 2b** — study plan: phases, groups, evaluation parameters, animal rationale.  
   - **One species and strain for whole project** (default): set once; groups inherit; per-group pickers hidden when enabled.  
   - Uncheck only for mixed-species studies.  
6. **Form B Steps 4–7** — procedures, anaesthesia, euthanasia, declarations; optional **LMCP default text pack** banners on Steps 4–6.  
7. **Wizard progress** — step indicator and time estimate visible on long steps.  
8. **Review** — summary matches entered data → **Submit** (requires **certified animal-handling** faculty linked on Step 2) → status **submitted**; wizard becomes read-only (`/form-b/view`).  
9. **Form B PDF** and **study plan annexure PDF** from Step 2b preview if offered.  
10. **Post-approval** (coordinator provides approved test project): requisition with **certified** login, **amend requisition before allocation**, experiment group, experiment log, final report. Confirm **non-certified** investigator does not see Requisitions menu.
11. **SOPs & guides** (`/resources`) — open a manual; **Save as PDF** if needed for offline QA notes.

**Reference:** Part 6 (Form B manual) for field-level detail.

### 2.3 IAEC

1. **IAEC Dashboard** — submitted Form B visible.  
2. **Create meeting** — number, date, time, venue saved.  
3. **Assign** Form B to meeting from dashboard.  
4. **Project review** — read application; record **decision**.  
5. **Send invitation** (if SMTP enabled) — success or clear error; email content check.  
6. **Protocol number** after approval.  
7. **Meeting summary PDF**, **approval certificate** PDF, **Form C** register/export.

**Reference:** Part 8.

### 2.4 Staff

1. **Allocations** — list and detail; update and save.  
2. **Facility** — records per staff permissions.  
3. **Form C** — read/export.  
4. **Staff SOP pack** — in-app download of facility SOP zip (if enabled).

**Reference:** Part 9.

### 2.5 Admin (coordinator / QA admin track)

1. **Admin dashboard** loads.  
2. **Create user** (iaec / staff / admin) — not investigator bypass of IAEC.  
3. **Master data** — species/strains visible in Form B dropdowns after save.  
4. **Facility admin** page accessible.  
5. Confirm **admin cannot approve Form B** in place of IAEC workflow.

**Reference:** Part 10.

---

<div style="page-break-after: always;"></div>

## Part 3 — Verification checklist (print and sign)

*Complete during UAT; return to LMCPAFM coordinator.*

"""


def strip_leading_h1(text: str) -> str:
    lines = text.splitlines()
    if lines and lines[0].startswith("# "):
        return "\n".join(lines[1:]).lstrip()
    return text


def main() -> None:
    today = date.today().isoformat()
    chunks: list[str] = [FRONT_MATTER.format(today=today)]

    checklist_path = DOCS / "faculty_evaluation_checklist.md"
    checklist = checklist_path.read_text(encoding="utf-8")
    checklist = strip_leading_h1(checklist)
    checklist = checklist.replace(
        "**Full guide:** `Docs/faculty_evaluation_sop.md`",
        "**Full guide:** Part 2 and Parts 4–10 of this pack.",
    )
    extra_rows = """
| B12 | Copy previous Form B creates a new draft (dashboard) | | |
| B13 | LMCP default text pack applies on Form B Steps 4–6 (if used) | | |
| B14 | Step 2b — one project species/strain applies to all groups when enabled | | |
| B15 | PI can amend/cancel requisition before staff allocation | | |
| B16 | SOPs & guides (`/resources`) opens role-appropriate manuals | | |
"""
    if "| B12 | Copy previous Form B" not in checklist:
        checklist = checklist.replace(
            "| B11 | Post-approval: requisition / experiment / log entry (if test project provided) | | |\n",
            "| B11 | Post-approval: requisition / experiment / log entry (if test project provided) | | |\n"
            + extra_rows,
        )
    chunks.append(checklist)
    chunks.append('\n<div style="page-break-after: always;"></div>\n')

    for part_title, filename in APPEND_ORDER:
        path = DOCS / filename
        if not path.is_file():
            raise SystemExit(f"Missing: {path}")
        body = strip_leading_h1(path.read_text(encoding="utf-8"))
        body = body.replace("./", "Docs/")
        chunks.append(f"\n# {part_title}\n\n")
        chunks.append(body)
        chunks.append('\n<div style="page-break-after: always;"></div>\n')

    chunks.append(
        "\n---\n\n*End of LMCPAFM QA Validation Pack. "
        "Regenerate with `python scripts/build_qa_validation_pack.py` after SOP updates.*\n"
    )

    OUT.write_text("".join(chunks), encoding="utf-8")
    line_count = len(OUT.read_text(encoding="utf-8").splitlines())
    print(f"Wrote {OUT} ({line_count} lines)")


if __name__ == "__main__":
    main()
