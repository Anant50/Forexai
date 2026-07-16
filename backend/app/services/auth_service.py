from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import timezone, datetime, timedelta
import secrets
from typing import Optional, Tuple

from app.models.models import User, Session, UserRole, UserNotificationPref
from app.schemas.auth import UserCreate, UserUpdate
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token


class AuthService:

    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
        """Fetch user record matching email value."""
        result = await db.execute(select(User).filter(User.email == email))
        return result.scalars().first()

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
        """Fetch user record matching UUID."""
        result = await db.execute(select(User).filter(User.id == user_id))
        return result.scalars().first()

    @staticmethod
    async def create_user(db: AsyncSession, user_in: UserCreate) -> User:
        """Register details into users and setup default notifications configurations."""
        hashed = get_password_hash(user_in.password)
        
        # Verify if it's the very first user to assign Admin role automatically for testing convenience, otherwise default trader
        count_result = await db.execute(select(User))
        role = UserRole.admin if not count_result.scalars().first() else UserRole.trader

        token = secrets.token_urlsafe(32)

        user = User(
            email=user_in.email,
            full_name=user_in.full_name,
            hashed_password=hashed,
            role=role,
            is_active=True,
            is_verified=False,
            verification_token=token,
            preferences={}
        )
        db.add(user)
        await db.flush()

        # Add corresponding default notification preferences
        notif_prefs = UserNotificationPref(
            user_id=user.id,
            new_signal=True,
            model_retrained=True,
            drawdown_warning=True,
            daily_summary=True,
            news_alert=False,
            via_email=True,
            via_telegram=False
        )
        db.add(notif_prefs)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def authenticate_user(
        db: AsyncSession, email: str, password: str, ip_address: str, user_agent: Optional[str]
    ) -> Optional[Tuple[User, str, str]]:
        """Verify credential match and generate sessions and token outputs."""
        user = await AuthService.get_user_by_email(db, email)
        if not user or not verify_password(password, user.hashed_password):
            return None

        # Reset failed login counters
        if user.failed_login_attempts > 0:
            user.failed_login_attempts = 0
            db.add(user)

        # Generate JWT pairs
        access = create_access_token(user.id)
        refresh = create_refresh_token(user.id)

        # Save refresh token session payload record
        session = Session(
            user_id=user.id,
            refresh_token_hash=refresh,  # Storing it directly for simulation
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
        db.add(session)
        await db.commit()

        return user, access, refresh

    @staticmethod
    async def refresh_session_tokens(
        db: AsyncSession, refresh_token: str, ip_address: str, user_agent: Optional[str]
    ) -> Optional[Tuple[str, str]]:
        """Validate refresh token session details to return fresh JWT pairs."""
        result = await db.execute(select(Session).filter(Session.refresh_token_hash == refresh_token))
        session = result.scalars().first()
        
        if not session or session.expires_at < datetime.now(timezone.utc):
            return None

        # Generate new credentials
        user_id = session.user_id
        access = create_access_token(user_id)
        new_refresh = create_refresh_token(user_id)

        # Rotate sessions tracker token hashes
        session.refresh_token_hash = new_refresh
        session.expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        session.ip_address = ip_address
        session.user_agent = user_agent

        db.add(session)
        await db.commit()

        return access, new_refresh

    @staticmethod
    async def invalidate_sessions(db: AsyncSession, refresh_token: str) -> bool:
        """Revoke active session tokens during logout action redirects."""
        result = await db.execute(select(Session).filter(Session.refresh_token_hash == refresh_token))
        session = result.scalars().first()
        if session:
            await db.delete(session)
            await db.commit()
            return True
        return False
