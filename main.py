from fastapi import FastAPI
from contextlib import asynccontextmanager
from database.database import init_db
from database import lmcpafm_models
from database import lmcpafm_requisition_allocation

from routers.router_iaec import router as iaec_router
from routers.router_requisition_allocation import router as req_alloc_router
from routers.router_formd import router as formd_router
from routers.router_formb import router as formb_router
from routers.router_disposal import router as disposal_router
from routers.experiments import router as experiments_router
from routers.router_lookups import router as lookups_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB on application startup
    init_db()
    yield


app = FastAPI(lifespan=lifespan)


@app.get("/")
def home():
    return {"message": "LMCPAFM backend is running"}


app.include_router(iaec_router)
app.include_router(req_alloc_router)
app.include_router(formd_router)
app.include_router(formb_router)
app.include_router(disposal_router)
app.include_router(experiments_router)
app.include_router(lookups_router)
