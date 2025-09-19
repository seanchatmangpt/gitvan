/**
 * Git-Native I/O — public façade for queues, locks, receipts, snapshots, and workers.
 * Deterministic, durable task execution with Git-backed state.
 *
 * @example
 * const io = new GitNativeIO({ cwd: repo, logger: console });
 * await io.acquireLock("build");
 * await io.addJob("high", () => doWork(), { name: "build" });
 * await io.writeReceipt("hook://build", { ok: true });
 * console.log(await io.getStatus());
 */
export class GitNativeIO {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.logger = options.logger || console;
    this.config = this._mergeConfig(options.config);

    // Initialize components
    this._queueManager = null;
    this._lockManager = null;
    this._receiptWriter = null;
    this._snapshotStore = null;
    this._workerPool = null;

    this._initialized = false;
  }

  /**
   * Initialize all components and reconcile state.
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this._initialized) return;

    this.logger.info("Initializing GitNativeIO...");

    // Import components dynamically to avoid circular dependencies
    const { QueueManager } = await import("./QueueManager.mjs");
    const { LockManager } = await import("./LockManager.mjs");
    const { ReceiptWriter } = await import("./ReceiptWriter.mjs");
    const { SnapshotStore } = await import("./SnapshotStore.mjs");
    const { WorkerPool } = await import("./WorkerPool.mjs");

    this._queueManager = new QueueManager({
      cwd: this.cwd,
      logger: this.logger,
      queue: this.config.queue,
      paths: this.config.paths,
    });

    this._lockManager = new LockManager({
      cwd: this.cwd,
      logger: this.logger,
      lock: { defaultTimeout: 30000 },
    });

    this._receiptWriter = new ReceiptWriter({
      cwd: this.cwd,
      logger: this.logger,
      receipt: this.config.git,
    });

    this._snapshotStore = new SnapshotStore({
      cwd: this.cwd,
      logger: this.logger,
      snapshot: this.config.paths,
    });

    this._workerPool = new WorkerPool({
      cwd: this.cwd,
      logger: this.logger,
      workers: this.config.workers,
    });

    // Initialize all components
    await Promise.all([
      this._queueManager.initialize(),
      this._lockManager.initialize(),
      this._receiptWriter.initialize(),
      this._snapshotStore.initialize(),
      this._workerPool.initialize(),
    ]);

    // Reconcile state on startup
    await this.reconcile();

    this._initialized = true;
    this.logger.info("GitNativeIO initialized successfully");
  }

  /**
   * Execute a function (currently in-process).
   * @template T
   * @param {() => Promise<T>} jobFunction
   * @param {{timeout?:number}} [options]
   * @returns {Promise<T>}
   */
  async executeJob(jobFunction, options = {}) {
    await this._ensureInitialized();

    const startTime = Date.now();
    try {
      const result = await jobFunction();
      const duration = Date.now() - startTime;

      // Record execution metrics
      await this.writeMetrics({
        executionTime: duration,
        success: true,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Record error metrics
      await this.writeMetrics({
        executionTime: duration,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      throw error;
    }
  }

  /**
   * Enqueue a job with durability and priority.
   * @param {string} priority
   * @param {Function} job
   * @param {Object} [metadata]
   * @returns {Promise}
   */
  async addJob(priority, job, metadata = {}) {
    await this._ensureInitialized();
    return this._queueManager.addJob(priority, job, metadata);
  }

  /**
   * Acquire a CAS lock stored under refs/gitvan/locks/*.
   * @param {string} lockName
   * @param {Object} [options]
   * @returns {Promise<boolean>}
   */
  async acquireLock(lockName, options = {}) {
    await this._ensureInitialized();
    return this._lockManager.acquireLock(lockName, options);
  }

  /**
   * Release a previously acquired lock.
   * @param {string} lockName
   * @returns {Promise<boolean>}
   */
  async releaseLock(lockName) {
    await this._ensureInitialized();
    return this._lockManager.releaseLock(lockName);
  }

  /**
   * Write a result receipt (batched into git-notes).
   * @param {string} hookId
   * @param {any} result
   * @param {Record<string,any>} [metadata]
   * @returns {Promise<void>}
   */
  async writeReceipt(hookId, result, metadata = {}) {
    await this._ensureInitialized();
    return this._receiptWriter.writeReceipt(hookId, result, metadata);
  }

  /**
   * Write execution metrics (batched).
   * @param {Record<string,any>} metrics
   * @returns {Promise<void>}
   */
  async writeMetrics(metrics) {
    await this._ensureInitialized();
    return this._receiptWriter.writeMetrics(metrics);
  }

  /**
   * Write execution descriptor (batched).
   * @param {string} executionId
   * @param {Record<string,any>} execution
   * @returns {Promise<void>}
   */
  async writeExecution(executionId, execution) {
    await this._ensureInitialized();
    return this._receiptWriter.writeExecution(executionId, execution);
  }

  /**
   * Store a content-addressed snapshot.
   * @param {string} key
   * @param {any} data
   * @param {Record<string,any>} [metadata]
   * @returns {Promise<string>} contentHash
   */
  async storeSnapshot(key, data, metadata = {}) {
    await this._ensureInitialized();
    return this._snapshotStore.storeSnapshot(key, data, metadata);
  }

  /**
   * Retrieve snapshot by key or key+contentHash.
   * @param {string} key
   * @param {string|null} [contentHash]
   * @returns {Promise<any|null>}
   */
  async getSnapshot(key, contentHash = null) {
    await this._ensureInitialized();
    return this._snapshotStore.getSnapshot(key, contentHash);
  }

  /**
   * Check snapshot existence.
   * @param {string} key
   * @param {string|null} [contentHash]
   * @returns {Promise<boolean>}
   */
  async hasSnapshot(key, contentHash = null) {
    await this._ensureInitialized();
    return this._snapshotStore.hasSnapshot(key, contentHash);
  }

  /** @returns {Promise<void>} */
  async flushAll() {
    await this._ensureInitialized();
    await this._receiptWriter.flushAll();
  }

  /**
   * Is the named lock currently held (and not expired)?
   * @param {string} lockName
   * @returns {Promise<boolean>}
   */
  async isLocked(lockName) {
    await this._ensureInitialized();
    return this._lockManager.isLocked(lockName);
  }

  /**
   * List all snapshot headers.
   * @returns {Promise<Array>}
   */
  async listSnapshots() {
    await this._ensureInitialized();
    return this._snapshotStore.listSnapshots();
  }

  /**
   * Receipt/metrics/executions counters (including in-memory buffers).
   * @returns {Promise<Object>}
   */
  async getStatistics() {
    await this._ensureInitialized();
    return this._receiptWriter.getStatistics();
  }

  /**
   * Composite system health snapshot.
   * @returns {Promise<Object>}
   */
  async getStatus() {
    await this._ensureInitialized();

    const [queueStatus, locks, receipts, snapshots, workers] =
      await Promise.all([
        this._queueManager.getStatus(),
        this._lockManager.listLocks(),
        this._receiptWriter.getStatistics(),
        this._snapshotStore.getStatistics(),
        this._workerPool.getStatus(),
      ]);

    return {
      queue: queueStatus,
      locks,
      receipts,
      snapshots,
      workers,
    };
  }

  /** Recover queues, clean locks, flush buffers, trim cache. */
  async reconcile() {
    await this._ensureInitialized();

    this.logger.info("Reconciling GitNativeIO state...");

    await Promise.all([
      this._queueManager.reconcile(),
      this._lockManager.cleanupExpiredLocks(),
      this._receiptWriter.flushAll(),
      this._snapshotStore.cleanupCache(),
    ]);

    this.logger.info("GitNativeIO reconciliation complete");
  }

  /** Clear completed jobs, trim caches & old notes. */
  async cleanup() {
    await this._ensureInitialized();

    this.logger.info("Cleaning up GitNativeIO...");

    await Promise.all([
      this._queueManager.clearCompleted(),
      this._receiptWriter.cleanupOldReceipts(),
      this._snapshotStore.cleanupCache(),
    ]);

    this.logger.info("GitNativeIO cleanup complete");
  }

  /** Flush and terminate workers. */
  async shutdown() {
    if (!this._initialized) return;

    this.logger.info("Shutting down GitNativeIO...");

    await Promise.all([
      this._receiptWriter.flushAll(),
      this._workerPool.shutdown(),
      this._queueManager.shutdown?.(),
    ]);

    this._initialized = false;
    this.logger.info("GitNativeIO shutdown complete");
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
   * Merge user config with defaults.
   * @private
   * @param {any} userConfig
   * @returns {any}
   */
  _mergeConfig(userConfig = {}) {
    const defaults = {
      queue: {
        concurrency: 3,
        interval: 100,
        intervalCap: 5,
      },
      workers: {
        threads: 2,
        maxJobs: 10,
        timeout: 30000,
      },
      fs: {
        retryDelay: 100,
        maxOpenFDsGuard: true,
      },
      paths: {
        tmp: ".gitvan/tmp",
        queue: ".gitvan/queue",
        cache: ".gitvan/cache",
        artifacts: ".gitvan/artifacts",
        notesRef: "refs/gitvan/notes",
        locksRef: "refs/gitvan/locks",
        execRef: "refs/gitvan/executions",
      },
      git: {
        notesBatchSize: 100,
        gcAuto: false,
        shardQueues: true,
      },
    };

    return this._deepMerge(defaults, userConfig);
  }

  /**
   * Deep merge objects.
   * @private
   * @param {any} target
   * @param {any} source
   * @returns {any}
   */
  _deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        result[key] = this._deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }
}
