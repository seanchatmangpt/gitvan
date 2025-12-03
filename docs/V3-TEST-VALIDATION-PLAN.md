# GitVan v3 Test Validation Plan

**Date**: 2025-12-02
**Version**: v2.1.1 → v3.0.0
**Author**: System Architecture Designer

## Executive Summary

This document provides a comprehensive test validation plan for GitVan v3.0.0, focusing on validating production-ready components, identifying test gaps, and creating a systematic testing strategy that ensures 90%+ coverage across all subsystems.

**Current State**: 215 test files, fragmented coverage, missing integration tests
**Target State**: Consolidated test suite, 90%+ coverage, E2E scenarios validated

---

## 1. Current Test Inventory

### 1.1 Test File Analysis (215 files)

```bash
tests/
├── engines/
│   └── unrdf-integration.test.mjs                    ✅ 17 tests (RdfEngine)
│
├── composables/
│   ├── graph-persistence.test.mjs                    ✅ Graph operations
│   ├── graph-persistence-cli-e2e.test.mjs            ✅ CLI integration
│   └── (missing: turtle.test.mjs)                    ❌ CREATE
│
├── git-native/
│   ├── atomic-operations.test.mjs                    ✅ Atomic Git ops
│   ├── concurrency-stress.test.mjs                   ✅ Concurrent operations
│   └── lock-manager.test.mjs                         ✅ Locking
│
├── hooks/
│   ├── knowledge-hooks-end-to-end.test.mjs           ⚠️  End-to-end (needs update)
│   ├── knowledge-hooks-complete-suite.test.mjs       ⚠️  Complete suite (needs update)
│   ├── knowledge-hooks-stress.test.mjs               ✅ Stress test
│   └── (missing: hook-orchestrator-unit.test.mjs)    ❌ CREATE
│
├── workflow/
│   ├── workflow-executor-unit.test.mjs               ⚠️  Executor (exists, needs validation)
│   ├── workflow-component-testing.test.mjs           ✅ Component tests
│   ├── workflow-advanced-features.test.mjs           ✅ Advanced features
│   └── (missing: workflow-cli-integration.test.mjs)  ❌ CREATE
│
├── pack/
│   ├── (multiple fragmented tests)                   ❌ CONSOLIDATE
│   └── (missing: pack-registry-consolidated.test.mjs) ❌ CREATE
│
├── e2e/
│   ├── job-hunter-workflow-e2e.test.mjs              ✅ JTBD workflow
│   ├── scrum-at-scale-sprint-e2e.test.mjs            ✅ Scrum workflow
│   ├── hook-workflow-cli-turtle-integration.test.mjs ⚠️  Integration (needs update)
│   └── (missing: cli-full-lifecycle.test.mjs)        ❌ CREATE
│
├── integration/
│   ├── unrdf-integration.test.mjs                    ✅ unrdf integration
│   └── (missing: cli-subsystem-integration.test.mjs) ❌ CREATE
│
├── validation/
│   ├── readme-capabilities-validation.test.mjs       ✅ README claims
│   └── (missing: api-contract-validation.test.mjs)   ❌ CREATE
│
└── (183 other test files - various states)
```

**Key Findings**:
- ✅ **Strong unit test coverage** for core components (RdfEngine, Git-native I/O)
- ⚠️  **Partial integration coverage** (some E2E tests exist, CLI integration missing)
- ❌ **No systematic validation** (tests scattered, unclear which are authoritative)
- ❌ **Pack system tests fragmented** (multiple implementations, no clear test strategy)

### 1.2 Test Coverage by Subsystem

| Subsystem | Unit Tests | Integration Tests | E2E Tests | Coverage Estimate |
|-----------|-----------|-------------------|-----------|-------------------|
| **RdfEngine** | ✅ 17 tests | ✅ unrdf integration | ✅ Graph operations | **95%** |
| **useGraph** | ✅ Core operations | ✅ SPARQL queries | ✅ 360 validation | **90%** |
| **useTurtle** | ⚠️  Partial | ⚠️  Hook extraction | ✅ Workflow loading | **70%** |
| **Git composables** | ✅ 40+ operations | ✅ Mock strategies | ✅ E2E workflows | **85%** |
| **Git-Native I/O** | ✅ All components | ✅ Concurrency | ✅ Stress tests | **90%** |
| **HookOrchestrator** | ⚠️  Partial | ❌ Missing CLI | ❌ No E2E | **50%** |
| **WorkflowExecutor** | ⚠️  Partial | ❌ Missing CLI | ⚠️  Partial E2E | **60%** |
| **Pack System** | ❌ Fragmented | ❌ Multiple impls | ❌ No clear tests | **30%** |
| **CLI Commands** | ⚠️  Partial | ❌ Missing wiring | ❌ No E2E | **40%** |
| **Step Handlers** | ✅ Individual tests | ⚠️  Partial integration | ❌ No E2E | **70%** |
| **Telemetry** | ⚠️  Basic setup | ❌ No OTEL validation | ❌ No tracing | **20%** |

