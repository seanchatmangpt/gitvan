// playground/jobs/foundation/basic-job-setup.mjs
import { defineJob } from "gitvan/define";
import { useGit } from "gitvan/useGit";

export default defineJob({
  meta: {
    desc: "A simple greeting job that demonstrates basic GitVan concepts",
    tags: ["hello", "example", "beginner", "foundation"],
  },
  async run({ ctx }) {
    const git = useGit();

    // Get repository information
    const head = await git.currentHead();
    const branch = await git.currentBranch();
    const isClean = await git.isClean();

    // Create a simple greeting message
    const greeting = {
      message: "Hello from GitVan Cookbook!",
      timestamp: ctx.nowISO,
      repository: {
        head: head.substring(0, 8),
        branch,
        isClean,
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
      },
    };

    // Log the greeting
    ctx.logger.log("🎉 Greeting generated successfully!");
    ctx.logger.log(`Repository: ${branch} (${head.substring(0, 8)})`);
    ctx.logger.log(`Clean: ${isClean ? "Yes" : "No"}`);

    return {
      ok: true,
      artifacts: [],
      data: greeting,
    };
  },
});
