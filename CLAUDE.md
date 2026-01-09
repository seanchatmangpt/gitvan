# CLAUDE.md - GitVan Developer Guide for AI Assistants

This document provides comprehensive guidance for AI assistants working on the GitVan codebase. It covers architecture, development workflows, key conventions, and patterns used throughout the project.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Core Patterns](#architecture--core-patterns)
3. [Codebase Structure](#codebase-structure)
4. [Key Modules & Their Responsibilities](#key-modules--their-responsibilities)
5. [Development Workflow](#development-workflow)
6. [Code Style & Conventions](#code-style--conventions)
7. [Testing Strategy](#testing-strategy)
8. [Configuration Management](#configuration-management)
9. [Common Tasks & Patterns](#common-tasks--patterns)
10. [Important Async Patterns](#important-async-patterns)

---

## Project Overview

**GitVan v3.0.0** is a Git-native development automation platform that brings Git into your workflow system. It enables:

- **Git-Native Workflows**: Define workflows in `.ttl` (Turtle) files, trigger on Git events (commit, push, merge)
- **Semantic Graph Technology**: Uses RDF/Turtle for queryable workflows with federated SPARQL queries
- **Hidden Complexity**: Semantic graphs are abstracted - users interact with familiar Git concepts
- **Performance Tracking**: Built-in SLO tracking, metrics collection, and immutable audit trails
- **Workflow Version Control**: Workflows are version-controlled in the repository alongside code

### Technology Stack

- **Runtime**: Node.js 18+, ES Modules only (no CommonJS)
- **CLI**: Citty (modern CLI framework)
- **Context**: unctx (async context preservation - **critical**)
- **Configuration**: c12 (Nitro-style config loading)
- **RDF/Semantic**: unrdf (RDF parsing and SPARQL queries)
  - **Important**: unrdf is managed as a **git submodule** at `vendor/unrdf/`
  - Allows active co-development and source-level debugging
  - Must be initialized: `git submodule update --init --recursive`
  - See [Submodule Setup Guide](docs/SUBMODULE_SETUP.md) for details
- **Templating**: nunjucks (template rendering)
- **Hooks**: hookable (extensibility system)
- **AI**: ai package (multi-provider support: Anthropic, Ollama)
- **Git**: isomorphic-git (programmatic Git operations)
- **Testing**: vitest (unit testing)
- **Build**: unbuild (bundling)

#### Why UnRDF is a Git Submodule

GitVan uses UnRDF as a git submodule rather than an npm dependency for several strategic reasons:

1. **Active Co-Development**: UnRDF is being developed in tandem with GitVan. Changes in one often require changes in the other.
2. **Source-Level Integration**: Having the full source allows for deeper integration and debugging across repository boundaries.
3. **Version Control**: Pin to specific commits for stability while easily updating when ready.
4. **Build Pipeline**: UnRDF must be built before GitVan during the build process.
5. **No Publish Cycle**: Test changes immediately without publish/install overhead.

**For AI Agents**: When working with GitVan:
- Always run `npm run setup-dev` first to initialize submodules
- If modifying UnRDF code, work in `vendor/unrdf/` directory
- Build UnRDF before building GitVan: `npm run build:unrdf && npm run build`
- Test integration after UnRDF changes: `npm test`
- See [Submodule Setup Guide](docs/SUBMODULE_SETUP.md) for complete workflow

### Key Statistics

- 280 source files (.mjs modules)
- 310 test files (comprehensive coverage)
- 54+ AI agents defined in `.claude/`
- Target: 80% test coverage (branches, functions, lines, statements)

---

## Architecture & Core Patterns

### 1. Composable Pattern (Vue-inspired)

All reusable logic is exported as **composables** (`use*` functions) that:
- Return objects containing methods and state
- Are **context-aware** via unctx (critical for async operations)
- Are **deterministic** (no random values, timestamps, or side effects)
- Handle both synchronous and asynchronous operations

Example:
```javascript
// composables/git.mjs
export function useGit() {
  return {
    async status() { /* ... */ },
    async commit(msg) { /* ... */ },
    async branch(name) { /* ... */ }
  }
}

// Usage
import { useGit } from "src/composables/git.mjs";
const git = useGit();
const status = await git.status();
```

### 2. Context-First Architecture

**Critical Concept**: GitVan uses `unctx` for async-safe context preservation.

- **unctx**: Preserves context across `await` calls in async operations
- **withGitVan()**: Wrapper that establishes proper context
- **Deterministic Environment**: All operations run with `TZ=UTC`, `LANG=C`
- **Async Safety**: Context is lost if you `await` without proper wrapping

**Every composable operation must be wrapped:**
```javascript
import { withGitVan, useGit } from "gitvan";

await withGitVan(context, async () => {
  const git = useGit();
  const status = await git.status(); // ✓ Context preserved
});

// NEVER do this:
const git = useGit();
await someAsyncCall(); // ✗ Context lost after await!
git.status(); // ✗ Fails - context is gone
```

### 3. Git-Native Storage

GitVan stores everything in Git, not in external databases:

- **Git Refs**: Store workflow definitions and state
- **Git Notes** (`refs/notes/gitvan/audit`): Audit trails and metadata
- **Git Branches**: Isolate worktree operations
- **Atomic Transactions**: Git ensures all-or-nothing semantics

This design provides:
- No external dependencies
- Version control of all state
- Cryptographic signing
- Atomic operations

### 4. RDF/Semantic Graphs

Behind the scenes, GitVan uses semantic graphs:

- **Turtle Format** (`.ttl`): Human-readable RDF definitions
- **SPARQL Queries**: Federated querying capability
- **Reactive Hooks**: Automatic triggers on state changes (knowledge hooks)
- **Graph Ontology**: `/src/rdf/git-ontology.ttl` defines Git concepts

The complexity is abstracted - users interact with Git commands while graphs work behind the scenes.

### 5. DAG-Based Workflow Execution

- **Dependency Resolution**: Workflow planner creates DAG before execution
- **Parallel Execution**: Steps with no dependencies run in parallel
- **Error Isolation**: Single step failure doesn't cascade
- **Audit Trail**: Every step execution is recorded

### 6. Pack System (Plugin Architecture)

Packs are bundled collections of:
- Templates (Nunjucks)
- Jobs (background tasks)
- Workflows (DAG definitions)
- Dependencies on other packs

Key files: `/src/pack/manager.mjs`, `/src/pack/planner.mjs`, `/src/pack/scaffold.mjs`

### 7. Multi-Provider AI Integration

- **Provider Abstraction**: Easy switching between Anthropic, Ollama, etc.
- **Context-Aware**: AI has access to repo, workflow, and Git context
- **Learning Loop**: Learns from templates and previous executions
- **Feedback Integration**: Improves over time

Location: `/src/ai/`

---

## Codebase Structure

```
/home/user/gitvan/
├── src/                              # Main source (280 .mjs files)
│   ├── cli.mjs                       # Main CLI entry point
│   ├── cli/                          # CLI commands (Citty-based)
│   │   ├── cli.mjs                   # CLI definition
│   │   └── commands/                 # Subcommands: daemon, event, cron, etc.
│   ├── composables/                  # Core reusable operations (use*)
│   │   ├── git.mjs                   # Git operations
│   │   ├── file-system.mjs           # File operations
│   │   ├── template.mjs              # Nunjucks rendering
│   │   ├── worktree.mjs              # Git worktree management
│   │   ├── job.mjs                   # Job system
│   │   ├── event.mjs                 # Event triggering
│   │   └── [others...]               # lock, receipt, pack, registry, etc.
│   ├── core/                         # Core infrastructure
│   │   ├── context.mjs               # GitVan context (unctx-based)
│   │   ├── hookable.mjs              # Hook system
│   │   ├── job-registry.mjs          # Job registration
│   │   └── graph-architecture.mjs    # Semantic graph setup
│   ├── workflow/                     # Workflow execution engine
│   │   ├── workflow-engine.mjs       # Main execution engine
│   │   ├── workflow-parser.mjs       # Turtle/RDF parser
│   │   ├── dag-planner.mjs           # Dependency resolution
│   │   ├── step-runner.mjs           # Individual step execution
│   │   ├── context-manager.mjs       # Workflow context
│   │   └── step-handlers/            # Step type handlers
│   ├── git-lifecycle/                # Git event capture
│   │   ├── GitEventCapture.mjs       # Captures commit/push/merge
│   │   ├── GitEventStore.mjs         # Event history storage
│   │   └── EventQueue.mjs            # Async queue
│   ├── git-native/                   # Pure Git-based I/O (no DB)
│   │   ├── GitNativeIO.mjs           # Main interface
│   │   ├── LockManager.mjs           # Distributed locking
│   │   ├── SnapshotStore.mjs         # State snapshots
│   │   ├── QueueManager.mjs          # Event queueing
│   │   └── WorkerPool.mjs            # Async execution pool
│   ├── hooks/                        # Knowledge hook system
│   │   ├── HookParser.mjs            # Turtle hook parsing
│   │   ├── HookOrchestrator.mjs      # Execution orchestration
│   │   └── PredicateEvaluator.mjs    # RDF predicate evaluation
│   ├── unrdf-hooks/                  # State management (UnRDF)
│   │   ├── composable.mjs            # Hook composables
│   │   ├── cache.mjs                 # Caching system
│   │   └── repository.mjs            # Repository operations
│   ├── rdf/                          # RDF utilities
│   │   ├── git-ontology.ttl          # RDF schema for Git
│   │   └── [utilities...]            # SPARQL, TTL parsers
│   ├── ai/                           # AI integration
│   │   ├── provider.mjs              # Provider abstraction
│   │   ├── provider-factory.mjs      # Factory (Anthropic, Ollama)
│   │   ├── context-aware-generation  # Code generation
│   │   └── prompts/                  # Structured prompts
│   ├── pack/                         # Pack system
│   │   ├── pack.mjs                  # Pack definition
│   │   ├── manager.mjs               # Lifecycle management
│   │   ├── planner.mjs               # Dependency resolution
│   │   ├── marketplace.mjs           # Pack discovery
│   │   └── security/                 # Signing & verification
│   ├── jobs/                         # Background jobs
│   │   ├── runner.mjs                # Job execution
│   │   └── scan.mjs                  # Job discovery
│   ├── config/                       # Configuration loading
│   │   ├── loader.mjs                # c12-based loader
│   │   ├── defaults.mjs              # Default values
│   │   └── runtime-config.mjs        # Normalization
│   ├── runtime/                      # System runtime
│   │   ├── boot.mjs                  # Initialization
│   │   ├── daemon.mjs                # Background daemon
│   │   ├── locks.mjs                 # Lock utilities
│   │   └── events.mjs                # Event system
│   ├── templates/                    # Nunjucks templates
│   ├── pages/                        # Web pages (if applicable)
│   ├── utils/                        # Utility functions
│   ├── performance/                  # Performance metrics
│   ├── telemetry/                    # Telemetry collection
│   └── [others...]                   # Additional modules
├── tests/                            # Comprehensive test suite (310 files)
│   ├── bdd/                          # BDD tests
│   ├── citty-test-utils/             # CLI testing utilities
│   └── composables/                  # Composable tests
├── .claude/                          # Claude Code configuration
│   ├── agents/                       # 54+ AI agents
│   ├── commands/                     # Slash commands (workflows)
│   ├── helpers/                      # Helper utilities
│   └── settings.json                 # Claude Flow configuration
├── bin/                              # Entry points
│   ├── gitvan.mjs                    # CLI entry
│   └── git-hook-handler.mjs          # Git hook handler
├── hooks/                            # Git hook definitions
├── docs/                             # User documentation
├── examples/                         # Working examples
├── packs/                            # Pre-built packs (plugins)
├── jobs/                             # Job directory (scanned)
├── templates/                        # Template directory (scanned)
├── graph/                            # RDF graph storage
├── vitest.config.mjs                 # Test configuration
├── gitvan.config.js                  # Main project configuration
├── build.config.ts                   # Build configuration
├── .cursorrules                      # Development guidelines (248 lines)
└── package.json                      # Dependencies & scripts
```

---

## Key Modules & Their Responsibilities

### Composables (src/composables/)

These are the primary API for working with GitVan functionality:

| Module | Purpose | Key Methods |
|--------|---------|-------------|
| **git.mjs** | Git operations | `status()`, `commit()`, `branch()`, `merge()`, `worktree()`, `refs()`, `notes()`, `push()`, `pull()` |
| **file-system.mjs** | File operations | `read()`, `write()`, `delete()`, `list()`, `exists()` |
| **template.mjs** | Nunjucks rendering | `render()`, `compile()`, `addFilter()` |
| **worktree.mjs** | Git worktree management | `create()`, `remove()`, `list()`, `prune()` |
| **job.mjs** | Job system | `scan()`, `execute()`, `schedule()` |
| **event.mjs** | Event triggering | `emit()`, `on()`, `once()` |
| **receipt.mjs** | Audit trail | `write()`, `read()`, `verify()` |
| **lock.mjs** | Distributed locking | `acquire()`, `release()`, `extend()` |
| **pack.mjs** | Pack management | `install()`, `remove()`, `list()` |
| **registry.mjs** | Component registry | `register()`, `get()`, `list()` |

**All composables must be used within `withGitVan()` context!**

### Workflow System (src/workflow/)

- **workflow-engine.mjs**: Main DAG executor
- **workflow-parser.mjs**: Parses Turtle/.ttl workflow definitions
- **dag-planner.mjs**: Builds dependency graph, resolves order
- **step-runner.mjs**: Executes individual workflow steps
- **step-handlers/**: Different handlers for step types (script, template, hook, etc.)

### Git Lifecycle (src/git-lifecycle/)

Captures Git events and triggers workflows:
- Commit events
- Push events
- Merge events
- Branch creation/deletion

### RDF/Semantic (src/rdf/, src/unrdf-hooks/)

- **git-ontology.ttl**: RDF schema defining Git concepts
- **unrdf-hooks/**: State management using UnRDF reactive hooks
- SPARQL query support for federated lookups

### AI Integration (src/ai/)

Multi-provider support:
- **Provider Factory**: Switch providers via configuration
- **Context-Aware**: AI has access to repo context
- **Learning**: Feedback loop from executions
- **Prompts**: Structured prompt templates

### Pack System (src/pack/)

Plugin-like system for bundled functionality:
- Templates, jobs, workflows in single package
- Dependency resolution between packs
- Marketplace for sharing/discovery
- Security: Signing and verification

---

## Development Workflow

### Setup

#### Quick Setup (Recommended)

```bash
# Clone the repository
git clone <repo-url>
cd gitvan

# Run automated setup (handles submodules, dependencies, and build)
npm run setup-dev
```

**What `setup-dev` does:**
1. Initializes and clones all git submodules (`git submodule update --init --recursive`)
2. Installs GitVan's dependencies
3. Installs and builds UnRDF submodule at `vendor/unrdf/`
4. Builds GitVan

#### Manual Setup

```bash
# Clone the repository
git clone <repo-url>
cd gitvan

# Initialize submodules (IMPORTANT!)
git submodule update --init --recursive

# Install dependencies
npm install

# Build UnRDF submodule
npm run build:unrdf

# Build the project
npm run build

# Run tests
npm test
```

**Critical**: GitVan uses UnRDF as a git submodule at `vendor/unrdf/`. You **must** initialize submodules before building. See [Submodule Setup Guide](docs/SUBMODULE_SETUP.md) for troubleshooting.

### Development Process

1. **Create a feature branch** from the designated branch
2. **Make changes** following conventions (see below)
3. **Write/update tests** (TDD: test before implementation)
4. **Run tests** to ensure 80%+ coverage
5. **Build** to check for errors
6. **Commit** with clear, descriptive messages
7. **Push** to your feature branch
8. **Create PR** with detailed description

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test tests/composables/git.test.mjs

# Run with coverage
npm test -- --coverage

# Run BDD tests
npm run test:bdd

# Watch mode
npm test -- --watch
```

### Build

```bash
npm run build

# Outputs to:
# - dist/cli.mjs
# - dist/bin/gitvan.mjs
```

### Linting

```bash
npm run lint

# ESLint configuration: eslint.config.mjs
# Prettier formatting: .prettierrc
```

---

## Code Style & Conventions

### File Organization Rules

```
✓ /src - Source code
✓ /tests - Test files
✓ /docs - Documentation
✓ /config - Configuration files
✓ /scripts - Utility scripts
✓ /examples - Example code
✗ Root folder - NO working files here
```

### ES Modules Only

- **No CommonJS**: All code uses ES modules (`import`/`export`)
- **File Extensions**: Always use `.mjs` for module files
- **External Dependencies**: Listed in `package.json`

### Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| **Composables** | `use` prefix | `useGit`, `useTemplate`, `useJob` |
| **Classes** | PascalCase | `WorkflowEngine`, `GitNativeIO`, `LockManager` |
| **Functions** | camelCase | `parseWorkflow()`, `executeStep()` |
| **Constants** | UPPER_SNAKE_CASE | `DEFAULT_TIMEOUT`, `MAX_RETRIES` |
| **Private functions** | `#prefix` or leading `_` | `#parseInternal()` |
| **Test files** | `*.test.mjs` or `*.spec.mjs` | `git.test.mjs` |

### Code Organization

**Keep files under 500 lines**. Break large modules into smaller focused files:

```javascript
// ✓ Good: Multiple focused files
src/pack/
  ├── pack.mjs          (150 lines)
  ├── manager.mjs       (200 lines)
  ├── planner.mjs       (180 lines)
  └── marketplace.mjs   (170 lines)

// ✗ Bad: Single monolithic file (1000+ lines)
src/pack.mjs           (1000 lines)
```

### Avoid Over-Engineering

- **Don't add features** beyond what was requested
- **Don't refactor** unrelated code during bug fixes
- **Don't add docstrings** to unchanged code
- **Don't add comments** for self-evident logic
- **Don't add error handling** for impossible scenarios
- **No premature abstractions** - Three similar lines of code is OK
- **Trust internal code** - Validate only at system boundaries

### No Hardcoded Secrets

- All configuration via environment variables or `gitvan.config.js`
- No API keys, tokens, or secrets in code
- Use `process.env` or config loading for sensitive data

### Deterministic Operations

- **No random values** in generation or output
- **No timestamps** unless explicitly needed
- **Environment normalized**: `TZ=UTC`, `LANG=C`
- **Same input = Same output** always

---

## Testing Strategy

### Framework & Configuration

- **Framework**: Vitest (fast unit testing)
- **Config Files**:
  - `vitest.config.mjs` - Main test config
  - `vitest.bdd.config.mjs` - BDD tests
  - `vitest.citty-test-utils.config.mjs` - CLI testing

### Test Organization

```
tests/
├── bdd/                      # BDD/integration tests
├── citty-test-utils/         # CLI testing utilities
├── composables/              # Composable unit tests
│   ├── git.test.mjs
│   ├── template.test.mjs
│   └── [others...]
└── [domain]/                 # Domain-specific tests
    └── [module].test.mjs
```

### Writing Tests

**TDD: Always write tests BEFORE implementation**

```javascript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { withGitVan } from "gitvan";

describe("useGit composable", () => {
  let gitVanContext;

  beforeEach(async () => {
    // Setup
    gitVanContext = createTestContext();
  });

  afterEach(async () => {
    // Cleanup
  });

  it("should perform git status", async () => {
    await withGitVan(gitVanContext, async () => {
      const git = useGit();
      const status = await git.status();

      expect(status).toBeDefined();
      expect(status.branch).toBe("main");
    });
  });

  it("should handle git errors", async () => {
    await withGitVan(gitVanContext, async () => {
      const git = useGit();

      expect(async () => {
        await git.commit("message"); // No staged changes
      }).rejects.toThrow();
    });
  });
});
```

### Test Coverage Requirements

Target: **80% minimum** across:
- Branches (decision points)
- Functions (all functions called)
- Lines (all lines executed)
- Statements (all statements executed)

### Testing Patterns

**Context Wrapper Pattern:**
```javascript
// ✓ CORRECT - Context preserved
import { withGitVan, useGit } from "gitvan";

await withGitVan(context, async () => {
  const git = useGit();
  await git.status();
});

// ✗ WRONG - Context lost
const git = useGit();
await someAsyncCall();
git.status(); // Fails!
```

**Deterministic Environment:**
```javascript
// Tests should not depend on system time/locale
// Environment is normalized: TZ=UTC, LANG=C

// Use withTestEnvironment for isolation
import { withTestEnvironment } from "test-utils";

await withTestEnvironment(async () => {
  // Code here runs in isolated environment
});
```

**Integration Test Pattern:**
```javascript
// Test actual commands, not just mocks
import { execSync } from "child_process";

it("should run workflow command", async () => {
  const output = execSync("gitvan workflow list");
  expect(output).toContain("workflow");
});
```

### Before Claiming Completion

**Mandatory 80/20 Loop:**
1. Test → Find issue
2. Fix → Verify fix
3. Test again → Confirm success
4. Minimum 3 iterations

All features must be tested. No untested code shipped.

---

## Configuration Management

### Main Configuration File

**`gitvan.config.js`** - Root configuration:

```javascript
export default {
  // Job configuration
  jobs: {
    dir: "jobs"  // Directory scanned for .mjs job files
  },

  // Template configuration
  templates: {
    dirs: ["templates"],  // Directories scanned
    autoescape: false,    // Nunjucks autoescape
    globals: {            // Global variables
      // ...
    }
  },

  // Receipt/audit trail
  receipts: {
    ref: "refs/notes/gitvan/audit"  // Git notes ref for audit
  },

  // Security policy
  policy: {
    requireSignedCommits: true  // Enforce GPG signatures
  },

  // RDF graph configuration
  graph: {
    dir: "graph",                    // Graph storage
    uriRoots: {
      "graph://": "graph/",
      "templates://": "templates/",
      // ... other URI roots
    },
    autoLoad: true                   // Auto-load ontologies
  }
}
```

### Environment Variables

Key environment variables:
- `GITVAN_HOME` - GitVan configuration directory
- `GITVAN_REPO` - Repository directory
- `TZ` - Timezone (should be UTC)
- `LANG` - Locale (should be C)
- `NODE_ENV` - Environment (development/production)
- `AI_PROVIDER` - AI provider (anthropic/ollama)
- `ANTHROPIC_API_KEY` - Anthropic API key

### c12 Configuration Loading

GitVan uses **c12** for Nitro-style configuration:

```javascript
import { loadConfig } from "c12";

const config = await loadConfig({
  name: "gitvan",  // Loads gitvan.config.js, gitvan.config.mjs
  extends: true    // Allow extending parent configs
});
```

Configuration resolution:
1. `gitvan.config.js`
2. `gitvan.config.mjs`
3. `gitvan.config.ts`
4. Environment-specific: `gitvan.config.{NODE_ENV}.js`

---

## Common Tasks & Patterns

### Adding a New Composable

```javascript
// src/composables/my-feature.mjs
import { useGitVan } from "../core/context.mjs";

export function useMyFeature() {
  const { repo, config } = useGitVan();

  return {
    async doSomething() {
      // Implementation
    },

    getSyncData() {
      // Can be synchronous
    }
  };
}
```

**Usage:**
```javascript
import { withGitVan, useMyFeature } from "gitvan";

await withGitVan(context, async () => {
  const feature = useMyFeature();
  await feature.doSomething();
});
```

### Adding a CLI Command

1. Create file: `src/cli/commands/my-command.mjs`
2. Export defineCommand from citty
3. Register in `src/cli/cli.mjs`

```javascript
// src/cli/commands/my-command.mjs
import { defineCommand } from "citty";

export default defineCommand({
  meta: {
    name: "my-command",
    description: "What this does",
    args: {
      input: {
        type: "positional",
        description: "Input file"
      }
    },
    flags: {
      force: {
        type: "boolean",
        description: "Force operation"
      }
    }
  },

  async run({ args, flags }) {
    console.log(`Processing: ${args.input}`);
    // Implementation
  }
});
```

### Working with Git

**Always use composables, never call git directly:**

```javascript
import { withGitVan, useGit } from "gitvan";

await withGitVan(context, async () => {
  const git = useGit();

  // Get status
  const status = await git.status();

  // Create branch
  await git.branch("feature/my-feature");

  // Commit with message
  await git.commit("feat: add new feature");

  // Push to remote
  await git.push({ remote: "origin", branch: "feature/my-feature" });
});
```

### Working with Templates

```javascript
import { withGitVan, useTemplate } from "gitvan";

await withGitVan(context, async () => {
  const template = useTemplate();

  // Render a template
  const result = await template.render("my-template.njk", {
    variable: "value",
    list: [1, 2, 3]
  });

  // Add custom filter
  template.addFilter("uppercase", (str) => str.toUpperCase());
});
```

### Creating a Workflow

Workflows are defined in Turtle (`.ttl`) format:

```turtle
# my-workflow.ttl
@prefix : <http://example.com/workflow/> .
@prefix git: <http://example.com/git/> .
@prefix step: <http://example.com/step/> .

:MyWorkflow a :Workflow ;
  :hasStep step:build ;
  :hasStep step:test ;
  :hasStep step:deploy .

step:build a :BuildStep ;
  :script "npm run build" .

step:test a :TestStep ;
  :script "npm test" ;
  :dependsOn step:build .

step:deploy a :DeployStep ;
  :script "npm run deploy" ;
  :dependsOn step:test .
```

### Adding a Pack

Packs bundle templates, jobs, and workflows:

```
my-pack/
├── pack.json          # Pack metadata
├── templates/         # Nunjucks templates
│   └── my-template.njk
├── jobs/              # Background jobs
│   └── my-job.mjs
└── workflows/         # DAG workflows
    └── my-workflow.ttl
```

### Testing a Feature

```javascript
import { describe, it, expect, beforeEach } from "vitest";
import { withGitVan, useGit, useMyFeature } from "gitvan";

describe("My Feature", () => {
  let context;

  beforeEach(() => {
    context = createTestContext(); // Helper to create context
  });

  it("should work", async () => {
    await withGitVan(context, async () => {
      const feature = useMyFeature();
      const result = await feature.doSomething();

      expect(result).toBeDefined();
      expect(result).toMatchSnapshot();
    });
  });
});
```

---

## Important Async Patterns

### The unctx Context System (CRITICAL!)

**Context is lost after `await` calls!** This is the #1 source of bugs in GitVan development.

#### ✗ WRONG - Context Lost:
```javascript
import { useGit } from "gitvan";

async function buggyCode() {
  const git = useGit();  // Get composable

  await someAsyncOperation();  // ✗ Context lost here!

  await git.commit("msg");  // ✗ CRASH - git context gone!
}
```

#### ✓ CORRECT - Use withGitVan Wrapper:
```javascript
import { withGitVan, useGit } from "gitvan";

async function correctCode(context) {
  await withGitVan(context, async () => {
    const git = useGit();  // Get composable inside wrapper

    await someAsyncOperation();  // ✓ Context preserved!

    await git.commit("msg");  // ✓ Works - context alive!
  });
}
```

#### ✓ ALSO CORRECT - Multiple Composables:
```javascript
await withGitVan(context, async () => {
  const git = useGit();
  const template = useTemplate();
  const job = useJob();

  // All composables work here
  await git.status();
  const rendered = await template.render("test.njk", {});
  const jobId = await job.execute("test");
});
```

### Why This Matters

The `unctx` (UnContext) library preserves async context through the call stack. Without it:

```
Thread: Main
├─ context established
├─ composable created (linked to context)
├─ await call
│  └─ Thread switches (context lost on thread stack)
└─ composable used (no context - CRASH)
```

With `withGitVan`:

```
Thread: Main
├─ context.run(() => {
│  ├─ composable created (linked to context)
│  ├─ await call
│  │  └─ Thread switches (unctx restores context)
│  └─ composable used (context available - OK)
│  })
```

### Multiple Async Operations

```javascript
await withGitVan(context, async () => {
  const git = useGit();

  // Sequential operations
  await git.status();
  await git.commit("msg");
  await git.push();
});
```

### Nested Contexts

```javascript
await withGitVan(context1, async () => {
  const composable1 = useGit();

  await withGitVan(context2, async () => {
    const composable2 = useTemplate();
    // Both contexts available in inner scope
  });
  // Back to context1
});
```

---

## File Structure Best Practices

### Keep Files Focused

**Target: 100-300 lines per file**

```javascript
// ✓ Good
src/workflow/
  ├── workflow-engine.mjs      (200 lines)
  ├── workflow-parser.mjs      (180 lines)
  ├── dag-planner.mjs          (220 lines)
  └── step-runner.mjs          (150 lines)

// ✗ Bad
src/workflow.mjs              (1500 lines - too large)
```

### Import Ordering

```javascript
// 1. Node.js built-ins
import { readFileSync } from "fs";
import { join } from "path";

// 2. Third-party packages
import { parseOptions } from "citty";
import { mergeConfig } from "defu";

// 3. Internal modules
import { useGitVan } from "../core/context.mjs";
import { useTemplate } from "./template.mjs";

// 4. Relative imports
import { helper } from "./helpers.mjs";
```

### Export Patterns

**Default exports for classes, named exports for functions/composables:**

```javascript
// ✓ Good - class with default export
export default class WorkflowEngine {
  // ...
}

// ✓ Good - composable with named export
export function useGit() {
  // ...
}

// ✓ Good - utilities with named exports
export function parseWorkflow(content) { }
export function validateWorkflow(flow) { }

// ✗ Bad - mixing export types
export default function useGit() { }  // Don't default-export composables
export const helper = () => { };      // Mix named/default
```

---

## Debugging Tips

### Enable Debug Output

```javascript
// Use consola for logging (already a dependency)
import { consola } from "consola";

consola.info("Step 1");
consola.debug("Debug info");  // Shows in debug mode
consola.error("Error occurred");
consola.success("Operation succeeded");
```

### Testing Context Issues

```javascript
import { consola } from "consola";
import { useGitVan } from "../core/context.mjs";

export function useDebug() {
  try {
    const ctx = useGitVan();
    consola.success("Context available");
  } catch (e) {
    consola.error("Context NOT available - are you in withGitVan?");
    throw e;
  }
}
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Context not available" | Not wrapped in `withGitVan()` | Wrap async operations in `withGitVan()` |
| Composable returns undefined | Used outside `withGitVan()` context | Move inside context wrapper |
| Tests timeout | Infinite loop or hanging async | Check for missing `await` or context issues |
| Git commands fail | Determinism issue (timestamps, locale) | Check `TZ=UTC, LANG=C` |
| Performance slow | N+1 git operations | Batch operations, use cached data |

---

## Resources & References

### Key Documentation

- **[.cursorrules](/home/user/gitvan/.cursorrules)** - 248 lines of development guidelines
- **[README.md]** - Project overview (if exists)
- **[CHANGELOG.md](/home/user/gitvan/CHANGELOG.md)** - Version history
- **[DEPLOYMENT.md](/home/user/gitvan/DEPLOYMENT.md)** - Deployment guide

### Code References

- **CLI**: `/src/cli.mjs` and `/src/cli/cli.mjs`
- **Composables**: `/src/composables/` (all `use*` functions)
- **Workflow**: `/src/workflow/workflow-engine.mjs`
- **Git Operations**: `/src/git-native/`, `/src/git-lifecycle/`
- **RDF/Ontology**: `/src/rdf/git-ontology.ttl`
- **Configuration**: `/gitvan.config.js` and `/src/config/`
- **Tests**: `/tests/` (310 test files)
- **AI Integration**: `/src/ai/`
- **Pack System**: `/src/pack/`

### Quick Navigation Commands

```bash
# Find composables
find src/composables -name "*.mjs" | head -20

# Find tests
find tests -name "*.test.mjs" | head -20

# Search for patterns
grep -r "export function use" src/composables/

# Check test coverage
npm test -- --coverage

# Build and check
npm run build
```

---

## Contributing Checklist

Before submitting changes:

- [ ] Code follows naming conventions (composables = `use*`, classes = PascalCase, functions = camelCase)
- [ ] All files in proper directories (`/src`, `/tests`, not root)
- [ ] Files under 500 lines (break large modules)
- [ ] Tests written BEFORE implementation (TDD)
- [ ] Test coverage ≥80% (branches, functions, lines, statements)
- [ ] All tests passing (`npm test`)
- [ ] Build successful (`npm run build`)
- [ ] No hardcoded secrets or API keys
- [ ] Async operations wrapped in `withGitVan()`
- [ ] Linting passed (`npm run lint`)
- [ ] Commit message is clear and descriptive
- [ ] PR includes explanation of changes and test plan

---

## Version History

- **v3.0.0** - Current stable version
- **v4.0.0** - In progress (see `/src/v4/`)
- See [CHANGELOG.md](/home/user/gitvan/CHANGELOG.md) for detailed history

---

## Questions & Getting Help

For AI assistants working on this codebase:

1. **Architecture questions**: Review `/src/core/` and `/src/workflow/`
2. **CLI/command questions**: Review `/src/cli/`
3. **Context/async issues**: Review this document's "Important Async Patterns" section
4. **Testing patterns**: Review `/tests/` examples
5. **Configuration**: Review `gitvan.config.js` and `/src/config/`
6. **RDF/semantic**: Review `/src/rdf/` and `/src/unrdf-hooks/`

---

**Last Updated**: January 6, 2026
**For**: GitVan v3.0.0
**Maintained by**: Development Team
