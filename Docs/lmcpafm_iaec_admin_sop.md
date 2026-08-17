# LMCPAFM — IAEC & Superadmin Standard Operating Procedure (SOP)

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
| Requisition lookup | `/requisitions/:id` | View requisition details |

**Allocation prerequisites:**

- Protocol must have **protocol number** and **approval date**  
- Project status must be `approved`  
- Sufficient **available** animals in facility for species/strain  
- Requisition must exist and not exceed requested counts  

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
