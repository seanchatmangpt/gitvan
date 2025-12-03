# GitVan Architecture Diagrams (C4 Model)

This document provides visual architecture diagrams using the C4 model to illustrate GitVan's clean architecture with unrdf integration.

---

## Level 1: System Context Diagram

**Purpose**: Show how GitVan fits into the broader development ecosystem.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Developer Ecosystem                             │
│                                                                          │
│  ┌──────────────┐                                    ┌──────────────┐   │
│  │              │                                    │              │   │
│  │  Developer   │◄──────── Uses CLI ───────────────►│   GitVan     │   │
│  │              │                                    │   Platform   │   │
│  └──────────────┘                                    └──────┬───────┘   │
│         │                                                   │           │
│         │                                                   │           │
│         │ Uses                                              │ Uses      │
│         ▼                                                   ▼           │
│  ┌──────────────┐                                    ┌──────────────┐   │
│  │              │                                    │              │   │
│  │  Git         │◄──────── Git Operations ──────────│   unrdf      │   │
│  │  Repository  │                                    │   Library    │   │
│  │              │                                    │              │   │
│  └──────────────┘                                    └──────────────┘   │
│         │                                                   │           │
│         │                                                   │           │
│         │ Reads/Writes                                      │ Uses      │
│         ▼                                                   ▼           │
│  ┌──────────────┐                                    ┌──────────────┐   │
│  │              │                                    │              │   │
│  │  Knowledge   │◄──────── RDF Operations ───────────│  Comunica    │   │
│  │  Graph       │                                    │  N3.js       │   │
│  │  (.ttl files)│                                    │  SHACL       │   │
│  │              │                                    │              │   │
│  └──────────────┘                                    └──────────────┘   │
│                                                                          │
│  ┌──────────────┐                                    ┌──────────────┐   │
│  │              │                                    │              │   │
│  │  Ollama      │◄──────── AI Generation ───────────│  Pack        │   │
│  │  Local LLM   │                                    │  Templates   │   │
│  │              │                                    │  (Next.js)   │   │
│  └──────────────┘                                    └──────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

Legend:
  ┌──────────┐
  │  Person  │  = External actor
  └──────────┘

  ┌──────────┐
  │  System  │  = Software system
  └──────────┘
