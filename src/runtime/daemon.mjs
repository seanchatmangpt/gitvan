import { withGitVan } from "../composables/ctx.mjs";
import { useGit } from "../composables/git/index.mjs";
import { useExec } from "../composables/exec.mjs";
import { acquireLock, worktreeLockRef, releaseLock } from "./locks.mjs";
import { writeReceipt } from "./receipt.mjs";
import { recentShas, sleep, eventFires } from "./utils.mjs";
import { discoverJobs } from "./jobs.mjs";
import { loadConfig } from "./config.mjs";
import { join } from "pathe";

/**
 * Start daemon for specified worktrees
 */
export async function startDaemon(opts = {}, registry = null, sel = "current") {
  const config = await loadConfig(opts.rootDir);
  const mergedOpts = { ...config, ...opts };

  // Discover jobs if not provided in registry
  if (!registry) {
    const jobsDir = join(
      mergedOpts.rootDir || process.cwd(),
      mergedOpts.jobs?.dirs?.[0] || "jobs",
    );
    const jobs = discoverJobs(jobsDir);
    
    // Convert jobs to hooks for compatibility
    const hooks = jobs.map(job => ({
      name: job.name,
      file: job.file,
      run: job.run,
      job: job.name,
    }));

    registry = { hooks, jobs };
  }

  const git = useGit();
  const wts =
    sel === "all"
      ? await git.listWorktrees()
      : Array.isArray(sel)
        ? (await git.listWorktrees()).filter((w) => sel.includes(w.path))
        : [
            {
              path: await git.worktreeRoot,
              branch: await git.currentBranch(),
              isMain: true,
            },
          ];

  console.log(`Starting daemon for ${wts.length} worktree(s)`);

  // Start daemon loop for each worktree
  const promises = wts.map((wt) => loopWorktree(mergedOpts, registry, wt));
  await Promise.all(promises);
}

/**
 * Run an action specification
 */
async function runAction(spec) {
  const exec = useExec();

  switch (spec.exec) {
    case "cli":
      return exec.cli(spec.cmd, spec.args, spec.env);
    case "js":
      return await exec.js(spec.module, spec.export, spec.input);
    case "tmpl":
      return exec.tmpl(spec);
    default:
      return { ok: false, error: `Unknown exec type: ${spec.exec}` };
  }
}

/**
 * Daemon loop for a single worktree
 */
async function loopWorktree(opts, registry, wt) {
  const ctx = {
    repoRoot: opts.rootDir,
    worktreeRoot: wt.path,
    root: wt.path,
    env: opts.env || {},
    now: () => new Date().toISOString(),
    jobs: registry.jobs,
    llm: opts.llm,
    payload: {},
    worktree: { id: wt.path.replace(/[:/\\]/g, "-"), branch: wt.branch },
  };

  console.log(`Starting daemon loop for worktree: ${wt.path} (${wt.branch})`);

  await withGitVan(ctx, async () => {
    for (;;) {
      try {
        const shas = recentShas(opts.daemon?.lookback || 600);
        let ran = 0;
        const maxPerTick = opts.daemon?.maxPerTick || 50;

        for (const sha of shas) {
          if (ran >= maxPerTick) break;

          for (const hook of registry.hooks) {
            if (ran >= maxPerTick) break;

            try {
              const fires = await eventFires(hook, sha);
              if (!fires) continue;

              const git = useGit();
              const lockRef = worktreeLockRef(
                opts.locksRoot || "refs/gitvan/locks",
                await git.worktreeId(),
                hook.id,
                sha,
              );

              const acquired = acquireLock(lockRef, sha);
              if (!acquired) {
                console.debug(`Lock already held for ${hook.id}@${sha}`);
                continue;
              }

              console.log(
                `Processing ${hook.id} for commit ${sha.slice(0, 8)}`,
              );

              let res;
              if (hook.job && registry.jobs[hook.job]) {
                // Run named job
                res = await registry.jobs[hook.job].run({
                  payload: ctx.payload,
                });
              } else if (hook.run) {
                // Run inline action
                res = await runAction(hook.run);
              } else {
                console.warn(`No action defined for hook ${hook.id}`);
                continue;
              }

              writeReceipt({
                resultsRef: opts.resultsRef || "refs/notes/gitvan/results",
                id: `${hook.id}@${await git.worktreeId()}`,
                status: res.ok ? "OK" : "ERROR",
                commit: sha,
                action: hook.job ? "job" : hook.run?.exec || "unknown",
                result: res,
                artifact: res.artifact,
                meta: {
                  worktree: wt.path,
                  branch: wt.branch,
                  hookType: hook.type,
                  pattern: hook.pattern,
                },
              });

              releaseLock(lockRef);
              ran++;
            } catch (err) {
              console.error(
                `Error processing hook ${hook.id} for ${sha}:`,
                err.message,
              );
            }
          }
        }

        await sleep(opts.daemon?.pollMs || 1500);
      } catch (err) {
        console.error(`Error in daemon loop for ${wt.path}:`, err.message);
        await sleep(5000); // Wait longer on errors
      }
    }
  });
}

