"""
Goal database model.
"""

import enum
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

if TYPE_CHECKING:
    from src.models.user import User


class GoalStatus(enum.Enum):
    """Goal status types."""

    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"


class GoalType(enum.Enum):
    """Goal type categories."""

    EMERGENCY_FUND = "emergency_fund"
    RETIREMENT = "retirement"
    VACATION = "vacation"
    HOME_DOWN_PAYMENT = "home_down_payment"
    CAR_PURCHASE = "car_purchase"
    DEBT_PAYOFF = "debt_payoff"
    EDUCATION = "education"
    WEDDING = "wedding"
    INVESTMENT = "investment"
    OTHER = "other"


class Goal(Base):
    """Financial goal model."""

    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    goal_type: Mapped[GoalType] = mapped_column(Enum(GoalType), nullable=False)
    target_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    current_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    status: Mapped[GoalStatus] = mapped_column(Enum(GoalStatus), default=GoalStatus.NOT_STARTED)
    target_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="goals")

    def __repr__(self) -> str:
        return f"<Goal(id={self.id}, name={self.name}, target={self.target_amount})>"

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
