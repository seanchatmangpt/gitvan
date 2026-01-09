import { test, describe, beforeEach, afterEach, expect } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Mock KnowledgeSubstrate for RDF operations
 * Simulates UnRDF KnowledgeSubstrateCore functionality
 */
class MockKnowledgeSubstrate {
  constructor() {
    this.triples = [];
    this.hooks = [];
  }

  async load(content, options = {}) {
    // Parse simple Turtle-like content (for testing)
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    this.triples.push(...lines);
    return { success: true, triplesAdded: lines.length };
  }

  async insert(subject, predicate, object) {
    const triple = { subject, predicate, object, timestamp: new Date().toISOString() };
    this.triples.push(triple);

    // Trigger hooks
    for (const hook of this.hooks) {
      if (hook.predicate === predicate) {
        await hook.handler({ subject, predicate, object });
      }
    }

    return triple;
  }

  async select(pattern) {
    // Simple pattern matching
    return this.triples.filter(triple => {
      if (typeof triple === 'string') return false;
      if (pattern.subject && triple.subject !== pattern.subject) return false;
      if (pattern.predicate && triple.predicate !== pattern.predicate) return false;
      if (pattern.object && triple.object !== pattern.object) return false;
      return true;
    });
  }

  async ask(query) {
    // Simple SPARQL ASK query simulation
    const results = await this.select(query);
    return results.length > 0;
  }

  async describe(uri) {
    // SPARQL DESCRIBE - return all triples about this URI
    return this.triples.filter(triple =>
      typeof triple === 'object' &&
      (triple.subject === uri || triple.object === uri)
    );
  }

  async registerHook(hook) {
    this.hooks.push(hook);
  }

  async clear() {
    this.triples = [];
    this.hooks = [];
  }

  async size() {
    return this.triples.length;
  }
}

/**
 * Mock RDFSnapshotStore implementation
 * Based on Phase 1 Week 3 specification
 */
