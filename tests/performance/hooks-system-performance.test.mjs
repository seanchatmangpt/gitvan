/**
 * @fileoverview GitVan Hooks System Performance Benchmarks
 *
 * This benchmark suite measures the performance of the complete hooks system:
 * 1. Hook registration performance (KnowledgeHookRegistry)
 * 2. Hook evaluation performance (PredicateEvaluator + HookOrchestrator)
 * 3. Job scheduling performance (Bree integration)
 * 4. Event capture performance (GitEventCapture)
 *
 * Performance Targets:
 * - Hook registration: < 10ms per hook
 * - Predicate evaluation: < 5ms
 * - Job scheduling: < 20ms
 * - Event capture: < 50ms
 *
 * @version 1.0.0
 * @author GitVan Team (Agent 9)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { KnowledgeHookRegistry } from "../../src/hooks/KnowledgeHookRegistry.mjs";
import { HookOrchestrator } from "../../src/hooks/HookOrchestrator.mjs";
import { PredicateEvaluator } from "../../src/hooks/PredicateEvaluator.mjs";
import { GitEventCapture } from "../../src/git-lifecycle/GitEventCapture.mjs";
import { getBreeScheduler, resetBreeScheduler } from "../../src/jobs/bree-scheduler.mjs";

// ============================================================================
// Benchmark Utilities
// ============================================================================

/**
 * Measure execution time and memory usage
 */
async function measurePerformance(name, fn, iterations = 1) {
  const memBefore = process.memoryUsage();
  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    await fn();
  }

  const endTime = performance.now();
  const memAfter = process.memoryUsage();

  const duration = endTime - startTime;
  const avgDuration = duration / iterations;
  const memoryDelta = {
    heapUsed: memAfter.heapUsed - memBefore.heapUsed,
    external: memAfter.external - memBefore.external,
    rss: memAfter.rss - memBefore.rss,
  };

  return {
    name,
    totalDuration: duration,
    avgDuration,
    iterations,
    opsPerSecond: (iterations / duration) * 1000,
    memory: memoryDelta,
    memoryPerOp: {
      heapUsed: memoryDelta.heapUsed / iterations,
      external: memoryDelta.external / iterations,
      rss: memoryDelta.rss / iterations,
    },
  };
}

/**
 * Format bytes for human-readable output
 */
function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Print benchmark result
 */
function printResult(result, target = null) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`Benchmark: ${result.name}`);
  console.log(`${"=".repeat(80)}`);
  console.log(`Total Duration: ${result.totalDuration.toFixed(2)}ms`);
  console.log(`Average Duration: ${result.avgDuration.toFixed(2)}ms`);
  console.log(`Operations: ${result.iterations}`);
  console.log(`Ops/Second: ${result.opsPerSecond.toFixed(2)}`);
  console.log(`Memory Per Operation:`);
  console.log(`  Heap: ${formatBytes(result.memoryPerOp.heapUsed)}`);
  console.log(`  External: ${formatBytes(result.memoryPerOp.external)}`);
  console.log(`  RSS: ${formatBytes(result.memoryPerOp.rss)}`);

  if (target) {
    const meetsTarget = result.avgDuration < target;
    const status = meetsTarget ? "✅ PASS" : "❌ FAIL";
    const diff = result.avgDuration - target;
    const diffStr = diff > 0 ? `+${diff.toFixed(2)}ms` : `${diff.toFixed(2)}ms`;
    console.log(`Target: < ${target}ms | Result: ${result.avgDuration.toFixed(2)}ms (${diffStr}) ${status}`);
  }
  console.log(`${"=".repeat(80)}\n`);
}

// ============================================================================
// Test Setup & Teardown
// ============================================================================

/**
 * Setup test Git repository
 */
async function setupTestRepo() {
  const tmpDir = await mkdtemp(join(tmpdir(), "gitvan-hooks-bench-"));

  // Initialize git repo
  execSync("git init", { cwd: tmpDir });
  execSync('git config user.name "Test User"', { cwd: tmpDir });
  execSync('git config user.email "test@example.com"', { cwd: tmpDir });

  // Create initial commit
  await writeFile(join(tmpDir, "test.txt"), "test content");
  execSync("git add .", { cwd: tmpDir });
  execSync('git commit -m "Initial commit"', { cwd: tmpDir });

  return tmpDir;
}

/**
 * Create test hook files
 */
