/**
 * src/jobs/job-bridge.mjs
 * Re-exports for backward compatibility
 *
 * This file is maintained for backward compatibility.
 * Implementations have been split into:
 * - job-bridge-core.mjs
 * - job-bridge-scheduler.mjs
 */

export { ReceiptQueue, JobBridgeCore } from './job-bridge-core.mjs';
export { JobBridge, getJobBridge, resetJobBridge } from './job-bridge-scheduler.mjs';
export { default } from './job-bridge-scheduler.mjs';
