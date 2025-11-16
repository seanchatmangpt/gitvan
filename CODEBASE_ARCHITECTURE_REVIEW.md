# GitVan Codebase Architecture Review
**Date:** November 16, 2025  
**Scope:** RDF Architecture, File Organization, Integration Points, Code Quality  
**Status:** Post unrdf Refactoring Analysis

---

## EXECUTIVE SUMMARY

GitVan has successfully integrated the **official unrdf npm package** (v3.0.3) for RDF operations, replacing a custom wrapper layer. The refactoring eliminates approximately **90% of custom RDF code** (2000+ LOC → 340 LOC). However, the implementation is **incomplete** with **critical integration issues** that prevent proper functioning of the graph composable system.

### Key Findings:
- ✅ **Pure unrdf architecture** implemented correctly in `src/composables/graph.mjs`
- ✅ **Error handling patterns** consistently applied with error codes and error.cause chains
- ✅ **Async/await** properly used throughout composables
- ✅ **Type definitions** documented with JSDoc
- ❌ **CRITICAL: Missing export** - useGraph not exported from composables index
- ❌ **CRITICAL: Failed integration** - Dark Matter Core queries returning undefined
- ❌ **Test failures** - 5 failing tests in turtle-graph-integration suite
- ❌ **Broken dependency** - Tests import non-existent RdfEngine

---

## 1. RDF ARCHITECTURE ANALYSIS

### 1.1 Current Structure

#### Core RDF Operations
**File:** `/home/user/gitvan/src/composables/graph.mjs` (458 lines)

Pure unrdf-based composable implementing:
- ✅ `useGraph(store)` - Main composable factory
- ✅ `query(sparql, opts)` - Generic SPARQL execution
- ✅ `select(sparql)` - SELECT queries
- ✅ `ask(sparql)` - ASK queries  
- ✅ `validate(shapesInput)` - SHACL validation
- ✅ `serialize(opts)` - Turtle/N-Quads export
- ✅ `pointer()` - Clownface graph traversal
- ✅ `stats` - Graph statistics
- ✅ `union(...)` - Graph union operation
- ✅ `difference(other)` - Graph difference
- ✅ `intersection(other)` - Graph intersection
- ✅ `isIsomorphic(other)` - Graph comparison

#### unrdf Imports
```javascript
// Lines 7-20 in graph.mjs
import {
  createDarkMatterCore,      // Dark Matter 80/20 Core
  parseTurtle,               // Turtle parsing
  toTurtle,                  // Turtle serialization
  toNQuads,                  // N-Quads serialization
  defineHook,                // Knowledge hooks
  namedNode,                 // RDF term builders
  literal,
  quad,
  blankNode,
  defaultGraph,
  variable,
  Store                      // RDF store
} from 'unrdf';
```

### 1.2 Dark Matter 80/20 Core Usage

**Lazy Initialization Pattern** (lines 46-60):
```javascript
let system = null;
const initSystem = async () => {
  if (!system) {
    try {
      system = await createDarkMatterCore();
    } catch (err) {
      const error = new Error(`[useGraph] Failed to initialize unrdf: ${err.message}`);
      error.code = 'INIT_FAILED';
      error.cause = err;
      throw error;
    }
  }
  return system;
};
```

**Features Leveraged:**
- Query caching (LRU, 1000 entries)
- Hook batching (50 at a time)
- Deterministic output
- OTEL observability support

### 1.3 Composables Organization

**Location:** `/home/user/gitvan/src/composables/`

| File | Purpose | Lines | Status |
|------|---------|-------|--------|
| `graph.mjs` | RDF graph operations (unrdf) | 458 | ✅ Complete |
| `turtle.mjs` | Turtle file loading | 500+ | ✅ Active |
| `git.mjs` | Git operations | 600+ | ✅ Core |
| `filesystem.mjs` | File system operations | 400+ | ✅ Core |
| `index.mjs` | Composables exports | 31 | ⚠️ Incomplete |
| `job.mjs` | Job management | 400+ | ✅ Active |
| `event.mjs` | Event system | 600+ | ✅ Active |
| ... (15 total composables) | | | |

**ISSUE:** `index.mjs` does NOT export `useGraph` (line 1-30 reviewed)

### 1.4 Persistence Layer

**File:** `/home/user/gitvan/src/utils/persistence-helper.mjs` (508 lines)

