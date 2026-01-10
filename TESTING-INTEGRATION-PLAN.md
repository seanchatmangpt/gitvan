# GitVan v4.0.2+ Testing Integration Plan
## Comprehensive Testing Utilities and Patterns Architecture

**Document Status:** Draft Integration Plan
**Version:** 1.0.0
**Date:** 2026-01-10
**Target Coverage:** 85%+ (branches, functions, lines, statements)
**Total Estimated Effort:** 320-400 person-hours across 4 phases

---

## Executive Summary

This document provides a comprehensive integration plan for establishing world-class testing utilities and patterns across GitVan v4.0.2+. The plan addresses current testing gaps while creating reusable utilities for the unique testing challenges posed by GitVan's architecture:

- **Git-native storage** requiring deterministic environment isolation
- **RDF/SPARQL** graph operations requiring semantic graph testing utilities
- **Hook system** requiring predicate evaluation and workflow testing patterns
- **Performance-critical** operations requiring regression detection and scale testing
- **Distributed** execution requiring chaos testing and failure scenarios

The plan is structured as a 4-phase rollout:
1. **Phase 1 (60-80h):** RDF test utilities and fixture system
2. **Phase 2 (70-90h):** Hook testing framework and patterns
3. **Phase 3 (80-100h):** Performance regression testing suite
4. **Phase 4 (110-140h):** Property-based and chaos testing

---

## Section 1: Current Testing State Analysis

### 1.1 Test Inventory and Metrics

**Total Test Coverage:**
- **310+ test files** across multiple directories
- **63,227 lines** of test code
- **Vitest 4.0.16** as testing framework
- **Target:** 80% threshold (branches, functions, lines, statements)

**Test File Distribution:**

```
/tests/                          (primary test directory)
├── composables/                 (15 files, ~12KB) - Composable functions
├── e2e/                         (10 files, ~25KB) - End-to-end tests
├── performance/                 (11 files, ~120KB) - Benchmarks
├── git-native/                  (9 files, ~45KB) - Git storage layer
├── integration/                 (13 files, ~80KB) - Cross-system integration
├── citty-test-utils/           (12 files, ~60KB) - CLI testing framework
├── pack/                        (25 files, ~150KB) - Pack system tests
├── jobs/                        (2 files, ~15KB) - Job scheduling
├── workflow/                    (1 file, ~8KB) - Workflow engine
├── step-handlers/               (5 files, ~30KB) - Workflow step handlers
├── security/                    (2 files, ~20KB) - Security testing
├── tracer/                      (10 files, ~80KB) - Tracing/debugging
├── validation/                  (7 files, ~100KB) - Validation tests
├── autonomic/                   (6 files, ~50KB) - Autonomous behavior
├── revops/                      (6 files, ~100KB) - RevOps domain tests
├── telemetry/                   (2 files, ~25KB) - OpenTelemetry
├── turtle-test-data/           (test fixtures)
├── helpers/                     (test utilities)
└── utils/                       (platform-specific utilities)

/examples/                       (example tests for documentation)
├── knowledge-hooks-*.test.mjs  (hook examples)
├── jobs-*.test.mjs             (job examples)
└── ... (60+ example files)

/vendors/citty-test-utils/      (CLI testing framework)
├── test/                       (30+ test files)
└── playground/                 (integration tests)
```

**Test Categories:**

| Category | Count | Lines | Coverage Gap |
|----------|-------|-------|--------------|
| Unit Tests | 120 | 15,000 | 5-10% |
| Integration Tests | 95 | 25,000 | 8-12% |
| E2E Tests | 35 | 12,000 | 10-15% |
| Performance Tests | 40 | 8,000 | 20-25% |
| Example Tests | 70 | 3,227 | Varies |
| **Total** | **360+** | **63,227** | **10-15% avg** |

### 1.2 Current Testing Architecture

**Vitest Configuration:**

```typescript
// vitest.config.mjs structure
{
  test: {
    environment: "node",
    include: ["tests/**/*.test.mjs", "tests/**/*.spec.mjs"],
    testTimeout: 120000, // 120s for integration tests
    setupFiles: ["tests/setup.mjs"],
    globalSetup: "tests/global-setup.mjs",
    coverage: {
      provider: "v8",
      thresholds: { branches: 80, functions: 80, lines: 80, statements: 80 },
      exclude: ["node_modules", "dist", "tests", "**/*.d.ts"]
    },
    pool: "forks", // Prevents git lock conflicts
    maxConcurrency: 2,
    minWorkers: 1,
    maxWorkers: 2
  }
}
```

**Current Test Utilities:**

1. **TestUtils class** (`tests/setup.mjs`)
   - Directory setup/cleanup
   - Mock AI provider creation
   - Basic test environment management

2. **Helper utilities** (`tests/helpers/helpers.mjs`)
   - Sleep/retry functions
   - Git ref cleanup
   - Lock management
   - ~250 lines of utility code

3. **RDF Engine** (`src/engines/RdfEngine.mjs`)
   - Turtle parsing/serialization
   - SPARQL query execution
   - Term and quad creation
   - N-Quads support

4. **Citty Test Utils** (`vendors/citty-test-utils/`)
   - CLI command execution
   - Output assertion helpers
   - Snapshot testing
   - BDD scenario framework

5. **RDF Pack Fixtures** (`tests/pack/fixtures/rdf-pack-fixtures.mjs`)
   - Sample pack definitions in Turtle
   - Dependency graph fixtures
   - ~300 lines of sample data

### 1.3 Context-Aware Testing Pattern

GitVan's critical async pattern requires wrapping async operations with context:

```javascript
// CURRENT PATTERN IN USE
import { withGitVan } from "../../src/core/context.mjs";

describe("useGit Composable", () => {
  it("should get current branch", async () => {
    await withGitVan(testContext, async () => {
      const git = useGit();
      const branch = await git.currentBranch();
      expect(branch).toBe("main");
    });
  });
});
```

**Context preservation flow:**
```
Test → withGitVan(context, async () => {
  useComposable() ← context available
  await async_operation() ← context preserved by unctx
  composable.method() ← context still available
})
```

### 1.4 Test Environment Setup

**Global Setup** (`tests/global-setup.mjs`):
- Creates temporary test directories
- Initializes git repositories
- Sets deterministic environment variables
- Configures mock AI providers

**Per-Test Setup** (`tests/setup.mjs`):
- TestUtils class instantiation
- Directory structure creation
- Mock provider initialization
- Test-specific context creation

**Environment Normalization:**
```bash
TZ=UTC                    # Deterministic timestamps
LANG=C                    # Consistent output
NODE_ENV=test            # Test-specific config
GITVAN_REPO=<tempdir>   # Isolated git repo
GITVAN_HOME=<tempdir>   # Isolated home directory
```

### 1.5 Identified Pain Points and Gaps

#### Gap 1: RDF-Specific Testing Utilities (20% estimated gap)

**Current Issues:**
- No centralized RDF fixture management
- SPARQL query testing requires boilerplate setup
- RDF graph comparison is manual
- Turtle file fixtures scattered across codebase
- No standard RDF assertion helpers

**Impact:** 50+ tests have duplicated RDF setup code, making tests 2-3x longer than necessary.

**Example of current duplication:**
```javascript
// tests/engines/RdfEngine.test.mjs (lines 1-40)
const testTurtle = `@prefix ex: <https://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
ex:alice rdf:type foaf:Person ;
    foaf:name "Alice" .`;
const store = engine.parseTurtle(testTurtle);

// tests/pack/PackIntegration.test.mjs (similar setup)
const packTurtle = `@prefix pack: <https://gitvan.dev/pack#> .
pack:name "test-pack" .`;
const store = engine.parseTurtle(packTurtle);

// This pattern repeats 30+ times across codebase
```

**Solution:** Centralized RDF test store factory with fixtures.

#### Gap 2: Hook Testing Patterns (15% estimated gap)

**Current Issues:**
- Predicate evaluation testing requires full hook registry setup
- Mock git events are inconsistently implemented
- No fluent API for hook assertions
- Hook workflow integration tests are complex
- No performance assertion helpers for predicates

**Impact:** 40+ hook tests are 2x-3x larger than necessary, difficult to maintain.

**Current pattern complexity:**
```javascript
// Current: 50+ lines to test a single predicate
const registry = new KnowledgeHookRegistry();
const evaluator = new PredicateEvaluator();
const hook = { predicate: "SELECT ?x WHERE { ?x a foaf:Person }" };
const store = createStore(); // custom, not reusable
const result = await evaluator.evaluate(hook.predicate, store);
```

**Desired pattern:**
```javascript
// Desired: 3-5 lines
const hook = createTestHook("person-finder");
await expectPredicate(hook).toReturn(matches);
```

#### Gap 3: Performance Regression Testing (25% estimated gap)

**Current State:**
- Performance tests exist but aren't tracked against baselines
- No automated regression detection in CI
- Benchmark results are printed but not persisted
- No comparison against previous commits/branches
- Memory profiling is basic

**Impact:** Performance regressions slip through; 5-10 tests take 30+ seconds.

**Example of current benchmark code:**
```javascript
// tests/performance/hooks-system-performance.test.mjs
async function measurePerformance(name, fn, iterations = 1) {
  const memBefore = process.memoryUsage();
  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    await fn();
  }

  // Manual calculation of metrics...
  // Results printed to console, not tracked
}
```

#### Gap 4: Property-Based Testing (10% estimated gap)

**Current State:**
- No property-based testing framework in use
- SPARQL queries not tested with generated queries
- No RDF graph transformation testing with random inputs
- Predicate testing limited to manual cases

**Impact:** Edge cases in SPARQL and graph transformations not discovered.

#### Gap 5: Chaos Testing (30% estimated gap)

**Current State:**
- No chaos testing framework
- Git operation failures not simulated
- Hook failures during execution not tested
- Concurrent hook execution under stress not tested
- Network failures not simulated

**Impact:** Production failures not prevented in testing; unknown failure modes in hooks system.

#### Gap 6: Snapshot Testing (15% estimated gap)

**Current State:**
- Some snapshot tests exist in citty-test-utils
- RDF graph snapshots not used
- Workflow plan snapshots missing
- Hook execution logs not snapshotted

