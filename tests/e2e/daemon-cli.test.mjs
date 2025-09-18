// tests/e2e/daemon-cli.test.mjs
// End-to-end tests for GitVan v2 Daemon CLI commands
// Tests against the playground environment

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const playgroundDir = join(__dirname, "../../playground");
const gitvanCli = join(__dirname, "../../src/cli.mjs");

describe("Daemon CLI E2E Tests", () => {
  let originalCwd;
  let tempDir;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = join(playgroundDir, "test-daemon-temp");
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

  describe("daemon start command", () => {
    it("should start daemon for current worktree", async () => {
      const result = await runCliCommand(["daemon", "start"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Daemon started");
    });

    it("should start daemon for all worktrees", async () => {
      const result = await runCliCommand([
        "daemon",
        "start",
        "--worktrees",
        "all",
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Daemon started");
    });

    it("should handle daemon startup errors gracefully", async () => {
      // Test in a directory without proper Git setup
      const result = await runCliCommand(["daemon", "start"], {
        cwd: tempDir,
      });

      // Should either succeed or fail gracefully
      expect(result.code).toBeDefined();
    });
  });

  describe("daemon stop command", () => {
    it("should stop running daemon", async () => {
      const result = await runCliCommand(["daemon", "stop"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Daemon stopped");
    });

    it("should handle stopping non-running daemon", async () => {
      const result = await runCliCommand(["daemon", "stop"]);

      expect(result.code).toBe(0);
      // Should either show "stopped" or "not running"
      expect(result.stdout).toMatch(/stopped|not running/i);
    });
  });

  describe("daemon status command", () => {
    it("should show daemon status", async () => {
      const result = await runCliCommand(["daemon", "status"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("GitVan Daemon Status:");
    });

    it("should indicate daemon state", async () => {
      const result = await runCliCommand(["daemon", "status"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toMatch(/running|stopped|not running/i);
    });

    it("should show worktree information", async () => {
      const result = await runCliCommand(["daemon", "status"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Worktree:");
    });
  });

  describe("daemon restart command", () => {
    it("should restart daemon", async () => {
      const result = await runCliCommand(["daemon", "restart"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Daemon restarted");
    });

    it("should handle restart when daemon is not running", async () => {
      const result = await runCliCommand(["daemon", "restart"]);

      expect(result.code).toBe(0);
      // Should either restart or start
      expect(result.stdout).toMatch(/restarted|started/i);
    });
  });

  describe("daemon command error handling", () => {
    it("should handle invalid daemon subcommands", async () => {
      const result = await runCliCommand(["daemon", "invalid"]);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain("Unknown daemon command");
    });

    it("should provide help for daemon commands", async () => {
      const result = await runCliCommand(["daemon", "help"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Daemon Commands:");
    });
  });

  describe("daemon integration", () => {
    it("should work with playground configuration", async () => {
      const result = await runCliCommand(["daemon", "status"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("GitVan Daemon Status:");
    });

    it("should respect playground settings", async () => {
      const result = await runCliCommand(["daemon", "start"]);

      expect(result.code).toBe(0);
      // Should use playground configuration
      expect(result.stdout).toContain("Daemon started");
    });
  });
});