**Overall Estimated Coverage**: **65%** (target: **90%**)

---

## 2. Test Validation Strategy

### 2.1 Testing Pyramid

```
        /\
       /E2E\         (10% - Full workflows, production scenarios)
      /------\
     /INTEG  \       (30% - Subsystem integration, CLI wiring)
    /----------\
   /   UNIT     \    (60% - Component behavior, edge cases)
  /--------------\
```

**GitVan Test Distribution**:
- **Unit Tests (60%)**: 130 test files
  - Component behavior (RdfEngine, composables, step handlers)
  - Edge cases (error handling, invalid input)
  - Mocking external dependencies (Git, filesystem, HTTP)

- **Integration Tests (30%)**: 65 test files
  - CLI → Subsystem wiring (hooks.mjs → HookOrchestrator)
  - Subsystem interactions (HookOrchestrator → WorkflowExecutor)
  - RDF graph operations (SPARQL queries, SHACL validation)

- **E2E Tests (10%)**: 20 test files
  - Full workflow scenarios (JTBD workflows)
  - Production scenarios (cleanroom, deployment)
  - Performance benchmarks (stress tests, concurrent operations)

### 2.2 Test Categories

#### Category 1: Core Component Validation

**Purpose**: Validate production-ready components work as expected in isolation.

**Test Files**:
```javascript
// RdfEngine (KEEP - production-ready)
tests/engines/rdf-engine-production.test.mjs
tests/integration/unrdf-integration.test.mjs

// useGraph composable (KEEP - production-ready)
tests/validation/graph-360.test.mjs
tests/composables/graph-persistence.test.mjs

// useTurtle composable (CREATE - missing comprehensive tests)
tests/composables/turtle-parsing.test.mjs           // ❌ CREATE
tests/composables/turtle-hook-extraction.test.mjs   // ❌ CREATE

// Git composables (KEEP - production-ready)
tests/composables/useGit-comprehensive.test.mjs
tests/composables/useGit.e2e.test.mjs

// Git-Native I/O (KEEP - production-ready)
tests/git-native/atomic-operations.test.mjs
tests/git-native/concurrency-stress.test.mjs
tests/git-native/lock-manager.test.mjs

// Template composable (KEEP - production-ready)
tests/composables/template-comprehensive.test.mjs
tests/composables/template-simple.test.mjs
```

**Success Criteria**:
- [ ] All core component tests passing
- [ ] 90%+ code coverage on core components
- [ ] Edge cases documented and tested
- [ ] Performance benchmarks established

#### Category 2: Subsystem Integration Validation

**Purpose**: Validate subsystems integrate correctly with each other.

**Test Files**:
```javascript
// HookOrchestrator → WorkflowExecutor integration
tests/integration/hook-triggers-workflow.test.mjs   // ❌ CREATE
tests/integration/predicate-evaluation.test.mjs     // ❌ CREATE

// CLI → HookOrchestrator integration
tests/integration/cli-hooks-integration.test.mjs    // ❌ CREATE
tests/e2e/cli-hooks-evaluate.test.mjs               // ❌ CREATE

// CLI → WorkflowExecutor integration
tests/integration/cli-workflow-integration.test.mjs // ❌ CREATE
tests/e2e/cli-workflow-run.test.mjs                 // ❌ CREATE

// CLI → PackRegistry integration
tests/integration/cli-pack-integration.test.mjs     // ❌ CREATE
tests/e2e/cli-pack-install.test.mjs                 // ❌ CREATE

// WorkflowExecutor → StepHandlers integration
tests/integration/workflow-step-handlers.test.mjs   // ❌ CREATE
tests/workflow/step-handlers-all.test.mjs           // ⚠️  CONSOLIDATE existing tests
```

**Success Criteria**:
- [ ] All subsystem integration tests passing
- [ ] CLI commands wire to correct subsystems
- [ ] Context dependency injection validated
- [ ] Error handling across subsystems validated

