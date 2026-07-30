from __future__ import annotations

from sqlalchemy.orm import Session

from crud.exceptions import CRUDValidationError
from database.lmcpafm_models import (
    BreedingRecord,
    FacilityCareLog,
    FacilityEnvironmentLog,
    FormBAttachment,
    FormBInvestigator,
    Procurement,
    SupplyTransaction,
    AnimalMovement,
)
from database.lmcpafm_requisition_allocation import AnimalRequisition
from models.role import Role
from models.user import User


def _count_admins(db: Session) -> int:
    return (
        db.query(User)
        .join(User.roles)
        .filter(Role.name == "admin")
        .distinct()
        .count()
    )


def _clear_user_references(db: Session, user_id: int) -> None:
    for model, column in (
        (Procurement, Procurement.recorded_by_user_id),
        (BreedingRecord, BreedingRecord.recorded_by_user_id),
        (FacilityCareLog, FacilityCareLog.recorded_by_user_id),
        (SupplyTransaction, SupplyTransaction.recorded_by_user_id),
        (FacilityEnvironmentLog, FacilityEnvironmentLog.recorded_by_user_id),
        (AnimalMovement, AnimalMovement.recorded_by_user_id),
        (FormBAttachment, FormBAttachment.uploaded_by_user_id),
    ):
        db.query(model).filter(column == user_id).update({column.key: None}, synchronize_session=False)

    db.query(FormBInvestigator).filter(FormBInvestigator.user_id == user_id).update(
        {FormBInvestigator.user_id.key: None},
        synchronize_session=False,
    )
    db.query(FormBInvestigator).filter(
        FormBInvestigator.investigator_profile_user_id == user_id
    ).update(
        {FormBInvestigator.investigator_profile_user_id.key: None},
        synchronize_session=False,
    )


def delete_user(db: Session, *, actor: User, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise CRUDValidationError("User not found.")

    if user.id == actor.id:
        raise CRUDValidationError("You cannot delete your own account.")

    role_names = {role.name for role in user.roles}
    if "admin" in role_names and _count_admins(db) <= 1:
        raise CRUDValidationError("Cannot delete the last admin account.")

    requisition_count = (
        db.query(AnimalRequisition)
        .filter(AnimalRequisition.requester_user_id == user_id)
        .count()
    )
    if requisition_count > 0:
        raise CRUDValidationError(
            "This user has animal requisitions on record and cannot be deleted."
        )

    _clear_user_references(db, user_id)
    user.roles.clear()
    db.delete(user)
    db.flush()
    return user
