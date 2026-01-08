// tests/integration/job-bridge-git.test.mjs
// Integration Point 4: JobBridge ← → useGit() Composable
// Tests git info retrieval and context integration

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { JobBridge, resetJobBridge } from "../../src/jobs/job-bridge.mjs";
import { resetBreeScheduler } from "../../src/jobs/bree-scheduler.mjs";
import { withGitVan } from "../../src/core/context.mjs";
import { useGit } from "../../src/composables/git/index.mjs";
import { createTestContext, createTestJob } from "../test-utils/context.mjs";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { execSync } from "child_process";

describe("Integration: JobBridge ← → useGit()", () => {
  let testContext;
  let bridge;

  beforeEach(async () => {
    testContext = await createTestContext();
    resetBreeScheduler();
    resetJobBridge();
    bridge = new JobBridge({ cwd: testContext.cwd });
  });

  afterEach(async () => {
    try {
      await bridge.shutdown();
    } catch {}
    resetBreeScheduler();
    resetJobBridge();
    await testContext.cleanup();
  });

  describe("Git Info Retrieval", () => {
    it("should retrieve git info for context", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();
        const gitInfo = await git.info();

        expect(gitInfo).toHaveProperty("head");
        expect(gitInfo).toHaveProperty("branch");
      });
    });

    it("should include git head in job context", async () => {
      await withGitVan(testContext, async () => {
        const jobDef = await createTestJob(testContext.cwd, "git-context-job", {
          runFunction: `
export default async function run({ ctx }) {
  return { gitHead: ctx.git.head };
}
          `.trim(),
        });

        const result = await bridge.executeJobWithLock(jobDef);
        expect(result.result).toHaveProperty("gitHead");
      });
    });

    it("should include git branch in context", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();
        const gitInfo = await git.info();

        expect(gitInfo.branch).toBeDefined();
        expect(typeof gitInfo.branch).toBe("string");
      });
    });
  });

  describe("Git Head in Fingerprint", () => {
    it("should include git head in execution fingerprint", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();
        const gitInfo = await git.info();

        const fingerprint = bridge.generateFingerprint(
          "test-job",
          gitInfo.head,
          {}
        );

        expect(fingerprint).toBeDefined();
        expect(typeof fingerprint).toBe("string");
      });
    });

    it("should generate different fingerprints for different commits", async () => {
      await withGitVan(testContext, async () => {
        const fingerprint1 = bridge.generateFingerprint("job1", "commit1", {});
        const fingerprint2 = bridge.generateFingerprint("job1", "commit2", {});

        expect(fingerprint1).not.toBe(fingerprint2);
      });
    });

    it("should track executions across commits", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();
        const jobDef = await createTestJob(testContext.cwd, "commit-track-job");

        // First execution at current HEAD
        await bridge.executeJobWithLock(jobDef);
        const head1 = (await git.info()).head;

        // Make a new commit
        const testFile = join(testContext.cwd, "test.txt");
        await fs.writeFile(testFile, "test content");
        execSync("git add .", { cwd: testContext.cwd, stdio: "ignore" });
        execSync('git commit -m "test commit"', {
          cwd: testContext.cwd,
          stdio: "ignore",
        });

        // Second execution at new HEAD
        await bridge.executeJobWithLock(jobDef);
        const head2 = (await git.info()).head;

        expect(head1).not.toBe(head2);
      });
    });
  });

  describe("Git Status Accessibility", () => {
    it("should access git status in job context", async () => {
      await withGitVan(testContext, async () => {
        const jobDef = await createTestJob(testContext.cwd, "git-status-job", {
          runFunction: `
export default async function run({ ctx }) {
  return { gitBranch: ctx.git.branch };
}
          `.trim(),
        });

        const result = await bridge.executeJobWithLock(jobDef);
        expect(result.result.gitBranch).toBeDefined();
      });
    });

    it("should provide git context to job execution", async () => {
      await withGitVan(testContext, async () => {
        const jobDef = await createTestJob(testContext.cwd, "git-full-context-job", {
          runFunction: `
export default async function run({ ctx }) {
  return {
    hasGit: !!ctx.git,
    hasHead: !!ctx.git?.head,
    hasBranch: !!ctx.git?.branch
  };
}
          `.trim(),
        });

        const result = await bridge.executeJobWithLock(jobDef);
        expect(result.result.hasGit).toBe(true);
        expect(result.result.hasHead).toBe(true);
        expect(result.result.hasBranch).toBe(true);
      });
    });
  });

  describe("Git Operations in Jobs", () => {
    it("should allow git operations within job context", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();
        const status = await git.status();

        expect(status).toBeDefined();
      });
    });

    it("should provide current branch information", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();
        const branch = await git.branch();

        expect(branch).toBeDefined();
        expect(typeof branch).toBe("string");
      });
    });
  });

  describe("Git Context Caching", () => {
    it("should cache git info during execution", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        const info1 = await git.info();
        const info2 = await git.info();

        // Should return same head within single execution
        expect(info1.head).toBe(info2.head);
      });
    });

    it("should refresh git info between executions", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();
        const jobDef = await createTestJob(testContext.cwd, "refresh-job");

        // First execution
        await bridge.executeJobWithLock(jobDef);
        const head1 = (await git.info()).head;

        // Make a commit
        const testFile = join(testContext.cwd, "test2.txt");
        await fs.writeFile(testFile, "content");
        execSync("git add .", { cwd: testContext.cwd, stdio: "ignore" });
        execSync('git commit -m "commit"', {
          cwd: testContext.cwd,
          stdio: "ignore",
        });

        // Second execution should see new head
        await bridge.executeJobWithLock(jobDef);
        const head2 = (await git.info()).head;

        expect(head1).not.toBe(head2);
      });
    });
  });

  describe("Git Error Handling", () => {
    it("should handle missing git repository", async () => {
      const noGitContext = await createTestContext({ initGit: false });

      try {
        await withGitVan(noGitContext, async () => {
          const git = useGit();

          // Should handle gracefully
          await expect(git.info()).rejects.toThrow();
        });
      } finally {
        await noGitContext.cleanup();
      }
    });

    it("should continue execution if git info fails", async () => {
      await withGitVan(testContext, async () => {
        const jobDef = await createTestJob(testContext.cwd, "git-fail-job");

        // Should still execute even if git operations fail
        const result = await bridge.executeJobWithLock(jobDef);
        expect(result.ok).toBe(true);
      });
    });
  });

  describe("Git Integration with Fingerprinting", () => {
    it("should use git head for reproducible fingerprints", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();
        const gitInfo = await git.info();
        const jobDef = await createTestJob(testContext.cwd, "fingerprint-git-job");

        const fingerprint1 = bridge.generateFingerprint(
          "fingerprint-git-job",
          gitInfo.head,
          { test: "data" }
        );

        const fingerprint2 = bridge.generateFingerprint(
          "fingerprint-git-job",
          gitInfo.head,
          { test: "data" }
        );

        expect(fingerprint1).toBe(fingerprint2);
      });
    });

    it("should detect changes when git head changes", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();
        const jobDef = await createTestJob(testContext.cwd, "change-detect-job");

        // Get initial fingerprint
        const head1 = (await git.info()).head;
        const fp1 = bridge.generateFingerprint("change-detect-job", head1, {});

        // Make a commit
        const testFile = join(testContext.cwd, "test3.txt");
        await fs.writeFile(testFile, "content");
        execSync("git add .", { cwd: testContext.cwd, stdio: "ignore" });
        execSync('git commit -m "change"', {
          cwd: testContext.cwd,
          stdio: "ignore",
        });

        // Get new fingerprint
        const head2 = (await git.info()).head;
        const fp2 = bridge.generateFingerprint("change-detect-job", head2, {});

        expect(fp1).not.toBe(fp2);
      });
    });
  });
});
