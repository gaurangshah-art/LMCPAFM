import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from database.database import engine, init_db
from database import lmcpafm_models
from database import lmcpafm_requisition_allocation
import models.role  # ensure Role and user_roles are registered
import models.investigator_profile  # ensure InvestigatorProfile is registered

from routers.router_iaec import router as iaec_router
from routers.router_requisition_allocation import router as req_alloc_router
from routers.router_formd import router as formd_router
# from routers.router_formb import router as formb_router
from routers.router_disposal import router as disposal_router
from routers.experiments import router as experiments_router
from routers.router_lookups import router as lookups_router, lookup_router as approved_lookups_router
from routers.router_users import router as users_router
from routers.router_login import router as auth_router
from routers.router_inventory import router as inventory_router
from routers.router_investigator_profile import router as investigator_profile_router
from routers.formb_internal import router as formb_internal_router
from routers.router_admin import router as admin_router

def _cors_origins() -> list[str]:
    configured = os.getenv("CORS_ALLOW_ORIGINS")
    if configured:
        return [origin.strip() for origin in configured.split(",") if origin.strip()]

    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

@app.get("/")
def home():
    return {"message": "LMCPAFM backend is running"}


@app.get("/health")
def health():
    return {"status": "ok", "checks": {"app": "ok"}}


@app.get("/health/live")
def health_live():
    return {"status": "ok"}


@app.get("/health/ready")
def health_ready():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception as exc:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "checks": {"database": str(exc)}},
        )

    return {"status": "ok", "checks": {"database": "ok"}}

app.include_router(auth_router)
app.include_router(iaec_router)
app.include_router(req_alloc_router)
app.include_router(formd_router)
app.include_router(formb_internal_router)
app.include_router(admin_router)
app.include_router(disposal_router)
app.include_router(experiments_router)
app.include_router(lookups_router)
app.include_router(approved_lookups_router)
app.include_router(users_router)
app.include_router(inventory_router)
app.include_router(investigator_profile_router)