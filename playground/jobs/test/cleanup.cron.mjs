import { defineJob } from "gitvan/define";
import { useGit } from "gitvan/useGit";
import { promises as fs } from "node:fs";
import { join } from "pathe";

export default defineJob({
  meta: {
    desc: "Clean up temporary files and old artifacts",
    tags: ["cleanup", "maintenance"],
  },
  cron: "0 2 * * *", // Run daily at 2 AM
  async run({ ctx }) {
    const git = useGit();
    const artifacts = [];

    // Clean up dist directory
    const distDir = join(ctx.root, "dist");
    try {
      const files = await fs.readdir(distDir);
      const oldFiles = files.filter((file) => {
        // Simple heuristic: files older than 7 days
        return (
          file.includes("old") ||
          file.includes("temp") ||
          file.includes("backup")
        );
      });

      for (const file of oldFiles) {
        const filePath = join(distDir, file);
        await fs.unlink(filePath);
        artifacts.push(`Removed: ${file}`);
        ctx.logger.log(`Removed old file: ${file}`);
      }

      if (oldFiles.length === 0) {
        artifacts.push("No old files found to clean up");
        ctx.logger.log("No old files found to clean up");
      }
    } catch (error) {
      if (error.code === "ENOENT") {
        artifacts.push("Dist directory does not exist");
        ctx.logger.log("Dist directory does not exist");
      } else {
        throw error;
      }
    }

    return {
      ok: true,
      artifacts,
      data: {
        cleanedFiles: artifacts.length,
        timestamp: ctx.nowISO,
      },
    };
  },
});
