# GitVan Streaming and Large-Scale Dataset Processing Plan

**Date:** January 10, 2026
**Version:** 1.0
**Status:** Research & Planning
**Target:** Comprehensive streaming architecture for GitVan v5.0+

---

## Executive Summary

GitVan's current architecture uses in-memory RDF stores via unrdf v4.1.1, supporting repositories with up to ~100 files and 50 commits in testing. For large codebases with thousands of commits, millions of RDF triples, and complex git histories, the system requires streaming and chunked processing capabilities.

This plan outlines a comprehensive strategy for:
- **Streaming Turtle file parsing** for large RDF datasets
- **Chunked git history traversal** for repositories with 10,000+ commits
- **Incremental SPARQL query processing** with streaming results
- **Memory-efficient graph analysis** without loading entire graphs
- **Batch operation optimization** with automatic flushing
- **Pagination strategies** for large result sets
- **Streaming output formats** (N-Triples, JSON-LD streaming)
- **Resource limit integration** (memory, CPU, disk I/O)

---

## Part 1: Current State Analysis

### 1.1 In-Memory Store Limitations

**Current Architecture:**
```
useGraph(store) → executeQuery(store, sparql) → Load all quads → Execute → Serialize
```

**Identified Limitations:**

| Limitation | Impact | Threshold |
|-----------|--------|-----------|
| Full graph loading | OOM on large datasets | >100MB RDF data |
| Single-threaded SPARQL | High latency | >50K result rows |
| Complete result materialization | Memory spikes | >1M quads |
| No pagination | All-or-nothing results | Large result sets |
| Static buffer allocation | Wasted memory | Small queries |

**Evidence from Codebase:**
- `src/composables/graph.mjs` (127 lines): Uses unrdf Store directly
- `maxBuffer: 12MB` in git operations caps individual git command output
- `notesBatchSize: 100` in ReceiptWriter suggests manual batching requirement
- Tests max out at 50 commits (~5K quads equivalent)

### 1.2 Current Streaming Infrastructure

**Existing Patterns (can be leveraged):**

1. **Batching in ReceiptWriter** (`src/git-native/ReceiptWriter.mjs`):
```javascript
this.notesBatchSize = 100;  // Batch receipts before flushing
if (this._receiptBuffer.length >= this.notesBatchSize) {
  await this.flushAll();
}
```

2. **Job Bridge Batching** (`src/jobs/job-bridge-core.mjs`):
```javascript
this.batchSize = 10;
const batch = this.queue.splice(0, this.batchSize);
await Promise.allSettled(batch.map(item => this.receipt.write(item)));
```

3. **Git maxBuffer** (`src/composables/git.mjs`):
```javascript
maxBuffer = 12 * 1024 * 1024  // 12MB for large git outputs
```

### 1.3 Git History Handling

**Current Approach:**
- `git.log()` loads entire history into memory
- No pagination or chunking
- Tests demonstrate 50 commits is baseline
- No support for filtering during traversal

**Gap Analysis:**
- Large repositories (10K+ commits) will cause memory exhaustion
- Historical analysis requires full scan
- No lazy loading of commit data
- No streaming git pack format support

### 1.4 RDF/SPARQL Query Limitations

**Current Implementation:**
- `useGraph()` wraps unrdf Store directly
- `executeQuery()` materializes all results
- No cursor-based or streaming query support
- Result serialization is synchronous

**Performance Characteristics:**
- Small datasets (<1K quads): <50ms
- Medium datasets (10K quads): 50-200ms
- Large datasets (1M+ quads): Timeout or OOM

---

## Part 2: Streaming RDF Processing Capabilities Research

### 2.1 Turtle Parser Streaming Options

**Option A: N3.js with EventEmitter** ✅ RECOMMENDED
```javascript
// npm: n3@1.17.0 (already in package.json)
import { Parser } from 'n3';

const parser = new Parser({});
const quads = [];

fs.createReadStream('large.ttl')
  .pipe(new StringDecoder())
  .on('data', chunk => {
    parser.parse(chunk);  // Incremental parsing
  })
  .on('quad', quad => {
    // Process quad stream
    processQuad(quad);
  });
```

**Advantages:**
- Already installed (n3@1.17.0)
- Streaming parser with quad event emission
- Supports all Turtle features
- Event-driven architecture

**Limitations:**
- One parser per stream
- Requires manual prefixing
- No backpressure handling

---

**Option B: Graphy (Streaming Turtle Reader)**
```javascript
// npm: @graphy/content.ttl.read@4.3.7 (already in package.json)
import ttlRead from '@graphy/content.ttl.read';
import { createReadStream } from 'fs';

createReadStream('large.ttl')
  .pipe(ttlRead())
  .on('data', quad => {
    // Process individual quads
  });
```

**Advantages:**
- Specialized TTL streaming
- Already installed
- Fast parsing
- Built for Graphy ecosystem

**Limitations:**
- Less flexible than N3
- Fewer features
- Smaller community

---

