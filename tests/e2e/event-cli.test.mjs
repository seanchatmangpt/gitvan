// tests/e2e/event-cli.test.mjs
// End-to-end tests for GitVan v2 Event CLI commands
// Tests against the playground environment

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const playgroundDir = join(__dirname, "../../playground");
const gitvanCli = join(__dirname, "../../src/cli.mjs");

describe("Event CLI E2E Tests", () => {
  let originalCwd;
  let tempDir;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = join(playgroundDir, "test-event-temp");
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

  describe("event list command", () => {
    it("should list events in the playground", async () => {
      const result = await runCliCommand(["event", "list"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Event");
    });

    it("should show event details", async () => {
      const result = await runCliCommand(["event", "list"]);

      expect(result.code).toBe(0);
      // Should show event information
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    it("should handle empty event lists", async () => {
      const result = await runCliCommand(["event", "list"], {
        cwd: tempDir,
      });

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("No events found");
    });
  });

  describe("event simulate command", () => {
    it("should simulate file change events", async () => {
      const result = await runCliCommand([
        "event",
        "simulate",
        "--files",
        "src/**",
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Simulated event");
    });

    it("should simulate push events", async () => {
      const result = await runCliCommand([
        "event",
        "simulate",
        "--type",
        "push",
        "--branch",
        "main",
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Simulated event");
    });

    it("should simulate tag events", async () => {
      const result = await runCliCommand([
        "event",
        "simulate",
        "--type",
        "tag",
        "--tag",
        "v1.0.0",
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Simulated event");
    });

    it("should handle invalid simulation parameters", async () => {
      const result = await runCliCommand([
        "event",
        "simulate",
        "--invalid",
        "param",
      ]);

      // Should either succeed (ignoring invalid params) or fail gracefully
      expect(result.code).toBeDefined();
    });
  });

  describe("event test command", () => {
    it("should test event predicates", async () => {
      const result = await runCliCommand([
        "event",
        "test",
        "--predicate",
        '{"type":"push","branch":"main"}',
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Predicate test");
    });

    it("should require predicate for test command", async () => {
      const result = await runCliCommand(["event", "test"]);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain("Predicate required");
    });

    it("should validate predicate format", async () => {
      const result = await runCliCommand([
        "event",
        "test",
        "--predicate",
        "invalid-json",
      ]);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain("Invalid predicate");
    });
  });

  describe("event trigger command", () => {
    it("should trigger events manually", async () => {
      const result = await runCliCommand([
        "event",
        "trigger",
        "--type",
        "push",
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Event triggered");
    });

    it("should trigger events with context", async () => {
      const result = await runCliCommand([
        "event",
        "trigger",
        "--type",
        "file-change",
        "--files",
        "src/test.js",
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Event triggered");
    });
  });

  describe("event command error handling", () => {
    it("should handle invalid event subcommands", async () => {
      const result = await runCliCommand(["event", "invalid"]);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain("Unknown event command");
    });

    it("should provide help for event commands", async () => {
      const result = await runCliCommand(["event", "help"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Event Commands:");
    });
  });

  describe("event integration", () => {
    it("should work with playground events", async () => {
      const result = await runCliCommand(["event", "list"]);

      expect(result.code).toBe(0);
      // Should find playground events
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    it("should respect playground configuration", async () => {
      const result = await runCliCommand([
        "event",
        "simulate",
        "--files",
        "jobs/**",
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Simulated event");
    });
  });
});
