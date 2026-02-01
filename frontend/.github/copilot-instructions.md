# Smart Financial Coach - Frontend

## Project Overview
A smart financial coaching application built with React 19 and modern web technologies.

## Tech Stack
- **Framework**: React 19.1.1 with React DOM 19.1.1
- **Build Tool**: Vite 6.1.0
- **Routing**: React Router DOM 7.1.5
- **UI Library**: MUI (Material UI) 7.0.1
- **State Management**: Zustand 5.0.6
- **Styling**: Emotion 11.14.0 (CSS-in-JS)
- **Testing**: Vitest 3.1.1, Playwright 1.57.0, Testing Library 16.3.0
- **Linting**: ESLint 9.19.0
- **Formatting**: Prettier 3.6.2
- **Runtime**: Node.js 22

## Development Guidelines

### Code Style
- Use functional components with hooks
- Follow React 19 best practices
- Use TypeScript for type safety
- Follow MUI design patterns for consistent UI

### State Management
- Use Zustand for global state
- Keep component state local when possible
- Create separate stores for different domains (user, budget, transactions, etc.)

### File Structure
- Components in `src/components/`
- Pages in `src/pages/`
- Zustand stores in `src/stores/`
- API services in `src/services/`
- Utility functions in `src/utils/`
- Custom hooks in `src/hooks/`
- Theme configuration in `src/theme/`

### Testing
- Write unit tests with Vitest
- Use Testing Library for component tests
- E2E tests with Playwright in `e2e/` directory

### Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run E2E tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
