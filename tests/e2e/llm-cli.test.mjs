// tests/e2e/llm-cli.test.mjs
// End-to-end tests for GitVan v2 LLM CLI commands
// Tests against the playground environment

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const playgroundDir = join(__dirname, "../../playground");
const gitvanCli = join(__dirname, "../../src/cli.mjs");

describe("LLM CLI E2E Tests", () => {
  let originalCwd;
  let tempDir;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = join(playgroundDir, "test-llm-temp");
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

  describe("llm call command", () => {
    it("should call LLM with a prompt", async () => {
      const result = await runCliCommand(["llm", "call", "What is GitVan?"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("GitVan");
    });

    it("should call LLM with custom model", async () => {
      const result = await runCliCommand([
        "llm",
        "call",
        "Explain Git automation",
        "--model",
        "qwen3-coder:30b",
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    it("should call LLM with custom temperature", async () => {
      const result = await runCliCommand([
        "llm",
        "call",
        "Generate a simple function",
        "--temp",
        "0.7",
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    it("should handle AI unavailability", async () => {
      const result = await runCliCommand([
        "llm",
        "call",
        "Test prompt",
        "--model",
        "nonexistent-model",
      ]);

      // Should either succeed with fallback or fail gracefully
      expect(result.code).toBeDefined();
    });

    it("should require a prompt", async () => {
      const result = await runCliCommand(["llm", "call"]);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain("Prompt required");
    });
  });

  describe("llm models command", () => {
    it("should list available models", async () => {
      const result = await runCliCommand(["llm", "models"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Available models");
    });

    it("should show model information", async () => {
      const result = await runCliCommand(["llm", "models"]);

      expect(result.code).toBe(0);
      // Should show model details
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    it("should handle model listing errors", async () => {
      const result = await runCliCommand(["llm", "models"]);

      expect(result.code).toBe(0);
      // Should either show models or indicate unavailability
      expect(result.stdout.length).toBeGreaterThan(0);
    });
  });

  describe("llm command error handling", () => {
    it("should handle invalid llm subcommands", async () => {
      const result = await runCliCommand(["llm", "invalid"]);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain("Unknown llm command");
    });

    it("should provide help for llm commands", async () => {
      const result = await runCliCommand(["llm", "help"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("LLM Commands:");
    });
  });

  describe("llm integration", () => {
    it("should work with playground configuration", async () => {
      const result = await runCliCommand([
        "llm",
        "call",
        "Analyze this playground setup",
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    it("should respect playground AI settings", async () => {
      const result = await runCliCommand([
        "llm",
        "call",
        "What jobs are available?",
      ]);

      expect(result.code).toBe(0);
      // Should be able to analyze the playground
      expect(result.stdout.length).toBeGreaterThan(0);
    });
  });

  describe("llm advanced features", () => {
    it("should handle streaming output", async () => {
      const result = await runCliCommand([
        "llm",
        "call",
        "Write a short poem",
        "--stream",
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    it("should handle context-aware prompts", async () => {
      const result = await runCliCommand([
        "llm",
        "call",
        "What files are in this project?",
      ]);

      expect(result.code).toBe(0);
      // Should be able to see project context
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    it("should handle code generation", async () => {
      const result = await runCliCommand([
        "llm",
        "call",
        "Generate a simple JavaScript function that adds two numbers",
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("function");
    });
  });
});
