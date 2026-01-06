# GitVan Composables Testability Audit

**Date**: 2026-01-06
**Author**: Testability Auditor
**Purpose**: Assess which untested composables can be tested immediately vs which need refactoring first

---

## Executive Summary

This audit assesses 8 untested composables to determine their testability readiness. Key findings:

- **3 composables** are ready to test now (no refactoring needed)
- **3 composables** need minor refactoring before testing
- **2 composables** need significant refactoring before testing

**Current Status**: 0% test coverage for these 8 composables
**Goal**: 80% test coverage (branches, functions, lines, statements)

---

## Testability Profiles

### 1. useReceipt - `src/composables/receipt.mjs`

**Status**: ✅ READY TO TEST NOW

| Criterion | Assessment |
|-----------|------------|
| **Can test in isolation?** | Yes (with minimal mocking) |
| **External dependencies** | `useGit`, `runtime/receipt.mjs` (writeReceipt, readReceipts) |
| **Async complexity** | Simple - CRUD operations with Git notes |
| **Context requirements** | Yes - uses `tryUseGitVan/useGitVan` |
| **Refactoring needed?** | No - clean structure |
| **Estimated effort** | **Easy (2-4 hrs)** |

**Analysis**:
- Clean CRUD operations (create, list, get, verify, stats)
- Minimal dependencies (only useGit and 2 runtime functions)
- Straightforward async patterns
- Well-organized methods with clear responsibilities
- Already has receipt fingerprinting and verification

**Test Plan**:
```javascript
// Mock dependencies:
// - useGit (info, headSha methods)
// - runtime/receipt.mjs functions

describe('useReceipt', () => {
  it('should create receipt with fingerprint')
  it('should list receipts with filters')
  it('should verify receipt fingerprints')
  it('should calculate statistics')
  it('should export receipts (JSON/CSV)')
})
```

---

### 2. useWorktree - `src/composables/worktree.mjs`

**Status**: ✅ READY TO TEST NOW

| Criterion | Assessment |
|-----------|------------|
| **Can test in isolation?** | Yes (with command mocking) |
| **External dependencies** | `useGit`, `child_process.execFile` |
| **Async complexity** | Medium - shell command execution |
| **Context requirements** | Yes - uses `tryUseGitVan/useGitVan` |
| **Refactoring needed?** | No - acceptable for testing |
| **Estimated effort** | **Medium (4-6 hrs)** |

**Analysis**:
- Direct shell command execution (git worktree operations)
- Well-structured methods (info, list, create, remove, prune)
- Uses execFile for all Git operations
- Context management via withWorktree helper

**Test Plan**:
```javascript
// Mock dependencies:
// - useGit (runVoid method)
// - child_process.execFile

describe('useWorktree', () => {
  it('should get worktree info')
  it('should list all worktrees')
  it('should create new worktree')
  it('should remove worktree')
  it('should identify main worktree')
  it('should generate lock refs for worktree')
})
```

---

### 3. useLock - `src/composables/lock.mjs`

**Status**: ✅ READY TO TEST NOW

| Criterion | Assessment |
|-----------|------------|
| **Can test in isolation?** | Yes (with Git mocking) |
| **External dependencies** | `useGit`, `runtime/locks.mjs` (acquireLock, releaseLock) |
| **Async complexity** | Medium - Git ref operations |
| **Context requirements** | Yes - uses `tryUseGitVan/useGitVan` |
| **Refactoring needed?** | No - clean separation |
| **Estimated effort** | **Medium (4-6 hrs)** |

**Analysis**:
- Clean lock lifecycle (acquire, release, status, cleanup)
- Uses Git refs for distributed locking
- Well-organized methods with clear responsibilities
- Good separation between composable and runtime utilities

**Test Plan**:
```javascript
// Mock dependencies:
// - useGit (info, getRef, listRefs, worktreeExists)
// - runtime/locks.mjs functions

describe('useLock', () => {
  it('should acquire lock')
  it('should release lock')
  it('should check if locked')
  it('should list all locks')
  it('should cleanup expired/orphaned locks')
  it('should generate lock refs')
  it('should export lock data')
})
```

