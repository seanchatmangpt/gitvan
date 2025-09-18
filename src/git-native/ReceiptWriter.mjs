// src/git-native/ReceiptWriter.mjs
// Git-Native Receipt Writer using Git notes

import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import { join } from "node:path";

/**
 * Git-Native Receipt Writer
 * Manages receipts and state using Git notes with batched appends
 */
export class ReceiptWriter {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.logger = options.logger || console;

    // Receipt configuration
    this.config = {
      notesBatchSize: 100, // Batch notes appends
      notesRef: "refs/notes/gitvan/results",
      metricsRef: "refs/notes/gitvan/metrics",
      executionsRef: "refs/notes/gitvan/executions",
      ...options.receipt,
    };

    // Batch buffers
    this.buffers = {
      results: [],
      metrics: [],
      executions: [],
    };

    // Batch timers
    this.batchTimers = new Map();
  }

  /**
   * Write a receipt for a hook execution
   * @param {string} hookId - Hook identifier
   * @param {object} result - Execution result
   * @param {object} metadata - Additional metadata
   */
  async writeReceipt(hookId, result, metadata = {}) {
    const receipt = {
      hookId,
      timestamp: new Date().toISOString(),
      result,
      metadata,
      commit: await this._getCurrentCommit(),
      branch: await this._getCurrentBranch(),
    };

    // Add to batch buffer
    this.buffers.results.push(receipt);

    // Schedule batch write if buffer is full
    if (this.buffers.results.length >= this.config.notesBatchSize) {
      await this._flushResults();
    } else {
      this._scheduleBatchWrite("results");
    }
  }

  /**
   * Write execution metrics
   * @param {object} metrics - Metrics data
   */
  async writeMetrics(metrics) {
    const metricEntry = {
      timestamp: new Date().toISOString(),
      ...metrics,
      commit: await this._getCurrentCommit(),
      branch: await this._getCurrentBranch(),
    };

    // Add to batch buffer
    this.buffers.metrics.push(metricEntry);

    // Schedule batch write if buffer is full
    if (this.buffers.metrics.length >= this.config.notesBatchSize) {
      await this._flushMetrics();
    } else {
      this._scheduleBatchWrite("metrics");
    }
  }

  /**
   * Write execution information
   * @param {string} executionId - Execution identifier
   * @param {object} execution - Execution data
   */
  async writeExecution(executionId, execution) {
    const executionEntry = {
      executionId,
      timestamp: new Date().toISOString(),
      ...execution,
      commit: await this._getCurrentCommit(),
      branch: await this._getCurrentBranch(),
    };

    // Add to batch buffer
    this.buffers.executions.push(executionEntry);

    // Schedule batch write if buffer is full
    if (this.buffers.executions.length >= this.config.notesBatchSize) {
      await this._flushExecutions();
    } else {
      this._scheduleBatchWrite("executions");
    }
  }

  /**
   * Flush all pending receipts
   */
  async flushAll() {
    await Promise.all([
      this._flushResults(),
      this._flushMetrics(),
      this._flushExecutions(),
    ]);
  }

  /**
   * Flush results buffer
   * @private
   */
  async _flushResults() {
    if (this.buffers.results.length === 0) {
      return;
    }

    const batch = this.buffers.results.splice(0);

    try {
      const batchContent = batch
        .map((receipt) => JSON.stringify(receipt))
        .join("\n");

      // Write to Git notes
      await this._writeToNotes(this.config.notesRef, batchContent);

      this.logger.debug(`Flushed ${batch.length} results to Git notes`);
    } catch (error) {
      this.logger.error(`Failed to flush results: ${error.message}`);
      // Put back the batch if it failed
      this.buffers.results.unshift(...batch);
    }
  }

  /**
   * Flush metrics buffer
   * @private
   */
  async _flushMetrics() {
    if (this.buffers.metrics.length === 0) {
      return;
    }

    const batch = this.buffers.metrics.splice(0);

    try {
      const batchContent = batch
        .map((metric) => JSON.stringify(metric))
        .join("\n");

      // Write to Git notes
      await this._writeToNotes(this.config.metricsRef, batchContent);

      this.logger.debug(`Flushed ${batch.length} metrics to Git notes`);
    } catch (error) {
      this.logger.error(`Failed to flush metrics: ${error.message}`);
      // Put back the batch if it failed
      this.buffers.metrics.unshift(...batch);
    }
  }

  /**
   * Flush executions buffer
   * @private
   */
  async _flushExecutions() {
    if (this.buffers.executions.length === 0) {
      return;
    }

    const batch = this.buffers.executions.splice(0);

    try {
      const batchContent = batch
        .map((execution) => JSON.stringify(execution))
        .join("\n");

      // Write to Git notes
      await this._writeToNotes(this.config.executionsRef, batchContent);

      this.logger.debug(`Flushed ${batch.length} executions to Git notes`);
    } catch (error) {
      this.logger.error(`Failed to flush executions: ${error.message}`);
      // Put back the batch if it failed
      this.buffers.executions.unshift(...batch);
    }
  }

  /**
   * Write content to Git notes
   * @private
   */
  async _writeToNotes(notesRef, content) {
    try {
      // Create a temporary file for the content
      const tempFile = join(
        this.cwd,
        ".gitvan/tmp",
        `notes_${Date.now()}.json`
      );
      await fs.writeFile(tempFile, content);

      // Add the content as a Git note - handle empty repository
      try {
        execSync(`git notes --ref=${notesRef} add -F "${tempFile}" HEAD`, {
          cwd: this.cwd,
          stdio: "pipe",
        });
      } catch (error) {
        // If HEAD doesn't exist, create a dummy commit first
        execSync(`git commit --allow-empty -m "dummy commit for notes"`, {
          cwd: this.cwd,
          stdio: "pipe",
        });
        execSync(`git notes --ref=${notesRef} add -F "${tempFile}" HEAD`, {
          cwd: this.cwd,
          stdio: "pipe",
        });
      }

      // Clean up temporary file
      await fs.unlink(tempFile);
    } catch (error) {
      this.logger.error(
        `Failed to write to Git notes ${notesRef}: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Schedule batch write with timeout
   * @private
   */
  _scheduleBatchWrite(type) {
    // Clear existing timer
    if (this.batchTimers.has(type)) {
      clearTimeout(this.batchTimers.get(type));
    }

    // Schedule new timer (flush after 5 seconds)
    const timer = setTimeout(async () => {
      try {
        switch (type) {
          case "results":
            await this._flushResults();
            break;
          case "metrics":
            await this._flushMetrics();
            break;
          case "executions":
            await this._flushExecutions();
            break;
        }
      } catch (error) {
        this.logger.error(`Failed to flush ${type}: ${error.message}`);
      }
    }, 5000);

    this.batchTimers.set(type, timer);
  }

  /**
   * Get current commit SHA
   * @private
   */
  async _getCurrentCommit() {
    try {
      return execSync("git rev-parse HEAD", {
        cwd: this.cwd,
        stdio: "pipe",
      })
        .toString()
        .trim();
    } catch (error) {
      return "unknown";
    }
  }

  /**
   * Get current branch name
   * @private
   */
  async _getCurrentBranch() {
    try {
      return execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: this.cwd,
        stdio: "pipe",
      })
        .toString()
        .trim();
    } catch (error) {
      return "unknown";
    }
  }

  /**
   * Read receipts from Git notes
   * @param {string} notesRef - Notes reference
   * @param {string} commit - Commit SHA (optional)
   * @returns {Promise<Array>} Array of receipts
   */
  async readReceipts(notesRef = this.config.notesRef, commit = null) {
    try {
      const targetCommit = commit || "HEAD";
      const output = execSync(
        `git notes --ref=${notesRef} show ${targetCommit}`,
        {
          cwd: this.cwd,
          stdio: "pipe",
        }
      ).toString();

      // Parse newline-delimited JSON
      return output
        .trim()
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line));
    } catch (error) {
      this.logger.warn(
        `Failed to read receipts from ${notesRef}: ${error.message}`
      );
      return [];
    }
  }

  /**
   * Read metrics from Git notes
   * @param {string} commit - Commit SHA (optional)
   * @returns {Promise<Array>} Array of metrics
   */
  async readMetrics(commit = null) {
    return this.readReceipts(this.config.metricsRef, commit);
  }

  /**
   * Read executions from Git notes
   * @param {string} commit - Commit SHA (optional)
   * @returns {Promise<Array>} Array of executions
   */
  async readExecutions(commit = null) {
    return this.readReceipts(this.config.executionsRef, commit);
  }

  /**
   * Get receipt statistics
   * @returns {Promise<object>} Statistics about receipts
   */
  async getStatistics() {
    try {
      const results = await this.readReceipts();
      const metrics = await this.readMetrics();
      const executions = await this.readExecutions();

      return {
        totalReceipts: results.length,
        totalMetrics: metrics.length,
        totalExecutions: executions.length,
        pendingResults: this.buffers.results.length,
        pendingMetrics: this.buffers.metrics.length,
        pendingExecutions: this.buffers.executions.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get statistics: ${error.message}`);
      return {
        totalReceipts: 0,
        totalMetrics: 0,
        totalExecutions: 0,
        pendingResults: this.buffers.results.length,
        pendingMetrics: this.buffers.metrics.length,
        pendingExecutions: this.buffers.executions.length,
      };
    }
  }

  /**
   * Clean up old receipts (keep last N commits)
   * @param {number} keepCommits - Number of commits to keep
   */
  async cleanupOldReceipts(keepCommits = 10) {
    try {
      // Get commit history
      const output = execSync(`git log --oneline -n ${keepCommits + 1}`, {
        cwd: this.cwd,
        stdio: "pipe",
      }).toString();

      const commits = output
        .trim()
        .split("\n")
        .map((line) => line.split(" ")[0]);

      if (commits.length > keepCommits) {
        const oldCommits = commits.slice(keepCommits);

        for (const commit of oldCommits) {
          // Remove notes for old commits
          try {
            execSync(
              `git notes --ref=${this.config.notesRef} remove ${commit}`,
              {
                cwd: this.cwd,
                stdio: "pipe",
              }
            );
            execSync(
              `git notes --ref=${this.config.metricsRef} remove ${commit}`,
              {
                cwd: this.cwd,
                stdio: "pipe",
              }
            );
            execSync(
              `git notes --ref=${this.config.executionsRef} remove ${commit}`,
              {
                cwd: this.cwd,
                stdio: "pipe",
              }
            );
          } catch (error) {
            // Ignore errors for commits that don't have notes
          }
        }

        this.logger.info(
          `Cleaned up receipts for ${oldCommits.length} old commits`
        );
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup old receipts: ${error.message}`);
    }
  }
}
