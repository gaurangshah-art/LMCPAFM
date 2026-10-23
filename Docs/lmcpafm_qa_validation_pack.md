---
title: "LMCPAFM — QA Validation Pack"
subtitle: "L. M. College of Pharmacy — Animal Facility Management System"
date: "2026-10-21"
---

# LMCPAFM — QA Validation Pack (single document)

**Institution:** L. M. College of Pharmacy, Ahmedabad  
**System:** LMCP Animal Facility Management (LMCPAFM)  
**Pack version:** 1.0  
**Generated:** 2026-10-21  
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

Credentials are issued by the **LMCPAFM coordinator**. Investigators may **self-register** with `@lmcp.ac.in` if the coordinator allows it.

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
2. Open a URL for another role → **Not authorized** or redirect.  
3. **Logout** → cannot access protected pages without login.  
4. Save a form → reload page → data persists.  
5. Download a PDF → opens; tables readable; LMCP branding present.

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
8. **Review** — summary matches entered data → **Submit** → status **submitted**; wizard becomes read-only (`/form-b/view`).  
9. **Form B PDF** and **study plan annexure PDF** from Step 2b preview if offered.  
10. **Post-approval** (coordinator provides approved test project): requisition, **amend requisition before allocation**, experiment group, experiment log, final report.
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

**Environment:** Staging — https://lmcpafm-staging.lmcp.ac.in  
**Purpose:** Print this sheet, complete during UAT, and return to the coordinator.  
**Full guide:** Part 2 and Parts 4–10 of this pack.

---

## Evaluator details

| Field | Your entry |
|:------|:-----------|
| **Name** | |
| **Date(s) tested** | |
| **Role(s) tested** | ☐ Investigator ☐ IAEC ☐ Staff ☐ Admin |
| **Browser used** | ☐ Chrome ☐ Edge ☐ Firefox ☐ Other: ________ |

**Rating:** **P** = Pass **F** = Fail **N/A** = Not tested

---

## A. All evaluators

| # | Check | P / F / N/A | Notes |
|:--|:------|:------------|:------|
| A1 | Login succeeds with assigned credentials | | |
| A2 | HTTPS padlock visible; college branding shown | | |
| A3 | Home page matches my role (no wrong dashboard) | | |
| A4 | Restricted pages show “Not authorized” or redirect | | |
| A5 | Logout works; back button cannot access protected pages | | |
| A6 | Forms save and reload correctly on revisit | | |
| A7 | Error messages are understandable | | |
| A8 | PDF downloads open and text/tables are readable | | |

---

## B. Investigator (PI / faculty)

| # | Check | P / F / N/A | Notes |
|:--|:------|:------------|:------|
| B1 | Investigator profile completes and unblocks Form B | | |
| B2 | Form B Step 1 — required fields validated; red * on required fields | | |
| B3 | Form B Steps 2–7 — data persists between steps | | |
| B4 | Funding proof uploads on Step 2 | | |
| B5 | Study plan (Step 2b) saves successfully | | |
| B6 | Review page summary accurate before submit | | |
| B7 | Submit succeeds; project status shows **submitted** | | |
| B8 | After submit, wizard redirects to read-only view (cannot edit) | | |
| B9 | Form B PDF downloads; LMCP header/branding correct | | |
| B10 | Project workspace shows “View submitted Form B” | | |
| B11 | Post-approval: requisition / experiment / log entry (if test project provided) | | |
| B12 | Copy previous Form B creates a new draft (dashboard) | | |
| B13 | LMCP default text pack on Form B Steps 4–6 (if used) | | |
| B14 | Step 2b — one project species/strain applies to all groups when enabled | | |
| B15 | PI can amend/cancel requisition before staff allocation (`/requisitions/{id}` → Manage) | | |
| B16 | **SOPs & guides** (`/resources`) opens role-appropriate manuals | | |

---

## C. IAEC (Member Secretary / committee)

| # | Check | P / F / N/A | Notes |
|:--|:------|:------------|:------|
| C1 | IAEC Dashboard lists submitted Form B records | | |
| C2 | Create meeting — number, date, **time**, **venue** saved | | |
| C3 | Assign Form B to meeting from **IAEC Dashboard** | | |
| C4 | Send invitation — success shows recipient email **or** clear SMTP error | | |
| C5 | Invitation email received (check spam); meeting details correct | | |
| C6 | Record decision saves (approve / reject / etc.) | | |
| C7 | Generate protocol after approved decision | | |
| C8 | Meeting summary PDF downloads | | |
| C9 | Approval certificate page loads and PDF downloads | | |
| C10 | Form C register loads and PDF exports | | |

---

## D. Staff (animal house)

| # | Check | P / F / N/A | Notes |
|:--|:------|:------------|:------|
| D1 | Allocations list opens | | |
| D2 | Allocation detail can be updated and saved | | |
| D3 | Facility page accessible | | |
| D4 | Form C register readable / exportable | | |

---

## E. Admin (coordinator only)

| # | Check | P / F / N/A | Notes |
|:--|:------|:------------|:------|
| E1 | Admin Dashboard — system summary loads | | |
| E2 | Create institutional user (iaec/staff/admin) | | |
| E3 | Master data page — species/strains visible | | |
| E4 | Facility admin page accessible | | |
| E5 | Admin cannot bypass IAEC approval on investigator projects | | |

---

## F. Overall feedback

**Top 3 strengths**

1. ________________________________________________________________  
2. ________________________________________________________________  
3. ________________________________________________________________  

**Top 3 issues / improvements**

1. ________________________________________________________________  
2. ________________________________________________________________  
3. ________________________________________________________________  

**Overall suitability for LMCP use**

☐ Excellent (4) ☐ Good (3) ☐ Fair (2) ☐ Poor (1) ☐ N/A

**Recommend go-live after fixes?**

☐ Yes ☐ Yes with reservations ☐ No

**Signature:** _______________________________ **Date:** _______________

---

*Return completed checklist to the LMCPAFM evaluation coordinator.*
<div style="page-break-after: always;"></div>

# Part 4 — Personnel SOP index

Simple-English standard operating procedures by audience:

| Audience | Document | Contents |
|----------|----------|----------|
| **Students / research scholars** | [sop_student_personnel.md](Docs/sop_student_personnel.md) | Account, profile, helping on Form B, permissions, after approval |
| **Faculty (PI / co-investigators)** | [sop_faculty_personnel.md](Docs/sop_faculty_personnel.md) | Registration, roster, Form B overview, team linking, post-approval workflow |
| **System administrators** | [sop_admin_personnel.md](Docs/sop_admin_personnel.md) | Users, faculty roster CSV, master data, facility import, go-live checklist |
| **Animal house staff (daily ops)** | [sop_facility_daily_operations.md](Docs/sop_facility_daily_operations.md) | Cleaning, entry, env logs, cages, feeding, quarantine, waste |

**Facility SOP sources:** [facility_sop_source_catalog.md](Docs/facility_sop_source_catalog.md) — which industry files were selected from `Docs/source_industry/`.

**In the application (after login):**

- **SOPs & guides** (top navigation, `/resources`) — role-filtered manuals; **Save as PDF** on each guide page  
- **Open guides** panel on your role dashboard  

**Additional references (markdown in repo / PDF export):**

- [form_b_investigator_sop.md](Docs/form_b_investigator_sop.md) — detailed Form B field manual  
- [lmcpafm_iaec_admin_sop.md](Docs/lmcpafm_iaec_admin_sop.md) — IAEC secretariat  
- [lmcpafm_qa_validation_pack.md](Docs/lmcpafm_qa_validation_pack.md) — combined UAT pack for external QA  
- [oracle_cloud_setup.md](Docs/oracle_cloud_setup.md) — server deployment (IT only)  
<div style="page-break-after: always;"></div>

# Part 5 — Faculty personnel SOP

**Who should read this:** LMCP **faculty** who lead animal research projects: submit **Form B**, interact with **IAEC**, and after approval manage **requisitions** and **experiment records**.  
**Also read if you are:** A co-investigator with permission to submit Form B.

**System:** LMCP Animal Facility Management (LMCPAFM)  
**Institution:** L. M. College of Pharmacy (LMCP), Ahmedabad  

**Related detailed manual:** `Docs/form_b_investigator_sop.md` (field-by-field Form B reference).

---

## 1. Your role in one paragraph

You use LMCPAFM to prepare and **submit CPCSEA Form B**, track IAEC review, and after **approval** plan experiment groups, request animals, and maintain experiment logs. You may add **students** on your Form B to help draft sections, but **faculty** must remain on the team and **you** (or another authorized co-investigator) must **submit**.

---

## 2. Getting your account

### Path 1 — Self-registration (usual)

1. Open LMCPAFM → **Register as Investigator**.  
2. Use your **institutional email** (for example `@lmcp.ac.in`).  
3. Choose a strong password (minimum 8 characters).  
4. If the college enabled **faculty roster enforcement**, registration works **only** if your email was **pre-loaded** by the administrator (CSV roster). If blocked, contact admin to add your email to the roster.  
5. Log in after registration.

### Path 2 — Administrator created your account

1. Admin may add you under **Admin Dashboard → Create User** with role **investigator**, your email, and a **temporary password**.  
2. Use **Log in** (not Register).  
3. Complete **Investigator Profile** immediately.

**Support staff** with the same email domain use **staff** accounts — they do **not** use this faculty registration path.

---

## 3. Investigator Profile (mandatory before Form B)

1. Open **Investigator Profile**.  
2. Complete all required fields:
   - Institutional email  
   - Institution, department, designation, qualification  
3. Check **“I am LMCP faculty”** if you are LMCP faculty (required for ethics compliance on your applications).  
4. Save.

The dashboard will block **New Form B** until the profile is complete.

---

## 4. Form B — overview

Form B is a **wizard** (Steps 1 → 2 → 2b → 3 → 4 → 5 → 6 → 7 → **Review → Submit**).

**Golden rules:**

- Click **Save and continue** on **each** step. Unsaved data is lost.  
- Upload **funding proof PDF** on Step 2 before Step 2b.  
- Complete **Annexure I** on Step 2b (study plan).  
- Add at least one team member with investigator type **faculty** on Step 2 before submit.  
- After **Submit**, the form is **locked** (read-only view and PDF download only).

### Step summary

| Step | What you enter |
|------|----------------|
| **1** | PI details, contact **email** and phone, experience — **save** contact email on this step |
| **2** | Project title, dates, funding, summary, objectives; **investigator team**; **funding proof** upload |
| **2b** | Phases, groups, animal numbers, endpoints, animal fates (Annexure I) |
| **3** | Species, strains, numbers, year-wise breakup |
| **4** | Drugs, injections, anaesthesia |
| **5** | Housing, feeding, special requirements |
| **6** | Procedures, pain categories, euthanasia |
| **7** | Hazardous agents, certificates if applicable, **all declarations**, signature block |
| **Review** | Checklist → **Submit Form B** |

For every field and validation rule, use **`Docs/form_b_investigator_sop.md`**.

---

## 5. Adding students or co-investigators (Form B Step 2)

On **Step 2 → Project Investigators**:

1. Click **Add Investigator**.  
2. Enter name.  
3. For a **student scholar:** role **`student_contributor`**, type **`student`**.  
4. For **co-investigator faculty:** role **`co_investigator`**, type **`faculty`**.  
5. **Link** them to their LMCPAFM login (search email → **Link**).  
6. Save Step 2.

Students can **edit** drafts when linked; they **cannot submit** by default.

---

## 6. After you submit Form B

