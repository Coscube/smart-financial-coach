"""
Tests for transaction endpoints.
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.transaction import Transaction, TransactionType
from src.models.user import User
from src.services.auth import AuthService


@pytest.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Create a test user for transaction tests."""
    user = User(
        email="transaction_test@example.com",
        hashed_password=AuthService.hash_password("testpassword123"),
        first_name="Test",
        last_name="User",
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def test_user_authenticated(client: AsyncClient) -> dict:
    """Create and authenticate a test user, returning the user and token."""
    # Register user
    user_data = {
        "email": "auth_test@example.com",
        "password": "testpassword123",
        "first_name": "Auth",
        "last_name": "User",
    }
    await client.post("/api/auth/register", json=user_data)

    # Login to get token
    login_response = await client.post(
        "/api/auth/login",
        json={"email": user_data["email"], "password": user_data["password"]},
    )
    token_data = login_response.json()

    return {
        "email": user_data["email"],
        "access_token": token_data["access_token"],
        "token_type": token_data["token_type"],
    }


@pytest.fixture
async def sample_income_transaction(db_session: AsyncSession, test_user: User) -> Transaction:
    """Create a sample income transaction."""
    transaction = Transaction(
        user_id=test_user.id,
        transaction_type=TransactionType.INCOME,
        amount=Decimal("3000.00"),
        category="salary",
        description="Monthly salary",
        transaction_date=datetime.now(timezone.utc),
    )
    db_session.add(transaction)
    await db_session.commit()
    await db_session.refresh(transaction)
    return transaction


@pytest.fixture
async def sample_expense_transaction(db_session: AsyncSession, test_user: User) -> Transaction:
    """Create a sample expense transaction."""
    transaction = Transaction(
        user_id=test_user.id,
        transaction_type=TransactionType.EXPENSE,
        amount=Decimal("150.50"),
        category="groceries",
        description="Weekly groceries",
        transaction_date=datetime.now(timezone.utc),
    )
    db_session.add(transaction)
    await db_session.commit()
    await db_session.refresh(transaction)
    return transaction


class TestTransactionCreation:
    """Tests for creating transactions."""

    @pytest.mark.asyncio
    async def test_create_income_transaction_success(
        self, client: AsyncClient, test_user_authenticated: dict
    ):
        """Test successful creation of an income transaction."""
        headers = {
            "Authorization": f"{test_user_authenticated['token_type']} {test_user_authenticated['access_token']}"
        }

        transaction_data = {
            "transaction_type": "income",
            "amount": 2500.00,
            "category": "salary",
            "description": "Monthly salary",
            "transaction_date": datetime.now(timezone.utc).isoformat(),
        }

        response = await client.post(
            "/api/transactions",
            json=transaction_data,
            headers=headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["transaction_type"] == "income"
        assert float(data["amount"]) == 2500.00
        assert data["category"] == "salary"
        assert data["description"] == "Monthly salary"
        assert "id" in data
        assert "user_id" in data
        assert "created_at" in data
        assert "updated_at" in data

    @pytest.mark.asyncio
    async def test_create_expense_transaction_success(
        self, client: AsyncClient, test_user_authenticated: dict
    ):
        """Test successful creation of an expense transaction."""
        headers = {
            "Authorization": f"{test_user_authenticated['token_type']} {test_user_authenticated['access_token']}"
        }

        transaction_data = {
            "transaction_type": "expense",
            "amount": 45.99,
            "category": "dining",
            "description": "Dinner with friends",
            "transaction_date": datetime.now(timezone.utc).isoformat(),
        }

        response = await client.post(
            "/api/transactions",
            json=transaction_data,
            headers=headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["transaction_type"] == "expense"
        assert float(data["amount"]) == 45.99
        assert data["category"] == "dining"

    @pytest.mark.asyncio
    async def test_create_transaction_without_auth(self, client: AsyncClient):
        """Test creating transaction without authentication fails."""
        transaction_data = {
            "transaction_type": "income",
            "amount": 2500.00,
            "category": "salary",
            "description": "Monthly salary",
            "transaction_date": datetime.now(timezone.utc).isoformat(),
        }

        response = await client.post("/api/transactions", json=transaction_data)

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_create_transaction_missing_required_field(
        self, client: AsyncClient, test_user_authenticated: dict
    ):
        """Test creating transaction with missing required field."""
        headers = {
            "Authorization": f"{test_user_authenticated['token_type']} {test_user_authenticated['access_token']}"
        }

        # Missing transaction_type
        transaction_data = {
            "amount": 2500.00,
            "category": "salary",
            "description": "Monthly salary",
            "transaction_date": datetime.now(timezone.utc).isoformat(),
        }

        response = await client.post(
            "/api/transactions",
            json=transaction_data,
            headers=headers,
        )

        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_create_transaction_invalid_amount(
        self, client: AsyncClient, test_user_authenticated: dict
    ):
        """Test creating transaction with invalid (zero/negative) amount."""
        headers = {
            "Authorization": f"{test_user_authenticated['token_type']} {test_user_authenticated['access_token']}"
        }

        transaction_data = {
            "transaction_type": "income",
            "amount": -100.00,
            "category": "salary",
            "description": "Monthly salary",
            "transaction_date": datetime.now(timezone.utc).isoformat(),
        }

        response = await client.post(
            "/api/transactions",
            json=transaction_data,
            headers=headers,
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_transaction_empty_category(
        self, client: AsyncClient, test_user_authenticated: dict
    ):
        """Test creating transaction with empty category fails."""
        headers = {
            "Authorization": f"{test_user_authenticated['token_type']} {test_user_authenticated['access_token']}"
        }

        transaction_data = {
            "transaction_type": "income",
            "amount": 2500.00,
            "category": "",
            "description": "Monthly salary",
            "transaction_date": datetime.now(timezone.utc).isoformat(),
        }

        response = await client.post(
            "/api/transactions",
            json=transaction_data,
            headers=headers,
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_transaction_invalid_type(
        self, client: AsyncClient, test_user_authenticated: dict
    ):
        """Test creating transaction with invalid transaction type."""
        headers = {
            "Authorization": f"{test_user_authenticated['token_type']} {test_user_authenticated['access_token']}"
        }

        transaction_data = {
            "transaction_type": "invalid_type",
            "amount": 2500.00,
            "category": "salary",
            "description": "Monthly salary",
            "transaction_date": datetime.now(timezone.utc).isoformat(),
        }

        response = await client.post(
            "/api/transactions",
            json=transaction_data,
            headers=headers,
        )

        assert response.status_code == 422


class TestTransactionRetrieval:
    """Tests for retrieving transactions."""

    @pytest.mark.asyncio
    async def test_get_all_transactions_success(
        self, client: AsyncClient, test_user_authenticated: dict, db_session: AsyncSession
    ):
        """Test retrieving all transactions for authenticated user."""
        headers = {
            "Authorization": f"{test_user_authenticated['token_type']} {test_user_authenticated['access_token']}"
        }

        # Get test user from database
        from sqlalchemy.future import select

        result = await db_session.execute(
            select(User).where(User.email == test_user_authenticated["email"])
        )
        user = result.scalar_one()

        # Create sample transactions
        for i in range(3):
            transaction = Transaction(
                user_id=user.id,
                transaction_type=TransactionType.INCOME,
                amount=Decimal("1000.00"),
                category="salary",
                description=f"Salary {i+1}",
                transaction_date=datetime.now(timezone.utc) - timedelta(days=i),
            )
            db_session.add(transaction)
        await db_session.commit()

        response = await client.get("/api/transactions", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
        assert all("id" in item for item in data)
        assert all("amount" in item for item in data)
        assert all("transaction_type" in item for item in data)

    @pytest.mark.asyncio
    async def test_get_transactions_without_auth(self, client: AsyncClient):
        """Test retrieving transactions without authentication fails."""
        response = await client.get("/api/transactions")

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_get_transactions_with_pagination(
        self, client: AsyncClient, test_user_authenticated: dict, db_session: AsyncSession
    ):
        """Test pagination when retrieving transactions."""
        headers = {
            "Authorization": f"{test_user_authenticated['token_type']} {test_user_authenticated['access_token']}"
        }

        from sqlalchemy.future import select

        result = await db_session.execute(
            select(User).where(User.email == test_user_authenticated["email"])
        )
        user = result.scalar_one()

        # Create 10 transactions
        for i in range(10):
            transaction = Transaction(
                user_id=user.id,
                transaction_type=TransactionType.EXPENSE,
                amount=Decimal("50.00"),
                category="groceries",
                description=f"Groceries {i+1}",
                transaction_date=datetime.now(timezone.utc),
            )
            db_session.add(transaction)
        await db_session.commit()

        # Test with limit
        response = await client.get("/api/transactions?limit=5", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 5

    @pytest.mark.asyncio
    async def test_get_single_transaction_success(
        self,
        client: AsyncClient,
        test_user_authenticated: dict,
        db_session: AsyncSession,
    ):
        """Test retrieving a single transaction by ID."""
        headers = {
            "Authorization": f"{test_user_authenticated['token_type']} {test_user_authenticated['access_token']}"
        }

        from sqlalchemy.future import select

        result = await db_session.execute(
            select(User).where(User.email == test_user_authenticated["email"])
        )
        user = result.scalar_one()

        # Create a transaction
        transaction = Transaction(
            user_id=user.id,
            transaction_type=TransactionType.INCOME,
            amount=Decimal("5000.00"),
            category="freelance",
            description="Freelance project",
            transaction_date=datetime.now(timezone.utc),
        )
        db_session.add(transaction)
        await db_session.commit()
        await db_session.refresh(transaction)

        response = await client.get(f"/api/transactions/{transaction.id}", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == transaction.id
        assert float(data["amount"]) == 5000.00
        assert data["transaction_type"] == "income"
        assert data["category"] == "freelance"

    @pytest.mark.asyncio
    async def test_get_nonexistent_transaction(
        self, client: AsyncClient, test_user_authenticated: dict
    ):
        """Test retrieving non-existent transaction returns 404."""
        headers = {
            "Authorization": f"{test_user_authenticated['token_type']} {test_user_authenticated['access_token']}"
        }

        response = await client.get("/api/transactions/99999", headers=headers)

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_cannot_access_other_users_transaction(
        self,
        client: AsyncClient,
        test_user_authenticated: dict,
        db_session: AsyncSession,
    ):
        """Test that users cannot access other users' transactions."""
        # Create another user
        other_user = User(
            email="other_user@example.com",
            hashed_password=AuthService.hash_password("password123"),
            first_name="Other",
            last_name="User",
            is_active=True,
            is_verified=True,
        )
        db_session.add(other_user)
        await db_session.commit()
        await db_session.refresh(other_user)

        # Create transaction for other user
        transaction = Transaction(
            user_id=other_user.id,
            transaction_type=TransactionType.EXPENSE,
            amount=Decimal("100.00"),
            category="housing",
            description="Rent",
            transaction_date=datetime.now(timezone.utc),
        )
        db_session.add(transaction)
        await db_session.commit()

        headers = {
            "Authorization": f"{test_user_authenticated['token_type']} {test_user_authenticated['access_token']}"
        }

        response = await client.get(f"/api/transactions/{transaction.id}", headers=headers)

        assert response.status_code == 404


class TestTransactionUpdate:
    """Tests for updating transactions."""

    @pytest.mark.asyncio
    async def test_update_transaction_success(
        self,
        client: AsyncClient,
        test_user_authenticated: dict,
        db_session: AsyncSession,
    ):
        """Test successfully updating a transaction."""
        headers = {
            "Authorization": f"{test_user_authenticated['token_type']} {test_user_authenticated['access_token']}"
        }

        from sqlalchemy.future import select

        result = await db_session.execute(
            select(User).where(User.email == test_user_authenticated["email"])
        )
        user = result.scalar_one()

        # Create a transaction
        transaction = Transaction(
            user_id=user.id,
            transaction_type=TransactionType.EXPENSE,
            amount=Decimal("100.00"),
            category="groceries",
            description="Old description",
            transaction_date=datetime.now(timezone.utc),
        )
        db_session.add(transaction)
        await db_session.commit()
        await db_session.refresh(transaction)

        # Update it
        update_data = {
            "amount": 150.00,
            "description": "Updated description",
            "category": "dining",
        }

        response = await client.put(
            f"/api/transactions/{transaction.id}",
            json=update_data,
            headers=headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == transaction.id
        assert float(data["amount"]) == 150.00
        assert data["description"] == "Updated description"
        assert data["category"] == "dining"

    @pytest.mark.asyncio
    async def test_update_transaction_partial(
        self,
        client: AsyncClient,
        test_user_authenticated: dict,
        db_session: AsyncSession,
    ):
        """Test partial update of transaction."""
        headers = {
            "Authorization": f"{test_user_authenticated['token_type']} {test_user_authenticated['access_token']}"
        }

        from sqlalchemy.future import select

        result = await db_session.execute(
            select(User).where(User.email == test_user_authenticated["email"])
        )
        user = result.scalar_one()

        # Create a transaction
        transaction = Transaction(
            user_id=user.id,
            transaction_type=TransactionType.INCOME,
            amount=Decimal("2000.00"),
            category="salary",
            description="Monthly salary",
            transaction_date=datetime.now(timezone.utc),
        )
        db_session.add(transaction)
        await db_session.commit()
        await db_session.refresh(transaction)

        # Update only amount
        update_data = {"amount": 2500.00}

        response = await client.put(
            f"/api/transactions/{transaction.id}",
            json=update_data,
            headers=headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert float(data["amount"]) == 2500.00
        assert data["category"] == "salary"  # Unchanged
        assert data["description"] == "Monthly salary"  # Unchanged

    @pytest.mark.asyncio
    async def test_update_nonexistent_transaction(
        self, client: AsyncClient, test_user_authenticated: dict
    ):
        """Test updating non-existent transaction returns 404."""
        headers = {
            "Authorization": f"{test_user_authenticated['token_type']} {test_user_authenticated['access_token']}"
        }

        update_data = {"amount": 150.00}

        response = await client.put(
            "/api/transactions/99999",
            json=update_data,
            headers=headers,
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_with_invalid_amount(
        self,
        client: AsyncClient,
        test_user_authenticated: dict,
        db_session: AsyncSession,
    ):
        """Test updating transaction with invalid amount."""
        headers = {
            "Authorization": f"{test_user_authenticated['token_type']} {test_user_authenticated['access_token']}"
        }

        from sqlalchemy.future import select

        result = await db_session.execute(
            select(User).where(User.email == test_user_authenticated["email"])
        )
        user = result.scalar_one()

        transaction = Transaction(
            user_id=user.id,
            transaction_type=TransactionType.EXPENSE,
            amount=Decimal("50.00"),
            category="groceries",
            description="Groceries",
            transaction_date=datetime.now(timezone.utc),
        )
        db_session.add(transaction)
        await db_session.commit()
        await db_session.refresh(transaction)

        update_data = {"amount": -100.00}

        response = await client.put(
            f"/api/transactions/{transaction.id}",
            json=update_data,
            headers=headers,
        )

        assert response.status_code == 422


class TestTransactionDeletion:
    """Tests for deleting transactions."""

    @pytest.mark.asyncio
    async def test_delete_transaction_success(
        self,
        client: AsyncClient,
        test_user_authenticated: dict,
        db_session: AsyncSession,
    ):
        """Test successfully deleting a transaction."""
        headers = {
            "Authorization": f"{test_user_authenticated['token_type']} {test_user_authenticated['access_token']}"
        }

        from sqlalchemy.future import select

        result = await db_session.execute(
            select(User).where(User.email == test_user_authenticated["email"])
        )
        user = result.scalar_one()

        # Create a transaction
        transaction = Transaction(
            user_id=user.id,
            transaction_type=TransactionType.EXPENSE,
            amount=Decimal("75.00"),
            category="entertainment",
            description="Movie tickets",
            transaction_date=datetime.now(timezone.utc),
        )
        db_session.add(transaction)
        await db_session.commit()
        await db_session.refresh(transaction)

        transaction_id = transaction.id

        # Delete it
        response = await client.delete(
            f"/api/transactions/{transaction_id}",
            headers=headers,
        )

        assert response.status_code == 204

        # Verify it's deleted
        verify_response = await client.get(
            f"/api/transactions/{transaction_id}",
            headers=headers,
        )
        assert verify_response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_nonexistent_transaction(
        self, client: AsyncClient, test_user_authenticated: dict
    ):
        """Test deleting non-existent transaction returns 404."""
        headers = {
            "Authorization": f"{test_user_authenticated['token_type']} {test_user_authenticated['access_token']}"
        }

        response = await client.delete(
            "/api/transactions/99999",
            headers=headers,
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_cannot_delete_other_users_transaction(
        self,
        client: AsyncClient,
        test_user_authenticated: dict,
        db_session: AsyncSession,
    ):
        """Test that users cannot delete other users' transactions."""
        # Create another user
        other_user = User(
            email="other_delete_user@example.com",
            hashed_password=AuthService.hash_password("password123"),
            first_name="Other",
            last_name="User",
            is_active=True,
            is_verified=True,
        )
        db_session.add(other_user)
        await db_session.commit()
        await db_session.refresh(other_user)

        # Create transaction for other user
        transaction = Transaction(
            user_id=other_user.id,
            transaction_type=TransactionType.INCOME,
            amount=Decimal("5000.00"),
            category="gift",
            description="Gift",
            transaction_date=datetime.now(timezone.utc),
        )
        db_session.add(transaction)
        await db_session.commit()

        headers = {
            "Authorization": f"{test_user_authenticated['token_type']} {test_user_authenticated['access_token']}"
        }

        response = await client.delete(
            f"/api/transactions/{transaction.id}",
            headers=headers,
        )

        assert response.status_code == 404


class TestTransactionAuthorization:
    """Tests for transaction authorization and security."""

    @pytest.mark.asyncio
    async def test_user_can_only_see_own_transactions(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Test that users only see their own transactions."""
        # Create two users
        user1 = User(
            email="user1_isolation@example.com",
            hashed_password=AuthService.hash_password("password123"),
            first_name="User",
            last_name="One",
            is_active=True,
            is_verified=True,
        )
        user2 = User(
            email="user2_isolation@example.com",
            hashed_password=AuthService.hash_password("password123"),
            first_name="User",
            last_name="Two",
            is_active=True,
            is_verified=True,
        )
        db_session.add(user1)
        db_session.add(user2)
        await db_session.commit()
        await db_session.refresh(user1)
        await db_session.refresh(user2)

        # Create transactions for each user
        for user, count in [(user1, 3), (user2, 2)]:
            for i in range(count):
                transaction = Transaction(
                    user_id=user.id,
                    transaction_type=TransactionType.EXPENSE,
                    amount=Decimal("50.00"),
                    category="groceries",
                    description=f"Transaction {i+1}",
                    transaction_date=datetime.now(timezone.utc),
                )
                db_session.add(transaction)
        await db_session.commit()

        # Authenticate as user1
        login_response = await client.post(
            "/api/auth/login",
            json={
                "email": "user1_isolation@example.com",
                "password": "password123",
            },
        )
        user1_token = login_response.json()["access_token"]

        headers = {"Authorization": f"bearer {user1_token}"}
        response = await client.get("/api/transactions", headers=headers)

        assert response.status_code == 200
        data = response.json()
        # User1 should see only their 3 transactions
        assert len(data) == 3
