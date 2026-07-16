import pytest
from httpx import AsyncClient

@pytest.fixture
async def admin_headers(client: AsyncClient) -> dict:
    """Fixture returning validated Administration headers from first registered User (assigned Admin)."""
    reg_payload = {
        "email": "platform_admin@forexai.pro",
        "full_name": "Platform Admin",
        "password": "AdminPassword123!"
    }
    # Call register: first registered user gets the 'admin' role automatically
    await client.post("/api/v1/auth/register", json=reg_payload)

    login_payload = {
        "email": reg_payload["email"],
        "password": reg_payload["password"]
    }
    res = await client.post("/api/v1/auth/login", json=login_payload)
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_list_models_registry(client: AsyncClient, admin_headers: dict):
    """Test queries to model register."""
    response = await client.get("/api/v1/admin/models", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_broadcast_alerts(client: AsyncClient, admin_headers: dict):
    """Test broadcasting notifications to active traders."""
    payload = {
        "user_id": "all",
        "title": "System Diagnostic Alert",
        "message": "Ensemble networks are running health evaluations.",
        "type": "system"
    }
    response = await client.post("/api/v1/admin/notifications/broadcast", json=payload, headers=admin_headers)
    assert response.status_code == 201
    assert "detail" in response.json()


@pytest.mark.asyncio
async def test_get_diagnostic_metrics(client: AsyncClient, admin_headers: dict):
    """Test checking administrative hardware diagnostics metrics."""
    response = await client.get("/api/v1/admin/metrics", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "cpu_usage_pct" in data
    assert "memory_usage_pct" in data
    assert "database_pool_size" in data
