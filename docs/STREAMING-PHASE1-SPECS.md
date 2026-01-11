# GitVan Streaming - Phase 1 Implementation Specifications

**Date:** January 10, 2026
**Phase:** Phase 1: Foundation & Parsers
**Target Release:** v4.5
**Duration:** 2 weeks
**Status:** Ready for Implementation

---

## Phase 1 Overview

Phase 1 focuses on foundational streaming components: parsing large RDF files and git histories without loading entire datasets into memory. This phase introduces zero breaking changes while enabling large-scale data processing.

### Deliverables

1. **TurtleStreamParser** - Streaming Turtle file parser
2. **GitLogStreaming** - Git history pagination composable
3. **Comprehensive POC Tests** - Validation with large datasets
4. **Error Handling** - Robust error recovery
5. **Documentation** - Usage examples and patterns

### Phase 1 Scope (What We Build)

✅ TurtleStreamParser class
✅ GitLogStreaming composable function
✅ Integration tests with real data
✅ POC tests with large files (100MB+)
✅ Memory efficiency validation
✅ Performance benchmarks

### Phase 1 Scope (What We Don't Build)

❌ StreamingQueryExecutor (Phase 2)
❌ ChunkedGraphStore (Phase 3)
❌ ResourceManager (Phase 4)
❌ Complete streaming composable integration (Phase 2)
❌ Output format streaming (Phase 2)

---

## Component Specifications

### 1. TurtleStreamParser Specification

#### File Location
`src/streaming/TurtleStreamParser.mjs`

#### Class Definition
```javascript
export class TurtleStreamParser {
  /**
   * Create a new Turtle streaming parser
   * @param {Object} options Configuration options
   * @param {number} options.chunkSize - Read chunk size (default: 65536)
   * @param {number} options.batchSize - Quads per batch (default: 1000)
   * @param {number} options.highWaterMark - Internal buffer (default: 5000)
   * @param {Object} options.prefixes - Namespace prefixes (default: {})
   */
  constructor(options = {})

  /**
   * Parse readable stream and yield quad batches
   * @param {ReadableStream} readableStream Input stream
   * @yields {Array<Quad>} Batches of parsed quads
   */
  async *parseStream(readableStream)

  /**
   * Parse file and yield quad batches
   * @param {string} filePath File path
   * @yields {Array<Quad>} Batches of parsed quads
   */
  async *parseFile(filePath)

  /**
   * Get parser statistics
   * @returns {Object} Stats including quads parsed, bytes processed
   */
  getStats()
}
```

#### Implementation Details

**Dependencies**:
- `n3` package (already installed)
- Node.js `fs.createReadStream`
- Node.js `StringDecoder`

**Key Methods**:

1. **parseStream(readableStream)**
   - Create N3 Parser instance
   - Attach 'data' event handler to stream
   - Buffer parsed quads
   - Emit batch when size reached
   - Maintain stats

2. **parseFile(filePath)**
   - Create ReadableStream with configurable highWaterMark
   - Call parseStream()
   - Handle file errors

3. **getStats()**
   - Track quads parsed
   - Track bytes processed
   - Track parse time
   - Track batches emitted

#### Error Handling

```javascript
// Type 1: Parse Errors
throw new ParseError({
  message: 'Invalid Turtle syntax',
  line: lineNumber,
  context: chunk.slice(0, 100)
});

// Type 2: File Errors
throw new FileNotFoundError({
  message: `File not found: ${filePath}`,
  path: filePath
});

// Type 3: Encoding Errors
throw new EncodingError({
  message: 'Invalid UTF-8 encoding',
  position: byteOffset
});

// Type 4: Recovery Pattern
try {
  const quads = parser.parse(chunk);
  return quads;
} catch (error) {
  if (error.recoverable) {
    logger.warn(`Parse recovered from error at line ${error.line}`);
    return [];  // Skip chunk, continue
  } else {
    throw error;  // Unrecoverable, propagate
  }
}
```

#### Performance Targets

