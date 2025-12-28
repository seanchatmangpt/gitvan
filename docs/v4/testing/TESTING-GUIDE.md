# GitVan v4 Testing Strategies

Comprehensive testing approaches for Knowledge Hooks.

---

## Table of Contents

1. [Testing Overview](#testing-overview)
2. [Unit Testing](#unit-testing)
3. [Integration Testing](#integration-testing)
4. [End-to-End Testing](#end-to-end-testing)
5. [Predicate Testing](#predicate-testing)
6. [Workflow Testing](#workflow-testing)
7. [Test Utilities](#test-utilities)
8. [CI/CD Integration](#cicd-integration)

---

## Testing Overview

### Test Pyramid

```
        /\
       /  \
      / E2E \        <- Few, slow, comprehensive
     /--------\
    /Integration\    <- Some, medium speed
   /--------------\
  /    Unit Tests   \  <- Many, fast, focused
 /____________________\
```

### Testing Strategy

| Layer | Focus | Speed | Coverage |
|-------|-------|-------|----------|
| Unit | Predicates, steps | Fast | High |
| Integration | Workflows, graphs | Medium | Medium |
| E2E | Full hook execution | Slow | Critical paths |

---

## Unit Testing

### Testing Predicates

```javascript
// tests/predicates/ask-predicate.test.mjs
import { describe, it, expect, beforeEach } from 'vitest';
import { PredicateEvaluator } from 'gitvan/hooks';
import { createMockGraph } from '../utils/mock-graph.mjs';

describe('ASK Predicate', () => {
  let evaluator;

  beforeEach(() => {
    evaluator = new PredicateEvaluator({ logger: console });
  });

  it('returns true when condition is met', async () => {
    const predicate = {
      type: 'ask',
      definition: {
        query: `
          ASK WHERE {
            ?bug rdf:type gv:Bug .
            ?bug gv:severity "critical" .
          }
        `
      }
    };

    const graph = createMockGraph({
      triples: [
        ['bug1', 'rdf:type', 'gv:Bug'],
        ['bug1', 'gv:severity', '"critical"']
      ]
    });

    const result = await evaluator._evaluateASK(predicate, graph);

    expect(result).toBe(true);
  });

  it('returns false when condition is not met', async () => {
    const predicate = {
      type: 'ask',
      definition: {
        query: `
          ASK WHERE {
            ?bug rdf:type gv:Bug .
            ?bug gv:severity "critical" .
          }
        `
      }
    };

    const graph = createMockGraph({ triples: [] });

    const result = await evaluator._evaluateASK(predicate, graph);

    expect(result).toBe(false);
  });
});
```

### Testing Threshold Predicates

```javascript
// tests/predicates/threshold-predicate.test.mjs
describe('SELECTThreshold Predicate', () => {
  const testCases = [
    { count: 15, threshold: 10, operator: '>', expected: true },
    { count: 10, threshold: 10, operator: '>', expected: false },
    { count: 10, threshold: 10, operator: '>=', expected: true },
    { count: 5, threshold: 10, operator: '<', expected: true },
    { count: 10, threshold: 10, operator: '==', expected: true },
  ];

  testCases.forEach(({ count, threshold, operator, expected }) => {
    it(`returns ${expected} when count ${operator} ${threshold}`, async () => {
      const predicate = {
        type: 'selectThreshold',
        definition: {
          query: `SELECT (COUNT(?x) AS ?count) WHERE { ?x ?y ?z }`,
          threshold,
          operator
        }
      };

      const graph = createMockGraph({
        queryResult: { results: [{ count: { value: count } }] }
      });

      const result = await evaluator._evaluateSELECTThreshold(predicate, graph);

      expect(result.triggered).toBe(expected);
    });
  });
});
```

### Testing Steps

```javascript
// tests/steps/cli-step.test.mjs
import { StepRunner } from 'gitvan/workflow';

describe('CLI Step', () => {
  let runner;

  beforeEach(() => {
    runner = new StepRunner({ logger: console });
  });

  it('executes command and captures output', async () => {
    const step = {
      type: 'cli',
      command: 'echo "Hello World"'
    };

    const result = await runner.executeStep(step, {});

    expect(result.success).toBe(true);
    expect(result.output).toContain('Hello World');
  });

  it('handles command failure', async () => {
    const step = {
      type: 'cli',
      command: 'exit 1'
    };

    const result = await runner.executeStep(step, {});

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('respects timeout', async () => {
    const step = {
      type: 'cli',
      command: 'sleep 10',
      timeout: 100
    };

    const result = await runner.executeStep(step, {});

    expect(result.success).toBe(false);
    expect(result.error).toContain('timeout');
  });
});
```

---

## Integration Testing

### Testing Hook Parsing

```javascript
// tests/integration/hook-parsing.test.mjs
import { HookParser } from 'gitvan/hooks';
import { useTurtle } from 'gitvan/composables';

describe('Hook Parsing', () => {
  it('parses complete hook definition', async () => {
    const turtle = await useTurtle({
      graphDir: './tests/fixtures/hooks'
    });

    const parser = new HookParser({ logger: console });
    const hook = await parser.parseHook(turtle, 'test-hook');

    expect(hook).toBeDefined();
    expect(hook.id).toBe('test-hook');
    expect(hook.predicateDefinition).toBeDefined();
    expect(hook.workflows).toHaveLength(1);
  });

  it('handles missing predicate gracefully', async () => {
    const turtle = await useTurtle({
      graphDir: './tests/fixtures/invalid-hooks'
    });

    const parser = new HookParser({ logger: console });

    await expect(
      parser.parseHook(turtle, 'missing-predicate')
    ).rejects.toThrow('Predicate not found');
  });
});
```

### Testing Graph Operations

```javascript
// tests/integration/graph-operations.test.mjs
import { useGraph, useTurtle } from 'gitvan/composables';

describe('Graph Operations', () => {
  let graph;

  beforeAll(async () => {
    const turtle = await useTurtle({
      graphDir: './tests/fixtures/data'
    });
    graph = useGraph(turtle.store);
  });

  it('queries graph data correctly', async () => {
    const result = await graph.query(`
      SELECT ?bug WHERE {
        ?bug rdf:type gv:Bug .
      }
    `);

    expect(result.results).toHaveLength(3);
  });

  it('supports SPARQL ASK queries', async () => {
    const result = await graph.query(`
      ASK WHERE {
        ?project rdf:type gv:Project .
      }
    `);

    expect(result.boolean).toBe(true);
  });
});
```

### Testing Workflow Execution

```javascript
// tests/integration/workflow-execution.test.mjs
import { HookOrchestrator } from 'gitvan/hooks';
import { withGitVan } from 'gitvan/composables';

describe('Workflow Execution', () => {
  it('executes workflow steps in order', async () => {
    const executionOrder = [];

    const orchestrator = new HookOrchestrator({
      graphDir: './tests/fixtures/hooks',
      stepExecutor: async (step) => {
        executionOrder.push(step.id);
        return { success: true };
      }
    });

    await withGitVan({ cwd: process.cwd() }, async () => {
      await orchestrator.evaluate();
    });

    expect(executionOrder).toEqual(['step1', 'step2', 'step3']);
  });

  it('respects step dependencies', async () => {
    const executionOrder = [];

    const orchestrator = new HookOrchestrator({
      graphDir: './tests/fixtures/dependent-hooks'
    });

    // With dependencies: step1 -> step2 -> step3
    // step2 depends on step1, step3 depends on step2

    await orchestrator.evaluate();

    // step1 must complete before step2
    expect(executionOrder.indexOf('step1')).toBeLessThan(
      executionOrder.indexOf('step2')
    );
  });
});
```

---

## End-to-End Testing

### Full Hook Evaluation

```javascript
// tests/e2e/hook-evaluation.test.mjs
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';

describe('E2E: Hook Evaluation', () => {
  const testDir = './tests/e2e-workspace';

  beforeAll(() => {
    // Setup test environment
    mkdirSync(testDir, { recursive: true });
    mkdirSync(`${testDir}/hooks`, { recursive: true });

    // Create test hook
    writeFileSync(`${testDir}/hooks/test-hook.ttl`, `
      @prefix ex: <http://example.org/> .
      @prefix gh: <https://gitvan.dev/graph-hook#> .
      @prefix op: <https://gitvan.dev/op#> .
      @prefix gv: <https://gitvan.dev/ontology#> .
      @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

      ex:test-hook rdf:type gh:Hook ;
          gh:hasPredicate ex:test-pred ;
          gh:orderedPipelines ex:test-pipeline .

      ex:test-pred rdf:type gh:ASKPredicate ;
          gh:queryText "ASK WHERE { BIND(true AS ?always) }" .

      ex:test-pipeline rdf:type op:Pipeline ;
          op:steps (ex:create-file) .

      ex:create-file rdf:type gv:TemplateStep ;
          gv:text "Test output" ;
          gv:filePath "./output.txt" .
    `);
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('evaluates hooks and creates output', () => {
    const result = execSync(
      `cd ${testDir} && gitvan hooks evaluate --verbose`,
      { encoding: 'utf8' }
    );

    expect(result).toContain('Hooks evaluated: 1');
    expect(result).toContain('Hooks triggered: 1');
    expect(existsSync(`${testDir}/output.txt`)).toBe(true);
  });
});
```

### CLI Testing

```javascript
// tests/e2e/cli.test.mjs
import { execSync, exec } from 'child_process';

describe('E2E: CLI Commands', () => {
  it('lists hooks', () => {
    const result = execSync('gitvan hooks list', { encoding: 'utf8' });
    expect(result).toContain('Available Knowledge Hooks');
  });

  it('validates hooks', () => {
    const result = execSync('gitvan hooks validate test-hook', {
      encoding: 'utf8'
    });
    expect(result).toContain('Hook validation passed');
  });

  it('shows statistics', () => {
    const result = execSync('gitvan hooks stats', { encoding: 'utf8' });
    expect(result).toContain('Total Hooks');
    expect(result).toContain('Categories');
  });

  it('supports dry run', () => {
    const result = execSync('gitvan hooks evaluate --dry-run', {
      encoding: 'utf8'
    });
    expect(result).toContain('Dry run mode');
    expect(result).not.toContain('Executing');
  });
});
```

---

## Predicate Testing

### Testing ResultDelta

```javascript
// tests/predicates/result-delta.test.mjs
describe('ResultDelta Predicate', () => {
  it('detects changes between states', async () => {
    const predicate = {
      type: 'resultDelta',
      definition: {
        query: `
          SELECT ?version WHERE {
            ?project gv:version ?version .
          }
        `
      }
    };

    const previousGraph = createMockGraph({
      triples: [['project', 'gv:version', '"1.0.0"']]
    });

    const currentGraph = createMockGraph({
      triples: [['project', 'gv:version', '"2.0.0"']]
    });

    const result = await evaluator._evaluateResultDelta(
      predicate,
      currentGraph,
      previousGraph
    );

    expect(result.changed).toBe(true);
  });

  it('does not trigger when no changes', async () => {
    const predicate = {
      type: 'resultDelta',
      definition: {
        query: `SELECT ?version WHERE { ?project gv:version ?version }`
      }
    };

    const graph = createMockGraph({
      triples: [['project', 'gv:version', '"1.0.0"']]
    });

    const result = await evaluator._evaluateResultDelta(
      predicate,
      graph,
      graph  // Same graph
    );

    expect(result.changed).toBe(false);
  });
});
```

### Testing SHACL Validation

```javascript
// tests/predicates/shacl.test.mjs
describe('SHACL Predicate', () => {
  it('validates conforming data', async () => {
    const predicate = {
      type: 'shaclAllConform',
      definition: {
        shapes: `
          gv:TaskShape a sh:NodeShape ;
              sh:targetClass gv:Task ;
              sh:property [ sh:path gv:title ; sh:minCount 1 ] .
        `
      }
    };

    const graph = createMockGraph({
      triples: [
        ['task1', 'rdf:type', 'gv:Task'],
        ['task1', 'gv:title', '"My Task"']
      ]
    });

    const result = await evaluator._evaluateSHACL(predicate, graph);

    expect(result.conforms).toBe(true);
  });

  it('detects non-conforming data', async () => {
    const predicate = {
      type: 'shaclAllConform',
      definition: {
        shapes: `
          gv:TaskShape a sh:NodeShape ;
              sh:targetClass gv:Task ;
              sh:property [ sh:path gv:title ; sh:minCount 1 ] .
        `
      }
    };

    const graph = createMockGraph({
      triples: [
        ['task1', 'rdf:type', 'gv:Task']
        // Missing title!
      ]
    });

    const result = await evaluator._evaluateSHACL(predicate, graph);

    expect(result.conforms).toBe(false);
    expect(result.context.violations).toHaveLength(1);
  });
});
```

---

## Workflow Testing

### Testing DAG Planning

```javascript
// tests/workflow/dag-planner.test.mjs
import { DAGPlanner } from 'gitvan/workflow';

describe('DAG Planner', () => {
  let planner;

  beforeEach(() => {
    planner = new DAGPlanner({ logger: console });
  });

  it('creates correct execution order', async () => {
    const steps = [
      { id: 'step3', dependsOn: ['step2'] },
      { id: 'step1', dependsOn: [] },
      { id: 'step2', dependsOn: ['step1'] }
    ];

    const plan = await planner.createPlan(steps);

    expect(plan.map(s => s.id)).toEqual(['step1', 'step2', 'step3']);
  });

  it('detects circular dependencies', async () => {
    const steps = [
      { id: 'step1', dependsOn: ['step2'] },
      { id: 'step2', dependsOn: ['step1'] }
    ];

    await expect(planner.createPlan(steps)).rejects.toThrow(
      'Circular dependency'
    );
  });

  it('enables parallel execution for independent steps', async () => {
    const steps = [
      { id: 'step1', dependsOn: [] },
      { id: 'step2', dependsOn: [] },
      { id: 'step3', dependsOn: ['step1', 'step2'] }
    ];

    const plan = await planner.createPlan(steps);

    // step1 and step2 can run in parallel
    expect(plan[0].parallel).toContain('step1');
    expect(plan[0].parallel).toContain('step2');
  });
});
```

---

## Test Utilities

### Mock Graph Factory

```javascript
// tests/utils/mock-graph.mjs
export function createMockGraph({ triples = [], queryResult = null }) {
  return {
    store: {
      getQuads: () => triples.map(([s, p, o]) => ({
        subject: { value: s },
        predicate: { value: p },
        object: { value: o }
      }))
    },
    query: async (queryText) => {
      if (queryResult) return queryResult;

      // Simple ASK simulation
      if (queryText.includes('ASK')) {
        return { boolean: triples.length > 0 };
      }

      // Simple SELECT simulation
      return { results: triples.map(t => ({ value: t[2] })) };
    }
  };
}
```

### Test Fixtures

```javascript
// tests/fixtures/setup.mjs
import { writeFileSync, mkdirSync } from 'fs';

export function createTestHook(dir, name, config) {
  mkdirSync(`${dir}/hooks`, { recursive: true });

  const turtle = `
    @prefix ex: <http://example.org/> .
    @prefix gh: <https://gitvan.dev/graph-hook#> .
    @prefix op: <https://gitvan.dev/op#> .

    ex:${name} rdf:type gh:Hook ;
        gh:hasPredicate ex:${name}-pred ;
        gh:orderedPipelines ex:${name}-pipeline .

    ex:${name}-pred rdf:type gh:${config.predicateType || 'ASKPredicate'} ;
        gh:queryText """${config.query || 'ASK WHERE { BIND(true AS ?always) }'}""" .

    ex:${name}-pipeline rdf:type op:Pipeline ;
        op:steps (${config.steps.map((s, i) => `ex:step${i}`).join(' ')}) .

    ${config.steps.map((step, i) => `
      ex:step${i} rdf:type op:CLIStep ;
          op:command "${step.command}" .
    `).join('\n')}
  `;

  writeFileSync(`${dir}/hooks/${name}.ttl`, turtle);
}
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test-hooks.yml
name: Test Hooks

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:unit

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:e2e

  hook-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g gitvan
      - run: gitvan hooks list
      - run: |
          for hook in $(gitvan hooks list --json | jq -r '.[].id'); do
            gitvan hooks validate $hook
          done
```

### Vitest Configuration

```javascript
// vitest.config.mjs
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.mjs'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/**/*.mjs'],
      exclude: ['src/cli/**']
    },
    testTimeout: 30000,
    hookTimeout: 10000
  }
});
```

---

## Summary

| Test Type | Focus | Tools |
|-----------|-------|-------|
| Unit | Predicates, Steps | Vitest, Mock Graph |
| Integration | Workflows, Graphs | Vitest, Fixtures |
| E2E | Full Execution | CLI, File System |

---

## Next Steps

- [Best Practices](../api/BEST-PRACTICES.md)
- [Security Guide](../security/SECURITY-GUIDE.md)
- [Troubleshooting](../TROUBLESHOOTING.md)
