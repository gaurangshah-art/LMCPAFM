from uuid import uuid4


def test_import_faculty_roster_from_csv(client, monkeypatch):
    monkeypatch.setenv("LMCP_INSTITUTIONAL_EMAIL_DOMAINS", "lmcp.ac.in")
    email = f"import_roster_{uuid4().hex[:8]}@lmcp.ac.in"

    import tempfile
    from pathlib import Path

    csv_body = f"email,name,active\n{email},Import Test,true\n"
    with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False, encoding="utf-8") as handle:
        handle.write(csv_body)
        csv_path = Path(handle.name)

    try:
        from scripts.import_faculty_roster import import_faculty_roster

        stats = import_faculty_roster(csv_path, dry_run=False)
        assert stats["created"] == 1
        assert stats["errors"] == 0
    finally:
        csv_path.unlink(missing_ok=True)
