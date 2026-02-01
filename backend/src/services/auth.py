"""
Authentication service for handling JWT tokens and password hashing.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from passlib.context import CryptContext

from src.config import settings
from src.schemas.user import Token, TokenPayload

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    """Service for authentication operations."""

    @staticmethod
    def _truncate_password(password: str) -> str:
        """Truncate password to 72 bytes (bcrypt limit)."""
        return password.encode("utf-8")[:72].decode("utf-8", errors="ignore")

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt."""
        return pwd_context.hash(AuthService._truncate_password(password))

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return pwd_context.verify(AuthService._truncate_password(plain_password), hashed_password)

    @staticmethod
    def create_access_token(user_id: int) -> str:
        """Create a JWT access token."""
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.jwt_access_token_expire_minutes
        )
        payload = {
            "sub": user_id,
            "exp": expire,
            "type": "access",
        }
        return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

    @staticmethod
    def create_refresh_token(user_id: int) -> str:
        """Create a JWT refresh token."""
        expire = datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_token_expire_days)
        payload = {
            "sub": user_id,
            "exp": expire,
            "type": "refresh",
        }
        return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

    @staticmethod
    def create_tokens(user_id: int) -> Token:
        """Create both access and refresh tokens."""
        return Token(
            access_token=AuthService.create_access_token(user_id),
            refresh_token=AuthService.create_refresh_token(user_id),
        )

    @staticmethod
    def decode_token(token: str) -> Optional[TokenPayload]:
        """Decode and validate a JWT token."""
        try:
            payload = jwt.decode(
                token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
            )
            return TokenPayload(
                sub=payload["sub"],
                exp=datetime.fromtimestamp(payload["exp"], tz=timezone.utc),
                type=payload["type"],
            )
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

    @staticmethod
    def verify_access_token(token: str) -> Optional[int]:
        """Verify an access token and return the user_id."""
        payload = AuthService.decode_token(token)
        if payload and payload.type == "access":
            return payload.sub
        return None

    @staticmethod
    def verify_refresh_token(token: str) -> Optional[int]:
        """Verify a refresh token and return the user_id."""
        payload = AuthService.decode_token(token)
        if payload and payload.type == "refresh":
            return payload.sub
        return None
