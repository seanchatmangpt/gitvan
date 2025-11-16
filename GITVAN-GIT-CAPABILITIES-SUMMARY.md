# GitVan Git Capabilities & Functionality Summary

## Executive Overview

GitVan is a **Git-native development automation platform** with comprehensive Git operations, state management, and knowledge-driven hooks. It provides an 80/20 approach focusing on essential Git operations using POSIX-first design with no external dependencies (except for isomorphic-git for testing).

---

## 1. GIT COMPOSABLES & CORE MODULES

### Primary Git Composables

#### **useGit() Composable**
- **Location**: `/home/user/gitvan/src/composables/git.mjs`
- **Type**: Core composable for all Git operations
- **Key Features**:
  - POSIX-first implementation with no external dependencies
  - Deterministic environment (TZ=UTC, LANG=C)
  - UnJS context-aware (unctx) to avoid context loss after await
  - Happy path only: no retries, no shell string interpolation
  - 800+ lines of comprehensive Git functionality

#### **useHybridGit() Composable**
- **Location**: `/home/user/gitvan/src/composables/hybrid-git.mjs`
- **Type**: Dual-backend Git system
- **Backends**:
  - **MemFS Backend**: For fast unit testing with isomorphic-git
  - **Native Git Backend**: For production and integration tests
  - **Auto-selection**: Environment-aware backend selection (test → MemFS, production → native)
- **Features**:
  - Seamless backend switching
  - Unified API across both backends
  - Hybrid workflow support with sync capabilities

### Supporting Composables

- **`useLock()`** (`/home/user/gitvan/src/composables/lock.mjs`)
  - Distributed locking for concurrent operations
  - Atomic ref-based locks
  - Timeout and retry management

- **`useReceipt()`** (`/home/user/gitvan/src/composables/receipt.mjs`)
  - Receipt and audit management
  - Job/event execution logging
  - Operation history tracking

- **`useNotes()`** (`/home/user/gitvan/src/composables/notes.mjs`)
  - Git notes management
  - Metadata attachment to commits

### Core Git Native Modules

Located in `/home/user/gitvan/src/git-native/`:

| Module | Purpose |
|--------|---------|
| **GitNativeIO.mjs** | High-level façade for queues, locks, receipts, snapshots, workers |
| **LockManager.mjs** | Git-backed distributed locking using atomic ref operations |
| **QueueManager.mjs** | Job queue management and priority handling |
| **ReceiptWriter.mjs** | Comprehensive operation logging and audit trails |
| **SnapshotStore.mjs** | Efficient state tracking and rollback capabilities |
| **WorkerPool.mjs** | Non-blocking Git operations via worker threads |
| **git-native-locks.mjs** | Advanced lock architecture using Git primitives |

---

## 2. GIT OPERATIONS SUPPORTED

### Repository Operations

```javascript
// Repository Info
git.branch()              // Get current branch name
git.head()                // Get current HEAD commit SHA
git.repoRoot()            // Get repository root directory
git.worktreeGitDir()      // Get git directory for worktree
git.info()                // Get comprehensive repo info (head, branch, status, clean state)
```

### Read-Only Operations

```javascript
// Logging
git.log(format, extra)              // Get commit logs with custom format
git.logSinceLastTag(format)         // Get logs since last tag
git.statusPorcelain()               // Get porcelain format status
git.diff(options)                   // Get diffs with various options
git.revList(args)                   // Get revision list

// Repository State
git.isClean()                       // Check if working tree is clean
git.hasUncommittedChanges()         // Check for uncommitted changes
git.isAncestor(a, b)               // Check if commit is ancestor
git.mergeBase(a, b)                 // Get merge base between branches
git.getCurrentBranch()              // Get current branch safely
git.getCommitCount(branch)          // Count commits on branch
```

### Write Operations (Happy Path)

```javascript
// Staging & Commits
git.add(paths)                      // Add files to staging
git.commit(message, opts)           // Commit changes with optional signing
git.writeFile(filePath, content)    // Write file to working directory

// Tags
git.tag(name, msg, opts)            // Create annotated or signed tags
git.tagCreate(name, opts)           // Create tag
git.tagDelete(name, opts)           // Delete tag
git.tagList(opts)                   // List tags
```

### Branch Operations

```javascript
// Branch Management
git.branchList(options)             // List branches (local, remote, all)
git.branchCreate(name, startPoint)  // Create new branch
git.branchDelete(name, opts)        // Delete branch (safe or force)
git.checkout(ref, opts)             // Checkout branch/commit/tag
git.switch(branch, opts)            // Modern switch command
```

