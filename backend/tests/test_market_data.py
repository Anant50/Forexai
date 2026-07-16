import pytest
from httpx import AsyncClient

@pytest.fixture
async def auth_headers(client: AsyncClient) -> dict:
    """Fixture returning validated Authorization header."""
    reg_payload = {
        "email": "market_trader@forexai.pro",
        "full_name": "Market Trader",
        "password": "MarketPassword123!"
    }
    await client.post("/api/v1/auth/register", json=reg_payload)

    login_payload = {
        "email": reg_payload["email"],
        "password": reg_payload["password"]
    }
    res = await client.post("/api/v1/auth/login", json=login_payload)
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_get_candles(client: AsyncClient, auth_headers: dict):
    """Test retrieving historic candlestick intervals."""
    params = {"pair": "EUR/USD", "timeframe": "1h", "limit": 10}
    response = await client.get("/api/v1/market-data/candles", params=params, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert data[0]["pair"] == "EUR/USD"


@pytest.mark.asyncio
async def test_get_indicators(client: AsyncClient, auth_headers: dict):
    """Test indicators endpoint fetching."""
    params = {"pair": "EUR/USD", "timeframe": "1h", "limit": 5}
    response = await client.get("/api/v1/market-data/indicators", params=params, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert "rsi" in data[0]


@pytest.mark.asyncio
async def test_get_economic_calendar(client: AsyncClient, auth_headers: dict):
    """Test calendar events stream retrieval."""
    response = await client.get("/api/v1/market-data/calendar", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert "event_name" in data[0]


@pytest.mark.asyncio
async def test_get_news(client: AsyncClient, auth_headers: dict):
    """Test news headline sentiment streams retrieval."""
    response = await client.get("/api/v1/market-data/news", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert "headline" in data[0]
    assert "sentiment" in data[0]
