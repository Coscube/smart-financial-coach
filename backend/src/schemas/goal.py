"""
Goal Pydantic schemas for request/response validation.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from src.models.goal import GoalStatus, GoalType


class GoalBase(BaseModel):
    """Base goal schema with common fields."""

    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    goal_type: GoalType
    target_amount: Decimal = Field(..., gt=0, decimal_places=2)
    target_date: Optional[datetime] = None


class GoalCreate(GoalBase):
    """Schema for creating a new goal."""

    pass


class GoalUpdate(BaseModel):
    """Schema for updating a goal."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    goal_type: Optional[GoalType] = None
    target_amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    current_amount: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    status: Optional[GoalStatus] = None
    target_date: Optional[datetime] = None


class GoalResponse(GoalBase):
    """Schema for goal response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    current_amount: Decimal
    status: GoalStatus
    created_at: datetime
    updated_at: datetime

    @property
    def progress_percentage(self) -> float:
        """Calculate progress towards goal."""
        if self.target_amount == 0:
            return 0.0
        return float((self.current_amount / self.target_amount) * 100)

    @property
    def remaining_amount(self) -> Decimal:
        """Calculate remaining amount to reach goal."""
        return self.target_amount - self.current_amount
