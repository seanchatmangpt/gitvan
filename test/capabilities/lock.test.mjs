import { describe, expect, it } from "vitest";
import { withGitVan } from "../../src/core/context.mjs";
import { useLock } from "../../src/composables/lock.mjs";

describe("deterministic lock lifecycle capability", () => {
  it("manufactures stable namespaced lock references", async () => {
    await withGitVan({ cwd: "/tmp/gitvan-lock", env: {}, now: () => "2026-08-02T00:00:00.000Z" }, async () => {
      const lock = useLock();
      const info = { worktree: "/tmp/gitvan-lock", branch: "main", head: "abc" };
      const first = lock.getLockRef("release", info);
      const second = lock.getLockRef("release", info);
      expect(first).toBe(second);
      expect(first).toMatch(/^refs\/gitvan\/locks\/release-[a-f0-9]{8}-[a-f0-9]{8}$/);
      expect(lock.getWorktreeId(info.worktree)).toHaveLength(8);
    });
  });

  it("separates different lock and worktree identities", async () => {
    await withGitVan({ cwd: "/tmp/gitvan-lock", env: {} }, async () => {
      const lock = useLock();
      const a = lock.getLockRef("job-a", { worktree: "/tmp/a" });
      const b = lock.getLockRef("job-b", { worktree: "/tmp/a" });
      const c = lock.getLockRef("job-a", { worktree: "/tmp/b" });
      expect(new Set([a, b, c]).size).toBe(3);
    });
  });

  it("exposes lifecycle and cleanup operations", async () => {
    await withGitVan({ cwd: "/tmp/gitvan-lock", env: {} }, async () => {
      const lock = useLock();
      for (const method of ["acquire", "release", "isLocked", "status", "list", "cleanup", "search", "getStats", "export"]) {
        expect(typeof lock[method]).toBe("function");
      }
      expect(lock.env.TZ).toBe("UTC");
      expect(lock.env.LANG).toBe("C");
    });
  });
});
