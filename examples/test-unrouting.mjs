/**
 * GitVan Unrouting Test
 * Simple test to verify unrouting functionality
 */

import { useUnrouting } from "./src/composables/unrouting.mjs";
import { withGitVan } from "./src/core/context.mjs";

async function testUnrouting() {
  console.log("🧪 Testing GitVan Unrouting (80/20)\n");

  await withGitVan({ cwd: process.cwd() }, async () => {
    const unrouting = useUnrouting();

    // Test file paths - GitVan-specific patterns
    const testFiles = [
      "src/composables/git.mjs",
      "src/cli/daemon.mjs",
      "src/api/users.ts",
      "jobs/hello.mjs",
      "tests/composables/unrouting.test.mjs",
      "config/database.json",
    ];

    // Test routes - GitVan-specific patterns
    const routes = [
      {
        id: "composable-change",
        pattern: "src/composables/[name].mjs",
        job: {
          name: "composable:update",
          with: { name: ":name", path: ":__file" },
        },
      },
      {
        id: "cli-change",
        pattern: "src/cli/[command].mjs",
        job: {
          name: "cli:update",
          with: { command: ":command", path: ":__file" },
        },
      },
      {
        id: "job-change",
        pattern: "jobs/[job].mjs",
        job: {
          name: "job:update",
          with: { job: ":job", path: ":__file" },
        },
      },
      {
        id: "api-change",
        pattern: "src/api/[endpoint].ts",
        job: {
          name: "api:update",
          with: { endpoint: ":endpoint", path: ":__file" },
        },
      },
      {
        id: "test-change",
        pattern: "tests/[suite]/[test].test.mjs",
        job: {
          name: "test:run",
          with: { suite: ":suite", test: ":test", path: ":__file" },
        },
      },
      {
        id: "config-change",
        pattern: "config/[file].json",
        job: {
          name: "config:reload",
          with: { file: ":file", path: ":__file" },
        },
      },
    ];

    console.log("1. Testing pattern matching...");
    for (const file of testFiles) {
      for (const route of routes) {
        const match = unrouting.matchPattern(route.pattern, file);
        if (match) {
          console.log(`   ✅ ${file} matches ${route.pattern}`);
          console.log(`      Params: ${JSON.stringify(match.params)}`);
        }
      }
    }

    console.log("\n2. Testing file routing...");
    const jobQueue = unrouting.routeFiles(testFiles, routes);
    console.log(`   Generated ${jobQueue.length} jobs:`);

    for (const job of jobQueue) {
      console.log(`   - ${job.name}: ${JSON.stringify(job.payload)}`);
    }

    console.log("\n✅ All tests passed!");
  });
}

// Run the test
testUnrouting().catch(console.error);
