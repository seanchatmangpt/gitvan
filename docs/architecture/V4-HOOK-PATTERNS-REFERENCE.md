# GitVan v4 Hook Patterns Reference

**Version**: 4.0.0-alpha
**Date**: 2025-12-27
**Purpose**: Implementation patterns and code examples for v4 hooks

---

## 1. Core Hook Primitives

### 1.1 useState - Reactive State Management

```javascript
// src/hooks/primitives/useState.mjs
import { createSignal } from '@unrdf/hooks';
import { useGitVan } from '../../core/context.mjs';

/**
 * Create reactive state within GitVan context
 *
 * @template T
 * @param {T} initialValue - Initial state value
 * @returns {[() => T, (value: T | ((prev: T) => T)) => void]}
 */
export function useState(initialValue) {
  const ctx = useGitVan();
  const [get, set] = createSignal(initialValue);

  // Track state for debugging
  if (ctx.debug) {
    ctx.stateRegistry.track(get, set);
  }

  return [get, set];
}

// Usage Examples:

// Simple state
const [count, setCount] = useState(0);
setCount(count() + 1);

// Object state
const [config, setConfig] = useState({ verbose: false });
setConfig(prev => ({ ...prev, verbose: true }));

// Array state
const [items, setItems] = useState([]);
setItems(prev => [...prev, newItem]);
```

### 1.2 useEffect - Side Effect Management

```javascript
// src/hooks/primitives/useEffect.mjs
import { createEffect, onCleanup } from '@unrdf/hooks';
import { useGitVan } from '../../core/context.mjs';

/**
 * Execute side effects with automatic cleanup
 *
 * @param {() => void | (() => void)} effect - Effect function
 * @param {Array} [deps] - Dependency array (optional)
 */
export function useEffect(effect, deps) {
  const ctx = useGitVan();

  createEffect(() => {
    // Track effect for debugging
    const effectId = ctx.debug ? ctx.effectRegistry.start() : null;

    try {
      const cleanup = effect();

      if (typeof cleanup === 'function') {
        onCleanup(cleanup);
      }

      if (effectId) {
        ctx.effectRegistry.complete(effectId);
      }
    } catch (error) {
      if (effectId) {
        ctx.effectRegistry.error(effectId, error);
      }
      throw error;
    }
  });
}

// Usage Examples:

// Effect with cleanup
useEffect(() => {
  const subscription = eventEmitter.on('change', handleChange);

  return () => {
    subscription.unsubscribe();
  };
});

// Effect with dependencies
useEffect(() => {
  console.log(`Branch changed to: ${branch()}`);
}, [branch]);

// One-time effect (mount only)
useEffect(() => {
  console.log('Component mounted');
  return () => console.log('Component unmounted');
}, []);
```

### 1.3 useMemo - Memoized Computations

```javascript
// src/hooks/primitives/useMemo.mjs
import { createMemo } from '@unrdf/hooks';

/**
 * Create memoized computation
 *
 * @template T
 * @param {() => T} computation - Computation function
 * @param {Array} [deps] - Dependency array
 * @returns {() => T}
 */
export function useMemo(computation, deps) {
  return createMemo(computation);
}

// Usage Examples:

// Expensive computation
const expensiveResult = useMemo(() => {
  return heavyComputation(data());
}, [data]);

// Derived state
const fullName = useMemo(() => {
  return `${firstName()} ${lastName()}`;
}, [firstName, lastName]);

// Filtered list
const filteredItems = useMemo(() => {
  return items().filter(item => item.active);
}, [items]);
```

### 1.4 useCallback - Stable Function References

```javascript
// src/hooks/primitives/useCallback.mjs
import { createMemo } from '@unrdf/hooks';

/**
 * Create stable callback reference
 *
 * @template T extends Function
 * @param {T} callback - Callback function
 * @param {Array} deps - Dependency array
 * @returns {T}
 */
export function useCallback(callback, deps) {
  return createMemo(() => callback);
}

// Usage Examples:

// Stable event handler
const handleClick = useCallback(() => {
  setCount(count() + 1);
}, [count]);

// Stable callback for child components
const onItemSelect = useCallback((item) => {
  setSelectedItem(item);
}, []);
```

---

## 2. RDF Hook Patterns

### 2.1 useGraph - Reactive RDF Graph

