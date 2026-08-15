# LMCPAFM — Form B Investigator Standard Operating Procedure (SOP)

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
Register → Login → Complete Profile → Step 1 → Step 2 → Step 2b → Step 3 → Step 4 → Step 5 → Step 6 → Step 7 → Review → Submit
                                              ↑
                                    Upload funding proof here
```

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
| Species / Strain | Yes | Select from approved IAEC species/strain lists |
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

## 10. Attachments reference

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

## 11. Troubleshooting

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

## 12. Quick reference — URL map

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

## 13. Document control

| Item | Detail |
|------|--------|
| Prepared for | LMCP investigators using LMCPAFM |
| Based on | Application validation rules and UI as implemented in LMCPAFM |
| Supersedes | Informal/ad hoc instructions |
| Review cycle | Update when Form B schema or wizard steps change |

For IAEC secretariat or technical system issues, contact the institutional IAEC office or LMCPAFM system administrator.

---

*End of SOP*
