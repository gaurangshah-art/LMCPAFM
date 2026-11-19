from uuid import uuid4

from tests.formb_payloads import step1_body, upload_required_form_b_attachments, wizard_steps_after_step1


def _register_and_login(client, monkeypatch, *, name: str, email_prefix: str):
    monkeypatch.setenv("LMCP_INSTITUTIONAL_EMAIL_DOMAINS", "lmcp.ac.in")
    suffix = uuid4().hex[:8]
    payload = {
        "name": name,
        "email": f"{email_prefix}_{suffix}@lmcp.ac.in",
        "password": "StrongPass@123",
    }
    client.post("/auth/register-investigator", json=payload)
    login_res = client.post(
        "/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    client.put(
        "/investigator-profile/me",
        json={
            "institution_name": "LMCP",
            "department": "Pharmacology",
            "designation": "Assistant Professor",
            "qualification": "PhD",
            "is_lmcp_faculty": True,
        },
        headers=headers,
    )
    return headers, payload


def test_link_form_b_investigator_to_registered_user(client, monkeypatch):
    faculty_headers, _ = _register_and_login(client, monkeypatch, name="Dr. Faculty", email_prefix="faculty")
    student_headers, student_payload = _register_and_login(
        client,
        monkeypatch,
        name="Student Helper",
        email_prefix="student",
    )

    start_res = client.post("/formb/start", headers=faculty_headers)
    form_b_id = start_res.json()["id"]
    client.post(
        "/formb/step-1",
        json=step1_body(form_b_id, {"name": "Dr. Faculty", "email": "faculty@lmcp.ac.in"}),
        headers=faculty_headers,
    )

    add_res = client.post(
        "/formb/investigators",
        json={
            "form_b_id": form_b_id,
            "name": "Student Helper",
            "project_role": "student_contributor",
            "investigator_type": "student",
        },
        headers=faculty_headers,
    )
    assert add_res.status_code == 200, add_res.text
    investigator_id = add_res.json()["id"]
    assert add_res.json()["user_id"] is None

    search_res = client.get(
        "/formb/investigator-users/search",
        params={"q": "Student"},
        headers=faculty_headers,
    )
    assert search_res.status_code == 200, search_res.text
    matches = search_res.json()
    assert any(row["email"] == student_payload["email"].lower() for row in matches)

    me_res = client.get("/users/me", headers=student_headers)
    student_user_id = me_res.json()["id"]

    link_res = client.patch(
        f"/formb/{form_b_id}/investigators/{investigator_id}",
        json={"user_id": student_user_id},
        headers=faculty_headers,
    )
    assert link_res.status_code == 200, link_res.text
    linked = link_res.json()
    assert linked["user_id"] == student_user_id
    assert linked["name"] == "Student Helper"

    projects_res = client.get(
        f"/iaec/project/investigator/{student_user_id}",
        headers=student_headers,
    )
    assert projects_res.status_code == 200, projects_res.text
    assert len(projects_res.json()) >= 1
