# GitVan v2 Core - Functional Requirements

## Core Capabilities

### Job Definition and Discovery
- Support defineJob() pattern for declarative job configuration
- Enable static analysis of job metadata (kind, description, schedule)
- Provide job discovery through filesystem scanning
- Support atomic and composite job types

### Execution Engine
- Execute five distinct execution types:
  - `cli`: Shell command execution with environment and timeout control
  - `js`: JavaScript module execution with import resolution
  - `llm`: Language model integration with configurable providers
  - `job`: Recursive job execution for composition
  - `tmpl`: Nunjucks template rendering with file output

### Git Integration
- Read Git context (HEAD, branch, commit history)
- Store execution metadata in Git notes
- Use Git refs for distributed locking
- Support worktree-aware operations

### Context Management
- Provide unified context through composables
- Inject Git context, environment variables, and configuration
- Support context isolation between concurrent executions

## Data Management

### Execution Context
- Repository root path
- Current HEAD commit SHA
- Active branch name
- Environment variables
- Execution timestamp

### Job Metadata
- Job kind (atomic/composite)
- Description and tags
- Schedule expressions
- Execution requirements

### Lock Management
- Distributed locks using Git refs
- Worktree-scoped lock namespacing
- Automatic lock cleanup and timeout

## Interface Requirements

### CLI Interface
- Job execution: `gitvan run <job-name>`
- Daemon management: `gitvan daemon start/stop`
- Job discovery: `gitvan list`
- Worktree operations: `gitvan worktree:list`

### Programmatic Interface
- Composables: `useGit()`, `useTemplate()`, `useExec()`
- Job definition: `defineJob(config)`
- Context injection: `withGitVan(ctx, fn)`

## Performance Requirements

- Job discovery scan: < 500ms for 1000 jobs
- Context initialization: < 50ms
- Lock acquisition: < 100ms under contention
- Template compilation: < 10ms for typical templates

## Constraints

### Technical Constraints
- Pure JavaScript runtime (no TypeScript compilation required)
- Single package structure
- Git repository dependency
- Node.js 18+ requirement

### Operational Constraints
- Daemon process per worktree
- Lock timeout maximum of 5 minutes
- Maximum 50 jobs per daemon tick
- Memory limit of 100MB per daemon

## Dependencies

### Internal Dependencies
- Composables system depends on execution engine
- Daemon depends on lock management
- Template engine depends on Git context
- CLI depends on all core modules

### External Dependencies
- `nunjucks` for template rendering
- `unctx` for composables system
- `pathe` for cross-platform path handling
- `citty` for CLI framework