import pytest
from httpx import AsyncClient
from tests.test_market_data import auth_headers  # Re-use setup headers fixture

@pytest.mark.asyncio
async def test_run_analysis_inference(client: AsyncClient, auth_headers: dict):
    """Test generating a forecast prediction from the model."""
    payload = {
        "pair": "EUR/USD",
        "timeframe": "1h"
    }
    response = await client.post("/api/v1/predictions/analyze", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["pair"] == "EUR/USD"
    assert "direction" in data
    assert "confidence_value" in data
    assert "ai_narrative" in data
    assert "explanation" in data


@pytest.mark.asyncio
async def test_get_predictions_history(client: AsyncClient, auth_headers: dict):
    """Test queries to predict logs history."""
    response = await client.get("/api/v1/predictions/history", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
