# GitVan Git Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        GitVan Application Layer                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │   CLI Commands   │  │  Workflows       │  │  Knowledge Hooks │      │
│  │  (hooks, save)   │  │  (workflow run)  │  │  (evaluate)      │      │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘      │
│           │                     │                     │                  │
└───────────┼─────────────────────┼─────────────────────┼──────────────────┘
            │                     │                     │
┌───────────┼─────────────────────┼─────────────────────┼──────────────────┐
│           └─────────────────────┼─────────────────────┘                  │
│                                 │                                        │
│                        Composable Layer                                  │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                                                                │    │
│  │  useGit()        │ useLock()      │ useReceipt()             │    │
│  │  (70+ ops)       │ (distributed)  │ (audit trail)            │    │
│  │                  │                │                          │    │
│  │ useHybridGit()   │ useNotes()     │ test-environment         │    │
│  │ (MemFS/Native)   │ (metadata)     │ (hybrid backends)        │    │
│  │                  │                │                          │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                     ↓                ↓              ↓                    │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │              Git Native I/O Layer (Enterprise Features)        │    │
│  │                                                                │    │
│  │  ┌──────────────────────────────────────────────────────┐     │    │
│  │  │         GitNativeIO (Facade)                         │     │    │
│  │  │  - Queues, Locks, Receipts, Snapshots, Workers      │     │    │
│  │  └──────────────────────────────────────────────────────┘     │    │
│  │              ↓              ↓              ↓              ↓     │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │    │
│  │  │LockManager  │  │QueueManager │  │ReceiptWriter│ │Snapshot││    │
│  │  │(atomic ops) │  │(job mgmt)   │  │(audit log)  │  │Store   ││    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │    │
│  │  ┌──────────────────────────────────────────────────────┐     │    │
│  │  │              WorkerPool (non-blocking)              │     │    │
│  │  │                    (worker threads)                 │     │    │
│  │  └──────────────────────────────────────────────────────┘     │    │
│  │                                                                │    │
│  └────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
                                 ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                        Git Execution Layer                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │         Backend Selection (Context-Aware)                    │      │
