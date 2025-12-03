# C4 Model: Context Diagram - GitVan v3.0.0

**Diagram Type**: C4 Level 1 (System Context)
**Scope**: GitVan v3.0.0
**Audience**: Technical stakeholders, architects, product owners
**Date**: 2025-12-02

---

## Overview

The System Context diagram shows GitVan v3.0.0 in its operational environment, including users, external systems, and high-level responsibilities.

---

## Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          External Context                               │
│                                                                         │
│   ┌──────────────┐                                                     │
│   │              │                                                     │
│   │  Developer   │──────────────────────┐                             │
│   │              │                      │                             │
│   │  (Person)    │                      │                             │
│   │              │                      │                             │
│   │  Executes    │                      │                             │
│   │  workflows,  │                      │                             │
│   │  installs    │                      │                             │
│   │  packs       │                      │                             │
│   └──────────────┘                      │                             │
│                                         │                             │
│                                         ▼                             │
│                        ┌─────────────────────────────────┐            │
│                        │                                 │            │
│                        │       GitVan v3.0.0             │            │
│                        │                                 │            │
│                        │   Git-Native Dev Automation     │            │
│                        │                                 │            │
│                        │  • Execute JTBD workflows       │            │
│                        │  • Manage project packs         │            │
│                        │  • Git-native I/O (locks/queue) │            │
│                        │  • Developer lifecycle hooks    │            │
│                        │                                 │            │
│                        └────────┬────────┬───────┬───────┘            │
│                                 │        │       │                    │
│                 ┌───────────────┘        │       └──────────────┐     │
│                 │                        │                      │     │
│                 ▼                        ▼                      ▼     │
│    ┌────────────────────┐   ┌────────────────────┐  ┌──────────────┐ │
│    │                    │   │                    │  │              │ │
│    │  unrdf v4.1.1      │   │  Git Repository    │  │  File System │ │
│    │                    │   │                    │  │              │ │
│    │  (Software System) │   │  (Software System) │  │  (External)  │ │
│    │                    │   │                    │  │              │ │
│    │  RDF knowledge     │   │  Version control,  │  │  Pack        │ │
│    │  graph, SPARQL,    │   │  locks via refs,   │  │  templates,  │ │
│    │  transactions,     │   │  receipts via      │  │  workflow    │ │
│    │  hooks, validation │   │  notes, snapshots  │  │  .ttl files  │ │
│    │                    │   │                    │  │              │ │
│    └────────────────────┘   └────────────────────┘  └──────────────┘ │
│                                                                         │
│    ┌─────────────────────────────────────────────────────────────┐    │
│    │  Optional: Pack Registry (Future v3.1)                      │    │
│    │  - npmjs.com or custom registry                             │    │
│    │  - Publish/discover packs                                   │    │
│    └─────────────────────────────────────────────────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Element Descriptions

### People

#### Developer
**Type**: Person
**Description**: Software developer using GitVan to automate development workflows, scaffold projects, and execute JTBD hooks.

**Responsibilities**:
- Execute workflows (e.g., PR merge validation, release automation)
- Install and customize packs (project templates)
- Run hooks at lifecycle events (pre-commit, dev-ready)
- Query knowledge graph (project state, dependencies)

**Examples**:
- Junior developer scaffolding first React project
- Senior developer automating release process
- DevOps engineer orchestrating CI/CD workflows

---

### Software Systems

#### GitVan v3.0.0
**Type**: Software System (focus of this architecture)
**Technology**: Node.js 18+, ESM modules
**Description**: Git-native development automation tool that executes workflows, manages packs, and provides developer lifecycle hooks.

**Key Capabilities**:
1. **Workflow Execution**: Parse and execute JTBD workflows defined in Turtle (.ttl) files with atomic transactions
2. **Pack Management**: Search, install, and publish project templates with Nunjucks rendering
3. **Git-Native I/O**: Distributed locks, priority queues, immutable receipts, and state snapshots backed by Git
4. **Hook System**: Trigger lifecycle hooks (pre-commit, dev-ready, pr-merge) bridged to unrdf's defineHook

**API Surface**:
- CLI: `gitvan workflow exec <file.ttl>`, `gitvan pack install <name>`, `gitvan hook run <hook>`
- Programmatic: `import { executeWorkflow, installPack } from 'gitvan'`