```javascript
// src/composables/graph.mjs
import { useGraph as unrdfUseGraph, useStore } from '@unrdf/hooks';
import { useGitVan } from '../core/context.mjs';
import { useState, useEffect, useMemo } from '../hooks/primitives/index.mjs';

/**
 * Create reactive RDF graph with Git integration
 *
 * @param {string|Store} storeOrPath - Store instance or path to graph
 * @returns {Object} Graph interface
 */
export function useGraph(storeOrPath) {
  const ctx = useGitVan();

  // Initialize store
  const store = typeof storeOrPath === 'string'
    ? useStore(storeOrPath)
    : storeOrPath;

  // Get base graph from @unrdf/hooks
  const graph = unrdfUseGraph(store);

  // Track version for reactivity
  const [version, setVersion] = useState(0);

  // Increment version on changes
  useEffect(() => {
    const unsub = store.subscribe(() => {
      setVersion(v => v + 1);
    });
    return unsub;
  }, [store]);

  return {
    // Inherited from @unrdf/hooks
    ...graph,

    // Version for reactive dependencies
    version,

    // Reactive query hook
    useQuery(sparql) {
      return useMemo(() => graph.query(sparql), [sparql, version]);
    },

    // Reactive ASK query
    useAsk(sparql) {
      return useMemo(() => graph.ask(sparql), [sparql, version]);
    },

    // Git-integrated save
    async saveToGit(path, message) {
      const ttl = await graph.serialize({ format: 'Turtle' });
      await ctx.git.writeFile(path, ttl);
      await ctx.git.add([path]);
      await ctx.git.commit({ message });
    },

    // Load from Git revision
    async loadFromGit(path, revision = 'HEAD') {
      const ttl = await ctx.git.show({ path, revision });
      const quads = await graph.engine.parseTurtle(ttl);
      store.addQuads(quads);
      setVersion(v => v + 1);
    },

    // Graph diff between revisions
    async diffRevisions(path, fromRev, toRev = 'HEAD') {
      const fromTtl = await ctx.git.show({ path, revision: fromRev });
      const toTtl = await ctx.git.show({ path, revision: toRev });

      const fromQuads = await graph.engine.parseTurtle(fromTtl);
      const toQuads = await graph.engine.parseTurtle(toTtl);

      return {
        added: toQuads.filter(q => !fromQuads.some(fq => quadEquals(q, fq))),
        removed: fromQuads.filter(q => !toQuads.some(tq => quadEquals(q, tq)))
      };
    }
  };
}

// Usage Examples:

// Basic usage
const graph = useGraph('./hooks');
const hooks = graph.useQuery(`
  SELECT ?hook ?name WHERE {
    ?hook a gh:Hook .
    ?hook rdfs:label ?name .
  }
`);

// Reactive updates
useEffect(() => {
  console.log(`Graph has ${graph.size} quads`);
}, [graph.version]);

// Save changes
await graph.saveToGit('knowledge/project.ttl', 'Update project graph');
```

### 2.2 useTurtle - Turtle File Management

```javascript
// src/composables/turtle.mjs
import { useTurtle as unrdfUseTurtle } from '@unrdf/hooks';
import { useGitVan } from '../core/context.mjs';
import { useState, useEffect } from '../hooks/primitives/index.mjs';

/**
 * Manage Turtle files with Git integration
 *
 * @param {Object} options - Configuration options
 * @returns {Object} Turtle interface
 */
export async function useTurtle(options = {}) {
  const ctx = useGitVan();
  const graphDir = options.graphDir || ctx.graphDir || './hooks';

  // Initialize base turtle from @unrdf/hooks
  const turtle = await unrdfUseTurtle({
    graphDir,
    ...options
  });

  // Track loaded files
  const [files, setFiles] = useState([]);

  // Discover and load files
  useEffect(() => {
    const discovered = turtle.discoverFiles();
    setFiles(discovered);
  }, [graphDir]);

  return {
    // Inherited from @unrdf/hooks
    ...turtle,

    // Loaded files
    files,

    // Get all hooks from loaded files
    getHooks() {
      return turtle.store.match(null, RDF.type, GH.Hook).map(quad => ({
        id: quad.subject.value,
        ...extractHookMetadata(turtle.store, quad.subject)
      }));
    },

    // Save to Git with commit
    async saveToGit(commitMessage) {
      for (const file of files()) {
        const content = await turtle.serializeFile(file);
        await ctx.git.writeFile(file.path, content);
      }

      await ctx.git.add(files().map(f => f.path));
      await ctx.git.commit({ message: commitMessage });
    },

    // Create new hook file
    async createHookFile(hookId, template) {
      const filePath = `${graphDir}/${hookId}.ttl`;
      const content = renderHookTemplate(template);

      await ctx.git.writeFile(filePath, content);
      await turtle.loadFile(filePath);

      setFiles(prev => [...prev, { path: filePath, id: hookId }]);

      return filePath;
    }
  };
}

// Usage Examples:

const turtle = await useTurtle({ graphDir: './hooks' });

// List all hooks
const hooks = turtle.getHooks();
console.log(`Found ${hooks.length} hooks`);

// Create new hook
await turtle.createHookFile('my-hook', {
  name: 'My Custom Hook',
  predicate: { type: 'ASK', query: 'ASK { ?s ?p ?o }' }
});

// Save changes
await turtle.saveToGit('Add custom hook');
```

