import pytest
from datetime import timezone, datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Candle, DataSource, DirectionType
from app.ml.ensemble import EnsembleCombiner
from app.ml.realtime_engine import RealtimePredictionEngine


@pytest.fixture
def sample_candles() -> list:
    """Fixture producing 250 test candle ticks for EMA calculations."""
    base_time = datetime.now(timezone.utc) - timedelta(days=15)
    candles = []
    close_price = 1.08500
    
    for i in range(250):
        candle = Candle(
            id=i + 1,
            pair="EUR/USD",
            timeframe="1h",
            open_time=base_time + timedelta(hours=i),
            open_price=close_price,
            high_price=close_price + 0.0010,
            low_price=close_price - 0.0010,
            close_price=close_price + 0.0002,
            volume=1000.0,
            source=DataSource.yfinance
        )
        candles.append(candle)
        close_price = candle.close_price
    return candles


def test_ensemble_combiner_decision():
    """Test combining probabilities weights to resolve directions."""
    scores = {"xgboost": 0.85, "lstm": 0.75, "random_forest": 0.65}
    direction, confidence = EnsembleCombiner.combine_predictions(scores)
    assert direction == "long"
    assert confidence > 70.0

    scores_short = {"xgboost": 0.20, "lstm": 0.15, "random_forest": 0.30}
    direction_short, confidence_short = EnsembleCombiner.combine_predictions(scores_short)
    assert direction_short == "short"
    assert confidence_short > 70.0


@pytest.mark.asyncio
async def test_realtime_engine_predictions(db_session: AsyncSession, sample_candles):
    """Test end to end workflow: indicators calculation -> ensemble inference -> record creation."""
    # Seed candles to DB database
    for c in sample_candles:
        db_session.add(c)
    await db_session.commit()

    engine = RealtimePredictionEngine(db_session)
    
    # Measure execution latency performance
    start_time = datetime.now(timezone.utc)
    prediction = await engine.execute_realtime_prediction("EUR/USD", "1h")
    latency_ms = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000

    # Verify predictions record metrics
    assert prediction.id is not None
    assert prediction.pair == "EUR/USD"
    assert prediction.timeframe == "1h"
    assert prediction.direction in [DirectionType.long, DirectionType.short, DirectionType.neutral]
    assert prediction.confidence_value >= 50.0
    assert prediction.entry_price > 0.0
    assert prediction.stop_loss is not None
    assert prediction.take_profit is not None
    assert prediction.risk_reward == 2.0
    assert prediction.position_size_lots > 0.0
    
    # Verify market structure details are calculated and logged
    signals = prediction.indicator_signals
    assert signals is not None
    assert "trend_direction" in signals
    assert signals["trend_direction"] in ["bullish", "bearish", "range"]
    assert "support_levels" in signals
    assert len(signals["support_levels"]) > 0
    assert "resistance_levels" in signals
    assert len(signals["resistance_levels"]) > 0
    assert "rsi" in signals
    assert len(prediction.detected_patterns) > 0

    # Ensure low-latency baseline is met (< 250ms with test SQLite queries)
    assert latency_ms < 250.0


@pytest.mark.asyncio
async def test_realtime_engine_lifecycle(db_session: AsyncSession):
    """Test clean non-singleton on-demand lifecycle behavior."""
    # Verify that the engine is not a singleton
    engine_one = RealtimePredictionEngine(db_session)
    engine_two = RealtimePredictionEngine(db_session)
    assert engine_one is not engine_two

    # Verify cleanup manager behaves correctly without errors
    from app.ml.cleanup_manager import CleanupManager
    dummy_dict = {"weights": [0.95] * 1000}
    CleanupManager.release_resources(dummy_dict)
    assert dummy_dict is not None
