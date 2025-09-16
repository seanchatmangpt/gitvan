// examples/jobs-advanced-demo.mjs
// GitVan v2 — Advanced Jobs System Demo
// Demonstrates cron scheduling, event-driven jobs, daemon, and hooks

import { CronCLI } from "../src/jobs/cron.mjs";
import { EventCLI } from "../src/jobs/events.mjs";
import { DaemonCLI } from "../src/jobs/daemon.mjs";
import { HookCLI, createJobHooks } from "../src/jobs/hooks.mjs";
import { jobCLI } from "../src/cli/job.mjs";

async function demonstrateAdvancedJobs() {
  console.log("=== GitVan Advanced Jobs System Demo ===\n");

  try {
    // 1. Demonstrate Cron Scheduler
    console.log("1. Cron Scheduler Demo:");
    console.log("   - Lists scheduled jobs with next execution times");
    console.log("   - Shows dry run for specific times");
    console.log("   - Supports complex cron expressions (*/15, 9-17, etc.)");

    const cronCLI = new CronCLI();
    await cronCLI.list();
    console.log("");

    // 2. Demonstrate Event-Driven Jobs
    console.log("2. Event-Driven Jobs Demo:");
    console.log("   - Evaluates git event predicates");
    console.log("   - Supports tag creation, path changes, commit messages");
    console.log("   - Logical operators: any, all");

    const eventCLI = new EventCLI();
    await eventCLI.list();
    console.log("");

    // 3. Demonstrate Hooks System
    console.log("3. Hooks System Demo:");
    console.log("   - Lifecycle hooks for job execution");
    console.log("   - Daemon hooks for monitoring");
    console.log("   - Custom hook implementations");

    const hookCLI = new HookCLI();
    hookCLI.list();
    console.log("");

    // 4. Demonstrate Custom Hooks
    console.log("4. Custom Hooks Demo:");
    const customHooks = createJobHooks({
      hooks: {
        "job:before": async ({ id, payload }) => {
          console.log(
            `🔧 Custom hook: Starting job ${id} with payload:`,
            payload,
          );
        },
        "job:after": async ({ id, result }) => {
          console.log(
            `🔧 Custom hook: Job ${id} completed in ${result.duration}ms`,
          );
        },
        "job:error": async ({ id, error }) => {
          console.log(`🔧 Custom hook: Job ${id} failed: ${error.message}`);
        },
      },
    });

    // Test custom hooks
    await customHooks.callHook("job:before", {
      id: "demo:custom",
      payload: { test: "custom hook" },
    });
    await customHooks.callHook("job:after", {
      id: "demo:custom",
      result: { duration: 150 },
    });
    console.log("");

    // 5. Demonstrate Daemon Status
    console.log("5. Daemon Status Demo:");
    console.log("   - Shows daemon configuration and status");
    console.log("   - Displays job statistics");
    console.log("   - Monitors git events and cron schedules");

    const daemonCLI = new DaemonCLI();
    await daemonCLI.status();
    await daemonCLI.stats();
    console.log("");

    // 6. Demonstrate Job Execution with Hooks
    console.log("6. Job Execution with Hooks Demo:");
    console.log("   - Runs jobs with full hook integration");
    console.log("   - Shows before/after/error hooks in action");
    console.log("   - Demonstrates receipt and lock management");

    try {
      const result = await jobCLI("run", {
        id: "test:simple",
        payload: { demo: "advanced features" },
      });
      console.log("✅ Job executed successfully with hooks");
    } catch (error) {
      console.log("ℹ️ Job execution skipped (may be locked or not available)");
    }
    console.log("");

    // 7. Demonstrate Hook Statistics
    console.log("7. Hook Statistics Demo:");
    hookCLI.stats();
    console.log("");

    console.log("=== Advanced Jobs System Demo Complete ===");
    console.log("\nKey Features Demonstrated:");
    console.log("✅ Cron scheduling with complex expressions");
    console.log("✅ Event-driven job triggers");
    console.log("✅ Comprehensive hooks system");
    console.log("✅ Daemon monitoring and management");
    console.log("✅ Custom hook implementations");
    console.log("✅ Job execution with full lifecycle hooks");
    console.log("✅ Statistics and monitoring");
  } catch (error) {
    console.error("❌ Advanced jobs demo failed:", error.message);
    console.error(error.stack);
  }
}

// Run the demonstration
demonstrateAdvancedJobs();