```

**Key Relationships**:
- Developer uses GitVan CLI to automate development workflows
- GitVan uses Git for version control and storage
- GitVan uses unrdf for all RDF/knowledge graph operations
- GitVan uses Ollama for AI-powered workflow generation
- Knowledge graphs stored as .ttl files in Git repository

---

## Level 2: Container Diagram

**Purpose**: Show the high-level technical building blocks of GitVan.

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                              GitVan Platform                                    │
│                                                                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐    │
│  │                          GitVan Application                             │    │
│  │                                                                         │    │
│  │  ┌──────────────┐         ┌──────────────┐        ┌──────────────┐    │    │
│  │  │              │         │              │        │              │    │    │
│  │  │  CLI Layer   │────────►│  Workflow    │───────►│  Integration │    │    │
│  │  │  (Citty)     │         │  Engine      │        │  Layer       │    │    │
│  │  │              │         │              │        │              │    │    │
│  │  └──────┬───────┘         └──────┬───────┘        └──────┬───────┘    │    │
│  │         │                        │                       │            │    │
│  │         │ Commands               │ Orchestrates          │ Adapts     │    │
│  │         ▼                        ▼                       ▼            │    │
│  │  ┌──────────────┐         ┌──────────────┐        ┌──────────────┐    │    │
│  │  │              │         │              │        │              │    │    │
│  │  │  Git Layer   │         │  JTBD Hooks  │        │  unrdf       │    │    │
│  │  │  (40+ ops)   │         │  System      │        │  Adapter     │    │    │
│  │  │              │         │              │        │              │    │    │
│  │  └──────┬───────┘         └──────┬───────┘        └──────┬───────┘    │    │
│  │         │                        │                       │            │    │
│  │         │ Uses                   │ Uses                  │ Uses       │    │
│  │         ▼                        ▼                       ▼            │    │
│  │  ┌──────────────┐         ┌──────────────┐        ┌──────────────┐    │    │
│  │  │              │         │              │        │              │    │    │
│  │  │  Git-Native  │         │  Pack        │        │  Hook        │    │    │
│  │  │  I/O         │         │  System      │        │  Bridge      │    │    │
│  │  │  (Locks,     │         │  (Templates) │        │              │    │    │
│  │  │   Queues)    │         │              │        │              │    │    │
│  │  │              │         │              │        │              │    │    │
│  │  └──────────────┘         └──────────────┘        └──────────────┘    │    │
│  │                                                                        │    │
│  └────────────────────────────────────────────────────────────────────────┘    │
│                                       │                                         │
│                                       │ Uses                                    │
│                                       ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐    │
│  │                          unrdf Library (v4.1.1)                         │    │
│  │                                                                         │    │
│  │  ┌──────────────┐         ┌──────────────┐        ┌──────────────┐    │    │
│  │  │              │         │              │        │              │    │    │
│  │  │  Knowledge   │────────►│  RDF         │───────►│  Transaction │    │    │
│  │  │  Engine      │         │  Engine      │        │  Manager     │    │    │
│  │  │              │         │              │        │              │    │    │
│  │  └──────┬───────┘         └──────┬───────┘        └──────────────┘    │    │
│  │         │                        │                                    │    │
│  │         │ Uses                   │ Uses                               │    │
│  │         ▼                        ▼                                    │    │
│  │  ┌──────────────┐         ┌──────────────┐        ┌──────────────┐    │    │
│  │  │              │         │              │        │              │    │    │
│  │  │  Composables │         │  SPARQL      │        │  SHACL       │    │    │
│  │  │  (27+ utils) │         │  (Comunica)  │        │  Validator   │    │    │
│  │  │              │         │              │        │              │    │    │
│  │  └──────────────┘         └──────────────┘        └──────────────┘    │    │
│  │                                                                        │    │
│  └────────────────────────────────────────────────────────────────────────┘    │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘

Storage:
┌──────────────────┐           ┌──────────────────┐
│  Git Repository  │           │  Knowledge Graph │
│  (.git/)         │◄─────────►│  (*.ttl files)   │
└──────────────────┘           └──────────────────┘
```

**Key Containers**:

1. **CLI Layer** (Citty)
   - User interface for all GitVan commands
   - Command parsing and routing
   - Help text and documentation

2. **Workflow Engine**
   - JTBD hook orchestration
   - Cron job scheduling
   - AI-powered workflow generation

3. **Git Layer**
   - 40+ Git operation composables
   - Worktree management
   - Hybrid operations

4. **Git-Native I/O**
   - File-based locking
   - Message queues
   - Graph snapshots

5. **Pack System**
   - Template registry
   - Next.js templates
   - Docker Compose packs

6. **Integration Layer**
   - unrdf adapter
   - Hook bridge
   - Graph-Git synchronization

7. **unrdf Library**
   - Knowledge Engine
   - RDF Engine (SPARQL, SHACL)
   - 27+ composables
   - Transaction management

---

## Level 3: Component Diagram (GitVan Core)

