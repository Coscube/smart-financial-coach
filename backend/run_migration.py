"""
Migration script to fix budget category column type.
"""
import asyncio
from sqlalchemy import text
from src.database import engine


async def run_migration():
    """Run the migration to fix budget period column type."""
    statements = [
        "ALTER TABLE budgets ADD COLUMN period_temp VARCHAR(20);",
        "UPDATE budgets SET period_temp = period::text;",
        "ALTER TABLE budgets DROP COLUMN period;",
        "ALTER TABLE budgets RENAME COLUMN period_temp TO period;",
        "ALTER TABLE budgets ALTER COLUMN period SET DEFAULT 'monthly';",
        "DROP TYPE IF EXISTS budgetperiod CASCADE;",
    ]
    
    async with engine.begin() as conn:
        try:
            for stmt in statements:
                await conn.execute(text(stmt))
            print("✓ Migration completed successfully!")
        except Exception as e:
            print(f"✗ Migration failed: {e}")


if __name__ == "__main__":
    asyncio.run(run_migration())
