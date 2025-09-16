// tests/playground-e2e.test.mjs
// GitVan v2 — Playground End-to-End Tests
// 80/20 approach: Test critical functionality with minimal test effort

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

describe.skip("GitVan Playground E2E Tests", () => {
  let playgroundDir;
  let originalCwd;

  beforeEach(async () => {
    originalCwd = process.cwd();
    playgroundDir = join(process.cwd(), "playground");

    // Ensure we're in the playground directory
    process.chdir(playgroundDir);
  });

  afterEach(async () => {
    // Restore original working directory
    process.chdir(originalCwd);
  });

  describe("Core 80/20 Functionality", () => {
    it("should discover all jobs correctly", async () => {
      const { stdout } = await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.list())",
      ]);

      expect(stdout).toContain("Discovered jobs:");
      expect(stdout).toContain("docs:changelog");
      expect(stdout).toContain("test:simple");
      expect(stdout).toContain("test:cleanup");
      expect(stdout).toContain("alerts:release");
      
      // Extract job count dynamically
      const totalMatch = stdout.match(/Total: (\d+) jobs/);
      expect(totalMatch).toBeTruthy();
      const jobCount = parseInt(totalMatch[1]);
      expect(jobCount).toBeGreaterThan(0);
    });

    it("should execute changelog job successfully", async () => {
      const { stdout } = await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.run('docs:changelog'))",
      ]);

      expect(stdout).toContain("Running job: docs:changelog");
      expect(stdout).toContain("Status: SUCCESS");
      expect(stdout).toContain("Artifacts: 1");

      // Verify file was created
      const changelogPath = join(playgroundDir, "dist", "CHANGELOG.md");
      const changelogExists = await fs
        .access(changelogPath)
        .then(() => true)
        .catch(() => false);
      expect(changelogExists).toBe(true);

      // Verify content
      const content = await fs.readFile(changelogPath, "utf-8");
      expect(content).toContain("# Changelog");
      expect(content).toContain("Generated at:");
      expect(content).toContain("Recent Changes");
    });

    it("should execute simple job successfully", async () => {
      const { stdout } = await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.run('test:simple'))",
      ]);

      expect(stdout).toContain("Running job: test:simple");
      expect(stdout).toContain("Status: SUCCESS");
      expect(stdout).toContain("Artifacts: 1");

      // Verify file was created
      const reportPath = join(playgroundDir, "dist", "status-report.json");
      const reportExists = await fs
        .access(reportPath)
        .then(() => true)
        .catch(() => false);
      expect(reportExists).toBe(true);

      // Verify content structure
      const content = await fs.readFile(reportPath, "utf-8");
      const report = JSON.parse(content);
      expect(report).toHaveProperty("timestamp");
      expect(report).toHaveProperty("repository");
      expect(report).toHaveProperty("environment");
      expect(report.repository).toHaveProperty("head");
      expect(report.repository).toHaveProperty("branch");
    });

    it("should manage locks correctly", async () => {
      // Run job twice to test locking
      const [result1, result2] = await Promise.all([
        execFileAsync("node", [
          "-e",
          "import('./dev.mjs').then(m=>m.run('test:simple'))",
        ]),
        execFileAsync("node", [
          "-e",
          "import('./dev.mjs').then(m=>m.run('test:simple'))",
        ]),
      ]);

      // At least one should succeed
      const successCount = [result1.stdout, result2.stdout].filter((stdout) =>
        stdout.includes("Status: SUCCESS"),
      ).length;

      expect(successCount).toBeGreaterThan(0);
    });

    it("should write git receipts", async () => {
      // Run a job
      await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.run('test:simple'))",
      ]);

      // Check git notes
      const { stdout } = await execFileAsync("git", [
        "notes",
        "--ref=refs/notes/gitvan/results",
        "show",
        "HEAD",
      ]);

      const receipt = JSON.parse(stdout);
      expect(receipt).toHaveProperty("id", "test:simple");
      expect(receipt).toHaveProperty("ok", true);
      expect(receipt).toHaveProperty("artifacts");
      expect(receipt).toHaveProperty("fingerprint");
    });

    it("should show daemon status", async () => {
      const { stdout } = await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.status())",
      ]);

      expect(stdout).toContain("Daemon is not running");
    });

    it("should show job statistics", async () => {
      const { stdout } = await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.stats())",
      ]);

      expect(stdout).toContain("Job Statistics:");
      expect(stdout).toContain("Total jobs:");
      expect(stdout).toContain("By mode:");
      expect(stdout).toContain("By kind:");
      
      // Extract job count dynamically
      const totalMatch = stdout.match(/Total jobs: (\d+)/);
      expect(totalMatch).toBeTruthy();
      const jobCount = parseInt(totalMatch[1]);
      expect(jobCount).toBeGreaterThan(0);
    });
  });

  describe("Template System Integration", () => {
    it("should render Nunjucks templates correctly", async () => {
      // Run changelog job
      await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.run('docs:changelog'))",
      ]);

      // Check template rendering
      const changelogPath = join(playgroundDir, "dist", "CHANGELOG.md");
      const content = await fs.readFile(changelogPath, "utf-8");

      // Verify template variables were rendered
      expect(content).toMatch(
        /Generated at: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      );
      expect(content).toContain("Total commits:");
      expect(content).toContain("Recent Changes");
      expect(content).toContain("Generated by GitVan Jobs System");
    });
  });

  describe("Git Integration", () => {
    it("should read git log correctly", async () => {
      // Run changelog job
      await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.run('docs:changelog'))",
      ]);

      // Check that git log was processed
      const changelogPath = join(playgroundDir, "dist", "CHANGELOG.md");
      const content = await fs.readFile(changelogPath, "utf-8");

      // Should contain commit hashes and subjects
      expect(content).toMatch(/- \*\*[a-f0-9]{7}\*\* .+/);
    });

    it("should get repository information", async () => {
      // Run simple job
      await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.run('test:simple'))",
      ]);

      // Check repository info in report
      const reportPath = join(playgroundDir, "dist", "status-report.json");
      const content = await fs.readFile(reportPath, "utf-8");
      const report = JSON.parse(content);

      expect(report.repository.head).toMatch(/^[a-f0-9]{7,8}$/);
      expect(report.repository.branch).toBe("main");
      expect(typeof report.repository.isClean).toBe("boolean");
      expect(typeof report.repository.commitCount).toBe("number");
    });
  });

  describe("Hooks System", () => {
    it("should execute custom hooks", async () => {
      const { stdout } = await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.run('test:simple'))",
      ]);

      // Check that playground hooks were executed
      expect(stdout).toContain("[playground] 🚀 Starting job: test:simple");
      expect(stdout).toContain("[playground] ✅ Job done: test:simple OK");
      expect(stdout).toContain("[playground] 🔒 Lock acquired: test:simple");
      expect(stdout).toContain("[playground] 🔓 Lock released: test:simple");
      expect(stdout).toContain("[playground] 📝 Receipt written: test:simple");
    });
  });

  describe("Job Types and Modes", () => {
    it("should handle cron jobs", async () => {
      const { stdout } = await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.list())",
      ]);

      expect(stdout).toContain("test:cleanup         (cron)");
      expect(stdout).toContain("└─ Cron: 0 2 * * *");
    });

    it("should handle event-driven jobs", async () => {
      const { stdout } = await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.list())",
      ]);

      expect(stdout).toContain("alerts:release       (event)");
      expect(stdout).toContain("└─ Events:");
    });

    it("should handle on-demand jobs", async () => {
      const { stdout } = await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.list())",
      ]);

      expect(stdout).toContain("docs:changelog       (on-demand)");
      expect(stdout).toContain("test:simple          (on-demand)");
    });
  });

  describe("Error Handling", () => {
    it("should handle non-existent job gracefully", async () => {
      try {
        await execFileAsync("node", [
          "-e",
          "import('./dev.mjs').then(m=>m.run('nonexistent:job'))",
        ]);
        // If we get here, the test should fail
        expect(true).toBe(false);
      } catch (error) {
        expect(error.stderr).toContain("Job not found: nonexistent:job");
      }
    });

    it("should handle job execution errors", async () => {
      // Create a job that will fail
      const failingJobPath = join(playgroundDir, "jobs", "test", "failing.mjs");
      await fs.writeFile(
        failingJobPath,
        `
import { defineJob } from "gitvan/define";

export default defineJob({
  meta: { desc: "A job that fails" },
  async run() {
    throw new Error("Intentional failure for testing");
  }
});
`,
      );

      try {
        const { stdout } = await execFileAsync("node", [
          "-e",
          "import('./dev.mjs').then(m=>m.run('test:failing'))",
        ]);

        // The job should fail and show error handling
        expect(stdout).toContain("Running job: test:failing");
        expect(stdout).toContain("Intentional failure for testing");
        expect(stdout).toContain("Job failed: test:failing");
      } catch (error) {
        // The job failed as expected, check the output
        expect(error.stdout).toContain("Running job: test:failing");
        expect(error.stdout).toContain("Intentional failure for testing");
      } finally {
        // Clean up
        await fs.unlink(failingJobPath).catch(() => {});
      }
    });
  });

  describe("Performance and Reliability", () => {
    it("should complete jobs within reasonable time", async () => {
      const startTime = Date.now();

      await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.run('test:simple'))",
      ]);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it("should handle concurrent job discovery", async () => {
      const [result1, result2, result3] = await Promise.all([
        execFileAsync("node", ["-e", "import('./dev.mjs').then(m=>m.list())"]),
        execFileAsync("node", ["-e", "import('./dev.mjs').then(m=>m.list())"]),
        execFileAsync("node", ["-e", "import('./dev.mjs').then(m=>m.list())"]),
      ]);

      // All should return the same result
      expect(result1.stdout).toContain("Total: 10 jobs");
      expect(result2.stdout).toContain("Total: 10 jobs");
      expect(result3.stdout).toContain("Total: 10 jobs");
    });
  });

  describe("Integration with GitVan Core", () => {
    it("should use correct GitVan configuration", async () => {
      // Test that the playground uses the correct configuration
      // by checking the gitvan.config.js file exists and has correct content
      const configPath = join(playgroundDir, "gitvan.config.js");
      const configExists = await fs
        .access(configPath)
        .then(() => true)
        .catch(() => false);
      expect(configExists).toBe(true);

      const configContent = await fs.readFile(configPath, "utf-8");
      expect(configContent).toContain("refs/notes/gitvan/results");
      expect(configContent).toContain("jobs");
      expect(configContent).toContain("templates");
    });

    it("should integrate with all core systems", async () => {
      // This test validates that all core systems work together
      const { stdout } = await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.run('docs:changelog'))",
      ]);

      // Should show integration of:
      // - Job discovery
      // - Git operations
      // - Template rendering
      // - Lock management
      // - Receipt writing
      // - Hooks execution

      expect(stdout).toContain("Running job: docs:changelog");
      expect(stdout).toContain("Status: SUCCESS");
      expect(stdout).toContain("Artifacts: 1");
      expect(stdout).toContain("[playground]");
    });
  });
});