| Stage | What you do |
|-------|-------------|
| **Submitted** | Wait; monitor **Investigator Dashboard**; Form B is read-only |
| **Meeting scheduled** | Ensure Step 1 **contact email** is correct (saved on Step 1) |
| **Invitation email** | Check inbox (and spam) for IAEC meeting notice and PDF |
| **Decision** | Read outcome on dashboard or **Project Workspace** |
| **Protocol number** | Note number from IAEC dashboard communication |
| **Finalize approval** | IAEC clicks **Finalize approval** so project status becomes **approved** |
| **Approval certificate** | Download from workspace when available |

**Do not start animal experiments until IAEC approval is final.**

---

## 7. After IAEC approval — your workflow

1. Open **Project Workspace** for the approved project.  
2. **Re-sync / planning:** If experiment groups should match Annexure I, use planning tools on the workspace (follow on-screen notes).  
3. **Experiment groups:** Create or adjust groups within **approved animal limits**.  
4. **Requisitions:** Request animals from the facility (**Requisitions** menu) — totals must respect approved caps. After submit, the **PI** may **amend** or **cancel** until staff record an **allocation** (e.g. change 15 → 12). Open **Manage** on the requisition row.  
5. **Allocations:** Animal house **staff** fulfill requests; you track status on requisition pages.  
6. **Experiments and logs:** Record procedures and daily logs as your protocol requires.  
7. **Form B PDF:** Download from read-only view anytime.

---

## 8. If you also serve on IAEC

IAEC meeting workflow (assign meeting, record decision, protocol, finalize, invitations) is in **`Docs/lmcpafm_iaec_admin_sop.md` Part A**. You need a separate **`iaec`** login (admin creates it) in addition to your investigator account, unless your college merged roles on one account.

---

## 9. Troubleshooting (faculty)

| Problem | Likely fix |
|---------|------------|
| Cannot register — roster | Ask admin to add your email via faculty roster import |
| Email already exists | Use **Login**; you were pre-created |
| Submit blocked — faculty | Add a **faculty** member on Step 2 |
| Submit blocked — missing step | Open each step; save |
| PI sees “not IAEC-approved” but protocol exists | IAEC must **Finalize approval** |
| Re-sync forbidden | Project not **approved**, or you lack membership permission |
| Invitation email wrong | Re-save Step 1 **contact email** |
| Two projects on dashboard | Each **New Form B** creates a project; reuse draft or ignore empty drafts |

---

## 10. Page reference

| Task | Page |
|------|------|
| Profile | Investigator Profile |
| Dashboard | Investigator Dashboard |
| New Form B | New Form B / Step 1 |
| Submitted view | Form B view (read-only) |
| Approved project | Project Workspace |
| Animal requests | Requisitions |

---

## 11. Contacts

| Topic | Contact |
|-------|---------|
| Account, roster | LMCPAFM **administrator** |
| Ethics, meetings | **IAEC** / Member Secretary |
| Animals, cages | **Facility staff** |

---

*End of faculty SOP*
<div style="page-break-after: always;"></div>

# Part 6 — Form B investigator manual

**Document title:** Investigator Registration and Form B Submission Manual  
**System:** LMCP Animal Facility Management (LMCPAFM)  
**Institution:** L.M. College of Pharmacy (LMCP), Ahmedabad  
**Audience:** Principal Investigators, co-investigators, and research scholars submitting CPCSEA Form B through the online portal  
**Version:** 1.0 (aligned with current LMCPAFM application behaviour)

---

## 1. Purpose

This manual describes the **complete, end-to-end process** for an investigator to:

1. Register on LMCPAFM  
2. Complete the mandatory investigator profile  
3. Prepare and submit **Form B** (proposal for animal experimentation)  
4. Understand what happens **after submission** until IAEC approval  

It is written to be **unambiguous**: every step explains **what to do**, **why it is required**, and **what will block progress** if omitted.

---

## 2. Scope

This SOP covers:

- Investigator **self-registration** and login  
- **Investigator profile** completion  
- Form B wizard **Steps 1 through 7**, including **Step 2b (Experimental Study Plan / Annexure I)**  
- Required **attachments**  
- **Review and final submission**  
- Investigator actions **after submission** (tracking status, meeting invitations)

This SOP does **not** cover IAEC internal committee procedures, animal requisition/allocation after approval, or Form C/D record-keeping in detail (separate facility SOPs apply).

---

## 3. Roles and eligibility

| Role | How account is created | Can start Form B? | Can submit Form B? |
|------|------------------------|-------------------|---------------------|
| **Investigator (self-registered)** | Register at `/register-investigator` | Yes, after profile complete | Yes, if marked as submitter on the Form B team |
| **LMCP faculty investigator** | Same as above; profile must indicate faculty | Yes | Yes (required: at least one faculty member must be on the Form B team before submission) |
| **Student contributor** | Added by PI on Form B Step 2 | Only if given edit permission | **No** — students cannot be the final submitter |
| **Co-investigator (linked user)** | Added on Step 2 and linked to registered account | If given edit permission | Only if given submit permission |

### 3.1 Registration requirements

- Use an **LMCP institutional email** (typically `@lmcp.ac.in`).  
- Password must be **at least 8 characters**.  
- Registration creates an account with the **investigator** role only.  
- Admin/staff/IAEC accounts are **not** created through self-registration.

### 3.2 Faculty requirement for submission

Before Form B can be submitted, the system checks that **at least one LMCP faculty investigator** is associated with the application (via the investigators list on Step 2, with investigator type **faculty**).  
Applications led only by students or non-faculty members **will be rejected at submission**.

---

## 4. Prerequisites checklist (before starting Form B)

Complete **all** items below before clicking **New Form B**:

| # | Requirement | Where | Why |
|---|-------------|-------|-----|
| 1 | Valid LMCPAFM login | Login page | All Form B actions require authentication |
| 2 | Investigator profile complete | **Investigator Profile** page | Form B cannot be started until profile fields are filled |
| 3 | Institutional email on profile | Investigator Profile | Used for IAEC correspondence and Step 1 autofill |
| 4 | Funding proof document (PDF) ready | Your files | Must be uploaded on Step 2 before continuing |
| 5 | Study design prepared | Your notes | Step 2b requires phases, groups, endpoints, and animal fates |
| 6 | Hazardous-agent certificates (if applicable) | Your files | Required on Step 7 if hazardous agents are used |

### 4.1 Investigator profile — required fields

Go to **Investigator Profile** and save:

- Institutional email (`@lmcp.ac.in`)  
- Institution name  
- Department  
- Designation  
- Qualification  
- **LMCP faculty** checkbox (check if you are faculty)  
- Recommended: years of experience, animal handling experience  

Until the profile is complete, Step 1 will show a message and **Start Form B** will be blocked.

---

## 5. High-level workflow overview

```
Register → Login → Complete Profile → Step 1 → Step 2 → Step 2b → Step 4 → Step 5 → Step 6 → Step 7 → Review → Submit
                                              ↑              ↑
                                    Upload funding proof   Step 3 data is saved here automatically
                                    here                   (animal justification + requirement table)
```

**Note:** After a successful **Save & Next** on Step 2b, you normally **skip Step 3 in the wizard**. Step 3 content is written to the server from the study plan and **Animal use rationale** section on Step 2b. Do not re-enter the same information on `/form-b/step-3` unless IAEC asks you to revise that section.

After submission:

```
Submitted → IAEC review → Meeting assignment → Meeting invitation (optional) → IAEC decision → Protocol number → Approval certificate (if approved)
```

After submission, opening any Form B wizard step redirects to the **read-only view** at `/form-b/view?formBId=…` where the investigator can review data and download the Form B PDF but **cannot edit**.

**Important rule:** You must click **Save and continue** (or equivalent save action) on **each step**. Data shown from autofill or previously entered in the browser is **not saved** until you explicitly save that step.

---

## 6. Accessing Form B

1. Log in to LMCPAFM.  
2. Open the **Investigator Dashboard**.  
3. Click **New Form B** (routes to Form B Step 1).  

Alternatively, navigate directly to `/form-b/step-1`.

The system stores your current Form B ID in the browser session. If you switch browsers or clear storage, you may need to reopen the application from the dashboard using your project/Form B ID.

---

## 7. Step-by-step instructions

### Step 1 — Establishment details and Principal Investigator information

**Route:** `/form-b/step-1`  
**Purpose:** Identifies the establishment (pre-filled LMCP/CPCSEA details), the Principal Investigator (PI), and contact information used for IAEC communication.

#### 7.1.1 Actions

1. Click **Start Form B** (first time only). The system creates a draft project and assigns a **Form B ID**.  
2. Review pre-filled **institutional fields** (establishment name, CPCSEA registration number, animal house location, etc.). These are read-only defaults for LMCP.  
3. Complete all editable fields (all are **mandatory**):

| Field | Description | Notes |
|-------|-------------|-------|
| Type of research | Basic Research, Educational, Regulatory, or Contract Research | Select from dropdown |
| Principal investigator | Full name of PI | Usually autofilled from your account |
| Designation | e.g. Assistant Professor | Autofilled from profile if available |
| Department / Division / Lab | Your department | |
| **Contact email** | Institutional email for IAEC notices | **Critical:** prefilled from profile but must be **saved** on this step |
| Contact phone | Active phone number | |
| Qualifications | Highest relevant qualification | e.g. PhD, MD, MVSc |
| Experience in laboratory animal experimentation | Narrative of relevant experience | Required; cannot be blank |
| Research type | Category of study | See dropdown |

4. Click **Save and continue**.

#### 7.1.2 Common mistakes

- **Contact email appears filled but invitation emails fail:** The email may be prefilled from your profile but **not yet saved** on this Form B. If you see the warning *“Contact email is prefilled from your profile but not saved…”*, you **must** click **Save and continue**.  
- Skipping **Save and continue** and navigating away — Step 1 data will be missing at submission.

#### 7.1.3 Purpose (regulatory)

Provides IAEC with verified PI identity, qualifications, experience, and a reliable email/phone for meeting invitations and approval correspondence.

---

### Step 2 — Project protocol details

**Route:** `/form-b/step-2`  
**Purpose:** Describes the scientific project, funding, timeline, and research team.

#### 7.2.1 Investigators section (top of page)

- The PI who started Form B is automatically listed as **principal_investigator**.  
- Add co-investigators, students, or external collaborators as needed.  
- **Link** collaborators to registered LMCPAFM users when possible (search by name/email). Linking ensures correct permissions and email resolution.  
- Assign project roles: co_investigator, investigator, student_contributor.  
- Set permissions (view status, edit forms, submit Form B, view approval letters) appropriately.  
- **At least one team member must be LMCP faculty** before final submission.

#### 7.2.2 Project fields (all mandatory unless noted)

| Field | Description |
|-------|-------------|
| Project / Dissertation / Thesis title | Full official title |
| Duration (months) | 1–60 months |
| Proposed start date | ISO date (YYYY-MM-DD) |
| Proposed completion date | Must be **on or after** start date |
| Funding agency | Institutional, Self-funded, Industry, Government, or Other |
| Funding agency address | Full postal address of funding body |
| Funding proof reference | Cite sanction letter number/date (e.g. “DST sanction letter dated …”) |
| Summary | Concise background and rationale |
| Objectives | Specific aims |
| Expected outcomes | Anticipated results/impact |
| Study plan annexure reference | Optional text; Annexure I is generated in Step 2b |

#### 7.2.3 Required attachment on this step

| Attachment category | When required | Format |
|--------------------|---------------|--------|
| **funding_proof** | Before leaving Step 2 | PDF recommended |

Upload the funding proof using the attachment control on this page. You **cannot proceed to Step 2b** without uploading it.

#### 7.2.4 Action

Click **Save and continue** → proceeds to **Step 2b**.