### 2.3 useTransaction - Atomic Operations

```javascript
// src/composables/transaction.mjs
import { TransactionManager } from '@unrdf/hooks';
import { useGitVan } from '../core/context.mjs';

/**
 * Create atomic transaction with Git integration
 *
 * @param {Object} options - Transaction options
 * @returns {Object} Transaction interface
 */
export function useTransaction(options = {}) {
  const ctx = useGitVan();
  const manager = new TransactionManager({
    enableObservability: options.observability !== false,
    isolationLevel: options.isolation || 'serializable'
  });

  return {
    /**
     * Execute callback in transaction
     */
    async run(callback, commitOptions = {}) {
      const tx = manager.begin({
        description: commitOptions.message || 'Transaction'
      });

      try {
        // Execute callback with transaction context
        const result = await callback({
          tx,
          graph: tx.getGraph(),
          add: (quads) => tx.add(quads),
          remove: (quads) => tx.remove(quads),
          query: (sparql) => tx.query(sparql)
        });

        // Commit transaction
        await tx.commit();

        // Auto-commit to Git if enabled
        if (options.autoCommit !== false && commitOptions.message) {
          const modifiedFiles = tx.getModifiedFiles();
          if (modifiedFiles.length > 0) {
            await ctx.git.add(modifiedFiles);
            await ctx.git.commit({
              message: commitOptions.message
            });
          }
        }

        return result;
      } catch (error) {
        // Rollback on error
        await tx.rollback();
        throw error;
      }
    },

    /**
     * Create savepoint within transaction
     */
    savepoint(name) {
      return manager.savepoint(name);
    },

    /**
     * Rollback to savepoint
     */
    rollbackTo(savepoint) {
      return manager.rollbackTo(savepoint);
    }
  };
}

// Usage Examples:

const transaction = useTransaction({ autoCommit: true });

// Atomic operation
await transaction.run(async ({ graph, add, query }) => {
  // Add new triples
  add([
    quad(subject, predicate, object)
  ]);

  // Query within transaction
  const result = await query('SELECT * WHERE { ?s ?p ?o }');

  return result;
}, {
  message: 'Add new triples'
});

// With savepoints
await transaction.run(async ({ tx }) => {
  const sp1 = transaction.savepoint('before-risky-op');

  try {
    await riskyOperation(tx);
  } catch (error) {
    transaction.rollbackTo(sp1);
    await safeAlternative(tx);
  }
});
```

---

## 3. Knowledge Hook Patterns

### 3.1 defineHook - Hook Definition API

