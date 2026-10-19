from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from dependencies.auth import get_current_user, user_role_names
from models.user import User
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
