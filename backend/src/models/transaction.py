"""
Transaction database models.
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


class TransactionCategory(enum.Enum):
    """Transaction category types."""

    # Income categories
    SALARY = "salary"
    FREELANCE = "freelance"
    INVESTMENT = "investment"
    GIFT = "gift"
    OTHER_INCOME = "other_income"

    # Expense categories
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
    OTHER_EXPENSE = "other_expense"


class TransactionType(enum.Enum):
    """Transaction type - income or expense."""

    INCOME = "income"
    EXPENSE = "expense"


class Expense(Base):
    """Expense transaction model."""

    __tablename__ = "expense"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    category: Mapped[TransactionCategory] = mapped_column(Enum(TransactionCategory), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    merchant: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    transaction_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship("User", back_populates="expenses")

    def __repr__(self) -> str:
        return f"<Expense(id={self.id}, amount={self.amount}, category={self.category})>"


class Income(Base):
    """Income transaction model."""

    __tablename__ = "income"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    category: Mapped[TransactionCategory] = mapped_column(Enum(TransactionCategory), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    merchant: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    transaction_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship("User", back_populates="incomes")

    def __repr__(self) -> str:
        return f"<Income(id={self.id}, amount={self.amount}, category={self.category})>"
