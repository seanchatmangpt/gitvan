# GitVan v4 Architecture Overview

System design and module structure documentation.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Core Components](#core-components)
3. [Data Flow](#data-flow)
4. [Module Structure](#module-structure)
5. [Hook Lifecycle](#hook-lifecycle)
6. [Integration Points](#integration-points)

---

## System Architecture

### High-Level Architecture

```
+-----------------------------------------------------------------------+
|                           GitVan v4 Architecture                       |
+-----------------------------------------------------------------------+
|                                                                       |
|  +-----------------+     +------------------+     +----------------+   |
|  |   CLI Layer     |     |   Composables    |     |  Git Hooks     |   |
|  |  (citty)        |     |  (unctx-based)   |     |  Integration   |   |
|  +-----------------+     +------------------+     +----------------+   |
|          |                       |                       |            |
|          v                       v                       v            |
|  +---------------------------------------------------------------+   |
|  |                    Knowledge Hook Engine                       |   |
|  |  +-------------+  +-----------------+  +-------------------+   |   |
|  |  | Registry    |  | Orchestrator    |  | Predicate Eval.   |   |   |
|  |  +-------------+  +-----------------+  +-------------------+   |   |
|  +---------------------------------------------------------------+   |
|          |                       |                       |            |
|          v                       v                       v            |
|  +---------------------------------------------------------------+   |
|  |                    Workflow Engine                             |   |
|  |  +-------------+  +-----------------+  +-------------------+   |   |
|  |  | DAG Planner |  | Step Runner     |  | Context Manager   |   |   |
|  |  +-------------+  +-----------------+  +-------------------+   |   |
|  +---------------------------------------------------------------+   |
|          |                       |                       |            |
|          v                       v                       v            |
|  +---------------------------------------------------------------+   |
|  |                    Core Infrastructure                         |   |
|  |  +-------------+  +-----------------+  +-------------------+   |   |
|  |  | RDF/Turtle  |  | Git Native I/O  |  | Template Engine   |   |   |
|  |  +-------------+  +-----------------+  +-------------------+   |   |
|  +---------------------------------------------------------------+   |
|          |                       |                       |            |
|          v                       v                       v            |
|  +---------------------------------------------------------------+   |
|  |                    Storage Layer                               |   |
|  |  +-------------+  +-----------------+  +-------------------+   |   |
|  |  | .ttl Files  |  | Git Objects     |  | Git Notes         |   |   |
|  |  +-------------+  +-----------------+  +-------------------+   |   |
|  +---------------------------------------------------------------+   |
|                                                                       |
+-----------------------------------------------------------------------+
```

### Component Interactions

```
User Command
     |
     v
+----------+     +-------------+     +--------------+
| CLI      |---->| Composables |---->| Context      |
| (citty)  |     | (useGit,    |     | (unctx)      |
+----------+     | useHooks)   |     +--------------+
                 +-------------+            |
                       |                    v
                       |           +----------------+
                       |           | Hook Registry  |
                       |           +----------------+
                       |                    |
                       v                    v
              +-----------------+   +------------------+
              | Hook            |<->| Predicate        |
              | Orchestrator    |   | Evaluator        |
              +-----------------+   +------------------+
                       |                    |
                       v                    v
              +-----------------+   +------------------+
              | DAG Planner     |   | RDF Graph        |
              +-----------------+   | (useTurtle)      |
                       |           +------------------+
                       v
              +-----------------+
              | Step Runner     |
              +-----------------+
                       |
                       v
              +-----------------+
              | Git Native I/O  |
              +-----------------+
                       |
                       v
              +-----------------+
              | Receipts &      |
              | Audit Trail     |
              +-----------------+
```

---

## Core Components

### 1. CLI Layer (`src/cli/`)

Built on [citty](https://github.com/unjs/citty) for type-safe command handling.

```javascript
// src/cli/commands/hooks.mjs
import { defineCommand } from 'citty';

export default defineCommand({
  meta: { name: 'hooks', description: 'Knowledge Hook operations' },
  subCommands: {
    list: listCommand,
    evaluate: evaluateCommand,
    validate: validateCommand
  }
});
```

**Key Files:**
- `src/cli.mjs` - Main CLI entry point
- `src/cli/commands/hooks.mjs` - Hook commands
- `src/cli/hooks.mjs` - HooksCLI class

### 2. Composables (`src/composables/`)

Context-aware composables using [unctx](https://github.com/unjs/unctx).

```javascript
// src/composables/ctx.mjs
import { createContext } from 'unctx';

const GV = createContext();

export function withGitVan(ctx, fn) {
  return GV.call(ctx, fn);
}

export function useGitVan() {
  return GV.use();
}
```

**Available Composables:**

| Composable | Purpose |
|------------|---------|
| `useGit()` | Git operations |
| `useGitVan()` | Context access |
| `useTemplate()` | Template rendering |
| `useEvent()` | Event emission |
| `useTurtle()` | RDF/Turtle parsing |
| `useGraph()` | Graph operations |
| `useLock()` | Lock management |
| `useReceipt()` | Receipt writing |

### 3. Knowledge Hook Engine (`src/hooks/`)

Central hook management system.

```
src/hooks/
  HookOrchestrator.mjs     - Main orchestration
  KnowledgeHookRegistry.mjs - Hook discovery and registration
  PredicateEvaluator.mjs   - Predicate evaluation
  HookParser.mjs           - Hook definition parsing
  GitLifecycleHooks.mjs    - Git event integration
```

**HookOrchestrator Responsibilities:**
- Initialize RDF components
- Load previous state for comparison
- Parse and validate hook definitions
- Evaluate predicates
- Execute triggered workflows
- Write execution receipts

### 4. Workflow Engine (`src/workflow/`)

DAG-based workflow execution.

```
src/workflow/
  dag-planner.mjs        - Dependency graph planning
  step-runner.mjs        - Step execution
  context-manager.mjs    - Execution context
```

**DAG Planner:**
- Analyzes step dependencies
- Creates optimal execution order
- Enables parallel execution

**Step Runner:**
- Executes individual steps
- Handles timeouts and retries
- Captures output for chaining

### 5. Git Native I/O (`src/git-native/`)

Git-based persistence layer.

```javascript
// Atomic operations via Git refs
const lockAcquired = await gitNativeIO.acquireLock('hook-execution', {
  timeout: 30000,
  exclusive: true
});

// Receipt storage via Git Notes
await gitNativeIO.writeReceipt(hookId, result, metadata);

// Metrics collection
await gitNativeIO.writeMetrics({
  hookId,
  duration,
  success: true
});
```

### 6. RDF/Turtle Layer (`src/composables/turtle.mjs`)

RDF graph management.

```javascript
const turtle = await useTurtle({
  graphDir: './hooks',
  context: ctx
});

const hooks = turtle.getHooks();
const graph = useGraph(turtle.store);
```

---

## Data Flow

### Hook Evaluation Flow

```
1. Discovery
   hooks/*.ttl files
        |
        v
2. Parsing
   HookParser.parseHook()
        |
        v
3. Predicate Evaluation
   PredicateEvaluator.evaluate()
        |
        +-- Current Graph (HEAD)
        +-- Previous Graph (HEAD~1)
        |
        v
4. Trigger Decision
   result.triggered === true?
        |
        +-- No: Skip workflow
        |
        +-- Yes: Continue
        |
        v
5. Workflow Planning
   DAGPlanner.createPlan()
        |
        v
6. Step Execution
   StepRunner.executeStep()
        |
        +-- CLIStep: execFile()
        +-- TemplateStep: nunjucks.render()
        +-- SPARQLStep: graph.query()
        +-- HTTPStep: fetch()
        |
        v
7. Receipt Writing
   GitNativeIO.writeReceipt()
        |
        v
8. Metrics Collection
   GitNativeIO.writeMetrics()
```

### Context Flow

```
CLI Command
     |
     v
withGitVan({ cwd, env })
     |
     +-- useGitVan() available in all composables
     |
     v
useGit()
     |
     +-- Inherits cwd, env from context
     +-- Deterministic: TZ=UTC, LANG=C
     |
     v
Git Operations
     |
     +-- All operations use context
```

---

## Module Structure

```
gitvan/
  src/
    cli/                    # CLI commands and handlers
      commands/             # Individual command definitions
      hooks.mjs             # HooksCLI class
    composables/            # Context-aware utilities
      ctx.mjs               # Context management (unctx)
      git.mjs               # Git operations
      turtle.mjs            # RDF/Turtle parsing
      graph.mjs             # Graph operations
      template.mjs          # Template rendering
      index.mjs             # Composable exports
    core/                   # Core infrastructure
      context.mjs           # Context re-exports
      hookable.mjs          # Hookable integration
      job-loader.mjs        # Job loading
    hooks/                  # Knowledge Hook Engine
      HookOrchestrator.mjs  # Main orchestrator
      KnowledgeHookRegistry.mjs
      PredicateEvaluator.mjs
      HookParser.mjs
      GitLifecycleHooks.mjs
    workflow/               # Workflow execution
      dag-planner.mjs       # DAG planning
      step-runner.mjs       # Step execution
      context-manager.mjs   # Context management
    git-native/             # Git-based I/O
      GitNativeIO.mjs       # Main I/O class
    ai/                     # AI integration
      ollama.mjs            # Ollama integration
      provider.mjs          # AI provider abstraction
  hooks/                    # Hook definitions (.ttl)
  types/                    # TypeScript definitions
    index.d.ts
    hooks.d.ts
  bin/                      # CLI entry points
    gitvan.mjs
```

---

## Hook Lifecycle

### Detailed Lifecycle Diagram

```
                    +-------------------+
                    |    CLI Command    |
                    | gitvan hooks eval |
                    +--------+----------+
                             |
                             v
                    +-------------------+
                    |   Initialize      |
                    |   HookOrchestrator|
                    +--------+----------+
                             |
              +--------------+--------------+
              |                             |
              v                             v
    +-------------------+         +-------------------+
    | Load RDF Graphs   |         | Load Previous     |
    | (useTurtle)       |         | State (Git)       |
    +--------+----------+         +--------+----------+
              |                             |
              +-------------+---------------+
                            |
                            v
                    +-------------------+
                    |  Parse All Hooks  |
                    |  (HookParser)     |
                    +--------+----------+
                             |
                             v
              +-----------------------------+
              |     For Each Hook           |
              +-----------------------------+
                             |
                             v
                    +-------------------+
                    | Evaluate Predicate|
                    | (PredicateEval)   |
                    +--------+----------+
                             |
              +--------------+--------------+
              |                             |
        triggered=false               triggered=true
              |                             |
              v                             v
        +----------+               +-------------------+
        |   Skip   |               | Acquire Lock      |
        +----------+               +--------+----------+
                                            |
                                            v
                                   +-------------------+
                                   | Create DAG Plan   |
                                   | (DAGPlanner)      |
                                   +--------+----------+
                                            |
                                            v
                                   +-------------------+
                                   | Execute Steps     |
                                   | (StepRunner)      |
                                   +--------+----------+
                                            |
                                            v
                                   +-------------------+
                                   | Write Receipt     |
                                   | (Git Notes)       |
                                   +--------+----------+
                                            |
                                            v
                                   +-------------------+
                                   | Write Metrics     |
                                   +--------+----------+
                                            |
                                            v
                                   +-------------------+
                                   | Release Lock      |
                                   +-------------------+
```

---

## Integration Points

### Git Integration

```javascript
// Git events trigger hooks
const lifecycle = new GitLifecycleHooks({
  hooksDir: '.git/hooks'
});

lifecycle.on('pre-commit', async () => {
  await orchestrator.evaluate({ category: 'pre-commit' });
});
```

### External Systems

```turtle
# HTTP integration
ex:notify-step rdf:type op:HTTPStep ;
    op:url "https://api.slack.com/webhook" ;
    op:method "POST" ;
    op:body """{"text": "Hook triggered"}""" .

# CLI integration
ex:deploy-step rdf:type op:CLIStep ;
    op:command "kubectl apply -f deployment.yaml" .
```

### CI/CD Integration

```yaml
# GitHub Actions
- name: Run GitVan Hooks
  run: gitvan hooks evaluate --verbose

# GitLab CI
script:
  - gitvan hooks evaluate --category ci
```

---

## Design Principles

### 1. Git-Native

All state is stored in Git:
- Hook definitions: `.ttl` files in repo
- Execution receipts: Git Notes
- Locks: Git refs
- Audit trail: Git commits

### 2. Context-Aware

Composables inherit context:
```javascript
await withGitVan({ cwd: '/project' }, async () => {
  const git = useGit();  // Uses /project as cwd
  await git.commit('message');
});
```

### 3. Deterministic

Reproducible execution:
- `TZ=UTC` for all operations
- `LANG=C` for locale consistency
- Ordered query results

### 4. Reactive

Graph-based triggers:
- ResultDelta for change detection
- ASK for boolean conditions
- Threshold monitoring

### 5. Composable

Reusable components:
- Workflows can include other workflows
- Steps can be shared
- Predicates are modular

---

## Next Steps

- [Module Reference](MODULE-REFERENCE.md)
- [Hook Lifecycle Details](HOOK-LIFECYCLE.md)
- [Data Flow Diagrams](DATA-FLOW.md)
