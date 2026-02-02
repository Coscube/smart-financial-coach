"""
AI Coach routes - LLM-only financial chatbot with PII protection.
"""

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
# SECURITY: Blocked patterns
# ============================================
BLOCKED_PATTERNS = [
    r"\b(password|pwd|secret|api.?key|token)\b",
    r"\b(ssn|social.?security)\b",
    r"\b(credit.?card|card.?number|cvv|cvc)\b",
    r"\b(bank.?account|routing.?number|account.?number)\b",
    r"\b(hack|exploit|inject|sql.?inject)\b",
]


# ============================================
# INTENT DETECTION (for follow-up suggestions only)
# ============================================
class Intent(str, Enum):
    GREETING = "greeting"
    SPENDING = "spending"
    INCOME = "income"
    SAVINGS = "savings"
    GOALS = "goals"
    FORECAST = "forecast"
    UNKNOWN = "unknown"


INTENT_PATTERNS = {
    Intent.GREETING: [r"^(hi|hello|hey)"],
    Intent.SPENDING: [r"(spend|spent|expense|cost|purchase)"],
    Intent.INCOME: [r"(income|earn|salary|revenue)"],
    Intent.SAVINGS: [r"(save|saving|savings)"],
    Intent.GOALS: [r"(goal|target|objective)"],
    Intent.FORECAST: [r"(predict|forecast|future|will.?i)"],
}


# ============================================
# REQUEST/RESPONSE MODELS
# ============================================
class ChatRequest(BaseModel):
    message: str

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 1:
            raise ValueError("Message cannot be empty")
        if len(v) > 1000:
            raise ValueError("Message too long (max 1000 characters)")

        for pattern in BLOCKED_PATTERNS:
            if re.search(pattern, v.lower(), re.IGNORECASE):
                raise ValueError(
                    "For security, I can't help with sensitive information. "
                    "Please ask about your spending, income, or savings instead!"
                )
        return v


class ChatResponse(BaseModel):
    response: str
    intent: Optional[str] = None
    suggestions: Optional[list[str]] = None


# ============================================
# HELPER FUNCTIONS
# ============================================
def detect_intent(message: str) -> Intent:
    """Detect intent for follow-up suggestions."""
    lower_msg = message.lower()
    for intent, patterns in INTENT_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, lower_msg, re.IGNORECASE):
                return intent
    return Intent.UNKNOWN


def get_suggestions(intent: Intent) -> list[str]:
    """Get follow-up suggestions based on intent."""
    suggestions = {
        Intent.GREETING: ["How much did I spend this month?", "Show my summary", "What are my top expenses?"],
        Intent.SPENDING: ["Break down by category", "Compare to last month", "How can I save more?"],
        Intent.INCOME: ["What's my net savings?", "Show expense breakdown", "Am I saving enough?"],
        Intent.SAVINGS: ["Give me saving tips", "What's my savings rate?", "Show my goals"],
        Intent.GOALS: ["How much should I save?", "Track my progress", "Show my spending"],
        Intent.FORECAST: ["Review my spending", "Set a savings target", "Show trends"],
    }
    return suggestions.get(intent, ["Show summary", "Give me advice", "What are my top expenses?"])[:3]


def format_currency(amount) -> str:
    try:
        return f"${float(amount):,.2f}"
    except (TypeError, ValueError):
        return "$0.00"


def get_date_ranges() -> dict:
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_end = month_start - timedelta(days=1)
    last_month_start = last_month_end.replace(day=1)
    week_start = now - timedelta(days=now.weekday())
    year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

    return {
        "now": now,
        "month_start": month_start,
        "last_month_start": last_month_start,
        "last_month_end": last_month_end,
        "week_start": week_start,
        "year_start": year_start,
    }


