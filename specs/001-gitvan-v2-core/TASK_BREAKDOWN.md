# GitVan v2 Core - Task Breakdown

## Epic 1: Context Management System

### Task 1.1: unctx Integration
- **Effort**: 4 hours
- **Priority**: High
- **Dependencies**: None
- **Deliverables**:
  - `src/composables/ctx.mjs` with createContext setup
  - `withGitVan()` context injection function
  - `useGitVan()` context consumption function
- **Acceptance Criteria**:
  - [ ] Context can be injected and consumed
  - [ ] Multiple nested contexts work correctly
  - [ ] Context is isolated between concurrent executions

### Task 1.2: Git Operations Composable
- **Effort**: 6 hours
- **Priority**: High
- **Dependencies**: Task 1.1
- **Deliverables**:
  - `src/composables/git.mjs` with Git operations
  - Helper functions for common Git commands
  - Note and ref management utilities
- **Acceptance Criteria**:
  - [ ] Can read HEAD, branch, and commit history
  - [ ] Can write and read Git notes
  - [ ] Can manage Git refs for locking
  - [ ] Worktree detection works correctly

### Task 1.3: Template Composable
- **Effort**: 5 hours
- **Priority**: Medium
- **Dependencies**: Task 1.1
- **Deliverables**:
  - `src/composables/template.mjs` with Nunjucks integration
  - Deterministic helper functions
  - File output utilities
- **Acceptance Criteria**:
  - [ ] Templates render with Git context
  - [ ] Helper functions are deterministic
  - [ ] File output creates directories as needed
  - [ ] Template includes and extends work

## Epic 2: Execution Engine

### Task 2.1: Core Execution Framework
- **Effort**: 8 hours
- **Priority**: High
- **Dependencies**: Task 1.1
- **Deliverables**:
  - `src/exec.mjs` with execution dispatcher
  - Timeout handling mechanism
  - Result normalization
- **Acceptance Criteria**:
  - [ ] Dispatches to correct execution type
  - [ ] Handles timeouts gracefully
  - [ ] Returns consistent result format
  - [ ] Injects environment variables correctly

### Task 2.2: CLI Execution Type
- **Effort**: 3 hours
- **Priority**: High
- **Dependencies**: Task 2.1
- **Deliverables**:
  - CLI command execution with spawnSync
  - Environment variable handling
  - Working directory management
- **Acceptance Criteria**:
  - [ ] Executes shell commands correctly
  - [ ] Captures stdout and stderr
  - [ ] Handles exit codes properly
  - [ ] Respects working directory

### Task 2.3: JavaScript Execution Type
- **Effort**: 4 hours
- **Priority**: High
- **Dependencies**: Task 2.1
- **Deliverables**:
  - Dynamic module import handling
  - Export resolution (default vs named)
  - Input parameter passing
- **Acceptance Criteria**:
  - [ ] Imports modules dynamically
  - [ ] Resolves exports correctly
  - [ ] Passes input parameters
  - [ ] Handles async functions

### Task 2.4: Template Execution Type
- **Effort**: 3 hours
- **Priority**: Medium
- **Dependencies**: Task 1.3, Task 2.1
- **Deliverables**:
  - Template execution integration
  - Data merging with Git context
  - Output file handling
- **Acceptance Criteria**:
  - [ ] Renders templates through execution engine
  - [ ] Merges data with Git context
  - [ ] Writes output files when specified
  - [ ] Returns rendered content

## Epic 3: Job Definition System

### Task 3.1: defineJob Factory
- **Effort**: 4 hours
- **Priority**: Medium
- **Dependencies**: None
- **Deliverables**:
  - `src/jobs/define.mjs` with defineJob function
  - Metadata validation
  - Default value handling
- **Acceptance Criteria**:
  - [ ] Creates job definition objects
  - [ ] Validates required fields
  - [ ] Applies default values
  - [ ] Supports metadata extraction

### Task 3.2: Job Discovery
- **Effort**: 6 hours
- **Priority**: Medium
- **Dependencies**: Task 3.1
- **Deliverables**:
  - Filesystem scanning for job files
  - Metadata extraction
  - Filtering and sorting
- **Acceptance Criteria**:
  - [ ] Discovers jobs from filesystem
  - [ ] Extracts metadata without execution
  - [ ] Filters by kind and tags
  - [ ] Handles nested directories

## Epic 4: Lock Management

### Task 4.1: Git Ref-based Locking
- **Effort**: 6 hours
- **Priority**: High
- **Dependencies**: Task 1.2
- **Deliverables**:
  - `src/runtime/locks.mjs` with lock operations
  - Atomic lock acquisition
  - Lock timeout handling