**Purpose**: Show the internal structure of GitVan's core components.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          GitVan Core Components                                  │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                       Integration Layer                                  │    │
│  │                                                                          │    │
│  │  ┌────────────────────┐                                                 │    │
│  │  │                    │                                                 │    │
│  │  │  unrdf-adapter.mjs │                                                 │    │
│  │  │                    │                                                 │    │
│  │  │  • createGitVan    │                                                 │    │
│  │  │    KnowledgeEngine │                                                 │    │
│  │  │  • useGitVanGraph  │                                                 │    │
│  │  │  • useGitVanTurtle │                                                 │    │
│  │  │                    │                                                 │    │
│  │  └────────┬───────────┘                                                 │    │
│  │           │                                                             │    │
│  │           │ Uses                                                        │    │
│  │           ▼                                                             │    │
│  │  ┌────────────────────┐         ┌────────────────────┐                 │    │
│  │  │                    │         │                    │                 │    │
│  │  │  hook-bridge.mjs   │         │  graph-git-sync    │                 │    │
│  │  │                    │         │  .mjs              │                 │    │
│  │  │  • defineGitVan    │         │                    │                 │    │
│  │  │    Hook            │         │  • GraphGitSync    │                 │    │
│  │  │  • jtbdToUnrdf     │         │  • transaction()   │                 │    │
│  │  │    Hook            │         │  • loadRevision()  │                 │    │
│  │  │                    │         │  • diff()          │                 │    │
│  │  │                    │         │                    │                 │    │
│  │  └────────────────────┘         └────────────────────┘                 │    │
│  │                                                                         │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                  │                                              │
│                                  │ Delegates to                                 │
│                                  ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                       GitVan Composables Layer                           │    │
│  │                                                                          │    │
│  │  ┌────────────────────┐         ┌────────────────────┐                 │    │
│  │  │                    │         │                    │                 │    │
│  │  │  turtle.mjs        │         │  graph.mjs         │                 │    │
│  │  │                    │         │                    │                 │    │
│  │  │  Thin wrapper      │         │  Thin wrapper      │                 │    │
│  │  │  around unrdf's    │         │  around unrdf's    │                 │    │
│  │  │  useTurtle()       │         │  useGraph()        │                 │    │
│  │  │                    │         │                    │                 │    │
│  │  │  + saveToGit()     │         │  + saveToGit()     │                 │    │
│  │  │  + loadFromGit()   │         │  + loadFromGit()   │                 │    │
│  │  │  + getJtbdHooks()  │         │  + getJtbdHooks()  │                 │    │
│  │  │                    │         │                    │                 │    │
│  │  └────────────────────┘         └────────────────────┘                 │    │
│  │                                                                         │    │
│  │  ┌────────────────────┐         ┌────────────────────┐                 │    │
│  │  │                    │         │                    │                 │    │
│  │  │  git.mjs           │         │  pack.mjs          │                 │    │
│  │  │                    │         │                    │                 │    │
│  │  │  • 40+ Git ops     │         │  • registry        │                 │    │
│  │  │  • commit()        │         │  • templates       │                 │    │
│  │  │  • branch()        │         │  • next-template   │                 │    │
│  │  │  • worktree()      │         │  • compose         │                 │    │
│  │  │                    │         │                    │                 │    │
│  │  └────────────────────┘         └────────────────────┘                 │    │
│  │                                                                         │    │
│  │  ┌────────────────────┐         ┌────────────────────┐                 │    │
│  │  │                    │         │                    │                 │    │
│  │  │  job.mjs           │         │  native-io.mjs     │                 │    │
│  │  │                    │         │                    │                 │    │
│  │  │  • schedule        │         │  • locks           │                 │    │
│  │  │  • execute         │         │  • queues          │                 │    │
│  │  │  • workflows       │         │  • snapshots       │                 │    │
│  │  │                    │         │                    │                 │    │
│  │  └────────────────────┘         └────────────────────┘                 │    │
│  │                                                                         │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                       GitVan Context Layer                               │    │
│  │                                                                          │    │
│  │  ┌────────────────────────────────────────────────────────────────┐     │    │
│  │  │                                                                │     │    │
│  │  │  context.mjs (unctx)                                           │     │    │
│  │  │                                                                │     │    │
│  │  │  • useGitVan()        → Get current GitVan context            │     │    │
│  │  │  • tryUseGitVan()     → Safe context access                   │     │    │
│  │  │  • createGitVanContext() → Initialize new context             │     │    │
│  │  │                                                                │     │    │
│  │  │  Context Properties:                                           │     │    │
│  │  │  • cwd              → Working directory                        │     │    │
│  │  │  • git              → Git operations                           │     │    │
│  │  │  • pack             → Pack system                              │     │    │
│  │  │  • workflow         → Workflow engine                          │     │    │
│  │  │  • knowledgeEngine  → unrdf knowledge engine (injected)        │     │    │
│  │  │                                                                │     │    │
│  │  └────────────────────────────────────────────────────────────────┘     │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

