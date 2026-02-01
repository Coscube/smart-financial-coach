"""
Budget database models.
"""

import enum
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

if TYPE_CHECKING:
    from src.models.user import User


class BudgetCategory(enum.Enum):
    """Budget category types."""

    HOUSING = "housing"
    UTILITIES = "utilities"
    GROCERIES = "groceries"
    TRANSPORTATION = "transportation"
    HEALTHCARE = "healthcare"
    ENTERTAINMENT = "entertainment"
    DINING = "dining"
    SHOPPING = "shopping"
    EDUCATION = "education"
    INSURANCE = "insurance"
    SAVINGS = "savings"
    DEBT_PAYMENT = "debt_payment"
    OTHER = "other"


class BudgetPeriod(enum.Enum):
    """Budget period types."""

    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class Budget(Base):
    """Budget model for tracking spending limits."""

    __tablename__ = "budgets"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[BudgetCategory] = mapped_column(Enum(BudgetCategory), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    spent: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    period: Mapped[BudgetPeriod] = mapped_column(
        Enum(BudgetPeriod), default=BudgetPeriod.MONTHLY
    )
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="budgets")

    def __repr__(self) -> str:
        return f"<Budget(id={self.id}, name={self.name}, amount={self.amount})>"

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
