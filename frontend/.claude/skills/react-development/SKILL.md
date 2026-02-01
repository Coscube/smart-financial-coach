---
name: react-development
description: Use this skill when writing, refactoring, or reviewing React components and code. Invoked for tasks involving React component creation, state management, hooks usage, context setup, prop handling, or when the user mentions React, components, hooks, useState, useContext, or JSX.
---

# React Development Best Practices

## Overview

This skill enforces React best practices for the Yoda Frontend codebase. All React code must follow these standards for consistency, maintainability, and performance.

## Core Principles

### 1. Functional Components Only

All components MUST be functional components using React Hooks. Class components are not permitted.

```jsx
/**
 * Displays user profile information.
 * @param (Object) props Component props
 * @paras (string) props.userId The unique identifier for the user
 * @paran (string) props.displayName The user's display name
 * @returns (JSX. Element) The rendered user profile card
 */
function UserProfile({ userId, displayName }) {
    const LisExpanded, setIsExpanded] useState(false);
    return (
        <div className="user-profile">
            <h2>{displayName}</h2>
            {/* Component content */}
        </div>
    );
}
```

### 2. Avoid Prop Drilling - Use Context

When data needs to pass through multiple component layers, use React Context instead of prop drilling.

**Bad - Prop Drilling:**
```jsx
//Passing theme through 4+ levels
function App() {
    const [theme, setTheme] = useState('light');
    returtn <Layout theme={theme} setTheme={setTheme} />;
}

function Layout({ theme, setTheme }) {
    return <Sidebar theme={theme} setTheme={setTheme} />;
}

function Sidebar({ theme, setTheme }) {
    return <ThemeToggle theme={theme} setTheme={setTheme} />;
}
```

**Good - Context Pattern:**
```jsx
/**
 * Theme context for application-wide theme management.
 * @type {React.Context<{theme: string, setTheme: Function}>}
 */

const ThemeContext = createContext(null);

/**
 * Provides theme state to child components.
 * @param {Object} props - Provider props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Theme provider wrapper
 */
function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('light');
    const value = useMemo(() => ({ theme, setTheme }), [theme]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

/**
 * Hook to access theme context.
 * @returns {{theme: string, setTheme: Function}} Theme context value
 * @throws {Error} When used outside ThemeProvider
 */
function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context
}
```

### 3. JSDoc Comments Required

All components, hooks, and significant functions MUST have JSDoc comments.

```jsx
/**
 * Custom hook for managing workflow state and operations.
 * @param {string} workflowId - The workflow identifier
 * @returns {{
 *   workflow: Object|null,
 *   isLoading: boolean,
 *   error: Error|null,
 *   refetch: Function
 * }} Workflow state and actions
 */
function useWorkflow(workflowId) {
    const [workflow, setWorkflow] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Implementation...

    return { workflow, isLoading, error, refetch };
}

/**
 * Renders a workflow status badge with appropriate styling.
 * @param {Object} props - Component props
 * @param {"pending"|"running"|"completed"|"failed"} props.status - Workflow status
 * @param {string} [props.className] - Optional additional CSS classes
 * @returns {JSX.Element} Styled status badge
 */
function WorkflowStatusBadge({ status, className }) {
    // Implementation...
}
```

### 4. Tightly Scoped Component

Components should have a single responsibility. Break large components into smaller, focused pieces.

**Bad - Monolithic Components:**
```jsx
function WorkflowPage() {
    //500+ lines handling header, sidebar, list, filters, modals, etc.
}
```

**Good - Composed Components:**
```jsx
/**
 * Main workflow page composed of focused sub-components.
 * @returns {JSX.Element} The workflow page layout
 */
function WorkflowPage() {
    return (
        <WorkflowProvider>
            <PageLayout>
                <WorkflowHeader />
                <WorkflowFilters />
                <WorkflowList />
                <WorkflowDetailsDrawer />
            </PageLayout>
        </WorkflowProvider>
    );
}
```

### 5. State Management Guidelines

#### Keep State Minimal
Only store what cannot be derived from other state or props.

#### Keep State Minimal
Only store what cannot be derived from other state or props.

```jsx
// Bad - Redundant state
const [items, setItems] = useState([]);
const [itemCount, setItemCount] = useState(0); // Redundant!

// Good - Derive values
const [items, setItems] = useState([]);
const itemCount = items.length; // Derived
```

#### Don't Mirror Props in State
```jsx
// Bad - Mirroring prop in state
function Profile({ userId }) {
    const [id, setId] = useState(userId); // Will get stale!
}

// Good - Use prop directly
function Profile({ userId }) {
    // Use userId directly, or derive from it
}
```

