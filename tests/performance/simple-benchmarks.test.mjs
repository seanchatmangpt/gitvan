// Simplified performance benchmarks for GitVan
import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { performance } from 'node:perf_hooks';
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { withGitVan } from '../../src/core/context.mjs';
import { useGit } from '../../src/composables/git.mjs';

describe('Simplified Performance Analysis', () => {
  let testRepo;
  let git;
  const performanceMetrics = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    },
    benchmarks: []
  };

  beforeEach(async () => {
    testRepo = join(tmpdir(), `gitvan-simple-${Date.now()}`);
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

  const measureOperation = async (name, operation, iterations = 10) => {
    const times = [];
    const memoryDeltas = [];

    for (let i = 0; i < iterations; i++) {
      const memBefore = process.memoryUsage();
      const start = performance.now();

      await operation();

      const end = performance.now();
      const memAfter = process.memoryUsage();

      times.push(end - start);
      memoryDeltas.push(memAfter.heapUsed - memBefore.heapUsed);
    }

    const metrics = {
      operation: name,
      iterations,
      avgDuration: times.reduce((sum, t) => sum + t, 0) / times.length,
      minDuration: Math.min(...times),
      maxDuration: Math.max(...times),
      avgMemoryDelta: memoryDeltas.reduce((sum, m) => sum + m, 0) / memoryDeltas.length,
      throughput: 1000 / (times.reduce((sum, t) => sum + t, 0) / times.length)
    };

    performanceMetrics.benchmarks.push(metrics);
    return metrics;
  };

  it('measures basic git operations performance', async () => {
    await withGitVan({ cwd: testRepo }, async () => {
      // Create initial commit
      writeFileSync(join(testRepo, 'test.txt'), 'Test content');
      await git.add('test.txt');
      await git.commit('Initial commit');

      // Measure basic operations
      const branchMetrics = await measureOperation('branch', () => git.branch());
      const headMetrics = await measureOperation('head', () => git.head());
      const repoRootMetrics = await measureOperation('repoRoot', () => git.repoRoot());
      const statusMetrics = await measureOperation('statusPorcelain', () => git.statusPorcelain());

      // Basic assertions
      expect(branchMetrics.avgDuration).toBeLessThan(100);
      expect(headMetrics.avgDuration).toBeLessThan(100);
      expect(repoRootMetrics.avgDuration).toBeLessThan(100);
      expect(statusMetrics.avgDuration).toBeLessThan(200);

      console.log('Basic Operations Performance:');
      console.log(`Branch: ${branchMetrics.avgDuration.toFixed(2)}ms avg`);
      console.log(`Head: ${headMetrics.avgDuration.toFixed(2)}ms avg`);
      console.log(`RepoRoot: ${repoRootMetrics.avgDuration.toFixed(2)}ms avg`);
      console.log(`Status: ${statusMetrics.avgDuration.toFixed(2)}ms avg`);
    });
  });

  it('measures write operations performance', async () => {
    await withGitVan({ cwd: testRepo }, async () => {
      let fileCounter = 0;

      // Measure add operation
      const addMetrics = await measureOperation('add', async () => {
        const filename = `add-test-${fileCounter++}.txt`;
        writeFileSync(join(testRepo, filename), 'Add test content');
        await git.add(filename);
      }, 5);

      // Measure commit operation
      fileCounter = 0;
      const commitMetrics = await measureOperation('commit', async () => {
        const filename = `commit-test-${fileCounter++}.txt`;
        writeFileSync(join(testRepo, filename), 'Commit test content');
        await git.add(filename);
        await git.commit(`Test commit ${fileCounter}`);
      }, 5);

      expect(addMetrics.avgDuration).toBeLessThan(200);
      expect(commitMetrics.avgDuration).toBeLessThan(500);

      console.log('Write Operations Performance:');
      console.log(`Add: ${addMetrics.avgDuration.toFixed(2)}ms avg`);
      console.log(`Commit: ${commitMetrics.avgDuration.toFixed(2)}ms avg`);
    });
  });

  it('measures concurrent operation performance', async () => {
    await withGitVan({ cwd: testRepo }, async () => {
      // Create some content
      writeFileSync(join(testRepo, 'concurrent-test.txt'), 'Concurrent test');
      await git.add('concurrent-test.txt');
      await git.commit('Concurrent test commit');

      // Sequential execution
      const sequentialStart = performance.now();
      await git.branch();
      await git.head();
      await git.statusPorcelain();
      await git.repoRoot();
      const sequentialEnd = performance.now();
      const sequentialTime = sequentialEnd - sequentialStart;

      // Concurrent execution
      const concurrentStart = performance.now();
      await Promise.all([
        git.branch(),
        git.head(),
        git.statusPorcelain(),
        git.repoRoot()
      ]);
      const concurrentEnd = performance.now();
      const concurrentTime = concurrentEnd - concurrentStart;

      const speedup = sequentialTime / concurrentTime;

      performanceMetrics.benchmarks.push({
        operation: 'concurrency_comparison',
        sequentialTime,
        concurrentTime,
        speedup
      });

      console.log('Concurrency Performance:');
      console.log(`Sequential: ${sequentialTime.toFixed(2)}ms`);
      console.log(`Concurrent: ${concurrentTime.toFixed(2)}ms`);
      console.log(`Speedup: ${speedup.toFixed(2)}x`);

      expect(speedup).toBeGreaterThan(1.2); // Should be at least 20% faster
    });
  });

  it('measures memory usage patterns', async () => {
    await withGitVan({ cwd: testRepo }, async () => {
      const initialMemory = process.memoryUsage();

      // Create moderate sized repository
      for (let i = 0; i < 20; i++) {
        writeFileSync(join(testRepo, `file-${i}.txt`), 'Content '.repeat(100));
        await git.add(`file-${i}.txt`);
        await git.commit(`Commit ${i}`);
      }

      // Perform memory-intensive operations
      const memBefore = process.memoryUsage();
      await git.log();
      await git.statusPorcelain();
      await git.revList(['--max-count=50']);
      const memAfter = process.memoryUsage();

      const memoryUsage = {
        operation: 'memory_usage_analysis',
        initialHeap: initialMemory.heapUsed,
        finalHeap: memAfter.heapUsed,
        peakDelta: memAfter.heapUsed - memBefore.heapUsed,
        rssGrowth: memAfter.rss - initialMemory.rss
      };

      performanceMetrics.benchmarks.push(memoryUsage);

      console.log('Memory Usage Analysis:');
      console.log(`Peak Delta: ${(memoryUsage.peakDelta / 1024 / 1024).toFixed(2)}MB`);
      console.log(`RSS Growth: ${(memoryUsage.rssGrowth / 1024 / 1024).toFixed(2)}MB`);

      // Memory usage should be reasonable
      expect(memoryUsage.peakDelta).toBeLessThan(50 * 1024 * 1024); // 50MB
    });
  });

  it('analyzes execFile overhead patterns', async () => {
    await withGitVan({ cwd: testRepo }, async () => {
      // Create test content
      writeFileSync(join(testRepo, 'execfile-test.txt'), 'ExecFile test');
      await git.add('execfile-test.txt');
      await git.commit('ExecFile test commit');

      // Measure various git commands to identify patterns
      const commands = [
        { name: 'simple_rev_parse', operation: () => git.head() },
        { name: 'branch_check', operation: () => git.branch() },
        { name: 'status_check', operation: () => git.statusPorcelain() },
        { name: 'log_retrieval', operation: () => git.log() }
      ];

      const commandAnalysis = [];

      for (const { name, operation } of commands) {
        const metrics = await measureOperation(name, operation, 5);
        commandAnalysis.push({
          command: name,
          avgDuration: metrics.avgDuration,
          throughput: metrics.throughput,
          memoryImpact: metrics.avgMemoryDelta
        });
      }

      performanceMetrics.benchmarks.push({
        operation: 'execfile_overhead_analysis',
        commands: commandAnalysis
      });

      console.log('ExecFile Overhead Analysis:');
      commandAnalysis.forEach(cmd => {
        console.log(`${cmd.command}: ${cmd.avgDuration.toFixed(2)}ms, ${cmd.throughput.toFixed(1)} ops/sec`);
      });

      // All commands should be reasonably fast
      commandAnalysis.forEach(cmd => {
        expect(cmd.avgDuration).toBeLessThan(150);
      });
    });
  });

  it('generates performance bottleneck report', async () => {
    // Analyze all collected metrics
    const report = {
      ...performanceMetrics,
      analysis: {
        totalOperations: performanceMetrics.benchmarks.length,
        slowestOperations: performanceMetrics.benchmarks
          .filter(b => b.avgDuration && b.avgDuration > 100)
          .sort((a, b) => (b.avgDuration || 0) - (a.avgDuration || 0)),
        memoryHeaviestOperations: performanceMetrics.benchmarks
          .filter(b => b.avgMemoryDelta && Math.abs(b.avgMemoryDelta) > 1024 * 1024)
          .sort((a, b) => Math.abs(b.avgMemoryDelta || 0) - Math.abs(a.avgMemoryDelta || 0)),
        overallPerformance: {
          avgDuration: performanceMetrics.benchmarks
            .filter(b => b.avgDuration)
            .reduce((sum, b) => sum + b.avgDuration, 0) /
            performanceMetrics.benchmarks.filter(b => b.avgDuration).length,
          totalMemoryUsed: performanceMetrics.benchmarks
            .filter(b => b.avgMemoryDelta)
            .reduce((sum, b) => sum + Math.abs(b.avgMemoryDelta), 0)
        }
      },
      recommendations: [],
      bottlenecks: []
    };

    // Generate recommendations
    if (report.analysis.overallPerformance.avgDuration > 100) {
      report.recommendations.push('Consider implementing caching for frequently used git operations');
      report.bottlenecks.push('High average execution time detected');
    }

    if (report.analysis.overallPerformance.totalMemoryUsed > 100 * 1024 * 1024) {
      report.recommendations.push('Optimize memory usage for large repository operations');
      report.bottlenecks.push('High memory usage detected');
    }

    if (report.analysis.slowestOperations.length > 0) {
      const slowOps = report.analysis.slowestOperations.slice(0, 3).map(op => op.operation).join(', ');
      report.recommendations.push(`Focus optimization efforts on: ${slowOps}`);
    }

    // Check for concurrency benefits
    const concurrencyTest = performanceMetrics.benchmarks.find(b => b.operation === 'concurrency_comparison');
    if (concurrencyTest && concurrencyTest.speedup > 2) {
      report.recommendations.push('Leverage concurrent operations where possible for better performance');
    }

    console.log('\n=== PERFORMANCE BOTTLENECK ANALYSIS REPORT ===');
    console.log(JSON.stringify(report, null, 2));

    expect(report.analysis.totalOperations).toBeGreaterThan(0);
    expect(report.recommendations.length).toBeGreaterThan(0);

    return report;
  });
});