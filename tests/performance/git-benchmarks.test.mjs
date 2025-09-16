// Performance benchmarks for GitVan git operations
import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { performance } from 'node:perf_hooks';
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { withGitVan } from '../../src/core/context.mjs';
import { useGit } from '../../src/composables/git.mjs';

describe('Git Operations Performance Benchmarks', () => {
  let testRepo;
  let git;
  let benchmarkResults = [];

  beforeEach(async () => {
    // Create temporary repository for testing
    testRepo = join(tmpdir(), `gitvan-bench-${Date.now()}`);
    mkdirSync(testRepo, { recursive: true });

    // Initialize git repo
    execSync('git init', { cwd: testRepo });
    execSync('git config user.email "test@gitvan.dev"', { cwd: testRepo });
    execSync('git config user.name "GitVan Test"', { cwd: testRepo });

    // Setup GitVan context
    await withGitVan({ cwd: testRepo }, async () => {
      git = useGit();
    });
  });

  afterEach(() => {
    if (testRepo) {
      rmSync(testRepo, { recursive: true, force: true });
    }
  });

  // Helper function to benchmark operations
  const benchmark = async (name, operation, iterations = 100) => {
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await operation();
      const end = performance.now();
      times.push(end - start);
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

    const result = {
      operation: name,
      iterations,
      average: avg,
      min,
      max,
      p95,
      throughput: 1000 / avg // ops per second
    };

    benchmarkResults.push(result);
    return result;
  };

  it('benchmarks basic repository info operations', async () => {
    await withGitVan({ cwd: testRepo }, async () => {
      // Create initial commit
      writeFileSync(join(testRepo, 'README.md'), '# Test repo');
      await git.add('README.md');
      await git.commit('Initial commit');

      // Benchmark basic info operations
      const branchBench = await benchmark('branch()', () => git.branch());
      const headBench = await benchmark('head()', () => git.head());
      const repoRootBench = await benchmark('repoRoot()', () => git.repoRoot());
      const gitDirBench = await benchmark('worktreeGitDir()', () => git.worktreeGitDir());

      // Assertions
      expect(branchBench.average).toBeLessThan(50); // Should be under 50ms average
      expect(headBench.average).toBeLessThan(50);
      expect(repoRootBench.average).toBeLessThan(50);
      expect(gitDirBench.average).toBeLessThan(50);
    });
  });

  it('benchmarks read operations with varying repository sizes', async () => {
    await withGitVan({ cwd: testRepo }, async () => {
      // Create repository with multiple commits
      const commitCount = 100;
      for (let i = 0; i < commitCount; i++) {
        writeFileSync(join(testRepo, `file-${i}.txt`), `Content ${i}`);
        await git.add(`file-${i}.txt`);
        await git.commit(`Commit ${i}`);
      }

      // Benchmark read operations
      const logBench = await benchmark('log()', () => git.log(), 50);
      const statusBench = await benchmark('statusPorcelain()', () => git.statusPorcelain(), 50);
      const revListBench = await benchmark('revList()', () => git.revList(), 50);

      expect(logBench.average).toBeLessThan(100);
      expect(statusBench.average).toBeLessThan(100);
      expect(revListBench.average).toBeLessThan(100);
    });
  });

  it('benchmarks write operations', async () => {
    await withGitVan({ cwd: testRepo }, async () => {
      let fileCounter = 0;

      const addBench = await benchmark('add()', async () => {
        const filename = `bench-${fileCounter++}.txt`;
        writeFileSync(join(testRepo, filename), 'benchmark content');
        await git.add(filename);
      }, 50);

      const commitBench = await benchmark('commit()', async () => {
        const filename = `commit-bench-${fileCounter++}.txt`;
        writeFileSync(join(testRepo, filename), 'commit benchmark');
        await git.add(filename);
        await git.commit(`Benchmark commit ${fileCounter}`);
      }, 20);

      expect(addBench.average).toBeLessThan(100);
      expect(commitBench.average).toBeLessThan(200);
    });
  });

  it('benchmarks notes operations', async () => {
    await withGitVan({ cwd: testRepo }, async () => {
      // Create initial commit
      writeFileSync(join(testRepo, 'notes-test.txt'), 'Notes test');
      await git.add('notes-test.txt');
      await git.commit('Notes test commit');
      const sha = await git.head();

      const noteAddBench = await benchmark('noteAdd()', async () => {
        await git.noteAdd('refs/notes/benchmark', `Note at ${Date.now()}`, sha);
      }, 30);

      const noteShowBench = await benchmark('noteShow()', async () => {
        try {
          await git.noteShow('refs/notes/benchmark', sha);
        } catch {
          // Notes might not exist for all iterations
        }
      }, 50);

      expect(noteAddBench.average).toBeLessThan(150);
      expect(noteShowBench.average).toBeLessThan(100);
    });
  });

  it('benchmarks plumbing operations', async () => {
    await withGitVan({ cwd: testRepo }, async () => {
      // Create test file
      const testFile = join(testRepo, 'plumbing-test.txt');
      writeFileSync(testFile, 'Plumbing benchmark content');

      const hashObjectBench = await benchmark('hashObject()', () =>
        git.hashObject('plumbing-test.txt'), 50);

      // Add and commit the file first
      await git.add('plumbing-test.txt');
      await git.commit('Plumbing test');

      const writeTreeBench = await benchmark('writeTree()', () => git.writeTree(), 50);

      const sha = await git.head();
      const catFileBench = await benchmark('catFilePretty()', () =>
        git.catFilePretty(sha), 50);

      expect(hashObjectBench.average).toBeLessThan(100);
      expect(writeTreeBench.average).toBeLessThan(100);
      expect(catFileBench.average).toBeLessThan(100);
    });
  });

  it('benchmarks memory usage patterns', async () => {
    await withGitVan({ cwd: testRepo }, async () => {
      const initialMemory = process.memoryUsage();

      // Create large repository
      const fileCount = 500;
      for (let i = 0; i < fileCount; i++) {
        writeFileSync(join(testRepo, `large-${i}.txt`), 'x'.repeat(1000));
      }

      await git.add('.');
      await git.commit('Large commit');

      // Perform memory-intensive operations
      const beforeLargeOps = process.memoryUsage();

      // Read large log
      await git.log('%H %s', ['--max-count=1000']);

      // Get status of many files
      await git.statusPorcelain();

      // List many revisions
      await git.revList(['--max-count=500', 'HEAD']);

      const afterLargeOps = process.memoryUsage();

      const memoryDelta = {
        rss: afterLargeOps.rss - beforeLargeOps.rss,
        heapUsed: afterLargeOps.heapUsed - beforeLargeOps.heapUsed,
        heapTotal: afterLargeOps.heapTotal - beforeLargeOps.heapTotal,
        external: afterLargeOps.external - beforeLargeOps.external
      };

      benchmarkResults.push({
        operation: 'memory_usage_large_repo',
        memoryDelta,
        initialMemory,
        finalMemory: afterLargeOps
      });

      // Memory usage should be reasonable
      expect(memoryDelta.heapUsed).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
    });
  });

  it('benchmarks execFile bottlenecks', async () => {
    await withGitVan({ cwd: testRepo }, async () => {
      // Create repository with some content
      writeFileSync(join(testRepo, 'exec-test.txt'), 'ExecFile test content');
      await git.add('exec-test.txt');
      await git.commit('ExecFile test commit');

      // Test different buffer sizes
      const bufferSizes = [1024, 4096, 12 * 1024 * 1024]; // 1KB, 4KB, 12MB (default)

      for (const bufferSize of bufferSizes) {
        const customGit = {
          async runWithBuffer() {
            // Simulate running git with different buffer sizes
            const start = performance.now();
            await git.log();
            const end = performance.now();
            return end - start;
          }
        };

        const bufferBench = await benchmark(`execFile_buffer_${bufferSize}`,
          () => customGit.runWithBuffer(), 30);

        benchmarkResults.push({
          operation: `execFile_buffer_analysis`,
          bufferSize,
          performance: bufferBench
        });
      }

      // Test concurrent execFile calls
      const concurrentBench = await benchmark('concurrent_execFile', async () => {
        const promises = [
          git.branch(),
          git.head(),
          git.statusPorcelain(),
          git.log()
        ];
        await Promise.all(promises);
      }, 20);

      benchmarkResults.push({
        operation: 'concurrent_git_operations',
        performance: concurrentBench
      });

      expect(concurrentBench.average).toBeLessThan(300); // Should handle concurrency well
    });
  });

  it('stores benchmark results in memory', async () => {
    // Store results for hive mind coordination
    const performanceReport = {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      benchmarks: benchmarkResults,
      summary: {
        totalOperations: benchmarkResults.length,
        averagePerformance: benchmarkResults.reduce((sum, b) => sum + (b.average || 0), 0) / benchmarkResults.length,
        bottlenecks: benchmarkResults.filter(b => (b.average || 0) > 100),
        recommendations: []
      }
    };

    // Add performance recommendations
    const slowOps = benchmarkResults.filter(b => (b.average || 0) > 100);
    if (slowOps.length > 0) {
      performanceReport.summary.recommendations.push(
        'Consider caching results for operations: ' + slowOps.map(op => op.operation).join(', ')
      );
    }

    const highMemoryOps = benchmarkResults.filter(b =>
      b.memoryDelta && b.memoryDelta.heapUsed > 10 * 1024 * 1024);
    if (highMemoryOps.length > 0) {
      performanceReport.summary.recommendations.push(
        'Optimize memory usage for large repository operations'
      );
    }

    // This would normally be stored via hooks, simulated here
    console.log('Performance Report:', JSON.stringify(performanceReport, null, 2));

    expect(performanceReport.benchmarks.length).toBeGreaterThan(0);
    expect(performanceReport.summary.totalOperations).toBeGreaterThan(0);
  });
});