**Non-functional Requirements**:
- Performance: <2s for 10-step workflows, <5s pack installations
- Scalability: 10,000+ packs, 100+ concurrent workflows
- Security: Sandboxed template rendering, Zod validation, no shell injection
- Reliability: Atomic transactions, rollback on failure, audit trail

---

#### unrdf v4.1.1
**Type**: Software System (external dependency)
**Technology**: Node.js, RDF/SPARQL, N3, Comunica
**Description**: Production-ready RDF knowledge graph library providing parsing, querying, validation, and hook system.

**Services Used by GitVan**:
- `KnowledgeEngine`: Graph storage, SPARQL queries, transactions
- `defineHook`: Hook registration and execution
- `useTurtle`, `useGraph`, `useZod`: Composable APIs
- `lockchain-writer`: Immutable audit trail
- `observability`: OpenTelemetry integration

**Why External**:
- Mature, production-tested (v4.1.1)
- Standards-compliant (RDF, SPARQL, SHACL)
- Active development, community support
- Avoids reinventing RDF stack (40k+ LOC)

**Integration Pattern**:
```javascript
import { KnowledgeEngine } from 'unrdf/knowledge-engine';
import { useTurtle } from 'unrdf/composables';

const engine = new KnowledgeEngine({ baseIRI: 'http://gitvan.dev/' });
const { parseTurtle } = useTurtle();
```

---

#### Git Repository
**Type**: Software System (external)
**Technology**: Git 2.30+
**Description**: Version control system used as persistence layer for GitVan's state (locks, queues, receipts, snapshots).

**GitVan's Git Usage**:
1. **Locks**: `refs/locks/<name>` → atomic lock acquisition via `git update-ref`
2. **Queues**: `refs/notes/gitvan/queue/<priority>` → priority task queues
3. **Receipts**: `refs/receipts/<hash>` → immutable audit trail
4. **Snapshots**: `refs/snapshots/<timestamp>` → workflow state snapshots

**Why Git-Native**:
- **Distributed**: Works offline, no central server required
- **Atomic**: Git refs provide atomic compare-and-swap
- **Durable**: Receipts persist across repo clones/forks
- **Auditable**: Full history via Git log
- **Concurrent**: Multiple workers can coordinate via refs

**Example**:
```bash
# Acquire lock
git update-ref refs/locks/build $(git commit-tree <tree> -p HEAD)

# Enqueue task
git notes --ref=gitvan/queue/high add -m '{"task": "test"}' HEAD

# Write receipt
git update-ref refs/receipts/$(echo "workflow://build" | sha256sum) <commit>
```

---

#### File System
**Type**: External System
**Technology**: POSIX filesystem
**Description**: Local filesystem containing pack templates, workflow definitions, and project files.

**GitVan's Filesystem Usage**:
- `.gitvan/packs/catalog/*.ttl`: Pack definitions
- `.gitvan/workflows/*.ttl`: Workflow definitions
- `.gitvan/hooks/*.ttl`: Hook definitions
- `node_modules/gitvan/`: Installed CLI and libraries

**Interaction Pattern**:
```javascript
// Read workflow definition
const workflowTtl = await readFile('.gitvan/workflows/pr-merge.ttl', 'utf-8');

// Install pack templates
await copyRecursively('node_modules/gitvan/packs/nextjs/', './');
```

---

## Relationships

### Developer → GitVan
**Type**: Uses
**Protocol**: CLI commands, programmatic API
**Data**: Workflow files (.ttl), pack names, hook names
**Examples**:
```bash
gitvan workflow exec .gitvan/workflows/release.ttl
gitvan pack install nextjs-starter
gitvan hook run dev-ready
```

---

### GitVan → unrdf
**Type**: Depends on
**Protocol**: ES module imports
**Data**: RDF graphs (Turtle), SPARQL queries, hook definitions
**Purpose**:
- Parse workflow definitions (Turtle → RDF Store)
- Execute SPARQL queries (pack search)
- Trigger hooks (defineHook bridge)
- Manage transactions (commit/rollback)

**Integration Points**:
```javascript
// Parse workflow
import { useTurtle } from 'unrdf/composables';
const store = await parseTurtle(workflowTtl);

// Search packs
import { KnowledgeEngine } from 'unrdf/knowledge-engine';
const results = await engine.query(`SELECT ?pack WHERE { ?pack a gitvan:Pack }`);

// Execute hook
import { defineHook } from 'unrdf/knowledge-engine';
await engine.executeHook('workflow:pre-step', context);
```

---

