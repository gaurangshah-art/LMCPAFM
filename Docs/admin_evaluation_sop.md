# LMCPAFM — Admin SOP for Staging Evaluation (UAT)

**Document title:** Staging User-Acceptance Testing — Administrator Runbook  
**System:** LMCP Animal Facility Management (LMCPAFM)  
**Environment:** Staging only (`lmcpafm-staging.lmcp.ac.in`)  
**Audience:** System coordinator / superadministrator (`admin` role)  
**Related documents:**

- `Docs/faculty_evaluation_sop.md` — handout for faculty evaluators  
- `Docs/oracle_cloud_setup.md` — OCI deployment and operations  
- `Docs/lmcpafm_iaec_admin_sop.md` — day-to-day IAEC and superadmin app use  

---

## 1. Purpose

This SOP describes how the **administrator** plans, runs, and closes a **controlled evaluation** of LMCPAFM on staging before production go-live.

You are responsible for:

- Keeping staging available and healthy  
- Creating and managing evaluator accounts  
- Preparing master data and sample workflows  
- Deploying fixes during the evaluation window  
- Collecting feedback and recording a go / no-go decision  

Faculty follow **`Docs/faculty_evaluation_sop.md`**. You follow **this document**.

---

## 2. Roles and responsibilities

| Who | Responsibility |
|:----|:----------------|
| **Admin (you)** | Staging server, accounts, master data, fixes, feedback collection |
| **IAEC evaluator(s)** | Test meetings, review, certificates, Form C (see faculty SOP §5.2) |
| **Staff evaluator(s)** | Test allocations, facility pages (see faculty SOP §5.3) |
| **Investigator evaluator(s)** | Test Form B, profile, requisitions (see faculty SOP §5.4) |
| **College IT** | DNS, domain, optional SMTP relay |

**Note:** Investigators **self-register** at `/register-investigator` with `@lmcp.ac.in` email. You create **admin**, **iaec**, and **staff** accounts from the Admin Dashboard or server bootstrap script.

---

## 3. Staging reference

| Item | Value |
|:-----|:------|
| **URL** | https://lmcpafm-staging.lmcp.ac.in |
| **API health** | https://lmcpafm-staging.lmcp.ac.in/api/health/ready |
| **Server** | OCI VM `LMCPAFM1_Staging` |
| **SSH** | `ssh -i ~/.ssh/id_ed25519 ubuntu@137.23.46.30` |
| **App directory** | `/opt/lmcpafm` |
| **Data directory** | `/opt/lmcpafm/data` |

Update IP/SSH if the VM changes.

---

## 4. Phase A — Pre-evaluation checklist (before inviting faculty)

Complete every item. Do not invite evaluators until staging is stable.

### 4.1 Infrastructure

- [ ] DNS A record: `lmcpafm-staging.lmcp.ac.in` → current VM public IP  
- [ ] OCI subnet security list allows TCP **22**, **80**, **443**  
- [ ] **No NSG** attached to instance VNIC (or NSG allows 80/443 ingress)  
- [ ] Ubuntu iptables allows **80** and **443** **before** the REJECT rule  
- [ ] HTTPS works (Certbot certificate installed)  
- [ ] Nginx proxies to frontend **8081** and backend **8001**  

**Quick tests (from your PC):**

```powershell
Test-NetConnection 137.23.46.30 -Port 443
curl.exe -I https://lmcpafm-staging.lmcp.ac.in
curl.exe -s https://lmcpafm-staging.lmcp.ac.in/api/health/ready
```

**On server:**

```bash
cd /opt/lmcpafm
sudo docker compose -f compose.yaml -f compose.postgres.yaml -f compose.prod.yaml -f compose.oracle.yaml ps
curl -s http://127.0.0.1:8001/health/ready
```

All services should show **healthy**.

### 4.2 Application configuration

- [ ] `.env` on server: `VITE_API_BASE_URL=https://lmcpafm-staging.lmcp.ac.in/api`  
- [ ] `.env`: `CORS_ALLOW_ORIGINS=https://lmcpafm-staging.lmcp.ac.in`  
- [ ] `.env`: strong `JWT_SECRET_KEY` and `POSTGRES_PASSWORD` (not defaults)  
- [ ] `IAEC_SMTP_*` configured if email testing is in scope  
- [ ] `IAEC_PPT_GOOGLE_FORM_URL` set if PPT upload link is required (e.g. `https://forms.gle/Xn35w2wyhaKK8PXL7`)
- [ ] Frontend rebuilt after any `VITE_*` change (`docker compose ... up -d --build`)  

### 4.3 Admin account

- [ ] At least one `admin` user exists and you can log in  
- [ ] Admin Dashboard loads (`/admin-dashboard`)  

**Create or update superadmin (server):**

```bash
cd /opt/lmcpafm
sudo docker compose -f compose.yaml -f compose.postgres.yaml -f compose.prod.yaml -f compose.oracle.yaml exec backend \
  python scripts/bootstrap_first_user.py \
  --name "Coordinator Name" \
  --email "coordinator@lmcp.ac.in" \
  --password "StrongTempPassword!" \
  --roles "admin,iaec,staff" \
  --update-if-exists
```

