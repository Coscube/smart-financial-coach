"""
Transaction management routes.
"""

from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.routes.deps import CurrentUser
from src.schemas.transaction import (
    TransactionCreate,
    TransactionFilter,
    TransactionResponse,
    TransactionUpdate,
)
from src.services.transaction import TransactionService

router = APIRouter()


@router.get("", response_model=List[TransactionResponse])
async def get_transactions(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
):
    """Get all transactions for the current user."""
    transaction_service = TransactionService(db)
    transactions = await transaction_service.get_all(current_user.id, skip, limit)
    return transactions


@router.post("/filter", response_model=List[TransactionResponse])
async def filter_transactions(
    filters: TransactionFilter,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
):
    """Get filtered transactions for the current user."""
    transaction_service = TransactionService(db)
    transactions = await transaction_service.get_filtered(
        current_user.id, filters, skip, limit
    )
    return transactions


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get a specific transaction by ID."""
    transaction_service = TransactionService(db)
    transaction = await transaction_service.get_by_id(transaction_id, current_user.id)
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found"
        )
    return transaction


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    transaction_data: TransactionCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create a new transaction."""
    transaction_service = TransactionService(db)
    transaction = await transaction_service.create(current_user.id, transaction_data)
    return transaction


@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: int,
    transaction_data: TransactionUpdate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update an existing transaction."""
    transaction_service = TransactionService(db)
    transaction = await transaction_service.update(
        transaction_id, current_user.id, transaction_data
    )
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found"
        )
    return transaction


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Delete a transaction."""
    transaction_service = TransactionService(db)
    deleted = await transaction_service.delete(transaction_id, current_user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found"
        )
