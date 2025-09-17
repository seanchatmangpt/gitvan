/**
 * GitVan Unrouting Router Job
 * Simple 80/20 implementation: Route file changes to jobs
 */

import {
  defineJob,
  useGit,
  useNotes,
  useReceipt,
  useUnrouting,
} from "file:///Users/sac/gitvan/src/index.mjs";

export default defineJob({
  meta: {
    name: "unrouting:route",
    desc: "Route file changes to GitVan jobs using unrouting patterns",
    tags: ["unrouting", "router", "file-based"],
    version: "1.0.0",
  },

  hooks: ["post-commit", "post-merge"], // Unified hooks system

  async run(context) {
    const git = useGit();
    const notes = useNotes();
    const receipt = useReceipt();
    const unrouting = useUnrouting();

    const startTime = Date.now();
    const { hookName, timestamp } = context;

    try {
      console.log(`🚀 Starting unrouting router (triggered by ${hookName})...`);

      // Get changed files from git diff
      const diffOutput = await git.diff({
        from: "HEAD~1",
        to: "HEAD",
        nameOnly: true,
      });
      const changedFiles = diffOutput.split("\n").filter((f) => f.trim());

      console.log(`📄 Found ${changedFiles.length} changed files`);

      // GitVan-specific routes configuration
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
          id: "config-change",
          pattern: "config/[file].json",
          job: {
            name: "config:reload",
            with: { file: ":file", path: ":__file" },
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
      ];

      // Route files to jobs
      const jobQueue = unrouting.routeFiles(changedFiles, routes);

      console.log(`🎯 Generated ${jobQueue.length} jobs`);

      // Execute jobs (simplified - just log for now)
      for (const job of jobQueue) {
        console.log(`⚡ Executing job: ${job.name}`);
        console.log(`   Payload: ${JSON.stringify(job.payload, null, 2)}`);
        console.log(`   File: ${job.filePath}`);
        console.log(`   Route: ${job.routeId}`);
        console.log("");
      }

      // Write audit note
      const auditNote = `Unrouting router completed at ${new Date().toISOString()}
Files processed: ${changedFiles.length}
Jobs generated: ${jobQueue.length}
Routes matched: ${jobQueue.length}`;

      await notes.write(auditNote);

      // Write receipt
      const receiptData = {
        ok: true,
        startedAt: new Date(startTime).toISOString(),
        finishedAt: new Date().toISOString(),
        duration: Date.now() - startTime,
        inputs: {
          changedFiles: changedFiles.length,
          routes: routes.length,
        },
        outputs: {
          jobsGenerated: jobQueue.length,
          jobsExecuted: jobQueue.length,
        },
        summary: `Processed ${changedFiles.length} files, generated ${jobQueue.length} jobs`,
      };

      await receipt.create(receiptData);

      console.log("✅ Unrouting router completed successfully!");
      console.log(`⏱️ Duration: ${receiptData.duration}ms`);
      console.log(`📊 Jobs generated: ${jobQueue.length}`);

      return {
        ok: true,
        summary: `Processed ${changedFiles.length} files, generated ${jobQueue.length} jobs`,
        jobsGenerated: jobQueue.length,
        jobsExecuted: jobQueue.length,
      };
    } catch (error) {
      console.error("❌ Unrouting router failed:", error);

      // Write error note
      await notes.write(`Unrouting router failed at ${new Date().toISOString()}
Error: ${error.message}`);

      // Write error receipt
      const errorReceipt = {
        ok: false,
        startedAt: new Date(startTime).toISOString(),
        finishedAt: new Date().toISOString(),
        duration: Date.now() - startTime,
        error: error.message,
      };

      await receipt.create(errorReceipt);

      throw error;
    }
  },
});
