# LMCPAFM — Release candidate validation (internal)

**Branch:** `cursor/iaec-add-num-71772`  
**Target:** Staging QA → production go-live after signed UAT checklist  
**Status:** QA CANDIDATE — frozen unless QA report requests changes  

---

## 1. Automated tests run (Oct 2026)

| Suite | Scope |
|-------|--------|
| `tests/test_formb_study_plan.py` | Study plan save/load, project species/strain, annexure PDF |
| `tests/test_formb_copy.py` | Copy previous Form B → new draft |
| `tests/test_resources_router.py` | In-app SOP catalog and role filtering |
| `tests/test_requisition.py` | Create/get requisition |
| `tests/test_requisition_amend.py` | PI amend; block after allocation |
| `tests/test_password_reset.py` / `tests/test_auth_endpoints.py` | Forgot/change password |
| `tests/test_must_change_password.py` | Mandatory change after admin create |
| `tests/test_certified_animal_handler.py` | Certified faculty gating |

Run locally: `python -m pytest tests/test_formb_study_plan.py tests/test_formb_copy.py tests/test_resources_router.py tests/test_requisition.py tests/test_requisition_amend.py tests/test_password_reset.py tests/test_must_change_password.py tests/test_certified_animal_handler.py`

---

## 2. Database migrations (deploy in order)

1. `a7b8c9d0e1f2` — study group species/strain **Other** text fields  
2. `b8c9d0e1f2a3` — requisition **status**, amend/cancel timestamps  
3. `a8b9c0d1e2f3` — password reset tokens  
4. `b9c0d1e2f3a4` — must change password after admin create  
5. `c0d1e2f3a4b5` — certified animal-handler flag on users  

Command: `alembic upgrade head`

---

## 3. Dependencies

- Python: `markdown` package (in-app SOP HTML rendering) — `pip install -r requirements.txt`  
- Deploy **`Docs/`** folder with backend (in-app guides read markdown from disk)  

---

## 4. QA deliverables

| Artifact | Location |
|----------|----------|
| Combined UAT pack | `Docs/lmcpafm_qa_validation_pack.md` (regenerate: `python scripts/build_qa_validation_pack.py`) |
| Printable checklist | `Docs/faculty_evaluation_checklist.md` |
| Evaluator walkthrough | `Docs/faculty_evaluation_sop.md` |
| Coordinator runbook | `Docs/admin_evaluation_sop.md` |

---

## 5. Known deferred items (not blocking QA)

- **Autosave** on long Form B steps (planned; not implemented)  
- **Optional autosave** called out in Form B investigator SOP §10  

---

## 6. Coordinator sign-off (after external QA)

| Step | Done |
|------|------|
| QA checklist returned with overall recommendation | ☐ |
| Critical defects fixed or accepted with IAEC note | ☐ |
| `sop_master_index.md` statuses → APPROVED | ☐ |
| Production deploy + migration on live DB | ☐ |

---

*Internal document — not for public distribution.*
