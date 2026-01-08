// tests/integration/bree-{COMPONENT}-integration.test.mjs
// GitVan v4.0.0 — Bree {COMPONENT} Integration Tests
// Tests integration between Bree scheduler and {COMPONENT}

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { withGitVan } from "../../src/core/context.mjs";
import { useJob } from "../../src/composables/job.mjs";
import { useGit } from "../../src/composables/git/index.mjs";
import { useLock } from "../../src/composables/lock.mjs";
import { useReceipt } from "../../src/composables/receipt.mjs";
import { getBreeScheduler, resetBreeScheduler } from "../../src/jobs/bree-scheduler.mjs";
import { getJobBridge, resetJobBridge } from "../../src/jobs/job-bridge.mjs";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { execSync } from "child_process";

describe("Bree {COMPONENT} Integration", () => {
  let tempDir;
  let jobsDir;

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = join(process.cwd(), "test-bree-{component}");
    jobsDir = join(tempDir, "jobs");
    await fs.mkdir(jobsDir, { recursive: true });

    // Initialize git repository
    execSync("git init", { cwd: tempDir });
    execSync('git config user.name "Test User"', { cwd: tempDir });
    execSync('git config user.email "test@example.com"', { cwd: tempDir });

    // Create initial commit
    await fs.writeFile(join(tempDir, "README.md"), "# Test Repository");
    execSync("git add .", { cwd: tempDir });
    execSync('git commit -m "Initial commit"', { cwd: tempDir });

    // Reset singletons
    resetBreeScheduler();
    resetJobBridge();
  });

  afterEach(async () => {
    // Clean up scheduler
    try {
      const scheduler = getBreeScheduler({ cwd: tempDir });
      await scheduler.shutdown();
    } catch (error) {
      // Scheduler may not be initialized
    }

    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Directory may not exist
    }

    // Reset singletons
    resetBreeScheduler();
    resetJobBridge();
  });

  describe("{Feature 1}", () => {
    it("should {expected behavior}", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        // Create test job
        await fs.writeFile(
          join(jobsDir, "test-job.mjs"),
          `
export const meta = {
  name: "Test Job",
  desc: "Integration test job",
  tags: ["test"]
};

export default async function run({ payload, ctx }) {
  // Job implementation
  return { ok: true, result: "success" };
}
          `.trim()
        );

        // Get composables
        const job = useJob();
        const git = useGit();

        // Test implementation
        const result = await job.run("test-job");

        // Assertions
        expect(result).toBeDefined();
        expect(result.ok).toBe(true);
      });
    });

    it("should handle {edge case}", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        // Test edge case implementation
      });
    });
  });

  describe("{Feature 2}", () => {
    it("should {expected behavior}", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        // Test implementation
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle {error scenario}", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        // Test error handling
        await expect(async () => {
          // Code that should throw
        }).rejects.toThrow("Expected error message");
      });
    });
  });

  describe("Cleanup", () => {
    it("should clean up resources", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        const job = useJob();

        // Create and run job
        await fs.writeFile(
          join(jobsDir, "cleanup-job.mjs"),
          `
export const meta = { name: "Cleanup Job", desc: "Test", tags: [] };
export default async function run() { return { ok: true }; }
          `.trim()
        );

        await job.runWithLock("cleanup-job");

        // Verify cleanup
        const lock = useLock();
        const isLocked = await lock.isLocked("job-cleanup-job");

        expect(isLocked).toBe(false);
      });
    });
  });
});

/*
 * TEMPLATE INSTRUCTIONS:
 *
 * 1. Replace {COMPONENT} with: context-management, git, workflow, etc.
 * 2. Replace {component} with lowercase version
 * 3. Replace {Feature 1}, {Feature 2} with actual features being tested
 * 4. Replace {expected behavior} with specific test descriptions
 * 5. Implement test logic in each it() block
 *
 * VALIDATION CHECKLIST:
 * - [ ] Setup creates temp directory
 * - [ ] Setup initializes git repo
 * - [ ] Setup creates jobs directory
 * - [ ] Tests use withGitVan() wrapper
 * - [ ] Tests verify expected behavior
 * - [ ] Tests verify error handling
 * - [ ] Tests verify cleanup
 * - [ ] Cleanup removes temp directory
 * - [ ] Cleanup resets singletons
 *
 * COMMON PATTERNS:
 *
 * 1. Create test job:
 *    await fs.writeFile(join(jobsDir, "job.mjs"), jobCode)
 *
 * 2. Run job:
 *    const result = await job.run("job-name")
 *
 * 3. Run job with lock:
 *    const result = await job.runWithLock("job-name")
 *
 * 4. Check lock status:
 *    const isLocked = await lock.isLocked("job-name")
 *
 * 5. Get job history:
 *    const history = await job.history("job-name")
 *
 * 6. Verify git ref:
 *    const exists = await git.refExists("refs/gitvan/locks/job-name")
 *
 * 7. Get git info:
 *    const info = await git.info()
 *
 * 8. Schedule job:
 *    await job.schedule("job-name", { cron: "0 * * * *" })
 *
 * 9. Get scheduler status:
 *    const status = job.getSchedulerStatus()
 *
 * 10. Verify receipt:
 *     const receipts = await job.history("job-name")
 *     expect(receipts[0]).toHaveProperty("fingerprint")
 */
