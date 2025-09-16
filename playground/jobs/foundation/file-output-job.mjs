// playground/jobs/foundation/file-output-job.mjs
import { defineJob } from "gitvan/define";
import { useGit } from "gitvan/useGit";
import { promises as fs } from "node:fs";
import { join } from "pathe";

export default defineJob({
  meta: {
    desc: "Generate a greeting file with repository information",
    tags: ["hello", "file-output", "example", "foundation"],
  },
  async run({ ctx, payload }) {
    const git = useGit();

    // Gather repository information
    const head = await git.head();
    const branch = await git.getCurrentBranch();
    const isClean = await git.isClean();
    const commitCount = await git.getCommitCount();

    const reportData = {
      timestamp: ctx.nowISO,
      repository: {
        head: head.substring(0, 8),
        branch,
        isClean,
        commitCount,
      },
      payload: payload || {},
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
      },
    };

    // Create JSON report
    const outputPath = join(
      ctx.root,
      "dist",
      "foundation",
      "greeting-report.json",
    );
    await fs.mkdir(join(ctx.root, "dist", "foundation"), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(reportData, null, 2));

    return {
      ok: true,
      artifacts: [outputPath],
      data: reportData,
    };
  },
});
