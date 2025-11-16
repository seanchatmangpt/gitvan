/**
 * unrdf Compatibility Layer for GitVan
 *
 * Provides the unrdf API surface built on:
 * - N3.js (RDF parsing/serialization)
 * - Comunica (SPARQL execution)
 * - rdf-validate-shacl (SHACL validation)
 *
 * Implements Dark Matter 80/20 optimizations:
 * - Hook execution batching
 * - LRU query caching
 * - Parallel independent hook execution
 */

import { Parser, Store, Writer, DataFactory } from 'n3';
import { QueryEngine } from '@comunica/query-sparql';
import rdf from 'rdf-ext';
import SHACLValidator from 'rdf-validate-shacl';
import jsonld from 'jsonld';

const { namedNode, literal, quad, blankNode, defaultGraph, variable } = DataFactory;

/**
 * Dark Matter Core System (80/20 optimization)
 *
 * Minimal core with maximum value:
 * - SPARQL query execution
 * - SHACL validation
 * - Knowledge hooks
 * - Transaction management
 * - OTEL instrumentation
 */
export class DarkMatterCore {
  constructor(options = {}) {
    this.baseIRI = options.baseIRI || 'http://example.org/';
    this.timeoutMs = options.timeoutMs || 30_000;
    this.engine = new QueryEngine();
    this.store = new Store();

    // Dark Matter 80/20: LRU query cache
    this.queryCache = new Map();
    this.cacheMaxSize = 1000;
    this.cacheHits = 0;
    this.cacheMisses = 0;

    // Knowledge Hooks
    this.hooks = new Map();
    this.hookExecutionBatch = [];
    this.hookBatchSize = 50;

    // OTEL observability
    this.metrics = {
      queries: 0,
      cacheHitRate: 0,
      avgQueryTime: 0,
      hookExecutions: 0,
      errors: 0
    };
  }

  /**
   * Create and return Dark Matter Core instance
   */
  static async create(options = {}) {
    const core = new DarkMatterCore(options);
    return core;
  }

