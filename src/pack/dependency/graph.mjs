/**
 * GitVan v2 Dependency Graph - Visualizes and analyzes pack dependencies
 * Provides graph algorithms for cycle detection, topological sorting, and visualization
 */

import { createLogger } from '../../utils/logger.mjs';

export class DependencyGraph {
  constructor() {
    this.nodes = new Map();
    this.edges = [];
    this.logger = createLogger('pack:graph');
  }

  addNode(id, info) {
    this.nodes.set(id, {
      id,
      info,
      inDegree: 0,
      outDegree: 0,
      dependencies: new Set(),
      dependents: new Set()
    });
    this.logger.debug(`Added node: ${id}`);
  }

  addEdge(from, to, type = 'depends') {
    this.edges.push({ from, to, type });

    // Update node metadata
    if (this.nodes.has(from)) {
      this.nodes.get(from).outDegree++;
      if (type === 'depends') {
        this.nodes.get(from).dependencies.add(to);
      }
    }

    if (this.nodes.has(to)) {
      this.nodes.get(to).inDegree++;
      if (type === 'depends') {
        this.nodes.get(to).dependents.add(from);
      }
    }

    this.logger.debug(`Added edge: ${from} ${type} ${to}`);
  }

  async build(resolver, packIds) {
    this.logger.info(`Building dependency graph for ${packIds.length} packs`);

    const processed = new Set();

    for (const packId of packIds) {
      await this.buildNode(resolver, packId, processed);
    }

    this.logger.info(`Graph built with ${this.nodes.size} nodes and ${this.edges.length} edges`);
    return this;
  }