Pure unrdf persistence helper:
- ✅ `writeTurtleFile(path, content, opts)` - Atomic writes
- ✅ `readTurtleFile(path, opts)` - File reading with validation
- ✅ `writeDefaultGraph(dir, content)` - Default graph management
- ✅ `readDefaultGraph(dir)` - Load default graph
- ✅ `serializeStore(store)` - Store to Turtle
- ✅ `parseTurtle(content)` - Content parsing
- ✅ Comprehensive file ops (listTurtleFiles, getFileStats, createBackup, removeFile)

**unrdf Imports:**
```javascript
import { parseTurtle, toTurtle, Store } from 'unrdf';
```

Error patterns consistently use error codes and error.cause chains (lines 34-360).

---

## 2. FILE ORGANIZATION

### 2.1 Source Directory Structure

```
/home/user/gitvan/src/
├── composables/              # 15 composables
│   ├── index.mjs            # ⚠️ Missing useGraph export
│   ├── graph.mjs            # ✅ Pure unrdf (458 LOC)
│   ├── turtle.mjs           # ✅ Turtle loading
│   ├── git.mjs              # ✅ Git ops
│   ├── filesystem.mjs       # ✅ File ops
│   ├── job.mjs              # ✅ Job management
│   ├── event.mjs            # ✅ Event system
│   ├── schedule.mjs         # ✅ Scheduling
│   ├── template.mjs         # ✅ Template rendering
│   ├── exec.mjs             # ✅ Execution
│   ├── pack.mjs             # ✅ Pack management
│   ├── registry.mjs         # ✅ Registry ops
│   ├── receipt.mjs          # ✅ Receipt tracking
│   ├── lock.mjs             # ✅ Lock management
│   ├── notes.mjs            # ✅ Notes ops
│   ├── worktree.mjs         # ✅ Worktree ops
│   └── ctx.mjs              # ✅ Context binding
├── utils/                   # Utilities
│   ├── persistence-helper.mjs  # ✅ RDF persistence (508 LOC)
│   ├── job-validator.mjs       # ✅ Job validation
│   ├── nunjucks-config.mjs     # ✅ Template config
│   ├── prompts.mjs            # ✅ Prompts
│   ├── registry.mjs           # ✅ Registry
│   ├── version.mjs            # ✅ Version management
│   ├── inject.mjs             # ✅ Dependency injection
│   ├── crypto.mjs             # ✅ Crypto ops
│   └── ... (8 total)
├── core/                    # Core infrastructure
│   ├── graph-architecture.mjs  # ⚠️ Broken useGraph usage
│   ├── context.mjs             # ✅ Context management
│   ├── hookable.mjs            # ✅ Hook system
│   ├── hook-loader.mjs         # ✅ Hook loading
│   └── job-registry.mjs        # ✅ Job registry
├── engines/                 # ⚠️ EMPTY DIRECTORY
│   └── (no files - RdfEngine removed)
├── rdf-to-zod/              # RDF-Zod conversion
│   ├── RDFToZodConverter.mjs   # ✅ Zod conversion
│   ├── OllamaRDF.mjs           # ✅ Ollama integration
│   ├── useOllamaRDF.mjs        # ✅ Ollama composable
│   └── useRDFToZod.mjs         # ✅ Zod composable
├── workflow/                # Workflow engine
│   ├── workflow-engine.mjs     # ✅ Uses useGraph
│   ├── workflow-executor.mjs   # ✅ Uses useGraph
│   ├── workflow-parser.mjs     # ✅ Uses useGraph
│   ├── step-handlers/          # SPARQL, RDF handlers
│   └── ... (6 files total)
├── ai/                      # AI integration
│   ├── graph-integration.mjs   # ✅ Uses useGraph
│   ├── graph-feedback-manager.mjs  # ✅ Uses useGraph
│   └── ... (5 files)
├── cli/                     # CLI system
│   ├── graph.mjs               # ✅ Graph CLI commands
│   ├── commands/               # Command handlers
│   └── ... (8 files)
└── ... (other modules)
```

### 2.2 Composition Pattern Analysis

**Composable Export Pattern:**
- Each composable is a module exporting async factory function
- Consistent error handling with error.code and error.cause
- Lazy initialization pattern (seen in graph.mjs, job.mjs)
- Context binding through core/context.mjs