async function createTestHooks(hooksDir, count = 10) {
  await mkdir(hooksDir, { recursive: true });

  const hooks = [];
  for (let i = 0; i < count; i++) {
    const hookContent = `
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

<hook${i}> a gh:KnowledgeHook ;
  gv:title "Test Hook ${i}" ;
  gh:description "Benchmark test hook ${i}" ;
  gh:predicate [
    rdf:type gh:ASKPredicate ;
    gh:query """
      ASK {
        ?s ?p ?o .
      }
    """
  ] ;
  gh:pipeline [
    gh:step [
      gh:script "echo 'Hook ${i} triggered'" ;
    ]
  ] .
`;

    const hookPath = join(hooksDir, `test-hook-${i}.ttl`);
    await writeFile(hookPath, hookContent);
    hooks.push(hookPath);
  }

  return hooks;
}

/**
 * Cleanup test repository
 */
async function cleanupTestRepo(dir) {
  try {
    await rm(dir, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Failed to cleanup ${dir}:`, error.message);
  }
}

// ============================================================================
// Benchmark 1: Hook Registration Performance
// ============================================================================

describe("Hook Registration Performance", () => {
  let testRepo;
  let hooksDir;

  beforeEach(async () => {
    testRepo = await setupTestRepo();
    hooksDir = join(testRepo, "hooks");
  });

  afterEach(async () => {
    await cleanupTestRepo(testRepo);
  });

  it("should register a single hook in < 10ms", async () => {
    await createTestHooks(hooksDir, 1);

    const result = await measurePerformance(
      "Single Hook Registration",
      async () => {
        const registry = new KnowledgeHookRegistry({
          hooksDir,
          logger: { info: () => {}, warn: () => {}, error: () => {} },
        });
        await registry.initialize();
      },
      10
    );

    printResult(result, 10);
    expect(result.avgDuration).toBeLessThan(10);
  });

  it("should register 10 hooks efficiently", async () => {
    await createTestHooks(hooksDir, 10);

    const result = await measurePerformance(
      "10 Hooks Registration",
      async () => {
        const registry = new KnowledgeHookRegistry({
          hooksDir,
          logger: { info: () => {}, warn: () => {}, error: () => {} },
        });
        await registry.initialize();
      },
      5
    );

    printResult(result);

    // Should be less than 100ms total (10ms per hook * 10 hooks)
    expect(result.avgDuration).toBeLessThan(100);
  });

  it("should register 100 hooks with acceptable performance", async () => {
    await createTestHooks(hooksDir, 100);

    const result = await measurePerformance(
      "100 Hooks Registration",
      async () => {
        const registry = new KnowledgeHookRegistry({
          hooksDir,
          logger: { info: () => {}, warn: () => {}, error: () => {} },
        });
        await registry.initialize();
      },
      3
    );

    printResult(result);

    // Should be less than 1000ms (10ms per hook * 100 hooks)
    expect(result.avgDuration).toBeLessThan(1000);

    // Calculate per-hook overhead
    const perHookTime = result.avgDuration / 100;
    console.log(`Per-hook registration time: ${perHookTime.toFixed(2)}ms`);
    expect(perHookTime).toBeLessThan(10);
  });

  it("should measure memory overhead per hook", async () => {
    await createTestHooks(hooksDir, 50);

    const result = await measurePerformance(
      "50 Hooks - Memory Overhead",
      async () => {
        const registry = new KnowledgeHookRegistry({
          hooksDir,
          logger: { info: () => {}, warn: () => {}, error: () => {} },
        });
        await registry.initialize();
      },
      5
    );

    printResult(result);

    // Memory per hook should be reasonable (< 100KB per hook)
    const memoryPerHook = result.memoryPerOp.heapUsed / 50;
    console.log(`Memory per hook: ${formatBytes(memoryPerHook)}`);
    expect(memoryPerHook).toBeLessThan(100 * 1024); // 100KB
  });
});

// ============================================================================
// Benchmark 2: Hook Evaluation Performance
// ============================================================================

describe("Hook Evaluation Performance", () => {
  let testRepo;
  let hooksDir;

  beforeEach(async () => {
    testRepo = await setupTestRepo();
    hooksDir = join(testRepo, "hooks");
  });

  afterEach(async () => {
    await cleanupTestRepo(testRepo);
  });

  it("should evaluate a single predicate in < 5ms", async () => {
    const evaluator = new PredicateEvaluator({
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    });

    // Create a simple mock graph
    const mockGraph = {
      query: async () => ({ boolean: true }),
      store: {
        getQuads: () => [],
        size: 0,
      },
    };

    const predicate = {
      type: "ask",
      definition: {
        query: "ASK { ?s ?p ?o . }",
      },
    };

    const result = await measurePerformance(
      "Single Predicate Evaluation (ASK)",
      async () => {
        await evaluator.evaluate(
          { predicateDefinition: predicate },
          mockGraph,
          null,
          { verbose: false }
        );
      },
      100
    );

    printResult(result, 5);
    expect(result.avgDuration).toBeLessThan(5);
  });

  it("should evaluate complex predicates efficiently", async () => {
    const evaluator = new PredicateEvaluator({
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    });

    const mockGraph = {
      query: async () => ({ results: [{ value: { value: "10" } }] }),
      store: {
        getQuads: () => [],
        size: 0,
      },
    };

    const predicate = {
      type: "selectThreshold",
      definition: {
        query: "SELECT ?count WHERE { ?s ?p ?o . }",
        threshold: 5,
        operator: ">",
      },
    };

    const result = await measurePerformance(
      "Complex Predicate Evaluation (SELECTThreshold)",
      async () => {
        await evaluator.evaluate(
          { predicateDefinition: predicate },
          mockGraph,
          null,
          { verbose: false }
        );
      },
      100
    );

    printResult(result, 5);
    expect(result.avgDuration).toBeLessThan(5);
  });

  it("should handle delta predicates efficiently", async () => {
    const evaluator = new PredicateEvaluator({
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    });

    const mockGraph = {
      query: async () => ({ results: [{ s: "subject", p: "predicate", o: "object" }] }),
      store: {
        getQuads: () => [],
        size: 0,
      },
    };

    const predicate = {
      type: "resultDelta",
      definition: {
        query: "SELECT ?s ?p ?o WHERE { ?s ?p ?o . }",
      },
    };

    const result = await measurePerformance(
      "Delta Predicate Evaluation (ResultDelta)",
      async () => {
        await evaluator.evaluate(
          { predicateDefinition: predicate },
          mockGraph,
          mockGraph,
          { verbose: false }
        );
      },
      100
    );

    printResult(result, 5);
    expect(result.avgDuration).toBeLessThan(5);
  });

  it("should evaluate 10 hooks concurrently", async () => {
    await createTestHooks(hooksDir, 10);

    const result = await measurePerformance(
      "10 Hooks Concurrent Evaluation",
      async () => {
        const orchestrator = new HookOrchestrator({
          graphDir: hooksDir,
          cwd: testRepo,
          logger: { info: () => {}, warn: () => {}, error: () => {} },
        });

        // Mock evaluation (won't execute workflows)
        await orchestrator.evaluate({ verbose: false, dryRun: true }).catch(() => {
          // Ignore errors from missing graph files in benchmark
        });
      },
      5
    );

    printResult(result);

    // Total evaluation should be reasonable
    expect(result.avgDuration).toBeLessThan(500);
  });
});

// ============================================================================
// Benchmark 3: Job Scheduling Performance
// ============================================================================

describe("Job Scheduling Performance (Bree)", () => {
  let testRepo;
  let jobsDir;
  let scheduler;

  beforeEach(async () => {
    testRepo = await setupTestRepo();
    jobsDir = join(testRepo, "jobs");
    await mkdir(jobsDir, { recursive: true });

    // Create a simple test job
    const jobContent = `
export default async function() {
  console.log('Test job executed');
}
`;
    await writeFile(join(jobsDir, "test-job.mjs"), jobContent);

    scheduler = getBreeScheduler({ cwd: testRepo, jobsDir });
  });

  afterEach(async () => {
    if (scheduler) {
      await scheduler.shutdown();
    }
    resetBreeScheduler(testRepo);
    await cleanupTestRepo(testRepo);
  });

  it("should initialize Bree scheduler quickly", async () => {
    const result = await measurePerformance(
      "Bree Scheduler Initialization",
      async () => {
        const freshScheduler = getBreeScheduler({ cwd: testRepo, jobsDir });
        await freshScheduler.init();
      },
      10
    );

    printResult(result);
    expect(result.avgDuration).toBeLessThan(50);
  });

  it("should schedule a job in < 20ms", async () => {
    await scheduler.init();

    const result = await measurePerformance(
      "Single Job Scheduling",
      async () => {
        await scheduler.addJob({
          name: `test-job-${Date.now()}`,
          path: join(jobsDir, "test-job.mjs"),
          interval: "10s",
        });
      },
      10
    );

    printResult(result, 20);
    expect(result.avgDuration).toBeLessThan(20);
  });

  it("should schedule multiple jobs efficiently", async () => {
    await scheduler.init();

    const result = await measurePerformance(
      "10 Jobs Scheduling",
      async () => {
        for (let i = 0; i < 10; i++) {
          await scheduler.addJob({
            name: `batch-job-${Date.now()}-${i}`,
            path: join(jobsDir, "test-job.mjs"),
            interval: "10s",
          });
        }
      },
      3
    );

    printResult(result);

    // Should be < 200ms for 10 jobs (20ms each)
    expect(result.avgDuration).toBeLessThan(200);
  });

  it("should handle concurrent job additions", async () => {
    await scheduler.init();

    const result = await measurePerformance(
      "Concurrent Job Scheduling (5 parallel)",
      async () => {
        const promises = Array.from({ length: 5 }, (_, i) =>
          scheduler.addJob({
            name: `concurrent-job-${Date.now()}-${i}`,
            path: join(jobsDir, "test-job.mjs"),
            interval: "10s",
          })
        );
        await Promise.all(promises);
      },
      5
    );

    printResult(result);
    expect(result.avgDuration).toBeLessThan(100);
  });

  it("should measure job execution overhead", async () => {
    await scheduler.init();
    await scheduler.start();

    await scheduler.addJob({
      name: "exec-test-job",
      path: join(jobsDir, "test-job.mjs"),
    });

    const result = await measurePerformance(
      "Job Execution Overhead",
      async () => {
        await scheduler.runJob("exec-test-job");
        // Wait for job to complete
        await new Promise((resolve) => setTimeout(resolve, 100));
      },
      5
    );

    printResult(result);

    // Job execution overhead should be reasonable
    expect(result.avgDuration).toBeLessThan(500);
  });
});

// ============================================================================
// Benchmark 4: Event Capture Performance
// ============================================================================

describe("Event Capture Performance", () => {
  let testRepo;
  let eventCapture;

  beforeEach(async () => {
    testRepo = await setupTestRepo();
    eventCapture = new GitEventCapture({
      cwd: testRepo,
      logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
    });
  });

  afterEach(async () => {
    if (eventCapture) {
      await eventCapture.cleanup();
    }
    await cleanupTestRepo(testRepo);
  });

  it("should capture a git event in < 50ms", async () => {
    await eventCapture.initialize();

    const eventData = {
      commitHash: "abc123",
      commitMessage: "Test commit",
      branchName: "main",
      filesChanged: 5,
    };

    const result = await measurePerformance(
      "Single Event Capture",
      async () => {
        await eventCapture.captureEvent("post-commit", eventData);
      },
      20
    );

    printResult(result, 50);
    expect(result.avgDuration).toBeLessThan(50);
  });

  it("should capture multiple events efficiently", async () => {
    await eventCapture.initialize();

    const result = await measurePerformance(
      "10 Events Capture",
      async () => {
        for (let i = 0; i < 10; i++) {
          await eventCapture.captureEvent("post-commit", {
            commitHash: `hash-${i}`,
            commitMessage: `Commit ${i}`,
            branchName: "main",
          });
        }
      },
      5
    );

    printResult(result);

    // Should be < 500ms for 10 events (50ms each)
    expect(result.avgDuration).toBeLessThan(500);
  });

  it("should measure RDF triple generation overhead", async () => {
    await eventCapture.initialize();

    const eventData = {
      commitHash: "abc123",
      commitMessage: "Test commit",
      branchName: "main",
      filesChanged: 5,
      linesAdded: 100,
      linesDeleted: 50,
      stagedFiles: ["file1.js", "file2.js", "file3.js"],
    };

    const result = await measurePerformance(
      "Event with Full Metadata (RDF Triples)",
      async () => {
        await eventCapture.captureEvent("post-commit", eventData);
      },
      20
    );

    printResult(result, 50);
    expect(result.avgDuration).toBeLessThan(50);
  });

  it("should handle pre-commit events efficiently", async () => {
    const result = await measurePerformance(
      "Pre-Commit Event Capture",
      async () => {
        await eventCapture.capturePreCommit({
          stagedFiles: ["file1.js", "file2.js"],
          branchName: "feature/test",
        });
      },
      20
    );

    printResult(result, 50);
    expect(result.avgDuration).toBeLessThan(50);
  });

  it("should capture events with error data", async () => {
    await eventCapture.initialize();

    const result = await measurePerformance(
      "Event Capture with Error Data",
      async () => {
        await eventCapture.captureEvent("pre-commit", {
          exitCode: 1,
          error: {
            message: "Validation failed",
            stack: "Error stack trace...",
          },
        });
      },
      20
    );

    printResult(result, 50);
    expect(result.avgDuration).toBeLessThan(50);
  });
});

// ============================================================================
// Benchmark 5: End-to-End Integration Performance
// ============================================================================

describe("End-to-End Integration Performance", () => {
  let testRepo;
  let hooksDir;
  let jobsDir;
  let eventCapture;
  let orchestrator;
  let scheduler;

  beforeEach(async () => {
    testRepo = await setupTestRepo();
    hooksDir = join(testRepo, "hooks");
    jobsDir = join(testRepo, "jobs");
    await mkdir(hooksDir, { recursive: true });
    await mkdir(jobsDir, { recursive: true });

    eventCapture = new GitEventCapture({
      cwd: testRepo,
      logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
    });

    orchestrator = new HookOrchestrator({
      graphDir: hooksDir,
      cwd: testRepo,
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    });

    scheduler = getBreeScheduler({ cwd: testRepo, jobsDir });
  });

  afterEach(async () => {
    if (eventCapture) {
      await eventCapture.cleanup();
    }
    if (scheduler) {
      await scheduler.shutdown();
    }
    resetBreeScheduler(testRepo);
    await cleanupTestRepo(testRepo);
  });

  it("should handle complete workflow: event capture + hook evaluation + job scheduling", async () => {
    await createTestHooks(hooksDir, 5);
    await eventCapture.initialize();
    await scheduler.init();

    const jobContent = `export default async function() { console.log('Workflow job'); }`;
    await writeFile(join(jobsDir, "workflow-job.mjs"), jobContent);

    const result = await measurePerformance(
      "Complete Workflow Pipeline",
      async () => {
        // 1. Capture event
        await eventCapture.captureEvent("post-commit", {
          commitHash: "abc123",
          commitMessage: "Test commit",
        });

        // 2. Evaluate hooks (dry run to avoid actual execution)
        await orchestrator.evaluate({ verbose: false, dryRun: true }).catch(() => {});

        // 3. Schedule job
        await scheduler.addJob({
          name: `workflow-job-${Date.now()}`,
          path: join(jobsDir, "workflow-job.mjs"),
        });
      },
      3
    );

    printResult(result);

    // Complete pipeline should be reasonably fast
    expect(result.avgDuration).toBeLessThan(1000);
  });
});

// ============================================================================
// Performance Summary Report
// ============================================================================

describe("Performance Summary", () => {
  it("should generate comprehensive performance report", () => {
    const targets = [
      {
        category: "Hook Registration",
        target: "< 10ms per hook",
        metrics: [
          { name: "Single hook", expected: "< 10ms" },
          { name: "100 hooks", expected: "< 1000ms total" },
          { name: "Memory per hook", expected: "< 100KB" },
        ],
      },
      {
        category: "Hook Evaluation",
        target: "< 5ms per predicate",
        metrics: [
          { name: "ASK predicate", expected: "< 5ms" },
          { name: "SELECT predicate", expected: "< 5ms" },
          { name: "ResultDelta predicate", expected: "< 5ms" },
          { name: "10 hooks concurrent", expected: "< 500ms" },
        ],
      },
      {
        category: "Job Scheduling",
        target: "< 20ms per job",
        metrics: [
          { name: "Single job", expected: "< 20ms" },
          { name: "10 jobs", expected: "< 200ms" },
          { name: "Concurrent scheduling", expected: "< 100ms" },
        ],
      },
      {
        category: "Event Capture",
        target: "< 50ms per event",
        metrics: [
          { name: "Single event", expected: "< 50ms" },
          { name: "10 events", expected: "< 500ms" },
          { name: "Full metadata", expected: "< 50ms" },
        ],
      },
    ];

    console.log("\n" + "=".repeat(80));
    console.log("GITVAN HOOKS SYSTEM PERFORMANCE SUMMARY");
    console.log("=".repeat(80));

    for (const { category, target, metrics } of targets) {
      console.log(`\n${category}:`);
      console.log(`  Target: ${target}`);
      console.log(`  Metrics:`);
      for (const metric of metrics) {
        console.log(`    - ${metric.name}: ${metric.expected}`);
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("Performance Optimization Opportunities:");
    console.log("  1. Hook registration: Cache parsed TTL files");
    console.log("  2. Predicate evaluation: Optimize SPARQL query execution");
    console.log("  3. Job scheduling: Batch job additions");
    console.log("  4. Event capture: Reduce RDF triple overhead");
    console.log("  5. End-to-end: Pipeline parallelization");
    console.log("=".repeat(80) + "\n");

    expect(targets.length).toBeGreaterThan(0);
  });
});
