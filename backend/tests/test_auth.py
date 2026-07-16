import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    """Test user registration."""
    payload = {
        "email": "test_trader@forexai.pro",
        "full_name": "Test Trader",
        "password": "StrongPassword123!"
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == payload["email"]
    assert data["full_name"] == payload["full_name"]
    assert "id" in data


@pytest.mark.asyncio
async def test_register_weak_password(client: AsyncClient):
    """Test registration rejects weak passwords."""
    payload = {
        "email": "weak_tester@forexai.pro",
        "full_name": "Weak Tester",
        "password": "weak"
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_user(client: AsyncClient):
    """Test login validations and JWT token returns."""
    # First, register
    reg_payload = {
        "email": "login_trader@forexai.pro",
        "full_name": "Login Trader",
        "password": "LoginPassword123!"
    }
    await client.post("/api/v1/auth/register", json=reg_payload)

    # Then, login
    login_payload = {
        "email": reg_payload["email"],
        "password": reg_payload["password"]
    }
    response = await client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
