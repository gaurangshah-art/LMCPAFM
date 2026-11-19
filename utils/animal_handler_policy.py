from models.user import User


def user_is_certified_animal_handler(user: User) -> bool:
    return bool(getattr(user, "is_certified_animal_handler", False))
