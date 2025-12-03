# C4 Model: Container Diagram - GitVan v3.0.0

**Diagram Type**: C4 Level 2 (Container)
**Scope**: GitVan v3.0.0 internals
**Audience**: Developers, architects
**Date**: 2025-12-02

---

## Overview

The Container diagram shows the internal structure of GitVan v3.0.0, including major modules, their responsibilities, and how they interact with each other and external systems.

---

## Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              GitVan v3.0.0                                 │
│                         (Node.js Application)                              │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────┐    │
│  │                        CLI Layer (citty)                          │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │    │
│  │  │  workflow    │  │    pack      │  │    hook      │           │    │
│  │  │  commands    │  │  commands    │  │  commands    │           │    │
│  │  │              │  │              │  │              │           │    │
│  │  │  - exec      │  │  - install   │  │  - run       │           │    │
│  │  │  - validate  │  │  - search    │  │  - list      │           │    │
│  │  │  - dry-run   │  │  - publish   │  │  - init      │           │    │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │    │
│  │         │                 │                 │                     │    │
│  │         │      citty      │     citty       │      citty          │    │
│  │         │    framework    │    framework    │    framework        │    │
│  └─────────┼─────────────────┼─────────────────┼─────────────────────┘    │
│            │                 │                 │                          │
│            │                 │                 │                          │
│  ┌─────────▼─────────────────▼─────────────────▼─────────────────────┐    │
│  │                   Integration Layer                               │    │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │    │
│  │  │  unrdf         │  │  Git Ops       │  │  Config        │     │    │
│  │  │  Adapter       │  │  Wrapper       │  │  Loader        │     │    │
│  │  │                │  │                │  │                │     │    │
│  │  │  - Engine init │  │  - runGit()    │  │  - .gitvan/    │     │    │
│  │  │  - Composables │  │  - Safe exec   │  │  - Validation  │     │    │
│  │  └────────────────┘  └────────────────┘  └────────────────┘     │    │
│  └───────────────────────────────────────────────────────────────────┘    │
│            │                 │                 │                          │
│  ┌─────────┼─────────────────┼─────────────────┼─────────────────────┐    │
│  │         │                 │                 │                     │    │
│  │  ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐            │    │
│  │  │  Workflow   │   │ Git-Native  │   │    Packs    │            │    │
│  │  │  Engine     │   │    I/O      │   │   System    │            │    │
│  │  │             │   │             │   │             │            │    │
│  │  │  Components:│   │  Components:│   │  Components:│            │    │
│  │  │  ───────────│   │  ───────────│   │  ───────────│            │    │
│  │  │  • Executor │   │  • LockMgr  │   │  • Registry │            │    │
│  │  │  • Parser   │   │  • QueueMgr │   │  • Installer│            │    │
│  │  │  • State    │   │  • Receipts │   │  • Templates│            │    │
│  │  │  • Scheduler│   │  • Snapshot │   │  • Validator│            │    │
│  │  │             │   │  • WorkerPool│   │             │            │    │
│  │  │  8,450 LOC total across all modules                          │    │
│  │  │  (vs 76,483 in v2.1.1 = 89% reduction)                       │    │
│  │  └─────────────┘   └─────────────┘   └─────────────┘            │    │
│  │         │                 │                 │                     │    │
│  │         └─────────────────┼─────────────────┘                     │    │
│  │                           │                                       │    │
│  │                    ┌──────▼──────┐                                │    │
│  │                    │    Hooks    │                                │    │
│  │                    │   Bridge    │                                │    │
│  │                    │             │                                │    │
│  │                    │  • Pre-step │                                │    │
│  │                    │  • Post-step│                                │    │
│  │                    │  • Built-in │                                │    │
│  │                    └─────────────┘                                │    │
│  │                           │                                       │    │
│  └───────────────────────────┼───────────────────────────────────────┘    │
│                              │                                            │
└──────────────────────────────┼────────────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌────────────────┐   ┌──────────────────┐   ┌──────────────┐
│  unrdf v4.1.1  │   │  Git Repository  │   │ File System  │
│                │   │                  │   │              │
│  • KnowEngine  │   │  • refs/locks/*  │   │  • .gitvan/  │
│  • defineHook  │   │  • refs/notes/*  │   │  • templates │
│  • SPARQL      │   │  • refs/receipts │   │  • .ttl files│
│  • Txns        │   │                  │   │              │
└────────────────┘   └──────────────────┘   └──────────────┘
```

---

## Container Descriptions

### CLI Layer (citty)

**Technology**: citty v0.1.6 (UnJS CLI framework)
**Purpose**: User interface for GitVan operations
**Responsibilities**:
- Parse CLI arguments and validate inputs
- Route commands to appropriate modules
- Display progress (spinners, tables)
- Format output (JSON, human-readable)

**Commands**:

#### workflow commands
```bash
gitvan workflow exec <file.ttl> [--dry-run] [--verbose]
gitvan workflow validate <file.ttl>
gitvan workflow list
```

**Implementation**:
```javascript
// src/cli/commands/workflow.mjs
export default defineCommand({
  meta: { name: 'workflow', description: 'Workflow operations' },
  subCommands: {
    exec: defineCommand({ /* ... */ }),
    validate: defineCommand({ /* ... */ }),
    list: defineCommand({ /* ... */ })
  }
});
```

#### pack commands
```bash
gitvan pack install <name> [--dir <path>]
gitvan pack search <query>
gitvan pack publish <dir>
gitvan pack list [--installed]
```

#### hook commands
```bash
gitvan hook run <hook-name> [--context <json>]
gitvan hook list
gitvan hook init <template>
```

**LOC Estimate**: 800
**Dependencies**: `citty`, `table`, integration layer

---

### Integration Layer

**Technology**: ES modules, adapter pattern
**Purpose**: Provide GitVan-specific wrappers around external dependencies
**Responsibilities**:
- Initialize unrdf KnowledgeEngine with GitVan defaults
- Wrap Git operations with error handling and logging
- Load and validate configuration from `.gitvan/`

**Components**:

#### unrdf Adapter
```javascript
// src/integration/knowledge-engine.mjs
export function createGitVanEngine(options = {}) {
  return new KnowledgeEngine({
    baseIRI: 'http://gitvan.dev/',
    enableLockchain: true,
    enableObservability: options.telemetry ?? false,
    ...options
  });
}