#### Category 3: End-to-End Scenario Validation

**Purpose**: Validate complete workflows from CLI to execution.

**Test Files**:
```javascript
// JTBD Business Intelligence workflow
tests/e2e/jtbd-business-intelligence-full.test.mjs  // ⚠️  UPDATE existing test

// JTBD CI/CD Automation workflow
tests/e2e/jtbd-cicd-automation-full.test.mjs        // ⚠️  UPDATE existing test

// JTBD Developer Workflow automation
tests/e2e/jtbd-developer-workflow-full.test.mjs     // ❌ CREATE

// Full CLI lifecycle
tests/e2e/cli-full-lifecycle.test.mjs               // ❌ CREATE
// Test: init → setup → hooks evaluate → workflow run → pack install

// Production deployment scenario
tests/e2e/production-deployment.test.mjs            // ❌ CREATE
// Test: cleanroom → Docker → full workflow → validation

// Performance & stress scenarios
tests/e2e/performance-full-stack.test.mjs           // ❌ CREATE
// Test: 1000 hooks, 100 workflows, concurrent execution
```

**Success Criteria**:
- [ ] All E2E scenarios passing
- [ ] Production deployment validated in cleanroom
- [ ] Performance benchmarks met (hook evaluation < 1s, workflow < 5s)
- [ ] No memory leaks or resource exhaustion

---

## 3. Phase-by-Phase Test Plan

### Phase 1: Core Component Validation (Weeks 1-2)

**Goal**: Ensure all production-ready components have 90%+ coverage.

#### Week 1: RDF Stack Validation

**Day 1-2: RdfEngine Tests**
```bash
# Run existing tests
pnpm test tests/integration/unrdf-integration.test.mjs

# Validate coverage
pnpm test:coverage src/engines/RdfEngine.mjs

# Expected results:
# ✅ 17 tests passing
# ✅ 95%+ coverage
# ✅ All unrdf features tested (SPARQL, SHACL, reasoning, canonicalization)
```

**Day 3-4: useGraph Tests**
```bash
# Run existing tests
pnpm test tests/validation/graph-360.test.mjs
pnpm test tests/composables/graph-persistence.test.mjs

# Create missing tests
touch tests/composables/graph-operations-edge-cases.test.mjs

# Expected results:
# ✅ All graph operations tested
# ✅ 90%+ coverage on useGraph composable
```

**Day 5: useTurtle Tests (CREATE)**
```bash
# Create missing tests
cat > tests/composables/turtle-parsing.test.mjs << 'EOF'
import { describe, it, expect } from 'vitest';
import { useTurtle } from '../../src/composables/turtle.mjs';

describe('useTurtle', () => {
  it('should parse valid Turtle files', async () => {
    const turtle = await useTurtle('./tests/fixtures/hooks');
    expect(turtle.store).toBeDefined();
    expect(turtle.store.size).toBeGreaterThan(0);
  });

  it('should extract knowledge hooks', async () => {
    const turtle = await useTurtle('./tests/fixtures/hooks');
    const hooks = await turtle.extractKnowledgeHooks();
    expect(hooks).toBeInstanceOf(Array);
  });

  it('should handle invalid Turtle syntax', async () => {
    await expect(useTurtle('./tests/fixtures/invalid')).rejects.toThrow();
  });
});
EOF

# Run tests
pnpm test tests/composables/turtle-parsing.test.mjs
```

#### Week 2: Git & Template Stack Validation

**Day 1-2: Git Composables**
```bash
# Run existing tests
pnpm test tests/composables/useGit-comprehensive.test.mjs
pnpm test tests/composables/useGit.e2e.test.mjs

# Expected results:
# ✅ 40+ Git operations tested
# ✅ Mock strategies validated
# ✅ E2E workflows passing
```

**Day 3-4: Git-Native I/O**
```bash
# Run existing stress tests
pnpm test tests/git-native/concurrency-stress.test.mjs
pnpm test tests/git-native/atomic-operations.test.mjs

# Expected results:
# ✅ Concurrent operations safe
# ✅ Atomic operations validated
# ✅ Lock manager prevents race conditions
```

**Day 5: Template Composable**
```bash
# Run existing tests
pnpm test tests/composables/template-comprehensive.test.mjs

# Expected results:
# ✅ Nunjucks rendering tested
# ✅ Filters validated
# ✅ Error handling validated
```

