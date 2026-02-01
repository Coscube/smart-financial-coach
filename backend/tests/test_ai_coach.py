"""
Tests for AI Coach chatbot endpoints.

Tests cover:
- Security: Blocked patterns, PII detection
- Input validation: Empty, too long, special characters
- Intent detection: Greetings, spending, income, etc.
- Rule-based responses: Common questions
- Anomaly detection: Unusual spending patterns
- Forecasting: Future insights and projections
- Error handling: Graceful failures
- Suggestions: Follow-up suggestions in responses
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.transaction import Transaction, TransactionType
from src.routes.ai_coach import (
    Intent,
    detect_anomalies,
    detect_intent,
    format_currency,
    generate_forecast,
    get_follow_up_suggestions,
    sanitize_for_ai,
)

# ============================================
# UNIT TESTS: Helper Functions
# ============================================


class TestFormatCurrency:
    """Tests for currency formatting helper."""

    def test_format_decimal(self):
        """Test formatting Decimal values."""
        assert format_currency(Decimal("1234.56")) == "$1,234.56"

    def test_format_float(self):
        """Test formatting float values."""
        assert format_currency(1234.56) == "$1,234.56"

    def test_format_int(self):
        """Test formatting integer values."""
        assert format_currency(1000) == "$1,000.00"

    def test_format_zero(self):
        """Test formatting zero."""
        assert format_currency(0) == "$0.00"

    def test_format_negative(self):
        """Test formatting negative values."""
        assert format_currency(-500.50) == "$-500.50"

    def test_format_invalid(self):
        """Test formatting invalid values returns $0.00."""
        assert format_currency(None) == "$0.00"
        assert format_currency("invalid") == "$0.00"


class TestIntentDetection:
    """Tests for intent detection from user messages."""

    @pytest.mark.parametrize(
        "message,expected_intent",
        [
            # Greetings
            ("Hello", Intent.GREETING),
            ("Hi there!", Intent.GREETING),
            ("Hey", Intent.GREETING),
            ("Good morning", Intent.GREETING),
            ("Good afternoon", Intent.GREETING),
            # Summary
            ("Show me my summary", Intent.SUMMARY),
            ("Give me an overview", Intent.SUMMARY),
            ("How am I doing?", Intent.SUMMARY),
            ("What's my financial health?", Intent.SUMMARY),
            # Spending
            ("How much did I spend?", Intent.SPENDING),
            ("What are my expenses?", Intent.SPENDING),
            ("Where did my money go?", Intent.SPENDING),
            ("Show my spending", Intent.SPENDING),
            # Income
            ("What's my income?", Intent.INCOME),
            ("How much did I earn?", Intent.INCOME),
            ("Show my salary", Intent.INCOME),
            # Savings
            ("How can I save more?", Intent.SAVINGS),
            ("What are my savings?", Intent.SAVINGS),
            ("How much do I have left?", Intent.SAVINGS),
            # Comparison
            ("Compare to last month", Intent.COMPARISON),
            ("How does this month compare?", Intent.COMPARISON),
            ("vs last month", Intent.COMPARISON),
            # Category
            ("Show spending by category", Intent.CATEGORY),
            ("How much on food?", Intent.CATEGORY),
            ("Entertainment expenses", Intent.CATEGORY),
            # Advice
            ("Give me advice", Intent.ADVICE),
            ("What should I do?", Intent.ADVICE),
            ("Any tips?", Intent.ADVICE),
            ("How can I improve?", Intent.ADVICE),
            # Goals
            ("What are my goals?", Intent.GOALS),
            ("Show my targets", Intent.GOALS),
            ("Emergency fund progress", Intent.GOALS),
            # Forecast
            ("Predict my expenses", Intent.FORECAST),
            ("What will I spend by month end?", Intent.FORECAST),
            # Help
            ("Help", Intent.HELP),
            ("What can you do?", Intent.HELP),
            ("Show commands", Intent.HELP),
            # Thanks
            ("Thanks!", Intent.THANKS),
            ("Thank you", Intent.THANKS),
            ("Appreciate it", Intent.THANKS),
            # Unknown
            ("Random gibberish xyz", Intent.UNKNOWN),
            ("asdfghjkl", Intent.UNKNOWN),
        ],
    )
    def test_detect_intent(self, message, expected_intent):
        """Test intent detection for various messages."""
        assert detect_intent(message) == expected_intent

    def test_detect_intent_case_insensitive(self):
        """Test that intent detection is case insensitive."""
        assert detect_intent("HELLO") == Intent.GREETING
        assert detect_intent("hello") == Intent.GREETING
        assert detect_intent("HeLLo") == Intent.GREETING


class TestPIISanitization:
    """Tests for PII sanitization before sending to AI."""

    def test_sanitize_email(self):
        """Test that emails are redacted."""
        text = "My email is user@example.com and I need help"
        result = sanitize_for_ai(text)
        assert "user@example.com" not in result
        assert "[REDACTED]" in result

    def test_sanitize_ssn(self):
        """Test that SSN patterns are redacted."""
        text = "My SSN is 123-45-6789"
        result = sanitize_for_ai(text)
        assert "123-45-6789" not in result
        assert "[REDACTED]" in result

    def test_sanitize_ssn_no_dashes(self):
        """Test SSN without dashes is redacted."""
        text = "SSN: 123456789"
        result = sanitize_for_ai(text)
        assert "123456789" not in result

    def test_sanitize_credit_card(self):
        """Test that credit card numbers are redacted."""
        text = "Card: 4111-1111-1111-1111"
        result = sanitize_for_ai(text)
        assert "4111-1111-1111-1111" not in result
        assert "[REDACTED]" in result

    def test_sanitize_preserves_normal_text(self):
        """Test that normal text is preserved."""
        text = "How much did I spend on groceries this month?"
        result = sanitize_for_ai(text)
        assert result == text

    def test_sanitize_multiple_pii(self):
        """Test sanitization with multiple PII items."""
        text = "Email: test@test.com, Card: 4111111111111111"
        result = sanitize_for_ai(text)
        assert "test@test.com" not in result
        assert "4111111111111111" not in result


class TestFollowUpSuggestions:
    """Tests for contextual follow-up suggestions."""

    def test_spending_suggestions(self):
        """Test suggestions for spending intent."""
        context = {"month": {"net": Decimal("1000")}}
        suggestions = get_follow_up_suggestions(Intent.SPENDING, context)
        assert len(suggestions) == 3
        assert all(isinstance(s, str) for s in suggestions)

    def test_negative_balance_adds_budget_suggestion(self):
        """Test that negative balance adds budget fix suggestion."""
        context = {"month": {"net": Decimal("-500")}}
        suggestions = get_follow_up_suggestions(Intent.SPENDING, context)
        assert "How can I fix my budget?" in suggestions

    def test_greeting_suggestions(self):
        """Test suggestions for greeting intent."""
        context = {"month": {"net": Decimal("1000")}}
        suggestions = get_follow_up_suggestions(Intent.GREETING, context)
        assert len(suggestions) == 3


# ============================================
# INTEGRATION TESTS: API Endpoints
# ============================================


@pytest.fixture
async def test_user_with_token(client: AsyncClient, db_session: AsyncSession):
    """Create a test user and return auth token."""
    user_data = {
        "email": "aicoach@example.com",
        "password": "testpassword123",
        "first_name": "AI",
        "last_name": "Tester",
    }
    await client.post("/api/auth/register", json=user_data)
    login_response = await client.post(
        "/api/auth/login",
        json={"email": user_data["email"], "password": user_data["password"]},
    )
    token = login_response.json()["access_token"]
    return {"token": token, "user_data": user_data}


@pytest.fixture
async def test_user_with_transactions(
    client: AsyncClient, db_session: AsyncSession, test_user_with_token
):
    """Create a test user with sample transactions."""
    token = test_user_with_token["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get user ID from /users/me
    me_response = await client.get("/api/users/me", headers=headers)
    user_id = me_response.json()["id"]

    # Create sample transactions directly in DB
    now = datetime.now(timezone.utc)
    transactions = [
        Transaction(
            user_id=user_id,
            amount=Decimal("5000.00"),
            transaction_type=TransactionType.INCOME,
            category="salary",
            description="Monthly salary",
            transaction_date=now - timedelta(days=5),
        ),
        Transaction(
            user_id=user_id,
            amount=Decimal("1500.00"),
            transaction_type=TransactionType.EXPENSE,
            category="rent",
            description="Monthly rent",
            transaction_date=now - timedelta(days=3),
        ),
        Transaction(
            user_id=user_id,
            amount=Decimal("200.00"),
            transaction_type=TransactionType.EXPENSE,
            category="food",
            description="Groceries",
            transaction_date=now - timedelta(days=2),
        ),
        Transaction(
            user_id=user_id,
            amount=Decimal("50.00"),
            transaction_type=TransactionType.EXPENSE,
            category="entertainment",
            description="Movie tickets",
            transaction_date=now - timedelta(days=1),
        ),
    ]

    for txn in transactions:
        db_session.add(txn)
    await db_session.commit()

    return {
        "token": token,
        "headers": headers,
        "user_id": user_id,
    }


class TestAICoachSecurity:
    """Security tests for AI Coach endpoint."""

    @pytest.mark.asyncio
    async def test_blocked_password_request(self, client: AsyncClient, test_user_with_token):
        """Test that password-related messages are blocked."""
        headers = {"Authorization": f"Bearer {test_user_with_token['token']}"}
        response = await client.post(
            "/api/ai-coach/chat",
            json={"message": "What is my password?"},
            headers=headers,
        )
        assert response.status_code == 400
        assert "security" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_blocked_ssn_request(self, client: AsyncClient, test_user_with_token):
        """Test that SSN-related messages are blocked."""
        headers = {"Authorization": f"Bearer {test_user_with_token['token']}"}
        response = await client.post(
            "/api/ai-coach/chat",
            json={"message": "My social security number is 123-45-6789"},
            headers=headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_blocked_credit_card_request(self, client: AsyncClient, test_user_with_token):
        """Test that credit card messages are blocked."""
        headers = {"Authorization": f"Bearer {test_user_with_token['token']}"}
        response = await client.post(
            "/api/ai-coach/chat",
            json={"message": "My credit card number is 4111111111111111"},
            headers=headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_blocked_api_key_request(self, client: AsyncClient, test_user_with_token):
        """Test that API key messages are blocked."""
        headers = {"Authorization": f"Bearer {test_user_with_token['token']}"}
        response = await client.post(
            "/api/ai-coach/chat",
            json={"message": "Store this api_key: sk-12345"},
            headers=headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_requires_authentication(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.post(
            "/api/ai-coach/chat",
            json={"message": "Hello"},
        )
        assert response.status_code == 401


class TestAICoachInputValidation:
    """Input validation tests for AI Coach endpoint."""

    @pytest.mark.asyncio
    async def test_empty_message_rejected(self, client: AsyncClient, test_user_with_token):
        """Test that empty messages are rejected."""
        headers = {"Authorization": f"Bearer {test_user_with_token['token']}"}
        response = await client.post(
            "/api/ai-coach/chat",
            json={"message": ""},
            headers=headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_whitespace_only_rejected(self, client: AsyncClient, test_user_with_token):
        """Test that whitespace-only messages are rejected."""
        headers = {"Authorization": f"Bearer {test_user_with_token['token']}"}
        response = await client.post(
            "/api/ai-coach/chat",
            json={"message": "   "},
            headers=headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_message_too_long_rejected(self, client: AsyncClient, test_user_with_token):
        """Test that messages over 1000 chars are rejected."""
        headers = {"Authorization": f"Bearer {test_user_with_token['token']}"}
        long_message = "a" * 1001
        response = await client.post(
            "/api/ai-coach/chat",
            json={"message": long_message},
            headers=headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_valid_message_accepted(self, client: AsyncClient, test_user_with_token):
        """Test that valid messages are accepted."""
        headers = {"Authorization": f"Bearer {test_user_with_token['token']}"}
        response = await client.post(
            "/api/ai-coach/chat",
            json={"message": "Hello!"},
            headers=headers,
        )
        assert response.status_code == 200


class TestAICoachGreetings:
    """Tests for greeting responses."""

    @pytest.mark.asyncio
    async def test_greeting_response(self, client: AsyncClient, test_user_with_token):
        """Test that greetings get friendly responses."""
        headers = {"Authorization": f"Bearer {test_user_with_token['token']}"}
        response = await client.post(
            "/api/ai-coach/chat",
            json={"message": "Hello!"},
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert data["intent"] == "greeting"
        assert "suggestions" in data
        assert len(data["suggestions"]) > 0

    @pytest.mark.asyncio
    async def test_thanks_response(self, client: AsyncClient, test_user_with_token):
        """Test that thanks messages get appropriate responses."""
        headers = {"Authorization": f"Bearer {test_user_with_token['token']}"}
        response = await client.post(
            "/api/ai-coach/chat",
            json={"message": "Thanks!"},
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["intent"] == "thanks"
        # Should contain a friendly response
        assert any(
            word in data["response"].lower() for word in ["welcome", "glad", "happy", "anytime"]
        )


class TestAICoachFinancialQueries:
    """Tests for financial query responses."""

    @pytest.mark.asyncio
    async def test_no_data_response(self, client: AsyncClient, test_user_with_token):
        """Test response when user has no transaction data."""
        headers = {"Authorization": f"Bearer {test_user_with_token['token']}"}
        response = await client.post(
            "/api/ai-coach/chat",
            json={"message": "How much did I spend?"},
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        # Should indicate no data or prompt to add transactions
        assert "no" in data["response"].lower() or "add" in data["response"].lower()

    @pytest.mark.asyncio
    async def test_spending_query_with_data(self, client: AsyncClient, test_user_with_transactions):
        """Test spending query with transaction data."""
        headers = test_user_with_transactions["headers"]
        response = await client.post(
            "/api/ai-coach/chat",
            json={"message": "How much did I spend this month?"},
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        # Should contain expense information
        assert "$" in data["response"]

    @pytest.mark.asyncio
    async def test_income_query_with_data(self, client: AsyncClient, test_user_with_transactions):
        """Test income query with transaction data."""
        headers = test_user_with_transactions["headers"]
        response = await client.post(
            "/api/ai-coach/chat",
            json={"message": "What's my income?"},
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "$" in data["response"]

    @pytest.mark.asyncio
    async def test_help_command(self, client: AsyncClient, test_user_with_transactions):
        """Test help command returns available options."""
        headers = test_user_with_transactions["headers"]
        response = await client.post(
            "/api/ai-coach/chat",
            json={"message": "help"},
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        # Should contain help information
        assert "can" in data["response"].lower() or "ask" in data["response"].lower()


class TestAICoachResponseFormat:
    """Tests for response format and structure."""

    @pytest.mark.asyncio
    async def test_response_contains_required_fields(
        self, client: AsyncClient, test_user_with_token
    ):
        """Test that response contains all required fields."""
        headers = {"Authorization": f"Bearer {test_user_with_token['token']}"}
        response = await client.post(
            "/api/ai-coach/chat",
            json={"message": "Hello"},
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "intent" in data
        assert "suggestions" in data

    @pytest.mark.asyncio
    async def test_suggestions_are_list(self, client: AsyncClient, test_user_with_token):
        """Test that suggestions field is a list."""
        headers = {"Authorization": f"Bearer {test_user_with_token['token']}"}
        response = await client.post(
            "/api/ai-coach/chat",
            json={"message": "Hello"},
            headers=headers,
        )
        data = response.json()
        assert isinstance(data["suggestions"], list)

    @pytest.mark.asyncio
    async def test_intent_is_valid_string(self, client: AsyncClient, test_user_with_token):
        """Test that intent field is a valid string."""
        headers = {"Authorization": f"Bearer {test_user_with_token['token']}"}
        response = await client.post(
            "/api/ai-coach/chat",
            json={"message": "Show my spending"},
            headers=headers,
        )
        data = response.json()
        assert isinstance(data["intent"], str)
        assert len(data["intent"]) > 0


class TestAICoachEdgeCases:
    """Edge case tests for AI Coach."""

    @pytest.mark.asyncio
    async def test_special_characters_handled(self, client: AsyncClient, test_user_with_token):
        """Test that special characters don't break the chatbot."""
        headers = {"Authorization": f"Bearer {test_user_with_token['token']}"}
        response = await client.post(
            "/api/ai-coach/chat",
            json={"message": "What's my spending? 🤔 #budget"},
            headers=headers,
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_unicode_characters_handled(self, client: AsyncClient, test_user_with_token):
        """Test that unicode characters are handled."""
        headers = {"Authorization": f"Bearer {test_user_with_token['token']}"}
        response = await client.post(
            "/api/ai-coach/chat",
            json={"message": "Café spending résumé"},
            headers=headers,
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_multiple_questions_handled(self, client: AsyncClient, test_user_with_token):
        """Test that multiple questions in one message are handled."""
        headers = {"Authorization": f"Bearer {test_user_with_token['token']}"}
        response = await client.post(
            "/api/ai-coach/chat",
            json={"message": "What's my income? And my expenses?"},
            headers=headers,
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_numbers_in_message_handled(self, client: AsyncClient, test_user_with_token):
        """Test that numbers in messages don't cause issues."""
        headers = {"Authorization": f"Bearer {test_user_with_token['token']}"}
        response = await client.post(
            "/api/ai-coach/chat",
            json={"message": "Did I spend more than $500 on food?"},
            headers=headers,
        )
        assert response.status_code == 200


class TestAIModelFallback:
    """Tests for AI model fallback behavior."""

    @pytest.mark.asyncio
    async def test_unknown_question_handled(self, client: AsyncClient, test_user_with_transactions):
        """Test that unknown questions still get a response."""
        headers = test_user_with_transactions["headers"]
        response = await client.post(
            "/api/ai-coach/chat",
            json={"message": "What is the meaning of life in finance?"},
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        # Should get either an AI response or default response
        assert len(data["response"]) > 0

    @pytest.mark.asyncio
    @patch("src.routes.ai_coach.call_ai_model")
    async def test_ai_failure_graceful(
        self,
        mock_ai: AsyncMock,
        client: AsyncClient,
        test_user_with_transactions,
    ):
        """Test graceful handling when AI model fails."""
        mock_ai.return_value = None  # Simulate AI failure

        headers = test_user_with_transactions["headers"]
        response = await client.post(
            "/api/ai-coach/chat",
            json={"message": "Complex question that needs AI"},
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        # Should get a default response, not an error
        assert len(data["response"]) > 0


# ============================================
# UNIT TESTS: Anomaly Detection
# ============================================


class TestAnomalyDetection:
    """Tests for detect_anomalies function."""

    def test_no_anomalies_with_empty_data(self):
        """Test no anomalies returned with empty context."""
        context = {
            "month": {
                "total_expense": Decimal("0"),
                "total_income": Decimal("0"),
                "expense_count": 0,
            },
            "expenses_by_category": {},
            "recent_transactions": [],
        }
        anomalies = detect_anomalies(context)
        assert isinstance(anomalies, list)
        assert len(anomalies) == 0

    def test_detect_large_transaction(self):
        """Test detection of unusually large transactions."""
        context = {
            "month": {
                "total_expense": Decimal("1000"),
                "total_income": Decimal("5000"),
                "expense_count": 20,  # Avg $50/day
            },
            "expenses_by_category": {"shopping": Decimal("500")},
            "recent_transactions": [
                {
                    "amount": Decimal("500"),  # 10x daily average!
                    "category": "shopping",
                    "description": "New laptop",
                    "date": datetime.now(timezone.utc),
                }
            ],
        }
        anomalies = detect_anomalies(context)
        # Should detect the large transaction
        large_txn_anomalies = [a for a in anomalies if "large" in a.lower()]
        assert len(large_txn_anomalies) > 0

    def test_detect_new_category(self):
        """Test detection of spending in new category."""
        context = {
            "month": {
                "total_expense": Decimal("100"),
                "total_income": Decimal("5000"),
                "expense_count": 5,
            },
            "expenses_by_category": {"gambling": Decimal("100")},
            "last_month": {
                "expenses_by_category": {"food": Decimal("500"), "rent": Decimal("1500")},
            },
            "recent_transactions": [],
        }
        anomalies = detect_anomalies(context)
        # Should detect new spending category
        new_cat_anomalies = [a for a in anomalies if "new" in a.lower() or "gambling" in a.lower()]
        assert len(new_cat_anomalies) > 0

    def test_detect_category_spike(self):
        """Test detection of significant increase in category spending."""
        context = {
            "month": {
                "total_expense": Decimal("2000"),
                "total_income": Decimal("5000"),
                "expense_count": 20,
            },
            "expenses_by_category": {"entertainment": Decimal("500")},
            "last_month": {
                "expenses_by_category": {"entertainment": Decimal("100")},
            },
            "recent_transactions": [],
        }
        anomalies = detect_anomalies(context)
        # Should detect 5x increase in entertainment
        spike_anomalies = [
            a for a in anomalies if "entertainment" in a.lower() or "increase" in a.lower()
        ]
        assert len(spike_anomalies) > 0

    def test_no_false_positives_normal_spending(self):
        """Test that normal spending patterns don't trigger anomalies."""
        context = {
            "month": {
                "total_expense": Decimal("2000"),
                "total_income": Decimal("5000"),
                "expense_count": 60,  # ~2 transactions per day
            },
            "expenses_by_category": {
                "food": Decimal("500"),
                "rent": Decimal("1500"),
            },
            "last_month": {
                "expenses_by_category": {
                    "food": Decimal("480"),
                    "rent": Decimal("1500"),
                },
            },
            "recent_transactions": [
                {
                    "amount": Decimal("50"),  # Normal grocery run
                    "category": "food",
                    "description": "Groceries",
                    "date": datetime.now(timezone.utc),
                }
            ],
        }
        anomalies = detect_anomalies(context)
        # Small variation should not be flagged
        assert len(anomalies) == 0


class TestAnomalyDetectionIntegration:
    """Integration tests for anomaly detection via API."""

    @pytest.mark.asyncio
    async def test_anomaly_query_responds(self, client: AsyncClient, test_user_with_transactions):
        """Test that anomaly-related queries get responses."""
        headers = test_user_with_transactions["headers"]
        response = await client.post(
            "/api/ai-coach/chat",
            json={"message": "Any unusual spending?"},
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        # Intent should be anomaly
        assert data["intent"] == "anomaly"

    @pytest.mark.asyncio
    async def test_anomaly_query_variations(self, client: AsyncClient, test_user_with_transactions):
        """Test different ways to ask about anomalies."""
        headers = test_user_with_transactions["headers"]
        queries = [
            "Detect any anomalies",
            "Anything weird in my spending?",
            "Any unusual transactions?",
            "Show me spending spikes",
        ]
        for query in queries:
            response = await client.post(
                "/api/ai-coach/chat",
                json={"message": query},
                headers=headers,
            )
            assert response.status_code == 200
            data = response.json()
            assert data["intent"] == "anomaly"


# ============================================
# UNIT TESTS: Forecasting
# ============================================


class TestForecasting:
    """Tests for generate_forecast function."""

    def test_forecast_with_empty_data(self):
        """Test forecast with no data returns empty."""
        context = {
            "month": {
                "total_expense": Decimal("0"),
                "total_income": Decimal("0"),
                "expense_count": 0,
            },
            "expenses_by_category": {},
            "days_into_month": 15,
            "days_in_month": 30,
        }
        forecast = generate_forecast(context)
        assert isinstance(forecast, dict)
        # Should indicate no data for forecast
        assert forecast.get("projected_expense") is None or forecast == {}

    def test_forecast_projects_monthly_expense(self):
        """Test that forecast correctly projects end-of-month expenses."""
        context = {
            "month": {
                "total_expense": Decimal("1000"),  # Spent 1000
                "total_income": Decimal("5000"),
                "expense_count": 30,
                "net": Decimal("4000"),
            },
            "expenses_by_category": {
                "food": Decimal("400"),
                "rent": Decimal("600"),
            },
            "days_into_month": 15,  # Halfway through
            "days_in_month": 30,
        }
        forecast = generate_forecast(context)
        # Should project ~$2000 for full month (1000 * 30/15)
        assert "projected_expense" in forecast
        projected = forecast["projected_expense"]
        assert projected >= Decimal("1800") and projected <= Decimal("2200")

    def test_forecast_includes_savings_projection(self):
        """Test that forecast includes savings projection."""
        context = {
            "month": {
                "total_expense": Decimal("1000"),
                "total_income": Decimal("5000"),
                "expense_count": 30,
                "net": Decimal("4000"),
            },
            "expenses_by_category": {"food": Decimal("1000")},
            "days_into_month": 15,
            "days_in_month": 30,
        }
        forecast = generate_forecast(context)
        assert "projected_savings" in forecast

    def test_forecast_includes_category_projections(self):
        """Test that forecast includes per-category projections."""
        context = {
            "month": {
                "total_expense": Decimal("1500"),
                "total_income": Decimal("5000"),
                "expense_count": 45,
            },
            "expenses_by_category": {
                "food": Decimal("500"),
                "transport": Decimal("200"),
                "entertainment": Decimal("300"),
            },
            "days_into_month": 10,
            "days_in_month": 30,
        }
        forecast = generate_forecast(context)
        assert "category_projections" in forecast
        category_projections = forecast["category_projections"]
        # Each category should be projected
        assert "food" in category_projections or len(category_projections) > 0

    def test_forecast_near_month_end(self):
        """Test forecast accuracy near end of month."""
        context = {
            "month": {
                "total_expense": Decimal("2900"),
                "total_income": Decimal("5000"),
                "expense_count": 87,
            },
            "expenses_by_category": {"misc": Decimal("2900")},
            "days_into_month": 29,
            "days_in_month": 30,
        }
        forecast = generate_forecast(context)
        # Near month end, projection should be close to current
        projected = forecast.get("projected_expense", Decimal("0"))
        assert projected >= Decimal("2900") and projected <= Decimal("3100")


class TestForecastIntegration:
    """Integration tests for forecasting via API."""

    @pytest.mark.asyncio
    async def test_forecast_query_responds(self, client: AsyncClient, test_user_with_transactions):
        """Test that forecast-related queries get responses."""
        headers = test_user_with_transactions["headers"]
        response = await client.post(
            "/api/ai-coach/chat",
            json={"message": "What's my forecast for this month?"},
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert data["intent"] == "forecast"

    @pytest.mark.asyncio
    async def test_forecast_query_variations(
        self, client: AsyncClient, test_user_with_transactions
    ):
        """Test different ways to ask about forecasts."""
        headers = test_user_with_transactions["headers"]
        queries = [
            "Predict my spending",
            "What will I spend by month end?",
            "Project my expenses",
            "Estimate my month",
        ]
        for query in queries:
            response = await client.post(
                "/api/ai-coach/chat",
                json={"message": query},
                headers=headers,
            )
            assert response.status_code == 200
            data = response.json()
            assert data["intent"] == "forecast"

    @pytest.mark.asyncio
    async def test_forecast_includes_actionable_info(
        self, client: AsyncClient, test_user_with_transactions
    ):
        """Test that forecast response includes actionable information."""
        headers = test_user_with_transactions["headers"]
        response = await client.post(
            "/api/ai-coach/chat",
            json={"message": "Give me a forecast"},
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        # Response should contain useful info
        response_text = data["response"].lower()
        # Should mention projections, spending, or similar
        assert any(
            word in response_text
            for word in ["project", "expect", "end of month", "forecast", "estimate", "$"]
        )