---

### 4. useSchedule - `src/composables/schedule.mjs`

**Status**: ⚠️ NEEDS MINOR REFACTORING

| Criterion | Assessment |
|-----------|------------|
| **Can test in isolation?** | Partially (file I/O complications) |
| **External dependencies** | `useGit`, `useJob`, `useReceipt`, `jobs/cron.mjs`, `node:fs` |
| **Async complexity** | Medium - file I/O + job execution |
| **Context requirements** | Yes - uses `tryUseGitVan/useGitVan` |
| **Refactoring needed?** | Yes - direct fs usage should be abstracted |
| **Estimated effort** | **Medium (5-7 hrs)** |

**Analysis**:
- Direct file system operations (readFileSync, writeFileSync, mkdirSync)
- Depends on useJob and useReceipt composables
- Cron expression validation is basic
- File-based schedule storage

**Refactoring Required**:
1. Extract file I/O to `useFileSystem` composable
2. Abstract schedule file format (currently hardcoded template)
3. Improve cron validation (use library or separate validator)

**Test Plan** (after refactoring):
```javascript
// Mock dependencies:
// - useGit, useJob, useReceipt
// - useFileSystem (replaces direct fs calls)
// - startCronScheduler

describe('useSchedule', () => {
  it('should add schedule')
  it('should list schedules with filters')
  it('should enable/disable schedules')
  it('should validate cron expressions')
  it('should run scheduled job')
  it('should track schedule history')
})
```

---

### 5. useJob - `src/composables/job.mjs`

**Status**: ⚠️ NEEDS MINOR REFACTORING

| Criterion | Assessment |
|-----------|------------|
| **Can test in isolation?** | Partially (many dependencies) |
| **External dependencies** | `useGit`, `useReceipt`, `useLock`, `JobRunner`, `runtime/jobs.mjs` |
| **Async complexity** | Medium - job discovery + execution |
| **Context requirements** | Yes - uses `tryUseGitVan/useGitVan` |
| **Refactoring needed?** | Yes - JobRunner should be injected |
| **Estimated effort** | **Medium (6-8 hrs)** |

**Analysis**:
- Creates JobRunner internally (line 49) - hard to test
- Many methods (25+) - comprehensive but testable
- Depends on multiple composables (useGit, useReceipt, useLock)
- Well-organized with clear method groups

**Refactoring Required**:
1. Inject JobRunner instead of creating internally
2. Extract unrouting logic to separate utility
3. Consider splitting into smaller composables (job-discovery, job-execution)

**Test Plan** (after refactoring):
```javascript
// Mock dependencies:
// - useGit, useReceipt, useLock
// - JobRunner (injected)
// - runtime/jobs.mjs functions

describe('useJob', () => {
  it('should list jobs with filters')
  it('should get job definition')
  it('should run job with context')
  it('should run job with lock')
  it('should validate job definition')
  it('should search jobs')
  it('should track job history')
})
```

---

### 6. useRegistry - `src/composables/registry.mjs`

**Status**: ⚠️ NEEDS MINOR REFACTORING

| Criterion | Assessment |
|-----------|------------|
| **Can test in isolation?** | Partially (depends on many composables) |
| **External dependencies** | `useGit`, `useJob`, `useEvent`, `useSchedule`, `PackRegistry` |
| **Async complexity** | Medium - aggregation of multiple sources |
| **Context requirements** | Yes - uses `tryUseGitVan/useGitVan` |
| **Refactoring needed?** | Yes - PackRegistry should be injected |
| **Estimated effort** | **Medium (5-7 hrs)** |

**Analysis**:
- Orchestrates multiple composables (useJob, useEvent, useSchedule)
- Lazy initializes PackRegistry (line 44) - good, but needs injection option
- Mainly aggregation and search logic
- Well-organized with clear method groups