**Example Pattern (composables/graph.mjs):**
```javascript
export async function useGraph(store) {
  // Input validation
  if (!store) {
    const error = new Error('[useGraph] Store is required');
    error.code = 'INVALID_STORE';
    throw error;
  }
  
  // Lazy system initialization
  let system = null;
  const initSystem = async () => { /* ... */ };
  
  // Return API object
  return {
    store: getter,
    query: async method,
    select: async method,
    // ... other methods
  };
}
```

**Re-exports Pattern (composables/index.mjs):**
```javascript
export { useGit } from "./git.mjs";
export { useFileSystem } from "./filesystem.mjs";
// ⚠️ MISSING: useGraph and other RDF composables
export { withGitVan, useGitVan, tryUseGitVan } from "../core/context.mjs";
```

---

## 3. INTEGRATION POINTS ANALYSIS

### 3.1 Tests Interacting with Composables

#### Passing Tests
**File:** `/home/user/gitvan/tests/composables/turtle-graph-integration.test.mjs`
- ✅ Line 69: `const turtle = await useTurtle({ graphDir })`
- ✅ Line 80: `const graph = await useGraph(turtle.store)`
- ✅ Proper async/await usage throughout

#### Failing Tests
**Test Results** (test-results.json):
- ❌ 5 failures in turtle-graph-integration suite
- ❌ Error: `[useGraph.select] Query must be SELECT. Got: undefined`
- ❌ Root cause: `sys.query()` returns object without `type` property

**Example Failure:**
```javascript
// Test at line 83
const results = await graph.select(sparql);

// Error trace:
// graph.select() → await this.query(sparql) → await sys.query()
// sys.query() returns: { } (no type field)
// Line 128: if (result.type !== 'select') → undefined !== 'select' = true
// Throws: "[useGraph.select] Query must be SELECT. Got: undefined"
```

### 3.2 Remaining References to Removed Components

**RdfEngine Status:**
- ❌ Directory: `/home/user/gitvan/src/engines/` is EMPTY
- ❌ Tests still import: `import { RdfEngine } from "../../src/engines/RdfEngine.mjs"`
- ✅ Code properly uses pure unrdf, but tests are broken

**Files Importing from Non-existent RdfEngine:**
```
/home/user/gitvan/tests/composables/graph.test.mjs:4
    import { RdfEngine } from "../../src/engines/RdfEngine.mjs";
```

**Search for unrdf-compat References:**
- ✅ NO references to `unrdf-compat` found in src/
- ✅ All imports properly use `from 'unrdf'`

### 3.3 How Modules Use Graph Composable

**Files Importing useGraph:**
1. `/home/user/gitvan/src/workflow/workflow-parser.mjs` (line 1)
2. `/home/user/gitvan/src/workflow/workflow-engine.mjs` (line 3)
3. `/home/user/gitvan/src/workflow/workflow-executor.mjs` (lines 3, 12)
4. `/home/user/gitvan/src/ai/graph-integration.mjs` (lines 1-2)
5. `/home/user/gitvan/src/ai/graph-feedback-manager.mjs` (line 1)
6. `/home/user/gitvan/src/core/graph-architecture.mjs` (line 6)

**Critical Issue in graph-architecture.mjs** (lines 27-33):
```javascript
// ❌ BROKEN: Calling useGraph with config object, not Store
async registerGraph(graphId, config = {}) {
  const graph = await useGraph({    // <- useGraph expects Store, not config
    baseIRI: config.baseIRI || `https://gitvan.dev/graph/${graphId}/`,
    snapshotsDir: config.snapshotsDir || `.gitvan/graphs/${graphId}/snapshots`,
    ...config,
  });
