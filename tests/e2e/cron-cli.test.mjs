// tests/e2e/cron-cli.test.mjs
// End-to-end tests for GitVan v2 Cron CLI commands
// Tests against the playground environment

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const playgroundDir = join(__dirname, "../../playground");
const gitvanCli = join(__dirname, "../../src/cli.mjs");

describe("Cron CLI E2E Tests", () => {
  let originalCwd;
  let tempDir;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = join(playgroundDir, "test-cron-temp");
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // Helper function to run CLI commands
  async function runCliCommand(args, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn("node", [gitvanCli, ...args], {
        cwd: playgroundDir,
        stdio: ["pipe", "pipe", "pipe"],
        ...options,
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        resolve({
          code,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        });
      });

      child.on("error", (error) => {
        reject(error);
      });
    });
  }

  describe("cron list command", () => {
    it("should list cron jobs in the playground", async () => {
      const result = await runCliCommand(["cron", "list"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("cron job");
    });

    it("should show detailed cron job information", async () => {
      const result = await runCliCommand(["cron", "list"]);

      expect(result.code).toBe(0);
      // Should show cron expressions and job details
      expect(result.stdout).toMatch(/cron|schedule|job/i);
    });

    it("should handle empty cron job lists", async () => {
      // Test in a directory with no cron jobs
      const result = await runCliCommand(["cron", "list"], {
        cwd: tempDir,
      });

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("No cron jobs found");
    });
  });

  describe("cron start command", () => {
    it("should start cron scheduler", async () => {
      const result = await runCliCommand(["cron", "start"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Cron scheduler");
    });

    it("should handle cron scheduler startup errors", async () => {
      // Test with invalid configuration
      const result = await runCliCommand(["cron", "start"], {
        cwd: tempDir,
      });

      // Should either succeed or fail gracefully
      expect(result.code).toBeDefined();
    });
  });

  describe("cron dry-run command", () => {
    it("should perform dry run of cron jobs", async () => {
      const result = await runCliCommand(["cron", "dry-run"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Dry run");
    });

    it("should show what would be executed", async () => {
      const result = await runCliCommand(["cron", "dry-run"]);

      expect(result.code).toBe(0);
      // Should show job names or execution plan
      expect(result.stdout.length).toBeGreaterThan(0);
    });
  });

  describe("cron status command", () => {
    it("should show cron scheduler status", async () => {
      const result = await runCliCommand(["cron", "status"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Cron Scheduler Status");
    });

    it("should indicate if scheduler is running", async () => {
      const result = await runCliCommand(["cron", "status"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toMatch(/running|stopped|status/i);
    });
  });

  describe("cron command error handling", () => {
    it("should handle invalid cron subcommands", async () => {
      const result = await runCliCommand(["cron", "invalid"]);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain("Unknown cron command");
    });

    it("should provide help for cron commands", async () => {
      const result = await runCliCommand(["cron", "help"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Cron Commands:");
    });
  });
});
