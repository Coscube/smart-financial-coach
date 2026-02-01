# Smart Financial Coach

A full-stack personal finance management application with AI-powered coaching.

## Project Structure

```
smart-financial-coach/
├── frontend/          # React + Vite frontend
├── backend/           # Python FastAPI backend
└── package.json       # Root package for running both
```

## Tech Stack

### Frontend
- React 19 with Vite
- Material UI 7
- Zustand (state management)
- React Router v7

### Backend
- Python 3.11
- FastAPI 0.115.8
- SQLAlchemy 2.0 (async)
- PostgreSQL
- JWT Authentication

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL (or use SQLite for development)

### Installation

1. **Clone and install dependencies:**

```bash
# Install root dependencies (concurrently)
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Set up backend
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux/macOS
source .venv/bin/activate

pip install -r requirements-dev.txt
cd ..
```

2. **Configure environment:**

```bash
# Backend environment is already set up with defaults
# Edit backend/.env if you need to change database settings
```

3. **Start development servers:**

```bash
# From the root directory - runs both frontend and backend
npm run dev
```

Or run them separately:

```bash
# Terminal 1 - Backend
cd backend
.venv\Scripts\activate  # Windows
uvicorn src.main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/api/docs
- **API Docs (ReDoc)**: http://localhost:8000/api/redoc

## Development Commands

### Root Level (runs both)
```bash
npm run dev           # Start both frontend and backend
npm run test          # Run all tests
npm run lint          # Lint both frontend and backend
```

### Frontend Only
```bash
cd frontend
npm run dev           # Start dev server
npm run build         # Production build
npm run test          # Run tests
npm run lint          # Run ESLint
```

### Backend Only
```bash
cd backend
uvicorn src.main:app --reload    # Start dev server
pytest                            # Run tests
pytest --cov=src                  # Run tests with coverage
flake8 src tests                  # Run linter
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/auth/register` | POST | Register user |
| `/api/auth/login` | POST | Login |
| `/api/users/me` | GET | Get current user |
| `/api/transactions` | GET/POST | List/Create transactions |
| `/api/budgets` | GET/POST | List/Create budgets |
| `/api/goals` | GET/POST | List/Create goals |

## Database Setup

### Option 1: PostgreSQL (Recommended)

```bash
# Using Docker
docker run --name financial-coach-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=financial_coach \
  -p 5432:5432 \
  -d postgres:15
```

### Option 2: SQLite (Quick Development)

Update `backend/.env`:
```
DATABASE_URL=sqlite+aiosqlite:///./financial_coach.db
```

## License

MIT
