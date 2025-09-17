// tests/e2e/cli-integration.test.mjs
// Comprehensive end-to-end integration tests for GitVan v2 CLI
// Tests all CLI commands working together in the playground environment

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const playgroundDir = join(__dirname, "../../playground");
const gitvanCli = join(__dirname, "../../src/cli.mjs");

describe("GitVan v2 CLI Integration E2E Tests", () => {
  let originalCwd;
  let tempDir;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = join(playgroundDir, "test-integration-temp");
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

  describe("Complete CLI workflow", () => {
    it("should complete a full job lifecycle", async () => {
      // 1. List existing jobs
      const listResult = await runCliCommand(["job", "list"]);
      expect(listResult.code).toBe(0);
      expect(listResult.stdout).toContain("Available jobs");

      // 2. Run a simple job
      const runResult = await runCliCommand(["run", "test/simple"]);
      expect(runResult.code).toBe(0);

      // 3. Check daemon status
      const daemonResult = await runCliCommand(["daemon", "status"]);
      expect(daemonResult.code).toBe(0);
      expect(daemonResult.stdout).toContain("GitVan Daemon Status");

      // 4. List cron jobs
      const cronResult = await runCliCommand(["cron", "list"]);
      expect(cronResult.code).toBe(0);

      // 5. List events
      const eventResult = await runCliCommand(["event", "list"]);
      expect(eventResult.code).toBe(0);

      // 6. Check audit receipts
      const auditResult = await runCliCommand(["audit", "list"]);
      expect(auditResult.code).toBe(0);
    });

    it("should handle AI-powered job generation workflow", async () => {
      // 1. Draft a job specification
      const draftResult = await runCliCommand([
        "chat",
        "draft",
        "Create a file backup job",
      ]);
      expect(draftResult.code).toBe(0);
      expect(draftResult.stdout).toContain("Generated specification");

      // 2. Preview job generation
      const previewResult = await runCliCommand([
        "chat",
        "preview",
        "Create a logging job",
      ]);
      expect(previewResult.code).toBe(0);
      expect(previewResult.stdout).toContain("Preview");

      // 3. Generate a job file
      const generateResult = await runCliCommand([
        "chat",
        "generate",
        "Create a cleanup job",
        "--output",
        join(tempDir, "cleanup-job.mjs"),
      ]);
      expect(generateResult.code).toBe(0);
      expect(generateResult.stdout).toContain("Generated job file");

      // 4. Apply the job
      const applyResult = await runCliCommand([
        "chat",
        "apply",
        "Create a test job",
        "--name",
        "e2e-test-job",
      ]);
      expect(applyResult.code).toBe(0);
      expect(applyResult.stdout).toContain("Applied job");

      // 5. Explain the job
      const explainResult = await runCliCommand([
        "chat",
        "explain",
        "test/simple",
      ]);
      expect(explainResult.code).toBe(0);
      expect(explainResult.stdout).toContain("Job Analysis");
    });

    it("should handle daemon and cron integration", async () => {
      // 1. Start daemon
      const startResult = await runCliCommand(["daemon", "start"]);
      expect(startResult.code).toBe(0);
      expect(startResult.stdout).toContain("Daemon started");

      // 2. Check daemon status
      const statusResult = await runCliCommand(["daemon", "status"]);
      expect(statusResult.code).toBe(0);
      expect(statusResult.stdout).toContain("GitVan Daemon Status");

      // 3. Start cron scheduler
      const cronStartResult = await runCliCommand(["cron", "start"]);
      expect(cronStartResult.code).toBe(0);

      // 4. Check cron status
      const cronStatusResult = await runCliCommand(["cron", "status"]);
      expect(cronStatusResult.code).toBe(0);

      // 5. Stop daemon
      const stopResult = await runCliCommand(["daemon", "stop"]);
      expect(stopResult.code).toBe(0);
      expect(stopResult.stdout).toContain("Daemon stopped");
    });

    it("should handle event simulation and testing", async () => {
      // 1. Simulate a file change event
      const simulateResult = await runCliCommand([
        "event",
        "simulate",
        "--files",
        "src/**",
      ]);
      expect(simulateResult.code).toBe(0);
      expect(simulateResult.stdout).toContain("Simulated event");

      // 2. Test event predicate
      const testResult = await runCliCommand([
        "event",
        "test",
        "--predicate",
        '{"type":"push","branch":"main"}',
      ]);
      expect(testResult.code).toBe(0);
      expect(testResult.stdout).toContain("Predicate test");

      // 3. Trigger an event
      const triggerResult = await runCliCommand([
        "event",
        "trigger",
        "--type",
        "push",
      ]);
      expect(triggerResult.code).toBe(0);
      expect(triggerResult.stdout).toContain("Event triggered");
    });

    it("should handle audit and receipt management", async () => {
      // 1. Build audit pack
      const buildResult = await runCliCommand([
        "audit",
        "build",
        "--out",
        join(tempDir, "audit.json"),
      ]);
      expect(buildResult.code).toBe(0);
      expect(buildResult.stdout).toContain("Audit pack built");

      // 2. Verify receipts
      const verifyResult = await runCliCommand(["audit", "verify"]);
      expect(verifyResult.code).toBe(0);
      expect(verifyResult.stdout).toContain("Receipt verification");

      // 3. List receipts
      const listResult = await runCliCommand(["audit", "list"]);
      expect(listResult.code).toBe(0);
      expect(listResult.stdout).toContain("Receipts");

      // 4. Show receipt details
      const showResult = await runCliCommand([
        "audit",
        "show",
        "--receipt",
        "test-receipt",
      ]);
      expect(showResult.code).toBe(0);
    });

    it("should handle LLM operations", async () => {
      // 1. Call LLM directly
      const callResult = await runCliCommand([
        "llm",
        "call",
        "What is GitVan?",
      ]);
      expect(callResult.code).toBe(0);
      expect(callResult.stdout).toContain("GitVan");

      // 2. List available models
      const modelsResult = await runCliCommand(["llm", "models"]);
      expect(modelsResult.code).toBe(0);
      expect(modelsResult.stdout).toContain("Available models");

      // 3. Call LLM with custom parameters
      const customResult = await runCliCommand([
        "llm",
        "call",
        "Generate a simple function",
        "--temp",
        "0.7",
      ]);
      expect(customResult.code).toBe(0);
      expect(customResult.stdout.length).toBeGreaterThan(0);
    });
  });

  describe("Error handling and edge cases", () => {
    it("should handle invalid commands gracefully", async () => {
      const result = await runCliCommand(["invalid", "command"]);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain("Unknown command");
    });

    it("should provide help for all commands", async () => {
      const result = await runCliCommand(["help"]);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain("GitVan v2");
      expect(result.stdout).toContain("Usage:");
    });

    it("should handle missing arguments", async () => {
      const result = await runCliCommand(["chat", "draft"]);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain("Prompt required");
    });

    it("should handle malformed arguments", async () => {
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

  describe("Configuration and environment", () => {
    it("should work with playground configuration", async () => {
      const result = await runCliCommand(["job", "list"]);
      expect(result.code).toBe(0);
      // Should find playground jobs
      expect(result.stdout).toContain("Available jobs");
    });

    it("should respect playground settings", async () => {
      const result = await runCliCommand(["daemon", "status"]);
      expect(result.code).toBe(0);
      // Should use playground configuration
      expect(result.stdout).toContain("GitVan Daemon Status");
    });

    it("should handle different working directories", async () => {
      const result = await runCliCommand(["job", "list"], {
        cwd: tempDir,
      });
      expect(result.code).toBe(0);
      // Should handle empty job lists gracefully
      expect(result.stdout).toContain("No jobs found");
    });
  });

  describe("Performance and reliability", () => {
    it("should complete commands within reasonable time", async () => {
      const start = Date.now();
      const result = await runCliCommand(["job", "list"]);
      const duration = Date.now() - start;

      expect(result.code).toBe(0);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it("should handle concurrent operations", async () => {
      // Run multiple commands concurrently
      const promises = [
        runCliCommand(["job", "list"]),
        runCliCommand(["daemon", "status"]),
        runCliCommand(["cron", "list"]),
        runCliCommand(["event", "list"]),
      ];

      const results = await Promise.all(promises);

      // All commands should succeed
      results.forEach((result) => {
        expect(result.code).toBe(0);
      });
    });

    it("should maintain state consistency", async () => {
      // Start daemon
      await runCliCommand(["daemon", "start"]);

      // Check status
      const statusResult = await runCliCommand(["daemon", "status"]);
      expect(statusResult.code).toBe(0);

      // Stop daemon
      await runCliCommand(["daemon", "stop"]);

      // Check status again
      const finalStatusResult = await runCliCommand(["daemon", "status"]);
      expect(finalStatusResult.code).toBe(0);
    });
  });
});