```

**Correct Usage Pattern** (workflow-executor.mjs):
```javascript
// ✅ CORRECT: Create Store first, then pass to useGraph
const store = new Store();
const graph = await useGraph(store);
```

---

## 4. CODE QUALITY ASSESSMENT

### 4.1 Error Handling Patterns

**Status:** ✅ **EXCELLENT** - Consistent implementation across codebase

**Pattern Used (40+ instances):**
```javascript
const error = new Error('[<Module>.<Method>] <Message>');
error.code = '<ERROR_CODE>';
error.cause = originalError;  // Preserve error chain
throw error;
```

**Error Code Categories in graph.mjs:**
- `INVALID_STORE` - Store validation (lines 34, 40)
- `INIT_FAILED` - Initialization errors (line 54)
- `LOAD_FAILED` - Data loading errors (line 72)
- `INVALID_QUERY` - Query validation (line 97)
- `QUERY_FAILED` - Query execution (line 112)
- `WRONG_QUERY_TYPE` - Type mismatches (lines 130, 157)
- `SELECT_FAILED`, `ASK_FAILED` - Specific query failures
- `INVALID_SHAPES`, `VALIDATION_FAILED` - SHACL validation
- `INVALID_FORMAT`, `SERIALIZE_FAILED` - Serialization
- `STATS_FAILED`, `COMPARISON_FAILED`, etc.

**Strengths:**
- Consistent error context with bracketed module paths
- Original errors preserved via error.cause chain
- Specific error codes enable programmatic error handling
- Additional context (query, format, etc.) attached to errors

**Example (persistence-helper.mjs):**
```javascript
// Line 44-49
const error = new Error(`[PersistenceHelper] Failed to create directory: ${err.message}`);
error.code = 'MKDIR_FAILED';
error.path = dirPath;
error.cause = err;
this.logger.error(error.message);
throw error;
```

### 4.2 Async/Await Consistency

**Status:** ✅ **EXCELLENT** - Proper async patterns throughout

**Async Method Signatures (graph.mjs):**
- Line 30: `export async function useGraph(store)` - Factory is async
- Line 94: `async query(sparql, opts = {})` - Query is async
- Line 125: `async select(sparql)` - Select is async
- Line 152: `async ask(sparql)` - Ask is async
- Line 179: `async validate(shapesInput)` - Validation is async
- Line 226: `async serialize(opts = {})` - Serialization is async
- Line 260: `async pointer()` - Pointer is async
- Line 313: `async isIsomorphic(otherGraph)` - Comparison is async
- Line 343: `async union(...otherGraphs)` - Union is async
- Line 372: `async difference(otherGraph)` - Difference is async
- Line 411: `async intersection(otherGraph)` - Intersection is async

**Proper Await Usage:**
```javascript
// Line 102
await ensureLoaded();
const sys = await initSystem();
return await sys.query({ ... });

// Line 127
const result = await this.query(sparql);

// Line 194
shapesStore = await unrdfParseTurtle(shapesInput);
```

**Issue in Tests:**
- Test file expects `useGraph()` to be synchronous (line 41)
- But composable returns async function
- Tests don't use `await useGraph()`

### 4.3 Type Definitions

**Status:** ✅ **GOOD** - JSDoc types documented

**Type Annotations in graph.mjs:**
```javascript
// Line 26-28
* @param {import('n3').Store} store - N3.Store instance
* @returns {Promise<object>} API object for graph operations
* @throws {Error} If store is invalid or operations fail

