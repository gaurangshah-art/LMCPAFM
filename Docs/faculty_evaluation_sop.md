# LMCPAFM — Faculty Evaluation SOP (Staging / UAT)

**System:** LMCP Animal Facility Management (LMCPAFM)  
**Environment:** Staging (validation only — not production)  
**URL:** https://lmcpafm-staging.lmcp.ac.in  
**Institution:** L. M. College of Pharmacy, Ahmedabad  
**Purpose:** Structured user-acceptance testing by selected faculty before wider rollout.

---

## 1. Scope and audience

This SOP guides **selected faculty evaluators** through testing the staging deployment.

**Roles**

- **Investigator** — PI / faculty submitting projects → Dashboard, Form B
- **IAEC** — IAEC member / Member Secretary → IAEC Dashboard
- **Staff** — Animal house staff → Allocations
- **Admin** — System coordinator (usually one person) → Admin Dashboard

Evaluators receive **individual login credentials** from the system administrator. Do not share passwords.

---

## 2. Important notes before you start

### 2.1 Staging vs production

- Data on staging is for **testing only**. Entries may be reset during the evaluation period.
- Use **realistic but non-sensitive** sample data (e.g. dummy project titles, test animal counts).
- Report bugs and suggestions; do not treat staging approvals as official IAEC decisions.

### 2.2 Email requirement

- **Investigator self-registration** requires an **`@lmcp.ac.in`** institutional email.
- IAEC meeting invitation emails (if tested) are sent via configured SMTP; confirm with admin if email delivery is in scope for your test.

### 2.3 Browser and access

- Use a modern browser (Chrome, Edge, or Firefox).
- URL must be **`https://`** (padlock icon). If you see “Not secure”, use `https://lmcpafm-staging.lmcp.ac.in` explicitly.
- Log out when finished, especially on shared computers.

### 2.4 Support contact

Record issues using the **feedback form** (link from admin) or email the project coordinator with:

- Your name and role tested
- Date/time
- Page URL
- Steps to reproduce
- Screenshot if possible

---

## 3. Evaluation timeline (suggested)

| Phase | Duration | Activity |
|:------|:---------|:---------|
| A. Orientation | 30 min | Login, profile, navigation |
| B. Role workflows | 2–3 hours | Complete scenarios for your role(s) |
| C. Cross-role review | 1 hour | Optional: observe another role with admin |
| D. Feedback | 30 min | Submit evaluation checklist (Section 8) |

---

## 4. Common tasks (all evaluators)

### 4.1 Login

1. Open https://lmcpafm-staging.lmcp.ac.in
2. Click **Log in**
3. Enter email and password provided by admin
4. Confirm you reach the correct home screen for your role

**Pass criteria:** Login succeeds; wrong role cannot access restricted menus (should see “Not authorized” or redirect).

### 4.2 Logout

1. Use **Log out** from the navigation bar
2. Confirm you return to the login page and cannot use the back button to access protected pages without logging in again

---

## 5. Role-specific test scenarios

### 5.1 Investigator (PI / faculty)

**Goal:** Test project submission from Form B through post-approval workflow entry points.

#### 5.1.1 New investigator registration (optional separate tester)

1. Open **Register as Investigator** on the login page
2. Register with `@lmcp.ac.in` email
3. Complete **Investigator Profile** when prompted

**Pass criteria:** Registration completes; profile completeness gate allows Form B access.

#### 5.1.2 Investigator profile

1. Go to **Investigator Profile**
2. Fill required fields (name, department, qualifications, etc.)
3. Save

**Pass criteria:** Profile shows as complete; dashboard no longer blocks workflow.

#### 5.1.3 Form B application (core test)

Walk through all Form B steps:

1. **Step 1** — Project title, type, funding source
2. **Step 2** — Investigator details
3. **Step 2b** — Co-investigators / collaborators
4. **Steps 4–7** — Animal details, procedures, anaesthesia, euthanasia
5. **Review** — Summary accurate; submit

**Pass criteria:**

- Data persists when moving back/forward between steps
- Validation messages are clear on missing required fields (shown near Save/Next buttons)
- Submit changes project status (visible on dashboard / project view)
- After submit, Form B wizard steps redirect to **read-only view** (`/form-b/view`) — editing is blocked
- Attachments upload if applicable (Annexure, funding proof)

