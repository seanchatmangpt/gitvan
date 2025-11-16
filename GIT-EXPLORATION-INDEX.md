# GitVan Git Capabilities - Complete Exploration Index

This index documents the comprehensive exploration of git-related capabilities and functionality in the GitVan codebase.

## Overview

GitVan is a **Git-native development automation platform** that provides:
- 70+ Git operations through the `useGit()` composable
- Distributed locking via Git refs
- Audit trails using Git notes and receipts
- Dual-backend support (MemFS for testing, Native Git for production)
- Knowledge-driven hooks for Git events
- Enterprise-grade state management

## Generated Documentation

### 1. **GITVAN-GIT-CAPABILITIES-SUMMARY.md** (Comprehensive)
The main reference document containing:
- Complete list of all Git operations supported
- Composable architecture documentation
- Git-native I/O modules and their purposes
- Git hooks system (17 validators/analyzers)
- Configuration and state management
- External dependencies and tools
- Test coverage details (4,366+ lines, 200+ test cases)
- Known limitations and edge cases
- CLI commands reference
- Integration points with other systems

**Use this for:** Understanding all capabilities, architecture, test coverage, and integration points.

### 2. **GITVAN-GIT-QUICK-REFERENCE.md** (Developer Reference)
Quick reference for developers containing:
- How to import and use useGit()
- Code examples for all major operations
- Branch, merge, rebase, stash operations
- Remote operations (push, pull, fetch)
- Worktree and tag management
- Error handling patterns
- Common workflow patterns (release flow, feature branches, cleanup)
- Context-aware execution examples
- Distributed locking examples

**Use this for:** Quick lookup while coding, copy-paste examples, and common patterns.

### 3. **GITVAN-GIT-ARCHITECTURE.md** (System Design)
Detailed architecture documentation containing:
- System architecture diagram (ASCII)
- Component interaction flows
- useGit() component structure
- useHybridGit() component structure
- GitNativeIO enterprise layer
- Data flow examples (commit, lock acquisition, hybrid test)
- Storage architecture (Git refs, objects)
- State consistency guarantees
- Performance characteristics
- Error handling architecture
- Integration points with knowledge hooks and workflows

**Use this for:** Understanding system design, data flows, and integration architecture.

## Key Findings Summary

### Git Operations (70+)
- **Repository Info**: branch, head, repoRoot, info
- **Read-Only**: log, diff, status, revList
- **Write**: add, commit, tag, writeFile
- **Branches**: branchList, branchCreate, branchDelete, checkout
- **Merge/Rebase**: merge, rebase, cherryPick, revert
- **Remote**: fetch, push, pull
- **Stash**: stashSave, stashList, stashApply
- **Worktrees**: listWorktrees, worktreeAdd, worktreeRemove
- **Notes/Refs**: noteAdd, listRefs, updateRefCreate
- **Plumbing**: hashObject, writeTree, catFilePretty

### Core Modules
- **useGit()** - Main composable (800+ lines)
- **useHybridGit()** - Dual-backend support
- **useLock()** - Distributed locking
- **useReceipt()** - Audit trails
- **GitNativeIO** - Enterprise facade

### Git Native I/O Modules
- **LockManager** - Atomic ref-based locks
- **QueueManager** - Job queue management
- **ReceiptWriter** - Operation logging
- **SnapshotStore** - State tracking/rollback
- **WorkerPool** - Non-blocking operations

### Test Coverage
- **Test Files**: 30+ dedicated git test files
- **Test Lines**: 4,366+ lines
- **Test Cases**: 200+
- **Backends Tested**: MemFS (unit tests), Native Git (integration tests)
- **Coverage Areas**: Operations, state management, error handling, concurrency

### Git Hooks System
- **17 Pre/Post Validators**: Hooks for all major Git events
- **Knowledge Hook Integration**: RDF-based, SPARQL-driven predicates
- **Event Types**: commit, push, rebase, merge, checkout, apply, receive, update

### External Dependencies
- **isomorphic-git** (^1.33.1) - MemFS Git backend
- **memfs** (^4.43.0) - Virtual file system
- **unctx** (^2.4.1) - Context management
- **giget** (^1.2.1) - Repository utilities
- **Git 2.30+** - Required for native backend

## File Locations

### Main Git Composables
```
/home/user/gitvan/src/composables/git.mjs              # useGit() (800+ lines)
/home/user/gitvan/src/composables/hybrid-git.mjs       # useHybridGit()
/home/user/gitvan/src/composables/lock.mjs             # useLock()
/home/user/gitvan/src/composables/receipt.mjs          # useReceipt()
/home/user/gitvan/src/composables/notes.mjs            # useNotes()
```