| Metric | Target | Validation |
|--------|--------|-----------|
| Parse 100MB file | <15s | Benchmark test |
| Memory peak | <150MB | Heap snapshot |
| Parse rate | >100K quads/sec | Counter |
| Batch latency | <10ms | Histogram |

---

### 2. GitLogStreaming Specification

#### File Location
`src/composables/git/log-streaming.mjs`

#### Function Definition
```javascript
/**
 * Create git log streaming composable
 * @param {Object} options Configuration
 * @param {number} options.pageSize - Commits per page (default: 500)
 * @param {number} options.maxPages - Max pages to fetch (default: Infinity)
 * @returns {Object} Composable with streaming methods
 */
export function useGitLogStreaming(options = {})

// Returned object shape:
{
  /**
   * Stream commit history with optional filters
   * @param {string} branch - Branch name (default: 'HEAD')
   * @param {Object} filters - Filters (date, author, etc)
   * @yields {Array<CommitInfo>} Batches of commits
   */
  async *streamLog(branch, filters),

  /**
   * Stream commit stats (file changes)
   * @param {string} branch - Branch name
   * @yields {Array<CommitStats>} Commits with stats
   */
  async *streamStatsLog(branch),

  /**
   * Stream commits from tag/branch pattern
   * @param {string} pattern - Ref pattern
   * @yields {Array<CommitInfo>} Batches of commits
   */
  async *streamRefsLog(pattern)
}
```

#### Implementation Details

**Dependencies**:
- `useGit()` composable (existing)
- Context-aware via `unctx`
- Git command execution via isomorphic-git

**Key Methods**:

1. **streamLog(branch, filters)**
   - Execute `git log --skip=N --max-count=pageSize`
   - Parse output into CommitInfo objects
   - Apply optional filters (date, author)
   - Yield batches when page complete
   - Stop when no commits returned

2. **streamStatsLog(branch)**
   - Execute `git log --shortstat`
   - Parse stats for each commit
   - Yield CommitStats objects

3. **streamRefsLog(pattern)**
   - Execute `git log refs/matching/pattern`
   - Support multiple refs
   - Stream commits from all matching refs

#### Commit Info Structure

```javascript
{
  hash: 'abc123...',
  abbrevHash: 'abc123',
  author: {
    name: 'John Doe',
    email: 'john@example.com',
    date: '2025-01-10T12:00:00Z'
  },
  committer: {
    name: 'John Doe',
    email: 'john@example.com',
    date: '2025-01-10T12:00:00Z'
  },
  subject: 'Fix bug in parser',
  body: 'Detailed description...',
  parentHashes: ['parent1hash'],
  isSignedOff: false
}
```

#### Commit Stats Structure

```javascript
{
  hash: 'abc123...',
  author: { name: 'John', email: 'john@example.com' },
  subject: 'Add feature',
  stats: {
    filesChanged: 5,
    insertions: 150,
    deletions: 25,
    files: [
      { path: 'src/file.js', insertions: 100, deletions: 10 },
      { path: 'test/file.test.js', insertions: 50, deletions: 15 }
    ]
  }
}
```

#### Error Handling

```javascript
// Type 1: Invalid Branch
if (!branchExists(branch)) {
  throw new BranchNotFoundError(`Branch '${branch}' not found`);
}

// Type 2: Git Command Failure
try {
  const output = await git.run(['log', ...args]);
} catch (error) {
  if (error.message.includes('fatal')) {
    throw new GitCommandError(error.message);
  }
}

// Type 3: Parse Errors (recovered)
try {
  const parsed = parseCommitInfo(lines);
} catch (error) {
  logger.warn(`Skipped unparseable commit at batch ${batchNum}`);
  // Continue with next batch
}
```

#### Performance Targets

| Metric | Target | Validation |
|--------|--------|-----------|
| 10K commits | <5s | Benchmark test |
| 50K commits | <20s | Integration test |
| Memory per batch | <50MB | Monitor pageSize=1000 |
| Throughput | >2000/sec | Counter |

