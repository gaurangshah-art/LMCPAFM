from uuid import uuid4


def _login_investigator(client, monkeypatch):
    monkeypatch.setenv("LMCP_INSTITUTIONAL_EMAIL_DOMAINS", "lmcp.ac.in")
    suffix = uuid4().hex[:8]
    payload = {
        "name": "Resources Test PI",
        "email": f"resources_{suffix}@lmcp.ac.in",
        "password": "StrongPass@123",
    }
    client.post("/auth/register-investigator", json=payload)
    login_res = client.post(
        "/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    return {"Authorization": f"Bearer {login_res.json()['access_token']}"}


def test_resources_catalog_requires_auth(client):
    res = client.get("/resources/catalog")
    assert res.status_code == 401


def test_resources_catalog_and_doc_for_investigator(client, monkeypatch):
    headers = _login_investigator(client, monkeypatch)
    catalog_res = client.get("/resources/catalog", headers=headers)
    assert catalog_res.status_code == 200, catalog_res.text
    items = catalog_res.json()["items"]
    assert items
    slugs = {row["slug"] for row in items}
    assert slugs == {"faculty-guide", "form-b-manual"}
    assert "personnel-index" not in slugs
    assert "iaec-admin" not in slugs
    assert "student-guide" not in slugs

    doc_res = client.get("/resources/docs/form-b-manual", headers=headers)
    assert doc_res.status_code == 200, doc_res.text
    body = doc_res.json()
    assert body["title"]
    assert "Form B" in body["markdown"] or "form b" in body["markdown"].lower()
    assert "<h" in body["html"]


def _register_scholar(client):
    suffix = uuid4().hex[:8]
    email = f"scholar.res.{suffix}@example.com"
    client.post(
        "/auth/register-student",
        json={"name": "Scholar Resources", "email": email, "password": "StrongPass@123"},
    )
    login_res = client.post(
        "/auth/login",
        json={"email": email, "password": "StrongPass@123"},
    )
    return {"Authorization": f"Bearer {login_res.json()['access_token']}"}


def test_scholar_catalog_is_student_guide_only(client):
    headers = _register_scholar(client)
    catalog_res = client.get("/resources/catalog", headers=headers)
    assert catalog_res.status_code == 200, catalog_res.text
    slugs = {row["slug"] for row in catalog_res.json()["items"]}
    assert slugs == {"student-guide"}


def test_qa_sop_pack_download(client, monkeypatch):
    headers = _login_investigator(client, monkeypatch)
    res = client.get("/resources/qa-pack/download", headers=headers)
    assert res.status_code == 403, res.text

    scholar_headers = _register_scholar(client)
    student_pdf = client.get("/resources/docs/student-guide.pdf", headers=scholar_headers)
    assert student_pdf.status_code == 200, student_pdf.text
    assert student_pdf.headers["content-type"].startswith("application/pdf")

    faculty_pdf = client.get("/resources/docs/student-guide.pdf", headers=headers)
    assert faculty_pdf.status_code == 403


def test_resources_doc_forbidden_for_wrong_role(client, monkeypatch):
    headers = _login_investigator(client, monkeypatch)
    res = client.get("/resources/docs/admin-personnel", headers=headers)
    assert res.status_code == 403