External Dependencies:

┌─────────────────────────────────────────────────────────────────────────────────┐
│                          unrdf Library (v4.1.1)                                  │
│                                                                                  │
│  • KnowledgeEngine     → Core knowledge management                              │
│  • RdfEngine           → RDF operations (SPARQL, SHACL)                         │
│  • useGraph()          → Graph composable                                       │
│  • useTurtle()         → Turtle composable                                      │
│  • defineHook()        → Hook definition                                        │
│  • TransactionManager  → Transaction handling                                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Component Responsibilities**:

### Integration Layer

1. **unrdf-adapter.mjs**
   - Bridge between GitVan and unrdf
   - Initialize unrdf knowledge engine with GitVan context
   - Provide GitVan-aware composables

2. **hook-bridge.mjs**
   - Convert GitVan JTBD hooks to unrdf hooks
   - Inject Git operations into hook context
   - Handle auto-commit for hooks

3. **graph-git-sync.mjs**
   - Synchronize RDF graph changes with Git commits
   - Transaction-based updates
   - Graph versioning and diffing

### Composables Layer

1. **turtle.mjs** - Thin wrapper around unrdf's useTurtle
   - Add Git-specific methods (saveToGit, loadFromGit)
   - JTBD hook extraction
   - GitVan context integration

2. **graph.mjs** - Thin wrapper around unrdf's useGraph
   - Add Git-specific methods
   - Graph persistence to Git
   - GitVan context integration

3. **git.mjs** - Git operations (GitVan-specific)
   - 40+ Git command composables
   - Worktree management
   - Hybrid operations

4. **pack.mjs** - Pack system (GitVan-specific)
   - Template registry
   - Pack installation
   - Next.js and Docker Compose templates

5. **job.mjs** - Job scheduling (GitVan-specific)
   - Cron job management
   - Workflow execution
   - AI-powered generation

6. **native-io.mjs** - Git-native I/O (GitVan-specific)
   - File-based locks
   - Message queues
   - Graph snapshots

---

## Level 4: Code Diagram (Integration Layer)

**Purpose**: Show the detailed implementation of the integration layer.

