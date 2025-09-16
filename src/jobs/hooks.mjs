// src/jobs/hooks.mjs
// GitVan v2 — Job Hooks System
// Lifecycle hooks for job execution

import { createHooks } from "hookable";

/**
 * Job hooks system
 * Provides lifecycle hooks for job execution
 */
export class JobHooks {
  constructor() {
    this.hooks = createHooks();
    this.hookCounts = new Map();
  }

  /**
   * Add a hook
   */
  hook(name, fn) {
    this.hooks.hook(name, fn);
    this.hookCounts.set(name, (this.hookCounts.get(name) || 0) + 1);
  }

  /**
   * Remove a hook
   */
  unhook(name, fn) {
    this.hooks.removeHook(name, fn);
    const count = this.hookCounts.get(name) || 0;
    if (count > 0) {
      this.hookCounts.set(name, count - 1);
    }
  }

  /**
   * Call hooks
   */
  async callHook(name, ...args) {
    return await this.hooks.callHook(name, ...args);
  }

  /**
   * Call hooks in parallel
   */
  async callHookParallel(name, ...args) {
    return await this.hooks.callHookParallel(name, ...args);
  }

  /**
   * Get hook statistics
   */
  getStats() {
    return {
      totalHooks: Array.from(this.hookCounts.values()).reduce(
        (a, b) => a + b,
        0,
      ),
      hookCounts: Object.fromEntries(this.hookCounts),
    };
  }

  /**
   * List all registered hooks
   */
  listHooks() {
    return Array.from(this.hookCounts.keys());
  }
}

/**
 * Built-in job hooks
 */
export const JOB_HOOKS = {
  // Job lifecycle hooks
  "job:before": "Called before job execution starts",
  "job:after": "Called after job execution completes successfully",
  "job:error": "Called when job execution fails",

  // Daemon hooks
  "daemon:start": "Called when daemon starts",
  "daemon:stop": "Called when daemon stops",
  "daemon:tick": "Called on each daemon tick",

  // Event hooks
  "event:detected": "Called when a git event is detected",
  "event:processed": "Called after event jobs are processed",

  // Cron hooks
  "cron:schedule": "Called when cron jobs are scheduled",
  "cron:execute": "Called when cron jobs are executed",

  // Receipt hooks
  "receipt:write": "Called when a job receipt is written",
  "receipt:read": "Called when a job receipt is read",

  // Lock hooks
  "lock:acquire": "Called when a job lock is acquired",
  "lock:release": "Called when a job lock is released",
  "lock:fail": "Called when a job lock acquisition fails",
};

/**
 * Default hook implementations
 */
export const DEFAULT_HOOKS = {
  /**
   * Log job execution
   */
  "job:before": async ({ id, payload, ctx }) => {
    console.log(`🚀 Starting job: ${id}`);
    if (payload && Object.keys(payload).length > 0) {
      console.log(`   Payload: ${JSON.stringify(payload)}`);
    }
  },

  "job:after": async ({ id, result, ctx }) => {
    console.log(`✅ Job completed: ${id} (${result.duration}ms)`);
    if (result.artifacts && result.artifacts.length > 0) {
      console.log(`   Artifacts: ${result.artifacts.length}`);
    }
  },

  "job:error": async ({ id, error, ctx }) => {
    console.error(`❌ Job failed: ${id}`);
    console.error(`   Error: ${error.message}`);
  },

  /**
   * Log daemon events
   */
  "daemon:start": async () => {
    console.log("🔄 Daemon started");
  },

  "daemon:stop": async () => {
    console.log("⏹️ Daemon stopped");
  },

  "event:detected": async ({ from, to }) => {
    console.log(`📡 Git event detected: ${from} → ${to}`);
  },

  "cron:execute": async ({ jobs }) => {
    console.log(`⏰ Executing ${jobs.length} cron jobs`);
  },

  /**
   * Receipt logging
   */
  "receipt:write": async ({ id, note, ref }) => {
    console.log(`📝 Receipt written for job: ${id}`);
  },

  /**
   * Lock management
   */
  "lock:acquire": async ({ id, fingerprint }) => {
    console.log(`🔒 Lock acquired for job: ${id}`);
  },

  "lock:release": async ({ id }) => {
    console.log(`🔓 Lock released for job: ${id}`);
  },

  "lock:fail": async ({ id, reason }) => {
    console.warn(`⚠️ Lock acquisition failed for job: ${id} - ${reason}`);
  },
};

/**
 * Create a job hooks instance with default hooks
 */