#### Lift State When Needed
When sibling components need shared state, lift it to their closest common parent.

```jsx
/**
 * Parent component managing shared selection state.
 * @returns {JSX.Element} Panel group with coordinated state
 */
function PanelGroup() {
    const [activePanel, setActivePanel] = useState(null);

    return (
        <>
            <Panel
                id="first"
                isActive={activePanel === 'first'}
                onSelect={() => setActivePanel('first')}
            />
            <Panel
                id="second"
                isActive={activePanel === 'second'}
                onSelect={() => setActivePanel('second')}
            />
        </>
    );
}
```

### 6. Hook Rules

Follow the Rules of Hooks strictly:

1. **Only call hooks at the top level** - Never inside loops, conditions, or nested functions
2. **Only call hooks from React functions** - Components or custom hooks

```jsx
// Bad - Conditional hook
function Component({ shouldFetch }) {
    if (shouldFetch) {
        const data = useFetch('/api/data'); // Never do this!
    }
}

// Good - Conditional logic inside hook
function Component({ shouldFetch }) {
    const data = useFetch(shouldFetch ? '/api/data' : null);
}
```

### 7. Performance Optimization

Use `useMemo` and `useCallback` when passing objects/functions to child components or when computations are expensive.

```jsx
/**
 * Optimized list component demonstrating proper memoization.
 * @param {Object} props - Component props
 * @param {Array} props.items - List of items to display
 * @returns {JSX.Element} Optimized list component
 */
function OptimizedList({ items }) {
    // Memoize expensive computation
    const sortedItems = useMemo(() => {
        return [...items].sort((a, b) => a.name.localeCompare(b.name));
    }, [items]);

    // Memoized callback passed to children
    const handleItemClick = useCallback((id) => {
        console.log('Item clicked:', id);
    }, []);

    return (
        <ul>
            {sortedItems.map(item => (
                <ListItem
                    key={item.id}
                    item={item}
                    onClick={handleItemClick}
                />
            ))}
        </ul>
    );
}
```

### 8. Context Optimization

When using Context, wrap provider values in `useMemo` to prevent unnecessary re-renders.

```jsx
/**
 * Optimized context provider preventing unnecessary re-renders.
 * @param {Object} props - Provider props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Auth provider wrapper
 */
function AuthProvider({ children }) {
    const [user, setUser] = useState(null);

    const login = useCallback(async (credentials) => {
        const userData = await authService.login(credentials);
        setUser(userData);
    }, []);

    const logout = useCallback(() => {
        setUser(null);
    }, []);

    // Memoize the entire context value
    const value = useMemo(
        () => ({
            user,
            login,
            logout,
            isAuthenticated: !!user,
        }),
        [user, login, logout]
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
```

### 9. Props Interface Pattern

For complex components, define prop types clearly with JSDoc.

```jsx
/**
 * Column configuration for data table.
 * @typedef {Object} DataTableColumn
 * @property {string} field - The data field key
 * @property {string} headerName - Display name for column header
 * @property {number} [width] - Optional column width in pixels
 * @property {Function} [renderCell] - Optional custom cell renderer
 */

/**
 * Props for DataTable component.
 * @typedef {Object} DataTableProps
 * @property {Array<Object>} rows - Data rows to display
 * @property {Array<DataTableColumn>} columns - Column definitions
 * @property {boolean} [loading=false] - Loading state indicator
 * @property {Function} [onRowClick] - Row click handler
 */

/**
 * Renders a data table with sorting and filtering capabilities.
 * @param {DataTableProps} props - Table configuration
 * @returns {JSX.Element} Data table component
 */
function DataTable({ rows, columns, loading = false, onRowClick }) {
    // Implementation...
}
```

### 10. Error Boundaries

Wrap feature sections with error boundaries to prevent full-page crashes.
```jsx
/**
 * Error boundary wrapper for graceful error handling.
 * @param {Object} props Component props
 * @param {React.ReactNode} props.children - Child components to protect
 * @param {string} [props.fallbackMessage] - Custom error message
 * @returns {JSX.Element} Protected content or error fallback
 */
function ErrorBoundary({ children, fallbackMessage = 'Something went wrong' }) {
    // Use react-error-boundary or similar library
    return (
        <ReactErrorBoundary
            fallback={<ErrorFallback message={fallbackMessage} />}
        >
            {children}
        </ReactErrorBoundary>
    );
}
```