```javascript
// ============================================================================
// src/integrations/unrdf-adapter.mjs
// ============================================================================

import { createKnowledgeEngine } from 'unrdf/knowledge-engine';
import { useGraph, useTurtle } from 'unrdf';
import { useGitVan } from '../core/context.mjs';

/**
 * Creates unrdf-powered knowledge engine within GitVan context
 */
export async function createGitVanKnowledgeEngine(options = {}) {
  const ctx = useGitVan();

  // Initialize unrdf knowledge engine
  const engine = await createKnowledgeEngine({
    baseIRI: options.baseIRI || 'https://gitvan.dev/',
    graphDir: options.graphDir || ctx.graphDir,
    enableTransactions: true,
    enableObservability: true,
    enableDarkMatter: true,
    ...options
  });

  // Bridge GitVan context with unrdf engine
  ctx.knowledgeEngine = engine;

  return engine;
}

/**
 * GitVan-aware graph composable
 */
export function useGitVanGraph(storeOrPath) {
  const ctx = useGitVan();

  // If path, load from Git-native storage
  if (typeof storeOrPath === 'string') {
    const store = ctx.loadGraphFromGit(storeOrPath);
    return useGraph(store);
  }

  return useGraph(storeOrPath);
}

/**
 * GitVan-aware turtle composable
 */
export async function useGitVanTurtle(options = {}) {
  const ctx = useGitVan();

  const turtle = await useTurtle({
    graphDir: options.graphDir || ctx.graphDir,
    ...options
  });

  return {
    ...turtle,  // Inherit all unrdf methods

    // GitVan-specific extensions
    async saveToGit(path, commitMessage) {
      const ttl = await turtle.serialize({ format: 'Turtle' });
      await ctx.git.writeFile(path, ttl);
      await ctx.git.commit({ message: commitMessage, files: [path] });
    },

    async loadFromGit(path, revision = 'HEAD') {
      const ttl = await ctx.loadGraphFromGit(path, revision);
      // Parse and merge/replace...
      return turtle;
    },

    getJtbdHooks() {
      return ctx.jtbdHooks.extractFromGraph(turtle.store);
    }
  };
}

// ============================================================================
// src/integrations/hook-bridge.mjs
// ============================================================================

import { defineHook as unrdfDefineHook } from 'unrdf/knowledge-engine';
import { useGitVan } from '../core/context.mjs';

/**
 * GitVan hook wrapper that extends unrdf's defineHook
 */
export function defineGitVanHook(config) {
  const ctx = useGitVan();

  const unrdfHook = unrdfDefineHook({
    name: config.name,
    predicate: config.predicate,

    async handler(context) {
      const gitContext = {
        ...context,
        git: ctx.git,              // Git operations
        pack: ctx.pack,            // Pack system
        workflow: ctx.workflow,    // Workflow automation
      };

      const result = await config.handler(gitContext);

      // Auto-commit if configured
      if (config.autoCommit && result.modified) {
        await ctx.git.commit({
          message: `[${config.name}] ${result.commitMessage}`,
          files: result.modified
        });
      }

      return result;
    },

    condition: config.condition,
    priority: config.priority,
    tags: config.tags
  });

  // Register in GitVan's JTBD system
  if (config.jtbd) {
    ctx.jtbdHooks.register(config.jtbd, unrdfHook);
  }

  return unrdfHook;
}

// ============================================================================
// src/integrations/graph-git-sync.mjs
// ============================================================================

import { TransactionManager } from 'unrdf/knowledge-engine';
import { useGitVan } from '../core/context.mjs';

export class GraphGitSync {
  constructor(options = {}) {
    this.ctx = useGitVan();
    this.autoCommit = options.autoCommit !== false;
    this.commitPrefix = options.commitPrefix || '[graph]';
  }

  /**
   * Wrap unrdf transaction with Git commit
   */
  async transaction(callback, options = {}) {
    const txManager = new TransactionManager({
      enableObservability: true
    });

    const tx = txManager.begin({
      description: options.description || 'Graph update'
    });

    try {
      const result = await callback(tx);
      await tx.commit();

      // Auto-commit to Git
      if (this.autoCommit) {
        const graphPath = options.graphPath || 'knowledge/default.ttl';
        const store = tx.getStore();
        const ttl = await this.ctx.knowledgeEngine.serialize(store);

        await this.ctx.git.writeFile(graphPath, ttl);
        await this.ctx.git.commit({
          message: `${this.commitPrefix} ${options.description}`,
          files: [graphPath]
        });
      }

      return result;
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }

  /**
   * Load graph from Git revision
   */
  async loadRevision(path, revision = 'HEAD') {
    const ttl = await this.ctx.git.show({ revision, path });
    return this.ctx.knowledgeEngine.parseTurtle(ttl);
  }

  /**
   * Get graph diff between revisions
   */
  async diff(path, fromRev, toRev = 'HEAD') {
    const fromStore = await this.loadRevision(path, fromRev);
    const toStore = await this.loadRevision(path, toRev);

    const { useDelta } = await import('unrdf');
    const delta = useDelta();

    return delta.diff(fromStore, toStore);
  }
}
```

---

## Data Flow Diagrams

### Flow 1: Developer Creates JTBD Hook