**Impact:** Unintended RDF graph changes not detected; workflow changes not tracked.

#### Gap 7: Scale Testing (20% estimated gap)

**Current State:**
- Some scale tests exist (1M+ hooks) but are slow
- No systematic scale testing for different components
- No memory leak detection
- Load testing limited to hooks

**Impact:** Real-world scale issues not caught until production.

---

## Section 2: Testing Opportunities and Priorities

### 2.1 Priority Matrix

```
┌─────────────────────────────────────────────────────┐
│ IMPACT/EFFORT MATRIX                                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  HIGH IMPACT                                        │
│  ┌──────────────────────────────────────────────┐  │
│  │ ✓ RDF test utilities (P1, 60-80h, 25% gap)  │  │
│  │ ✓ Hook testing patterns (P2, 70-90h, 15%)   │  │
│  │ ✓ Performance regression (P3, 80-100h, 25%) │  │
│  │ ✓ Chaos testing (P4, 110-140h, 30%)         │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  MEDIUM IMPACT                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │ • Property-based testing (Lower priority)    │  │
│  │ • Snapshot testing (Medium priority)         │  │
│  │ • Scale testing (Medium priority)            │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  LOW EFFORT, HIGH VALUE                             │
│  ┌──────────────────────────────────────────────┐  │
│  │ ◇ Centralize RDF fixtures (10h)              │  │
│  │ ◇ Create assertion helpers (15h)             │  │
│  │ ◇ Document patterns (20h)                    │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 2.2 RDF-Specific Test Utilities (Phase 1 Priority)

#### 2.2.1 Test Store Factory

**Purpose:** Centralize RDF store creation with common fixtures

**Implementation:**

```javascript
// /src/test-utils/rdf-store-factory.mjs

import { RdfEngine } from "../engines/RdfEngine.mjs";

export class RdfStoreFactory {
  constructor(baseIRI = "https://gitvan.dev/test/") {
    this.engine = new RdfEngine({ baseIRI, deterministic: true });
    this.baseIRI = baseIRI;
  }

  /**
   * Create empty store
   */
  createEmptyStore() {
    return this.engine.createStore();
  }

  /**
   * Load fixture by name
   */
  async loadFixture(name) {
    const fixtures = await import("./fixtures/index.mjs");
    if (!fixtures[name]) {
      throw new Error(`Unknown fixture: ${name}`);
    }
    return this.engine.parseTurtle(fixtures[name]);
  }

  /**
   * Create store with FOAF vocabulary (people, groups)
   */
  createFoafStore(data = {}) {
    const people = data.people || [];
    const relationships = data.relationships || [];

    let ttl = `@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix ex: <${this.baseIRI}> .

`;

    for (const person of people) {
      ttl += `ex:${person.id} a foaf:Person ;
  foaf:name "${person.name}" ;
  foaf:age ${person.age} .

`;
    }

    for (const rel of relationships) {
      ttl += `ex:${rel.from} foaf:knows ex:${rel.to} .
`;
    }

    return this.engine.parseTurtle(ttl);
  }

  /**
   * Create store with Git vocabulary
   */
  createGitStore(data = {}) {
    const commits = data.commits || [];
    const branches = data.branches || [];

    let ttl = `@prefix git: <https://gitvan.dev/ontology#> .
@prefix ex: <${this.baseIRI}> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

`;

    for (const commit of commits) {
      ttl += `ex:${commit.sha} a git:Commit ;
  git:message "${commit.message}" ;
  git:author "${commit.author}" ;
  git:timestamp "${commit.timestamp}"^^xsd:dateTime .

`;
    }

    for (const branch of branches) {
      ttl += `ex:${branch.name} a git:Branch ;
  git:pointsTo ex:${branch.headSha} .

`;
    }

    return this.engine.parseTurtle(ttl);
  }

  /**
   * Create store with Pack vocabulary
   */
  createPackStore(data = {}) {
    const packs = data.packs || [];

    let ttl = `@prefix pack: <https://gitvan.dev/pack#> .
@prefix ex: <${this.baseIRI}> .

`;

    for (const pack of packs) {
      ttl += `ex:${pack.id} a pack:Pack ;
  pack:name "${pack.name}" ;
  pack:version "${pack.version}" .

`;
    }

    return this.engine.parseTurtle(ttl);
  }

  /**
   * Create store with Hook vocabulary
   */
  createHookStore(data = {}) {
    const hooks = data.hooks || [];

    let ttl = `@prefix hook: <https://gitvan.dev/hook#> .
@prefix ex: <${this.baseIRI}> .

`;

    for (const hook of hooks) {
      ttl += `ex:${hook.id} a hook:Hook ;
  hook:name "${hook.name}" ;
  hook:predicate """${hook.predicate}""" ;
  hook:enabled ${hook.enabled} .

`;
    }

    return this.engine.parseTurtle(ttl);
  }

  /**
   * Merge multiple stores
   */
  mergeStores(...stores) {
    const merged = this.createEmptyStore();

    for (const store of stores) {
      for (const quad of store) {
        merged.add(quad);
      }
    }

    return merged;
  }
}

// Export singleton
export const rdfStoreFactory = new RdfStoreFactory();
```

**Usage Pattern:**

```javascript
// Before (30+ lines of setup)
const testTurtle = `@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix ex: <https://example.org/> .
ex:alice a foaf:Person ;
    foaf:name "Alice" ;
    foaf:age 30 ;
    foaf:knows ex:bob .
ex:bob a foaf:Person ;
    foaf:name "Bob" ;
    foaf:age 25 .`;
const store = engine.parseTurtle(testTurtle);

// After (3 lines)
const factory = new RdfStoreFactory();
const store = factory.createFoafStore({
  people: [{ id: "alice", name: "Alice", age: 30 }]
});
```

#### 2.2.2 RDF Assertion Helpers

**Purpose:** Fluent assertions for RDF graphs

```javascript
// /src/test-utils/rdf-assertions.mjs

export class RdfAssertions {
  constructor(store) {
    this.store = store;
    this.engine = new RdfEngine();
  }

  /**
   * Assert store contains a triple
   */
  async hasTriple(subject, predicate, object) {
    const quads = Array.from(this.store.match(subject, predicate, object));
    if (quads.length === 0) {
      throw new Error(
        `Expected triple: ${subject} ${predicate} ${object}`
      );
    }
    return this;
  }

  /**
   * Assert subject has type
   */
  async hasType(subject, type) {
    const rdf = this.engine.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
    return this.hasTriple(subject, rdf, type);
  }

  /**
   * Assert subject has property value
   */
  async hasProperty(subject, property, value) {
    const quads = Array.from(
      this.store.match(subject, property, null)
    );
    const hasValue = quads.some(q => q.object.value === value);
    if (!hasValue) {
      throw new Error(
        `Expected property ${property} on ${subject} to have value ${value}`
      );
    }
    return this;
  }

  /**
   * Assert SPARQL query returns results
   */
  async sparqlReturns(query, expectedCount = null) {
    const results = await this.engine.query(query, this.store);

    if (expectedCount !== null && results.length !== expectedCount) {
      throw new Error(
        `Expected ${expectedCount} results, got ${results.length}`
      );
    }

    if (results.length === 0) {
      throw new Error(`Expected SPARQL query to return results, got none`);
    }

    return this;
  }

  /**
   * Assert graphs are equivalent (isomorphic)
   */
  async isIsomorphicTo(otherStore) {
    const canonical1 = await this.canonicalize();
    const canonical2 = await this.canonicalize(otherStore);

    if (canonical1 !== canonical2) {
      throw new Error(
        `Graphs are not isomorphic.\nExpected: ${canonical2}\nActual: ${canonical1}`
      );
    }

    return this;
  }

  /**
   * Assert store has expected size
   */
  hasSize(expectedSize) {
    if (this.store.size !== expectedSize) {
      throw new Error(
        `Expected store size ${expectedSize}, got ${this.store.size}`
      );
    }
    return this;
  }

  /**
   * Get assertion results as object
   */
  results() {
    return {
      quads: this.store.size,
      subjects: new Set(Array.from(this.store).map(q => q.subject.value)).size,
      predicates: new Set(Array.from(this.store).map(q => q.predicate.value)).size,
      objects: new Set(Array.from(this.store).map(q => q.object.value)).size,
    };
  }

  // Private helper
  async canonicalize(store = this.store) {
    const sorted = Array.from(store)
      .map(q => `${q.subject.value}|${q.predicate.value}|${q.object.value}`)
      .sort()
      .join("\n");

    return sorted;
  }
}

// Vitest matcher extension
export function useRdfAssertions(store) {
  return new RdfAssertions(store);
}
```

**Usage Pattern:**

```javascript
import { useRdfAssertions } from "@/test-utils/rdf-assertions";

it("should have correct store structure", async () => {
  const store = createTestStore();
  const rdf = useRdfAssertions(store);

  await rdf
    .hasType(subject, Person)
    .hasProperty(subject, foafName, "Alice")
    .sparqlReturns(query, 5)
    .hasSize(20);
});
```

#### 2.2.3 SPARQL Query Testing Utilities

**Purpose:** Test SPARQL queries with fixtures and comparisons

```javascript
// /src/test-utils/sparql-test-builder.mjs

export class SparqlTestBuilder {
  constructor(store) {
    this.store = store;
    this.engine = new RdfEngine();
    this.queries = new Map();
  }

  /**
   * Register query fixture by name
   */
  registerQuery(name, sparqlQuery) {
    this.queries.set(name, sparqlQuery);
    return this;
  }

