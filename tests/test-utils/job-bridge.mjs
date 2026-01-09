/**
 * Test Utilities - Job Bridge Test Helpers
 * Provides utilities for testing job bridge and scheduler integration
 */

import { sleep } from './helpers.mjs';

/**
 * Reset job bridge singletons and instances
 * Call this in beforeEach for test isolation
 */
export async function resetJobBridgeState() {
  // Allow async cleanup to complete
  await sleep(0);
}

/**
 * Create a mock worker file wrapper
 * Useful for testing worker execution
 */
export function createMockWorkerFile(jobName) {
  return `
// Mock worker for ${jobName}
import { parentPort } from 'worker_threads';

const jobName = '${jobName}';
let executions = 0;

parentPort.on('message', async (message) => {
  executions++;
  const result = {
    success: true,
    jobName: '${jobName}',
    execution: executions,
    receivedAt: new Date().toISOString(),
    workerData: message
  };

  parentPort.postMessage(result);
});
`;
}

/**
 * Wait for scheduler state change with timeout
 * @param {Object} scheduler - BreeScheduler instance
 * @param {Function} predicate - Condition to check
 * @param {Object} options - Configuration
 * @returns {Promise<boolean>}
 */
export async function waitForSchedulerState(scheduler, predicate, options = {}) {
  const {
    timeout = 5000,
    interval = 100
  } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (predicate(scheduler)) {
      return true;
    }
    await sleep(interval);
  }

  return false;
}

/**
 * Verify scheduler job state
 * @param {Object} scheduler - BreeScheduler instance
 * @param {string} jobName - Job name to check
 * @returns {Object} Job state information
 */
export function getSchedulerJobState(scheduler, jobName) {
  const job = scheduler.getJob(jobName);
  return {
    exists: job !== null,
    job: job,
    isScheduled: scheduler.hasJob(jobName),
    status: job ? 'found' : 'not_found'
  };
}

/**
 * Get all scheduler state information
 * @param {Object} scheduler - BreeScheduler instance
 * @returns {Object}
 */
export function getFullSchedulerState(scheduler) {
  return {
    isRunning: scheduler.isRunning,
    jobCount: scheduler.jobs.size,
    jobs: scheduler.listJobs(),
    status: scheduler.getStatus()
  };
}

/**
 * Snapshot scheduler state for comparison
 * @param {Object} scheduler - BreeScheduler instance
 * @returns {Object}
 */
export function snapshotSchedulerState(scheduler) {
  const state = getFullSchedulerState(scheduler);
  return {
    timestamp: Date.now(),
    ...state,
    jobNames: Array.from(scheduler.jobs.keys())
  };
}

/**
 * Compare two scheduler state snapshots
 * @param {Object} snapshot1 - First state snapshot
 * @param {Object} snapshot2 - Second state snapshot
 * @returns {Object} Difference report
 */
export function compareSchedulerSnapshots(snapshot1, snapshot2) {
  return {
    jobCountChanged: snapshot1.jobCount !== snapshot2.jobCount,
    jobCountDelta: snapshot2.jobCount - snapshot1.jobCount,
    jobsAdded: snapshot2.jobNames.filter(j => !snapshot1.jobNames.includes(j)),
    jobsRemoved: snapshot1.jobNames.filter(j => !snapshot2.jobNames.includes(j)),
    runningStateChanged: snapshot1.isRunning !== snapshot2.isRunning,
    durationMs: snapshot2.timestamp - snapshot1.timestamp
  };
}

/**
 * Reset all test infrastructure
 * Call this in beforeEach/afterEach for isolation
 */
export async function resetTestInfrastructure() {
  await resetJobBridgeState();
  await sleep(0);
}
