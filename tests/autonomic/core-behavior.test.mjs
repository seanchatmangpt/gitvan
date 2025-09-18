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

// Mock all external dependencies
vi.mock("ollama", () => ({
  default: {
    generate: vi.fn().mockResolvedValue({
      response: "feat: add new feature with AI-generated commit message",
    }),
  },
}));

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

describe("Autonomic Architecture - Core Behavior", () => {
  let testDir;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "gitvan-autonomic-test-"));
    vi.clearAllMocks();
  });

  afterEach(() => {
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

  describe("Ollama AI Integration", () => {
    it("should prefer Ollama when available", async () => {
      // Mock Ollama as available
      const ollama = await import("ollama");
      ollama.default.generate.mockResolvedValue({
        response: "feat: test commit message from Ollama",
      });

      const { generateCommitMessage } = await import("../../src/cli/save.mjs");

      const message = await generateCommitMessage(["test.js"], testDir);

      expect(ollama.default.generate).toHaveBeenCalled();
      expect(message).toContain("test commit message from Ollama");
    });

    it("should handle timeout for AI requests", async () => {
      const ollama = await import("ollama");
      ollama.default.generate.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000)) // 10 second delay
      );

      const { generateCommitMessage } = await import("../../src/cli/save.mjs");

      const startTime = Date.now();
      const message = await generateCommitMessage(["test.js"], testDir);
      const duration = Date.now() - startTime;

      // Should timeout and return default message
      expect(duration).toBeLessThan(5000); // Should timeout before 10 seconds
      expect(message).toBe("feat: update files");
    });

    it("should handle Ollama connection errors gracefully", async () => {
      const ollama = await import("ollama");
      ollama.default.generate.mockRejectedValue(
        new Error("Connection refused")
      );

      const { generateCommitMessage } = await import("../../src/cli/save.mjs");

      const message = await generateCommitMessage(["test.js"], testDir);

      // Should return default message on connection error
      expect(message).toBe("feat: update files");
    });
  });

  describe("Non-Blocking Initialization", () => {
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

  describe("Lazy Pack Loading", () => {
    it("should initialize without loading packs", async () => {
      const { LazyPackRegistry } = await import(
        "../../src/pack/lazy-registry.mjs"
      );

      const startTime = Date.now();
      const registry = new LazyPackRegistry({
        packsDir: join(testDir, "packs"),
      });
      const duration = Date.now() - startTime;

      // Should initialize quickly without loading packs
      expect(duration).toBeLessThan(100);
      expect(registry).toBeDefined();
      expect(registry.isReady()).toBe(false);
    });

    it("should load packs only when requested", async () => {
      // Create mock pack files
      const packsDir = join(testDir, "packs");
      writeFileSync(
        join(packsDir, "pack1", "pack.json"),
        JSON.stringify({
          id: "pack1",
          name: "Test Pack 1",
          version: "1.0.0",
        })
      );

      const { LazyPackRegistry } = await import(
        "../../src/pack/lazy-registry.mjs"
      );
      const registry = new LazyPackRegistry({ packsDir });

      // Should not load packs initially
      expect(registry.isReady()).toBe(false);

      // Load packs when requested
      const startTime = Date.now();
      const result = await registry.loadPacks();
      const duration = Date.now() - startTime;

      // Should load packs quickly
      expect(duration).toBeLessThan(500);
      expect(result.success).toBe(true);
      expect(result.packs).toHaveLength(1);
      expect(registry.isReady()).toBe(true);
    });

    it("should cache loaded packs", async () => {
      const packsDir = join(testDir, "packs");
      writeFileSync(
        join(packsDir, "pack1", "pack.json"),
        JSON.stringify({
          id: "pack1",
          name: "Test Pack 1",
          version: "1.0.0",
        })
      );

      const { LazyPackRegistry } = await import(
        "../../src/pack/lazy-registry.mjs"
      );
      const registry = new LazyPackRegistry({ packsDir });

      // First load
      const result1 = await registry.loadPacks();
      expect(result1.success).toBe(true);

      // Second load should use cache
      const startTime = Date.now();
      const result2 = await registry.loadPacks();
      const duration = Date.now() - startTime;

      // Should be very fast due to caching
      expect(duration).toBeLessThan(50);
      expect(result2.success).toBe(true);
      expect(result2.packs).toEqual(result1.packs);
    });
  });

  describe("GitHub Template Auto-Install", () => {
    it("should auto-install packs from gitvan.config.js", async () => {
      // Create Next.js template config
      writeFileSync(
        join(testDir, "gitvan.config.js"),
        `
        export default {
          autoInstall: {
            packs: ["nextjs-github-pack"]
          },
          ai: {
            provider: "ollama",
            model: "qwen3-coder:30b"
          }
        };
      `
      );

      const { autoInstallPacksFromConfig } = await import("../../src/cli.mjs");

      const result = await autoInstallPacksFromConfig(testDir);

      expect(result.success).toBe(true);
      expect(result.installedPacks).toContain("nextjs-github-pack");
    });

    it("should handle missing config file gracefully", async () => {
      const { autoInstallPacksFromConfig } = await import("../../src/cli.mjs");

      const result = await autoInstallPacksFromConfig(testDir);

      expect(result.success).toBe(true);
      expect(result.installedPacks).toEqual([]);
    });

    it("should handle invalid config file gracefully", async () => {
      writeFileSync(join(testDir, "gitvan.config.js"), "invalid javascript");

      const { autoInstallPacksFromConfig } = await import("../../src/cli.mjs");

      const result = await autoInstallPacksFromConfig(testDir);

      expect(result.success).toBe(true);
      expect(result.installedPacks).toEqual([]);
    });
  });

  describe("Error Recovery and Resilience", () => {
    it("should recover from daemon startup failures", async () => {
      // Mock daemon failure
      const { startDaemon } = await import("../../src/runtime/daemon.mjs");
      startDaemon.mockRejectedValueOnce(new Error("Daemon failed"));

      const { backgroundSetup } = await import(
        "../../src/cli/background-setup.mjs"
      );

      const result = await backgroundSetup(testDir);

      // Should still complete initialization
      expect(result.daemon).toBe(false);
      expect(result.hooks).toBeDefined();
      expect(result.packs).toBeDefined();
    });

    it("should recover from hook installation failures", async () => {
      // Mock hook installation failure
      const { installHooks } = await import("../../src/core/hook-loader.mjs");
      installHooks.mockRejectedValueOnce(new Error("Hook installation failed"));

      const { backgroundSetup } = await import(
        "../../src/cli/background-setup.mjs"
      );

      const result = await backgroundSetup(testDir);

      // Should still complete initialization
      expect(result.hooks.success).toBe(false);
      expect(result.daemon).toBeDefined();
      expect(result.packs).toBeDefined();
    });

    it("should recover from pack loading failures", async () => {
      // Mock pack loading failure
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

      const result = await backgroundSetup(testDir);

      // Should still complete initialization
      expect(result.packs.success).toBe(false);
      expect(result.daemon).toBeDefined();
      expect(result.hooks).toBeDefined();
    });
  });

  describe("Performance and Scalability", () => {
    it("should handle concurrent operations", async () => {
      const { backgroundSetup } = await import(
        "../../src/cli/background-setup.mjs"
      );

      // Start multiple operations concurrently
      const promises = [
        backgroundSetup(testDir),
        backgroundSetup(testDir),
        backgroundSetup(testDir),
      ];

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      // Should handle concurrent operations efficiently
      expect(duration).toBeLessThan(3000);
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toBeDefined();
      });
    });

    it("should use minimal memory during operations", async () => {
      const { backgroundSetup } = await import(
        "../../src/cli/background-setup.mjs"
      );

      const initialMemory = process.memoryUsage().heapUsed;
      await backgroundSetup(testDir);
      const finalMemory = process.memoryUsage().heapUsed;

      // Should not use excessive memory
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
    });
  });
});