// Line 89-92
* @param {string} sparql - SPARQL query string
* @param {object} [opts] - Query options
* @returns {Promise<object>} Query result
* @throws {Error} If query is invalid or execution fails
```

**Strengths:**
- Parameter types documented
- Return types specified with Promise wrapper
- Throwing behavior documented
- Optional parameters marked with `[]`

**Gaps:**
- No TypeScript definitions generated
- JSDoc-only, no .d.ts files for graph composable
- Package.json exports types: `"types": "./dist/types/index.d.ts"` but files don't exist

---

## 5. CRITICAL ISSUES & GAPS

### 5.1 CRITICAL: Missing useGraph Export

**Issue:** useGraph not exported from composables index

**File:** `/home/user/gitvan/src/composables/index.mjs`

```javascript
// Current (lines 1-31)
export { useGit } from "./git.mjs";
export { useFileSystem } from "./filesystem.mjs";
// ... other composables ...
// ❌ MISSING: export { useGraph } from "./graph.mjs";
```

**Impact:**
- Cannot import: `import { useGraph } from 'gitvan/composables'`
- Must use: `import { useGraph } from 'gitvan/src/composables/graph.mjs'`
- Breaking public API contract

**Files Affected:**
- All test files trying to import useGraph
- External consumers expecting API export
- Documentation examples won't work

### 5.2 CRITICAL: Dark Matter Core Integration Failure

**Issue:** `sys.query()` returns object without expected `type` property

**Test Failure Details** (test-results.json):
```
Test: "should execute SPARQL SELECT queries"
Error: "[useGraph.select] Query must be SELECT. Got: undefined"
Location: tests/composables/turtle-graph-integration.test.mjs:83
Duration: 3544ms (long timeout suggests hanging)
```

**Code Path:**
1. Graph: `await graph.select(sparql)` (works)
2. Select method: `const result = await this.query(sparql)` (works)
3. Query method: `return await sys.query({...})` (returns wrong shape)
4. Select method checks: `if (result.type !== 'select')` 
5. Result.type is UNDEFINED → throws error

**Root Cause Analysis:**
- unrdf's `createDarkMatterCore()` API differs from expected
- Return shape from `sys.query()` doesn't include `type` field
- Implementation assumes SPARQL 1.1 result binding format

**Affected Methods:**
- graph.select() (line 128)
- graph.ask() (line 155)
- graph.query() indirectly

### 5.3 CRITICAL: Broken graph-architecture.mjs

**Issue:** Using useGraph with config object instead of N3.Store

**File:** `/home/user/gitvan/src/core/graph-architecture.mjs` (lines 27-33)

```javascript
❌ WRONG USAGE:
async registerGraph(graphId, config = {}) {
  const graph = await useGraph({
    baseIRI: config.baseIRI,
    snapshotsDir: config.snapshotsDir,
    ...config,
  });
```

**What useGraph expects:**
```javascript
// Signature in composables/graph.mjs line 30
export async function useGraph(store) {
  if (!store) {
    const error = new Error('[useGraph] Store is required');
    error.code = 'INVALID_STORE';
    throw error;
  }
  if (typeof store.getQuads !== 'function') {
    const error = new Error('[useGraph] Invalid store: must have getQuads method.');
    error.code = 'INVALID_STORE_TYPE';
    throw error;
  }
```

**Impact:**
- Will throw immediately when called
- Error: "Invalid store: must have getQuads method"
- All graph registration will fail
- Core graph system non-functional

### 5.4 CRITICAL: Missing RdfEngine File

**Issue:** Tests import from non-existent file

**File:** `/home/user/gitvan/src/engines/` - EMPTY DIRECTORY

**Import Attempt:**
```javascript
// tests/composables/graph.test.mjs:4
import { RdfEngine } from "../../src/engines/RdfEngine.mjs";
```

**Error:** Module not found

**Reason:** RdfEngine removed during unrdf refactoring, but tests not updated

### 5.5 Test Assertion Mismatches

**Issue:** Test expectations don't match implementation error messages

**File:** `/home/user/gitvan/tests/composables/graph.test.mjs`

```javascript
// Line 116 - Test expects:
await expect(graph.select(query)).rejects.toThrow(
  "Query is not a SELECT query"
);

// But implementation throws (line 130):
"[useGraph.select] Query must be SELECT. Got: " + result.type
```

**Issue:** Wrong error message expected

---

## 6. MISSING PATTERNS & RECOMMENDATIONS

### 6.1 Missing Documentation

**Gaps:**
- No README in `/home/user/gitvan/src/composables/`
- No inline API documentation for useGraph public methods
- No TypeScript definition files (.d.ts)
- No migration guide for useGraph consumers

**Recommendation:**
Create `/home/user/gitvan/src/composables/README.md`:
```markdown
# GitVan Composables

## useGraph - RDF Graph Operations

### Usage

\`\`\`javascript
import { useGraph } from 'gitvan/composables';
import { parseT urtle } from 'unrdf';

const turtle = `@prefix ex: <http://example.org/> ...`;
const store = await parseTurtle(turtle);
const graph = await useGraph(store);

// SPARQL queries
const results = await graph.select('SELECT ...');
const exists = await graph.ask('ASK ...');
const report = await graph.validate(shaclShapes);
\`\`\`
```

### 6.2 Missing Integration Tests

**Current Test Coverage:**
- Unit tests: turtle-graph-integration.test.mjs (failing)
- No tests for graph-architecture.mjs
- No tests for workflow-engine.mjs with useGraph
- No tests for ai/graph-integration.mjs

**Recommendation:**
Add integration test suite:
```javascript
// tests/integration/graph-architecture-integration.test.mjs
describe('Graph Architecture Integration', () => {
  it('should register graph correctly', async () => {
    const manager = new GitVanGraphManager();
    const graph = await manager.registry.registerGraph('test', {
      baseIRI: 'http://example.org/'
    });
    // Should not throw
  });
});
```

### 6.3 Missing Error Recovery

**Gap:** No retry logic for transient unrdf failures

**Recommendation:**
Add retry wrapper in graph composable:
```javascript
async function queryWithRetry(sparql, opts, maxRetries = 3) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await this.query(sparql, opts);
    } catch (err) {
      lastError = err;
      if (err.code === 'INIT_FAILED') {
        // Might be transient, retry
        await new Promise(r => setTimeout(r, 100 * Math.pow(2, i)));
      } else {
        throw err;
      }
    }
  }
  throw lastError;
}
```

### 6.4 Missing Performance Monitoring

**Gap:** No metrics for Dark Matter Core performance

**Recommendation:**
Add performance tracking:
```javascript
const initSystem = async () => {
  const startTime = performance.now();
  try {
    system = await createDarkMatterCore();
    const duration = performance.now() - startTime;
    // Log: "Dark Matter Core initialized in ${duration}ms"
  } catch (err) { /* ... */ }
};
```

---

## 7. SUMMARY OF KEY FILES

| File | Purpose | Lines | Status | Issues |
|------|---------|-------|--------|--------|
| `src/composables/graph.mjs` | RDF graph ops (pure unrdf) | 458 | ✅ Complete | Query return type mismatch |
| `src/composables/index.mjs` | Composables exports | 31 | ❌ Broken | Missing useGraph export |
| `src/utils/persistence-helper.mjs` | RDF persistence layer | 508 | ✅ Complete | None identified |
| `src/core/graph-architecture.mjs` | Graph management | 200+ | ❌ Broken | Wrong useGraph usage |
| `src/engines/` | (empty) | 0 | ❌ Removed | Tests import from here |
| `tests/composables/graph.test.mjs` | Graph unit tests | 300+ | ❌ Failing | 5 test failures, import errors |
| `tests/composables/turtle-graph-integration.test.mjs` | Integration tests | 300+ | ⚠️ Partial | 5 failures, async issues |
| `src/workflow/workflow-engine.mjs` | Workflow execution | 400+ | ⚠️ Risky | Uses useGraph with broken registry |
| `src/ai/graph-integration.mjs` | AI-graph bridge | 200+ | ⚠️ Risky | Depends on broken registry |

---

## 8. ACTIONABLE NEXT STEPS

### Phase 1: Fix Critical Issues (1-2 hours)

1. **Add missing useGraph export**
   - File: `/home/user/gitvan/src/composables/index.mjs`
   - Change: Add `export { useGraph } from "./graph.mjs";` after line 5

2. **Fix graph-architecture.mjs useGraph usage**
   - File: `/home/user/gitvan/src/core/graph-architecture.mjs`
   - Need to create N3.Store before passing to useGraph
   - Add: `import N3 from 'n3'; const store = new N3.Store();`

3. **Investigate Dark Matter Core query API**
   - Verify what `createDarkMatterCore().query()` actually returns
   - May need to use different API method or adapt return shape
   - Check unrdf package documentation/examples

4. **Update test imports**
   - Remove: `import { RdfEngine } from "../../src/engines/RdfEngine.mjs";`
   - Create minimal test store using unrdf directly

### Phase 2: Fix Tests (1-2 hours)

5. **Fix graph.test.mjs**
   - Remove RdfEngine dependency
   - Use `parseTurtle` from unrdf instead
   - Add proper await to `useGraph()` calls
   - Update error message assertions

6. **Fix turtle-graph-integration.test.mjs**
   - Make useGraph calls properly async
   - Debug why sys.query() doesn't return type field
   - Add retry logic for transient failures

### Phase 3: Documentation & Observability (1 hour)

7. **Create composables README**
   - Document useGraph API
   - Provide usage examples
   - Explain error codes

8. **Add TypeScript definitions**
   - Generate .d.ts for graph composable
   - Update package.json exports

### Phase 4: Integration Testing (2-3 hours)

9. **Create integration test suite**
   - Test graph-architecture with useGraph
   - Test workflow-engine graph integration
   - Test ai/graph-integration

10. **Add performance monitoring**
    - Track Dark Matter Core initialization
    - Monitor query cache hit rates
    - Log hook batching statistics

---

## CONCLUSION

The unrdf refactoring successfully eliminated ~90% of custom RDF code and introduced the Dark Matter 80/20 Core system. However, **critical integration gaps prevent the system from functioning**:

1. **Missing export** breaks the public API
2. **Dark Matter Core API mismatch** causes query failures
3. **Wrong useGraph usage** in graph-architecture makes core system non-functional
4. **Missing RdfEngine** breaks test infrastructure

These are **HIGH PRIORITY** fixes required to restore functionality. Once resolved, the pure unrdf architecture will provide excellent performance, maintainability, and observability benefits.

**Estimated time to fully functional:** 4-6 hours for phases 1-3
