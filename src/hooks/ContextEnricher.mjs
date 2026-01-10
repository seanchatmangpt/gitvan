/**
 * @fileoverview GitVan Context Enricher for Hooks
 *
 * Enriches hook evaluation context with Git metadata:
 * - Changed files since last commit
 * - Git diff summary
 * - Commit message and author
 * - Branch information
 * - Staging area status
 *
 * Caches results to avoid redundant Git operations.
 *
 * @version 1.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import { execFile } from "node:child_process";

/**
 * Context enricher that adds Git metadata to hook context
 *
 * @class ContextEnricher
 */
export class ContextEnricher {
  /**
   * Create context enricher instance
   * @param {Object} options - Configuration options
   * @param {string} [options.cwd=process.cwd()] - Working directory
   * @param {Object} [options.logger=console] - Logger instance
   * @param {boolean} [options.enableCache=true] - Enable caching
   */
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.logger = options.logger || console;
    this.enableCache = options.enableCache !== false;
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.cacheTtlMs = 5000; // 5 second TTL
  }

  /**
   * Enrich hook context with Git metadata
   * Caches results to avoid redundant Git operations
   *
   * @async
   * @param {Object} context - Hook evaluation context
   * @returns {Promise<Object>} Enriched context with Git metadata
   */
  async enrich(context = {}) {
    const cacheKey = "git-metadata";
    const now = Date.now();

    // Check cache first
    if (
      this.enableCache &&
      this.cache.has(cacheKey) &&
      this.cacheExpiry.get(cacheKey) > now
    ) {
      return {
        ...context,
        ...this.cache.get(cacheKey),
      };
    }

    try {
      const metadata = await this._collectGitMetadata();

      // Cache the result
      if (this.enableCache) {
        this.cache.set(cacheKey, metadata);
        this.cacheExpiry.set(cacheKey, now + this.cacheTtlMs);
      }

      return {
        ...context,
        ...metadata,
      };
    } catch (error) {
      this.logger.warn(`⚠️ Failed to enrich context: ${error.message}`);
      return context; // Return original context on error
    }
  }

  /**
   * Get changed files since last commit
   * Includes both staged and unstaged changes
   *
   * @async
   * @returns {Promise<Array<Object>>} Array of changed files with status
   */
  async getChangedFiles() {
    try {
      // Get status of all changes
      const output = await this._runGit(["status", "--porcelain"]);
      const files = [];

      for (const line of output.split("\n")) {
        if (!line.trim()) continue;

        const status = line.substring(0, 2);
        const filePath = line.substring(3).trim();

        files.push({
          path: filePath,
          status: status,
          modified: status.includes("M"),
          added: status.includes("A"),
          deleted: status.includes("D"),
          renamed: status.includes("R"),
          staged: status[0] !== " ",
          unstaged: status[1] !== " ",
        });
      }

      return files;
    } catch (error) {
      this.logger.warn(`⚠️ Failed to get changed files: ${error.message}`);
      return [];
    }
  }

  /**
   * Get git diff summary (stats only)
   * Shows number of files changed and lines added/removed
   *
   * @async
   * @returns {Promise<Object>} Diff statistics
   */
  async getDiffSummary() {
    try {
      const output = await this._runGit(["diff", "--stat", "HEAD"]);

      const lines = output.split("\n");
      const stats = {
        filesChanged: 0,
        linesAdded: 0,
        linesRemoved: 0,
        totalChanges: 0,
      };

      for (const line of lines) {
        // Parse "file | X insertions(+), Y deletions(-)"
        const insertMatch = line.match(/(\d+) insertions?\(\+\)/);
        const deleteMatch = line.match(/(\d+) deletions?\(-\)/);

        if (insertMatch) {
          stats.linesAdded += parseInt(insertMatch[1], 10);
        }
        if (deleteMatch) {
          stats.linesRemoved += parseInt(deleteMatch[1], 10);
        }

        if (insertMatch || deleteMatch) {
          stats.filesChanged += 1;
        }
      }

      stats.totalChanges = stats.linesAdded + stats.linesRemoved;

      return stats;
    } catch (error) {
      this.logger.warn(`⚠️ Failed to get diff summary: ${error.message}`);
      return {
        filesChanged: 0,
        linesAdded: 0,
        linesRemoved: 0,
        totalChanges: 0,
      };
    }
  }

  /**
   * Get current HEAD commit information
   *
   * @async
   * @returns {Promise<Object>} Commit metadata
   */
  async getHeadCommit() {
    try {
      // Get commit hash
      const hash = await this._runGit(["rev-parse", "HEAD"]);

      // Get commit message
      const message = await this._runGit(["log", "-1", "--pretty=%B", hash]);

      // Get author
      const author = await this._runGit([
        "log",
        "-1",
        "--pretty=%an <%ae>",
        hash,
      ]);

      // Get timestamp
      const timestamp = await this._runGit([
        "log",
        "-1",
        "--pretty=%ai",
        hash,
      ]);

      return {
        hash: hash.substring(0, 7), // Short hash
        fullHash: hash,
        message: message.trim(),
        author: author.trim(),
        timestamp: timestamp.trim(),
      };
    } catch (error) {
      this.logger.warn(`⚠️ Failed to get HEAD commit: ${error.message}`);
      return {
        hash: "unknown",
        fullHash: "unknown",
        message: "",
        author: "",
        timestamp: "",
      };
    }
  }

  /**
   * Get current branch name
   *
   * @async
   * @returns {Promise<string>} Current branch name
   */
  async getCurrentBranch() {
    try {
      const branch = await this._runGit(["rev-parse", "--abbrev-ref", "HEAD"]);
      return branch.trim();
    } catch (error) {
      this.logger.warn(`⚠️ Failed to get current branch: ${error.message}`);
      return "unknown";
    }
  }

  /**
   * Get staging area status
   * Counts staged changes ready for commit
   *
   * @async
   * @returns {Promise<Object>} Staging status
   */
  async getStagingStatus() {
    try {
      const output = await this._runGit(["status", "--porcelain"]);
      const status = {
        stagedCount: 0,
        unstagedCount: 0,
        unTrackedCount: 0,
        hasChanges: false,
      };

      for (const line of output.split("\n")) {
        if (!line.trim()) continue;

        const statusCode = line.substring(0, 2);

        if (statusCode[0] !== " ") {
          status.stagedCount += 1;
          status.hasChanges = true;
        }
        if (statusCode[1] !== " ") {
          status.unstagedCount += 1;
          status.hasChanges = true;
        }
        if (statusCode === "??") {
          status.unTrackedCount += 1;
          status.hasChanges = true;
        }
      }

      return status;
    } catch (error) {
      this.logger.warn(`⚠️ Failed to get staging status: ${error.message}`);
      return {
        stagedCount: 0,
        unstagedCount: 0,
        unTrackedCount: 0,
        hasChanges: false,
      };
    }
  }

  /**
   * Collect all Git metadata for context enrichment
   * @private
   * @async
   * @returns {Promise<Object>} Complete Git metadata
   */
  async _collectGitMetadata() {
    const [
      changedFiles,
      diffSummary,
      headCommit,
      currentBranch,
      stagingStatus,
    ] = await Promise.all([
      this.getChangedFiles(),
      this.getDiffSummary(),
      this.getHeadCommit(),
      this.getCurrentBranch(),
      this.getStagingStatus(),
    ]);

    return {
      gitMetadata: {
        changedFiles,
        diffSummary,
        headCommit,
        currentBranch,
        stagingStatus,
        enrichedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Run Git command
   * @private
   * @async
   * @param {Array<string>} args - Git arguments
   * @returns {Promise<string>} Command output
   */
  async _runGit(args) {
    return new Promise((resolve, reject) => {
      const child = execFile("git", args, { cwd: this.cwd });

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (data) => {
        stdout += data;
      });

      child.stderr?.on("data", (data) => {
        stderr += data;
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(
            new Error(`git ${args.join(" ")} failed: ${stderr}`)
          );
        }
      });

      child.on("error", (error) => {
        reject(error);
      });
    });
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Get cache stats
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      entries: this.cache.size,
      maxTtlMs: this.cacheTtlMs,
    };
  }
}

/**
 * Create context enricher instance
 * @param {Object} options - Configuration options
 * @returns {ContextEnricher} Context enricher instance
 */
export function createContextEnricher(options = {}) {
  return new ContextEnricher(options);
}

/**
 * Default context enricher instance
 */
export const contextEnricher = createContextEnricher();
