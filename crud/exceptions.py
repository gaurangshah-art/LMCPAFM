class CRUDError(Exception):
    """Base exception for CRUD operations."""


class CRUDNotFoundError(CRUDError):
    """Raised when a requested object is not found."""


class CRUDValidationError(CRUDError):
    """Raised when input data is invalid or violates business rules."""


class CRUDDatabaseError(CRUDError):
    """Raised when a database error occurs during CRUD operations."""
