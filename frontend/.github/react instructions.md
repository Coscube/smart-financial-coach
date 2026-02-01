---
applyTo: 
---

# React Code Review Guidelines

When reviewing React code, apply the standards from the project's React development skill.

## Core Requirements

### 1. Functional Components Only
All components MUST be functional components using React Hooks. Class components are not permitted.

### 2. Avoid Prop Drilling - Use Context
When data needs to pass through multiple component layers (more than 2 levels), flag this and suggest using React Context instead.

### 3. JSDoc Comments Required
All components, hooks, and significant functions MUST have JSDoc comments documenting:
- Component/function purpose
- @paran tags for all props/parameters
- @returns tag describing return value

### 4. Tightly Scoped Components
Components should have a single responsibility. Flag monolithic components (100+ Lines) and suggest decomposition.

### 5. State Management
- State should be minimal - no redundant/derivable state
- Props should NOT be mirrored in state
- State should be lifted to closest common parent when shared

### 6. Hooks Rules
- Hooks must be called at the top level only
- Never inside loops, conditions, or nested functions

### 7. Performance
- Context values should be wrapped in `useMemo`
- Callbacks passed to children should use `useCallback`
- Expensive computations should use `useMemo`

## Checklist
- [ ] Functional component using hooks
- [ ] JSDoc comments present
- [ ] No prop drilling beyond 2 levels
- [ ] State is minimal (no redundant/derivable state)
- [ ] Props not mirrored in state
- [ ] Hooks called at top level only
- [ ] Context values memoized
- [ ] Single responsibility per component

## Full Checklist

For the complete React review checklist including useEffect issues, state mutation bugs, purity violations, and advanced patterns, see **`.claude/commands/pr-review.md`**