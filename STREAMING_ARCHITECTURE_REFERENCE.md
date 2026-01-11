# GitVan Streaming Architecture - Visual Reference

---

## Current vs. Streaming Architecture

### Current Architecture (Before)
```
User Query
    ↓
Load All Data
    ↓ (memory spike)
executeQuery(store, sparql)
    ↓
Materialize All Results
    ↓ (large buffer)
Return Complete Array
    ↓
Process/Serialize
    ↓ (potential OOM)
Return to Client

Problems:
- All-or-nothing loading
- Single memory peak
- Timeout on large datasets
- No backpressure
- Client waits for complete result
```

### Streaming Architecture (After)
```
User Query
    ↓
StreamingQueryExecutor
    ├─ Load chunk 1
    ├─ Process results 1
    ├─ Yield batch 1 ──┐
    │                   ├─ Backpressure?
    ├─ Load chunk 2     ├─ Stream to client
    ├─ Process results 2├─ Buffer size limited
    ├─ Yield batch 2 ──┤
    ├─ Load chunk 3     │
    ├─ Process results 3│
    └─ Yield batch 3 ──┘

Benefits:
- Progressive loading
- Bounded memory peaks
- First result in <100ms
- Built-in backpressure
- Client sees immediate results
- Large dataset support
```

---

## Data Flow Diagrams

### Scenario 1: Importing Large Turtle File

**Current Approach:**
```
huge.ttl (500MB)
    ↓
Read entire file
    ↓
Parse all quads → 5M quads
    ↓ (OOM)
Store crashes
```

**Streaming Approach:**
```
huge.ttl (500MB)
    ↓
ReadStream (64KB chunks)
    ↓
TurtleStreamParser
    ├─ Parse chunk 1 → 1K quads → Batch 1
    ├─ Parse chunk 2 → 1K quads → Batch 2
    ├─ Parse chunk 3 → 1K quads → Batch 3
    ├─ ...
    └─ Parse chunk N → 1K quads → Batch N
    ↓
ChunkedGraphStore
    ├─ Persist batch 1 to chunk_1.jsonl
    ├─ Persist batch 2 to chunk_2.jsonl
    ├─ Persist batch 3 to chunk_3.jsonl
    ├─ ...
    └─ Persist batch N to chunk_N.jsonl
    ↓
Success (150MB peak memory)
```

---

### Scenario 2: Querying Large Result Set

**Current Approach:**
```
SPARQL Query on 10M quads
    ↓
executeSelect(store, sparql)
    ↓
Materialize 1M results in memory
    ↓
Return array
    ↓
JSON.stringify(array)
    ↓ (2GB+ buffer)
Send to client (timeout)
```

**Streaming Approach:**
```
SPARQL Query on 10M quads
    ↓
StreamingQueryExecutor.executeSelectStream(sparql)
    ↓
for await (const batch of executor...)
    ├─ Load chunk 1, execute query
    ├─ Yield batch 1 (100 results) → Send to client
    ├─ Load chunk 2, execute query
    ├─ Yield batch 2 (100 results) → Send to client
    ├─ ...
    └─ Load chunk N, execute query
    └─ Yield batch N (100 results) → Send to client
    ↓
Success (30s, <200MB memory)
```

---

### Scenario 3: Analyzing Large Git History

**Current Approach:**
```
Git repository with 50K commits
    ↓
git log (load all commits)
    ↓ (read ~2GB history)
Parse into memory
    ↓
Process all at once
    ↓ (OOM)
Failed
```

**Streaming Approach:**
```
Git repository with 50K commits
    ↓
git log --skip=0 --max-count=1000
    ↓
Batch 1: commits 0-999
    ↓
process(batch 1)
    ↓
git log --skip=1000 --max-count=1000
    ↓
Batch 2: commits 1000-1999
    ↓
process(batch 2)
    ├─ git log --skip=2000 --max-count=1000
    ├─ ...
    └─ git log --skip=49000 --max-count=1000
    ↓
Success (15s, <100MB memory)
```

