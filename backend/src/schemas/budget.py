"""
Budget Pydantic schemas for request/response validation.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from src.models.budget import BudgetCategory, BudgetPeriod


class BudgetBase(BaseModel):
    """Base budget schema with common fields."""

    name: str = Field(..., min_length=1, max_length=100)
    category: BudgetCategory
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    period: BudgetPeriod = BudgetPeriod.MONTHLY
    start_date: datetime
    end_date: Optional[datetime] = None


class BudgetCreate(BudgetBase):
    """Schema for creating a new budget."""

    pass


class BudgetUpdate(BaseModel):
    """Schema for updating a budget."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    category: Optional[BudgetCategory] = None
    amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    spent: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    period: Optional[BudgetPeriod] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class BudgetResponse(BudgetBase):
    """Schema for budget response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    spent: Decimal
    created_at: datetime
    updated_at: datetime

    @property
    def remaining(self) -> Decimal:
        """Calculate remaining budget amount."""
        return self.amount - self.spent

    @property
    def percentage_used(self) -> float:
        """Calculate percentage of budget used."""
        if self.amount == 0:
            return 0.0
        return float((self.spent / self.amount) * 100)