export function createJobHooks(options = {}) {
  const hooks = new JobHooks();

  // Add default hooks if enabled
  if (options.defaultHooks !== false) {
    for (const [name, fn] of Object.entries(DEFAULT_HOOKS)) {
      hooks.hook(name, fn);
    }
  }

  // Add custom hooks from options
  if (options.hooks) {
    for (const [name, fn] of Object.entries(options.hooks)) {
      hooks.hook(name, fn);
    }
  }

  return hooks;
}

/**
 * Hook middleware for job execution
 */
export class JobHookMiddleware {
  constructor(hooks) {
    this.hooks = hooks;
  }

  /**
   * Wrap job execution with hooks
   */
  async executeWithHooks(jobDef, executeFn, options = {}) {
    const { payload = {}, ctx = {} } = options;

    // Call before hook
    await this.hooks.callHook("job:before", {
      id: jobDef.id,
      payload,
      ctx,
    });

    let result;
    try {
      // Execute the job
      result = await executeFn();

      // Call after hook
      await this.hooks.callHook("job:after", {
        id: jobDef.id,
        result,
        ctx,
      });

      return result;
    } catch (error) {
      // Call error hook
      await this.hooks.callHook("job:error", {
        id: jobDef.id,
        error,
        ctx,
      });

      throw error;
    }
  }

  /**
   * Wrap daemon operations with hooks
   */
  async daemonWithHooks(operation, ...args) {
    switch (operation) {
      case "start":
        await this.hooks.callHook("daemon:start");
        break;
      case "stop":
        await this.hooks.callHook("daemon:stop");
        break;
      case "tick":
        await this.hooks.callHook("daemon:tick");
        break;
    }
  }

  /**
   * Wrap event operations with hooks
   */
  async eventWithHooks(operation, data) {
    switch (operation) {
      case "detected":
        await this.hooks.callHook("event:detected", data);
        break;
      case "processed":
        await this.hooks.callHook("event:processed", data);
        break;
    }
  }

  /**
   * Wrap cron operations with hooks
   */
  async cronWithHooks(operation, data) {
    switch (operation) {
      case "schedule":
        await this.hooks.callHook("cron:schedule", data);
        break;
      case "execute":
        await this.hooks.callHook("cron:execute", data);
        break;
    }
  }

  /**
   * Wrap receipt operations with hooks
   */
  async receiptWithHooks(operation, data) {
    switch (operation) {
      case "write":
        await this.hooks.callHook("receipt:write", data);
        break;
      case "read":
        await this.hooks.callHook("receipt:read", data);
        break;
    }
  }

  /**
   * Wrap lock operations with hooks
   */
  async lockWithHooks(operation, data) {
    switch (operation) {
      case "acquire":
        await this.hooks.callHook("lock:acquire", data);
        break;
      case "release":
        await this.hooks.callHook("lock:release", data);
        break;
      case "fail":
        await this.hooks.callHook("lock:fail", data);
        break;
    }
  }
}

/**
 * CLI for hook management
 */
export class HookCLI {
  constructor() {
    this.hooks = createJobHooks();
  }

  /**
   * List available hooks
   */
  list() {
    console.log("Available Job Hooks:");
    console.log("=".repeat(50));

    for (const [name, description] of Object.entries(JOB_HOOKS)) {
      const count = this.hooks.hookCounts.get(name) || 0;
      console.log(`${name.padEnd(20)} - ${description} (${count} handlers)`);
    }
  }

  /**
   * Show hook statistics
   */
  stats() {
    const stats = this.hooks.getStats();

    console.log("Hook Statistics:");
    console.log(`  Total hooks: ${stats.totalHooks}`);
    console.log(`  Hook types: ${Object.keys(stats.hookCounts).length}`);

    if (Object.keys(stats.hookCounts).length > 0) {
      console.log("\nHook counts:");
      for (const [name, count] of Object.entries(stats.hookCounts)) {
        console.log(`  ${name}: ${count}`);
      }
    }
  }

  /**
   * Test a hook
   */
  async test(hookName, data = {}) {
    if (!JOB_HOOKS[hookName]) {
      console.error(`Unknown hook: ${hookName}`);
      return;
    }

    console.log(`Testing hook: ${hookName}`);
    console.log(`Data: ${JSON.stringify(data, null, 2)}`);

    try {
      await this.hooks.callHook(hookName, data);
      console.log("✅ Hook executed successfully");
    } catch (error) {
      console.error("❌ Hook failed:", error.message);
    }
  }
}
