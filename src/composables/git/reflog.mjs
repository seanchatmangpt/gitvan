// src/composables/git/reflog.mjs
// GitVan v2 — Reflog operations factory
// - View reference logs and history
// - Track HEAD movements and branch updates
// - Time-based history queries
// - Recover lost commits

/**
 * Create reflog operations
 *
 * @param {Object} base - Base configuration {cwd, env}
 * @param {Function} run - Execute git command with output
 * @param {Function} runVoid - Execute git command without output
 * @param {Function} toArr - Convert to array helper
 * @returns {Object} Reflog operations interface
 */
export default function makeReflog(base, run, runVoid, toArr) {
  return {
    /**
     * View reflog entries
     *
     * @param {string} [ref="HEAD"] - Reference to view reflog for
     * @param {Object} [options={}] - Reflog options
     * @param {number} [options.count] - Limit number of entries
     * @param {string} [options.format] - Custom format string
     * @param {boolean} [options.all] - Show all refs
     * @returns {Promise<string>} Reflog output
     *
     * @example
     * // View HEAD reflog
     * const log = await reflog();
     *
     * // View specific branch reflog
     * const log = await reflog('refs/heads/main');
     *
     * // Limit to 10 entries
     * const log = await reflog('HEAD', { count: 10 });
     */
    async reflog(ref = "HEAD", options = {}) {
      const args = ["reflog"];

      if (options.all) {
        args.push("--all");
      } else if (ref) {
        args.push(ref);
      }

      if (options.count) {
        args.push(`-${options.count}`);
      }

      if (options.format) {
        args.push(`--format=${options.format}`);
      }

      return run(args);
    },

    /**
     * Get reflog entries as structured data
     *
     * @param {string} [ref="HEAD"] - Reference to view
     * @param {Object} [options={}] - Query options
     * @param {number} [options.limit=50] - Max entries to return
     * @returns {Promise<Array>} Array of reflog entries
     *
     * @example
     * const entries = await getReflogEntries('HEAD', { limit: 10 });
     * // Returns: [{ hash: 'abc123', selector: 'HEAD@{0}', message: '...' }, ...]
     */
    async getReflogEntries(ref = "HEAD", options = {}) {
      const limit = options.limit || 50;
      const format = "%H%x09%gD%x09%gs";
      const output = await this.reflog(ref, { count: limit, format });

      return output
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
          const [hash, selector, message] = line.split("\t");
          return { hash, selector, message: message || "" };
        });
    },

    /**
     * Get commits within a time range
     *
     * @param {Object} options - Time range options
     * @param {string} [options.since] - Start time (e.g., "2 days ago", "2024-01-01")
     * @param {string} [options.until] - End time
     * @param {string} [options.ref="HEAD"] - Reference to query
     * @returns {Promise<Array>} Array of commits in time range
     *
     * @example
     * // Commits from last 7 days
     * const commits = await getHistoryByTime({ since: "7 days ago" });
     *
     * // Commits between specific dates
     * const commits = await getHistoryByTime({
     *   since: "2024-01-01",
     *   until: "2024-01-31"
     * });
     */
    async getHistoryByTime(options = {}) {
      const args = ["log", "--format=%H%x09%s%x09%an%x09%ai"];

      if (options.since) {
        args.push(`--since=${options.since}`);
      }

      if (options.until) {
        args.push(`--until=${options.until}`);
      }

      const ref = options.ref || "HEAD";
      args.push(ref);

      const output = await run(args);

      return output
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
          const [hash, subject, author, date] = line.split("\t");
          return { hash, subject, author, date };
        });
    },

    /**
     * Recover a commit by reflog selector
     *
     * @param {string} selector - Reflog selector (e.g., "HEAD@{1}")
     * @param {Object} [options={}] - Recovery options
     * @param {boolean} [options.createBranch] - Create branch at recovered commit
     * @param {string} [options.branchName] - Name for recovery branch
     * @returns {Promise<string>} Recovered commit hash
     *
     * @example
     * // Get commit hash from reflog
     * const hash = await recoverCommit('HEAD@{5}');
     *
     * // Create branch at recovered commit
     * const hash = await recoverCommit('HEAD@{5}', {
     *   createBranch: true,
     *   branchName: 'recovered'
     * });
     */
    async recoverCommit(selector, options = {}) {
      // Resolve selector to commit hash
      const hash = await run(["rev-parse", selector]);

      if (options.createBranch && options.branchName) {
        await runVoid(["branch", options.branchName, hash]);
      }

      return hash;
    },

    /**
     * Find when a ref was last updated
     *
     * @param {string} [ref="HEAD"] - Reference to check
     * @returns {Promise<Object>} Last update information
     *
     * @example
     * const info = await getLastUpdate('HEAD');
     * // Returns: { hash: 'abc123', message: 'commit: ...', date: '...' }
     */
    async getLastUpdate(ref = "HEAD") {
      const format = "%H%x09%gs%x09%gd";
      const output = await this.reflog(ref, { count: 1, format });

      if (!output.trim()) {
        return null;
      }

      const [hash, message, date] = output.split("\t");
      return { hash, message, date };
    },

    /**
     * Expire reflog entries older than specified time
     *
     * @param {Object} options - Expiration options
     * @param {string} [options.expire="90.days.ago"] - Expiration time
     * @param {boolean} [options.all=false] - Expire all refs
     * @param {boolean} [options.dryRun=false] - Show what would be expired
     * @returns {Promise<void>}
     *
     * @example
     * // Expire entries older than 90 days
     * await expireReflog({ expire: "90.days.ago" });
     *
     * // Dry run to see what would be expired
     * await expireReflog({ expire: "30.days.ago", dryRun: true });
     */
    async expireReflog(options = {}) {
      const args = ["reflog", "expire"];

      const expire = options.expire || "90.days.ago";
      args.push(`--expire=${expire}`);

      if (options.all) {
        args.push("--all");
      }

      if (options.dryRun) {
        args.push("--dry-run");
      }

      await runVoid(args);
    },

    /**
     * Delete reflog for a specific ref
     *
     * @param {string} ref - Reference to delete reflog for
     * @returns {Promise<void>}
     *
     * @example
     * await deleteReflog('refs/heads/old-branch');
     */
    async deleteReflog(ref) {
      await runVoid(["reflog", "delete", ref]);
    },

    /**
     * Check if a commit exists in reflog
     *
     * @param {string} commitHash - Commit hash to search for
     * @param {string} [ref="HEAD"] - Reference to search in
     * @returns {Promise<boolean>} True if commit found in reflog
     *
     * @example
     * const exists = await isInReflog('abc123def');
     */
    async isInReflog(commitHash, ref = "HEAD") {
      try {
        const entries = await this.getReflogEntries(ref, { limit: 1000 });
        return entries.some((entry) => entry.hash.startsWith(commitHash));
      } catch {
        return false;
      }
    },
  };
}
