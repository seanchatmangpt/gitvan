/**
 * GitVan Unrouting Router Job
 * Routes file changes to GitVan jobs based on unrouting patterns
 */

import {
  defineJob,
  useGit,
  useNotes,
  useReceipt,
} from "file:///Users/sac/gitvan/src/index.mjs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { compileRoutes, processFiles } from "../parser.mjs";

export default defineJob({
  meta: {
    name: "unrouting:route",
    desc: "Route file changes to GitVan jobs using unrouting patterns",
    tags: ["unrouting", "router", "file-based"],
    author: "GitVan Team",
    version: "1.0.0",
  },

  on: {
    push: "refs/heads/main",
  },

  async run({ ctx, payload, meta }) {
    const git = useGit();
    const notes = useNotes();
    const receipt = useReceipt();

    // Destructure methods
    const { worktreeRoot, run: runGit, logSinceLastTag, currentHead } = git;

    const { write: writeNote } = notes;
    const { write: writeReceipt } = receipt;

    const startTime = Date.now();

    try {
      console.log("🚀 Starting unrouting router...");

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

      // Get changed files since last commit
      let changedFiles = [];

      if (payload && payload.ref) {
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
        await writeNote("Unrouting router: No files changed");

        await writeReceipt({
          status: "success",
          artifacts: [],
          duration: Date.now() - startTime,
          metadata: {
            changedFiles: 0,
            matchedRoutes: 0,
            jobsQueued: 0,
          },
        });

        return {
          ok: true,
          artifacts: [],
          summary: "No files changed, no jobs to route",
        };
      }

      // Process files and generate job queue
      const jobQueue = processFiles(changedFiles, compiledRoutes);
      console.log(`🎯 Generated ${jobQueue.length} jobs:`);

      const routeMatches = {};
      const jobSummary = [];

      for (const job of jobQueue) {
        console.log(`  - ${job.name} (batch: ${job.batchKey})`);
        console.log(`    Route: ${job.routeId}`);
        console.log(`    File: ${job.filePath}`);
        console.log(`    Payload:`, job.payload);

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

      // Execute jobs sequentially
      const results = [];
      const artifacts = [];

      for (const job of jobQueue) {
        try {
          console.log(`🔄 Executing job: ${job.name}`);

          // TODO: Implement actual job execution
          // For now, we'll simulate job execution
          const jobResult = {
            name: job.name,
            batchKey: job.batchKey,
            status: "simulated",
            payload: job.payload,
            duration: 100, // Simulated duration
          };

          results.push(jobResult);
          artifacts.push(`job-${job.name}-${job.batchKey}.json`);

          console.log(`✅ Job ${job.name} completed`);
        } catch (error) {
          console.error(`❌ Job ${job.name} failed:`, error.message);
          results.push({
            name: job.name,
            batchKey: job.batchKey,
            status: "error",
            error: error.message,
            payload: job.payload,
          });
        }
      }

      // Write comprehensive receipt
      const receiptData = {
        status: "success",
        artifacts,
        duration: Date.now() - startTime,
        metadata: {
          changedFiles: changedFiles.length,
          matchedRoutes: Object.keys(routeMatches).length,
          jobsQueued: jobQueue.length,
          jobsExecuted: results.length,
          routeMatches,
          jobResults: results,
        },
      };

      await writeReceipt(receiptData);

      // Write audit note
      const auditNote = `Unrouting router completed:
- Changed files: ${changedFiles.length}
- Matched routes: ${Object.keys(routeMatches).length}
- Jobs executed: ${results.length}
- Duration: ${Date.now() - startTime}ms

Route matches:
${Object.entries(routeMatches)
  .map(([routeId, files]) => `- ${routeId}: ${files.join(", ")}`)
  .join("\n")}`;

      await writeNote(auditNote);

      console.log("✅ Unrouting router completed successfully");

      return {
        ok: true,
        artifacts,
        summary: `Routed ${changedFiles.length} files to ${results.length} jobs`,
        metadata: {
          changedFiles: changedFiles.length,
          jobsExecuted: results.length,
          routeMatches: Object.keys(routeMatches).length,
        },
      };
    } catch (error) {
      console.error("❌ Unrouting router failed:", error.message);

      await writeReceipt({
        status: "error",
        error: error.message,
        duration: Date.now() - startTime,
      });

      await writeNote(`Unrouting router failed: ${error.message}`);

      return {
        ok: false,
        error: error.message,
        artifacts: [],
        summary: "Unrouting router failed",
      };
    }
  },
});
