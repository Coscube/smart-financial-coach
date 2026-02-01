"""
AI Coach routes for providing financial advice based on user transactions.
Comprehensive chatbot with intent detection, privacy-first design, and
engaging personality. Falls back to AI API for complex questions.

Security Features:
- No PII (names, emails) sent to AI models
- Input sanitization and validation
- Rate limiting ready (via middleware)
- Blocked topics detection
"""

import random
import re
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from enum import Enum
from typing import Annotated, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from src.config import settings
from src.database import get_db
from src.models.goal import Goal
from src.models.transaction import Transaction, TransactionType
from src.routes.deps import CurrentUser

router = APIRouter()

# ============================================
# SECURITY: Blocked patterns and PII detection
# ============================================
BLOCKED_PATTERNS = [
    r"\b(password|pwd|secret|api.?key|token)\b",
    r"\b(ssn|social.?security)\b",
    r"\b(credit.?card|card.?number|cvv|cvc)\b",
    r"\b(bank.?account|routing.?number|account.?number)\b",
    r"\b(hack|exploit|inject|sql.?inject)\b",
]

PII_PATTERNS = [
    r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",  # Email
    r"\b\d{3}[-.]?\d{2}[-.]?\d{4}\b",  # SSN
    r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b",  # Credit card
]

# ============================================
# INTENT DETECTION: Categorize user questions
# ============================================


class Intent(str, Enum):
    """User intent categories for smarter routing."""

    GREETING = "greeting"
    SUMMARY = "summary"
    SPENDING = "spending"
    INCOME = "income"
    SAVINGS = "savings"
    COMPARISON = "comparison"
    CATEGORY = "category"
    ADVICE = "advice"
    GOALS = "goals"
    FORECAST = "forecast"
    ANOMALY = "anomaly"
    HELP = "help"
    THANKS = "thanks"
    UNKNOWN = "unknown"


INTENT_PATTERNS = {
    Intent.GREETING: [
        r"^(hi|hello|hey|good\s*(morning|afternoon|evening)|howdy)",
        r"^(what'?s up|sup|yo)\b",
    ],
    Intent.SUMMARY: [
        r"(summary|overview|how.?am.?i.?doing|financial.?health)",
        r"(quick.?look|snapshot|status|report)",
    ],
    Intent.SPENDING: [
        r"(spend|spent|expense|pay|paid|cost|purchase|buy|bought)",
        r"(where.?did.?my.?money|money.?go)",
    ],
    Intent.INCOME: [
        r"(income|earn|salary|revenue|money.?in|deposit)",
        r"(how.?much.?made|money.?coming)",
    ],
    Intent.SAVINGS: [
        r"(save|saving|savings|leftover|remaining|surplus)",
        r"(how.?can.?i.?save|cut.?back|reduce)",
    ],
    Intent.COMPARISON: [
        r"(compar|vs|versus|last.?month|previous|change)",
        r"(better|worse|up|down|increase|decrease)",
    ],
    Intent.CATEGORY: [
        r"(category|categories|breakdown|food|grocery|entertainment)",
        r"(transport|shopping|utilities|bills|rent)",
    ],
    Intent.ADVICE: [
        r"(advice|suggest|recommend|tip|help.?me|should.?i)",
        r"(how.?to|what.?can|best.?way|improve)",
    ],
    Intent.GOALS: [
        r"(goal|target|objective|aim|plan|milestone)",
        r"(emergency.?fund|vacation|retire|debt)",
    ],
    Intent.FORECAST: [
        r"(predict|forecast|project|estimate|will.?i|future)",
        r"(end.?of.?month|next.?month|year.?end)",
    ],
    Intent.ANOMALY: [
        r"(anomal|unusual|weird|strange|odd|suspicious)",
        r"(spike|jump|surge|unexpected|surprise)",
        r"(out.?of.?ordinary|different|abnormal)",
    ],
    Intent.HELP: [
        r"^help$|what.?can.?you|what.?do.?you|commands|options",
        r"how.?does.?this|explain|tutorial",
    ],
    Intent.THANKS: [
        r"(thanks?|thank.?you|thx|appreciate|great|awesome|perfect)",
    ],
}

# ============================================
# ENGAGING RESPONSES: Personality & variety
# ============================================
GREETINGS = [
    "Hey there! 👋 Ready to dive into your finances?",
    "Hello! 💰 Let's see how your money is doing today!",
    "Hi! 🌟 I'm your financial coach. What would you like to know?",
    "Welcome back! 📊 How can I help with your finances today?",
]

THANKS_RESPONSES = [
    "You're welcome! 😊 Let me know if you need anything else!",
    "Glad I could help! 💪 Keep up the great financial habits!",
    "Anytime! 🌟 Feel free to ask more questions!",
    "Happy to help! 📈 You're doing great staying on top of your finances!",
]

ENCOURAGEMENTS = [
    "💪 Keep it up!",
    "🌟 You're on the right track!",
    "📈 Great progress!",
    "👏 Nice work!",
    "🎯 You've got this!",
]


class ChatRequest(BaseModel):
    """Request model for AI coach chat."""

    message: str

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        """Validate and sanitize the message."""
        # Strip whitespace
        v = v.strip()

        # Check length
        if len(v) < 1:
            raise ValueError("Message cannot be empty")
        if len(v) > 1000:
            raise ValueError("Message too long (max 1000 characters)")

        # Check for blocked patterns
        lower_msg = v.lower()
        for pattern in BLOCKED_PATTERNS:
            if re.search(pattern, lower_msg, re.IGNORECASE):
                raise ValueError(
                    "For security, I can't help with sensitive information. "
                    "Please ask about your spending, income, or savings instead!"
                )

        return v


class ChatResponse(BaseModel):
    """Response model for AI coach chat."""

    response: str
    intent: Optional[str] = None
    suggestions: Optional[list[str]] = None


# ============================================
# HELPER FUNCTIONS
# ============================================


def detect_intent(message: str) -> Intent:
    """Detect user intent from message using pattern matching."""
    lower_msg = message.lower().strip()

    for intent, patterns in INTENT_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, lower_msg, re.IGNORECASE):
                return intent

    return Intent.UNKNOWN


def sanitize_for_ai(text: str) -> str:
    """Remove PII before sending to external AI."""
    result = text
    for pattern in PII_PATTERNS:
        result = re.sub(pattern, "[REDACTED]", result)
    return result