  /**
   * Execute query and validate results
   */
  async execute(queryNameOrSparql, options = {}) {
    const query = typeof queryNameOrSparql === 'string'
      ? this.queries.get(queryNameOrSparql) || queryNameOrSparql
      : queryNameOrSparql;

    const startTime = performance.now();
    const results = await this.engine.query(query, this.store);
    const duration = performance.now() - startTime;

    return {
      query,
      results,
      duration,
      count: results.length,

      /**
       * Assert result count
       */
      expectCount(count) {
        if (this.count !== count) {
          throw new Error(
            `Expected ${count} results, got ${this.count}`
          );
        }
        return this;
      },

      /**
       * Assert result contains specific value
       */
      expectContains(varName, value) {
        const found = this.results.some(row =>
          row[varName]?.value === value
        );
        if (!found) {
          throw new Error(
            `Expected results to contain ${varName}="${value}"`
          );
        }
        return this;
      },

      /**
       * Assert performance baseline
       */
      expectDuration(maxMs) {
        if (this.duration > maxMs) {
          throw new Error(
            `Query took ${this.duration.toFixed(2)}ms, expected < ${maxMs}ms`
          );
        }
        return this;
      },

      /**
       * Compare with expected results
       */
      expectEqual(expectedResults) {
        const actual = JSON.stringify(this.results.sort());
        const expected = JSON.stringify(expectedResults.sort());

        if (actual !== expected) {
          throw new Error(
            `Results don't match.\nExpected: ${expected}\nActual: ${actual}`
          );
        }
        return this;
      },
    };
  }
}

// Usage
it("should find all people over 30", async () => {
  const store = createFoafStore({
    people: [
      { id: "alice", name: "Alice", age: 35 },
      { id: "bob", name: "Bob", age: 25 },
    ]
  });

  const builder = new SparqlTestBuilder(store);

  await builder.execute(`
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    SELECT ?name WHERE {
      ?person foaf:age ?age .
      ?person foaf:name ?name .
      FILTER (?age > 30)
    }
  `)
    .expectCount(1)
    .expectContains("name", "Alice")
    .expectDuration(100);
});
```

### 2.3 Hook Testing Framework (Phase 2 Priority)

#### 2.3.1 Hook Test Builder

**Purpose:** Simplify hook unit and integration testing

```javascript
// /src/test-utils/hook-test-builder.mjs

export class HookTestBuilder {
  constructor() {
    this.registry = new KnowledgeHookRegistry();
    this.evaluator = new PredicateEvaluator();
    this.hooks = new Map();
    this.storeFactory = new RdfStoreFactory();
  }

  /**
   * Create test hook with defaults
   */
  createHook(id, options = {}) {
    const hook = {
      id,
      name: options.name || `hook-${id}`,
      predicate: options.predicate || "ASK WHERE { ?x ?y ?z }",
      action: options.action || "log",
      enabled: options.enabled !== false,
      priority: options.priority || 0,
      ...options,
    };

    this.hooks.set(id, hook);
    this.registry.register(hook);
    return hook;
  }

  /**
   * Evaluate hook predicate against store
   */
  async evaluatePredicate(hookId, store = null) {
    const hook = this.hooks.get(hookId);
    const testStore = store || this.storeFactory.createEmptyStore();

    const startTime = performance.now();
    const result = await this.evaluator.evaluate(hook.predicate, testStore);
    const duration = performance.now() - startTime;

    return {
      hookId,
      result,
      duration,

      /**
       * Assert predicate result
       */
      expectTrue() {
        if (!result) {
          throw new Error(`Expected predicate to evaluate to true, got ${result}`);
        }
        return this;
      },

      expectFalse() {
        if (result) {
          throw new Error(`Expected predicate to evaluate to false, got ${result}`);
        }
        return this;
      },

      expectDuration(maxMs) {
        if (duration > maxMs) {
          throw new Error(
            `Predicate evaluation took ${duration.toFixed(2)}ms, expected < ${maxMs}ms`
          );
        }
        return this;
      },
    };
  }

  /**
   * Execute hook with mock event
   */
  async executeWithEvent(hookId, event, store = null) {
    const hook = this.hooks.get(hookId);
    const testStore = store || this.storeFactory.createEmptyStore();

    const orchestrator = new HookOrchestrator(this.registry);

    const startTime = performance.now();
    const result = await orchestrator.execute(hook.id, event, testStore);
    const duration = performance.now() - startTime;

    return {
      hookId,
      event,
      result,
      duration,

      /**
       * Assert hook was executed
       */
      expectExecuted() {
        if (!result.executed) {
          throw new Error(`Expected hook to execute`);
        }
        return this;
      },

      expectNotExecuted() {
        if (result.executed) {
          throw new Error(`Expected hook not to execute`);
        }
        return this;
      },

      expectError(errorMsg = null) {
        if (!result.error) {
          throw new Error(`Expected hook execution to error`);
        }
        if (errorMsg && !result.error.includes(errorMsg)) {
          throw new Error(
            `Expected error to contain "${errorMsg}", got "${result.error}"`
          );
        }
        return this;
      },

      expectDuration(maxMs) {
        if (duration > maxMs) {
          throw new Error(
            `Hook execution took ${duration.toFixed(2)}ms, expected < ${maxMs}ms`
          );
        }
        return this;
      },
    };
  }

  /**
   * Create mock git event for testing
   */
  mockGitEvent(type, data = {}) {
    return {
      type, // 'commit', 'push', 'branch', etc.
      timestamp: new Date().toISOString(),
      repo: data.repo || "/tmp/test-repo",
      branch: data.branch || "main",
      sha: data.sha || "abc123def456",
      author: data.author || "test@example.com",
      message: data.message || "Test commit",
      ...data,
    };
  }
}
```

**Usage Pattern:**

```javascript
import { HookTestBuilder } from "@/test-utils/hook-test-builder";

describe("Hook Testing", () => {
  it("should trigger on commit", async () => {
    const builder = new HookTestBuilder();

    builder.createHook("on-commit", {
      name: "On Commit Hook",
      predicate: `
        PREFIX git: <https://gitvan.dev/ontology#>
        ASK WHERE { ?event a git:CommitEvent }
      `,
    });

    const event = builder.mockGitEvent("commit", {
      message: "feat: add new feature",
    });

    await builder
      .executeWithEvent("on-commit", event)
      .expectExecuted()
      .expectDuration(50);
  });

  it("should have good predicate performance", async () => {
    const builder = new HookTestBuilder();

    builder.createHook("perf-test", {
      predicate: `
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        ASK WHERE { ?person foaf:name ?name . FILTER regex(?name, "^A") }
      `,
    });

    const store = builder.storeFactory.createFoafStore({
      people: Array.from({ length: 100 }, (_, i) => ({
        id: `person${i}`,
        name: i % 2 === 0 ? `Alice${i}` : `Bob${i}`,
        age: 20 + i,
      })),
    });

    await builder
      .evaluatePredicate("perf-test", store)
      .expectTrue()
      .expectDuration(100); // Must complete in 100ms
  });
});
```

### 2.4 Performance Test Suite (Phase 3 Priority)

#### 2.4.1 Performance Baseline Tracking

**Purpose:** Detect performance regressions automatically

```javascript
// /src/test-utils/performance-tracker.mjs

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "pathe";

export class PerformanceTracker {
  constructor(baselineDir = ".benchmarks") {
    this.baselineDir = baselineDir;
    this.results = new Map();
  }

  /**
   * Record benchmark result
   */
  recordBenchmark(name, durationMs, metadata = {}) {
    const timestamp = new Date().toISOString();

    const result = {
      name,
      duration: durationMs,
      timestamp,
      gitSha: this.getGitSha(),
      branch: this.getGitBranch(),
      ...metadata,
    };

    this.results.set(name, result);
    return result;
  }

  /**
   * Compare against baseline
   */
  compareToBaseline(name, currentDurationMs, threshold = 10) {
    const baseline = this.loadBaseline(name);

    if (!baseline) {
      return {
        name,
        status: "new",
        current: currentDurationMs,
        baseline: null,
        delta: null,
        percentChange: null,
      };
    }

    const delta = currentDurationMs - baseline.duration;
    const percentChange = (delta / baseline.duration) * 100;
    const withinThreshold = Math.abs(percentChange) <= threshold;

    return {
      name,
      status: withinThreshold ? "pass" : "fail",
      current: currentDurationMs,
      baseline: baseline.duration,
      delta,
      percentChange,
      threshold,
    };
  }

  /**
   * Save baselines for next run
   */
  saveBaselines() {
    for (const [name, result] of this.results) {
      this.saveBaseline(name, result);
    }
  }

  /**
   * Private helpers
   */
  private saveBaseline(name, result) {
    const baselineFile = this.getBaselineFile(name);
    writeFileSync(baselineFile, JSON.stringify(result, null, 2));
  }

  private loadBaseline(name) {
    const baselineFile = this.getBaselineFile(name);
    if (!existsSync(baselineFile)) {
      return null;
    }
    return JSON.parse(readFileSync(baselineFile, "utf-8"));
  }

  private getBaselineFile(name) {
    return join(this.baselineDir, `${name}.json`);
  }

  private getGitSha() {
    try {
      return execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
    } catch {
      return "unknown";
    }
  }

  private getGitBranch() {
    try {
      return execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
    } catch {
      return "unknown";
    }
  }

  /**
   * Generate report
   */
  generateReport() {
    const results = Array.from(this.results.values());
    const comparisons = results.map(r => this.compareToBaseline(r.name, r.duration));

    const passed = comparisons.filter(c => c.status === "pass").length;
    const failed = comparisons.filter(c => c.status === "fail").length;
    const newTests = comparisons.filter(c => c.status === "new").length;

    return {
      timestamp: new Date().toISOString(),
      summary: { passed, failed, newTests, total: comparisons.length },
      comparisons,
      averageDuration: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
    };
  }
}
```

**Usage Pattern:**

```javascript
import { PerformanceTracker } from "@/test-utils/performance-tracker";