Use `--roles "admin"` only if this person will not test IAEC workflows.

### 4.4 Master data (Admin → Masters)

- [ ] Species and strains populated (match college animal house usage)  
- [ ] Any dropdown values investigators need for Form B are present  

Path: **Admin Dashboard → Master data** (`/admin/masters`)

### 4.5 Facility baseline (optional before staff testing)

- [ ] Rooms / facility records configured if staff will test allocations  
- Path: **Admin → Facility** (`/admin/facility`)  

### 4.6 Sample workflow data (recommended)

- [ ] One investigator account registered and profile **complete**  
- [ ] One Form B submitted (so IAEC evaluators have something to review)  
- [ ] Optional: one project approved for post-approval testing (requisitions, logs)  

You can submit a test Form B yourself using an investigator test account.

### 4.7 Faculty materials ready

- [ ] PDF or printout of `Docs/faculty_evaluation_sop.md` shared with each evaluator  
- [ ] Printable checklist `Docs/faculty_evaluation_checklist.md` shared for sign-off  
- [ ] Evaluator credentials prepared (see Phase B)  
- [ ] Feedback channel defined (email, meeting, or shared spreadsheet)  
- [ ] Evaluation window dates communicated  

---

## 5. Phase B — Create evaluator accounts

### 5.1 Recommended evaluator set

| Role | Suggested count | Created how |
|:-----|:----------------|:------------|
| Investigator | 2–3 faculty | Self-register at `/register-investigator` |
| IAEC | 2–3 members | Admin Dashboard or bootstrap |
| Staff | 1–2 animal house staff | Admin Dashboard or bootstrap |
| Admin | 1 coordinator | Bootstrap (you) |

### 5.2 Create accounts in Admin Dashboard (preferred)

1. Log in as admin → **Admin Dashboard**  
2. **Create institutional account** form  
3. Enter name, `@lmcp.ac.in` email, temporary password (min 8 characters)  
4. Select role(s): `iaec`, `staff`, and/or `admin`  
5. Mark account **Active**  
6. Send credentials to evaluator **securely** (not by group WhatsApp)  

**Assignable roles in UI:** `admin`, `iaec`, `staff` only.  
**Investigator** cannot be created here — direct faculty to **Register as Investigator**.

### 5.3 Create accounts via server (bulk / script)

```bash
sudo docker compose -f compose.yaml -f compose.postgres.yaml -f compose.prod.yaml -f compose.oracle.yaml exec backend \
  python scripts/bootstrap_first_user.py \
  --name "Dr IAEC Evaluator" \
  --email "iaec.evaluator@lmcp.ac.in" \
  --password "ChangeMe123!" \
  --roles "iaec" \
  --update-if-exists
```

Repeat for each staff/IAEC evaluator. Ask them to change password after first login (when password-change feature exists; until then use unique strong temp passwords).

### 5.4 Investigator self-registration

Send evaluators this instruction:

1. Open https://lmcpafm-staging.lmcp.ac.in/register-investigator  
2. Use **`@lmcp.ac.in`** email only  
3. Complete **Investigator Profile** before starting Form B  

Monitor **Admin Dashboard → User directory** for new registrations.

---

## 6. Phase C — Run the evaluation

### 6.1 Kickoff (30 minutes)

- Share staging URL and faculty SOP  
- Confirm each evaluator can log in  
- Confirm role-specific home page loads  
- Assign who tests which workflow (avoid duplicate Form B on same project unless intentional)  

### 6.2 During the evaluation window

**Daily admin checks:**

```bash
ssh -i ~/.ssh/id_ed25519 ubuntu@137.23.46.30
cd /opt/lmcpafm
sudo docker compose -f compose.yaml -f compose.postgres.yaml -f compose.prod.yaml -f compose.oracle.yaml ps
sudo docker compose logs backend --tail 30
```

**In Admin Dashboard:**

- Review **System summary** (users, projects, requisitions)  
- Review **Activity logs** for errors or failed logins  
- Watch for new investigator registrations  

**Respond to issues:**

| Issue type | Action |
|:-----------|:-------|
| Login failure | Verify account active; reset password via bootstrap `--update-if-exists` |
| 502 / site down | `docker compose ps`; restart unhealthy service |
| CORS / API errors | Check `.env` URLs; rebuild frontend |
| IAEC email fails | Verify `IAEC_SMTP_*` in `.env`; restart backend |
| Bug in app | Log issue; deploy fix (Phase D) |

### 6.3 What not to do during UAT

- Do not treat staging approvals as official IAEC decisions  
- Do not share one login across multiple evaluators  
- Do not expose staging URL publicly outside the evaluation group  
- Avoid destructive database reset without backup and evaluator notice  

---

## 7. Phase D — Deploy fixes during evaluation

