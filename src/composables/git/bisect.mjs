// src/composables/git/bisect.mjs
// GitVan v2 — Bisect operations factory
// - Binary search to find bug-introducing commits
// - Automated and manual bisection
// - Bisect state management
// - Integration with test scripts

/**
 * Create bisect operations
 *
 * @param {Object} base - Base configuration {cwd, env}
 * @param {Function} run - Execute git command with output
 * @param {Function} runVoid - Execute git command without output
 * @param {Function} toArr - Convert to array helper
 * @returns {Object} Bisect operations interface
 */
export default function makeBisect(base, run, runVoid, toArr) {
  return {
    /**
     * Start bisect session
     *
     * @param {Object} options - Bisect start options
     * @param {string} [options.bad="HEAD"] - Bad commit (has bug)
     * @param {string} [options.good] - Good commit (no bug)
     * @param {Array<string>} [options.paths] - Limit bisect to specific paths
     * @returns {Promise<void>}
     *
     * @example
     * // Start bisect with current HEAD as bad
     * await startBisect({ good: 'v1.0.0' });
     *
     * // Bisect specific paths only
     * await startBisect({
     *   bad: 'HEAD',
     *   good: 'abc123',
     *   paths: ['src/']
     * });
     */
    async startBisect(options = {}) {
      const args = ["bisect", "start"];

      const bad = options.bad || "HEAD";
      const good = options.good;

      if (bad) args.push(bad);
      if (good) args.push(good);

      if (options.paths && options.paths.length > 0) {
        args.push("--", ...toArr(options.paths));
      }

      await runVoid(args);
    },

    /**
     * Mark current commit as good
     *
     * @param {string} [commit] - Specific commit to mark good (optional)
     * @returns {Promise<string>} Bisect output with next steps
     *
     * @example
     * await markGood();
     * // or mark specific commit
     * await markGood('abc123');
     */
    async markGood(commit) {
      const args = ["bisect", "good"];
      if (commit) args.push(commit);
      return run(args);
    },

    /**
     * Mark current commit as bad
     *
     * @param {string} [commit] - Specific commit to mark bad (optional)
     * @returns {Promise<string>} Bisect output with next steps
     *
     * @example
     * await markBad();
     * // or mark specific commit
     * await markBad('abc123');
     */
    async markBad(commit) {
      const args = ["bisect", "bad"];
      if (commit) args.push(commit);
      return run(args);
    },

    /**
     * Skip current commit (e.g., if it doesn't compile)
     *
     * @param {string} [commit] - Specific commit to skip (optional)
     * @returns {Promise<string>} Bisect output
     *
     * @example
     * await skipCommit();
     */
    async skipCommit(commit) {
      const args = ["bisect", "skip"];
      if (commit) args.push(commit);
      return run(args);
    },

    /**
     * Reset bisect session and return to original HEAD
     *
     * @returns {Promise<void>}
     *
     * @example
     * await resetBisect();
     */
    async resetBisect() {
      await runVoid(["bisect", "reset"]);
    },

    /**
     * Get current bisect status
     *
     * @returns {Promise<Object>} Bisect status information
     *
     * @example
     * const status = await getBisectStatus();
     * // Returns: { active: true, good: ['...'], bad: ['...'], current: '...' }
     */
    async getBisectStatus() {
      try {
        // Check if bisect is active by looking for .git/BISECT_LOG
        const { readFile } = await import("node:fs/promises");
        const { join } = await import("node:path");

        const gitDir = await run(["rev-parse", "--git-dir"]);
        const bisectLog = join(gitDir.trim(), "BISECT_LOG");

        try {
          const logContent = await readFile(bisectLog, "utf8");
          const current = await run(["rev-parse", "HEAD"]);

          // Parse bisect log for good/bad commits
          const good = [];
          const bad = [];

          for (const line of logContent.split("\n")) {
            if (line.includes("git bisect good")) {
              const match = line.match(/git bisect good ([a-f0-9]+)/);
              if (match) good.push(match[1]);
            } else if (line.includes("git bisect bad")) {
              const match = line.match(/git bisect bad ([a-f0-9]+)/);
              if (match) bad.push(match[1]);
            }
          }

          return {
            active: true,
            good,
            bad,
            current: current.trim(),
          };
        } catch {
          return { active: false };
        }
      } catch {
        return { active: false };
      }
    },

    /**
     * Run automated bisect with test script
     *
     * @param {Object} options - Automated bisect options
     * @param {string} options.script - Path to test script
     * @param {string} [options.bad="HEAD"] - Bad commit
     * @param {string} options.good - Good commit
     * @param {Array<string>} [options.paths] - Limit to paths
     * @returns {Promise<Object>} Bisect result with culprit commit
     *
     * @example
     * const result = await runAutoBisect({
     *   script: './test.sh',
     *   good: 'v1.0.0',
     *   bad: 'HEAD'
     * });
     * // Returns: { culprit: 'abc123', steps: 7 }
     */
    async runAutoBisect(options) {
      if (!options.script) {
        throw new Error("Test script required for automated bisect");
      }
      if (!options.good) {
        throw new Error("Good commit required for automated bisect");
      }

      // Start bisect
      await this.startBisect({
        bad: options.bad || "HEAD",
        good: options.good,
        paths: options.paths,
      });

      // Run automated bisect
      const output = await run(["bisect", "run", options.script]);

      // Parse output for culprit commit
      const culpritMatch = output.match(/([a-f0-9]{40}) is the first bad commit/);
      const stepsMatch = output.match(/bisect run success: (\d+) steps/);

      return {
        culprit: culpritMatch ? culpritMatch[1] : null,
        steps: stepsMatch ? parseInt(stepsMatch[1], 10) : null,
        output,
      };
    },

    /**
     * Visualize bisect log
     *
     * @returns {Promise<string>} Visual bisect log
     *
     * @example
     * const log = await visualizeBisect();
     */
    async visualizeBisect() {
      return run(["bisect", "visualize", "--oneline"]);
    },

    /**
     * View bisect log
     *
     * @returns {Promise<string>} Bisect log content
     *
     * @example
     * const log = await bisectLog();
     */
    async bisectLog() {
      return run(["bisect", "log"]);
    },

    /**
     * Replay bisect from log file
     *
     * @param {string} logFile - Path to bisect log file
     * @returns {Promise<void>}
     *
     * @example
     * await replayBisect('bisect.log');
     */
    async replayBisect(logFile) {
      await runVoid(["bisect", "replay", logFile]);
    },

    /**
     * Get estimated remaining steps
     *
     * @returns {Promise<number>} Estimated steps remaining
     *
     * @example
     * const steps = await getRemainingSteps();
     */
    async getRemainingSteps() {
      try {
        const output = await run(["bisect", "log"]);
        // Parse log to estimate remaining steps
        // Format: "Bisecting: X revisions left to test after this"
        const match = output.match(/Bisecting: (\d+) revisions left/);
        return match ? parseInt(match[1], 10) : 0;
      } catch {
        return 0;
      }
    },

    /**
     * Mark multiple commits as good
     *
     * @param {Array<string>} commits - Array of commit hashes
     * @returns {Promise<string>} Bisect output
     *
     * @example
     * await markMultipleGood(['abc123', 'def456']);
     */
    async markMultipleGood(commits) {
      const args = ["bisect", "good", ...toArr(commits)];
      return run(args);
    },

    /**
     * Mark multiple commits as bad
     *
     * @param {Array<string>} commits - Array of commit hashes
     * @returns {Promise<string>} Bisect output
     *
     * @example
     * await markMultipleBad(['abc123', 'def456']);
     */
    async markMultipleBad(commits) {
      const args = ["bisect", "bad", ...toArr(commits)];
      return run(args);
    },

    /**
     * Check if currently in bisect session
     *
     * @returns {Promise<boolean>} True if bisecting
     *
     * @example
     * if (await isBisecting()) {
     *   console.log('Bisect in progress');
     * }
     */
    async isBisecting() {
      const status = await this.getBisectStatus();
      return status.active;
    },
  };
}