```
┌──────────────┐
│  Developer   │
└──────┬───────┘
       │
       │ 1. gitvan hook create "create-feature-branch"
       ▼
┌──────────────────┐
│  CLI Layer       │
└──────┬───────────┘
       │
       │ 2. Parse command
       ▼
┌──────────────────┐
│  Hook Bridge     │
│  defineGitVan    │
│  Hook()          │
└──────┬───────────┘
       │
       │ 3. Convert to unrdf hook
       ▼
┌──────────────────┐
│  unrdf           │
│  defineHook()    │
└──────┬───────────┘
       │
       │ 4. Register hook
       ▼
┌──────────────────┐
│  Knowledge       │
│  Hook Manager    │
└──────┬───────────┘
       │
       │ 5. Serialize to Turtle
       ▼
┌──────────────────┐
│  Graph-Git Sync  │
└──────┬───────────┘
       │
       │ 6. Commit to Git
       ▼
┌──────────────────┐
│  Git Repository  │
│  knowledge/      │
│  hooks.ttl       │
└──────────────────┘
```

### Flow 2: Developer Executes Workflow

```
┌──────────────┐
│  Developer   │
└──────┬───────┘
       │
       │ 1. gitvan workflow run "deploy-to-prod"
       ▼
┌──────────────────┐
│  CLI Layer       │
└──────┬───────────┘
       │
       │ 2. Load workflow definition
       ▼
┌──────────────────┐
│  Turtle          │
│  Composable      │
│  (useGitVan      │
│   Turtle)        │
└──────┬───────────┘
       │
       │ 3. Parse Turtle from Git
       ▼
┌──────────────────┐
│  unrdf           │
│  useTurtle()     │
└──────┬───────────┘
       │
       │ 4. Extract JTBD hooks
       ▼
┌──────────────────┐
│  Hook Bridge     │
│  jtbdToUnrdf     │
│  Hook()          │
└──────┬───────────┘
       │
       │ 5. Execute hooks with Git context
       ▼
┌──────────────────┐
│  Workflow Engine │
│  + Git Ops       │
│  + Pack System   │
└──────┬───────────┘
       │
       │ 6. Perform Git operations
       ▼
┌──────────────────┐
│  Git Layer       │
│  (40+ commands)  │
└──────┬───────────┘
       │
       │ 7. Update repository
       ▼
┌──────────────────┐
│  Git Repository  │
└──────────────────┘
```

### Flow 3: Graph Transaction with Git Commit

```
┌──────────────┐
│  Application │
│  Code        │
└──────┬───────┘
       │
       │ 1. syncManager.transaction(...)
       ▼
┌──────────────────┐
│  Graph-Git Sync  │
└──────┬───────────┘
       │
       │ 2. Begin transaction
       ▼
┌──────────────────┐
│  unrdf           │
│  Transaction     │
│  Manager         │
└──────┬───────────┘
       │
       │ 3. Execute callback (modify graph)
       ▼
┌──────────────────┐
│  RDF Store       │
│  (N3.Store)      │
└──────┬───────────┘
       │
       │ 4. Commit transaction
       ▼
┌──────────────────┐
│  unrdf           │
│  Transaction     │
│  Manager         │
└──────┬───────────┘
       │
       │ 5. Serialize to Turtle
       ▼
┌──────────────────┐
│  unrdf           │
│  RdfEngine       │
└──────┬───────────┘
       │
       │ 6. Write file
       ▼
┌──────────────────┐
│  Git Operations  │
│  writeFile()     │
└──────┬───────────┘
       │
       │ 7. Commit to Git
       ▼
┌──────────────────┐
│  Git Operations  │
│  commit()        │
└──────┬───────────┘
       │
       │ 8. Update repository
       ▼
┌──────────────────┐
│  Git Repository  │
│  knowledge/      │
│  default.ttl     │
└──────────────────┘
```

---

## Deployment Diagram

**Purpose**: Show how GitVan is deployed and used in development environments.