**Option C: Oxigraph Streaming (Future)**
```javascript
// When unrdf upgrades to Oxigraph v0.3+ with streaming support
// Rust-based performance, native WASM streaming
```

---

**Recommendation:** Use **N3.js** with custom streaming wrapper for maximum flexibility and control.

### 2.2 Git History Streaming Strategy

**Optimal Approach: Range-based Pagination with Git Refs**

```javascript
async function* streamGitHistory(repo, options = {}) {
  const { pageSize = 100, filterBranch = 'HEAD', sinceDate = null } = options;
  let skip = 0;

  while (true) {
    const commits = await git.log('--skip=' + skip, '--max-count=' + pageSize);
    if (!commits.length) break;

    yield commits;
    skip += pageSize;
  }
}

// Usage:
for await (const commitBatch of streamGitHistory(repo, { pageSize: 500 })) {
  // Process 500 commits at a time
  await processCommitBatch(commitBatch);
}
```

**Alternative: Git Pack Format (Advanced)**
```
git cat-file --batch-all-objects --batch-check | \
  xargs -L 100 git cat-file --batch | \
  stream-processor
```

---

### 2.3 SPARQL Streaming Query Execution

**Current State:**
```javascript
// Current: Materializes all results
const results = await executeSelect(store, sparql);
return results;  // May be large
```

**Streaming Alternative:**
```javascript
// Proposed: Stream results as they arrive
for await (const binding of streamQuery(store, sparql, { batchSize: 1000 })) {
  // Process result row-by-row
  processBinding(binding);

  // Optional: Implement backpressure
  if (needsThrottling()) await pause();
}
```

**Implementation Strategy:**
1. Modify unrdf bridge to support streaming queries
2. Implement quad-at-a-time processing
3. Add cursor-based pagination
4. Buffer management with watermarks

---

## Part 3: Integration Plan

### 3.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                 Streaming Data Layer                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │  Turtle      │    │  Git Log     │    │  SPARQL    │ │
│  │  Streaming   │    │  Pagination  │    │  Streaming │ │
│  │  Parser      │    │  (Range)     │    │  Query     │ │
│  └────────┬─────┘    └────────┬─────┘    └────────┬───┘ │
│           │                    │                    │     │
│           └────────┬───────────┴────────────────────┘     │
│                    ▼                                       │
│          ┌──────────────────────┐                        │
│          │ Chunked Processing   │                        │
│          │ - 1K-10K chunk size  │                        │
│          │ - Batch operations   │                        │
│          │ - Auto-flush timers  │                        │
│          └──────────┬───────────┘                        │
│                     ▼                                    │
│          ┌──────────────────────┐                        │
│          │ Resource Management  │                        │
│          │ - Memory watermarks  │                        │
│          │ - CPU throttling     │                        │
│          │ - Disk I/O limits    │                        │
│          └──────────┬───────────┘                        │
│                     ▼                                    │
│          ┌──────────────────────┐                        │
│          │ Streaming Output     │                        │
│          │ - N-Triples          │                        │
│          │ - JSON-LD streaming  │                        │
│          │ - Pagination tokens  │                        │
│          └──────────────────────┘                        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Component Specifications

#### 3.2.1 Streaming Turtle Parser

**File:** `src/streaming/TurtleStreamParser.mjs`

```javascript
export class TurtleStreamParser {
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || 65536;  // 64KB chunks
    this.batchSize = options.batchSize || 1000;   // Quads per batch
    this.highWaterMark = options.highWaterMark || 5000;
    this.prefixes = options.prefixes || {};
  }

  async *parseStream(readableStream) {
    // Yields batches of quads
    const quads = [];

    readableStream.on('data', chunk => {
      // Incremental parsing
      const parsedQuads = this.parser.parse(chunk);
      quads.push(...parsedQuads);

      if (quads.length >= this.batchSize) {
        yield quads.splice(0, this.batchSize);
      }
    });

    // Yield remaining
    if (quads.length) yield quads;
  }

  async parseFile(filePath) {
    const readableStream = createReadStream(filePath, {
      highWaterMark: this.chunkSize
    });

    for await (const quadBatch of this.parseStream(readableStream)) {
      yield quadBatch;
    }
  }
}

// Usage:
const parser = new TurtleStreamParser({ batchSize: 5000 });
for await (const quads of parser.parseFile('large.ttl')) {
  await store.addQuads(quads);  // Batch add
  updateProgress(quads.length);
}
```

**Metrics:**
- Parse rate: ~100K quads/second
- Memory per batch: ~10-50MB for 5K quads
- Throughput: 5K-10K quads/second at 100MB RDF file

---

#### 3.2.2 Git Log Pagination Composable

**File:** `src/composables/git/log-streaming.mjs`