│  │   [process.env.NODE_ENV === "test" ? MemFS : Native]        │      │
│  └──────────────────────────────────────────────────────────────┘      │
│                              ↓                                           │
│        ┌─────────────────────┴─────────────────────┐                   │
│        ↓                                           ↓                    │
│  ┌──────────────────┐                     ┌──────────────────┐         │
│  │  MemFS Backend   │                     │ Native Git       │         │
│  │  (Testing)       │                     │ (Production)     │         │
│  │                  │                     │                  │         │
│  │ isomorphic-git   │                     │ execFile + git   │         │
│  │ memfs vol        │                     │ CLI              │         │
│  └──────────────────┘                     └──────────────────┘         │
│                                                                          │
│  Deterministic Environment:  TZ=UTC, LANG=C                            │
│  Context Management:         UnJS unctx                                │
│  Command Execution:          POSIX-first, no external deps             │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                                 ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                      Git Storage (Repository)                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Git Objects:      Trees, Blobs, Commits, Tags                          │
│  Git Refs:         Branches (refs/heads/*)                              │
│  GitVan Refs:      Locks (refs/gitvan/locks/*)                          │
│                    Snapshots (refs/gitvan/snapshots/*)                  │
│                    Receipts (notes, refs/gitvan/receipts/*)             │
│  Working Tree:     File system (actual/virtual)                         │
│  Index:            Staging area                                         │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## Component Interaction Flow

### 1. useGit() Component

```
useGit()
├─ Context Binding (unctx)
│  ├─ Get GitVan context
│  ├─ Resolve cwd (context or process.cwd())
│  └─ Setup deterministic env (TZ=UTC, LANG=C)
│
├─ Repo Info Methods
│  ├─ branch()
│  ├─ head()
│  ├─ repoRoot()
│  └─ info()
│
├─ Read-only Methods
│  ├─ log()
│  ├─ statusPorcelain()
│  ├─ diff()
│  └─ revList()
│
├─ Write Methods
│  ├─ add()
│  ├─ commit()
│  ├─ tag()
│  └─ writeFile()
│
├─ Branch Methods
│  ├─ branchList()
│  ├─ branchCreate()
│  ├─ branchDelete()
│  ├─ checkout()
│  └─ switch()
│
├─ Integration Methods
│  ├─ merge()
│  ├─ rebase()
│  ├─ cherryPick()
│  └─ revert()
│
├─ Remote Methods
│  ├─ fetch()
│  ├─ push()
│  └─ pull()
│
└─ Notes & Locks
   ├─ noteAdd()
   ├─ updateRefCreate()
   └─ listRefs()
```

### 2. useHybridGit() Component

```
useHybridGit()
├─ Backend Initialization
│  ├─ MemFS Setup
│  │  ├─ vol.mkdirSync()
│  │  ├─ isomorphic-git init
│  │  └─ Test config
│  │
│  └─ Native Setup
│     ├─ mkdtemp() → tmpdir
│     ├─ execSync("git init")
│     └─ Git config
│
├─ Backend Management
│  ├─ useMemFS()  → Switch to MemFS
│  ├─ useNative() → Switch to Native
│  └─ Auto-select → NODE_ENV aware
│
├─ Git Operations
│  ├─ add()
│  ├─ commit()
│  ├─ log()
│  ├─ status()
│  ├─ checkout()
│  └─ merge()
│
├─ File Operations (MemFS only)
│  ├─ writeFile()
│  ├─ readFile()
│  └─ exists()
│
└─ Lifecycle
   ├─ initialize()
   ├─ syncToNative()
   └─ cleanup()
```

### 3. GitNativeIO (Enterprise Layer)

```
GitNativeIO
├─ Initialization
│  ├─ QueueManager
│  ├─ LockManager
│  ├─ ReceiptWriter
│  ├─ SnapshotStore
│  ├─ WorkerPool
│  └─ Reconcile state
│
├─ Lock Management
│  ├─ acquireLock(name, options)
│  ├─ releaseLock(name)
│  └─ Get lock status
│
├─ Job Execution
│  ├─ addJob(priority, fn, options)
│  ├─ Execute job
│  └─ Queue reconciliation
│
├─ Receipt Management
│  ├─ writeReceipt(id, data, opts)
│  ├─ Read receipt
│  └─ List receipt commits
│
├─ Snapshot Management
│  ├─ createSnapshot(label)
│  ├─ readSnapshot(label)
│  └─ Rollback capability
│
└─ Worker Management
   ├─ Execute in worker thread
   ├─ Non-blocking operations
   └─ Worker lifecycle
```

## Data Flow Examples

### Flow 1: Simple Commit

```
User Code
  ↓
const git = useGit()
  ↓
git.add(['file.js'])
  ↓
runGit(['add', '--', 'file.js'])
  ↓
execFile('git', args, {cwd, env})
  ↓
Git updates index
  ↓
git.commit('feat: new feature')
  ↓
runGit(['commit', '-m', 'feat: new feature'])
  ↓
execFile('git', args, {cwd, env})
  ↓
Git creates commit object
  ↓
Return commit hash
```

### Flow 2: Distributed Lock Acquisition

```
const lock = useLock()
  ↓
lock.acquire('build', {timeout: 60000})
  ↓
generateLockRef('refs/gitvan/locks/build')
  ↓
createBlob(JSON.stringify(lockData))
  ↓
git.updateRefCreate(lockRef, blobSha)
  ↓
execFile('git', ['update-ref', ref, sha])
  ↓
Git attempts atomic ref creation
  ↓
  ├─ Success: Return true, lock acquired
  └─ Failure: Check expiration, retry or return false
```

### Flow 3: Hybrid Backend Test

```
withMemFSTestEnvironment(opts, testFn)
  ↓
Create HybridGitEnvironment
  ↓
Initialize MemFS backend
  ├─ vol.mkdirSync()
  └─ isomorphic-git.init()
  ↓
Initialize Native backend (tmpdir)
  ├─ mkdtemp()
  └─ execSync('git init')
  ↓
Select MemFS as active backend
  ↓
Execute test function
  ├─ Calls git operations
  └─ Operations use MemFS backend
  ↓
cleanup()
  ├─ rm(tmpdir) → remove native dir
  └─ vol.reset() → clear MemFS
```

## Storage Architecture

### Git Refs Organization

```
refs/
├─ heads/              # Local branches
│  ├─ main
│  ├─ develop
│  └─ feature/*
├─ remotes/            # Remote tracking branches
│  └─ origin/*
├─ tags/               # Tags
│  └─ v*
└─ gitvan/             # GitVan internal
   ├─ locks/           # Distributed locks
   │  ├─ build
   │  ├─ deploy
   │  └─ *
   ├─ snapshots/       # State snapshots
   │  ├─ backup-1
   │  └─ *
   └─ receipts/        # Via git notes
      └─ (attached to commits)
```

### Git Objects Storage

```
Objects in Git Database:
├─ Commit Objects
│  └─ Contains tree, parent, author, timestamp, message
├─ Tree Objects
│  └─ Maps paths to blobs/trees
├─ Blob Objects
│  └─ File contents
├─ Tag Objects
│  └─ References to commits
└─ Notes Objects
   └─ Metadata attached to any object
      ├─ Lock metadata
      ├─ Receipt data
      └─ Custom metadata
```

## State Consistency Guarantees

### Atomic Operations

```
Atomic Ref Creation (Locks)
├─ Git update-ref command
├─ Either creates ref or fails
└─ No partial state possible

Atomic Snapshot Creation
├─ write-tree → get tree hash
├─ commit-tree → get commit hash
├─ update-ref → atomically set ref
└─ All or nothing

Atomic Note Addition
├─ noteAdd with -f flag
├─ Updates or creates atomically
└─ Consistent metadata storage
```

### Conflict Handling

```
Merge Conflicts
├─ Detected automatically by Git
├─ Marked in working tree (<<<, ===, >>>)
├─ Exit code != 0
└─ User must resolve manually

Lock Expiration
├─ Check timestamp in lock object
├─ Detect expired locks
├─ Clean up and retry
└─ Timeout protection

Worker Failures
├─ Job execution timeout
├─ Lock release on failure
├─ Receipt with error status
└─ Rollback via snapshot
```

## Performance Characteristics

### Operation Complexity

```
O(1) Operations:           O(n) Operations:
├─ branch()                ├─ log() [with all commits]
├─ head()                  ├─ branchList()
├─ isClean()              ├─ statusPorcelain()
├─ tag()                  └─ revList()
├─ checkout()
└─ noteAdd()

O(n) (with file count):
├─ add(paths)
├─ commit() [scan working tree]
├─ statusPorcelain() [scan fs]
└─ diff()
```

### Backend Performance

```
MemFS Backend:
├─ Speed: Fastest (in-memory)
├─ Use: Unit tests
├─ Isolation: Complete
└─ Limits: Single process only

Native Git Backend:
├─ Speed: Normal (disk I/O)
├─ Use: Integration/production
├─ Isolation: Process-isolated
└─ Limits: Git installation required
```

## Error Handling Architecture

```
Error Hierarchy:
├─ Git Command Error
│  ├─ Exit code != 0
│  ├─ Parse stderr
│  └─ Throw with context
│
├─ Happy Path Error
│  ├─ No retries
│  ├─ Fail fast
│  └─ Propagate immediately
│
└─ Lock Timeout Error
   ├─ Max retries exceeded
   ├─ Check expiration
   └─ Return false (not acquired)
```

## Integration Points

### With Knowledge Hooks

```
Knowledge Hook System
│
├─ PredicateEvaluator
│  └─ Evaluates SPARQL/ASK predicates
│
├─ Git State Validators (pre-*)
│  ├─ pre-commit
│  ├─ pre-push
│  └─ pre-rebase
│
└─ Git State Analyzers (post-*)
   ├─ post-commit
   ├─ post-checkout
   └─ post-merge
```

### With Workflow Engine

```
Workflow Engine
│
├─ CLI Step
│  └─ Can execute Git commands
│
├─ File Step
│  └─ Uses git.writeFile()
│
└─ SPARQL Step
   └─ Queries Git-backed RDF graphs
```

### With Telemetry

```
OpenTelemetry Integration
│
├─ Git Instrumentation Middleware
│  ├─ Trace Git operations
│  ├─ Record timing
│  └─ Track errors
│
└─ Metrics Collection
   ├─ Operation count
   ├─ Success/failure ratio
   └─ Performance profiles
```

---

## Summary

GitVan's Git architecture provides:
- **Composable abstraction** over Git operations
- **Dual-backend support** for testing and production
- **Enterprise features** (locks, receipts, snapshots, workers)
- **Context-aware execution** with unctx
- **POSIX-first design** for reliability
- **Atomic operations** for consistency
- **Comprehensive integration** with knowledge hooks and workflows
- **Extensible framework** for custom Git operations

