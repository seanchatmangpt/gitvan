// Large repository performance tests
import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { performance } from 'node:perf_hooks';
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { withGitVan } from '../../src/core/context.mjs';
import { useGit } from '../../src/composables/git.mjs';

describe('Large Repository Performance Tests', () => {
  let testRepo;
  let git;
  const benchmarkResults = [];

  beforeEach(async () => {
    testRepo = join(tmpdir(), `gitvan-large-${Date.now()}`);
    mkdirSync(testRepo, { recursive: true });

    execSync('git init', { cwd: testRepo });
    execSync('git config user.email "test@gitvan.dev"', { cwd: testRepo });
    execSync('git config user.name "GitVan Test"', { cwd: testRepo });

    await withGitVan({ cwd: testRepo }, async () => {
      git = useGit();
    });
  });

  afterEach(() => {
    if (testRepo) {
      rmSync(testRepo, { recursive: true, force: true });
    }
  });

  const createLargeRepository = async (fileCount, commitCount) => {
    await withGitVan({ cwd: testRepo }, async () => {
      console.log(`Creating repository with ${fileCount} files and ${commitCount} commits...`);

      for (let commit = 0; commit < commitCount; commit++) {
        const filesPerCommit = Math.floor(fileCount / commitCount);

        for (let file = 0; file < filesPerCommit; file++) {
          const fileIndex = commit * filesPerCommit + file;
          const fileName = `file-${fileIndex}.txt`;
          const content = `Content for file ${fileIndex} in commit ${commit}\n${'x'.repeat(1000)}`;
          writeFileSync(join(testRepo, fileName), content);
        }

        await git.add('.');
        await git.commit(`Commit ${commit}: Added ${filesPerCommit} files`);

        if (commit % 10 === 0) {
          console.log(`Created ${commit + 1}/${commitCount} commits`);
        }
      }

      console.log(`Repository creation complete: ${fileCount} files, ${commitCount} commits`);
    });
  };

  const measureOperation = async (name, operation) => {
    const start = performance.now();
    const memBefore = process.memoryUsage();

    const result = await operation();

    const end = performance.now();
    const memAfter = process.memoryUsage();

    const metrics = {
      operation: name,
      duration: end - start,
      memoryDelta: {
        rss: memAfter.rss - memBefore.rss,
        heapUsed: memAfter.heapUsed - memBefore.heapUsed,
        heapTotal: memAfter.heapTotal - memBefore.heapTotal,
        external: memAfter.external - memBefore.external
      },
      resultSize: typeof result === 'string' ? result.length : 0
    };

    benchmarkResults.push(metrics);
    return { result, metrics };
  };

  it('tests performance with medium repository (100 files, 50 commits)', async () => {
    await createLargeRepository(100, 50);

    await withGitVan({ cwd: testRepo }, async () => {
      // Test basic operations
      const { metrics: branchMetrics } = await measureOperation('branch_medium', () => git.branch());
      const { metrics: headMetrics } = await measureOperation('head_medium', () => git.head());
      const { metrics: logMetrics } = await measureOperation('log_medium', () => git.log());
      const { metrics: statusMetrics } = await measureOperation('status_medium', () => git.statusPorcelain());
      const { metrics: revListMetrics } = await measureOperation('revList_medium', () => git.revList(['--max-count=100']));

      // Assertions for medium repository
      expect(branchMetrics.duration).toBeLessThan(200);
      expect(headMetrics.duration).toBeLessThan(200);
      expect(logMetrics.duration).toBeLessThan(500);
      expect(statusMetrics.duration).toBeLessThan(1000);
      expect(revListMetrics.duration).toBeLessThan(500);

      // Memory usage should be reasonable
      expect(logMetrics.memoryDelta.heapUsed).toBeLessThan(20 * 1024 * 1024); // 20MB
      expect(statusMetrics.memoryDelta.heapUsed).toBeLessThan(30 * 1024 * 1024); // 30MB
    });
  });

  it('tests performance with large repository (500 files, 100 commits)', async () => {
    await createLargeRepository(500, 100);

    await withGitVan({ cwd: testRepo }, async () => {
      // Test operations on large repository
      const { metrics: branchMetrics } = await measureOperation('branch_large', () => git.branch());
      const { metrics: headMetrics } = await measureOperation('head_large', () => git.head());
      const { metrics: logMetrics } = await measureOperation('log_large', () => git.log());
      const { metrics: statusMetrics } = await measureOperation('status_large', () => git.statusPorcelain());
      const { metrics: revListMetrics } = await measureOperation('revList_large', () => git.revList(['--max-count=200']));

      // Assertions for large repository
      expect(branchMetrics.duration).toBeLessThan(500);
      expect(headMetrics.duration).toBeLessThan(500);
      expect(logMetrics.duration).toBeLessThan(2000);
      expect(statusMetrics.duration).toBeLessThan(5000);
      expect(revListMetrics.duration).toBeLessThan(2000);

      // Memory usage should still be manageable
      expect(logMetrics.memoryDelta.heapUsed).toBeLessThan(50 * 1024 * 1024); // 50MB
      expect(statusMetrics.memoryDelta.heapUsed).toBeLessThan(100 * 1024 * 1024); // 100MB
    });
  });

  it('tests concurrent operations on large repository', async () => {
    await createLargeRepository(200, 50);

    await withGitVan({ cwd: testRepo }, async () => {
      // Test multiple concurrent operations
      const { metrics: concurrentMetrics } = await measureOperation('concurrent_large', async () => {
        const operations = [
          git.branch(),
          git.head(),
          git.log('%h %s', ['--max-count=20']),
          git.statusPorcelain(),
          git.revList(['--max-count=50']),
          git.repoRoot(),
          git.worktreeGitDir()
        ];

        return await Promise.all(operations);
      });

      // Concurrent operations should be faster than sequential
      expect(concurrentMetrics.duration).toBeLessThan(3000);
      expect(concurrentMetrics.memoryDelta.heapUsed).toBeLessThan(80 * 1024 * 1024);
    });
  });

  it('tests performance degradation patterns', async () => {
    const repositorySizes = [
      { files: 50, commits: 25, name: 'small' },
      { files: 100, commits: 50, name: 'medium' },
      { files: 200, commits: 75, name: 'large' }
    ];

    const degradationResults = [];

    for (const repoSize of repositorySizes) {
      // Clean and recreate repository
      rmSync(testRepo, { recursive: true, force: true });
      mkdirSync(testRepo, { recursive: true });
      execSync('git init', { cwd: testRepo });
      execSync('git config user.email "test@gitvan.dev"', { cwd: testRepo });
      execSync('git config user.name "GitVan Test"', { cwd: testRepo });

      await createLargeRepository(repoSize.files, repoSize.commits);

      await withGitVan({ cwd: testRepo }, async () => {
        const { metrics: logMetrics } = await measureOperation(`log_${repoSize.name}`, () => git.log());
        const { metrics: statusMetrics } = await measureOperation(`status_${repoSize.name}`, () => git.statusPorcelain());

        degradationResults.push({
          size: repoSize.name,
          files: repoSize.files,
          commits: repoSize.commits,
          logDuration: logMetrics.duration,
          statusDuration: statusMetrics.duration,
          logMemory: logMetrics.memoryDelta.heapUsed,
          statusMemory: statusMetrics.memoryDelta.heapUsed
        });
      });
    }

    // Analyze degradation patterns
    const logDegradation = degradationResults.map(r => r.logDuration);
    const statusDegradation = degradationResults.map(r => r.statusDuration);

    // Performance should scale reasonably (not exponentially)
    expect(logDegradation[2] / logDegradation[0]).toBeLessThan(10); // 10x max degradation
    expect(statusDegradation[2] / statusDegradation[0]).toBeLessThan(15); // 15x max degradation

    benchmarkResults.push({
      operation: 'performance_degradation_analysis',
      degradationResults
    });
  });

  it('tests memory pressure scenarios', async () => {
    await createLargeRepository(300, 100);

    await withGitVan({ cwd: testRepo }, async () => {
      const initialMemory = process.memoryUsage();

      // Perform multiple memory-intensive operations in sequence
      const operations = [];

      for (let i = 0; i < 10; i++) {
        const { metrics } = await measureOperation(`memory_pressure_${i}`, async () => {
          // Simulate memory pressure with large output operations
          const log = await git.log('%H %an %ad %s', ['--max-count=200']);
          const status = await git.statusPorcelain();
          const revList = await git.revList(['--max-count=200']);

          return { log: log.length, status: status.length, revList: revList.length };
        });

        operations.push(metrics);
      }

      const finalMemory = process.memoryUsage();
      const totalMemoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory should not grow indefinitely
      expect(totalMemoryIncrease).toBeLessThan(200 * 1024 * 1024); // 200MB total increase

      // Check for memory leaks
      const avgMemoryPerOp = operations.reduce((sum, op) => sum + op.memoryDelta.heapUsed, 0) / operations.length;
      expect(avgMemoryPerOp).toBeLessThan(50 * 1024 * 1024); // 50MB average per operation

      benchmarkResults.push({
        operation: 'memory_pressure_analysis',
        totalMemoryIncrease,
        avgMemoryPerOp,
        operations: operations.length
      });
    });
  });

  it('generates comprehensive performance report', async () => {
    const performanceReport = {
      timestamp: new Date().toISOString(),
      testType: 'large_repository_performance',
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cpus: require('os').cpus().length,
        totalMemory: require('os').totalmem(),
        freeMemory: require('os').freemem()
      },
      benchmarks: benchmarkResults,
      analysis: {
        totalOperations: benchmarkResults.length,
        slowestOperation: benchmarkResults.reduce((max, current) =>
          current.duration > (max.duration || 0) ? current : max, {}),
        memoryHeaviestOperation: benchmarkResults.reduce((max, current) =>
          (current.memoryDelta?.heapUsed || 0) > (max.memoryDelta?.heapUsed || 0) ? current : max, {}),
        averageDuration: benchmarkResults.reduce((sum, b) => sum + (b.duration || 0), 0) / benchmarkResults.length,
        totalMemoryUsed: benchmarkResults.reduce((sum, b) => sum + (b.memoryDelta?.heapUsed || 0), 0)
      },
      recommendations: []
    };

    // Generate recommendations based on analysis
    if (performanceReport.analysis.averageDuration > 1000) {
      performanceReport.recommendations.push('Consider implementing operation caching for frequently used commands');
    }

    if (performanceReport.analysis.totalMemoryUsed > 500 * 1024 * 1024) {
      performanceReport.recommendations.push('Consider implementing streaming for large output operations');
    }

    const slowOperations = benchmarkResults.filter(b => (b.duration || 0) > 2000);
    if (slowOperations.length > 0) {
      performanceReport.recommendations.push(`Optimize slow operations: ${slowOperations.map(op => op.operation).join(', ')}`);
    }

    console.log('Large Repository Performance Report:', JSON.stringify(performanceReport, null, 2));

    expect(performanceReport.benchmarks.length).toBeGreaterThan(0);
    expect(performanceReport.analysis.totalOperations).toBeGreaterThan(0);
  });
});