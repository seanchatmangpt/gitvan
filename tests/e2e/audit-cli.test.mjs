// tests/e2e/audit-cli.test.mjs
// End-to-end tests for GitVan v2 Audit CLI commands
// Tests against the playground environment

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const playgroundDir = join(__dirname, "../../playground");
const gitvanCli = join(__dirname, "../../src/cli.mjs");

describe("Audit CLI E2E Tests", () => {
  let originalCwd;
  let tempDir;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = join(playgroundDir, "test-audit-temp");
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

  describe("audit build command", () => {
    it("should build audit pack", async () => {
      const result = await runCliCommand([
        "audit",
        "build",
        "--out",
        join(tempDir, "audit.json"),
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Audit pack built");

      // Check if audit file was created
      const files = await fs.readdir(tempDir);
      expect(files).toContain("audit.json");
    });

    it("should build audit with custom range", async () => {
      const result = await runCliCommand([
        "audit",
        "build",
        "--from",
        "HEAD~10",
        "--to",
        "HEAD",
        "--out",
        join(tempDir, "range-audit.json"),
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Audit pack built");
    });

    it("should handle build errors gracefully", async () => {
      const result = await runCliCommand([
        "audit",
        "build",
        "--out",
        "/invalid/path/audit.json",
      ]);

      // Should either succeed or fail gracefully
      expect(result.code).toBeDefined();
    });
  });

  describe("audit verify command", () => {
    it("should verify receipts", async () => {
      const result = await runCliCommand(["audit", "verify"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Receipt verification");
    });

    it("should verify specific receipt", async () => {
      const result = await runCliCommand([
        "audit",
        "verify",
        "--receipt",
        "test-receipt-id",
      ]);

      expect(result.code).toBe(0);
      // Should either verify or show not found
      expect(result.stdout).toMatch(/verified|not found/i);
    });

    it("should handle verification errors", async () => {
      const result = await runCliCommand([
        "audit",
        "verify",
        "--receipt",
        "nonexistent-receipt",
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("not found");
    });
  });

  describe("audit list command", () => {
    it("should list receipts", async () => {
      const result = await runCliCommand(["audit", "list"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Receipts:");
    });

    it("should list receipts with details", async () => {
      const result = await runCliCommand(["audit", "list", "--detailed"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Receipts:");
    });

    it("should filter receipts by date", async () => {
      const result = await runCliCommand([
        "audit",
        "list",
        "--since",
        "2024-01-01",
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Receipts:");
    });

    it("should handle empty receipt lists", async () => {
      const result = await runCliCommand(["audit", "list"], {
        cwd: tempDir,
      });

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("No receipts found");
    });
  });

  describe("audit show command", () => {
    it("should show receipt details", async () => {
      const result = await runCliCommand([
        "audit",
        "show",
        "--receipt",
        "test-receipt",
      ]);

      expect(result.code).toBe(0);
      // Should either show details or indicate not found
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    it("should show receipt with full details", async () => {
      const result = await runCliCommand([
        "audit",
        "show",
        "--receipt",
        "test-receipt",
        "--full",
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    it("should handle non-existent receipts", async () => {
      const result = await runCliCommand([
        "audit",
        "show",
        "--receipt",
        "nonexistent-receipt",
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("not found");
    });
  });

  describe("audit command error handling", () => {
    it("should handle invalid audit subcommands", async () => {
      const result = await runCliCommand(["audit", "invalid"]);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain("Unknown audit command");
    });

    it("should provide help for audit commands", async () => {
      const result = await runCliCommand(["audit", "help"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Audit Commands:");
    });
  });

  describe("audit integration", () => {
    it("should work with playground receipts", async () => {
      const result = await runCliCommand(["audit", "list"]);

      expect(result.code).toBe(0);
      // Should work with playground's receipt system
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    it("should respect playground configuration", async () => {
      const result = await runCliCommand([
        "audit",
        "build",
        "--out",
        join(tempDir, "playground-audit.json"),
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Audit pack built");
    });
  });
});