def get_follow_up_suggestions(intent: Intent, context: dict) -> list[str]:
    """Get contextual follow-up suggestions based on intent."""
    suggestions = {
        Intent.GREETING: [
            "How much did I spend this month?",
            "Show me my financial summary",
            "What are my top expenses?",
        ],
        Intent.SUMMARY: [
            "Compare to last month",
            "How can I save more?",
            "What's my biggest expense?",
        ],
        Intent.SPENDING: [
            "Break down by category",
            "What's my daily average?",
            "Compare to last month",
        ],
        Intent.INCOME: [
            "What's my net savings?",
            "Am I saving enough?",
            "Show expense breakdown",
        ],
        Intent.SAVINGS: [
            "Give me saving tips",
            "What's my savings rate?",
            "Set a savings goal",
        ],
        Intent.COMPARISON: [
            "Why did spending change?",
            "Show category breakdown",
            "Give me advice",
        ],
        Intent.CATEGORY: [
            "How can I reduce this?",
            "Compare to average",
            "Set a budget limit",
        ],
        Intent.ADVICE: [
            "Show my spending",
            "What are my goals?",
            "Create a budget",
        ],
        Intent.GOALS: [
            "How much should I save?",
            "Track my progress",
            "Adjust my timeline",
        ],
        Intent.FORECAST: [
            "How to improve forecast?",
            "Set a savings target",
            "Review my spending",
        ],
        Intent.ANOMALY: [
            "Show my top expenses",
            "Compare to last month",
            "What caused the spike?",
        ],
    }

    base_suggestions = suggestions.get(
        intent,
        ["Show summary", "Give me advice", "What are my top expenses?"],
    )

    # Add context-aware suggestions
    month = context.get("month", {})
    if month.get("net", 0) < 0:
        base_suggestions.insert(0, "How can I fix my budget?")

    return base_suggestions[:3]


def format_currency(amount) -> str:
    """Format decimal/int/float as currency string."""
    try:
        return f"${float(amount):,.2f}"
    except (TypeError, ValueError):
        return "$0.00"


def get_date_ranges() -> dict:
    """Get commonly used date ranges for queries."""
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # This month
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Last month
    last_month_end = month_start - timedelta(days=1)
    last_month_start = last_month_end.replace(day=1)

    # This week (Monday start)
    days_since_monday = today.weekday()
    week_start = today - timedelta(days=days_since_monday)

    # Last week
    last_week_end = week_start - timedelta(days=1)
    last_week_start = last_week_end - timedelta(days=6)

    # This year
    year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

    # Last year
    last_year_start = year_start.replace(year=year_start.year - 1)
    last_year_end = year_start - timedelta(days=1)

    return {
        "today": today,
        "now": now,
        "month_start": month_start,
        "last_month_start": last_month_start,
        "last_month_end": last_month_end,
        "week_start": week_start,
        "last_week_start": last_week_start,
        "last_week_end": last_week_end,
        "year_start": year_start,
        "last_year_start": last_year_start,
        "last_year_end": last_year_end,
    }


# ============================================
# ANOMALY DETECTION
# ============================================


def detect_anomalies(context: dict) -> dict:
    """
    Detect unusual spending patterns and anomalies.

    Returns dict with:
    - large_transactions: Transactions significantly above average
    - category_spikes: Categories with unusual increases
    - frequency_anomalies: Unusual transaction frequency
    - new_categories: Categories that appeared recently
    """
    anomalies = {
        "large_transactions": [],
        "category_spikes": [],
        "frequency_anomalies": [],
        "new_categories": [],
        "has_anomalies": False,
    }

    # Get data from context
    daily_avg = float(context.get("daily_expense_avg", 0))
    month_categories = dict(context.get("month_categories_expense", []))
    last_month_categories = dict(context.get("last_month_categories", []))
    top_expenses = context.get("top_expenses", [])
    monthly_data = context.get("monthly_data", {})

    # 1. Large Transaction Detection (>3x daily average)
    threshold = daily_avg * 3 if daily_avg > 0 else 100
    for t in top_expenses[:10]:
        if float(t["amount"]) > threshold:
            anomalies["large_transactions"].append(
                {
                    "amount": float(t["amount"]),
                    "category": t["category"],
                    "description": t["description"],
                    "date": t["date"],
                    "multiple": round(float(t["amount"]) / daily_avg, 1) if daily_avg > 0 else 0,
                }
            )

    # 2. Category Spike Detection (>50% increase from last month)
    for cat, amount in month_categories.items():
        last_amount = float(last_month_categories.get(cat, 0))
        current = float(amount)
        if last_amount > 0:
            change_pct = ((current - last_amount) / last_amount) * 100
            if change_pct > 50:  # 50% increase threshold
                anomalies["category_spikes"].append(
                    {
                        "category": cat,
                        "current": current,
                        "previous": last_amount,
                        "change_pct": round(change_pct, 1),
                    }
                )

    # 3. New Categories (appeared this month, not last)
    for cat in month_categories:
        if cat not in last_month_categories:
            anomalies["new_categories"].append(
                {
                    "category": cat,
                    "amount": float(month_categories[cat]),
                }
            )

    # 4. Monthly Spending Spike
    if len(monthly_data) >= 2:
        sorted_months = sorted(monthly_data.items(), reverse=True)
        if len(sorted_months) >= 2:
            current_expenses = float(sorted_months[0][1].get("expenses", 0))
            prev_expenses = float(sorted_months[1][1].get("expenses", 0))
            if prev_expenses > 0:
                monthly_change = ((current_expenses - prev_expenses) / prev_expenses) * 100
                if monthly_change > 30:  # 30% month-over-month spike
                    anomalies["frequency_anomalies"].append(
                        {
                            "type": "monthly_spike",
                            "current": current_expenses,
                            "previous": prev_expenses,
                            "change_pct": round(monthly_change, 1),
                        }
                    )

    # Check if any anomalies were found
    anomalies["has_anomalies"] = (
        len(anomalies["large_transactions"]) > 0
        or len(anomalies["category_spikes"]) > 0
        or len(anomalies["new_categories"]) > 0
        or len(anomalies["frequency_anomalies"]) > 0
    )

    return anomalies


# ============================================
# FORECASTING & FUTURE INSIGHTS
# ============================================


