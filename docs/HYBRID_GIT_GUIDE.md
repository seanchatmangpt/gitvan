# Hybrid Git Architecture Guide

**Version**: v4.0.1
**Last Updated**: January 9, 2026
**Target Audience**: Advanced developers optimizing Git operations

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [MemFS vs Native Git](#memfs-vs-native-git)
3. [Selection Strategy](#selection-strategy)
4. [Memory-Based Operations](#memory-based-operations)
5. [Native Git Operations](#native-git-operations)
6. [Hybrid Switching](#hybrid-switching)
7. [Performance Tuning](#performance-tuning)
8. [Limitations and Tradeoffs](#limitations-and-tradeoffs)
9. [Production Patterns](#production-patterns)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

GitVan provides a hybrid Git backend that automatically selects between memory-based (MemFS) and native Git operations based on performance characteristics.

```
User Code (Composables)
    ↓
HybridGitBackend (Decision Layer)
    ↓
    ├─→ MemFS (isomorphic-git) ← Fast, in-memory
    │   ├─ For small operations
    │   ├─ For temporary worktrees
    │   ├─ For read-heavy workloads
    │   └─ Zero system resource overhead
    │
    └─→ Native Git (git command) ← Powerful, persistent
        ├─ For large operations
        ├─ For complex workflows
        ├─ For system-level operations
        └─ Direct filesystem access
```

### Key Hybrid Features

- **Automatic Selection**: Chooses optimal backend per operation
- **Seamless Switching**: Transparent to application code
- **Performance Optimized**: Caches results, minimizes expensive operations
- **Fallback Logic**: Gracefully downgrades on errors
- **Metrics Tracking**: Monitors performance of both backends

---

## MemFS vs Native Git

### Memory File System (MemFS with isomorphic-git)

**Best For**:
- Small repositories (< 100 MB)
- Temporary worktrees
- Read-heavy operations
- CI/CD pipelines
- Containerized environments
- Testing and development

**Characteristics**:
```javascript
import { useHybridGit } from 'gitvan';

const hybrid = useHybridGit();

// Detect if operation uses MemFS
const result = await hybrid.status();
console.log(result.backend);  // 'memfs' or 'native'
console.log(result.duration); // Operation time in ms
```

**Advantages**:
- ✅ No disk I/O overhead
- ✅ Lightning-fast operations (10-100ms for most commands)
- ✅ Perfect isolation between concurrent operations
- ✅ No system dependencies beyond Node.js
- ✅ Ideal for Docker/containerized deployments
- ✅ Minimal memory footprint (< 50 MB for typical repos)

**Disadvantages**:
- ❌ Not suitable for very large repositories
- ❌ All data is volatile (not persistent)
- ❌ Cannot access system-level Git features
- ❌ Limited to single process/thread

### Native Git (System git command)

**Best For**:
- Large repositories (> 1 GB)
- Complex Git operations
- System-level Git access needed
- Performance-critical production workloads
- Working with Git submodules
- Direct filesystem manipulation

**Characteristics**:
```javascript
const result = await hybrid.push({ remote: 'origin' });
console.log(result.backend);  // 'native' for large operations
```

**Advantages**:
- ✅ Unlimited repository size support
- ✅ All Git features available
- ✅ Persistent storage
- ✅ Git LFS support
- ✅ Submodule handling
- ✅ System integration (hooks, etc.)

**Disadvantages**:
- ❌ Slower (disk I/O bound)
- ❌ Requires system git installation
- ❌ Process overhead per operation
- ❌ Potential lock contention

---

## Selection Strategy

### Automatic Selection Criteria

GitVan uses these criteria to select the optimal backend:

```javascript
export const SELECTION_CRITERIA = {
  REPO_SIZE: {
    small: 100 * 1024 * 1024,    // 100 MB
    large: 1 * 1024 * 1024 * 1024 // 1 GB
  },
  OPERATION_TYPE: {
    READ: 'memfs',          // status, log, diff, show
    WRITE_SMALL: 'memfs',   // commit small changes
    WRITE_LARGE: 'native',  // merge, rebase, cherry-pick
    SYSTEM: 'native'        // push, pull, submodules
  },
  FALLBACK_ON_ERROR: true,  // Try other backend on failure
  PREFER_NATIVE_WHEN: {
    SUBMODULES: true,       // Submodules present
    GIT_LFS: true,          // LFS configured
    LARGE_FILES: true       // Files > 10 MB
  }
};
```

### Manual Backend Selection

```javascript
import { useHybridGit } from 'gitvan';

const hybrid = useHybridGit();

// Force MemFS (fastest, for testing/development)
const memfsResult = await hybrid.status({
  preferBackend: 'memfs'
});

// Force Native (most compatible, for production)
const nativeResult = await hybrid.status({
  preferBackend: 'native'
});

// Auto-select (default behavior)
const autoResult = await hybrid.status();
```

### Backend Characteristics Example

```javascript
// Same operation, different backends
async function compareBackends() {
  const hybrid = useHybridGit();

  // MemFS execution
  const start1 = performance.now();
  const memfsLog = await hybrid.log({
    preferBackend: 'memfs'
  });
  const memfsDuration = performance.now() - start1;

  // Native execution
  const start2 = performance.now();
  const nativeLog = await hybrid.log({
    preferBackend: 'native'
  });
  const nativeDuration = performance.now() - start2;

  console.log(`MemFS: ${memfsDuration.toFixed(2)}ms`);
  console.log(`Native: ${nativeDuration.toFixed(2)}ms`);

  // Results should be identical
  expect(memfsLog).toEqual(nativeLog);
}
```

---

## Memory-Based Operations

### MemFS Git Operations

```javascript
import { useHybridGit } from 'gitvan';

await withGitVan(context, async () => {
  const hybrid = useHybridGit();

  // 1. Clone into memory
  const repo = await hybrid.clone({
    url: 'https://github.com/example/repo.git',
    backend: 'memfs'
  });

  // 2. In-memory operations
  const status = await hybrid.status({
    backend: 'memfs'
  });

  const commits = await hybrid.log({
    depth: 50,
    backend: 'memfs'
  });

  // 3. Create branch in memory
  await hybrid.branch({
    name: 'feature/test',
    backend: 'memfs'
  });

  // 4. Stage and commit
  await hybrid.add({
    paths: ['src/**/*.js'],
    backend: 'memfs'
  });

  await hybrid.commit({
    message: 'Test changes',
    backend: 'memfs'
  });

  return commits;
});
```

### Temporary MemFS Worktree

```javascript
// Create isolated working copy in memory for testing
async function createMemfsWorktree(branchName) {
  const hybrid = useHybridGit();

  const worktree = await hybrid.createWorktree({
    branch: branchName,
    path: `/tmp/worktree-${branchName}`,
    backend: 'memfs'
  });

  // Modifications are isolated in memory
  await hybrid.checkout({
    branch: 'feature/testing',
    worktree: worktree.path,
    backend: 'memfs'
  });

  // Test without affecting filesystem
  await runTests(worktree.path);

  // Clean up (automatic with MemFS)
  await hybrid.removeWorktree({
    path: worktree.path,
    backend: 'memfs'
  });
}
```

### MemFS Performance Characteristics

```javascript
// Benchmark typical MemFS operations
const operations = {
  'status': { timeMs: 15, backend: 'memfs' },
  'log (10 commits)': { timeMs: 20, backend: 'memfs' },
  'diff': { timeMs: 25, backend: 'memfs' },
  'add files': { timeMs: 10, backend: 'memfs' },
  'commit': { timeMs: 15, backend: 'memfs' },
  'show commit': { timeMs: 18, backend: 'memfs' }
};

console.table(operations);
// All operations complete in < 30ms
```

---

## Native Git Operations

### Native Git for Complex Operations

```javascript
import { useHybridGit } from 'gitvan';

await withGitVan(context, async () => {
  const hybrid = useHybridGit();

  // 1. Clone with submodules (native required)
  await hybrid.clone({
    url: 'https://github.com/example/repo.git',
    recursiveSubmodules: true,
    backend: 'native'
  });

  // 2. Interactive rebase (native required)
  await hybrid.rebase({
    onto: 'main',
    interactive: true,
    backend: 'native'
  });

  // 3. Large merge (native optimized)
  await hybrid.merge({
    branch: 'develop',
    strategy: 'recursive',
    backend: 'native'
  });

  // 4. Cherry-pick multiple commits
  for (const commit of commitsToApply) {
    await hybrid.cherryPick({
      ref: commit,
      backend: 'native'
    });
  }

  // 5. Push to remote (native required)
  await hybrid.push({
    remote: 'origin',
    branch: 'main',
    backend: 'native'
  });
});
```

### Native Git with System Features

```javascript
// Access system Git hooks
async function setupGitHooks() {
  const hybrid = useHybridGit();

  // Read system hook (only available in native)
  const preCommitHook = await hybrid.getHook({
    type: 'pre-commit',
    backend: 'native'
  });

  // Update hook
  await hybrid.setHook({
    type: 'pre-commit',
    script: '#!/bin/sh\nnpm run lint',
    backend: 'native'
  });
}
```

---

## Hybrid Switching

### Transparent Backend Switching

```javascript
// GitVan automatically switches backends during operations
async function hybridWorkflow() {
  const hybrid = useHybridGit();

  // Small operation → uses MemFS automatically
  const status = await hybrid.status();
  // Executes in ~15ms using MemFS

  // Large operation → switches to Native automatically
  const largeFile = Buffer.alloc(500 * 1024 * 1024);  // 500 MB
  await hybrid.add({ paths: ['large-file.bin'] });
  // Automatically detects large file and uses Native

  // Submodules → forced Native
  await hybrid.updateSubmodules();
  // Always uses Native backend
}
```

### Explicit Backend Fallback

```javascript
// Try MemFS first, fall back to Native on failure
async function robustGitOperation() {
  const hybrid = useHybridGit();

  try {
    return await hybrid.merge({
      branch: 'develop',
      preferBackend: 'memfs',
      fallback: true  // Enable fallback
    });
  } catch (error) {
    // Automatically retries with native
    console.log('MemFS merge failed, retrying with native...');
    return await hybrid.merge({
      branch: 'develop',
      preferBackend: 'native'
    });
  }
}
```

### Monitoring Backend Selection

```javascript
import { useLog } from 'gitvan';

const log = useLog();

async function logAllBackendChoices() {
  const hybrid = useHybridGit();

  // Enable detailed logging
  hybrid.on('backend-selected', (event) => {
    log.debug('Backend selected', {
      operation: event.operation,
      backend: event.backend,
      duration: event.duration,
      reason: event.reason
    });
  });

  // Operations now log backend selection
  await hybrid.status();
  await hybrid.commit({ message: 'Test' });
  await hybrid.push();
}
```

---

## Performance Tuning

### Optimizing MemFS Operations

```javascript
// 1. Batch operations to minimize context switches
async function optimizedBatch() {
  const hybrid = useHybridGit();

  // Inefficient: Multiple small operations
  for (const file of files) {
    await hybrid.add({ paths: [file], backend: 'memfs' });
  }

  // Efficient: Single batch operation
  await hybrid.add({ paths: files, backend: 'memfs' });
}

// 2. Use MemFS for read-only operations
async function readOnlyOptimized() {
  const hybrid = useHybridGit();

  // Fast: MemFS is perfect for reads
  const log = await hybrid.log({
    depth: 100,
    backend: 'memfs'  // Specify for guaranteed speed
  });

  // Expensive: Large write with write-heavy pattern
  // Automatically uses native backend
}
```

### Optimizing Native Operations

```javascript
// 1. Use git gc for large repositories
async function optimizeLargeRepo() {
  const hybrid = useHybridGit();

  await hybrid.gc({
    aggressive: true,
    backend: 'native'
  });
}

// 2. Shallow clone for faster initial fetch
async function shallowClone() {
  const hybrid = useHybridGit();

  await hybrid.clone({
    url: 'https://github.com/example/repo.git',
    depth: 100,  // Only last 100 commits
    backend: 'native'
  });
}
```

### Caching and Memoization

```javascript
import { useRegistry } from 'gitvan';

const registry = useRegistry();

// Cache expensive Git operations
async function cachedGitLog() {
  const hybrid = useHybridGit();
  const cacheKey = 'git:log:main';

  // Check cache
  const cached = await registry.get(cacheKey);
  if (cached && !isCacheStale(cached)) {
    return cached.log;
  }

  // Fetch if not cached
  const log = await hybrid.log({
    branch: 'main',
    depth: 50
  });

  // Store in cache (5 minute TTL)
  await registry.set(cacheKey, {
    log,
    timestamp: Date.now()
  }, { ttl: 5 * 60 * 1000 });

  return log;
}
```

---

## Limitations and Tradeoffs

### MemFS Limitations

| Limitation | Impact | Mitigation |
|-----------|--------|-----------|
| Data volatile (not persistent) | Temporary use only | Use for testing/staging, not primary storage |
| No system Git features | Cannot use hooks/LFS | Use native for those operations |
| Single-process only | Cannot share across processes | Use message queue for inter-process sync |
| Memory-bound | Very large repos fail | Native backend for repos > 1 GB |
| No credential caching | Performance overhead | Pre-authenticate, use ssh-agent |

### Native Git Limitations

| Limitation | Impact | Mitigation |
|-----------|--------|-----------|
| Disk I/O overhead | 10-100x slower than MemFS | Batch operations, reduce frequency |
| System dependency | Not portable | Ensure git installed in all environments |
| Lock contention | Concurrent access issues | Use worktrees for isolation |
| Large repos slow | Performance degrades | Shallow clones, git gc, sparse checkout |

---

## Production Patterns

### Pattern 1: CI/CD Optimization

```javascript
// CI pipelines benefit from MemFS for speed
async function optimizedCIPipeline() {
  const hybrid = useHybridGit();

  // Clone into memory (fast)
  await hybrid.clone({
    url: process.env.REPO_URL,
    branch: 'main',
    preferBackend: 'memfs'
  });

  // Run tests in memory
  const testResults = await hybrid.run({
    command: 'npm test',
    backend: 'memfs'
  });

  // Push results (use native for safety)
  if (testResults.success) {
    await hybrid.push({
      remote: 'origin',
      backend: 'native'
    });
  }
}
```

### Pattern 2: Large Repository Handling

```javascript
// Enterprise repos need native backend strategy
async function enterpriseRepository() {
  const hybrid = useHybridGit();

  // Shallow clone for speed
  await hybrid.clone({
    url: 'https://github.com/enterprise/massive-repo',
    depth: 100,
    preferBackend: 'native'
  });

  // Sparse checkout for focused work
  await hybrid.sparseCheckout({
    patterns: ['src/specific-module/**'],
    backend: 'native'
  });

  // Work in isolated worktree
  const worktree = await hybrid.createWorktree({
    branch: 'feature/work',
    backend: 'native'
  });
}
```

### Pattern 3: Development Workflow

```javascript
// Development benefits from hybrid approach
async function developmentWorkflow() {
  const hybrid = useHybridGit();

  // Fast MemFS for quick status checks
  const status = await hybrid.status({
    preferBackend: 'memfs'
  });

  // MemFS for local commits
  await hybrid.add({ paths: ['src/**'], backend: 'memfs' });
  await hybrid.commit({ message: 'Working on feature', backend: 'memfs' });

  // Native for pushing to remote
  await hybrid.push({
    remote: 'origin',
    preferBackend: 'native'
  });

  // Native for pulling latest
  await hybrid.pull({
    remote: 'origin',
    preferBackend: 'native'
  });
}
```

---

## Troubleshooting

### MemFS Running Out of Memory

```javascript
// Problem: MemFS operations fail with out-of-memory
// Solution: Monitor and fall back to native

async function safeMemfsOperation(operation) {
  try {
    return await operation('memfs');
  } catch (error) {
    if (error.message.includes('out of memory')) {
      console.warn('MemFS out of memory, switching to native...');
      return await operation('native');
    }
    throw error;
  }
}
```

### Native Git Not Found

```javascript
// Problem: Native backend fails (git not installed)
// Solution: Graceful degradation

async function fallbackToMemfs(operation) {
  const hybrid = useHybridGit();

  try {
    return await operation({ backend: 'native' });
  } catch (error) {
    if (error.message.includes('ENOENT') && error.message.includes('git')) {
      console.warn('Git not found, using MemFS only...');
      return await operation({ backend: 'memfs' });
    }
    throw error;
  }
}
```

### Backend Mismatch Issues

```javascript
// Problem: Different results from MemFS and Native
// Solution: Validate and resync

async function validateConsistency() {
  const hybrid = useHybridGit();

  const memfsLog = await hybrid.log({ backend: 'memfs' });
  const nativeLog = await hybrid.log({ backend: 'native' });

  if (JSON.stringify(memfsLog) !== JSON.stringify(nativeLog)) {
    console.error('Backend mismatch detected!');

    // Resync by clearing MemFS cache
    await hybrid.clearCache();

    // Retry with native
    return await hybrid.log({ backend: 'native' });
  }
}
```

---

## Summary

The Hybrid Git architecture provides:
- **Automatic selection** between MemFS (fast) and Native (powerful)
- **Transparent switching** based on operation characteristics
- **Production-ready** with fallback strategies
- **Performance optimized** for different workload patterns
- **Flexible API** for explicit backend selection when needed

For most use cases, let GitVan automatically select the optimal backend. Override only when you have specific requirements.

---

**Last Updated**: January 9, 2026
**Status**: Complete
**Related Docs**: GIT_OPERATIONS.md, PERFORMANCE.md, TROUBLESHOOTING.md