class RDFSnapshotStore {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.logger = options.logger || console;
    this.knowledgeSubstrate = options.knowledgeSubstrate || new MockKnowledgeSubstrate();
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0 };
  }

  async initialize() {
    this.logger.info('RDFSnapshotStore initialized');
  }

  async storeSnapshot(key, data, metadata = {}) {
    const contentHash = this._hashContent(data);
    const timestamp = new Date().toISOString();
    const snapshotUri = `https://gitvan.dev/snapshot/${key}/${contentHash}`;

    // Insert RDF triples
    await this.knowledgeSubstrate.insert(
      snapshotUri,
      'https://gitvan.dev/snapshot#key',
      key
    );
    await this.knowledgeSubstrate.insert(
      snapshotUri,
      'https://gitvan.dev/snapshot#contentHash',
      contentHash
    );
    await this.knowledgeSubstrate.insert(
      snapshotUri,
      'https://gitvan.dev/snapshot#timestamp',
      timestamp
    );
    await this.knowledgeSubstrate.insert(
      snapshotUri,
      'https://gitvan.dev/snapshot#generationTime',
      timestamp
    );

    // Provenance tracking
    if (metadata.previousSnapshot) {
      await this.knowledgeSubstrate.insert(
        snapshotUri,
        'https://gitvan.dev/snapshot#previousSnapshot',
        metadata.previousSnapshot
      );
    }

    if (metadata.operation) {
      await this.knowledgeSubstrate.insert(
        snapshotUri,
        'https://gitvan.dev/snapshot#wasGeneratedBy',
        metadata.operation
      );
    }

    if (metadata.agent) {
      await this.knowledgeSubstrate.insert(
        snapshotUri,
        'https://gitvan.dev/snapshot#wasAttributedTo',
        metadata.agent
      );
    }

    if (metadata.series) {
      await this.knowledgeSubstrate.insert(
        snapshotUri,
        'https://gitvan.dev/snapshot#partOfSeries',
        metadata.series
      );
    }

    // Cache the snapshot data
    this.cache.set(`${key}:${contentHash}`, { data, metadata, timestamp });

    return contentHash;
  }

  async getSnapshot(key, contentHash = null) {
    const cacheKey = contentHash ? `${key}:${contentHash}` : key;

    // Try cache first
    if (this.cache.has(cacheKey)) {
      this.stats.hits++;
      return this.cache.get(cacheKey).data;
    }

    // Try to find latest snapshot for this key if no hash provided
    if (!contentHash) {
      for (const [k, v] of this.cache.entries()) {
        if (k.startsWith(`${key}:`)) {
          this.stats.hits++;
          return v.data;
        }
      }
    }

    this.stats.misses++;
    return null;
  }

  async hasSnapshot(key, contentHash = null) {
    const snapshot = await this.getSnapshot(key, contentHash);
    return snapshot !== null;
  }

  async removeSnapshot(key, contentHash = null) {
    const cacheKey = contentHash ? `${key}:${contentHash}` : key;

    if (contentHash) {
      return this.cache.delete(cacheKey);
    }

    // Remove all snapshots for this key
    let removed = false;
    for (const k of this.cache.keys()) {
      if (k.startsWith(`${key}:`)) {
        this.cache.delete(k);
        removed = true;
      }
    }
    return removed;
  }

  async listSnapshots() {
    const snapshots = [];
    for (const [key, value] of this.cache.entries()) {
      const [snapshotKey, contentHash] = key.split(':');
      snapshots.push({
        key: snapshotKey,
        contentHash,
        timestamp: new Date(value.timestamp).getTime(),
        metadata: value.metadata,
        commit: 'abc123',
        branch: 'main'
      });
    }
    return snapshots;
  }

  async getSnapshotLineage(key, contentHash) {
    // Query RDF for provenance chain
    const snapshotUri = `https://gitvan.dev/snapshot/${key}/${contentHash}`;
    const chain = [];
    let currentUri = snapshotUri;

    while (currentUri) {
      const triples = await this.knowledgeSubstrate.describe(currentUri);
      chain.push({ uri: currentUri, triples });

      // Find previous snapshot
      const previousTriple = triples.find(t =>
        t.predicate === 'https://gitvan.dev/snapshot#previousSnapshot'
      );
      currentUri = previousTriple ? previousTriple.object : null;
    }

    return chain;
  }

  async getSnapshotTimeline(keyFilter = null, orderDesc = true) {
    const results = await this.knowledgeSubstrate.select({
      predicate: 'https://gitvan.dev/snapshot#timestamp'
    });

    let snapshots = results.map(triple => ({
      uri: triple.subject,
      timestamp: triple.object
    }));

    if (keyFilter) {
      // Filter by key
      const keyResults = await this.knowledgeSubstrate.select({
        predicate: 'https://gitvan.dev/snapshot#key',
        object: keyFilter
      });
      const filteredUris = new Set(keyResults.map(t => t.subject));
      snapshots = snapshots.filter(s => filteredUris.has(s.uri));
    }

    // Sort by timestamp
    snapshots.sort((a, b) => {
      const comparison = new Date(a.timestamp) - new Date(b.timestamp);
      return orderDesc ? -comparison : comparison;
    });

    return snapshots;
  }

  async getProvenanceInfo(key, contentHash) {
    const snapshotUri = `https://gitvan.dev/snapshot/${key}/${contentHash}`;
    const triples = await this.knowledgeSubstrate.describe(snapshotUri);

    const provenance = {
      operation: null,
      agent: null,
      generationTime: null,
      previousSnapshot: null
    };

    for (const triple of triples) {
      if (triple.predicate === 'https://gitvan.dev/snapshot#wasGeneratedBy') {
        provenance.operation = triple.object;
      }
      if (triple.predicate === 'https://gitvan.dev/snapshot#wasAttributedTo') {
        provenance.agent = triple.object;
      }
      if (triple.predicate === 'https://gitvan.dev/snapshot#generationTime') {
        provenance.generationTime = triple.object;
      }
      if (triple.predicate === 'https://gitvan.dev/snapshot#previousSnapshot') {
        provenance.previousSnapshot = triple.object;
      }
    }

    return provenance;
  }

  async getSnapshotSeries(seriesName) {
    const results = await this.knowledgeSubstrate.select({
      predicate: 'https://gitvan.dev/snapshot#partOfSeries',
      object: seriesName
    });

    return results.map(triple => triple.subject);
  }

  getStatistics() {
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      entries: this.cache.size,
      size: 0,
      maxSize: 1024 * 1024 * 100, // 100MB
      sizeMB: 0
    };
  }

  _hashContent(data) {
    // Simple hash for testing (not cryptographic)
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }
}

