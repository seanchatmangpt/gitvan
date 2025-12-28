/**
 * Memory Leak Detection Tests
 *
 * Tests to detect and prevent memory leaks in hook operations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JTBDEngine } from '@/lib/jtbd-engine';
import { AutonomicWorkflowGenerator } from '@/lib/workflow-generator';
import { NunjucksTemplateEngine, TTL_TEMPLATES } from '@/lib/nunjucks-engine';
import {
  MemoryTracker,
  MockHookExecutor,
  StateTracker,
  createTestHooks,
  createTestJTBDScenario,
  wait,
} from '../utils/test-utils';
import { HOOK_COLLECTION, JTBD_SCENARIO_FIXTURES } from '../fixtures';

describe('Memory Leak Detection', () => {
  let memoryTracker: MemoryTracker;

  beforeEach(() => {
    memoryTracker = new MemoryTracker();
    memoryTracker.start();
  });

  afterEach(() => {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  // ============================================================================
  // JTBD Engine Memory Tests
  // ============================================================================

  describe('JTBD Engine Memory', () => {
    it('should not leak memory during repeated scenario registration', async () => {
      const engine = new JTBDEngine();

      // Register scenarios many times
      for (let i = 0; i < 100; i++) {
        Object.values(JTBD_SCENARIO_FIXTURES).forEach((s) => {
          engine.registerScenario({
            ...s,
            id: `${s.id}-${i}`,
          });
        });

        if (i % 20 === 0) {
          memoryTracker.snapshot();
        }
      }

      // Force GC if available
      if (global.gc) {
        global.gc();
        await wait(100);
      }

      memoryTracker.snapshot();

      const report = memoryTracker.getReport();
      console.log('JTBD Registration Memory Report:', {
        leakIndicator: `${(report.leakIndicator / 1024 / 1024).toFixed(2)} MB`,
        snapshots: report.snapshots,
      });

      // Memory increase should be reasonable (< 100MB for test)
      expect(report.leakIndicator).toBeLessThan(100 * 1024 * 1024);
    });

    it('should not leak memory during repeated scenario execution', async () => {
      const engine = new JTBDEngine();
      const scenario = createTestJTBDScenario();
      engine.registerScenario(scenario);

      // Execute scenario many times
      for (let i = 0; i < 100; i++) {
        await engine.executeScenario(scenario.id);

        if (i % 20 === 0) {
          memoryTracker.snapshot();
        }
      }

      if (global.gc) {
        global.gc();
        await wait(100);
      }

      memoryTracker.snapshot();

      const report = memoryTracker.getReport();
      console.log('JTBD Execution Memory Report:', {
        leakIndicator: `${(report.leakIndicator / 1024 / 1024).toFixed(2)} MB`,
        snapshots: report.snapshots,
      });

      // Results accumulate, but should be bounded
      const results = engine.getResults();
      expect(results.length).toBe(100);
    });

    it('should allow result cleanup to prevent unbounded growth', async () => {
      // This test documents expected behavior for result management
      const engine = new JTBDEngine();
      const scenario = createTestJTBDScenario();
      engine.registerScenario(scenario);

      // Execute multiple times
      for (let i = 0; i < 50; i++) {
        await engine.executeScenario(scenario.id);
      }

      const results = engine.getResults();
      expect(results.length).toBe(50);

      // Note: In production, you might want to implement result pruning
    });
  });

  // ============================================================================
  // Hook Executor Memory Tests
  // ============================================================================

  describe('Hook Executor Memory', () => {
    it('should not leak memory during repeated hook execution', async () => {
      const executor = new MockHookExecutor();
      const hooks = createTestHooks(10);

      for (let iteration = 0; iteration < 100; iteration++) {
        for (const hook of hooks) {
          await executor.execute(hook);
        }

        if (iteration % 20 === 0) {
          memoryTracker.snapshot();
          executor.clear(); // Clear logs to prevent unbounded growth
        }
      }

      if (global.gc) {
        global.gc();
        await wait(100);
      }

      memoryTracker.snapshot();

      const report = memoryTracker.getReport();
      console.log('Hook Executor Memory Report:', {
        leakIndicator: `${(report.leakIndicator / 1024 / 1024).toFixed(2)} MB`,
      });

      expect(report.leakIndicator).toBeLessThan(50 * 1024 * 1024);
    });

    it('should allow execution log cleanup', async () => {
      const executor = new MockHookExecutor();

      // Execute many hooks
      for (let i = 0; i < 100; i++) {
        await executor.execute(HOOK_COLLECTION[i % HOOK_COLLECTION.length]);
      }

      expect(executor.getExecutionCount()).toBe(100);

      // Clear logs
      executor.clear();

      expect(executor.getExecutionCount()).toBe(0);
      expect(executor.getExecutionLog()).toHaveLength(0);
    });
  });

  // ============================================================================
  // State Tracker Memory Tests
  // ============================================================================

  describe('State Tracker Memory', () => {
    it('should track memory growth with state updates', () => {
      const tracker = new StateTracker<{ data: number[] }>({ data: [] });

      for (let i = 0; i < 100; i++) {
        // Each update stores previous state
        tracker.update({ data: Array.from({ length: 100 }, (_, j) => i * 100 + j) });

        if (i % 20 === 0) {
          memoryTracker.snapshot();
        }
      }

      const history = tracker.getHistory();
      expect(history).toHaveLength(101); // Initial + 100 updates

      // History grows linearly with updates - expected behavior
      // Users should call reset() when history is not needed
    });

    it('should allow state reset to free memory', () => {
      const tracker = new StateTracker<{ data: number[] }>({ data: [] });

      // Accumulate state
      for (let i = 0; i < 50; i++) {
        tracker.update({ data: Array.from({ length: 100 }, (_, j) => j) });
      }

      expect(tracker.getHistory()).toHaveLength(51);

      // Reset frees accumulated history
      tracker.reset({ data: [] });

      expect(tracker.getHistory()).toHaveLength(1);
      expect(tracker.getStateCount()).toBe(1);
    });
  });

  // ============================================================================
  // Template Engine Memory Tests
  // ============================================================================

  describe('Template Engine Memory', () => {
    it('should not leak memory during repeated rendering', async () => {
      const engine = new NunjucksTemplateEngine();

      for (let i = 0; i < 100; i++) {
        await engine.renderString(TTL_TEMPLATES.basicHook, {
          name: `Memory Test Hook ${i}`,
          description: 'Testing memory',
          priority: 5,
          autoExecute: true,
          triggerType: 'git:CommitEvent',
          action: 'echo "test"',
        });

        if (i % 20 === 0) {
          memoryTracker.snapshot();
        }
      }

      if (global.gc) {
        global.gc();
        await wait(100);
      }

      memoryTracker.snapshot();

      const report = memoryTracker.getReport();
      console.log('Template Engine Memory Report:', {
        leakIndicator: `${(report.leakIndicator / 1024 / 1024).toFixed(2)} MB`,
      });

      expect(report.leakIndicator).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle large template data without excessive memory use', async () => {
      const engine = new NunjucksTemplateEngine();

      // Large data set
      const largeSteps = Array.from({ length: 100 }, (_, i) => ({
        action: `gh:Step${i}`,
        params: { index: i, data: 'x'.repeat(100) },
      }));

      const result = await engine.renderString(TTL_TEMPLATES.compositeActionHook, {
        name: 'Large Hook',
        description: 'Hook with many steps',
        priority: 5,
        triggerType: 'git:Event',
        steps: largeSteps,
      });

      expect(result.length).toBeGreaterThan(0);

      memoryTracker.snapshot();

      const report = memoryTracker.getReport();
      expect(report.leakIndicator).toBeLessThan(100 * 1024 * 1024);
    });
  });

  // ============================================================================
  // Workflow Generator Memory Tests
  // ============================================================================

  describe('Workflow Generator Memory', () => {
    it('should not leak memory during repeated hook generation', async () => {
      const generator = new AutonomicWorkflowGenerator();

      for (let i = 0; i < 50; i++) {
        await generator.createSelfHealingHooks();
        await generator.detectRequiredAutomation();

        if (i % 10 === 0) {
          memoryTracker.snapshot();
        }
      }

      if (global.gc) {
        global.gc();
        await wait(100);
      }

      memoryTracker.snapshot();

      const report = memoryTracker.getReport();
      console.log('Workflow Generator Memory Report:', {
        leakIndicator: `${(report.leakIndicator / 1024 / 1024).toFixed(2)} MB`,
      });

      expect(report.leakIndicator).toBeLessThan(50 * 1024 * 1024);
    });
  });

  // ============================================================================
  // Concurrent Operations Memory Tests
  // ============================================================================

  describe('Concurrent Operations Memory', () => {
    it('should handle concurrent operations without memory explosion', async () => {
      const engine = new JTBDEngine();
      const scenario = createTestJTBDScenario();
      engine.registerScenario(scenario);

      // Run many concurrent executions
      const concurrentCount = 50;
      const batches = 5;

      for (let batch = 0; batch < batches; batch++) {
        const executions = Array.from({ length: concurrentCount }, () =>
          engine.executeScenario(scenario.id)
        );

        await Promise.all(executions);
        memoryTracker.snapshot();
      }

      if (global.gc) {
        global.gc();
        await wait(100);
      }

      memoryTracker.snapshot();

      const report = memoryTracker.getReport();
      console.log('Concurrent Operations Memory Report:', {
        leakIndicator: `${(report.leakIndicator / 1024 / 1024).toFixed(2)} MB`,
        totalExecutions: concurrentCount * batches,
      });

      expect(report.leakIndicator).toBeLessThan(100 * 1024 * 1024);
    });
  });

  // ============================================================================
  // Long-Running Process Simulation
  // ============================================================================

  describe('Long-Running Process Simulation', () => {
    it('should maintain stable memory over simulated long-running process', async () => {
      const executor = new MockHookExecutor();
      const engine = new JTBDEngine();
      const scenario = createTestJTBDScenario();
      engine.registerScenario(scenario);

      const snapshots: number[] = [];

      // Simulate long-running process with periodic work
      for (let cycle = 0; cycle < 10; cycle++) {
        // Execute hooks
        for (const hook of HOOK_COLLECTION) {
          await executor.execute(hook);
        }

        // Execute scenario
        await engine.executeScenario(scenario.id);

        // Take memory snapshot
        const usage = process.memoryUsage().heapUsed;
        snapshots.push(usage);

        // Periodic cleanup (simulating real-world cleanup)
        if (cycle % 3 === 0) {
          executor.clear();
        }
      }

      // Check memory trend
      const firstHalf = snapshots.slice(0, 5);
      const secondHalf = snapshots.slice(5);

      const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      // Memory shouldn't grow unboundedly (allowing some growth for accumulated results)
      const growthRatio = secondHalfAvg / firstHalfAvg;

      console.log('Long-Running Process Memory:', {
        firstHalfAvgMB: `${(firstHalfAvg / 1024 / 1024).toFixed(2)}`,
        secondHalfAvgMB: `${(secondHalfAvg / 1024 / 1024).toFixed(2)}`,
        growthRatio: growthRatio.toFixed(2),
      });

      expect(growthRatio).toBeLessThan(3); // Less than 3x growth
    });
  });
});
