/**
 * @fileoverview Phase 6 Workflow Optimization Test Suite
 *
 * Comprehensive test-first implementation for workflow engine optimization.
 * Tests parallelizable step detection, critical path analysis, composition,
 * and performance optimization with SPARQL-driven analysis.
 *
 * Test Coverage:
 * 1. Parallelizable step detection (20+ workflows)
 * 2. Critical path identification
 * 3. Performance analysis with duration estimates
 * 4. Parallel batch grouping
 * 5. Workflow composition with CONSTRUCT queries
 * 6. Optimization suggestions (sensible, applicable)
 * 7. Performance benchmarks (<100ms optimization)
 * 8. Complex workflows (100+ steps)
 *
 * Target Coverage: >85%
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createStore, parseTurtle } from "@unrdf/core";
import { SPARQLWorkflowOptimizer } from '../../src/workflow/sparql-workflow-optimizer.mjs';
import { CriticalPathAnalyzer } from '../../src/workflow/critical-path-analyzer.mjs';
import { WorkflowComposer } from '../../src/workflow/workflow-composer.mjs';

// Test helper: Create simple workflow
function createSimpleWorkflow(steps) {
  return {
    id: 'http://example.org/test-workflow',
    title: 'Test Workflow',
    steps,
  };
}

// Test helper: Create step with dependencies
function createStep(id, type = 'sparql', dependsOn = [], duration = 1000) {
  return {
    id: `http://example.org/${id}`,
    type,
    dependsOn: dependsOn.map(d => `http://example.org/${d}`),
    config: {
      query: `SELECT * WHERE { ?s ?p ?o }`,
    },
    metadata: { duration },
  };
}

// Test helper: Create complex workflow with multiple dependencies
function createComplexWorkflow(stepCount = 10) {
  const steps = [];
  for (let i = 0; i < stepCount; i++) {
    const dependencies = [];
    // Each step depends on previous steps in a way that creates opportunities for parallelization
    if (i > 0 && i % 3 !== 0) {
      dependencies.push(`step${i - 1}`);
    }
    if (i > 1 && i % 5 === 0) {
      dependencies.push(`step${i - 2}`);
    }
    steps.push(createStep(`step${i}`, 'sparql', dependencies, 500 + Math.random() * 500));
  }
  return createSimpleWorkflow(steps);
}

describe('Phase 6: Workflow Optimization', () => {
  let store;
  let optimizer;
  let cpAnalyzer;
  let composer;

  beforeEach(async () => {
    // Create RDF store
    store = await createStore();
    optimizer = new SPARQLWorkflowOptimizer({ store });
    cpAnalyzer = new CriticalPathAnalyzer({ store });
    composer = new WorkflowComposer({ store });
  });

  afterEach(async () => {
    if (store && store.cleanup) {
      await store.cleanup();
    }
  });

  describe('Test 1: Parallelizable Step Detection', () => {
    it('should detect steps with no dependencies as parallelizable', async () => {
      const workflow = createSimpleWorkflow([
        createStep('step1'),
        createStep('step2'),
        createStep('step3'),
      ]);

      const result = await optimizer.optimizeWorkflow(workflow);

      expect(result.parallelizableSteps).toBeDefined();
      expect(result.parallelizableSteps.length).toBe(3);
      expect(result.parallelBatches).toBeDefined();
      expect(result.parallelBatches.length).toBe(1);
    });

    it('should identify independent branches in linear workflow', async () => {
      const workflow = createSimpleWorkflow([
        createStep('step1'),
        createStep('step2', 'sparql', ['step1']),
        createStep('step3', 'sparql', ['step1']),
        createStep('step4', 'sparql', ['step2', 'step3']),
      ]);

      const result = await optimizer.optimizeWorkflow(workflow);

      expect(result.parallelBatches).toBeDefined();
      // step2 and step3 should be in the same batch
      const batch2Index = result.parallelBatches.findIndex(b =>
        b.some(s => s.id.includes('step2'))
      );
      const batch3Index = result.parallelBatches.findIndex(b =>
        b.some(s => s.id.includes('step3'))
      );
      expect(batch2Index).toBe(batch3Index);
    });

    it('should detect parallelizable steps in diamond dependency pattern', async () => {
      const workflow = createSimpleWorkflow([
        createStep('start'),
        createStep('left', 'sparql', ['start']),
        createStep('right', 'sparql', ['start']),
        createStep('merge', 'sparql', ['left', 'right']),
      ]);

      const result = await optimizer.optimizeWorkflow(workflow);

      expect(result.parallelBatches.length).toBeGreaterThan(1);
      // left and right should be in same batch
      const leftBatch = result.parallelBatches.find(b =>
        b.some(s => s.id.includes('left'))
      );
      const rightBatch = result.parallelBatches.find(b =>
        b.some(s => s.id.includes('right'))
      );
      expect(leftBatch).toEqual(rightBatch);
    });

    it('should handle complex multi-level parallel workflows', async () => {
      const workflow = createSimpleWorkflow([
        createStep('a'),
        createStep('b'),
        createStep('c'),
        createStep('d', 'sparql', ['a']),
        createStep('e', 'sparql', ['b']),
        createStep('f', 'sparql', ['c']),
        createStep('g', 'sparql', ['d', 'e', 'f']),
      ]);

      const result = await optimizer.optimizeWorkflow(workflow);

      expect(result.parallelBatches.length).toBe(4);
      // First batch: a, b, c
      expect(result.parallelBatches[0].length).toBe(3);
      // Second batch: d, e, f
      expect(result.parallelBatches[1].length).toBe(3);
      // Third batch: g
      expect(result.parallelBatches[2].length).toBe(1);
    });

    it('should detect 20+ workflows with different parallelization opportunities', async () => {
      const workflows = [];
      for (let i = 0; i < 20; i++) {
        workflows.push(createComplexWorkflow(5 + Math.floor(i / 2)));
      }

      const results = await Promise.all(
        workflows.map(w => optimizer.optimizeWorkflow(w))
      );

      expect(results.length).toBe(20);
      results.forEach(result => {
        expect(result.parallelBatches).toBeDefined();
        expect(result.parallelBatches.length).toBeGreaterThan(0);
      });
    });

    it('should correctly identify non-parallelizable linear sequences', async () => {
      const workflow = createSimpleWorkflow([
        createStep('step1'),
        createStep('step2', 'sparql', ['step1']),
        createStep('step3', 'sparql', ['step2']),
        createStep('step4', 'sparql', ['step3']),
      ]);

      const result = await optimizer.optimizeWorkflow(workflow);

      // All steps must be sequential (no parallelization possible)
      expect(result.parallelBatches.length).toBe(4);
      result.parallelBatches.forEach(batch => {
        expect(batch.length).toBe(1);
      });
    });

    it('should identify parallelizable steps across multiple independent chains', async () => {
      const workflow = createSimpleWorkflow([
        // Chain 1
        createStep('a1'),
        createStep('a2', 'sparql', ['a1']),
        createStep('a3', 'sparql', ['a2']),
        // Chain 2
        createStep('b1'),
        createStep('b2', 'sparql', ['b1']),
        createStep('b3', 'sparql', ['b2']),
        // Merge
        createStep('merge', 'sparql', ['a3', 'b3']),
      ]);

      const result = await optimizer.optimizeWorkflow(workflow);

      expect(result.parallelBatches.length).toBeGreaterThan(1);
      // a1 and b1 should be parallelizable
      const firstBatch = result.parallelBatches[0];
      expect(firstBatch.some(s => s.id.includes('a1'))).toBe(true);
      expect(firstBatch.some(s => s.id.includes('b1'))).toBe(true);
    });
  });

  describe('Test 2: Critical Path Identification', () => {
    it('should identify critical path in linear workflow', async () => {
      const workflow = createSimpleWorkflow([
        createStep('step1', 'sparql', [], 1000),
        createStep('step2', 'sparql', ['step1'], 2000),
        createStep('step3', 'sparql', ['step2'], 1500),
      ]);

      const analysis = await cpAnalyzer.analyzePerformance(workflow);

      expect(analysis.criticalPath).toBeDefined();
      expect(analysis.criticalPath.length).toBe(3);
      expect(analysis.criticalPath[0].id).toContain('step1');
      expect(analysis.criticalPath[1].id).toContain('step2');
      expect(analysis.criticalPath[2].id).toContain('step3');
    });

    it('should correctly calculate total critical path duration', async () => {
      const workflow = createSimpleWorkflow([
        createStep('step1', 'sparql', [], 1000),
        createStep('step2', 'sparql', ['step1'], 2000),
        createStep('step3', 'sparql', ['step2'], 1500),
      ]);

      const analysis = await cpAnalyzer.analyzePerformance(workflow);

      expect(analysis.estimatedDuration).toBe(4500); // 1000 + 2000 + 1500
    });

    it('should identify shortest critical path in diamond pattern', async () => {
      const workflow = createSimpleWorkflow([
        createStep('start', 'sparql', [], 100),
        createStep('left', 'sparql', ['start'], 500),
        createStep('right', 'sparql', ['start'], 2000),
        createStep('merge', 'sparql', ['left', 'right'], 100),
      ]);

      const analysis = await cpAnalyzer.analyzePerformance(workflow);

      // Critical path should go through right (2100 total)
      expect(analysis.estimatedDuration).toBe(2200); // 100 + 2000 + 100
      expect(analysis.criticalPath.some(s => s.id.includes('right'))).toBe(true);
    });

    it('should identify multiple critical paths when they have equal length', async () => {
      const workflow = createSimpleWorkflow([
        createStep('start', 'sparql', [], 100),
        createStep('path1', 'sparql', ['start'], 1000),
        createStep('path2', 'sparql', ['start'], 1000),
        createStep('merge', 'sparql', ['path1', 'path2'], 100),
      ]);

      const analysis = await cpAnalyzer.analyzePerformance(workflow);

      // Both paths have equal length
      expect(analysis.estimatedDuration).toBe(1200); // 100 + 1000 + 100
      expect(analysis.criticalPaths).toBeDefined();
      expect(analysis.criticalPaths.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle complex workflows with multiple dependency levels', async () => {
      const workflow = createComplexWorkflow(15);

      const analysis = await cpAnalyzer.analyzePerformance(workflow);

      expect(analysis.criticalPath).toBeDefined();
      expect(analysis.criticalPath.length).toBeGreaterThan(0);
      expect(analysis.estimatedDuration).toBeGreaterThan(0);
    });

    it('should identify optimization opportunities in critical path', async () => {
      const workflow = createSimpleWorkflow([
        createStep('step1', 'sparql', [], 5000),
        createStep('step2', 'sparql', ['step1'], 3000),
        createStep('step3', 'sparql', ['step2'], 2000),
      ]);

      const analysis = await cpAnalyzer.analyzePerformance(workflow);

      expect(analysis.optimizationOpportunities).toBeDefined();
      expect(analysis.optimizationOpportunities.length).toBeGreaterThan(0);
    });
  });

  describe('Test 3: Performance Analysis', () => {
    it('should accurately estimate workflow duration', async () => {
      const workflow = createSimpleWorkflow([
        createStep('step1', 'sparql', [], 1000),
        createStep('step2', 'sparql', ['step1'], 2000),
      ]);

      const analysis = await cpAnalyzer.analyzePerformance(workflow);

      expect(analysis.estimatedDuration).toBe(3000);
    });

    it('should estimate parallel execution time correctly', async () => {
      const workflow = createSimpleWorkflow([
        createStep('step1', 'sparql', [], 1000),
        createStep('step2', 'sparql', [], 2000),
        createStep('step3', 'sparql', ['step1', 'step2'], 1000),
      ]);

      const analysis = await cpAnalyzer.analyzePerformance(workflow);

      // Parallel steps: max(1000, 2000) + 1000 = 3000
      expect(analysis.estimatedDuration).toBe(3000);
    });

    it('should provide performance breakdown by step type', async () => {
      const workflow = createSimpleWorkflow([
        createStep('sparql1', 'sparql', [], 1000),
        createStep('template1', 'template', ['sparql1'], 500),
        createStep('file1', 'file', ['template1'], 200),
      ]);

      const analysis = await cpAnalyzer.analyzePerformance(workflow);

      expect(analysis.performanceByType).toBeDefined();
      expect(analysis.performanceByType.sparql).toBeGreaterThan(0);
    });

    it('should identify performance bottlenecks', async () => {
      const workflow = createSimpleWorkflow([
        createStep('step1', 'sparql', [], 1000),
        createStep('step2', 'sparql', ['step1'], 10000), // Bottleneck
        createStep('step3', 'sparql', ['step2'], 1000),
      ]);

      const analysis = await cpAnalyzer.analyzePerformance(workflow);

      expect(analysis.bottlenecks).toBeDefined();
      expect(analysis.bottlenecks.length).toBeGreaterThan(0);
      expect(analysis.bottlenecks[0].id).toContain('step2');
    });

    it('should calculate potential time savings with parallelization', async () => {
      const workflow = createSimpleWorkflow([
        createStep('step1', 'sparql', [], 1000),
        createStep('step2', 'sparql', [], 1000),
        createStep('step3', 'sparql', ['step1', 'step2'], 1000),
      ]);

      const analysis = await cpAnalyzer.analyzePerformance(workflow);

      expect(analysis.potentialTimeSavings).toBeDefined();
      expect(analysis.potentialTimeSavings).toBeGreaterThan(0);
      expect(analysis.parallelizationGain).toBeDefined();
    });
  });

  describe('Test 4: Parallel Batch Grouping', () => {
    it('should group independent steps into same batch', async () => {
      const workflow = createSimpleWorkflow([
        createStep('step1'),
        createStep('step2'),
        createStep('step3'),
      ]);

      const result = await optimizer.optimizeWorkflow(workflow);

      expect(result.parallelBatches.length).toBe(1);
      expect(result.parallelBatches[0].length).toBe(3);
    });

    it('should separate dependent steps into different batches', async () => {
      const workflow = createSimpleWorkflow([
        createStep('step1'),
        createStep('step2', 'sparql', ['step1']),
        createStep('step3', 'sparql', ['step2']),
      ]);

      const result = await optimizer.optimizeWorkflow(workflow);

      expect(result.parallelBatches.length).toBe(3);
    });

    it('should create correct batch ordering', async () => {
      const workflow = createSimpleWorkflow([
        createStep('a1'),
        createStep('a2'),
        createStep('b', 'sparql', ['a1', 'a2']),
      ]);

      const result = await optimizer.optimizeWorkflow(workflow);

      const batch1Ids = result.parallelBatches[0].map(s => s.id);
      const batch2Ids = result.parallelBatches[1].map(s => s.id);

      expect(batch1Ids.some(id => id.includes('a1'))).toBe(true);
      expect(batch1Ids.some(id => id.includes('a2'))).toBe(true);
      expect(batch2Ids.some(id => id.includes('b'))).toBe(true);
    });

    it('should handle complex batch dependencies correctly', async () => {
      const workflow = createSimpleWorkflow([
        createStep('a'),
        createStep('b'),
        createStep('c'),
        createStep('d', 'sparql', ['a']),
        createStep('e', 'sparql', ['b']),
        createStep('f', 'sparql', ['c']),
        createStep('g', 'sparql', ['d', 'e']),
        createStep('h', 'sparql', ['f']),
        createStep('i', 'sparql', ['g', 'h']),
      ]);

      const result = await optimizer.optimizeWorkflow(workflow);

      expect(result.parallelBatches.length).toBeGreaterThan(2);

      // Verify batch ordering
      for (let i = 0; i < result.parallelBatches.length - 1; i++) {
        const currentBatchIds = result.parallelBatches[i].map(s => s.id);
        const nextBatchIds = result.parallelBatches[i + 1].map(s => s.id);

        // Check no step in next batch depends only on steps not in previous batches
        for (const step of result.parallelBatches[i + 1]) {
          const deps = step.dependsOn || [];
          // At least some dependencies should be satisfied or no dependencies
          expect(deps.length === 0 || deps.some(d =>
            currentBatchIds.some(id => id === d)
          )).toBe(true);
        }
      }
    });

    it('should create minimum number of batches', async () => {
      const workflow = createSimpleWorkflow([
        createStep('a'),
        createStep('b', 'sparql', ['a']),
        createStep('c', 'sparql', ['a']),
        createStep('d', 'sparql', ['b', 'c']),
      ]);

      const result = await optimizer.optimizeWorkflow(workflow);

      // Minimum should be 3: [a], [b,c], [d]
      expect(result.parallelBatches.length).toBe(3);
    });
  });

  describe('Test 5: Workflow Composition', () => {
    it('should compose simple workflow from steps', async () => {
      const steps = [
        createStep('step1'),
        createStep('step2', 'sparql', ['step1']),
      ];

      const composed = await composer.composeSubworkflow('test-composition', steps);

      expect(composed).toBeDefined();
      expect(composed.id).toContain('test-composition');
      expect(composed.steps).toBeDefined();
      expect(composed.steps.length).toBe(2);
    });

    it('should generate valid Turtle RDF for composed workflow', async () => {
      const steps = [createStep('step1'), createStep('step2', 'sparql', ['step1'])];
      const composed = await composer.composeSubworkflow('test', steps);

      expect(composed.ttl).toBeDefined();
      expect(composed.ttl.length).toBeGreaterThan(0);
      expect(composed.ttl).toMatch(/@prefix/);
    });

    it('should preserve step ordering and dependencies in composition', async () => {
      const steps = [
        createStep('a'),
        createStep('b', 'sparql', ['a']),
        createStep('c', 'sparql', ['b']),
      ];

      const composed = await composer.composeSubworkflow('test', steps);

      expect(composed.steps[0].id).toContain('a');
      expect(composed.steps[1].id).toContain('b');
      expect(composed.steps[2].id).toContain('c');
    });

    it('should combine multiple workflows into single composed workflow', async () => {
      const workflow1 = createSimpleWorkflow([
        createStep('w1-step1'),
        createStep('w1-step2', 'sparql', ['w1-step1']),
      ]);

      const workflow2 = createSimpleWorkflow([
        createStep('w2-step1'),
        createStep('w2-step2', 'sparql', ['w2-step1']),
      ]);

      const allSteps = [...workflow1.steps, ...workflow2.steps];
      const composed = await composer.composeSubworkflow('combined', allSteps);

      expect(composed.steps.length).toBe(4);
    });

    it('should use CONSTRUCT queries for composition', async () => {
      const steps = [createStep('step1'), createStep('step2', 'sparql', ['step1'])];
      const composed = await composer.composeSubworkflow('test', steps);

      expect(composed.sparqlQuery).toBeDefined();
      expect(composed.sparqlQuery.toUpperCase()).toContain('CONSTRUCT');
    });

    it('should include all step properties in composition', async () => {
      const step = {
        ...createStep('step1'),
        config: {
          query: 'SELECT * WHERE { ?s ?p ?o }',
          customProp: 'value',
        },
        metadata: {
          duration: 1000,
          complexity: 'high',
        },
      };

      const composed = await composer.composeSubworkflow('test', [step]);

      expect(composed.ttl).toContain('step1');
      expect(composed.ttl).toMatch(/SELECT.*WHERE/);
    });
  });

  describe('Test 6: Optimization Suggestions', () => {
    it('should suggest parallelization for independent branches', async () => {
      const workflow = createSimpleWorkflow([
        createStep('start'),
        createStep('left', 'sparql', ['start']),
        createStep('right', 'sparql', ['start']),
        createStep('merge', 'sparql', ['left', 'right']),
      ]);

      const suggestions = await optimizer.suggestOptimizations(workflow);

      expect(suggestions).toBeDefined();
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.type === 'parallelization')).toBe(true);
    });

    it('should suggest caching for repeated patterns', async () => {
      const workflow = createSimpleWorkflow([
        createStep('step1', 'sparql', [], 5000),
        createStep('step2', 'sparql', ['step1']),
        createStep('step3', 'sparql', ['step1']),
      ]);

      const suggestions = await optimizer.suggestOptimizations(workflow);

      expect(suggestions.some(s => s.type === 'caching')).toBe(true);
    });

    it('should suggest optimization of bottleneck steps', async () => {
      const workflow = createSimpleWorkflow([
        createStep('step1', 'sparql', [], 1000),
        createStep('bottleneck', 'sparql', ['step1'], 15000),
        createStep('step3', 'sparql', ['bottleneck'], 1000),
      ]);

      const suggestions = await optimizer.suggestOptimizations(workflow);

      expect(suggestions.some(s => s.targetStep.includes('bottleneck'))).toBe(true);
    });

    it('should ensure suggestions are sensible and applicable', async () => {
      const workflow = createComplexWorkflow(20);
      const suggestions = await optimizer.suggestOptimizations(workflow);

      suggestions.forEach(suggestion => {
        expect(suggestion.type).toBeDefined();
        expect(['parallelization', 'caching', 'optimization', 'restructuring']).toContain(suggestion.type);
        expect(suggestion.description).toBeDefined();
        expect(suggestion.targetStep).toBeDefined();
        expect(suggestion.estimatedSavings).toBeGreaterThanOrEqual(0);
      });
    });

    it('should prioritize suggestions by potential impact', async () => {
      const workflow = createSimpleWorkflow([
        createStep('step1', 'sparql', [], 1000),
        createStep('step2', 'sparql', ['step1'], 10000),
        createStep('step3', 'sparql', ['step2'], 1000),
      ]);

      const suggestions = await optimizer.suggestOptimizations(workflow);

      expect(suggestions[0].estimatedSavings).toBeGreaterThanOrEqual(suggestions[1]?.estimatedSavings || 0);
    });
  });

  describe('Test 7: Performance Benchmarks', () => {
    it('should optimize workflow in <100ms', async () => {
      const workflow = createComplexWorkflow(50);
      const startTime = performance.now();

      await optimizer.optimizeWorkflow(workflow);

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(100);
    });

    it('should analyze critical path in <100ms', async () => {
      const workflow = createComplexWorkflow(50);
      const startTime = performance.now();

      await cpAnalyzer.analyzePerformance(workflow);

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(100);
    });

    it('should compose workflow in <100ms', async () => {
      const workflow = createComplexWorkflow(50);
      const startTime = performance.now();

      await composer.composeSubworkflow('perf-test', workflow.steps);

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(100);
    });

    it('should provide suggestions in <100ms', async () => {
      const workflow = createComplexWorkflow(50);
      const startTime = performance.now();

      await optimizer.suggestOptimizations(workflow);

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Test 8: Complex Workflows (100+ steps)', () => {
    it('should handle workflow with 100+ steps', async () => {
      const workflow = createComplexWorkflow(100);

      const result = await optimizer.optimizeWorkflow(workflow);

      expect(result).toBeDefined();
      expect(result.parallelBatches).toBeDefined();
      expect(result.parallelBatches.length).toBeGreaterThan(0);
    });

    it('should correctly identify critical path in large workflow', async () => {
      const workflow = createComplexWorkflow(100);

      const analysis = await cpAnalyzer.analyzePerformance(workflow);

      expect(analysis.criticalPath).toBeDefined();
      expect(analysis.criticalPath.length).toBeGreaterThan(0);
      expect(analysis.estimatedDuration).toBeGreaterThan(0);
    });

    it('should maintain performance with 100+ step workflows', async () => {
      const workflow = createComplexWorkflow(100);
      const startTime = performance.now();

      await optimizer.optimizeWorkflow(workflow);
      await cpAnalyzer.analyzePerformance(workflow);

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(200); // <200ms for both operations
    });

    it('should compose large workflows correctly', async () => {
      const workflow = createComplexWorkflow(50);

      const composed = await composer.composeSubworkflow('large-workflow', workflow.steps);

      expect(composed.steps.length).toBe(50);
      expect(composed.ttl).toBeDefined();
    });

    it('should provide valid optimization suggestions for large workflows', async () => {
      const workflow = createComplexWorkflow(75);

      const suggestions = await optimizer.suggestOptimizations(workflow);

      expect(suggestions.length).toBeGreaterThan(0);
      suggestions.forEach(s => {
        expect(s.type).toBeDefined();
        expect(s.estimatedSavings).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should integrate with existing WorkflowExecutor API', async () => {
      const workflow = createSimpleWorkflow([
        createStep('step1'),
        createStep('step2', 'sparql', ['step1']),
      ]);

      const optimization = await optimizer.optimizeWorkflow(workflow);

      // Should maintain backward compatibility
      expect(optimization.parallelBatches).toBeDefined();
      expect(optimization.originalWorkflow).toEqual(workflow);
    });

    it('should work with existing DAGPlanner output', async () => {
      const steps = [
        { id: 'http://example.org/step1', type: 'sparql', dependsOn: [] },
        { id: 'http://example.org/step2', type: 'sparql', dependsOn: ['http://example.org/step1'] },
      ];

      const workflow = createSimpleWorkflow(steps);
      const result = await optimizer.optimizeWorkflow(workflow);

      expect(result.parallelBatches).toBeDefined();
    });

    it('should maintain no breaking changes to workflow API', async () => {
      const workflow = createSimpleWorkflow([createStep('step1')]);

      // All three operations should work without API changes
      const optResult = await optimizer.optimizeWorkflow(workflow);
      const cpResult = await cpAnalyzer.analyzePerformance(workflow);
      const compResult = await composer.composeSubworkflow('test', workflow.steps);

      expect(optResult).toBeDefined();
      expect(cpResult).toBeDefined();
      expect(compResult).toBeDefined();
    });
  });
});
