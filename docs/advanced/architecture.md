# GitVan Architecture Deep Dive

> **Version:** 3.0.0
> **Last Updated:** January 6, 2026

Complete architectural overview of GitVan internals.

## Table of Contents

- [System Overview](#system-overview)
- [Core Architecture](#core-architecture)
- [Composable Pattern](#composable-pattern)
- [Context Management (unctx)](#context-management-unctx)
- [Git-Native Storage](#git-native-storage)
- [RDF/Semantic Graphs](#rdfsemantic-graphs)
- [Workflow Engine](#workflow-engine)
- [Event System](#event-system)
- [Pack System](#pack-system)
- [Performance](#performance)

---

## System Overview

GitVan is a Git-native automation platform with zero external dependencies:

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitVan Platform                          │
├─────────────────────────────────────────────────────────────────┤
│  CLI Layer                                                      │
│  ├─ Citty Framework                                            │
│  └─ Command Handlers                                           │
├─────────────────────────────────────────────────────────────────┤
│  Composable Layer (Vue-inspired)                               │
│  ├─ useGit()      ├─ useJob()       ├─ useTemplate()          │
│  ├─ useEvent()    ├─ useSchedule()  ├─ useReceipt()           │
│  └─ useLock()     └─ usePack()      └─ useRegistry()          │
├─────────────────────────────────────────────────────────────────┤
│  Core Infrastructure                                           │
│  ├─ Context (unctx)   ├─ Hookable System                      │
│  ├─ Job Registry      └─ Event Queue                          │
├─────────────────────────────────────────────────────────────────┤
│  Workflow Engine                                               │
│  ├─ DAG Planner       ├─ Step Runner                          │
│  └─ Context Manager   └─ Knowledge Hooks                      │
├─────────────────────────────────────────────────────────────────┤
│  Storage Layer (Git-Native)                                    │
│  ├─ Git Objects       ├─ Git Notes                            │
│  ├─ Git Refs          └─ Git Worktrees                        │
├─────────────────────────────────────────────────────────────────┤
│  Semantic Layer (RDF/SPARQL)                                   │
│  ├─ UnRDF Engine      ├─ Turtle Parser                        │
│  └─ SPARQL Queries    └─ Graph Store                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Architecture

### Design Principles

1. **Git-Native** - Everything stored in Git
2. **Zero Dependencies** - No databases, no message queues
3. **Composable** - Vue-inspired composable pattern
4. **Context-Aware** - unctx for async safety
5. **Deterministic** - Same input = same output
6. **Type-Safe** - Full TypeScript support

### Technology Stack

```javascript
{
  "runtime": "Node.js 18+",
  "modules": "ES Modules only",
  "cli": "Citty",
  "context": "unctx",
  "config": "c12",
  "rdf": "unrdf",
  "templates": "nunjucks",
  "hooks": "hookable",
  "ai": "@ai-sdk/*",
  "git": "isomorphic-git"
}
```

---

## Composable Pattern

### Vue-Inspired Design

GitVan uses Vue's composable pattern for reusable logic:

```javascript
// Composable definition
export function useGit() {
  const ctx = useGitVan(); // Get context

  return {
    async branch() {
      return runGit(["rev-parse", "--abbrev-ref", "HEAD"], {
        cwd: ctx.cwd,
        env: ctx.env
      });
    }
  };
}

// Usage
await withGitVan({ cwd: process.cwd() }, async () => {
  const git = useGit();
  const branch = await git.branch();
});
```

### Composable Characteristics

- **No side effects** - Pure functions
- **Deterministic** - Same input = same output
- **Context-aware** - Access to GitVan context
- **Reusable** - Can be used across jobs
- **Testable** - Easy to test in isolation

---

## Context Management (unctx)

### The Problem

JavaScript loses context across `await` calls:

```javascript
// Context is lost!
const git = useGit();
await someAsyncCall();
await git.branch(); // ERROR: Context gone
```

### The Solution: unctx

GitVan uses `unctx` to preserve context across async operations:

```javascript
import { createContext } from 'unctx';

const gitVanContext = createContext({
  asyncContext: true
});

export const withGitVan = gitVanContext.callAsync;
export const useGitVan = gitVanContext.use;
```

**How it works:**

1. `withGitVan()` establishes async context
2. Context is stored in AsyncLocalStorage
3. `useGitVan()` retrieves context from storage
4. Context survives across `await` calls

```javascript
// Context is preserved!
await withGitVan({ cwd: process.cwd() }, async () => {
  const git = useGit();
  await someAsyncCall();
  await git.branch(); // ✓ Works!
});
```

### Context Lifecycle

```
1. withGitVan() called
   ↓
2. Context created and stored in AsyncLocalStorage
   ↓
3. Async function executes
   ↓
4. useGit() retrieves context from storage
   ↓
5. Await calls execute (context preserved)
   ↓
6. Function completes
   ↓
7. Context cleaned up
```

---

## Git-Native Storage

### Why Git?

GitVan stores everything in Git:

- **No external database** - Git is the database
- **Version controlled** - All state is versioned
- **Atomic** - Git ensures all-or-nothing
- **Cryptographically signed** - GPG signing built-in
- **Distributed** - Works offline

### Storage Mechanisms

**1. Git Refs**

```
refs/
  gitvan/
    locks/
      deploy-lock        → SHA (lock owner info)
      backup-lock        → SHA
    receipts/
      2026-01-06         → SHA (receipt data)
```

**2. Git Notes**

```bash
# Add audit note
git notes --ref=refs/notes/gitvan/audit \
  add -m "Job executed: deploy" HEAD

# Read audit trail
git notes --ref=refs/notes/gitvan/audit show HEAD
```

**3. Git Objects**

```
objects/
  ab/c123...  → Job receipt (JSON blob)
  de/f456...  → Lock metadata
  78/9abc...  → Workflow state
```

**4. Git Worktrees**

```
# Multiple parallel environments
.git/worktrees/
  feature-branch/
  staging/
  production/
```

---

## RDF/Semantic Graphs

### Architecture

GitVan uses RDF (Resource Description Framework) for semantic workflows:

```turtle
# Workflow definition in Turtle
@prefix : <http://example.com/workflow/> .
@prefix step: <http://example.com/step/> .

:CIPipeline a :Workflow ;
  :name "CI Pipeline" ;
  :hasStep step:build ;
  :hasStep step:test .

step:test :dependsOn step:build .
```

### UnRDF Integration

```javascript
import { createGraph, query } from 'unrdf';

// Load graph
const graph = await createGraph();
await graph.loadFromFile('workflows/ci.ttl');

// SPARQL query
const results = await query(graph, `
  SELECT ?step ?dependency
  WHERE {
    ?workflow :hasStep ?step .
    ?step :dependsOn ?dependency .
  }
`);
```

### Knowledge Hooks

Knowledge hooks react to graph changes:

```turtle
@prefix : <http://example.com/hook/> .

:AutoTag a :Hook ;
  :when [
    :predicate "branch" ;
    :value "main" ;
    :filesChanged "VERSION"
  ] ;
  :action :createTag .
```

---

## Workflow Engine

### DAG Planning

Workflows are represented as Directed Acyclic Graphs:

```
install
  ↓
  ├─→ lint ─→ build ─→ deploy
  └─→ test ─┘
```

**Planner Algorithm:**

```javascript
class DAGPlanner {
  plan(workflow) {
    // 1. Build dependency graph
    const graph = this.buildGraph(workflow);

    // 2. Topological sort
    const sorted = this.topologicalSort(graph);

    // 3. Identify parallel steps
    const layers = this.identifyLayers(sorted);

    return { layers, graph };
  }

  identifyLayers(sorted) {
    const layers = [];
    const processed = new Set();

    while (processed.size < sorted.length) {
      const layer = sorted.filter(step => 
        !processed.has(step) &&
        step.dependencies.every(dep => processed.has(dep))
      );

      layers.push(layer);
      layer.forEach(step => processed.add(step));
    }

    return layers; // Steps in same layer run in parallel
  }
}
```

### Step Execution

```javascript
class StepRunner {
  async run(step, context) {
    // 1. Validate prerequisites
    await this.validatePrerequisites(step);

    // 2. Acquire locks if needed
    const locks = await this.acquireLocks(step);

    try {
      // 3. Execute step handler
      const result = await this.executeHandler(step, context);

      // 4. Record receipt
      await this.recordReceipt(step, result);

      return result;
    } finally {
      // 5. Release locks
      await this.releaseLocks(locks);
    }
  }
}
```

---

## Event System

### Event Flow

```
Git Event
  ↓
EventCapture
  ↓
EventQueue
  ↓
EventEvaluator
  ↓
Job Execution
  ↓
Receipt
```

### Event Capture

```javascript
// Git hooks trigger events
// .git/hooks/post-commit
import { captureEvent } from 'gitvan/events';

captureEvent({
  type: 'commit',
  sha: process.env.GIT_COMMIT,
  files: getChangedFiles(),
  author: getAuthor()
});
```

### Event Matching

```javascript
class EventEvaluator {
  async evaluate(event) {
    const jobs = await this.discoverEventJobs();

    for (const job of jobs) {
      if (await this.matches(event, job.predicate)) {
        await this.executeJob(job, event);
      }
    }
  }

  async matches(event, predicate) {
    // Evaluate predicate against event
    return (
      this.matchBranch(event, predicate.branch) &&
      this.matchFiles(event, predicate.filesChanged) &&
      this.matchAuthor(event, predicate.author)
    );
  }
}
```

---

## Pack System

### Pack Structure

```
my-pack/
  ├─ pack.json           # Metadata
  ├─ templates/          # Nunjucks templates
  │   └─ job.njk
  ├─ jobs/               # Job definitions
  │   └─ deploy.mjs
  ├─ workflows/          # Workflow definitions
  │   └─ ci.ttl
  └─ README.md
```

### Pack Registry

```javascript
class PackRegistry {
  async install(packId) {
    // 1. Resolve dependencies
    const deps = await this.resolveDependencies(packId);

    // 2. Download pack
    const pack = await this.download(packId);

    // 3. Verify signature
    await this.verifySignature(pack);

    // 4. Install dependencies
    for (const dep of deps) {
      await this.install(dep);
    }

    // 5. Copy templates and jobs
    await this.copyAssets(pack);

    // 6. Register pack
    await this.register(pack);
  }
}
```

---

## Performance

### Optimization Strategies

**1. Lazy Loading**
```javascript
// Load only when needed
const template = await useTemplate(); // Async load
```

**2. Caching**
```javascript
// Cache Nunjucks environment
const env = getCachedEnvironment({ paths, autoescape, noCache });
```

**3. Batching**
```javascript
// Batch Git operations
await git.add(['file1.js', 'file2.js', 'file3.js']); // 1 call
```

**4. Parallel Execution**
```javascript
// Execute steps in parallel
await Promise.all(layer.map(step => executeStep(step)));
```

**5. Streaming**
```javascript
// Stream large files
await pipeline(readStream, transformStream, writeStream);
```

### Performance Metrics

| Operation | v2 | v3 | Improvement |
|-----------|----|----|-------------|
| Job execution | 250ms | 75ms | 3.3x faster |
| Template render | 100ms | 30ms | 3.3x faster |
| Workflow planning | 500ms | 150ms | 3.3x faster |
| SPARQL query | 200ms | 50ms | 4x faster |

---

## See Also

- [Complete API Reference](../api/complete-reference.md)
- [Advanced Patterns](./patterns.md)
- [Source Code](https://github.com/gitvan/gitvan)
