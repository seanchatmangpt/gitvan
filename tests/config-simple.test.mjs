// tests/config-simple.test.mjs
// GitVan v2 — Simple Configuration System Tests
// Tests the core functionality without complex edge cases

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { GitVanDefaults } from "../src/config/defaults.mjs";
import { normalizeRuntimeConfig } from "../src/config/runtime-config.mjs";
import { loadOptions } from "../src/config/loader.mjs";

describe("GitVan Configuration System - Core", () => {
  let tempDir;

  beforeEach(async () => {
    // Create temporary directory for config testing
    tempDir = join(process.cwd(), "test-config-simple-temp");
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("defaults", () => {
    it("should have correct default structure", () => {
      expect(GitVanDefaults).toBeDefined();
      expect(GitVanDefaults.debug).toBe(false);
      expect(GitVanDefaults.logLevel).toBe(3);
      expect(GitVanDefaults.templates.dirs).toEqual(["templates"]);
      expect(GitVanDefaults.templates.autoescape).toBe(false);
      expect(GitVanDefaults.templates.noCache).toBe(true);
      expect(GitVanDefaults.receipts.ref).toBe("refs/notes/gitvan/results");
    });

    it("should have template string placeholders", () => {
      expect(GitVanDefaults.output.dir).toBe("{{ rootDir }}/.out");
      expect(GitVanDefaults.output.distDir).toBe("{{ rootDir }}/dist");
    });
  });

  describe("runtime config normalization", () => {
    it("should normalize basic runtime config", () => {
      const config = {
        receipts: { ref: "refs/notes/gitvan/custom" },
        runtimeConfig: {
          app: { name: "test" },
          gitvan: { notesRef: "refs/notes/gitvan/custom" },
        },
      };

      const normalized = normalizeRuntimeConfig(config);

      expect(normalized.app.name).toBe("test");
      expect(normalized.gitvan.notesRef).toBe("refs/notes/gitvan/custom");
    });

    it("should handle missing runtime config", () => {
      const config = {
        receipts: { ref: "refs/notes/gitvan/custom" },
      };

      const normalized = normalizeRuntimeConfig(config);

      expect(normalized.app).toBeDefined();
      expect(normalized.gitvan.notesRef).toBe("refs/notes/gitvan/custom");
    });
  });

  describe("config loader", () => {
    it("should load default config when no user config exists", async () => {
      const config = await loadOptions({ rootDir: tempDir });

      expect(config.debug).toBe(false);
      expect(config.templates.dirs).toContain("templates");
      expect(config.templates.autoescape).toBe(false);
      expect(config.templates.noCache).toBe(true);
    });

    it("should resolve template strings", async () => {
      const config = await loadOptions({ rootDir: tempDir });

      expect(config.output.dir).toBe(`${tempDir}/.out`);
      expect(config.output.distDir).toBe(`${tempDir}/dist`);
    });

    it("should load user config file", async () => {
      // Create a test config file
      const configFile = join(tempDir, "gitvan.config.js");
      await fs.writeFile(
        configFile,
        `export default defineGitVanConfig({
          debug: true,
          templates: { dirs: ["custom-templates"], autoescape: true },
          receipts: { ref: "refs/notes/gitvan/custom" },
          runtimeConfig: {
            app: { name: "test-app" },
            gitvan: { notesRef: "refs/notes/gitvan/custom" }
          }
        });`,
      );

      const config = await loadOptions({ rootDir: tempDir });

      expect(config.debug).toBe(true);
      expect(config.templates.dirs).toContain("custom-templates");
      expect(config.templates.autoescape).toBe(true);
      expect(config.receipts.ref).toBe("refs/notes/gitvan/custom");
      expect(config.runtimeConfig.app.name).toBe("test-app");
    });

    it("should merge overrides with loaded config", async () => {
      const overrides = {
        debug: true,
        templates: { dirs: ["override-templates"] },
      };

      const config = await loadOptions(overrides, { rootDir: tempDir });

      expect(config.debug).toBe(true);
      expect(config.templates.dirs).toContain("override-templates");
      expect(config.templates.autoescape).toBe(false); // from defaults
    });
  });

  describe("integration with template system", () => {
    it("should provide correct template configuration", async () => {
      const config = await loadOptions(
        {
          templates: {
            dirs: ["test-templates"],
            autoescape: true,
            noCache: false,
          },
        },
        { rootDir: tempDir },
      );

      expect(config.templates.dirs).toContain("test-templates");
      expect(config.templates.autoescape).toBe(true);
      expect(config.templates.noCache).toBe(false);
    });

    it("should handle time injection", async () => {
      const config = await loadOptions(
        {
          now: () => "2024-01-01T12:00:00Z",
        },
        { rootDir: tempDir },
      );

      expect(typeof config.now).toBe("function");
      expect(config.now()).toBe("2024-01-01T12:00:00Z");
    });
  });

  describe("policy configuration", () => {
    it("should have correct default policy", async () => {
      const config = await loadOptions({ rootDir: tempDir });

      expect(config.policy.requireSignedCommits).toBe(false);
      expect(config.policy.allowUnsignedReceipts).toBe(true);
    });

    it("should allow policy overrides", async () => {
      const config = await loadOptions(
        {
          policy: { requireSignedCommits: true, allowUnsignedReceipts: false },
        },
        { rootDir: tempDir },
      );

      expect(config.policy.requireSignedCommits).toBe(true);
      expect(config.policy.allowUnsignedReceipts).toBe(false);
    });
  });

  describe("jobs configuration", () => {
    it("should have correct default jobs directory", async () => {
      const config = await loadOptions({ rootDir: tempDir });

      expect(config.jobs.dir).toBe("jobs");
    });

    it("should allow jobs directory override", async () => {
      const config = await loadOptions(
        {
          jobs: { dir: "custom-jobs" },
        },
        { rootDir: tempDir },
      );

      expect(config.jobs.dir).toBe("custom-jobs");
    });
  });
});
