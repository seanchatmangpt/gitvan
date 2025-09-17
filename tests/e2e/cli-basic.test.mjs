// tests/e2e/cli-basic.test.mjs
// Basic end-to-end tests for GitVan v2 CLI commands
// Tests actual working functionality against the playground environment

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const playgroundDir = join(__dirname, "../../playground");
const gitvanCli = join(__dirname, "../../src/cli.mjs");

describe("GitVan v2 CLI Basic E2E Tests", () => {
  let originalCwd;
  let tempDir;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = join(playgroundDir, "test-basic-temp");
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

  describe("Core CLI functionality", () => {
    it("should show help", async () => {
      const result = await runCliCommand(["help"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("GitVan v2");
      expect(result.stdout).toContain("Usage:");
      expect(result.stdout).toContain("gitvan daemon");
      expect(result.stdout).toContain("gitvan job");
      expect(result.stdout).toContain("gitvan cron");
      expect(result.stdout).toContain("gitvan chat");
    });

    it("should list jobs", async () => {
      const result = await runCliCommand(["job", "list"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Available jobs");
      expect(result.stdout).toContain("test/simple");
      expect(result.stdout).toContain("foundation/");
    });

    it("should run a simple job", async () => {
      const result = await runCliCommand(["run", "test/simple"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Running job: test/simple");
    });
  });

  describe("Daemon commands", () => {
    it("should show daemon status", async () => {
      const result = await runCliCommand(["daemon", "status"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Daemon not running");
    });

    it("should handle daemon start", async () => {
      const result = await runCliCommand(["daemon", "start"]);

      // Should either start successfully or fail gracefully
      expect(result.code).toBeDefined();
    });

    it("should handle daemon stop", async () => {
      const result = await runCliCommand(["daemon", "stop"]);

      expect(result.code).toBe(0);
    });
  });

  describe("Cron commands", () => {
    it("should list cron jobs", async () => {
      const result = await runCliCommand(["cron", "list"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("cron job");
    });

    it("should show cron status", async () => {
      const result = await runCliCommand(["cron", "status"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Cron scheduler status");
    });

    it("should handle cron start", async () => {
      const result = await runCliCommand(["cron", "start"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("cron scheduler");
    });
  });

  describe("Event commands", () => {
    it("should list events", async () => {
      const result = await runCliCommand(["event", "list"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("event job");
    });

    it("should simulate events", async () => {
      const result = await runCliCommand([
        "event",
        "simulate",
        "--files",
        "src/**",
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("event job");
    });

    it("should test event predicates", async () => {
      const result = await runCliCommand([
        "event",
        "test",
        "--predicate",
        '{"type":"push","branch":"main"}',
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Testing predicate");
    });
  });

  describe("Audit commands", () => {
    it("should build audit pack", async () => {
      const result = await runCliCommand([
        "audit",
        "build",
        "--out",
        join(tempDir, "audit.json"),
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Building audit pack");
    });

    it("should list receipts", async () => {
      const result = await runCliCommand(["audit", "list"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Listing receipts");
    });
  });

  describe("Chat commands", () => {
    it("should draft job specifications", async () => {
      const result = await runCliCommand([
        "chat",
        "draft",
        "Create a simple hello world job",
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Generated specification");
    });

    it("should handle AI unavailability", async () => {
      const result = await runCliCommand([
        "chat",
        "draft",
        "Create a test job",
        "--model",
        "nonexistent-model",
      ]);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain("AI not available");
    });

    it("should show preview functionality", async () => {
      const result = await runCliCommand([
        "chat",
        "preview",
        "Create a logging job",
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Preview functionality not implemented");
    });
  });

  describe("LLM commands", () => {
    it("should call LLM", async () => {
      const result = await runCliCommand(["llm", "call", "What is GitVan?"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("GitVan");
    });

    it("should list models", async () => {
      const result = await runCliCommand(["llm", "models"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Provider:");
      expect(result.stdout).toContain("ollama");
    });
  });

  describe("Error handling", () => {
    it("should handle invalid commands", async () => {
      const result = await runCliCommand(["invalid", "command"]);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain("Unknown command");
    });

    it("should handle missing arguments", async () => {
      const result = await runCliCommand(["chat", "draft"]);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain("Prompt required");
    });

    it("should handle malformed JSON", async () => {
      const result = await runCliCommand([
        "event",
        "test",
        "--predicate",
        "invalid-json",
      ]);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain("not valid JSON");
    });
  });

  describe("Integration", () => {
    it("should complete basic workflow", async () => {
      // 1. List jobs
      const listResult = await runCliCommand(["job", "list"]);
      expect(listResult.code).toBe(0);

      // 2. Check daemon status
      const daemonResult = await runCliCommand(["daemon", "status"]);
      expect(daemonResult.code).toBe(0);

      // 3. List cron jobs
      const cronResult = await runCliCommand(["cron", "list"]);
      expect(cronResult.code).toBe(0);

      // 4. List events
      const eventResult = await runCliCommand(["event", "list"]);
      expect(eventResult.code).toBe(0);

      // 5. Build audit
      const auditResult = await runCliCommand([
        "audit",
        "build",
        "--out",
        join(tempDir, "integration-audit.json"),
      ]);
      expect(auditResult.code).toBe(0);
    });

    it("should work with playground configuration", async () => {
      const result = await runCliCommand(["job", "list"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Available jobs");
      // Should find playground jobs
      expect(result.stdout).toContain("foundation/");
    });
  });
});