**Week 1-2 Success Criteria**:
- [ ] All core component tests passing
- [ ] 90%+ coverage on RdfEngine, useGraph, useTurtle, useGit, GitNativeIO, useTemplate
- [ ] Missing useTurtle tests created
- [ ] Edge cases documented

### Phase 2: Subsystem Integration Testing (Weeks 3-4)

**Goal**: Validate subsystems integrate correctly, CLI commands wire to subsystems.

#### Week 3: Hook & Workflow Integration

**Day 1-2: HookOrchestrator Unit Tests (CREATE)**
```bash
# Create missing unit tests
cat > tests/hooks/hook-orchestrator-unit.test.mjs << 'EOF'
import { describe, it, expect, beforeEach } from 'vitest';
import { HookOrchestrator } from '../../src/hooks/HookOrchestrator.mjs';

describe('HookOrchestrator', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new HookOrchestrator({ graphDir: './tests/fixtures/hooks' });
  });

  it('should initialize RDF components', async () => {
    await orchestrator._initializeRDFComponents();
    expect(orchestrator.turtle).toBeDefined();
    expect(orchestrator.graph).toBeDefined();
  });

  it('should parse all hooks', async () => {
    await orchestrator._initializeRDFComponents();
    const hooks = await orchestrator._parseAllHooks();
    expect(hooks).toBeInstanceOf(Array);
  });

  it('should evaluate predicates', async () => {
    await orchestrator._initializeRDFComponents();
    const hooks = await orchestrator._parseAllHooks();
    const results = await orchestrator._evaluateHooks(hooks);
    expect(results).toBeInstanceOf(Array);
  });

  it('should trigger workflows on predicate match', async () => {
    const results = await orchestrator.evaluate({ dryRun: true });
    expect(results.triggered).toBeInstanceOf(Array);
  });
});
EOF

# Run tests
pnpm test tests/hooks/hook-orchestrator-unit.test.mjs
```

**Day 3-4: CLI → HookOrchestrator Integration (CREATE)**
```bash
# Create CLI integration test
cat > tests/integration/cli-hooks-integration.test.mjs << 'EOF'
import { describe, it, expect } from 'vitest';
import { bootGitVan } from '../../src/runtime/boot.mjs';
import { useGitVan } from '../../src/core/context.mjs';

describe('CLI → HookOrchestrator Integration', () => {
  it('should wire CLI hooks evaluate command to HookOrchestrator', async () => {
    // Boot GitVan context
    const ctx = await bootGitVan();

    // Verify HookOrchestrator initialized
    expect(ctx.hookOrchestrator).toBeDefined();
    expect(ctx.hookOrchestrator.evaluate).toBeDefined();

    // Execute evaluate
    const results = await ctx.hookOrchestrator.evaluate({ dryRun: true });
    expect(results.triggered).toBeInstanceOf(Array);
  });

  it('should use context dependency injection', () => {
    const ctx = useGitVan();
    expect(ctx.hookOrchestrator).toBeDefined();
  });
});
EOF

# Run tests
pnpm test tests/integration/cli-hooks-integration.test.mjs
```

**Day 5: WorkflowExecutor Integration (CREATE)**
```bash
# Create workflow integration test
cat > tests/integration/cli-workflow-integration.test.mjs << 'EOF'
import { describe, it, expect } from 'vitest';
import { bootGitVan } from '../../src/runtime/boot.mjs';

describe('CLI → WorkflowExecutor Integration', () => {
  it('should wire CLI workflow run command to WorkflowExecutor', async () => {
    const ctx = await bootGitVan();
    expect(ctx.workflowExecutor).toBeDefined();

    // Execute workflow (dry run)
    const result = await ctx.workflowExecutor.execute('test-workflow', {});
    expect(result.success).toBe(true);
  });
});
EOF

# Run tests
pnpm test tests/integration/cli-workflow-integration.test.mjs
```

#### Week 4: Pack System Integration

