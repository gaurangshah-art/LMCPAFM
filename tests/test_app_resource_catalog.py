from utils.app_resource_catalog import (
    available_docs_for_user,
    user_can_view_doc,
    get_catalog_doc,
)


def test_faculty_investigator_sees_only_faculty_guides():
    docs = available_docs_for_user({"investigator"}, is_self_registered_scholar=False)
    slugs = {d.slug for d in docs}
    assert slugs == {"faculty-guide", "form-b-manual"}
    assert "personnel-index" not in slugs
    assert "student-guide" not in slugs
    assert "qa-validation-pack" not in slugs


def test_scholar_investigator_sees_only_student_guide():
    docs = available_docs_for_user({"investigator"}, is_self_registered_scholar=True)
    slugs = {d.slug for d in docs}
    assert slugs == {"student-guide"}


def test_admin_sees_full_catalog():
    docs = available_docs_for_user({"admin"})
    slugs = {d.slug for d in docs}
    assert "personnel-index" in slugs
    assert "admin-personnel" in slugs


def test_investigator_cannot_open_admin_sop():
    doc = get_catalog_doc("admin-personnel")
    assert doc is not None
    assert user_can_view_doc({"investigator"}, doc, is_self_registered_scholar=False) is False