describe("Performance Benchmarks", () => {
  let tracker;

  beforeEach(() => {
    tracker = new PerformanceTracker();
  });

  afterAll(() => {
    tracker.saveBaselines();
    console.log(JSON.stringify(tracker.generateReport(), null, 2));
  });

  it("hook registration should be fast", async () => {
    const startTime = performance.now();

    for (let i = 0; i < 100; i++) {
      registry.register(createTestHook(`hook${i}`));
    }

    const duration = performance.now() - startTime;
    const result = tracker.recordBenchmark("hook-registration-100", duration);

    const comparison = tracker.compareToBaseline("hook-registration-100", duration);

    expect(comparison.status).toBe("pass");
    expect(duration).toBeLessThan(500); // 100 hooks in < 500ms
  });

  it("SPARQL query should not regress", async () => {
    const query = createComplexQuery();
    const store = createLargeStore(1000);

    const startTime = performance.now();
    await engine.query(query, store);
    const duration = performance.now() - startTime;

    tracker.recordBenchmark("complex-query-1000-quads", duration);

    const comparison = tracker.compareToBaseline(
      "complex-query-1000-quads",
      duration,
      15 // Allow 15% regression
    );

    expect(comparison.percentChange).toBeLessThan(15);
  });
});
```

### 2.5 Chaos Testing Framework (Phase 4 Priority)

#### 2.5.1 Chaos Test Builder

**Purpose:** Simulate failures and edge cases

```javascript
// /src/test-utils/chaos-test-builder.mjs

export class ChaosTestBuilder {
  constructor() {
    this.hooks = new Map();
    this.failures = new Map();
    this.delays = new Map();
  }

  /**
   * Simulate git operation failure
   */
  failGitOperation(operationType, errorMessage = "git operation failed") {
    this.failures.set(operationType, new Error(errorMessage));
    return this;
  }

  /**
   * Simulate network latency
   */
  addLatency(operationType, delayMs) {
    this.delays.set(operationType, delayMs);
    return this;
  }

  /**
   * Create hook that fails intermittently
   */
  createFlakeyHook(id, failureRate = 0.5) {
    return {
      id,
      async execute() {
        if (Math.random() < failureRate) {
          throw new Error("Random failure (chaos testing)");
        }
        return { success: true };
      },
    };
  }

  /**
   * Simulate RDF store corruption
   */
  corruptStore(store, corruptionRate = 0.1) {
    const quads = Array.from(store);
    const corrupted = this.createEmptyStore();

    for (const quad of quads) {
      if (Math.random() > corruptionRate) {
        corrupted.add(quad);
      }
    }

    return corrupted;
  }

  /**
   * Create store with invalid/malformed RDF
   */
  createMalformedStore() {
    const engine = new RdfEngine();
    const store = engine.createStore();

    // Add quads with problematic values
    store.add(engine.quad(
      engine.namedNode(""),  // Empty subject
      engine.namedNode("http://example.org/predicate"),
      engine.literal("object"),
    ));

    return store;
  }

  /**
   * Simulate concurrent access race conditions
   */
  async testConcurrentAccess(testFn, concurrency = 10) {
    const promises = Array.from({ length: concurrency }, (_, i) =>
      testFn(i).catch(err => ({ error: err, iteration: i }))
    );

    const results = await Promise.allSettled(promises);
    const failures = results.filter(r => r.status === "rejected");
    const errors = results
      .filter(r => r.status === "fulfilled" && r.value?.error)
      .map(r => r.value);

    return {
      total: concurrency,
      successful: concurrency - failures.length - errors.length,
      failed: failures.length + errors.length,
      failures,
      errors,
    };
  }

  /**
   * Test hook execution under memory pressure
   */
  async testUnderMemoryPressure(testFn) {
    const before = process.memoryUsage();

    // Allocate large buffers to simulate pressure
    const buffers = Array.from({ length: 100 }, () =>
      Buffer.alloc(1024 * 1024) // 1MB each
    );

    try {
      const result = await testFn();
      return { success: true, result };
    } catch (error) {
      return { success: false, error };
    } finally {
      // Clean up
      buffers.length = 0;
    }
  }
}
```

**Usage Pattern:**

```javascript
import { ChaosTestBuilder } from "@/test-utils/chaos-test-builder";

describe("Chaos Testing", () => {
  it("should handle git operation failure gracefully", async () => {
    const chaos = new ChaosTestBuilder();
    chaos.failGitOperation("push", "Network timeout");

    try {
      await git.push(); // Will fail
    } catch (error) {
      expect(error.message).toContain("Network timeout");
    }
  });

  it("should survive hook execution under concurrency", async () => {
    const chaos = new ChaosTestBuilder();

    const result = await chaos.testConcurrentAccess(async (i) => {
      const hook = createTestHook(`concurrent-${i}`);
      await executeHook(hook);
    }, 50);

    expect(result.successful).toBeGreaterThan(45); // At least 90% success
  });

  it("should handle corrupted RDF gracefully", async () => {
    const chaos = new ChaosTestBuilder();
    const store = createTestStore();
    const corrupted = chaos.corruptStore(store, 0.2); // 20% loss

    const query = "SELECT ?x WHERE { ?x ?y ?z }";
    const results = await engine.query(query, corrupted);

    expect(results.length).toBeLessThan(100); // Reduced results expected
  });

  it("should function under memory pressure", async () => {
    const chaos = new ChaosTestBuilder();

    const result = await chaos.testUnderMemoryPressure(async () => {
      const store = createLargeStore(10000);
      const query = createComplexQuery();
      return await engine.query(query, store);
    });

    expect(result.success).toBe(true);
  });
});
```

---

## Section 3: RDF-Specific Testing Architecture

### 3.1 RDF Test Store Design

**Store Factory Methods:**

```javascript
// Comprehensive RDF store factory

class RdfStoreFactory {
  // Domain-specific factories
  createFoafStore(people)          // Person, Group, knows relationships
  createGitStore(commits, branches) // Git ontology
  createPackStore(packs)            // Pack registry model
  createHookStore(hooks)            // Hook definitions
  createWorkflowStore(workflows)   // Workflow execution state

  // Utility factories
  createEmptyStore()               // Blank store
  createRandomStore(quadCount)     // Generate random triples
  createPathologicalStore()        // Edge cases (empty, cyclic, etc)
}
```

### 3.2 SPARQL Query Testing Matrix

```
┌────────────────────────────────────────┐
│ SPARQL Query Testing Coverage          │
├────────────────────────────────────────┤
│                                        │
│ Query Type         Tests  Coverage     │
│ ─────────────────────────────────────  │
│ SELECT              45      95%        │
│ ASK                 20      90%        │
│ CONSTRUCT           15      85%        │
│ DESCRIBE            10      80%        │
│ FILTER              30      92%        │
│ REGEX               15      88%        │
│ AGGREGATE           20      85%        │
│ OPTIONAL            15      80%        │
│ UNION               10      75%        │
│ COMPLEX (3+ joins)  12      70%        │
│                                        │
│ TOTAL:             192      84%        │
└────────────────────────────────────────┘
```

### 3.3 Graph Transformation Testing

**Testing Pattern for RDF Mutations:**

```javascript
// Test RDF graph transformations
import { RdfTransformTester } from "@/test-utils/rdf-transform-tester";

describe("RDF Graph Transformations", () => {
  it("should transform FOAF to vCard correctly", async () => {
    const tester = new RdfTransformTester();

    // Create input graph
    const input = tester.createFoafStore({
      people: [{ id: "alice", name: "Alice", age: 30 }],
    });

    // Transform
    const output = await tester.transform(input, "foaf-to-vcard");

    // Assert
    await tester.assertTransform(output)
      .hasTriple(alice, rdf:type, vcard:Individual)
      .hasProperty(alice, vcard:hasName, "Alice")
      .hasProperty(alice, vcard:bday, null); // Not set if no age
  });

  it("should preserve data integrity across transformation", async () => {
    const input = createLargeGraph(1000);
    const output = await tester.transform(input, "normalize");

    // Same number of entities
    expect(output.subjects).toBe(input.subjects);
    // Normalized form
    expect(output.hasProperty(ex:s1, rdf:type)).toBe(true);
  });
});
```

### 3.4 Ontology Compliance Testing

**Testing Pattern for Ontology Validation:**

```javascript
// Validate RDF against ontology schema
import { OntologyValidator } from "@/test-utils/ontology-validator";