```javascript
// src/hooks/knowledge/defineHook.mjs
import { defineHook as unrdfDefineHook } from '@unrdf/hooks';
import { useGitVan } from '../../core/context.mjs';

/**
 * Define a GitVan knowledge hook
 *
 * @param {Object} config - Hook configuration
 * @returns {Object} Hook instance
 */
export function defineHook(config) {
  const ctx = useGitVan();

  // Validate configuration
  validateHookConfig(config);

  return unrdfDefineHook({
    // Identification
    name: config.name,
    version: config.version || '1.0.0',
    tags: config.tags || [],

    // Predicate definition
    predicate: normalizePredicate(config.predicate),

    // Lifecycle hooks
    onBeforeEvaluate: async (context) => {
      ctx.logger?.debug(`[${config.name}] Starting evaluation`);

      // Run pre-evaluation hooks
      if (config.onBeforeEvaluate) {
        await config.onBeforeEvaluate(context);
      }

      // Emit event
      ctx.events?.emit('hook:beforeEvaluate', {
        hookName: config.name,
        context
      });
    },

    onAfterEvaluate: async (result) => {
      ctx.logger?.debug(`[${config.name}] Evaluation complete: ${result.triggered}`);

      // Run post-evaluation hooks
      if (config.onAfterEvaluate) {
        await config.onAfterEvaluate(result);
      }

      // Emit event
      ctx.events?.emit('hook:afterEvaluate', {
        hookName: config.name,
        result
      });
    },

    // Main handler with GitVan context injection
    handler: async (context) => {
      // Inject GitVan-specific context
      const gitvanContext = {
        ...context,
        git: ctx.git,
        graph: ctx.graph,
        transaction: useTransaction(),
        logger: ctx.logger,
        config: ctx.config
      };

      // Execute handler
      const result = await config.handler(gitvanContext);

      // Handle result actions
      if (result.commit && result.files) {
        await ctx.git.add(result.files);
        await ctx.git.commit({
          message: result.commit
        });
      }

      return result;
    },

    // Error handling
    onError: async (error) => {
      ctx.logger?.error(`[${config.name}] Error: ${error.message}`);

      if (config.onError) {
        return config.onError(error);
      }

      // Default: re-throw
      throw error;
    },

    // Cleanup
    onCleanup: async () => {
      ctx.logger?.debug(`[${config.name}] Cleanup`);

      if (config.onCleanup) {
        await config.onCleanup();
      }
    }
  });
}

// Usage Examples:

// Simple ASK hook
export default defineHook({
  name: 'critical-issues-detector',
  tags: ['jtbd', 'code-quality'],

  predicate: {
    type: 'ASK',
    query: `
      PREFIX gv: <https://gitvan.dev/ontology#>
      ASK WHERE {
        ?file gv:hasQualityIssue ?issue .
        ?issue gv:severity "critical" .
      }
    `
  },

  handler: async (context) => {
    if (context.result) {
      context.logger.warn('Critical issues detected!');
      return { blocking: true };
    }
    return { blocking: false };
  }
});

// SELECT threshold hook
export default defineHook({
  name: 'test-coverage-enforcer',
  tags: ['jtbd', 'testing'],

  predicate: {
    type: 'SELECT_THRESHOLD',
    query: `
      PREFIX gv: <https://gitvan.dev/ontology#>
      SELECT (AVG(?coverage) AS ?avgCoverage) WHERE {
        ?file gv:testCoverage ?coverage .
      }
    `,
    threshold: 80,
    operator: '<',
    variable: 'avgCoverage'
  },

  handler: async (context) => {
    const coverage = context.queryResult?.avgCoverage || 0;

    if (context.result) {
      context.logger.error(`Coverage ${coverage}% below threshold 80%`);
      return {
        blocking: true,
        message: `Test coverage is ${coverage}%, minimum required is 80%`
      };
    }

    return {
      blocking: false,
      coverage
    };
  }
});

// ResultDelta hook (change detection)
export default defineHook({
  name: 'version-change-detector',
  tags: ['release'],

  predicate: {
    type: 'RESULT_DELTA',
    query: `
      PREFIX gv: <https://gitvan.dev/ontology#>
      SELECT ?version WHERE {
        ?project gv:version ?version .
      }
    `
  },

  handler: async (context) => {
    if (context.result) {
      const { previous, current } = context.delta;
      context.logger.info(`Version changed: ${previous} -> ${current}`);

      return {
        versionChanged: true,
        previousVersion: previous,
        currentVersion: current
      };
    }

    return { versionChanged: false };
  }
});
```

### 3.2 useHooks - Hook Execution

