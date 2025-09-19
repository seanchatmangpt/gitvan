// tests/git-native-io-integration.test.mjs
// Test Git-Native I/O Layer integration with Knowledge Hooks

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { HookOrchestrator } from "../src/hooks/HookOrchestrator.mjs";
import { GitNativeIO } from "../src/git-native/git-native-io.mjs";
import { withGitVan } from "../src/core/context.mjs";

describe("Git-Native I/O Integration", () => {
  let testDir;
  let orchestrator;
  let gitNativeIO;

  beforeEach(async () => {
    testDir = join(process.cwd(), "test-git-native-io-integration");
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, "hooks"), { recursive: true });
    mkdirSync(join(testDir, "logs"), { recursive: true });

    execSync("git init", { cwd: testDir, stdio: "inherit" });
    execSync('git config user.name "Git Native IO Test"', {
      cwd: testDir,
      stdio: "inherit",
    });
    execSync('git config user.email "gitnative@test.com"', {
      cwd: testDir,
      stdio: "inherit",
    });

    // Create gitvan config
    writeFileSync(
      join(testDir, "gitvan.config.js"),
      `
export default {
  hooks: {
    dirs: ["hooks"],
    autoEvaluate: false,
  },
  graph: {
    dirs: ["hooks"],
    format: "turtle",
    autoCommit: true,
  },
  workflows: {
    dirs: ["workflows"],
    autoExecute: true,
    timeout: 500,
  },
};
`
    );

    await withGitVan({ cwd: testDir }, async () => {
      orchestrator = new HookOrchestrator({
        graphDir: join(testDir, "hooks"),
        cwd: testDir,
        logger: console,
        timeoutMs: 5000,
        gitNativeIO: {
          queue: {
            concurrency: 4, // Lower for testing
            interval: 10,
            intervalCap: 2,
          },
          workers: {
            threads: 2, // Lower for testing
            maxJobs: 10,
            timeout: 30_000,
          },
        },
      });

      gitNativeIO = orchestrator.gitNativeIO;
    });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should initialize Git-Native I/O components", async () => {
    console.log("🔧 Testing Git-Native I/O initialization...");

    expect(gitNativeIO).toBeDefined();
    expect(gitNativeIO.queueManager).toBeDefined();
    expect(gitNativeIO.lockManager).toBeDefined();
    expect(gitNativeIO.receiptWriter).toBeDefined();
    expect(gitNativeIO.snapshotStore).toBeDefined();

    // Check status
    const status = await gitNativeIO.getStatus();
    expect(status.queue).toBeDefined();
    expect(status.workers).toBeDefined();
    expect(status.workers.total).toBe(2); // As configured in test

    console.log("✅ Git-Native I/O components initialized successfully");
  });

  it("should execute hooks with Git-Native I/O Layer", async () => {
    console.log("🧠 Testing Knowledge Hook execution with Git-Native I/O...");

    // Create a simple hook
    writeFileSync(
      join(testDir, "hooks/simple-hook.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:simple-hook rdf:type gh:Hook ;
    gv:title "Simple Git-Native Hook" ;
    gh:hasPredicate ex:simple-predicate ;
    gh:orderedPipelines ex:simple-pipeline .

ex:simple-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?item rdf:type gv:SimpleItem .
            ?item gv:active true .
        }
    """ ;
    gh:description "Always true predicate for Git-Native testing" .

ex:simple-pipeline rdf:type op:Pipeline ;
    op:steps ex:simple-step .

ex:simple-step rdf:type gv:TemplateStep ;
    gv:text "Git-Native hook triggered at {{ timestamp }}" ;
    gv:filePath "./logs/git-native-test.log" .
`
    );

    // Create knowledge graph data
    writeFileSync(
      join(testDir, "hooks/simple-data.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:test-item rdf:type gv:SimpleItem ;
    gv:name "Test Item" ;
    gv:active true .
`
    );

    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "Git-Native I/O test setup"', {
      cwd: testDir,
      stdio: "inherit",
    });

    const result = await withGitVan({ cwd: testDir }, async () => {
      return await orchestrator.evaluate({ verbose: true });
    });

    console.log("📊 Evaluation result:", result);

    expect(result.hooksTriggered).toBeGreaterThan(0);
    expect(result.success).toBe(true);
    expect(result.executions).toBeDefined();
    expect(result.executions.length).toBeGreaterThan(0);

    // Check Git-Native I/O status
    const status = await gitNativeIO.getStatus();
    expect(status.receipts.totalReceipts).toBeGreaterThan(0);
    expect(status.snapshots.entries).toBeGreaterThan(0);

    console.log("✅ Git-Native I/O integration working successfully");
  });

  it("should handle concurrent hook executions", async () => {
    console.log("⚡ Testing concurrent hook executions...");

    // Create multiple hooks
    for (let i = 1; i <= 3; i++) {
      writeFileSync(
        join(testDir, `hooks/concurrent-hook-${i}.ttl`),
        `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:concurrent-hook-${i} rdf:type gh:Hook ;
    gv:title "Concurrent Hook ${i}" ;
    gh:hasPredicate ex:concurrent-predicate-${i} ;
    gh:orderedPipelines ex:concurrent-pipeline-${i} .

ex:concurrent-predicate-${i} rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?item rdf:type gv:ConcurrentItem${i} .
            ?item gv:active true .
        }
    """ ;
    gh:description "Concurrent predicate ${i}" .

ex:concurrent-pipeline-${i} rdf:type op:Pipeline ;
    op:steps ex:concurrent-step-${i} .

ex:concurrent-step-${i} rdf:type gv:TemplateStep ;
    gv:text "Concurrent hook ${i} triggered at {{ timestamp }}" ;
    gv:filePath "./logs/concurrent-${i}.log" .
`
      );
    }

    // Create knowledge graph data for all hooks
    writeFileSync(
      join(testDir, "hooks/concurrent-data.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:concurrent-item-1 rdf:type gv:ConcurrentItem1 ;
    gv:name "Concurrent Item 1" ;
    gv:active true .

ex:concurrent-item-2 rdf:type gv:ConcurrentItem2 ;
    gv:name "Concurrent Item 2" ;
    gv:active true .

ex:concurrent-item-3 rdf:type gv:ConcurrentItem3 ;
    gv:name "Concurrent Item 3" ;
    gv:active true .
`
    );

    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "Concurrent hooks test setup"', {
      cwd: testDir,
      stdio: "inherit",
    });

    const startTime = Date.now();

    const result = await withGitVan({ cwd: testDir }, async () => {
      return await orchestrator.evaluate({ verbose: true });
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`📊 Concurrent execution result (${duration}ms):`, result);

    expect(result.hooksTriggered).toBe(3);
    expect(result.success).toBe(true);
    expect(result.executions.length).toBe(3);

    // Check that all executions were successful
    const successfulExecutions = result.executions.filter(
      (exec) => exec.success
    );
    expect(successfulExecutions.length).toBe(3);

    // Check Git-Native I/O status
    const status = await gitNativeIO.getStatus();
    expect(status.receipts.totalReceipts).toBeGreaterThanOrEqual(3);
    expect(status.snapshots.entries).toBeGreaterThanOrEqual(3);

    console.log("✅ Concurrent hook executions completed successfully");
  });

  it("should handle lock management", async () => {
    console.log("🔒 Testing lock management...");

    // Test lock acquisition
    const lockAcquired = await gitNativeIO.acquireLock("test-lock", {
      timeout: 5000,
      exclusive: true,
    });

    expect(lockAcquired).toBe(true);

    // Test lock status
    const isLocked = await gitNativeIO.isLocked("test-lock");
    expect(isLocked).toBe(true);

    // Test lock info
    const lockInfo = await gitNativeIO.getLockInfo("test-lock");
    expect(lockInfo).toBeDefined();
    expect(lockInfo.id).toBeDefined();

    // Test lock release
    const lockReleased = await gitNativeIO.releaseLock("test-lock");
    expect(lockReleased).toBe(true);

    // Test lock is no longer held
    const isStillLocked = await gitNativeIO.isLocked("test-lock");
    expect(isStillLocked).toBe(false);

    console.log("✅ Lock management working correctly");
  });

  it("should handle snapshot storage", async () => {
    console.log("📸 Testing snapshot storage...");

    const testData = {
      message: "Test snapshot data",
      timestamp: Date.now(),
      items: [1, 2, 3, 4, 5],
    };

    const metadata = {
      test: true,
      version: "1.0",
    };

    // Store snapshot
    const contentHash = await gitNativeIO.storeSnapshot(
      "test-snapshot",
      testData,
      metadata
    );
    expect(contentHash).toBeDefined();

    // Retrieve snapshot
    const retrievedData = await gitNativeIO.getSnapshot(
      "test-snapshot",
      contentHash
    );
    expect(retrievedData).toEqual(testData);

    // Check snapshot exists
    const hasSnapshot = await gitNativeIO.hasSnapshot(
      "test-snapshot",
      contentHash
    );
    expect(hasSnapshot).toBe(true);

    // List snapshots
    const snapshots = await gitNativeIO.listSnapshots();
    expect(snapshots.length).toBeGreaterThan(0);
    expect(snapshots.some((s) => s.key === "test-snapshot")).toBe(true);

    console.log("✅ Snapshot storage working correctly");
  });

  it("should handle receipt writing", async () => {
    console.log("📝 Testing receipt writing...");

    const hookId = "test-hook";
    const result = {
      success: true,
      duration: 1000,
      stepsExecuted: 3,
    };

    const metadata = {
      test: true,
      timestamp: Date.now(),
    };

    // Write receipt
    await gitNativeIO.writeReceipt(hookId, result, metadata);

    // Write metrics
    await gitNativeIO.writeMetrics({
      hookId,
      duration: 1000,
      success: true,
    });

    // Write execution
    await gitNativeIO.writeExecution("test-execution", {
      hookId,
      startTime: Date.now(),
      endTime: Date.now() + 1000,
    });

    // Flush all receipts
    await gitNativeIO.flushAll();

    // Check statistics
    const stats = gitNativeIO.getStatistics();
    expect(stats.totalReceipts).toBeGreaterThan(0);
    expect(stats.totalMetrics).toBeGreaterThan(0);
    expect(stats.totalExecutions).toBeGreaterThan(0);

    console.log("✅ Receipt writing working correctly");
  });
});
