import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from database.database import SessionLocal, init_db
from database import lmcpafm_models  # noqa: F401
from database import lmcpafm_requisition_allocation  # noqa: F401
from database import lmcpafm_experiments  # noqa: F401
from models.role import Role
from models.user import User
from utils.security import hash_password


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create or update the first LMCPAFM user in the configured database.",
    )
    parser.add_argument("--name", required=True, help="Display name for the user.")
    parser.add_argument("--email", required=True, help="Email address for the user.")
    parser.add_argument("--password", required=True, help="Plain text password for the user.")
    parser.add_argument(
        "--roles",
        required=True,
        help="Comma-separated roles, for example: investigator,staff",
    )
    parser.add_argument(
        "--inactive",
        action="store_true",
        help="Create the user as inactive instead of active.",
    )
    parser.add_argument(
        "--update-if-exists",
        action="store_true",
        help="Update an existing user with the same email instead of failing.",
    )
    return parser.parse_args()


def normalize_roles(raw_roles: str) -> list[str]:
    roles = [role.strip() for role in raw_roles.split(",") if role.strip()]
    if not roles:
        raise ValueError("At least one role is required.")
    return roles


def get_or_create_roles(db, role_names: list[str]) -> list[Role]:
    db_roles = db.query(Role).filter(Role.name.in_(role_names)).all()
    found_names = {role.name for role in db_roles}

    for name in role_names:
        if name not in found_names:
            new_role = Role(name=name)
            db.add(new_role)
            db.flush()
            db_roles.append(new_role)

    return db_roles


def main() -> int:
    args = parse_args()
    role_names = normalize_roles(args.roles)
    status = not args.inactive

    init_db()
    db = SessionLocal()
    try:
        db_roles = get_or_create_roles(db, role_names)
        existing = db.query(User).filter(User.email == args.email).first()

        if existing:
            if not args.update_if_exists:
                print(f"User with email {args.email} already exists.")
                return 1

            existing.name = args.name
            existing.password_hash = hash_password(args.password)
            existing.status = status
            existing.role = role_names[0]
            existing.roles = db_roles
            db.commit()
            print(f"Updated existing user {args.email}.")
            return 0

        user = User(
            name=args.name,
            email=args.email,
            password_hash=hash_password(args.password),
            status=status,
            role=role_names[0],
        )
        user.roles = db_roles
        db.add(user)
        db.commit()
        print(f"Created user {args.email} with roles: {', '.join(role_names)}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())