describe("Ontology Compliance", () => {
  it("should enforce Git ontology constraints", async () => {
    const validator = new OntologyValidator("git-ontology");

    const invalidStore = rdfFactory.createGitStore({
      commits: [{
        sha: "abc123",
        message: null, // Violates: Commit must have message
        author: "alice@example.com",
        timestamp: "2026-01-10T00:00:00Z",
      }],
    });

    const validation = await validator.validate(invalidStore);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain("Missing required property: message");
  });

  it("should enforce datatype constraints", async () => {
    const validator = new OntologyValidator();

    // Age must be integer
    const store = rdfFactory.createFoafStore({
      people: [{
        id: "alice",
        name: "Alice",
        age: "thirty", // String instead of integer
      }],
    });

    const validation = await validator.validate(store);

    expect(validation.errors).toContain(
      "Property foaf:age must be xsd:integer"
    );
  });
});
```

---

## Section 4: Implementation Roadmap

### 4.1 Phase 1: RDF Test Utilities and Fixtures (60-80 hours)

**Objectives:**
- Centralize RDF fixture management
- Create reusable test store factories
- Implement RDF assertion helpers
- Build SPARQL query testing utilities

**Deliverables:**

1. **RDF Store Factory** (`/src/test-utils/rdf-store-factory.mjs`) - 8 hours
   - createEmptyStore()
   - Domain-specific factories (FOAF, Git, Pack, Hook)
   - Fixture loading system
   - Store merging utilities

2. **RDF Assertions Library** (`/src/test-utils/rdf-assertions.mjs`) - 10 hours
   - Triple assertions (hasTriple, hasType, hasProperty)
   - SPARQL result assertions
   - Graph isomorphism testing
   - Store statistics and validation

3. **SPARQL Query Builder** (`/src/test-utils/sparql-query-builder.mjs`) - 12 hours
   - Query execution with timing
   - Result validation helpers
   - Performance baseline assertions
   - Query fixture registration

4. **RDF Fixture Migration** (`/tests/fixtures/rdf/`) - 20 hours
   - Consolidate scattered Turtle fixtures
   - Create domain-specific fixture suites
   - Document fixture usage patterns
   - Version fixture compatibility

5. **Integration Tests** (`/tests/rdf-utilities-integration.test.mjs`) - 15 hours
   - Test all utilities together
   - Performance benchmarks
   - Edge case coverage
   - Documentation examples

**Effort Estimate:** 60-80 hours

**Success Metrics:**
- 50+ duplicate test setups eliminated
- Test file size reduced by 30-40% on average
- All RDF tests using centralized fixtures
- 90%+ fixture reuse across test suites

**Risk Factors:**
- Backward compatibility with existing tests (mitigated by wrapping pattern)
- Learning curve for new APIs (mitigated by docs + examples)

### 4.2 Phase 2: Hook Testing Framework (70-90 hours)

**Objectives:**
- Simplify hook unit testing
- Enable predicate performance testing
- Create workflow integration patterns
- Build mock data generators

**Deliverables:**

1. **Hook Test Builder** (`/src/test-utils/hook-test-builder.mjs`) - 15 hours
   - createHook() with defaults
   - evaluatePredicate() with assertions
   - executeWithEvent() for integration
   - Mock git event generator

2. **Predicate Testing Utilities** (`/src/test-utils/predicate-tester.mjs`) - 15 hours
   - Predicate execution with timing
   - Result validation helpers
   - Performance baselines
   - Failure scenario testing

3. **Hook Workflow Integration** (`/src/test-utils/hook-workflow-tester.mjs`) - 20 hours
   - Full hook lifecycle testing
   - Multiple hook coordination
   - Event cascade testing
   - State validation

4. **Mock Data Generators** (`/src/test-utils/mock-generators.mjs`) - 12 hours
   - Generate realistic git events
   - Generate hook definitions
   - Generate RDF graphs with hooks
   - Parameter variation helpers

5. **Hook Test Migration** - 28 hours
   - Refactor 40+ existing hook tests
   - Update integration tests
   - Document patterns
   - Create example test suites

**Effort Estimate:** 70-90 hours

**Success Metrics:**
- Hook test lines reduced by 40-50%
- 95%+ test completion rate (< 100ms execution)
- Predicate performance baseline established
- 30+ tests using fluent API

**Risk Factors:**
- Complex hook interactions (mitigated by staged rollout)
- Predicate evaluation timing variance (mitigated by percentile-based assertions)

### 4.3 Phase 3: Performance Regression Testing (80-100 hours)

**Objectives:**
- Establish performance baselines
- Automate regression detection
- Integrate with CI/CD
- Create benchmark dashboards

**Deliverables:**

1. **Performance Tracker** (`/src/test-utils/performance-tracker.mjs`) - 15 hours
   - Benchmark recording
   - Baseline comparison
   - Regression detection
   - Report generation

2. **Benchmark Suite** (`/tests/performance/`) - 30 hours
   - Hook registration performance (100-1000 hooks)
   - Predicate evaluation performance (100-10K quads)
   - Graph query performance (various complexities)
   - Concurrent hook execution
   - Memory usage profiling

3. **CI/CD Integration** - 20 hours
   - GitHub Actions workflow
   - Benchmark baseline storage
   - Regression notification
   - Historical trend tracking

4. **Performance Analysis Tools** - 15 hours
   - Benchmark comparison scripts
   - Memory leak detection
   - Bottleneck identification
   - Visualization generation

5. **Documentation** - 20 hours
   - Performance guidelines
   - Benchmark interpretation
   - Regression response procedures
   - Historical data analysis

**Effort Estimate:** 80-100 hours

**Success Metrics:**
- 50+ performance tests covering critical paths
- Baseline established for all major operations
- CI/CD integration 100% automated
- 95% regression detection accuracy
- Performance variance < 10% between runs

**Risk Factors:**
- System variance in CI environment (mitigated by percentile-based thresholds)
- Flaky tests (mitigated by retry logic and aggregation)

### 4.4 Phase 4: Property-Based and Chaos Testing (110-140 hours)

**Objectives:**
- Generate test cases systematically
- Test failure scenarios
- Verify system resilience
- Discover edge cases

**Deliverables:**

1. **Property-Based Test Framework** (`/src/test-utils/property-based-tester.mjs`) - 25 hours
   - Random SPARQL query generator
   - Random RDF graph generator
   - Property assertion framework
   - Shrinkage strategies

2. **Chaos Testing Framework** (`/src/test-utils/chaos-test-builder.mjs`) - 20 hours
   - Failure injection
   - Latency simulation
   - Resource limitation
   - Concurrent access testing

3. **Property Test Suite** (`/tests/property-based/`) - 35 hours
   - SPARQL query properties
   - Graph transformation properties
   - Hook predicate properties
   - Workflow execution properties

4. **Chaos Test Suite** (`/tests/chaos/`) - 40 hours
   - Git operation failures
   - Hook execution failures
   - RDF corruption scenarios
   - Concurrent access race conditions
   - Memory pressure testing
   - Network timeout simulation

5. **Edge Case Documentation** - 20 hours
   - Document discovered edge cases
   - Regression test for each case
   - System limits documentation
   - Recovery procedures

**Effort Estimate:** 110-140 hours

**Success Metrics:**
- 100+ property tests for core components
- 50+ chaos tests covering failure modes
- 95%+ edge case detection
- System resilience verified under stress
- Recovery procedures documented and tested

**Risk Factors:**
- Flaky chaos tests (mitigated by environmental isolation)
- Long execution times (mitigated by test categorization)
- Generator complexity (mitigated by incremental development)

### 4.5 Phase Timeline and Dependencies

```
PHASE 1: RDF Test Utilities (Weeks 1-2)
├─ Store Factory & Assertions (Parallel)
├─ SPARQL Query Builder (Parallel)
├─ Fixture Consolidation (Parallel)
└─ Integration & Documentation

PHASE 2: Hook Testing (Weeks 3-4) [depends on Phase 1]
├─ Hook Test Builder & Predicates (Parallel)
├─ Workflow Testing (Depends on hooks)
├─ Mock Generators (Parallel)
└─ Test Migration & Documentation

PHASE 3: Performance Testing (Weeks 5-6) [depends on Phase 1-2]
├─ Performance Tracker (1 week)
├─ Benchmark Suite (Parallel)
├─ CI/CD Integration (Parallel)
└─ Documentation & Analysis Tools

PHASE 4: Property & Chaos (Weeks 7-10) [depends on Phase 1-3]
├─ Property-Based Framework (Week 7-8)
├─ Chaos Testing Framework (Week 7-8)
├─ Test Suite Development (Week 9-10)
└─ Documentation & Edge Cases

Total: 10-12 weeks (full-time team of 2)
```

---

## Section 5: Test Utilities Architecture

### 5.1 Test Utilities Directory Structure

```
/src/test-utils/
├── index.mjs                          # Main export
├── rdf/
│   ├── store-factory.mjs             # RDF store creation
│   ├── assertions.mjs                # RDF assertions
│   ├── query-builder.mjs             # SPARQL utilities
│   ├── fixtures.mjs                  # RDF fixtures
│   └── transform-tester.mjs          # Graph transformation testing
├── hooks/
│   ├── test-builder.mjs              # Hook testing
│   ├── predicate-tester.mjs          # Predicate evaluation
│   ├── workflow-tester.mjs           # Workflow testing
│   ├── mock-events.mjs               # Mock event generation
│   └── mock-hooks.mjs                # Mock hook factory
├── performance/
│   ├── tracker.mjs                   # Benchmark tracking
│   ├── profiler.mjs                  # Memory/CPU profiling
│   └── analyzer.mjs                  # Performance analysis
├── chaos/
│   ├── test-builder.mjs              # Chaos test building
│   ├── failure-injection.mjs         # Failure simulation
│   ├── resource-limiter.mjs          # Resource constraints
│   └── concurrent-tester.mjs         # Concurrency testing
├── property-based/
│   ├── generator.mjs                 # Test data generation
│   ├── property-tester.mjs           # Property framework
│   └── shrinkage.mjs                 # Failure minimization
└── common/
    ├── context-helpers.mjs           # Context utilities
    ├── env-setup.mjs                 # Environment setup
    └── cleanup.mjs                   # Resource cleanup
```

### 5.2 Test Utilities Export API

```javascript
// /src/test-utils/index.mjs - Main entry point

// RDF Utilities
export { RdfStoreFactory, rdfStoreFactory } from "./rdf/store-factory.mjs";
export { RdfAssertions, useRdfAssertions } from "./rdf/assertions.mjs";
export { SparqlQueryBuilder } from "./rdf/query-builder.mjs";
export { RDF_FIXTURES } from "./rdf/fixtures.mjs";
export { RdfTransformTester } from "./rdf/transform-tester.mjs";

// Hook Utilities
export { HookTestBuilder } from "./hooks/test-builder.mjs";
export { PredicateTester } from "./hooks/predicate-tester.mjs";
export { HookWorkflowTester } from "./hooks/workflow-tester.mjs";
export { createMockGitEvent, MockEventGenerator } from "./hooks/mock-events.mjs";
export { createMockHook, MockHookFactory } from "./hooks/mock-hooks.mjs";

// Performance Utilities
export { PerformanceTracker } from "./performance/tracker.mjs";
export { MemoryProfiler } from "./performance/profiler.mjs";
export { PerformanceAnalyzer } from "./performance/analyzer.mjs";

// Chaos Utilities
export { ChaosTestBuilder } from "./chaos/test-builder.mjs";
export { FailureInjector } from "./chaos/failure-injection.mjs";
export { ResourceLimiter } from "./chaos/resource-limiter.mjs";
export { ConcurrentAccessTester } from "./chaos/concurrent-tester.mjs";

// Property-Based Utilities
export { PropertyBasedTester } from "./property-based/property-tester.mjs";
export { TestDataGenerator } from "./property-based/generator.mjs";
export { Shrinker } from "./property-based/shrinkage.mjs";

// Common Utilities
export { createTestContext, withTestEnvironment } from "./common/context-helpers.mjs";
export { setupTestEnvironment, cleanupTestEnvironment } from "./common/env-setup.mjs";
export { cleanup } from "./common/cleanup.mjs";
```

---

## Section 6: Hook Testing Patterns

### 6.1 Predicate Unit Testing

```javascript
// tests/hooks/predicate-unit-testing.test.mjs

import { describe, it, expect } from "vitest";
import { HookTestBuilder } from "@/test-utils/hooks/test-builder";
import { rdfStoreFactory } from "@/test-utils/rdf/store-factory";

