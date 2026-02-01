"""
Transaction Category model for storing distinct categories from uploads.
"""

from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class TransactionCategory(Base):
    """Stores distinct transaction categories extracted from uploads."""

    __tablename__ = "transaction_categories"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    transaction_type: Mapped[str] = mapped_column(String(50), nullable=False)  # "income" or "expense"
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        return f"<TransactionCategory(id={self.id}, name={self.name}, type={self.transaction_type})>"
