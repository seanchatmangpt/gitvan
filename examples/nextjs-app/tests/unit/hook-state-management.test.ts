/**
 * Unit Tests - Hook State Management
 *
 * Tests for hook composition, state tracking, and dependency management.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createTestHook,
  createTestHooks,
  StateTracker,
  MockHookExecutor,
  buildDependencyGraph,
  validateDependencyOrder,
  measureExecutionTime,
  runBenchmark,
} from '../utils/test-utils';
import { HOOK_FIXTURES, HOOK_COLLECTION } from '../fixtures';
import type { Hook } from '@/lib/workflow-generator';

// ============================================================================
// State Tracker Tests
// ============================================================================

describe('StateTracker', () => {
  describe('initialization', () => {
    it('should initialize with initial value', () => {
      const tracker = new StateTracker({ count: 0 });
      expect(tracker.getCurrent()).toEqual({ count: 0 });
    });

    it('should have null previous value initially', () => {
      const tracker = new StateTracker('initial');
      expect(tracker.getPrevious()).toBeNull();
    });

    it('should have history with initial value', () => {
      const tracker = new StateTracker(42);
      expect(tracker.getHistory()).toEqual([42]);
    });

    it('should have state count of 1 initially', () => {
      const tracker = new StateTracker({});
      expect(tracker.getStateCount()).toBe(1);
    });
  });

  describe('update', () => {
    it('should update current value', () => {
      const tracker = new StateTracker(0);
      tracker.update(1);
      expect(tracker.getCurrent()).toBe(1);
    });

    it('should preserve previous value', () => {
      const tracker = new StateTracker(0);
      tracker.update(1);
      expect(tracker.getPrevious()).toBe(0);
    });

    it('should append to history', () => {
      const tracker = new StateTracker(0);
      tracker.update(1);
      tracker.update(2);
      expect(tracker.getHistory()).toEqual([0, 1, 2]);
    });

    it('should increment state count', () => {
      const tracker = new StateTracker(0);
      tracker.update(1);
      tracker.update(2);
      expect(tracker.getStateCount()).toBe(3);
    });

    it('should handle complex objects', () => {
      const tracker = new StateTracker({ a: 1, b: { c: 2 } });
      tracker.update({ a: 2, b: { c: 3 } });

      expect(tracker.getCurrent()).toEqual({ a: 2, b: { c: 3 } });
      expect(tracker.getPrevious()).toEqual({ a: 1, b: { c: 2 } });
    });

    it('should handle arrays', () => {
      const tracker = new StateTracker<number[]>([1, 2, 3]);
      tracker.update([4, 5, 6]);

      expect(tracker.getCurrent()).toEqual([4, 5, 6]);
      expect(tracker.getPrevious()).toEqual([1, 2, 3]);
    });
  });

  describe('reset', () => {
    it('should reset to new initial value', () => {
      const tracker = new StateTracker(0);
      tracker.update(1);
      tracker.update(2);
      tracker.reset(100);

      expect(tracker.getCurrent()).toBe(100);
      expect(tracker.getPrevious()).toBeNull();
      expect(tracker.getHistory()).toEqual([100]);
      expect(tracker.getStateCount()).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle null values', () => {
      const tracker = new StateTracker<string | null>('initial');
      tracker.update(null);

      expect(tracker.getCurrent()).toBeNull();
      expect(tracker.getPrevious()).toBe('initial');
    });

    it('should handle undefined values', () => {
      const tracker = new StateTracker<string | undefined>('initial');
      tracker.update(undefined);

      expect(tracker.getCurrent()).toBeUndefined();
    });

    it('should handle rapid updates', () => {
      const tracker = new StateTracker(0);
      for (let i = 1; i <= 100; i++) {
        tracker.update(i);
      }

      expect(tracker.getCurrent()).toBe(100);
      expect(tracker.getHistory()).toHaveLength(101);
    });
  });
});

// ============================================================================
// Mock Hook Executor Tests
// ============================================================================

describe('MockHookExecutor', () => {
  let executor: MockHookExecutor;

  beforeEach(() => {
    executor = new MockHookExecutor();
  });

  describe('execute', () => {
    it('should execute hook successfully by default', async () => {
      const hook = createTestHook();
      const result = await executor.execute(hook);

      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should record execution in log', async () => {
      const hook = createTestHook({ name: 'test-hook' });
      await executor.execute(hook);

      const log = executor.getExecutionLog();
      expect(log).toHaveLength(1);
      expect(log[0].hook.name).toBe('test-hook');
      expect(log[0].result).toBe(true);
    });

    it('should record timestamp for each execution', async () => {
      const hook = createTestHook();
      await executor.execute(hook);

      const log = executor.getExecutionLog();
      expect(log[0].timestamp).toBeInstanceOf(Date);
    });
  });

  describe('setDelay', () => {
    it('should add delay to execution', async () => {
      executor.setDelay(50);
      const hook = createTestHook();

      const result = await executor.execute(hook);

      expect(result.duration).toBeGreaterThanOrEqual(50);
    });

    it('should allow resetting delay', async () => {
      executor.setDelay(100);
      executor.setDelay(0);

      const hook = createTestHook();
      const result = await executor.execute(hook);

      expect(result.duration).toBeLessThan(50);
    });
  });

  describe('setShouldFail', () => {
    it('should cause executions to fail', async () => {
      executor.setShouldFail(true);
      const hook = createTestHook();

      const result = await executor.execute(hook);

      expect(result.success).toBe(false);
    });

    it('should record failures in log', async () => {
      executor.setShouldFail(true);
      const hook = createTestHook();
      await executor.execute(hook);

      const log = executor.getExecutionLog();
      expect(log[0].result).toBe(false);
    });

    it('should allow toggling back to success', async () => {
      executor.setShouldFail(true);
      executor.setShouldFail(false);

      const hook = createTestHook();
      const result = await executor.execute(hook);

      expect(result.success).toBe(true);
    });
  });

  describe('getExecutionCount', () => {
    it('should return 0 initially', () => {
      expect(executor.getExecutionCount()).toBe(0);
    });

    it('should count executions', async () => {
      const hooks = createTestHooks(5);
      for (const hook of hooks) {
        await executor.execute(hook);
      }

      expect(executor.getExecutionCount()).toBe(5);
    });
  });

  describe('clear', () => {
    it('should clear execution log', async () => {
      const hook = createTestHook();
      await executor.execute(hook);
      executor.clear();

      expect(executor.getExecutionLog()).toHaveLength(0);
      expect(executor.getExecutionCount()).toBe(0);
    });
  });

  describe('concurrent executions', () => {
    it('should handle concurrent executions', async () => {
      const hooks = createTestHooks(10);
      const promises = hooks.map((h) => executor.execute(h));

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(executor.getExecutionCount()).toBe(10);
    });
  });
});

// ============================================================================
// Dependency Graph Tests
// ============================================================================

describe('Dependency Graph', () => {
  describe('buildDependencyGraph', () => {
    it('should create graph from hooks', () => {
      const hooks = createTestHooks(3);
      const graph = buildDependencyGraph(hooks);

      expect(graph.size).toBe(3);
    });

    it('should assign correct execution order', () => {
      const hooks = createTestHooks(3);
      const graph = buildDependencyGraph(hooks);

      let order = 0;
      hooks.forEach((hook) => {
        const dep = graph.get(hook.name);
        expect(dep?.executionOrder).toBe(order);
        order++;
      });
    });

    it('should initialize empty dependency arrays', () => {
      const hooks = createTestHooks(1);
      const graph = buildDependencyGraph(hooks);

      const dep = graph.get(hooks[0].name);
      expect(dep?.dependsOn).toHaveLength(0);
      expect(dep?.dependedBy).toHaveLength(0);
    });

    it('should handle empty hooks array', () => {
      const graph = buildDependencyGraph([]);
      expect(graph.size).toBe(0);
    });
  });

  describe('validateDependencyOrder', () => {
    it('should validate correct order', () => {
      const hooks = createTestHooks(3);
      const graph = buildDependencyGraph(hooks);
      const order = hooks.map((h) => h.name);

      expect(validateDependencyOrder(graph, order)).toBe(true);
    });

    it('should validate reverse order (no dependencies)', () => {
      const hooks = createTestHooks(3);
      const graph = buildDependencyGraph(hooks);
      const order = hooks.map((h) => h.name).reverse();

      // With no dependencies, any order is valid
      expect(validateDependencyOrder(graph, order)).toBe(true);
    });

    it('should fail for unknown hook', () => {
      const hooks = createTestHooks(2);
      const graph = buildDependencyGraph(hooks);
      const order = ['unknown-hook'];

      expect(validateDependencyOrder(graph, order)).toBe(false);
    });

    it('should handle empty execution order', () => {
      const hooks = createTestHooks(2);
      const graph = buildDependencyGraph(hooks);

      expect(validateDependencyOrder(graph, [])).toBe(true);
    });

    it('should validate with dependencies', () => {
      const hooks = createTestHooks(3);
      const graph = buildDependencyGraph(hooks);

      // Add dependency: hook-2 depends on hook-1
      const dep2 = graph.get('test-hook-2');
      if (dep2) {
        dep2.dependsOn = ['test-hook-1'];
      }

      // Valid order: hook-1 before hook-2
      expect(validateDependencyOrder(graph, ['test-hook-1', 'test-hook-2', 'test-hook-3'])).toBe(true);

      // Invalid order: hook-2 before hook-1
      expect(validateDependencyOrder(graph, ['test-hook-2', 'test-hook-1', 'test-hook-3'])).toBe(false);
    });
  });
});

// ============================================================================
// Hook Composition Tests
// ============================================================================

describe('Hook Composition', () => {
  describe('combining hooks', () => {
    it('should combine hooks by priority', () => {
      const hooks = [
        createTestHook({ name: 'low', priority: 3 }),
        createTestHook({ name: 'high', priority: 9 }),
        createTestHook({ name: 'medium', priority: 6 }),
      ];

      const sorted = [...hooks].sort((a, b) => b.priority - a.priority);

      expect(sorted[0].name).toBe('high');
      expect(sorted[1].name).toBe('medium');
      expect(sorted[2].name).toBe('low');
    });

    it('should group hooks by trigger', () => {
      const hooks = [
        createTestHook({ name: 'commit1', trigger: 'CommitEvent' }),
        createTestHook({ name: 'push1', trigger: 'PushEvent' }),
        createTestHook({ name: 'commit2', trigger: 'CommitEvent' }),
      ];

      const grouped = hooks.reduce((acc, hook) => {
        const key = hook.trigger;
        if (!acc[key]) acc[key] = [];
        acc[key].push(hook);
        return acc;
      }, {} as Record<string, Hook[]>);

      expect(grouped['CommitEvent']).toHaveLength(2);
      expect(grouped['PushEvent']).toHaveLength(1);
    });

    it('should filter hooks by condition', () => {
      const hooks = [
        createTestHook({ name: 'auto', autoExecute: true }),
        createTestHook({ name: 'manual', autoExecute: false }),
        createTestHook({ name: 'auto2', autoExecute: true }),
      ];

      const autoHooks = hooks.filter((h) => h.autoExecute);
      expect(autoHooks).toHaveLength(2);
    });
  });

  describe('merging hook configurations', () => {
    it('should merge hook with defaults', () => {
      const defaults: Partial<Hook> = {
        priority: 5,
        autoExecute: true,
        ttl: '@prefix gh: <default#> .',
      };

      const hook = createTestHook({ name: 'custom', priority: 8 });
      const merged = { ...defaults, ...hook };

      expect(merged.priority).toBe(8); // Overridden
      expect(merged.autoExecute).toBe(true); // From hook
      expect(merged.ttl).toBe(hook.ttl); // From hook
    });
  });

  describe('transforming hooks', () => {
    it('should map hooks to execution tasks', () => {
      const hooks = createTestHooks(3);

      const tasks = hooks.map((hook) => ({
        id: `task-${hook.name}`,
        hookName: hook.name,
        priority: hook.priority,
        execute: async () => ({ success: true }),
      }));

      expect(tasks).toHaveLength(3);
      expect(tasks[0].id).toBe('task-test-hook-1');
    });

    it('should reduce hooks to statistics', () => {
      const hooks = [
        createTestHook({ priority: 3 }),
        createTestHook({ priority: 7 }),
        createTestHook({ priority: 5 }),
      ];

      const stats = hooks.reduce(
        (acc, hook) => ({
          total: acc.total + 1,
          sumPriority: acc.sumPriority + hook.priority,
          maxPriority: Math.max(acc.maxPriority, hook.priority),
          minPriority: Math.min(acc.minPriority, hook.priority),
        }),
        { total: 0, sumPriority: 0, maxPriority: 0, minPriority: Infinity }
      );

      expect(stats.total).toBe(3);
      expect(stats.sumPriority).toBe(15);
      expect(stats.maxPriority).toBe(7);
      expect(stats.minPriority).toBe(3);
    });
  });
});

// ============================================================================
// Execution Time Measurement Tests
// ============================================================================

describe('Performance Utilities', () => {
  describe('measureExecutionTime', () => {
    it('should measure sync function time', async () => {
      const { result, duration } = await measureExecutionTime(() => {
        let sum = 0;
        for (let i = 0; i < 10000; i++) sum += i;
        return sum;
      });

      expect(result).toBe(49995000);
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should measure async function time', async () => {
      const { result, duration } = await measureExecutionTime(async () => {
        await new Promise((r) => setTimeout(r, 20));
        return 'done';
      });

      expect(result).toBe('done');
      expect(duration).toBeGreaterThanOrEqual(20);
    });
  });

  describe('runBenchmark', () => {
    it('should run benchmark with iterations', async () => {
      const benchmark = await runBenchmark(
        'test-benchmark',
        () => {
          let x = 0;
          for (let i = 0; i < 100; i++) x += i;
          return x;
        },
        10
      );

      expect(benchmark.name).toBe('test-benchmark');
      expect(benchmark.iterations).toBe(10);
      expect(benchmark.totalTime).toBeGreaterThan(0);
      expect(benchmark.averageTime).toBe(benchmark.totalTime / 10);
      expect(benchmark.minTime).toBeLessThanOrEqual(benchmark.averageTime);
      expect(benchmark.maxTime).toBeGreaterThanOrEqual(benchmark.averageTime);
    });
  });
});

// ============================================================================
// Fixture Integration Tests
// ============================================================================

describe('Hook Fixtures Integration', () => {
  it('should all have valid structure', () => {
    Object.values(HOOK_FIXTURES).forEach((hook) => {
      expect(hook.name).toBeTruthy();
      expect(hook.trigger).toBeTruthy();
      expect(hook.priority).toBeGreaterThanOrEqual(1);
      expect(hook.priority).toBeLessThanOrEqual(10);
    });
  });

  it('should have unique names', () => {
    const names = Object.values(HOOK_FIXTURES).map((h) => h.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('should be usable with state tracker', () => {
    const tracker = new StateTracker(HOOK_FIXTURES.basicHook);
    tracker.update(HOOK_FIXTURES.enforcePatternHook);

    expect(tracker.getCurrent().name).toBe('enforce-semantic-commits');
    expect(tracker.getPrevious()?.name).toBe('basic-test-hook');
  });

  it('should be usable with mock executor', async () => {
    const executor = new MockHookExecutor();

    for (const hook of HOOK_COLLECTION) {
      await executor.execute(hook);
    }

    expect(executor.getExecutionCount()).toBe(HOOK_COLLECTION.length);
  });

  it('should work with dependency graph', () => {
    const graph = buildDependencyGraph(HOOK_COLLECTION);
    expect(graph.size).toBe(HOOK_COLLECTION.length);
  });
});
