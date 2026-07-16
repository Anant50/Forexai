"""
Phase 11: Advanced AI Intelligence System Test Suite
Tests Ensemble Engine, Regime Detection, XAI generation, and API endpoints. 
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
from decimal import Decimal

from app.models.models import User, UserRole, Indicator, NewsEvent, Prediction, DirectionType, SignalType, ImpactLevel
from app.core.security import get_password_hash
from app.intelligence.regime_detector import MarketRegimeDetector
from app.intelligence.risk_evaluator import RiskEvaluator
from app.intelligence.xai_analyzer import XaiAnalyzer
from app.schemas.intelligence import RegimeType, TradeGrade

@pytest.fixture
async def intel_user(db_session: AsyncSession) -> User:
    user = User(
        email="intel@forexai.pro",
        full_name="Intel User",
        hashed_password=get_password_hash("testPass123!"),
        role=UserRole.trader,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    return user

@pytest.fixture
async def intel_token(client: AsyncClient, intel_user: User) -> dict:
    resp = await client.post("/api/v1/auth/login", json={"email": intel_user.email, "password": "testPass123!"})
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


# ── Moduler Unit Tests ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_regime_detection(db_session: AsyncSession):
    """Ensure MarketRegimeDetector correctly parses ADX to determine regime."""
    ind = Indicator(
        pair="EURUSD", timeframe="1H", candle_time=datetime.now(timezone.utc),
        adx=Decimal("35.0"), atr=Decimal("0.0020")
    )
    db_session.add(ind)
    await db_session.commit()
    
    resp = await MarketRegimeDetector.detect_regime(db_session, "EURUSD", "1H")
    assert resp.regime in (RegimeType.trending_bull, RegimeType.trending_bear)
    assert resp.severity_score >= 0.35


def test_risk_evaluator():
    """Ensure RiskEvaluator correctly generates a TradeGrade based on parameters."""
    grade, risk, entry, sl, tp = RiskEvaluator.evaluate_risk(
        base_confidence=90.0,
        alignment={"is_aligned": True, "conflict_reason": None},
        volatility_atr=0.0010,
        is_news_driven=False,
        current_price=1.1000,
        suggested_dir=DirectionType.long
    )
    
    # High confidence + perfectly aligned + low volatility + no news = low risk score
    # Should result in grade A+
    assert grade in (TradeGrade.A_PLUS, TradeGrade.A)
    assert risk < 50
    assert sl < 1.1000
    assert tp > 1.1000


def test_xai_analyzer_heuristic():
    """Ensure XaiAnalyzer correctly falls back to heuristics and returns top 3 features."""
    features = {"rsi": 25.0, "macd_histogram": 0.05, "adx": 30.0}
    response = XaiAnalyzer.generate_explanation("test_pred_1", features)
    
    assert len(response.shap_values) == 3
    # RSI 25 is bullish, MACD > 0 is bullish, ADX > 25 is neutral
    impacts = [x.impact_direction for x in response.shap_values]
    assert SignalType.bullish in impacts
    assert "RSI" in response.plain_english_summary.upper()


# ── API Integration Tests ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_analyze_ensemble_api(client: AsyncClient, intel_token: dict):
    payload = {"pair": "GBPUSD", "timeframe": "15m"}
    resp = await client.post("/api/v1/intelligence/analyze/multi-model", json=payload, headers=intel_token)
    
    assert resp.status_code == 200
    data = resp.json()
    assert "suggested_direction" in data
    assert "confidence_score" in data
    assert "grade" in data
    assert "xai" in data


@pytest.mark.asyncio
async def test_get_regime_api(client: AsyncClient, intel_token: dict):
    resp = await client.get("/api/v1/intelligence/regime/GBPUSD/1D", headers=intel_token)
    
    assert resp.status_code == 200
    data = resp.json()
    assert data["pair"] == "GBPUSD"
    assert data["timeframe"] == "1D"
    assert data["regime"] in [e.value for e in RegimeType]


@pytest.mark.asyncio
async def test_get_performance_report_api(client: AsyncClient, intel_token: dict):
    resp = await client.get("/api/v1/intelligence/reports/performance", headers=intel_token)
    
    assert resp.status_code == 200
    data = resp.json()
    assert "total_predictions" in data
    assert "overall_win_rate" in data
    assert "model_weights" in data