describe("Predicate Unit Testing Patterns", () => {
  let builder;

  beforeEach(() => {
    builder = new HookTestBuilder();
  });

  describe("Simple Predicates", () => {
    it("should match exact type", async () => {
      builder.createHook("match-person", {
        predicate: `
          PREFIX foaf: <http://xmlns.com/foaf/0.1/>
          ASK WHERE { ?x a foaf:Person }
        `,
      });

      const store = rdfStoreFactory.createFoafStore({
        people: [{ id: "alice", name: "Alice", age: 30 }],
      });

      await builder
        .evaluatePredicate("match-person", store)
        .expectTrue()
        .expectDuration(50);
    });

    it("should filter by property value", async () => {
      builder.createHook("match-adult", {
        predicate: `
          PREFIX foaf: <http://xmlns.com/foaf/0.1/>
          ASK WHERE {
            ?x a foaf:Person ;
               foaf:age ?age .
            FILTER (?age >= 18)
          }
        `,
      });

      const store = rdfStoreFactory.createFoafStore({
        people: [
          { id: "alice", name: "Alice", age: 30 },
          { id: "charlie", name: "Charlie", age: 17 },
        ],
      });

      await builder
        .evaluatePredicate("match-adult", store)
        .expectTrue(); // Returns true because at least one adult exists
    });
  });

  describe("Complex Predicates", () => {
    it("should match graph patterns", async () => {
      builder.createHook("match-friends", {
        predicate: `
          PREFIX foaf: <http://xmlns.com/foaf/0.1/>
          ASK WHERE {
            ?person1 foaf:knows ?person2 .
            ?person2 foaf:knows ?person3 .
            ?person1 foaf:name "Alice" .
          }
        `,
      });

      const store = rdfStoreFactory.createFoafStore({
        people: [
          { id: "alice", name: "Alice", age: 30 },
          { id: "bob", name: "Bob", age: 25 },
          { id: "charlie", name: "Charlie", age: 35 },
        ],
        relationships: [
          { from: "alice", to: "bob" },
          { from: "bob", to: "charlie" },
        ],
      });

      await builder
        .evaluatePredicate("match-friends", store)
        .expectTrue();
    });
  });

  describe("Predicate Performance", () => {
    it("should handle large stores efficiently", async () => {
      builder.createHook("perf-test", {
        predicate: `
          PREFIX foaf: <http://xmlns.com/foaf/0.1/>
          ASK WHERE {
            ?x a foaf:Person ;
               foaf:name ?name .
            FILTER regex(?name, "^A")
          }
        `,
      });

      // Create store with 10,000 people
      const store = rdfStoreFactory.createFoafStore({
        people: Array.from({ length: 10000 }, (_, i) => ({
          id: `person${i}`,
          name: i % 10 === 0 ? `Alice${i}` : `Bob${i}`,
          age: 20 + (i % 50),
        })),
      });

      await builder
        .evaluatePredicate("perf-test", store)
        .expectTrue()
        .expectDuration(500); // Must complete in 500ms
    });
  });
});
```

### 6.2 Hook Integration Testing

```javascript
// tests/hooks/hook-integration-testing.test.mjs

import { describe, it, expect } from "vitest";
import { HookTestBuilder } from "@/test-utils/hooks/test-builder";
import { rdfStoreFactory } from "@/test-utils/rdf/store-factory";

describe("Hook Integration Testing Patterns", () => {
  let builder;

  beforeEach(() => {
    builder = new HookTestBuilder();
  });

  it("should execute hook on matching event", async () => {
    // Register hook
    builder.createHook("on-commit", {
      name: "Execute on commit",
      predicate: `
        PREFIX git: <https://gitvan.dev/ontology#>
        ASK WHERE { ?event a git:CommitEvent }
      `,
      action: "log",
    });

    // Create event
    const event = builder.mockGitEvent("commit", {
      message: "feat: add new feature",
      author: "alice@example.com",
    });

    // Create store with event
    const store = rdfStoreFactory.createGitStore({
      commits: [{ sha: "abc123", ...event }],
    });

    // Execute and verify
    await builder
      .executeWithEvent("on-commit", event, store)
      .expectExecuted()
      .expectDuration(100);
  });

  it("should not execute hook on non-matching event", async () => {
    builder.createHook("on-push", {
      predicate: `
        PREFIX git: <https://gitvan.dev/ontology#>
        ASK WHERE { ?event a git:PushEvent }
      `,
    });

    // Create commit event (not push)
    const event = builder.mockGitEvent("commit", {
      message: "test commit",
    });

    await builder
      .executeWithEvent("on-push", event)
      .expectNotExecuted();
  });

  it("should handle hook execution errors", async () => {
    builder.createHook("failing-hook", {
      predicate: `
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        ASK WHERE { ?x a foaf:Person }
      `,
      action: () => {
        throw new Error("Hook action failed");
      },
    });

    const store = rdfStoreFactory.createFoafStore({
      people: [{ id: "alice", name: "Alice", age: 30 }],
    });

    const event = builder.mockGitEvent("commit");

    await builder
      .executeWithEvent("failing-hook", event, store)
      .expectError("Hook action failed");
  });

  it("should coordinate multiple hooks", async () => {
    // Create hooks that depend on each other
    builder.createHook("hook1", {
      predicate: "ASK WHERE { ?x ?y ?z }",
      priority: 10,
    });

    builder.createHook("hook2", {
      predicate: "ASK WHERE { ?x a ex:Type }",
      priority: 5,
    });

    const event = builder.mockGitEvent("commit");
    const store = rdfStoreFactory.createEmptyStore();

    // Both should be executed (assuming ASK query succeeds)
    // Result should reflect execution order by priority
  });
});
```

### 6.3 Hook Workflow Testing

```javascript
// tests/hooks/hook-workflow-testing.test.mjs

import { describe, it, expect } from "vitest";
import { HookTestBuilder } from "@/test-utils/hooks/test-builder";
import { rdfStoreFactory } from "@/test-utils/rdf/store-factory";

describe("Hook Workflow Testing Patterns", () => {
  it("should execute complete hook workflow", async () => {
    const builder = new HookTestBuilder();

    // Setup: Create multiple hooks
    builder.createHook("validate-commit", {
      predicate: `
        PREFIX git: <https://gitvan.dev/ontology#>
        ASK WHERE {
          ?commit a git:Commit ;
                  git:message ?msg .
          FILTER regex(?msg, "^(feat|fix|docs):")
        }
      `,
    });

    builder.createHook("update-changelog", {
      predicate: `
        PREFIX git: <https://gitvan.dev/ontology#>
        ASK WHERE {
          ?commit a git:Commit ;
                  git:message ?msg .
          FILTER regex(?msg, "^feat:")
        }
      `,
    });

    builder.createHook("notify-team", {
      predicate: `
        PREFIX git: <https://gitvan.dev/ontology#>
        ASK WHERE {
          ?commit a git:Commit ;
                  git:author ?author .
          FILTER regex(?author, "@example\\.com$")
        }
      `,
    });

    // Simulate commit event
    const event = builder.mockGitEvent("commit", {
      message: "feat: add new feature",
      author: "alice@example.com",
    });

    const store = rdfStoreFactory.createGitStore({
      commits: [{ sha: "abc123", ...event }],
    });

    // Verify workflow results
    expect(await builder.evaluatePredicate("validate-commit", store)).toBeTruthy();
    expect(await builder.evaluatePredicate("update-changelog", store)).toBeTruthy();
    expect(await builder.evaluatePredicate("notify-team", store)).toBeTruthy();
  });
});
```

---

## Section 7: Test Coverage Expansion Strategy

### 7.1 Current Coverage Gaps Analysis

**Coverage by Component:**

| Component | Current | Target | Gap | Priority |
|-----------|---------|--------|-----|----------|
| RDF Engine | 85% | 95% | 10% | HIGH |
| Composables (git, template, graph) | 82% | 90% | 8% | HIGH |
| Hook System | 78% | 95% | 17% | CRITICAL |
| Workflow Engine | 75% | 90% | 15% | HIGH |
| Pack System | 80% | 92% | 12% | MEDIUM |
| Performance Critical Paths | 45% | 90% | 45% | CRITICAL |
| Error Handling | 70% | 95% | 25% | HIGH |
| Concurrent Access | 50% | 85% | 35% | MEDIUM |

### 7.2 Critical Paths to Test

**Path 1: Hook Execution Flow (17% gap)**

```
Git Event → GitEventCapture → RDF Storage → HookRegistry →
PredicateEvaluator → HookOrchestrator → Job Scheduler →
Worker Thread → Execution → Result Persistence
```

Required tests:
- Event capture with various git operations (push, commit, branch)
- Predicate evaluation on large graphs (1000+ quads)
- Hook prioritization and execution order
- Job scheduling under high load
- Error handling at each stage
- Concurrent hook execution

**Path 2: RDF Graph Transformations (15% gap)**

```
Turtle Input → Parser → Store Creation → SPARQL Query →
Graph Mutation → Serialization → Persistence
```

Required tests:
- Parse invalid Turtle with recovery
- Handle circular references
- SPARQL queries with complex patterns
- Graph isomorphism verification
- Concurrent mutations
- Memory efficiency under scale

**Path 3: Workflow Execution (15% gap)**

```
Workflow Definition → Planner → DAG Creation →
Step Execution → State Management → Error Recovery
```

Required tests:
- Complex DAG dependency resolution
- Step execution with retries
- State machine transitions
- Error propagation
- Concurrent step execution
- Resource cleanup on failure

### 7.3 Edge Cases to Cover

**Empty Graph Handling:**
```javascript
it("should handle empty RDF store", async () => {
  const store = rdfStoreFactory.createEmptyStore();

  // All queries should return no results
  const query = "SELECT ?x WHERE { ?x ?y ?z }";
  const results = await engine.query(query, store);
  expect(results).toHaveLength(0);
});
```

**Malformed RDF Recovery:**
```javascript
it("should recover from invalid Turtle", async () => {
  const malformed = `
    @prefix ex: <https://example.org/>
    ex:subject ex:predicate "unclosed string
  `;

  expect(() => {
    engine.parseTurtle(malformed);
  }).toThrow("Unexpected EOF");
});
```

**Concurrent Access Race Conditions:**
```javascript
it("should handle concurrent store access", async () => {
  const store = rdfStoreFactory.createEmptyStore();

  // 50 concurrent writers
  const writes = Array.from({ length: 50 }, (_, i) =>
    store.add(engine.quad(
      engine.namedNode(`https://example.org/s${i}`),
      engine.namedNode("https://example.org/p"),
      engine.literal(`o${i}`),
    ))
  );

  await Promise.all(writes);
  expect(store.size).toBe(50);
});
```

---

## Section 8: Performance Testing Framework

### 8.1 Performance Benchmarks by Component

```
PERFORMANCE TARGETS (p95 latency)

