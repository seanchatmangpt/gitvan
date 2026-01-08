// src/jobs/worker-template.mjs
// GitVan v3.0.0 — Worker Thread Template
// Generic worker template for Bree job execution

import { parentPort, workerData } from "worker_threads";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Worker execution wrapper
 * Provides standardized job execution in worker threads
 */
export class JobWorker {
  constructor(workerData) {
    this.workerData = workerData;
    this.jobId = workerData.jobId;
    this.jobFile = workerData.jobFile;
    this.context = workerData.context || {};
    this.payload = workerData.payload || {};
    this.meta = workerData.meta || {};
  }

  /**
   * Load job definition from file
   */
  async loadJob() {
    try {
      const jobModule = await import(this.jobFile);

      // Support multiple export patterns
      const jobDef = jobModule.default || jobModule;

      // Extract run function
      let runFn = null;
      if (typeof jobDef === "function") {
        runFn = jobDef;
      } else if (typeof jobDef.run === "function") {
        runFn = jobDef.run;
      } else if (jobDef.default && typeof jobDef.default.run === "function") {
        runFn = jobDef.default.run;
      }

      if (!runFn) {
        throw new Error(`Job ${this.jobId} does not export a run function`);
      }

      return { runFn, jobDef };
    } catch (error) {
      throw new Error(
        `Failed to load job ${this.jobId} from ${this.jobFile}: ${error.message}`
      );
    }
  }

  /**
   * Execute the job
   */
  async execute() {
    const startTime = Date.now();
    const startedAt = new Date().toISOString();

    try {
      // Load job
      const { runFn, jobDef } = await this.loadJob();

      // Prepare execution context
      const execContext = {
        ...this.context,
        payload: this.payload,
        jobId: this.jobId,
        meta: this.meta,
        env: {
          TZ: "UTC",
          LANG: "C",
          ...process.env,
          ...this.context.env,
        },
      };

      // Execute job
      const result = await runFn({
        payload: this.payload,
        ctx: execContext,
        context: execContext,
      });

      const finishedAt = new Date().toISOString();
      const duration = Date.now() - startTime;

      // Send success message to parent
      this.sendMessage({
        type: "success",
        jobId: this.jobId,
        result,
        startedAt,
        finishedAt,
        duration,
        timestamp: finishedAt,
      });

      return result;
    } catch (error) {
      const finishedAt = new Date().toISOString();
      const duration = Date.now() - startTime;

      // Send error message to parent
      this.sendMessage({
        type: "error",
        jobId: this.jobId,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        startedAt,
        finishedAt,
        duration,
        timestamp: finishedAt,
      });

      throw error;
    }
  }

  /**
   * Send message to parent thread
   */
  sendMessage(message) {
    if (parentPort) {
      parentPort.postMessage(message);
    }
  }

  /**
   * Log message (sends to parent as log message)
   */
  log(level, ...args) {
    this.sendMessage({
      type: "log",
      level,
      jobId: this.jobId,
      message: args.join(" "),
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Run worker if this file is executed directly
 */
if (workerData) {
  const worker = new JobWorker(workerData);

  worker
    .execute()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error("Worker execution failed:", error);
      process.exit(1);
    });
}

export default JobWorker;