#### 5.1.4 Form B PDF

1. From project view, generate/download **Form B PDF**
2. Open PDF and check:
   - LMCP branding / logo
   - Section I table layout readable
   - Protocol number on page 1 (if assigned)
   - Annexure / funding documents merged when attached

**Pass criteria:** PDF opens; tables and text are not clipped; institutional header correct.

#### 5.1.5 Post-approval workflow (if admin provides approved test project)

1. Open **Requisitions** — create animal requisition
2. Open **Experiment groups** / **Experiments** — enter experiment data
3. Open **Experiment logs** — daily log entry
4. Open **Final report** — entry and view

**Pass criteria:** Investigator can complete entries; saved data visible on revisit.

---

### 5.2 IAEC (committee / Member Secretary)

**Goal:** Test meeting scheduling, project review, decisions, certificates, and invitations.

#### 5.2.1 IAEC dashboard

1. Login → **IAEC Dashboard**
2. Review list of submitted / pending projects

**Pass criteria:** Submitted Form B projects appear with correct status.

#### 5.2.2 Create IAEC meeting

1. **Create meeting** (IAEC Dashboard → **+ New meeting** or `/iaec/meetings/new`)
2. Enter **meeting number**, **date**, **time**, and **venue**
3. Save meeting

**Pass criteria:** Meeting appears on dashboard with number, date, time, and venue.

#### 5.2.3 Assign projects to meeting and review

1. On **IAEC Dashboard**, use **Assign meeting…** for a submitted Form B row
2. Open **Project review** (`/iaec/project/:projectId/review`) to read details
3. Record decision on the dashboard (approve / modifications required / reject — per UI options)

**Pass criteria:** Assignment saves from dashboard; decision saves; project status updates.

#### 5.2.4 Meeting invitation email (if enabled)

1. From **IAEC Dashboard** or **Meeting details**, click **Send invitation**
2. Confirm success message shows recipient email, or note any SMTP error shown
3. Confirm email received (check spam folder)

**Pass criteria:** Email contains meeting date, time, venue, Form B PDF attachment, and Google Form link (if configured). Protocol number appears in email only if already generated.

#### 5.2.5 Approval certificate

1. For approved project, open **Approval certificate**
2. Download / view certificate PDF
3. Upload signed certificate if workflow requires

**Pass criteria:** Certificate renders correctly; signed upload accepted.

#### 5.2.6 Form C (if in scope)

1. Open **Form C**
2. Review data entry and PDF generation

---

### 5.3 Staff (animal house)

**Goal:** Test allocations and facility-facing records.

#### 5.3.1 Allocations list

1. Login → **Allocations**
2. Review pending and active allocations

#### 5.3.2 Process allocation

1. Open an allocation detail
2. Update allocation status / cage assignment per UI
3. Save

**Pass criteria:** Investigator and IAEC can see updated allocation on their views.

#### 5.3.3 Facility page

1. Open **Facility**
2. Review animal house records accessible to staff

#### 5.3.4 Form C

1. Open Form C as staff
2. Verify read/export behaviour

---

### 5.4 Admin (coordinator only)

**Goal:** Verify system configuration — limited to one coordinator.

1. **Admin dashboard** — overview metrics / links
2. **Master data** — species, strains, departments, etc.
3. **Facility admin** — facility configuration
4. Confirm admin cannot bypass IAEC approval workflow

**Pass criteria:** Master data changes reflect in investigator dropdowns; no unintended privilege escalation.

---

## 6. Cross-cutting checks (all roles)

Complete for each item: **Pass** or **Fail**. Add notes where needed.

| # | Check | Result | Notes |
|:--|:------|:-------|:------|
| 1 | HTTPS and college branding visible | ☐ Pass ☐ Fail | |
| 2 | Navigation matches role (no unauthorized pages) | ☐ Pass ☐ Fail | |
| 3 | Forms save and reload correctly | ☐ Pass ☐ Fail | |
| 4 | PDFs generate and are readable | ☐ Pass ☐ Fail | |
| 5 | Error messages understandable | ☐ Pass ☐ Fail | |
| 6 | Mobile/tablet layout acceptable (optional) | ☐ Pass ☐ Fail | |
| 7 | Performance acceptable on college Wi‑Fi | ☐ Pass ☐ Fail | |