---

### 3. Integration & Context Handling

#### Context Preservation Pattern

All streaming operations must preserve GitVan context:

```javascript
// CORRECT: Using withGitVan wrapper
import { withGitVan, useGitVan } from 'gitvan/context';

export async function processLargeHistory(context, repoPath) {
  return await withGitVan(context, async () => {
    const git = useGit();  // Context preserved here
    const streaming = useGitLogStreaming({ pageSize: 1000 });

    for await (const commits of streaming.streamLog('HEAD')) {
      await processBatch(commits);  // Context preserved through await
    }
  });
}

// WRONG: Context lost after await
export async function processLargeHistory(context, repoPath) {
  const git = useGit();
  const streaming = useGitLogStreaming();

  for await (const commits of streaming.streamLog('HEAD')) {
    // Context may be lost here! ❌
    await processBatch(commits);
  }
}
```

#### Test Pattern

```javascript
import { describe, it, expect } from 'vitest';
import { withGitVan, useGitVan } from 'gitvan/context';
import { useGitLogStreaming } from 'src/composables/git/log-streaming.mjs';

describe('Git Log Streaming', () => {
  it('should stream commits preserving context', async () => {
    const context = createTestContext();

    const result = await withGitVan(context, async () => {
      const streaming = useGitLogStreaming({ pageSize: 100 });
      const batches = [];

      for await (const commits of streaming.streamLog('HEAD')) {
        batches.push(commits);
      }

      return batches;
    });

    expect(result.length).toBeGreaterThan(0);
    expect(result[0][0]).toHaveProperty('hash');
  });
});
```

---

## Error Handling Specification

### Error Hierarchy

```
StreamingError (base)
├── ParseError
│   ├── TurtleParseError (line, context)
│   └── CommitParseError (line, context)
├── FileError
│   ├── FileNotFoundError (path)
│   └── FileReadError (path, errno)
├── GitError
│   ├── BranchNotFoundError (branch)
│   ├── GitCommandError (command, stderr)
│   └── RepositoryError (message)
├── ResourceError
│   ├── OutOfMemoryError
│   └── DiskFullError
└── ValidationError
    ├── InvalidFilterError
    └── InvalidOptionsError
```

### Error Recovery Rules

| Error Type | Recoverable | Action |
|-----------|-------------|--------|
| Parse errors | Yes | Log, skip item, continue |
| File not found | No | Throw, stop |
| Branch not found | No | Throw, stop |
| Resource limit | Depends | Pause, retry, or stop |
| Encoding error | Maybe | Log, skip, continue |
| Git command fail | No | Throw, stop |

### Error Handling Examples

```javascript
// TurtleStreamParser error handling
try {
  for await (const quads of parser.parseFile('data.ttl')) {
    await store.addQuads(quads);
  }
} catch (error) {
  if (error instanceof ParseError) {
    logger.error(`Parse failed at line ${error.line}: ${error.message}`);
    logger.debug(`Context: ${error.context}`);
    // Decide: retry, skip, or abort
  } else if (error instanceof FileNotFoundError) {
    logger.error(`File ${error.path} not found`);
    // Abort - file errors are not recoverable
  } else if (error instanceof EncodingError) {
    logger.warn(`Encoding error at byte ${error.position}, skipping`);
    // Continue - encoding errors can be skipped
  } else {
    throw error;  // Unknown error, propagate
  }
}

// GitLogStreaming error handling
try {
  for await (const commits of streaming.streamLog('main')) {
    await processCommits(commits);
  }
} catch (error) {
  if (error instanceof BranchNotFoundError) {
    logger.error(`Branch '${error.branch}' does not exist`);
    // Try alternative branch or abort
  } else if (error instanceof GitCommandError) {
    logger.error(`Git command failed: ${error.stderr}`);
    // Abort - repository may be corrupted
  } else {
    throw error;
  }
}
```

---

## Testing Specification

### Test File
`tests/v4/streaming-poc.test.mjs`

