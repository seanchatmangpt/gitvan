# GitVan Pack Dependency System

## Overview

The GitVan Pack Dependency System provides comprehensive dependency resolution, composition management, and graph analysis for pack-based project generation. It ensures packs are applied in the correct order while detecting and handling conflicts.

## Architecture

### Core Components

1. **DependencyResolver** (`src/pack/dependency/resolver.mjs`)
   - Resolves pack dependencies recursively
   - Detects circular dependencies
   - Handles conflict detection
   - Provides caching for performance

2. **PackComposer** (`src/pack/dependency/composer.mjs`)
   - Orchestrates pack composition workflows
   - Validates pack compatibility
   - Provides preview and analysis features
   - Handles error recovery and partial applications

3. **DependencyGraph** (`src/pack/dependency/graph.mjs`)
   - Builds visual dependency graphs
   - Performs topological sorting
   - Detects cycles and strongly connected components
   - Generates multiple visualization formats

## Key Features

### Dependency Resolution
```javascript
import { createDependencyResolver } from './src/pack/dependency/index.mjs';

const resolver = createDependencyResolver();
const resolution = await resolver.resolveMultiple(['auth-pack', 'api-pack']);

console.log('Order:', resolution.order);
console.log('Conflicts:', resolution.conflicts);
```

### Pack Composition
```javascript
import { createPackComposer } from './src/pack/dependency/index.mjs';

const composer = createPackComposer();
const result = await composer.compose(
  ['base-pack', 'express-api'],
  './target-directory',
  { projectName: 'my-project' }
);
```

### Graph Analysis
```javascript
import { analyzeDependencies } from './src/pack/dependency/index.mjs';

const analysis = await analyzeDependencies(['full-stack-app']);
console.log('Critical path:', analysis.criticalPath);
console.log('Complexity metrics:', analysis.metrics);
```

## Dependency Resolution Algorithm

### Resolution Process

1. **Input Validation**: Validate pack IDs and check basic constraints
2. **Recursive Resolution**: Resolve dependencies depth-first with cycle detection
3. **Conflict Detection**: Check for direct conflicts and capability overlaps
4. **Order Optimization**: Sort by dependency order and constraints
5. **Caching**: Cache resolved dependencies for performance

### Conflict Handling

The system detects several types of conflicts:

- **Direct Conflicts**: Explicitly declared in pack manifests
- **Capability Overlaps**: Multiple packs providing same capabilities
- **Version Conflicts**: Incompatible version requirements

### Pack Manifest Format

```json
{
  "id": "auth-jwt",
  "version": "1.0.0",
  "capabilities": ["auth", "jwt"],
  "compose": {
    "dependsOn": ["base-pack", "express-api"],
    "conflictsWith": ["auth-oauth"],
    "order": 20,
    "incompatibleWith": [
      { "pack": "legacy-auth", "version": "^1.0.0" }
    ]
  }
}
```

## Graph Analysis Features

### Algorithms Implemented

1. **Cycle Detection**: Depth-first search with recursion stack
2. **Topological Sorting**: Kahn's algorithm for dependency ordering
3. **Strongly Connected Components**: Kosaraju's algorithm
4. **Critical Path Analysis**: Longest path in DAG
5. **Complexity Metrics**: Density, degree distribution, etc.

### Visualization Formats

- **Text**: Human-readable dependency tree
- **DOT**: Graphviz format for visual rendering
- **JSON**: Structured data for programmatic use

## Performance Optimizations

### Caching Strategy
- **Resolution Cache**: Cache dependency trees by pack ID
- **Graph Cache**: Reuse built graphs for similar queries
- **Registry Cache**: Cache pack metadata locally

### Lazy Loading
- Load pack manifests only when needed
- Build graphs incrementally
- Stream large dependency trees

## Error Handling

### Graceful Degradation
- Continue processing when non-critical packs fail
- Provide detailed error context
- Support partial composition results

### Error Types
- **Pack Not Found**: Missing pack in registry
- **Circular Dependencies**: Detected during resolution
- **Conflict Errors**: Incompatible pack combinations
- **Validation Errors**: Invalid pack manifests

## Testing

### Test Coverage
- Unit tests for core algorithms
- Integration tests for complete workflows
- Edge case testing (circular deps, conflicts)
- Performance benchmarks

### Mock System
```javascript
class MockRegistry extends PackRegistry {
  async get(packId) {
    return mockPackData[packId] || null;
  }
}
```

## Usage Examples

### Basic Dependency Resolution
```javascript
// Resolve a single pack's dependencies
const deps = await resolver.resolve('complex-app');
console.log('Dependencies:', deps.map(d => d.id));
```

### Composition Preview
```javascript
// Preview what will be applied
const preview = await composer.preview(['full-stack']);
console.log('Will apply:', preview.order);
console.log('Total packs:', preview.totalPacks);
```

### Conflict Analysis
```javascript
// Check if two packs are compatible
const compatible = await resolver.checkCompatibility('express-api', 'fastify-api');
console.log('Compatible:', compatible.compatible);
console.log('Reason:', compatible.reason);
```

### Graph Visualization
```javascript
// Generate dependency graph
const graph = createDependencyGraph();
await graph.build(resolver, ['my-app']);

// Export as text
console.log(graph.visualize('text'));

// Export as DOT for Graphviz
const dotGraph = graph.visualize('dot');
```

## Future Enhancements

### Planned Features
- **Semantic Versioning**: Full semver constraint resolution
- **Pack Repositories**: Multiple registry support
- **Incremental Updates**: Update only changed dependencies
- **Parallel Application**: Apply independent packs concurrently

### Optimization Opportunities
- **Memory Usage**: Optimize graph storage for large ecosystems
- **Network Efficiency**: Batch registry requests
- **Disk Caching**: Persistent cache across sessions

## API Reference

### High-Level Functions
- `resolveDependencies(packIds, options)`: Resolve multiple pack dependencies
- `composePacks(packIds, targetDir, inputs, options)`: Compose packs to directory
- `analyzeDependencies(packIds, options)`: Full dependency analysis

### Factory Functions
- `createDependencyResolver(options)`: Create resolver instance
- `createPackComposer(options)`: Create composer instance
- `createDependencyGraph()`: Create graph instance

### Configuration Options
```javascript
const options = {
  allowOverlap: false,        // Allow capability overlaps
  ignoreConflicts: false,     // Ignore pack conflicts
  continueOnError: true,      // Continue on individual pack failures
  timeout: 30000,             // Registry timeout
  maxRetries: 3,              // Retry failed operations
  cacheDir: '~/.gitvan/cache' // Cache directory
};
```

## Conclusion

The GitVan Pack Dependency System provides a robust foundation for managing complex pack ecosystems. It handles dependency resolution, conflict detection, and composition orchestration with performance optimizations and comprehensive error handling.

The system is designed to scale from simple single-pack applications to complex multi-layer architectures with dozens of interdependent packs.