---

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitVan API Layer                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  useGraph(store, {enableStreaming: true})                       │
│  ├─ select() / selectStream()                                   │
│  ├─ construct() / constructStream()                             │
│  └─ query() / queryStream()                                     │
│                                                                  │
│  useGit({enableStreaming: true})                                │
│  ├─ log() / logStream()                                         │
│  └─ statsLogStream()                                            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                    Streaming Layer                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Turtle/RDF Streaming                                       │ │
│  │ ┌──────────────────┐  ┌───────────────────────────────┐  │ │
│  │ │TurtleStreamParser│→→│ TurtleStreamParser config     │  │ │
│  │ │                  │  │ - chunkSize: 64KB             │  │ │
│  │ │ Capabilities:    │  │ - batchSize: 1000-5000        │  │ │
│  │ │ - N3.js based    │  │ - highWaterMark: 5000         │  │ │
│  │ │ - Event-driven   │  └───────────────────────────────┘  │ │
│  │ │ - Quad batches   │                                      │ │
│  │ └────────────────────────────────────────────────────────┘  │
│  │                                                               │
│  ├─ parseFile() → AsyncGenerator[quadBatch]                     │
│  └─ parseStream() → AsyncGenerator[quadBatch]                   │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Git History Streaming                                      │ │
│  │ ┌──────────────────┐  ┌───────────────────────────────┐  │ │
│  │ │GitLogStreaming   │→→│ Config                        │  │ │
│  │ │                  │  │ - pageSize: 500-1000          │  │ │
│  │ │ Capabilities:    │  │ - maxPages: Infinity          │  │ │
│  │ │ - Range queries  │  │ - filters: author, date, etc  │  │ │
│  │ │ - Pagination     │  └───────────────────────────────┘  │ │
│  │ │ - Stats included │                                      │ │
│  │ └────────────────────────────────────────────────────────┘  │
│  │                                                               │
│  ├─ streamLog() → AsyncGenerator[commitBatch]                   │
│  └─ streamStatsLog() → AsyncGenerator[commitWithStats]          │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ SPARQL Query Streaming                                     │ │
│  │ ┌──────────────────┐  ┌───────────────────────────────┐  │ │
│  │ │StreamingQueryEx. │→→│ Config                        │  │ │
│  │ │                  │  │ - batchSize: 100-5000         │  │ │
│  │ │ Capabilities:    │  │ - timeout: 60000ms            │  │ │
│  │ │ - SELECT/ASK     │  │ - highWaterMark: 10000        │  │ │
│  │ │ - CONSTRUCT      │  └───────────────────────────────┘  │ │
│  │ │ - Result batches │                                      │ │
│  │ │ - Counting       │                                      │ │
│  │ │ - Pagination     │                                      │ │
│  │ └────────────────────────────────────────────────────────┘  │
│  │                                                               │
│  ├─ executeSelectStream() → AsyncGenerator[resultBatch]         │
│  ├─ executeConstructStream() → AsyncGenerator[quadBatch]        │
│  ├─ countResults() → Promise<number>                            │
│  └─ paginate() → AsyncGenerator[page]                           │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Storage & Processing                                       │ │
│  │ ┌──────────────────┐  ┌───────────────────────────────┐  │ │
│  │ │ChunkedGraphStore │→→│ Config                        │  │ │
│  │ │                  │  │ - chunkSize: 10000            │  │ │
│  │ │ Capabilities:    │  │ - maxChunksInMemory: 5        │  │ │
│  │ │ - Disk-backed    │  │ - persistDir: .gitvan/chunks  │  │ │
│  │ │ - LRU cache      │  └───────────────────────────────┘  │ │
│  │ │ - Efficient      │                                      │ │
│  │ │   queries        │                                      │ │
│  │ └────────────────────────────────────────────────────────┘  │
│  │                                                               │
│  ├─ addQuads() → batched persist                                │
│  ├─ streamQuads() → AsyncGenerator[quad]                        │
│  └─ query() → Promise<results>                                  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Batch Processing & Optimization                            │ │
│  │ ┌──────────────────┐  ┌───────────────────────────────┐  │ │
│  │ │BatchProcessor    │→→│ Config                        │  │ │
│  │ │                  │  │ - batchSize: 1000             │  │ │
│  │ │ Capabilities:    │  │ - flushInterval: 1000ms       │  │ │
│  │ │ - Auto-batching  │  │ - highWaterMark: 5000         │  │ │
│  │ │ - Timer-based    │  └───────────────────────────────┘  │ │
│  │ │   flushing       │                                      │ │
│  │ │ - Backpressure   │                                      │ │
│  │ └────────────────────────────────────────────────────────┘  │
│  │                                                               │
│  ├─ add() → add to queue, maybe flush                           │
│  ├─ addBatch() → add items, maybe flush                         │
│  └─ flush() → process pending batch                             │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Resource Management & Output Formatting                    │ │
│  │ ┌──────────────────┐  ┌───────────────────────────────┐  │ │
│  │ │ResourceManager   │→→│ Config                        │  │ │
│  │ │                  │  │ - memoryLimit: 500MB-1GB      │  │ │
│  │ │ Capabilities:    │  │ - cpuThreshold: 0.8           │  │ │
│  │ │ - Memory limits  │  │ - checkInterval: 1000ms       │  │ │
│  │ │ - Pause/resume   │  └───────────────────────────────┘  │ │
│  │ │ - GC hints       │                                      │ │
│  │ └────────────────────────────────────────────────────────┘  │
│  │                                                               │
│  └─ withResourceGuards() → AsyncGenerator with limits           │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Output Formats                                             │ │
│  │ ┌──────────────────┐  ┌───────────────────────────────┐  │ │
│  │ │StreamingFormats  │→→│ Supported Formats             │  │ │
│  │ │                  │  │ - N-Triples (line-delimited)  │  │ │
│  │ │ Capabilities:    │  │ - JSON-LD streaming           │  │ │
│  │ │ - Multiple       │  │ - CSV (with escaping)         │  │ │
│  │ │   formats        │  │ - JSON Array                  │  │ │
│  │ │ - Type-safe      │  └───────────────────────────────┘  │ │
│  │ │ - Escaping       │                                      │ │
│  │ └────────────────────────────────────────────────────────┘  │
│  │                                                               │
│  ├─ toNTriplesStream() → AsyncGenerator[line]                   │
│  ├─ toJSONLDStream() → AsyncGenerator[line]                     │
│  ├─ toCSVStream() → AsyncGenerator[line]                        │
│  └─ toJSONArrayStream() → AsyncGenerator[text]                  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Pagination Support                                         │ │
│  │ ┌──────────────────┐  ┌───────────────────────────────┐  │ │
│  │ │CursorPagination  │→→│ Benefits                      │  │ │
│  │ │                  │  │ - Stateless (URL-safe)        │  │ │
│  │ │ Capabilities:    │  │ - Base64 cursors              │  │ │
│  │ │ - Cursor-based   │  │ - REST API compatible         │  │ │
│  │ │ - Stateless      │  │ - No offset/limit overhead    │  │ │
│  │ │ - Efficient      │  └───────────────────────────────┘  │ │
│  │ └────────────────────────────────────────────────────────┘  │
│  │                                                               │
│  ├─ encodeCursor() → base64 cursor                              │
│  ├─ decodeCursor() → position + filters                         │
│  └─ paginate() → AsyncGenerator[page]                           │
│                                                                   │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                    Storage Layer                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Chunked JSONL Storage                                           │
│  ├─ .gitvan/chunks/chunk_001.jsonl (50K quads)                  │
│  ├─ .gitvan/chunks/chunk_002.jsonl (50K quads)                  │
│  ├─ .gitvan/chunks/chunk_003.jsonl (50K quads)                  │
│  └─ .gitvan/chunks/chunk_NNN.jsonl (remaining)                  │
│                                                                   │
│  LRU Cache (Memory)                                              │
│  ├─ chunk_001 (if accessed recently)                            │
│  ├─ chunk_002 (if accessed recently)                            │
│  └─ chunk_003 (if accessed recently)                            │
│                                                                   │
│  Optional: Compressed Archive                                    │
│  └─ .gitvan/chunks.tar.gz (for archival)                        │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Memory Usage Comparison

