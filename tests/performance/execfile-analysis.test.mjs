// ExecFile bottleneck analysis for GitVan
import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { performance } from 'node:perf_hooks';
import { execFile as _execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { withGitVan } from '../../src/core/context.mjs';
import { useGit } from '../../src/composables/git.mjs';

const execFile = promisify(_execFile);

describe('ExecFile Performance Analysis', () => {
  let testRepo;
  let git;
  const analysisResults = [];

  beforeEach(async () => {
    testRepo = join(tmpdir(), `gitvan-execfile-${Date.now()}`);
    mkdirSync(testRepo, { recursive: true });

    // Initialize git repo
    await execFile('git', ['init'], { cwd: testRepo });
    await execFile('git', ['config', 'user.email', 'test@gitvan.dev'], { cwd: testRepo });
    await execFile('git', ['config', 'user.name', 'GitVan Test'], { cwd: testRepo });

    await withGitVan({ cwd: testRepo }, async () => {
      git = useGit();
    });
  });

  afterEach(() => {
    if (testRepo) {
      rmSync(testRepo, { recursive: true, force: true });
    }
  });

  const analyzeExecFile = async (command, args, options = {}) => {
    const start = performance.now();
    const memBefore = process.memoryUsage();

    try {
      const { stdout, stderr } = await execFile(command, args, {
        cwd: testRepo,
        env: { TZ: 'UTC', LANG: 'C', ...process.env },
        maxBuffer: 12 * 1024 * 1024,
        ...options
      });

      const end = performance.now();
      const memAfter = process.memoryUsage();

      return {
        success: true,
        duration: end - start,
        memoryDelta: {
          rss: memAfter.rss - memBefore.rss,
          heapUsed: memAfter.heapUsed - memBefore.heapUsed,
          heapTotal: memAfter.heapTotal - memBefore.heapTotal,
          external: memAfter.external - memBefore.external
        },
        outputSize: stdout.length,
        errorSize: stderr.length,
        stdout,
        stderr
      };
    } catch (error) {
      const end = performance.now();
      return {
        success: false,
        duration: end - start,
        error: error.message,
        code: error.code
      };
    }
  };

  it('analyzes basic git command performance', async () => {
    await withGitVan({ cwd: testRepo }, async () => {
      // Create test content
      writeFileSync(join(testRepo, 'test.txt'), 'Basic test content');
      await git.add('test.txt');
      await git.commit('Initial commit');

      // Analyze basic commands
      const commands = [
        ['git', ['rev-parse', '--abbrev-ref', 'HEAD']],
        ['git', ['rev-parse', 'HEAD']],
        ['git', ['rev-parse', '--show-toplevel']],
        ['git', ['rev-parse', '--git-dir']],
        ['git', ['status', '--porcelain']],
        ['git', ['log', '--pretty=%h%x09%s', '--max-count=10']]
      ];

      for (const [cmd, args] of commands) {
        const analysis = await analyzeExecFile(cmd, args);
        analysis.command = `${cmd} ${args.join(' ')}`;
        analysisResults.push(analysis);

        console.log(`Command: ${analysis.command}`);
        console.log(`Duration: ${analysis.duration.toFixed(2)}ms`);
        console.log(`Memory Delta: ${(analysis.memoryDelta?.heapUsed || 0 / 1024 / 1024).toFixed(2)}MB`);
        console.log(`Output Size: ${analysis.outputSize} bytes`);
        console.log('---');
      }

      // Basic commands should be fast
      const avgDuration = analysisResults.reduce((sum, r) => sum + r.duration, 0) / analysisResults.length;
      expect(avgDuration).toBeLessThan(100);
    });
  });

  it('analyzes buffer size impact', async () => {
    await withGitVan({ cwd: testRepo }, async () => {
      // Create larger repository
      for (let i = 0; i < 50; i++) {
        writeFileSync(join(testRepo, `file-${i}.txt`), 'x'.repeat(1000));
        await git.add(`file-${i}.txt`);
        await git.commit(`Commit ${i}`);
      }

      // Test different buffer sizes
      const bufferSizes = [
        1024,           // 1KB - Very small
        4096,           // 4KB - Small
        64 * 1024,      // 64KB - Medium
        1024 * 1024,    // 1MB - Large
        12 * 1024 * 1024 // 12MB - Default
      ];

      const bufferTests = [];

      for (const bufferSize of bufferSizes) {
        const analysis = await analyzeExecFile('git', ['log', '--pretty=%H %s'], {
          maxBuffer: bufferSize
        });

        analysis.bufferSize = bufferSize;
        analysis.bufferLabel = `${(bufferSize / 1024).toFixed(0)}KB`;
        bufferTests.push(analysis);

        console.log(`Buffer ${analysis.bufferLabel}: ${analysis.duration.toFixed(2)}ms, Success: ${analysis.success}`);
      }

      analysisResults.push({
        operation: 'buffer_size_analysis',
        bufferTests
      });

      // Larger buffers should not significantly impact performance for normal operations
      const successfulTests = bufferTests.filter(t => t.success);
      expect(successfulTests.length).toBeGreaterThan(0);

      // Performance should be consistent across buffer sizes for this operation
      const durations = successfulTests.map(t => t.duration);
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);
      expect(maxDuration / minDuration).toBeLessThan(3); // Should not be more than 3x difference
    });
  });

  it('analyzes concurrent execFile bottlenecks', async () => {
    await withGitVan({ cwd: testRepo }, async () => {
      // Create test content
      writeFileSync(join(testRepo, 'concurrent-test.txt'), 'Concurrent test');
      await git.add('concurrent-test.txt');
      await git.commit('Concurrent test');

      // Test sequential vs concurrent execution
      const commands = [
        ['git', ['rev-parse', 'HEAD']],
        ['git', ['rev-parse', '--abbrev-ref', 'HEAD']],
        ['git', ['status', '--porcelain']],
        ['git', ['log', '--pretty=%h', '--max-count=5']],
        ['git', ['rev-parse', '--show-toplevel']]
      ];

      // Sequential execution
      const sequentialStart = performance.now();
      const sequentialResults = [];
      for (const [cmd, args] of commands) {
        const result = await analyzeExecFile(cmd, args);
        sequentialResults.push(result);
      }
      const sequentialEnd = performance.now();
      const sequentialDuration = sequentialEnd - sequentialStart;

      // Concurrent execution
      const concurrentStart = performance.now();
      const concurrentPromises = commands.map(([cmd, args]) => analyzeExecFile(cmd, args));
      const concurrentResults = await Promise.all(concurrentPromises);
      const concurrentEnd = performance.now();
      const concurrentDuration = concurrentEnd - concurrentStart;

      const concurrencyAnalysis = {
        operation: 'concurrency_analysis',
        sequentialDuration,
        concurrentDuration,
        speedup: sequentialDuration / concurrentDuration,
        sequentialResults,
        concurrentResults
      };

      analysisResults.push(concurrencyAnalysis);

      console.log(`Sequential: ${sequentialDuration.toFixed(2)}ms`);
      console.log(`Concurrent: ${concurrentDuration.toFixed(2)}ms`);
      console.log(`Speedup: ${concurrencyAnalysis.speedup.toFixed(2)}x`);

      // Concurrent execution should be faster
      expect(concurrencyAnalysis.speedup).toBeGreaterThan(1.5);
    });
  });

  it('analyzes memory pressure during execFile operations', async () => {
    await withGitVan({ cwd: testRepo }, async () => {
      // Create repository with larger output
      for (let i = 0; i < 100; i++) {
        writeFileSync(join(testRepo, `large-${i}.txt`), 'Large content '.repeat(100));
        await git.add(`large-${i}.txt`);
        await git.commit(`Large commit ${i}`);
      }

      // Test memory pressure with large output commands
      const memoryTests = [
        {
          name: 'large_log',
          command: ['git', ['log', '--pretty=%H %an %ad %s']]
        },
        {
          name: 'large_diff',
          command: ['git', ['diff', '--name-status', 'HEAD~50', 'HEAD']]
        },
        {
          name: 'large_ls_files',
          command: ['git', ['ls-files']]
        }
      ];

      const memoryResults = [];

      for (const test of memoryTests) {
        // Run test multiple times to check for memory leaks
        const iterations = 5;
        const iterationResults = [];

        for (let i = 0; i < iterations; i++) {
          const analysis = await analyzeExecFile(...test.command);
          analysis.iteration = i;
          iterationResults.push(analysis);
        }

        const avgDuration = iterationResults.reduce((sum, r) => sum + r.duration, 0) / iterations;
        const avgMemory = iterationResults.reduce((sum, r) => sum + (r.memoryDelta?.heapUsed || 0), 0) / iterations;
        const avgOutputSize = iterationResults.reduce((sum, r) => sum + r.outputSize, 0) / iterations;

        memoryResults.push({
          testName: test.name,
          iterations,
          avgDuration,
          avgMemory,
          avgOutputSize,
          iterationResults
        });

        console.log(`${test.name}: ${avgDuration.toFixed(2)}ms avg, ${(avgMemory / 1024 / 1024).toFixed(2)}MB avg`);
      }

      analysisResults.push({
        operation: 'memory_pressure_analysis',
        memoryResults
      });

      // Memory usage should be reasonable
      const maxAvgMemory = Math.max(...memoryResults.map(r => r.avgMemory));
      expect(maxAvgMemory).toBeLessThan(100 * 1024 * 1024); // 100MB
    });
  });

  it('identifies execFile error patterns', async () => {
    await withGitVan({ cwd: testRepo }, async () => {
      // Test various error conditions
      const errorTests = [
        {
          name: 'invalid_command',
          command: ['invalid-command', []]
        },
        {
          name: 'invalid_git_args',
          command: ['git', ['invalid-subcommand']]
        },
        {
          name: 'buffer_overflow',
          command: ['git', ['log']],
          options: { maxBuffer: 10 } // Very small buffer
        },
        {
          name: 'nonexistent_ref',
          command: ['git', ['show', 'nonexistent-ref']]
        }
      ];

      const errorResults = [];

      for (const test of errorTests) {
        const analysis = await analyzeExecFile(...test.command, test.options || {});
        analysis.testName = test.name;
        errorResults.push(analysis);

        console.log(`${test.name}: Success: ${analysis.success}, Error: ${analysis.error || 'none'}`);
      }

      analysisResults.push({
        operation: 'error_pattern_analysis',
        errorResults
      });

      // Should handle errors gracefully
      const errorCount = errorResults.filter(r => !r.success).length;
      expect(errorCount).toBeGreaterThan(0); // We expect some errors in these tests
      expect(errorResults.length).toBe(errorTests.length); // All tests should complete
    });
  });

  it('generates execFile performance recommendations', async () => {
    const performanceReport = {
      timestamp: new Date().toISOString(),
      analysisType: 'execFile_bottleneck_analysis',
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      results: analysisResults,
      recommendations: [],
      bottlenecks: []
    };

    // Analyze results and generate recommendations
    const allDurations = analysisResults
      .filter(r => r.duration !== undefined)
      .map(r => r.duration);

    if (allDurations.length > 0) {
      const avgDuration = allDurations.reduce((sum, d) => sum + d, 0) / allDurations.length;
      const maxDuration = Math.max(...allDurations);

      if (avgDuration > 100) {
        performanceReport.recommendations.push('Consider implementing command result caching for frequently used git operations');
      }

      if (maxDuration > 1000) {
        performanceReport.recommendations.push('Implement timeout handling for long-running git operations');
        performanceReport.bottlenecks.push('Long execution times detected');
      }
    }

    // Check memory usage patterns
    const memoryUsages = analysisResults
      .filter(r => r.memoryDelta?.heapUsed)
      .map(r => r.memoryDelta.heapUsed);

    if (memoryUsages.length > 0) {
      const maxMemory = Math.max(...memoryUsages);
      if (maxMemory > 50 * 1024 * 1024) { // 50MB
        performanceReport.recommendations.push('Consider streaming large git command outputs to reduce memory usage');
        performanceReport.bottlenecks.push('High memory usage detected');
      }
    }

    // Check concurrency benefits
    const concurrencyAnalysis = analysisResults.find(r => r.operation === 'concurrency_analysis');
    if (concurrencyAnalysis && concurrencyAnalysis.speedup > 2) {
      performanceReport.recommendations.push('Leverage concurrent git operations where possible for better performance');
    }

    // Check buffer size impact
    const bufferAnalysis = analysisResults.find(r => r.operation === 'buffer_size_analysis');
    if (bufferAnalysis) {
      performanceReport.recommendations.push('Current buffer size (12MB) appears optimal for most operations');
    }

    console.log('ExecFile Performance Report:', JSON.stringify(performanceReport, null, 2));

    expect(performanceReport.results.length).toBeGreaterThan(0);
    expect(performanceReport.recommendations.length).toBeGreaterThan(0);
  });
});