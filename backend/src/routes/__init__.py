"""
API Routes package.
"""

from fastapi import APIRouter

from src.routes.auth import router as auth_router
from src.routes.budgets import router as budgets_router
from src.routes.expenses import router as expenses_router
from src.routes.goals import router as goals_router
from src.routes.health import router as health_router
from src.routes.incomes import router as incomes_router
from src.routes.users import router as users_router

api_router = APIRouter()

# Include all route modules
api_router.include_router(health_router, tags=["Health"])
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users_router, prefix="/users", tags=["Users"])
api_router.include_router(expenses_router, prefix="/expense", tags=["Expense"])
api_router.include_router(incomes_router, prefix="/income", tags=["Income"])
api_router.include_router(budgets_router, prefix="/budgets", tags=["Budgets"])
api_router.include_router(goals_router, prefix="/goals", tags=["Goals"])

__all__ = ["api_router"]