// Re-export composables
export {
  useTurtle,
  useGraph,
  useZod,
  useValidator
} from 'unrdf/composables';
```

#### Git Ops Wrapper
```javascript
// src/integration/git-wrapper.mjs
export async function runGit(args, options = {}) {
  // Deterministic environment
  const env = {
    ...process.env,
    TZ: 'UTC',
    LANG: 'C',
    GIT_AUTHOR_DATE: options.fixedDate || process.env.GIT_AUTHOR_DATE
  };

  return execFile('git', args, { env, cwd: options.cwd });
}
```

#### Config Loader
```javascript
// src/integration/config.mjs
export async function loadGitVanConfig(cwd = process.cwd()) {
  const configPath = path.join(cwd, '.gitvan', 'config.yaml');
  const yaml = await readFile(configPath, 'utf-8');
  return YAML.parse(yaml);
}
```

**LOC Estimate**: 500
**Dependencies**: `unrdf`, `child_process`, `yaml`

---

### Workflow Engine

**Technology**: ES modules, unrdf transactions
**Purpose**: Parse and execute JTBD workflows from Turtle files
**Responsibilities**:
- Parse workflow definitions (Turtle → AST)
- Resolve step dependencies (topological sort)
- Execute steps with atomicity (transactions)
- Trigger hooks at lifecycle events
- Rollback on failure

**Components**:

#### Executor
```javascript
// src/workflows/executor.mjs
export async function executeWorkflow(workflowTtl, options = {}) {
  const tx = await beginTransaction();
  const io = new GitNativeIO();

  try {
    const { steps } = await parseWorkflow(workflowTtl);

    for (const step of steps) {
      await triggerHook('workflow:pre-step', { step, tx });

      const lock = await io.acquireLock(`workflow:${step.name}`);
      try {
        const result = await executeStep(step, { tx, io });
        await io.writeReceipt(`workflow://${step.name}`, result);
      } finally {
        await io.releaseLock(`workflow:${step.name}`);
      }

      await triggerHook('workflow:post-step', { step, result, tx });
    }

    await tx.commit();
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}
```

#### Parser
```javascript
// src/workflows/parser.mjs
export async function parseWorkflow(ttl) {
  const { parseTurtle } = useTurtle();
  const store = await parseTurtle(ttl);

  const workflow = extractWorkflow(store); // SPARQL query
  const steps = extractSteps(store);       // SPARQL query
  const deps = extractDependencies(store); // SPARQL query

  return { workflow, steps, deps };
}
```

**LOC Estimate**: 1,500
**Dependencies**: `unrdf/composables`, `git-native/`, `hooks/`

---

### Git-Native I/O

**Technology**: Git plumbing commands, Node.js child_process
**Purpose**: Deterministic task execution backed by Git refs
**Responsibilities**:
- Acquire/release distributed locks (refs/locks/*)
- Enqueue/dequeue priority tasks (refs/notes/gitvan/queue/*)
- Write immutable receipts (refs/receipts/*)
- Create/restore state snapshots (refs/snapshots/*)
- Manage worker pool for parallel execution

**Components**:

#### LockManager
```javascript
// src/git-native/LockManager.mjs
export class LockManager {
  async acquireLock(name, options = {}) {
    const lockRef = `refs/locks/${name}`;
    const commitSha = await createEmptyCommit(`Lock ${name}`);

    try {
      // Atomic lock via update-ref (fails if ref exists)
      await runGit(['update-ref', lockRef, commitSha, ZERO_OID]);
      return { name, ref: lockRef, sha: commitSha };
    } catch (error) {
      throw new Error(`Lock ${name} already held`);
    }
  }

  async releaseLock(name) {
    await runGit(['update-ref', '-d', `refs/locks/${name}`]);
  }
}
```

#### QueueManager
```javascript
// src/git-native/QueueManager.mjs
export class QueueManager {
  async enqueue(priority, task, metadata = {}) {
    const noteRef = `refs/notes/gitvan/queue/${priority}`;
    const noteData = JSON.stringify({
      task,
      metadata,
      timestamp: Date.now()
    });

    await runGit(['notes', '--ref', noteRef, 'add', '-m', noteData, 'HEAD']);
  }

  async dequeue(priority) {
    const noteRef = `refs/notes/gitvan/queue/${priority}`;
    const notes = await runGit(['notes', '--ref', noteRef, 'list']);

    if (!notes) return null;

    const [sha, ...rest] = notes.split('\n')[0].split(' ');
    const noteData = await runGit(['notes', '--ref', noteRef, 'show', sha]);

    // Remove note
    await runGit(['notes', '--ref', noteRef, 'remove', sha]);

    return JSON.parse(noteData);
  }
}
```

**LOC Estimate**: 2,000 (REFACTORED from v2)
**Dependencies**: `git/operations.mjs`, Node.js `child_process`

---

### Packs System

**Technology**: unrdf graph storage, Nunjucks, Zod
**Purpose**: Template-based project scaffolding
**Responsibilities**:
- Search pack catalog via SPARQL
- Install packs (render templates, copy files)
- Validate pack manifests (Zod schemas)
- Publish packs to local catalog

**Components**:

#### Registry (SINGLE implementation)
```javascript
// src/packs/registry.mjs
export class PackRegistry {
  constructor() {
    this.engine = createGitVanEngine();
  }

  async load() {
    const files = await glob('.gitvan/packs/catalog/*.ttl');
    for (const file of files) {
      const ttl = await readFile(file, 'utf-8');
      await this.engine.parseTurtle(ttl);
    }
  }

  async search(query) {
    return this.engine.query(`
      SELECT ?pack ?name ?description ?version ?tags
      WHERE {
        ?pack a gitvan:Pack ;
              gitvan:name ?name ;
              gitvan:description ?description ;
              gitvan:version ?version ;
              gitvan:tags ?tags .
        FILTER(
          CONTAINS(LCASE(?name), LCASE("${query}")) ||
          CONTAINS(LCASE(?description), LCASE("${query}")) ||
          CONTAINS(LCASE(?tags), LCASE("${query}"))
        )
      }
      ORDER BY ?name
    `);
  }
}
```

#### Installer
```javascript
// src/packs/installer.mjs
export async function installPack(packName, targetDir) {
  const registry = new PackRegistry();
  await registry.load();

  const pack = await registry.get(packName);
  if (!pack) throw new Error(`Pack not found: ${packName}`);

  // Render templates
  for (const file of pack.files) {
    const template = await readFile(file.templatePath, 'utf-8');
    const rendered = nunjucks.renderString(template, pack.variables);
    await writeFile(path.join(targetDir, file.path), rendered);
  }

  // Write receipt
  await writeReceipt(`pack://${packName}`, { installed: true, version: pack.version });
}
```

**LOC Estimate**: 1,200
**Dependencies**: `unrdf`, `nunjucks`, `zod`

---

### Hooks Bridge

**Technology**: unrdf defineHook, Git operations
**Purpose**: Connect GitVan workflows to unrdf's hook system
**Responsibilities**:
- Register GitVan-specific hooks
- Trigger hooks at lifecycle events
- Provide context (workflow state, Git info)
- Execute built-in hooks

**Components**:

#### Bridge
```javascript
// src/hooks/bridge.mjs
import { defineHook } from 'unrdf/knowledge-engine';

export function registerGitVanHooks() {
  defineHook('workflow:pre-step', async (context) => {
    // Pre-step validation, env setup
  });

  defineHook('workflow:post-step', async (context) => {
    // Post-step cleanup, metrics
  });

  defineHook('git:pre-commit', async (context) => {
    // Linting, tests
  });
}
```

#### Built-in Hooks
```javascript
// src/hooks/builtin/dev-ready.mjs
export async function devReadyHook(context) {
  // Check Node.js version
  const nodeVersion = process.version;
  if (!nodeVersion.match(/v18\.|v20\./)) {
    throw new Error('Node.js 18+ required');
  }

  // Check Git config
  const gitConfig = await runGit(['config', '--get', 'user.email']);
  if (!gitConfig) {
    throw new Error('Git user.email not configured');
  }

  // Check dependencies
  await execFile('npm', ['install', '--dry-run']);
}
```

**LOC Estimate**: 800
**Dependencies**: `unrdf/knowledge-engine`, `git/`

---

## Data Flows

### Workflow Execution Flow

```
CLI (exec command)
  → Integration Layer (config, validation)
    → Workflow Engine (parse .ttl)
      → unrdf (parseTurtle)
    → Workflow Engine (execute steps)
      → Hooks Bridge (pre-step hook)
      → Git-Native I/O (acquire lock)
      → Execute step command
      → Git-Native I/O (write receipt, release lock)
      → Hooks Bridge (post-step hook)
    → Workflow Engine (commit transaction)
      → unrdf (transaction commit)
```

---

### Pack Installation Flow

```
CLI (install command)
  → Integration Layer (validate pack name)
    → Packs System (search registry)
      → unrdf (SPARQL query)
    → Packs System (install pack)
      → File System (read templates)
      → Packs System (render Nunjucks)
      → File System (write files)
      → Git-Native I/O (write receipt)
```

---

## Inter-Container Communication

| From | To | Protocol | Data | Purpose |
|------|----|---------|----|---------|
| CLI | Integration Layer | Function calls | Args, options | Delegate to core |
| Integration Layer | unrdf | ES imports | RDF, SPARQL | Parse, query |
| Integration Layer | Git | child_process | Git commands | Plumbing ops |
| Workflow Engine | Git-Native I/O | Function calls | Lock names, tasks | Coordination |
| Workflow Engine | Hooks Bridge | Function calls | Context | Lifecycle events |
| Packs System | unrdf | SPARQL | Pack queries | Search catalog |
| Git-Native I/O | Git | child_process | refs, notes | State persistence |

---

## Deployment

### Development
```bash
git clone https://github.com/gitvan/gitvan.git
cd gitvan
pnpm install
pnpm build
pnpm link
```

### Production (npm)
```bash
npm install -g gitvan@3.0.0
gitvan workflow exec .gitvan/workflows/release.ttl
```

### Docker (future v3.1)
```bash
docker run -v $(pwd):/workspace gitvan/gitvan:3.0.0 workflow exec release.ttl
```

---

## Quality Attributes

### Performance Characteristics

| Operation | Target | Measured |
|-----------|--------|----------|
| Workflow parse | <100ms | TBD |
| 10-step workflow | <2s | TBD |
| Pack search (1000 packs) | <50ms | TBD |
| Pack install | <5s | TBD |
| Lock acquire | <100ms | TBD |

### Scalability Limits

| Resource | Limit | Bottleneck |
|----------|-------|------------|
| Concurrent workflows | 100+ | Lock contention |
| Pack catalog size | 10,000+ | SPARQL query time |
| Workflow steps | 1,000+ | Memory (transaction state) |
| Worker pool | 50 workers | CPU cores |

---

## Security Boundaries

### Trust Zones

1. **Trusted**: GitVan core code (`src/`)
2. **Semi-trusted**: Workflow .ttl files (user-authored, validated)
3. **Untrusted**: Pack templates (external, sandboxed)

### Security Controls

- **Input validation**: Zod schemas for all external inputs
- **Sandboxing**: Template rendering in isolated-vm (future)
- **SPARQL injection**: Parameterized queries only
- **Shell injection**: No shell interpolation, use `execFile`
- **File access**: Restricted to `.gitvan/` and project root

---

## References

- **C4 Level 1**: `/Users/sac/gitvan/docs/architecture/C4-CONTEXT-DIAGRAM.md`
- **Architecture Doc**: `/Users/sac/gitvan/docs/GITVAN-V3-ARCHITECTURE.md`
- **ADR-001**: Complete Rewrite Decision
