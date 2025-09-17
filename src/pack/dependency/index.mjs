/**
 * GitVan v2 Pack Dependency System - Main exports
 * Provides dependency resolution, composition, and graph analysis
 */

export { DependencyResolver } from './resolver.mjs';
export { PackComposer } from './composer.mjs';
export { DependencyGraph } from './graph.mjs';

import { DependencyResolver } from './resolver.mjs';
import { PackComposer } from './composer.mjs';
import { DependencyGraph } from './graph.mjs';

// Convenience factory functions
export function createDependencyResolver(options = {}) {
  return new DependencyResolver(options);
}

export function createPackComposer(options = {}) {
  return new PackComposer(options);
}

export function createDependencyGraph() {
  return new DependencyGraph();
}

// High-level API
export async function resolveDependencies(packIds, options = {}) {
  const resolver = createDependencyResolver(options);
  return await resolver.resolveMultiple(packIds);
}

export async function composePacks(packIds, targetDir, inputs = {}, options = {}) {
  const composer = createPackComposer(options);
  return await composer.compose(packIds, targetDir, inputs);
}

export async function analyzeDependencies(packIds, options = {}) {
  const resolver = createDependencyResolver(options);

  // Allow injecting a custom registry for testing
  if (options.registry) {
    resolver.registry = options.registry;
  }

  const graph = createDependencyGraph();

  await graph.build(resolver, packIds);

  return {
    graph,
    cycles: graph.detectCycles(),
    topologicalOrder: graph.topologicalSort(),
    metrics: graph.analyzeComplexity(),
    criticalPath: graph.findCriticalPath(),
    visualization: {
      text: graph.visualize('text'),
      dot: graph.visualize('dot'),
      json: graph.visualize('json')
    }
  };
}