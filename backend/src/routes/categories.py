"""
Transaction category routes.
"""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.category import TransactionCategory

router = APIRouter()


@router.get("/", status_code=status.HTTP_200_OK)
async def get_categories(
    db: Annotated[AsyncSession, Depends(get_db)],
    transaction_type: Optional[str] = Query(None, description="Filter by transaction type: 'expense' or 'income'"),
):
    """
    Get all available categories, optionally filtered by transaction type.
    
    Args:
        transaction_type: Optional filter - 'expense' or 'income'
    
    Returns:
        List of unique category names
    """
    query = select(TransactionCategory.name, TransactionCategory.transaction_type).distinct()
    
    if transaction_type:
        query = query.where(TransactionCategory.transaction_type == transaction_type)
    
    query = query.order_by(TransactionCategory.name)
    
    result = await db.execute(query)
    categories = result.all()
    
    # Return list of dicts with name and type
    return [{"name": cat[0], "type": cat[1]} for cat in categories]
