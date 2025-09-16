// jobs/test/cleanup.cron.mjs
// GitVan v2 — Cleanup Cron Job
// Demonstrates cron job functionality

import { defineJob } from "../../src/jobs/define.mjs";
import { useGit } from "../../src/composables/git.mjs";
import { promises as fs } from "node:fs";
import { join } from "pathe";

export default defineJob({
  cron: "0 2 * * *", // Run daily at 2 AM
  meta: {
    desc: "Daily cleanup job that removes temporary files",
    tags: ["cleanup", "maintenance"],
  },
  async run({ ctx }) {
    const git = useGit();

    ctx.logger.log("Running daily cleanup job");

    const tempDir = join(ctx.root, "temp");
    const artifacts = [];

    try {
      // Check if temp directory exists
      await fs.access(tempDir);

      // List files in temp directory
      const files = await fs.readdir(tempDir);
      const oldFiles = files.filter((file) => {
        // Simple heuristic: files older than 7 days
        return file.includes("old") || file.includes("temp");
      });

      // Remove old files
      for (const file of oldFiles) {
        const filePath = join(tempDir, file);
        await fs.unlink(filePath);
        artifacts.push(`Removed: ${file}`);
        ctx.logger.log(`Removed old file: ${file}`);
      }

      if (oldFiles.length === 0) {
        ctx.logger.log("No old files found to clean up");
      }
    } catch (error) {
      if (error.code === "ENOENT") {
        ctx.logger.log("Temp directory does not exist, nothing to clean");
      } else {
        throw error;
      }
    }

    return {
      ok: true,
      artifacts,
      message: `Cleaned up ${artifacts.length} files`,
    };
  },
});