---

### Step 2b — Experimental Study Plan (Annexure I)

**Route:** `/form-b/step-2b`  
**Purpose:** Structured experimental design: phases, groups, dosing, endpoints, and animal disposition. This generates **Annexure I**, which is attached automatically at submission.

#### 7.2.5 Study plan structure

1. **Design rationale** (mandatory) — Explain overall experimental design logic (e.g. pilot followed by pivotal study).  
2. **Phases** — Add one or more study phases:

| Phase field | Required | Description |
|-------------|----------|-------------|
| Phase code | Yes | main, pilot, pivotal, dose_finding, extension, other |
| Phase name | Yes | Descriptive label |
| Sequence order | Yes | Unique integer; determines order |
| Objective | Yes | Phase-specific objective |
| Planned start date | Yes | |
| Planned duration (weeks) | Yes | ≥ 1 |
| Animal cap | Yes | Maximum animals in this phase |
| Depends on prior phase | Optional | Sequence order of prerequisite phase |
| Reuse animals allowed | Yes/No | Whether animals may be reused from prior phase |
| Contingency note | Optional | e.g. “Proceed only if pilot succeeds” |

3. **Groups within each phase** — At least one group per phase:

| Group field | Required | Description |
|-------------|----------|-------------|
| Group code / name | Yes | e.g. P1, “Pilot control” |
| Role | Yes | control, sham, treatment, baseline, other |
| Animal count | Yes | ≥ 1 |
| Species / Strain | Yes | **Default:** check **one species and strain for the whole project** on Step 2b and set it once; all groups inherit it. Uncheck only for mixed-species studies. Per-group pickers appear when unchecked. |
| Sex, age, weight range, feeding diet | Yes | |
| Treatment summary | Required for **treatment** and **sham** groups | |
| Dosing entries | Required for **treatment** and **sham** groups | Agent, dose, route, frequency |
| Endpoints | ≥ 1 required | Parameters and measurement schedule |
| Fates | ≥ 1 required; counts must sum to group animal count | sacrifice, euthanasia, rehabilitation, reuse, other |

#### 7.2.6 Validation rules

- Fate counts per group **must equal** that group’s animal count.  
- Treatment/sham groups **must** include at least one dosing row with route and frequency.  
- Each group **must** have at least one endpoint.  
- Species and strain must both be selected (matched pair).

#### 7.2.7 Actions

- Use **Preview Annexure PDF** to verify layout before saving.  
- Click **Save study plan** then **Save and continue to Step 3**.

---

### Step 3 — Justification for use of animals

**Route:** `/form-b/step-3`  
**Purpose:** CPCSEA-required scientific justification (3Rs), species/number rationale, and detailed animal requirement table.

#### 7.3.1 Narrative fields (all mandatory)

| Field | Purpose |
|-------|---------|
| Why animal experimentation is necessary | Explain why the study cannot be done without animals |
| In vitro / alternative studies undertaken | Describe non-animal work already done or planned |
| Why this species/strain was selected | Scientific rationale for model choice |
| Why this number of animals is essential | Statistical or design justification |
| Similar experiments in this establishment | Answer Yes/No narrative |
| Justify new experiment | **Required only if** similar work exists in your establishment (answer starts with “Yes”) |
| Similar experiments elsewhere | Literature or external precedent |

#### 7.3.2 Animal requirement rows

You may add **multiple rows** (e.g. rats and mice). For **each** row, complete:

| Field | Requirement |
|-------|-------------|
| Species, strain, sex, age | All mandatory |
| Weight | **Must be expressed in grams** (e.g. `200-250 g`) |
| Number required | Integer ≥ 1 |
| Source | Institutional Animal House, CPCSEA Registered Breeder, or Other IAEC-approved source |
| Justification | Why this line item is needed |
| Year-wise breakup | At least one year/count pair; **sum of counts must equal Number required** |
| Days housed | Expected housing duration |
| Breeder name, address, registration number | Pre-filled for LMCP; verify accuracy |

#### 7.3.3 Action

Click **Save and continue**.

---

### Step 4 — Experimental procedures

**Route:** `/form-b/step-4`  
**Purpose:** Detailed procedural, pain/distress, anaesthesia/analgesia, surgery, and euthanasia information.

#### 7.4.1 Mandatory fields

| Field | Notes |
|-------|-------|
| Procedure description | Full narrative of experimental procedures |
| Pain category | A (none) through E (severe) |
| Anaesthesia | Select or “None (Category A/B only)” where applicable |
| Analgesia | Select or “None (if justified)” |
| Prohibit analgesic/anesthetic? | Yes/No — if **Yes**, justification is mandatory |
| Survival surgery? | Yes/No — if **Yes**, surgical procedures, personnel, and post-op care are mandatory |
| Euthanasia method | CO₂, cervical dislocation, overdose, or other IAEC-approved |
| Alternatives considered | Describe 3Rs alternatives evaluated |
| 3Rs rationale | Why the proposed approach is justified |

#### 7.4.2 Conditional fields (complete when applicable)

**Injections** — If **any** of substances, doses, sites, or volumes is filled, **all four** must be completed.

**Blood withdrawal** — If volume **or** site is described, **both** must be completed.

**Optional but recommended:** radiation schedule, NCE/compound details, repeat surgery justification.

#### 7.4.3 Action

Click **Save and continue**.

---

### Step 5 — Animal housing and husbandry

**Route:** `/form-b/step-5`  
**Purpose:** Housing, feeding, enrichment, transport, reuse/rehabilitation, and carcass disposal.

#### 7.5.1 Mandatory fields

| Field | Options / notes |
|-------|-----------------|
| Housing conditions | Polypropylene, IVC, metabolic, special (IAEC-approved), or other |
| Special requirements | **Mandatory if** housing is “Special cages” or “Other” |
| Feeding | Standard pellet, custom, high-fat, other |
| Environmental enrichment | Nesting material, PVC pipes, wooden blocks, none |
| Animal transportation methods | Describe transport or state in-house/N/A |
| Scope for reuse | Whether animals may be reused; state “None” if not applicable |
| Rehabilitation details | State “Not applicable” if none |
| Carcass disposal method | e.g. biomedical waste disposal per institutional SOP |

#### 7.5.2 Action

Click **Save and continue**.

---

### Step 6 — Personnel and training

**Route:** `/form-b/step-6`  
**Purpose:** Lists all personnel who will handle animals and documents training/competency.

#### 7.6.1 Authorized personnel (≥ 1 row)

Each person requires: name, designation, department, telephone, email, experience.

#### 7.6.2 Training fields

| Field | Description |
|-------|-------------|
| Training level | Basic/advanced handling, surgical, CPCSEA, other |
| Training details | Dates, modules, certifying body |
| Competency certification | IAEC, CPCSEA, institutional, other |

#### 7.6.3 Action

Click **Save and continue**.

---

### Step 7 — Hazardous agents, safety, and declarations

**Route:** `/form-b/step-7`  
**Purpose:** Hazardous material approvals, safety measures, humane endpoints, and legally binding investigator declarations.

#### 7.7.1 Hazardous agents

| Field | Rule |
|-------|------|
| Hazardous agents used? | Yes/No |
| Hazardous agent details | **Mandatory if Yes** — describe agents and risks |
| AERB / IBSC / RCGM / Other approval references | Fill reference numbers when applicable |
| Matching certificate uploads | If you enter a reference for a committee, you **must** upload the corresponding certificate PDF |

Certificate categories:

- `aerb_certificate`  
- `ibsc_certificate`  
- `rcgm_certificate`  
- `other_hazardous_certificate`

#### 7.7.2 Safety and endpoints

| Field | Examples |
|-------|----------|
| CPCSEA adherence | Yes / No (with justification if No) |
| IAEC history | Prior submissions or “None” |
| Safety measures | PPE, biosafety cabinet, fume hood, etc. |
| Endpoint criteria | Weight loss > 20%, severe distress, moribund condition, tumour size, other |

#### 7.7.3 Declarations (all mandatory — every checkbox must be checked)

You must affirm all nine declarations, including:

- Research is not unnecessarily duplicative  
- You are qualified and experienced  
- No valid less-painful alternative exists for painful procedures  
- IAEC approval will be obtained before protocol changes  
- Scientific review will precede animal work  
- Hazardous-agent certificates will be submitted where required  
- Form D records will be maintained  
- Study will not start before written IAEC approval  
- Rehabilitation policies will be followed where required  

Also enter: **signature name**, **date**, and **place**.

#### 7.7.4 Action

Click **Save and continue** → Review page.

---

### Review and Submit

**Route:** `/form-b/review`  
**Purpose:** Final verification before irreversible submission.

#### 7.8.1 Before you submit — final checklist

| Check | Confirm |
|-------|---------|
| All steps 1–7 show saved data on review screen | |
| Step 1 contact email is saved (not just prefilled) | |
| Funding proof attachment listed | |
| Study plan (Annexure I) complete | |
| Hazardous certificates uploaded if Step 7 references provided | |
| At least one LMCP faculty on investigator team | |
| You have submit permission on this Form B | |

#### 7.8.2 Submit action

1. Review all sections and attachments.  
2. Click **Submit Form B**.  
3. Confirm the dialog: **submission is final — you cannot edit afterward**.

On success you are redirected to the **Investigator Dashboard** with project status **submitted**.

#### 7.8.3 What the system does automatically on submit

- Validates all steps and study plan completeness  
- Generates and attaches **Annexure I (study plan PDF)**  
- Sets project status to **submitted**  
- Records submission timestamp  

---

## 8. After submission — investigator expectations

| Stage | What happens | Your action |
|-------|--------------|-------------|
| **Submitted** | IAEC secretariat reviews completeness | Monitor dashboard status; Form B is read-only |
| **Meeting assigned** | Form B scheduled on an IAEC meeting | Ensure Step 1 contact email is correct |
| **Meeting invitation email** | Sent to PI contact email with Form B PDF attached | Check inbox; contact IAEC if not received |
| **IAEC decision** | Approved, approved with revisions, amended count, or rejected | View decision on dashboard / project workspace |
| **Protocol number generated** | Official number e.g. `LMCP/IAEC/YYYY/meeting/serial` | Note protocol number from dashboard |
| **Approval certificate** | Available when approved | Download from project workspace when permitted |

**You may not begin animal experimentation until written IAEC approval is received** (Declaration 9).

---

## 9. Permissions and team management summary

| Permission | Typical PI | Student contributor |
|------------|-----------|---------------------|
| View project status | Yes | Optional |
| Edit Form B steps | Yes | Optional |
| Submit Form B | Yes | **No** (default) |
| View approval letters | Yes | Optional |

To change permissions or add team members, return to **Step 2** (only while Form B is **not yet submitted**).

---

## 10. Tips to complete Form B faster

Form B is long because CPCSEA Form B and LMCP IAEC review require detailed design, welfare, and personnel information. You cannot remove those fields, but you can **reduce rework and duplicate entry**.

