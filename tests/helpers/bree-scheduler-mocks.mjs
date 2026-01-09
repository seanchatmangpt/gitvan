// tests/test-utils/bree-scheduler-mocks.mjs
// GitVan v3.0.0 — Bree Scheduler Mocking Utilities
// Provides mock implementations for Bree scheduler testing with timer control

import { vi } from "vitest";

/**
 * Mock job result object
 */
export class MockJobResult {
  constructor(jobName, success = true, result = {}) {
    this.jobName = jobName;
    this.success = success;
    this.result = result;
    this.error = null;
    this.timestamp = new Date().toISOString();
    this.duration = 0;
  }
}

/**
 * Mock Bree job configuration
 */
export function createMockBreeJobConfig(jobName, options = {}) {
  return {
    name: jobName,
    path: options.path || `/jobs/${jobName}.mjs`,
    cron: options.cron || null,
    interval: options.interval || null,
    timeout: options.timeout || 0,
    date: options.date || null,
    worker: options.worker || null,
  };
}

/**
 * Mock Bree instance with fake timers support
 */
export class MockBree {
  constructor(config = {}) {
    this.config = config;
    this.jobs = new Map();
    this.isStarted = false;
    this.workerCreated = vi.fn();
    this.workerDeleted = vi.fn();
    this.workerError = vi.fn();
    this.eventHandlers = new Map();

    // Initialize jobs from config
    if (config.jobs && Array.isArray(config.jobs)) {
      for (const job of config.jobs) {
        this.jobs.set(job.name, job);
      }
    }
  }

  /**
   * Register event handler (on method)
   */
  on(eventName, handler) {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, []);
    }
    this.eventHandlers.get(eventName).push(handler);
  }

  /**
   * Emit event to all registered handlers
   */
  async _emitEvent(eventName, ...args) {
    const handlers = this.eventHandlers.get(eventName) || [];
    for (const handler of handlers) {
      try {
        await handler(...args);
      } catch (error) {
        console.error(`Error in ${eventName} handler:`, error);
      }
    }
  }

  /**
   * Start the scheduler
   */
  async start(jobName = null) {
    if (jobName) {
      // Start specific job
      if (!this.jobs.has(jobName)) {
        throw new Error(`Job ${jobName} not found`);
      }
    }
    this.isStarted = true;
  }

  /**
   * Stop the scheduler
   */
  async stop(jobName = null) {
    if (jobName) {
      // Stop specific job
      if (!this.jobs.has(jobName)) {
        return;
      }
    }
    this.isStarted = false;
  }

  /**
   * Add a job (dynamic)
   */
  add(jobConfig) {
    if (!jobConfig.name) {
      throw new Error("Job name is required");
    }
    this.jobs.set(jobConfig.name, jobConfig);
  }

  /**
   * Remove a job
   */
  remove(jobName) {
    if (!this.jobs.has(jobName)) {
      return false;
    }
    this.jobs.delete(jobName);
    return true;
  }

  /**
   * Run a job immediately (one-time execution)
   */
  async run(jobName) {
    if (!this.jobs.has(jobName)) {
      throw new Error(`Job ${jobName} not found`);
    }

    // Simulate job execution
    await this._emitEvent("worker created", jobName);

    try {
      // Simulate job work
      const job = this.jobs.get(jobName);
      if (job.worker && job.worker.workerData && job.worker.workerData.jobId) {
        // Job would execute in worker
      }

      await this._emitEvent("worker deleted", jobName);
    } catch (error) {
      await this._emitEvent("worker error", error, { name: jobName });
      throw error;
    }
  }

  /**
   * Get job configuration
   */
  getJob(jobName) {
    return this.jobs.get(jobName) || null;
  }

  /**
   * List all jobs
   */
  listJobs() {
    return Array.from(this.jobs.values());
  }

  /**
   * Check if job exists
   */
  hasJob(jobName) {
    return this.jobs.has(jobName);
  }
}