### Merge & Rebase Operations

```javascript
// Merging
git.merge(ref, opts)                // Merge branch with options (ff, squash, etc.)

// Rebasing
git.rebase(onto, opts)              // Rebase onto target (interactive, continue, abort)

// Cherry-picking
git.cherryPick(commit, opts)        // Cherry-pick commit

// Reverting
git.revert(commit, opts)            // Revert commit
```

### Stash Operations

```javascript
git.stashSave(message, opts)        // Save stash
git.stashList()                     // List stashes
git.stashApply(stash, opts)         // Apply or pop stash
git.stashDrop(stash)                // Drop stash
```

### Remote Operations

```javascript
// Fetching
git.fetch(remote, refspec, opts)    // Fetch from remote with options

// Pushing
git.push(remote, ref, opts)         // Push to remote (force, tags, upstream)

// Pulling
git.pull(remote, branch, opts)      // Pull with options (rebase, ff-only, squash)
```

### Worktree Operations

```javascript
git.listWorktrees()                 // List all worktrees with details
git.worktreeAdd(path, ref, opts)    // Create new worktree
git.worktreeRemove(path, opts)      // Remove worktree
```

### Submodule Operations

```javascript
git.submoduleAdd(url, path, opts)   // Add submodule
git.submoduleUpdate(opts)           // Update submodules
```

### Reset & Checkout

```javascript
git.reset(mode, ref, opts)          // Reset (soft/mixed/hard/merge/keep)
```

### Git Plumbing Operations

```javascript
// Low-level operations
git.hashObject(filePath, opts)      // Hash file object
git.writeTree()                     // Write current index as tree
git.catFilePretty(sha)              // Get object contents
```

### Notes & References

```javascript
// Notes (Receipts)
git.noteAdd(ref, message, sha)      // Add note to commit
git.noteAppend(ref, message, sha)   // Append to existing note
git.noteShow(ref, sha)              // Show note for commit

// References
git.listRefs(pattern)               // List references
git.getRef(ref)                     // Get reference SHA
git.updateRefCreate(ref, valueSha)  // Atomically create reference (for locks)
git.delRef(ref)                     // Delete reference
git.setRef(ref, sha)                // Set reference
```

### Generic Runner

```javascript
git.run(args)                       // Run arbitrary Git command and return output
git.runVoid(args)                   // Run arbitrary Git command (no output)
```

---

## 3. GIT STATE MANAGEMENT

### Snapshot Store
- **Efficient state tracking** with Git objects
- **Rollback capabilities** for atomic operations
- Stores snapshots in Git refs namespace (`refs/gitvan/snapshots/*`)

### Lock Manager
- **Distributed locking** using Git atomic operations
- **Git refs as lock primitives** (`refs/gitvan/locks/*`)
- Lock metadata stored as Git objects
- Automatic expiration detection
- Race condition handling

### Receipt Writer
- **Audit trail** for all Git operations
- **Job execution logging** with Git notes
- Operation metadata and timestamps
- Success/failure tracking
- Accessible via Git notes (`refs/gitvan/receipts/*`)

### Queue Manager
- **Job queue management** backed by Git
- Priority handling
- Operation ordering
- Reconciliation on startup

---

## 4. GIT HOOKS SYSTEM

### Git State Validators & Analyzers

Located in `/home/user/gitvan/hooks/knowledge-hooks-suite/`:

#### Pre-Event Validators (Prevent operations)
- `pre-commit-git-state-validator.mjs` - Validates state before commits
- `pre-push-git-state-validator.mjs` - Validates state before pushing
- `pre-rebase-git-state-validator.mjs` - Validates state before rebasing
- `pre-applypatch-git-state-validator.mjs` - Validates state before applying patches
- `pre-receive-git-state-validator.mjs` - Server-side pre-receive validation
- `prepare-commit-msg-git-state-validator.mjs` - Prepares commit message

#### Post-Event Analyzers (React to events)
- `post-commit-git-state-analyzer.mjs` - Analyzes state after commits
- `post-checkout-git-state-analyzer.mjs` - Analyzes state after checkouts
- `post-merge-git-state-analyzer.mjs` - Analyzes state after merges
- `post-rewrite-git-state-analyzer.mjs` - Analyzes state after rewrites
- `post-applypatch-git-state-analyzer.mjs` - Analyzes state after patches
- `post-receive-git-state-analyzer.mjs` - Server-side post-receive analysis
- `post-update-git-state-analyzer.mjs` - Analyzes state after updates
- `push-to-checkout-git-state-analyzer.mjs` - Analyzes push to checkout

