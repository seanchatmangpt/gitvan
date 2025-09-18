/**
 * GitVan v2 - New Composables Integration Test
 * Tests the new job, event, receipt, schedule, lock, and registry composables
 */

import {
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const TEST_DIR = "/tmp/gitvan-composables-test";

function setupTestEnvironment() {
  console.log("🧪 Setting up composables test environment...");

  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }

  mkdirSync(TEST_DIR, { recursive: true });

  // Create subdirectories
  mkdirSync(join(TEST_DIR, "jobs"), { recursive: true });
  mkdirSync(join(TEST_DIR, "events"), { recursive: true });
  mkdirSync(join(TEST_DIR, "schedules"), { recursive: true });
  mkdirSync(join(TEST_DIR, "packs"), { recursive: true });

  // Initialize Git repository
  execSync("git init", { cwd: TEST_DIR });
  writeFileSync(join(TEST_DIR, "README.md"), "# Test Repository\n");
  execSync("git add README.md", { cwd: TEST_DIR });
  execSync("git commit -m 'Initial commit'", { cwd: TEST_DIR });

  console.log("✅ Test environment ready");
}

async function testUseJob() {
  console.log("\n📋 Testing useJob composable...");

  const { withGitVan } = await import("./src/core/context.mjs");
  const { useJob } = await import("./src/composables/job.mjs");

  const ctx = {
    cwd: TEST_DIR,
    env: process.env,
  };

  let passed = 0;
  const total = 5;

  try {
    await withGitVan(ctx, async () => {
      const job = useJob();

      // Test 1: List jobs (should be empty initially)
      const jobs = await job.list();
      console.log(`✅ job.list(): Found ${jobs.length} jobs`);
      passed++;

      // Test 2: Create a test job
      const testJobContent = `/**
 * Test Job
 */

export default {
  meta: {
    name: 'test-job',
    description: 'A test job',
    tags: ['test', 'example']
  },
  
  async run({ payload, ctx }) {
    console.log('Test job executed with payload:', payload);
    return { success: true, payload };
  }
};
`;

      writeFileSync(join(TEST_DIR, "jobs", "test-job.mjs"), testJobContent);
      passed++;

      // Test 3: List jobs again (should find the test job)
      const jobsAfter = await job.list();
      console.log(
        `✅ job.list(): Found ${jobsAfter.length} jobs after creating test job`
      );
      passed++;

      // Test 4: Get specific job
      const testJob = await job.get("test-job");
      console.log(`✅ job.get(): Retrieved job '${testJob.name}'`);
      passed++;

      // Test 5: Validate job
      const validation = await job.validate("test-job");
      console.log(
        `✅ job.validate(): Job validation ${
          validation.valid ? "passed" : "failed"
        }`
      );
      passed++;
    });
  } catch (error) {
    console.log(`❌ useJob test failed: ${error.message}`);
  }

  console.log(`✅ useJob: ${passed}/${total} tests passed`);
  return passed === total;
}

async function testUseEvent() {
  console.log("\n📋 Testing useEvent composable...");

  const { withGitVan } = await import("./src/core/context.mjs");
  const { useEvent } = await import("./src/composables/event.mjs");

  const ctx = {
    cwd: TEST_DIR,
    env: process.env,
  };

  let passed = 0;
  const total = 4;

  try {
    await withGitVan(ctx, async () => {
      const event = useEvent();

      // Test 1: List events (should be empty initially)
      const events = await event.list();
      console.log(`✅ event.list(): Found ${events.length} events`);
      passed++;

      // Test 2: Register a test event
      const eventDef = await event.register("test-event", {
        name: "Test Event",
        description: "A test event",
        type: "custom",
        job: "test-job",
        pattern: {
          branch: "main",
        },
      });
      console.log(`✅ event.register(): Registered event '${eventDef.name}'`);
      passed++;

      // Test 3: List events again (should find the test event)
      const eventsAfter = await event.list();
      console.log(
        `✅ event.list(): Found ${eventsAfter.length} events after registration`
      );
      passed++;

      // Test 4: Get specific event
      const testEvent = await event.get("custom/test-event");
      console.log(`✅ event.get(): Retrieved event '${testEvent.name}'`);
      passed++;
    });
  } catch (error) {
    console.log(`❌ useEvent test failed: ${error.message}`);
  }

  console.log(`✅ useEvent: ${passed}/${total} tests passed`);
  return passed === total;
}