| Tip | What to do |
|-----|------------|
| **Prepare offline first** | Draft title, summary, objectives, study phases/groups, and 3Rs text in Word before opening the wizard. Paste into the matching steps. |
| **Complete profile once** | Step 1 autofills PI name, designation, department, and email from **Investigator Profile** — keep the profile up to date. |
| **Use Step 2b as the main workload** | Enter species, counts, dosing, endpoints, fates, **and** animal justification on Step 2b only. After **Save & Next**, Step 3 is already stored — go straight to Step 4. |
| **Single-phase pilot studies** | One phase and one or two groups is enough for many dissertations; add phases only when the design needs them. |
| **Reuse LMCP defaults** | Breeder name, address, and CPCSEA registration on Step 2b are pre-filled for the institutional animal house — verify, do not retype unless animals come from elsewhere. |
| **Save each step before leaving** | Use **Save and continue** (or **Save & Next**). Browser drafts in session storage help after refresh but **do not** replace server save for submission. |
| **Copy previous Form B** | On the **Investigator Dashboard**, click **Copy previous Form B**, choose a submitted or approved protocol, then edit dates, numbers, and text. Re-upload **funding proof** and hazard certificates — files are not copied. |
| **LMCP default pack (Steps 4–6)** | On each of Steps **4**, **5**, and **6**, click **Apply LMCP defaults (fill blank fields only)** to insert institutional baseline text and dropdown values. Always review and edit (especially procedure description and pain category on Step 4). |
| **Standard husbandry (Steps 5–6)** | The default pack on Step 5 sets IVC housing, standard pellet diet, nesting material, and institutional disposal/transport wording. |
| **Split across sessions** | Steps 1–2b one day, procedures and housing (4–5) another, personnel and hazards (6–7) when attachments are ready. |

### Possible future improvements (product)

Investigator feedback on completion time is noted. **Copy previous Form B**, the **LMCP default pack** (Steps 4–6), and the wizard **progress bar with typical time remaining** are available in the application. Planned next: **optional autosave** on long text fields.

Each Form B step shows **Step X of 8**, a **saved-sections progress bar**, and **typical minutes remaining** from your current step (about **2 hours** for the full wizard if starting from Step 1). Estimates are guidance only; Step 2b usually takes the longest.

---

## 11. Attachments reference

| Category | When required | Typical document |
|----------|---------------|------------------|
| `funding_proof` | Step 2 (before continue) | Grant sanction letter, institutional approval |
| `study_plan_annexure` | Auto-generated at submit | Do not upload manually |
| `aerb_certificate` | Step 7 if AERB reference provided | AERB approval letter |
| `ibsc_certificate` | Step 7 if IBSC reference provided | IBSC approval |
| `rcgm_certificate` | Step 7 if RCGM reference provided | RCGM approval |
| `other_hazardous_certificate` | Step 7 if other reference provided | Relevant clearance |

Supported upload format: **PDF** (recommended).

---

## 12. Troubleshooting

| Problem | Likely cause | Solution |
|---------|--------------|----------|
| “Complete your investigator profile…” | Profile incomplete | Finish Investigator Profile, then retry |
| “Start Form B” disabled | Profile incomplete | Same as above |
| Contact email error on IAEC invitation | Email prefilled but Step 1 not saved | Reopen Step 1 → verify email → **Save and continue** |
| Cannot proceed from Step 2 | Funding proof not uploaded | Upload PDF under funding proof |
| Step 2b save fails on fates | Fate counts ≠ group size | Adjust fate rows to sum exactly to animal count |
| Step 3 year-wise error | Breakup counts don’t match total | Ensure year-wise counts sum to **Number required** |
| Step 3 weight error | Weight not in grams | Use gram units (e.g. `200-250 g`) |
| Step 4 injection error | Partial injection fields | Fill all four injection fields or leave all blank |
| Step 5 special housing error | Special/Other housing without details | Fill **Special requirements** |
| Step 7 certificate error | Reference entered but file missing | Upload matching certificate |
| Submit blocked — faculty | No faculty on team | Add LMCP faculty member on Step 2 |
| Submit blocked — missing step | Step not saved | Open missing step and save |
| Cannot edit after submit | Normal behaviour | Open **View submitted Form B** from project workspace; contact IAEC for approved amendments |
| Wizard opens then redirects to view page | Form B already submitted | Expected — use read-only view and PDF download |
| Form B ID not found | Browser storage cleared | Open project from Investigator Dashboard |

---

## 13. Quick reference — URL map

| Page | URL |
|------|-----|
| Register | `/register-investigator` |
| Login | `/login` |
| Investigator profile | `/investigator-profile` |
| Investigator dashboard | `/investigator-dashboard` |
| Form B Step 1 | `/form-b/step-1` |
| Form B Step 2 | `/form-b/step-2` |
| Form B Step 2b | `/form-b/step-2b` |
| Form B Step 3 | `/form-b/step-3` |
| Form B Step 4 | `/form-b/step-4` |
| Form B Step 5 | `/form-b/step-5` |
| Form B Step 6 | `/form-b/step-6` |
| Form B Step 7 | `/form-b/step-7` |
| Review & Submit | `/form-b/review` |

---

## 14. Document control

| Item | Detail |
|------|--------|
| Prepared for | LMCP investigators using LMCPAFM |
| Based on | Application validation rules and UI as implemented in LMCPAFM |
| Supersedes | Informal/ad hoc instructions |
| Review cycle | Update when Form B schema or wizard steps change |

For IAEC secretariat or technical system issues, contact the institutional IAEC office or LMCPAFM system administrator.

---

*End of SOP*
<div style="page-break-after: always;"></div>

# Part 7 — Student / scholar SOP

**Who should read this:** M.Pharm, Ph.D., or other **research students** who help prepare an animal ethics (**Form B**) application under a faculty guide.  
**Who should NOT use this as their main guide:** Animal house **support staff** (they get a **staff** account from the administrator, not student self-registration).

**System:** LMCP Animal Facility Management (LMCPAFM)  
**Institution:** L. M. College of Pharmacy (LMCP), Ahmedabad  

---

## 1. What students do in LMCPAFM

Students usually **do not submit** Form B to IAEC. Your faculty guide (Principal Investigator) submits. Your typical jobs are:

1. Create your own login (if your guide asks you to).  
2. Complete a short **Investigator Profile**.  
3. Help **type and save** Form B sections after your guide **adds and links** you on the project team.  
4. After IAEC approval, help with **experiment records** only if your guide allows it on the **Project Workspace**.

You **cannot** replace your guide for IAEC approval. At least one **LMCP faculty member** must be on every Form B before submission.

---

## 2. Before you start

| You need | Why |
|----------|-----|
| LMCP institutional email (for example `@lmcp.ac.in`) | Login and identity |
| Approval from your guide to use LMCPAFM | They must add you on Form B Step 2 |
| PDFs ready if your guide asks you to upload | Funding proof, certificates (guide decides) |

**Do not** register as an investigator if you are **only** animal house support staff. Ask the administrator for a **staff** account instead.

---

## 3. Getting your account

### Option A — Your guide pre-registered you

If the administrator created an account for you:

1. Open the LMCPAFM website (link from your college).  
2. Click **Log in** (not Register).  
3. Use the email and **temporary password** your guide or admin sent you.  
4. Change your password later if your college policy requires it (use a strong password).

### Option B — You register yourself

1. Open the login page → **Register as Investigator**.  
2. Enter your **full name**, **institutional email**, and a **password** (at least 8 characters).  
3. If you see an error that your email is **not on the faculty roster**, that means only **approved faculty emails** can self-register. **Students:** your guide must either add you on Form B after registering themselves, or ask the administrator to create your investigator account.  
4. After registration, log in.

---

## 4. Complete your Investigator Profile (required)

1. After login, open **Investigator Profile** from the menu.  
2. Fill in all required fields:
   - Institutional email  
   - Institution name  
   - Department  
   - Designation (for example “Research Scholar”, “M.Pharm Student”)  
   - Qualification  
3. **Important:** If you are **not** LMCP faculty, **uncheck** **“I am LMCP faculty”**.  
4. Click **Save**.

Until this profile is complete, you may not be able to open Form B steps, even if your guide linked you.

---

## 5. How your guide gives you access to Form B

Your guide (faculty PI) must do this on **Form B Step 2** while the form is still a **draft** (not submitted):

1. Add your **name**.  
2. Set **Project role** to **`student_contributor`**.  
3. Set **Investigator type** to **`student`**.  
4. **Link** your row to your LMCPAFM account (search your email and click **Link**).  
5. Save Step 2.

After linking, you should see the **same project** on your **Investigator Dashboard**.

Default permissions for type **student**:

| Permission | Usually |
|------------|---------|
| Edit Form B | Yes |
| Submit Form B | **No** |
| View approval letters | No (unless changed by admin API — not in normal UI) |

You **cannot** click final **Submit Form B**. Your guide submits.

---

## 6. Helping fill Form B (draft only)

1. Log in → **Investigator Dashboard** → open the project / Form B.  
2. Walk through **Steps 1 to 7** only as your guide directs.  
3. On **every step**, click **Save and continue** (or **Save**).  
   - **Typing alone does not save.** If you leave without saving, data is lost.  
4. **Step 2:** Upload **funding proof PDF** if your guide asks you to. You cannot go to Step 2b without it.  
5. **Step 2b (Annexure I):** Study phases, groups, animal counts, and fates — follow your protocol document carefully. Fate counts must match group sizes.  
6. **Step 7:** All declaration checkboxes must be ticked before submit — your guide usually checks this at review.

**After submission:** Form B becomes **read-only** for everyone. You can open the **view** page and download PDFs but **cannot edit**. Contact your guide or IAEC for approved changes.

---

## 7. After IAEC approval (if your guide allows)

When the project status is **approved** and a **protocol number** exists:

1. Open **Project Workspace** for that project.  
2. Your guide may ask you to help with:
   - **Experiment groups** (planning within approved animal limits)  
   - **Requisitions** (request animals from the facility — within limits)  
   - **Experiment logs** (record what was done on approved animals)  

If a button is disabled or says **Forbidden**, the project may not be fully approved yet, or your account may not have permission. Ask your guide — do not share their password.

**Rule:** No animal work until **written IAEC approval** exists (your guide’s responsibility).

---

## 8. What students must not do

- Do **not** submit Form B unless the administrator explicitly gave you submit permission (not normal for students).  
- Do **not** check **“I am LMCP faculty”** on your profile if you are a student.  
- Do **not** use **Register as Investigator** if you are **facility support staff**.  
- Do **not** start animal experiments before IAEC approval.  
- Do **not** share your password or use your guide’s login.

---

## 9. Troubleshooting

| Problem | What to do |
|---------|------------|
| “Email not on roster” when registering | You are not on the faculty list — expected for students. Ask guide/admin to create your account or link you after guide registers. |
| I do not see the project on my dashboard | Guide has not **linked** your account on Form B Step 2, or profile incomplete. |
| I cannot edit Form B | Form may be **submitted**, or you lack **edit** permission. |
| Submit button missing or fails | Normal for students — guide must submit. |
| “Complete investigator profile” | Finish **Investigator Profile** and save. |
| Lost work on a step | You likely skipped **Save and continue**. Re-enter and save. |

---

## 10. Quick page reference

| Task | Menu / page |
|------|-------------|
| Log in | Login |
| Register (if allowed) | Register as Investigator |
| Profile | Investigator Profile |
| Your projects | Investigator Dashboard |
| Form B steps | Form B Step 1 … Step 7, then Review |
| Approved project work | Project Workspace |

---

## 11. Who to contact

| Issue | Contact |
|-------|---------|
| Access, linking, roster | LMCPAFM **administrator** |
| Scientific content, submission | Your **faculty guide (PI)** |
| IAEC meetings, protocol | **IAEC office** / Member Secretary |

**More detail for Form B fields:** see `Docs/form_b_investigator_sop.md` (written for investigators; students use the same screens when editing).

---

*End of student SOP*
<div style="page-break-after: always;"></div>

# Part 8 — IAEC administration SOP

**Document title:** IAEC Secretariat and Superadmin Operations Manual  
**System:** LMCP Animal Facility Management (LMCPAFM)  
**Institution:** L. M. College of Pharmacy, Ahmedabad  
**Audience:** IAEC members/secretariat, system superadministrators (`admin` role)  
**Version:** 1.0 (aligned with current LMCPAFM application behaviour)

