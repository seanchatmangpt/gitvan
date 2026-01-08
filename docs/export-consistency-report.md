# GitVan Export Consistency Report

**Date:** 2026-01-08
**Agent:** Agent 7 - API & Export Cleanup

## Consistency Analysis

### ✅ Followed Patterns

1. **Composable Naming:** All composables follow `export function use*()` pattern
2. **Re-exports:** Index files properly use `export { X } from "./module.mjs"`
3. **Wildcard Exports:** Appropriately used in type-only modules

### Export Patterns by Module

#### Core Composables (src/composables/)
✅ **Pattern:** Named exports of `use*` functions
```javascript
export function useGit() { }
export function useTemplate() { }
```

#### Classes (src/git-native/, src/pack/, etc.)
✅ **Pattern:** Named class exports or default exports
```javascript
export class GitNativeIO { }
export default class WorkflowEngine { }
```

#### Utilities (src/utils/)
✅ **Pattern:** Named function exports
```javascript
export function createLogger() { }
export const sha256Hex = () => { }
```

#### Index Files
✅ **Pattern:** Re-export from submodules
```javascript
export { useGit } from "./git.mjs";
export { Pack } from "./pack.mjs";
```

## Potential Issues

### 1. Duplicate Exports

#### PackCache
Exported from multiple locations:
- `src/pack/pack-cache.mjs`
- `src/pack/registry.mjs`
- `src/pack/optimization/index.mjs`

**Status:** Acceptable (different context paths)

#### PackRegistry
Exported from:
- `src/pack/pack-registry-core.mjs`
- `src/pack/pack-registry.mjs`
- `src/pack/registry.mjs` (both named and default!)

**Issue:** Registry exports both named and default:
```javascript
export { PackRegistry } from "./pack-registry-core.mjs";
export { PackRegistry as default } from "./pack-registry-core.mjs";
```

**Recommendation:** Choose one pattern (prefer named export)

### 2. Wildcard Exports

Found in:
- `src/unrdf-hooks/*/index.ts` - Re-exports types
- `src/v4/*/index.ts` - Re-exports from submodules

**Status:** Acceptable for internal organization, but can make tree-shaking harder

**Recommendation:** Consider explicit re-exports for better tree-shaking

### 3. Mixed Export Styles

#### V4 Compat Layer
```javascript
// src/v4/index.ts
export * as compat from './compat/index.mjs';
```

**Status:** Acceptable for compatibility layer

### 4. Backup Files

Found: `src/pack/marketplace.mjs.bak`

**Issue:** Backup file contains exports that might confuse bundlers

**Recommendation:** Remove `.bak` files from source tree

### 5. Test-Only Exports in Public API

`useTestEnvironment` and `withTestEnvironment` exported from main index:
```javascript
// src/index.mjs
export { useTestEnvironment, withTestEnvironment } from "./composables/index.mjs";
```

**Issue:** Test utilities in public API surface

**Recommendation:** Move to separate `/testing` export path

## Export Path Analysis

### Main Entry Points

1. **`/src/index.mjs`** - Main public API
   - Composables
   - Core classes
   - Runtime utilities
   - CLI

2. **`/src/v4/index.ts`** - V4 API (future)
   - Hooks
   - Context/DI
   - Middleware
   - Error handling

3. **`/src/composables/index.mjs`** - Composables barrel
   - All use* functions

4. **`/src/pack/index.mjs`** - Pack system
   - Pack classes
   - Manifest utilities

### Recommended Structure

```
src/
├── index.mjs              # Main public API
├── testing.mjs            # Test utilities (NEW)
├── internal.mjs           # Internal utilities (NEW)
├── composables/
│   └── index.mjs          # Composable exports
├── v4/
│   └── index.ts           # V4 API
└── ...
```

## Naming Convention Compliance

### ✅ Compliant

- **Composables:** 151/151 follow `use*` pattern
- **Classes:** PascalCase naming
- **Functions:** camelCase naming
- **Constants:** UPPER_SNAKE_CASE

### ⚠️ Review Needed

Some exported objects use mixed conventions:
```javascript
export const gitvanHookable = createGitVanHookable(); // camelCase singleton
export const jobRegistry = new JobRegistry();         // camelCase singleton
```

**Question:** Should singletons use PascalCase or camelCase?
**Current:** Mixed usage
**Recommendation:** Document convention in style guide

## Import/Export Graph

### Most Depended Upon

1. `createLogger` - 165 imports
2. `useGitVan` - 51 imports
3. `useGit` - 43 imports
4. `withGitVan` - 38 imports

### Leaf Exports (No dependencies)

Many utility functions are leaf exports that could be candidates for removal if unused.

## Circular Dependency Analysis

### Potential Issues

Need deeper analysis with tools like `madge` or `dependency-cruiser`, but based on structure:

**Concern areas:**
- `src/composables/` <-> `src/core/` - Context dependencies
- `src/pack/` internal files - Complex interdependencies
- `src/workflow/` - Workflow engine dependencies

**Recommendation:** Run `madge` to detect actual circular dependencies

## Type Exports

### TypeScript/JSDoc Types

Many `.d.ts` or type definitions are exported:
```javascript
export type { Signal, WritableSignal } from './signals.js';
```

**Status:** Appropriate for TypeScript consumers

## API Surface Analysis

### Public API (via src/index.mjs)

**Composables (19):**
- useGit, useFileSystem, useTestEnvironment, withTestEnvironment
- useWorktree, useTemplate, useNotes, useUnrouting
- useJob, useEvent, useSchedule
- useReceipt, useLock, useRegistry, usePack
- withGitVan, useGitVan, tryUseGitVan

**Classes (16):**
- Pack, PackManager, PackApplier, PackPlanner, PackRegistry
- GitNativeIO, LockManager, SnapshotStore, QueueManager, WorkerPool, ReceiptWriter
- GitVanContext, GitVanHookable, JobRegistry
- GitVanDaemon, JobRunner

**Functions (7):**
- boot, createGitVan, defineJob
- scanJobs, loadOptions
- loadPackManifest, validateManifest
- cli, main

**Total Public Exports:** ~42 from main index

### V4 API (via src/v4/index.ts)

**Much larger:** ~100+ exports for future API

## Recommendations

### Immediate (Phase 1)

1. ✅ Remove `src/pack/marketplace.mjs.bak`
2. ✅ Choose single export pattern for `PackRegistry` (prefer named)
3. ✅ Move test utilities to separate export path
4. ✅ Document singleton naming convention

### Short-term (Phase 2)

1. Create `src/testing.mjs` for test utilities
2. Create `src/internal.mjs` for internal-only exports
3. Add JSDoc `@internal` tags to internal exports
4. Run circular dependency analysis

### Long-term (Phase 3)

1. Consider tree-shaking optimization (replace wildcard exports)
2. Standardize singleton naming (PascalCase vs camelCase)
3. Create export map in package.json for better control
4. Add automated consistency checks to CI

## Consistency Score

```
Overall Consistency: 8.5/10

Breakdown:
- Naming conventions: 10/10 ✅
- Export patterns: 9/10 ⚠️  (mixed default/named in few places)
- Re-export structure: 8/10 ⚠️  (some inconsistency)
- API surface: 7/10 ⚠️  (test utils in public API)
- Documentation: 6/10 ⚠️  (many undocumented exports)
```

## Next Steps

1. ✅ Complete consistency audit (DONE)
2. 🔄 Apply quick fixes (backup file removal, etc.)
3. ⏳ Document public API
4. ⏳ Create internal/testing export paths
5. ⏳ Validate changes with tests

---

**Generated by:** Export Consistency Analysis
