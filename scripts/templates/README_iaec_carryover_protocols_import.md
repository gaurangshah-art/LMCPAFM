# Import approved protocols from past IAEC meetings

Use this **after** meetings are in LMCPAFM (`import_iaec_meetings.py`).

## Template

Edit and save as your own file (do not commit real protocol data to public git):

`scripts/templates/iaec_carryover_protocols_template.csv`

| Column | Required | Example | Notes |
|--------|----------|---------|--------|
| `meeting_date` | Yes | `2025-11-05` | Must match an imported meeting row |
| `meeting_number` | Yes | `42` | Must match that meeting |
| `protocol_number` | Yes | `LMCP/IAEC/2025/42/0245` | Exact ID from minutes register |
| `project_title` | Yes | Study title | |
| `principal_investigator` | Yes | Dr Name | |
| `pi_email` | No | `name@lmcp.ac.in` | Links PI to login if account exists |
| `approval_date` | No | `2025-11-05` | Defaults to `meeting_date` |
| `approved_animal_count` | Yes | `40` | Original IAEC-approved total (for records) |
| `remaining_animal_count` | No | `30` | If set, used as **animal cap** in LMCPAFM (recommended when animals were already used offline) |
| `decision` | No | `approved` | `approved`, `approved_with_revisions`, or `animal_count_amended` |
| `decision_remarks` | No | text | e.g. pre-LMCPAFM usage note |
| `ongoing` | No | `Y` | `N` = skip row (closed protocols not loaded) |

Only list protocols you need in the app (usually **ongoing** work). Closed studies can stay in paper minutes only.

## Import

```bash
python scripts/import_iaec_carryover_protocols.py --csv path/to/protocols.csv --dry-run
python scripts/import_iaec_carryover_protocols.py --csv path/to/protocols.csv
```

Docker:

```bash
sudo docker compose exec backend python scripts/import_iaec_carryover_protocols.py --csv /path/to/protocols.csv --dry-run
```

## What gets created (minimal)

- `iaec_project` — `status=approved`, protocol number, approval date  
- `form_b` — submitted stub linked to the meeting (not a full wizard)  
- `form_b_meeting_decision` — approved + animal cap  
- `form_b_investigator` — PI row (linked to user when `pi_email` matches)

Does **not** create study plan annexure, attachments, or experiment groups. PIs can plan groups in the app after login if the project is ongoing.

## Continuous protocol numbering

After import, set `IAEC_PROTOCOL_SERIAL_START` in `.env` to the **last global serial** in your register so the next new approval continues correctly.