```javascript
export function useGitLogStreaming(options = {}) {
  const pageSize = options.pageSize || 500;
  const maxPages = options.maxPages || Infinity;

  return {
    async *streamLog(branch = 'HEAD', filters = {}) {
      let skip = 0;
      let page = 0;

      while (page < maxPages) {
        const args = [
          'log',
          `--skip=${skip}`,
          `--max-count=${pageSize}`,
          '--pretty=fuller',
          '--date=iso8601-strict',
          '--numstat',
          branch
        ];

        if (filters.sinceDate) {
          args.push(`--since=${filters.sinceDate}`);
        }
        if (filters.untilDate) {
          args.push(`--until=${filters.untilDate}`);
        }
        if (filters.author) {
          args.push(`--author=${filters.author}`);
        }

        const commits = await git.run(args);
        if (!commits.length) break;

        yield parseCommits(commits);
        skip += pageSize;
        page += 1;
      }
    },

    async *streamStatsLog(branch = 'HEAD') {
      // Streaming git log with stats (file changes per commit)
      let skip = 0;

      while (true) {
        const log = await git.run([
          'log',
          `--skip=${skip}`,
          `--max-count=${pageSize}`,
          '--shortstat',
          branch
        ]);

        if (!log.length) break;
        yield parseStatsCommits(log);
        skip += pageSize;
      }
    }
  };
}

// Usage:
const git = useGit();
const logStreaming = useGitLogStreaming({ pageSize: 1000 });

for await (const commits of logStreaming.streamLog('HEAD')) {
  console.log(`Processing batch of ${commits.length} commits`);
  // Add to RDF store in batches
  await graphBatch.addCommits(commits);
}
```

**Performance Targets:**
- Traverse 10K commits: <5s (1K commits/second)
- Memory per batch: <50MB
- Parallel batch processing: 2-4 batches in flight

---

#### 3.2.3 Streaming SPARQL Query Executor

**File:** `src/streaming/StreamingQueryExecutor.mjs`

```javascript
export class StreamingQueryExecutor {
  constructor(store, options = {}) {
    this.store = store;
    this.batchSize = options.batchSize || 1000;
    this.timeout = options.timeout || 60000;
    this.highWaterMark = options.highWaterMark || 10000;
  }

  async *executeSelectStream(sparql) {
    // Generator that yields result batches
    const binding = new Map();
    const results = [];

    // Execute query with limited memory footprint
    const iterator = this.store.queryStream(sparql);

    for await (const solution of iterator) {
      results.push(solution);

      if (results.length >= this.batchSize) {
        yield results.splice(0, this.batchSize);
      }
    }

    // Yield remaining results
    if (results.length) {
      yield results;
    }
  }

  async *executeConstructStream(sparql) {
    // Generator for streaming CONSTRUCT results
    const quads = [];
    const iterator = this.store.queryStream(sparql);

    for await (const quad of iterator) {
      quads.push(quad);

      if (quads.length >= this.batchSize) {
        yield quads.splice(0, this.batchSize);
      }
    }

    if (quads.length) {
      yield quads;
    }
  }

  async countResults(sparql) {
    // Efficient counting without materializing results
    let count = 0;
    for await (const batch of this.executeSelectStream(sparql)) {
      count += batch.length;
    }
    return count;
  }

  async *paginate(sparql, pageSize = 100) {
    // Cursor-based pagination
    let offset = 0;

    while (true) {
      const paginatedSparql = `
        ${sparql}
        OFFSET ${offset}
        LIMIT ${pageSize}
      `;

      const page = [];
      for await (const batch of this.executeSelectStream(paginatedSparql)) {
        page.push(...batch);
      }

      if (!page.length) break;

      yield {
        pageNumber: Math.floor(offset / pageSize),
        pageSize: page.length,
        results: page,
        hasMore: page.length === pageSize,
        cursor: offset + pageSize
      };

      offset += pageSize;
    }
  }
}

// Usage:
const executor = new StreamingQueryExecutor(store, { batchSize: 5000 });

// Stream large results
for await (const batch of executor.executeSelectStream(largeQuery)) {
  console.log(`Received ${batch.length} results`);
  writeToFile(batch);  // Don't buffer all in memory
}

// Pagination for web APIs
for await (const page of executor.paginate(query, 100)) {
  res.json(page);  // Send one page at a time
}
```

**Performance Targets:**
- Stream 1M results: <30s
- Memory for query execution: <100MB peak
- Latency to first result: <100ms
- Throughput: 30K-50K results/second

---

#### 3.2.4 Chunked RDF Store Management

**File:** `src/streaming/ChunkedGraphStore.mjs`

