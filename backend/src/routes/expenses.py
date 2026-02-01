"""
Expense management routes.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from src.database import get_db
from src.models.transaction import Expense
from src.routes.deps import CurrentUser
from src.schemas.transaction import (
    TransactionCreate,
    TransactionResponse,
    TransactionUpdate,
)

router = APIRouter()


@router.get("", response_model=List[TransactionResponse])
async def get_expense_list(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
):
    result = await db.execute(
        select(Expense).where(Expense.user_id == current_user.id).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    expense_data: TransactionCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    expense = Expense(**expense_data.dict(), user_id=current_user.id)
    db.add(expense)
    await db.commit()
    await db.refresh(expense)
    return expense


@router.get("/{expense_id}", response_model=TransactionResponse)
async def get_expense(
    expense_id: int,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    expense = await db.get(Expense, expense_id)
    if not expense or expense.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense


@router.put("/{expense_id}", response_model=TransactionResponse)
async def update_expense(
    expense_id: int,
    expense_data: TransactionUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    expense = await db.get(Expense, expense_id)
    if not expense or expense.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Expense not found")
    for key, value in expense_data.dict(exclude_unset=True).items():
        setattr(expense, key, value)
    await db.commit()
    await db.refresh(expense)
    return expense


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: int,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    expense = await db.get(Expense, expense_id)
    if not expense or expense.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Expense not found")
    await db.delete(expense)
    await db.commit()
