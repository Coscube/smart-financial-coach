"""
Income management routes.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from src.database import get_db
from src.models.transaction import Income
from src.routes.deps import CurrentUser
from src.schemas.transaction import (
    TransactionCreate,
    TransactionResponse,
    TransactionUpdate,
)

router = APIRouter()


@router.get("", response_model=List[TransactionResponse])
async def get_income_list(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
):
    result = await db.execute(
        select(Income).where(Income.user_id == current_user.id).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_income(
    income_data: TransactionCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    income = Income(**income_data.dict(), user_id=current_user.id)
    db.add(income)
    await db.commit()
    await db.refresh(income)
    return income


@router.get("/{income_id}", response_model=TransactionResponse)
async def get_income(
    income_id: int,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    income = await db.get(Income, income_id)
    if not income or income.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Income not found")
    return income


@router.put("/{income_id}", response_model=TransactionResponse)
async def update_income(
    income_id: int,
    income_data: TransactionUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    income = await db.get(Income, income_id)
    if not income or income.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Income not found")
    for key, value in income_data.dict(exclude_unset=True).items():
        setattr(income, key, value)
    await db.commit()
    await db.refresh(income)
    return income


@router.delete("/{income_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_income(
    income_id: int,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    income = await db.get(Income, income_id)
    if not income or income.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Income not found")
    await db.delete(income)
    await db.commit()