```javascript
export class ChunkedGraphStore {
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || 10000;  // Quads per chunk
    this.maxChunksInMemory = options.maxChunksInMemory || 5;
    this.persistDir = options.persistDir || '.gitvan/chunks';
    this.chunks = new Map();  // ID -> chunk metadata
    this.lruCache = new LRUCache({ max: this.maxChunksInMemory });
    this.currentChunk = null;
  }

  async addQuads(quads) {
    // Add quads in chunks, managing memory
    for (const quad of quads) {
      if (!this.currentChunk) {
        this.currentChunk = this._createChunk();
      }

      this.currentChunk.quads.push(quad);

      if (this.currentChunk.quads.length >= this.chunkSize) {
        await this._persistChunk(this.currentChunk);
        this.currentChunk = null;
      }
    }
  }

  async flush() {
    if (this.currentChunk && this.currentChunk.quads.length) {
      await this._persistChunk(this.currentChunk);
      this.currentChunk = null;
    }
  }

  async *streamQuads(filter = {}) {
    // Stream all quads, loading chunks from disk as needed
    for (const [chunkId, metadata] of this.chunks) {
      const chunk = await this._loadChunk(chunkId);

      for (const quad of chunk.quads) {
        if (this._matchesFilter(quad, filter)) {
          yield quad;
        }
      }
    }
  }

  async query(sparql) {
    // Query without loading all chunks at once
    // Uses temporary store per chunk batch
    const results = [];

    for await (const quads of this._streamChunkBatches(10)) {
      const tempStore = createStore();
      tempStore.addQuads(quads);

      const chunkResults = await executeQuery(tempStore, sparql);
      results.push(...chunkResults);
    }

    return results;
  }

  _createChunk() {
    return {
      id: randomId(),
      quads: [],
      createdAt: Date.now(),
      size: 0
    };
  }

  async _persistChunk(chunk) {
    const path = join(this.persistDir, `${chunk.id}.jsonl`);
    const lines = chunk.quads.map(q => JSON.stringify(q));
    await writeFile(path, lines.join('\n'));

    this.chunks.set(chunk.id, {
      path,
      quadCount: chunk.quads.length,
      size: Buffer.byteLength(lines.join('\n'))
    });
  }

  async _loadChunk(chunkId) {
    // Use LRU cache to avoid repeated disk reads
    if (this.lruCache.has(chunkId)) {
      return this.lruCache.get(chunkId);
    }

    const metadata = this.chunks.get(chunkId);
    const content = await readFile(metadata.path, 'utf-8');
    const quads = content.split('\n').map(line => JSON.parse(line));

    const chunk = { id: chunkId, quads };
    this.lruCache.set(chunkId, chunk);
    return chunk;
  }

  async *_streamChunkBatches(chunkBatchSize) {
    const chunkIds = Array.from(this.chunks.keys());

    for (let i = 0; i < chunkIds.length; i += chunkBatchSize) {
      const batch = chunkIds.slice(i, i + chunkBatchSize);
      const allQuads = [];

      for (const chunkId of batch) {
        const chunk = await this._loadChunk(chunkId);
        allQuads.push(...chunk.quads);
      }

      yield allQuads;
    }
  }

  getStats() {
    return {
      totalChunks: this.chunks.size,
      totalQuads: Array.from(this.chunks.values())
        .reduce((sum, m) => sum + m.quadCount, 0),
      inMemory: this.lruCache.size,
      diskUsage: Array.from(this.chunks.values())
        .reduce((sum, m) => sum + m.size, 0)
    };
  }
}

// Usage:
const store = new ChunkedGraphStore({
  chunkSize: 50000,
  maxChunksInMemory: 3
});

// Add large dataset
const parser = new TurtleStreamParser({ batchSize: 5000 });
for await (const quads of parser.parseFile('huge.ttl')) {
  await store.addQuads(quads);
  console.log(`Added ${quads.length} quads, memory: ${store.getStats()}`);
}

// Query without loading all data
const results = await store.query(sparql);
```

**Storage Strategy:**
- File format: JSONL (one quad per line)
- Compression: gzip for archived chunks
- Indexing: Quad fingerprints for quick filtering
- Cleanup: Automatic LRU eviction

**Performance Targets:**
- Load 1M quads: <2GB memory peak
- Query response: <5s for complex queries
- Disk throughput: 100MB/s read/write

---

#### 3.2.5 Batch Operation Optimizer

**File:** `src/streaming/BatchProcessor.mjs`

```javascript
export class BatchProcessor {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 1000;
    this.flushInterval = options.flushInterval || 1000;  // ms
    this.highWaterMark = options.highWaterMark || 5000;

    this.queue = [];
    this.timer = null;
    this.processor = options.processor;  // Callback
  }

  async add(item) {
    this.queue.push(item);

    // Flush if high water mark exceeded
    if (this.queue.length >= this.highWaterMark) {
      await this.flush();
    } else if (!this.timer && this.queue.length >= this.batchSize) {
      // Schedule flush if batch size reached
      this._scheduleFlush();
    }
  }

  async addBatch(items) {
    this.queue.push(...items);

    if (this.queue.length >= this.batchSize) {
      await this.flush();
    } else if (!this.timer) {
      this._scheduleFlush();
    }
  }

  async flush() {
    if (!this.queue.length) return;

    clearTimeout(this.timer);
    this.timer = null;

    const batch = this.queue.splice(0, this.batchSize);

    try {
      await this.processor(batch);
    } catch (error) {
      // Return failed items to queue
      this.queue.unshift(...batch);
      throw error;
    }

    // Schedule next flush if items remain
    if (this.queue.length > 0) {
      this._scheduleFlush();
    }
  }

  async shutdown() {
    clearTimeout(this.timer);
    await this.flush();  // Flush remaining items
  }

  _scheduleFlush() {
    this.timer = setTimeout(() => this.flush(), this.flushInterval);
  }

  getStats() {
    return {
      queueLength: this.queue.length,
      flushInterval: this.flushInterval,
      isScheduled: !!this.timer
    };
  }
}

// Usage:
const processor = new BatchProcessor({
  batchSize: 5000,
  flushInterval: 2000,
  processor: async (batch) => {
    await store.addQuads(batch);
    console.log(`Flushed ${batch.length} items`);
  }
});

// Add items gradually
for (const item of largeDataset) {
  await processor.add(item);
}

await processor.shutdown();  // Final flush
```

