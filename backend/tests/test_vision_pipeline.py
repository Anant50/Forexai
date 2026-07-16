"""
Phase 9 Computer Vision Engine — Integration Test Suite

Tests the full pipeline: preprocessor → YOLO → ViT → OCR → structurer,
screenshot management, toggle settings, and Vision API endpoints.
"""

import io
import struct
import zlib
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.models import (
    User, UserRole, VisionAnalysis, ChartScreenshot
)
from app.core.security import get_password_hash
from app.cv.preprocessor import ImagePreprocessor
from app.cv.yolo_detector import YOLODetector
from app.cv.vit_classifier import ViTClassifier
from app.cv.ocr_engine import OCREngine, _extract_structured_data
from app.cv.data_structurer import DataStructurer
from app.cv.screenshot_manager import ScreenshotManager


# ── Helpers ────────────────────────────────────────────────────────────────────

def _make_png_bytes(width: int = 64, height: int = 64) -> bytes:
    """Generate a minimal valid 1x1 PNG byte string for testing."""
    # Minimal PNG: 8-byte signature + IHDR + IDAT + IEND
    def chunk(name: bytes, data: bytes) -> bytes:
        c = name + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    signature = b"\x89PNG\r\n\x1a\n"
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
    raw = b"\x00\xff\x00\x00"  # filter byte + 1 RGB pixel
    idat = chunk(b"IDAT", zlib.compress(raw))
    iend = chunk(b"IEND", b"")
    return signature + ihdr + idat + iend


def _make_jpeg_bytes() -> bytes:
    """Generate minimal JPEG bytes (camera-captured style)."""
    try:
        from PIL import Image
        import io as _io
        img = Image.new("RGB", (8, 8), color=(100, 150, 200))
        buf = _io.BytesIO()
        img.save(buf, format="JPEG")
        return buf.getvalue()
    except ImportError:
        # Fallback: return raw JPEG magic bytes
        return b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"\x00" * 50 + b"\xff\xd9"