**Day 1-3: Consolidate Pack Registry (Per ADR-001)**
```bash
# 1. Create new consolidated PackRegistry
cat > src/orchestration/PackRegistry.mjs << 'EOF'
// Single pack registry implementation using RDF graph
import { useGraph } from '../composables/graph.mjs';
import { useTurtle } from '../composables/turtle.mjs';

export class PackRegistry {
  constructor({ graphDir = './packs', logger = console }) {
    this.graphDir = graphDir;
    this.logger = logger;
    this.graph = null;
  }

  async init() {
    const turtle = await useTurtle(this.graphDir);
    this.graph = useGraph(turtle.store);
  }

  async registerPack(packData) {
    await this.graph.query(`
      PREFIX gv: <https://gitvan.dev/packs/>
      INSERT DATA {
        gv:${packData.id} rdf:type gv:Pack ;
          gv:name "${packData.name}" ;
          gv:version "${packData.version}" ;
          gv:dependencies "${JSON.stringify(packData.dependencies || [])}" .
      }
    `);
  }

  async findPack(packName) {
    return await this.graph.select(`
      PREFIX gv: <https://gitvan.dev/packs/>
      SELECT ?pack ?version WHERE {
        ?pack gv:name "${packName}" ;
              gv:version ?version .
      }
    `);
  }
}
EOF

# 2. Create tests for consolidated registry
cat > tests/pack/pack-registry-consolidated.test.mjs << 'EOF'
import { describe, it, expect, beforeEach } from 'vitest';
import { PackRegistry } from '../../src/orchestration/PackRegistry.mjs';

describe('PackRegistry (Consolidated)', () => {
  let registry;

  beforeEach(async () => {
    registry = new PackRegistry({ graphDir: './tests/fixtures/packs' });
    await registry.init();
  });

  it('should register a pack', async () => {
    await registry.registerPack({
      id: 'test-pack',
      name: 'test-pack',
      version: '1.0.0',
      dependencies: []
    });

    const packs = await registry.findPack('test-pack');
    expect(packs.length).toBe(1);
  });

  it('should find pack by name', async () => {
    const packs = await registry.findPack('existing-pack');
    expect(packs).toBeInstanceOf(Array);
  });

  it('should resolve dependencies', async () => {
    const deps = await registry.resolveDependencies('pack-with-deps');
    expect(deps).toBeInstanceOf(Array);
  });
});
EOF

# 3. Delete old registry implementations
rm src/pack/pack-registry-manager.mjs
rm src/pack/registry-manager.mjs
rm src/pack/lazy-registry.mjs
rm src/pack/registry-refactored.mjs
rm src/pack/registry-original.mjs
rm src/pack/pack-registry-search.mjs

# 4. Run consolidated tests
pnpm test tests/pack/pack-registry-consolidated.test.mjs
```

**Day 4-5: CLI → PackRegistry Integration**
```bash
# Update CLI pack commands to use consolidated registry
cat > tests/integration/cli-pack-integration.test.mjs << 'EOF'
import { describe, it, expect } from 'vitest';
import { bootGitVan } from '../../src/runtime/boot.mjs';

describe('CLI → PackRegistry Integration', () => {
  it('should wire CLI pack install command to PackRegistry', async () => {
    const ctx = await bootGitVan();
    expect(ctx.packRegistry).toBeDefined();

    // Install pack (dry run)
    const result = await ctx.packRegistry.registerPack({
      id: 'test-pack',
      name: 'test-pack',
      version: '1.0.0'
    });

    expect(result).toBeDefined();
  });
});
EOF

# Run tests
pnpm test tests/integration/cli-pack-integration.test.mjs
```

**Week 3-4 Success Criteria**:
- [ ] HookOrchestrator unit tests created and passing
- [ ] WorkflowExecutor unit tests validated
- [ ] CLI → subsystem integration tests created
- [ ] Pack system consolidated to single registry
- [ ] All integration tests passing

### Phase 3: End-to-End Validation (Weeks 5-6)

**Goal**: Validate complete workflows from CLI to execution.

#### Week 5: JTBD Workflow Scenarios

**Day 1-2: Business Intelligence Workflow**
```bash
# Update existing test
cat > tests/e2e/jtbd-business-intelligence-full.test.mjs << 'EOF'
import { describe, it, expect } from 'vitest';
import { bootGitVan } from '../../src/runtime/boot.mjs';

describe('JTBD: Business Intelligence Workflow (Full E2E)', () => {
  it('should execute market intelligence analysis workflow', async () => {
    const ctx = await bootGitVan();

    // 1. Evaluate hook (predicate triggers)
    const hookResults = await ctx.hookOrchestrator.evaluate();
    expect(hookResults.triggered.length).toBeGreaterThan(0);

    // 2. Execute workflow (triggered by hook)
    const workflowId = hookResults.triggered[0].workflowId;
    const workflowResults = await ctx.workflowExecutor.execute(workflowId, {});

    // 3. Validate outputs
    expect(workflowResults.success).toBe(true);
    expect(workflowResults.steps.length).toBeGreaterThan(0);

    // 4. Validate artifacts created
    // (e.g., market-intelligence-report.md)
  });
});
EOF

# Run test
pnpm test tests/e2e/jtbd-business-intelligence-full.test.mjs
```