// Legacy GitVanDaemon class for backward compatibility
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

export class GitVanDaemon {
  constructor(worktreePath) {
    this.worktreePath = worktreePath;
    this.pidFile = join(worktreePath, ".git", "gitvan.pid");
    this.lockFile = join(worktreePath, ".git", "gitvan.lock");
  }

  start() {
    if (this.isRunning()) {
      throw new Error(
        `Daemon already running for worktree: ${this.worktreePath}`,
      );
    }

    const pid = process.pid;
    writeFileSync(this.pidFile, String(pid));

    // Setup graceful shutdown
    process.on("SIGTERM", () => this.stop());
    process.on("SIGINT", () => this.stop());

    console.log(
      `GitVan daemon started for worktree: ${this.worktreePath} (PID: ${pid})`,
    );

    // Start new daemon implementation
    return startDaemon({}, null, [
      { path: this.worktreePath, branch: "main", isMain: true },
    ]);
  }

  stop() {
    if (existsSync(this.pidFile)) {
      try {
        const pid = parseInt(readFileSync(this.pidFile, "utf8"));
        if (pid === process.pid) {
          process.exit(0);
        }
      } catch (err) {
        console.warn("Error stopping daemon:", err.message);
      }
    }
  }

  isRunning() {
    if (!existsSync(this.pidFile)) return false;

    try {
      const pid = parseInt(readFileSync(this.pidFile, "utf8"));
      // Check if process exists
      process.kill(pid, 0);
      return true;
    } catch (err) {
      // Process doesn't exist, clean up stale pid file
      try {
        if (existsSync(this.pidFile)) {
          execSync(`rm -f ${this.pidFile}`);
        }
      } catch (cleanupErr) {
        console.warn("Error cleaning up stale pid file:", cleanupErr.message);
      }
      return false;
    }
  }

  getLock(name) {
    return new WorktreeLock(this.worktreePath, name);
  }
}

class WorktreeLock {
  constructor(worktreePath, name) {
    this.lockFile = join(worktreePath, ".git", `gitvan-${name}.lock`);
  }

  acquire() {
    if (existsSync(this.lockFile)) {
      return false;
    }
    writeFileSync(this.lockFile, String(process.pid));
    return true;
  }

  release() {
    try {
      if (existsSync(this.lockFile)) {
        execSync(`rm -f ${this.lockFile}`);
      }
    } catch (err) {
      console.warn("Error releasing lock:", err.message);
    }
  }
}

// Additional exports for CLI
export async function daemonStatus() {
  return {
    running: false,
    pid: null,
    uptime: null,
    worktrees: [],
    jobs: {
      active: 0,
      completed: 0,
      failed: 0,
    },
  };
}

export async function stopDaemon() {
  // Implementation for stopping daemon
  console.log("Daemon stop functionality not fully implemented");
}