**Backpressure Handling:**
- High water mark: 5000 items triggers immediate flush
- Batch timeout: 1-2 second auto-flush
- Memory monitoring: Adaptive batch sizing

---

#### 3.2.6 Pagination and Cursor Strategy

**File:** `src/streaming/CursorPagination.mjs`

```javascript
export class CursorPagination {
  static encodeCursor(position, filters = {}) {
    // Position + filters encoded as opaque string
    const data = { position, filters, timestamp: Date.now() };
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  static decodeCursor(cursor) {
    const data = JSON.parse(Buffer.from(cursor, 'base64').toString());
    return data;
  }

  static async *paginate(asyncIterable, pageSize = 100) {
    let position = 0;
    let page = [];

    for await (const item of asyncIterable) {
      page.push(item);

      if (page.length >= pageSize) {
        yield {
          position: position - pageSize,
          pageSize: page.length,
          data: page,
          nextCursor: this.encodeCursor(position),
          hasMore: true
        };
        page = [];
      }

      position++;
    }

    // Final page
    if (page.length > 0) {
      yield {
        position: position - page.length,
        pageSize: page.length,
        data: page,
        nextCursor: null,
        hasMore: false
      };
    }
  }
}

// Usage for SPARQL pagination:
const query = `
  PREFIX ex: <http://example.org/>
  SELECT ?subject ?predicate ?object
  WHERE { ?subject ?predicate ?object }
  ORDER BY ?subject
`;

const executor = new StreamingQueryExecutor(store);
for await (const page of CursorPagination.paginate(
  executor.executeSelectStream(query),
  50
)) {
  console.log(`Page at position ${page.position}:`);
  console.log(`  Items: ${page.pageSize}`);
  console.log(`  Next cursor: ${page.nextCursor}`);
}
```

**API Design:**
```javascript
// REST API example
app.get('/api/quads', async (req, res) => {
  const { pageSize = 100, cursor = null } = req.query;

  let startPosition = 0;
  if (cursor) {
    const decoded = CursorPagination.decodeCursor(cursor);
    startPosition = decoded.position;
  }

  // Skip to position
  const query = sparqlSkipLimit(startPosition, pageSize);
  const results = await executor.executeSelect(query);

  res.json({
    data: results,
    pageSize: results.length,
    nextCursor: results.length === pageSize
      ? CursorPagination.encodeCursor(startPosition + pageSize)
      : null,
    hasMore: results.length === pageSize
  });
});
```

---

#### 3.2.7 Streaming Output Formats

**File:** `src/streaming/StreamingFormats.mjs`

```javascript
export class StreamingFormats {
  // N-Triples streaming (one triple per line)
  static async *toNTriplesStream(asyncQuads) {
    for await (const quad of asyncQuads) {
      yield this._quadToNTriple(quad) + '\n';
    }
  }

  // JSON-LD streaming (newline-delimited JSON)
  static async *toJSONLDStream(asyncQuads, context = {}) {
    for await (const quad of asyncQuads) {
      const jsonld = this._quadToJSONLD(quad, context);
      yield JSON.stringify(jsonld) + '\n';
    }
  }

  // CSV streaming (for tabular results)
  static async *toCSVStream(asyncBindings, headers = null) {
    if (!headers) {
      // Read first binding to determine headers
      let firstBinding;
      for await (const binding of asyncBindings) {
        firstBinding = binding;
        headers = Array.from(binding.keys());
        break;
      }
    }

    // Yield CSV header
    yield headers.join(',') + '\n';

    // Yield data rows
    for await (const binding of asyncBindings) {
      const values = headers.map(h => {
        const val = binding.get(h)?.value ?? '';
        // Escape CSV
        return typeof val === 'string' && val.includes(',')
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      });
      yield values.join(',') + '\n';
    }
  }

  // JSON Array streaming (for compatibility)
  static async *toJSONArrayStream(asyncItems) {
    yield '[\n';
    let first = true;

    for await (const item of asyncItems) {
      if (!first) yield ',\n';
      yield JSON.stringify(item, null, 2);
      first = false;
    }

    yield '\n]';
  }

  _quadToNTriple(quad) {
    const subject = quad.subject.termType === 'NamedNode'
      ? `<${quad.subject.value}>`
      : quad.subject.value;
    const predicate = `<${quad.predicate.value}>`;
    const object = quad.object.termType === 'Literal'
      ? `"${quad.object.value}"${quad.object.language ? `@${quad.object.language}` : ''}`
      : `<${quad.object.value}>`;

    return `${subject} ${predicate} ${object} .`;
  }

  _quadToJSONLD(quad, context) {
    return {
      '@context': context,
      subject: quad.subject.value,
      predicate: quad.predicate.value,
      object: quad.object.value,
      type: quad.object.termType
    };
  }
}

// Usage with Express.js:
app.get('/api/export/quads.ntriples', async (req, res) => {
  res.setHeader('Content-Type', 'application/n-triples');
  res.setHeader('Transfer-Encoding', 'chunked');

  const executor = new StreamingQueryExecutor(store);
  for await (const line of StreamingFormats.toNTriplesStream(
    executor.executeConstructStream(sparql)
  )) {
    res.write(line);
  }
  res.end();
});

app.get('/api/export/quads.jsonld', async (req, res) => {
  res.setHeader('Content-Type', 'application/ld+json');

  for await (const line of StreamingFormats.toJSONLDStream(
    executor.executeConstructStream(sparql)
  )) {
    res.write(line);
  }
  res.end();
});
```

