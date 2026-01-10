/**
 * Tests for composable registry
 * Tests registration, discovery, dependency resolution, and metrics
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ComposableRegistry,
  getComposableRegistry,
  resetComposableRegistry,
} from '../src/composables/composableRegistry.mjs';

describe('ComposableRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new ComposableRegistry();
  });

  afterEach(() => {
    registry.reset();
  });

  describe('Registration', () => {
    it('should register a composable', () => {
      const result = registry.register('useTest', () => 'test');

      expect(result.success).toBe(true);
      expect(result.name).toBe('useTest');
      expect(result.registered).toBeDefined();
    });

    it('should throw error without name', () => {
      expect(() => {
        registry.register(null, () => 'test');
      }).toThrow('Composable name must be a non-empty string');
    });

    it('should throw error without composable', () => {
      expect(() => {
        registry.register('useTest', null);
      }).toThrow('Composable must be defined');
    });

    it('should register with metadata', () => {
      registry.register('useTest', () => 'test', {
        category: 'utility',
        tags: ['logging'],
      });

      const entry = registry.composables.get('useTest');
      expect(entry.metadata.category).toBe('utility');
      expect(entry.metadata.tags).toEqual(['logging']);
    });
  });

  describe('Retrieval', () => {
    beforeEach(() => {
      registry.register('useTest1', () => 'test1');
      registry.register('useTest2', () => 'test2');
    });

    it('should get a registered composable', () => {
      const composable = registry.get('useTest1');
      expect(composable).toBeDefined();
    });

    it('should return undefined for non-existent composable', () => {
      const composable = registry.get('nonExistent');
      expect(composable).toBeUndefined();
    });

    it('should check if composable exists', () => {
      expect(registry.has('useTest1')).toBe(true);
      expect(registry.has('nonExistent')).toBe(false);
    });

    it('should list all composables', () => {
      const list = registry.list();
      expect(list).toContain('useTest1');
      expect(list).toContain('useTest2');
      expect(list.length).toBe(2);
    });

    it('should list all composables with metadata', () => {
      const list = registry.listWithMetadata();
      expect(list.length).toBe(2);
      expect(list[0].name).toBeDefined();
      expect(list[0].metadata).toBeDefined();
      expect(list[0].metrics).toBeDefined();
    });
  });

  describe('Dependencies', () => {
    beforeEach(() => {
      registry.register('useGit', () => 'git');
      registry.register('useLog', () => 'log');
      registry.register('useJob', () => 'job');
    });

    it('should register dependency', () => {
      registry.registerDependency('useJob', 'useGit');
      registry.registerDependency('useJob', 'useLog');

      const deps = registry.getDependencies('useJob');
      expect(deps).toContain('useGit');
      expect(deps).toContain('useLog');
    });

    it('should not duplicate dependencies', () => {
      registry.registerDependency('useJob', 'useGit');
      registry.registerDependency('useJob', 'useGit');

      const deps = registry.getDependencies('useJob');
      expect(deps.filter((d) => d === 'useGit').length).toBe(1);
    });

    it('should return empty array for no dependencies', () => {
      const deps = registry.getDependencies('useGit');
      expect(deps).toEqual([]);
    });
  });

  describe('Dependency Resolution', () => {
    beforeEach(() => {
      registry.register('useGit', () => 'git');
      registry.register('useLog', () => 'log');
      registry.register('useJob', () => 'job');
      registry.register('useEvent', () => 'event');

      // Setup dependency graph:
      // useEvent -> useJob -> useGit
      //         \-> useLog
      registry.registerDependency('useJob', 'useGit');
      registry.registerDependency('useJob', 'useLog');
      registry.registerDependency('useEvent', 'useJob');
    });

    it('should resolve dependencies in correct order', () => {
      // Resolve with all items including dependencies
      const resolved = registry.resolveDependencies([
        'useGit',
        'useLog',
        'useJob',
        'useEvent',
      ]);

      // useJob should come before useEvent
      const jobIndex = resolved.indexOf('useJob');
      const eventIndex = resolved.indexOf('useEvent');
      expect(jobIndex).toBeLessThan(eventIndex);

      // All should be included
      expect(resolved.length).toBe(4);
    });

    it('should detect circular dependencies', () => {
      // Create a cycle: useJob -> useGit, useGit -> useJob
      registry.registerDependency('useGit', 'useJob');

      expect(() => {
        registry.resolveDependencies(['useJob', 'useGit']);
      }).toThrow('Circular dependency detected');
    });

    it('should handle multiple root dependencies', () => {
      const resolved = registry.resolveDependencies([
        'useEvent',
        'useLog',
        'useGit',
      ]);

      expect(resolved).toContain('useEvent');
      expect(resolved).toContain('useLog');
      expect(resolved).toContain('useGit');
    });
  });

  describe('Metrics', () => {
    beforeEach(() => {
      registry.register('useTest', () => 'test');
    });

    it('should record usage metrics', () => {
      registry.recordUsage('useTest', 50);
      registry.recordUsage('useTest', 100);

      const metrics = registry.getMetrics('useTest');

      expect(metrics.calls).toBe(2);
      expect(metrics.totalTime).toBe(150);
      expect(metrics.averageTime).toBe(75);
      expect(metrics.errorRate).toBe(0);
    });

    it('should track errors in metrics', () => {
      registry.recordUsage('useTest', 50, false);
      registry.recordUsage('useTest', 100, true);

      const metrics = registry.getMetrics('useTest');

      expect(metrics.calls).toBe(2);
      expect(metrics.errors).toBe(1);
      expect(metrics.errorRate).toBe(50);
    });

    it('should return null for non-existent composable metrics', () => {
      const metrics = registry.getMetrics('nonExistent');
      expect(metrics).toBeNull();
    });

    it('should get all metrics', () => {
      registry.register('useTest2', () => 'test2');

      registry.recordUsage('useTest', 100);
      registry.recordUsage('useTest2', 200);

      const allMetrics = registry.getAllMetrics();

      expect(allMetrics.useTest).toBeDefined();
      expect(allMetrics.useTest2).toBeDefined();
      expect(allMetrics.useTest.totalTime).toBe(100);
      expect(allMetrics.useTest2.totalTime).toBe(200);
    });

    it('should clear metrics', () => {
      registry.recordUsage('useTest', 100);
      registry.clearMetrics();

      const metrics = registry.getMetrics('useTest');
      expect(metrics.calls).toBe(0);
      expect(metrics.totalTime).toBe(0);
    });

    it('should update metadata when recording usage', () => {
      registry.recordUsage('useTest', 100);
      registry.recordUsage('useTest', 200);

      const entry = registry.composables.get('useTest');
      expect(entry.metadata.usageCount).toBe(2);
      expect(entry.metadata.totalExecutionTime).toBe(300);
      expect(entry.metadata.averageExecutionTime).toBe(150);
    });
  });

  describe('Performance History', () => {
    beforeEach(() => {
      registry.register('useTest', () => 'test');
    });

    it('should track performance history', () => {
      registry.recordUsage('useTest', 50);
      registry.recordUsage('useTest', 100);

      const entry = registry.composables.get('useTest');
      expect(entry.performanceHistory.length).toBe(2);
      expect(entry.performanceHistory[0].duration).toBe(50);
      expect(entry.performanceHistory[1].duration).toBe(100);
    });

    it('should limit history to 100 samples', () => {
      for (let i = 0; i < 150; i++) {
        registry.recordUsage('useTest', i);
      }

      const entry = registry.composables.get('useTest');
      expect(entry.performanceHistory.length).toBe(100);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      registry.register('useTest1', () => 'test1');
      registry.register('useTest2', () => 'test2');

      registry.recordUsage('useTest1', 100);
      registry.recordUsage('useTest1', 200);
      registry.recordUsage('useTest2', 300);
    });

    it('should calculate registry statistics', () => {
      const stats = registry.getStats();

      expect(stats.registeredCount).toBe(2);
      expect(stats.totalCalls).toBe(3);
      expect(stats.totalTime).toBe(600);
      expect(stats.averageCallTime).toBe(200);
    });

    it('should calculate error rate in statistics', () => {
      registry.recordUsage('useTest1', 100, true);

      const stats = registry.getStats();
      expect(stats.totalErrors).toBe(1);
      expect(stats.errorRate).toBeCloseTo(25, 1);
    });
  });

  describe('Reset', () => {
    beforeEach(() => {
      registry.register('useTest', () => 'test');
      registry.recordUsage('useTest', 100);
    });

    it('should clear all registrations', () => {
      registry.reset();
      expect(registry.list().length).toBe(0);
    });

    it('should clear all metrics', () => {
      registry.reset();
      const metrics = registry.getMetrics('useTest');
      expect(metrics).toBeNull();
    });

    it('should clear all dependencies', () => {
      registry.registerDependency('useTest', 'other');
      registry.reset();
      const deps = registry.getDependencies('useTest');
      expect(deps).toEqual([]);
    });
  });

  describe('Global Singleton', () => {
    afterEach(() => {
      resetComposableRegistry();
    });

    it('should get or create global registry', () => {
      const reg1 = getComposableRegistry();
      const reg2 = getComposableRegistry();

      expect(reg1).toBe(reg2);
    });

    it('should reset global registry', () => {
      const reg = getComposableRegistry();
      reg.register('useTest', () => 'test');

      expect(reg.has('useTest')).toBe(true);

      resetComposableRegistry();

      const reg2 = getComposableRegistry();
      expect(reg2.has('useTest')).toBe(false);
    });

    it('should accept options during creation', () => {
      resetComposableRegistry();
      const reg = getComposableRegistry({ maxCacheSize: 50 });

      expect(reg.options.maxCacheSize).toBe(50);
    });
  });

  describe('Discovery', () => {
    it('should attempt to discover composables', async () => {
      // This will likely return empty or limited results in test environment
      const discovered = await registry.discover();

      expect(Array.isArray(discovered)).toBe(true);
    });
  });
});
