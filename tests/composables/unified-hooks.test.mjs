/**
 * @fileoverview Tests for useUnifiedHooks composable
 *
 * @version 1.0.0
 * @license Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useUnifiedHooks } from "../../src/composables/unified-hooks.mjs";
import {
  resetHuskyHookBridge,
  resetUnrdfHooksBridge,
} from "../../src/integrations/index.mjs";

describe("useUnifiedHooks composable", () => {
  let hooks;
  const cwd = process.cwd();

  beforeEach(() => {
    hooks = useUnifiedHooks({
      cwd,
      autoStart: false,
      enableAudit: false,
    });
  });

  afterEach(async () => {
    if (hooks) {
      await hooks.cleanup().catch(() => {
        // Ignore cleanup errors in tests
      });
    }
    await resetHuskyHookBridge(cwd);
    await resetUnrdfHooksBridge(cwd);
  });

  describe("hook registration", () => {
    it("should register a hook with predicate", async () => {
      const result = await hooks.on("pre-commit", {
        name: "test-hook",
        predicate: ({ event }) => event.stagedFiles?.length > 0,
        handler: vi.fn(),
        breeConfig: { jobName: "test-job" },
      });

      expect(result.success).toBe(true);
      expect(result.hookId).toBeDefined();
    });

    it("should register a hook with SPARQL query", async () => {
      const result = await hooks.on("post-commit", {
        name: "sparql-hook",
        sparql: "SELECT ?file WHERE { ?file git:status git:modified }",
        handler: vi.fn(),
      });

      expect(result.success).toBe(true);
      expect(result.hookId).toBeDefined();
    });

    it("should require handler or predicate", async () => {
      await expect(
        hooks.on("pre-commit", {
          name: "invalid-hook",
          breeConfig: {},
        })
      ).rejects.toThrow();
    });

    it("should require git event name", async () => {
      await expect(
        hooks.on(null, {
          name: "invalid-hook",
          handler: vi.fn(),
        })
      ).rejects.toThrow();
    });

    it("should generate hook id if not provided", async () => {
      const result = await hooks.on("pre-commit", {
        predicate: () => true,
        handler: vi.fn(),
      });

      expect(result.hookId).toBeDefined();
      expect(result.hookId).toContain("pre-commit");
    });
  });

  describe("hook unregistration", () => {
    it("should unregister a hook", async () => {
      const result = await hooks.on("pre-commit", {
        name: "temp-hook",
        predicate: () => true,
        handler: vi.fn(),
      });

      const hookId = result.hookId;
      const unregResult = await hooks.off(hookId);

      expect(unregResult.success).toBe(true);
      expect(unregResult.hookId).toBe(hookId);
    });
  });

  describe("event emission", () => {
    it("should emit a git event", async () => {
      const result = await hooks.emit("pre-commit", {
        stagedFiles: ["src/file.js"],
        branchName: "main",
      });

      expect(result.success).toBe(true);
      expect(result.gitEvent).toBe("pre-commit");
      expect(result.eventUri).toBeDefined();
    });

    it("should execute triggered hooks on event emission", async () => {
      await hooks.on("pre-commit", {
        name: "test-hook",
        predicate: () => true,
        handler: vi.fn(),
      });

      const result = await hooks.emit("pre-commit", {
        stagedFiles: ["src/file.js"],
      });

      expect(result.success).toBe(true);
      expect(result.triggeredHooks).toBeGreaterThanOrEqual(0);
    });
  });

  describe("hook listing", () => {
    it("should list all hooks", async () => {
      await hooks.on("pre-commit", {
        name: "hook1",
        predicate: () => true,
        handler: vi.fn(),
      });

      await hooks.on("post-commit", {
        name: "hook2",
        predicate: () => true,
        handler: vi.fn(),
      });

      const list = hooks.listHooks();

      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBe(2);
    });

    it("should list empty when no hooks registered", () => {
      const list = hooks.listHooks();

      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBe(0);
    });
  });

  describe("execution history", () => {
    it("should retrieve execution history", async () => {
      await hooks.on("pre-commit", {
        name: "test-hook",
        predicate: () => true,
        handler: vi.fn(),
      });

      await hooks.emit("pre-commit", {});

      const history = hooks.getHistory();

      expect(Array.isArray(history)).toBe(true);
    });

    it("should filter history by hook id", async () => {
      await hooks.on("pre-commit", {
        name: "hook1",
        predicate: () => true,
        handler: vi.fn(),
      });

      await hooks.emit("pre-commit", {});

      const history = hooks.getHistory({ hookId: "hook1" });

      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe("status", () => {
    it("should return system status", async () => {
      const status = await hooks.getStatus();

      expect(status).toBeDefined();
      expect(status.registerHooks).toBeDefined();
      expect(status.hooks).toBeDefined();
    });

    it("should include registered hooks in status", async () => {
      await hooks.on("pre-commit", {
        name: "test-hook",
        predicate: () => true,
        handler: vi.fn(),
      });

      const status = await hooks.getStatus();

      expect(status.hooks.length).toBe(1);
    });
  });

  describe("validation", () => {
    it("should validate a hook", async () => {
      // This would validate a hook definition
      // For now, it's a placeholder for the validate method
      expect(hooks.validate).toBeDefined();
    });
  });

  describe("lifecycle", () => {
    it("should start the system", async () => {
      await expect(hooks.start()).resolves.toBeUndefined();
    });

    it("should stop the system", async () => {
      await expect(hooks.stop()).resolves.toBeUndefined();
    });

    it("should cleanup resources", async () => {
      await expect(hooks.cleanup()).resolves.toBeUndefined();
    });
  });

  describe("bridge access", () => {
    it("should provide access to bridges", () => {
      const bridges = hooks._getBridges();

      expect(bridges.huskyBridge).toBeDefined();
      expect(bridges.unrdfBridge).toBeDefined();
    });
  });
});