- **Acceptance Criteria**:
  - [ ] Acquires locks atomically using Git refs
  - [ ] Prevents double-locking
  - [ ] Implements timeout mechanism
  - [ ] Cleans up expired locks

### Task 4.2: Worktree Lock Scoping
- **Effort**: 4 hours
- **Priority**: Medium
- **Dependencies**: Task 4.1
- **Deliverables**:
  - Worktree-scoped lock namespacing
  - Worktree ID generation
  - Cross-worktree lock isolation
- **Acceptance Criteria**:
  - [ ] Scopes locks by worktree
  - [ ] Generates stable worktree IDs
  - [ ] Isolates locks between worktrees
  - [ ] Handles main repository correctly

## Epic 5: Daemon Process

### Task 5.1: Basic Daemon Loop
- **Effort**: 8 hours
- **Priority**: Medium
- **Dependencies**: Task 2.1, Task 4.1
- **Deliverables**:
  - `src/runtime/daemon.mjs` with main loop
  - Commit scanning logic
  - Job execution orchestration
- **Acceptance Criteria**:
  - [ ] Polls for new commits
  - [ ] Discovers and executes jobs
  - [ ] Respects rate limiting
  - [ ] Handles graceful shutdown

### Task 5.2: Worktree Support
- **Effort**: 6 hours
- **Priority**: Low
- **Dependencies**: Task 5.1, Task 4.2
- **Deliverables**:
  - Worktree discovery and enumeration
  - Per-worktree daemon instances
  - Worktree context injection
- **Acceptance Criteria**:
  - [ ] Discovers all worktrees
  - [ ] Runs separate daemon per worktree
  - [ ] Injects worktree context correctly
  - [ ] Handles worktree deletion

## Epic 6: CLI Interface

### Task 6.1: Basic Commands
- **Effort**: 6 hours
- **Priority**: Medium
- **Dependencies**: Task 2.1, Task 3.2
- **Deliverables**:
  - `src/cli.mjs` with citty integration
  - `gitvan run` command
  - `gitvan list` command
- **Acceptance Criteria**:
  - [ ] Runs individual jobs
  - [ ] Lists available jobs
  - [ ] Shows job metadata
  - [ ] Handles command-line arguments

### Task 6.2: Daemon Management
- **Effort**: 4 hours
- **Priority**: Low
- **Dependencies**: Task 5.1, Task 6.1
- **Deliverables**:
  - `gitvan daemon start` command
  - `gitvan daemon stop` command
  - Process management utilities
- **Acceptance Criteria**:
  - [ ] Starts daemon process
  - [ ] Stops daemon gracefully
  - [ ] Shows daemon status
  - [ ] Handles multiple worktrees

## Epic 7: LLM Integration

### Task 7.1: LLM Execution Type
- **Effort**: 8 hours
- **Priority**: Low
- **Dependencies**: Task 2.1
- **Deliverables**:
  - LLM provider abstraction
  - Prompt template handling
  - Response processing
- **Acceptance Criteria**:
  - [ ] Supports multiple LLM providers
  - [ ] Handles prompt templating
  - [ ] Processes responses consistently
  - [ ] Manages API credentials securely

## Cross-cutting Tasks

### Task X.1: Type Definitions
- **Effort**: 4 hours
- **Priority**: Medium
- **Dependencies**: All core tasks
- **Deliverables**:
  - TypeScript definition files
  - JSDoc annotations
  - API documentation
- **Acceptance Criteria**:
  - [ ] Provides complete type coverage
  - [ ] Enables IDE autocomplete
  - [ ] Documents all public APIs
  - [ ] Maintains consistency

### Task X.2: Testing Infrastructure
- **Effort**: 6 hours
- **Priority**: Medium
- **Dependencies**: All core tasks
- **Deliverables**:
  - Test framework setup
  - Core functionality tests
  - Integration test suite
- **Acceptance Criteria**:
  - [ ] Tests all execution types
  - [ ] Validates lock management
  - [ ] Tests daemon functionality
  - [ ] Achieves >80% coverage

## Timeline Estimate

**Total Effort**: 87 hours (~11 working days)

**Critical Path**:
1. Context Management (10 hours)
2. Execution Engine (18 hours)
3. Lock Management (10 hours)
4. Basic CLI (6 hours)

**Minimum Viable Product**: 44 hours (5.5 days)
**Full Feature Set**: 87 hours (11 days)