/**
 * Setup function for Bree scheduler tests with fake timers
 */
export function setupBreeSchedulerTest() {
  const timers = vi.useFakeTimers();

  return {
    /**
     * Fake timers instance for advance/runAll operations
     */
    timers,

    /**
     * Advance timers to trigger scheduled jobs
     */
    advanceTime(ms) {
      timers.advanceTimersByTime(ms);
    },

    /**
     * Run all pending timers
     */
    runAllTimers() {
      timers.runAllTimers();
    },

    /**
     * Get current fake time
     */
    now() {
      return timers.now();
    },

    /**
     * Cleanup after test
     */
    cleanup() {
      timers.useRealTimers();
    },

    /**
     * Create a mock Bree instance
     */
    createMockBree(config) {
      return new MockBree(config);
    },

    /**
     * Create a mock job result
     */
    createMockJobResult(jobName, success = true, result = {}) {
      return new MockJobResult(jobName, success, result);
    },
  };
}

/**
 * Mock worker for testing job execution
 */
export class MockWorker {
  constructor(workerData = {}) {
    this.workerData = workerData;
    this.messages = [];
    this.parentPort = {
      on: vi.fn((event, handler) => {
        if (event === "message") {
          this.messageHandler = handler;
        }
      }),
      postMessage: vi.fn((message) => {
        this.messages.push(message);
      }),
    };
  }

  /**
   * Simulate receiving a message
   */
  sendMessage(message) {
    if (this.messageHandler) {
      this.messageHandler(message);
    }
  }

  /**
   * Get all posted messages
   */
  getMessages() {
    return this.messages;
  }

  /**
   * Get last posted message
   */
  getLastMessage() {
    return this.messages[this.messages.length - 1];
  }
}

/**
 * Helper to verify job execution in mocks
 */
export function verifyJobExecution(mockBree, jobName) {
  return {
    /**
     * Check if job exists
     */
    exists() {
      return mockBree.hasJob(jobName);
    },

    /**
     * Get job config
     */
    getConfig() {
      return mockBree.getJob(jobName);
    },

    /**
     * Check if cron is set
     */
    hasCron() {
      const job = mockBree.getJob(jobName);
      return job && job.cron ? true : false;
    },

    /**
     * Check if interval is set
     */
    hasInterval() {
      const job = mockBree.getJob(jobName);
      return job && job.interval ? true : false;
    },

    /**
     * Check if timeout is set
     */
    hasTimeout() {
      const job = mockBree.getJob(jobName);
      return job && job.timeout ? true : false;
    },
  };
}

/**
 * Cron expression parser for testing
 */
export function parseCronExpression(cronExpr) {
  // Simple cron parser for testing: "minute hour day month weekday"
  const parts = cronExpr.trim().split(/\s+/);

  if (parts.length < 5) {
    return null;
  }

  return {
    minute: parts[0],
    hour: parts[1],
    day: parts[2],
    month: parts[3],
    weekday: parts[4],
    full: cronExpr,
  };
}

/**
 * Wait for async operations in tests
 */
export async function waitForJobExecution(ms = 100) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a test job file
 */
export async function createTestJobFile(jobsDir, jobName, implementation) {
  const { promises: fs } = await import("node:fs");
  const { join } = await import("pathe");

  const jobFile = join(jobsDir, `${jobName}.mjs`);
  const jobCode =
    typeof implementation === "string"
      ? implementation
      : `
export const meta = {
  name: "${jobName}",
  desc: "Test job",
  tags: []
};

export default async function run({ payload, ctx }) {
  ${typeof implementation === "function" ? implementation.toString() : 'return { success: true };'}
}
  `.trim();

  await fs.writeFile(jobFile, jobCode);
  return jobFile;
}

export default {
  MockBree,
  MockJobResult,
  MockWorker,
  createMockBreeJobConfig,
  setupBreeSchedulerTest,
  verifyJobExecution,
  parseCronExpression,
  waitForJobExecution,
  createTestJobFile,
};