### Git Native Modules
```
/home/user/gitvan/src/git-native/GitNativeIO.mjs       # Main facade
/home/user/gitvan/src/git-native/LockManager.mjs       # Lock management
/home/user/gitvan/src/git-native/QueueManager.mjs      # Job queue
/home/user/gitvan/src/git-native/ReceiptWriter.mjs     # Audit logging
/home/user/gitvan/src/git-native/SnapshotStore.mjs     # State snapshots
/home/user/gitvan/src/git-native/WorkerPool.mjs        # Worker threads
```

### Git Hooks
```
/home/user/gitvan/hooks/knowledge-hooks-suite/         # 17 hook validators/analyzers
```

### Test Files
```
/home/user/gitvan/tests/useGit*.test.mjs               # useGit tests
/home/user/gitvan/tests/git-*.test.mjs                 # Git operation tests
/home/user/gitvan/tests/git-native-io*.test.mjs        # Git Native I/O tests
/home/user/gitvan/tests/mock-git.mjs                   # Mock utilities
```

## How to Use These Documents

### For Understanding the Codebase
1. Start with **GITVAN-GIT-CAPABILITIES-SUMMARY.md** for overview
2. Read **GITVAN-GIT-ARCHITECTURE.md** for design understanding
3. Refer to specific sections as needed

### For Development
1. Use **GITVAN-GIT-QUICK-REFERENCE.md** for code examples
2. Look up operation signatures and return types
3. Check common patterns for your use case

### For Integration
1. Review integration points in **GITVAN-GIT-CAPABILITIES-SUMMARY.md** (Section 12)
2. Check architecture diagram in **GITVAN-GIT-ARCHITECTURE.md**
3. Review component interaction flows

### For Testing
1. Check test coverage section in **GITVAN-GIT-CAPABILITIES-SUMMARY.md** (Section 7)
2. Review hybrid test environment in **GITVAN-GIT-ARCHITECTURE.md**
3. Look at test files in `/home/user/gitvan/tests/`

## Statistics

| Metric | Value |
|--------|-------|
| Git Operations Supported | 70+ |
| Primary Composables | 3 (useGit, useHybridGit, supporting) |
| Git Native Modules | 8 |
| Git Hooks | 17 |
| Test Files | 30+ |
| Test Lines of Code | 4,366+ |
| Test Cases | 200+ |
| Core Dependencies | 4 |
| Total Documentation Pages | 4 markdown files |

## Quick Navigation

### By Topic

**Basic Operations**
- See: GITVAN-GIT-QUICK-REFERENCE.md - "Basic Repository Operations"
- See: GITVAN-GIT-CAPABILITIES-SUMMARY.md - Section 2

**Advanced Operations**
- See: GITVAN-GIT-QUICK-REFERENCE.md - All sections
- See: GITVAN-GIT-CAPABILITIES-SUMMARY.md - Section 2

**Architecture & Design**
- See: GITVAN-GIT-ARCHITECTURE.md - Full document
- See: GITVAN-GIT-CAPABILITIES-SUMMARY.md - Section 11

**Testing**
- See: GITVAN-GIT-CAPABILITIES-SUMMARY.md - Section 7
- See: GITVAN-GIT-QUICK-REFERENCE.md - "Using Hybrid Git"

**Hooks System**
- See: GITVAN-GIT-CAPABILITIES-SUMMARY.md - Section 4
- See: GITVAN-GIT-ARCHITECTURE.md - "Integration Points"

**State Management**
- See: GITVAN-GIT-CAPABILITIES-SUMMARY.md - Section 3
- See: GITVAN-GIT-ARCHITECTURE.md - "Storage Architecture"

**Error Handling**
- See: GITVAN-GIT-CAPABILITIES-SUMMARY.md - Section 8
- See: GITVAN-GIT-ARCHITECTURE.md - "Error Handling Architecture"

**Dependencies**
- See: GITVAN-GIT-CAPABILITIES-SUMMARY.md - Section 6
- See: /home/user/gitvan/package.json

## Next Steps

### To Use These Findings
1. Review GITVAN-GIT-CAPABILITIES-SUMMARY.md for complete overview
2. Reference GITVAN-GIT-QUICK-REFERENCE.md during development
3. Consult GITVAN-GIT-ARCHITECTURE.md for design questions
4. Explore the actual source files for implementation details

### To Contribute
1. Understand the architecture from GITVAN-GIT-ARCHITECTURE.md
2. Follow patterns in GITVAN-GIT-QUICK-REFERENCE.md
3. Check test coverage in GITVAN-GIT-CAPABILITIES-SUMMARY.md Section 7
4. Add tests following existing patterns

### To Extend
1. Review composable architecture in GITVAN-GIT-CAPABILITIES-SUMMARY.md Section 1
2. Understand data flows in GITVAN-GIT-ARCHITECTURE.md
3. Add operations to useGit() following existing patterns
4. Add corresponding tests to tests/ directory
5. Document in appropriate sections of these files

---

**Exploration Date**: November 16, 2025
**Project**: GitVan v2.2.0
**Status**: Complete

For questions or clarifications about any of these findings, refer to the corresponding section in the detailed documentation files.
