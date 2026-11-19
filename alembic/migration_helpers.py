"""Shared helpers for idempotent Alembic migrations.

Dev databases are often initialized with ``init_db()`` (SQLAlchemy
``create_all``) before Alembic history is applied. These helpers let
migrations skip work that is already present.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


def inspector() -> sa.Inspector:
    return sa.inspect(op.get_bind())


def table_exists(name: str) -> bool:
    return name in inspector().get_table_names()


def column_exists(table: str, column: str) -> bool:
    if not table_exists(table):
        return False
    return column in {col["name"] for col in inspector().get_columns(table)}


def index_exists(table: str, name: str) -> bool:
    if not table_exists(table):
        return False
    return any(idx["name"] == name for idx in inspector().get_indexes(table))


def fk_exists(table: str, name: str) -> bool:
    if not table_exists(table):
        return False
    return any(fk.get("name") == name for fk in inspector().get_foreign_keys(table))
