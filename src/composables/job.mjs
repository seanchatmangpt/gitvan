/**
 * GitVan v2 - useJob() Composable
 * Provides job lifecycle management, execution, and discovery
 *
 * This is the unified job composable that combines all job-related functionality
 * from focused sub-composables for better maintainability.
 */

import { useGitVan, tryUseGitVan } from "../core/context.mjs";
import { useGit } from "./git/index.mjs";
import { useReceipt } from "./receipt.mjs";
import { useLock } from "./lock.mjs";
import { JobRunner } from "../jobs/runner.mjs";
import { getJobBridge } from "../jobs/job-bridge.mjs";
import { createJobDiscovery } from "./job-discovery.mjs";
import { createJobExecution } from "./job-execution.mjs";
import { createJobManagement } from "./job-management.mjs";
import { createJobScheduler } from "./job-scheduler.mjs";
import { createJobUtilities } from "./job-utilities.mjs";

/**
 * Main job composable that combines all job-related functionality
 * @returns {Object} Combined job API
 */
export function useJob() {
  // Get context from unctx - this must be called synchronously
  let ctx;
  try {
    ctx = useGitVan();
  } catch {
    ctx = tryUseGitVan?.() || null;
  }

  // Resolve working directory and environment
  const cwd = (ctx && ctx.cwd) || process.cwd();
  const env = {
    ...process.env,
    ...(ctx && ctx.env ? ctx.env : {}),
    TZ: "UTC", // Always override to UTC for determinism
    LANG: "C", // Always override to C locale for determinism
  };

  const base = { cwd, env };

  // Initialize dependencies
  const git = useGit();
  const receipt = useReceipt();
  const lock = useLock();
  const runner = new JobRunner({ cwd: base.cwd });
  const jobBridge = getJobBridge({ cwd: base.cwd });

  // Create sub-composables
  const discovery = createJobDiscovery(base);
  const execution = createJobExecution(base, { git, receipt, lock, runner, discovery });
  const management = createJobManagement({ discovery });
  const scheduler = createJobScheduler({ jobBridge, discovery });
  const utilities = createJobUtilities({ git, discovery });

  // Combine all APIs into single object for backward compatibility
  return {
    // Context properties (exposed for testing)
    cwd: base.cwd,
    env: base.env,

    // Job Discovery methods
    list: discovery.list.bind(discovery),
    get: discovery.get.bind(discovery),
    exists: discovery.exists.bind(discovery),
    search: discovery.search.bind(discovery),
    getByTag: discovery.getByTag.bind(discovery),
    getCronJobs: discovery.getCronJobs.bind(discovery),
    listUnrouted: discovery.listUnrouted.bind(discovery),
    getByUnroutedName: discovery.getByUnroutedName.bind(discovery),
    getByDirectory: discovery.getByDirectory.bind(discovery),

    // Job Execution methods
    run: execution.run.bind(execution),
    runWithLock: execution.runWithLock.bind(execution),
    status: execution.status.bind(execution),
    isRunning: execution.isRunning.bind(execution),
    history: execution.history.bind(execution),

    // Job Management methods
    validate: management.validate.bind(management),
    validateAll: management.validateAll.bind(management),

    // Job Scheduler methods
    schedule: scheduler.schedule.bind(scheduler),
    unschedule: scheduler.unschedule.bind(scheduler),
    startScheduler: scheduler.startScheduler.bind(scheduler),
    stopScheduler: scheduler.stopScheduler.bind(scheduler),
    getSchedulerStatus: scheduler.getSchedulerStatus.bind(scheduler),
    listScheduledJobs: scheduler.listScheduledJobs.bind(scheduler),
    runWithBree: scheduler.runWithBree.bind(scheduler),
    autoScheduleCronJobs: scheduler.autoScheduleCronJobs.bind(scheduler),
    shutdownScheduler: scheduler.shutdownScheduler.bind(scheduler),

    // Job Utilities methods
    createContext: utilities.createContext.bind(utilities),
    getFingerprint: utilities.getFingerprint.bind(utilities),
    unroute: utilities.unroute.bind(utilities),
    getDirectory: utilities.getDirectory.bind(utilities),
    isInDirectory: utilities.isInDirectory.bind(utilities),
    createUnrouteMapping: utilities.createUnrouteMapping.bind(utilities),
    unrouteAll: utilities.unrouteAll.bind(utilities),
  };
}