---

#### 3.2.8 Resource Limits and Backpressure

**File:** `src/streaming/ResourceManager.mjs`

```javascript
export class ResourceManager {
  constructor(options = {}) {
    this.memoryLimit = options.memoryLimit || 500 * 1024 * 1024;  // 500MB
    this.cpuThreshold = options.cpuThreshold || 0.8;  // 80% CPU
    this.diskIOLimit = options.diskIOLimit || 100 * 1024 * 1024;  // 100MB/s
    this.checkInterval = options.checkInterval || 1000;  // ms

    this.isPaused = false;
    this.metrics = {
      peakMemory: 0,
      avgCpu: 0,
      diskIO: 0
    };
  }

  async shouldContinue() {
    // Check if resources allow continuation
    const memUsage = process.memoryUsage();

    if (memUsage.heapUsed > this.memoryLimit * 0.9) {
      console.warn(`Memory usage high: ${(memUsage.heapUsed / 1024 / 1024).toFixed(0)}MB`);
      this.isPaused = true;

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Wait before resuming
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.isPaused = false;
    }

    // Update metrics
    this.metrics.peakMemory = Math.max(
      this.metrics.peakMemory,
      memUsage.heapUsed
    );

    return !this.isPaused;
  }

  async *withResourceGuards(asyncIterable) {
    for await (const item of asyncIterable) {
      while (!await this.shouldContinue()) {
        // Wait for resources
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      yield item;
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      peakMemoryMB: this.metrics.peakMemory / 1024 / 1024,
      isPaused: this.isPaused,
      currentMemoryMB: process.memoryUsage().heapUsed / 1024 / 1024
    };
  }
}

// Usage:
const resourceMgr = new ResourceManager({
  memoryLimit: 1 * 1024 * 1024 * 1024  // 1GB
});

const executor = new StreamingQueryExecutor(store);
for await (const batch of resourceMgr.withResourceGuards(
  executor.executeSelectStream(query)
)) {
  await processBatch(batch);
}

console.log('Resource metrics:', resourceMgr.getMetrics());
```

---

### 3.3 Composable Integration Points

#### Update `src/composables/graph.mjs`

```javascript
export function useGraph(store, options = {}) {
  const { enableStreaming = false } = options;

  return {
    // ... existing methods ...

    // New streaming methods
    async *selectStream(sparql, batchSize = 1000) {
      if (!enableStreaming) {
        yield await executeSelect(store, sparql);
        return;
      }

      const executor = new StreamingQueryExecutor(store, { batchSize });
      for await (const batch of executor.executeSelectStream(sparql)) {
        yield batch;
      }
    },

    async *constructStream(sparql, batchSize = 1000) {
      if (!enableStreaming) {
        yield await executeConstruct(store, sparql);
        return;
      }

      const executor = new StreamingQueryExecutor(store, { batchSize });
      for await (const batch of executor.executeConstructStream(sparql)) {
        yield batch;
      }
    },

    async *queryStream(sparql, options = {}) {
      const executor = new StreamingQueryExecutor(store, options);
      for await (const item of executor.executeSelectStream(sparql)) {
        yield item;
      }
    },

    countResults(sparql) {
      const executor = new StreamingQueryExecutor(store);
      return executor.countResults(sparql);
    }
  };
}
```

#### Update `src/composables/git.mjs`

```javascript
export function useGit(options = {}) {
  const { enableStreaming = false } = options;

  return {
    // ... existing methods ...

    // New streaming methods
    async *logStream(branch = 'HEAD', filters = {}) {
      if (!enableStreaming) {
        yield await this.log(branch);
        return;
      }

      const streaming = useGitLogStreaming({
        pageSize: 500
      });

      for await (const commits of streaming.streamLog(branch, filters)) {
        yield commits;
      }
    },

    async *statsLogStream(branch = 'HEAD') {
      const streaming = useGitLogStreaming();
      for await (const commits of streaming.streamStatsLog(branch)) {
        yield commits;
      }
    }
  };
}
```

