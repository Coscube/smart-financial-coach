"""
Authentication dependencies and utilities.
"""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.user import User
from src.services.auth import AuthService
from src.services.user import UserService

# HTTP Bearer scheme for JWT tokens
security = HTTPBearer()


# --- MOCK USER FOR DEVELOPMENT ---
from types import SimpleNamespace

# async def get_current_user(*args, **kwargs):
#     """Mocked user for development: always returns a fake user object."""
#     return SimpleNamespace(id=1, email="mock@user.com", is_active=True)


async def get_current_user():
    """Mocked user for development: always returns a fake user object."""
    return SimpleNamespace(id=1, email="mock@user.com", is_active=True)


# Type alias for current user dependency
CurrentUser = Annotated[User, Depends(get_current_user)]
