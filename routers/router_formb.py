#from fastapi import APIRouter, HTTPException

#from crud.zoho_formb import ZohoConfigError, ZohoFetchError, fetch_formb_by_protocol
#from schemas.schemas_formb import FormBDetails


router = APIRouter(prefix="/formb", tags=["Form-B (Zoho)"])


@router.get("/{protocol_id}", response_model=FormBDetails)
def read_form_b(protocol_id: int):
    try:
        return fetch_formb_by_protocol(protocol_id)
    except ZohoConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except ZohoFetchError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
