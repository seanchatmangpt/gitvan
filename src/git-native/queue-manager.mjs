import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { randomUUID } from 'crypto';
import { useLog } from '../composables/log.mjs';

/**
 * Priority queues with durable mailboxes (.gitvan/queue/*) and optional git-ref mailbox.
 */
export class QueueManager {
  /**
   * @param {{cwd?:string,logger?:Console,queue?:import("../types.js").QueueConfig,paths?:import("../types.js").PathConfig}} [options]
   */
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.logger = options.logger || useLog('QueueManager');
    this.config = options.queue || {};
    this.paths = options.paths || {};
    
    // Priority queues using p-queue
    this._queues = new Map();
    this._mailboxes = new Map();
    this._initialized = false;
  }

  /**
   * Initialize queues and mailboxes.
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this._initialized) return;
    
    this.logger.info('Initializing QueueManager...');
    
    // Create queue directories
    const queueDir = join(this.cwd, this.paths.queue || '.gitvan/queue');
    await this._ensureDir(queueDir);
    
    // Initialize priority queues
    const priorities = ['high', 'medium', 'low'];
    for (const priority of priorities) {
      const priorityDir = join(queueDir, priority);
      await this._ensureDir(priorityDir);
      
      // Initialize p-queue for this priority
      const { default: PQueue } = await import('p-queue');
      const queue = new PQueue({
        concurrency: this.config.concurrency || 3,
        interval: this.config.interval || 100,
        intervalCap: this.config.intervalCap || 5
      });
      
      this._queues.set(priority, queue);
      this._mailboxes.set(priority, priorityDir);
    }
    
    this._initialized = true;
    this.logger.info('QueueManager initialized successfully');
  }

  /**
   * Add a job to the queue with persistence and status tracking.
   * @template T
   * @param {import("../types.js").JobPriority} priority
   * @param {() => Promise<T>} job
   * @param {import("../types.js").JobMetadata} [metadata]
   * @returns {Promise<T>}
   */
  async addJob(priority, job, metadata = {}) {
    await this._ensureInitialized();
    
    const jobId = randomUUID();
    const jobRecord = {
      id: jobId,
      priority,
      status: 'queued',
      timestamp: Date.now(),
      metadata: metadata || {}
    };
    
    // Persist job to mailbox
    await this._persistJob(jobRecord);
    
    // Add to priority queue
    const queue = this._queues.get(priority);
    if (!queue) {
      throw new Error(`Invalid priority: ${priority}`);
    }
    
    return queue.add(async () => {
      try {
        // Update status to running
        await this._updateJobStatus(jobId, 'running', { startedAt: Date.now() });
        
        // Execute job
        const result = await job();
        
        // Update status to completed
        await this._updateJobStatus(jobId, 'completed', { 
          completedAt: Date.now(),
          result 
        });
        
        return result;
      } catch (error) {
        // Update status to failed
        await this._updateJobStatus(jobId, 'failed', { 
          completedAt: Date.now(),
          error: error.message 
        });
        
        throw error;
      }
    });
  }

  /**
   * Current queue status per priority.
   * @returns {Record<import("../types.js").JobPriority, import("../types.js").QueueStatus>}
   */
  getStatus() {
    const status = {};
    
    for (const [priority, queue] of this._queues) {
      status[priority] = {
        pending: queue.pending,
        size: queue.size,
        isPaused: queue.isPaused,
        concurrency: queue.concurrency
      };
    }
    
    return status;
  }

  /** Pause all queues. */
  pauseAll() {
    for (const queue of this._queues.values()) {
      queue.pause();
    }
  }

  /** Resume all queues. */
  resumeAll() {
    for (const queue of this._queues.values()) {
      queue.start();
    }
  }

  /** Remove completed/failed job files from mailboxes. */
  async clearCompleted() {
    await this._ensureInitialized();
    
    let clearedCount = 0;
    
    for (const [priority, mailboxDir] of this._mailboxes) {
      const files = await fs.readdir(mailboxDir);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = join(mailboxDir, file);
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const jobRecord = JSON.parse(content);
          
          if (jobRecord.status === 'completed' || jobRecord.status === 'failed') {
            await fs.unlink(filePath);
            clearedCount++;
          }
        } catch (error) {
          this.logger.warn(`Failed to process job file ${file}: ${error.message}`);
        }
      }
    }
    
    this.logger.info(`Cleared ${clearedCount} completed job files`);
    return clearedCount;
  }

  /** Recover interrupted jobs and normalize queue state. */
  async reconcile() {
    await this._ensureInitialized();
    
    this.logger.info('Reconciling queue state...');
    
    let recoveredCount = 0;
    
    for (const [priority, mailboxDir] of this._mailboxes) {
      const files = await fs.readdir(mailboxDir);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = join(mailboxDir, file);
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const jobRecord = JSON.parse(content);
          
          // Recover queued or running jobs
          if (jobRecord.status === 'queued' || jobRecord.status === 'running') {
            // Mark as recovered
            jobRecord.recovered = true;
            jobRecord.recoveredAt = Date.now();
            
            // Update file
            await fs.writeFile(filePath, JSON.stringify(jobRecord, null, 2));
            recoveredCount++;
            
            this.logger.info(`Recovered job ${jobRecord.id} (${priority})`);
          }
        } catch (error) {
          this.logger.warn(`Failed to reconcile job file ${file}: ${error.message}`);
        }
      }
    }
    
    this.logger.info(`Recovered ${recoveredCount} jobs`);
    return recoveredCount;
  }

  /**
   * Shutdown all queues.
   * @returns {Promise<void>}
   */
  async shutdown() {
    if (!this._initialized) return;
    
    this.logger.info('Shutting down QueueManager...');
    
    // Wait for all queues to finish
    await Promise.all(Array.from(this._queues.values()).map(queue => queue.onIdle()));
    
    this._initialized = false;
    this.logger.info('QueueManager shutdown complete');
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
   * Ensure directory exists.
   * @private
   * @param {string} dirPath
   * @returns {Promise<void>}
   */
  async _ensureDir(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Persist job record to mailbox.
   * @private
   * @param {import("../types.js").JobRecord} jobRecord
   * @returns {Promise<void>}
   */
  async _persistJob(jobRecord) {
    const mailboxDir = this._mailboxes.get(jobRecord.priority);
    const filePath = join(mailboxDir, `${jobRecord.id}.json`);
    
    await fs.writeFile(filePath, JSON.stringify(jobRecord, null, 2));
  }

  /**
   * Update job status in mailbox.
   * @private
   * @param {string} jobId
   * @param {string} status
   * @param {any} updates
   * @returns {Promise<void>}
   */
  async _updateJobStatus(jobId, status, updates = {}) {
    // Find the job file across all mailboxes
    for (const [priority, mailboxDir] of this._mailboxes) {
      const filePath = join(mailboxDir, `${jobId}.json`);
      
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const jobRecord = JSON.parse(content);
        
        // Update the record
        Object.assign(jobRecord, updates);
        jobRecord.status = status;
        
        // Write back
        await fs.writeFile(filePath, JSON.stringify(jobRecord, null, 2));
        return;
      } catch (error) {
        // File doesn't exist in this mailbox, continue
        continue;
      }
    }
    
    throw new Error(`Job ${jobId} not found in any mailbox`);
  }
}