def generate_forecast(context: dict) -> dict:
    """
    Generate financial forecasts and future insights.

    Returns dict with:
    - end_of_month: Projected end of month figures
    - savings_projection: When savings goals might be reached
    - spending_trend: Overall trend direction
    - recommendations: Actionable insights
    """
    forecast = {
        "end_of_month": {},
        "savings_projection": [],
        "spending_trend": "stable",
        "budget_status": "",
        "recommendations": [],
    }

    now = context.get("now", datetime.now(timezone.utc))
    day_of_month = now.day
    days_in_month = 30  # Approximation

    # Get financial data
    month = context.get("month", {})
    daily_exp_avg = float(context.get("daily_expense_avg", 0))
    daily_inc_avg = float(context.get("daily_income_avg", 0))
    monthly_data = context.get("monthly_data", {})
    goals = context.get("goals", [])

    current_expenses = float(month.get("expenses", 0))
    current_income = float(month.get("income", 0))

    # 1. End of Month Projection
    days_remaining = max(days_in_month - day_of_month, 0)

    # Project based on current month's daily average
    if day_of_month > 0:
        this_month_daily_exp = current_expenses / day_of_month
        this_month_daily_inc = current_income / day_of_month
    else:
        this_month_daily_exp = daily_exp_avg
        this_month_daily_inc = daily_inc_avg

    projected_expenses = current_expenses + (this_month_daily_exp * days_remaining)
    projected_income = current_income + (this_month_daily_inc * days_remaining)
    projected_net = projected_income - projected_expenses

    forecast["end_of_month"] = {
        "projected_expenses": round(projected_expenses, 2),
        "projected_income": round(projected_income, 2),
        "projected_net": round(projected_net, 2),
        "days_remaining": days_remaining,
        "current_daily_expense_rate": round(this_month_daily_exp, 2),
    }

    # 2. Spending Trend Analysis
    if len(monthly_data) >= 3:
        sorted_months = sorted(monthly_data.items(), reverse=True)[:3]
        expenses = [float(m[1].get("expenses", 0)) for m in sorted_months]

        if expenses[0] > expenses[1] > expenses[2]:
            forecast["spending_trend"] = "increasing"
        elif expenses[0] < expenses[1] < expenses[2]:
            forecast["spending_trend"] = "decreasing"
        elif expenses[0] > expenses[1]:
            forecast["spending_trend"] = "slightly_increasing"
        elif expenses[0] < expenses[1]:
            forecast["spending_trend"] = "slightly_decreasing"
        else:
            forecast["spending_trend"] = "stable"

    # 3. Budget Status
    if projected_net > 0:
        savings_rate = (projected_net / projected_income * 100) if projected_income > 0 else 0
        if savings_rate >= 20:
            forecast["budget_status"] = "excellent"
        elif savings_rate >= 10:
            forecast["budget_status"] = "good"
        else:
            forecast["budget_status"] = "fair"
    else:
        forecast["budget_status"] = "over_budget"

    # 4. Goal Projections
    monthly_savings = float(month.get("net", 0))
    for goal in goals:
        if goal.get("status") in ["not_started", "in_progress"]:
            target = float(goal.get("target", 0))
            current = float(goal.get("current", 0))
            remaining = target - current

            if monthly_savings > 0 and remaining > 0:
                months_to_goal = remaining / monthly_savings
                forecast["savings_projection"].append(
                    {
                        "goal_name": goal.get("name"),
                        "remaining": round(remaining, 2),
                        "months_to_goal": round(months_to_goal, 1),
                        "on_track": months_to_goal <= 12,
                    }
                )

    # 5. Generate Recommendations
    if forecast["budget_status"] == "over_budget":
        reduce_by = round(abs(projected_net) / max(days_remaining, 1), 2)
        forecast["recommendations"].append(
            "⚠️ You're on track to overspend this month. "
            f"Consider reducing daily spending by ${reduce_by}"
        )

    if forecast["spending_trend"] == "increasing":
        forecast["recommendations"].append(
            "📈 Your spending has been increasing over the past 3 months. "
            "Review your recent expenses for areas to cut back."
        )

    if forecast["budget_status"] in ["excellent", "good"]:
        forecast["recommendations"].append(
            f"✅ Great job! You're projected to save ${round(projected_net, 2)} this month."
        )

    return forecast


async def get_comprehensive_financial_context(user_id: int, db: AsyncSession) -> dict:
    """Get comprehensive user financial context for AI analysis."""
    dates = get_date_ranges()
    now = dates["now"]

    # Get ALL transactions
    result = await db.execute(
        select(Transaction)
        .where(Transaction.user_id == user_id)
        .order_by(Transaction.transaction_date.desc())
    )
    all_transactions = result.scalars().all()

    if not all_transactions:
        return {
            "has_data": False,
            "message": "No transactions found. Start adding income and expenses!",
        }

    # Current month transactions
    month_transactions = [
        t
        for t in all_transactions
        if t.transaction_date and t.transaction_date >= dates["month_start"]
    ]

    # Last month transactions
    last_month_transactions = [
        t
        for t in all_transactions
        if t.transaction_date
        and dates["last_month_start"] <= t.transaction_date <= dates["last_month_end"]
    ]

    # This week transactions
    week_transactions = [
        t
        for t in all_transactions
        if t.transaction_date and t.transaction_date >= dates["week_start"]
    ]

    # Last week transactions
    last_week_transactions = [
        t
        for t in all_transactions
        if t.transaction_date
        and dates["last_week_start"] <= t.transaction_date <= dates["last_week_end"]
    ]

    # This year transactions
    year_transactions = [
        t
        for t in all_transactions
        if t.transaction_date and t.transaction_date >= dates["year_start"]
    ]

    # Calculate various metrics
    def calc_totals(trans_list):
        income = sum(
            (t.amount for t in trans_list if t.transaction_type == TransactionType.INCOME),
            Decimal(0),
        )
        expenses = sum(
            (t.amount for t in trans_list if t.transaction_type == TransactionType.EXPENSE),
            Decimal(0),
        )
        return {"income": income, "expenses": expenses, "net": income - expenses}

    def group_by_category(trans_list, trans_type=None):
        categories = {}
        for t in trans_list:
            if trans_type and t.transaction_type != trans_type:
                continue
            cat = t.category if isinstance(t.category, str) else str(t.category)
            categories[cat] = categories.get(cat, Decimal(0)) + t.amount
        return sorted(categories.items(), key=lambda x: x[1], reverse=True)

    # Get top transactions
    expenses_sorted = sorted(
        [t for t in all_transactions if t.transaction_type == TransactionType.EXPENSE],
        key=lambda x: x.amount,
        reverse=True,
    )
    income_sorted = sorted(
        [t for t in all_transactions if t.transaction_type == TransactionType.INCOME],
        key=lambda x: x.amount,
        reverse=True,
    )

    # Monthly breakdown for trend analysis
    monthly_data = {}
    for t in all_transactions:
        if t.transaction_date:
            month_key = t.transaction_date.strftime("%Y-%m")
            if month_key not in monthly_data:
                monthly_data[month_key] = {"income": Decimal(0), "expenses": Decimal(0)}
            if t.transaction_type == TransactionType.INCOME:
                monthly_data[month_key]["income"] += t.amount
            else:
                monthly_data[month_key]["expenses"] += t.amount

    # Get user's goals
    result = await db.execute(select(Goal).where(Goal.user_id == user_id))
    goals = result.scalars().all()

    # Calculate averages
    days_with_data = len(
        set(t.transaction_date.date() for t in all_transactions if t.transaction_date)
    )
    total_expenses = sum(
        (t.amount for t in all_transactions if t.transaction_type == TransactionType.EXPENSE),
        Decimal(0),
    )
    total_income = sum(
        (t.amount for t in all_transactions if t.transaction_type == TransactionType.INCOME),
        Decimal(0),
    )

    # Find date range of data
    dates_list = [t.transaction_date for t in all_transactions if t.transaction_date]
    earliest_date = min(dates_list) if dates_list else now
    latest_date = max(dates_list) if dates_list else now

    return {
        "has_data": True,
        "dates": dates,
        "now": now,
        "month_name": now.strftime("%B %Y"),
        "last_month_name": dates["last_month_start"].strftime("%B %Y"),
        # Transaction counts
        "total_transactions": len(all_transactions),
        "month_transaction_count": len(month_transactions),
        "week_transaction_count": len(week_transactions),
        # Current month
        "month": calc_totals(month_transactions),
        "month_categories_expense": group_by_category(month_transactions, TransactionType.EXPENSE),
        "month_categories_income": group_by_category(month_transactions, TransactionType.INCOME),
        # Last month
        "last_month": calc_totals(last_month_transactions),
        "last_month_categories": group_by_category(
            last_month_transactions, TransactionType.EXPENSE
        ),
        # This week
        "week": calc_totals(week_transactions),
        "week_categories": group_by_category(week_transactions, TransactionType.EXPENSE),
        # Last week
        "last_week": calc_totals(last_week_transactions),
        # This year
        "year": calc_totals(year_transactions),
        "year_categories": group_by_category(year_transactions, TransactionType.EXPENSE),
        # All time
        "all_time": calc_totals(all_transactions),
        "all_categories": group_by_category(all_transactions, TransactionType.EXPENSE),
        # Top transactions
        "top_expenses": [
            {
                "amount": t.amount,
                "category": t.category,
                "description": t.description,
                "date": t.transaction_date.strftime("%b %d, %Y") if t.transaction_date else "N/A",
            }
            for t in expenses_sorted[:10]
        ],
        "top_income": [
            {
                "amount": t.amount,
                "category": t.category,
                "description": t.description,
                "date": t.transaction_date.strftime("%b %d, %Y") if t.transaction_date else "N/A",
            }
            for t in income_sorted[:5]
        ],
        # Averages
        "days_tracked": days_with_data,
        "daily_expense_avg": total_expenses / max(days_with_data, 1),
        "daily_income_avg": total_income / max(days_with_data, 1),
        # Trends
        "monthly_data": monthly_data,
        "earliest_date": earliest_date,
        "latest_date": latest_date,
        # Goals
        "goals": [
            {
                "name": g.name,
                "type": (g.goal_type.value if hasattr(g.goal_type, "value") else str(g.goal_type)),
                "target": float(g.target_amount),
                "current": float(g.current_amount),
                "target_date": g.target_date.isoformat() if g.target_date else None,
                "status": (g.status.value if hasattr(g.status, "value") else str(g.status)),
            }
            for g in goals
        ],
    }


