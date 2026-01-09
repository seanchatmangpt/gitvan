/**
 * @fileoverview Tests for UnrdfHooksBridge
 *
 * @version 1.0.0
 * @license Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  UnrdfHooksBridge,
  resetUnrdfHooksBridge,
} from "../../src/integrations/unrdf-hooks-bridge.mjs";

describe("UnrdfHooksBridge", () => {
  let bridge;
  const cwd = process.cwd();

  beforeEach(() => {
    bridge = new UnrdfHooksBridge({
      cwd,
      logger: {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      enableAudit: false,
    });
  });

  afterEach(async () => {
    if (bridge) {
      await resetUnrdfHooksBridge(cwd);
    }
  });

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      await expect(bridge.initialize()).resolves.toBeUndefined();
      expect(bridge.initialized).toBe(true);
    });

    it("should not reinitialize if already initialized", async () => {
      await bridge.initialize();
      expect(bridge.initialized).toBe(true);

      await bridge.initialize();
      expect(bridge.initialized).toBe(true);
    });
  });

  describe("hook registration", () => {
    it("should register a hook with immediate schedule", async () => {
      const hookDef = {
        id: "test-hook",
        name: "Test Hook",
        breeConfig: {
          jobName: "test-job",
          schedule: "immediate",
        },
      };

      const result = await bridge.registerHook(hookDef);

      expect(result.success).toBe(true);
      expect(result.hookId).toBe("test-hook");
      expect(result.jobName).toBe("test-job");
      expect(bridge.registeredHooks.has("test-hook")).toBe(true);
    });

    it("should register a hook with cron schedule", async () => {
      const hookDef = {
        id: "cron-hook",
        name: "Cron Hook",
        breeConfig: {
          jobName: "cron-job",
          schedule: "cron",
          cron: "0 0 * * *",
        },
      };

      const result = await bridge.registerHook(hookDef);

      expect(result.success).toBe(true);
      expect(result.jobConfig.cron).toBe("0 0 * * *");
    });

    it("should register a hook with interval schedule", async () => {
      const hookDef = {
        id: "interval-hook",
        name: "Interval Hook",
        breeConfig: {
          jobName: "interval-job",
          schedule: "interval",
          interval: 60000,
        },
      };

      const result = await bridge.registerHook(hookDef);

      expect(result.success).toBe(true);
      expect(result.jobConfig.interval).toBe(60000);
    });

    it("should require hook id", async () => {
      const hookDef = {
        name: "No ID Hook",
        breeConfig: {},
      };

      await expect(bridge.registerHook(hookDef)).rejects.toThrow(
        "Hook definition must have an id"
      );
    });

    it("should track registered hooks", async () => {
      expect(bridge.registeredHooks.size).toBe(0);

      await bridge.registerHook({
        id: "hook1",
        name: "Hook 1",
        breeConfig: { jobName: "job1" },
      });

      expect(bridge.registeredHooks.size).toBe(1);

      await bridge.registerHook({
        id: "hook2",
        name: "Hook 2",
        breeConfig: { jobName: "job2" },
      });

      expect(bridge.registeredHooks.size).toBe(2);
    });
  });

  describe("hook unregistration", () => {
    it("should unregister a registered hook", async () => {
      const hookDef = {
        id: "test-hook",
        name: "Test Hook",
        breeConfig: { jobName: "test-job" },
      };

      await bridge.registerHook(hookDef);
      expect(bridge.registeredHooks.has("test-hook")).toBe(true);

      const result = await bridge.unregisterHook("test-hook");

      expect(result.success).toBe(true);
      expect(bridge.registeredHooks.has("test-hook")).toBe(false);
    });

    it("should handle unregistering non-existent hook", async () => {
      const result = await bridge.unregisterHook("non-existent");

      expect(result.success).toBe(false);
      expect(result.message).toContain("not found");
    });
  });

  describe("hook execution", () => {
    it("should execute a registered hook", async () => {
      const hookDef = {
        id: "test-hook",
        name: "Test Hook",
        breeConfig: { jobName: "test-job" },
      };

      await bridge.registerHook(hookDef);
      const result = await bridge.executeHook("test-hook", {});

      expect(result.success).toBe(true);
      expect(result.hookId).toBe("test-hook");
      expect(result.executionId).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("should fail to execute unregistered hook", async () => {
      await expect(
        bridge.executeHook("non-existent", {})
      ).rejects.toThrow("not registered");
    });

    it("should track execution history", async () => {
      const hookDef = {
        id: "test-hook",
        name: "Test Hook",
        breeConfig: { jobName: "test-job" },
      };

      await bridge.registerHook(hookDef);

      expect(bridge.executionLog.length).toBe(0);

      await bridge.executeHook("test-hook", {});
      expect(bridge.executionLog.length).toBe(1);

      await bridge.executeHook("test-hook", {});
      expect(bridge.executionLog.length).toBe(2);
    });
  });

  describe("statistics", () => {
    it("should return empty stats initially", async () => {
      const stats = bridge.getStats();

      expect(stats.initialized).toBe(false);
      expect(stats.registeredHooks).toBe(0);
      expect(stats.totalExecutions).toBe(0);
      expect(stats.successRate).toBe(0);
    });

    it("should return stats after execution", async () => {
      const hookDef = {
        id: "test-hook",
        name: "Test Hook",
        breeConfig: { jobName: "test-job" },
      };

      await bridge.registerHook(hookDef);
      await bridge.executeHook("test-hook", {});

      const stats = bridge.getStats();

      expect(stats.registeredHooks).toBe(1);
      expect(stats.totalExecutions).toBe(1);
      expect(stats.successfulExecutions).toBe(1);
      expect(stats.failedExecutions).toBe(0);
      expect(stats.successRate).toBe(100);
    });
  });

  describe("hook listing", () => {
    it("should list registered hooks", async () => {
      await bridge.registerHook({
        id: "hook1",
        name: "Hook 1",
        breeConfig: { jobName: "job1" },
      });

      await bridge.registerHook({
        id: "hook2",
        name: "Hook 2",
        breeConfig: { jobName: "job2" },
      });

      const hooks = bridge.listHooks();

      expect(hooks.length).toBe(2);
      expect(hooks[0].hookId).toBeDefined();
      expect(hooks[0].jobName).toBeDefined();
    });
  });

  describe("execution history", () => {
    it("should retrieve execution history", async () => {
      const hookDef = {
        id: "test-hook",
        name: "Test Hook",
        breeConfig: { jobName: "test-job" },
      };

      await bridge.registerHook(hookDef);
      await bridge.executeHook("test-hook", {});

      const history = bridge.getHistory();

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });

    it("should filter history by hook id", async () => {
      await bridge.registerHook({
        id: "hook1",
        name: "Hook 1",
        breeConfig: { jobName: "job1" },
      });

      await bridge.registerHook({
        id: "hook2",
        name: "Hook 2",
        breeConfig: { jobName: "job2" },
      });

      await bridge.executeHook("hook1", {});
      await bridge.executeHook("hook2", {});

      const hook1History = bridge.getHistory({ hookId: "hook1" });

      expect(hook1History.length).toBe(1);
      expect(hook1History[0].hookId).toBe("hook1");
    });

    it("should limit history results", async () => {
      const hookDef = {
        id: "test-hook",
        name: "Test Hook",
        breeConfig: { jobName: "test-job" },
      };

      await bridge.registerHook(hookDef);

      // Create multiple executions
      for (let i = 0; i < 5; i++) {
        await bridge.executeHook("test-hook", {});
      }

      const limited = bridge.getHistory({ limit: 2 });

      expect(limited.length).toBe(2);
    });
  });

  describe("lifecycle", () => {
    it("should shutdown gracefully", async () => {
      await bridge.initialize();
      await expect(bridge.shutdown()).resolves.toBeUndefined();
      expect(bridge.initialized).toBe(false);
    });
  });
});