---

## 1. Purpose

This manual describes how **IAEC personnel** and **superadministrators** use LMCPAFM to:

1. Review investigator Form B submissions  
2. Schedule IAEC meetings and record decisions  
3. Generate protocol numbers and send meeting invitations  
4. Issue and manage approval certificates  
5. Administer institutional accounts and facility configuration  

It is written to be **unambiguous**: every procedure explains **what to do**, **in what order**, and **what will block progress** if prerequisites are missing.

---

## 2. Scope

### Covered in this SOP

| Area | IAEC role | Superadmin (`admin`) role |
|------|-----------|---------------------------|
| Form B review workflow | Yes | No (frontend); limited API read access |
| IAEC meetings & decisions | Yes | No |
| Protocol number generation | Yes | No |
| Meeting invitation emails | Yes | No |
| Approval certificates | Yes | Upload signed copy only |
| User account creation (staff/IAEC/admin) | No | Yes |
| Role assignment & user deletion | No | Yes |
| System summary & activity logs | No | Yes |
| Facility administration (rooms, procurement, breeding) | No | Yes |
| Form C register (read-only) | Yes | Yes |
| Animal allocations | View/create (API) | API only; no dedicated UI |

### Not covered

- Investigator Form B submission (see `Docs/form_b_investigator_sop.md`)  
- Day-to-day animal facility operations by **staff** (separate facility SOP)  
- CPCSEA regulatory interpretation — this document covers **system procedures** only  

---

## 3. Roles in LMCPAFM

| Role | Account creation | Default landing page | Primary responsibility |
|------|------------------|----------------------|------------------------|
| **iaec** | Created by superadmin | `/iaec-projects` | Ethics review, meetings, certificates |
| **admin** | Created by another superadmin | `/admin-dashboard` | System administration, facility control |
| **staff** | Created by superadmin or staff user page | `/allocations` | Animal issue, facility care (not covered in detail here) |
| **investigator** | Self-registration only | `/` (investigator dashboard) | Form B submission |

**Important distinctions:**

- **Superadmin** = user with the `admin` role. There is no separate “superadmin” role name in the database.  
- **Investigator accounts cannot be created** from the admin console. Investigators must register at `/register-investigator`.  
- Users may hold **multiple roles** (e.g. `admin` + `staff`). The system grants access if **any** assigned role matches the page requirement.  
- IAEC frontend pages require the `iaec` role. A superadmin without the `iaec` role **cannot open IAEC Dashboard** from the browser, even though some backend APIs allow admin access.

---

## 4. Prerequisites

### 4.1 IAEC user prerequisites

| # | Requirement | Why |
|---|-------------|-----|
| 1 | Valid LMCPAFM login with `iaec` role | All IAEC pages are role-protected |
| 2 | Institutional email account | Account created by superadmin |
| 3 | SMTP configured on server (for invitations) | Without SMTP, “Send invitation” will fail |
| 4 | Investigator has submitted Form B | Nothing to review until status = submitted |

### 4.2 Superadmin prerequisites

| # | Requirement | Why |
|---|-------------|-----|
| 1 | Valid login with `admin` role | Admin dashboard is admin-only |
| 2 | At least one admin account exists | System must never delete the last admin |
| 3 | Database and backend running | All admin actions require API connectivity |

### 4.3 Server configuration (superadmin / IT)

Configure in `.env` (see `.env.example`):

| Variable | Required for | Notes |
|----------|--------------|-------|
| `DATABASE_URL` | All operations | SQLite (dev) or PostgreSQL (production) |
| `JWT_SECRET_KEY` | Login | Must be a strong secret in production |
| `IAEC_SMTP_HOST` | Meeting invitations | e.g. institutional relay or Gmail |
| `IAEC_SMTP_PORT` | Meeting invitations | Usually `587` with TLS |
| `IAEC_SMTP_USERNAME` / `IAEC_SMTP_PASSWORD` | SMTP auth | App password for cloud mail |
| `IAEC_SENDER_EMAIL` | From address | e.g. `iaec@lmcp.ac.in` |
| `IAEC_SENDER_NAME` | From display name | e.g. `Member Secretary IAEC` |
| `IAEC_PPT_GOOGLE_FORM_URL` | Optional | Link for PI to upload presentation |
| `IAEC_SUPPORT_CONTACT` | Optional | Shown in invitation email |
| `LMCP_ESTABLISHMENT_NAME` | Certificates/PDFs | Default: L. M. College of Pharmacy, Ahmedabad |
| `LMCP_CPCSEA_REGISTRATION_NUMBER` | Certificates/PDFs | CPCSEA reg. no. on documents |
| `FORMB_ATTACHMENT_DIR` | Form B file storage | Default: `data/form_b_attachments` |

---

## 5. Part A — IAEC Secretariat SOP

### 5.1 High-level Form B approval workflow

```
Investigator submits Form B
        ↓
IAEC reviews completeness (Form B PDF, attachments, Annexure I)
        ↓
Create IAEC meeting (number, date, time, venue)
        ↓
Assign Form B to meeting
        ↓
Send meeting invitation email to PI (optional; may be sent before or after protocol)
        ↓
Record meeting decision
        ↓
[If approved] Generate LMCP/IAEC protocol number
        ↓
PI may begin work only after written approval (Declaration 9)
        ↓
[Later] Provisional → Final → Signed hard-copy certificate
```

**Note:** **Send invitation** is available as soon as Form B is assigned to a meeting. Protocol number and approved decision are **not** required to send the invitation; the email text and PDF attachment adapt whether a protocol number exists yet.

**Primary workspace:** **IAEC Dashboard** at `/iaec-dashboard`

---

### 5.2 Logging in and navigation

1. Open LMCPAFM and sign in with your institutional account.  
2. You are redirected to **IAEC Projects** (`/iaec-projects`) or can open **IAEC Dashboard** from the navigation bar.  

| Menu item | URL | Purpose |
|-----------|-----|---------|
| IAEC Dashboard | `/iaec-dashboard` | Main Form B workflow hub |
| IAEC Projects | `/iaec-projects` | List/create projects |
| Form C | `/form-c` | Breeding & stock register (read-only) |
| Allocations | `/allocations` | Issue animals against approved requisitions |
| Requisitions | `/requisitions` | View/create requisitions (if needed) |

**Note:** The old **IAEC Workflow** menu item (`/iaec/workflow`) redirects to **IAEC Dashboard**. Use the dashboard for all Form B decisions (assign meeting → send invitation → record decision → generate protocol).

---

### 5.3 Step 1 — Review submitted Form B applications

**When:** After an investigator clicks **Submit Form B**.

**Where:** IAEC Dashboard → **Form B records** table.

**What you see:**

| Column | Meaning |
|--------|---------|
| Form B ID | Internal identifier |
| Project | Project title |
| Form B date | Submission date |
| Meeting | Assigned meeting or “Not assigned” |
| Protocol | `LMCP/IAEC/YYYY/meeting/serial` or blank |
| Decision | Recorded decision or “Not recorded” |

**Review actions (before meeting assignment):**

1. Open the project for detailed review:  
   - From IAEC Projects: `/iaec-projects/:id`  
   - Or project review: `/iaec/project/:projectId/review`  
2. Download Form B application PDF via API or investigator workspace.  
3. Verify:  
   - All wizard steps saved  
   - Funding proof attached  
   - Annexure I (study plan) present  
   - Hazardous-agent certificates if applicable  
   - At least one LMCP faculty on investigator team  

**If incomplete:** Contact the investigator. After submission, Form B is **read-only** for the investigator; they cannot edit wizard steps. If still in draft (not submitted), the investigator can amend and resubmit.

---

### 5.4 Step 2 — Create an IAEC meeting

**Route:** `/iaec/meetings/new` (or **+ New meeting** on IAEC Dashboard)

**Required fields:**

| Field | Required | Notes |
|-------|----------|-------|
| Meeting number | **Yes** | e.g. `8` — used in protocol number |
| Meeting date | **Yes** | ISO date |
| Meeting time | **Yes** | e.g. `10:30` — shown in invitation email |
| Venue | **Yes** | e.g. `IAEC Conference Room` — shown in invitation email |
| Minutes | No | Optional text; can be added later |

**Action:** Click **Create meeting** → returns to IAEC Dashboard.

**Why meeting number matters:** Protocol numbers are formatted as:

```
LMCP/IAEC/{year}/{meeting_number}/{serial:03d}
```

Example: `LMCP/IAEC/2026/8/001`

Without a meeting number, protocol generation **will fail**.

---

### 5.5 Step 3 — Assign Form B to a meeting

**Where:** IAEC Dashboard → Form B records → **Actions** column.

**Action:**

1. For a row with **Meeting = Not assigned**, open the **Assign meeting…** dropdown.  
2. Select the target meeting (date and number shown).  
3. Assignment saves immediately.

**Prerequisite:** Meeting must exist (Step 5.4).

**After assignment:** **Record decision**, **Send invitation**, and (after approval) **Generate protocol** buttons become available.

---

### 5.6 Step 4 — Record meeting decision

**Where:** IAEC Dashboard → **Record decision** (or **Edit decision**).

**Decision values:**

| Decision | Meaning | Protocol eligible? |
|----------|---------|------------------|
| `approved` | Approved as submitted | Yes |
| `approved_with_revisions` | Approved subject to noted revisions | Yes |
| `rejected` | Not approved | No |
| `animal_count_amended` | Approved with amended animal count | Yes (count required) |

**Fields in decision panel:**

| Field | When required |
|-------|---------------|
| Decision | Always |
| Approved animal count | Required if decision = `animal_count_amended` (must be > 0) |
| Remarks | Optional IAEC comments |

**Action:** Save decision.

**Prerequisites:**

- Form B must be assigned to a meeting  
- For `animal_count_amended`, enter a valid approved count  

**After approval decision:** **Generate protocol** button appears (if protocol not yet issued).

---

### 5.7 Step 5 — Generate protocol number

**Where:** IAEC Dashboard → **Generate protocol** button.

**Prerequisites (all required):**

| # | Check |
|---|-------|
| 1 | Form B assigned to meeting |
| 2 | Meeting has a **meeting number** |
| 3 | Decision is approved (`approved`, `approved_with_revisions`, or `animal_count_amended`) |
| 4 | Protocol number not already generated |

**Action:** Confirm the dialog → system assigns protocol number.

**System effects on generation:**

- Sets `project.protocol_number`  
- Sets `project.approval_date` to meeting date  
- Sets `project.status` to `approved` (if not already set)  
- Syncs **experiment groups** from the Form B study plan (Annexure I)  

**After generation:** Protocol number appears in dashboard and on Form B PDF. Send a follow-up invitation if the PI was notified before the protocol was issued.

---

### 5.8 Step 6 — Send meeting invitation email

**Where:** IAEC Dashboard → **Send invitation** (also available on **Meeting details** for each assigned Form B).

**Prerequisites:**

| # | Check |
|---|-------|
| 1 | Form B submitted and assigned to a meeting |
| 2 | PI contact email resolvable (Form B Step 1, saved) |
| 3 | SMTP configured on server |

Protocol number and approved decision are **not** required. If a protocol number exists, it is included in the email subject and body.

**Email contents:**

- Meeting date, time, venue, and number  
- Protocol number (if already generated)  
- Form B application PDF attachment  
- Google Form link for PPT upload (`IAEC_PPT_GOOGLE_FORM_URL`) when configured  
- Support contact (`IAEC_SUPPORT_CONTACT`) when configured  

