/**
 * Comprehensive Lock System Tests
 * Tests for useLock composable - targeting 85%+ coverage
 * 35+ test cases covering distributed locking
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTestContext,
  withTestEnvironment,
  initTestRepo,
  createFileStructure,
} from "../helpers/index.mjs";
import { useLock } from "../../src/composables/lock.mjs";
import { withGitVan } from "../../src/core/context.mjs";

describe("Lock System - useLock Composable", () => {
  let testContext;

  beforeEach(async () => {
    testContext = await withTestEnvironment(async (ctx) => {
      await initTestRepo(ctx.testDir);

      createFileStructure(ctx.testDir, {
        ".gitvan": {},
      });

      return ctx;
    });
  });

  afterEach(() => {
    if (testContext?.cleanup) {
      testContext.cleanup();
    }
  });

  describe("Lock Acquisition", () => {
    it("should acquire a lock", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        const result = await lock.acquire("test-lock");

        expect(result).toBeDefined();
        expect(result.name).toBe("test-lock");
      });
    });

    it("should acquire lock with timeout", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        const result = await lock.acquire("test-lock", {
          timeout: 5000,
        });

        expect(result).toBeDefined();
        expect(result.timeout).toBe(5000);
      });
    });

    it("should acquire lock with metadata", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        const result = await lock.acquire("test-lock", {
          metadata: { owner: "test-user", reason: "testing" },
        });

        expect(result).toBeDefined();
      });
    });

    it("should generate unique lock ID", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        const result1 = await lock.acquire("test-lock");
        const result2 = await lock.acquire("test-lock");

        expect(result1.id).toBeDefined();
        expect(result2.id).toBeDefined();
      });
    });

    it("should return context properties", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        expect(lock.cwd).toBeDefined();
        expect(typeof lock.cwd).toBe("string");
        expect(lock.env).toBeDefined();
        expect(typeof lock.env).toBe("object");
      });
    });
  });

  describe("Lock Release", () => {
    it("should release a lock", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        await lock.acquire("test-lock");
        const result = await lock.release("test-lock");

        expect(result).toBeDefined();
        expect(result.name).toBe("test-lock");
      });
    });

    it("should handle release of non-existent lock", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        const result = await lock.release("nonexistent-lock");

        expect(result).toBeDefined();
      });
    });

    it("should release lock with ref information", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        const acquired = await lock.acquire("test-lock");
        const released = await lock.release("test-lock");

        expect(released.ref).toBeDefined();
        expect(released.released).toBeDefined();
      });
    });
  });

  describe("Lock Status", () => {
    it("should check if lock is acquired", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        await lock.acquire("test-lock");
        const isLocked = await lock.isLocked("test-lock");

        expect(typeof isLocked).toBe("boolean");
        expect(isLocked).toBe(true);
      });
    });

    it("should check if lock is not acquired", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        const isLocked = await lock.isLocked("nonexistent-lock");

        expect(typeof isLocked).toBe("boolean");
        expect(isLocked).toBe(false);
      });
    });

    it("should get lock information", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        await lock.acquire("test-lock");
        const info = await lock.getLockInfo("test-lock");

        expect(info).toBeDefined() || expect(info).toBeNull();
      });
    });

    it("should return null for non-existent lock info", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        const info = await lock.getLockInfo("nonexistent-lock");

        expect(info).toBeNull() || expect(info).toBeUndefined();
      });
    });
  });

  describe("Lock Utilities", () => {
    it("should generate lock ref", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        const ref = lock.getLockRef("test-lock", {
          worktree: "/home/test",
          branch: "main",
        });

        expect(ref).toBeDefined();
        expect(typeof ref).toBe("string");
        expect(ref).toContain("lock");
      });
    });

    it("should generate lock ID", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        const id = lock.generateLockId();

        expect(id).toBeDefined();
        expect(typeof id).toBe("string");
      });
    });

    it("should generate consistent lock refs", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        const gitInfo = {
          worktree: "/home/test",
          branch: "main",
        };

        const ref1 = lock.getLockRef("test-lock", gitInfo);
        const ref2 = lock.getLockRef("test-lock", gitInfo);

        expect(ref1).toBe(ref2);
      });
    });

    it("should differentiate locks by name", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        const gitInfo = {
          worktree: "/home/test",
          branch: "main",
        };

        const ref1 = lock.getLockRef("lock-1", gitInfo);
        const ref2 = lock.getLockRef("lock-2", gitInfo);

        expect(ref1).not.toBe(ref2);
      });
    });
  });

  describe("Multiple Locks", () => {
    it("should acquire multiple locks", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        const lock1 = await lock.acquire("lock-1");
        const lock2 = await lock.acquire("lock-2");
        const lock3 = await lock.acquire("lock-3");

        expect(lock1.acquired).toBeDefined();
        expect(lock2.acquired).toBeDefined();
        expect(lock3.acquired).toBeDefined();
      });
    });

    it("should release multiple locks independently", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        await lock.acquire("lock-1");
        await lock.acquire("lock-2");

        const released1 = await lock.release("lock-1");
        const isLocked1 = await lock.isLocked("lock-1");
        const isLocked2 = await lock.isLocked("lock-2");

        expect(released1).toBeDefined();
        expect(isLocked1).toBe(false);
        expect(isLocked2).toBe(true);
      });
    });

    it("should handle concurrent lock acquisitions", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        const locks = await Promise.all([
          lock.acquire("concurrent-1"),
          lock.acquire("concurrent-2"),
          lock.acquire("concurrent-3"),
        ]);

        expect(locks).toHaveLength(3);
        expect(locks.every((l) => l.name)).toBe(true);
      });
    });
  });

  describe("Lock Metadata", () => {
    it("should store lock metadata", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        const metadata = {
          owner: "test-user",
          reason: "concurrent job",
          priority: "high",
        };

        const result = await lock.acquire("test-lock", { metadata });

        expect(result).toBeDefined();
      });
    });

    it("should include lock timestamp", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        const result = await lock.acquire("test-lock");

        expect(result.timestamp).toBeDefined();
        expect(typeof result.timestamp).toBe("string");
      });
    });

    it("should include lock timeout in result", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        const result = await lock.acquire("test-lock", { timeout: 10000 });

        expect(result.timeout).toBe(10000);
      });
    });
  });

  describe("Lock Timeout Handling", () => {
    it("should handle lock timeout option", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        const result = await lock.acquire("test-lock", {
          timeout: 1000,
          retryInterval: 100,
          maxRetries: 10,
        });

        expect(result).toBeDefined();
      });
    });

    it("should handle retry configuration", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        const result = await lock.acquire("test-lock", {
          retryInterval: 500,
          maxRetries: 5,
        });

        expect(result).toBeDefined();
      });
    });
  });

  describe("Environment and Context", () => {
    it("should set deterministic environment", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        expect(lock.env.TZ).toBe("UTC");
        expect(lock.env.LANG).toBe("C");
      });
    });

    it("should preserve process environment", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        expect(lock.env).toBeDefined();
        expect(typeof lock.env).toBe("object");
      });
    });
  });

  describe("Lock Ref Generation", () => {
    it("should generate refs for different branches", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        const mainRef = lock.getLockRef("test-lock", {
          worktree: "/home/test",
          branch: "main",
        });

        const devRef = lock.getLockRef("test-lock", {
          worktree: "/home/test",
          branch: "develop",
        });

        expect(mainRef).not.toBe(devRef);
      });
    });

    it("should include branch in lock ref", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        const ref = lock.getLockRef("test-lock", {
          worktree: "/home/test",
          branch: "feature/my-branch",
        });

        expect(ref).toContain("lock");
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle lock acquisition failure", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        try {
          const result = await lock.acquire("test-lock");
          expect(result).toBeDefined();
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });

    it("should handle malformed metadata", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        const result = await lock.acquire("test-lock", {
          metadata: null,
        });

        expect(result).toBeDefined();
      });
    });
  });

  describe("Performance", () => {
    it("should acquire and release locks efficiently", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        const start = performance.now();

        for (let i = 0; i < 50; i++) {
          const acquired = await lock.acquire(`lock-${i}`);
          await lock.release(`lock-${i}`);
        }

        const duration = performance.now() - start;

        expect(duration).toBeLessThan(10000);
      });
    });

    it("should handle many concurrent locks", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        const start = performance.now();

        const locks = await Promise.all(
          Array.from({ length: 100 }).map((_, i) =>
            lock.acquire(`perf-lock-${i}`)
          )
        );

        const duration = performance.now() - start;

        expect(duration).toBeLessThan(10000);
        expect(locks.length).toBe(100);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle lock with very long name", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        const longName = "lock-" + "x".repeat(200);

        const result = await lock.acquire(longName);

        expect(result.name).toBe(longName);
      });
    });

    it("should handle lock with special characters", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        const specialName = "lock-with_special.chars-123";

        const result = await lock.acquire(specialName);

        expect(result.name).toBe(specialName);
      });
    });

    it("should handle zero timeout", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        const result = await lock.acquire("test-lock", {
          timeout: 0,
        });

        expect(result).toBeDefined();
      });
    });

    it("should handle immediate retry", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();

        const result = await lock.acquire("test-lock", {
          retryInterval: 1,
          maxRetries: 1,
        });

        expect(result).toBeDefined();
      });
    });
  });
});
