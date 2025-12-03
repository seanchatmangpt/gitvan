/**
 * GitVan v3.1.0 - Main Entry Point
 * Git-native development automation
 *
 * @module gitvan
 */

// ==========================================
// CORE COMPOSABLES
// ==========================================
export {
  // Git operations
  useGit,

  // File system
  useFileSystem,

  // Test environment
  useTestEnvironment,
  withTestEnvironment,

  // Worktrees
  useWorktree,

  // Templates
  useTemplate,

  // Notes
  useNotes,

  // Unrouting
  useUnrouting,

  // Jobs & Events
  useJob,
  useEvent,
  useSchedule,

  // Infrastructure
  useReceipt,
  useLock,
  useRegistry,
  usePack,

  // Context utilities
  withGitVan,
  useGitVan,
  tryUseGitVan,
} from "./composables/index.mjs";

// ==========================================
// RUNTIME EXPORTS
// ==========================================
export { boot, createGitVan } from "./runtime/boot.mjs";
export { defineJob } from "./runtime/define-job.mjs";
export { GitVanDaemon } from "./runtime/daemon.mjs";
export {
  acquireLock,
  releaseLock,
  generateLockRef,
  worktreeLockRef,
} from "./runtime/locks.mjs";

// ==========================================
// JOB SYSTEM
// ==========================================
export { scanJobs } from "./jobs/scan.mjs";
export { JobRunner, JobResult, JobExecutionContext } from "./jobs/runner.mjs";

// ==========================================
// PACK SYSTEM
// ==========================================
export {
  Pack,
  PackManager,
  PackApplier,
  PackPlanner,
  PackRegistry,
  loadPackManifest,
  validateManifest,
  PackManifestSchema,
  PackSigner,
  ReceiptManager,
} from "./pack/index.mjs";

// ==========================================
// GIT-NATIVE I/O
// ==========================================
export { GitNativeIO } from "./git-native/GitNativeIO.mjs";
export { LockManager } from "./git-native/LockManager.mjs";
export { SnapshotStore } from "./git-native/SnapshotStore.mjs";
export { QueueManager } from "./git-native/QueueManager.mjs";
export { WorkerPool } from "./git-native/WorkerPool.mjs";
export { ReceiptWriter } from "./git-native/ReceiptWriter.mjs";

// ==========================================
// CONFIGURATION
// ==========================================
export { loadOptions } from "./config/loader.mjs";
export { GitVanDefaults } from "./config/defaults.mjs";

// ==========================================
// CORE INFRASTRUCTURE
// ==========================================
export { GitVanContext } from "./core/context.mjs";
export { GitVanHookable } from "./core/hookable.mjs";
export { JobRegistry } from "./core/job-registry.mjs";

// ==========================================
// CLI (for programmatic usage)
// ==========================================
export { cli, main } from "./cli.mjs";

// ==========================================
// TYPE DEFINITIONS (for JSDoc)
// ==========================================

/**
 * @typedef {Object} GitVanOptions
 * @property {string} [cwd] - Working directory
 * @property {string} [gitDir] - Git directory path
 * @property {boolean} [enableHooks] - Enable git hooks
 * @property {boolean} [enableJobs] - Enable job system
 * @property {boolean} [enablePacks] - Enable pack system
 */

/**
 * @typedef {Object} JobDefinition
 * @property {string} name - Job name
 * @property {string} [description] - Job description
 * @property {Function} handler - Job handler function
 * @property {string} [schedule] - Cron schedule
 * @property {string[]} [triggers] - Event triggers
 * @property {Object} [options] - Job options
 */

/**
 * @typedef {Object} PackManifest
 * @property {string} name - Pack name
 * @property {string} version - Pack version
 * @property {string} description - Pack description
 * @property {Object} hooks - Hook definitions
 * @property {Object} jobs - Job definitions
 * @property {Object} workflows - Workflow definitions
 * @property {string[]} [dependencies] - Pack dependencies
 */

/**
 * @typedef {Object} GitNativeIOOptions
 * @property {string} repoPath - Repository path
 * @property {string} [notesRef] - Git notes ref
 * @property {boolean} [enableLocking] - Enable file locking
 * @property {boolean} [enableSnapshots] - Enable snapshots
 * @property {number} [workerPoolSize] - Worker pool size
 */
