# Composables System

## Intent

Provide an ergonomic, Vue-inspired composables API using unctx for accessing GitVan functionality within job execution contexts. The composables system should eliminate manual context passing while maintaining deterministic execution and enabling easy testing and development.

## User Stories

**As a job author**, I want to use `useGit()` to access Git operations without manually passing context so that my job code remains clean and focused on business logic.

**As a template developer**, I want to use `useTemplate()` to render Nunjucks templates with automatic Git context injection so that I can generate dynamic content easily.

**As a developer**, I want composables that work seamlessly with async/await patterns so that I can write modern JavaScript without callback complexity.

**As a framework developer**, I want composables that are testable in isolation so that I can mock Git operations and validate job logic independently.

## Acceptance Criteria

- [ ] unctx-based context management for automatic dependency injection
- [ ] Four core composables: `useGitVan()`, `useGit()`, `useTemplate()`, `useExec()`
- [ ] Context isolation between concurrent job executions
- [ ] Deterministic execution with consistent context data
- [ ] Support for nested context calls and composition
- [ ] Type-safe interfaces with comprehensive TypeScript definitions
- [ ] Error handling that fails fast with clear messages
- [ ] Performance target: < 1ms composable call overhead

## Out of Scope

- React-style hooks or lifecycle management
- State management beyond execution context
- Component-based rendering or UI concerns
- Hot reloading or development server features
- Browser compatibility or client-side execution

## Dependencies

- unctx library for context management
- Git repository with valid working directory
- Node.js runtime environment
- Nunjucks template engine for useTemplate()

## Success Metrics

- Zero manual context passing in 90%+ of job implementations
- Composable call overhead < 1ms per invocation
- 100% context isolation between concurrent executions
- Type-safe usage in TypeScript environments