def generate_ai_response(message: str, context: dict) -> str:
    """
    Generate AI response based on user message and comprehensive financial context.
    Handles a wide variety of financial questions.
    """
    if not context.get("has_data"):
        return context.get("message", "No financial data available yet.")

    message_lower = message.lower()

    # Helper to format category name
    def fmt_cat(cat):
        if not cat:
            return "Uncategorized"
        return str(cat).replace("_", " ").title()

    # ============================================
    # TOTAL / ALL TIME QUESTIONS
    # ============================================
    if any(
        phrase in message_lower
        for phrase in [
            "total",
            "all time",
            "ever",
            "overall",
            "lifetime",
            "till now",
            "so far",
            "to date",
        ]
    ):
        all_time = context["all_time"]

        if "income" in message_lower and "expense" not in message_lower:
            earliest = context["earliest_date"].strftime("%b %d, %Y")
            latest = context["latest_date"].strftime("%b %d, %Y")
            return (
                f"💵 **Your Total Income (All Time):**\n\n"
                f"Total Income: {format_currency(all_time['income'])}\n"
                f"Across {context['total_transactions']} transactions\n"
                f"Data from {earliest} to {latest}"
            )

        if "expense" in message_lower or "spend" in message_lower or "spent" in message_lower:
            response = "💸 **Your Total Expenses (All Time):**\n\n"
            response += f"Total Spent: {format_currency(all_time['expenses'])}\n\n"

            if context["all_categories"]:
                response += "**Top Categories:**\n"
                for cat, amount in context["all_categories"][:5]:
                    pct = (
                        float(amount) / float(all_time["expenses"]) * 100
                        if all_time["expenses"] > 0
                        else 0
                    )
                    response += f"• {fmt_cat(cat)}: {format_currency(amount)} ({pct:.1f}%)\n"

            return response

        # General total summary
        earliest = context["earliest_date"].strftime("%b %d, %Y")
        latest = context["latest_date"].strftime("%b %d, %Y")
        return (
            f"📊 **Your Financial Summary (All Time):**\n\n"
            f"• Total Income: {format_currency(all_time['income'])}\n"
            f"• Total Expenses: {format_currency(all_time['expenses'])}\n"
            f"• Net Balance: {format_currency(all_time['net'])}\n"
            f"• Transactions: {context['total_transactions']}\n"
            f"• Days Tracked: {context['days_tracked']}\n\n"
            f"📅 Data from {earliest} to {latest}"
        )

    # ============================================
    # THIS YEAR QUESTIONS
    # ============================================
    if any(
        phrase in message_lower
        for phrase in ["this year", "year to date", "ytd", str(datetime.now().year)]
    ):
        year = context["year"]
        response = f"📆 **{datetime.now().year} Financial Summary:**\n\n"
        response += f"• Income: {format_currency(year['income'])}\n"
        response += f"• Expenses: {format_currency(year['expenses'])}\n"
        response += f"• Net: {format_currency(year['net'])}\n\n"

        if context["year_categories"]:
            response += "**Top Spending Categories:**\n"
            for cat, amount in context["year_categories"][:5]:
                response += f"• {fmt_cat(cat)}: {format_currency(amount)}\n"

        return response

    # ============================================
    # LAST MONTH COMPARISON
    # ============================================
    if any(
        phrase in message_lower
        for phrase in ["last month", "previous month", "compare", "comparison"]
    ):
        month = context["month"]
        last_month = context["last_month"]

        response = "📊 **Month Comparison:**\n\n"
        response += f"**{context['month_name']}:**\n"
        response += f"• Income: {format_currency(month['income'])}\n"
        response += f"• Expenses: {format_currency(month['expenses'])}\n"
        response += f"• Net: {format_currency(month['net'])}\n\n"

        response += f"**{context['last_month_name']}:**\n"
        response += f"• Income: {format_currency(last_month['income'])}\n"
        response += f"• Expenses: {format_currency(last_month['expenses'])}\n"
        response += f"• Net: {format_currency(last_month['net'])}\n\n"

        # Calculate changes
        if last_month["expenses"] > 0:
            expense_change = (
                (month["expenses"] - last_month["expenses"]) / last_month["expenses"]
            ) * 100
            if expense_change > 0:
                response += f"⚠️ Expenses increased by {expense_change:.1f}% from last month\n"
            else:
                response += f"✅ Expenses decreased by {abs(expense_change):.1f}% from last month\n"

        return response

    # ============================================
    # THIS WEEK / LAST WEEK
    # ============================================
    if any(phrase in message_lower for phrase in ["this week", "week"]):
        week = context["week"]
        response = "📅 **This Week's Summary:**\n\n"
        response += f"• Income: {format_currency(week['income'])}\n"
        response += f"• Expenses: {format_currency(week['expenses'])}\n"
        response += f"• Net: {format_currency(week['net'])}\n"
        response += f"• Transactions: {context['week_transaction_count']}\n\n"

        if context["week_categories"]:
            response += "**Spending by Category:**\n"
            for cat, amount in context["week_categories"][:5]:
                response += f"• {fmt_cat(cat)}: {format_currency(amount)}\n"

        # Compare to last week
        last_week = context["last_week"]
        if last_week["expenses"] > 0:
            change = ((week["expenses"] - last_week["expenses"]) / last_week["expenses"]) * 100
            response += "\n📈 Compared to last week: "
            if change > 0:
                response += f"spending up {change:.1f}%"
            else:
                response += f"spending down {abs(change):.1f}%"

        return response

    # ============================================
    # TOP / LARGEST / BIGGEST TRANSACTIONS
    # ============================================
    if any(
        phrase in message_lower
        for phrase in ["top", "largest", "biggest", "highest", "most expensive"]
    ):
        if "income" in message_lower:
            response = "💰 **Your Largest Income Transactions:**\n\n"
            for i, t in enumerate(context["top_income"][:5], 1):
                desc = t["description"] or fmt_cat(t["category"])
                response += f"{i}. {format_currency(t['amount'])} - {desc}\n"
                response += f"   📅 {t['date']}\n"
            return response

        # Default to expenses
        response = "💸 **Your Largest Expenses:**\n\n"
        for i, t in enumerate(context["top_expenses"][:5], 1):
            desc = t["description"] or fmt_cat(t["category"])
            response += f"{i}. {format_currency(t['amount'])} - {desc}\n"
            response += f"   📅 {t['date']}\n"
        return response

    # ============================================
    # AVERAGE / DAILY SPENDING
    # ============================================
    if any(phrase in message_lower for phrase in ["average", "avg", "daily", "per day"]):
        daily_exp = context["daily_expense_avg"]
        daily_inc = context["daily_income_avg"]

        response = "📊 **Your Daily Averages:**\n\n"
        response += f"• Average Daily Spending: {format_currency(daily_exp)}\n"
        response += f"• Average Daily Income: {format_currency(daily_inc)}\n"
        response += f"• Based on {context['days_tracked']} days of data\n\n"

        # Project monthly
        response += "**Projected Monthly:**\n"
        response += f"• Monthly Expenses: ~{format_currency(daily_exp * 30)}\n"
        response += f"• Monthly Income: ~{format_currency(daily_inc * 30)}\n"

        return response

    # ============================================
    # CATEGORY-SPECIFIC QUESTIONS
    # ============================================
    # Check if user is asking about a specific category
    all_categories = {cat.lower(): cat for cat, _ in context.get("all_categories", [])}
    asked_category = None

    category_keywords = [
        "food",
        "dining",
        "groceries",
        "transport",
        "transportation",
        "shopping",
        "entertainment",
        "utilities",
        "health",
        "healthcare",
        "education",
        "rent",
        "housing",
        "subscription",
        "travel",
        "coffee",
        "drinks",
    ]

    for keyword in category_keywords:
        if keyword in message_lower:
            # Find matching category
            for cat_lower, cat_original in all_categories.items():
                if keyword in cat_lower or cat_lower in keyword:
                    asked_category = cat_original
                    break
            break

    if asked_category:
        # Find spending for this category across periods
        month_cat = next(
            (amt for cat, amt in context["month_categories_expense"] if cat == asked_category),
            Decimal(0),
        )
        all_cat = next(
            (amt for cat, amt in context["all_categories"] if cat == asked_category), Decimal(0)
        )

        response = f"🏷️ **{fmt_cat(asked_category)} Spending:**\n\n"
        response += f"• This Month: {format_currency(month_cat)}\n"
        response += f"• All Time: {format_currency(all_cat)}\n"

        total_exp = context["all_time"]["expenses"]
        if total_exp > 0:
            pct = float(all_cat) / float(total_exp) * 100
            response += f"• Percentage of Total: {pct:.1f}%\n"

        return response

    # ============================================
    # EXPENSE / SPENDING QUESTIONS (GENERAL)
    # ============================================
    if any(
        keyword in message_lower
        for keyword in ["spend", "spent", "spending", "expense", "expenses"]
    ):
        month = context["month"]

        response = f"📊 **Spending Summary for {context['month_name']}:**\n\n"
        response += f"• Total Expenses: {format_currency(month['expenses'])}\n"
        response += f"• Total Income: {format_currency(month['income'])}\n"

        if month["net"] >= 0:
            response += f"• Net Savings: +{format_currency(month['net'])} ✅\n\n"
        else:
            response += f"• Net Loss: {format_currency(month['net'])} ⚠️\n\n"

        if context["month_categories_expense"]:
            response += "**Spending by Category:**\n"
            for cat, amount in context["month_categories_expense"][:7]:
                pct = float(amount) / float(month["expenses"]) * 100 if month["expenses"] > 0 else 0
                response += f"• {fmt_cat(cat)}: {format_currency(amount)} ({pct:.1f}%)\n"

            if context["month_categories_expense"]:
                top_cat = fmt_cat(context["month_categories_expense"][0][0])
                response += f"\n💡 **Tip:** Your top spending category is {top_cat}."

        return response

    # ============================================
    # SAVINGS QUESTIONS
    # ============================================
    if any(keyword in message_lower for keyword in ["save", "saving", "savings", "saved"]):
        month = context["month"]
        net = month["net"]

        if net >= 0:
            response = f"🎉 **Great news!** This month you're saving {format_currency(net)}!\n\n"
            response += "**Your Savings Rate:**\n"
            if month["income"] > 0:
                rate = (float(net) / float(month["income"])) * 100
                response += f"• {rate:.1f}% of your income\n\n"

            response += "**Tips to save even more:**\n"
            if context["month_categories_expense"]:
                top_cat = fmt_cat(context["month_categories_expense"][0][0])
                response += f"1. Review your {top_cat} spending - it's your highest category\n"
            response += "2. Set up automatic transfers to savings\n"
            response += "3. Try the 50/30/20 budgeting rule\n"
        else:
            overspend = format_currency(abs(net))
            response = f"⚠️ This month you're spending more than earning by {overspend}.\n\n"
            response += "**How to turn this around:**\n"
            if context["month_categories_expense"]:
                top_cat, top_amt = context["month_categories_expense"][0]
                response += (
                    f"1. Your biggest expense is {fmt_cat(top_cat)} ({format_currency(top_amt)})\n"
                )
            response += "2. Track daily expenses for a week\n"
            response += "3. Find subscriptions to cancel\n"
            response += "4. Look for income opportunities\n"

        return response

    # ============================================
    # INCOME QUESTIONS
    # ============================================
    if any(
        keyword in message_lower for keyword in ["income", "earn", "earned", "salary", "revenue"]
    ):
        month = context["month"]

        response = f"💵 **Income for {context['month_name']}:**\n\n"
        response += f"• Total Income: {format_currency(month['income'])}\n"
        response += f"• Total Expenses: {format_currency(month['expenses'])}\n"
        response += f"• Remaining: {format_currency(month['net'])}\n\n"

        if context["month_categories_income"]:
            response += "**Income Sources:**\n"
            for cat, amount in context["month_categories_income"]:
                response += f"• {fmt_cat(cat)}: {format_currency(amount)}\n"

        return response

    # ============================================
    # GOAL QUESTIONS
    # ============================================
    if any(keyword in message_lower for keyword in ["goal", "goals", "target", "challenge"]):
        goals = context["goals"]

        if not goals:
            return (
                "🎯 **No Goals Set Yet!**\n\n"
                "Financial goals help you stay on track. Go to the Goals page to create:\n"
                "• **Savings Goals** - Save a target amount by a deadline\n"
                "• **Spending Limits** - Keep category spending under control\n\n"
                "Would you like tips on setting effective financial goals?"
            )

        response = "📋 **Your Financial Goals:**\n\n"
        for g in goals:
            emoji = "💰" if g["type"] == "savings" else "🚫"
            status_emoji = "✅" if g["status"] == "completed" else "⏳"

            response += f"{emoji} **{g['name']}** {status_emoji}\n"
            response += f"   Target: {format_currency(Decimal(g['target']))}\n"
            if g["category"]:
                response += f"   Category: {fmt_cat(g['category'])}\n"
            response += f"   Days Remaining: {g['days_remaining']}\n\n"

        return response

    # ============================================
    # BUDGET ADVICE
    # ============================================
    if any(keyword in message_lower for keyword in ["budget", "budgeting", "plan", "allocate"]):
        month = context["month"]
        income_val = float(month["income"]) if month["income"] else 0

        response = "📝 **Budget Recommendations (50/30/20 Rule):**\n\n"

        if income_val > 0:
            response += f"Based on your income of {format_currency(month['income'])}:\n\n"
            response += f"• **Needs (50%):** {format_currency(Decimal(income_val * 0.5))}\n"
            response += "  Housing, utilities, groceries, healthcare\n\n"
            response += f"• **Wants (30%):** {format_currency(Decimal(income_val * 0.3))}\n"
            response += "  Entertainment, dining out, shopping\n\n"
            response += f"• **Savings (20%):** {format_currency(Decimal(income_val * 0.2))}\n"
            response += "  Emergency fund, investments\n\n"

            # Compare to actual
            if context["month_categories_expense"]:
                response += "**Your Actual Spending:**\n"
                for cat, amount in context["month_categories_expense"][:3]:
                    response += f"• {fmt_cat(cat)}: {format_currency(amount)}\n"
        else:
            response += "Add income transactions to get personalized budget recommendations!"

        return response

    # ============================================
    # TREND QUESTIONS
    # ============================================
    if any(keyword in message_lower for keyword in ["trend", "pattern", "history", "over time"]):
        monthly = context["monthly_data"]

        if len(monthly) < 2:
            return "📈 Need at least 2 months of data to show trends. Keep tracking!"

        response = "📈 **Monthly Trends:**\n\n"

        # Sort by date and show last 6 months
        sorted_months = sorted(monthly.items(), key=lambda x: x[0], reverse=True)[:6]

        for month_key, data in sorted_months:
            year, mon = month_key.split("-")
            month_name = datetime(int(year), int(mon), 1).strftime("%b %Y")
            response += f"**{month_name}:**\n"
            response += f"  Income: {format_currency(data['income'])} | "
            response += f"Expenses: {format_currency(data['expenses'])}\n"

        # Calculate trend
        if len(sorted_months) >= 2:
            recent = sorted_months[0][1]["expenses"]
            previous = sorted_months[1][1]["expenses"]
            if previous > 0:
                change = ((recent - previous) / previous) * 100
                if change > 10:
                    response += f"\n⚠️ Expenses trending up by {change:.1f}%"
                elif change < -10:
                    response += f"\n✅ Expenses trending down by {abs(change):.1f}%"

        return response

    # ============================================
    # ANOMALY DETECTION
    # ============================================
    if any(
        phrase in message_lower
        for phrase in [
            "anomal",
            "unusual",
            "weird",
            "strange",
            "suspicious",
            "spike",
            "unexpected",
            "surprise",
            "odd",
            "abnormal",
        ]
    ):
        anomalies = detect_anomalies(context)

        if not anomalies["has_anomalies"]:
            return (
                "✅ **No Unusual Activity Detected**\n\n"
                "Your spending patterns look normal! No significant anomalies found.\n\n"
                "I check for:\n"
                "• Large transactions (3x above your daily average)\n"
                "• Category spikes (50%+ increase from last month)\n"
                "• New spending categories\n"
                "• Monthly spending surges"
            )

        response = "🔍 **Anomaly Detection Report:**\n\n"

        # Large transactions
        if anomalies["large_transactions"]:
            response += "**💰 Large Transactions:**\n"
            for t in anomalies["large_transactions"][:3]:
                cat_name = fmt_cat(t["category"])
                response += (
                    f"• {format_currency(t['amount'])} on {cat_name}\n"
                    f"  ({t['multiple']}x your daily average)\n"
                )
            response += "\n"

        # Category spikes
        if anomalies["category_spikes"]:
            response += "**📈 Category Spikes:**\n"
            for spike in anomalies["category_spikes"][:3]:
                cat_name = fmt_cat(spike["category"])
                response += (
                    f"• {cat_name}: +{spike['change_pct']}% "
                    f"({format_currency(spike['previous'])} → "
                    f"{format_currency(spike['current'])})\n"
                )
            response += "\n"

        # New categories
        if anomalies["new_categories"]:
            response += "**🆕 New Categories This Month:**\n"
            for cat in anomalies["new_categories"][:3]:
                cat_name = fmt_cat(cat["category"])
                response += f"• {cat_name}: {format_currency(cat['amount'])}\n"
            response += "\n"

        # Monthly spike
        for freq in anomalies["frequency_anomalies"]:
            if freq["type"] == "monthly_spike":
                response += (
                    f"**⚠️ Monthly Spending Spike:** +{freq['change_pct']}%\n"
                    f"This month: {format_currency(freq['current'])} vs "
                    f"Last month: {format_currency(freq['previous'])}\n"
                )

        return response

    # ============================================
    # FORECAST / FUTURE INSIGHTS
    # ============================================
    if any(
        phrase in message_lower
        for phrase in [
            "forecast",
            "predict",
            "projection",
            "end of month",
            "future",
            "will i",
            "estimate",
            "outlook",
        ]
    ):
        forecast = generate_forecast(context)
        eom = forecast["end_of_month"]

        response = "🔮 **Financial Forecast:**\n\n"

        # End of month projection
        response += f"**📅 End of Month Projection ({eom['days_remaining']} days left):**\n"
        response += f"• Projected Expenses: {format_currency(eom['projected_expenses'])}\n"
        response += f"• Projected Income: {format_currency(eom['projected_income'])}\n"
        response += f"• Projected Net: {format_currency(eom['projected_net'])}\n"
        daily_rate = format_currency(eom["current_daily_expense_rate"])
        response += f"• Daily Spending Rate: {daily_rate}\n\n"

        # Budget status
        status_emoji = {
            "excellent": "🌟",
            "good": "👍",
            "fair": "⚠️",
            "over_budget": "🚨",
        }
        status_text = {
            "excellent": "Excellent! Saving 20%+",
            "good": "Good! Saving 10-20%",
            "fair": "Fair - Room to improve",
            "over_budget": "Over Budget - Action needed!",
        }
        status = forecast["budget_status"]
        response += f"**Budget Status:** {status_emoji.get(status, '📊')} "
        response += f"{status_text.get(status, 'Unknown')}\n\n"

        # Spending trend
        trend_emoji = {
            "increasing": "📈",
            "slightly_increasing": "↗️",
            "stable": "➡️",
            "slightly_decreasing": "↘️",
            "decreasing": "📉",
        }
        trend_text = {
            "increasing": "Increasing (watch out!)",
            "slightly_increasing": "Slightly increasing",
            "stable": "Stable",
            "slightly_decreasing": "Slightly decreasing (good!)",
            "decreasing": "Decreasing (great!)",
        }
        trend = forecast["spending_trend"]
        response += f"**Spending Trend:** {trend_emoji.get(trend, '📊')} "
        response += f"{trend_text.get(trend, trend)}\n\n"

        # Goal projections
        if forecast["savings_projection"]:
            response += "**🎯 Goal Timeline:**\n"
            for proj in forecast["savings_projection"]:
                status_icon = "✅" if proj["on_track"] else "⚠️"
                months = proj["months_to_goal"]
                if months < 1:
                    time_str = "Less than a month!"
                elif months < 12:
                    time_str = f"~{months:.0f} month(s)"
                else:
                    years = months / 12
                    time_str = f"~{years:.1f} year(s)"
                response += (
                    f"• {proj['goal_name']}: {status_icon} {time_str} "
                    f"({format_currency(proj['remaining'])} to go)\n"
                )
            response += "\n"

        # Recommendations
        if forecast["recommendations"]:
            response += "**💡 Insights:**\n"
            for rec in forecast["recommendations"]:
                response += f"{rec}\n"

        return response

    # ============================================
    # FINANCIAL HEALTH / SCORE
    # ============================================
    if any(
        phrase in message_lower
        for phrase in ["health", "score", "how am i doing", "financial health"]
    ):
        month = context["month"]

        response = "🏥 **Your Financial Health Check:**\n\n"

        # Calculate savings rate
        savings_rate = 0
        if month["income"] > 0:
            savings_rate = float(month["net"]) / float(month["income"]) * 100

        # Score calculation
        score = 50  # Base score

        if savings_rate >= 20:
            score += 25
            response += "✅ Excellent savings rate (20%+)\n"
        elif savings_rate >= 10:
            score += 15
            response += "👍 Good savings rate (10-20%)\n"
        elif savings_rate >= 0:
            score += 5
            response += "⚠️ Breaking even - try to save more\n"
        else:
            response += "❌ Spending exceeds income\n"

        # Check if tracking consistently
        if context["month_transaction_count"] >= 10:
            score += 15
            response += "✅ Good transaction tracking\n"
        else:
            response += "⚠️ Track more transactions for better insights\n"

        # Check goals
        if context["goals"]:
            score += 10
            response += f"✅ {len(context['goals'])} financial goal(s) set\n"
        else:
            response += "⚠️ No financial goals set\n"

        response += f"\n**Health Score: {min(score, 100)}/100**\n"

        if score >= 80:
            response += "🌟 You're doing great!"
        elif score >= 60:
            response += "👍 Good progress, keep improving!"
        else:
            response += "💪 Room for improvement - let's work on it!"

        return response

    # ============================================
    # HELP / WHAT CAN YOU DO
    # ============================================
    if any(
        keyword in message_lower for keyword in ["help", "what can you", "commands", "how to", "?"]
    ):
        return (
            "🤖 **I'm your AI Financial Coach!** Here's what you can ask:\n\n"
            "**📊 Spending & Income:**\n"
            '• "What are my total expenses?"\n'
            '• "How much did I spend this month?"\n'
            '• "Show my spending by category"\n\n'
            "**📈 Comparisons & Trends:**\n"
            '• "Compare to last month"\n'
            '• "What are my spending trends?"\n\n'
            "**🔮 Forecasting & Insights:**\n"
            '• "What\'s my forecast for this month?"\n'
            '• "Predict my end of month balance"\n'
            '• "What\'s my financial outlook?"\n\n'
            "**🔍 Anomaly Detection:**\n"
            '• "Any unusual spending?"\n'
            '• "Detect anomalies in my spending"\n'
            '• "Any suspicious transactions?"\n\n'
            "**💰 Analysis & Health:**\n"
            '• "What\'s my financial health score?"\n'
            '• "What are my largest expenses?"\n'
            '• "Give me budgeting advice"\n\n'
            "**🎯 Goals:**\n"
            '• "What are my goals?"\n'
            '• "How long to reach my goals?"\n'
        )

    # ============================================
    # NO MATCH - Return None to trigger AI fallback
    # ============================================
    return None  # type: ignore[return-value]


