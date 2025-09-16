# Composables System - Technical Implementation Plan

## Architecture Overview

The composables system provides a clean abstraction layer over GitVan's core functionality using unctx for automatic dependency injection. The system follows Vue 3's composables pattern adapted for server-side Git automation.

```
┌─────────────────────────────────────────────────────────┐
│                    Job Execution                        │
│    const git = useGit()                                 │
│    const tmpl = useTemplate()                           │
│    git.run('log') • tmpl.render('template.njk')        │
├─────────────────────────────────────────────────────────┤
│                  Composables Layer                      │
│  useGitVan() • useGit() • useTemplate() • useExec()    │
├─────────────────────────────────────────────────────────┤
│                  unctx Context                          │
│    createContext() • call() • use()                    │
├─────────────────────────────────────────────────────────┤
│               Context Implementation                    │
│    withGitVan(context, function) wrapper               │
├─────────────────────────────────────────────────────────┤
│                 Core GitVan APIs                        │
│    Git ops • Template engine • Exec engine             │
└─────────────────────────────────────────────────────────┘
```

## Core Components

### Context Provider (`src/composables/ctx.mjs`)
**Purpose**: Manage unctx-based context creation and injection

**Key Features**:
- Global GitVan context using `createContext()`
- `withGitVan(ctx, fn)` for context injection
- `useGitVan()` for context consumption
- Context isolation and cleanup

**Implementation**:
```javascript
import { createContext } from 'unctx'

const GV = createContext()

export function withGitVan(ctx, fn) {
  return GV.call(ctx, fn)
}

export function useGitVan() {
  return GV.use()
}
```

### Git Composable (`src/composables/git.mjs`)
**Purpose**: Provide comprehensive Git operations through composable interface

**Key Operations**:
- Git command execution with repository context
- Note operations for metadata storage
- Reference management for locking
- Worktree-aware operations

**Implementation Strategy**:
- Use `useGitVan()` to get repository context
- Wrap `execSync` with proper working directory
- Provide specialized methods for common operations
- Include shell escaping for safety

### Template Composable (`src/composables/template.mjs`)
**Purpose**: Nunjucks template rendering with Git context injection

**Key Features**:
- Lazy environment initialization
- Automatic Git context and timestamp injection
- File output with directory creation
- Deterministic helper functions

**Template Context**:
```javascript
{
  nowISO: string,      // ISO timestamp
  git: object,         // Full Git context
  ...userData          // User-provided data
}
```

### Execution Composable (`src/composables/exec.mjs`)
**Purpose**: Programmatic access to execution engine within jobs

**Execution Types Supported**:
- `cli(cmd, args, env)` - Shell command execution
- `js(module, export, input)` - JavaScript module execution
- `tmpl(spec)` - Template rendering execution

## Implementation Details

### Context Flow
1. Daemon creates execution context with Git state
2. `withGitVan(context, jobFunction)` injects context
3. Job calls composables (e.g., `useGit()`, `useTemplate()`)
4. Composables call `useGitVan()` to access injected context
5. Context automatically cleaned up after job completion

### Error Handling Strategy
- Fail fast with descriptive error messages
- Validate context availability in each composable
- Propagate underlying errors with context information
- Provide development-friendly error traces

### Performance Optimizations
- Cache Nunjucks environment per execution context
- Reuse Git command execution patterns
- Minimize unctx overhead through direct access patterns
- Lazy initialization of expensive resources

## Module Structure

```
src/composables/
├── index.mjs          # Public exports and re-exports
├── ctx.mjs            # unctx context management
├── git.mjs            # Git operations composable
├── template.mjs       # Nunjucks template composable
└── exec.mjs           # Execution utilities composable
```

## Data Flow Patterns

### Context Injection Pattern
```javascript
// Daemon runtime
const context = { root: '/repo', head: 'abc123', ... }
const result = await withGitVan(context, async () => {
  return await jobModule.run()
})
```

### Composable Usage Pattern
```javascript
// Within job execution
export async function run() {
  const git = useGit()           // Get Git operations
  const tmpl = useTemplate()     // Get template engine

  const commits = git.run('log --oneline -10')
  const content = tmpl.render('changelog.njk', { commits })

  return { ok: true, artifact: content }
}
```

### Nested Context Pattern
```javascript
// Composable composition
export function useAdvancedGit() {
  const git = useGit()           // Base Git operations
  const gv = useGitVan()         // Full context access

  return {
    ...git,
    advancedOperation() {
      // Custom logic using base operations
      return git.run(`custom-command --root ${gv.root}`)
    }
  }
}
```

## Testing Strategy

### Unit Testing Approach
- Mock unctx context for isolated testing
- Provide test utilities for context creation
- Test each composable independently
- Validate error conditions and edge cases

### Integration Testing
- Test full context injection workflow
- Validate concurrent execution isolation
- Test real Git operations with test repositories
- Verify template rendering with actual templates

### Test Utilities
```javascript
// Test helper for composable testing
export function withTestContext(context, fn) {
  return withGitVan({
    root: '/tmp/test-repo',
    head: 'test-sha',
    branch: 'main',
    ...context
  }, fn)
}
```

## Migration Strategy

### From Manual Context Passing
- Identify functions that currently receive context parameters
- Refactor to use appropriate composables
- Remove context parameter threading
- Update type definitions

### Backward Compatibility
- Maintain existing APIs during transition period
- Provide migration utilities for common patterns
- Document migration path for each use case
- Support gradual adoption

## Integration Points

### With Execution Engine
- Execution engine calls `withGitVan()` for each job
- Context includes all necessary execution state
- Results flow back through context cleanup

### With Daemon Process
- Daemon creates fresh context for each execution
- Context includes worktree-specific information
- Isolation prevents cross-execution contamination

### With CLI Interface
- CLI commands create minimal context for one-off execution
- Context includes current directory Git state
- Direct execution without daemon overhead