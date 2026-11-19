import zipfile
from io import BytesIO


def test_staff_can_download_facility_sop_pack(client, staff_auth_headers):
    res = client.get("/facility/sop-pack/download", headers=staff_auth_headers)
    assert res.status_code == 200, res.text
    assert res.headers["content-type"] == "application/zip"
    assert "LMCP-Facility-SOP-Pack" in res.headers.get("content-disposition", "")

    with zipfile.ZipFile(BytesIO(res.content)) as zf:
        names = set(zf.namelist())
        assert "README.txt" in names
        assert "sop_facility_daily_operations.md" in names


def test_facility_sop_pack_requires_auth(client):
    res = client.get("/facility/sop-pack/download")
    assert res.status_code == 401
