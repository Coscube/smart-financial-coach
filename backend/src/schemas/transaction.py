"""
Transaction Pydantic schemas for request/response validation.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from src.models.transaction import TransactionCategory, TransactionType


class TransactionBase(BaseModel):
    """Base transaction schema with common fields."""

    amount: Decimal = Field(..., gt=0, decimal_places=2)
    category: TransactionCategory
    description: Optional[str] = Field(None, max_length=500)
    transaction_date: datetime


class TransactionCreate(TransactionBase):
    """Schema for creating a new transaction."""

    pass


class TransactionUpdate(BaseModel):
    """Schema for updating a transaction."""

    amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    transaction_type: Optional[TransactionType] = None
    category: Optional[TransactionCategory] = None
    description: Optional[str] = Field(None, max_length=500)
    merchant: Optional[str] = Field(None, max_length=255)
    transaction_date: Optional[datetime] = None


class TransactionResponse(TransactionBase):
    """Schema for transaction response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime


class TransactionFilter(BaseModel):
    """Schema for filtering transactions."""

    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    transaction_type: Optional[TransactionType] = None
    category: Optional[TransactionCategory] = None
    min_amount: Optional[Decimal] = None
    max_amount: Optional[Decimal] = None
