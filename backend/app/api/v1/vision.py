"""
Vision API Router — /api/v1/vision
On-demand chart analysis endpoints for the Computer Vision Engine (Phase 9).
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.core.database import get_db
from app.api.deps import get_current_user, get_current_admin
from app.models.models import User
from app.services.vision_service import VisionService
from app.schemas.vision import (
    ChartAnalysisResponse,
    ChartAnalysisWithPredictionResponse,
    ChartScreenshotResponse,
    HistorySettingRequest,
    HistorySettingResponse,
)

router = APIRouter(prefix="/vision", tags=["Computer Vision Engine"])

# Allowed MIME types
_ALLOWED_MIME = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
# Max upload size: 10 MB
_MAX_BYTES = 10 * 1024 * 1024


def _validate_image(file: UploadFile) -> None:
    ct = file.content_type or ""
    if ct not in _ALLOWED_MIME:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported image type '{ct}'. Allowed: PNG, JPEG, WebP.",
        )


@router.post("/analyze", response_model=ChartAnalysisResponse, status_code=status.HTTP_200_OK)
async def analyze_chart(
    file: UploadFile = File(..., description="Chart screenshot (PNG/JPEG/WebP, max 10MB)"),
    pair: Optional[str] = Form(None, description="Currency pair, e.g. EUR/USD"),
    timeframe: Optional[str] = Form(None, description="Timeframe, e.g. 4H"),
    enable_yolo: bool = Form(True),
    enable_vit: bool = Form(True),
    enable_ocr: bool = Form(True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChartAnalysisResponse:
    """
    **On-demand chart analysis.**

    Upload a chart screenshot to run the full 5-stage Computer Vision pipeline:
    1. OpenCV preprocessing (CLAHE, denoising, Hough lines)
    2. YOLO object detection (candlesticks, trendlines, support/resistance)
    3. Vision Transformer chart classification (patterns, market structure)
    4. OCR text extraction (price labels, indicator values)
    5. Structured market data output

    Screenshots are only saved when the user has enabled history storage.
    """
    _validate_image(file)
    image_bytes = await file.read()
    if len(image_bytes) > _MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image exceeds 10 MB limit.",
        )

    try:
        result = await VisionService.analyze_chart(
            db=db, user=current_user, image_bytes=image_bytes,
            mime_type=file.content_type or "image/png",
            pair=pair, timeframe=timeframe,
            enable_yolo=enable_yolo, enable_vit=enable_vit, enable_ocr=enable_ocr,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vision pipeline execution failed: {exc}",
        )

    return ChartAnalysisResponse(**result)


@router.post(
    "/analyze-with-prediction",
    response_model=ChartAnalysisWithPredictionResponse,
    status_code=status.HTTP_200_OK,
)
async def analyze_chart_with_prediction(
    file: UploadFile = File(..., description="Chart screenshot (PNG/JPEG/WebP, max 10MB)"),
    pair: str = Form(..., description="Currency pair, e.g. EUR/USD"),
    timeframe: str = Form(..., description="Timeframe, e.g. 4H"),
    enable_yolo: bool = Form(True),
    enable_vit: bool = Form(True),
    enable_ocr: bool = Form(True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChartAnalysisWithPredictionResponse:
    """
    **On-demand chart analysis + AI prediction.**

    Runs the full vision pipeline, then immediately feeds the extracted chart
    data into the Phase 7 AI Prediction Engine to generate a trading signal.
    Both pair and timeframe are required for prediction.
    """
    _validate_image(file)
    image_bytes = await file.read()
    if len(image_bytes) > _MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image exceeds 10 MB limit.",
        )

    try:
        result = await VisionService.analyze_and_predict(
            db=db, user=current_user, image_bytes=image_bytes,
            mime_type=file.content_type or "image/png",
            pair=pair, timeframe=timeframe,
            enable_yolo=enable_yolo, enable_vit=enable_vit, enable_ocr=enable_ocr,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vision+Prediction pipeline failed: {exc}",
        )

    analysis_response = ChartAnalysisResponse(**result["analysis"])
    return ChartAnalysisWithPredictionResponse(
        analysis=analysis_response,
        prediction_id=result["prediction_id"],
        direction=result["direction"],
        confidence_value=result["confidence_value"],
        entry_price=result["entry_price"],
        stop_loss=result["stop_loss"],
        take_profit=result["take_profit"],
        risk_reward=result["risk_reward"],
        ai_narrative=result["ai_narrative"],
    )


@router.get("/screenshots", response_model=List[ChartScreenshotResponse])
async def list_screenshots(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[ChartScreenshotResponse]:
    """
    **List saved chart screenshots.**

    Returns screenshots stored for the current user (history enabled users only).
    Maximum 50 results, ordered by most recent first.
    """
    screenshots = await VisionService.list_screenshots(db, current_user.id, limit)
    return [ChartScreenshotResponse.model_validate(s) for s in screenshots]


@router.delete("/screenshots/{screenshot_id}", status_code=status.HTTP_200_OK)
async def delete_screenshot(
    screenshot_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    **Delete a saved screenshot.**

    Performs a soft delete (marks as deleted without removing from disk immediately).
    Only the owning user can delete their screenshots.
    """
    deleted = await VisionService.delete_screenshot(db, screenshot_id, current_user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Screenshot not found or already deleted.",
        )
    return {"detail": "Screenshot deleted successfully.", "screenshot_id": screenshot_id}