```javascript
// src/hooks/knowledge/useHooks.mjs
import { HookManager } from '@unrdf/hooks';
import { useGitVan } from '../../core/context.mjs';
import { useState, useEffect, useMemo } from '../primitives/index.mjs';

/**
 * Use knowledge hooks with reactive execution
 *
 * @param {Object} graph - Graph instance from useGraph()
 * @returns {Object} Hook management interface
 */
export function useHooks(graph) {
  const ctx = useGitVan();
  const manager = new HookManager({ logger: ctx.logger });

  // State
  const [hooks, setHooks] = useState([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  // Load hooks from graph
  useEffect(() => {
    const loadedHooks = graph.useQuery(`
      PREFIX gh: <http://example.org/git-hooks#>
      SELECT ?hook ?name ?predType WHERE {
        ?hook a gh:Hook .
        OPTIONAL { ?hook rdfs:label ?name }
        OPTIONAL { ?hook gh:predicateType ?predType }
      }
    `);

    setHooks(loadedHooks());
  }, [graph.version]);

  // Evaluate all hooks
  async function evaluate(options = {}) {
    setIsEvaluating(true);
    const startTime = performance.now();

    try {
      const results = await manager.evaluateAll(graph, {
        dryRun: options.dryRun,
        verbose: options.verbose,
        filter: options.filter
      });

      const duration = performance.now() - startTime;

      const result = {
        success: true,
        duration,
        hooksEvaluated: results.length,
        hooksTriggered: results.filter(r => r.triggered).length,
        results
      };

      setLastResult(result);
      return result;
    } catch (error) {
      const result = {
        success: false,
        error: error.message
      };
      setLastResult(result);
      throw error;
    } finally {
      setIsEvaluating(false);
    }
  }

  // Evaluate single hook
  async function evaluateOne(hookId, options = {}) {
    setIsEvaluating(true);

    try {
      const result = await manager.evaluate(hookId, graph, options);
      return result;
    } finally {
      setIsEvaluating(false);
    }
  }

  // Register hook
  function register(hook) {
    manager.register(hook);
    setHooks(prev => [...prev, hook]);
  }

  // Unregister hook
  function unregister(hookId) {
    manager.unregister(hookId);
    setHooks(prev => prev.filter(h => h.id !== hookId));
  }

  return {
    // State
    hooks,
    isEvaluating,
    lastResult,

    // Actions
    evaluate,
    evaluateOne,
    register,
    unregister,

    // Computed
    get triggeredHooks() {
      return lastResult?.results?.filter(r => r.triggered) || [];
    },

    get pendingHooks() {
      return hooks().filter(h => !lastResult?.results?.some(r => r.hookId === h.id));
    }
  };
}

// Usage Examples:

function HookEvaluator() {
  const graph = useGraph('./hooks');
  const { hooks, evaluate, isEvaluating, lastResult } = useHooks(graph);

  // Auto-evaluate on graph changes
  useEffect(() => {
    if (graph.hasChanges) {
      evaluate({ verbose: true });
    }
  }, [graph.version]);

  // Render results
  if (isEvaluating()) {
    return { status: 'evaluating' };
  }

  return {
    hooks: hooks(),
    triggered: lastResult()?.hooksTriggered,
    duration: lastResult()?.duration
  };
}
```

### 3.3 HookRegistry - Central Registry

```javascript
// src/hooks/knowledge/HookRegistry.mjs
import { HookRegistry as UnrdfRegistry } from '@unrdf/hooks';
import { useGitVan } from '../../core/context.mjs';

/**
 * Central registry for all knowledge hooks
 */
export class HookRegistry {
  constructor(options = {}) {
    this.ctx = useGitVan();
    this.registry = new UnrdfRegistry(options);
    this.categories = new Map();
    this.domains = new Map();
  }

  /**
   * Register a hook
   */
  register(hook, metadata = {}) {
    // Register with unrdf
    this.registry.register(hook);

    // Index by category
    const category = metadata.category || 'uncategorized';
    if (!this.categories.has(category)) {
      this.categories.set(category, []);
    }
    this.categories.get(category).push(hook.name);

    // Index by domain
    const domain = metadata.domain || 'general';
    if (!this.domains.has(domain)) {
      this.domains.set(domain, []);
    }
    this.domains.get(domain).push(hook.name);

    this.ctx.logger?.debug(`Registered hook: ${hook.name} [${category}/${domain}]`);
  }

  /**
   * Get hooks by category
   */
  getByCategory(category) {
    const hookNames = this.categories.get(category) || [];
    return hookNames.map(name => this.registry.get(name));
  }

  /**
   * Get hooks by domain
   */
  getByDomain(domain) {
    const hookNames = this.domains.get(domain) || [];
    return hookNames.map(name => this.registry.get(name));
  }

  /**
   * Get all hooks
   */
  getAll() {
    return this.registry.getAll();
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      total: this.registry.size,
      byCategory: Object.fromEntries(
        [...this.categories.entries()].map(([k, v]) => [k, v.length])
      ),
      byDomain: Object.fromEntries(
        [...this.domains.entries()].map(([k, v]) => [k, v.length])
      )
    };
  }

  /**
   * Discover hooks from graph
   */
  async discoverFromGraph(graph) {
    const hookQuads = graph.query(`
      PREFIX gh: <http://example.org/git-hooks#>
      SELECT ?hook ?name ?category ?domain WHERE {
        ?hook a gh:Hook .
        OPTIONAL { ?hook rdfs:label ?name }
        OPTIONAL { ?hook gh:category ?category }
        OPTIONAL { ?hook gh:domain ?domain }
      }
    `);

    for (const row of hookQuads) {
      const hook = await this.parseHookDefinition(graph, row.hook);
      this.register(hook, {
        category: row.category?.value,
        domain: row.domain?.value
      });
    }

    return this.getStats();
  }
}

// Singleton instance
let registryInstance = null;

export function useHookRegistry() {
  if (!registryInstance) {
    registryInstance = new HookRegistry();
  }
  return registryInstance;
}

// Usage Examples:

const registry = useHookRegistry();

// Register hooks
registry.register(myHook, { category: 'jtbd', domain: 'code-quality' });

// Get by category
const jtbdHooks = registry.getByCategory('jtbd');

// Get statistics
const stats = registry.getStats();
console.log(`Total hooks: ${stats.total}`);
```