#### Other Hooks
- `update-git-state-validator.mjs` - Ref update validation
- `commit-msg-git-state-validator.mjs` - Commit message validation
- `applypatch-msg-git-state-validator.mjs` - Applypatch message validation

### Knowledge Hook Integration

Hooks are defined using **Turtle RDF format** with predicates:
- **ResultDelta**: Detect state changes in knowledge graph
- **ASK**: Boolean condition evaluation
- **SELECTThreshold**: Metric-based triggers
- **SHACL**: Shape-based validation

---

## 5. GIT CONFIGURATION HANDLING

### Environment Configuration

```javascript
// Deterministic environment setup
const env = {
  TZ: "UTC",              // Always UTC for determinism
  LANG: "C",              // Always C locale for determinism
  ...process.env,         // Inherit environment
  ...contextEnv           // Context-provided overrides
};
```

### Git Configuration Detection

```javascript
// Configuration validation
const gitDir = await git.run(["rev-parse", "--git-dir"]);
const userName = await git.run(["config", "user.name"]);
const userEmail = await git.run(["config", "user.email"]);
```

### Context-Aware Execution

- Uses **UnJS unctx** for context management
- Captures context synchronously to avoid loss after await
- Supports context injection via `withGitVan()` wrapper
- Fallback to process.cwd() when context unavailable

---

## 6. EXTERNAL TOOLS & DEPENDENCIES

### Runtime Dependencies for Git Operations

| Dependency | Version | Purpose |
|------------|---------|---------|
| **isomorphic-git** | ^1.33.1 | MemFS Git backend for testing |
| **memfs** | ^4.43.0 | Virtual file system for tests |
| **child_process** | native | Git command execution |
| **unctx** | ^2.4.1 | Context management |
| **giget** | ^1.2.1 | Repository cloning utilities |

### Git CLI Requirements

- **Git 2.30+** (as per documentation)
- Native Git binary (for native backend)
- Supports all standard Git operations

### GitHub Integration

- **GitHub Actions** integration (`/home/user/gitvan/src/integrations/github-actions.mjs`)
- Potential `gh` CLI support (GitHub CLI)
- Registry support for GitHub-based templates

---

## 7. TEST COVERAGE FOR GIT FUNCTIONALITY

### Comprehensive Test Suite

Total: **4366 lines** of git-related tests

### Test Files by Category

#### useGit Tests
- `useGit-comprehensive.test.mjs` (23 tests)
- `useGit.context.test.mjs` (24 tests)
- `useGit.unit.test.mjs` (23 tests)
- `useGit.integration.test.mjs` (99 tests)
- `useGit.e2e.test.mjs` (41 tests)
- `useGit.mock-strategies.test.mjs` (26 tests)

#### Git Native I/O Tests
- `git-native-io-integration.test.mjs` - Integration tests
- `git-native-io-integration-refactored.test.mjs` - Refactored tests
- `git-implementation.test.mjs` - Implementation tests
- `git-atomic.test.mjs` - Atomic operations

#### Advanced Tests
- `git-comprehensive.test.mjs` - Comprehensive functionality
- `git-e2e.test.mjs` - End-to-end scenarios
- `git-errors.test.mjs` - Error handling
- `git-new-commands.test.mjs` - New command implementations
- `git-signals-system.test.mjs` - Signal handling

#### Test Infrastructure
- `mock-git.mjs` - Mock Git utilities
- `test-environment.test.mjs` - Test environment setup
- Hybrid test environment with MemFS and native backends

### Test Environment Features

```javascript
// Hybrid test environment support
withMemFSTestEnvironment(options, testFn)      // Fast unit tests
withNativeGitTestEnvironment(options, testFn)  // Integration tests
```

### Test Coverage Areas

1. **Basic Operations**: commit, push, pull, merge, branch, checkout
2. **Advanced Operations**: worktrees, submodules, rebase, cherry-pick
3. **State Management**: locks, receipts, snapshots, queues
4. **Error Handling**: invalid operations, missing files, conflicts
5. **Concurrency**: lock contention, race conditions
6. **Hybrid Backends**: MemFS/Native switching, synchronization
7. **Context Management**: unctx integration, context preservation
8. **Performance**: benchmarks and stress tests

---

## 8. KNOWN LIMITATIONS & EDGE CASES