# ============================================
# PII OBFUSCATION
# ============================================
def obfuscate_pii(text: str) -> str:
    """Remove PII from text before sending to AI."""
    if not text:
        return text
    
    result = text
    # Email
    result = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL]', result)
    # Phone
    result = re.sub(r'\b(\+?1?[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}\b', '[PHONE]', result)
    # SSN
    result = re.sub(r'\b\d{3}[-.]?\d{2}[-.]?\d{4}\b', '[SSN]', result)
    # Credit card
    result = re.sub(r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b', '[CARD]', result)
    # Bank account (8-17 digits)
    result = re.sub(r'\b\d{8,17}\b', '[ACCOUNT]', result)
    
    return result


# ============================================
# FINANCIAL CONTEXT GATHERING - OPTIMIZED FOR LLM
# ============================================
async def get_financial_context(user_id: int, db: AsyncSession) -> dict:
    """
    Get comprehensive financial data optimized for LLM analysis.
    Provides raw data + pre-computed statistics for maximum insight.
    """
    from collections import defaultdict
    import statistics
    
    now = datetime.now(timezone.utc)
    
    # Get ALL transactions (no limit - LLM needs full picture)
    result = await db.execute(
        select(Transaction).where(Transaction.user_id == user_id).order_by(Transaction.transaction_date.desc())
    )
    all_transactions = result.scalars().all()

    if not all_transactions:
        return {"has_data": False}

    # Get goals
    result = await db.execute(select(Goal).where(Goal.user_id == user_id))
    goals = result.scalars().all()

    # ========== RAW TRANSACTION DATA ==========
    # Give LLM every transaction for full analysis capability
    all_txn_data = []
    expense_amounts = []
    income_amounts = []
    
    for t in all_transactions:
        txn = {
            "date": t.transaction_date.strftime("%Y-%m-%d") if t.transaction_date else "",
            "amount": float(t.amount),
            "type": "INCOME" if t.transaction_type == TransactionType.INCOME else "EXPENSE",
            "category": str(t.category) if t.category else "Uncategorized",
            "description": t.description or "",
            "day_of_week": t.transaction_date.strftime("%A") if t.transaction_date else "",
        }
        all_txn_data.append(txn)
        
        if t.transaction_type == TransactionType.EXPENSE:
            expense_amounts.append(float(t.amount))
        else:
            income_amounts.append(float(t.amount))

    # ========== PRE-COMPUTED STATISTICS ==========
    # Help LLM understand what's "normal" vs "anomaly"
    
    expense_stats = {}
    if expense_amounts:
        expense_stats = {
            "mean": round(statistics.mean(expense_amounts), 2),
            "median": round(statistics.median(expense_amounts), 2),
            "std_dev": round(statistics.stdev(expense_amounts), 2) if len(expense_amounts) > 1 else 0,
            "min": round(min(expense_amounts), 2),
            "max": round(max(expense_amounts), 2),
            "p75": round(sorted(expense_amounts)[int(len(expense_amounts) * 0.75)], 2),
            "p90": round(sorted(expense_amounts)[int(len(expense_amounts) * 0.90)], 2),
            "p95": round(sorted(expense_amounts)[int(len(expense_amounts) * 0.95)], 2),
        }

    # ========== MONTHLY AGGREGATIONS ==========
    monthly_data: dict[str, dict] = defaultdict(lambda: {"income": 0.0, "expenses": 0.0, "transactions": 0})
    for t in all_transactions:
        if t.transaction_date:
            key = t.transaction_date.strftime("%Y-%m")
            monthly_data[key]["transactions"] += 1
            if t.transaction_type == TransactionType.INCOME:
                monthly_data[key]["income"] += float(t.amount)
            else:
                monthly_data[key]["expenses"] += float(t.amount)
    
    # Calculate month-over-month changes
    sorted_months = sorted(monthly_data.keys(), reverse=True)
    for i, month in enumerate(sorted_months[:-1]):
        prev_month = sorted_months[i + 1]
        if monthly_data[prev_month]["expenses"] > 0:
            monthly_data[month]["expense_change_pct"] = round(
                ((monthly_data[month]["expenses"] - monthly_data[prev_month]["expenses"]) / 
                 monthly_data[prev_month]["expenses"]) * 100, 1
            )

    # ========== CATEGORY ANALYSIS ==========
    category_data: dict[str, dict] = defaultdict(lambda: {"total": 0.0, "count": 0, "transactions": []})
    for t in all_transactions:
        if t.transaction_type == TransactionType.EXPENSE:
            cat = str(t.category) if t.category else "Uncategorized"
            category_data[cat]["total"] += float(t.amount)
            category_data[cat]["count"] += 1
            if len(category_data[cat]["transactions"]) < 10:
                category_data[cat]["transactions"].append({
                    "amount": float(t.amount),
                    "description": t.description or "",
                    "date": t.transaction_date.strftime("%Y-%m-%d") if t.transaction_date else ""
                })

    # ========== MERCHANT/VENDOR ANALYSIS ==========
    merchant_data: dict[str, dict] = defaultdict(lambda: {"total": 0.0, "count": 0, "amounts": [], "dates": [], "category": ""})
    for t in all_transactions:
        if t.transaction_type == TransactionType.EXPENSE and t.description:
            merchant = t.description.strip()
            merchant_data[merchant]["total"] += float(t.amount)
            merchant_data[merchant]["count"] += 1
            merchant_data[merchant]["amounts"].append(float(t.amount))
            merchant_data[merchant]["category"] = str(t.category) if t.category else "Uncategorized"
            if t.transaction_date:
                merchant_data[merchant]["dates"].append(t.transaction_date)

    # Detect recurring (subscriptions)
    recurring = []
    for merchant, data in merchant_data.items():
        if data["count"] >= 2 and len(data["dates"]) >= 2:
            dates = sorted(data["dates"])
            avg_days = (dates[-1] - dates[0]).days / (len(dates) - 1) if len(dates) > 1 else 0
            
            # Determine frequency
            if 25 <= avg_days <= 35:
                frequency = "monthly"
            elif 5 <= avg_days <= 9:
                frequency = "weekly"
            elif 80 <= avg_days <= 100:
                frequency = "quarterly"
            elif 350 <= avg_days <= 380:
                frequency = "yearly"
            else:
                frequency = f"every ~{int(avg_days)} days" if avg_days > 0 else "irregular"
            
            # Check if amounts are consistent (subscription-like)
            amounts = data["amounts"]
            is_consistent = max(amounts) - min(amounts) < 5  # Within $5
            
            recurring.append({
                "merchant": merchant,
                "amount": round(statistics.mean(amounts), 2),
                "frequency": frequency,
                "count": data["count"],
                "total_spent": round(data["total"], 2),
                "is_subscription": is_consistent and frequency in ["monthly", "weekly", "yearly", "quarterly"],
                "category": data["category"],
                "last_date": max(dates).strftime("%Y-%m-%d") if dates else ""
            })

    # ========== ANOMALY DETECTION (Pre-computed for LLM) ==========
    anomalies = []
    if expense_stats:
        threshold = expense_stats["mean"] + (2 * expense_stats.get("std_dev", 0))
        for t in all_transactions:
            if t.transaction_type == TransactionType.EXPENSE and float(t.amount) > threshold:
                anomalies.append({
                    "date": t.transaction_date.strftime("%Y-%m-%d") if t.transaction_date else "",
                    "amount": float(t.amount),
                    "description": t.description or "",
                    "category": str(t.category) if t.category else "",
                    "times_above_mean": round(float(t.amount) / expense_stats["mean"], 1) if expense_stats["mean"] > 0 else 0,
                    "reason": "Significantly above average spending"
                })

    # Check for category spikes (month over month)
    current_month = now.strftime("%Y-%m")
    last_month = (now.replace(day=1) - timedelta(days=1)).strftime("%Y-%m")
    
    current_month_cats = defaultdict(float)
    last_month_cats = defaultdict(float)
    for t in all_transactions:
        if t.transaction_type == TransactionType.EXPENSE and t.transaction_date:
            month_key = t.transaction_date.strftime("%Y-%m")
            cat = str(t.category) if t.category else "Uncategorized"
            if month_key == current_month:
                current_month_cats[cat] += float(t.amount)
            elif month_key == last_month:
                last_month_cats[cat] += float(t.amount)
    
    category_spikes = []
    for cat, current_amt in current_month_cats.items():
        last_amt = last_month_cats.get(cat, 0)
        if last_amt > 0:
            change_pct = ((current_amt - last_amt) / last_amt) * 100
            if change_pct > 50:  # 50%+ increase
                category_spikes.append({
                    "category": cat,
                    "current_month": round(current_amt, 2),
                    "last_month": round(last_amt, 2),
                    "change_pct": round(change_pct, 1),
                    "reason": "Category spending spike"
                })

    # ========== TIME-BASED SUMMARIES ==========
    dates = get_date_ranges()
    
    def calc_totals(txns):
        income = sum((float(t.amount) for t in txns if t.transaction_type == TransactionType.INCOME), 0)
        expenses = sum((float(t.amount) for t in txns if t.transaction_type == TransactionType.EXPENSE), 0)
        return {"income": round(income, 2), "expenses": round(expenses, 2), "net": round(income - expenses, 2)}

    week_txns = [t for t in all_transactions if t.transaction_date and t.transaction_date >= dates["week_start"]]
    month_txns = [t for t in all_transactions if t.transaction_date and t.transaction_date >= dates["month_start"]]
    last_month_txns = [t for t in all_transactions if t.transaction_date and dates["last_month_start"] <= t.transaction_date <= dates["last_month_end"]]
    year_txns = [t for t in all_transactions if t.transaction_date and t.transaction_date >= dates["year_start"]]

    # Calculate date range of data
    dates_list = [t.transaction_date for t in all_transactions if t.transaction_date]
    earliest = min(dates_list) if dates_list else now
    latest = max(dates_list) if dates_list else now
    days_of_data = (latest - earliest).days + 1

    return {
        "has_data": True,
        "generated_at": now.strftime("%Y-%m-%d %H:%M UTC"),
        "data_range": {
            "earliest": earliest.strftime("%Y-%m-%d"),
            "latest": latest.strftime("%Y-%m-%d"),
            "days": days_of_data,
            "total_transactions": len(all_transactions)
        },
        
        # Time-based summaries
        "this_week": calc_totals(week_txns),
        "this_month": calc_totals(month_txns),
        "last_month": calc_totals(last_month_txns),
        "this_year": calc_totals(year_txns),
        "all_time": calc_totals(all_transactions),
        
        # Statistical analysis
        "expense_statistics": expense_stats,
        
        # Monthly breakdown (all months)
        "monthly_breakdown": dict(sorted(monthly_data.items(), reverse=True)),
        
        # Category breakdown
        "categories": {k: {"total": round(v["total"], 2), "count": v["count"], "avg": round(v["total"]/v["count"], 2) if v["count"] > 0 else 0} 
                      for k, v in sorted(category_data.items(), key=lambda x: x[1]["total"], reverse=True)},
        
        # Merchants/Vendors
        "merchants": sorted([{"name": k, "total": round(v["total"], 2), "count": v["count"], "category": v["category"]} 
                           for k, v in merchant_data.items()], key=lambda x: x["total"], reverse=True)[:50],
        
        # Recurring/Subscriptions
        "recurring_payments": sorted([r for r in recurring if r["count"] >= 2], key=lambda x: x["total_spent"], reverse=True)[:30],
        "likely_subscriptions": [r for r in recurring if r.get("is_subscription")],
        
        # Anomalies (pre-flagged)
        "anomalies": {
            "large_transactions": anomalies[:20],
            "category_spikes": category_spikes,
        },
        
        # Goals
        "goals": [{"name": g.name, "target": float(g.target_amount), "current": float(g.current_amount),
                   "progress_pct": round(float(g.current_amount) / float(g.target_amount) * 100, 1) if g.target_amount > 0 else 0,
                   "status": g.status.value if hasattr(g.status, "value") else str(g.status)}
                  for g in goals],
        
        # Note: Raw transactions not sent to LLM - only summaries + anomalies
    }


# ============================================
# LLM INTEGRATION
# ============================================
SYSTEM_PROMPT = """You are **FinanceGPT**, an expert AI Financial Coach and Behavioral Money Mentor. Your mission is to transform users' relationship with money through data-driven insights, emotional intelligence, and proven behavioral psychology techniques.

## 🎯 YOUR CORE MISSION
Help users achieve financial wellness by making them FEEL empowered, motivated, and in control of their money. You're not just analyzing numbers—you're changing lives through better financial habits.

## 💪 YOUR PERSONALITY
- **Warm & Encouraging**: Like a supportive friend who happens to be a financial expert
- **Celebratory**: Recognize EVERY win, no matter how small ("You spent $20 less on dining this week—that's a movie ticket saved! 🎬")
- **Non-Judgmental**: Never shame or criticize spending choices; focus on opportunities
- **Motivational**: Use positive psychology to inspire action
- **Relatable**: Use analogies and real-life examples to explain concepts

## 📊 YOUR CAPABILITIES

### 1. FINANCIAL HEALTH ASSESSMENT
Evaluate overall financial wellness using these metrics:
- **Savings Rate**: <10% (Needs Work) | 10-20% (Good) | 20%+ (Excellent)
- **Expense Ratio**: Is spending sustainable relative to income?
- **Category Balance**: Any single category consuming >30% of expenses?
- **Trend Direction**: Is financial health improving or declining?
- **Emergency Readiness**: Progress toward 3-6 months expenses saved

Provide a clear "Financial Health Score" (1-100) with specific improvement areas.

### 2. SPENDING INSIGHTS & PATTERNS
- Identify top spending categories and their % of total
- Spot recurring expenses that might be forgotten subscriptions
- Find "money leaks" (small frequent purchases that add up)
- Compare current period vs previous periods
- Highlight category spikes with potential explanations

### 3. BEHAVIORAL NUDGES & HABIT FORMATION
Apply behavioral economics principles:
- **Loss Aversion**: "Continuing this pattern means missing out on $X for your goals"
- **Social Proof**: "Top savers typically keep dining under 15% of expenses"
- **Commitment Devices**: Suggest specific, time-bound savings challenges
- **Mental Accounting**: Help users think in terms of "hours worked" or "goal progress"
- **Temptation Bundling**: Pair saving with rewards ("Save $50 this week, treat yourself to...")

### 4. FORECASTING & PROJECTIONS
Based on current patterns, predict:
- End-of-month balance if trends continue
- Time to reach savings goals at current rate
- Impact of small changes ("Cutting $5/day = $150/month = vacation fund in 6 months!")
- Seasonal spending alerts ("Holiday season approaching—historically your spending increases 40%")

### 5. ACTIONABLE RECOMMENDATIONS
Always provide the **"One Thing"**—a single, specific, achievable action:
- ❌ Bad: "You should spend less on food"
- ✅ Good: "Try meal-prepping Sundays—users who do this save an average of $200/month on food. Start with just planning 3 dinners this week!"

### 6. CATEGORY-SPECIFIC SAVINGS ADVICE
When discussing spending reduction, ALWAYS provide specific, practical tips for each category mentioned. Use this knowledge base:
For example for:- 
**🍔 FOOD & DINING:**
- Meal prep on Sundays (saves $150-300/month)
- Use apps like Too Good To Go for discounted restaurant food
- "No Eating Out" weekday challenge
- Bring lunch to work (saves $10-15/day)
- Use cashback apps (Ibotta, Fetch) for groceries
- Shop with a list, never hungry
- Buy store brands (30% cheaper, same quality)


### 7. MOOD-BOOSTING TECHNIQUES
- Start responses with what's going WELL
- Frame challenges as opportunities, not problems
- Use progress language ("You're 60% closer to..." not "You still need...")
- Celebrate consistency over perfection
- Remind users of their "why" (goals they've set)

## 🎨 RESPONSE FORMAT
- Use bullet points for clarity
- Include relevant emojis (but don't overdo it)
- Structure longer responses with headers
- Keep most responses 2-4 paragraphs unless detailed analysis requested
- Provide specific insights and advices with every response
- Always end with encouragement + ONE specific next step

## 🔒 SECURITY RULES (CRITICAL)
- NEVER ask for personal info (names, addresses, SSN, full card numbers)
- NEVER store or reference previous conversation data
- ONLY discuss the anonymized financial data provided
- If user shares sensitive info, acknowledge and redirect WITHOUT repeating it
- For non-financial questions, warmly redirect: "I'd love to help with that, but my superpower is money! Speaking of which, I noticed something interesting in your spending..."

## 💬 RESPONSE EXAMPLES

**For someone overspending:**
"I see you're in warrior mode this month—spending is up! 💪 Here's the thing: you've already done the hardest part by tracking everything. Your food spending jumped to $800 (up 25% from last month). Quick win: try the 'restaurant pause'—cook at home just 3 more nights this week. That alone could save $60! What's one meal you actually enjoy cooking?"

**For someone doing well:**
"Look at you go! 🌟 You're saving 22% of your income—that puts you in the top tier of financial health. Your grocery spending is super efficient, and I love that your entertainment stayed flat while income grew. At this rate, you'll hit your emergency fund goal in just 4 months. The question is: what's the NEXT exciting goal we should set?"

**For goal tracking:**
"Your 'Vacation Fund' is at $1,200 of $3,000—you're 40% there! 🏖️ At your current monthly savings of $200, you'll reach it in 9 months. But here's a thought: if you redirected just $50 from dining out (currently $400/month), you'd get there in 6 months instead. That's summer vacation vs. winter vacation. Which sounds better?"

## 🧠 PSYCHOLOGICAL PRINCIPLES TO APPLY
1. **Progress Principle**: People are motivated by visible progress—always show movement toward goals
2. **Fresh Start Effect**: Use beginnings (new month, week, year) as motivation points
3. **Implementation Intentions**: Help create "If-Then" plans ("If I want takeout, I'll check my food budget first")
4. **Reward Substitution**: Suggest non-monetary rewards for hitting savings milestones
5. **Identity-Based Habits**: Help users see themselves as "a saver" not "someone trying to save"

Remember: Your goal isn't just to report numbers—it's to inspire lasting behavioral change that leads to financial freedom and peace of mind. Every interaction should leave the user feeling more capable and motivated than before.
"""


def build_context_string(context: dict) -> str:
    """
    Build comprehensive financial context for LLM.
    Structured for maximum analytical capability.
    """
    if not context.get("has_data"):
        return "No financial data available yet. User needs to add transactions."
    
    def fmt(cat):
        return str(cat).replace("_", " ").title() if cat else "Uncategorized"

    # Get data
    data_range = context.get("data_range", {})
    this_week = context.get("this_week", {})
    this_month = context.get("this_month", {})
    last_month = context.get("last_month", {})
    this_year = context.get("this_year", {})
    all_time = context.get("all_time", {})
    expense_stats = context.get("expense_statistics", {})

    text = f"""# COMPLETE FINANCIAL DATA ANALYSIS
Generated: {context.get('generated_at', 'Unknown')}
Data Range: {data_range.get('earliest', 'N/A')} to {data_range.get('latest', 'N/A')} ({data_range.get('days', 0)} days, {data_range.get('total_transactions', 0)} transactions)

---

## 📊 SUMMARY BY TIME PERIOD

### This Week
- Income: {format_currency(this_week.get('income', 0))}
- Expenses: {format_currency(this_week.get('expenses', 0))}
- Net: {format_currency(this_week.get('net', 0))}

### This Month
- Income: {format_currency(this_month.get('income', 0))}
- Expenses: {format_currency(this_month.get('expenses', 0))}
- Net: {format_currency(this_month.get('net', 0))}

### Last Month
- Income: {format_currency(last_month.get('income', 0))}
- Expenses: {format_currency(last_month.get('expenses', 0))}
- Net: {format_currency(last_month.get('net', 0))}

### Year to Date
- Income: {format_currency(this_year.get('income', 0))}
- Expenses: {format_currency(this_year.get('expenses', 0))}
- Net: {format_currency(this_year.get('net', 0))}

### All Time
- Total Income: {format_currency(all_time.get('income', 0))}
- Total Expenses: {format_currency(all_time.get('expenses', 0))}
- Net Savings: {format_currency(all_time.get('net', 0))}

---

## 📈 EXPENSE STATISTICS (Use for anomaly detection)
- Mean expense: {format_currency(expense_stats.get('mean', 0))}
- Median expense: {format_currency(expense_stats.get('median', 0))}
- Std deviation: {format_currency(expense_stats.get('std_dev', 0))}
- Min: {format_currency(expense_stats.get('min', 0))} | Max: {format_currency(expense_stats.get('max', 0))}
- 75th percentile: {format_currency(expense_stats.get('p75', 0))}
- 90th percentile: {format_currency(expense_stats.get('p90', 0))}
- 95th percentile: {format_currency(expense_stats.get('p95', 0))}
(Transactions above 2x std dev from mean are likely anomalies)

---

## 📅 MONTHLY BREAKDOWN (All months with data)
"""
    
    monthly = context.get("monthly_breakdown", {})
    for month_key, data in list(monthly.items())[:24]:  # Up to 2 years
        change = data.get('expense_change_pct', '')
        change_str = f" (change: {change:+.1f}%)" if isinstance(change, (int, float)) else ""
        text += f"- **{month_key}**: Income {format_currency(data.get('income', 0))} | Expenses {format_currency(data.get('expenses', 0))} | Txns: {data.get('transactions', 0)}{change_str}\n"

    text += "\n---\n\n## 🏷️ ALL SPENDING CATEGORIES (Complete breakdown)\n"
    categories = context.get("categories", {})
    total_expenses = sum(d.get('total', 0) for d in categories.values())
    for cat, data in categories.items():  # All categories, not limited
        pct = (data.get('total', 0) / total_expenses * 100) if total_expenses > 0 else 0
        text += f"- **{fmt(cat)}**: {format_currency(data.get('total', 0))} ({pct:.1f}%) | {data.get('count', 0)} transactions | Avg: {format_currency(data.get('avg', 0))}\n"

    text += "\n---\n\n## 🔄 RECURRING PAYMENTS & SUBSCRIPTIONS\n"
    text += "(Payments detected as recurring based on pattern analysis)\n\n"
    
    # Likely subscriptions first
    subscriptions = context.get("likely_subscriptions", [])
    if subscriptions:
        text += "### Confirmed Subscriptions (consistent amount & frequency):\n"
        for sub in subscriptions[:15]:
            name = obfuscate_pii(sub.get('merchant', ''))
            text += f"- **{name}**: {format_currency(sub.get('amount', 0))}/{sub.get('frequency', 'recurring')} | Total spent: {format_currency(sub.get('total_spent', 0))} | Last: {sub.get('last_date', 'N/A')}\n"
    
    recurring = context.get("recurring_payments", [])
    if recurring:
        text += "\n### All Recurring Payments:\n"
        for r in recurring[:20]:
            name = obfuscate_pii(r.get('merchant', ''))
            sub_tag = " ✓SUBSCRIPTION" if r.get('is_subscription') else ""
            text += f"- **{name}**: ~{format_currency(r.get('amount', 0))}/{r.get('frequency', '?')} | {r.get('count', 0)}x | Total: {format_currency(r.get('total_spent', 0))}{sub_tag}\n"

    text += "\n---\n\n## 🏪 ALL MERCHANTS/VENDORS (Where money is spent)\n"
    text += "(Every unique place/service money was spent)\n\n"
    merchants = context.get("merchants", [])
    for m in merchants[:40]:
        name = obfuscate_pii(m.get('name', ''))
        text += f"- **{name}**: {format_currency(m.get('total', 0))} | {m.get('count', 0)} transactions | Category: {fmt(m.get('category', ''))}\n"

    text += "\n---\n\n## ⚠️ ANOMALIES & ALERTS (Pre-detected unusual activity)\n"
    anomalies = context.get("anomalies", {})
    
    large_txns = anomalies.get("large_transactions", [])
    if large_txns:
        text += "\n### Unusually Large Transactions:\n"
        for a in large_txns[:15]:
            desc = obfuscate_pii(a.get('description', ''))
            text += f"- {a.get('date', 'N/A')}: **{format_currency(a.get('amount', 0))}** - {desc} ({a.get('times_above_mean', 0)}x above average)\n"
    
    spikes = anomalies.get("category_spikes", [])
    if spikes:
        text += "\n### Category Spending Spikes (vs last month):\n"
        for s in spikes:
            text += f"- **{fmt(s.get('category', ''))}**: {format_currency(s.get('current_month', 0))} vs {format_currency(s.get('last_month', 0))} (+{s.get('change_pct', 0)}%)\n"

    goals = context.get("goals", [])
    if goals:
        text += "\n---\n\n## 🎯 FINANCIAL GOALS\n"
        for g in goals:
            text += f"- **{g.get('name', 'Goal')}**: {format_currency(g.get('current', 0))} / {format_currency(g.get('target', 0))} ({g.get('progress_pct', 0)}%) - Status: {g.get('status', 'unknown')}\n"

    # Note: Individual transactions not included - LLM has category summaries, 
    # monthly data, merchant analysis, and anomalies for comprehensive analysis

    # Savings rate calculation
    if this_month.get('income', 0) > 0:
        rate = (this_month.get('net', 0) / this_month.get('income', 0)) * 100
        text += f"\n---\n\n## 💰 CURRENT SAVINGS RATE: {rate:.1f}%\n"
        if rate >= 20:
            text += "Status: EXCELLENT (20%+ is ideal)"
        elif rate >= 10:
            text += "Status: GOOD (aim for 20%)"
        elif rate >= 0:
            text += "Status: FAIR (positive but room to improve)"
        else:
            text += "Status: WARNING (spending exceeds income)"

    return text


async def call_llm(messages: list[dict]) -> Optional[str]:
    """Call OpenAI-compatible API."""
    if not settings.openai_api_key:
        return None

    try:
        api_key = settings.openai_api_key
        
        if api_key.startswith("github_pat_") or api_key.startswith("ghp_"):
            base_url = settings.openai_base_url or "https://models.inference.ai.azure.com"
        else:
            base_url = settings.openai_base_url or "https://api.openai.com/v1"
        
        model = settings.openai_model or "gpt-4o-mini"
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": model, "messages": messages, "max_tokens": 2000, "temperature": 0.7},
            )

            if response.status_code == 200:
                return response.json()["choices"][0]["message"]["content"]
            else:
                print(f"LLM Error [{response.status_code}]: {response.text[:200]}")
                return None

    except Exception as e:
        print(f"LLM Exception: {e}")
        return None


