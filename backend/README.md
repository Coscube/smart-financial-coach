# Smart Financial Coach - Backend

A FastAPI-based REST API backend for the Smart Financial Coach application.

## Tech Stack

- **Python 3.11** - Primary programming language
- **FastAPI 0.115.8** - Modern async web framework for building REST APIs
- **Uvicorn 0.34.0** - ASGI server
- **Pydantic 2.10.6** - Data validation and serialization
- **PostgreSQL** - Primary relational database
- **SQLAlchemy 2.0.38** - ORM for database interactions
- **asyncpg 0.30.0** - Async PostgreSQL driver
- **PyJWT 2.10.1** - JWT token authentication

## Project Structure

```
backend/
├── src/
│   ├── __init__.py
│   ├── main.py           # FastAPI application factory
│   ├── config.py         # Application settings
│   ├── database.py       # Database configuration
│   ├── models/           # SQLAlchemy models
│   │   ├── user.py
│   │   ├── transaction.py
│   │   ├── budget.py
│   │   └── goal.py
│   ├── schemas/          # Pydantic schemas
│   │   ├── user.py
│   │   ├── transaction.py
│   │   ├── budget.py
│   │   └── goal.py
│   ├── services/         # Business logic
│   │   ├── auth.py
│   │   ├── user.py
│   │   ├── transaction.py
│   │   ├── budget.py
│   │   └── goal.py
│   └── routes/           # API endpoints
│       ├── auth.py
│       ├── users.py
│       ├── transactions.py
│       ├── budgets.py
│       └── goals.py
├── tests/                # Test files
├── pyproject.toml        # Project configuration
├── requirements.txt      # Production dependencies
├── requirements-dev.txt  # Development dependencies
└── .env.example          # Environment variables template
```

## Getting Started

### Prerequisites

- Python 3.11 or higher
- PostgreSQL database (or use SQLite for development)

### Installation

1. **Create and activate a virtual environment:**

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux/macOS
source .venv/bin/activate
```

2. **Install dependencies:**

```bash
# Production dependencies
pip install -r requirements.txt

# Development dependencies (includes testing tools)
pip install -r requirements-dev.txt
```

3. **Set up environment variables:**

```bash
# Copy the example file
cp .env.example .env

# Edit .env with your configuration
```

4. **Run the development server:**

```bash
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### API Documentation

Once the server is running, you can access:

- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc
- **OpenAPI JSON**: http://localhost:8000/api/openapi.json

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get tokens
- `POST /api/auth/refresh` - Refresh access token

### Users
- `GET /api/users/me` - Get current user
- `PUT /api/users/me` - Update current user
- `DELETE /api/users/me` - Delete current user

### Transactions
- `GET /api/transactions` - List all transactions
- `POST /api/transactions` - Create a transaction
- `GET /api/transactions/{id}` - Get a transaction
- `PUT /api/transactions/{id}` - Update a transaction
- `DELETE /api/transactions/{id}` - Delete a transaction
- `POST /api/transactions/filter` - Filter transactions

### Budgets
- `GET /api/budgets` - List all budgets
- `POST /api/budgets` - Create a budget
- `GET /api/budgets/{id}` - Get a budget
- `PUT /api/budgets/{id}` - Update a budget
- `DELETE /api/budgets/{id}` - Delete a budget

### Goals
- `GET /api/goals` - List all goals
- `POST /api/goals` - Create a goal
- `GET /api/goals/{id}` - Get a goal
- `PUT /api/goals/{id}` - Update a goal
- `DELETE /api/goals/{id}` - Delete a goal
- `POST /api/goals/{id}/contribute` - Add contribution to goal

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test file
pytest tests/test_auth.py -v
```

## Linting

```bash
# Run flake8
flake8 src tests

# Format with black
black src tests

# Sort imports with isort
isort src tests
```

## Database

The application uses PostgreSQL for production. For local development, you can:

1. **Use Docker:**
```bash
docker run --name financial-coach-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=financial_coach -p 5432:5432 -d postgres:15
```

2. **Use SQLite (for quick testing):**
Update `.env`:
```
DATABASE_URL=sqlite+aiosqlite:///./financial_coach.db
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_NAME` | Application name | Smart Financial Coach |
| `APP_ENV` | Environment (development/production) | development |
| `DEBUG` | Enable debug mode | true |
| `SECRET_KEY` | Application secret key | - |
| `DATABASE_URL` | Async database connection URL | - |
| `JWT_SECRET_KEY` | Secret key for JWT tokens | - |
| `JWT_ALGORITHM` | JWT algorithm | HS256 |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Access token expiry | 30 |
| `CORS_ORIGINS` | Allowed CORS origins | http://localhost:5173 |