**Day 3-4: CI/CD Automation Workflow**
```bash
# Similar pattern for CI/CD workflow
pnpm test tests/e2e/jtbd-cicd-automation-full.test.mjs
```

**Day 5: Developer Workflow Automation (CREATE)**
```bash
# Create new developer workflow test
cat > tests/e2e/jtbd-developer-workflow-full.test.mjs << 'EOF'
import { describe, it, expect } from 'vitest';
import { bootGitVan } from '../../src/runtime/boot.mjs';

describe('JTBD: Developer Workflow Automation (Full E2E)', () => {
  it('should execute daily scrum automation workflow', async () => {
    const ctx = await bootGitVan();

    // Test: Daily scrum hook → workflow → standup report
    const results = await ctx.hookOrchestrator.evaluate();
    expect(results.triggered).toContainEqual(
      expect.objectContaining({ workflowId: 'daily-scrum' })
    );
  });

  it('should execute sprint planning workflow', async () => {
    const ctx = await bootGitVan();

    // Test: Sprint planning hook → workflow → sprint plan
    const results = await ctx.workflowExecutor.execute('sprint-planning', {});
    expect(results.success).toBe(true);
  });
});
EOF

# Run test
pnpm test tests/e2e/jtbd-developer-workflow-full.test.mjs
```

#### Week 6: Production & Performance Scenarios

**Day 1-2: Full CLI Lifecycle (CREATE)**
```bash
# Create full lifecycle test (init → setup → hooks → workflow → pack)
cat > tests/e2e/cli-full-lifecycle.test.mjs << 'EOF'
import { describe, it, expect } from 'vitest';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

describe('Full CLI Lifecycle (E2E)', () => {
  it('should execute full GitVan lifecycle', async () => {
    // 1. Init project
    await execAsync('gitvan init --name test-project');

    // 2. Setup
    await execAsync('gitvan setup');

    // 3. Evaluate hooks
    const { stdout: hooksOutput } = await execAsync('gitvan hooks evaluate');
    expect(hooksOutput).toContain('evaluated');

    // 4. Run workflow
    const { stdout: workflowOutput } = await execAsync('gitvan workflow run test-workflow');
    expect(workflowOutput).toContain('success');

    // 5. Install pack
    const { stdout: packOutput } = await execAsync('gitvan pack install test-pack');
    expect(packOutput).toContain('installed');
  }, 60000); // 60s timeout
});
EOF

# Run test
pnpm test tests/e2e/cli-full-lifecycle.test.mjs
```

**Day 3-4: Production Deployment (CREATE)**
```bash
# Create production deployment test (cleanroom → Docker → validation)
cat > tests/e2e/production-deployment.test.mjs << 'EOF'
import { describe, it, expect } from 'vitest';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

describe('Production Deployment (E2E)', () => {
  it('should deploy GitVan in cleanroom Docker environment', async () => {
    // 1. Build Docker image
    await execAsync('docker build -t gitvan-cleanroom .');

    // 2. Run container
    const { stdout } = await execAsync('docker run --rm gitvan-cleanroom gitvan hooks evaluate');

    // 3. Validate output
    expect(stdout).toContain('evaluated');
  }, 300000); // 5 min timeout
});
EOF

# Run test (requires Docker)
pnpm test tests/e2e/production-deployment.test.mjs
```

**Day 5: Performance & Stress (CREATE)**
```bash
# Create performance benchmark test
cat > tests/e2e/performance-full-stack.test.mjs << 'EOF'
import { describe, it, expect } from 'vitest';
import { bootGitVan } from '../../src/runtime/boot.mjs';

describe('Performance Benchmarks (E2E)', () => {
  it('should evaluate 1000 hooks in < 1s', async () => {
    const ctx = await bootGitVan();

    const startTime = performance.now();
    await ctx.hookOrchestrator.evaluate();
    const duration = performance.now() - startTime;

    expect(duration).toBeLessThan(1000); // < 1s
  });

  it('should execute 100 workflows concurrently in < 5s', async () => {
    const ctx = await bootGitVan();

    const startTime = performance.now();
    await Promise.all(
      Array(100).fill().map(() => ctx.workflowExecutor.execute('test-workflow', {}))
    );
    const duration = performance.now() - startTime;

    expect(duration).toBeLessThan(5000); // < 5s
  });
});
EOF

# Run test
pnpm test tests/e2e/performance-full-stack.test.mjs
```

