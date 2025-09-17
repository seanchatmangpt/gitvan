// src/composables/worktree.mjs
// GitVan v2 — useWorktree()
// - Dedicated worktree management composable
// - Promotes worktree usage with ergonomic API
// - Context-aware with proper isolation
// - Focused on worktree-specific operations

import { useGitVan, tryUseGitVan } from "../core/context.mjs";
import { useGit } from "./git.mjs";

export function useWorktree() {
  // Get context from unctx - this must be called synchronously
  let ctx;
  try {
    ctx = useGitVan();
  } catch {
    ctx = tryUseGitVan?.() || null;
  }

  // Resolve working directory
  const cwd = (ctx && ctx.cwd) || process.cwd();

  // Set up deterministic environment
  const env = {
    ...process.env,
    ...(ctx && ctx.env ? ctx.env : {}),
    TZ: "UTC",
    LANG: "C",
  };

  const base = { cwd, env };

  return {
    // Context properties (exposed for testing)
    cwd: base.cwd,
    env: base.env,

    // === Worktree Information ===
    async info() {
      try {
        const { execFile } = await import("node:child_process");

        const [gitDir, worktree, head, branch] = await Promise.all([
          execFile("git", ["rev-parse", "--git-dir"], {
            cwd: base.cwd,
            env: base.env,
          }).then((r) => r.stdout.trim()),
          execFile("git", ["rev-parse", "--show-toplevel"], {
            cwd: base.cwd,
            env: base.env,
          }).then((r) => r.stdout.trim()),
          execFile("git", ["rev-parse", "HEAD"], {
            cwd: base.cwd,
            env: base.env,
          }).then((r) => r.stdout.trim()),
          execFile("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
            cwd: base.cwd,
            env: base.env,
          })
            .then((r) => r.stdout.trim())
            .catch(() => "HEAD"),
        ]);

        return {
          commonDir: gitDir,
          worktree: worktree,
          branch: branch,
          head: head,
        };
      } catch (error) {
        throw new Error(`Failed to get worktree info: ${error.message}`);
      }
    },

    async isWorktree() {
      try {
        const { execFile } = await import("node:child_process");
        const { promisify } = await import("node:util");
        const execFile = promisify(execFile);

        await execFile("git", ["rev-parse", "--is-inside-work-tree"], {
          cwd: base.cwd,
          env: base.env,
        });
        return true;
      } catch {
        return false;
      }
    },

    async list() {
      try {
        const { execFile } = await import("node:child_process");
        const { promisify } = await import("node:util");
        const execFile = promisify(execFile);

        const output = await execFile(
          "git",
          ["worktree", "list", "--porcelain"],
          { cwd: base.cwd, env: base.env }
        ).then((r) => r.stdout);
        const worktrees = [];
        let current = {};

        for (const line of output.split("\n")) {
          if (line.startsWith("worktree ")) {
            if (current.path) worktrees.push(current);
            current = { path: line.substring(9) };
          } else if (line.startsWith("HEAD ")) {
            current.head = line.substring(5);
          } else if (line.startsWith("branch ")) {
            current.branch = line.substring(7).replace("refs/heads/", "");
          } else if (line.startsWith("detached")) {
            current.detached = true;
          }
        }

        if (current.path) worktrees.push(current);

        // Mark main worktree
        const mainPath = await execFile(
          "git",
          ["rev-parse", "--show-toplevel"],
          { cwd: base.cwd, env: base.env }
        ).then((r) => r.stdout.trim());
        return worktrees.map((wt) => ({
          ...wt,
          isMain: wt.path === mainPath,
        }));
      } catch {
        // Fallback to single worktree
        const { execFile } = await import("node:child_process");
        const { promisify } = await import("node:util");
        const execFile = promisify(execFile);

        const [worktree, head, branch] = await Promise.all([
          execFile("git", ["rev-parse", "--show-toplevel"], {
            cwd: base.cwd,
            env: base.env,
          }).then((r) => r.stdout.trim()),
          execFile("git", ["rev-parse", "HEAD"], {
            cwd: base.cwd,
            env: base.env,
          }).then((r) => r.stdout.trim()),
          execFile("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
            cwd: base.cwd,
            env: base.env,
          })
            .then((r) => r.stdout.trim())
            .catch(() => "HEAD"),
        ]);

        return [
          {
            path: worktree,
            head: head,
            branch: branch,
            isMain: true,
          },
        ];
      }
    },

    // === Worktree Operations ===
    async create(path, branch, { startFrom = "HEAD" } = {}) {
      const git = useGit();
      const args = ["worktree", "add"];

      if (branch && !branch.startsWith("refs/")) {
        // Create new branch
        args.push("-b", branch);
      } else if (branch) {
        // Use existing branch/ref
        args.push(branch);
      }

      args.push(path);

      if (startFrom !== "HEAD") {
        args.push(startFrom);
      }

      await git.runVoid(args);
      return { path, branch: branch || "HEAD" };
    },

    async remove(path, { force = false } = {}) {
      const git = useGit();
      const args = ["worktree", "remove"];

      if (force) {
        args.push("--force");
      }

      args.push(path);

      await git.runVoid(args);
    },

    async prune() {
      const git = useGit();
      await git.runVoid(["worktree", "prune"]);
    },

    async repair(path) {
      const git = useGit();
      await git.runVoid(["worktree", "repair", path]);
    },

    // === Worktree Utilities ===
    async key() {
      const info = await this.info();
      return `${info.commonDir}#${info.worktree}#${info.branch}`;
    },

    async lockRef(lockName) {
      const key = await this.key();
      const { createHash } = await import("node:crypto");
      const keyHash = createHash("sha256")
        .update(key)
        .digest("hex")
        .slice(0, 8);
      return `refs/gitvan/locks/${lockName}-${keyHash}`;
    },

    // === Worktree Context Management ===
    async withWorktree(path, fn) {
      const { withGitVan } = await import("../core/context.mjs");
      const worktreeCtx = {
        cwd: path,
        env: base.env,
        now: ctx?.now || (() => new Date().toISOString()),
      };

      return await withGitVan(worktreeCtx, async () => {
        // Create a new worktree instance with the new context
        const { useWorktree: createWorktree } = await import("./worktree.mjs");
        const worktree = createWorktree();
        return await fn(worktree);
      });
    },

    // === Worktree Status ===
    async status() {
      const worktrees = await this.list();
      const current = await this.info();

      return {
        current: {
          path: current.worktree,
          branch: current.branch,
          head: current.head,
        },
        all: worktrees,
        count: worktrees.length,
        isMain: worktrees.find((wt) => wt.isMain)?.path === current.worktree,
      };
    },

    // === Convenience Methods ===
    async switchTo(path) {
      const git = useGit();
      await git.runVoid(["checkout", path]);
    },

    async getCurrent() {
      const info = await this.info();
      const worktrees = await this.list();
      return worktrees.find((wt) => wt.path === info.worktree);
    },

    async isMain() {
      const current = await this.getCurrent();
      return current?.isMain || false;
    },
  };
}
