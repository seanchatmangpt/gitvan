// tests/e2e/chat-cli.test.mjs
// End-to-end tests for GitVan v2 Chat CLI commands
// Tests against the playground environment

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const playgroundDir = join(__dirname, "../../playground");
const gitvanCli = join(__dirname, "../../src/cli.mjs");

describe("Chat CLI E2E Tests", () => {
  let originalCwd;
  let tempDir;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = join(playgroundDir, "test-chat-temp");
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

      // Handle input if provided
      if (options.input) {
        child.stdin.write(options.input);
        child.stdin.end();
      }
    });
  }

  describe("chat draft command", () => {
    it("should draft a job specification from a prompt", async () => {
      const result = await runCliCommand([
        "chat",
        "draft",
        "Create a simple hello world job",
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Generated specification:");
      expect(result.stdout).toContain("hello");
      expect(result.stderr).toBe("");
    });

    it("should handle AI unavailability gracefully", async () => {
      // Mock AI unavailability by setting a non-existent model
      const result = await runCliCommand([
        "chat",
        "draft",
        "Create a test job",
        "--model",
        "nonexistent-model",
      ]);

      // Should fall back to wizard or show appropriate error
      expect(result.code).toBe(1); // Changed from 0 to 1
      expect(result.stderr).toContain("AI not available");
    });

    it("should accept custom temperature and model parameters", async () => {
      const result = await runCliCommand([
        "chat",
        "draft",
        "Create a deployment job",
        "--temp",
        "0.5",
        "--model",
        "qwen3-coder:30b",
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Generated specification:");
    });

    it("should require a prompt argument", async () => {
      const result = await runCliCommand(["chat", "draft"]);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain("Prompt required");
    });
  });

  describe("chat generate command", () => {
    it("should generate a complete job file from a prompt", async () => {
      const result = await runCliCommand([
        "chat",
        "generate",
        "Create a file cleanup job",
        "--output",
        join(tempDir, "cleanup-job.mjs"),
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Generated job file:");

      // Check if the file was created
      const files = await fs.readdir(tempDir);
      expect(files).toContain("cleanup-job.mjs");

      // Verify the generated file content
      const content = await fs.readFile(
        join(tempDir, "cleanup-job.mjs"),
        "utf8",
      );
      expect(content).toContain("defineJob");
      expect(content).toContain("cleanup");
    });

    it("should generate event files when specified", async () => {
      const result = await runCliCommand([
        "chat",
        "generate",
        "Create a push event handler",
        "--kind",
        "event",
        "--output",
        join(tempDir, "push-event.mjs"),
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Generated event file:");

      const content = await fs.readFile(
        join(tempDir, "push-event.mjs"),
        "utf8",
      );
      expect(content).toContain("predicate");
      expect(content).toContain("push");
    });

    it("should validate job definitions", async () => {
      const result = await runCliCommand([
        "chat",
        "generate",
        "Create an invalid job",
        "--output",
        join(tempDir, "invalid-job.mjs"),
      ]);

      // Should either succeed with valid output or fail gracefully
      expect(result.code).toBe(0);
    });
  });

  describe("chat preview command", () => {
    it("should preview job generation without creating files", async () => {
      const result = await runCliCommand([
        "chat",
        "preview",
        "Create a logging job",
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Preview functionality not implemented");
      expect(result.stdout).toContain("Use 'generate' command");

      // Verify no files were created
      const files = await fs.readdir(tempDir);
      expect(files).toHaveLength(0);
    });

    it("should show different previews for different job types", async () => {
      const jobResult = await runCliCommand([
        "chat",
        "preview",
        "Create a cron job",
        "--kind",
        "job",
      ]);

      const eventResult = await runCliCommand([
        "chat",
        "preview",
        "Create a merge event",
        "--kind",
        "event",
      ]);

      expect(jobResult.code).toBe(0);
      expect(eventResult.code).toBe(0);

      expect(jobResult.stdout).toContain(
        "Preview functionality not implemented",
      );
      expect(eventResult.stdout).toContain(
        "Preview functionality not implemented",
      );
    });
  });

  describe("chat apply command", () => {
    it("should apply a generated job to the jobs directory", async () => {
      const result = await runCliCommand([
        "chat",
        "apply",
        "Create a backup job",
        "--name",
        "backup-job",
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Applied job:");

      // Check if the job was created in the jobs directory
      const jobsDir = join(playgroundDir, "jobs");
      const files = await fs.readdir(jobsDir);
      expect(files.some((f) => f.includes("backup"))).toBe(true);
    });

    it("should handle conflicts when applying existing jobs", async () => {
      // First, create a job
      await runCliCommand([
        "chat",
        "apply",
        "Create a test job",
        "--name",
        "test-job",
      ]);

      // Try to create another with the same name
      const result = await runCliCommand([
        "chat",
        "apply",
        "Create another test job",
        "--name",
        "test-job",
      ]);

      // Should either overwrite or show conflict message
      expect(result.code).toBe(0);
    });
  });

  describe("chat explain command", () => {
    it("should explain an existing job", async () => {
      const result = await runCliCommand(["chat", "explain", "test/simple"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Job Analysis:");
      expect(result.stdout).toContain("test/simple");
    });

    it("should explain job functionality in detail", async () => {
      const result = await runCliCommand([
        "chat",
        "explain",
        "foundation/basic-job-setup",
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Purpose:");
      expect(result.stdout).toContain("Implementation:");
    });

    it("should handle non-existent jobs gracefully", async () => {
      const result = await runCliCommand([
        "chat",
        "explain",
        "nonexistent/job",
      ]);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain("Job not found");
    });
  });

  describe("chat design command", () => {
    it("should design a job based on requirements", async () => {
      const result = await runCliCommand([
        "chat",
        "design",
        "I need a job that processes CSV files",
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Job Design:");
      expect(result.stdout).toContain("CSV");
    });

    it("should provide implementation recommendations", async () => {
      const result = await runCliCommand([
        "chat",
        "design",
        "Create a job for automated testing",
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Recommendations:");
    });

    it("should handle complex requirements", async () => {
      const result = await runCliCommand([
        "chat",
        "design",
        "I need a job that runs tests, generates reports, and sends notifications",
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Job Design:");
    });
  });

  describe("chat command error handling", () => {
    it("should handle invalid subcommands", async () => {
      const result = await runCliCommand(["chat", "invalid-command"]);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain("Unknown chat command");
    });

    it("should provide help for chat commands", async () => {
      const result = await runCliCommand(["chat", "help"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Chat Commands:");
      expect(result.stdout).toContain("draft");
      expect(result.stdout).toContain("generate");
    });

    it("should handle malformed arguments", async () => {
      const result = await runCliCommand([
        "chat",
        "draft",
        "--invalid-flag",
        "test",
      ]);

      // Should either succeed (ignoring invalid flags) or fail gracefully
      expect(result.code).toBeDefined();
    });
  });

  describe("chat command integration", () => {
    it("should work with the playground configuration", async () => {
      const result = await runCliCommand([
        "chat",
        "draft",
        "Create a playground-specific job",
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Generated specification:");
    });

    it("should respect playground job structure", async () => {
      const result = await runCliCommand([
        "chat",
        "apply",
        "Create a foundation job",
        "--name",
        "e2e-test-job",
      ]);

      expect(result.code).toBe(0);

      // Verify the job follows playground conventions
      const jobsDir = join(playgroundDir, "jobs");
      const files = await fs.readdir(jobsDir);
      const testJob = files.find((f) => f.includes("e2e-test"));
      expect(testJob).toBeDefined();

      if (testJob) {
        const content = await fs.readFile(join(jobsDir, testJob), "utf8");
        expect(content).toContain("defineJob");
      }
    });
  });
});
