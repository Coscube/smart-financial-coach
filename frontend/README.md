# Smart Financial Coach - Frontend

A modern financial coaching application built with React 19 and Material UI.

## 🚀 Tech Stack

- **Framework**: React 19.1.1 with TypeScript
- **Build Tool**: Vite 6.1.0
- **Routing**: React Router DOM 7.1.5
- **UI Library**: MUI (Material UI) 7.0.1
- **State Management**: Zustand 5.0.6
- **Styling**: Emotion 11.14.0 (CSS-in-JS)
- **Testing**: Vitest 3.1.1, Playwright 1.57.0, Testing Library 16.3.0
- **Linting**: ESLint 9.19.0
- **Formatting**: Prettier 3.6.2

## 📁 Project Structure

```
src/
├── components/       # Reusable UI components
│   └── Layout/       # Layout components (Navbar, Sidebar)
├── pages/            # Page components
│   ├── Dashboard/    # Financial overview
│   ├── Budget/       # Budget management
│   ├── Transactions/ # Transaction tracking
│   ├── Goals/        # Financial goals
│   ├── Reports/      # Financial reports
│   └── Settings/     # User settings
├── stores/           # Zustand state stores
├── services/         # API services
├── hooks/            # Custom React hooks
├── utils/            # Utility functions
├── theme/            # MUI theme configuration
└── types/            # TypeScript types
e2e/                  # Playwright E2E tests
```

## 🛠️ Getting Started

### Prerequisites

- Node.js 22 or higher
- npm or yarn

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file (optional):
   ```
   VITE_API_URL=http://localhost:8000/api
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |
| `npm run test` | Run unit tests |
| `npm run test:ui` | Run tests with UI |
| `npm run test:coverage` | Run tests with coverage |
| `npm run test:e2e` | Run E2E tests |
| `npm run test:e2e:ui` | Run E2E tests with UI |

## 🎨 Features

- **Dashboard**: Financial overview with key metrics and budget progress
- **Budget Management**: Create and track budget categories
- **Transaction Tracking**: Record and manage income/expenses
- **Financial Goals**: Set and track savings goals
- **Reports**: Analyze spending patterns and trends
- **Settings**: Manage user profile and notifications

## 🧪 Testing

### Unit Tests (Vitest)
```bash
npm run test
```

### E2E Tests (Playwright)
```bash
npm run test:e2e
```

## 📝 Code Style

- Use functional components with hooks
- Follow React 19 best practices
- Use TypeScript for type safety
- Follow MUI design patterns

## 🔗 Backend Integration

This frontend is designed to work with a REST API backend. Configure the API URL in your `.env` file:

```
VITE_API_URL=http://localhost:8000/api
```

## 📄 License

This project is private and proprietary.
