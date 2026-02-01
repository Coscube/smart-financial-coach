"""
Goal service for handling goal-related business logic.
"""

from typing import List, Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.goal import Goal, GoalStatus
from src.schemas.goal import GoalCreate, GoalUpdate


class GoalService:
    """Service for goal operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, goal_id: int, user_id: int) -> Optional[Goal]:
        """Get a goal by ID for a specific user."""
        result = await self.db.execute(
            select(Goal).where(and_(Goal.id == goal_id, Goal.user_id == user_id))
        )
        return result.scalar_one_or_none()

    async def get_all(self, user_id: int, skip: int = 0, limit: int = 100) -> List[Goal]:
        """Get all goals for a user with pagination."""
        result = await self.db.execute(
            select(Goal)
            .where(Goal.user_id == user_id)
            .order_by(Goal.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_by_status(
        self, user_id: int, status: GoalStatus, skip: int = 0, limit: int = 100
    ) -> List[Goal]:
        """Get goals by status for a user."""
        result = await self.db.execute(
            select(Goal)
            .where(and_(Goal.user_id == user_id, Goal.status == status))
            .order_by(Goal.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def create(self, user_id: int, goal_data: GoalCreate) -> Goal:
        """Create a new goal."""
        goal = Goal(
            user_id=user_id,
            **goal_data.model_dump(),
        )
        self.db.add(goal)
        await self.db.flush()
        await self.db.refresh(goal)
        return goal

    async def update(
        self, goal_id: int, user_id: int, goal_data: GoalUpdate
    ) -> Optional[Goal]:
        """Update an existing goal."""
        goal = await self.get_by_id(goal_id, user_id)
        if not goal:
            return None

        update_data = goal_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(goal, field, value)

        # Auto-update status based on progress
        if goal.current_amount >= goal.target_amount:
            goal.status = GoalStatus.COMPLETED
        elif goal.current_amount > 0 and goal.status == GoalStatus.NOT_STARTED:
            goal.status = GoalStatus.IN_PROGRESS

        await self.db.flush()
        await self.db.refresh(goal)
        return goal

    async def delete(self, goal_id: int, user_id: int) -> bool:
        """Delete a goal."""
        goal = await self.get_by_id(goal_id, user_id)
        if not goal:
            return False
        await self.db.delete(goal)
        await self.db.flush()
        return True

    async def add_contribution(
        self, goal_id: int, user_id: int, amount: float
    ) -> Optional[Goal]:
        """Add a contribution to a goal."""
        goal = await self.get_by_id(goal_id, user_id)
        if not goal:
            return None

        goal.current_amount += amount

        # Auto-update status
        if goal.current_amount >= goal.target_amount:
            goal.status = GoalStatus.COMPLETED
        elif goal.status == GoalStatus.NOT_STARTED:
            goal.status = GoalStatus.IN_PROGRESS

        await self.db.flush()
        await self.db.refresh(goal)
        return goal