### Test Categories

#### 1. Unit Tests: TurtleStreamParser

```javascript
describe('TurtleStreamParser - Unit Tests', () => {
  // Basic functionality
  it('should parse small Turtle file')
  it('should yield quads in batches')
  it('should respect batchSize option')
  it('should track statistics correctly')

  // Error handling
  it('should handle invalid Turtle syntax')
  it('should handle file not found')
  it('should handle encoding errors')
  it('should recover from parse errors')

  // Streaming behavior
  it('should not load entire file into memory')
  it('should support pause/resume')
});
```

#### 2. Unit Tests: GitLogStreaming

```javascript
describe('GitLogStreaming - Unit Tests', () => {
  // Basic functionality
  it('should stream commits from HEAD')
  it('should yield commits in batches')
  it('should respect pageSize option')
  it('should parse commit info correctly')

  // Filtering
  it('should filter by date range')
  it('should filter by author')
  it('should apply multiple filters')

  // Error handling
  it('should handle invalid branch')
  it('should handle git command failure')
  it('should skip unparseable commits')
});
```

#### 3. Integration Tests: Large File Handling

```javascript
describe('Streaming - Large File Integration', () => {
  // 100MB+ test
  it('should parse 100MB Turtle file', async () => {
    // Create test file or use fixture
    // Verify peak memory < 150MB
    // Verify parse completes in < 15s
  })

  // 500MB test
  it('should parse 500MB Turtle file', async () => {
    // Similar test at larger scale
    // Verify memory < 300MB
  })

  // Large git history
  it('should stream 50K commits', async () => {
    // Setup repo with many commits
    // Verify streaming works without OOM
    // Verify throughput > 2000 commits/sec
  })
});
```

#### 4. Memory Efficiency Tests

```javascript
describe('Streaming - Memory Efficiency', () => {
  it('should maintain low memory footprint', async () => {
    const before = process.memoryUsage().heapUsed;

    // Stream large dataset
    for await (const batch of parser.parseFile('large.ttl')) {
      // Process batch
    }

    const after = process.memoryUsage().heapUsed;
    const peakMemory = /* measure during iteration */;

    expect(peakMemory).toBeLessThan(150 * 1024 * 1024);  // 150MB
  });

  it('should not accumulate memory over time', async () => {
    // Stream multiple times
    // Verify memory returns to baseline
  });

  it('should respect batch size boundaries', async () => {
    // Monitor batch sizes
    // Verify no batch exceeds configured size
  });
});
```

#### 5. Performance Benchmarks

```javascript
describe('Streaming - Performance Benchmarks', () => {
  it('should parse at least 100K quads/sec', async () => {
    const start = performance.now();
    let quadCount = 0;

    for await (const quads of parser.parseFile('bench.ttl')) {
      quadCount += quads.length;
    }

    const elapsed = performance.now() - start;
    const rate = quadCount / (elapsed / 1000);

    expect(rate).toBeGreaterThan(100000);  // 100K quads/sec
  });

  it('should traverse 10K commits in < 5 seconds', async () => {
    const start = performance.now();

    for await (const commits of streaming.streamLog('HEAD')) {
      // Process batch
    }

    const elapsed = (performance.now() - start) / 1000;
    expect(elapsed).toBeLessThan(5);
  });
});
```

#### 6. Context Preservation Tests

```javascript
describe('Streaming - Context Preservation', () => {
  it('should preserve context through async iteration', async () => {
    const context = createTestContext();

    const result = await withGitVan(context, async () => {
      const git = useGit();
      const streaming = useGitLogStreaming();

      for await (const commits of streaming.streamLog('HEAD')) {
        // Verify context available here
        const currentContext = useGitVan();
        expect(currentContext).toBeDefined();
      }
    });

    expect(result).toBeDefined();
  });

  it('should fail without withGitVan wrapper', async () => {
    // Demonstrate context loss without wrapper
    expect(() => {
      const streaming = useGitLogStreaming();
      // This will fail because useGitVan() outside context
    }).toThrow();
  });
});
```