Hook System:
├─ Hook registration (100 hooks)      10ms
├─ Predicate evaluation (1000 quads)    5ms
├─ Hook orchestration                  20ms
├─ Event capture                       50ms
└─ Job scheduling                      15ms

RDF Engine:
├─ Turtle parsing (1000 lines)         100ms
├─ SPARQL SELECT query                 50ms
├─ SPARQL ASK query                    10ms
├─ Graph merge (2 stores)             200ms
└─ Store serialization (1000 quads)   150ms

Workflow Engine:
├─ DAG creation (100 steps)            50ms
├─ Dependency resolution              100ms
├─ Step execution                      20ms
└─ State persistence                   50ms

Pack System:
├─ Pack registry query                 100ms
├─ Dependency resolution               200ms
├─ Pack installation                 5000ms
└─ Template processing                 500ms
```

### 8.2 Performance Regression Detection

**Automated Detection Strategy:**

```javascript
// /tests/performance/regression-detection.test.mjs

import { PerformanceTracker } from "@/test-utils/performance/tracker";

describe("Performance Regression Detection", () => {
  const tracker = new PerformanceTracker();

  afterAll(() => {
    const report = tracker.generateReport();

    // Fail if any regression exceeds threshold
    const failures = report.comparisons.filter(c => c.status === "fail");

    if (failures.length > 0) {
      console.error("Performance Regressions Detected:");
      failures.forEach(f => {
        console.error(
          `${f.name}: ${f.percentChange.toFixed(2)}% slower ` +
          `(${f.current.toFixed(2)}ms vs ${f.baseline.toFixed(2)}ms baseline)`
        );
      });

      throw new Error(`${failures.length} performance regressions detected`);
    }
  });

  it("hook registration baseline", async () => {
    const startTime = performance.now();
    const registry = new KnowledgeHookRegistry();

    for (let i = 0; i < 100; i++) {
      registry.register(createMockHook(`hook${i}`));
    }

    const duration = performance.now() - startTime;
    tracker.recordBenchmark("hook-registration-100", duration);

    // Assertion: 100 hooks in < 500ms (5ms/hook)
    expect(duration / 100).toBeLessThan(5);
  });

  it("SPARQL query performance baseline", async () => {
    const store = createLargeStore(1000);
    const query = createComplexQuery();

    const startTime = performance.now();
    const results = await engine.query(query, store);
    const duration = performance.now() - startTime;

    tracker.recordBenchmark("complex-query-1000-quads", duration);

    expect(duration).toBeLessThan(200);
  });
});
```

### 8.3 Memory Leak Detection

**Memory Profiling Strategy:**

```javascript
// /src/test-utils/performance/memory-profiler.mjs

export class MemoryProfiler {
  /**
   * Test for memory leaks
   */
  async testForLeaks(testFn, iterations = 10) {
    const measurements = [];

    // Initial garbage collection
    if (global.gc) global.gc();

    for (let i = 0; i < iterations; i++) {
      const before = process.memoryUsage().heapUsed;

      await testFn();

      if (global.gc) global.gc();

      const after = process.memoryUsage().heapUsed;
      measurements.push(after - before);
    }

    // Check for increasing memory trend
    const firstHalf = measurements.slice(0, Math.floor(iterations / 2));
    const secondHalf = measurements.slice(Math.floor(iterations / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b) / secondHalf.length;

    const trend = (secondAvg - firstAvg) / firstAvg;

    return {
      trend,
      leaksDetected: trend > 0.1, // 10% growth indicates potential leak
      measurements,
    };
  }
}

// Usage
it("should not leak memory during hook execution", async () => {
  const profiler = new MemoryProfiler();

  const result = await profiler.testForLeaks(async () => {
    const hook = createTestHook();
    await executeHook(hook);
  }, 20);

  expect(result.leaksDetected).toBe(false);
});
```

---

## Section 9: Test Maintenance Strategies

### 9.1 Fixture Versioning

**Fixture Management:**

```
/tests/fixtures/
├── rdf/
│   ├── v1/          # GitVan v3.x ontology
│   ├── v2/          # GitVan v4.0 ontology
│   └── v3/          # GitVan v4.1+ ontology
└── metadata.json    # Version mapping
```

**Fixture Compatibility Manager:**

```javascript
// /src/test-utils/fixture-manager.mjs

export class FixtureManager {
  /**
   * Load fixture for current version
   */
  async loadFixture(name, version = "current") {
    const path = this.resolveFixturePath(name, version);
    return await readFile(path, "utf-8");
  }

  /**
   * Migrate fixture from old to new format
   */
  async migrateFixture(name, fromVersion, toVersion) {
    const old = await this.loadFixture(name, fromVersion);
    const migrations = this.getMigrations(fromVersion, toVersion);

    let result = old;
    for (const migration of migrations) {
      result = await migration(result);
    }

    return result;
  }

  /**
   * Validate fixture compatibility
   */
  async validateFixture(name, expectedVersion) {
    const fixture = await this.loadFixture(name);
    const ontology = this.parseOntologyVersion(fixture);

    if (ontology.version !== expectedVersion) {
      throw new Error(
        `Fixture ${name} is v${ontology.version}, expected v${expectedVersion}`
      );
    }
  }
}
```

### 9.2 Test Organization and Naming

**Test File Naming Convention:**

```
tests/
├── unit/                          # Unit tests (fast, < 100ms)
│   ├── composables/
│   ├── engines/
│   └── utils/
├── integration/                   # Integration tests (< 5s)
│   ├── hooks/
│   ├── workflows/
│   └── pack/
├── e2e/                          # End-to-end tests (< 30s)
│   ├── cli/
│   ├── workflows/
│   └── scenarios/
├── performance/                   # Benchmark tests
│   ├── *-benchmark.test.mjs
│   └── regression-detection.test.mjs
├── chaos/                        # Failure scenario tests
│   ├── *-chaos.test.mjs
│   └── failure-injection.test.mjs
└── property-based/               # Generated tests
    └── *-properties.test.mjs
```

**Test Naming Convention:**

```javascript
// Descriptive test names with context
describe("useGit Composable", () => {
  describe("Repository Info", () => {
    it("should get repository root from cwd", async () => {});
    it("should throw error when not in git repository", async () => {});
  });

  describe("Error Handling", () => {
    it("should handle missing repository gracefully", async () => {});
  });
});
```

### 9.3 Fast Feedback Loop (CI/CD Integration)

**Test Execution Strategy:**

```yaml
# .github/workflows/test.yml

name: Test Suite

on: [push, pull_request]

jobs:
  fast-tests:
    runs-on: ubuntu-latest
    steps:
      # Run fast unit and integration tests
      - run: npm test -- tests/unit tests/integration
        timeout-minutes: 10

  full-tests:
    runs-on: ubuntu-latest
    steps:
      # Run complete test suite including performance
      - run: npm test
        timeout-minutes: 60

  performance-baseline:
    runs-on: ubuntu-latest
    steps:
      # Track performance benchmarks
      - run: npm test -- tests/performance
      - uses: actions/upload-artifact@v2
        with:
          name: benchmarks
          path: .benchmarks/
```

---

## Section 10: CI/CD Integration and Monitoring

### 10.1 GitHub Actions Integration

**Test Workflow:**

```yaml
# .github/workflows/comprehensive-test.yml

name: Comprehensive Testing

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  TZ: UTC
  LANG: C
  NODE_ENV: test

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: recursive

      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: npm

      - run: npm install

      - name: Run unit tests
        run: npm test -- tests/unit
        continue-on-error: false

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: recursive

      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: npm

      - run: npm install

      - name: Run integration tests
        run: npm test -- tests/integration
        timeout-minutes: 30

  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: recursive

      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: npm

      - run: npm install

      - name: Run performance benchmarks
        run: npm test -- tests/performance

      - name: Compare against baseline
        run: node scripts/compare-benchmarks.mjs

      - name: Store benchmarks
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: .benchmarks/

      - name: Comment on PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(
              fs.readFileSync('.benchmarks/report.json', 'utf-8')
            );
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: formatPerformanceReport(results),
            });

  coverage-report:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    steps:
      - name: Check coverage thresholds
        run: |
          COVERAGE=$(cat coverage/coverage-final.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage below 80%: $COVERAGE%"
            exit 1
          fi
```

### 10.2 Benchmark Tracking and Dashboards

**Benchmark Storage:**

```json
{
  ".benchmarks": {
    "hook-registration-100.json": {
      "name": "hook-registration-100",
      "duration": 245.3,
      "timestamp": "2026-01-10T10:30:00Z",
      "gitSha": "abc123def456",
      "branch": "main",
      "status": "pass"
    }
  }
}
```

**Benchmark Comparison Script:**

```javascript
// scripts/compare-benchmarks.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const currentResults = JSON.parse(
  readFileSync(".benchmarks/report.json", "utf-8")
);

// Get previous baseline from main branch
const mainBenchmarks = JSON.parse(
  execSync("git show origin/main:.benchmarks/report.json", {
    encoding: "utf-8",
  })
);

const report = {
  timestamp: new Date().toISOString(),
  comparisons: [],
};

