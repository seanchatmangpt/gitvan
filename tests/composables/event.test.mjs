/**
 * Comprehensive Event System Tests
 * Tests for useEvent composable - targeting 85%+ coverage
 * 40+ test cases covering all event operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createTestContext,
  withTestEnvironment,
  initTestRepo,
  createCommit,
  createFileStructure,
  assertFileExists,
  cleanupDir,
} from "../helpers/index.mjs";
import { useEvent } from "../../src/composables/event.mjs";
import { withGitVan } from "../../src/core/context.mjs";
import { join } from "pathe";

describe("Event System - useEvent Composable", () => {
  let testContext;
  let eventComposable;

  beforeEach(async () => {
    testContext = await withTestEnvironment(async (ctx) => {
      // Initialize git repo
      await initTestRepo(ctx.testDir);

      // Create events directory structure
      createFileStructure(ctx.testDir, {
        "events/custom": {},
        "events/cron": {},
        "events/merge-to": {},
        "jobs": {},
      });

      return ctx;
    });

    // Create event composable within GitVan context
    await withGitVan(testContext, async () => {
      eventComposable = useEvent();
    });
  });

  afterEach(() => {
    if (testContext?.cleanup) {
      testContext.cleanup();
    }
  });

  describe("Event Discovery", () => {
    it("should list all events", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();
        const events = await event.list();

        expect(Array.isArray(events)).toBe(true);
        expect(events).toBeDefined();
      });
    });

    it("should list events with metadata", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        // Create a test event first
        await event.register("test-event", {
          name: "Test Event",
          description: "A test event",
          type: "custom",
          job: "test-job",
        });

        const events = await event.list({ includeMetadata: true });
        expect(events.length).toBeGreaterThan(0);

        if (events.length > 0) {
          const firstEvent = events[0];
          expect(firstEvent).toHaveProperty("id");
          expect(firstEvent).toHaveProperty("name");
          expect(firstEvent).toHaveProperty("type");
        }
      });
    });

    it("should filter events by type", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        // Create events of different types
        await event.register("event-1", {
          name: "Event 1",
          type: "cron",
          job: "job-1",
        });

        await event.register("event-2", {
          name: "Event 2",
          type: "custom",
          job: "job-2",
        });

        const cronEvents = await event.list({ filter: { type: "cron" } });
        expect(cronEvents.every((e) => e.type === "cron")).toBe(true);
      });
    });

    it("should filter events by name", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        await event.register("test-event-1", {
          name: "Test Event One",
          type: "custom",
          job: "job-1",
        });

        await event.register("demo-event-2", {
          name: "Demo Event Two",
          type: "custom",
          job: "job-2",
        });

        const testEvents = await event.list({ filter: { name: "Test" } });
        expect(testEvents.every((e) => e.name.includes("Test"))).toBe(true);
      });
    });

    it("should get specific event by ID", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        const eventId = "specific-event";
        await event.register(eventId, {
          name: "Specific Event",
          description: "A specific event for testing",
          type: "custom",
          job: "test-job",
        });

        const retrieved = await event.get(eventId);
        expect(retrieved).toBeDefined();
        expect(retrieved.id).toBe(eventId);
        expect(retrieved.name).toBe("Specific Event");
        expect(retrieved.definition).toBeDefined();
      });
    });

    it("should throw error when getting non-existent event", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        await expect(event.get("non-existent")).rejects.toThrow(
          /Event not found/
        );
      });
    });

    it("should check if event exists", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        const eventId = "exists-test";
        await event.register(eventId, {
          name: "Exists Test",
          type: "custom",
          job: "test-job",
        });

        const exists = await event.exists(eventId);
        const notExists = await event.exists("non-existent");

        expect(exists).toBe(true);
        expect(notExists).toBe(false);
      });
    });
  });

  describe("Event Registration", () => {
    it("should register a new event", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        const eventDef = await event.register("new-event", {
          name: "New Event",
          description: "A newly registered event",
          type: "custom",
          job: "test-job",
        });

        expect(eventDef).toBeDefined();
        expect(eventDef.id).toBe("new-event");
        expect(eventDef.name).toBe("New Event");

        // Verify file was created
        const eventFile = join(
          testContext.testDir,
          "events/custom/new-event.mjs"
        );
        assertFileExists(eventFile);
      });
    });

    it("should register event with default values", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        const eventDef = await event.register("default-event", {
          job: "test-job",
        });

        expect(eventDef.id).toBe("default-event");
        expect(eventDef.name).toBe("default-event");
        expect(eventDef.description).toBe("No description");
        expect(eventDef.type).toBe("custom");
      });
    });

    it("should register event with inline run function", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        const eventDef = await event.register("inline-event", {
          name: "Inline Event",
          type: "custom",
          run: async (ctx) => ({ success: true, context: ctx }),
        });

        expect(eventDef.run).toBeDefined();
        expect(typeof eventDef.run).toBe("function");
      });
    });

    it("should unregister an event", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        const eventId = "to-unregister";
        await event.register(eventId, {
          name: "To Unregister",
          type: "custom",
          job: "test-job",
        });

        const exists = await event.exists(eventId);
        expect(exists).toBe(true);

        await event.unregister(eventId);

        const stillExists = await event.exists(eventId);
        expect(stillExists).toBe(false);
      });
    });

    it("should throw error when unregistering non-existent event", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        await expect(event.unregister("non-existent")).rejects.toThrow(
          /Failed to unregister event/
        );
      });
    });
  });

  describe("Event Triggering", () => {
    it("should simulate event execution", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        await event.register("simulate-event", {
          name: "Simulate Event",
          type: "custom",
          job: "test-job",
        });

        const result = await event.simulate("simulate-event", {
          testData: "test",
        });

        expect(result).toBeDefined();
        expect(result.simulated).toBe(true);
        expect(result.jobId).toBe("test-job");
        expect(result.context.testData).toBe("test");
        expect(result.context.simulation).toBe(true);
      });
    });

    it("should simulate event with inline action", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        await event.register("inline-simulate", {
          name: "Inline Simulate",
          type: "custom",
          run: async (ctx) => ({ executed: true }),
        });

        const result = await event.simulate("inline-simulate");

        expect(result).toBeDefined();
        expect(result.simulated).toBe(true);
        expect(result.action).toBeDefined();
      });
    });

    it("should throw error simulating event without action", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        // Register event without job or run
        await event.register("no-action", {
          name: "No Action Event",
          type: "custom",
        });

        await expect(event.simulate("no-action")).rejects.toThrow(
          /No action defined/
        );
      });
    });
  });

  describe("Event Status & History", () => {
    it("should get event status with no triggers", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        await event.register("status-event", {
          name: "Status Event",
          type: "custom",
          job: "test-job",
        });

        const status = await event.status("status-event");

        expect(status).toBeDefined();
        expect(status.id).toBe("status-event");
        expect(status.lastTriggered).toBeNull();
        expect(status.totalTriggers).toBe(0);
        expect(status.successRate).toBe(0);
      });
    });

    it("should get event history", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        await event.register("history-event", {
          name: "History Event",
          type: "custom",
          job: "test-job",
        });

        const history = await event.history("history-event");

        expect(Array.isArray(history)).toBe(true);
        expect(history.length).toBe(0); // No triggers yet
      });
    });

    it("should limit event history results", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        await event.register("limit-event", {
          name: "Limit Event",
          type: "custom",
          job: "test-job",
        });

        const history = await event.history("limit-event", { limit: 10 });

        expect(Array.isArray(history)).toBe(true);
        expect(history.length).toBeLessThanOrEqual(10);
      });
    });

    it("should filter event history by status", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        await event.register("filter-event", {
          name: "Filter Event",
          type: "custom",
          job: "test-job",
        });

        const successHistory = await event.history("filter-event", {
          status: "success",
        });

        const errorHistory = await event.history("filter-event", {
          status: "error",
        });

        expect(Array.isArray(successHistory)).toBe(true);
        expect(Array.isArray(errorHistory)).toBe(true);
      });
    });
  });

  describe("Event Validation", () => {
    it("should validate correct event definition", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        await event.register("valid-event", {
          name: "Valid Event",
          description: "A valid event",
          type: "custom",
          job: "test-job",
        });

        const validation = await event.validate("valid-event");

        expect(validation).toBeDefined();
        expect(validation.id).toBe("valid-event");
        expect(validation.errors).toBeDefined();
        expect(validation.warnings).toBeDefined();
      });
    });

    it("should detect event without action", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        await event.register("no-action-event", {
          name: "No Action",
          type: "custom",
          // No job or run defined
        });

        const validation = await event.validate("no-action-event");

        expect(validation.valid).toBe(false);
        expect(validation.errors).toContain(
          "Event must have either job or run action"
        );
      });
    });

    it("should warn about missing metadata", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        await event.register("minimal-event", {
          job: "test-job",
          // Missing name and description
        });

        const validation = await event.validate("minimal-event");

        expect(validation.warnings.length).toBeGreaterThan(0);
      });
    });

    it("should validate all events", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        await event.register("event-1", {
          name: "Event 1",
          type: "custom",
          job: "job-1",
        });

        await event.register("event-2", {
          name: "Event 2",
          type: "custom",
          job: "job-2",
        });

        const results = await event.validateAll();

        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeGreaterThanOrEqual(2);
        expect(results.every((r) => r.id)).toBe(true);
      });
    });
  });

  describe("Event Search & Filtering", () => {
    beforeEach(async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        // Create multiple events for search testing
        await event.register("search-event-1", {
          name: "Build Event",
          description: "Builds the project",
          type: "cron",
          job: "build-job",
        });

        await event.register("search-event-2", {
          name: "Test Event",
          description: "Runs tests",
          type: "custom",
          job: "test-job",
        });

        await event.register("search-event-3", {
          name: "Deploy Event",
          description: "Deploys to production",
          type: "merge",
          job: "deploy-job",
        });
      });
    });

    it("should search events by query", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        const results = await event.search("test");

        expect(results.length).toBeGreaterThan(0);
        expect(
          results.some(
            (e) =>
              e.name.toLowerCase().includes("test") ||
              e.description.toLowerCase().includes("test")
          )
        ).toBe(true);
      });
    });

    it("should search events in specific fields", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        const results = await event.search("build", {
          fields: ["name"],
        });

        expect(
          results.every((e) => e.name.toLowerCase().includes("build"))
        ).toBe(true);
      });
    });

    it("should get events by type", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        const cronEvents = await event.getByType("cron");

        expect(Array.isArray(cronEvents)).toBe(true);
        expect(cronEvents.every((e) => e.type === "cron" || isEventOfType(e.id, "cron"))).toBe(true);
      });
    });

    it("should get events by job", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        const events = await event.getByJob("build-job");

        expect(Array.isArray(events)).toBe(true);
        expect(events.every((e) => e.job === "build-job")).toBe(true);
      });
    });
  });

  describe("Event Context", () => {
    it("should create event context", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        await event.register("context-event", {
          name: "Context Event",
          description: "Event for context testing",
          type: "custom",
          job: "test-job",
        });

        const context = await event.createContext("context-event");

        expect(context).toBeDefined();
        expect(context.event).toBeDefined();
        expect(context.event.id).toBe("context-event");
        expect(context.git).toBeDefined();
        expect(context.timestamp).toBeDefined();
      });
    });

    it("should create context with additional data", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        await event.register("additional-context", {
          name: "Additional Context",
          type: "custom",
          job: "test-job",
        });

        const context = await event.createContext("additional-context", {
          additionalContext: {
            customField: "customValue",
            userId: "123",
          },
        });

        expect(context.customField).toBe("customValue");
        expect(context.userId).toBe("123");
      });
    });
  });

  describe("Event Fingerprinting", () => {
    it("should generate event fingerprint", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        await event.register("fingerprint-event", {
          name: "Fingerprint Event",
          type: "custom",
          job: "test-job",
        });

        const fingerprint = await event.getFingerprint("fingerprint-event");

        expect(fingerprint).toBeDefined();
        expect(typeof fingerprint).toBe("string");
        expect(fingerprint.length).toBe(16); // SHA256 truncated to 16 chars
      });
    });

    it("should have consistent fingerprints for same event", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        await event.register("consistent-event", {
          name: "Consistent Event",
          type: "custom",
          job: "test-job",
        });

        const fingerprint1 = await event.getFingerprint("consistent-event");
        const fingerprint2 = await event.getFingerprint("consistent-event");

        expect(fingerprint1).toBe(fingerprint2);
      });
    });
  });

  describe("Event Pattern Matching", () => {
    it("should match event without pattern", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        await event.register("no-pattern", {
          name: "No Pattern Event",
          type: "custom",
          job: "test-job",
        });

        const matches = await event.matchPattern("no-pattern");

        expect(matches).toBe(true); // No pattern means always match
      });
    });

    it("should match branch pattern", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        await event.register("branch-pattern", {
          name: "Branch Pattern Event",
          type: "custom",
          job: "test-job",
          pattern: {
            branch: "main",
          },
        });

        const matches = await event.matchPattern("branch-pattern");

        expect(typeof matches).toBe("boolean");
      });
    });

    it("should match multiple branch patterns", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        await event.register("multi-branch", {
          name: "Multi Branch Event",
          type: "custom",
          job: "test-job",
          pattern: {
            branch: ["main", "develop", "staging"],
          },
        });

        const matches = await event.matchPattern("multi-branch");

        expect(typeof matches).toBe("boolean");
      });
    });
  });

  describe("Event Unrouting", () => {
    it("should unroute event ID", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        const unrouted = event.unroute("some-event-id");

        expect(unrouted).toBeDefined();
        expect(typeof unrouted).toBe("string");
      });
    });

    it("should get event category", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        const category = event.getCategory("cron/daily");

        expect(category).toBeDefined();
      });
    });

    it("should check if event is of type", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        const isCron = event.isOfType("cron/daily", "cron");

        expect(typeof isCron).toBe("boolean");
      });
    });

    it("should unroute cron expression", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        const cronExpr = event.unrouteCron("cron/0_3_*_*_*");

        expect(cronExpr).toBeDefined();
      });
    });

    it("should list unrouted events", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        await event.register("unroute-test", {
          name: "Unroute Test",
          type: "custom",
          job: "test-job",
        });

        const unroutedEvents = await event.listUnrouted();

        expect(Array.isArray(unroutedEvents)).toBe(true);
        expect(
          unroutedEvents.every((e) => e.unroutedName !== undefined)
        ).toBe(true);
      });
    });

    it("should create unroute mapping", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        const mapping = event.createUnrouteMapping([
          "event-1",
          "event-2",
          "event-3",
        ]);

        expect(mapping).toBeDefined();
        expect(typeof mapping).toBe("object");
      });
    });

    it("should unroute all event IDs", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        const unrouted = event.unrouteAll(["event-1", "event-2", "event-3"]);

        expect(unrouted).toBeDefined();
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle list errors gracefully", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        // Remove events directory to trigger error
        cleanupDir(join(testContext.testDir, "events"));

        const events = await event.list();

        expect(Array.isArray(events)).toBe(true);
        expect(events.length).toBe(0);
      });
    });

    it("should throw error for invalid event ID in get", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        await expect(event.get("invalid-event-id")).rejects.toThrow();
      });
    });

    it("should handle validation errors for non-existent events", async () => {
      await withGitVan(testContext, async () => {
        const event = useEvent();

        const validation = await event.validate("non-existent");

        expect(validation.valid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });
  });
});

// Helper function (if not available from imports)
function isEventOfType(eventId, type) {
  if (!eventId) return false;
  return eventId.startsWith(type + "/") || eventId.includes(type);
}
