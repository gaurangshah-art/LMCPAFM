# IAEC meetings CSV import (last three meets)

Use this to load **meeting records only** (date, meeting number, time, venue). It does **not** import Form B, protocols, or decisions.

## Template file

Copy and edit:

`scripts/templates/iaec_last_three_meetings_template.csv`

| Column | Required | Example | Notes |
|--------|----------|---------|--------|
| `date` | Yes | `2025-11-05` | ISO date `YYYY-MM-DD` |
| `meeting_number` | Yes | `42` or `42/2025` | Must match your minutes register (used in protocol IDs when `IAEC_PROTOCOL_NUMBER_MODE=continuous`) |
| `meeting_time` | Yes | `10:30` | 24-hour or as you usually record |
| `venue` | Yes | `IAEC Conference Room` | |
| `minutes` | No | (blank OK) | If blank, import uses a default placeholder |

Replace the three example rows with your **last three IAEC meetings** from the signed minutes book.

## Import commands

From repo root (same `DATABASE_URL` as backend), or inside Docker:

```bash
python scripts/import_iaec_meetings.py --csv scripts/templates/iaec_last_three_meetings.csv --dry-run
python scripts/import_iaec_meetings.py --csv scripts/templates/iaec_last_three_meetings.csv
```

Docker example:

```bash
sudo docker compose exec backend python scripts/import_iaec_meetings.py --csv /path/to/iaec_last_three_meetings.csv --dry-run
```

## After meetings are imported

1. Set continuous protocol numbering in `.env` if used (`IAEC_PROTOCOL_NUMBER_MODE=continuous`, `IAEC_PROTOCOL_SERIAL_START=<last global serial>`).
2. Register **ongoing** approved protocols separately (full `protocol_number` from minutes, approved status, animal cap). Meeting import alone does not create those rows.
3. New Form B work in LMCPAFM: assign to the **next** live meeting created in the app.

## Next: protocols approved in those meetings

Use `scripts/templates/iaec_carryover_protocols_template.csv` and `scripts/import_iaec_carryover_protocols.py`. See `scripts/templates/README_iaec_carryover_protocols_import.md`.
