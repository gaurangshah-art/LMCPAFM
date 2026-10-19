# LMCPAFM — Master SOP index and review pack

**Purpose:** Single checklist to **review every SOP** before final approval and commit.  
**Publication goal:** Investigators and staff get **ready reference** on the **college intranet / private channel only** — **not** on a public website or public GitHub.

**Review status key:** `DRAFT` → `IN REVIEW` → `APPROVED` → `PUBLISHED`

Fill **Reviewer** and **Date** as you complete each pass.

---

## 1. Investigator & faculty ready reference (priority for go-live)

These are the documents investigators should receive (PDF or in-app when available).

| # | Document | Audience | Status | Reviewer | Date | Notes |
|---|----------|----------|--------|----------|------|-------|
| 1 | [sop_faculty_personnel.md](./sop_faculty_personnel.md) | Faculty PI, co-investigators | DRAFT | | | Registration, roster, Form B summary, post-approval |
| 2 | [form_b_investigator_sop.md](./form_b_investigator_sop.md) | Faculty (detailed Form B) | EXISTING | | | Field-by-field wizard; verify against current UI |
| 3 | [sop_student_personnel.md](./sop_student_personnel.md) | Scholars / students on Form B | DRAFT | | | Linking, edit vs submit |
| 4 | [sop_personnel_index.md](./sop_personnel_index.md) | All users — start here | DRAFT | | | One-page map of role SOPs |

**Review focus for rows 1–4:** URLs/paths match production; faculty roster steps accurate; Form B step list matches app; simple English; no industry/CRO branding left in text.

---

## 2. Animal house staff (ready reference — staff login, not general public)

| # | Document | Audience | Status | Reviewer | Date | Notes |
|---|----------|----------|--------|----------|------|-------|
| 5 | [sop_facility_daily_operations.md](./sop_facility_daily_operations.md) | `staff` | DRAFT | | | Cleaning, env logs, cages, quarantine — **LMCP in-charge must fill local limits (°C, RH, disinfectants)** |
| 6 | [sop_admin_personnel.md](./sop_admin_personnel.md) § 8 | Staff (read-only parts) | DRAFT | | | Where to log care/environment in LMCPAFM |

**Review focus:** Match LMCP physical layout; confirm species housed; align with CPCSEA/IAEC local rules.

---

## 3. IAEC & administration

| # | Document | Audience | Status | Reviewer | Date | Notes |
|---|----------|----------|--------|----------|------|-------|
| 7 | [lmcpafm_iaec_admin_sop.md](./lmcpafm_iaec_admin_sop.md) | IAEC, member secretary | EXISTING | | | Update §3 if investigator admin-create / roster changed |
| 8 | [sop_admin_personnel.md](./sop_admin_personnel.md) | System coordinator | DRAFT | | | Users, roster CSV, imports, go-live |

**Review focus:** IAEC finalize-approval flow; SMTP; roster enforce flag.

---

## 4. Internal / staging / development (do **not** give to investigators)

| # | Document | Keep in repo? | Public? | Notes |
|---|----------|--------------|---------|-------|
| 9 | [facility_sop_source_catalog.md](./facility_sop_source_catalog.md) | Private git OK | **No** | Maps industry files — internal |
| 10 | [admin_evaluation_sop.md](./admin_evaluation_sop.md) | Optional | **No** | Staging UAT only |
| 11 | [faculty_evaluation_sop.md](./faculty_evaluation_sop.md) | Optional | **No** | Staging UAT only |
| 12 | [faculty_evaluation_checklist.md](./faculty_evaluation_checklist.md) | Optional | **No** | UAT sign-off |
| 13 | [oracle_cloud_setup.md](./oracle_cloud_setup.md) | Private git | **No** | IT / admin |
| 14 | [lmcp_cursor_rebuild_procedures.md](./lmcp_cursor_rebuild_procedures.md) | Dev only | **No** | Developers |
| 15 | [lmcp_cursor_master_prompt.md](./lmcp_cursor_master_prompt.md) | Dev only | **No** | Developers |
| 16 | `Docs/source_industry/**` | **Gitignore** | **No** | Confidential industry originals |

---

## 5. Suggested review meeting order (half-day)

1. **Personnel index** (15 min) — agree who reads which SOP.  
2. **Faculty + Form B** (90 min) — walk through register → submit → after approval; demo on staging.  
3. **Student** (30 min) — linking on Step 2; permissions.  
4. **Facility daily ops** (60 min) — in-charge validates cleaning/env/quarantine against building.  
5. **Admin + IAEC** (45 min) — accounts, roster, meetings, finalize approval.  
6. **Publication list** (15 min) — what becomes PDF for investigators (Section 6).

