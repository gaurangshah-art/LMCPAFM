# LMCPAFM — Oracle Cloud Infrastructure (OCI) Setup Guide

**Purpose:** Deploy LMCPAFM on Oracle Cloud for **validation (UAT)** with selected users, then promote to **final publication** on the same or a new VM.

**Audience:** System administrator / developer  
**Stack:** Ubuntu VM + Docker Compose + PostgreSQL + Nginx + HTTPS

---

## Overview

```
Internet
   │
   ▼
OCI VM (Ubuntu)
   ├── Nginx :443  ──► frontend container :8080 (React app)
   │              └── /api/* ──► backend container :8000 (FastAPI)
   ├── PostgreSQL container (internal)
   └── /opt/lmcpafm/data  (uploads + certificates, persistent)
```

Use a **staging subdomain** first, e.g. `lmcpafm-staging.lmcp.ac.in`. After validation, either rename DNS to production or deploy a fresh VM with a clean database.

---

## Part 1 — Create Oracle Cloud resources

### 1.1 Oracle Cloud account

1. Go to [https://cloud.oracle.com](https://cloud.oracle.com) and sign up (Always Free tier is enough to start).
2. Choose your **home region** (cannot change later). Pick one close to India if available (e.g. Mumbai `ap-mumbai-1`).

### 1.2 Virtual Cloud Network (VCN)

1. **Networking** → **Virtual cloud networks** → **Create VCN**.
2. Name: `lmcpafm-vcn`, CIDR e.g. `10.0.0.0/16`.
3. Use the wizard with **Internet connectivity** enabled.

### 1.3 Security rules (firewall)

Open **only** what you need on the **public subnet security list**:

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 22 | TCP | Your IP / college IP | SSH |
| 80 | TCP | 0.0.0.0/0 | HTTP (Certbot + redirect) |
| 443 | TCP | 0.0.0.0/0 | HTTPS |

Do **not** expose ports `8000`, `8080`, or `5432` publicly. Docker binds them to `127.0.0.1` via `compose.oracle.yaml`.

### 1.4 Compute instance (VM)

1. **Compute** → **Instances** → **Create instance**.
2. **Name:** `lmcpafm-staging`
3. **Image:** Ubuntu 22.04 or 24.04
4. **Shape:** Ampere A1 (Always Free) — e.g. 2 OCPU, 12 GB RAM, or smaller for UAT
5. **Networking:** Public subnet, assign **public IPv4**
6. **SSH keys:** Upload your public key (generate with `ssh-keygen` if needed)
7. Create instance and note the **public IP**

### 1.5 DNS (optional but recommended)

Ask college IT for a record:

```
lmcpafm-staging.lmcp.ac.in  A  <VM-public-IP>
```

Or use Oracle DNS if the domain is managed there.

---

## Part 2 — Prepare the VM

SSH into the server:

```bash
ssh ubuntu@<VM-PUBLIC-IP>
```

### 2.1 Run the prepare script

```bash
sudo apt-get update && sudo apt-get install -y git
git clone https://github.com/gaurangshah-art/LMCPAFM.git /opt/lmcpafm
cd /opt/lmcpafm
git checkout cursor/iaec-add-num-71772   # or your deployment branch

chmod +x scripts/oci/prepare_vm.sh
./scripts/oci/prepare_vm.sh
```

Log out and back in after Docker install (group membership).

### 2.2 Configure environment

```bash
cd /opt/lmcpafm
cp .env.oracle.example .env
nano .env
```

**Must edit:**

| Variable | Example |
|----------|---------|
| `POSTGRES_PASSWORD` | Strong random password |
| `JWT_SECRET_KEY` | Long random string |
| `VITE_API_BASE_URL` | `https://lmcpafm-staging.lmcp.ac.in/api` |
| `CORS_ALLOW_ORIGINS` | `https://lmcpafm-staging.lmcp.ac.in` |
| `IAEC_SMTP_*` | Working SMTP credentials |

Update `deploy/nginx/lmcpafm-staging.conf` — replace `server_name` with your domain.

---

## Part 3 — Start LMCPAFM (Docker Compose)

```bash
cd /opt/lmcpafm

docker compose \
  -f compose.yaml \
  -f compose.postgres.yaml \
  -f compose.prod.yaml \
  -f compose.oracle.yaml \
  --env-file .env \
  up -d --build
```

Wait until healthy:

```bash
docker compose ps
curl -s http://127.0.0.1:8000/health/ready
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8080/
```

Expected: backend `{"status":"ok",...}` and frontend HTTP `200`.

---

## Part 4 — Nginx reverse proxy + HTTPS

```bash
sudo cp /opt/lmcpafm/deploy/nginx/lmcpafm-staging.conf /etc/nginx/sites-available/lmcpafm
sudo ln -sf /etc/nginx/sites-available/lmcpafm /etc/nginx/sites-enabled/lmcpafm
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Issue TLS certificate (domain must point to this VM):

```bash
sudo certbot --nginx -d lmcpafm-staging.lmcp.ac.in
```

Test in browser:

- `https://lmcpafm-staging.lmcp.ac.in` → login page
- `https://lmcpafm-staging.lmcp.ac.in/api/health/ready` → JSON OK

---

## Part 5 — Create superadmin

```bash
cd /opt/lmcpafm
docker compose exec backend python scripts/bootstrap_first_user.py \
  --name "Gaurang Shah" \
  --email "gaurang.shah@lmcp.ac.in" \
  --password "YourStrongPassword" \
  --roles "admin,iaec,staff"
```

Log in at your staging URL. Validators register at `/register-investigator` with `@lmcp.ac.in` emails.

---

## Part 6 — Validation phase (selected users)

1. Share **staging URL only** with named validators (IAEC, staff, 2–3 PIs).
2. Run through the checklist in `Docs/lmcpafm_iaec_admin_sop.md` and `Docs/form_b_investigator_sop.md`.
3. Log feedback; deploy fixes:

```bash
cd /opt/lmcpafm
git pull
docker compose -f compose.yaml -f compose.postgres.yaml -f compose.prod.yaml -f compose.oracle.yaml --env-file .env up -d --build
```

If `VITE_API_BASE_URL` changed, rebuild includes frontend automatically with `--build`.

---

## Part 7 — Final publication (after sign-off)

**Recommended:** New production VM or new database (no UAT test data).

1. Clone repo on production VM (or reuse staging VM with new `.env` and domain).
2. Fresh `.env` with production domain and **new** secrets.
3. Run compose stack (same commands as Part 3).
4. Bootstrap production admin.
5. Announce `https://lmcpafm.lmcp.ac.in` to all faculty.
6. Decommission staging or restrict staging URL to admins only.

---

## Operations cheat sheet

### View logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
```

### Backup database

```bash
docker compose exec postgres pg_dump -U lmcpafm lmcpafm > ~/backup_$(date +%F).sql
```

### Backup uploads

```bash
sudo tar -czf ~/lmcpafm-data_$(date +%F).tar.gz /opt/lmcpafm/data
```

### Restart stack

```bash
cd /opt/lmcpafm
docker compose -f compose.yaml -f compose.postgres.yaml -f compose.prod.yaml -f compose.oracle.yaml --env-file .env restart
```

### Reset all data (validation only — destructive)

```bash
docker compose exec backend python scripts/reset_application_data.py --confirm
```

Note: With PostgreSQL, prefer `pg_dump` backup first; the reset script is SQLite-oriented for file delete — for Postgres use drop/recreate or restore from empty dump.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Cannot reach site | Check OCI security list (80/443), `sudo ufw status`, nginx running |
| Frontend loads, API fails | Check `VITE_API_BASE_URL` matches `https://domain/api`; rebuild frontend |
| CORS errors | Add exact frontend origin to `CORS_ALLOW_ORIGINS` in `.env`, restart backend |
| IAEC email fails | Verify `IAEC_SMTP_*` in `.env` |
| 502 Bad Gateway | `docker compose ps` — backend must be healthy |
| Certbot fails | DNS A record must point to VM public IP |

---

## Files added for OCI

| File | Purpose |
|------|---------|
| `compose.oracle.yaml` | Localhost port binding + persistent `/data` volume |
| `.env.oracle.example` | Staging environment template |
| `deploy/nginx/lmcpafm-staging.conf` | Nginx reverse proxy |
| `scripts/oci/prepare_vm.sh` | VM bootstrap script |

---

## Related docs

- `DEPLOYMENT.md` — general migration and Docker notes
- `Docs/lmcpafm_iaec_admin_sop.md` — IAEC and superadmin manual
- `Docs/form_b_investigator_sop.md` — investigator manual

---

*End of guide*
