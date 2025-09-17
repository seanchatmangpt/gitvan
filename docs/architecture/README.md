# GitVan v2 Architecture Overview

GitVan v2 is a production-ready Git-native automation platform built on modern UnJS ecosystem foundations. This architecture document outlines the core design principles, component interactions, and integration patterns that make GitVan a reliable, performant automation solution.

## Core Architecture Principles

### 1. Git-Native Design Philosophy

GitVan leverages Git's native capabilities as its foundation:

- **Atomic Operations**: Uses Git refs for distributed locking (`refs/gitvan/locks`)
- **Audit Trail**: Execution receipts stored as Git notes (`refs/notes/gitvan/results`)
- **Worktree Isolation**: Full isolation between parallel execution contexts
- **Deterministic State**: UTC timezone and C locale for reproducible operations

### 2. UnJS Ecosystem Integration

Built on proven UnJS libraries for enterprise reliability:

```javascript
// Core UnJS Dependencies
import { createContext } from 'unctx'      // Context management
import { createHooks } from 'hookable'     // Event-driven architecture
import { parseArgs } from 'citty'          // CLI framework
import { loadConfig } from 'c12'           // Configuration system
import { defu } from 'defu'                // Configuration merging
```

### 3. Event-Driven Architecture

GitVan uses a sophisticated event routing system:

- **File-based Event Discovery**: Events defined in filesystem hierarchy
- **Pattern Matching**: Support for 43+ workflow patterns
- **Worktree-aware Processing**: Isolated execution per Git worktree
- **Lock-based Coordination**: Prevents duplicate executions

## System Components

### Runtime Core (`src/runtime/`)

The runtime provides the execution foundation:

```
src/runtime/
├── boot.mjs         # Context-aware job execution
├── daemon.mjs       # Multi-worktree daemon loop
├── events.mjs       # Event discovery and matching
├── locks.mjs        # Git-based atomic locking
├── receipt.mjs      # Execution audit system
└── config.mjs       # Configuration loading
```

**Key Features:**
- Context isolation using `unctx`
- Atomic lock acquisition with Git refs
- Structured execution receipts
- Multi-worktree coordination

### Composables System (`src/composables/`)

Reusable, context-aware composables:

```
src/composables/
├── ctx.mjs          # Global context management
├── git.mjs          # Git operations with deterministic env
├── template.mjs     # Nunjucks template engine
├── exec.mjs         # Command execution utilities
└── index.mjs        # Composable exports
```

**Design Patterns:**
- **Context Binding**: All composables are context-aware
- **Deterministic Environment**: UTC timezone, C locale
- **Error Boundaries**: Graceful handling of Git edge cases
- **POSIX-first**: No external Git dependencies

### Event Router (`src/router/`)

Sophisticated pattern matching for Git events:

```
src/router/
├── events.mjs       # Event routing logic
└── matchers/
    ├── path.mjs     # File path patterns
    ├── tag.mjs      # Git tag patterns
    ├── merge.mjs    # Merge detection
    └── commit.mjs   # Commit message patterns
```

## Plugin Architecture with Hooks

GitVan uses `hookable` for extensible plugin architecture:

### Hook Points

1. **Pre-execution Hooks**
   - Context preparation
   - Environment validation
   - Resource allocation

2. **Execution Hooks**
   - Job lifecycle management
   - Progress reporting
   - Error handling

3. **Post-execution Hooks**
   - Result processing
   - Cleanup operations
   - Audit logging

### Plugin Integration

```javascript
// Plugin Example
export default definePlugin({
  name: 'my-plugin',
  setup(hooks) {
    hooks.hook('job:before', async (context) => {
      // Pre-execution logic
    })

    hooks.hook('job:after', async (result) => {
      // Post-execution logic
    })
  }
})
```

## Configuration System

GitVan uses `c12` for robust configuration management:

### Configuration Hierarchy

1. **Built-in Defaults** (`src/config/defaults.mjs`)
2. **Project Config** (`gitvan.config.{js,mjs,json}`)
3. **Environment Variables**
4. **Runtime Options**

### Configuration Schema

