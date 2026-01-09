/**
 * @fileoverview Tests for HuskyHookBridge
 *
 * @version 1.0.0
 * @license Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { HuskyHookBridge, resetHuskyHookBridge } from "../../src/integrations/husky-hook-bridge.mjs";

describe("HuskyHookBridge", () => {
  let bridge;
  const cwd = process.cwd();

  beforeEach(() => {
    bridge = new HuskyHookBridge({
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
      await resetHuskyHookBridge(cwd);
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

      // Should not throw or reinitialize
      await bridge.initialize();
      expect(bridge.initialized).toBe(true);
    });
  });

  describe("processHook", () => {
    it("should process a pre-commit hook", async () => {
      const result = await bridge.processHook("pre-commit", {
        stagedFiles: ["src/app.js", "src/utils.js"],
        branchName: "feature/new-feature",
      });

      expect(result.success).toBe(true);
      expect(result.hookName).toBe("pre-commit");
      expect(result.eventUri).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("should process a post-commit hook", async () => {
      const result = await bridge.processHook("post-commit", {
        commitHash: "abc123def456",
        commitMessage: "Add feature",
        branchName: "main",
      });

      expect(result.success).toBe(true);
      expect(result.hookName).toBe("post-commit");
      expect(result.eventUri).toBeDefined();
    });

    it("should track event count", async () => {
      expect(bridge.eventCount).toBe(0);

      await bridge.processHook("pre-commit", {});
      expect(bridge.eventCount).toBe(1);

      await bridge.processHook("post-commit", {});
      expect(bridge.eventCount).toBe(2);
    });

    it("should handle errors gracefully", async () => {
      // Mock eventCapture to throw error
      bridge.eventCapture.captureEvent = vi.fn().mockRejectedValue(
        new Error("Capture failed")
      );

      await expect(bridge.processHook("pre-commit", {})).rejects.toThrow(
        "Capture failed"
      );
    });
  });

  describe("statistics", () => {
    it("should return bridge statistics", async () => {
      await bridge.processHook("pre-commit", {});
      await bridge.processHook("post-commit", {});

      const stats = await bridge.getStats();

      expect(stats.initialized).toBe(true);
      expect(stats.totalEventsProcessed).toBe(2);
      expect(stats.orchestratorStats).toBeDefined();
    });
  });

  describe("hook listing", () => {
    it("should list available hooks", async () => {
      const hooks = await bridge.listHooks();

      expect(Array.isArray(hooks)).toBe(true);
    });
  });

  describe("cleanup", () => {
    it("should cleanup resources", async () => {
      await bridge.initialize();
      expect(bridge.initialized).toBe(true);

      await bridge.reset();
      expect(bridge.initialized).toBe(false);
      expect(bridge.eventCount).toBe(0);
    });

    it("should shutdown gracefully", async () => {
      await bridge.initialize();
      await expect(bridge.shutdown()).resolves.toBeUndefined();
      expect(bridge.initialized).toBe(false);
    });
  });
});