**Week 5-6 Success Criteria**:
- [ ] All JTBD workflows tested end-to-end
- [ ] Full CLI lifecycle validated
- [ ] Production deployment validated in Docker
- [ ] Performance benchmarks met (hooks < 1s, workflows < 5s)

---

## 4. Test Automation & CI/CD

### 4.1 Test Scripts (package.json)

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest tests/composables tests/engines tests/hooks tests/workflow",
    "test:integration": "vitest tests/integration",
    "test:e2e": "vitest tests/e2e",
    "test:coverage": "vitest --coverage",
    "test:watch": "vitest --watch",

    "test:core": "vitest tests/engines tests/composables",
    "test:subsystems": "vitest tests/hooks tests/workflow tests/pack",
    "test:cli": "vitest tests/integration/cli-*",

    "test:production": "vitest tests/e2e/production-deployment.test.mjs",
    "test:performance": "vitest tests/e2e/performance-full-stack.test.mjs",

    "test:all": "pnpm run test:unit && pnpm run test:integration && pnpm run test:e2e",
    "test:ci": "pnpm run test:coverage && pnpm run test:e2e"
  }
}
```

### 4.2 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test:unit

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test:e2e

  production-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - run: docker build -t gitvan-cleanroom .
      - run: docker run --rm gitvan-cleanroom pnpm test:production
```

---

## 5. Test Coverage Goals

### 5.1 Coverage Targets by Component

| Component | Current Coverage | Target Coverage | Priority |
|-----------|------------------|-----------------|----------|
| **RdfEngine** | 95% | 95% | ✅ MAINTAIN |
| **useGraph** | 90% | 90% | ✅ MAINTAIN |
| **useTurtle** | 70% | 90% | 🔴 INCREASE |
| **Git composables** | 85% | 90% | 🟡 INCREASE |
| **Git-Native I/O** | 90% | 90% | ✅ MAINTAIN |
| **HookOrchestrator** | 50% | 90% | 🔴 INCREASE |
| **WorkflowExecutor** | 60% | 90% | 🔴 INCREASE |
| **PackRegistry** | 30% | 90% | 🔴 INCREASE |
| **CLI Commands** | 40% | 80% | 🔴 INCREASE |
| **Step Handlers** | 70% | 85% | 🟡 INCREASE |

**Overall Target**: **90%** coverage across all subsystems

### 5.2 Coverage Enforcement (vitest.config.mjs)

```javascript
// vitest.config.mjs
export default {
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90
      },
      exclude: [
        'tests/**',
        'examples/**',
        'docs/**',
        '**/*.test.mjs',
        '**/*.spec.mjs'
      ]
    },
    testTimeout: 30000, // 30s default
    hookTimeout: 10000, // 10s for beforeEach/afterEach
  }
};
```

---

## 6. Test Consolidation Plan

### 6.1 Duplicate/Redundant Tests to Remove

```bash
# Pack system tests (CONSOLIDATE - multiple implementations)
tests/pack/pack-*.test.mjs                          # DELETE (consolidate to pack-registry-consolidated.test.mjs)

# Hook system tests (CONSOLIDATE - scattered tests)
tests/knowledge-hooks-*.test.mjs                    # CONSOLIDATE to tests/hooks/
tests/jtbd-hooks-*.test.mjs                         # CONSOLIDATE to tests/e2e/jtbd-*.test.mjs

# Workflow tests (CONSOLIDATE - duplicate coverage)
tests/workflow-*.test.mjs                           # CONSOLIDATE to tests/workflow/
tests/turtle-workflow-*.test.mjs                    # CONSOLIDATE to tests/workflow/

# Git tests (KEEP - production-ready, but consolidate duplicates)
tests/useGit.*.test.mjs                             # KEEP (comprehensive coverage)
tests/git-*.test.mjs                                # CONSOLIDATE (remove duplicates)
```

**Consolidation Strategy**:
1. Identify authoritative test for each subsystem
2. Merge duplicate tests into authoritative test
3. Delete redundant test files
4. Update documentation with test locations

### 6.2 Test File Organization (Proposed)