# ============================================
# CHAT ENDPOINT
# ============================================
@router.post("/chat", response_model=ChatResponse)
async def chat_with_coach(
    request: ChatRequest,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Chat with AI financial coach (LLM-only)."""
    try:
        intent = detect_intent(request.message)
        context = await get_financial_context(current_user.id, db)

        if not context.get("has_data"):
            context = {
                "has_data": False,
                "month_name": datetime.now().strftime("%B %Y"),
                "last_month_name": "Last Month",
                "month": {"income": Decimal(0), "expenses": Decimal(0), "net": Decimal(0)},
                "last_month": {"income": Decimal(0), "expenses": Decimal(0), "net": Decimal(0)},
                "week": {"income": Decimal(0), "expenses": Decimal(0), "net": Decimal(0)},
                "year": {"income": Decimal(0), "expenses": Decimal(0), "net": Decimal(0)},
                "all_time": {"income": Decimal(0), "expenses": Decimal(0), "net": Decimal(0)},
                "month_categories": [],
                "income_categories": [],
                "top_expenses": [],
                "monthly_data": {},
                "total_transactions": 0,
                "days_tracked": 0,
                "daily_expense_avg": Decimal(0),
                "daily_income_avg": Decimal(0),
                "goals": [],
            }

        if not settings.openai_api_key:
            return ChatResponse(
                response="⚠️ **AI Coach Not Configured**\n\nAdd your API key to `.env`:\n```\nOPENAI_API_KEY=sk-your-key\n```",
                intent="error",
                suggestions=["How to set up?"],
            )

        # Build messages with obfuscated content
        safe_message = obfuscate_pii(request.message)
        financial_context = build_context_string(context)
        
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"{financial_context}\n\n---\n\n**Question:** {safe_message}"}
        ]

        response = await call_llm(messages)
        
        if not response:
            return ChatResponse(
                response="I'm having trouble connecting right now. 🤔\n\nPlease check your API key and try again!",
                intent="error",
                suggestions=["Try again"],
            )

        return ChatResponse(
            response=response,
            intent=intent.value,
            suggestions=get_suggestions(intent),
        )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        print(f"AI Coach Error: {e}")
        return ChatResponse(
            response="Something went wrong. Please try again! 🔄",
            intent="error",
            suggestions=["Try again"],
        )
