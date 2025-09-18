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

// Mock all the components that could cause blocking
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

vi.mock("../../src/cli/background-setup.mjs", () => ({
  backgroundSetup: vi.fn().mockResolvedValue({
    daemon: true,
    hooks: { success: true },
    packs: { success: true },
  }),
}));

describe("Non-Blocking Initialization - Performance", () => {
  let testDir;
  let originalCwd;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "gitvan-nonblocking-test-"));
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

  describe("Fast Initialization", () => {
    it("should complete init phase quickly", async () => {
      const { fastInit } = await import("../../src/cli/fast-init.mjs");

      const startTime = Date.now();
      const result = await fastInit(testDir);
      const duration = Date.now() - startTime;

      // Should complete in under 1 second
      expect(duration).toBeLessThan(1000);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should create essential directories quickly", async () => {
      const { fastInit } = await import("../../src/cli/fast-init.mjs");

      const startTime = Date.now();
      await fastInit(testDir);
      const duration = Date.now() - startTime;

      // Should create directories quickly
      expect(duration).toBeLessThan(500);

      // Verify essential directories exist
      expect(existsSync(join(testDir, ".gitvan"))).toBe(true);
      expect(existsSync(join(testDir, "jobs"))).toBe(true);
      expect(existsSync(join(testDir, "templates"))).toBe(true);
      expect(existsSync(join(testDir, "packs"))).toBe(true);
    });

    it("should create config file quickly", async () => {
      const { fastInit } = await import("../../src/cli/fast-init.mjs");

      const startTime = Date.now();
      await fastInit(testDir);
      const duration = Date.now() - startTime;

      // Should create config quickly
      expect(duration).toBeLessThan(500);

      // Verify config file exists
      expect(existsSync(join(testDir, "gitvan.config.js"))).toBe(true);

      // Verify config content
      const configContent = readFileSync(
        join(testDir, "gitvan.config.js"),
        "utf8"
      );
      expect(configContent).toContain("export default");
      expect(configContent).toContain("ai:");
      expect(configContent).toContain("ollama");
    });
  });

  describe("Background Processing", () => {
    it("should start background setup without blocking", async () => {
      const { fastInit } = await import("../../src/cli/fast-init.mjs");
      const { backgroundSetup } = await import(
        "../../src/cli/background-setup.mjs"
      );

      const startTime = Date.now();
      await fastInit(testDir);
      const duration = Date.now() - startTime;

      // Should complete quickly even with background setup
      expect(duration).toBeLessThan(1000);

      // Background setup should be called
      expect(backgroundSetup).toHaveBeenCalled();
    });

    it("should not wait for background operations", async () => {
      // Mock slow background operations
      const { backgroundSetup } = await import(
        "../../src/cli/background-setup.mjs"
      );
      backgroundSetup.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  daemon: true,
                  hooks: { success: true },
                  packs: { success: true },
                }),
              5000
            )
          ) // 5 second delay
      );

      const { fastInit } = await import("../../src/cli/fast-init.mjs");

      const startTime = Date.now();
      await fastInit(testDir);
      const duration = Date.now() - startTime;

      // Should not wait for background operations
      expect(duration).toBeLessThan(1000);
    });
  });

  describe("Timeout Protection", () => {
    it("should timeout slow operations", async () => {
      // Mock slow file operations
      const originalWriteFileSync = writeFileSync;
      vi.spyOn(require("node:fs"), "writeFileSync").mockImplementation(
        (...args) => {
          // Simulate slow file write
          setTimeout(() => originalWriteFileSync(...args), 2000);
        }
      );

      const { fastInit } = await import("../../src/cli/fast-init.mjs");

      const startTime = Date.now();
      const result = await fastInit(testDir);
      const duration = Date.now() - startTime;

      // Should timeout and return quickly
      expect(duration).toBeLessThan(3000);
      expect(result).toBeDefined();

      // Restore original function
      vi.restoreAllMocks();
    });

    it("should handle directory creation timeouts", async () => {
      // Mock slow directory operations
      const originalMkdirSync = require("node:fs").mkdirSync;
      vi.spyOn(require("node:fs"), "mkdirSync").mockImplementation(
        (...args) => {
          // Simulate slow directory creation
          setTimeout(() => originalMkdirSync(...args), 2000);
        }
      );

      const { fastInit } = await import("../../src/cli/fast-init.mjs");

      const startTime = Date.now();
      const result = await fastInit(testDir);
      const duration = Date.now() - startTime;

      // Should timeout and return quickly
      expect(duration).toBeLessThan(3000);
      expect(result).toBeDefined();

      // Restore original function
      vi.restoreAllMocks();
    });
  });

  describe("Error Handling", () => {
    it("should continue on directory creation errors", async () => {
      // Mock directory creation failure
      vi.spyOn(require("node:fs"), "mkdirSync").mockImplementation(() => {
        throw new Error("Permission denied");
      });

      const { fastInit } = await import("../../src/cli/fast-init.mjs");

      const result = await fastInit(testDir);

      // Should still return result even if directories fail
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
    });

    it("should continue on config file creation errors", async () => {
      // Mock file write failure
      vi.spyOn(require("node:fs"), "writeFileSync").mockImplementation(() => {
        throw new Error("Disk full");
      });

      const { fastInit } = await import("../../src/cli/fast-init.mjs");

      const result = await fastInit(testDir);

      // Should still return result even if config fails
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
    });

    it("should handle git initialization errors gracefully", async () => {
      // Mock git init failure
      vi.spyOn(require("node:child_process"), "execSync").mockImplementation(
        () => {
          throw new Error("Git not found");
        }
      );

      const { fastInit } = await import("../../src/cli/fast-init.mjs");

      const result = await fastInit(testDir);

      // Should still return result even if git fails
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
    });
  });

  describe("Resource Efficiency", () => {
    it("should not create unnecessary files", async () => {
      const { fastInit } = await import("../../src/cli/fast-init.mjs");

      await fastInit(testDir);

      // Should only create essential files
      expect(existsSync(join(testDir, "gitvan.config.js"))).toBe(true);

      // Should not create unnecessary files
      expect(existsSync(join(testDir, "unnecessary-file.txt"))).toBe(false);
    });

    it("should not load heavy dependencies during init", async () => {
      const { fastInit } = await import("../../src/cli/fast-init.mjs");

      const startTime = Date.now();
      await fastInit(testDir);
      const duration = Date.now() - startTime;

      // Should be fast without heavy dependencies
      expect(duration).toBeLessThan(1000);
    });

    it("should use minimal memory during init", async () => {
      const { fastInit } = await import("../../src/cli/fast-init.mjs");

      const initialMemory = process.memoryUsage().heapUsed;
      await fastInit(testDir);
      const finalMemory = process.memoryUsage().heapUsed;

      // Should not use excessive memory
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle multiple init calls concurrently", async () => {
      const { fastInit } = await import("../../src/cli/fast-init.mjs");

      const promises = [
        fastInit(testDir),
        fastInit(testDir),
        fastInit(testDir),
      ];

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      // Should handle concurrent calls efficiently
      expect(duration).toBeLessThan(2000);
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toBeDefined();
      });
    });

    it("should not interfere with other operations", async () => {
      const { fastInit } = await import("../../src/cli/fast-init.mjs");

      // Start init
      const initPromise = fastInit(testDir);

      // Do other operations concurrently
      const otherOperations = [
        Promise.resolve("operation1"),
        Promise.resolve("operation2"),
        Promise.resolve("operation3"),
      ];

      const startTime = Date.now();
      const [initResult, ...otherResults] = await Promise.all([
        initPromise,
        ...otherOperations,
      ]);
      const duration = Date.now() - startTime;

      // Should not interfere with other operations
      expect(duration).toBeLessThan(1500);
      expect(initResult).toBeDefined();
      expect(otherResults).toHaveLength(3);
    });
  });
});