---

## 4. Git Integration Patterns

### 4.1 useGit - Enhanced Git Operations

```javascript
// src/composables/git.mjs
import { useGitVan } from '../core/context.mjs';
import { useState, useEffect, useMemo } from '../hooks/primitives/index.mjs';

/**
 * Enhanced Git operations with hooks integration
 */
export function useGit(options = {}) {
  const ctx = useGitVan();

  // State
  const [branch, setBranch] = useState('');
  const [isClean, setIsClean] = useState(true);
  const [head, setHead] = useState('');

  // Initialize state
  useEffect(async () => {
    const [b, h, clean] = await Promise.all([
      runGit(['rev-parse', '--abbrev-ref', 'HEAD']),
      runGit(['rev-parse', 'HEAD']),
      runGit(['status', '--porcelain']).then(s => s.trim() === '')
    ]);
    setBranch(b);
    setHead(h);
    setIsClean(clean);
  }, []);

  // File watcher for reactive updates
  useEffect(() => {
    if (options.watch) {
      const watcher = watchGitDir(() => {
        // Refresh state on git directory changes
        refreshState();
      });
      return () => watcher.close();
    }
  }, [options.watch]);

  return {
    // Reactive state
    branch,
    head,
    isClean,

    // Status operations
    async status() {
      const output = await runGit(['status', '--porcelain']);
      return parseStatusOutput(output);
    },

    async log(options = {}) {
      const format = options.format || '%H%x09%s%x09%an%x09%ad';
      const count = options.count || 50;
      const output = await runGit([
        'log',
        `--pretty=format:${format}`,
        `-n${count}`
      ]);
      return parseLogOutput(output);
    },

    // Write operations with hooks
    async add(files) {
      const fileList = Array.isArray(files) ? files : [files];
      await runGit(['add', '--', ...fileList]);
      await refreshState();
    },

    async commit(options) {
      const message = typeof options === 'string' ? options : options.message;
      const args = ['commit', '-m', message];

      if (options.sign) args.push('-S');
      if (options.amend) args.push('--amend');

      await runGit(args);
      await refreshState();

      // Return new HEAD
      return await runGit(['rev-parse', 'HEAD']);
    },

    async push(options = {}) {
      const args = ['push'];
      if (options.force) args.push('--force');
      if (options.setUpstream) args.push('--set-upstream');
      args.push(options.remote || 'origin');
      args.push(options.branch || branch());

      await runGit(args);
    },

    // Notes operations (for receipts)
    async noteAdd(ref, message, sha = 'HEAD') {
      await runGit(['notes', `--ref=${ref}`, 'add', '-f', '-m', message, sha]);
    },

    async noteShow(ref, sha = 'HEAD') {
      try {
        return await runGit(['notes', `--ref=${ref}`, 'show', sha]);
      } catch {
        return null;
      }
    },

    // Diff operations
    async diff(options = {}) {
      const args = ['diff'];
      if (options.cached) args.push('--cached');
      if (options.nameOnly) args.push('--name-only');
      if (options.from) args.push(options.from);
      if (options.to) args.push(options.to);

      return await runGit(args);
    },

    // Info helper
    async info() {
      return {
        branch: branch(),
        head: head(),
        isClean: isClean(),
        root: await runGit(['rev-parse', '--show-toplevel'])
      };
    }
  };
}

// Usage Examples:

const git = useGit({ watch: true });

// Reactive branch display
useEffect(() => {
  console.log(`Current branch: ${git.branch()}`);
}, [git.branch]);

// Commit with auto-refresh
await git.add(['src/**/*.js']);
const sha = await git.commit('Update source files');
console.log(`Committed: ${sha}`);

// Check status reactively
if (!git.isClean()) {
  console.warn('Working directory has uncommitted changes');
}
```

### 4.2 useWorktree - Multi-Worktree Operations