@router.put("/settings/history", response_model=HistorySettingResponse)
async def update_history_setting(
    payload: HistorySettingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HistorySettingResponse:
    """
    **Toggle screenshot history storage.**

    When enabled, chart screenshots will be saved after each analysis.
    When disabled (default), no screenshots are stored — privacy-first.
    """
    updated_user = await VisionService.update_history_setting(db, current_user, payload.enabled)
    status_str = "enabled" if updated_user.vision_history_enabled else "disabled"
    return HistorySettingResponse(
        vision_history_enabled=updated_user.vision_history_enabled,
        message=f"Screenshot history {status_str} successfully.",
    )


@router.get("/health", tags=["Health Check"])
async def vision_health() -> dict:
    """
    **Vision engine health check.**

    Reports model loading status and available pipeline stages.
    """
    from app.cv.yolo_detector import _YOLO_MODEL, _load_yolo_model
    from app.cv.vit_classifier import _VIT_PIPELINE, _load_vit_pipeline
    from app.cv.ocr_engine import _EASYOCR_READER

    try:
        import cv2
        cv2_available = True
    except ImportError:
        cv2_available = False

    return {
        "status": "healthy",
        "stages": {
            "opencv": "available" if cv2_available else "not_installed",
            "yolo": "loaded" if _YOLO_MODEL else "not_loaded",
            "vit": "loaded" if _VIT_PIPELINE else "not_loaded",
            "ocr": "loaded" if _EASYOCR_READER else "not_loaded",
        },
    }


# ── Admin endpoints ────────────────────────────────────────────────────────────

@router.get("/admin/stats", tags=["Platform Administration"])
async def vision_admin_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> dict:
    """Admin: aggregate vision pipeline usage statistics."""
    return await VisionService.get_analysis_stats(db)


@router.delete("/admin/screenshots/{screenshot_id}", tags=["Platform Administration"])
async def admin_delete_screenshot(
    screenshot_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> dict:
    """Admin: force-delete any user's screenshot (hard delete)."""
    from sqlalchemy.future import select
    from app.models.models import ChartScreenshot
    from app.cv.screenshot_manager import _delete_file

    q = select(ChartScreenshot).filter(ChartScreenshot.id == screenshot_id)
    res = await db.execute(q)
    screenshot = res.scalars().first()
    if not screenshot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Screenshot not found.")

    _delete_file(screenshot.file_path)
    await db.delete(screenshot)
    await db.commit()
    return {"detail": "Screenshot force-deleted.", "screenshot_id": screenshot_id}
