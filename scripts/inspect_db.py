import sqlite3
from pathlib import Path

db_path = Path(__file__).resolve().parents[1] / "database" / "LMCPAFM.db"
conn = sqlite3.connect(db_path)
cur = conn.cursor()

tables = ["animal", "procurement", "cage", "animal_movement", "breeding_record"]
for table in tables:
    try:
        cur.execute(f"PRAGMA table_info({table})")
        print(f"{table}:", [r[1] for r in cur.fetchall()])
    except Exception as exc:
        print(f"{table}: ERROR {exc}")

conn.close()