```
┌────────────────────────────────────────────────────────────────────────┐
│                       Developer Machine                                │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Terminal / Shell                               │  │
│  │                                                                   │  │
│  │  $ npm install -g gitvan                                         │  │
│  │  $ gitvan init                                                   │  │
│  │  $ gitvan workflow run deploy-to-prod                            │  │
│  │                                                                   │  │
│  └─────────────────────────┬────────────────────────────────────────┘  │
│                            │                                            │
│                            │ executes                                   │
│                            ▼                                            │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    GitVan CLI (Node.js)                          │  │
│  │                                                                   │  │
│  │  • CLI Layer (Citty)                                             │  │
│  │  • Workflow Engine                                               │  │
│  │  • Integration Layer                                             │  │
│  │                                                                   │  │
│  └─────┬────────────────────────────┬──────────────────┬────────────┘  │
│        │                            │                  │                │
│        │ uses                       │ uses             │ uses           │
│        ▼                            ▼                  ▼                │
│  ┌─────────────┐          ┌─────────────────┐   ┌──────────────────┐  │
│  │  unrdf      │          │  Git Repository │   │  Ollama (Local   │  │
│  │  Library    │          │  (.git/)        │   │  LLM)            │  │
│  │             │          │                 │   │                  │  │
│  │  • Knowledge│          │  • .git/        │   │  • llama3        │  │
│  │    Engine   │          │  • knowledge/   │   │  • codellama     │  │
│  │  • RDF      │          │    ├── hooks.ttl│   │                  │  │
│  │    Engine   │          │    ├── jobs.ttl │   │  Port: 11434     │  │
│  │             │          │    └── graph.ttl│   │                  │  │
│  │  Node       │          │                 │   │                  │  │
│  │  modules    │          │  Working Tree   │   │                  │  │
│  │             │          │  • src/         │   │                  │  │
│  └─────────────┘          │  • tests/       │   └──────────────────┘  │
│                           │  • docs/        │                          │
│                           │                 │                          │
│                           └─────────────────┘                          │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘

External Services (Optional):

┌──────────────────────┐
│  GitHub              │
│  • Remote repository │
│  • CI/CD Actions     │
│  • Pack registry     │
└──────────────────────┘
        ▲
        │ push/pull
        │
┌──────────────────────┐
│  GitVan Marketplace  │
│  • Public packs      │
│  • Community hooks   │
│  • Templates         │
└──────────────────────┘
```

**Deployment Notes**:

1. **Installation**: Global npm package (`npm install -g gitvan`)
2. **Runtime**: Node.js 18+ (ESM modules)
3. **Storage**: Git repository (.git/ + working tree)
4. **Dependencies**: unrdf library (bundled in node_modules)
5. **Optional**: Ollama for AI features (local, port 11434)

---

## Technology Stack

### GitVan Layer
- **Runtime**: Node.js 18+ (ESM)
- **CLI**: Citty (command framework)
- **Context**: unctx (context management)
- **Config**: c12 (config loader)
- **Logging**: consola
- **AI**: Vercel AI SDK + Ollama
- **Scheduling**: node-cron

### unrdf Layer (Inherited)
- **RDF**: N3.js (Turtle parsing/serialization)
- **SPARQL**: Comunica (query engine)
- **SHACL**: rdf-validate-shacl
- **Validation**: Zod (runtime validation)
- **Templates**: Nunjucks
- **Observability**: OpenTelemetry

### Storage
- **Version Control**: Git
- **Knowledge Graphs**: Turtle (.ttl files)
- **Cache**: cacache (Git-native)

---

## Conclusion

These C4 diagrams illustrate GitVan's clean architecture:

1. **Level 1 (Context)**: GitVan as development automation platform
2. **Level 2 (Containers)**: GitVan + unrdf separation of concerns
3. **Level 3 (Components)**: Integration layer bridges GitVan and unrdf
4. **Level 4 (Code)**: Adapter pattern with thin wrappers

**Key Architectural Principles**:
- ✅ GitVan owns Git operations and development workflows
- ✅ unrdf owns RDF operations and knowledge management
- ✅ Integration layer provides clean adapters
- ✅ Composables are thin wrappers with Git extensions
- ✅ Single direction of dependency (GitVan → unrdf, never reverse)

**Next Steps**:
1. Review and approve architecture
2. Begin implementation (5-week migration plan)
3. Continuous validation against these diagrams
4. Update diagrams as architecture evolves