---

## 7. Known staging limitations

- **Email:** SMTP must be configured; invitation emails may fail if app password / relay not set.
- **Data reset:** Staging database may be refreshed during fixes.
- **Single VM:** Brief downtime possible during updates (usually off-hours).
- **URL:** Use only `lmcpafm-staging.lmcp.ac.in`.

---

## 8. Evaluator feedback form

Use the printable checklist in **`Docs/faculty_evaluation_checklist.md`** (recommended for UAT sign-off), or complete the detailed form below.

**Evaluator name:** _______________________________________________

**Date:** _______________________________________________

**Role(s) tested:** ☐ Investigator  ☐ IAEC  ☐ Staff  ☐ Admin

**Rating scale:** 1 = Poor · 2 = Fair · 3 = Good · 4 = Excellent · N/A = Not tested

---

**1. Ease of login and navigation**

Rating: ☐ 1 ☐ 2 ☐ 3 ☐ 4 ☐ N/A

Comments: _________________________________________________________________

---

**2. Form B data entry**

Rating: ☐ 1 ☐ 2 ☐ 3 ☐ 4 ☐ N/A

Comments: _________________________________________________________________

---

**3. Form B PDF quality**

Rating: ☐ 1 ☐ 2 ☐ 3 ☐ 4 ☐ N/A

Comments: _________________________________________________________________

---

**4. IAEC meeting and review workflow**

Rating: ☐ 1 ☐ 2 ☐ 3 ☐ 4 ☐ N/A

Comments: _________________________________________________________________

---

**5. Certificates / document upload**

Rating: ☐ 1 ☐ 2 ☐ 3 ☐ 4 ☐ N/A

Comments: _________________________________________________________________

---

**6. Requisitions and allocations**

Rating: ☐ 1 ☐ 2 ☐ 3 ☐ 4 ☐ N/A

Comments: _________________________________________________________________

---

**7. Experiment logs and final report**

Rating: ☐ 1 ☐ 2 ☐ 3 ☐ 4 ☐ N/A

Comments: _________________________________________________________________

---

**8. Overall suitability for LMCP use**

Rating: ☐ 1 ☐ 2 ☐ 3 ☐ 4 ☐ N/A

Comments: _________________________________________________________________

---

**Top 3 strengths**

1. ________________________________________________________________________
2. ________________________________________________________________________
3. ________________________________________________________________________

**Top 3 issues / improvements needed**

1. ________________________________________________________________________
2. ________________________________________________________________________
3. ________________________________________________________________________

**Would you recommend go-live after fixes?**

☐ Yes  ☐ Yes with reservations  ☐ No

**Signature:** _______________________________________________

---

## 9. Administrator checklist (before inviting faculty)

Full runbook: **`Docs/admin_evaluation_sop.md`**  
Printable checklist for evaluators: **`Docs/faculty_evaluation_checklist.md`**

- [ ] Staging URL resolves and uses HTTPS
- [ ] Docker services healthy (backend, frontend, postgres)
- [ ] Evaluator accounts created with correct roles
- [ ] At least one sample submitted Form B for IAEC testers
- [ ] SMTP configured if email testing is required
- [ ] Faculty briefed: staging data is not official
- [ ] Feedback collection method shared (email / form / meeting)

### Create evaluator account (admin — server)

```bash
cd /opt/lmcpafm
sudo docker compose -f compose.yaml -f compose.postgres.yaml -f compose.prod.yaml -f compose.oracle.yaml exec backend \
  python scripts/bootstrap_first_user.py \
  --name "Evaluator Name" \
  --email "evaluator@lmcp.ac.in" \
  --password "TemporaryPassword123!" \
  --roles "investigator" \
  --update-if-exists
```

Adjust `--roles` per person: `investigator`, `iaec`, `staff`, or comma-separated (e.g. `iaec,staff`).

---

## 10. Document control

| **Version** | **Date** | **Author** | **Changes** |
|:--------|:-----|:-------|:--------|
| 1.0 | Aug 2026 | LMCPAFM project | Initial staging UAT SOP |
| 1.1 | Aug 2026 | LMCPAFM project | Print-friendly layout for PDF export |
| 1.2 | Aug 2026 | LMCPAFM project | Align with current IAEC workflow, Form B lock, sync email |

---

*End of SOP*