```javascript
// src/composables/worktree.mjs
import { useGit } from './git.mjs';
import { useState, useEffect } from '../hooks/primitives/index.mjs';

/**
 * Multi-worktree operations with hooks
 */
export function useWorktree() {
  const git = useGit();
  const [worktrees, setWorktrees] = useState([]);
  const [current, setCurrent] = useState(null);

  // Load worktrees
  useEffect(async () => {
    const list = await listWorktrees();
    setWorktrees(list);

    const cwd = process.cwd();
    const currentWt = list.find(wt => cwd.startsWith(wt.path));
    setCurrent(currentWt || list[0]);
  }, []);

  async function listWorktrees() {
    const output = await git.run(['worktree', 'list', '--porcelain']);
    return parseWorktreeOutput(output);
  }

  return {
    // State
    worktrees,
    current,

    // Operations
    async list() {
      return worktrees();
    },

    async add(path, branch, options = {}) {
      const args = ['worktree', 'add'];
      if (options.detach) args.push('--detach');
      if (options.force) args.push('--force');
      args.push(path);
      if (branch) args.push(branch);

      await git.run(args);

      // Refresh list
      const updated = await listWorktrees();
      setWorktrees(updated);

      return updated.find(wt => wt.path === path);
    },

    async remove(path, options = {}) {
      const args = ['worktree', 'remove'];
      if (options.force) args.push('--force');
      args.push(path);

      await git.run(args);

      // Refresh list
      const updated = await listWorktrees();
      setWorktrees(updated);
    },

    async prune() {
      await git.run(['worktree', 'prune']);

      // Refresh list
      const updated = await listWorktrees();
      setWorktrees(updated);
    },

    // Execute in worktree context
    async withWorktree(worktree, callback) {
      const originalCwd = process.cwd();

      try {
        process.chdir(worktree.path);
        return await callback(useGit());
      } finally {
        process.chdir(originalCwd);
      }
    }
  };
}

// Usage Examples:

const worktree = useWorktree();

// Add worktree for feature branch
const newWt = await worktree.add('./wt-feature', 'feature/new-feature');

// Execute in worktree
await worktree.withWorktree(newWt, async (git) => {
  await git.add(['*.js']);
  await git.commit('Work in worktree');
});

// Cleanup
await worktree.remove('./wt-feature');
```

---

## 5. Error Handling Patterns

### 5.1 useErrorBoundary - Error Containment

```javascript
// src/hooks/primitives/useErrorBoundary.mjs
import { useState, useEffect } from './index.mjs';

/**
 * Contain errors within boundaries
 */
export function useErrorBoundary(options = {}) {
  const [error, setError] = useState(null);
  const [errorInfo, setErrorInfo] = useState(null);

  function handleError(err, info) {
    setError(err);
    setErrorInfo(info);

    if (options.onError) {
      options.onError(err, info);
    }

    // Log to observability
    if (options.logErrors !== false) {
      console.error('Error caught by boundary:', err);
    }
  }

  function reset() {
    setError(null);
    setErrorInfo(null);
  }

  function retry(callback) {
    reset();
    return callback();
  }

  return {
    error,
    errorInfo,
    hasError: () => error() !== null,
    handleError,
    reset,
    retry,

    // Wrapper for async operations
    async wrap(callback) {
      try {
        return await callback();
      } catch (err) {
        handleError(err, { source: 'async' });
        throw err;
      }
    }
  };
}

// Usage Examples:

const { wrap, hasError, error, retry } = useErrorBoundary({
  onError: (err) => sendToSentry(err)
});

// Wrap risky operations
const result = await wrap(async () => {
  return await riskyOperation();
});

// Handle errors
if (hasError()) {
  console.log('Error occurred:', error().message);
  await retry(() => safeOperation());
}
```

### 5.2 useRetry - Retry Logic

```javascript
// src/hooks/primitives/useRetry.mjs

/**
 * Retry operations with exponential backoff
 */
export function useRetry(options = {}) {
  const maxRetries = options.maxRetries || 3;
  const baseDelay = options.baseDelay || 1000;
  const maxDelay = options.maxDelay || 30000;

  async function retry(callback, context = {}) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await callback(attempt);
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt),
          maxDelay
        );

        // Add jitter
        const jitter = delay * 0.1 * Math.random();

        await sleep(delay + jitter);

        if (options.onRetry) {
          options.onRetry(attempt + 1, error);
        }
      }
    }

    throw lastError;
  }

  return { retry };
}

// Usage Examples:

const { retry } = useRetry({
  maxRetries: 3,
  baseDelay: 1000,
  onRetry: (attempt, error) => {
    console.log(`Retry ${attempt}: ${error.message}`);
  }
});

const result = await retry(async (attempt) => {
  console.log(`Attempt ${attempt + 1}`);
  return await fetchData();
});
```