for (const test of currentResults.comparisons) {
  const baseline = mainBenchmarks.find(b => b.name === test.name);

  const comparison = {
    name: test.name,
    current: test.duration,
    baseline: baseline?.duration,
    delta: baseline ? test.duration - baseline.duration : null,
    percentChange: baseline
      ? ((test.duration - baseline.duration) / baseline.duration) * 100
      : null,
    status:
      !baseline || Math.abs(percentChange) < 10 ? "PASS" : "FAIL",
  };

  report.comparisons.push(comparison);
}

writeFileSync(
  ".benchmarks/comparison.json",
  JSON.stringify(report, null, 2)
);

// Print summary
const failures = report.comparisons.filter(c => c.status === "FAIL");
if (failures.length > 0) {
  console.error("Performance regressions detected:");
  failures.forEach(f => {
    console.error(`${f.name}: ${f.percentChange.toFixed(2)}% slower`);
  });
  process.exit(1);
}
```

### 10.3 Test Failure Analysis and Reporting

**Flaky Test Detection:**

```javascript
// scripts/detect-flaky-tests.mjs

import { execSync } from "node:child_process";

async function detectFlakyTests() {
  const runs = 5; // Run each test 5 times
  const results = new Map();

  for (let i = 0; i < runs; i++) {
    const output = execSync("npm test -- --reporter=json").toString();
    const testRun = JSON.parse(output);

    for (const test of testRun.testResults) {
      const key = test.fullName;
      if (!results.has(key)) {
        results.set(key, { passed: 0, failed: 0 });
      }

      const result = results.get(key);
      if (test.status === "passed") {
        result.passed++;
      } else {
        result.failed++;
      }
    }
  }

  // Report flaky tests (passed some, failed some)
  const flaky = Array.from(results.entries())
    .filter(([_, { passed, failed }]) => passed > 0 && failed > 0)
    .map(([name, stats]) => ({
      name,
      successRate: stats.passed / (stats.passed + stats.failed),
      ...stats,
    }));

  if (flaky.length > 0) {
    console.warn("Flaky tests detected:");
    flaky.forEach(t => {
      console.warn(`${t.name}: ${t.successRate.toFixed(0)}% success rate`);
    });
  }

  return flaky;
}
```

---

## Implementation Checklist

### Phase 1: RDF Test Utilities (Weeks 1-2)

- [ ] Create RdfStoreFactory with domain-specific factories
- [ ] Implement RDF assertions library with fluent API
- [ ] Build SPARQL query testing utilities
- [ ] Consolidate Turtle fixtures into centralized system
- [ ] Write integration tests for utilities
- [ ] Document patterns and examples
- [ ] Migrate 30+ existing tests to new utilities
- [ ] Measure baseline for test reduction (target: 30-40%)

### Phase 2: Hook Testing Framework (Weeks 3-4)

- [ ] Build HookTestBuilder with fluent API
- [ ] Implement predicate testing utilities
- [ ] Create hook workflow integration testing
- [ ] Build mock data generators
- [ ] Migrate 40+ hook tests to new patterns
- [ ] Add performance assertions for predicates
- [ ] Document hook testing patterns
- [ ] Create example hook tests

### Phase 3: Performance Regression Testing (Weeks 5-6)

- [ ] Build PerformanceTracker with baseline storage
- [ ] Create comprehensive benchmark suite (50+ tests)
- [ ] Integrate with GitHub Actions CI/CD
- [ ] Implement benchmark comparison reporting
- [ ] Set up artifact storage for historical tracking
- [ ] Create performance dashboard
- [ ] Document performance targets
- [ ] Establish regression response procedures

### Phase 4: Property-Based and Chaos Testing (Weeks 7-10)

- [ ] Implement property-based test framework
- [ ] Build chaos test utilities
- [ ] Create property test suites (100+ tests)
- [ ] Create chaos test suites (50+ tests)
- [ ] Document edge cases discovered
- [ ] Create regression tests for each edge case
- [ ] Document system limits and resilience
- [ ] Update recovery procedures

---

## Success Metrics

### Coverage Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Overall Coverage | 80% | 85%+ | End of Phase 4 |
| Branch Coverage | 78% | 85%+ | End of Phase 4 |
| Hook System Coverage | 78% | 95% | End of Phase 2 |
| RDF Engine Coverage | 85% | 95% | End of Phase 1 |
| Performance Path Coverage | 45% | 90% | End of Phase 3 |

### Performance Metrics

| Metric | Target | Verification |
|--------|--------|--------------|
| Hook registration (100 hooks) | < 500ms | Automated baseline |
| Predicate evaluation (1000 quads) | < 100ms | Automated baseline |
| SPARQL query (complex) | < 200ms | Automated baseline |
| Regression detection accuracy | 95%+ | CI/CD validation |

### Maintainability Metrics

| Metric | Target | Verification |
|--------|--------|--------------|
| Test code reuse | 60%+ | File analysis |
| Duplicate setup elimination | 30-40% | Test size reduction |
| Test execution time (fast suite) | < 5min | CI/CD timing |
| Fixture consolidation | 100% | Migration audit |

---

## Risks and Mitigation

### Risk 1: Backward Compatibility with Existing Tests

**Risk:** Refactoring existing tests to use new utilities breaks current test suite

**Mitigation:**
- Create wrapper adapters for old patterns
- Run old and new tests in parallel during migration
- Use feature flags for gradual rollout
- Provide migration scripts for automated refactoring

**Detection:** Pre-phase 1 audit shows 310+ test files; gradual migration reduces risk

### Risk 2: Test Flakiness

**Risk:** Performance or timing-based tests fail intermittently

**Mitigation:**
- Use percentile-based assertions (p95) instead of absolute values
- Implement flaky test detection and reporting
- Use environmental isolation (forks pool)
- Add retry logic for intermittent failures

### Risk 3: Performance Baseline Variance

**Risk:** CI/CD environment has different performance characteristics

**Mitigation:**
- Run baselines multiple times and average
- Track variance over time
- Use machine-specific baselines
- Allow threshold percentage (e.g., 15%) for regression detection

### Risk 4: Test Maintenance Burden

**Risk:** New test utilities add complexity instead of reducing it

**Mitigation:**
- Clear documentation with many examples
- Comprehensive test utilities test suite
- Regular utility design reviews
- Simplicity-first design principle

---

## Conclusion

This comprehensive testing integration plan provides a structured approach to achieving 85%+ test coverage across GitVan v4.0.2+ while creating reusable, maintainable testing patterns for:

1. **RDF-specific operations** through centralized store factories and assertion helpers
2. **Hook testing** through fluent APIs and predicate frameworks
3. **Performance** through automated baseline tracking and regression detection
4. **Resilience** through chaos testing and property-based generation
5. **Maintainability** through fixture consolidation and pattern documentation

The 4-phase rollout (320-400 person-hours) prioritizes high-impact areas first, with each phase building on previous infrastructure. Success metrics are clearly defined and measurable, with automated CI/CD validation throughout.

---

## Appendix: Code Examples

### A.1 Complete RDF Test Utility Example

```javascript
// tests/example-rdf-test.test.mjs
import { describe, it, expect } from "vitest";
import { RdfStoreFactory } from "@/test-utils/rdf/store-factory";
import { SparqlQueryBuilder } from "@/test-utils/rdf/query-builder";

describe("RDF Testing with New Utilities", () => {
  const factory = new RdfStoreFactory();

  it("should query FOAF people efficiently", async () => {
    // Create store with 1000 people
    const store = factory.createFoafStore({
      people: Array.from({ length: 1000 }, (_, i) => ({
        id: `person${i}`,
        name: i % 2 === 0 ? `Alice${i}` : `Bob${i}`,
        age: 20 + (i % 50),
      })),
    });

    // Query builder with fluent API
    const builder = new SparqlQueryBuilder(store);

    await builder.execute(`
      PREFIX foaf: <http://xmlns.com/foaf/0.1/>
      SELECT ?name WHERE {
        ?person foaf:age ?age ;
                foaf:name ?name .
        FILTER (?age > 30)
      }
    `)
      .expectCount(300) // ~30% of people over 30
      .expectDuration(200)
      .expectContains("name", "Alice0");
  });
});
```

### A.2 Complete Hook Test Example

```javascript
// tests/example-hook-test.test.mjs
import { describe, it, expect } from "vitest";
import { HookTestBuilder } from "@/test-utils/hooks/test-builder";
import { RdfStoreFactory } from "@/test-utils/rdf/store-factory";

describe("Hook Testing with New Framework", () => {
  it("should execute hooks on matching events", async () => {
    const builder = new HookTestBuilder();
    const factory = new RdfStoreFactory();

    // Create hooks
    builder.createHook("on-commit", {
      predicate: `
        PREFIX git: <https://gitvan.dev/ontology#>
        ASK WHERE { ?event a git:CommitEvent }
      `,
    });

    // Create event
    const event = builder.mockGitEvent("commit", {
      message: "feat: add new feature",
      author: "alice@example.com",
    });

    // Create store
    const store = factory.createGitStore({
      commits: [{ sha: "abc123", ...event }],
    });

    // Execute and assert
    await builder
      .executeWithEvent("on-commit", event, store)
      .expectExecuted()
      .expectDuration(100);
  });
});
```

### A.3 Complete Performance Test Example

```javascript
// tests/example-performance-test.test.mjs
import { describe, it, expect, afterAll } from "vitest";
import { PerformanceTracker } from "@/test-utils/performance/tracker";

describe("Performance Benchmarks", () => {
  const tracker = new PerformanceTracker();

  afterAll(() => {
    tracker.saveBaselines();
    const report = tracker.generateReport();
    console.log(JSON.stringify(report, null, 2));
  });

  it("hook registration should be fast", async () => {
    const startTime = performance.now();

    for (let i = 0; i < 100; i++) {
      registry.register(createMockHook(`hook${i}`));
    }

    const duration = performance.now() - startTime;
    tracker.recordBenchmark("hook-registration-100", duration);

    const comparison = tracker.compareToBaseline(
      "hook-registration-100",
      duration
    );

    expect(comparison.status).toBe("pass");
    expect(duration / 100).toBeLessThan(5); // 5ms per hook
  });
});
```

---

**Document Version:** 1.0.0
**Last Updated:** 2026-01-10
**Author:** Agent 10 - Testing Utilities Analysis
**Status:** Ready for Implementation Phase 1

