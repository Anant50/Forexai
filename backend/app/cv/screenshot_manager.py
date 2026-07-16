"""
Screenshot Manager
Handles conditional saving, listing, and deletion of chart screenshots.

Key design decisions:
  - Screenshots are ONLY saved when the user has vision_history_enabled = True
  - Deletion is soft by default (sets deleted_at timestamp)
  - Files are stored in the local filesystem under SCREENSHOT_BASE_DIR
  - For production, swap _save_file / _delete_file with S3 client calls
"""

import logging
import os
import uuid
from datetime import timezone, datetime
from pathlib import Path
from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.models import ChartScreenshot, User

logger = logging.getLogger("cv.screenshot_manager")

# Base directory for screenshot storage (override via env var SCREENSHOT_DIR)
SCREENSHOT_BASE_DIR = Path(
    os.getenv("SCREENSHOT_DIR", "/tmp/forexai_screenshots")
)


def _ensure_dir(user_id: str) -> Path:
    """Create per-user screenshot directory if it does not exist."""
    user_dir = SCREENSHOT_BASE_DIR / user_id
    user_dir.mkdir(parents=True, exist_ok=True)
    return user_dir


def _save_file(user_id: str, image_bytes: bytes, mime_type: str) -> tuple[str, int]:
    """
    Persist image bytes to the filesystem.
    Returns (file_path_str, file_size_bytes).
    """
    ext = "png" if "png" in mime_type else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    user_dir = _ensure_dir(user_id)
    dest = user_dir / filename
    dest.write_bytes(image_bytes)
    return str(dest), len(image_bytes)


def _delete_file(file_path: str) -> None:
    """Remove file from disk. Silently ignores missing files."""
    try:
        p = Path(file_path)
        if p.exists():
            p.unlink()
    except Exception as exc:
        logger.warning("Could not delete file %s: %s", file_path, exc)


class ScreenshotManager:
    """
    Manages conditional screenshot persistence and retrieval.
    All public methods are async and DB-aware.
    """

    @staticmethod
    async def maybe_save(
        db: AsyncSession,
        user: User,
        image_bytes: bytes,
        mime_type: str,
        pair: Optional[str] = None,
        timeframe: Optional[str] = None,
    ) -> Optional[ChartScreenshot]:
        """
        Save a screenshot only if the user has history enabled.

        Returns:
            ChartScreenshot ORM object if saved, else None.
        """
        if not user.vision_history_enabled:
            logger.debug("Screenshot history disabled for user %s — skipping save.", user.id)
            return None

        try:
            file_path, file_size = _save_file(user.id, image_bytes, mime_type)
        except Exception as exc:
            logger.error("Failed to save screenshot file for user %s: %s", user.id, exc)
            return None

        screenshot = ChartScreenshot(
            user_id=user.id,
            file_path=file_path,
            file_size_bytes=file_size,
            mime_type=mime_type,
            pair=pair,
            timeframe=timeframe,
        )
        db.add(screenshot)
        await db.commit()
        await db.refresh(screenshot)
        logger.info("Screenshot %s saved for user %s.", screenshot.id, user.id)
        return screenshot

    @staticmethod
    async def list_screenshots(
        db: AsyncSession, user_id: str, limit: int = 50
    ) -> List[ChartScreenshot]:
        """Return non-deleted screenshots for a user, newest first."""
        q = (
            select(ChartScreenshot)
            .filter(
                ChartScreenshot.user_id == user_id,
                ChartScreenshot.deleted_at.is_(None),
            )
            .order_by(ChartScreenshot.created_at.desc())
            .limit(limit)
        )
        res = await db.execute(q)
        return list(res.scalars().all())

    @staticmethod
    async def delete_screenshot(
        db: AsyncSession, screenshot_id: str, user_id: str, hard_delete: bool = False
    ) -> bool:
        """
        Soft-delete (or hard-delete) a screenshot.

        Returns True if found and deleted, False if not found or not owned by user.
        """
        q = select(ChartScreenshot).filter(
            ChartScreenshot.id == screenshot_id,
            ChartScreenshot.user_id == user_id,
            ChartScreenshot.deleted_at.is_(None),
        )
        res = await db.execute(q)
        screenshot = res.scalars().first()

        if not screenshot:
            return False

        if hard_delete:
            _delete_file(screenshot.file_path)
            await db.delete(screenshot)
        else:
            screenshot.deleted_at = datetime.now(timezone.utc)
            db.add(screenshot)

        await db.commit()
        logger.info("Screenshot %s %s for user %s.", screenshot_id,
                    "hard-deleted" if hard_delete else "soft-deleted", user_id)
        return True

    @staticmethod
    async def update_history_setting(
        db: AsyncSession, user: User, enabled: bool
    ) -> User:
        """Toggle the user's vision_history_enabled preference."""
        user.vision_history_enabled = enabled
        db.add(user)
        await db.commit()
        await db.refresh(user)
        logger.info("Vision history for user %s set to %s.", user.id, enabled)
        return user
