import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { useLog } from '../composables/log.mjs';

const execAsync = promisify(exec);

/**
 * Batched, newline-delimited JSON receipts/metrics/executions appended into git-notes refs.
 */
export class ReceiptWriter {
  /**
   * @param {{cwd?:string,logger?:Console,receipt?:import("../types.js").ReceiptOptions}} [options]
   */
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.logger = options.logger || useLog('ReceiptWriter');
    this.config = options.receipt || {};
    
    // Batch configuration
    this.notesBatchSize = this.config.notesBatchSize || 100;
    this.notesRef = this.config.notesRef || 'refs/gitvan/notes';
    this.metricsRef = this.config.metricsRef || 'refs/gitvan/metrics';
    this.executionsRef = this.config.executionsRef || 'refs/gitvan/executions';
    
    // In-memory buffers
    this._receiptBuffer = [];
    this._metricsBuffer = [];
    this._executionsBuffer = [];
    
    this._initialized = false;
  }

  /**
   * Initialize receipt writer.
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this._initialized) return;
    
    this.logger.info('Initializing ReceiptWriter...');
    
    // Verify we're in a git repository
    try {
      await execAsync('git rev-parse --git-dir', { cwd: this.cwd });
    } catch (error) {
      throw new Error(`Not a git repository: ${this.cwd}`);
    }
    
    this._initialized = true;
    this.logger.info('ReceiptWriter initialized successfully');
  }

  /**
   * Append a result receipt (batched).
   * @param {string} hookId
   * @param {any} result
   * @param {Record<string,any>} [metadata]
   * @returns {Promise<void>}
   */
  async writeReceipt(hookId, result, metadata = {}) {
    await this._ensureInitialized();
    
    const receipt = {
      hookId,
      timestamp: new Date().toISOString(),
      result,
      metadata,
      commit: await this._getCurrentCommit(),
      branch: await this._getCurrentBranch()
    };
    
    this._receiptBuffer.push(receipt);
    
    // Auto-flush if buffer is full
    if (this._receiptBuffer.length >= this.notesBatchSize) {
      await this.flushAll();
    }
  }

  /**
   * Append metrics (batched).
   * @param {Record<string,any>} metrics
   * @returns {Promise<void>}
   */
  async writeMetrics(metrics) {
    await this._ensureInitialized();
    
    const metricEntry = {
      timestamp: new Date().toISOString(),
      commit: await this._getCurrentCommit(),
      branch: await this._getCurrentBranch(),
      values: metrics
    };
    
    this._metricsBuffer.push(metricEntry);
    
    // Auto-flush if buffer is full
    if (this._metricsBuffer.length >= this.notesBatchSize) {
      await this.flushAll();
    }
  }

  /**
   * Append execution entry (batched).
   * @param {string} executionId
   * @param {Record<string,any>} execution
   * @returns {Promise<void>}
   */
  async writeExecution(executionId, execution) {
    await this._ensureInitialized();
    
    const executionEntry = {
      executionId,
      timestamp: new Date().toISOString(),
      commit: await this._getCurrentCommit(),
      branch: await this._getCurrentBranch(),
      details: execution
    };
    
    this._executionsBuffer.push(executionEntry);
    
    // Auto-flush if buffer is full
    if (this._executionsBuffer.length >= this.notesBatchSize) {
      await this.flushAll();
    }
  }

  /** Flush all pending batches now. */
  async flushAll() {
    await this._ensureInitialized();
    
    const promises = [];
    
    if (this._receiptBuffer.length > 0) {
      promises.push(this._flushReceipts());
    }
    
    if (this._metricsBuffer.length > 0) {
      promises.push(this._flushMetrics());
    }
    
    if (this._executionsBuffer.length > 0) {
      promises.push(this._flushExecutions());
    }
    
    await Promise.all(promises);
  }

  /**
   * Read NDJSON receipts from a notes ref (for a commit or HEAD).
   * @param {string} [notesRef]
   * @param {string|null} [commit]
   * @returns {Promise<Array<any>>}
   */
  async readReceipts(notesRef = this.notesRef, commit = null) {
    await this._ensureInitialized();
    
    const targetCommit = commit || 'HEAD';
    return this._readNotesRef(notesRef, targetCommit);
  }

  /** @param {string|null} [commit] */
  async readMetrics(commit = null) {
    await this._ensureInitialized();
    
    const targetCommit = commit || 'HEAD';
    return this._readNotesRef(this.metricsRef, targetCommit);
  }

  /** @param {string|null} [commit] */
  async readExecutions(commit = null) {
    await this._ensureInitialized();
    
    const targetCommit = commit || 'HEAD';
    return this._readNotesRef(this.executionsRef, targetCommit);
  }

  /**
   * Summary counters (buffers + notes).
   * @returns {Promise<import("../types.js").ReceiptStats>}
   */
  async getStatistics() {
    await this._ensureInitialized();
    
    // Count existing notes
    const [receiptCount, metricsCount, executionsCount] = await Promise.all([
      this._countNotesRef(this.notesRef),
      this._countNotesRef(this.metricsRef),
      this._countNotesRef(this.executionsRef)
    ]);
    
    return {
      totalReceipts: receiptCount + this._receiptBuffer.length,
      totalMetrics: metricsCount + this._metricsBuffer.length,
      totalExecutions: executionsCount + this._executionsBuffer.length,
      pendingResults: this._receiptBuffer.length,
      pendingMetrics: this._metricsBuffer.length,
      pendingExecutions: this._executionsBuffer.length
    };
  }

  /**
   * Keep notes only for the last N commits.
   * @param {number} [keepCommits=10]
   * @returns {Promise<void>}
   */
  async cleanupOldReceipts(keepCommits = 10) {
    await this._ensureInitialized();
    
    this.logger.info(`Cleaning up old receipts (keeping last ${keepCommits} commits)...`);
    
    // Get recent commits
    const { stdout } = await execAsync(`git log --oneline -n ${keepCommits} --format="%H"`, { cwd: this.cwd });
    const recentCommits = stdout.trim().split('\n').filter(Boolean);
    
    // Get all commits with notes
    const allCommits = await this._getCommitsWithNotes();
    
    // Find commits to clean up
    const commitsToClean = allCommits.filter(commit => !recentCommits.includes(commit));
    
    // Remove notes for old commits
    for (const commit of commitsToClean) {
      await this._removeNotesForCommit(commit);
    }
    
    this.logger.info(`Cleaned up receipts for ${commitsToClean.length} old commits`);
  }

  /**
   * Ensure the system is initialized.
   * @private
   * @returns {Promise<void>}
   */
  async _ensureInitialized() {
    if (!this._initialized) {
      await this.initialize();
    }
  }

  /**
   * Flush receipts buffer to git notes.
   * @private
   * @returns {Promise<void>}
   */
  async _flushReceipts() {
    if (this._receiptBuffer.length === 0) return;
    
    const ndjson = this._receiptBuffer.map(receipt => JSON.stringify(receipt)).join('\n');
    await this._appendToNotesRef(this.notesRef, ndjson);
    
    this._receiptBuffer = [];
    this.logger.debug(`Flushed ${this._receiptBuffer.length} receipts`);
  }

  /**
   * Flush metrics buffer to git notes.
   * @private
   * @returns {Promise<void>}
   */
  async _flushMetrics() {
    if (this._metricsBuffer.length === 0) return;
    
    const ndjson = this._metricsBuffer.map(metric => JSON.stringify(metric)).join('\n');
    await this._appendToNotesRef(this.metricsRef, ndjson);
    
    this._metricsBuffer = [];
    this.logger.debug(`Flushed ${this._metricsBuffer.length} metrics`);
  }

  /**
   * Flush executions buffer to git notes.
   * @private
   * @returns {Promise<void>}
   */
  async _flushExecutions() {
    if (this._executionsBuffer.length === 0) return;
    
    const ndjson = this._executionsBuffer.map(exec => JSON.stringify(exec)).join('\n');
    await this._appendToNotesRef(this.executionsRef, ndjson);
    
    this._executionsBuffer = [];
    this.logger.debug(`Flushed ${this._executionsBuffer.length} executions`);
  }

  /**
   * Append NDJSON content to a notes ref.
   * @private
   * @param {string} notesRef
   * @param {string} content
   * @returns {Promise<void>}
   */
  async _appendToNotesRef(notesRef, content) {
    try {
      // Create a temporary file for the content
      const tempFile = join(this.cwd, '.gitvan', 'tmp', `notes-${Date.now()}.txt`);
      await fs.mkdir(dirname(tempFile), { recursive: true });
      await fs.writeFile(tempFile, content);
      
      // Append to notes ref
      await execAsync(`git notes --ref=${notesRef} append -F "${tempFile}"`, { cwd: this.cwd });
      
      // Clean up temp file
      await fs.unlink(tempFile);
    } catch (error) {
      this.logger.error(`Failed to append to notes ref ${notesRef}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Read NDJSON content from a notes ref.
   * @private
   * @param {string} notesRef
   * @param {string} commit
   * @returns {Promise<Array<any>>}
   */
  async _readNotesRef(notesRef, commit) {
    try {
      const { stdout } = await execAsync(`git notes --ref=${notesRef} show ${commit}`, { cwd: this.cwd });
      
      if (!stdout.trim()) return [];
      
      return stdout.trim().split('\n')
        .map(line => {
          try {
            return JSON.parse(line);
          } catch (error) {
            this.logger.warn(`Failed to parse NDJSON line: ${line}`);
            return null;
          }
        })
        .filter(Boolean);
    } catch (error) {
      // No notes found for this commit
      return [];
    }
  }

  /**
   * Count entries in a notes ref.
   * @private
   * @param {string} notesRef
   * @returns {Promise<number>}
   */
  async _countNotesRef(notesRef) {
    try {
      const { stdout } = await execAsync(`git notes --ref=${notesRef} list`, { cwd: this.cwd });
      return stdout.trim().split('\n').filter(Boolean).length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get all commits that have notes.
   * @private
   * @returns {Promise<string[]>}
   */
  async _getCommitsWithNotes() {
    const commits = new Set();
    
    for (const ref of [this.notesRef, this.metricsRef, this.executionsRef]) {
      try {
        const { stdout } = await execAsync(`git notes --ref=${ref} list`, { cwd: this.cwd });
        const refCommits = stdout.trim().split('\n').filter(Boolean);
        refCommits.forEach(commit => commits.add(commit));
      } catch (error) {
        // No notes for this ref
      }
    }
    
    return Array.from(commits);
  }

  /**
   * Remove notes for a specific commit.
   * @private
   * @param {string} commit
   * @returns {Promise<void>}
   */
  async _removeNotesForCommit(commit) {
    for (const ref of [this.notesRef, this.metricsRef, this.executionsRef]) {
      try {
        await execAsync(`git notes --ref=${ref} remove ${commit}`, { cwd: this.cwd });
      } catch (error) {
        // Notes don't exist for this commit/ref
      }
    }
  }

  /**
   * Get current commit hash.
   * @private
   * @returns {Promise<string>}
   */
  async _getCurrentCommit() {
    const { stdout } = await execAsync('git rev-parse HEAD', { cwd: this.cwd });
    return stdout.trim();
  }

  /**
   * Get current branch name.
   * @private
   * @returns {Promise<string>}
   */
  async _getCurrentBranch() {
    try {
      const { stdout } = await execAsync('git branch --show-current', { cwd: this.cwd });
      return stdout.trim() || 'detached';
    } catch (error) {
      return 'unknown';
    }
  }
}