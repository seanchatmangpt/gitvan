// src/git-native/worker.mjs
// Worker thread for Git-Native I/O operations

import { parentPort } from "node:worker_threads";

parentPort.on("message", async (message) => {
  try {
    const { jobId, jobFunction, timeout } = message;

    if (!jobId) {
      throw new Error("jobId is not defined in message");
    }

    // Set timeout
    const timeoutId = setTimeout(() => {
      parentPort.postMessage({
        jobId,
        error: "Worker timeout",
        success: false,
      });
    }, timeout);

    // Execute job
    const result = await eval("(" + jobFunction + ")")();

    clearTimeout(timeoutId);

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
