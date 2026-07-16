import pytest
from httpx import AsyncClient
from tests.test_market_data import auth_headers


@pytest.mark.asyncio
async def test_create_and_manage_journal_entry(client: AsyncClient, auth_headers: dict):
    """Test full journal logging CRUD pipeline lifecycle."""
    
    # ─── Create ─────────────────────────────────────
    payload = {
        "pair": "GBP/USD",
        "direction": "long",
        "entry_price": 1.27254,
        "stop_loss": 1.26800,
        "take_profit": 1.28500,
        "position_size_lots": 0.20,
        "notes": "Testing initial entry logging"
    }
    response = await client.post("/api/v1/journal/entries", json=payload, headers=auth_headers)
    assert response.status_code == 201
    entry_id = response.json()["id"]

    # ─── List ───────────────────────────────────────
    list_response = await client.get("/api/v1/journal/entries", headers=auth_headers)
    assert list_response.status_code == 200
    assert len(list_response.json()) > 0

    # ─── Update/Edit ────────────────────────────────
    update_payload = {
        "notes": "Updated initial entry logs",
        "actual_exit_price": 1.28254,
        "outcome": "win"
    }
    update_res = await client.put(f"/api/v1/journal/entries/{entry_id}", json=update_payload, headers=auth_headers)
    assert update_res.status_code == 200
    assert update_res.json()["notes"] == update_payload["notes"]
    assert update_res.json()["actual_pnl"] is not None

    # ─── Performance ────────────────────────────────
    perf_res = await client.get("/api/v1/journal/performance", headers=auth_headers)
    assert perf_res.status_code == 200
    data = perf_res.json()
    assert data["total_trades"] > 0
    assert data["wins"] > 0

    # ─── Delete ─────────────────────────────────────
    del_res = await client.delete(f"/api/v1/journal/entries/{entry_id}", headers=auth_headers)
    assert del_res.status_code == 204
