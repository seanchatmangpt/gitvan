/**
 * GitVan Unrouting Plan Job
 * Dry-run planning for unrouting without executing jobs
 */

import {
  defineJob,
  useGit,
  useNotes,
} from "file:///Users/sac/gitvan/src/index.mjs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { compileRoutes, processFiles } from "../parser.mjs";

export default defineJob({
  meta: {
    name: "unrouting:plan",
    desc: "Plan unrouting jobs without executing them (dry-run)",
    tags: ["unrouting", "plan", "dry-run"],
    author: "GitVan Team",
    version: "1.0.0",
  },

  async run({ ctx, payload, meta }) {
    const git = useGit();
    const notes = useNotes();

    // Destructure methods
    const { worktreeRoot, run: runGit, logSinceLastTag } = git;

    const { write: writeNote } = notes;

    const startTime = Date.now();

    try {
      console.log("📋 Starting unrouting plan...");

      // Get repository root
      const repoRoot = await worktreeRoot();
      console.log(`📁 Repository root: ${repoRoot}`);

      // Load routes registry
      const routesPath = join(repoRoot, "packs/unrouting/routes.json");
      const routesData = await readFile(routesPath, "utf-8");
      const routes = JSON.parse(routesData);
      console.log(`📋 Loaded ${routes.length} routes`);

      // Compile routes for efficient matching
      const compiledRoutes = compileRoutes(routes);
      console.log("🔧 Compiled routes to regex patterns");

      // Get changed files
      let changedFiles = [];

      if (payload && payload.files) {
        // Use provided files (for CLI simulation)
        changedFiles = Array.isArray(payload.files)
          ? payload.files
          : [payload.files];
      } else if (payload && payload.ref) {
        // Get files changed in this push
        const diffOutput = await runGit([
          "diff",
          "--name-only",
          "HEAD~1",
          "HEAD",
        ]);
        changedFiles = diffOutput.split("\n").filter((f) => f.trim());
      } else {
        // Fallback: get files changed since last tag
        const logOutput = await logSinceLastTag();
        if (logOutput) {
          const commits = logOutput.split("\n").filter((c) => c.trim());
          for (const commit of commits) {
            const commitSha = commit.split("\t")[0];
            const diffOutput = await runGit([
              "diff",
              "--name-only",
              `${commitSha}~1`,
              commitSha,
            ]);
            const files = diffOutput.split("\n").filter((f) => f.trim());
            changedFiles.push(...files);
          }
        }
      }

      // Remove duplicates and filter out non-tracked files
      changedFiles = [...new Set(changedFiles)].filter(
        (f) => f && !f.startsWith("??")
      );

      console.log(`📝 Found ${changedFiles.length} changed files:`);
      changedFiles.forEach((file) => console.log(`  - ${file}`));

      if (changedFiles.length === 0) {
        console.log("✅ No files to process");
        return {
          ok: true,
          artifacts: [],
          summary: "No files changed, no jobs to plan",
        };
      }

      // Process files and generate job queue
      const jobQueue = processFiles(changedFiles, compiledRoutes);

      console.log("\n🎯 PLANNED JOBS:");
      console.log("=" * 50);

      const routeMatches = {};
      const jobSummary = [];

      for (const job of jobQueue) {
        console.log(`\n📋 Job: ${job.name}`);
        console.log(`   Batch Key: ${job.batchKey}`);
        console.log(`   Route ID: ${job.routeId}`);
        console.log(`   File: ${job.filePath}`);
        console.log(`   Payload:`, JSON.stringify(job.payload, null, 2));

        // Track route matches
        if (!routeMatches[job.routeId]) {
          routeMatches[job.routeId] = [];
        }
        routeMatches[job.routeId].push(job.filePath);

        jobSummary.push({
          name: job.name,
          batchKey: job.batchKey,
          routeId: job.routeId,
          filePath: job.filePath,
          payload: job.payload,
        });
      }

      console.log("\n📊 SUMMARY:");
      console.log("=" * 50);
      console.log(`Changed files: ${changedFiles.length}`);
      console.log(`Matched routes: ${Object.keys(routeMatches).length}`);
      console.log(`Jobs planned: ${jobQueue.length}`);

      console.log("\n🗂️ ROUTE MATCHES:");
      for (const [routeId, files] of Object.entries(routeMatches)) {
        console.log(`  ${routeId}:`);
        files.forEach((file) => console.log(`    - ${file}`));
      }

      console.log("\n🔄 EXECUTION ORDER:");
      jobQueue.forEach((job, index) => {
        console.log(`  ${index + 1}. ${job.name} (${job.batchKey})`);
      });

      // Write plan note
      const planNote = `Unrouting plan completed:
- Changed files: ${changedFiles.length}
- Matched routes: ${Object.keys(routeMatches).length}
- Jobs planned: ${jobQueue.length}

Route matches:
${Object.entries(routeMatches)
  .map(([routeId, files]) => `- ${routeId}: ${files.join(", ")}`)
  .join("\n")}

Planned jobs:
${jobQueue
  .map((job, index) => `${index + 1}. ${job.name} (${job.batchKey})`)
  .join("\n")}`;

      await writeNote(planNote);

      console.log("\n✅ Unrouting plan completed");

      return {
        ok: true,
        artifacts: [`unrouting-plan-${Date.now()}.json`],
        summary: `Planned ${jobQueue.length} jobs for ${changedFiles.length} files`,
        metadata: {
          changedFiles: changedFiles.length,
          jobsPlanned: jobQueue.length,
          routeMatches: Object.keys(routeMatches).length,
          jobQueue,
          routeMatches,
        },
      };
    } catch (error) {
      console.error("❌ Unrouting plan failed:", error.message);

      await writeNote(`Unrouting plan failed: ${error.message}`);

      return {
        ok: false,
        error: error.message,
        artifacts: [],
        summary: "Unrouting plan failed",
      };
    }
  },
});



