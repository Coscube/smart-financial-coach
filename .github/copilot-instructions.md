# Smart Financial Coach - Copilot Instructions

## Project Overview

Smart Financial Coach is a full-stack web application for intelligent financial planning and personalized money management.

## Tech Stack

### Backend (Python/FastAPI)
- **Framework**: FastAPI with async/await
- **Database**: PostgreSQL with SQLAlchemy async ORM
- **Authentication**: JWT tokens
- **Package Manager**: Poetry
- **Python Version**: 3.13+

### Frontend (React/Vite)
- **Framework**: React 18 with functional components and hooks
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI)
- **State Management**: Zustand
- **Testing**: Vitest (unit), Playwright (E2E)

## Coding Standards

### Python/Backend
- Use async/await for all database operations
- Follow Pydantic schemas for request/response validation
- Use dependency injection with FastAPI's Depends()
- Keep routes thin, business logic in services
- Use SQLAlchemy 2.0 style queries

### React/Frontend
- Use functional components only (no class components)
- Use React Hooks for state and lifecycle
- Avoid excessive prop drilling - use Zustand stores
- Follow MUI theming conventions
- Keep components small and focused

## Project Structure

```
backend/
├── src/
│   ├── models/      # SQLAlchemy models
│   ├── schemas/     # Pydantic schemas
│   ├── routes/      # API endpoints
│   ├── services/    # Business logic
│   └── config.py    # Settings
frontend/
├── src/
│   ├── components/  # Reusable UI components
│   ├── pages/       # Page components
│   ├── stores/      # Zustand state stores
│   ├── services/    # API client
│   └── hooks/       # Custom hooks
```

## Skills

When working on this codebase:

- **React Components**: Follow Material-UI patterns, use sx prop for styling
- **API Routes**: Return consistent response format, handle errors properly
- **Database**: Use async sessions, proper transactions
- **E2E Tests**: Use Playwright with page object pattern

## Common Patterns

### API Response Format
```python
{"data": ..., "message": "Success"}
{"detail": "Error message"}  # For errors
```

### Zustand Store Pattern
```javascript
export const useStore = create((set, get) => ({
  items: [],
  loading: false,
  fetch: async () => { ... },
}));
```

### Protected Routes
All API routes except /health and /auth/* require JWT authentication.