**Refactoring Required**:
1. Accept PackRegistry as optional constructor parameter
2. Mock useJob, useEvent, useSchedule in tests
3. Consider extracting grouping utilities

**Test Plan** (after refactoring):
```javascript
// Mock dependencies:
// - useGit, useJob, useEvent, useSchedule
// - PackRegistry (injected or mocked)

describe('useRegistry', () => {
  it('should refresh all registries')
  it('should get registry stats')
  it('should search across types')
  it('should filter by type/tags')
  it('should validate all items')
  it('should export registry data')
})
```

---

### 7. useTemplate - `src/composables/template.mjs`

**Status**: ❌ NEEDS SIGNIFICANT REFACTORING

| Criterion | Assessment |
|-----------|------------|
| **Can test in isolation?** | No - too many responsibilities |
| **External dependencies** | `loadOptions`, `getCachedEnvironment`, `parseFrontmatter`, `injectString`, `runShellHooks`, `writeReceipt`, `locks` |
| **Async complexity** | Complex - config loading, plan/apply, locking, shell hooks |
| **Context requirements** | Yes - uses `tryUseGitVan/useGitVan` |
| **Refactoring needed?** | Yes - violates Single Responsibility Principle |
| **Estimated effort** | **Hard (10-12 hrs)** |

**Analysis**:
- 503 lines - too large for a composable
- Multiple responsibilities:
  - Template rendering (Nunjucks)
  - File operations (write, inject, copy)
  - Lock management
  - Receipt writing
  - Shell hook execution
  - Frontmatter parsing
  - Plan/apply pattern
- Heavy external dependencies (8+ modules)

**Refactoring Required**:
1. Split into multiple composables:
   - `useTemplateRender` - just rendering (render, renderString, renderToFile)
   - `useTemplatePlan` - plan/apply logic
   - `useTemplateOperations` - file operations (write, inject, copy)
2. Extract lock management to `useLock`
3. Extract receipt writing to `useReceipt`
4. Extract shell hook execution to separate utility
5. Reduce to ~200 lines per composable

**Test Plan** (after refactoring):
```javascript
// After splitting:

describe('useTemplateRender', () => {
  it('should render template by name')
  it('should render template from string')
  it('should render to file')
  it('should inject base data (nowISO, git)')
})

describe('useTemplatePlan', () => {
  it('should create plan from frontmatter')
  it('should evaluate "when" predicate')
  it('should handle multi-output')
  it('should handle injections')
})

describe('useTemplateOperations', () => {
  it('should apply plan operations')
  it('should handle force policies')
  it('should run shell hooks')
  it('should write receipts')
})
```

---

### 8. usePack - `src/composables/pack.mjs`

**Status**: ❌ NEEDS SIGNIFICANT REFACTORING

| Criterion | Assessment |
|-----------|------------|
| **Can test in isolation?** | No - heavy class dependencies |
| **External dependencies** | `Pack`, `PackManager`, `PackRegistry`, `PackApplier`, `PackPlanner`, `useGit`, `useNotes`, `useReceipt` |
| **Async complexity** | Complex - pack installation, dependency resolution, registry operations |
| **Context requirements** | Yes - uses `tryUseGitVan/useGitVan` |
| **Refactoring needed?** | Yes - too many external class dependencies |
| **Estimated effort** | **Hard (10-12 hrs)** |

**Analysis**:
- 718 lines - too large for a composable
- Heavy dependencies on 5 pack-related classes
- Multiple responsibilities:
  - Pack discovery
  - Pack installation
  - Pack management
  - Pack validation
  - Registry operations
  - Receipt management
  - CLI command execution
- Creates instances internally (hard to test)

**Refactoring Required**:
1. Inject Pack system classes via dependency injection
2. Split into focused composables:
   - `usePackRegistry` - discovery and search
   - `usePackInstall` - installation logic
   - `usePackManagement` - update/remove/status