### Happy Path Design
- **Retries**: None - fail fast on error
- **String Interpolation**: Not supported in happy path
- **Error Recovery**: Limited - errors propagate immediately

### Backend-Specific Limitations

#### MemFS Backend
- File operations only with MemFS
- Limited to in-memory file system
- No persistent disk storage
- Efficient for unit testing but not production

#### Native Git Backend
- Requires Git to be installed
- System-dependent execution
- Network operations depend on Git config

### Context Management
- Context must be captured synchronously
- Cannot be captured after async/await boundary
- Requires `withGitVan()` wrapper or context passing

### Known Edge Cases

1. **Detached HEAD**: Handled with special case in getCurrentBranch()
2. **No Tags**: logSinceLastTag() returns empty string instead of error
3. **Race Conditions**: Lock expiration requires detection and cleanup
4. **Lock Timeouts**: 30-second default timeout with configurable retries

---

## 9. CLI COMMANDS FOR GIT OPERATIONS

### Hooks Management
```bash
gitvan hooks list                   # List all available hooks
gitvan hooks evaluate               # Evaluate all hooks
gitvan hooks validate <hook-id>     # Validate specific hook
```

### Worktree Management
```bash
gitvan worktree list                # List worktrees
gitvan worktree add <path>          # Add new worktree
```

### Setup & Initialization
```bash
gitvan setup                        # Complete GitVan setup
gitvan init --name <name>          # Initialize new project
```

### Save & Receipts
```bash
gitvan save                         # Save current state with receipt
```

### Workflow Execution
```bash
gitvan workflow run <workflow-id>   # Run workflow
gitvan workflow list                # List workflows
```

---

## 10. PACKAGE.JSON GIT-RELATED ENTRIES

```json
{
  "keywords": ["git", "automation", "cli", "hooks", "devops"],
  "dependencies": {
    "isomorphic-git": "^1.33.1",
    "memfs": "^4.43.0",
    "giget": "^1.2.1",
    "unctx": "^2.4.1"
  },
  "scripts": {
    "test:hooks": "vitest tests/hooks/",
    "hooks": "gitvan hooks",
    "hooks:list": "gitvan hooks list",
    "hooks:evaluate": "gitvan hooks evaluate"
  }
}
```

---

## 11. ARCHITECTURE PATTERNS

### POSIX-First Design
- Uses Node.js child_process with execFile
- Deterministic environment variables
- No external shell dependencies
- Cross-platform compatible

### Context-Aware Execution
- UnJS unctx integration for context preservation
- Automatic fallback to process.cwd()
- Supports context injection via withGitVan()

### Dual-Backend Strategy
- **Testing**: MemFS + isomorphic-git (fast, isolated)
- **Production**: Native Git (performance, compatibility)
- **Hybrid**: Both available, automatic selection

### Atomic Operations
- Git refs for distributed locks
- Atomic ref creation for lock establishment
- Metadata in Git objects
- Consistent state across operations

---

## 12. INTEGRATION POINTS

### Knowledge Hook System
- Hooks react to Git state changes
- PredicateEvaluator analyzes Git operations
- ResultDelta predicates trigger on changes
- SPARQL queries against Git-backed RDF graphs

### Workflow Engine
- CLI steps can execute Git commands
- Workflows can use useGit composable
- Git operations integrated with task execution
- State management via receipts

### AI/Telemetry
- Git instrumentation middleware
- Operation tracking via OpenTelemetry
- AI context includes Git history
- Performance monitoring of Git operations

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| **Git Operations Supported** | 70+ |
| **Composables** | 3 primary (useGit, useHybridGit, hybrid support) |
| **Core Modules** | 8 Git-native modules |
| **Git Hooks** | 17 pre/post-event validators |
| **Test Files** | 30+ dedicated Git test files |
| **Total Test Lines** | 4,366 lines |
| **Test Cases** | 200+ |
| **Dependencies** | 4 core Git libraries |
| **External Requirements** | Git 2.30+ |

---

## Conclusion

GitVan provides a **comprehensive, production-ready Git integration** with:
- ✅ 70+ Git operations
- ✅ Distributed locking via Git refs
- ✅ Audit trails via Git notes
- ✅ Dual-backend support (MemFS for testing, Native for production)
- ✅ Knowledge-driven hooks for Git events
- ✅ Extensive test coverage (4,366+ lines)
- ✅ POSIX-first, no external dependencies
- ✅ Context-aware execution with unctx
- ✅ Atomic operations for reliability
