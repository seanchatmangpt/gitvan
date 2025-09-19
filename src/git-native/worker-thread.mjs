// src/git-native/worker.mjs
// Worker thread for Git-Native I/O operations

import { parentPort } from "node:worker_threads";
import { useLog } from '../composables/log.mjs';

// Initialize logger for worker
const log = useLog('WorkerThread');

parentPort.on("message", async (message) => {
  try {
    const { jobId, jobFunction, timeout } = message;

    if (!jobId) {
      throw new Error("jobId is not defined in message");
    }

    log.debug(`Starting job ${jobId}`);

    // Set timeout
    const timeoutId = setTimeout(() => {
      log.warn(`Job ${jobId} timed out after ${timeout}ms`);
      parentPort.postMessage({
        jobId,
        error: "Worker timeout",
        success: false,
      });
    }, timeout);

    // Execute job
    const result = await eval("(" + jobFunction + ")")();

    clearTimeout(timeoutId);
    log.debug(`Job ${jobId} completed successfully`);

    parentPort.postMessage({
      jobId,
      result,
      success: true,
    });
  } catch (error) {
    parentPort.postMessage({
      jobId,
      error: error.message,
      success: false,
    });
  }
});
