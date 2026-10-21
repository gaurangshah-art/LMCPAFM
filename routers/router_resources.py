from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel

from crud.exceptions import CRUDValidationError
from dependencies.auth import get_current_user, user_role_names
from models.user import User
from utils.qa_sop_pack import (
    build_qa_sop_zip_bytes,
    combined_qa_pack_markdown,
    qa_pack_zip_filename,
)
from utils.app_resource_catalog import (
    available_docs_for_user,
    get_catalog_doc,
    read_doc_markdown,
    user_can_view_doc,
)

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


def _render_markdown(text: str) -> str:
    import markdown

    return markdown.markdown(
        text,
        extensions=["tables", "fenced_code", "sane_lists"],
    )


@router.get("/catalog", response_model=ResourceCatalogResponse)
def list_resource_catalog(current_user: User = Depends(get_current_user)):
    roles = set(user_role_names(current_user))
    items = [
        ResourceCatalogItem(
            slug=doc.slug,
            title=doc.title,
            summary=doc.summary,
            category=doc.category,
        )
        for doc in available_docs_for_user(roles)
    ]
    return ResourceCatalogResponse(items=items)


@router.get("/docs/{slug}", response_model=ResourceDocumentResponse)
def get_resource_document(slug: str, current_user: User = Depends(get_current_user)):
    doc = get_catalog_doc(slug)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guide not found")

    roles = set(user_role_names(current_user))
    if not user_can_view_doc(roles, doc):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to view this guide")

    try:
        markdown_text = read_doc_markdown(doc)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Guide file is not deployed on this server",
        ) from exc

    return ResourceDocumentResponse(
        slug=doc.slug,
        title=doc.title,
        summary=doc.summary,
        category=doc.category,
        markdown=markdown_text,
        html=_render_markdown(markdown_text),
    )


@router.get("/qa-pack/download")
def download_qa_sop_pack(current_user: User = Depends(get_current_user)):
    """Zip of QA/UAT markdown for sharing offline (any logged-in user)."""
    del current_user
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


@router.get("/qa-pack/combined.md")
def download_combined_qa_markdown(current_user: User = Depends(get_current_user)):
    """Single combined QA validation markdown file."""
    del current_user
    try:
        text, filename = combined_qa_pack_markdown()
    except CRUDValidationError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return Response(
        content=text.encode("utf-8"),
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
