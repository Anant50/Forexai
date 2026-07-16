import pytest
from datetime import timezone, datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from httpx import AsyncClient
import io

from app.models.models import (
    Candle, DataSource, ModelVersion, ModelStatus, 
    Prediction, JournalEntry, OutcomeType, DirectionType,
    User, UserRole
)
from app.core.security import get_password_hash
from app.ml.dataset_manager import DatasetManager
from app.ml.comparator import ModelComparator
from app.ml.trainer import ModelTrainer

@pytest.fixture
def sample_csv() -> str:
    return """date,open,high,low,close,volume
2026-07-01 00:00:00,1.08500,1.08600,1.08400,1.08550,1500.0
2026-07-01 01:00:00,1.08550,1.08650,1.08500,1.08610,1200.0
2026-07-01 02:00:00,1.08610,1.08700,1.08550,1.08570,1100.0
2026-07-01 03:00:00,1.08570,1.08620,1.08450,1.08490,950.0
"""

@pytest.fixture
async def test_user_id(db_session: AsyncSession) -> str:
    user = User(
        email="trader_sample@forexai.pro",
        full_name="Trader Sample",
        hashed_password=get_password_hash("Password123!"),
        role=UserRole.trader,
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user.id

@pytest.fixture
async def admin_token_headers(client: AsyncClient, db_session: AsyncSession) -> dict:
    email = "test_admin_mgmt@forexai.pro"
    password = "AdminPassword123!"
    
    db_admin = User(
        email=email,
        full_name="Admin Management",
        hashed_password=get_password_hash(password),
        role=UserRole.admin,
        is_active=True
    )
    db_session.add(db_admin)
    await db_session.commit()

    response = await client.post("/api/v1/auth/login", json={
        "email": email,
        "password": password
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_dataset_import(db_session: AsyncSession, sample_csv, test_user_id):
    """Test importing manual CSV historical candles data."""
    res = await DatasetManager.import_csv_dataset(
        db=db_session,
        csv_content=sample_csv,
        pair="EUR/USD",
        timeframe="1h",
        user_id=test_user_id
    )
    assert res["row_count"] == 4
    assert res["pair"] == "EUR/USD"
    assert res["timeframe"] == "1h"

    # Query candles
    candles_res = await db_session.execute(select(Candle).filter(Candle.source == DataSource.manual))
    candles = candles_res.scalars().all()
    assert len(candles) == 4
    assert float(candles[0].open_price) == 1.08500


@pytest.mark.asyncio
async def test_dataset_assembly(db_session: AsyncSession, test_user_id):
    """Test gathering prediction outcome history dataframes."""
    # Seed prediction
    pred = Prediction(
        pair="GBP/USD",
        timeframe="1h",
        direction=DirectionType.long,
        confidence_value=85.0,
        entry_price=1.2850,
        stop_loss=1.2800,
        take_profit=1.2950,
        risk_reward=2.0,
        outcome=OutcomeType.open,
        indicator_signals={"rsi": 32.0, "macd_histogram": 0.0002, "ema_200": 1.2800},
        ai_narrative="Sample long prediction"
    )
    db_session.add(pred)
    await db_session.flush()

    # Seed journal outcome
    journal = JournalEntry(
        user_id=test_user_id,
        prediction_id=pred.id,
        pair="GBP/USD",
        direction=DirectionType.long,
        entry_price=1.2850,
        outcome=OutcomeType.win,
        actual_pnl=150.0
    )
    db_session.add(journal)
    await db_session.commit()

    df = await DatasetManager.assemble_training_dataset(db_session, "GBP/USD", "1h")
    assert not df.empty
    assert len(df) == 1
    assert df["target"].iloc[0] == 1
    assert df["rsi"].iloc[0] == 32.0


@pytest.mark.asyncio
async def test_model_comparator(db_session: AsyncSession):
    """Test model performance comparator thresholds evaluation."""
    # Seed current production active model
    active_model = ModelVersion(
        model_name="forexai_ensemble",
        version_tag="v1.0.0",
        status=ModelStatus.active,
        accuracy=0.6500,
        sharpe_ratio=1.80,
        win_rate=0.58,
        hyperparameters={}
    )
    db_session.add(active_model)
    await db_session.commit()

    # Case A: Candidate is better (higher accuracy)
    better = await ModelComparator.evaluate_candidate(db_session, candidate_accuracy=0.6600, candidate_sharpe=1.80)
    assert better is True

    # Case B: Candidate is worse
    worse = await ModelComparator.evaluate_candidate(db_session, candidate_accuracy=0.6400, candidate_sharpe=1.70)
    assert worse is False


@pytest.mark.asyncio
async def test_on_demand_retrain_promotion(db_session: AsyncSession):
    """Test full retraining run, promotions, demotions, and cleanup hooks."""
    # Seed 250 candles to pass the length constraint (> 200)
    base_time = datetime.now(timezone.utc) - timedelta(days=15)
    for i in range(220):
        candle = Candle(
            pair="EUR/USD",
            timeframe="1h",
            open_time=base_time + timedelta(hours=i),
            open_price=1.08500,
            high_price=1.08600,
            low_price=1.08400,
            close_price=1.08520,
            volume=1000.0,
            source=DataSource.yfinance
        )
        db_session.add(candle)
    await db_session.commit()

    # Pre-seed active model
    prod = ModelVersion(
        model_name="forexai_ensemble",
        version_tag="v1.0.0",
        status=ModelStatus.active,
        accuracy=0.65,
        sharpe_ratio=1.2,
        win_rate=0.55,
        hyperparameters={}
    )
    db_session.add(prod)
    await db_session.commit()

    trainer = ModelTrainer(db_session)
    new_model = await trainer.retrain_on_demand("EUR/USD", "1h", "v2.0.0")

    assert new_model.id is not None
    assert new_model.version_tag == "v2.0.0"
    
    await db_session.refresh(prod)
    if new_model.status == ModelStatus.active:
        assert prod.status == ModelStatus.rolled_back
    else:
        assert new_model.status == ModelStatus.approved
        assert prod.status == ModelStatus.active


@pytest.mark.asyncio
async def test_model_rollback(db_session: AsyncSession, test_user_id):
    """Test rolling back production active model to historic tag."""
    v1 = ModelVersion(
        model_name="forexai_ensemble",
        version_tag="v1.0.0",
        status=ModelStatus.approved,
        accuracy=0.65,
        sharpe_ratio=1.5,
        hyperparameters={}
    )
    v2 = ModelVersion(
        model_name="forexai_ensemble",
        version_tag="v2.0.0",
        status=ModelStatus.active,
        accuracy=0.68,
        sharpe_ratio=1.9,
        hyperparameters={}
    )
    db_session.add_all([v1, v2])
    await db_session.commit()

    from app.services.admin_service import AdminService
    rolled = await AdminService.rollback_model(db_session, v1.id, test_user_id)
    assert rolled.status == ModelStatus.active

    await db_session.refresh(v2)
    assert v2.status == ModelStatus.rolled_back


@pytest.mark.asyncio
async def test_admin_endpoints(client: AsyncClient, db_session: AsyncSession, admin_token_headers):
    """Test manual dataset uploads, retraining triggering, and rollback API channels."""
    # 1. Dataset CSV file upload
    csv_file = io.BytesIO(b"date,open,high,low,close,volume\n2026-07-01 00:00:00,1.08,1.09,1.07,1.085,100")
    files = {"file": ("test.csv", csv_file, "text/csv")}
    data = {"pair": "EUR/USD", "timeframe": "1h"}
    
    resp_upload = await client.post(
        "/api/v1/admin/models/import-dataset",
        files=files,
        data=data,
        headers=admin_token_headers
    )
    assert resp_upload.status_code == 201
    assert resp_upload.json()["row_count"] == 1

    # 2. Add sufficient candles before triggering retraining
    base_time = datetime.now(timezone.utc) - timedelta(days=15)
    for i in range(220):
        candle = Candle(
            pair="GBP/USD",
            timeframe="1h",
            open_time=base_time + timedelta(hours=i),
            open_price=1.2850,
            high_price=1.2900,
            low_price=1.2800,
            close_price=1.2860,
            volume=500.0,
            source=DataSource.yfinance
        )
        db_session.add(candle)
    await db_session.commit()

    # Trigger retraining
    retrain_payload = {
        "pair": "GBP/USD",
        "timeframe": "1h",
        "version_tag": "v3.0.0",
        "hyperparameters": {"depth": 5}
    }
    resp_retrain = await client.post(
        "/api/v1/admin/models/retrain",
        json=retrain_payload,
        headers=admin_token_headers
    )
    assert resp_retrain.status_code == 201
    model_json = resp_retrain.json()
    assert model_json["version_tag"] == "v3.0.0"

    # Rollback trigger
    resp_rollback = await client.post(
        f"/api/v1/admin/models/{model_json['id']}/rollback",
        headers=admin_token_headers
    )
    assert resp_rollback.status_code == 200
    assert resp_rollback.json()["status"] == ModelStatus.active
