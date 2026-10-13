# LMCPAFM — Standard Operating Procedure for System Administrators

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

Template: `scripts/templates/iaec_meetings_template.csv`

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

When importing ongoing or recent protocols, store the **full** string from minutes (including year and meeting number) so the next auto-number continues correctly.

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
