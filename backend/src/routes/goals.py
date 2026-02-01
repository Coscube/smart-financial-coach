"""
Goal management routes.
"""

from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.goal import GoalStatus
from src.routes.deps import CurrentUser
from src.schemas.goal import GoalCreate, GoalResponse, GoalUpdate
from src.services.goal import GoalService

router = APIRouter()


@router.get("", response_model=List[GoalResponse])
async def get_goals(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: GoalStatus = None,
):
    """Get all goals for the current user."""
    goal_service = GoalService(db)
    if status:
        goals = await goal_service.get_by_status(current_user.id, status, skip, limit)
    else:
        goals = await goal_service.get_all(current_user.id, skip, limit)
    return goals


@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(
    goal_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get a specific goal by ID."""
    goal_service = GoalService(db)
    goal = await goal_service.get_by_id(goal_id, current_user.id)
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found"
        )
    return goal


@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    goal_data: GoalCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create a new goal."""
    goal_service = GoalService(db)
    goal = await goal_service.create(current_user.id, goal_data)
    return goal


@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: int,
    goal_data: GoalUpdate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update an existing goal."""
    goal_service = GoalService(db)
    goal = await goal_service.update(goal_id, current_user.id, goal_data)
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found"
        )
    return goal


@router.post("/{goal_id}/contribute", response_model=GoalResponse)
async def contribute_to_goal(
    goal_id: int,
    amount: float,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Add a contribution to a goal."""
    goal_service = GoalService(db)
    goal = await goal_service.add_contribution(goal_id, current_user.id, amount)
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found"
        )
    return goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Delete a goal."""
    goal_service = GoalService(db)
    deleted = await goal_service.delete(goal_id, current_user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found"
        )
