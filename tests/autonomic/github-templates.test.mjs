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

// Mock pack installation
vi.mock("../../src/pack/manager.mjs", () => ({
  PackManager: vi.fn().mockImplementation(() => ({
    installPack: vi.fn().mockResolvedValue({ success: true }),
    listInstalledPacks: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock("../../src/pack/registry.mjs", () => ({
  PackRegistry: vi.fn().mockImplementation(() => ({
    findPack: vi.fn().mockResolvedValue({
      id: "nextjs-github-pack",
      name: "Next.js GitHub Pack",
      version: "1.0.0",
    }),
  })),
}));

describe("GitHub Template Auto-Install - Autonomic", () => {
  let testDir;
  let originalCwd;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "gitvan-github-template-test-"));
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

  describe("GitHub Template Configuration", () => {
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

    it("should auto-install multiple packs from config", async () => {
      // Create React template config
      writeFileSync(
        join(testDir, "gitvan.config.js"),
        `
        export default {
          autoInstall: {
            packs: ["react-vite-pack", "tailwind-pack"]
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
      expect(result.installedPacks).toContain("react-vite-pack");
      expect(result.installedPacks).toContain("tailwind-pack");
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

    it("should handle config without autoInstall section", async () => {
      writeFileSync(
        join(testDir, "gitvan.config.js"),
        `
        export default {
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
      expect(result.installedPacks).toEqual([]);
    });
  });

  describe("Pack Installation Process", () => {
    it("should install packs automatically during init", async () => {
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

      const { handleInit } = await import("../../src/cli.mjs");

      // Mock console.log to avoid output during tests
      const originalLog = console.log;
      console.log = vi.fn();

      try {
        await handleInit();
      } finally {
        console.log = originalLog;
      }

      // Verify pack was installed
      const { PackManager } = await import("../../src/pack/manager.mjs");
      expect(PackManager).toHaveBeenCalled();
    });

    it("should handle pack installation failures gracefully", async () => {
      // Mock pack installation failure
      const { PackManager } = await import("../../src/pack/manager.mjs");
      PackManager.mockImplementation(() => ({
        installPack: vi
          .fn()
          .mockRejectedValue(new Error("Installation failed")),
        listInstalledPacks: vi.fn().mockResolvedValue([]),
      }));

      writeFileSync(
        join(testDir, "gitvan.config.js"),
        `
        export default {
          autoInstall: {
            packs: ["nextjs-github-pack"]
          }
        };
      `
      );

      const { autoInstallPacksFromConfig } = await import("../../src/cli.mjs");

      const result = await autoInstallPacksFromConfig(testDir);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should continue installing other packs on individual failures", async () => {
      // Mock mixed success/failure
      const { PackManager } = await import("../../src/pack/manager.mjs");
      PackManager.mockImplementation(() => ({
        installPack: vi.fn().mockImplementation((packId) => {
          if (packId === "failing-pack") {
            return Promise.reject(new Error("Installation failed"));
          }
          return Promise.resolve({ success: true });
        }),
        listInstalledPacks: vi.fn().mockResolvedValue([]),
      }));

      writeFileSync(
        join(testDir, "gitvan.config.js"),
        `
        export default {
          autoInstall: {
            packs: ["nextjs-github-pack", "failing-pack", "react-vite-pack"]
          }
        };
      `
      );

      const { autoInstallPacksFromConfig } = await import("../../src/cli.mjs");

      const result = await autoInstallPacksFromConfig(testDir);

      expect(result.success).toBe(true);
      expect(result.installedPacks).toContain("nextjs-github-pack");
      expect(result.installedPacks).toContain("react-vite-pack");
      expect(result.failedPacks).toContain("failing-pack");
    });
  });

  describe("Template-Specific Configurations", () => {
    it("should configure Next.js template correctly", async () => {
      writeFileSync(
        join(testDir, "gitvan.config.js"),
        `
        export default {
          autoInstall: {
            packs: ["nextjs-github-pack"]
          },
          ai: {
            provider: "ollama",
            model: "qwen3-coder:30b",
            endpoint: "http://localhost:11434"
          },
          data: {
            projectName: "my-nextjs-app",
            description: "A Next.js application powered by GitVan",
            framework: "nextjs",
            version: "14.0.0"
          }
        };
      `
      );

      const { autoInstallPacksFromConfig } = await import("../../src/cli.mjs");

      const result = await autoInstallPacksFromConfig(testDir);

      expect(result.success).toBe(true);
      expect(result.installedPacks).toContain("nextjs-github-pack");
    });

    it("should configure React template correctly", async () => {
      writeFileSync(
        join(testDir, "gitvan.config.js"),
        `
        export default {
          autoInstall: {
            packs: ["react-vite-pack", "tailwind-pack"]
          },
          ai: {
            provider: "ollama",
            model: "qwen3-coder:30b",
            endpoint: "http://localhost:11434"
          },
          data: {
            projectName: "my-react-app",
            description: "A React application powered by GitVan",
            framework: "react",
            version: "18.0.0",
            bundler: "vite"
          }
        };
      `
      );

      const { autoInstallPacksFromConfig } = await import("../../src/cli.mjs");

      const result = await autoInstallPacksFromConfig(testDir);

      expect(result.success).toBe(true);
      expect(result.installedPacks).toContain("react-vite-pack");
      expect(result.installedPacks).toContain("tailwind-pack");
    });
  });

  describe("Performance", () => {
    it("should install packs quickly", async () => {
      writeFileSync(
        join(testDir, "gitvan.config.js"),
        `
        export default {
          autoInstall: {
            packs: ["nextjs-github-pack"]
          }
        };
      `
      );

      const { autoInstallPacksFromConfig } = await import("../../src/cli.mjs");

      const startTime = Date.now();
      const result = await autoInstallPacksFromConfig(testDir);
      const duration = Date.now() - startTime;

      // Should install packs quickly
      expect(duration).toBeLessThan(2000);
      expect(result.success).toBe(true);
    });

    it("should not block on pack installation", async () => {
      // Mock slow pack installation
      const { PackManager } = await import("../../src/pack/manager.mjs");
      PackManager.mockImplementation(() => ({
        installPack: vi
          .fn()
          .mockImplementation(
            () =>
              new Promise((resolve) =>
                setTimeout(() => resolve({ success: true }), 5000)
              )
          ),
        listInstalledPacks: vi.fn().mockResolvedValue([]),
      }));

      writeFileSync(
        join(testDir, "gitvan.config.js"),
        `
        export default {
          autoInstall: {
            packs: ["nextjs-github-pack"]
          }
        };
      `
      );

      const { autoInstallPacksFromConfig } = await import("../../src/cli.mjs");

      const startTime = Date.now();
      const result = await autoInstallPacksFromConfig(testDir);
      const duration = Date.now() - startTime;

      // Should timeout and return quickly
      expect(duration).toBeLessThan(3000);
      expect(result).toBeDefined();
    });
  });

  describe("Error Recovery", () => {
    it("should recover from pack registry errors", async () => {
      // Mock registry failure
      const { PackRegistry } = await import("../../src/pack/registry.mjs");
      PackRegistry.mockImplementation(() => ({
        findPack: vi.fn().mockRejectedValue(new Error("Registry unavailable")),
      }));

      writeFileSync(
        join(testDir, "gitvan.config.js"),
        `
        export default {
          autoInstall: {
            packs: ["nextjs-github-pack"]
          }
        };
      `
      );

      const { autoInstallPacksFromConfig } = await import("../../src/cli.mjs");

      const result = await autoInstallPacksFromConfig(testDir);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle missing pack definitions gracefully", async () => {
      // Mock missing pack
      const { PackRegistry } = await import("../../src/pack/registry.mjs");
      PackRegistry.mockImplementation(() => ({
        findPack: vi.fn().mockResolvedValue(null), // Pack not found
      }));

      writeFileSync(
        join(testDir, "gitvan.config.js"),
        `
        export default {
          autoInstall: {
            packs: ["nonexistent-pack"]
          }
        };
      `
      );

      const { autoInstallPacksFromConfig } = await import("../../src/cli.mjs");

      const result = await autoInstallPacksFromConfig(testDir);

      expect(result.success).toBe(true);
      expect(result.failedPacks).toContain("nonexistent-pack");
    });
  });
});