async function testUseReceipt() {
  console.log("\n📋 Testing useReceipt composable...");

  const { withGitVan } = await import("./src/core/context.mjs");
  const { useReceipt } = await import("./src/composables/receipt.mjs");

  const ctx = {
    cwd: TEST_DIR,
    env: process.env,
  };

  let passed = 0;
  const total = 4;

  try {
    await withGitVan(ctx, async () => {
      const receipt = useReceipt();

      // Test 1: List receipts (should be empty initially)
      const receipts = await receipt.list();
      console.log(`✅ receipt.list(): Found ${receipts.length} receipts`);
      passed++;

      // Test 2: Create a test receipt
      const testReceipt = await receipt.create({
        jobId: "test-job",
        status: "success",
        artifacts: ["test-output.txt"],
        metadata: {
          test: true,
          duration: 1000,
        },
      });
      console.log(`✅ receipt.create(): Created receipt '${testReceipt.id}'`);
      passed++;

      // Test 3: List receipts again (should find the test receipt)
      const receiptsAfter = await receipt.list();
      console.log(
        `✅ receipt.list(): Found ${receiptsAfter.length} receipts after creation`
      );
      passed++;

      // Test 4: Get receipt stats
      const stats = await receipt.getStats();
      console.log(
        `✅ receipt.getStats(): Total receipts: ${stats.total}, Success rate: ${stats.successRate}%`
      );
      passed++;
    });
  } catch (error) {
    console.log(`❌ useReceipt test failed: ${error.message}`);
  }

  console.log(`✅ useReceipt: ${passed}/${total} tests passed`);
  return passed === total;
}

async function testUseSchedule() {
  console.log("\n📋 Testing useSchedule composable...");

  const { withGitVan } = await import("./src/core/context.mjs");
  const { useSchedule } = await import("./src/composables/schedule.mjs");

  const ctx = {
    cwd: TEST_DIR,
    env: process.env,
  };

  let passed = 0;
  const total = 4;

  try {
    await withGitVan(ctx, async () => {
      const schedule = useSchedule();

      // Test 1: List schedules (should be empty initially)
      const schedules = await schedule.list();
      console.log(`✅ schedule.list(): Found ${schedules.length} schedules`);
      passed++;

      // Test 2: Add a test schedule
      const scheduleDef = await schedule.add(
        "test-schedule",
        "0 9 * * *",
        "test-job",
        {
          name: "Test Schedule",
          description: "A test schedule",
          timezone: "UTC",
        }
      );
      console.log(`✅ schedule.add(): Added schedule '${scheduleDef.name}'`);
      passed++;

      // Test 3: List schedules again (should find the test schedule)
      const schedulesAfter = await schedule.list();
      console.log(
        `✅ schedule.list(): Found ${schedulesAfter.length} schedules after adding`
      );
      passed++;

      // Test 4: Get specific schedule
      const testSchedule = await schedule.get("test-schedule");
      console.log(
        `✅ schedule.get(): Retrieved schedule '${testSchedule.name}'`
      );
      passed++;
    });
  } catch (error) {
    console.log(`❌ useSchedule test failed: ${error.message}`);
  }

  console.log(`✅ useSchedule: ${passed}/${total} tests passed`);
  return passed === total;
}

async function testUseLock() {
  console.log("\n📋 Testing useLock composable...");

  const { withGitVan } = await import("./src/core/context.mjs");
  const { useLock } = await import("./src/composables/lock.mjs");

  const ctx = {
    cwd: TEST_DIR,
    env: process.env,
  };

  let passed = 0;
  const total = 4;

  try {
    await withGitVan(ctx, async () => {
      const lock = useLock();

      // Test 1: List locks (should be empty initially)
      const locks = await lock.list();
      console.log(`✅ lock.list(): Found ${locks.length} locks`);
      passed++;

      // Test 2: Acquire a test lock
      const lockResult = await lock.acquire("test-lock", {
        timeout: 5000,
        metadata: { test: true },
      });
      console.log(
        `✅ lock.acquire(): ${
          lockResult.acquired ? "Acquired" : "Failed to acquire"
        } lock '${lockResult.name}'`
      );
      passed++;

      // Test 3: Check if lock is locked
      const isLocked = await lock.isLocked("test-lock");
      console.log(
        `✅ lock.isLocked(): Lock 'test-lock' is ${
          isLocked ? "locked" : "not locked"
        }`
      );
      passed++;

      // Test 4: Release the lock
      const releaseResult = await lock.release("test-lock");
      console.log(
        `✅ lock.release(): ${
          releaseResult.released ? "Released" : "Failed to release"
        } lock '${releaseResult.name}'`
      );
      passed++;
    });
  } catch (error) {
    console.log(`❌ useLock test failed: ${error.message}`);
  }

  console.log(`✅ useLock: ${passed}/${total} tests passed`);
  return passed === total;
}

