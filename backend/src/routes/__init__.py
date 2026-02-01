"""
API Routes package.
"""

from fastapi import APIRouter

from src.routes.auth import router as auth_router
from src.routes.users import router as users_router
from src.routes.transactions import router as transactions_router
from src.routes.budgets import router as budgets_router
from src.routes.goals import router as goals_router
from src.routes.health import router as health_router

api_router = APIRouter()

# Include all route modules
api_router.include_router(health_router, tags=["Health"])
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users_router, prefix="/users", tags=["Users"])
api_router.include_router(transactions_router, prefix="/transactions", tags=["Transactions"])
api_router.include_router(budgets_router, prefix="/budgets", tags=["Budgets"])
api_router.include_router(goals_router, prefix="/goals", tags=["Goals"])

__all__ = ["api_router"]