def build_ai_prompt(message: str, context: dict) -> str:
    """Build a privacy-safe prompt for the AI model with financial context only."""

    # SECURITY: Sanitize user message before sending to AI
    safe_message = sanitize_for_ai(message)

    # Helper to format category name
    def fmt_cat(cat):
        if not cat:
            return "Uncategorized"
        return str(cat).replace("_", " ").title()

    month = context.get("month", {})
    all_time = context.get("all_time", {})

    # Build financial summary for the AI (NO PII - just financial data)
    financial_summary = f"""
USER'S FINANCIAL DATA (Anonymous - no personal identifiers):

Current Month ({context.get('month_name', 'This Month')}):
- Income: ${float(month.get('income', 0)):,.2f}
- Expenses: ${float(month.get('expenses', 0)):,.2f}
- Net Savings: ${float(month.get('net', 0)):,.2f}
- Transaction Count: {context.get('month_transaction_count', 0)}

All Time Summary:
- Total Income: ${float(all_time.get('income', 0)):,.2f}
- Total Expenses: ${float(all_time.get('expenses', 0)):,.2f}
- Net Balance: ${float(all_time.get('net', 0)):,.2f}
- Total Transactions: {context.get('total_transactions', 0)}
- Days Tracked: {context.get('days_tracked', 0)}

Top Spending Categories This Month:
"""

    for cat, amount in context.get("month_categories_expense", [])[:5]:
        financial_summary += f"- {fmt_cat(cat)}: ${float(amount):,.2f}\n"

    if context.get("goals"):
        financial_summary += "\nFinancial Goals:\n"
        for g in context["goals"][:3]:
            target_date = g.get("target_date", "No deadline")
            financial_summary += f"- {g['name']}: Target ${g['target']:,.2f}"
            if target_date and target_date != "No deadline":
                financial_summary += f", Due: {target_date}\n"
            else:
                financial_summary += "\n"

    # Daily averages
    daily_exp = context.get("daily_expense_avg", Decimal(0))
    financial_summary += f"\nDaily Average Spending: ${float(daily_exp):,.2f}"

    # SECURITY-FOCUSED system prompt
    system_prompt = (
        "You are a friendly AI Financial Coach. You help users understand "
        "their finances and provide budgeting advice.\n\n"
        "IMPORTANT RULES:\n"
        "1. NEVER ask for or reference personal information (names, emails, "
        "addresses, SSN, account numbers, passwords)\n"
        "2. Only discuss the financial DATA provided below\n"
        "3. If asked about personal info, politely redirect to finances\n"
        "4. Be encouraging and supportive, not judgmental\n"
        "5. Provide specific, actionable advice based on their data\n"
        "6. Use emojis sparingly to make responses engaging\n"
        "7. Keep responses concise (2-3 paragraphs max)\n"
        "8. Reference their actual numbers when relevant\n"
        "9. Suggest follow-up questions about finances\n"
        "10. If asked about non-financial topics, stay focused on finances"
    )

    return f"{system_prompt}\n\n{financial_summary}\n\nUser Question: {safe_message}"