---

## 6. Testing Patterns

### 6.1 Test Utilities

```javascript
// src/test-utils/hooks.mjs
import { createTestContext, mockGit } from '@gitvan/test-utils';

/**
 * Create test harness for hooks
 */
export function createHookTestHarness() {
  const context = createTestContext();
  const git = mockGit();

  return {
    context,
    git,

    // Run hook in test context
    async runHook(hook, options = {}) {
      return context.run(async () => {
        return await hook.handler({
          git,
          graph: options.graph || createMockGraph(),
          result: options.predicateResult ?? true,
          ...options.context
        });
      });
    },

    // Assert hook behavior
    assertTriggered(result) {
      expect(result.triggered).toBe(true);
    },

    assertNotTriggered(result) {
      expect(result.triggered).toBe(false);
    },

    assertBlocking(result) {
      expect(result.blocking).toBe(true);
    },

    // Verify git operations
    assertCommitCalled(message) {
      expect(git.commit).toHaveBeenCalledWith(
        expect.objectContaining({ message })
      );
    }
  };
}

// Usage in tests:

import { describe, it, expect } from 'vitest';
import { createHookTestHarness } from './test-utils/hooks.mjs';
import myHook from './hooks/my-hook.mjs';

describe('MyHook', () => {
  it('should trigger on critical issues', async () => {
    const harness = createHookTestHarness();

    const result = await harness.runHook(myHook, {
      predicateResult: true,
      context: {
        queryResults: [{ issue: 'Critical bug' }]
      }
    });

    harness.assertTriggered(result);
    harness.assertBlocking(result);
  });

  it('should not trigger when no issues', async () => {
    const harness = createHookTestHarness();

    const result = await harness.runHook(myHook, {
      predicateResult: false
    });

    harness.assertNotTriggered(result);
  });
});
```

---

## 7. Performance Patterns

### 7.1 useBatch - Batched Updates

```javascript
// src/hooks/primitives/useBatch.mjs
import { batch } from '@unrdf/hooks';

/**
 * Batch multiple updates into single render
 */
export function useBatch() {
  return {
    batch(callback) {
      return batch(callback);
    },

    // Queue updates and flush periodically
    createQueue(options = {}) {
      const queue = [];
      const flushInterval = options.interval || 100;
      let timer = null;

      return {
        add(update) {
          queue.push(update);

          if (!timer) {
            timer = setTimeout(() => {
              batch(() => {
                queue.forEach(fn => fn());
                queue.length = 0;
              });
              timer = null;
            }, flushInterval);
          }
        },

        flush() {
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
          batch(() => {
            queue.forEach(fn => fn());
            queue.length = 0;
          });
        }
      };
    }
  };
}

// Usage Examples:

const { batch, createQueue } = useBatch();

// Immediate batch
batch(() => {
  setCount(1);
  setName('test');
  setActive(true);
}); // Single update

// Queued updates
const queue = createQueue({ interval: 50 });

for (const item of items) {
  queue.add(() => processItem(item));
}

queue.flush(); // Process all at once
```

### 7.2 useDebounce / useThrottle

```javascript
// src/hooks/primitives/useDebounce.mjs

export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value());

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value());
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export function useThrottle(callback, limit) {
  let waiting = false;
  let lastArgs = null;

  return (...args) => {
    if (waiting) {
      lastArgs = args;
      return;
    }

    callback(...args);
    waiting = true;

    setTimeout(() => {
      waiting = false;
      if (lastArgs) {
        callback(...lastArgs);
        lastArgs = null;
      }
    }, limit);
  };
}

// Usage Examples:

// Debounced search
const searchTerm = useState('');
const debouncedSearch = useDebounce(searchTerm, 300);

useEffect(() => {
  performSearch(debouncedSearch());
}, [debouncedSearch]);

// Throttled scroll handler
const handleScroll = useThrottle((event) => {
  console.log('Scroll position:', event.target.scrollTop);
}, 100);
```

---

## Document Information

**File**: `/home/user/gitvan/docs/architecture/V4-HOOK-PATTERNS-REFERENCE.md`
**Created**: 2025-12-27
**Purpose**: Implementation patterns for v4 hooks migration
**Related**: V4-REFACTORING-ARCHITECTURE-BLUEPRINT.md

---

*End of Hook Patterns Reference*
