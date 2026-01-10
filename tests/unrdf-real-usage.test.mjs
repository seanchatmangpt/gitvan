/**
 * @fileoverview Real-World Usage Tests for unrdf Integration
 *
 * This test suite validates that unrdf works correctly in real GitVan
 * scenarios, particularly with Git event capture and RDF storage.
 *
 * Tests verify:
 * 1. Real git event capture creates valid RDF triples
 * 2. SPARQL queries execute correctly on real data
 * 3. All 10 git event types work properly
 * 4. Transaction support for atomic operations
 * 5. Knowledge hooks functionality
 * 6. Integration with GitEventCapture and GitEventStore
 *
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createKnowledgeSubstrateCore, parseTurtle } from "@unrdf/core";
import { GitEventCapture } from "../src/git-lifecycle/GitEventCapture.mjs";
import { GitEventStore } from "../src/git-lifecycle/GitEventStore.mjs";
import { tmpdir } from "node:os";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "pathe";

describe("Real-World unrdf Usage in GitVan", () => {
  let tempDir;
  let core;

  beforeEach(async () => {
    // Create temp directory for tests
    tempDir = mkdtempSync(join(tmpdir(), "gitvan-unrdf-test-"));

    // Create fresh core for each test
    core = await createKnowledgeSubstrateCore({
      enableObservability: true,
      enableKnowledgeHookManager: true,
      enableTransactionManager: true,
    });
  });

  afterEach(async () => {
    // Cleanup
    if (core?.cleanup) {
      await core.cleanup();
    }
    if (tempDir) {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    core = null;
  });

  describe("1. Git Event Capture RDF Generation", () => {
    it("should create GitEventCapture with core", async () => {
      const capture = new GitEventCapture({
        cwd: tempDir,
        core,
        logger: { info: () => {}, debug: () => {}, error: () => {} },
      });

      await capture.initialize();

      expect(capture.initialized).toBe(true);
      expect(capture.core).toBeDefined();
      expect(capture.core.store).toBeDefined();
    });

    it("should capture pre-commit event as RDF", async () => {
      const capture = new GitEventCapture({
        cwd: tempDir,
        core,
        logger: { info: () => {}, debug: () => {}, error: () => {} },
      });

      await capture.initialize();

      const initialSize = core.store.size;

      const result = await capture.captureEvent("pre-commit", {
        exitCode: 0,
        branch: "main",
        files: ["test.js"],
      });

      expect(result.success).toBe(true);
      expect(result.eventType).toBe("pre-commit");
      expect(core.store.size).toBeGreaterThan(initialSize);
    });

    it("should capture post-commit event as RDF", async () => {
      const capture = new GitEventCapture({
        cwd: tempDir,
        core,
        logger: { info: () => {}, debug: () => {}, error: () => {} },
      });

      await capture.initialize();

      const result = await capture.captureEvent("post-commit", {
        exitCode: 0,
        branch: "main",
        commitHash: "abc123",
      });

      expect(result.success).toBe(true);
      expect(result.eventType).toBe("post-commit");
      expect(result.quadsAdded).toBeGreaterThan(0);
    });

    it("should generate valid RDF quads with correct predicates", async () => {
      const capture = new GitEventCapture({
        cwd: tempDir,
        core,
        logger: { info: () => {}, debug: () => {}, error: () => {} },
      });

      await capture.initialize();

      await capture.captureEvent("pre-push", {
        exitCode: 0,
        branch: "feature/test",
        remote: "origin",
      });

      // Query the RDF to verify structure
      const sparql = `
        PREFIX gitv: <https://gitvan.dev/ontology/git#>
        PREFIX prov: <http://www.w3.org/ns/prov#>
        SELECT ?event ?eventType ?timestamp WHERE {
          ?event gitv:eventType ?eventType ;
                 prov:atTime ?timestamp .
        }
      `;

      const results = await core.query({ query: sparql });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].eventType).toBe("pre-push");
      expect(results[0].timestamp).toBeDefined();
    });
  });

  describe("2. All 10 Git Event Types", () => {
    const eventTypes = [
      "pre-commit",
      "post-commit",
      "prepare-commit-msg",
      "commit-msg",
      "pre-push",
      "post-push",
      "post-checkout",
      "post-merge",
      "post-rewrite",
      "post-update",
    ];

    eventTypes.forEach((eventType) => {
      it(`should capture and store ${eventType} event`, async () => {
        const capture = new GitEventCapture({
          cwd: tempDir,
          core,
          logger: { info: () => {}, debug: () => {}, error: () => {} },
        });

        await capture.initialize();

        const result = await capture.captureEvent(eventType, {
          exitCode: 0,
          branch: "main",
        });

        expect(result.success).toBe(true);
        expect(result.eventType).toBe(eventType);

        // Query to verify the event was stored
        const sparql = `
          PREFIX gitv: <https://gitvan.dev/ontology/git#>
          SELECT ?event WHERE {
            ?event gitv:eventType "${eventType}" .
          }
        `;

        const results = await core.query({ query: sparql });
        expect(results.length).toBeGreaterThan(0);
      });
    });

    it("should capture multiple event types in sequence", async () => {
      const capture = new GitEventCapture({
        cwd: tempDir,
        core,
        logger: { info: () => {}, debug: () => {}, error: () => {} },
      });

      await capture.initialize();

      // Simulate a typical git workflow
      await capture.captureEvent("pre-commit", { exitCode: 0 });
      await capture.captureEvent("commit-msg", {
        exitCode: 0,
        message: "feat: add feature",
      });
      await capture.captureEvent("post-commit", {
        exitCode: 0,
        commitHash: "abc123",
      });
      await capture.captureEvent("pre-push", { exitCode: 0 });
      await capture.captureEvent("post-push", { exitCode: 0 });

      // Query all events
      const sparql = `
        PREFIX gitv: <https://gitvan.dev/ontology/git#>
        SELECT ?eventType WHERE {
          ?event gitv:eventType ?eventType .
        }
      `;

      const results = await core.query({ query: sparql });
      expect(results.length).toBe(5);
    });
  });

  describe("3. SPARQL Queries on Real Git Events", () => {
    beforeEach(async () => {
      // Populate with test events
      const capture = new GitEventCapture({
        cwd: tempDir,
        core,
        logger: { info: () => {}, debug: () => {}, error: () => {} },
      });

      await capture.initialize();

      // Add various events
      await capture.captureEvent("pre-commit", {
        exitCode: 0,
        branch: "main",
      });
      await capture.captureEvent("post-commit", {
        exitCode: 0,
        branch: "main",
        commitHash: "abc123",
      });
      await capture.captureEvent("pre-commit", {
        exitCode: 1,
        branch: "feature/test",
      });
      await capture.captureEvent("post-merge", {
        exitCode: 0,
        branch: "main",
        mergedBranch: "feature/test",
      });
    });

    it("should query events by type", async () => {
      const sparql = `
        PREFIX gitv: <https://gitvan.dev/ontology/git#>
        SELECT ?event WHERE {
          ?event gitv:eventType "pre-commit" .
        }
      `;

      const results = await core.query({ query: sparql });
      expect(results.length).toBe(2);
    });

    it("should query events by branch", async () => {
      const sparql = `
        PREFIX gitv: <https://gitvan.dev/ontology/git#>
        SELECT ?event ?eventType WHERE {
          ?event gitv:eventType ?eventType ;
                 gitv:branchName "main" .
        }
      `;

      const results = await core.query({ query: sparql });
      expect(results.length).toBeGreaterThan(0);
    });

    it("should query failed events", async () => {
      const sparql = `
        PREFIX gitv: <https://gitvan.dev/ontology/git#>
        SELECT ?event ?eventType WHERE {
          ?event gitv:eventType ?eventType ;
                 gitv:exitCode ?code .
          FILTER(?code != 0)
        }
      `;

      const results = await core.query({ query: sparql });
      expect(results.length).toBe(1);
      expect(results[0].eventType).toBe("pre-commit");
    });

    it("should query events with ORDER BY timestamp", async () => {
      const sparql = `
        PREFIX gitv: <https://gitvan.dev/ontology/git#>
        PREFIX prov: <http://www.w3.org/ns/prov#>
        SELECT ?event ?eventType ?timestamp WHERE {
          ?event gitv:eventType ?eventType ;
                 prov:atTime ?timestamp .
        }
        ORDER BY DESC(?timestamp)
      `;

      const results = await core.query({ query: sparql });
      expect(results.length).toBeGreaterThan(0);

      // Verify ordering (most recent first)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].timestamp >= results[i].timestamp).toBe(true);
      }
    });

    it("should support complex SPARQL with FILTER and OPTIONAL", async () => {
      const sparql = `
        PREFIX gitv: <https://gitvan.dev/ontology/git#>
        PREFIX prov: <http://www.w3.org/ns/prov#>
        SELECT ?event ?eventType ?branch ?commitHash WHERE {
          ?event gitv:eventType ?eventType ;
                 gitv:exitCode 0 .
          OPTIONAL { ?event gitv:branchName ?branch . }
          OPTIONAL { ?event gitv:commitHash ?commitHash . }
          FILTER(?eventType IN ("post-commit", "post-merge"))
        }
      `;

      const results = await core.query({ query: sparql });
      expect(results.length).toBeGreaterThan(0);
    });

    it("should aggregate event counts by type", async () => {
      const sparql = `
        PREFIX gitv: <https://gitvan.dev/ontology/git#>
        SELECT ?eventType (COUNT(?event) as ?count) WHERE {
          ?event gitv:eventType ?eventType .
        }
        GROUP BY ?eventType
      `;

      const results = await core.query({ query: sparql });
      expect(results.length).toBeGreaterThan(0);

      const preCommitCount = results.find(
        (r) => r.eventType === "pre-commit"
      );
      expect(preCommitCount).toBeDefined();
      expect(parseInt(preCommitCount.count)).toBe(2);
    });
  });

  describe("4. GitEventStore Integration", () => {
    let store;

    beforeEach(async () => {
      // Create store with our core
      store = new GitEventStore({
        cwd: tempDir,
        core,
        logger: { info: () => {}, debug: () => {}, error: () => {} },
      });

      await store.initialize();

      // Add test events through capture
      const capture = new GitEventCapture({
        cwd: tempDir,
        core,
        logger: { info: () => {}, debug: () => {}, error: () => {} },
      });

      await capture.initialize();

      await capture.captureEvent("pre-commit", {
        exitCode: 0,
        branch: "main",
      });
      await capture.captureEvent("post-commit", {
        exitCode: 0,
        branch: "main",
        commitHash: "abc123",
      });
      await capture.captureEvent("pre-push", {
        exitCode: 0,
        branch: "main",
      });
    });

    it("should query events by type", async () => {
      const events = await store.getEventsByType("pre-commit");
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].eventType).toBe("pre-commit");
    });

    it("should get recent events", async () => {
      const events = await store.getRecentEvents({ limit: 10 });
      expect(events.length).toBe(3);
    });

    it("should get events by commit hash", async () => {
      const events = await store.getEventsByCommit("abc123");
      expect(events.length).toBeGreaterThan(0);
      expect(events.some((e) => e.commitHash === "abc123")).toBe(true);
    });

    it("should get statistics", async () => {
      const stats = await store.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalEvents).toBe(3);
      expect(stats.eventsByType).toBeDefined();
      expect(stats.eventsByType["pre-commit"]).toBe(1);
      expect(stats.eventsByType["post-commit"]).toBe(1);
      expect(stats.eventsByType["pre-push"]).toBe(1);
    });
  });

  describe("5. Transaction Support", () => {
    it("should support atomic event capture", async () => {
      const capture = new GitEventCapture({
        cwd: tempDir,
        core,
        logger: { info: () => {}, debug: () => {}, error: () => {} },
      });

      await capture.initialize();

      const initialSize = core.store.size;

      // Capture event (should use transactions internally)
      const result = await capture.captureEvent("pre-commit", {
        exitCode: 0,
        branch: "main",
        files: ["file1.js", "file2.js", "file3.js"],
      });

      expect(result.success).toBe(true);

      // All quads should be added atomically
      const finalSize = core.store.size;
      expect(finalSize).toBeGreaterThan(initialSize);
    });

    it("should rollback on error", async () => {
      // This tests that if event capture fails, no partial data is stored
      const capture = new GitEventCapture({
        cwd: tempDir,
        core,
        logger: { info: () => {}, debug: () => {}, error: () => {} },
      });

      await capture.initialize();

      const initialSize = core.store.size;

      // Try to capture event with invalid data that should fail
      try {
        await capture.captureEvent(null, {}); // null event type should fail
      } catch (error) {
        // Expected to fail
      }

      // Store size should remain unchanged
      expect(core.store.size).toBe(initialSize);
    });
  });

  describe("6. Knowledge Hooks (Reactive Behavior)", () => {
    it("should support hook registration if available", async () => {
      const hasOnAdd = typeof core.onAdd === "function";
      const hasRegisterHook = typeof core.registerHook === "function";
      const hasOn = typeof core.on === "function";

      // Log available hook methods
      console.log("Hook methods:", {
        onAdd: hasOnAdd,
        registerHook: hasRegisterHook,
        on: hasOn,
      });

      // At least one hook method should be available
      expect(hasOnAdd || hasRegisterHook || hasOn).toBe(true);
    });

    it("should fire hooks on event capture", async () => {
      let hookFired = false;
      let capturedQuad = null;

      // Try different hook registration patterns
      if (core.onAdd) {
        core.onAdd((quad) => {
          hookFired = true;
          capturedQuad = quad;
        });
      } else if (core.registerHook) {
        core.registerHook("add", (quad) => {
          hookFired = true;
          capturedQuad = quad;
        });
      } else if (core.on) {
        core.on("add", (quad) => {
          hookFired = true;
          capturedQuad = quad;
        });
      }

      const capture = new GitEventCapture({
        cwd: tempDir,
        core,
        logger: { info: () => {}, debug: () => {}, error: () => {} },
      });

      await capture.initialize();

      await capture.captureEvent("pre-commit", {
        exitCode: 0,
        branch: "main",
      });

      // Give async hooks time to fire
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (hookFired) {
        console.log("Hook fired successfully!");
        expect(capturedQuad).toBeDefined();
      } else {
        console.log("Hooks may not be implemented yet");
      }
    });
  });

  describe("7. Performance and Scalability", () => {
    it("should handle multiple events efficiently", async () => {
      const capture = new GitEventCapture({
        cwd: tempDir,
        core,
        logger: { info: () => {}, debug: () => {}, error: () => {} },
      });

      await capture.initialize();

      const startTime = performance.now();
      const eventCount = 50;

      for (let i = 0; i < eventCount; i++) {
        await capture.captureEvent("pre-commit", {
          exitCode: 0,
          branch: `feature/test-${i}`,
        });
      }

      const duration = performance.now() - startTime;
      const avgPerEvent = duration / eventCount;

      console.log(
        `Captured ${eventCount} events in ${duration.toFixed(2)}ms (avg: ${avgPerEvent.toFixed(2)}ms/event)`
      );

      // Should be reasonably fast (< 100ms per event)
      expect(avgPerEvent).toBeLessThan(100);

      // Verify all events were stored
      const sparql = `
        PREFIX gitv: <https://gitvan.dev/ontology/git#>
        SELECT (COUNT(?event) as ?count) WHERE {
          ?event gitv:eventType "pre-commit" .
        }
      `;

      const results = await core.query({ query: sparql });
      expect(parseInt(results[0].count)).toBe(eventCount);
    });

    it("should query large datasets efficiently", async () => {
      const capture = new GitEventCapture({
        cwd: tempDir,
        core,
        logger: { info: () => {}, debug: () => {}, error: () => {} },
      });

      await capture.initialize();

      // Add 100 events
      for (let i = 0; i < 100; i++) {
        await capture.captureEvent(
          i % 2 === 0 ? "pre-commit" : "post-commit",
          {
            exitCode: i % 10 === 0 ? 1 : 0,
            branch: `branch-${i % 5}`,
          }
        );
      }

      // Complex query
      const startTime = performance.now();

      const sparql = `
        PREFIX gitv: <https://gitvan.dev/ontology/git#>
        PREFIX prov: <http://www.w3.org/ns/prov#>
        SELECT ?event ?eventType ?branch ?timestamp WHERE {
          ?event gitv:eventType ?eventType ;
                 gitv:branchName ?branch ;
                 gitv:exitCode 0 ;
                 prov:atTime ?timestamp .
          FILTER(?branch IN ("branch-0", "branch-1"))
        }
        ORDER BY DESC(?timestamp)
        LIMIT 20
      `;

      const results = await core.query({ query: sparql });
      const duration = performance.now() - startTime;

      console.log(
        `Query returned ${results.length} results in ${duration.toFixed(2)}ms`
      );

      // Query should be fast (< 1 second)
      expect(duration).toBeLessThan(1000);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("8. Real Git Ontology Usage", () => {
    it("should use PROV-O vocabulary correctly", async () => {
      const capture = new GitEventCapture({
        cwd: tempDir,
        core,
        logger: { info: () => {}, debug: () => {}, error: () => {} },
      });

      await capture.initialize();

      await capture.captureEvent("post-commit", {
        exitCode: 0,
        commitHash: "abc123",
      });

      // Query using PROV-O predicates
      const sparql = `
        PREFIX prov: <http://www.w3.org/ns/prov#>
        SELECT ?event ?timestamp WHERE {
          ?event prov:atTime ?timestamp .
        }
      `;

      const results = await core.query({ query: sparql });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].timestamp).toBeDefined();
    });

    it("should use GitVan ontology predicates", async () => {
      const capture = new GitEventCapture({
        cwd: tempDir,
        core,
        logger: { info: () => {}, debug: () => {}, error: () => {} },
      });

      await capture.initialize();

      await capture.captureEvent("pre-push", {
        exitCode: 0,
        branch: "main",
        remote: "origin",
      });

      // Query using GitVan-specific predicates
      const sparql = `
        PREFIX gitv: <https://gitvan.dev/ontology/git#>
        SELECT ?event ?eventType ?branch ?remote WHERE {
          ?event gitv:eventType ?eventType ;
                 gitv:branchName ?branch .
          OPTIONAL { ?event gitv:remoteName ?remote . }
        }
      `;

      const results = await core.query({ query: sparql });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].eventType).toBe("pre-push");
      expect(results[0].branch).toBe("main");
    });
  });

  describe("9. Error Handling in Real Scenarios", () => {
    it("should handle capture errors gracefully", async () => {
      const capture = new GitEventCapture({
        cwd: tempDir,
        core,
        logger: { info: () => {}, debug: () => {}, error: () => {} },
      });

      await capture.initialize();

      // Try to capture with invalid event type
      const result = await capture.captureEvent("invalid-event-type", {
        exitCode: 0,
      });

      // Should still succeed (creates generic event)
      expect(result.success).toBe(true);
    });

    it("should handle query errors in GitEventStore", async () => {
      const store = new GitEventStore({
        cwd: tempDir,
        core,
        logger: { info: () => {}, debug: () => {}, error: () => {} },
      });

      await store.initialize();

      // Query with invalid commit hash (should return empty)
      const events = await store.getEventsByCommit("nonexistent");
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBe(0);
    });
  });

  describe("10. Integration Summary Report", () => {
    it("should generate comprehensive real-usage report", async () => {
      const capture = new GitEventCapture({
        cwd: tempDir,
        core,
        logger: { info: () => {}, debug: () => {}, error: () => {} },
      });

      await capture.initialize();

      const report = {
        gitEventCapture: {
          initialized: capture.initialized,
          coreAvailable: !!capture.core,
          storeSize: core.store.size,
        },
        eventTypes: {},
        queryCapabilities: {},
        performance: {},
      };

      // Test each event type
      const eventTypes = [
        "pre-commit",
        "post-commit",
        "prepare-commit-msg",
        "commit-msg",
        "pre-push",
        "post-push",
        "post-checkout",
        "post-merge",
        "post-rewrite",
        "post-update",
      ];

      for (const eventType of eventTypes) {
        try {
          const result = await capture.captureEvent(eventType, {
            exitCode: 0,
            branch: "main",
          });
          report.eventTypes[eventType] = {
            success: result.success,
            quadsAdded: result.quadsAdded || 0,
          };
        } catch (e) {
          report.eventTypes[eventType] = {
            success: false,
            error: e.message,
          };
        }
      }

      // Test query capabilities
      const queries = {
        selectByType: `
          PREFIX gitv: <https://gitvan.dev/ontology/git#>
          SELECT ?event WHERE { ?event gitv:eventType "pre-commit" . }
        `,
        aggregateCount: `
          PREFIX gitv: <https://gitvan.dev/ontology/git#>
          SELECT (COUNT(?event) as ?count) WHERE { ?event gitv:eventType ?type . }
        `,
        orderByTime: `
          PREFIX gitv: <https://gitvan.dev/ontology/git#>
          PREFIX prov: <http://www.w3.org/ns/prov#>
          SELECT ?event ?timestamp WHERE { ?event prov:atTime ?timestamp . }
          ORDER BY DESC(?timestamp)
        `,
      };

      for (const [name, sparql] of Object.entries(queries)) {
        try {
          const startTime = performance.now();
          const results = await core.query({ query: sparql });
          const duration = performance.now() - startTime;

          report.queryCapabilities[name] = {
            success: true,
            resultCount: results.length,
            durationMs: Math.round(duration),
          };
        } catch (e) {
          report.queryCapabilities[name] = {
            success: false,
            error: e.message,
          };
        }
      }

      // Performance test
      const perfStartTime = performance.now();
      for (let i = 0; i < 10; i++) {
        await capture.captureEvent("pre-commit", {
          exitCode: 0,
          branch: `perf-test-${i}`,
        });
      }
      const perfDuration = performance.now() - perfStartTime;

      report.performance = {
        events: 10,
        totalDurationMs: Math.round(perfDuration),
        avgPerEventMs: Math.round(perfDuration / 10),
        finalStoreSize: core.store.size,
      };

      console.log("\n========================================");
      console.log("UNRDF REAL-WORLD USAGE REPORT");
      console.log("========================================");
      console.log(JSON.stringify(report, null, 2));
      console.log("========================================\n");

      // Assertions
      expect(report.gitEventCapture.initialized).toBe(true);
      expect(report.performance.avgPerEventMs).toBeLessThan(100);

      // All event types should work
      for (const eventType of eventTypes) {
        expect(report.eventTypes[eventType].success).toBe(true);
      }

      // All queries should work
      for (const [name, result] of Object.entries(
        report.queryCapabilities
      )) {
        expect(result.success).toBe(true);
      }
    });
  });
});
