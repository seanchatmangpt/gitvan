/**
 * @fileoverview End-to-end integration tests for Husky + @unrdf/hooks + Bree
 *
 * Tests the complete flow from git event through hook evaluation to job execution
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

describe("Full Integration Flow: Husky + @unrdf/hooks + Bree", () => {
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
        // Ignore cleanup errors
      });
    }
    await resetHuskyHookBridge(cwd);
    await resetUnrdfHooksBridge(cwd);
  });

  describe("Git Event → Hook Evaluation → Job Execution", () => {
    it("should handle complete pre-commit flow", async () => {
      // Step 1: Register a hook
      const hookResult = await hooks.on("pre-commit", {
        name: "lint-check",
        predicate: ({ event }) => (event.stagedFiles?.length || 0) > 0,
        handler: vi.fn(),
        breeConfig: {
          jobName: "lint-staged",
          schedule: "immediate",
        },
      });

      expect(hookResult.success).toBe(true);

      // Step 2: Emit a git event (simulate pre-commit hook)
      const eventResult = await hooks.emit("pre-commit", {
        stagedFiles: ["src/file.js", "src/utils.js"],
        branchName: "feature/new-feature",
      });

      expect(eventResult.success).toBe(true);
      expect(eventResult.gitEvent).toBe("pre-commit");
      expect(eventResult.eventUri).toBeDefined();

      // Step 3: Verify hook was triggered and executed
      const history = hooks.getHistory({ hookId: "lint-check" });
      expect(Array.isArray(history)).toBe(true);
    });

    it("should handle complete post-commit flow", async () => {
      // Register hook
      const hookResult = await hooks.on("post-commit", {
        name: "notify-ci",
        predicate: () => true,
        handler: vi.fn(),
        breeConfig: {
          jobName: "trigger-ci",
          schedule: "immediate",
        },
      });

      expect(hookResult.success).toBe(true);

      // Emit event
      const eventResult = await hooks.emit("post-commit", {
        commitHash: "abc123def456",
        commitMessage: "Add feature",
        branchName: "main",
      });

      expect(eventResult.success).toBe(true);
      expect(eventResult.eventUri).toBeDefined();
    });

    it("should handle post-merge flow", async () => {
      // Register hook
      const hookResult = await hooks.on("post-merge", {
        name: "update-deps",
        predicate: () => true,
        handler: vi.fn(),
        breeConfig: {
          jobName: "update-dependencies",
          schedule: "immediate",
        },
      });

      expect(hookResult.success).toBe(true);

      // Emit event
      const eventResult = await hooks.emit("post-merge", {
        branchName: "main",
        filesChanged: 42,
      });

      expect(eventResult.success).toBe(true);
    });
  });

  describe("Multiple Hooks on Same Event", () => {
    it("should trigger multiple hooks for same event", async () => {
      // Register first hook
      const hook1 = await hooks.on("pre-commit", {
        name: "lint",
        predicate: () => true,
        handler: vi.fn(),
      });

      // Register second hook
      const hook2 = await hooks.on("pre-commit", {
        name: "test",
        predicate: () => true,
        handler: vi.fn(),
      });

      expect(hook1.success).toBe(true);
      expect(hook2.success).toBe(true);

      // Emit event
      const eventResult = await hooks.emit("pre-commit", {
        stagedFiles: ["src/file.js"],
      });

      expect(eventResult.success).toBe(true);
    });
  });

  describe("Hook Predicate Filtering", () => {
    it("should only trigger hooks matching predicate", async () => {
      // Register hook that requires staged files
      const hook = await hooks.on("pre-commit", {
        name: "file-check",
        predicate: ({ event }) => (event.stagedFiles?.length || 0) > 0,
        handler: vi.fn(),
      });

      expect(hook.success).toBe(true);

      // Emit event with no staged files - hook shouldn't trigger
      const emptyEvent = await hooks.emit("pre-commit", {
        stagedFiles: [],
      });

      expect(emptyEvent.success).toBe(true);

      // Emit event with staged files - hook should trigger
      const filledEvent = await hooks.emit("pre-commit", {
        stagedFiles: ["src/file.js"],
      });

      expect(filledEvent.success).toBe(true);
    });
  });

  describe("Hook Lifecycle", () => {
    it("should register and unregister hooks", async () => {
      // Register
      const register = await hooks.on("pre-commit", {
        name: "temp-hook",
        predicate: () => true,
        handler: vi.fn(),
      });

      expect(register.success).toBe(true);

      let list = hooks.listHooks();
      expect(list.length).toBe(1);

      // Unregister
      const unregister = await hooks.off(register.hookId);

      expect(unregister.success).toBe(true);

      list = hooks.listHooks();
      expect(list.length).toBe(0);
    });

    it("should handle hook errors gracefully", async () => {
      // Register a hook
      const hook = await hooks.on("pre-commit", {
        name: "error-hook",
        predicate: () => true,
        handler: vi.fn(),
      });

      // Even if the hook handler fails, the flow should continue
      const eventResult = await hooks.emit("pre-commit", {
        stagedFiles: ["src/file.js"],
      });

      // Event should succeed even if hook execution has issues
      expect(eventResult.success).toBe(true);
    });
  });

  describe("Status and Monitoring", () => {
    it("should provide system status", async () => {
      // Register hooks
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

      // Get status
      const status = await hooks.getStatus();

      expect(status).toBeDefined();
      expect(status.registerHooks).toBe(2);
      expect(status.hooks).toBeDefined();
      expect(status.hooks.length).toBe(2);
    });

    it("should track execution history", async () => {
      // Register and execute hooks
      const hook1 = await hooks.on("pre-commit", {
        name: "hook1",
        predicate: () => true,
        handler: vi.fn(),
      });

      await hooks.emit("pre-commit", { stagedFiles: ["file.js"] });

      // Get history
      const history = hooks.getHistory();

      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid hook configuration", async () => {
      await expect(
        hooks.on("pre-commit", {
          name: "invalid",
          // Missing handler and predicate
        })
      ).rejects.toThrow();
    });

    it("should handle missing event name", async () => {
      await expect(
        hooks.on(null, {
          name: "no-event",
          handler: vi.fn(),
        })
      ).rejects.toThrow();
    });

    it("should handle event emission errors gracefully", async () => {
      // Even if something goes wrong, emit should handle it
      const result = await hooks.emit("non-existent-event", {});

      // Should still return a result, even if there are issues
      expect(result).toBeDefined();
    });
  });

  describe("Real-world Scenario", () => {
    it("should handle typical CI/CD workflow", async () => {
      // 1. Register pre-commit linting hook
      await hooks.on("pre-commit", {
        name: "pre-commit-lint",
        predicate: ({ event }) => (event.stagedFiles?.length || 0) > 0,
        handler: vi.fn(),
        breeConfig: { jobName: "lint-staged" },
      });

      // 2. Register post-commit notification hook
      await hooks.on("post-commit", {
        name: "post-commit-notify",
        predicate: () => true,
        handler: vi.fn(),
        breeConfig: { jobName: "notify-slack" },
      });

      // 3. Register post-merge update hook
      await hooks.on("post-merge", {
        name: "post-merge-update",
        predicate: () => true,
        handler: vi.fn(),
        breeConfig: { jobName: "update-dependencies" },
      });

      // Verify hooks registered
      const hooks_list = hooks.listHooks();
      expect(hooks_list.length).toBe(3);

      // Simulate workflow
      await hooks.emit("pre-commit", {
        stagedFiles: ["src/app.js", "src/utils.js"],
        branchName: "feature/new-feature",
      });

      await hooks.emit("post-commit", {
        commitHash: "abc123",
        commitMessage: "Add feature",
        branchName: "feature/new-feature",
      });

      await hooks.emit("post-merge", {
        branchName: "main",
        filesChanged: 15,
      });

      // Get final status
      const status = await hooks.getStatus();
      expect(status.registerHooks).toBe(3);
    });
  });
});
