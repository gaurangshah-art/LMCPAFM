# LMCPAFM — Standard Operating Procedure for Faculty (Principal Investigators)

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

1. Admin may add you under **Admin Dashboard → Create User** with role **investigator**, your email, and a **temporary password** (sent to you privately). Some faculty (~10–15 college-wide) are also marked **certified for animal handling**; only they may open **Requisitions** / **Allocations** and satisfy the certified-faculty rule on Form B submit.  
2. Use **Log in** (not Register).  
3. On first login, LMCPAFM **requires you to set a new password** before any other page opens. Enter the temporary password as **Current password**, then choose your own **New password** (minimum 8 characters).  
4. After that, complete **Investigator Profile** if prompted.

**Forgot your password later?** On the login page, click **Forgot password?**, enter your institutional email, and follow the link in the email (link expires after about one hour). If email does not arrive, contact the LMCPAFM administrator.

**Support staff** with the same email domain use **staff** accounts — they do **not** use this faculty registration path. Admin-created **staff** and **IAEC** accounts also receive a temporary password and must change it on first login.

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
6. Before **submit**, ensure at least one linked team member is **certified for animal handling** (registered that way by admin). If you are not certified, add a certified colleague on Step 2.  
7. Save Step 2.

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
| Forgot password | **Forgot password?** on login page, or ask admin to set a new temporary password |
| Stuck on password page after login | Required first-time change; use temp password as “current”, pick a new password |
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
