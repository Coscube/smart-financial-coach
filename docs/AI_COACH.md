# AI Financial Coach Documentation

The AI Financial Coach is an intelligent chatbot that provides personalized financial advice and insights based on your transaction history. It analyzes your income, expenses, savings patterns, and financial goals to answer questions and provide actionable recommendations.

## 🔒 Security & Privacy

The AI Coach is designed with **privacy-first** principles:

| Feature | Description |
|---------|-------------|
| **No PII Sent to AI** | User names, emails, SSNs, card numbers are NEVER sent to external AI |
| **Input Validation** | Messages limited to 1000 characters, blocked patterns for sensitive info |
| **Blocked Topics** | Auto-detects requests for passwords, SSN, credit cards, hacking |
| **PII Sanitization** | Auto-redacts email/SSN/card patterns before any AI calls |
| **Anonymous Context** | Only financial data (amounts, categories, dates) sent to AI |
| **User ID Only** | Backend uses user ID for data retrieval, not names or emails |

### Blocked Patterns
The chatbot will refuse to process messages containing:
- Passwords, API keys, secrets
- Social Security Numbers
- Credit card numbers
- Bank account/routing numbers
- Hacking/exploit attempts

## Architecture

The AI Coach uses a **hybrid approach** with intent detection:

```
User Question
     │
     ▼
┌─────────────────┐
│ Input Validation│──── Blocked Pattern ────► Error Response
│ & Sanitization  │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ Intent Detection│──── Greeting/Thanks ────► Quick Response
│                 │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ Rule-Based      │──── Match Found ────► Response + Suggestions
│ Pattern Match   │
└─────────────────┘
     │
     │ No Match
     ▼
┌─────────────────┐
│ AI Model        │──── API Key Set ────► AI Response + Suggestions
│ (PII Sanitized) │
└─────────────────┘
     │
     │ No API Key
     ▼
┌─────────────────┐
│ Default         │────────────────────► Summary + Help
│ Response        │
└─────────────────┘
```

### Intent Categories

The chatbot detects these intents for smarter routing:

| Intent | Trigger Examples |
|--------|------------------|
| `greeting` | "Hi", "Hello", "Hey", "Good morning" |
| `summary` | "Summary", "Overview", "How am I doing?" |
| `spending` | "Spend", "Expense", "Where did my money go?" |
| `income` | "Income", "Earn", "Salary", "Revenue" |
| `savings` | "Save", "Saving", "Leftover", "Remaining" |
| `comparison` | "Compare", "vs", "Last month", "Previous" |
| `category` | "Category", "Food", "Entertainment", "Transport" |
| `advice` | "Advice", "Suggest", "Recommend", "Tip" |
| `goals` | "Goal", "Target", "Emergency fund", "Debt" |
| `forecast` | "Predict", "Forecast", "End of month", "Project" |
| `anomaly` | "Unusual", "Weird", "Spike", "Anomaly", "Unexpected" |
| `help` | "Help", "What can you do?", "Commands" |
| `thanks` | "Thanks", "Thank you", "Appreciate it" |

## Configuration

### Environment Variables

Add these to your `.env` file in the backend folder:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4o-mini

# Optional: Use alternative providers (e.g., Azure OpenAI, local models)
OPENAI_BASE_URL=https://api.openai.com/v1
```

### Supported AI Providers

| Provider | Base URL | Model Examples |
|----------|----------|----------------|
| **GitHub Models** | `https://models.inference.ai.azure.com` | `gpt-4o-mini`, `gpt-4o`, `Meta-Llama-3.1-8B-Instruct` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo` |
| Azure OpenAI | `https://YOUR_RESOURCE.openai.azure.com/openai/deployments/YOUR_DEPLOYMENT` | Your deployment name |
| Anthropic (via proxy) | Your proxy URL | `claude-3-sonnet` |
| Local (Ollama) | `http://localhost:11434/v1` | `llama2`, `mistral` |

### GitHub Models Setup (Recommended - Free!)

