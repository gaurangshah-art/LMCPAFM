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
    assert "personnel-index" in slugs
    assert "form-b-manual" in slugs
    assert "iaec-admin" not in slugs

    doc_res = client.get("/resources/docs/form-b-manual", headers=headers)
    assert doc_res.status_code == 200, doc_res.text
    body = doc_res.json()
    assert body["title"]
    assert "Form B" in body["markdown"] or "form b" in body["markdown"].lower()
    assert "<h" in body["html"]


def test_qa_sop_pack_download(client, monkeypatch):
    headers = _login_investigator(client, monkeypatch)
    res = client.get("/resources/qa-pack/download", headers=headers)
    assert res.status_code == 200, res.text
    assert res.headers["content-type"] == "application/zip"
    assert res.content[:2] == b"PK"

    md_res = client.get("/resources/qa-pack/combined.md", headers=headers)
    assert md_res.status_code == 200, md_res.text
    assert b"QA Validation Pack" in md_res.content or b"LMCPAFM" in md_res.content

    pdf_res = client.get("/resources/qa-pack/combined.pdf", headers=headers)
    assert pdf_res.status_code == 200, pdf_res.text
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF")


def test_resources_doc_forbidden_for_wrong_role(client, monkeypatch):
    headers = _login_investigator(client, monkeypatch)
    res = client.get("/resources/docs/admin-personnel", headers=headers)
    assert res.status_code == 403
