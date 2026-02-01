"""
Health check routes.
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "smart-financial-coach-api"}


@router.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to Smart Financial Coach API",
        "docs": "/api/docs",
        "health": "/api/health",
    }
