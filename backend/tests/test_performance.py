"""
Performance Tests for ForexAI Pro
Measures execution time constraints to prevent latency regressions.
"""

import pytest
import time
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta, timezone

from app.ml.feature_engineering import FeatureEngineer
from app.models.models import User, Candle
from app.core.security import get_password_hash

# Pytest Timeout constraint (in seconds)
pytestmark = pytest.mark.timeout(3.0)

@pytest.fixture
async def speed_user(db_session: AsyncSession) -> User:
    user = User(
        email="speed@forexai.pro",
        full_name="Speed Tester",
        hashed_password=get_password_hash("speed123!"),
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    return user

@pytest.fixture
async def speed_token(client: AsyncClient, speed_user: User) -> dict:
    resp = await client.post("/api/v1/auth/login", json={"email": "speed@forexai.pro", "password": "speed123!"})
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.mark.asyncio
async def test_compute_all_features_speed():
    """Ensure pandas matrix feature generation for an entire dataset resolves instantly."""
    start = time.monotonic()
    
    # Generate 1000 candles
    base_time = datetime.now(timezone.utc) - timedelta(days=50)
    candles = [
        Candle(
            pair="EUR/USD", timeframe="15m", open_time=base_time + timedelta(minutes=i*15),
            open_price=1.0500, high_price=1.0550, low_price=1.0450, close_price=1.0510, volume=100
        ) for i in range(1000)
    ]
    
    df = FeatureEngineer.compute_all_features(candles)
    duration_ms = (time.monotonic() - start) * 1000
    
    assert len(df) == 1000
    assert duration_ms < 1000, f"Pandas feature computation took {duration_ms}ms, exceeded 1s limit!"


@pytest.mark.asyncio
async def test_intelligence_ensemble_api_latency(client: AsyncClient, speed_token: dict):
    """Ensure the highest-cost API (Ensemble Engine) returns cleanly under standard latency."""
    start = time.monotonic()
    
    payload = {"pair": "USD/JPY", "timeframe": "1h"}
    resp = await client.post("/api/v1/intelligence/analyze/multi-model", json=payload, headers=speed_token)
    
    duration_ms = (time.monotonic() - start) * 1000
    
    assert resp.status_code == 200
    assert duration_ms < 2000, f"Ensemble prediction took {duration_ms}ms, exceeded 2s limit!"
    
    data = resp.json()
    assert data["processing_time_ms"] >= 0