### Loading a 500MB RDF File

**Current (In-Memory Only):**
```
Time: 0ms    ├─ File read starts
Time: 5s     ├─ Parser starts processing
Time: 10s    ├─ Memory 100MB (parsing)
Time: 20s    ├─ Memory 500MB (1M quads loaded)
Time: 30s    ├─ Memory 1.2GB (quad processing)
Time: 40s    ├─ Memory 2GB (materialization)
Time: 45s    ├─ OOM - Process killed ✗
```

**Streaming (Chunked):**
```
Time: 0ms    ├─ File read starts
Time: 5s     ├─ Parser + batch 1 (50MB)
Time: 10s    ├─ Parse continues, flush batch 1
             ├─ Memory drops to 20MB (cache cleared)
Time: 15s    ├─ Parser + batch 2 (50MB)
             ├─ Memory ~70MB (batch 1 in cache + batch 2 parsing)
Time: 20s    ├─ Continue...
Time: 50s    ├─ Complete (10 batches)
             ├─ Peak memory: 150MB
             └─ All data persisted to disk ✓
```

### Query Performance on 10M Quads

**Current (Materialize All):**
```
Load quads:     2GB (quads in memory)
Execute query:  30s (SPARQL execution)
Materialize:    2GB (result buffer)
Serialize:      30s (JSON encoding)
Send:           60s (network transfer)
Memory peak:    4GB ✗ (OOM)
Total time:     Timeout
```