**Sign-off:** Facility in-charge (§5), IAEC secretary (§1–3, 7), Admin coordinator (§8), optional QA nominee.

---

## 6. How to publish for investigators (private, not public)

### What “not public” means here

| OK | Not OK |
|----|--------|
| Private GitHub / college GitLab repo | Public GitHub repo |
| PDF on **LMCP intranet**, SharePoint, Google Drive **restricted to @lmcp.ac.in** | Open web link without login |
| Handout at IAEC orientation | Indexing on public college homepage without access control |
| Future: **Help** page **inside LMCPAFM after login** | Serving `/Docs/*.md` from nginx without authentication |

### Single PDF for QA / UAT (external validator)

1. Regenerate: `python scripts/build_qa_validation_pack.py`  
2. Source file: [lmcpafm_qa_validation_pack.md](./lmcpafm_qa_validation_pack.md)  
3. **In the app (easiest):** log in → **SOPs & guides** → **QA validation pack (combined)** → **Save as PDF** (or Ctrl+P → Save as PDF).  
4. **From the repo file:** Cursor/VS Code → Extensions → install **Markdown PDF** (yzane) → open the `.md` file → Command Palette → **Markdown PDF: Export (pdf)**. Or Pandoc: `pandoc Docs/lmcpafm_qa_validation_pack.md -o LMCPAFM-QA-Validation-Pack.pdf --toc`  
5. Transfer PDF on **restricted** college storage only  

Includes: UAT scenarios, printable checklist, and Parts 4–10 (personnel + Form B + IAEC + staff + admin SOPs).

### Recommended pack for investigators (PDF export)

Create one folder on internal storage, e.g. `LMCPAFM-Investigator-Reference/`:

1. `00-Start-Here-SOP-Index.pdf` ← from `sop_personnel_index.md`  
2. `01-Faculty-Quick-Guide.pdf` ← `sop_faculty_personnel.md`  
3. `02-Form-B-Complete-Manual.pdf` ← `form_b_investigator_sop.md`  
4. `03-Student-Scholar-Guide.pdf` ← `sop_student_personnel.md`  

Staff add: `04-Facility-Daily-Operations.pdf` (staff only share).

**Export:** VS Code “Markdown PDF” extension, Pandoc, or print-to-PDF from GitHub preview — use LMCP header/footer if required.

### Git hygiene before commit

Add to `.gitignore` (recommended):

```gitignore
Docs/source_industry/
Docs/changes_expected.docx
```

Commit **LMCP-written** markdown SOPs to your **private** remote only. Never push `source_industry` or industry `.doc` files.

### In-app ready reference (live)

After login, all users open **SOPs & guides** in the top navigation (`/resources`). Documents are served from the deployed `Docs/` folder (role-filtered). Dashboard home pages include an **Open guides** panel. Staff may still download the facility zip from `/staff/sop-pack`.

---

## 7. Pre-commit checklist (coordinator)

- [ ] Every row in §1–3 reviewed; status set to APPROVED or change requests noted  
- [ ] `lmcpafm_iaec_admin_sop.md` updated for roster + admin-create investigator (if still says “self-registration only”)  
- [ ] `form_b_investigator_sop.md` spot-checked against staging (Steps 1–7, review)  
- [ ] Facility SOP annex: local temp/RH limits and quarantine days filled in  
- [ ] `source_industry` in `.gitignore`  
- [ ] Investigator PDF pack generated on **restricted** drive  
- [ ] Production deploy does **not** expose `/Docs` as static files  
- [ ] Single git commit message documents “SOP pack for internal use”  

---

## 8. Open items to resolve during review

Record decisions here:

| Topic | Decision (fill in) |
|-------|---------------------|
| **Equipment register completed** | See [facility_equipment_register.md](./facility_equipment_register.md) |
| Acceptable temp/RH ranges per room | From register § A + H |
| Quarantine duration for incoming animals | Register § I |
| Disinfectant products approved at LMCP | Register § J |
| Species in scope (mouse/rat only vs rabbit/GP) | Register § H |
| Paper daily sheet still mandatory? | |
| Faculty roster enforce on/off in production | |
| Who approves SOP versions (name/role) | |

### Equipment register (blocker for customised facility SOPs)

| Step | Action | Status |
|------|--------|--------|
| 1 | Facility walk-through; fill register (markdown or CSV) | |
| 2 | Attach manuals/nameplate photos on internal drive | |
| 3 | IAEC/in-charge sign-off (register § K) | |
| 4 | Paste room setpoints + disinfectants into daily ops SOP | |
| 5 | Write `sop_facility_equipment_calibration.md` per device | |

---

*Review pack version 1.0 — update this file as statuses change.*