---

## Implementation Checklist

### Code Structure
- [ ] Create `src/streaming/TurtleStreamParser.mjs`
- [ ] Create `src/composables/git/log-streaming.mjs`
- [ ] Create error classes in `src/streaming/errors.mjs`
- [ ] Add utility functions in `src/streaming/utils.mjs`
- [ ] Update `src/composables/git.mjs` to export log-streaming

### Documentation
- [ ] Add inline JSDoc comments
- [ ] Create usage examples
- [ ] Document error handling
- [ ] Add performance notes

### Testing
- [ ] Create `tests/v4/streaming-poc.test.mjs`
- [ ] Add unit tests for both components
- [ ] Add large file integration tests
- [ ] Add memory efficiency tests
- [ ] Add performance benchmarks
- [ ] Verify context preservation
- [ ] Achieve 80%+ coverage

### Validation
- [ ] All tests pass
- [ ] No memory leaks
- [ ] Performance meets targets
- [ ] Error handling verified
- [ ] Context preservation verified
- [ ] Documentation complete

---

## Success Criteria

### Functional
- ✅ TurtleStreamParser parses files >100MB
- ✅ GitLogStreaming handles repositories with 50K+ commits
- ✅ Both components never load entire dataset into memory
- ✅ Proper error handling with recovery patterns
- ✅ Context preserved through async iterations

### Performance
- ✅ Parse 100MB Turtle in <15 seconds
- ✅ Peak memory <150MB for 100MB files
- ✅ Memory <50MB per page of git history
- ✅ Parse rate >100K quads/second
- ✅ Git throughput >2000 commits/second

### Quality
- ✅ 80%+ test coverage
- ✅ All error cases tested
- ✅ No memory leaks
- ✅ Comprehensive JSDoc
- ✅ Example code in tests

### Compatibility
- ✅ Zero breaking changes
- ✅ Works with existing composables
- ✅ Compatible with all Node.js versions
- ✅ No new external dependencies (uses n3, fs which exist)

---

## Timeline

### Week 1
- Days 1-2: Implement TurtleStreamParser
- Days 3-4: Implement GitLogStreaming
- Days 5: Integration testing, error handling

### Week 2
- Days 1-2: Complete POC tests (large files)
- Days 3-4: Performance validation & tuning
- Day 5: Documentation & final review

---

## Dependencies & Requirements

### Package Dependencies
- `n3@1.17.0` (already installed)
- Node.js 18+ (existing requirement)
- `unctx` (existing, for context)

### System Requirements
- 2GB+ RAM for large file tests
- 10GB+ disk for test data (optional)
- Unix-like system for git operations

### Test Requirements
- Test fixtures: Small Turtle files
- Large file generation: Script to create 100MB+ files
- Git repository fixtures: Repos with 50K+ commits

---

## Known Risks & Mitigations

### Risk: N3 Parser Memory Usage
**Problem**: N3 parser might buffer internally
**Mitigation**: Monitor with heap snapshots, adjust batch sizes if needed

### Risk: Git Command Performance
**Problem**: `git log --skip` might be slow on very large repos
**Mitigation**: Fall back to `git log` with range or reduce page size

### Risk: File System Bottlenecks
**Problem**: Reading large files might be I/O bound
**Mitigation**: Adjust chunk size, use higher watermark

### Risk: Context Loss
**Problem**: Async generators might lose context
**Mitigation**: Test pattern established, enforce in code review

---

## Next Steps

1. Review this specification with team
2. Create implementation tasks
3. Set up test fixtures
4. Begin Phase 1 development
5. Weekly status check-ins
6. Document learnings for Phase 2

---

**Document Status**: Ready for Development
**Phase**: 1 of 5
**Next Review**: After Phase 1 completion
**Reference**: STREAMING-ARCHITECTURE-DESIGN.md, STREAMING_AND_LARGE_SCALE_PROCESSING_PLAN.md