```javascript
// Configuration Structure
{
  events: {
    directory: 'events',           // Event definitions
    patterns: ['**/*.mjs']         // Event file patterns
  },
  templates: {
    dirs: ['templates'],           // Template directories
    autoescape: false,             // HTML escaping
    noCache: true                  // Development mode
  },
  daemon: {
    pollMs: 1500,                  // Polling interval
    lookback: 600,                 // Commit lookback (seconds)
    maxPerTick: 50                 // Max events per cycle
  },
  locks: {
    root: 'refs/gitvan/locks',     // Lock reference root
    timeout: 30000                 // Lock timeout (ms)
  },
  receipts: {
    ref: 'refs/notes/gitvan/results' // Audit trail location
  }
}
```

## Workflow Patterns Support

GitVan supports 43+ workflow patterns through its event system:

### Event Types

1. **Time-based**: Cron scheduling
2. **Git Events**: Push, merge, tag creation
3. **Path Events**: File/directory changes
4. **Content Events**: Commit message patterns
5. **Author Events**: Developer-specific triggers

### Pattern Examples

```bash
# File-based Event Patterns
events/
├── cron/0_3_*_*_*.mjs           # Daily at 3 AM
├── merge-to/main.mjs            # Merges to main branch
├── push-to/release/*.mjs        # Pushes to release branches
├── path-changed/src/[...].mjs   # Source code changes
└── tag/semver.mjs               # Semantic version tags
```

## Deterministic Execution

GitVan ensures reproducible automation:

### Environment Standardization

```javascript
// Deterministic Git Environment
const env = {
  ...process.env,
  TZ: "UTC",        // UTC timezone
  LANG: "C",        // C locale
}
```

### Execution Context

```javascript
// Context Structure
{
  repoRoot: '/path/to/repo',
  worktreeRoot: '/path/to/worktree',
  env: { /* standardized environment */ },
  now: () => '2024-01-01T00:00:00.000Z',
  payload: { /* event data */ }
}
```

## Performance Characteristics

### Scalability Features

- **Multi-worktree Support**: Parallel execution across Git worktrees
- **Lock-based Coordination**: Prevents resource conflicts
- **Event Batching**: Efficient processing of multiple events
- **Template Caching**: Optimized template compilation

### Resource Management

- **Memory Efficiency**: Minimal memory footprint per worktree
- **CPU Utilization**: Non-blocking I/O with async/await
- **Disk I/O**: Efficient Git operations with native commands
- **Network**: Optional external integrations (LLM, webhooks)

## Security Model

### Isolation Boundaries

1. **Worktree Isolation**: Physical separation of execution contexts
2. **Process Isolation**: Child processes for external commands
3. **Permission Model**: Standard Unix permissions
4. **Audit Trail**: Complete execution history in Git notes

### Security Features

- **No Shell Injection**: Direct process execution
- **Path Validation**: Secure file operations
- **Environment Sanitization**: Controlled environment variables
- **Git-native Storage**: Leverages Git's integrity guarantees

## Integration Patterns

### CLI Integration

```bash
# GitVan CLI Commands
gitvan daemon start              # Start multi-worktree daemon
gitvan events scan              # Discover events
gitvan job run <job-name>       # Execute specific job
gitvan audit show              # View execution history
```

### Programmatic API

```javascript
// Library Usage
import { defineJob, useGit, useTemplate } from 'gitvan'

export default defineJob({
  name: 'my-automation',
  async run({ payload, ctx }) {
    const git = useGit()
    const template = await useTemplate()

    // Automation logic here
    return { ok: true, result: 'success' }
  }
})
```

### External Integrations

- **GitHub Actions**: CI/CD pipeline integration
- **Webhooks**: External service notifications
- **LLM Providers**: AI-powered automation
- **Monitoring**: Metrics and observability

## Reliability Features

### Error Handling

- **Graceful Degradation**: Continues operation on non-critical errors
- **Retry Logic**: Configurable retry mechanisms
- **Circuit Breakers**: Prevents cascade failures
- **Health Checks**: System status monitoring

### Data Consistency

- **Atomic Operations**: Git-level transaction guarantees
- **Lock Coordination**: Prevents race conditions
- **Receipt System**: Complete audit trail
- **State Recovery**: Resumable operations

GitVan v2 represents a mature, production-ready automation platform that leverages Git's native capabilities while providing modern developer experience through the UnJS ecosystem. Its architecture prioritizes reliability, performance, and maintainability for enterprise-scale Git workflow automation.