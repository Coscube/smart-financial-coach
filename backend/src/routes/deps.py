from typing import Annotated

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.user import User
from src.services.auth import AuthService
from src.services.user import UserService

# HTTP Bearer scheme for JWT tokens
security = HTTPBearer()


# Real authentication dependency
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    token = credentials.credentials

    # Decode and validate the token
    payload = AuthService.decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check that it's an access token (not a refresh token)
    if payload.type != "access":
        raise HTTPException(
            status_code=401,
            detail="Invalid token type. Access token required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get the user
    user = await UserService(db).get_by_id(payload.sub)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.is_active:
        raise HTTPException(status_code=401, detail="User is inactive")

    return user


# Type alias for current user dependency
CurrentUser = Annotated[User, Depends(get_current_user)]