```
tests/
├── unit/                          # Unit tests (60%)
│   ├── engines/
│   │   └── rdf-engine.test.mjs
│   ├── composables/
│   │   ├── graph.test.mjs
│   │   ├── turtle.test.mjs
│   │   ├── git.test.mjs
│   │   └── template.test.mjs
│   ├── hooks/
│   │   ├── hook-orchestrator.test.mjs
│   │   ├── predicate-evaluator.test.mjs
│   │   └── hook-parser.test.mjs
│   ├── workflow/
│   │   ├── workflow-executor.test.mjs
│   │   ├── dag-planner.test.mjs
│   │   └── step-runner.test.mjs
│   └── pack/
│       └── pack-registry.test.mjs
│
├── integration/                   # Integration tests (30%)
│   ├── cli-hooks-integration.test.mjs
│   ├── cli-workflow-integration.test.mjs
│   ├── cli-pack-integration.test.mjs
│   ├── hook-workflow-integration.test.mjs
│   └── unrdf-integration.test.mjs
│
├── e2e/                           # End-to-end tests (10%)
│   ├── jtbd-business-intelligence.test.mjs
│   ├── jtbd-cicd-automation.test.mjs
│   ├── jtbd-developer-workflow.test.mjs
│   ├── cli-full-lifecycle.test.mjs
│   ├── production-deployment.test.mjs
│   └── performance-full-stack.test.mjs
│
├── validation/                    # Validation tests
│   ├── readme-capabilities.test.mjs
│   └── api-contracts.test.mjs
│
└── fixtures/                      # Test fixtures
    ├── hooks/                     # Sample .ttl hooks
    ├── workflows/                 # Sample workflows
    ├── packs/                     # Sample packs
    └── graphs/                    # Sample RDF graphs
```

---

## 7. Conclusion

### 7.1 Summary

**Current State**:
- ✅ 215 test files (fragmented, unclear organization)
- ⚠️  65% estimated coverage (target: 90%)
- ❌ Missing integration tests (CLI → subsystems)
- ❌ Missing E2E tests (full workflows)

**Target State** (v3.0.0):
- ✅ ~150 consolidated test files (organized by layer)
- ✅ 90%+ coverage across all subsystems
- ✅ Complete integration tests (CLI → subsystems)
- ✅ E2E tests for major workflows (JTBD scenarios)

### 7.2 Test Validation Checklist

**Phase 1: Core Components (Weeks 1-2)**
- [ ] RdfEngine tests validated (95%+ coverage)
- [ ] useGraph tests validated (90%+ coverage)
- [ ] useTurtle tests created (90%+ coverage)
- [ ] Git composables tests validated (90%+ coverage)
- [ ] Git-Native I/O tests validated (90%+ coverage)
- [ ] Template composable tests validated (90%+ coverage)

**Phase 2: Subsystem Integration (Weeks 3-4)**
- [ ] HookOrchestrator unit tests created
- [ ] WorkflowExecutor unit tests validated
- [ ] CLI → HookOrchestrator integration tests created
- [ ] CLI → WorkflowExecutor integration tests created
- [ ] Pack system consolidated to single registry
- [ ] CLI → PackRegistry integration tests created

**Phase 3: End-to-End Validation (Weeks 5-6)**
- [ ] JTBD Business Intelligence workflow tested
- [ ] JTBD CI/CD Automation workflow tested
- [ ] JTBD Developer Workflow tested
- [ ] Full CLI lifecycle tested
- [ ] Production deployment tested (Docker)
- [ ] Performance benchmarks validated

**Phase 4: Consolidation & Documentation (Week 7)**
- [ ] Duplicate tests removed
- [ ] Test organization restructured
- [ ] Test coverage enforced (90%+ threshold)
- [ ] CI/CD pipeline configured
- [ ] Test documentation complete

### 7.3 Success Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| **Test Count** | 215 files | 150 files | 🔴 CONSOLIDATE |
| **Coverage** | 65% | 90% | 🔴 INCREASE |
| **Integration Tests** | 20% | 30% | 🔴 CREATE |
| **E2E Tests** | 5% | 10% | 🔴 CREATE |
| **CI/CD Pass Rate** | 80% | 100% | 🟡 IMPROVE |
| **Performance** | Untested | Benchmarked | 🔴 CREATE |

**Final Goal**: GitVan v3.0.0 with **90%+ test coverage**, **comprehensive integration tests**, and **validated E2E scenarios** ready for production deployment.

---

**Prepared by**: System Architecture Designer
**Review Required**: QA Lead, Engineering Lead
**Next Steps**: Begin Phase 1 core component validation