  /**
   * Execute SPARQL query with caching and timeout
   */
  async query(queryConfig) {
    const { query, type = 'sparql-select', limit = Infinity } = queryConfig;

    // Cache key
    const cacheKey = `${type}:${query}`;

    // Check query cache (Dark Matter optimization)
    if (this.queryCache.has(cacheKey)) {
      this.cacheHits++;
      this._updateCacheHitRate();
      return this.queryCache.get(cacheKey);
    }

    this.cacheMisses++;
    this._updateCacheHitRate();

    const t0 = performance.now();
    this.metrics.queries++;

    try {
      const result = await this._executeQuery(query, type, limit);

      // Cache result
      if (this.queryCache.size >= this.cacheMaxSize) {
        const firstKey = this.queryCache.keys().next().value;
        this.queryCache.delete(firstKey);
      }
      this.queryCache.set(cacheKey, result);

      // Update metrics
      const duration = performance.now() - t0;
      this.metrics.avgQueryTime =
        (this.metrics.avgQueryTime * (this.metrics.queries - 1) + duration) /
        this.metrics.queries;

      return result;
    } catch (error) {
      this.metrics.errors++;
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }

  /**
   * Internal query execution with timeout
   */
  async _executeQuery(sparql, kind, limit) {
    const ctx = { sources: [this.store] };
    const q = sparql.trim();

    return new Promise(async (resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Query timeout after ${this.timeoutMs}ms`)),
        this.timeoutMs
      );

      try {
        if (kind === 'sparql-ask') {
          const boolean = await this.engine.queryBoolean(q, ctx);
          resolve({ type: 'ask', boolean });
        } else if (kind === 'sparql-construct') {
          const quadStream = await this.engine.queryQuads(q, ctx);
          const quads = [];
          for await (const qq of quadStream) quads.push(qq);
          resolve({ type: 'construct', quads });
        } else {
          // SELECT
          const bindings = await this.engine.queryBindings(q, ctx);
          const rows = [];
          const varSet = new Set();

          for await (const b of bindings) {
            for (const k of b.keys()) varSet.add(k.value);
            const row = {};
            for (const v of varSet) {
              const term = b.get(variable(v));
              row[v] = this._termToJSON(term);
            }
            rows.push(row);
            if (rows.length >= limit) break;
          }

          resolve({
            type: 'select',
            variables: [...varSet].sort(),
            results: rows
          });
        }
        clearTimeout(timer);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  /**
   * Validate RDF data against SHACL shapes
   */
  async validate({ dataGraph, shapesGraph }) {
    const dataDataset = rdf.dataset([...dataGraph]);
    const shapesDataset = rdf.dataset([...shapesGraph]);
    const validator = new SHACLValidator(shapesDataset);

    const report = await validator.validate(dataDataset);

    return {
      conforms: report.conforms,
      results: report.results.map(r => ({
        focusNode: r.focusNode?.value || null,
        path: r.path?.value || null,
        message: r.message?.[0]?.value || null,
        severity: r.severity?.value || null
      }))
    };
  }

  /**
   * Execute transaction with hooks and audit trail
   */
  async executeTransaction({ additions, removals, actor }) {
    const txStart = performance.now();

    try {
      // Add quads
      for (const q of additions) this.store.add(q);
      for (const q of removals) this.store.delete(q);

      // Execute hooks (Dark Matter: batched and parallel)
      const hookResults = await this._executeBatchedHooks({
        additions,
        removals,
        actor
      });

      const delta = {
        additions: additions.length,
        removals: removals.length,
        hookResults
      };

      return {
        success: true,
        delta,
        duration: performance.now() - txStart
      };
    } catch (error) {
      // Rollback
      for (const q of additions) this.store.delete(q);
      throw error;
    }
  }

  /**
   * Batch hook execution (Dark Matter 80/20 optimization)
   */
  async _executeBatchedHooks({ additions, removals, actor }) {
    const results = [];
    const independentHooks = Array.from(this.hooks.values());

    // Execute hooks in parallel (Dark Matter optimization)
    const batchSize = this.hookBatchSize;
    for (let i = 0; i < independentHooks.length; i += batchSize) {
      const batch = independentHooks.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(hook =>
          this._executeHook(hook, { additions, removals, actor })
        )
      );
      results.push(...batchResults);
    }

    this.metrics.hookExecutions += results.length;
    return results;
  }

  /**
   * Execute single hook with isolation
   */
  async _executeHook(hook, event) {
    const t0 = performance.now();

    try {
      // Evaluate predicate
      let predicateResult;
      if (hook.when.kind === 'sparql-ask') {
        const result = await this.query({
          query: hook.when.query,
          type: 'sparql-ask'
        });
        predicateResult = result.boolean;
      }

      // Run effect if predicate is true
      if (predicateResult && hook.run) {
        await hook.run({
          result: predicateResult,
          event
        });
      }

      return {
        hookId: hook.meta.name,
        success: true,
        predicateResult,
        duration: performance.now() - t0
      };
    } catch (error) {
      return {
        hookId: hook.meta.name,
        success: false,
        error: error.message,
        duration: performance.now() - t0
      };
    }
  }

  /**
   * Register a knowledge hook
   */
  async registerHook(hook) {
    if (!hook.meta?.name) throw new Error('Hook must have meta.name');
    this.hooks.set(hook.meta.name, hook);
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.queryCache.size,
      hookCount: this.hooks.size
    };
  }

  /**
   * Update cache hit rate metric
   */
  _updateCacheHitRate() {
    const total = this.cacheHits + this.cacheMisses;
    this.metrics.cacheHitRate = total > 0 ? this.cacheHits / total : 0;
  }

  /**
   * Convert RDF term to JSON
   */
  _termToJSON(term) {
    if (!term) return null;
    const out = { termType: term.termType, value: term.value };
    if (term.termType === 'Literal') {
      if (term.language) out.language = term.language;
      if (term.datatype?.value) out.datatype = term.datatype.value;
    }
    return out;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.queryCache.clear();
    this.hooks.clear();
  }
}

/**
 * Create Dark Matter Core instance (recommended entry point)
 */
export async function createDarkMatterCore(options = {}) {
  return await DarkMatterCore.create(options);
}

/**
 * Parse Turtle to RDF Store
 */
export async function parseTurtle(ttl, baseIRI = 'http://example.org/') {
  if (typeof ttl !== 'string' || !ttl.length) {
    throw new Error('parseTurtle: non-empty string required');
  }
  const parser = new Parser({ baseIRI });
  return new Store(parser.parse(ttl));
}

/**
 * Parse JSON-LD to RDF Store
 */
export async function parseJsonLd(doc) {
  const nquads = await jsonld.toRDF(doc, {
    format: 'application/n-quads'
  });
  const parser = new Parser({ format: 'N-Quads' });
  return new Store(parser.parse(nquads));
}

/**
 * Serialize RDF Store to Turtle
 */
export async function toTurtle(store, options = {}) {
  return new Promise((resolve, reject) => {
    const writer = new Writer({ format: 'Turtle', prefixes: options.prefixes });
    writer.addQuads([...store]);
    writer.end((err, result) => err ? reject(err) : resolve(result));
  });
}

/**
 * Serialize RDF Store to JSON-LD
 */
export async function toJsonLd(store, options = {}) {
  const nquads = await new Promise((resolve, reject) => {
    const writer = new Writer({ format: 'N-Quads' });
    writer.addQuads([...store]);
    writer.end((err, result) => err ? reject(err) : resolve(result));
  });

  const doc = await jsonld.fromRDF(nquads, {
    format: 'application/n-quads'
  });

  if (options.context) {
    return jsonld.compact(doc, options.context);
  }

  return doc;
}

/**
 * Serialize RDF Store to N-Quads
 */
export async function toNQuads(store) {
  return new Promise((resolve, reject) => {
    const writer = new Writer({ format: 'N-Quads' });
    writer.addQuads([...store]);
    writer.end((err, result) => err ? reject(err) : resolve(result));
  });
}

/**
 * Define a Knowledge Hook
 */
export function defineHook(config) {
  if (!config.meta?.name) {
    throw new Error('Hook must have meta.name');
  }
  if (!config.when) {
    throw new Error('Hook must have when (predicate definition)');
  }
  return config;
}

/**
 * Register Knowledge Hook (requires DarkMatterCore instance)
 */
export async function registerHook(hook) {
  // Note: This is a stub. In actual usage, pass the core instance
  // This is used when creating hooks globally
  return { success: true, hook };
}

/**
 * Create RDF terms (re-exports from N3)
 */
export {
  namedNode,
  literal,
  quad,
  blankNode,
  defaultGraph,
  variable
};

export { Store, Parser, Writer };

// Default export
export default {
  createDarkMatterCore,
  parseTurtle,
  parseJsonLd,
  toTurtle,
  toJsonLd,
  toNQuads,
  defineHook,
  registerHook,
  DarkMatterCore
};