**Action:** Confirm → the system **assigns the LMCP/IAEC protocol number** (if not already set), sends the email **immediately**, and returns the recipient and protocol number. The UI shows **“Invitation sent to …@lmcp.ac.in”** and **“Protocol number: LMCP/IAEC/…”** on success, or an SMTP error if delivery fails.

**Dashboard updates:** After a successful send, **IAEC Dashboard** and the **investigator dashboard** show the protocol number in the project/Form B row (investigator may need to refresh the page).

**If email fails:**

- Verify investigator saved contact email on Form B Step 1 (not just profile prefilled)  
- Verify SMTP settings in `.env` (`IAEC_SMTP_HOST`, `IAEC_SENDER_EMAIL`, credentials)  
- Check PI inbox and spam folder  
- Check backend logs: `docker compose logs backend --tail 50`

---

### 5.9 Step 7 — Meeting management & summary PDF

**View meeting details:** `/iaec/meetings/:meetingId`

Shows all Form B applications assigned to that meeting with links to review and **Send invitation** per project. Meeting assignment is done on the **IAEC Dashboard**, not on this page.

**Download meeting summary PDF:** IAEC Dashboard → **IAEC meetings** section → **Download summary** for a meeting.

Produces a PDF listing all projects, investigators, protocol numbers, and decisions for that meeting.

---

### 5.10 Approval certificates

**Route:** `/iaec/project/:projectId/certificate`

#### Certificate types

| Type | When issued | Valid for publication? |
|------|-------------|------------------------|
| **Provisional** | After IAEC approval; experimentation incomplete | **No** — includes disclaimer |
| **Final (digital)** | All experiment/allocation/logging requirements met | Compliance record; awaiting signatures |
| **Signed hard copy** | Final + scanned signed PDF uploaded | **Yes** — official for journals |

#### IAEC actions on certificate page

1. **View** certificate data (establishment, CPCSEA no., protocol, PI, meeting, decision, animal usage).  
2. **Download system PDF** — provisional or final depending on project state.  
3. **Upload signed certificate** (IAEC, staff, or admin) — PDF/JPG/PNG after digital final requirements are met. Frontend route `/iaec/project/:projectId/certificate` allows **iaec**, **staff**, and **admin** roles (in addition to investigator view/download).

**Signed upload prerequisites:**

- Project must qualify for **final** digital certificate first  
- Accepted formats: `.pdf`, `.jpg`, `.jpeg`, `.png`  
- Stored under `data/project_signed_certificates/{project_id}/`  

**Investigator access:** PIs with approval-letter permission can view/download from their project workspace.

---

### 5.11 Form C register (IAEC read access)

**Route:** `/form-c`

Read-only **Breeding and Stock Register** compiled from facility inventory:

- Stock on hand  
- Acquisitions  
- Breeding births  
- Disposals/deaths  
- Supplied/issued (allocations)  

**Actions:** Refresh register, **Download PDF**.

IAEC uses Form C for CPCSEA compliance monitoring. Data is **not edited** on this page — it reflects facility and allocation records entered by staff/admin.

---

### 5.12 Allocations and requisitions (IAEC role)

IAEC users **can** create allocations and requisitions via API (same as staff). Frontend routes:

| Page | URL | Notes |
|------|-----|-------|
| Allocations | `/allocations` | Issue animals against approved requisition |
| Requisition detail | `/requisitions/{id}` | View counts, status; PI may **amend/cancel** until first allocation |
| Requisitions list | `/requisitions` | Create / lookup |

**PI requisition changes (before allocation):**

- Only the **principal investigator** may amend or cancel an active requisition.  
- Once **staff or IAEC records an allocation** against that requisition, counts are **locked**; corrections need facility/IAEC coordination.  
- **Cancelled** requisitions cannot receive new allocations.

**Allocation prerequisites:**

- Protocol must have **protocol number** and **approval date**  
- Project status must be `approved`  
- Requisition **status** must be `active` (not cancelled)  
- Sufficient **available** animals in facility for species/strain  
- Allocation must not exceed **requested** counts on the requisition line  

Detailed animal-issue procedures are typically performed by **facility staff**; IAEC may oversee or approve in exceptional cases.

---

### 5.13 IAEC quick reference — action order

| Order | Task | Page |
|-------|------|------|
| 1 | Review submitted Form B | IAEC Dashboard / Project review |
| 2 | Create meeting | `/iaec/meetings/new` |
| 3 | Assign Form B to meeting | IAEC Dashboard |
| 4 | Send invitation (optional; before or after decision) | IAEC Dashboard or Meeting details |
| 5 | Record decision | IAEC Dashboard |
| 6 | Generate protocol (after approved decision) | IAEC Dashboard |
| 7 | Download meeting summary | IAEC Dashboard |
| 8 | Monitor certificates | `/iaec/project/:id/certificate` |

---

## 6. Part B — Superadmin (Admin) SOP

### 6.1 High-level superadmin responsibilities

```
Create institutional accounts (admin, iaec, staff)
        ↓
Assign and update roles
        ↓
Monitor system summary and activity logs
        ↓
Configure animal facility (rooms, cages, procurement, breeding)
        ↓
Maintain Form C data indirectly via facility operations
        ↓
Delete obsolete accounts (with safeguards)
        ↓
Upload signed IAEC certificates (when requested)
```

**Primary workspace:** **Superadmin Dashboard** at `/admin-dashboard`

---

### 6.2 Logging in and navigation

1. Sign in with an `admin` role account.  
2. Landing page: `/admin-dashboard`.

| Menu item | URL | Purpose |
|-----------|-----|---------|
| Superadmin | `/admin-dashboard` | User mgmt, system summary |
| Facility Admin | `/admin/facility` | Full facility CRUD |
| Form C | `/form-c` | Stock register |
| Facility | `/facility` | Operations view (shared with staff) |

**Note:** `/users` redirects admins to `/admin-dashboard`. Staff use `/users` for simpler account creation.

---

### 6.3 User account management

#### 6.3.1 Create institutional accounts

**Where:** Admin Dashboard → **Create institutional user**

**Allowed roles:** `admin`, `iaec`, `staff` only.

| Field | Required |
|-------|----------|
| Name | Yes |
| Email | Yes (institutional) |
| Password | Yes (min. 8 characters) |
| Role(s) | At least one of admin/iaec/staff |

**Cannot create:** Investigator accounts. Direct investigators to `/register-investigator`.

#### 6.3.2 View user directory

**Where:** Admin Dashboard → **User Directory**

- Filter by role: all, admin, iaec, staff, investigator  
- Investigators show **Self-registered** — roles cannot be edited from admin console  

#### 6.3.3 Edit roles

**Who can edit:** Institutional accounts only (not self-registered investigators).

**Action:** Click **Edit roles** → select `admin`, `iaec`, and/or `staff` → Save.

**Restrictions:**

- Cannot assign `investigator` role via admin API  
- Cannot remove the last `admin` from the system  

#### 6.3.4 Delete users

**Who can delete:** Superadmin only.

**Safeguards — deletion blocked if:**

| Condition | Reason |
|-----------|--------|
| Target is yourself | Prevent lockout |
| Target is the last admin | Preserve system access |
| User has animal requisitions on record | Preserve audit trail |

**Action:** Confirm deletion dialog → account permanently removed.

---

### 6.4 System monitoring

#### 6.4.1 System summary

**Where:** Admin Dashboard → **System Summary**

Shows counts of users, projects, requisitions, and related entities.

#### 6.4.2 Activity logs

**Where:** Admin Dashboard → **Activity Logs**

Recent administrative actions (user creation, role changes, deletions).

#### 6.4.3 Facility operations summary

**Where:** Admin Dashboard → facility operations card (when available)

High-level indicators: animal counts, room status, environment logs, low stock alerts, stale care logs.

---

### 6.5 Facility administration

**Route:** `/admin/facility`

Full facility control beyond staff daily operations:

| Area | Examples |
|------|----------|
| Rooms & cages | Create/edit rooms, cages, capacity |
| Procurement | Record animal acquisitions |
| Breeding | Breeding events and births |
| Outcomes | Deaths, sacrifice, disposal |
| Animal management | Move, weight, quarantine release |
| Supplies | Supply item CRUD |
| Dashboards | Census, operations hub |

**Staff facility page** (`/facility`) provides read/care/supply/environment operations **without** structural CRUD. Superadmin uses **Facility Admin** for master data.

Changes made here feed into **Form C** register and allocation availability.

---

### 6.6 Certificates (superadmin role)

Superadmin **cannot** run the IAEC Form B workflow from the frontend (requires `iaec` role).

Superadmin **can**:

- Upload **signed hard-copy certificates** on `/iaec/project/:projectId/certificate` if they also hold `iaec` or `staff` role, **or** via API  
- Download system-generated and signed certificates via API  

For routine certificate workflow, IAEC secretariat should perform uploads. Superadmin assists when IAEC role is unavailable.

---

### 6.7 Superadmin quick reference

| Task | Where |
|------|-------|
| Create IAEC member account | Admin Dashboard → Create user (role: iaec) |
| Create facility staff account | Admin Dashboard → Create user (role: staff) |
| Create another superadmin | Admin Dashboard → Create user (role: admin) |
| Change someone’s roles | User Directory → Edit roles |
| Remove obsolete account | User Directory → Delete |
| Configure facility master data | `/admin/facility` |
| View Form C register | `/form-c` |
| Check system health | Admin Dashboard summary + logs |

---

## 7. Troubleshooting

### 7.1 IAEC issues

| Problem | Likely cause | Solution |
|---------|--------------|----------|
| No Form B in dashboard | None submitted yet | Wait for investigator submission |
| Cannot assign meeting | No meetings created | Create meeting first |
| Generate protocol disabled | No approved decision | Record approved decision |
| Generate protocol fails | Meeting missing number | Edit meeting or recreate with number |
| Send invitation fails | SMTP not configured | Set `IAEC_SMTP_*` in `.env`; restart backend |
| Send invitation fails | No PI email | Investigator must save Step 1 contact email |
| Send invitation fails | SMTP auth / relay error | UI shows delivery error; check logs and Gmail app password |
| PI did not receive email | Wrong/unsaved email or spam | Verify Form B Step 1; check spam; resend from dashboard |
| Certificate shows provisional only | Experiment work incomplete | PI must complete groups, allocations, logs |
| Cannot upload signed cert | Final requirements not met | Complete experiment workflow first |

### 7.2 Superadmin issues

| Problem | Likely cause | Solution |
|---------|--------------|----------|
| Cannot open IAEC Dashboard | No `iaec` role | Assign iaec role or use IAEC account |
| Cannot delete user | Has requisitions / last admin / self | Review deletion safeguards |
| Cannot edit investigator roles | Self-registered account | Investigators manage own registration |
| Email already exists | Duplicate account | Use different email or locate existing user |
| Form C empty | No facility data | Enter procurement/allocation via facility admin |

### 7.3 Authentication

| HTTP / UI | Meaning |
|-----------|---------|
| Redirect to `/login` | Session expired — sign in again |
| `/not-authorized` | Your role cannot access that page |
| 401 API error | Token invalid — log out and back in |

---

## 8. URL quick reference

### IAEC routes

| Page | URL |
|------|-----|
| IAEC Dashboard | `/iaec-dashboard` |
| Create meeting | `/iaec/meetings/new` |
| Meeting details | `/iaec/meetings/:meetingId` |
| IAEC projects | `/iaec-projects` |
| Project view | `/iaec-projects/:id` |
| Project edit | `/iaec-projects/:id/edit` |
| Project review | `/iaec/project/:projectId/review` |
| Certificate | `/iaec/project/:projectId/certificate` |
| Form C | `/form-c` |
| Allocations | `/allocations` |