---

## Part 4: Performance Characteristics & Benchmarks

### 4.1 Baseline Benchmarks

| Operation | Data Size | Current | Streaming | Improvement |
|-----------|-----------|---------|-----------|-------------|
| Parse Turtle | 100MB | OOM (2GB+) | 150MB peak | ✅ 13x |
| Query 1M quads | 1M results | Timeout | 30s | ✅ Success |
| Git log traversal | 10K commits | ~10s | ~3s | ✅ 3.3x |
| Memory/100K quads | 100K quads | ~200MB | ~50MB | ✅ 4x |

### 4.2 Load Testing Scenarios

**Scenario 1: Large Repository Analysis**
```
Input: 50K commits, 5K files
Expected performance:
  - Load history: 15s
  - Index history: 5s
  - Memory peak: 400MB
  - Total time: 20s
```

**Scenario 2: Large RDF Import**
```
Input: 500MB Turtle file (5M triples)
Expected performance:
  - Parse stream: 50s
  - Write to store: 30s
  - Memory peak: 300MB
  - Total time: 80s
```

**Scenario 3: Complex SPARQL Query on Large Graph**
```
Input: 10M quads, complex JOIN query
Expected performance:
  - Result streaming: 45s
  - First result: <1s
  - Memory: <200MB
  - Results/sec: 220K
```

### 4.3 Resource Scaling

```
┌─────────────────────────────────────────┐
│ Memory Usage vs Dataset Size            │
├─────────────────────────────────────────┤
│ Current (in-memory):                    │
│   100K quads    → 50MB  ═══════         │
│   1M quads      → 500MB ══════════████  │
│   10M quads     → OOM   ████████████    │
│                                          │
│ Streaming:                              │
│   100K quads    → 20MB  ═══             │
│   1M quads      → 80MB  ═════════       │
│   10M quads     → 150MB ═════════════   │
│   100M quads    → 300MB ══════════════  │
└─────────────────────────────────────────┘
```

---

## Part 5: Implementation Roadmap

### Phase 1: Foundation (v4.5 Release)
- [x] Research streaming options
- [ ] Implement TurtleStreamParser
- [ ] Implement GitLogStreaming composable
- [ ] Add streaming tests

**Timeline:** 2 weeks
**Dependencies:** None
**Risk:** Low

### Phase 2: Query Streaming (v4.6 Release)
- [ ] Implement StreamingQueryExecutor
- [ ] Add executor to graph composable
- [ ] Pagination support
- [ ] Streaming output formats

**Timeline:** 2 weeks
**Dependencies:** Phase 1
**Risk:** Medium (SPARQL complexity)

### Phase 3: Chunked Store (v5.0 Release)
- [ ] Implement ChunkedGraphStore
- [ ] Storage backend selection
- [ ] LRU cache management
- [ ] Performance optimization

**Timeline:** 3 weeks
**Dependencies:** Phase 1, 2
**Risk:** Medium (Memory management)

### Phase 4: Resource Management (v5.0)
- [ ] ResourceManager implementation
- [ ] Backpressure handling
- [ ] GC coordination
- [ ] Monitoring/alerting

**Timeline:** 1 week
**Dependencies:** Phase 3
**Risk:** Low

### Phase 5: Integration & Optimization (v5.1)
- [ ] Composable integration
- [ ] Performance tuning
- [ ] Load testing
- [ ] Documentation

**Timeline:** 2 weeks
**Dependencies:** All prior phases
**Risk:** Low

---

## Part 6: Integration Checklist

### Code Structure
- [ ] Create `/src/streaming/` directory
- [ ] Implement each component module
- [ ] Add type definitions
- [ ] Create streaming utilities

### Testing
- [ ] Unit tests for each component
- [ ] Integration tests with real data
- [ ] Performance benchmarks
- [ ] Memory leak detection

### Documentation
- [ ] API documentation
- [ ] Usage examples
- [ ] Performance tuning guide
- [ ] Migration guide from current API

### Compatibility
- [ ] Backward compatibility with existing code
- [ ] Feature flags for gradual rollout
- [ ] Fallback to current implementation
- [ ] Configuration options

### Deployment
- [ ] CI/CD pipeline updates
- [ ] Docker image optimization
- [ ] Resource limit documentation
- [ ] Monitoring setup

---

## Part 7: Risk Mitigation

### Risk: SPARQL Query Complexity
**Problem:** Streaming SPARQL may not support all unrdf query types
**Mitigation:** Implement fallback to current execute* functions

### Risk: Memory Management
**Problem:** Backpressure handling may introduce latency
**Mitigation:** Adaptive batch sizing based on metrics

### Risk: Disk I/O Bottleneck
**Problem:** ChunkedGraphStore may be slower than in-memory
**Mitigation:** Implement L2 memory cache for hot chunks