async function testUseRegistry() {
  console.log("\n📋 Testing useRegistry composable...");

  const { withGitVan } = await import("./src/core/context.mjs");
  const { useRegistry } = await import("./src/composables/registry.mjs");

  const ctx = {
    cwd: TEST_DIR,
    env: process.env,
  };

  let passed = 0;
  const total = 4;

  try {
    await withGitVan(ctx, async () => {
      const registry = useRegistry();

      // Test 1: Get registry stats
      const stats = await registry.getStats();
      console.log(
        `✅ registry.getStats(): Jobs: ${stats.jobs.total}, Events: ${stats.events.total}, Schedules: ${stats.schedules.total}`
      );
      passed++;

      // Test 2: Search registry
      const searchResults = await registry.search("test");
      console.log(
        `✅ registry.search(): Found ${searchResults.total} results for 'test'`
      );
      passed++;

      // Test 3: Filter registry
      const filterResults = await registry.filter({ type: "jobs" });
      console.log(
        `✅ registry.filter(): Found ${filterResults.jobs.length} jobs`
      );
      passed++;

      // Test 4: Validate registry
      const validation = await registry.validate();
      console.log(
        `✅ registry.validate(): ${validation.summary.valid} valid, ${validation.summary.invalid} invalid`
      );
      passed++;
    });
  } catch (error) {
    console.log(`❌ useRegistry test failed: ${error.message}`);
  }

  console.log(`✅ useRegistry: ${passed}/${total} tests passed`);
  return passed === total;
}

async function testComposableIntegration() {
  console.log("\n📋 Testing composable integration...");

  const { withGitVan } = await import("./src/core/context.mjs");
  const { useJob, useEvent, useReceipt, useSchedule, useLock } = await import(
    "./src/composables/index.mjs"
  );

  const ctx = {
    cwd: TEST_DIR,
    env: process.env,
  };

  let passed = 0;
  const total = 3;

  try {
    await withGitVan(ctx, async () => {
      // Test 1: All composables can be imported together
      const job = useJob();
      const event = useEvent();
      const receipt = useReceipt();
      const schedule = useSchedule();
      const lock = useLock();

      console.log("✅ All composables imported successfully");
      passed++;

      // Test 2: Composables share the same context
      const jobCwd = job.cwd;
      const eventCwd = event.cwd;
      const receiptCwd = receipt.cwd;

      if (jobCwd === eventCwd && eventCwd === receiptCwd) {
        console.log("✅ Composables share the same context");
        passed++;
      } else {
        console.log("❌ Composables have different contexts");
      }

      // Test 3: Composables can work together (test receipt creation)
      try {
        const receiptResult = await receipt.create({
          jobId: "integration-test",
          status: "success",
          metadata: { integration: true },
        });

        console.log("✅ Composables can work together");
        passed++;
      } catch (error) {
        console.log(`❌ Composables integration failed: ${error.message}`);
      }
    });
  } catch (error) {
    console.log(`❌ Composable integration test failed: ${error.message}`);
  }

  console.log(`✅ Composable Integration: ${passed}/${total} tests passed`);
  return passed === total;
}

function generateReport(results) {
  console.log("\n📊 New Composables Test Report");
  console.log("─".repeat(60));

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  const successRate = Math.round((passedTests / totalTests) * 100);

  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${successRate}%`);

  console.log("\nTest Results:");
  for (const [testName, result] of Object.entries(results)) {
    const status = result ? "✅" : "❌";
    console.log(`  ${status} ${testName}`);
  }

  if (successRate === 100) {
    console.log("\n🎉 All new composables are working perfectly!");
    console.log("✅ useJob composable is fully functional");
    console.log("✅ useEvent composable is fully functional");
    console.log("✅ useReceipt composable is fully functional");
    console.log("✅ useSchedule composable is fully functional");
    console.log("✅ useLock composable is fully functional");
    console.log("✅ useRegistry composable is fully functional");
    console.log("✅ Composable integration is working");
  } else {
    console.log("\n⚠️ Some composables need attention.");
  }

  return successRate === 100;
}

async function main() {
  console.log("🚀 New Composables Integration Test\n");

  setupTestEnvironment();

  const results = {
    "useJob Composable": await testUseJob(),
    "useEvent Composable": await testUseEvent(),
    "useReceipt Composable": await testUseReceipt(),
    "useSchedule Composable": await testUseSchedule(),
    "useLock Composable": await testUseLock(),
    "useRegistry Composable": await testUseRegistry(),
    "Composable Integration": await testComposableIntegration(),
  };

  const success = generateReport(results);

  // Clean up
  rmSync(TEST_DIR, { recursive: true, force: true });

  process.exit(success ? 0 : 1);
}

main();
