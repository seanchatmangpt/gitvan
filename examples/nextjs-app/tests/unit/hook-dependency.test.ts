/**
 * Hook Dependency Tracking Tests
 *
 * Tests for hook dependency resolution, ordering, and cycle detection.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildDependencyGraph,
  validateDependencyOrder,
  createTestHook,
  createTestHooks,
} from '../utils/test-utils';
import { HOOK_COLLECTION, HOOK_FIXTURES } from '../fixtures';
import type { Hook } from '@/lib/workflow-generator';

// ============================================================================
// Types for Dependency Management
// ============================================================================

interface HookDependencyNode {
  hookId: string;
  hook: Hook;
  dependsOn: string[];
  dependedBy: string[];
  executionOrder: number;
  resolved: boolean;
}

interface DependencyGraph {
  nodes: Map<string, HookDependencyNode>;
  edges: Array<{ from: string; to: string }>;
}

// ============================================================================
// Dependency Graph Builder
// ============================================================================

function buildAdvancedDependencyGraph(hooks: Hook[]): DependencyGraph {
  const nodes = new Map<string, HookDependencyNode>();
  const edges: Array<{ from: string; to: string }> = [];

  hooks.forEach((hook, index) => {
    nodes.set(hook.name, {
      hookId: hook.name,
      hook,
      dependsOn: [],
      dependedBy: [],
      executionOrder: index,
      resolved: false,
    });
  });

  return { nodes, edges };
}

function addDependency(graph: DependencyGraph, fromHookId: string, toHookId: string): void {
  const fromNode = graph.nodes.get(fromHookId);
  const toNode = graph.nodes.get(toHookId);

  if (fromNode && toNode) {
    fromNode.dependsOn.push(toHookId);
    toNode.dependedBy.push(fromHookId);
    graph.edges.push({ from: fromHookId, to: toHookId });
  }
}

function detectCycles(graph: DependencyGraph): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string, path: string[]): boolean {
    if (recursionStack.has(nodeId)) {
      const cycleStart = path.indexOf(nodeId);
      cycles.push(path.slice(cycleStart));
      return true;
    }

    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const node = graph.nodes.get(nodeId);
    if (node) {
      for (const dep of node.dependsOn) {
        dfs(dep, [...path, nodeId]);
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const nodeId of graph.nodes.keys()) {
    if (!visited.has(nodeId)) {
      dfs(nodeId, []);
    }
  }

  return cycles;
}

function topologicalSort(graph: DependencyGraph): string[] | null {
  const cycles = detectCycles(graph);
  if (cycles.length > 0) return null;

  const inDegree = new Map<string, number>();
  const result: string[] = [];
  const queue: string[] = [];

  // Initialize in-degrees
  for (const [nodeId, node] of graph.nodes) {
    inDegree.set(nodeId, node.dependsOn.length);
    if (node.dependsOn.length === 0) {
      queue.push(nodeId);
    }
  }

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    result.push(nodeId);

    const node = graph.nodes.get(nodeId);
    if (node) {
      for (const dependent of node.dependedBy) {
        const currentDegree = inDegree.get(dependent) || 0;
        inDegree.set(dependent, currentDegree - 1);

        if (inDegree.get(dependent) === 0) {
          queue.push(dependent);
        }
      }
    }
  }

  return result.length === graph.nodes.size ? result : null;
}

function getExecutionLevels(graph: DependencyGraph): Map<number, string[]> {
  const levels = new Map<number, string[]>();
  const nodeLevel = new Map<string, number>();

  function calculateLevel(nodeId: string): number {
    if (nodeLevel.has(nodeId)) {
      return nodeLevel.get(nodeId)!;
    }

    const node = graph.nodes.get(nodeId);
    if (!node || node.dependsOn.length === 0) {
      nodeLevel.set(nodeId, 0);
      return 0;
    }

    const maxDepLevel = Math.max(...node.dependsOn.map(calculateLevel));
    const level = maxDepLevel + 1;
    nodeLevel.set(nodeId, level);
    return level;
  }

  for (const nodeId of graph.nodes.keys()) {
    const level = calculateLevel(nodeId);
    if (!levels.has(level)) {
      levels.set(level, []);
    }
    levels.get(level)!.push(nodeId);
  }

  return levels;
}

// ============================================================================
// Dependency Graph Tests
// ============================================================================

describe('Hook Dependency Tracking', () => {
  describe('Graph Building', () => {
    it('should build graph from hooks', () => {
      const hooks = createTestHooks(5);
      const graph = buildAdvancedDependencyGraph(hooks);

      expect(graph.nodes.size).toBe(5);
      expect(graph.edges).toHaveLength(0);
    });

    it('should preserve hook information in nodes', () => {
      const hooks = [createTestHook({ name: 'test-hook', priority: 8 })];
      const graph = buildAdvancedDependencyGraph(hooks);

      const node = graph.nodes.get('test-hook');
      expect(node?.hook.priority).toBe(8);
    });

    it('should initialize nodes as unresolved', () => {
      const hooks = createTestHooks(3);
      const graph = buildAdvancedDependencyGraph(hooks);

      for (const node of graph.nodes.values()) {
        expect(node.resolved).toBe(false);
      }
    });
  });

  describe('Dependency Addition', () => {
    it('should add dependency between hooks', () => {
      const hooks = createTestHooks(2);
      const graph = buildAdvancedDependencyGraph(hooks);

      addDependency(graph, 'test-hook-2', 'test-hook-1');

      const node1 = graph.nodes.get('test-hook-1');
      const node2 = graph.nodes.get('test-hook-2');

      expect(node2?.dependsOn).toContain('test-hook-1');
      expect(node1?.dependedBy).toContain('test-hook-2');
    });

    it('should track edges', () => {
      const hooks = createTestHooks(3);
      const graph = buildAdvancedDependencyGraph(hooks);

      addDependency(graph, 'test-hook-2', 'test-hook-1');
      addDependency(graph, 'test-hook-3', 'test-hook-2');

      expect(graph.edges).toHaveLength(2);
      expect(graph.edges).toContainEqual({ from: 'test-hook-2', to: 'test-hook-1' });
      expect(graph.edges).toContainEqual({ from: 'test-hook-3', to: 'test-hook-2' });
    });

    it('should handle non-existent hooks gracefully', () => {
      const hooks = createTestHooks(1);
      const graph = buildAdvancedDependencyGraph(hooks);

      // Should not throw
      addDependency(graph, 'non-existent', 'test-hook-1');

      expect(graph.edges).toHaveLength(0);
    });
  });

  describe('Cycle Detection', () => {
    it('should detect simple cycle', () => {
      const hooks = createTestHooks(2);
      const graph = buildAdvancedDependencyGraph(hooks);

      addDependency(graph, 'test-hook-1', 'test-hook-2');
      addDependency(graph, 'test-hook-2', 'test-hook-1');

      const cycles = detectCycles(graph);
      expect(cycles.length).toBeGreaterThan(0);
    });

    it('should detect transitive cycle', () => {
      const hooks = createTestHooks(3);
      const graph = buildAdvancedDependencyGraph(hooks);

      addDependency(graph, 'test-hook-1', 'test-hook-2');
      addDependency(graph, 'test-hook-2', 'test-hook-3');
      addDependency(graph, 'test-hook-3', 'test-hook-1');

      const cycles = detectCycles(graph);
      expect(cycles.length).toBeGreaterThan(0);
    });

    it('should not detect cycle in acyclic graph', () => {
      const hooks = createTestHooks(3);
      const graph = buildAdvancedDependencyGraph(hooks);

      addDependency(graph, 'test-hook-2', 'test-hook-1');
      addDependency(graph, 'test-hook-3', 'test-hook-2');

      const cycles = detectCycles(graph);
      expect(cycles).toHaveLength(0);
    });

    it('should handle self-referential cycle', () => {
      const hooks = createTestHooks(1);
      const graph = buildAdvancedDependencyGraph(hooks);

      addDependency(graph, 'test-hook-1', 'test-hook-1');

      const cycles = detectCycles(graph);
      expect(cycles.length).toBeGreaterThan(0);
    });
  });

  describe('Topological Sort', () => {
    it('should sort independent hooks', () => {
      const hooks = createTestHooks(3);
      const graph = buildAdvancedDependencyGraph(hooks);

      const order = topologicalSort(graph);

      expect(order).not.toBeNull();
      expect(order).toHaveLength(3);
    });

    it('should sort dependent hooks correctly', () => {
      const hooks = createTestHooks(3);
      const graph = buildAdvancedDependencyGraph(hooks);

      addDependency(graph, 'test-hook-2', 'test-hook-1');
      addDependency(graph, 'test-hook-3', 'test-hook-2');

      const order = topologicalSort(graph);

      expect(order).not.toBeNull();
      expect(order?.indexOf('test-hook-1')).toBeLessThan(order?.indexOf('test-hook-2')!);
      expect(order?.indexOf('test-hook-2')).toBeLessThan(order?.indexOf('test-hook-3')!);
    });

    it('should return null for cyclic graph', () => {
      const hooks = createTestHooks(2);
      const graph = buildAdvancedDependencyGraph(hooks);

      addDependency(graph, 'test-hook-1', 'test-hook-2');
      addDependency(graph, 'test-hook-2', 'test-hook-1');

      const order = topologicalSort(graph);
      expect(order).toBeNull();
    });

    it('should handle diamond dependency', () => {
      const hooks = createTestHooks(4);
      const graph = buildAdvancedDependencyGraph(hooks);

      // Diamond: 1 <- 2, 1 <- 3, 2 <- 4, 3 <- 4
      addDependency(graph, 'test-hook-2', 'test-hook-1');
      addDependency(graph, 'test-hook-3', 'test-hook-1');
      addDependency(graph, 'test-hook-4', 'test-hook-2');
      addDependency(graph, 'test-hook-4', 'test-hook-3');

      const order = topologicalSort(graph);

      expect(order).not.toBeNull();
      expect(order?.indexOf('test-hook-1')).toBeLessThan(order?.indexOf('test-hook-2')!);
      expect(order?.indexOf('test-hook-1')).toBeLessThan(order?.indexOf('test-hook-3')!);
      expect(order?.indexOf('test-hook-2')).toBeLessThan(order?.indexOf('test-hook-4')!);
      expect(order?.indexOf('test-hook-3')).toBeLessThan(order?.indexOf('test-hook-4')!);
    });
  });

  describe('Execution Levels', () => {
    it('should calculate levels for independent hooks', () => {
      const hooks = createTestHooks(3);
      const graph = buildAdvancedDependencyGraph(hooks);

      const levels = getExecutionLevels(graph);

      // All independent hooks should be at level 0
      expect(levels.get(0)).toHaveLength(3);
    });

    it('should calculate levels for dependent hooks', () => {
      const hooks = createTestHooks(3);
      const graph = buildAdvancedDependencyGraph(hooks);

      addDependency(graph, 'test-hook-2', 'test-hook-1');
      addDependency(graph, 'test-hook-3', 'test-hook-2');

      const levels = getExecutionLevels(graph);

      expect(levels.get(0)).toContain('test-hook-1');
      expect(levels.get(1)).toContain('test-hook-2');
      expect(levels.get(2)).toContain('test-hook-3');
    });

    it('should identify parallel execution opportunities', () => {
      const hooks = createTestHooks(4);
      const graph = buildAdvancedDependencyGraph(hooks);

      // Hook-2 and Hook-3 both depend on Hook-1, Hook-4 depends on both
      addDependency(graph, 'test-hook-2', 'test-hook-1');
      addDependency(graph, 'test-hook-3', 'test-hook-1');
      addDependency(graph, 'test-hook-4', 'test-hook-2');
      addDependency(graph, 'test-hook-4', 'test-hook-3');

      const levels = getExecutionLevels(graph);

      // Level 0: hook-1
      // Level 1: hook-2 and hook-3 (can run in parallel)
      // Level 2: hook-4

      expect(levels.get(0)).toContain('test-hook-1');
      expect(levels.get(1)).toHaveLength(2);
      expect(levels.get(1)).toContain('test-hook-2');
      expect(levels.get(1)).toContain('test-hook-3');
      expect(levels.get(2)).toContain('test-hook-4');
    });
  });

  describe('Order Validation', () => {
    it('should validate correct execution order', () => {
      const hooks = createTestHooks(3);
      const simpleGraph = buildDependencyGraph(hooks);

      // Add dependency to simple graph
      const dep2 = simpleGraph.get('test-hook-2');
      if (dep2) dep2.dependsOn = ['test-hook-1'];

      const validOrder = ['test-hook-1', 'test-hook-2', 'test-hook-3'];
      expect(validateDependencyOrder(simpleGraph, validOrder)).toBe(true);
    });

    it('should reject incorrect execution order', () => {
      const hooks = createTestHooks(3);
      const simpleGraph = buildDependencyGraph(hooks);

      // Add dependency
      const dep2 = simpleGraph.get('test-hook-2');
      if (dep2) dep2.dependsOn = ['test-hook-1'];

      const invalidOrder = ['test-hook-2', 'test-hook-1', 'test-hook-3'];
      expect(validateDependencyOrder(simpleGraph, invalidOrder)).toBe(false);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle deployment dependency chain', () => {
      const deploymentHooks = [
        createTestHook({ name: 'lint' }),
        createTestHook({ name: 'test' }),
        createTestHook({ name: 'build' }),
        createTestHook({ name: 'deploy-staging' }),
        createTestHook({ name: 'integration-test' }),
        createTestHook({ name: 'deploy-production' }),
      ];

      const graph = buildAdvancedDependencyGraph(deploymentHooks);

      // Define dependencies: lint -> test -> build -> deploy-staging -> integration-test -> deploy-production
      addDependency(graph, 'test', 'lint');
      addDependency(graph, 'build', 'test');
      addDependency(graph, 'deploy-staging', 'build');
      addDependency(graph, 'integration-test', 'deploy-staging');
      addDependency(graph, 'deploy-production', 'integration-test');

      const order = topologicalSort(graph);

      expect(order).not.toBeNull();
      expect(order).toEqual([
        'lint',
        'test',
        'build',
        'deploy-staging',
        'integration-test',
        'deploy-production',
      ]);
    });

    it('should handle parallel test execution', () => {
      const testHooks = [
        createTestHook({ name: 'setup' }),
        createTestHook({ name: 'unit-tests' }),
        createTestHook({ name: 'integration-tests' }),
        createTestHook({ name: 'e2e-tests' }),
        createTestHook({ name: 'report' }),
      ];

      const graph = buildAdvancedDependencyGraph(testHooks);

      // All tests depend on setup, report depends on all tests
      addDependency(graph, 'unit-tests', 'setup');
      addDependency(graph, 'integration-tests', 'setup');
      addDependency(graph, 'e2e-tests', 'setup');
      addDependency(graph, 'report', 'unit-tests');
      addDependency(graph, 'report', 'integration-tests');
      addDependency(graph, 'report', 'e2e-tests');

      const levels = getExecutionLevels(graph);

      // Level 0: setup
      // Level 1: unit-tests, integration-tests, e2e-tests (parallel)
      // Level 2: report

      expect(levels.get(0)).toEqual(['setup']);
      expect(levels.get(1)?.sort()).toEqual(['e2e-tests', 'integration-tests', 'unit-tests']);
      expect(levels.get(2)).toEqual(['report']);
    });

    it('should work with hook fixtures', () => {
      const graph = buildAdvancedDependencyGraph(HOOK_COLLECTION);

      // Add realistic dependencies
      addDependency(graph, 'quality-gate-coverage', 'enforce-semantic-commits');
      addDependency(graph, 'auto-deploy-production', 'quality-gate-coverage');

      const order = topologicalSort(graph);

      expect(order).not.toBeNull();
      expect(order?.indexOf('enforce-semantic-commits')).toBeLessThan(
        order?.indexOf('quality-gate-coverage')!
      );
      expect(order?.indexOf('quality-gate-coverage')).toBeLessThan(
        order?.indexOf('auto-deploy-production')!
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty graph', () => {
      const graph = buildAdvancedDependencyGraph([]);

      expect(graph.nodes.size).toBe(0);
      expect(topologicalSort(graph)).toEqual([]);
      expect(detectCycles(graph)).toEqual([]);
    });

    it('should handle single hook', () => {
      const hooks = createTestHooks(1);
      const graph = buildAdvancedDependencyGraph(hooks);

      const order = topologicalSort(graph);
      expect(order).toEqual(['test-hook-1']);
    });

    it('should handle multiple independent chains', () => {
      const hooks = createTestHooks(6);
      const graph = buildAdvancedDependencyGraph(hooks);

      // Two independent chains: 1->2->3 and 4->5->6
      addDependency(graph, 'test-hook-2', 'test-hook-1');
      addDependency(graph, 'test-hook-3', 'test-hook-2');
      addDependency(graph, 'test-hook-5', 'test-hook-4');
      addDependency(graph, 'test-hook-6', 'test-hook-5');

      const order = topologicalSort(graph);

      expect(order).not.toBeNull();
      // Both chains should be preserved
      expect(order?.indexOf('test-hook-1')).toBeLessThan(order?.indexOf('test-hook-2')!);
      expect(order?.indexOf('test-hook-4')).toBeLessThan(order?.indexOf('test-hook-5')!);
    });
  });
});