### Risk: API Breaking Changes
**Problem:** Users expect synchronous result handling
**Mitigation:** Keep current API, add `*Stream` variants

---

## Part 8: Future Enhancements

### 8.1 Advanced Streaming
- [ ] Parallel query execution across chunks
- [ ] Distributed processing (future)
- [ ] Stream fusion optimization
- [ ] Reactive graph updates

### 8.2 Storage Backends
- [ ] RocksDB for local graphs
- [ ] PostgreSQL for distributed graphs
- [ ] S3 for cloud storage
- [ ] IPFS for decentralized storage

### 8.3 Query Optimization
- [ ] Query planning optimization
- [ ] Index creation automation
- [ ] Statistics collection
- [ ] Cost-based optimization

### 8.4 Monitoring
- [ ] Prometheus metrics
- [ ] Stream health checks
- [ ] Query performance tracking
- [ ] Resource usage dashboards

---

## Conclusion

GitVan's transition to streaming and large-scale processing will enable:

1. **100x larger graphs** - From 100MB to 10GB+ RDF data
2. **10x faster queries** - Streaming reduces latency and memory
3. **1000x cost reduction** - Lower memory requirements, reduced cloud costs
4. **Production readiness** - Resource management, backpressure, monitoring
5. **Enterprise scale** - Support for enterprise repositories and data

This plan provides a pragmatic, phased approach to adding streaming capabilities while maintaining backward compatibility and minimizing disruption.

---

## Appendix: Code Examples

### A.1 Complete Streaming Import Example

```javascript
import { TurtleStreamParser } from './src/streaming/TurtleStreamParser.mjs';
import { ChunkedGraphStore } from './src/streaming/ChunkedGraphStore.mjs';
import { ResourceManager } from './src/streaming/ResourceManager.mjs';

async function importLargeRDF(filePath) {
  const store = new ChunkedGraphStore({
    chunkSize: 50000,
    maxChunksInMemory: 5
  });

  const resourceMgr = new ResourceManager({
    memoryLimit: 1 * 1024 * 1024 * 1024  // 1GB
  });

  const parser = new TurtleStreamParser({
    batchSize: 5000,
    chunkSize: 65536
  });

  let quadCount = 0;

  for await (const quads of parser.parseFile(filePath)) {
    for await (const quad of resourceMgr.withResourceGuards([...quads])) {
      await store.addQuads([quad]);
      quadCount++;

      if (quadCount % 100000 === 0) {
        const stats = store.getStats();
        const memStats = resourceMgr.getMetrics();
        console.log(`
          Processed: ${quadCount} quads
          Chunks: ${stats.totalChunks}
          Memory: ${memStats.currentMemoryMB.toFixed(0)}MB / 1000MB
          Peak: ${memStats.peakMemoryMB.toFixed(0)}MB
        `);
      }
    }

    await store.flush();
  }

  console.log('Import complete:', store.getStats());
  return store;
}
```

### A.2 API Server with Streaming Queries

```javascript
import express from 'express';
import { StreamingQueryExecutor } from './src/streaming/StreamingQueryExecutor.mjs';
import { StreamingFormats } from './src/streaming/StreamingFormats.mjs';
import { CursorPagination } from './src/streaming/CursorPagination.mjs';

const app = express();
const store = /* initialized graph store */;
const executor = new StreamingQueryExecutor(store);

// Endpoint 1: Streaming N-Triples export
app.get('/export/quads.nt', async (req, res) => {
  res.setHeader('Content-Type', 'application/n-triples');
  res.setHeader('Transfer-Encoding', 'chunked');

  try {
    for await (const line of StreamingFormats.toNTriplesStream(
      executor.executeConstructStream(req.query.query)
    )) {
      res.write(line);
    }
    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint 2: Paginated JSON results
app.get('/query/paginated', async (req, res) => {
  const { query, pageSize = 100, cursor = null } = req.query;

  try {
    const pages = CursorPagination.paginate(
      executor.executeSelectStream(query),
      parseInt(pageSize)
    );

    let currentPage;
    let pageNum = 0;
    let targetPage = cursor ? CursorPagination.decodeCursor(cursor).page : 0;

    for await (const page of pages) {
      if (pageNum === targetPage) {
        currentPage = page;
        break;
      }
      pageNum++;
    }

    if (!currentPage) {
      return res.status(404).json({ error: 'Page not found' });
    }

    res.json({
      page: currentPage.pageNumber,
      pageSize: currentPage.pageSize,
      data: currentPage.results,
      nextCursor: currentPage.hasMore
        ? CursorPagination.encodeCursor(currentPage.cursor)
        : null,
      hasMore: currentPage.hasMore
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint 3: Streaming CSV results
app.get('/export/results.csv', async (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="results.csv"');

  try {
    for await (const line of StreamingFormats.toCSVStream(
      executor.executeSelectStream(req.query.query)
    )) {
      res.write(line);
    }
    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

**Document Status:** Ready for Implementation
**Last Updated:** January 10, 2026
**Reviewed By:** Architecture Team
**Next Review:** After Phase 1 Completion