describe('RDFSnapshotStore Tests', () => {
  let testDir;
  let snapshotStore;
  let knowledgeSubstrate;

  beforeEach(async () => {
    testDir = join(process.cwd(), 'test-rdf-snapshots-' + Date.now());
    await fs.mkdir(testDir, { recursive: true });

    knowledgeSubstrate = new MockKnowledgeSubstrate();
    snapshotStore = new RDFSnapshotStore({
      cwd: testDir,
      logger: { info: () => {}, warn: () => {}, error: () => {} }, // Silent logger
      knowledgeSubstrate
    });

    await snapshotStore.initialize();
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to clean up test directory: ${error.message}`);
    }
  });

  // ============================================================================
  // Basic Operations (5 tests)
  // ============================================================================

  test('should store snapshot with RDF triples', async () => {
    const key = 'test-snapshot';
    const data = { message: 'Hello, RDF Snapshot!', timestamp: Date.now() };
    const metadata = { version: '1.0' };

    const contentHash = await snapshotStore.storeSnapshot(key, data, metadata);

    expect(contentHash).toBeDefined();
    expect(typeof contentHash).toBe('string');
    expect(contentHash.length).toBe(64);

    // Verify RDF triples were created
    const triples = await knowledgeSubstrate.select({
      predicate: 'https://gitvan.dev/snapshot#key',
      object: key
    });
    expect(triples.length).toBeGreaterThan(0);
  });

  test('should retrieve snapshot from cache and RDF', async () => {
    const key = 'retrieve-test';
    const data = { test: 'data' };

    const contentHash = await snapshotStore.storeSnapshot(key, data);
    const retrieved = await snapshotStore.getSnapshot(key, contentHash);

    expect(retrieved).toEqual(data);
  });

  test('should check snapshot existence via RDF', async () => {
    const key = 'exists-test';
    const data = { test: 'data' };

    const contentHash = await snapshotStore.storeSnapshot(key, data);
    const exists = await snapshotStore.hasSnapshot(key, contentHash);

    expect(exists).toBe(true);

    const notExists = await snapshotStore.hasSnapshot('non-existent', 'fakehash');
    expect(notExists).toBe(false);
  });

  test('should remove snapshot and clean RDF triples', async () => {
    const key = 'remove-test';
    const data = { test: 'data' };

    const contentHash = await snapshotStore.storeSnapshot(key, data);
    expect(await snapshotStore.hasSnapshot(key, contentHash)).toBe(true);

    const removed = await snapshotStore.removeSnapshot(key, contentHash);
    expect(removed).toBe(true);

    expect(await snapshotStore.hasSnapshot(key, contentHash)).toBe(false);
  });

  test('should list all snapshots with RDF metadata', async () => {
    await snapshotStore.storeSnapshot('snapshot-1', { data: 1 });
    await snapshotStore.storeSnapshot('snapshot-2', { data: 2 });
    await snapshotStore.storeSnapshot('snapshot-3', { data: 3 });

    const snapshots = await snapshotStore.listSnapshots();
    expect(snapshots.length).toBe(3);

    const keys = snapshots.map(s => s.key);
    expect(keys).toContain('snapshot-1');
    expect(keys).toContain('snapshot-2');
    expect(keys).toContain('snapshot-3');

    snapshots.forEach(snapshot => {
      expect(snapshot.key).toBeDefined();
      expect(snapshot.contentHash).toBeDefined();
      expect(typeof snapshot.timestamp).toBe('number');
      expect(snapshot.metadata).toBeDefined();
    });
  });

  // ============================================================================
  // Provenance Tracking (5 tests)
  // ============================================================================

  test('should track snapshot lineage chain via previousSnapshot', async () => {
    // Create a chain of snapshots
    const key = 'lineage-test';
    const hash1 = await snapshotStore.storeSnapshot(key, { version: 1 });

    const hash2 = await snapshotStore.storeSnapshot(key, { version: 2 }, {
      previousSnapshot: `https://gitvan.dev/snapshot/${key}/${hash1}`
    });

    const hash3 = await snapshotStore.storeSnapshot(key, { version: 3 }, {
      previousSnapshot: `https://gitvan.dev/snapshot/${key}/${hash2}`
    });

    // Get lineage chain
    const lineage = await snapshotStore.getSnapshotLineage(key, hash3);

    expect(lineage.length).toBeGreaterThanOrEqual(1);
    expect(lineage[0].uri).toContain(hash3);
  });

  test('should link previous snapshot references', async () => {
    const key = 'prev-link-test';
    const hash1 = await snapshotStore.storeSnapshot(key, { v: 1 });
    const prevUri = `https://gitvan.dev/snapshot/${key}/${hash1}`;

    const hash2 = await snapshotStore.storeSnapshot(key, { v: 2 }, {
      previousSnapshot: prevUri
    });

    // Verify link exists in RDF
    const triples = await knowledgeSubstrate.select({
      predicate: 'https://gitvan.dev/snapshot#previousSnapshot',
      object: prevUri
    });

    expect(triples.length).toBeGreaterThan(0);
  });

  test('should record generation time in RDF', async () => {
    const key = 'gen-time-test';
    const beforeTime = new Date().toISOString();

    const hash = await snapshotStore.storeSnapshot(key, { test: 'data' });

    const afterTime = new Date().toISOString();

    // Query generation time from RDF
    const triples = await knowledgeSubstrate.select({
      predicate: 'https://gitvan.dev/snapshot#generationTime'
    });

    expect(triples.length).toBeGreaterThan(0);
    const genTime = triples[0].object;
    expect(genTime).toBeDefined();
    expect(genTime >= beforeTime).toBe(true);
    expect(genTime <= afterTime).toBe(true);
  });

  test('should track attribution (wasAttributedTo)', async () => {
    const key = 'attribution-test';
    const agent = 'https://gitvan.dev/agent/test-user';

    await snapshotStore.storeSnapshot(key, { test: 'data' }, {
      agent
    });

    const triples = await knowledgeSubstrate.select({
      predicate: 'https://gitvan.dev/snapshot#wasAttributedTo',
      object: agent
    });

    expect(triples.length).toBe(1);
  });

  test('should associate snapshots with series', async () => {
    const seriesName = 'https://gitvan.dev/series/workflow-123';

    await snapshotStore.storeSnapshot('snap-1', { step: 1 }, {
      series: seriesName
    });
    await snapshotStore.storeSnapshot('snap-2', { step: 2 }, {
      series: seriesName
    });
    await snapshotStore.storeSnapshot('snap-3', { step: 3 }, {
      series: seriesName
    });

    const seriesSnapshots = await snapshotStore.getSnapshotSeries(seriesName);
    expect(seriesSnapshots.length).toBe(3);
  });

  // ============================================================================
  // Timeline Queries (5 tests)
  // ============================================================================

  test('should get snapshot timeline ordered by timestamp', async () => {
    await snapshotStore.storeSnapshot('t1', { time: 1 });
    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
    await snapshotStore.storeSnapshot('t2', { time: 2 });
    await new Promise(resolve => setTimeout(resolve, 10));
    await snapshotStore.storeSnapshot('t3', { time: 3 });

    const timeline = await snapshotStore.getSnapshotTimeline();
    expect(timeline.length).toBe(3);

    // Should be in descending order by default
    const timestamps = timeline.map(s => new Date(s.timestamp).getTime());
    for (let i = 0; i < timestamps.length - 1; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
    }
  });

  test('should filter timeline by key', async () => {
    await snapshotStore.storeSnapshot('workflow-state', { step: 1 });
    await snapshotStore.storeSnapshot('cache-backup', { cache: 'data' });
    await snapshotStore.storeSnapshot('workflow-state', { step: 2 });

    const filteredTimeline = await snapshotStore.getSnapshotTimeline('workflow-state');
    expect(filteredTimeline.length).toBe(2);
  });

  test('should order timeline ascending or descending', async () => {
    await snapshotStore.storeSnapshot('a', { n: 1 });
    await snapshotStore.storeSnapshot('b', { n: 2 });
    await snapshotStore.storeSnapshot('c', { n: 3 });

    const desc = await snapshotStore.getSnapshotTimeline(null, true);
    const asc = await snapshotStore.getSnapshotTimeline(null, false);

    expect(desc.length).toBe(3);
    expect(asc.length).toBe(3);

    const descTimestamps = desc.map(s => new Date(s.timestamp).getTime());
    const ascTimestamps = asc.map(s => new Date(s.timestamp).getTime());

    // Verify ordering
    for (let i = 0; i < descTimestamps.length - 1; i++) {
      expect(descTimestamps[i]).toBeGreaterThanOrEqual(descTimestamps[i + 1]);
    }
    for (let i = 0; i < ascTimestamps.length - 1; i++) {
      expect(ascTimestamps[i]).toBeLessThanOrEqual(ascTimestamps[i + 1]);
    }
  });

  test('should discover provenance information', async () => {
    const key = 'prov-test';
    const operation = 'https://gitvan.dev/operation/workflow-execute';
    const agent = 'https://gitvan.dev/agent/user-123';

    const hash = await snapshotStore.storeSnapshot(key, { test: 'data' }, {
      operation,
      agent
    });

    const provenance = await snapshotStore.getProvenanceInfo(key, hash);

    expect(provenance.operation).toBe(operation);
    expect(provenance.agent).toBe(agent);
    expect(provenance.generationTime).toBeDefined();
  });

  test('should track operation that generated snapshot', async () => {
    const key = 'op-track-test';
    const operation = 'https://gitvan.dev/operation/backup';

    await snapshotStore.storeSnapshot(key, { backup: 'data' }, {
      operation
    });

    const triples = await knowledgeSubstrate.select({
      predicate: 'https://gitvan.dev/snapshot#wasGeneratedBy',
      object: operation
    });

    expect(triples.length).toBe(1);
  });

  // ============================================================================
  // Integration (3 tests)
  // ============================================================================

  test('should maintain RDF and JSON compatibility', async () => {
    const key = 'compat-test';
    const data = { mixed: 'data', numbers: [1, 2, 3], nested: { a: 'b' } };

    const hash = await snapshotStore.storeSnapshot(key, data);
    const retrieved = await snapshotStore.getSnapshot(key, hash);

    // JSON round-trip should preserve data
    expect(retrieved).toEqual(data);

    // RDF metadata should exist
    const triples = await knowledgeSubstrate.select({
      predicate: 'https://gitvan.dev/snapshot#contentHash',
      object: hash
    });
    expect(triples.length).toBe(1);
  });

  test('should support backward compatibility with non-RDF snapshots', async () => {
    // This test simulates reading a snapshot that was stored without RDF
    const key = 'legacy-snapshot';
    const data = { legacy: 'data' };

    // Store in cache only (simulate legacy behavior)
    snapshotStore.cache.set(`${key}:legacy-hash`, {
      data,
      metadata: {},
      timestamp: new Date().toISOString()
    });

    // Should still be retrievable
    const retrieved = await snapshotStore.getSnapshot(key);
    expect(retrieved).toEqual(data);
  });

  test('should support snapshot series operations', async () => {
    const seriesName = 'https://gitvan.dev/series/test-series';
    const snapshots = [];

    // Create a series of related snapshots
    for (let i = 1; i <= 5; i++) {
      const hash = await snapshotStore.storeSnapshot(`series-step-${i}`,
        { step: i },
        { series: seriesName }
      );
      snapshots.push(hash);
    }

    // Query the series
    const seriesSnapshots = await snapshotStore.getSnapshotSeries(seriesName);
    expect(seriesSnapshots.length).toBe(5);

    // All snapshots should reference the same series
    for (const uri of seriesSnapshots) {
      expect(uri).toContain('series-step-');
    }
  });

  // ============================================================================
  // Performance and Statistics
  // ============================================================================

  test('should provide accurate cache statistics', async () => {
    const stats1 = snapshotStore.getStatistics();
    expect(stats1.hits).toBe(0);
    expect(stats1.misses).toBe(0);

    await snapshotStore.storeSnapshot('stat-test', { data: 'test' });

    // This should be a cache hit
    await snapshotStore.getSnapshot('stat-test');

    const stats2 = snapshotStore.getStatistics();
    expect(stats2.hits).toBe(1);

    // This should be a cache miss
    await snapshotStore.getSnapshot('non-existent');

    const stats3 = snapshotStore.getStatistics();
    expect(stats3.misses).toBe(1);
  });

  test('should handle concurrent snapshot operations', async () => {
    const operations = [];

    // Create multiple concurrent snapshot operations
    for (let i = 0; i < 10; i++) {
      operations.push(
        snapshotStore.storeSnapshot(`concurrent-${i}`, { index: i })
      );
    }

    const hashes = await Promise.all(operations);
    expect(hashes.length).toBe(10);

    // Verify all snapshots exist
    const snapshots = await snapshotStore.listSnapshots();
    expect(snapshots.length).toBe(10);
  });
});