**Streaming (Batch Results):**
```
Load batch 1:    150MB (quads)
Execute query:   <1s (SPARQL)
Yield batch 1:   <0.1s (100 results)
Send batch 1:    <1s (network)
─── Repeat for remaining batches ───
Memory peak:     150MB ✓
Total time:      30s ✓
Throughput:      50K results/sec ✓
```

---

## Configuration Decision Tree

```
┌─ Do you have >100MB RDF data?
│  ├─ YES: Use TurtleStreamParser
│  └─ NO: Can use standard parser
│
├─ Do you query >100K results?
│  ├─ YES: Use StreamingQueryExecutor
│  └─ NO: Can use standard executor
│
├─ Do you have >10K git commits?
│  ├─ YES: Use GitLogStreaming
│  └─ NO: Can use standard git.log()
│
├─ Do you need to paginate results?
│  ├─ YES: Use CursorPagination
│  └─ NO: Can use offset/limit
│
├─ Do you need <300MB memory peak?
│  ├─ YES: Use ChunkedGraphStore
│  └─ NO: Can use in-memory store
│
└─ Do you need multiple output formats?
   ├─ YES: Use StreamingFormats
   └─ NO: Can use JSON only
```

---

## Performance Scaling Chart

```
Query Execution Time vs Result Size

100ms ┤
      │ Current (OOM at 1M)
      │        ╱
      │       ╱
  1s  ┤      ╱─ Timeout zone
      │     ╱
      │    ╱
 10s  ┤   ╱ Streaming
      │  ╱ (linear, no OOM)
      │ ╱
100s  ┤
      │
      └──┬──────┬──────┬──────┬──────
        1K    10K   100K    1M   10M
            Result Size
```

---

## Implementation Checklist Template

### Phase 1: TurtleStreamParser
- [ ] Create `src/streaming/TurtleStreamParser.mjs`
- [ ] Implement parseFile() method
- [ ] Implement parseStream() method
- [ ] Add tests for small files (<1MB)
- [ ] Add tests for large files (>100MB)
- [ ] Benchmark vs. current parser
- [ ] Document usage examples

### Phase 2: GitLogStreaming
- [ ] Create `src/composables/git/log-streaming.mjs`
- [ ] Implement streamLog() method
- [ ] Implement streamStatsLog() method
- [ ] Add filter support (author, date, etc.)
- [ ] Add tests (10K commits)
- [ ] Benchmark memory usage
- [ ] Document pagination strategy

### Phase 3: StreamingQueryExecutor
- [ ] Create `src/streaming/StreamingQueryExecutor.mjs`
- [ ] Implement executeSelectStream()
- [ ] Implement executeConstructStream()
- [ ] Implement countResults()
- [ ] Implement paginate()
- [ ] Add tests (1M results)
- [ ] Benchmark throughput
- [ ] Document result batching

### Phase 4-5: (See main plan)

---

## Troubleshooting Guide

### Issue: Memory Still Growing
**Cause:** Batches not flushing
**Solution:** Check highWaterMark setting, ensure flush() called

### Issue: SPARQL Queries Timing Out
**Cause:** Large result sets not streaming
**Solution:** Switch from execute* to *Stream variants

### Issue: Slow Disk I/O
**Cause:** Too many chunks, LRU cache misses
**Solution:** Increase maxChunksInMemory or chunkSize

### Issue: First Result Delayed
**Cause:** Entire graph loaded before query
**Solution:** Use streaming executor, check batch size

---

**End of Visual Reference Guide**
