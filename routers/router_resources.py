from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from crud.exceptions import CRUDValidationError
from crud.investigator_profile import get_or_create_profile
from database.database import get_db
from dependencies.auth import get_current_user, user_role_names
from models.user import User
from utils.qa_sop_pack import (
    build_qa_sop_zip_bytes,
    combined_qa_pack_markdown,
    combined_qa_pack_pdf,
    qa_pack_zip_filename,
)
from utils.app_resource_catalog import (
    available_docs_for_user,
    get_catalog_doc,
    read_doc_markdown,
    user_can_view_doc,
)
from utils.markdown_pdf import markdown_to_pdf_bytes

_REPO_ROOT = Path(__file__).resolve().parents[1]
_STUDENT_SOP = _REPO_ROOT / "Docs" / "sop_student_personnel.md"

router = APIRouter(prefix="/resources", tags=["Resources"])


class ResourceCatalogItem(BaseModel):
    slug: str
    title: str
    summary: str
    category: str


class ResourceCatalogResponse(BaseModel):
    items: list[ResourceCatalogItem]


class ResourceDocumentResponse(BaseModel):
    slug: str
    title: str
    summary: str
    category: str
    markdown: str
    html: str
    source_updated_at: datetime | None = None


def _is_self_registered_scholar(db: Session, user: User) -> bool:
    profile = get_or_create_profile(db, user.id)
    return bool(profile.is_self_registered_scholar)


def _require_qa_pack_access(user: User) -> None:
    roles = set(user_role_names(user))
    if roles.intersection({"admin", "iaec"}):
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="QA validation pack is for administrators and IAEC only",
    )


def _render_markdown(text: str) -> str:
    import markdown

    return markdown.markdown(
        text,
        extensions=["tables", "fenced_code", "sane_lists"],
    )


@router.get("/catalog", response_model=ResourceCatalogResponse)
def list_resource_catalog(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    roles = set(user_role_names(current_user))
    scholar = _is_self_registered_scholar(db, current_user)
    items = [
        ResourceCatalogItem(
            slug=doc.slug,
            title=doc.title,
            summary=doc.summary,
            category=doc.category,
        )
        for doc in available_docs_for_user(
            roles, is_self_registered_scholar=scholar
        )
    ]
    return ResourceCatalogResponse(items=items)


@router.get("/docs/student-guide.pdf")
def download_student_form_b_sop_pdf(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Form B guide for collaborating researchers (students / external institutes)."""
    doc = get_catalog_doc("student-guide")
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guide not found")
    roles = set(user_role_names(current_user))
    scholar = _is_self_registered_scholar(db, current_user)
    if not user_can_view_doc(roles, doc, is_self_registered_scholar=scholar):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to view this guide")

    if not _STUDENT_SOP.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student / collaborating researcher SOP is not deployed on this server",
        )
    pdf_bytes = markdown_to_pdf_bytes(_STUDENT_SOP.read_text(encoding="utf-8"))
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="LMCPAFM-Student-Form-B-SOP.pdf"',
            "Cache-Control": "no-store",
        },
    )


@router.get("/docs/{slug}", response_model=ResourceDocumentResponse)
def get_resource_document(
    slug: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = get_catalog_doc(slug)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guide not found")

    roles = set(user_role_names(current_user))
    scholar = _is_self_registered_scholar(db, current_user)
    if not user_can_view_doc(roles, doc, is_self_registered_scholar=scholar):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to view this guide")

    root = _REPO_ROOT
    path = (root / doc.relative_path).resolve()
    try:
        markdown_text = read_doc_markdown(doc, repo_root=root)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Guide file is not deployed on this server",
        ) from exc

    source_updated_at = None
    if path.is_file():
        source_updated_at = datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)

    return ResourceDocumentResponse(
        slug=doc.slug,
        title=doc.title,
        summary=doc.summary,
        category=doc.category,
        markdown=markdown_text,
        html=_render_markdown(markdown_text),
        source_updated_at=source_updated_at,
    )


@router.get("/qa-pack/download")
def download_qa_sop_pack(current_user: User = Depends(get_current_user)):
    """Zip of QA/UAT markdown for sharing offline (admin / IAEC)."""
    _require_qa_pack_access(current_user)
    try:
        zip_bytes = build_qa_sop_zip_bytes()
    except CRUDValidationError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    filename = qa_pack_zip_filename()
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/qa-pack/combined.pdf")
def download_combined_qa_pdf(current_user: User = Depends(get_current_user)):
    """Single combined QA validation pack as a PDF."""
    _require_qa_pack_access(current_user)
    try:
        pdf_bytes, filename = combined_qa_pack_pdf()
    except CRUDValidationError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/qa-pack/combined.md")
def download_combined_qa_markdown(current_user: User = Depends(get_current_user)):
    """Single combined QA validation markdown file."""
    _require_qa_pack_access(current_user)
    try:
        text, filename = combined_qa_pack_markdown()
    except CRUDValidationError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return Response(
        content=text.encode("utf-8"),
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