### GitVan → Git Repository
**Type**: Reads from / Writes to
**Protocol**: Git CLI (`git` command via `child_process.execFile`)
**Data**: Git refs, notes, commits, trees
**Purpose**:
- Acquire/release locks (refs/locks/*)
- Enqueue/dequeue tasks (refs/notes/gitvan/queue/*)
- Write receipts (refs/receipts/*)
- Create snapshots (refs/snapshots/*)

**Example Operations**:
```javascript
// Acquire lock
await runGit(['update-ref', 'refs/locks/build', commitSha]);

// Write receipt
await runGit(['update-ref', 'refs/receipts/abc123', receiptCommit]);
```

---

### GitVan → File System
**Type**: Reads from / Writes to
**Protocol**: Node.js `fs` module
**Data**: .ttl files, templates, project files
**Purpose**:
- Load workflow/hook/pack definitions
- Render and write pack templates
- Read project configuration

**Example Operations**:
```javascript
// Load workflow
const ttl = await fs.readFile('.gitvan/workflows/release.ttl', 'utf-8');

// Write pack file
await fs.writeFile('package.json', renderedTemplate);
```

---

## Design Constraints

### C1: Node.js 18+ Required
**Reason**: ESM support, modern JavaScript features (top-level await)
**Impact**: Users must have Node 18+ installed
**Mitigation**: Check Node version in CLI, provide upgrade guide

### C2: Git 2.30+ Required
**Reason**: `git update-ref --create-reflog` flag
**Impact**: Users must have modern Git installed
**Mitigation**: Check Git version in CLI, provide upgrade guide

### C3: unrdf v4.1.x Dependency
**Reason**: Production-ready RDF stack, active development
**Impact**: GitVan tied to unrdf release cycle
**Mitigation**: Lock to v4.x, contribute fixes upstream, avoid forking

### C4: POSIX Filesystem Assumed
**Reason**: `.gitvan/` directory structure, symlinks
**Impact**: Windows support may require workarounds (WSL recommended)
**Mitigation**: Test on Windows, provide WSL guide

### C5: Offline-First
**Reason**: Git-native I/O works without network
**Impact**: Pack registry must work locally (remote registry is v3.1+)
**Mitigation**: Ship default packs in `.gitvan/packs/catalog/`

---

## Quality Attributes (Cross-Cutting Concerns)

### Performance
- **Target**: <2s for 10-step workflows, <5s pack installations
- **Strategy**: Parallel execution, LRU caching, batched Git operations
- **Measurement**: Continuous benchmarks in CI

### Scalability
- **Target**: 10,000+ packs, 100+ concurrent workflows
- **Strategy**: SPARQL indexes, Git ref namespacing, worker pools
- **Measurement**: Stress tests (1000 packs, 100 workers)

### Security
- **Threats**: Malicious pack templates, shell injection, RDF RCE
- **Strategy**: Zod validation, sandboxed rendering (vm2), SPARQL whitelisting
- **Measurement**: Security scans (npm audit, Bandit)

### Observability
- **Instrumentation**: OpenTelemetry spans (via unrdf)
- **Metrics**: Workflow duration, lock contention, pack installs
- **Logs**: Structured JSON logs (winston)

### Maintainability
- **Code Quality**: JSDoc, ESLint, Prettier, 80%+ test coverage
- **Modularity**: Clear boundaries, no circular dependencies (Madge)
- **Documentation**: ADRs, C4 diagrams, API reference

---

## Evolution (Future Context)

### v3.1.0: Remote Pack Registry
**Change**: Add external pack registry (npmjs.com or custom)
**Impact**: New relationship GitVan ↔ Pack Registry (HTTP API)
**Diagram Update**: Add "Pack Registry" external system

### v3.2.0: Browser Support
**Change**: Run workflows in browser (WebAssembly)
**Impact**: New deployment target, IndexedDB instead of Git
**Diagram Update**: Add "Browser" as environment

### v4.0.0: Cloud-Native
**Change**: Kubernetes Operator for workflow orchestration
**Impact**: New relationship GitVan ↔ Kubernetes API
**Diagram Update**: Add "Kubernetes Cluster" external system

---

## References

- **C4 Model**: https://c4model.com/
- **GitVan v3 Architecture**: `/Users/sac/gitvan/docs/GITVAN-V3-ARCHITECTURE.md`
- **unrdf Documentation**: `/Users/sac/unrdf/README.md`
- **Git Internals**: https://git-scm.com/book/en/v2/Git-Internals-Git-References
