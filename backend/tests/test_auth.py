"""
Tests for authentication endpoints.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    """Test user registration."""
    user_data = {
        "email": "test@example.com",
        "password": "securepassword123",
        "first_name": "Test",
        "last_name": "User",
    }
    response = await client.post("/api/auth/register", json=user_data)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == user_data["email"]
    assert data["first_name"] == user_data["first_name"]
    assert data["last_name"] == user_data["last_name"]
    assert "id" in data
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    """Test registration with duplicate email."""
    user_data = {
        "email": "duplicate@example.com",
        "password": "securepassword123",
        "first_name": "Test",
        "last_name": "User",
    }
    # First registration
    await client.post("/api/auth/register", json=user_data)
    # Second registration with same email
    response = await client.post("/api/auth/register", json=user_data)
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    """Test successful login."""
    # First register a user
    user_data = {
        "email": "login@example.com",
        "password": "securepassword123",
        "first_name": "Test",
        "last_name": "User",
    }
    await client.post("/api/auth/register", json=user_data)

    # Then login
    login_data = {"email": "login@example.com", "password": "securepassword123"}
    response = await client.post("/api/auth/login", json=login_data)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient):
    """Test login with invalid credentials."""
    login_data = {"email": "nonexistent@example.com", "password": "wrongpassword"}
    response = await client.post("/api/auth/login", json=login_data)
    assert response.status_code == 401
