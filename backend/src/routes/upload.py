"""
Excel file upload routes for importing transactions.
"""

from datetime import datetime, timezone
from decimal import Decimal
from io import BytesIO
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from openpyxl import load_workbook
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.category import TransactionCategory
from src.models.transaction import Transaction, TransactionType
from src.routes.deps import CurrentUser

router = APIRouter()


async def get_or_create_category(
    db: AsyncSession, category_name: str, transaction_type: str
) -> str:
    """Get or create a transaction category in the database."""
    if not category_name or not category_name.strip():
        category_name = "Uncategorized"
    
    category_name = category_name.strip()
    
    # Check if category exists
    result = await db.execute(
        select(TransactionCategory).where(
            TransactionCategory.name == category_name,
            TransactionCategory.transaction_type == transaction_type,
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        return existing.name
    
    # Create new category
    new_category = TransactionCategory(
        name=category_name,
        transaction_type=transaction_type,
    )
    db.add(new_category)
    await db.flush()  # Flush to ensure it's created but not committed yet
    return category_name


@router.post("/excel", status_code=status.HTTP_201_CREATED)
async def upload_excel(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
):
    """
    Upload an Excel file with Expenses and Income sheets.
    
    Dynamically extracts unique categories from the Excel file and creates them as distinct enums.
    
    Expected Excel format:
    - Sheet 1: "Expenses" with columns: Date and time | Category | Amount | Comment
    - Sheet 2: "Income" with columns: Date and time | Category | Amount | Comment
    """
    # Validate file type
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Please upload an Excel file (.xlsx or .xls)",
        )
    
    try:
        # Load workbook from uploaded file
        contents = await file.read()
        wb = load_workbook(BytesIO(contents), read_only=True, data_only=True)
        
        transactions_created = {
            "expenses": 0,
            "income": 0,
            "errors": [],
            "categories_added": set(),
        }
        
        # Process Expenses sheet
        if "Expenses" in wb.sheetnames:
            expenses_sheet = wb["Expenses"]
            for row_idx, row in enumerate(
                expenses_sheet.iter_rows(min_row=3, values_only=True), start=3
            ):
                # Skip empty rows or rows with missing required data
                if not row or len(row) < 3 or not row[0] or row[2] is None:
                    continue
                
                try:
                    date_value = row[0]
                    category = row[1] if len(row) > 1 else None
                    amount = row[2]
                    comment = row[3] if len(row) > 3 else None
                    
                    # Parse date
                    if isinstance(date_value, datetime):
                        transaction_date = date_value.replace(tzinfo=timezone.utc)
                    else:
                        transaction_date = datetime.strptime(
                            str(date_value), "%Y-%m-%d"
                        ).replace(tzinfo=timezone.utc)
                    
                    # Get or create category
                    category_name = await get_or_create_category(
                        db,
                        str(category) if category else "Uncategorized",
                        "expense",
                    )
                    transactions_created["categories_added"].add(category_name)
                    
                    # Create transaction
                    transaction = Transaction(
                        user_id=current_user.id,
                        transaction_type=TransactionType.EXPENSE,
                        amount=Decimal(str(amount)),
                        category=category_name,
                        description=str(comment) if comment else None,
                        transaction_date=transaction_date,
                    )
                    db.add(transaction)
                    transactions_created["expenses"] += 1
                    
                except Exception as e:
                    transactions_created["errors"].append(f"Expenses row {row_idx}: {str(e)}")
        
        # Process Income sheet
        if "Income" in wb.sheetnames:
            income_sheet = wb["Income"]
            for row_idx, row in enumerate(
                income_sheet.iter_rows(min_row=3, values_only=True), start=3
            ):
                # Skip empty rows or rows with missing required data
                if not row or len(row) < 3 or not row[0] or row[2] is None:
                    continue
                
                try:
                    date_value = row[0]
                    category = row[1] if len(row) > 1 else None
                    amount = row[2]
                    comment = row[3] if len(row) > 3 else None
                    
                    # Parse date
                    if isinstance(date_value, datetime):
                        transaction_date = date_value.replace(tzinfo=timezone.utc)
                    else:
                        transaction_date = datetime.strptime(
                            str(date_value), "%Y-%m-%d"
                        ).replace(tzinfo=timezone.utc)
                    
                    # Get or create category
                    category_name = await get_or_create_category(
                        db,
                        str(category) if category else "Uncategorized",
                        "income",
                    )
                    transactions_created["categories_added"].add(category_name)
                    
                    # Create transaction
                    transaction = Transaction(
                        user_id=current_user.id,
                        transaction_type=TransactionType.INCOME,
                        amount=Decimal(str(amount)),
                        category=category_name,
                        description=str(comment) if comment else None,
                        transaction_date=transaction_date,
                    )
                    db.add(transaction)
                    transactions_created["income"] += 1
                    
                except Exception as e:
                    transactions_created["errors"].append(f"Income row {row_idx}: {str(e)}")
        
        # Commit all transactions and categories
        await db.commit()
        
        wb.close()
        
        return {
            "message": "Excel file processed successfully",
            "expenses_imported": transactions_created["expenses"],
            "income_imported": transactions_created["income"],
            "total_imported": transactions_created["expenses"]
            + transactions_created["income"],
            "categories_created": len(transactions_created["categories_added"]),
            "errors": transactions_created["errors"][:10]
            if transactions_created["errors"]
            else [],
        }
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing Excel file: {str(e)}",
        )