### Superadmin routes

| Page | URL |
|------|-----|
| Admin dashboard | `/admin-dashboard` |
| Facility admin | `/admin/facility` |
| Facility operations | `/facility` |
| Form C | `/form-c` |
| Login | `/login` |

---

## 9. Regulatory reminders

1. **No animal work before written IAEC approval** — system provisional certificate explicitly states this.  
2. **Protocol number** (`LMCP/IAEC/...`) is the official project identifier for requisitions and allocations.  
3. **Form C** must reflect actual facility records — maintain via facility admin and staff operations.  
4. **Signed hard-copy certificate** is required for journal publication; digital final certificate alone is not sufficient.  
5. **Form D** experiment records are the investigator’s responsibility after approval (see investigator SOP).  

---

## 10. Related documents

| Document | Audience |
|----------|----------|
| `Docs/form_b_investigator_sop.md` | Investigators submitting Form B |
| `Docs/lmcp_cursor_rebuild_procedures.md` | Developers / IT deployment |
| `.env.example` | Server configuration reference |

---

## 11. Document control

| Item | Detail |
|------|--------|
| Prepared for | LMCP IAEC secretariat and LMCPAFM superadministrators |
| Based on | Application behaviour as implemented in LMCPAFM |
| Review cycle | Update when IAEC workflow, roles, or certificate logic changes |
| Maintainer | LMCPAFM system administrator |
| Version | 1.1 — Aug 2026: invitation before protocol, sync email, meeting time/venue, Form B read-only after submit |

For technical failures, contact the LMCPAFM system administrator. For ethical/regulatory questions, contact the IAEC Chairperson / Member Secretary.

---

*End of SOP*
<div style="page-break-after: always;"></div>

# Part 9 — Animal house daily operations SOP

**Document type:** Standard Operating Procedure  
**Audience:** Animal house **support staff** (`staff` role in LMCPAFM) and facility **in-charge**  
**Institution:** L. M. College of Pharmacy (LMCP), Ahmedabad  
**Adapted from:** Industry reference SOPs listed in `Docs/facility_sop_source_catalog.md` (PH101–PH113, PH106, PH108, PH111, PH122, PH123, etc.)  
**LMCPAFM:** Record logs in the application where noted; paper records may still be required by CPCSEA/IAEC — follow the stricter rule.

**Related:** `Docs/sop_admin_personnel.md` (rooms/cages setup), `Docs/sop_student_personnel.md`, `Docs/sop_faculty_personnel.md`

---

## 1. Objective

To describe **daily and routine** tasks for running the LMCP animal house safely and consistently: entry, cleaning, cage washing and change, feeding, environmental monitoring, quarantine, waste disposal, and recording activities.

This SOP does **not** replace an **IAEC-approved protocol** for experimental procedures on animals assigned to a project.

---

## 2. Scope

**In scope:** General husbandry, facility hygiene, environmental logs, incoming animal quarantine, waste routes, daily activity records.

**Out of scope:** Toxicology study techniques, compound dosing, clinical pathology, histopathology processing (see investigator/protocol SOPs).

---

## 3. Roles

| Role | Responsibility |
|------|----------------|
| **Facility staff** | Perform tasks in this SOP; enter **care** and **environment** logs in LMCPAFM |
| **Facility in-charge** | Supervise compliance; escalate deviations; coordinate with IAEC/admin |
| **Administrator** | Maintain rooms, cages, and master data in **Admin → Facility** |
| **Investigators** | Animal use only after IAEC approval; requisitions and allocations via LMCPAFM |

---

## 4. Safety and entry (adapted from PH108)

### 4.1 General rules

1. Enter and leave the animal house only through the designated **change area / air lock** (as built at LMCP).  
2. **Street shoes** stay in the shoe rack outside the clean side.  
3. Wear **clean lab coat** (and other PPE required by LMCP: gloves, mask if policy says so).  
4. Use **facility slippers or dedicated footwear** inside the animal rooms.  
5. **Wash/sanitize hands** when entering and leaving.  
6. Do not bring food, drink, or personal bags into animal rooms.  
7. Visitors enter only with **written permission** from the facility in-charge or IAEC, and must follow the same PPE and entry route.

### 4.2 Illness and restrictions

Staff with open wounds, respiratory infection, or illness that may affect animals should **report to the in-charge** and may be assigned non-animal tasks until fit.

---

## 5. Environmental monitoring (adapted from PH106)

### 5.1 What to record

For **each animal room**, record at least **once per day** (or more often if IAEC/CPCSEA or equipment manual requires):

- Date  
- Room (select from LMCPAFM room list)  
- **Temperature (°C)**  
- **Relative humidity (%)**  
- HVAC/status (normal / issue — use notes if not normal)  
- Light cycle (if applicable, e.g. “12:12”)  
- Name of person performing the check  

Acceptable ranges must follow **LMCP IAEC-approved facility standards** and **actual HVAC/dehumidifier capability** recorded in **`Docs/facility_equipment_register.md`** (Section A and H). Do not copy generic industry ranges until that register is filled and signed off.

### 5.2 Where to record in LMCPAFM

1. Log in as **staff**.  
2. Open **Facility** (Staff Facility page).  
3. Go to the **Environment** tab.  
4. Enter the log and save.  
5. If a room shows on the dashboard as **missing today’s environment log**, complete it before end of shift.

### 5.3 Out-of-range readings

1. Note the deviation in the log **notes** field.  
2. Inform the **facility in-charge** immediately.  
3. Take corrective action (HVAC adjustment, temporary relocation if approved, etc.).  
4. Document follow-up in care/environment notes or incident record per college policy.

---

## 6. Room cleaning and sanitation (adapted from PH113)

### 6.1 Frequency

- **Floors:** Dry sweep as needed; **wet mop with approved disinfectant** at least **twice daily** for active rooms, and whenever spills occur.  
- **Corridors and common areas:** Same schedule as rooms or as posted by in-charge.  
- **Walls and ceilings:** Periodic cleaning per schedule (weekly/monthly — define locally).  
- **Spills (bedding, feed, waste):** Remove immediately; clean and disinfect affected area.

### 6.2 Method (principles)

1. Remove visible debris first.  
2. Use **facility-approved** detergents and disinfectants at labeled dilution.  
3. Allow contact time as per disinfectant label.  
4. Rinse if required by disinfectant instructions before animals return to wet areas.  
5. Do not mix chemicals unless SOP allows.  
6. Keep cleaning tools **dedicated** to animal house where possible.

### 6.3 Recording

Significant cleaning (scheduled deep clean, post-outbreak clean) should be noted in **Care logs** (type/note as defined by in-charge) or the college’s paper log if still mandatory.

---

## 7. Cage emptying, washing, and cage change (adapted from PH101, PH102, PH104)

### 7.1 Emptying dirty cages

1. Move cage to **dirty/wash area** (not corridor).  
2. Remove animals only according to **protocol or husbandry plan** (transfer to clean cage — see cage change).  
3. Dispose of bedding and waste per **Section 10**.  
4. Stack cages for wash in designated area only.

### 7.2 Washing

1. Use **cage washer** or manual wash per equipment SOP.  
2. Use approved cage detergent; rinse thoroughly.  
3. Inspect for residual matter; re-wash if needed.  
4. Dry or drip-dry as per equipment instructions before rebedding.  
5. **Rabbit / large cages:** follow separate wash SOP if applicable (industry ref. PH110).

### 7.3 Cage change (rodents and similar)

1. Prepare **clean cage** with appropriate bedding, feed, and water.  
2. Transfer animals with minimum stress; use clean handling tools.  
3. Update **cage label/identity** to match LMCPAFM cage record.  
4. Note high-risk or sick animals in **care log** and inform in-charge.  
5. Frequency: per **species SOP** and IAEC requirements (often weekly or as needed for overcrowding/wet bedding).

### 7.4 LMCPAFM

- Cage master data (label, room, location/rack text) is maintained by **admin**; staff report label changes to in-charge.  
- Animal movements tied to **allocations** are done through allocation workflow, not by ad-hoc cage edits.

---

## 8. Feeding and water (adapted from PH103, PH105, PH109)

1. Provide **species-appropriate** feed and **fresh water** daily (or ad libitum per protocol).  
2. Check feeders and water valves/bottles for clogging and leakage.  
3. Where feed intake measurement is required for studies, follow **investigator/protocol** instructions and record on study sheets.  
4. For **general colony** maintenance, record routine feeding checks in **Care logs** when your in-charge requires it.  
5. Store feed off the floor, protected from pests; follow expiry and batch rules.

---

## 9. Quarantine of purchased / incoming animals (adapted from PH111)

1. All **new arrivals** enter **quarantine** room/period as defined by LMCP IAEC (duration and tests — define in local annexure).  
2. **Do not** mix quarantine animals with approved project colonies until cleared.  
3. Record receipt in LMCPAFM **Procurement** (admin or staff per local rule): species, strain, count, supplier, date.  
4. Monitor health daily; record observations in **care logs**.  
5. Release from quarantine only with **in-charge or vet** sign-off per local policy.

---

## 10. Waste disposal (adapted from PH122)

1. Separate **carcass**, **bedding**, **sharps**, and **general** waste as per LMCP bio-medical waste rules.  
2. Use labeled bins; do not overfill.  
3. Store waste in designated area until pickup/disposal.  
4. Document disposal when college policy requires (log book or care note).  
5. Never dispose of live animals except by **approved euthanasia method** under protocol or humane endpoint policy.

---

## 11. Daily activity recording (adapted from PH123)

### 11.1 What staff must record

At minimum, the facility should capture each day:

- Environment readings per room  
- Unusual events (equipment failure, sick animal, escape, injury)  
- Cage wash / deep cleaning when performed  
- Quarantine observations  
- Supply issues (low feed, bedding)

### 11.2 LMCPAFM care logs

1. **Staff Facility → Care** tab (or Facility Operations Hub quick log).  
2. Select log type / room / cage as available on the form.  
3. Enter date, notes, and your name.  
4. Save before end of shift.

Paper **daily activity sheets** may continue if IAEC requires them; **LMCPAFM should mirror** the same facts to avoid duplicate conflicting records.

---

## 12. Breeding colonies (adapted from PH118 / PH120)

If LMCP maintains breeding colonies:

1. Follow pairing, separation, and weaning rules in the **breeding SOP annex** (to be written per species).  
2. Enter breeding events in **Admin Facility → Breeding** (or as trained by admin).  
3. Use **inbreeding monitoring** (industry form → LMCP breeding records).  
4. Do not use breeding stock for experiments unless approved and recorded.

---

## 13. Internal audit (adapted from PH049)

The facility in-charge or QA nominee should periodically verify:

- [ ] Environment logs complete for all rooms  
- [ ] Care logs used for deviations and key tasks  
- [ ] Cleaning schedules met  
- [ ] Quarantine rules followed  
- [ ] Waste routes compliant  
- [ ] Staff entry/PPE rules followed  
- [ ] LMCPAFM cage map matches physical house  

Record audit findings and corrective actions per college QA procedure.

---

## 14. Equipment calibration (summary)

Balances, sterilizers, cage washers, and refrigerators require **make/model-specific** procedures. Complete **`Docs/facility_equipment_register.md`** first, then use the dedicated **`sop_facility_equipment_calibration.md`** (to be drafted from register rows). Do not use uncalibrated balances for study-critical weights until verified.

---

## 15. Troubleshooting

| Issue | Action |
|-------|--------|
| Missing room in LMCPAFM | Ask **admin** to create room/cage |
| Cannot save environment log | Check room selected, date, numeric fields |
| Animal allocated to project | Movements via **allocations**, not manual cage reassignment without staff workflow |
| Sick animal | Isolate if possible; notify in-charge and investigator; document in care log |