3. Extract CLI integration to separate layer
4. Mock Pack, PackManager, PackRegistry, PackApplier, PackPlanner

**Test Plan** (after refactoring):
```javascript
// After splitting and dependency injection:

describe('usePackRegistry', () => {
  it('should list available packs')
  it('should search packs')
  it('should get pack info')
})

describe('usePackInstall', () => {
  it('should install pack from registry')
  it('should install local pack')
  it('should check constraints')
  it('should check idempotency')
})

describe('usePackManagement', () => {
  it('should list installed packs')
  it('should update pack')
  it('should remove pack')
  it('should get pack status')
})
```

---

## Summary Tables

### Ready to Test Now (No Refactoring Needed)

| Composable | File | Effort | Priority | Reason |
|------------|------|--------|----------|--------|
| **useReceipt** | `src/composables/receipt.mjs` | 2-4 hrs | HIGH | Simplest - CRUD operations only |
| **useWorktree** | `src/composables/worktree.mjs` | 4-6 hrs | HIGH | Clean structure, shell mocking straightforward |
| **useLock** | `src/composables/lock.mjs` | 4-6 hrs | HIGH | Clean separation, Git mocking only |

**Total Estimated Effort**: 10-16 hours

---

### Needs Minor Refactoring First

| Composable | File | Effort | Refactoring | Test Effort |
|------------|------|--------|-------------|-------------|
| **useSchedule** | `src/composables/schedule.mjs` | 5-7 hrs | Abstract file I/O | 3-4 hrs |
| **useJob** | `src/composables/job.mjs` | 6-8 hrs | Inject JobRunner | 4-5 hrs |
| **useRegistry** | `src/composables/registry.mjs` | 5-7 hrs | Inject PackRegistry | 3-4 hrs |

**Total Estimated Effort**: 16-22 hours

---

### Needs Significant Refactoring First

| Composable | File | Lines | Refactoring | Test Effort |
|------------|------|-------|-------------|-------------|
| **useTemplate** | `src/composables/template.mjs` | 503 | Split into 3 composables | 8-10 hrs |
| **usePack** | `src/composables/pack.mjs` | 718 | Split into 3 composables + DI | 8-10 hrs |

**Total Estimated Effort**: 16-20 hours

---

## Recommended Test Order

### Phase 1: Quick Wins (Week 1)
Test composables ready to go without refactoring:

1. **useReceipt** (2-4 hrs) - Start here for confidence
2. **useLock** (4-6 hrs) - Important for concurrency
3. **useWorktree** (4-6 hrs) - Important for isolation

**Phase 1 Total**: 10-16 hours

---

### Phase 2: Minor Refactoring (Week 2)
Refactor and test composables needing minor changes:

4. **useSchedule** (5-7 hrs) - File I/O abstraction + tests
5. **useRegistry** (5-7 hrs) - PackRegistry injection + tests
6. **useJob** (6-8 hrs) - JobRunner injection + tests

**Phase 2 Total**: 16-22 hours

---

### Phase 3: Major Refactoring (Week 3-4)
Split large composables and test thoroughly:

7. **useTemplate** (10-12 hrs) - Split into 3 + comprehensive tests
8. **usePack** (10-12 hrs) - Split into 3 + DI + comprehensive tests

**Phase 3 Total**: 20-24 hours

---

## Total Timeline Estimate

| Phase | Duration | Composables | Effort |
|-------|----------|-------------|--------|
| Phase 1 | Week 1 | 3 | 10-16 hrs |
| Phase 2 | Week 2 | 3 | 16-22 hrs |
| Phase 3 | Week 3-4 | 2 | 20-24 hrs |
| **TOTAL** | **3-4 weeks** | **8** | **46-62 hrs** |

---

## Detailed Refactoring Requirements

### useSchedule Refactoring

**Before**:
```javascript
// Direct file system access
const scheduleFile = join(schedulesDir, `${scheduleId}.mjs`);
writeFileSync(scheduleFile, content);
```