1. Go to [GitHub Settings → Developer Settings → Personal Access Tokens](https://github.com/settings/tokens)
2. Generate a token (Fine-grained or Classic)
3. Add to your `backend/.env`:

```env
OPENAI_API_KEY=github_pat_YOUR_TOKEN_HERE
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://models.inference.ai.azure.com
```

**Available GitHub Models:**
- `gpt-4o-mini` - Fast and cheap (recommended)
- `gpt-4o` - Most capable
- `Meta-Llama-3.1-8B-Instruct` - Open source, fast
- `Meta-Llama-3.1-70B-Instruct` - Open source, powerful
- `Mistral-large` - Good for reasoning

## Features

### 🎯 Smart Intent Detection
The AI Coach detects user intent from natural language, enabling faster and more accurate responses without always needing AI calls.

### � Anomaly Detection
The AI Coach automatically detects unusual spending patterns:

| Detection Type | Description |
|---------------|-------------|
| **Large Transactions** | Transactions 3x or more above your daily average |
| **Category Spikes** | Categories with 50%+ increase from last month |
| **New Categories** | Spending in categories you've never used before |
| **Monthly Surges** | Overall spending significantly higher than previous month |

**Example queries:**
- "Any unusual spending?"
- "Detect anomalies in my transactions"
- "Show me spending spikes"
- "Anything weird in my expenses?"

### 📈 Financial Forecasting
Get insights into your future spending and savings:

| Forecast Type | Description |
|--------------|-------------|
| **Monthly Projection** | Estimated total expenses by end of month |
| **Savings Forecast** | Projected savings based on current trajectory |
| **Category Projections** | Per-category spending estimates |
| **Budget Status** | Whether you're on track with spending patterns |

**Example queries:**
- "What's my forecast for this month?"
- "Predict my spending"
- "What will I spend by month end?"
- "Project my expenses"

### �💡 Clickable Suggestions
Every response includes contextual follow-up suggestions that users can click to continue the conversation.

### 🎭 Engaging Personality
- Varied greetings and thank-you responses
- Random encouragements (20% chance after responses)
- Emoji usage for visual engagement

### 💬 Natural Language Understanding
The AI Coach understands conversational questions about your finances. You don't need to use specific commands - just ask naturally!

### 📊 Comprehensive Financial Analysis
- **Real-time calculations** from your actual transaction data
- **Multi-period analysis** - current month, last month, this week, this year, all-time
- **Category-based insights** - spending breakdown by category
- **Trend detection** - identifies patterns in your spending over time

---

## What You Can Ask

### 📊 Spending & Expense Questions

| Question Examples | What You'll Get |
|-------------------|-----------------|
| "What are my total expenses?" | All-time expense summary with category breakdown |
| "How much did I spend this month?" | Current month expenses by category |
| "What did I spend on dining?" | Category-specific spending analysis |
| "Show my spending by category" | Breakdown of expenses across all categories |
| "What are my expenses till now?" | Complete expense history summary |

### 💵 Income Questions

| Question Examples | What You'll Get |
|-------------------|-----------------|
| "What's my income this month?" | Monthly income with source breakdown |
| "How much have I earned?" | Total income across all time |
| "Show my income sources" | Income categorized by source |

### 📈 Comparisons & Trends

| Question Examples | What You'll Get |
|-------------------|-----------------|
| "Compare to last month" | Side-by-side comparison with percentage changes |
| "Show me this week's summary" | Weekly spending and income summary |
| "What are my spending trends?" | Monthly trend analysis over past 6 months |
| "How is this year going?" | Year-to-date financial summary |

### 💰 Financial Analysis

| Question Examples | What You'll Get |
|-------------------|-----------------|
| "What are my largest expenses?" | Top 5 biggest expense transactions |
| "What's my daily average spending?" | Daily averages with monthly projections |
| "What's my financial health score?" | Health score (0-100) with improvement tips |
| "How am I doing financially?" | Overall financial health assessment |

### 🎯 Goals & Budgeting

| Question Examples | What You'll Get |
|-------------------|-----------------|
| "What are my goals?" | List of all financial goals with status |
| "Give me budgeting advice" | 50/30/20 budget recommendations |
| "How can I save more?" | Personalized savings tips based on spending |

### 🔍 Anomaly Detection

| Question Examples | What You'll Get |
|-------------------|-----------------|
| "Any unusual spending?" | List of detected anomalies with explanations |
| "Detect anomalies" | Analysis of spending patterns for outliers |
| "Show spending spikes" | Categories with significant increases |
| "Anything weird in my expenses?" | Unusual transactions or new categories |

### 📈 Forecasting & Predictions

| Question Examples | What You'll Get |
|-------------------|-----------------|
| "What's my forecast?" | End-of-month projections for expenses and savings |
| "Predict my spending" | Category-by-category spending estimates |
| "What will I spend by month end?" | Total projected expenses |
| "Project my expenses" | Detailed forecast with recommendations |

### ⏰ Time-Based Queries

| Time Period | Example Questions |
|-------------|-------------------|
| **This Month** | "monthly expenses", "this month's spending" |
| **Last Month** | "last month comparison", "previous month" |
| **This Week** | "this week", "weekly summary" |
| **This Year** | "this year", "2026 summary", "year to date" |
| **All Time** | "total", "all time", "ever", "till now", "so far" |

---

## Response Types

### Summary Cards
Quick overview of income, expenses, and net savings for a period.

```
📊 Quick Summary for February 2026:

• Income: $5,000.00
• Expenses: $3,200.00
• Net: $1,800.00
```

### Category Breakdowns
Detailed spending by category with percentages.

```
Spending by Category:
• Food & Drinks: $450.00 (14.1%)
• Transportation: $320.00 (10.0%)
• Entertainment: $180.00 (5.6%)
```

### Trend Analysis
Month-over-month comparison with change indicators.

```
📈 Monthly Trends:

Feb 2026:
  Income: $5,000.00 | Expenses: $3,200.00
Jan 2026:
  Income: $4,800.00 | Expenses: $3,500.00

✅ Expenses decreased by 8.6% from last month
```

### Financial Health Score
Comprehensive health assessment with actionable feedback.

```
🏥 Your Financial Health Check:

✅ Excellent savings rate (20%+)
✅ Good transaction tracking
⚠️ No financial goals set

Health Score: 75/100
👍 Good progress, keep improving!
```

---

## Tips for Best Results

1. **Be specific** - "How much on dining this month?" is better than "spending"
2. **Use time references** - Include "this month", "last week", "total" for specific periods
3. **Ask about categories** - Mention specific categories like "food", "transport", "entertainment"
4. **Type "help"** - Get a full list of available commands anytime

---

## Technical Details

### Data Sources
- **Transactions**: All income and expense records
- **Goals**: Financial goals and their progress
- **Categories**: Transaction categories for grouping

### Calculations
- All monetary calculations use `Decimal` for precision
- Dates are timezone-aware (UTC)
- Averages are calculated based on days with actual data

### API Endpoint
```
POST /api/ai-coach/chat
Content-Type: application/json
Authorization: Bearer <token>

{
  "message": "How much did I spend this month?"
}
```

### Response Format
```json
{
  "response": "📊 **Spending Summary for February 2026:**\n\n• Total Expenses: $3,200.00\n...",
  "intent": "spending",
  "suggestions": [
    "Break down by category",
    "What's my daily average?",
    "Compare to last month"
  ]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `response` | string | The chatbot's response text (markdown formatted) |
| `intent` | string | Detected user intent (e.g., "spending", "income", "advice") |
| `suggestions` | array | Contextual follow-up suggestions (clickable in UI) |
```

---

## Future Enhancements

- [x] Integration with OpenAI/Claude API for natural conversations
- [x] Intent detection for smarter routing
- [x] Clickable follow-up suggestions
- [x] Privacy-first design (no PII to AI)
- [x] Input validation and blocked topics
- [ ] Predictive analytics - forecast future expenses
- [ ] Anomaly detection - alert on unusual spending
- [ ] Voice input support
- [ ] Streaming responses for better UX
- [ ] Multi-language support
- [ ] Conversation memory (within session)

---

## AI Prompt Engineering

When the AI model is called, it receives a carefully crafted **privacy-safe** prompt with:

### System Instructions
The AI is told to:
- **NEVER ask for or reference personal information** (names, emails, SSN, account numbers)
- Only discuss the financial DATA provided
- If asked about personal info, politely redirect to finances
- Be encouraging and supportive, not judgmental
- Provide specific, actionable advice
- Use emojis sparingly for engagement
- Keep responses concise (2-3 paragraphs)
- Reference actual numbers from the user's data
- Suggest follow-up questions about finances
- Stay focused on financial topics

### Financial Context Provided (Anonymous)
```
USER'S FINANCIAL DATA (Anonymous - no personal identifiers):

Current Month (February 2026):
- Income: $5,000.00
- Expenses: $3,200.00
- Net Savings: $1,800.00
- Transaction Count: 45

All Time Summary:
- Total Income: $25,000.00
- Total Expenses: $18,500.00
- Net Balance: $6,500.00
- Total Transactions: 234
- Days Tracked: 120

Top Spending Categories This Month:
- Food & Drinks: $450.00
- Transportation: $320.00
- Entertainment: $180.00

Financial Goals:
- Emergency Fund: Target $5,000, Due: 2026-06-01

Daily Average Spending: $26.67
```

**Note:** No user names, emails, or other personally identifiable information is ever included in AI prompts.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No transactions found" | Add some transactions first |
| "Message blocked" | You may have typed sensitive info (password, SSN, etc.) |
| Error responses | Check if backend server is running |
| Outdated data | Refresh the page and try again |
| Category not recognized | Use common category names like "food", "dining", "transport" |
| AI not responding | Check if `OPENAI_API_KEY` is set in `.env` |
| Slow AI responses | Consider using `gpt-4o-mini` for faster responses |
| AI responses too generic | The rule-based system handles common questions faster |
| Suggestions not clickable | Make sure you're using the latest frontend version |

---

*Last updated: February 2026*
