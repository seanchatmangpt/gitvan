# GitVan v2 Core - Technical Implementation Plan

## Architecture Overview

GitVan v2 implements a layered architecture with clear separation between execution, context management, and Git operations. The system uses composables for ergonomic API design while maintaining deterministic execution through Git-native storage.

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Layer                             │
│  gitvan run • gitvan daemon • gitvan list • gitvan worktree │
├─────────────────────────────────────────────────────────────┤
│                    Composables Layer                        │
│     useGit() • useTemplate() • useExec() • useGitVan()     │
├─────────────────────────────────────────────────────────────┤
│                   Job Definition Layer                      │
│        defineJob() • Job Discovery • Metadata Extraction    │
├─────────────────────────────────────────────────────────────┤
│                    Execution Engine                         │
│       cli exec • js exec • llm exec • job exec • tmpl exec │
├─────────────────────────────────────────────────────────────┤
│                      Runtime Layer                          │
│         Context • Daemon • Locks • Worktree Management      │
├─────────────────────────────────────────────────────────────┤
│                       Git Layer                             │
│     refs • notes • worktree list • commit scanning          │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### Context Management (`src/composables/`)
**Purpose**: Provide unified access to Git context and execution utilities

**Key Files**:
- `ctx.mjs`: unctx-based context provider
- `git.mjs`: Git operations composable
- `template.mjs`: Nunjucks template composable
- `exec.mjs`: Execution utilities composable

**Interfaces**:
```javascript
withGitVan(context, function) // Context injection
useGitVan() // Context consumption
useGit() // Git operations
useTemplate() // Template rendering
useExec() // Command execution
```

**Data Flow**: Context flows from daemon → job execution → composables

### Execution Engine (`src/exec.mjs`)
**Purpose**: Execute the five supported execution types with consistent interface

**Key Components**:
- Type dispatch based on `spec.exec` field
- Timeout handling for all execution types
- Result normalization with `{ ok, stdout, stderr, meta }` format
- Environment variable injection

**Interfaces**:
```javascript
runExec(spec, { ctx }) // Main execution entry point
```

### Job Definition (`src/jobs/`)
**Purpose**: Provide declarative job configuration with static analysis support

**Key Features**:
- `defineJob()` factory function
- Metadata extraction for tooling
- Kind-based job classification (atomic/composite)
- Schedule expression support

### Lock Management (`src/runtime/locks.mjs`)
**Purpose**: Prevent concurrent execution conflicts using Git refs

**Key Operations**:
- Lock acquisition with atomic ref creation
- Worktree-scoped lock namespacing
- Automatic timeout and cleanup
- Contention backoff strategy

### Daemon Process (`src/runtime/daemon.mjs`)
**Purpose**: Continuous job execution triggered by Git commits

**Key Features**:
- Commit scanning with configurable lookback
- Job discovery and filtering
- Lock-based concurrency control
- Worktree isolation

## Implementation Phases

### Phase 1: Foundation (Week 1)
1. **Context System**
   - Implement unctx-based context management
   - Create base composables (useGitVan, useGit)
   - Add context injection utilities

2. **Execution Engine Core**
   - Implement `cli` and `js` execution types
   - Add timeout and environment handling
   - Create result normalization

3. **Basic Git Integration**
   - Add Git command execution utilities
   - Implement commit scanning
   - Create ref and note operations

### Phase 2: Core Features (Week 2)
1. **Template Engine**
   - Integrate Nunjucks with deterministic helpers
   - Add template composable (useTemplate)
   - Implement file output handling

2. **Job Definition System**
   - Create defineJob() factory
   - Add metadata extraction
   - Implement job discovery scanning

3. **Lock Management**
   - Implement Git ref-based locking
   - Add worktree scope isolation
   - Create timeout and cleanup logic

### Phase 3: Advanced Features (Week 3)
1. **Daemon Implementation**
   - Create worktree-aware daemon process
   - Add job scheduling and execution
   - Implement graceful shutdown

2. **CLI Interface**
   - Build citty-based CLI commands
   - Add job execution interface
   - Create daemon management commands

3. **LLM Integration**
   - Implement `llm` execution type
   - Add provider abstraction
   - Create prompt templating

## Module Structure

```
src/
├── composables/          # unctx-based composables
│   ├── index.mjs        # Public exports
│   ├── ctx.mjs          # Context management
│   ├── git.mjs          # Git operations
│   ├── template.mjs     # Nunjucks templates
│   └── exec.mjs         # Execution utilities
├── runtime/             # Core runtime systems
│   ├── daemon.mjs       # Daemon process
│   ├── locks.mjs        # Distributed locking
│   └── boot.mjs         # Context bootstrap
├── jobs/                # Job definition utilities
│   └── define.mjs       # defineJob factory
├── exec.mjs             # Execution engine
├── cli.mjs              # CLI commands
└── index.mjs            # Main exports
```

## Data Models

### Execution Context
```javascript
{
  root: string,           // Repository root
  worktreeRoot: string,   // Worktree root (if different)
  head: string,           // Current HEAD SHA
  branch: string,         // Current branch
  env: object,            // Environment variables
  now: function,          // Timestamp function
  worktree: {             // Worktree metadata
    id: string,
    branch: string
  }
}
```

### Job Definition
```javascript
{
  kind: 'atomic' | 'composite',
  meta: {
    desc: string,
    schedule?: string,
    tags?: string[]
  },
  run: function,          // Main execution function
  validate?: function     // Optional validation
}
```

### Execution Result
```javascript
{
  ok: boolean,
  stdout?: string,
  stderr?: string,
  artifact?: string,      // Output file path
  meta?: object          // Additional metadata
}
```

## Technology Decisions

### JavaScript over TypeScript
- **Rationale**: Eliminate build step complexity
- **Trade-off**: Runtime vs compile-time safety
- **Mitigation**: Provide .d.ts files for development

### unctx for Composables
- **Rationale**: Battle-tested context management from Nuxt ecosystem
- **Alternative**: Manual context passing
- **Benefits**: Ergonomic API, automatic context injection

### Git-native Storage
- **Rationale**: No external dependencies, portable
- **Trade-off**: Limited query capabilities vs simplicity
- **Benefits**: Zero configuration, works with existing Git workflows

### Single Package Structure
- **Rationale**: Simplify distribution and versioning
- **Alternative**: Monorepo with multiple packages
- **Benefits**: Easier maintenance, clearer API boundaries