**After**:
```javascript
// Use file system composable
const fs = useFileSystem();
await fs.write(scheduleFile, content);
```

**Changes**:
- Extract all `fs` operations to `useFileSystem` composable
- Abstract schedule file format (currently hardcoded template string)
- Use proper cron validation library

---

### useJob Refactoring

**Before**:
```javascript
// JobRunner created internally
const runner = new JobRunner({ cwd: base.cwd });
```

**After**:
```javascript
// JobRunner injected
export function useJob(options = {}) {
  const runner = options.runner || new JobRunner({ cwd: base.cwd });
  // ...
}
```

**Changes**:
- Accept `runner` in options for dependency injection
- Extract unrouting utilities to separate module
- Consider splitting discovery vs execution

---

### useRegistry Refactoring

**Before**:
```javascript
// Lazy initialization without injection option
let packRegistry = null;
const getPackRegistry = () => {
  if (!packRegistry) {
    packRegistry = new PackRegistry({ cwd: base.cwd });
  }
  return packRegistry;
};
```

**After**:
```javascript
// Injectable PackRegistry
export function useRegistry(options = {}) {
  const packRegistry = options.packRegistry || new PackRegistry({ cwd: base.cwd });
  // ...
}
```

**Changes**:
- Accept `packRegistry` in options
- Extract grouping utilities to separate module

---

### useTemplate Refactoring

**Current Structure** (503 lines, 1 file):
- Template rendering
- File operations
- Lock management
- Receipt writing
- Shell hooks
- Plan/apply logic

**Proposed Structure** (3 files, ~200 lines each):

1. **useTemplateRender.mjs** (~150 lines)
   - `render(name, data)`
   - `renderString(str, data)`
   - `renderToFile(name, path, data)`
   - Nunjucks environment management

2. **useTemplatePlan.mjs** (~200 lines)
   - `plan(templatePath, data)`
   - Frontmatter parsing
   - Operation building
   - "when" predicate evaluation

3. **useTemplateApply.mjs** (~150 lines)
   - `apply(plan, options)`
   - File write operations
   - Injection operations
   - Copy operations
   - Uses `useLock`, `useReceipt`, shell utilities

**Migration**:
```javascript
// Old API (still works via facade)
const template = await useTemplate();
const result = await template.renderToFile('foo.njk', 'out.txt', data);

// New API (more testable)
const render = useTemplateRender();
const result = await render.toFile('foo.njk', 'out.txt', data);

// Plan/apply pattern
const planner = useTemplatePlan();
const applier = useTemplateApply();
const plan = await planner.plan('template.njk', data);
const result = await applier.apply(plan);
```

---

### usePack Refactoring

**Current Structure** (718 lines, 1 file):
- Pack discovery
- Pack installation
- Pack management
- Registry operations
- Receipt management
- CLI integration

**Proposed Structure** (3 files, ~250 lines each):

1. **usePackRegistry.mjs** (~200 lines)
   - `listAvailable(filters)`
   - `search(query, filters)`
   - `getPackInfo(packId)`
   - `refreshRegistry()`

2. **usePackInstall.mjs** (~250 lines)
   - `install(packId, inputs, options)`
   - `installLocal(packPath, inputs, options)`
   - `checkConstraints(packId)`
   - `checkIdempotency(packId)`
   - `resolvePackPath(packId)`

3. **usePackManagement.mjs** (~250 lines)
   - `listInstalled()`
   - `getInstalled(packId)`
   - `update(packId, inputs, options)`
   - `remove(packId, options)`
   - `getStatus()`
   - `analyzeDependencies(packId)`

**Dependency Injection**:
```javascript
// Accept pack system classes as options
export function usePackInstall(options = {}) {
  const manager = options.manager || new PackManager(config);
  const registry = options.registry || new PackRegistry(config);
  const applier = options.applier || new PackApplier(config);
  // ...
}
```

---

## Testing Strategy

### Test Structure

All composable tests should follow this structure:

