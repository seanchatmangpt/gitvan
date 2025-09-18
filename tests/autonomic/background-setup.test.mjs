import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { join } from "pathe";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";

// Mock the daemon and hook installation
vi.mock("../../src/runtime/daemon.mjs", () => ({
  startDaemon: vi.fn().mockResolvedValue(true),
  stopDaemon: vi.fn().mockResolvedValue(true),
  isDaemonRunning: vi.fn().mockResolvedValue(false),
}));

vi.mock("../../src/core/hook-loader.mjs", () => ({
  installHooks: vi.fn().mockResolvedValue({ success: true }),
  ensureHooks: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("../../src/pack/lazy-registry.mjs", () => ({
  LazyPackRegistry: vi.fn().mockImplementation(() => ({
    loadPacks: vi.fn().mockResolvedValue({ success: true, packs: [] }),
    isReady: vi.fn().mockResolvedValue(true),
  })),
}));

describe("Background Setup - Autonomic Architecture", () => {
  let testDir;
  let originalCwd;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "gitvan-bg-setup-test-"));
    originalCwd = process.cwd();
    process.chdir(testDir);

    // Initialize git repository
    execSync("git init", { cwd: testDir });
    execSync('git config user.name "Test User"', { cwd: testDir });
    execSync('git config user.email "test@example.com"', { cwd: testDir });

    vi.clearAllMocks();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("Background Setup Function", () => {
    it("should perform complete autonomic setup", async () => {
      const { backgroundSetup } = await import(
        "../../src/cli/background-setup.mjs"
      );

      const results = await backgroundSetup(testDir);

      expect(results).toHaveProperty("daemon");
      expect(results).toHaveProperty("hooks");
      expect(results).toHaveProperty("packs");

      // Verify all components were attempted
      expect(typeof results.daemon).toBe("boolean");
      expect(typeof results.hooks.success).toBe("boolean");
      expect(typeof results.packs.success).toBe("boolean");
    });

    it("should handle daemon startup gracefully", async () => {
      const { backgroundSetup } = await import(
        "../../src/cli/background-setup.mjs"
      );

      const results = await backgroundSetup(testDir);

      expect(results.daemon).toBeDefined();
      expect(typeof results.daemon).toBe("boolean");
    });

    it("should handle hook installation gracefully", async () => {
      const { backgroundSetup } = await import(
        "../../src/cli/background-setup.mjs"
      );

      const results = await backgroundSetup(testDir);

      expect(results.hooks).toHaveProperty("success");
      expect(typeof results.hooks.success).toBe("boolean");
    });

    it("should handle pack loading gracefully", async () => {
      const { backgroundSetup } = await import(
        "../../src/cli/background-setup.mjs"
      );

      const results = await backgroundSetup(testDir);

      expect(results.packs).toHaveProperty("success");
      expect(typeof results.packs.success).toBe("boolean");
    });

    it("should complete within reasonable time", async () => {
      const { backgroundSetup } = await import(
        "../../src/cli/background-setup.mjs"
      );

      const startTime = Date.now();
      const results = await backgroundSetup(testDir);
      const duration = Date.now() - startTime;

      // Should complete quickly (background operations)
      expect(duration).toBeLessThan(5000); // 5 seconds max
      expect(results).toBeDefined();
    });

    it("should not throw errors on failure", async () => {
      // Mock failures
      const { startDaemon } = await import("../../src/runtime/daemon.mjs");
      startDaemon.mockRejectedValueOnce(new Error("Daemon failed"));

      const { backgroundSetup } = await import(
        "../../src/cli/background-setup.mjs"
      );

      const results = await backgroundSetup(testDir);

      // Should still return results even if daemon fails
      expect(results).toBeDefined();
      expect(results.daemon).toBe(false);
    });
  });

  describe("Non-Blocking Behavior", () => {
    it("should not block on daemon startup", async () => {
      const { backgroundSetup } = await import(
        "../../src/cli/background-setup.mjs"
      );

      const startTime = Date.now();
      const promise = backgroundSetup(testDir);

      // Should return quickly, not wait for daemon
      const results = await promise;
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000); // Should be fast
      expect(results).toBeDefined();
    });

    it("should not block on pack loading", async () => {
      const { backgroundSetup } = await import(
        "../../src/cli/background-setup.mjs"
      );

      const startTime = Date.now();
      const results = await backgroundSetup(testDir);
      const duration = Date.now() - startTime;

      // Should not wait for pack loading
      expect(duration).toBeLessThan(1000);
      expect(results.packs).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should continue on daemon failure", async () => {
      const { startDaemon } = await import("../../src/runtime/daemon.mjs");
      startDaemon.mockRejectedValueOnce(new Error("Daemon startup failed"));

      const { backgroundSetup } = await import(
        "../../src/cli/background-setup.mjs"
      );

      const results = await backgroundSetup(testDir);

      expect(results.daemon).toBe(false);
      expect(results.hooks).toBeDefined();
      expect(results.packs).toBeDefined();
    });

    it("should continue on hook installation failure", async () => {
      const { installHooks } = await import("../../src/core/hook-loader.mjs");
      installHooks.mockRejectedValueOnce(new Error("Hook installation failed"));

      const { backgroundSetup } = await import(
        "../../src/cli/background-setup.mjs"
      );

      const results = await backgroundSetup(testDir);

      expect(results.hooks.success).toBe(false);
      expect(results.daemon).toBeDefined();
      expect(results.packs).toBeDefined();
    });

    it("should continue on pack loading failure", async () => {
      const { LazyPackRegistry } = await import(
        "../../src/pack/lazy-registry.mjs"
      );
      const mockRegistry = {
        loadPacks: vi.fn().mockRejectedValue(new Error("Pack loading failed")),
        isReady: vi.fn().mockResolvedValue(false),
      };
      LazyPackRegistry.mockImplementation(() => mockRegistry);

      const { backgroundSetup } = await import(
        "../../src/cli/background-setup.mjs"
      );

      const results = await backgroundSetup(testDir);

      expect(results.packs.success).toBe(false);
      expect(results.daemon).toBeDefined();
      expect(results.hooks).toBeDefined();
    });
  });

  describe("Timeout Protection", () => {
    it("should timeout long-running operations", async () => {
      const { startDaemon } = await import("../../src/runtime/daemon.mjs");
      startDaemon.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000)) // 10 second delay
      );

      const { backgroundSetup } = await import(
        "../../src/cli/background-setup.mjs"
      );

      const startTime = Date.now();
      const results = await backgroundSetup(testDir);
      const duration = Date.now() - startTime;

      // Should timeout and return quickly
      expect(duration).toBeLessThan(3000); // Should timeout before 10 seconds
      expect(results).toBeDefined();
    });
  });
});