  async buildNode(resolver, packId, processed) {
    if (processed.has(packId)) {
      return;
    }

    processed.add(packId);

    try {
      const resolution = await resolver.resolve(packId);

      for (const dep of resolution) {
        if (!this.nodes.has(dep.id)) {
          this.addNode(dep.id, dep.info);
        }

        // Add dependency edges
        if (dep.info.compose?.dependsOn) {
          for (const depId of dep.info.compose.dependsOn) {
            if (!processed.has(depId)) {
              await this.buildNode(resolver, depId, processed);
            }
            this.addEdge(dep.id, depId, 'depends');
          }
        }

        // Add conflict edges
        if (dep.info.compose?.conflictsWith) {
          for (const conflictId of dep.info.compose.conflictsWith) {
            if (this.nodes.has(conflictId)) {
              this.addEdge(dep.id, conflictId, 'conflicts');
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to build node ${packId}: ${error.message}`);
      throw error;
    }
  }

  detectCycles() {
    this.logger.debug('Detecting cycles in dependency graph');

    const visited = new Set();
    const recursionStack = new Set();
    const cycles = [];

    const dfs = (node, path = []) => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const neighbors = this.edges
        .filter(e => e.from === node && e.type === 'depends')
        .map(e => e.to);

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        } else if (recursionStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor);
          const cycle = [...path.slice(cycleStart), neighbor];
          cycles.push(cycle);
          this.logger.warn(`Cycle detected: ${cycle.join(' → ')}`);
        }
      }

      recursionStack.delete(node);
    };

    for (const node of this.nodes.keys()) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return cycles;
  }

  topologicalSort() {
    this.logger.debug('Performing topological sort');

    const inDegree = new Map();
    const queue = [];
    const sorted = [];

    // Initialize in-degree
    for (const node of this.nodes.keys()) {
      inDegree.set(node, 0);
    }

    // Calculate in-degrees for dependency edges
    for (const edge of this.edges) {
      if (edge.type === 'depends') {
        inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
      }
    }

    // Add nodes with no dependencies to queue
    for (const [node, degree] of inDegree) {
      if (degree === 0) {
        queue.push(node);
      }
    }

    // Process queue
    while (queue.length > 0) {
      const node = queue.shift();
      sorted.push(node);

      const neighbors = this.edges
        .filter(e => e.from === node && e.type === 'depends')
        .map(e => e.to);

      for (const neighbor of neighbors) {
        const newDegree = inDegree.get(neighbor) - 1;
        inDegree.set(neighbor, newDegree);

        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // Check if all nodes were processed (no cycles)
    if (sorted.length !== this.nodes.size) {
      this.logger.error('Topological sort failed - cycles detected');
      return null;
    }

    return sorted;
  }

  findStronglyConnectedComponents() {
    const visited = new Set();
    const stack = [];
    const components = [];

    // First DFS to fill stack with finish times
    const dfs1 = (node) => {
      visited.add(node);

      const neighbors = this.edges
        .filter(e => e.from === node && e.type === 'depends')
        .map(e => e.to);

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs1(neighbor);
        }
      }

      stack.push(node);
    };

    for (const node of this.nodes.keys()) {
      if (!visited.has(node)) {
        dfs1(node);
      }
    }

    // Create transposed graph
    const transposed = new Map();
    for (const node of this.nodes.keys()) {
      transposed.set(node, []);
    }

    for (const edge of this.edges) {
      if (edge.type === 'depends') {
        transposed.get(edge.to).push(edge.from);
      }
    }

    // Second DFS on transposed graph
    visited.clear();

    const dfs2 = (node, component) => {
      visited.add(node);
      component.push(node);

      for (const neighbor of transposed.get(node) || []) {
        if (!visited.has(neighbor)) {
          dfs2(neighbor, component);
        }
      }
    };

    while (stack.length > 0) {
      const node = stack.pop();
      if (!visited.has(node)) {
        const component = [];
        dfs2(node, component);
        if (component.length > 1) {
          components.push(component);
        }
      }
    }

    return components;
  }

  analyzeComplexity() {
    const metrics = {
      nodes: this.nodes.size,
      edges: this.edges.length,
      density: this.edges.length / (this.nodes.size * (this.nodes.size - 1)),
      avgDegree: this.edges.length / this.nodes.size,
      maxInDegree: 0,
      maxOutDegree: 0,
      leaves: 0,
      roots: 0,
      cycles: this.detectCycles().length,
      components: this.findStronglyConnectedComponents().length
    };

    for (const node of this.nodes.values()) {
      metrics.maxInDegree = Math.max(metrics.maxInDegree, node.inDegree);
      metrics.maxOutDegree = Math.max(metrics.maxOutDegree, node.outDegree);

      if (node.inDegree === 0) metrics.roots++;
      if (node.outDegree === 0) metrics.leaves++;
    }

    return metrics;
  }

  findCriticalPath() {
    const sorted = this.topologicalSort();
    if (!sorted) return null;

    const distances = new Map();
    const paths = new Map();

    // Initialize distances
    for (const node of this.nodes.keys()) {
      distances.set(node, 0);
      paths.set(node, [node]);
    }

    // Calculate longest paths
    for (const node of sorted) {
      const neighbors = this.edges
        .filter(e => e.from === node && e.type === 'depends')
        .map(e => e.to);

      for (const neighbor of neighbors) {
        const newDistance = distances.get(node) + 1;
        if (newDistance > distances.get(neighbor)) {
          distances.set(neighbor, newDistance);
          paths.set(neighbor, [...paths.get(node), neighbor]);
        }
      }
    }

    // Find the longest path
    let maxDistance = 0;
    let criticalPath = [];

    for (const [node, distance] of distances) {
      if (distance > maxDistance) {
        maxDistance = distance;
        criticalPath = paths.get(node);
      }
    }

    return {
      length: maxDistance,
      path: criticalPath
    };
  }

  visualize(format = 'text') {
    switch (format) {
      case 'text':
        return this.visualizeText();
      case 'dot':
        return this.visualizeDot();
      case 'json':
        return this.visualizeJson();
      default:
        throw new Error(`Unsupported visualization format: ${format}`);
    }
  }

  visualizeText() {
    const lines = ['Pack Dependency Graph:'];
    lines.push('='.repeat(50));
    lines.push('');

    // Summary
    const metrics = this.analyzeComplexity();
    lines.push('Summary:');
    lines.push(`  Packs: ${metrics.nodes}`);
    lines.push(`  Dependencies: ${metrics.edges}`);
    lines.push(`  Cycles: ${metrics.cycles}`);
    lines.push(`  Density: ${(metrics.density * 100).toFixed(1)}%`);
    lines.push('');

    // Critical path
    const critical = this.findCriticalPath();
    if (critical) {
      lines.push(`Critical Path (${critical.length} steps):`);
      lines.push(`  ${critical.path.join(' → ')}`);
      lines.push('');
    }

    // Pack details
    lines.push('Packs:');
    for (const [id, node] of this.nodes) {
      const info = node.info;
      lines.push(`📦 ${id} v${info.version}`);

      if (node.dependencies.size > 0) {
        lines.push(`  └─ depends on: ${[...node.dependencies].join(', ')}`);
      }

      const conflicts = this.edges
        .filter(e => e.from === id && e.type === 'conflicts')
        .map(e => e.to);

      if (conflicts.length > 0) {
        lines.push(`  └─ conflicts with: ${conflicts.join(', ')}`);
      }

      if (node.dependents.size > 0) {
        lines.push(`  └─ required by: ${[...node.dependents].join(', ')}`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  visualizeDot() {
    const lines = ['digraph PackDependencies {'];
    lines.push('  rankdir=TB;');
    lines.push('  node [shape=box, style=filled];');
    lines.push('');

    // Add nodes
    for (const [id, node] of this.nodes) {
      const label = `${id}\\nv${node.info.version}`;
      const color = node.inDegree === 0 ? 'lightgreen' :
                   node.outDegree === 0 ? 'lightcoral' : 'lightblue';
      lines.push(`  "${id}" [label="${label}", fillcolor=${color}];`);
    }

    lines.push('');

    // Add edges
    for (const edge of this.edges) {
      const style = edge.type === 'conflicts' ? 'dashed' : 'solid';
      const color = edge.type === 'conflicts' ? 'red' : 'black';
      lines.push(`  "${edge.from}" -> "${edge.to}" [style=${style}, color=${color}];`);
    }

    lines.push('}');
    return lines.join('\n');
  }

  visualizeJson() {
    return JSON.stringify({
      nodes: [...this.nodes.entries()].map(([id, node]) => ({
        id,
        version: node.info.version,
        inDegree: node.inDegree,
        outDegree: node.outDegree,
        dependencies: [...node.dependencies],
        dependents: [...node.dependents]
      })),
      edges: this.edges,
      metrics: this.analyzeComplexity(),
      criticalPath: this.findCriticalPath(),
      cycles: this.detectCycles()
    }, null, 2);
  }

  export() {
    return {
      nodes: this.nodes,
      edges: this.edges,
      metrics: this.analyzeComplexity()
    };
  }

  clear() {
    this.nodes.clear();
    this.edges = [];
    this.logger.debug('Dependency graph cleared');
  }
}