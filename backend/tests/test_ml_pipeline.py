import pytest
from datetime import timezone, datetime, timedelta
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Candle, DataSource
from app.ml.feature_engineering import FeatureEngineer
from app.ml.backtester import Backtester
from app.ml.trainer import ModelTrainer
from app.ml.inference import InferenceEngine
from app.ml.retraining import RetrainingScheduler


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


def test_feature_engineering_indicators(sample_candles):
    """Test indicators calculation generates correct column headers."""
    df = FeatureEngineer.compute_all_features(sample_candles)
    assert not df.empty
    assert "rsi" in df.columns
    assert "macd" in df.columns
    assert "bb_upper" in df.columns
    assert "atr" in df.columns
    assert "is_bullish_engulfing" in df.columns


def test_backtest_execution():
    """Test running backtest simulations prints return curves."""
    df_data = {
        "close": [1.0800, 1.0810, 1.0820, 1.0815, 1.0830, 1.0825, 1.0840]
    }
    df = pd.DataFrame(df_data)
    signals = [1, 0, -1, 1, 0, -1, 0] # Long, hold, short, long, hold, short, hold
    
    metrics = Backtester.run_backtest(df, signals, initial_balance=1000.0, leverage=1.0)
    assert metrics["final_balance"] is not None
    assert "sharpe_ratio" in metrics
    assert "profit_factor" in metrics
    assert len(metrics["equity_curve"]) == len(df)


@pytest.mark.asyncio
async def test_model_training_registry(db_session: AsyncSession, sample_candles):
    """Test model training coordinator and database record mapping."""
    # Seed candles to DB
    for c in sample_candles:
        db_session.add(c)
    await db_session.commit()

    trainer = ModelTrainer(db_session)
    model = await trainer.train_and_register("EUR/USD", "1h", "v-test-fit")
    
    assert model.id is not None
    assert model.version_tag == "v-test-fit"
    assert model.accuracy > 0.0


@pytest.mark.asyncio
async def test_inference_forecasting(db_session: AsyncSession, sample_candles):
    """Test inference executing overlays features and XAI explanations."""
    for c in sample_candles:
        db_session.add(c)
    await db_session.commit()

    engine = InferenceEngine(db_session)
    prediction = await engine.execute_forecast("EUR/USD", "1h")
    
    assert prediction.id is not None
    assert prediction.direction in ["long", "short", "neutral"]
    assert prediction.confidence_value > 0.0
    assert len(prediction.detected_patterns) > 0


@pytest.mark.asyncio
async def test_retraining_scheduler(db_session: AsyncSession):
    """Test retraining checks drift thresholds."""
    scheduler = RetrainingScheduler(db_session)
    # No active model yet -> needs train -> True
    needs = await scheduler.evaluate_performance_drift()
    assert needs is True
