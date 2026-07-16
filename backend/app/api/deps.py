from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from sqlalchemy.ext.asyncio import AsyncSession
from typing import AsyncGenerator

from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_token
from app.models.models import User, UserRole
from app.services.auth_service import AuthService

# Standard OAuth2 scheme pointing to login token URL
reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"/api/v1/auth/login"
)


async def get_current_user(
    db: AsyncSession = Depends(get_db), token: str = Depends(reusable_oauth2)
) -> User:
    """Validate bearer token credentials payload to fetch active User."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = verify_token(token)
    if not payload:
        raise credentials_exception

    user_id: str = payload.get("sub")
    token_type: str = payload.get("type")
    
    if not user_id or token_type != "access":
        raise credentials_exception

    user = await AuthService.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )
    return user


class RoleChecker:
    def __init__(self, allowed_roles: list[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        """Verify if current user roles list overlaps with allowed roles list."""
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to access resource"
            )
        return current_user


# Helper objects mapping common roles checks
get_current_admin = RoleChecker([UserRole.admin])
get_current_analyst = RoleChecker([UserRole.analyst, UserRole.admin])
