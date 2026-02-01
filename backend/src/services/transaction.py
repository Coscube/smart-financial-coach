"""
Transaction service for handling transaction-related business logic.
"""

from typing import List, Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.transaction import Transaction
from src.schemas.transaction import TransactionCreate, TransactionUpdate, TransactionFilter


class TransactionService:
    """Service for transaction operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, transaction_id: int, user_id: int) -> Optional[Transaction]:
        """Get a transaction by ID for a specific user."""
        result = await self.db.execute(
            select(Transaction).where(
                and_(Transaction.id == transaction_id, Transaction.user_id == user_id)
            )
        )
        return result.scalar_one_or_none()

    async def get_all(
        self, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[Transaction]:
        """Get all transactions for a user with pagination."""
        result = await self.db.execute(
            select(Transaction)
            .where(Transaction.user_id == user_id)
            .order_by(Transaction.transaction_date.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_filtered(
        self, user_id: int, filters: TransactionFilter, skip: int = 0, limit: int = 100
    ) -> List[Transaction]:
        """Get filtered transactions for a user."""
        query = select(Transaction).where(Transaction.user_id == user_id)

        if filters.start_date:
            query = query.where(Transaction.transaction_date >= filters.start_date)
        if filters.end_date:
            query = query.where(Transaction.transaction_date <= filters.end_date)
        if filters.transaction_type:
            query = query.where(Transaction.transaction_type == filters.transaction_type)
        if filters.category:
            query = query.where(Transaction.category == filters.category)
        if filters.min_amount:
            query = query.where(Transaction.amount >= filters.min_amount)
        if filters.max_amount:
            query = query.where(Transaction.amount <= filters.max_amount)

        query = query.order_by(Transaction.transaction_date.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create(self, user_id: int, transaction_data: TransactionCreate) -> Transaction:
        """Create a new transaction."""
        transaction = Transaction(
            user_id=user_id,
            **transaction_data.model_dump(),
        )
        self.db.add(transaction)
        await self.db.flush()
        await self.db.refresh(transaction)
        return transaction

    async def update(
        self, transaction_id: int, user_id: int, transaction_data: TransactionUpdate
    ) -> Optional[Transaction]:
        """Update an existing transaction."""
        transaction = await self.get_by_id(transaction_id, user_id)
        if not transaction:
            return None

        update_data = transaction_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(transaction, field, value)

        await self.db.flush()
        await self.db.refresh(transaction)
        return transaction

    async def delete(self, transaction_id: int, user_id: int) -> bool:
        """Delete a transaction."""
        transaction = await self.get_by_id(transaction_id, user_id)
        if not transaction:
            return False
        await self.db.delete(transaction)
        await self.db.flush()
        return True