When a fix is merged to the deployment branch:

```bash
ssh -i ~/.ssh/id_ed25519 ubuntu@137.23.46.30
cd /opt/lmcpafm
git pull
sudo docker compose -f compose.yaml -f compose.postgres.yaml -f compose.prod.yaml -f compose.oracle.yaml up -d --build
```

**After deploy:**

```bash
sudo docker compose ps
curl -s http://127.0.0.1:8001/health/ready
```

Notify evaluators of brief downtime and what changed.

**Start stack (if stopped):**

```bash
cd /opt/lmcpafm
sudo docker compose -f compose.yaml -f compose.postgres.yaml -f compose.prod.yaml -f compose.oracle.yaml up -d
```

---

## 8. Phase E — Collect and record feedback

### 8.1 From faculty

- Collect completed **Section 8** forms from `Docs/faculty_evaluation_sop.md`  
- Group issues by severity: **blocker**, **major**, **minor**, **enhancement**  

### 8.2 Admin evaluation record

Complete this summary after the evaluation window:

**Evaluation period:** _______________ to _______________

**Evaluators participated:**

- Investigators: _______________
- IAEC: _______________
- Staff: _______________

**Blockers found (must fix before go-live):**

1. ________________________________________________________________
2. ________________________________________________________________

**Major issues (fix before or soon after go-live):**

1. ________________________________________________________________
2. ________________________________________________________________

**Go-live recommendation:**

☐ **Go** — no blockers; minor items tracked  
☐ **Go with conditions** — list conditions below  
☐ **No-go** — staging needs another evaluation cycle  

**Conditions / notes:**

________________________________________________________________

**Sign-off (coordinator):** __________________ **Date:** __________

---

## 9. Phase F — Backup and close-out

### 9.1 Backup staging data (before major reset or production cutover)

```bash
docker compose -f compose.yaml -f compose.postgres.yaml exec postgres \
  pg_dump -U lmcpafm lmcpafm > ~/backup_$(date +%F).sql

sudo tar -czf ~/lmcpafm-data_$(date +%F).tar.gz /opt/lmcpafm/data
```

Download backups off the VM if needed.

### 9.2 After sign-off

- [ ] Document known limitations for production announcement  
- [ ] Plan production VM / domain (`lmcpafm.lmcp.ac.in`) — see `Docs/oracle_cloud_setup.md` Part 7  
- [ ] Terminate old unused OCI instances  
- [ ] Restrict or decommission staging when no longer needed  

**Production should use a fresh database** — do not copy staging test data to production.

---

## 10. Go-live readiness checklist (admin)

Use before announcing production:

- [ ] All **blocker** UAT issues resolved and retested  
- [ ] Production `.env` with new secrets (not copied from staging)  
- [ ] Production DNS and HTTPS configured  
- [ ] Production admin bootstrapped  
- [ ] IAEC SMTP verified on production  
- [ ] Master data loaded on production  
- [ ] Faculty SOP / user guides updated for production URL  
- [ ] Support contact published  

---

## 11. Troubleshooting quick reference

| Symptom | Likely cause | Fix |
|:--------|:-------------|:----|
| Port 80/443 timeout from internet | OCI NSG or iptables | Remove NSGs; allow 80/443 before REJECT rule |
| Backend restart loop | Missing Python dependency | Rebuild backend image; check `requirements.txt` |
| `invalid hostPort` on compose up | Corrupt `.env` (merged lines) | One variable per line in `.env` |
| Frontend loads, API fails | Wrong `VITE_API_BASE_URL` | Fix `.env`; rebuild frontend |
| Certbot fails | DNS or port 80 blocked | Fix DNS; fix firewall; use webroot at `/var/www/certbot` |
| Evaluator “Not authorized” | Wrong role assigned | Edit roles in Admin Dashboard |
| Investigator cannot submit Form B | Profile incomplete | Complete Investigator Profile |

**View logs:**

```bash
sudo docker compose logs backend --tail 50
sudo docker compose logs frontend --tail 50
sudo journalctl -u nginx --no-pager -n 30
```

---

## 12. Command cheat sheet

| Task | Command |
|:-----|:--------|
| SSH to staging | `ssh -i ~/.ssh/id_ed25519 ubuntu@137.23.46.30` |
| Start stack | `cd /opt/lmcpafm && sudo docker compose -f compose.yaml -f compose.postgres.yaml -f compose.prod.yaml -f compose.oracle.yaml up -d` |
| Rebuild after pull | add `up -d --build` |
| Service status | `sudo docker compose ... ps` |
| API health | `curl -s http://127.0.0.1:8001/health/ready` |
| Reload nginx | `sudo nginx -t && sudo systemctl reload nginx` |
| Renew HTTPS | `sudo certbot renew` |

---

## 13. Document control

| Version | Date | Author | Changes |
|:--------|:-----|:-------|:--------|
| 1.0 | Aug 2026 | LMCPAFM project | Initial admin UAT runbook |

---

*End of SOP*
