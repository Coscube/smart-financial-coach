"""
Budget service for handling budget-related business logic.
"""

from typing import List, Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.budget import Budget
from src.schemas.budget import BudgetCreate, BudgetUpdate


class BudgetService:
    """Service for budget operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, budget_id: int, user_id: int) -> Optional[Budget]:
        """Get a budget by ID for a specific user."""
        result = await self.db.execute(
            select(Budget).where(
                and_(Budget.id == budget_id, Budget.user_id == user_id)
            )
        )
        return result.scalar_one_or_none()

    async def get_all(self, user_id: int, skip: int = 0, limit: int = 100) -> List[Budget]:
        """Get all budgets for a user with pagination."""
        result = await self.db.execute(
            select(Budget)
            .where(Budget.user_id == user_id)
            .order_by(Budget.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def create(self, user_id: int, budget_data: BudgetCreate) -> Budget:
        """Create a new budget."""
        budget = Budget(
            user_id=user_id,
            **budget_data.model_dump(),
        )
        self.db.add(budget)
        await self.db.flush()
        await self.db.refresh(budget)
        return budget

    async def update(
        self, budget_id: int, user_id: int, budget_data: BudgetUpdate
    ) -> Optional[Budget]:
        """Update an existing budget."""
        budget = await self.get_by_id(budget_id, user_id)
        if not budget:
            return None

        update_data = budget_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(budget, field, value)

        await self.db.flush()
        await self.db.refresh(budget)
        return budget

    async def delete(self, budget_id: int, user_id: int) -> bool:
        """Delete a budget."""
        budget = await self.get_by_id(budget_id, user_id)
        if not budget:
            return False
        await self.db.delete(budget)
        await self.db.flush()
        return True

    async def update_spent(
        self, budget_id: int, user_id: int, amount: float
    ) -> Optional[Budget]:
        """Update the spent amount for a budget."""
        budget = await self.get_by_id(budget_id, user_id)
        if not budget:
            return None

        budget.spent = amount
        await self.db.flush()
        await self.db.refresh(budget)
        return budget
