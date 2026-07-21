# database/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database.lmcpafm_models import Base
import os
from pathlib import Path

# Allow overriding the database with the DATABASE_URL env variable
DEFAULT_DB_URL = "sqlite:///database/LMCPAFM.db"
DATABASE_URL = os.environ.get("DATABASE_URL", DEFAULT_DB_URL)


def _create_engine_and_session(db_url: str):
    """Create an engine and SessionLocal configured for SQLAlchemy 2.x.

    For SQLite in-memory use StaticPool so the same DB persists across
    connections/threads (useful for tests). Returns (engine, SessionLocal).
    """
    connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}
    if db_url.startswith("sqlite") and ":memory:" in db_url:
        engine = create_engine(
            db_url,
            echo=False,
            connect_args=connect_args,
            poolclass=StaticPool,
        )
    else:
        engine = create_engine(db_url, echo=False, connect_args=connect_args)

    SessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
        future=True,
        expire_on_commit=False,
    )
    return engine, SessionLocal


# Create engine/session for the configured DATABASE_URL at import time
engine, SessionLocal = _create_engine_and_session(DATABASE_URL)


def get_db():
    """Dependency generator for FastAPI endpoints.

    Yields a SQLAlchemy session and ensures it is closed afterwards.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Initialize the database schema.

    If the `DATABASE_URL` environment variable was changed after import,
    recreate the engine/session to match the new URL before creating tables.
    Tables are created if missing, but existing databases are preserved.
    Schema changes should be handled by migrations instead of destructive
    recreation. Tests should set `DATABASE_URL` before importing the app
    so the in-memory DB is used.
    """
    global engine, SessionLocal, DATABASE_URL

    db_url = os.environ.get("DATABASE_URL", DATABASE_URL)

    # If the URL changed since import, recreate engine/session
    if db_url != DATABASE_URL:
        engine, SessionLocal = _create_engine_and_session(db_url)
        DATABASE_URL = db_url

    Base.metadata.create_all(bind=engine)