```javascript
// tests/composables/{composable}.test.mjs
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { withGitVan } from '../../src/core/context.mjs';
import { use{Composable} } from '../../src/composables/{composable}.mjs';

describe('use{Composable}', () => {
  let context;
  let mocks;

  beforeEach(() => {
    context = {
      cwd: '/test/repo',
      env: { TZ: 'UTC', LANG: 'C' },
    };

    mocks = {
      // Mock all dependencies
    };

    // Set up mocks
    vi.mock('../../src/composables/git/index.mjs', () => ({
      useGit: () => mocks.git,
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should expose context properties', async () => {
    await withGitVan(context, async () => {
      const composable = use{Composable}();
      expect(composable.cwd).toBe('/test/repo');
      expect(composable.env.TZ).toBe('UTC');
    });
  });

  // Test all methods...
});
```

---

## Architecture Blockers

### Key Issues Preventing Testing

1. **Direct File System Access**
   - Several composables use `fs` directly
   - Should use `useFileSystem` composable
   - Blocks: useSchedule, useTemplate (partially)

2. **Internal Class Instantiation**
   - Classes created inside composables (no DI)
   - Hard to mock or replace
   - Blocks: useJob (JobRunner), usePack (5 classes), useRegistry (PackRegistry)

3. **Multiple Responsibilities**
   - Violates Single Responsibility Principle
   - Too many concerns in one composable
   - Blocks: useTemplate (6 responsibilities), usePack (6 responsibilities)

4. **Missing Abstraction Layers**
   - Direct shell command execution
   - No abstraction for testing
   - Blocks: useWorktree (acceptable), useSchedule (minor)

---

## Recommendations

### Immediate Actions (This Week)

1. **Start testing ready composables** - Gain momentum
   - useReceipt (2-4 hrs)
   - useLock (4-6 hrs)
   - useWorktree (4-6 hrs)

2. **Create test infrastructure**
   - Mock factory for Git operations
   - Context builder for tests
   - Shared test utilities

3. **Document patterns**
   - How to test composables with withGitVan
   - How to mock dependencies
   - How to test async operations

### Short-term Actions (Next 2 Weeks)

4. **Refactor minor blockers**
   - Abstract file I/O in useSchedule
   - Add DI to useJob (runner)
   - Add DI to useRegistry (packRegistry)

5. **Test refactored composables**
   - useSchedule tests
   - useJob tests
   - useRegistry tests

### Long-term Actions (Next 3-4 Weeks)

6. **Split large composables**
   - useTemplate → 3 composables
   - usePack → 3 composables

7. **Comprehensive testing**
   - All split composables tested
   - Integration tests
   - 80% coverage achieved

---

## Success Metrics

### Coverage Targets (per composable)

| Metric | Target | Current | Gap |
|--------|--------|---------|-----|
| **Branch Coverage** | 80% | 0% | 80% |
| **Function Coverage** | 80% | 0% | 80% |
| **Line Coverage** | 80% | 0% | 80% |
| **Statement Coverage** | 80% | 0% | 80% |

### Quality Metrics

- ✅ All public methods tested
- ✅ Error cases covered
- ✅ Edge cases identified and tested
- ✅ Context requirements verified
- ✅ Async patterns validated

---

## Conclusion

This audit identifies a clear path forward:

1. **Quick wins available** - 3 composables ready to test (10-16 hrs)
2. **Minor refactoring needed** - 3 composables need small changes (16-22 hrs)
3. **Major refactoring required** - 2 composables need splitting (20-24 hrs)

**Total estimated effort**: 46-62 hours (3-4 weeks)

**Recommendation**: Start with Phase 1 (quick wins) to build momentum and establish testing patterns, then proceed to Phases 2 and 3 with confidence.

---

**Next Steps**:
1. Review this audit with team
2. Approve refactoring approach
3. Begin Phase 1 testing (useReceipt, useLock, useWorktree)
4. Create test infrastructure and patterns
5. Proceed through phases sequentially
