from fastapi import APIRouter, HTTPException

from crud.zohoformb import ZohoConfigError, ZohoFetchError, fetchformbbyprotocol
from schemas.schemasformb import FormBRead

router = APIRouter(prefix="/formb", tags=["Form-B (Zoho)"])


@router.get("/{protocol_id}", response_model=FormBRead)
def read_form_b(protocol_id: int):
    try:
        return fetchformbbyprotocol(protocol_id)
    except ZohoConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except ZohoFetchError as exc:
        raise HTTPException(status_code=502, detail=str(exc))