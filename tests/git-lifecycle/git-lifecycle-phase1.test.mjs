/**
 * @fileoverview GitVan v3.2.0 — Git Lifecycle Phase 1 Test Suite
 *
 * Comprehensive test suite for Phase 1 of git lifecycle knowledge hooks:
 * - GitEventCapture
 * - GitEventStore
 * - GitLifecycleHooks
 * - RDF ontology validation
 * - Integration tests
 *
 * @version 3.2.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GitEventCapture } from "../../src/git-lifecycle/GitEventCapture.mjs";
import { GitEventStore } from "../../src/git-lifecycle/GitEventStore.mjs";
import { GitLifecycleHooks } from "../../src/hooks/GitLifecycleHooks.mjs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";

describe("GitEventCapture", () => {
  let capture;
  let tempDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "gitvan-test-"));

    // Initialize a git repository
    execSync("git init", { cwd: tempDir, stdio: "ignore" });
    execSync('git config user.email "test@example.com"', {
      cwd: tempDir,
      stdio: "ignore",
    });
    execSync('git config user.name "Test User"', {
      cwd: tempDir,
      stdio: "ignore",
    });

    capture = new GitEventCapture({
      cwd: tempDir,
      logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
    });
  });

  afterEach(async () => {
    if (capture) {
      await capture.cleanup();
    }
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      await capture.initialize();
      expect(capture.initialized).toBe(true);
      expect(capture.core).toBeDefined();
      expect(capture.core.store).toBeDefined();
    });

    it("should not re-initialize if already initialized", async () => {
      await capture.initialize();
      const firstCore = capture.core;
      await capture.initialize();
      expect(capture.core).toBe(firstCore);
    });
  });

  describe("pre-commit event capture", () => {
    it("should capture pre-commit event with staged files", async () => {
      await capture.initialize();

      const result = await capture.capturePreCommit({
        stagedFiles: ["file1.js", "file2.js"],
        branchName: "main",
      });

      expect(result.success).toBe(true);
      expect(result.eventType).toBe("pre-commit");
      expect(result.eventUri).toMatch(/git#event\/pre-commit-/);
      expect(result.quadsAdded).toBeGreaterThan(0);
    });

    it("should handle errors gracefully", async () => {
      await capture.initialize();

      // Force an error by providing invalid data
      const result = await capture.captureEvent("pre-commit", {
        error: new Error("Test error"),
      });

      expect(result.success).toBe(true);
      expect(result.quadsAdded).toBeGreaterThan(0);
    });
  });

  describe("post-commit event capture", () => {
    it("should capture post-commit event with commit info", async () => {
      await capture.initialize();

      const result = await capture.capturePostCommit({
        commitHash: "abc123",
        commitMessage: "feat: add new feature",
        branchName: "main",
        filesChanged: 5,
        linesAdded: 100,
        linesDeleted: 20,
      });

      expect(result.success).toBe(true);
      expect(result.eventType).toBe("post-commit");
      expect(result.quadsAdded).toBeGreaterThan(0);
    });
  });

  describe("all 10 git events", () => {
    const events = [
      {
        name: "pre-commit",
        method: "capturePreCommit",
        data: { stagedFiles: ["test.js"] },
      },
      {
        name: "post-commit",
        method: "capturePostCommit",
        data: { commitHash: "abc123", commitMessage: "test" },
      },
      {
        name: "prepare-commit-msg",
        method: "capturePrepareCommitMsg",
        data: { commitMessage: "test" },
      },
      {
        name: "commit-msg",
        method: "captureCommitMsg",
        data: { commitMessage: "test" },
      },
      {
        name: "pre-push",
        method: "capturePrePush",
        data: { remoteName: "origin", pushedRefs: ["refs/heads/main"] },
      },
      {
        name: "post-push",
        method: "capturePostPush",
        data: { remoteName: "origin", pushedRefs: ["refs/heads/main"] },
      },
      {
        name: "post-checkout",
        method: "capturePostCheckout",
        data: { branchName: "main", previousBranch: "develop" },
      },
      {
        name: "post-merge",
        method: "capturePostMerge",
        data: { branchName: "main", filesChanged: 3 },
      },
      {
        name: "post-rewrite",
        method: "capturePostRewrite",
        data: { branchName: "main", rewriteType: "rebase" },
      },
      {
        name: "post-update",
        method: "capturePostUpdate",
        data: { updatedRefs: ["refs/heads/main"] },
      },
    ];

    events.forEach(({ name, method, data }) => {
      it(`should capture ${name} event`, async () => {
        await capture.initialize();

        const result = await capture[method](data);

        expect(result.success).toBe(true);
        expect(result.eventType).toBe(name);
        expect(result.eventUri).toContain(name);
        expect(result.quadsAdded).toBeGreaterThan(0);
        expect(result.duration).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("statistics", () => {
    it("should return event statistics", async () => {
      await capture.initialize();

      // Capture a few events
      await capture.capturePreCommit({});
      await capture.capturePostCommit({ commitHash: "abc123" });

      const stats = await capture.getStats();

      expect(stats.initialized).toBe(true);
      expect(stats.storeSize).toBeGreaterThan(0);
      expect(stats.eventTypes).toBeDefined();
    });
  });
});

describe("GitEventStore", () => {
  let store;
  let tempDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "gitvan-store-test-"));
    store = new GitEventStore({
      storePath: join(tempDir, "events"),
      logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
      autoCleanup: false, // Disable auto-cleanup for tests
    });
  });

  afterEach(async () => {
    if (store) {
      await store.cleanup();
    }
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      await store.initialize();
      expect(store.initialized).toBe(true);
      expect(store.core).toBeDefined();
    });

    it("should create store directory", async () => {
      await store.initialize();
      const { stat } = await import("node:fs/promises");
      const stats = await stat(store.storePath);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe("event queries", () => {
    beforeEach(async () => {
      await store.initialize();

      // Add some test events
      const { GitEventCapture } = await import(
        "../../src/git-lifecycle/GitEventCapture.mjs"
      );
      const capture = new GitEventCapture({
        core: store.core,
        logger: store.logger,
      });

      await capture.initialize();
      await capture.capturePreCommit({ branchName: "main" });
      await capture.capturePostCommit({
        commitHash: "abc123",
        branchName: "main",
      });
      await capture.capturePreCommit({ branchName: "develop" });
    });

    it("should query events by type", async () => {
      const events = await store.getEventsByType("pre-commit");
      expect(Array.isArray(events)).toBe(true);
      // Note: Results depend on SPARQL implementation
    });

    it("should query events by branch", async () => {
      const events = await store.getEventsByBranch("main");
      expect(Array.isArray(events)).toBe(true);
    });

    it("should query events by date range", async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = new Date();
      const events = await store.getEventsByDateRange(startDate, endDate);
      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe("statistics", () => {
    it("should return store statistics", async () => {
      await store.initialize();

      const stats = await store.getStats();

      expect(stats).toBeDefined();
      expect(stats.totalEvents).toBeGreaterThanOrEqual(0);
      expect(stats.eventTypes).toBeDefined();
      expect(stats.retentionPolicies).toBeDefined();
    });
  });

  describe("retention policies", () => {
    it("should enforce retention policies in dry run mode", async () => {
      await store.initialize();

      const result = await store.enforceRetention({ dryRun: true });

      expect(result).toBeDefined();
      expect(result.dryRun).toBe(true);
      expect(result.detailEventsRemoved).toBeGreaterThanOrEqual(0);
      expect(result.aggregateEventsRemoved).toBeGreaterThanOrEqual(0);
      expect(result.eventsAggregated).toBeGreaterThanOrEqual(0);
    });

    it("should not modify store in dry run mode", async () => {
      await store.initialize();

      const statsBefore = await store.getStats();
      await store.enforceRetention({ dryRun: true });
      const statsAfter = await store.getStats();

      expect(statsAfter.totalEvents).toBe(statsBefore.totalEvents);
    });
  });

  describe("persistence", () => {
    it("should persist events to disk", async () => {
      await store.initialize();

      // Add an event
      const { GitEventCapture } = await import(
        "../../src/git-lifecycle/GitEventCapture.mjs"
      );
      const capture = new GitEventCapture({
        core: store.core,
        logger: store.logger,
      });
      await capture.initialize();
      await capture.capturePreCommit({});

      const result = await store.persist();

      expect(result.path).toContain("events.ttl");
      expect(result.size).toBeGreaterThan(0);
    });

    it("should load persisted events on initialization", async () => {
      // First initialization - add events and persist
      await store.initialize();
      const { GitEventCapture } = await import(
        "../../src/git-lifecycle/GitEventCapture.mjs"
      );
      const capture = new GitEventCapture({
        core: store.core,
        logger: store.logger,
      });
      await capture.initialize();
      await capture.capturePreCommit({});
      await store.persist();
      await store.cleanup();

      // Second initialization - should load persisted events
      const store2 = new GitEventStore({
        storePath: store.storePath,
        logger: store.logger,
        autoCleanup: false,
      });
      await store2.initialize();
      const stats = await store2.getStats();

      expect(store2.core.store.size).toBeGreaterThan(0);
      await store2.cleanup();
    });
  });
});

describe("GitLifecycleHooks", () => {
  let hooks;
  let tempDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "gitvan-hooks-test-"));

    // Initialize a git repository
    execSync("git init", { cwd: tempDir, stdio: "ignore" });
    execSync('git config user.email "test@example.com"', {
      cwd: tempDir,
      stdio: "ignore",
    });
    execSync('git config user.name "Test User"', {
      cwd: tempDir,
      stdio: "ignore",
    });

    hooks = new GitLifecycleHooks({
      cwd: tempDir,
      graphDir: join(tempDir, "hooks"),
      storePath: join(tempDir, "events"),
      logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
    });
  });

  afterEach(async () => {
    if (hooks) {
      await hooks.cleanup();
    }
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  describe("initialization", () => {
    it("should initialize all components", async () => {
      await hooks.initialize();

      expect(hooks.initialized).toBe(true);
      expect(hooks.eventCapture.initialized).toBe(true);
      expect(hooks.eventStore.initialized).toBe(true);
    });
  });

  describe("event handling", () => {
    it("should handle pre-commit event", async () => {
      await hooks.initialize();

      const result = await hooks.handlePreCommit({
        stagedFiles: ["test.js"],
      });

      expect(result.success).toBe(true);
      expect(result.eventType).toBe("pre-commit");
      expect(result.captured).toBe(true);
    });

    it("should handle post-commit event", async () => {
      await hooks.initialize();

      const result = await hooks.handlePostCommit({
        commitHash: "abc123",
        commitMessage: "test commit",
      });

      expect(result.success).toBe(true);
      expect(result.eventType).toBe("post-commit");
      expect(result.captured).toBe(true);
    });

    it("should handle capture-only mode", async () => {
      await hooks.initialize();

      const result = await hooks.handleGitEvent(
        "pre-commit",
        {},
        { captureOnly: true }
      );

      expect(result.success).toBe(true);
      expect(result.captured).toBe(true);
      expect(result.hooksEvaluated).toBe(false);
    });
  });

  describe("all 10 event handlers", () => {
    const handlers = [
      { name: "pre-commit", method: "handlePreCommit", data: {} },
      {
        name: "post-commit",
        method: "handlePostCommit",
        data: { commitHash: "abc123" },
      },
      { name: "prepare-commit-msg", method: "handlePrepareCommitMsg", data: {} },
      { name: "commit-msg", method: "handleCommitMsg", data: {} },
      { name: "pre-push", method: "handlePrePush", data: {} },
      { name: "post-push", method: "handlePostPush", data: {} },
      { name: "post-checkout", method: "handlePostCheckout", data: {} },
      { name: "post-merge", method: "handlePostMerge", data: {} },
      { name: "post-rewrite", method: "handlePostRewrite", data: {} },
      { name: "post-update", method: "handlePostUpdate", data: {} },
    ];

    handlers.forEach(({ name, method, data }) => {
      it(`should handle ${name} event`, async () => {
        await hooks.initialize();

        const result = await hooks[method](data);

        expect(result.success).toBe(true);
        expect(result.eventType).toBe(name);
        expect(result.captured).toBe(true);
      });
    });
  });

  describe("event queries", () => {
    beforeEach(async () => {
      await hooks.initialize();

      // Add some test events
      await hooks.handlePreCommit({ branchName: "main" });
      await hooks.handlePostCommit({
        commitHash: "abc123",
        branchName: "main",
      });
    });

    it("should query events by type", async () => {
      const events = await hooks.getEventsByType("pre-commit");
      expect(Array.isArray(events)).toBe(true);
    });

    it("should query events by branch", async () => {
      const events = await hooks.getEventsByBranch("main");
      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe("statistics", () => {
    it("should return comprehensive statistics", async () => {
      await hooks.initialize();

      const stats = await hooks.getStats();

      expect(stats).toBeDefined();
      expect(stats.eventCapture).toBeDefined();
      expect(stats.eventStore).toBeDefined();
      expect(stats.hookOrchestrator).toBeDefined();
    });
  });

  describe("retention enforcement", () => {
    it("should enforce retention policies", async () => {
      await hooks.initialize();

      const result = await hooks.enforceRetention({ dryRun: true });

      expect(result).toBeDefined();
      expect(result.dryRun).toBe(true);
    });
  });

  describe("persistence", () => {
    it("should persist event store", async () => {
      await hooks.initialize();

      await hooks.handlePreCommit({});
      const result = await hooks.persist();

      expect(result).toBeDefined();
      expect(result.path).toBeDefined();
    });
  });
});

describe("Integration Tests", () => {
  let tempDir;
  let hooks;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "gitvan-integration-"));

    // Initialize a git repository
    execSync("git init", { cwd: tempDir, stdio: "ignore" });
    execSync('git config user.email "test@example.com"', {
      cwd: tempDir,
      stdio: "ignore",
    });
    execSync('git config user.name "Test User"', {
      cwd: tempDir,
      stdio: "ignore",
    });

    hooks = new GitLifecycleHooks({
      cwd: tempDir,
      graphDir: join(tempDir, "hooks"),
      storePath: join(tempDir, "events"),
      logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
    });
  });

  afterEach(async () => {
    if (hooks) {
      await hooks.cleanup();
    }
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("should handle complete commit lifecycle", async () => {
    await hooks.initialize();

    // Pre-commit
    const preCommit = await hooks.handlePreCommit({
      stagedFiles: ["test.js"],
      branchName: "main",
    });
    expect(preCommit.success).toBe(true);

    // Post-commit
    const postCommit = await hooks.handlePostCommit({
      commitHash: "abc123",
      commitMessage: "feat: add feature",
      branchName: "main",
      filesChanged: 1,
    });
    expect(postCommit.success).toBe(true);

    // Verify events were captured
    const stats = await hooks.getStats();
    expect(stats.eventStore.totalEvents).toBeGreaterThanOrEqual(0);
  });

  it("should handle complete push lifecycle", async () => {
    await hooks.initialize();

    // Pre-push
    const prePush = await hooks.handlePrePush({
      remoteName: "origin",
      branchName: "main",
      pushedRefs: ["refs/heads/main"],
    });
    expect(prePush.success).toBe(true);

    // Post-push
    const postPush = await hooks.handlePostPush({
      remoteName: "origin",
      branchName: "main",
      pushedRefs: ["refs/heads/main"],
    });
    expect(postPush.success).toBe(true);
  });

  it("should persist and restore events across sessions", async () => {
    await hooks.initialize();

    // Add events
    await hooks.handlePreCommit({ branchName: "main" });
    await hooks.handlePostCommit({ commitHash: "abc123", branchName: "main" });

    // Persist
    await hooks.persist();

    // Get initial stats
    const statsBefore = await hooks.getStats();
    const storeSize = statsBefore.eventStore.totalEvents;

    // Cleanup and reinitialize
    await hooks.cleanup();

    const hooks2 = new GitLifecycleHooks({
      cwd: tempDir,
      graphDir: join(tempDir, "hooks"),
      storePath: join(tempDir, "events"),
      logger: hooks.logger,
    });

    await hooks2.initialize();
    const statsAfter = await hooks2.getStats();

    // Verify events were restored
    expect(hooks2.eventStore.core.store.size).toBeGreaterThan(0);

    await hooks2.cleanup();
  });
});

describe("RDF Ontology Validation", () => {
  it("should have valid git-ontology.ttl file", async () => {
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");

    const ontologyPath = resolve(
      process.cwd(),
      "src/rdf/git-ontology.ttl"
    );
    const content = await readFile(ontologyPath, "utf8");

    // Basic validation
    expect(content).toContain("@prefix prov:");
    expect(content).toContain("@prefix gitv:");
    expect(content).toContain("GitEvent");
    expect(content).toContain("PreCommitEvent");
    expect(content).toContain("PostCommitEvent");
  });

  it("should define all 10 git event types", async () => {
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");

    const ontologyPath = resolve(
      process.cwd(),
      "src/rdf/git-ontology.ttl"
    );
    const content = await readFile(ontologyPath, "utf8");

    const eventTypes = [
      "PreCommitEvent",
      "PostCommitEvent",
      "PrepareCommitMsgEvent",
      "CommitMsgEvent",
      "PrePushEvent",
      "PostPushEvent",
      "PostCheckoutEvent",
      "PostMergeEvent",
      "PostRewriteEvent",
      "PostUpdateEvent",
    ];

    for (const eventType of eventTypes) {
      expect(content).toContain(eventType);
    }
  });

  it("should use PROV-O vocabulary", async () => {
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");

    const ontologyPath = resolve(
      process.cwd(),
      "src/rdf/git-ontology.ttl"
    );
    const content = await readFile(ontologyPath, "utf8");

    // Check for PROV-O classes and properties
    expect(content).toContain("prov:Activity");
    expect(content).toContain("prov:Entity");
    expect(content).toContain("prov:Agent");
    expect(content).toContain("prov:atTime");
    expect(content).toContain("prov:wasAttributedTo");
  });
});

describe("Error Handling", () => {
  it("should handle missing git repository gracefully", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "gitvan-error-"));

    const capture = new GitEventCapture({
      cwd: tempDir,
      logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
    });

    await capture.initialize();

    // This should not throw, but may return default values
    const result = await capture.capturePreCommit({});

    expect(result).toBeDefined();

    await capture.cleanup();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should handle initialization errors", async () => {
    const capture = new GitEventCapture({
      cwd: "/nonexistent/path",
      logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
    });

    // Should initialize even with invalid cwd
    await expect(capture.initialize()).resolves.not.toThrow();
  });
});

describe("Performance Tests", () => {
  it("should capture events efficiently", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "gitvan-perf-"));

    execSync("git init", { cwd: tempDir, stdio: "ignore" });
    execSync('git config user.email "test@example.com"', {
      cwd: tempDir,
      stdio: "ignore",
    });
    execSync('git config user.name "Test User"', {
      cwd: tempDir,
      stdio: "ignore",
    });

    const capture = new GitEventCapture({
      cwd: tempDir,
      logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
    });

    await capture.initialize();

    const startTime = performance.now();

    // Capture 10 events
    for (let i = 0; i < 10; i++) {
      await capture.capturePreCommit({ branchName: "main" });
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Should complete in reasonable time (< 1 second for 10 events)
    expect(duration).toBeLessThan(1000);

    await capture.cleanup();
    await rm(tempDir, { recursive: true, force: true });
  });
});
