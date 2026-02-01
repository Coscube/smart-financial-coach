"""
Budget management routes.
"""

from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.routes.deps import CurrentUser
from src.schemas.budget import BudgetCreate, BudgetResponse, BudgetUpdate
from src.services.budget import BudgetService

router = APIRouter()


@router.get("", response_model=List[BudgetResponse])
async def get_budgets(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
):
    """Get all budgets for the current user."""
    budget_service = BudgetService(db)
    budgets = await budget_service.get_all(current_user.id, skip, limit)
    return budgets


@router.get("/{budget_id}", response_model=BudgetResponse)
async def get_budget(
    budget_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get a specific budget by ID."""
    budget_service = BudgetService(db)
    budget = await budget_service.get_by_id(budget_id, current_user.id)
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found"
        )
    return budget


@router.post("", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
async def create_budget(
    budget_data: BudgetCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create a new budget."""
    budget_service = BudgetService(db)
    budget = await budget_service.create(current_user.id, budget_data)
    return budget


@router.put("/{budget_id}", response_model=BudgetResponse)
async def update_budget(
    budget_id: int,
    budget_data: BudgetUpdate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update an existing budget."""
    budget_service = BudgetService(db)
    budget = await budget_service.update(budget_id, current_user.id, budget_data)
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found"
        )
    return budget


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget(
    budget_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Delete a budget."""
    budget_service = BudgetService(db)
    deleted = await budget_service.delete(budget_id, current_user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found"
        )