@pytest.fixture
async def regular_user(db_session: AsyncSession) -> User:
    user = User(
        email="cv_trader@forexai.pro",
        full_name="CV Trader",
        hashed_password=get_password_hash("CVTest123!"),
        role=UserRole.trader,
        is_active=True,
        vision_history_enabled=False,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def user_with_history(db_session: AsyncSession) -> User:
    user = User(
        email="cv_history@forexai.pro",
        full_name="CV History User",
        hashed_password=get_password_hash("CVHistory123!"),
        role=UserRole.trader,
        is_active=True,
        vision_history_enabled=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def auth_headers(client: AsyncClient, db_session: AsyncSession) -> dict:
    email, password = "cv_api_user@forexai.pro", "CVAPI123!"
    db_session.add(User(
        email=email, full_name="CV API User",
        hashed_password=get_password_hash(password),
        role=UserRole.trader, is_active=True,
    ))
    await db_session.commit()
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.fixture
async def admin_auth_headers(client: AsyncClient, db_session: AsyncSession) -> dict:
    email, password = "cv_admin@forexai.pro", "CVAdmin123!"
    db_session.add(User(
        email=email, full_name="CV Admin",
        hashed_password=get_password_hash(password),
        role=UserRole.admin, is_active=True,
    ))
    await db_session.commit()
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


# ── Stage 1: OpenCV Preprocessor ──────────────────────────────────────────────

def test_preprocessor_output_dimensions():
    """Verifies that preprocessor resizes correctly and returns all expected keys."""
    png = _make_png_bytes()
    result = ImagePreprocessor.full_preprocess(png)

    assert "yolo_array" in result
    assert "vit_array" in result
    assert "edges" in result
    assert "hough_trendlines" in result
    assert "original_shape" in result

    yolo_arr = result["yolo_array"]
    vit_arr = result["vit_array"]

    assert yolo_arr.shape[0] == 640
    assert yolo_arr.shape[1] == 640
    assert yolo_arr.shape[2] == 3

    assert vit_arr.shape[0] == 224
    assert vit_arr.shape[1] == 224
    assert vit_arr.shape[2] == 3


def test_preprocessor_hough_lines_list():
    """Hough line output should always be a list (even if empty)."""
    png = _make_png_bytes()
    result = ImagePreprocessor.full_preprocess(png)
    assert isinstance(result["hough_trendlines"], list)


# ── Stage 2: YOLO Detector ─────────────────────────────────────────────────────

def test_yolo_detection_returns_schema():
    """YOLO output must contain all expected category buckets."""
    import numpy as np
    dummy_array = np.zeros((640, 640, 3), dtype="uint8")
    result = YOLODetector.detect(dummy_array)

    assert "candlesticks" in result
    assert "support_zones" in result
    assert "resistance_zones" in result
    assert "trendlines" in result

    for key, val in result.items():
        assert isinstance(val, list), f"Expected list for key '{key}', got {type(val)}"


def test_yolo_stub_detections_have_confidence():
    """Stub detections (when model is not installed) must include confidence field."""
    import numpy as np
    dummy = np.zeros((640, 640, 3), dtype="uint8")
    result = YOLODetector.detect(dummy)

    # At minimum stub candlestick should have confidence
    for candle in result.get("candlesticks", []):
        assert "confidence" in candle
        assert 0.0 <= candle["confidence"] <= 1.0


# ── Stage 3: ViT Classifier ────────────────────────────────────────────────────

def test_vit_classification_schema():
    """ViT output must include all required structured keys."""
    import numpy as np
    dummy = np.zeros((224, 224, 3), dtype="uint8")
    yolo_stub = {"candlesticks": [], "support_zones": [], "resistance_zones": [], "trendlines": []}
    result = ViTClassifier.classify(dummy, yolo_stub)

    assert "chart_pattern" in result
    assert "trend_phase" in result
    assert "market_structure" in result
    assert "momentum" in result
    assert "top_patterns" in result
    assert "model" in result
    assert isinstance(result["top_patterns"], list)


def test_vit_heuristic_bullish_bias():
    """When more bullish candles detected, heuristic should lean bullish."""
    import numpy as np
    dummy = np.zeros((224, 224, 3), dtype="uint8")
    yolo_with_bullish = {
        "candlesticks": [
            {"type": "candlestick_bullish", "confidence": 0.9},
            {"type": "candlestick_bullish", "confidence": 0.85},
            {"type": "candlestick_bullish", "confidence": 0.88},
        ],
        "support_zones": [{"type": "support_zone"}],
        "resistance_zones": [{"type": "resistance_zone"}],
        "trendlines": [{"type": "trendline_ascending"}],
    }
    result = ViTClassifier.classify(dummy, yolo_with_bullish)
    assert result["trend_phase"] in ("markup", "accumulation")


# ── Stage 4: OCR Engine ────────────────────────────────────────────────────────

def test_ocr_price_extraction():
    """Prices matching float pattern should be extracted from text."""
    raw_labels = ["1.08550", "EUR/USD", "4H", "RSI: 67.4", "1.09200"]
    structured = _extract_structured_data(raw_labels)

    assert 1.08550 in structured["prices"]
    assert 1.09200 in structured["prices"]


def test_ocr_pair_extraction():
    """Currency pair regex should detect EUR/USD style labels."""
    structured = _extract_structured_data(["EUR/USD H4 TradingView"])
    assert structured["pair"] == "EUR/USD"


def test_ocr_timeframe_extraction():
    """Timeframe regex should detect standard TF labels."""
    structured = _extract_structured_data(["GBP/USD 4H Chart"])
    assert structured["timeframe"] == "4H"


def test_ocr_indicator_rsi_extraction():
    """RSI value should be parsed from indicator label."""
    structured = _extract_structured_data(["RSI: 67.4"])
    assert "rsi" in structured["indicator_readings"]
    assert abs(structured["indicator_readings"]["rsi"] - 67.4) < 0.1


def test_ocr_returns_schema():
    """OCR engine stub should return all expected output keys."""
    import numpy as np
    dummy = np.zeros((224, 224, 3), dtype="uint8")
    result = OCREngine.extract_text(dummy)
    assert "raw_labels" in result
    assert "prices" in result
    assert "pair" in result
    assert "timeframe" in result
    assert "indicator_readings" in result


# ── Stage 5: Data Structurer ───────────────────────────────────────────────────

def test_data_structurer_canonical_format():
    """DataStructurer output must conform to ChartAnalysis schema."""
    import numpy as np

    preprocess_out = {
        "yolo_array": np.zeros((640, 640, 3), dtype="uint8"),
        "vit_array": np.zeros((224, 224, 3), dtype="uint8"),
        "edges": np.zeros((64, 64), dtype="uint8"),
        "hough_trendlines": [{"start": [0.1, 0.2], "end": [0.8, 0.5], "angle_degrees": 22.0, "length_px": 400.0, "direction": "ascending"}],
        "original_shape": (64, 64, 3),
    }
    yolo_out = {
        "candlesticks": [{"type": "candlestick_bullish", "bbox": [0.1, 0.2, 0.05, 0.1], "confidence": 0.87}],
        "support_zones": [{"type": "support_zone", "bbox": [0.0, 0.9, 1.0, 0.02], "confidence": 0.82}],
        "resistance_zones": [{"type": "resistance_zone", "bbox": [0.0, 0.1, 1.0, 0.02], "confidence": 0.79}],
        "trendlines": [{"type": "trendline_ascending", "bbox": [0.0, 0.8, 0.9, 0.15], "confidence": 0.75}],
        "other": [],
    }
    vit_out = {
        "chart_pattern": "bull_flag",
        "chart_pattern_confidence": 0.78,
        "trend_phase": "markup",
        "trend_phase_confidence": 0.66,
        "market_structure": "higher_highs_higher_lows",
        "market_structure_confidence": 0.63,
        "momentum": "neutral",
        "momentum_confidence": 0.55,
        "top_patterns": [{"label": "bull_flag", "score": 0.78}],
        "model": "heuristic_fallback",
    }
    ocr_out = {
        "raw_labels": ["EUR/USD", "4H", "1.08500"],
        "prices": [1.08500],
        "pair": "EUR/USD",
        "timeframe": "4H",
        "indicator_readings": {"rsi": 57.3},
        "datetimes": [],
    }

    result = DataStructurer.structure(preprocess_out, yolo_out, vit_out, ocr_out, processing_time_ms=250)

    assert result["pair"] == "EUR/USD"
    assert result["timeframe"] == "4H"
    assert len(result["candlesticks"]) == 1
    assert len(result["chart_patterns"]) >= 1
    assert result["chart_patterns"][0]["name"] == "bull_flag"
    assert result["market_structure"]["trend"] == "bullish"
    assert result["market_structure"]["phase"] == "markup"
    assert result["processing_time_ms"] == 250
    assert "hough_trendlines" in result


# ── Screenshot Manager ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_screenshot_not_saved_when_disabled(db_session: AsyncSession, regular_user: User):
    """With history disabled, maybe_save should return None and not write DB record."""
    assert not regular_user.vision_history_enabled
    result = await ScreenshotManager.maybe_save(
        db=db_session,
        user=regular_user,
        image_bytes=_make_png_bytes(),
        mime_type="image/png",
        pair="EUR/USD",
        timeframe="1H",
    )
    assert result is None

    q = select(ChartScreenshot).filter(ChartScreenshot.user_id == regular_user.id)
    res = await db_session.execute(q)
    assert res.scalars().first() is None


@pytest.mark.asyncio
async def test_screenshot_saved_when_enabled(db_session: AsyncSession, user_with_history: User):
    """With history enabled, maybe_save should persist a ChartScreenshot row."""
    assert user_with_history.vision_history_enabled
    result = await ScreenshotManager.maybe_save(
        db=db_session,
        user=user_with_history,
        image_bytes=_make_png_bytes(),
        mime_type="image/png",
        pair="GBP/USD",
        timeframe="4H",
    )
    assert result is not None
    assert result.id is not None
    assert result.pair == "GBP/USD"
    assert result.deleted_at is None


@pytest.mark.asyncio
async def test_delete_screenshot(db_session: AsyncSession, user_with_history: User):
    """Soft-deleting a screenshot should set deleted_at timestamp."""
    screenshot = await ScreenshotManager.maybe_save(
        db=db_session,
        user=user_with_history,
        image_bytes=_make_png_bytes(),
        mime_type="image/png",
    )
    assert screenshot is not None

    success = await ScreenshotManager.delete_screenshot(
        db=db_session, screenshot_id=screenshot.id, user_id=user_with_history.id
    )
    assert success is True

    await db_session.refresh(screenshot)
    assert screenshot.deleted_at is not None


@pytest.mark.asyncio
async def test_update_history_setting(db_session: AsyncSession, regular_user: User):
    """Toggling history setting should persist to user record."""
    assert not regular_user.vision_history_enabled
    updated = await ScreenshotManager.update_history_setting(db_session, regular_user, enabled=True)
    assert updated.vision_history_enabled is True


# ── Vision API Endpoints ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_analyze_endpoint(client: AsyncClient, auth_headers):
    """POST /vision/analyze should return ChartAnalysisResponse schema."""
    png_bytes = _make_png_bytes()
    files = {"file": ("chart.png", io.BytesIO(png_bytes), "image/png")}
    data = {"pair": "EUR/USD", "timeframe": "4H"}

    resp = await client.post(
        "/api/v1/vision/analyze",
        files=files,
        data=data,
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "analysis_id" in body
    assert "candlesticks" in body
    assert "market_structure" in body
    assert "processing_time_ms" in body
    assert isinstance(body["screenshot_saved"], bool)


@pytest.mark.asyncio
async def test_analyze_invalid_mime(client: AsyncClient, auth_headers):
    """Unsupported MIME type should return 415."""
    files = {"file": ("chart.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")}
    resp = await client.post(
        "/api/v1/vision/analyze",
        files=files,
        headers=auth_headers,
    )
    assert resp.status_code == 415


@pytest.mark.asyncio
async def test_history_toggle(client: AsyncClient, auth_headers):
    """PUT /vision/settings/history should toggle user preference."""
    resp = await client.put(
        "/api/v1/vision/settings/history",
        json={"enabled": True},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["vision_history_enabled"] is True

    resp2 = await client.put(
        "/api/v1/vision/settings/history",
        json={"enabled": False},
        headers=auth_headers,
    )
    assert resp2.json()["vision_history_enabled"] is False


@pytest.mark.asyncio
async def test_list_screenshots_empty(client: AsyncClient, auth_headers):
    """GET /vision/screenshots should return empty list for new user."""
    resp = await client.get("/api/v1/vision/screenshots", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_delete_nonexistent_screenshot(client: AsyncClient, auth_headers):
    """DELETE on non-existent screenshot should return 404."""
    resp = await client.delete(
        "/api/v1/vision/screenshots/nonexistent-id-12345",
        headers=auth_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_vision_health_endpoint(client: AsyncClient):
    """GET /vision/health should return 200 with stage status."""
    resp = await client.get("/api/v1/vision/health")
    assert resp.status_code == 200
    body = resp.json()
    assert "stages" in body
    assert "opencv" in body["stages"]
    assert "yolo" in body["stages"]


@pytest.mark.asyncio
async def test_admin_stats_endpoint(client: AsyncClient, admin_auth_headers):
    """GET /vision/admin/stats should return aggregate stats."""
    resp = await client.get("/api/v1/vision/admin/stats", headers=admin_auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert "total_analyses" in body
    assert "avg_processing_time_ms" in body