async def call_ai_model(prompt: str) -> Optional[str]:
    """Call OpenAI-compatible API for AI response."""
    if not settings.openai_api_key:
        return None

    try:
        base_url = settings.openai_base_url or "https://api.openai.com/v1"

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.openai_model,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 500,
                    "temperature": 0.7,
                },
            )

            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"]
            else:
                print(f"AI API Error: {response.status_code} - {response.text}")
                return None

    except Exception as e:
        print(f"AI API Exception: {str(e)}")
        return None


def get_default_response(context: dict) -> str:
    """Get default response when no pattern matches and AI is unavailable."""
    month = context["month"]

    return (
        f"📊 **Quick Summary for {context['month_name']}:**\n\n"
        f"• Income: {format_currency(month['income'])}\n"
        f"• Expenses: {format_currency(month['expenses'])}\n"
        f"• Net: {format_currency(month['net'])}\n\n"
        "Ask me anything about your finances! Try:\n"
        '• "What are my total expenses?"\n'
        '• "Compare to last month"\n'
        '• "How can I save more?"\n'
        '• "What\'s my financial health?"\n\n'
        "Type **help** to see all available commands."
    )


@router.post("/chat", response_model=ChatResponse)
async def chat_with_coach(
    request: ChatRequest,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Chat with the AI financial coach.

    Security features:
    - Input validation and sanitization (via Pydantic)
    - No PII sent to external AI models
    - Blocked topics detection
    - User ID only (no names/emails) used for data retrieval
    """
    # Note: Validation happens in Pydantic model (blocked patterns, length)

    try:
        # Detect user intent for smarter responses
        intent = detect_intent(request.message)

        # Handle greetings with personality
        if intent == Intent.GREETING:
            return ChatResponse(
                response=random.choice(GREETINGS),
                intent=intent.value,
                suggestions=["Show my summary", "What did I spend?", "Give me advice"],
            )

        # Handle thanks
        if intent == Intent.THANKS:
            return ChatResponse(
                response=random.choice(THANKS_RESPONSES),
                intent=intent.value,
                suggestions=["Show summary", "Any more advice?", "What else can you do?"],
            )

        # Get comprehensive financial context (uses user_id only, no PII)
        context = await get_comprehensive_financial_context(current_user.id, db)

        if not context.get("has_data"):
            return ChatResponse(
                response=context.get("message", "No financial data available yet."),
                intent=intent.value,
                suggestions=[
                    "Add your first transaction",
                    "Import from CSV",
                    "How does this work?",
                ],
            )

        # Try rule-based response first (fast, no external calls)
        response = generate_ai_response(request.message, context)

        # If no rule matched, try AI model for complex questions
        if response is None:
            # Build privacy-safe prompt (no PII sent to AI)
            prompt = build_ai_prompt(request.message, context)

            # Call AI model
            ai_response = await call_ai_model(prompt)

            if ai_response:
                response = ai_response
            else:
                # Fall back to default response if AI is unavailable
                response = get_default_response(context)

        # Add encouragement randomly (20% chance)
        if random.random() < 0.2 and intent not in [Intent.GREETING, Intent.THANKS]:
            response += f"\n\n{random.choice(ENCOURAGEMENTS)}"

        # Get contextual follow-up suggestions
        suggestions = get_follow_up_suggestions(intent, context)

        return ChatResponse(
            response=response,
            intent=intent.value,
            suggestions=suggestions,
        )

    except ValueError as e:
        # Validation errors (blocked patterns, etc.)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        # Log the error for debugging (no user PII in logs)
        print(f"AI Coach Error: {type(e).__name__}")
        return ChatResponse(
            response="I'm having trouble right now. Please try again! 🔄",
            intent="error",
            suggestions=["Show summary", "Help", "What can you do?"],
        )