---

## 16. Document control

| Item | Detail |
|------|--------|
| Source industry files | `Docs/source_industry/Animal House SOP/` (PH101–PH113, PH106, PH108, PH111, PH122, CRO-AH PH-123, etc.) |
| LMCP rewrite | This file — review with facility in-charge and IAEC |
| Review period | Recommend annual or when facility layout/equipment changes |

---

*End of facility daily operations SOP*
<div style="page-break-after: always;"></div>

# Part 10 — System administrator SOP

**Who should read this:** The **LMCPAFM system coordinator** (and backup admin) who manages user accounts, faculty roster, master data, and facility baseline data.  
**Not covered here in depth:** Server installation, Docker, DNS, HTTPS — see `Docs/oracle_cloud_setup.md` and `Docs/admin_evaluation_sop.md`.

**System:** LMCP Animal Facility Management (LMCPAFM)  
**Institution:** L. M. College of Pharmacy (LMCP), Ahmedabad  

**Related manuals:**

- `Docs/lmcpafm_iaec_admin_sop.md` — IAEC secretariat procedures  
- `Docs/sop_faculty_personnel.md` — handout for faculty  
- `Docs/sop_student_personnel.md` — handout for students  

---

## 1. Purpose

You keep LMCPAFM running for the college by:

1. Creating and maintaining **user accounts** (admin, IAEC, staff, and optionally pre-registered faculty).  
2. Maintaining the **faculty roster** so only approved faculty can self-register as investigators (when enforcement is on).  
3. Loading **master data** (species, strains) and **facility data** (rooms, cages).  
4. Supporting faculty during Form B and supporting staff during allocations.  
5. **Not** deleting your own admin account or the last admin account.

---

## 2. Understanding account types

The same **institutional email domain** (for example `@lmcp.ac.in`) is used by faculty, students, and support staff. **Email domain alone does not define the role.**

| Person | LMCPAFM role | How account is created |
|--------|--------------|-------------------------|
| **Faculty PI** | `investigator` | Self-register **if on faculty roster** (when enforced), **or** admin pre-creates investigator |
| **Student / scholar** | `investigator` (limited) | Usually admin pre-create **or** register only if college allows; linked on Form B Step 2 by PI |
| **Animal house support** | `staff` | **Admin only** — Create User → role **staff** |
| **IAEC member / secretary** | `iaec` | **Admin only** |
| **System coordinator** | `admin` | Bootstrap script or another admin |

**Tell support staff clearly:** Do **not** use “Register as Investigator”. You will receive a **staff** login.

---

## 3. Logging in as administrator

1. Open the LMCPAFM website.  
2. **Log in** with your admin email and password.  
3. You should land on **Admin Dashboard** (`/admin-dashboard`).

If you cannot log in, use the server bootstrap script (see Section 10) or contact IT.

---

## 4. Admin Dashboard — main areas

| Section | Purpose |
|---------|---------|
| **Facility summary** | Quick link to facility operations |
| **Create User** | New staff, IAEC, admin, or **investigator** accounts |
| **User Directory** | List users, filter by role, delete accounts (not yourself) |
| **Activity Logs** | Recent admin actions |
| **Quick Navigation** | IAEC Dashboard, Facility, Master Data, Form C, Allocations, Requisitions |

---

## 5. Creating user accounts (one person at a time)

1. Go to **Admin Dashboard → Create User**.  
2. Enter **Name** and **Email**.  
3. Enter a **temporary password** (minimum 8 characters). Send it to the user **privately**.  
4. Tick **Active account**.  
5. Select **role(s)**:

| Role | Select when |
|------|-------------|
| **staff** | Animal house, allocations, facility daily work |
| **iaec** | Committee members, Member Secretary |
| **admin** | System coordinators (keep few) |
| **investigator** | Faculty who should **log in without self-registering** |

6. Click **Create User**.

**Investigator pre-registration:**

- Email must be an **allowed institutional address**.  
- System creates an empty **Investigator Profile**; faculty must complete profile before Form B.  
- Roster enforcement applies to **self-registration**, not necessarily to admin create — you can pre-create a faculty account even when roster is used.

**Role rules in UI:**

- Staff / IAEC / admin accounts are edited with **Edit Roles** in the directory.  
- Investigator accounts show as self-service in the directory (no role edit button) — plan roles at creation time.

---

## 6. Faculty roster (~50 faculty emails)

The roster is a list of **approved faculty emails** allowed to use **Register as Investigator** when enforcement is enabled.

### 6.1 Prepare CSV

Use template: `scripts/templates/faculty_roster_template.csv`

| Column | Required | Meaning |
|--------|----------|---------|
| **email** | Yes | Institutional email, lowercase recommended |
| **name** | No | For your records |
| **active** | No | `true` / `false` (default true) |

Example:

```csv
email,name,active
guide.one@lmcp.ac.in,Dr Guide One,true
guide.two@lmcp.ac.in,Dr Guide Two,true
```

**Do not** put support staff or students on this list unless they should self-register as investigators.

### 6.2 Import on server

From the application directory on the server (adjust compose files to match your deployment):

```bash
# Dry run first
sudo docker compose -f compose.yaml -f compose.postgres.yaml -f compose.prod.yaml exec backend \
  python scripts/import_faculty_roster.py --csv /path/to/faculty.csv --dry-run

# Real import
sudo docker compose -f compose.yaml -f compose.postgres.yaml -f compose.prod.yaml exec backend \
  python scripts/import_faculty_roster.py --csv /path/to/faculty.csv
```

Copy the CSV into the container or mount a folder if needed.

### 6.3 Turn on enforcement

In server `.env`:

```env
LMCP_FACULTY_ROSTER_ENFORCE=true
```

Restart the **backend** container. After this, **Register as Investigator** accepts only emails on the active roster (plus normal institutional domain rules).

**Students and support staff** should **not** be on the roster; they use other account paths (Section 2).

### 6.4 Updating the roster later

Re-run import with the same email to **update** name/active flag. Add new rows for new faculty. Set `active=false` to block new self-registration (existing logins are not auto-deleted).

---

## 7. Master data (species and strains)

Form B and requisitions need species/strains in the system.

1. **Admin Dashboard → Master Data** (`/admin/masters`).  
2. Add **Species** (for example Mouse, Rat).  
3. Add **Strains** under each species (for example C57BL/6).  
4. Match names to what the animal house actually uses.

---

## 8. Facility baseline (rooms and cages)

### 8.1 Admin Facility page

**Admin Dashboard → Animal Facility Control** (`/admin/facility`):

- Create **rooms**  
- Create **cages** (label, room, location text for rack/shelf, capacity)  
- Edit cages (label, location, capacity, status)  
- Procurement, breeding, care logs (operational; staff may also use facility pages)

### 8.2 Bulk cage import (many cages)

Template: `scripts/templates/facility_cages_template.csv`

```bash
sudo docker compose exec backend python scripts/import_facility_cages.py --csv /path/to/cages.csv --dry-run
sudo docker compose exec backend python scripts/import_facility_cages.py --csv /path/to/cages.csv
```

There is **no separate “rack” table** — put rack/shelf in the cage **location** field.

---

## 9. Optional: historical IAEC meetings import

Templates: `scripts/templates/iaec_last_three_meetings_template.csv` (fill-in for your last three meets) or `scripts/templates/iaec_meetings_template.csv` (generic examples). See `scripts/templates/README_iaec_meetings_import.md`.

```bash
sudo docker compose exec backend python scripts/import_iaec_meetings.py --csv /path/to/meetings.csv --dry-run
sudo docker compose exec backend python scripts/import_iaec_meetings.py --csv /path/to/meetings.csv
```

This creates **meeting records** only; it does **not** import old Form B approvals or protocols automatically.

### 9.1 Continuous protocol numbering (LMCP tradition)

If your college uses a **global running serial** that does **not** restart each meeting, but still embeds the **meeting number** in the protocol ID, set in production `.env`:

```env
IAEC_PROTOCOL_NUMBER_MODE=continuous
IAEC_PROTOCOL_SERIAL_START=247
IAEC_PROTOCOL_SERIAL_WIDTH=4
```

New approvals become e.g. `LMCP/IAEC/2026/8/0248`, `LMCP/IAEC/2026/9/0249` — same shape as older IDs, but the **last segment** continues across the whole college register.

When importing ongoing or recent protocols, use `scripts/import_iaec_carryover_protocols.py` with `scripts/templates/iaec_carryover_protocols_template.csv` (full protocol string from minutes) so the next auto-number continues correctly.

---

## 10. Bootstrap first admin (emergency / new server)

On the server:

```bash
cd /opt/lmcpafm
sudo docker compose -f compose.yaml -f compose.postgres.yaml -f compose.prod.yaml exec backend \
  python scripts/bootstrap_first_user.py \
  --name "Coordinator Name" \
  --email "coordinator@lmcp.ac.in" \
  --password "StrongTempPassword!" \
  --roles "admin" \
  --update-if-exists
```

Add `iaec,staff` to `--roles` only if this person also tests those workflows.

---

## 11. Database migrations (after code updates)

When developers add new tables (for example faculty roster):

```bash
cd /opt/lmcpafm
sudo docker compose exec backend alembic upgrade head
```

Then rebuild/restart containers if instructed in release notes.

---

## 12. Go-live checklist (admin)

- [ ] Production URL and HTTPS working  
- [ ] `.env` secrets set (JWT, database, not defaults)  
- [ ] At least one **admin** account  
- [ ] **IAEC** and **staff** accounts created  
- [ ] **Faculty roster** CSV imported  
- [ ] `LMCP_FACULTY_ROSTER_ENFORCE=true` if using roster  
- [ ] **Species/strains** entered  
- [ ] **Rooms/cages** entered or imported  
- [ ] Faculty and staff SOPs shared (`Docs/sop_faculty_personnel.md`, `Docs/sop_student_personnel.md`)  
- [ ] Support contact published  

---

## 13. User support — common requests

| User says | You do |
|-----------|--------|
| “I cannot register as investigator” | Check roster + enforce flag; add email to CSV import; or pre-create investigator account |
| “Email already exists” | Tell them to **Log in** or reset password (if policy allows manual reset via new temp password by recreating — prefer password change process your college uses) |
| “Student cannot see Form B” | PI must link student on Form B Step 2; student profile complete |
| “Support staff registered as investigator by mistake” | Delete wrong account if policy allows; recreate as **staff** |
| “Form C is empty” | Normal until staff enter facility/allocation data |

---

## 14. What administrators should not do

- Do not commit `.env` or passwords to git.  
- Do not copy **staging test data** into production database as a shortcut.  
- Do not delete the last **admin** user.  
- Do not share one login for many people.  
- Do not put support staff on the **faculty roster** unless intentional.

---

## 15. Health check

From a browser or command line:

```text
https://YOUR-LMCPAFM-DOMAIN/api/health/ready
```

Should return a healthy/ready response when the backend is up.

---

## 16. Document handouts

| Audience | File |
|----------|------|
| Students | `Docs/sop_student_personnel.md` |
| Faculty | `Docs/sop_faculty_personnel.md` |
| IAEC (in-app workflow) | `Docs/lmcpafm_iaec_admin_sop.md` |
| UAT / staging tests | `Docs/faculty_evaluation_sop.md` |

---

*End of administrator SOP*
<div style="page-break-after: always;"></div>

---

*End of LMCPAFM QA Validation Pack. Regenerate with `python scripts/build_qa_validation_pack.py` after SOP updates.*
