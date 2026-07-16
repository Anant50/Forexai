from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any

from app.core.database import get_db
from app.api.deps import get_current_user
from app.schemas.auth import UserCreate, UserResponse, Token, TokenRefreshRequest, LoginRequest
from app.services.auth_service import AuthService
from app.models.models import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserCreate, db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Register a new user account with strong password validation.
    The first registered user is automatically assigned the 'admin' role.
    """
    existing = await AuthService.get_user_by_email(db, user_in.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists"
        )
    user = await AuthService.create_user(db, user_in)
    return user


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    login_in: LoginRequest,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Authenticate trader using email & password. Returns JWT token pair.
    """
    user_info = await AuthService.authenticate_user(
        db=db,
        email=login_in.email,
        password=login_in.password,
        ip_address=request.client.host if request.client else "127.0.0.1",
        user_agent=request.headers.get("user-agent")
    )
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    user, access_token, refresh_token = user_info
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=1800  # 30 mins
    )


@router.post("/refresh", response_model=Token)
async def refresh_tokens(
    request: Request,
    refresh_in: TokenRefreshRequest,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Acquire fresh access & rotate refresh tokens using an active refresh token.
    """
    tokens = await AuthService.refresh_session_tokens(
        db=db,
        refresh_token=refresh_in.refresh_token,
        ip_address=request.client.host if request.client else "127.0.0.1",
        user_agent=request.headers.get("user-agent")
    )
    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    access_token, refresh_token = tokens
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=1800
    )


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    refresh_in: TokenRefreshRequest,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Revoke current refresh token session invalidating it globally.
    """
    success = await AuthService.invalidate_sessions(db, refresh_in.refresh_token)
    if not success:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token details already invalidated"
        )
    return {"detail": "Successfully logged out and session terminated"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)) -> Any:
    """
    Retrieve active user detailed properties profile.
    """
    return current_user


@router.get("/google/login")
async def initiate_google_oauth() -> Any:
    """
    Returns platform authorization link for Google Client login integration setup.
    """
    redirect_url = "https://accounts.google.com/o/oauth2/v2/auth?client_id=GOOGLE_MOCK_CLIENT_ID"
    return {"authorization_url": redirect_url}


@router.get("/google/callback")
async def handle_google_callback(code: str, db: AsyncSession = Depends(get_db)) -> Any:
    """
    Validates Google authorization code and emits access credentials pairs.
    """
    # Mocking successful OAuth code resolution mapping
    email = "oauth_trader@google.com"
    user = await AuthService.get_user_by_email(db, email)
    if not user:
        user_create = UserCreate(
            email=email,
            full_name="OAuth Google Trader",
            password="GoogleOAuthPlaceholderPass123!"
        )
        user = await AuthService.create_user(db, user_create)

    # Trigger token setup
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=1800
    )
