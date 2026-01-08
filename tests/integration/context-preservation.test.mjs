// tests/integration/context-preservation.test.mjs
// Integration Point 9: Context Preservation Through Async Boundaries
// Tests unctx context preservation across await calls

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { withGitVan, useGitVan } from "../../src/core/context.mjs";
import { useGit } from "../../src/composables/git/index.mjs";
import { useJob } from "../../src/composables/job.mjs";
import { useLock } from "../../src/composables/lock.mjs";
import { createTestContext, createTestJob } from "../test-utils/context.mjs";
import { sleep } from "../test-utils/helpers.mjs";

describe("Integration: Context Preservation Through Async Boundaries", () => {
  let testContext;

  beforeEach(async () => {
    testContext = await createTestContext();
  });

  afterEach(async () => {
    await testContext.cleanup();
  });

  describe("Composables Within withGitVan Context", () => {
    it("should access composables inside withGitVan()", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();
        const job = useJob();
        const lock = useLock();

        expect(git).toBeDefined();
        expect(job).toBeDefined();
        expect(lock).toBeDefined();
      });
    });

    it("should fail to access composables outside withGitVan()", async () => {
      expect(() => {
        const git = useGit();
      }).toThrow();
    });

    it("should maintain context across await calls", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        await sleep(10);

        // Context should still be available after await
        const info = await git.info();
        expect(info).toBeDefined();
      });
    });

    it("should preserve context through multiple awaits", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();
        const lock = useLock();

        await sleep(10);
        await sleep(10);
        await sleep(10);

        // Context should still work after multiple awaits
        const info = await git.info();
        const acquired = await lock.acquire("test-lock");

        expect(info).toBeDefined();
        expect(acquired).toBe(true);

        await lock.release("test-lock");
      });
    });
  });

  describe("Lazy Initialization Within Context", () => {
    it("should support lazy initialization of composables", async () => {
      await withGitVan(testContext, async () => {
        // First await
        await sleep(10);

        // Initialize composable after await
        const git = useGit();
        expect(git).toBeDefined();

        // Use composable after initialization
        const info = await git.info();
        expect(info).toBeDefined();
      });
    });

    it("should allow composable creation at any point in context", async () => {
      await withGitVan(testContext, async () => {
        await sleep(10);
        const git1 = useGit();

        await sleep(10);
        const git2 = useGit();

        await sleep(10);
        const lock = useLock();

        expect(git1).toBeDefined();
        expect(git2).toBeDefined();
        expect(lock).toBeDefined();
      });
    });
  });

  describe("Multiple Async Operations", () => {
    it("should handle sequential async operations", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();
        const lock = useLock();

        // Sequential operations
        const info = await git.info();
        const acquired = await lock.acquire("seq-lock");
        await sleep(10);
        await lock.release("seq-lock");

        expect(info).toBeDefined();
        expect(acquired).toBe(true);
      });
    });

    it("should handle parallel async operations", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();
        const lock = useLock();
        const job = useJob();

        // Parallel operations
        const [info, acquired, jobs] = await Promise.all([
          git.info(),
          lock.acquire("parallel-lock"),
          job.list(),
        ]);

        expect(info).toBeDefined();
        expect(acquired).toBe(true);
        expect(Array.isArray(jobs)).toBe(true);

        await lock.release("parallel-lock");
      });
    });

    it("should handle nested async operations", async () => {
      await withGitVan(testContext, async () => {
        const job = useJob();

        const jobDef = await createTestJob(testContext.cwd, "nested-job", {
          runFunction: `
export default async function run({ ctx }) {
  // Nested async operation
  await new Promise(resolve => setTimeout(resolve, 10));
  return { success: true };
}
          `.trim(),
        });

        // Nested operation through job execution
        const result = await job.run("nested-job");
        expect(result).toBeDefined();
      });
    });
  });

  describe("Nested Contexts", () => {
    it("should support nested withGitVan calls", async () => {
      await withGitVan(testContext, async () => {
        const outer = useGit();

        await withGitVan(testContext, async () => {
          const inner = useGit();

          expect(outer).toBeDefined();
          expect(inner).toBeDefined();
        });
      });
    });

    it("should maintain separate context scopes", async () => {
      const context2 = await createTestContext({ prefix: "gitvan-test-2" });

      try {
        await withGitVan(testContext, async () => {
          const git1 = useGit();

          await withGitVan(context2, async () => {
            const git2 = useGit();

            // Both contexts should be accessible
            expect(git1).toBeDefined();
            expect(git2).toBeDefined();
          });
        });
      } finally {
        await context2.cleanup();
      }
    });
  });

  describe("Context Not Leaked Between Parallel Executions", () => {
    it("should isolate context between parallel executions", async () => {
      const results = await Promise.all([
        withGitVan(testContext, async () => {
          await sleep(10);
          const git = useGit();
          return git.cwd;
        }),
        withGitVan(testContext, async () => {
          await sleep(15);
          const git = useGit();
          return git.cwd;
        }),
        withGitVan(testContext, async () => {
          await sleep(5);
          const git = useGit();
          return git.cwd;
        }),
      ]);

      // All should have their own context
      expect(results).toHaveLength(3);
      results.forEach((cwd) => expect(cwd).toBeDefined());
    });

    it("should not share state between parallel contexts", async () => {
      const locks = await Promise.all([
        withGitVan(testContext, async () => {
          const lock = useLock();
          await lock.acquire("lock-1");
          return lock.isLocked("lock-1");
        }),
        withGitVan(testContext, async () => {
          const lock = useLock();
          await lock.acquire("lock-2");
          return lock.isLocked("lock-2");
        }),
      ]);

      expect(locks[0]).toBe(true);
      expect(locks[1]).toBe(true);
    });
  });

  describe("Error Handling Preserves Context", () => {
    it("should maintain context after caught error", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        try {
          // Intentional error
          throw new Error("Test error");
        } catch {}

        // Context should still be available
        const info = await git.info();
        expect(info).toBeDefined();
      });
    });

    it("should cleanup context on unhandled error", async () => {
      try {
        await withGitVan(testContext, async () => {
          const git = useGit();
          throw new Error("Unhandled error");
        });
      } catch {}

      // Context should not be available outside
      expect(() => {
        const git = useGit();
      }).toThrow();
    });

    it("should handle errors in composable operations", async () => {
      await withGitVan(testContext, async () => {
        const job = useJob();

        try {
          await job.get("non-existent-job");
        } catch {}

        // Context should still work
        const jobs = await job.list();
        expect(Array.isArray(jobs)).toBe(true);
      });
    });
  });

  describe("Context with Job Execution", () => {
    it("should preserve context during job execution", async () => {
      await withGitVan(testContext, async () => {
        const job = useJob();
        const jobDef = await createTestJob(testContext.cwd, "context-job", {
          runFunction: `
export default async function run({ ctx }) {
  // Job should receive context
  return { hasCwd: !!ctx.cwd, hasEnv: !!ctx.env, hasGit: !!ctx.git };
}
          `.trim(),
        });

        const result = await job.run("context-job");
        expect(result.hasCwd).toBe(true);
        expect(result.hasEnv).toBe(true);
        expect(result.hasGit).toBe(true);
      });
    });

    it("should maintain context across job lifecycle", async () => {
      await withGitVan(testContext, async () => {
        const job = useJob();
        const jobDef = await createTestJob(testContext.cwd, "lifecycle-job");

        // Context should work before execution
        const beforeJobs = await job.list();

        // During execution
        await job.run("lifecycle-job");

        // After execution
        const afterStatus = await job.status("lifecycle-job");

        expect(Array.isArray(beforeJobs)).toBe(true);
        expect(afterStatus).toBeDefined();
      });
    });
  });

  describe("useGitVan() Access", () => {
    it("should access context with useGitVan()", async () => {
      await withGitVan(testContext, async () => {
        const ctx = useGitVan();

        expect(ctx).toBeDefined();
        expect(ctx.cwd).toBe(testContext.cwd);
      });
    });

    it("should fail useGitVan() outside context", async () => {
      expect(() => {
        const ctx = useGitVan();
      }).toThrow();
    });

    it("should access context after async operations", async () => {
      await withGitVan(testContext, async () => {
        await sleep(10);

        const ctx = useGitVan();
        expect(ctx).toBeDefined();
      });
    });
  });

  describe("Complex Context Scenarios", () => {
    it("should handle long-running operations", async () => {
      await withGitVan(testContext, async () => {
        const job = useJob();

        // Simulate long operation
        await sleep(100);

        // Context should still be valid
        const jobs = await job.list();
        expect(Array.isArray(jobs)).toBe(true);
      });
    });

    it("should handle many sequential operations", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        // Many operations
        for (let i = 0; i < 10; i++) {
          await sleep(5);
          const info = await git.info();
          expect(info).toBeDefined();
        }
      });
    });

    it("should handle complex control flow", async () => {
      await withGitVan(testContext, async () => {
        const job = useJob();
        const lock = useLock();

        if (true) {
          await sleep(10);
        }

        while (false) {
          await sleep(10);
        }

        for (let i = 0; i < 2; i++) {
          await sleep(5);
        }

        // Context should still work
        const jobs = await job.list();
        const acquired = await lock.acquire("complex-lock");

        expect(jobs).toBeDefined();
        expect(acquired).toBe(true);

        await lock.release("complex-lock");
      });
    });
  });
});
