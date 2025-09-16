// playground/jobs/foundation/template-greeting.mjs
import { defineJob } from "gitvan/define";
import { useGit } from "gitvan/useGit";
import { useTemplate } from "gitvan/useTemplate";

export default defineJob({
  meta: {
    desc: "Generate greeting using Nunjucks template",
    tags: ["hello", "template", "nunjucks", "foundation"],
  },
  async run({ ctx, payload }) {
    const git = useGit();
    const template = await useTemplate();

    // Get repository information
    const head = await git.head();
    const branch = await git.getCurrentBranch();
    const commitCount = await git.getCommitCount();

    // Prepare template data
    const data = {
      greeting: "Hello from GitVan Cookbook Template System!",
      timestamp: ctx.nowISO,
      repository: {
        head: head.substring(0, 8),
        branch,
        commitCount,
        isClean: await git.isClean(),
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
      },
      payload: payload || {},
    };

    // Render template to file
    const outputPath = await template.renderToFile(
      "foundation/greeting.njk",
      "dist/foundation/greeting-template.html",
      data,
    );

    ctx.logger.log(`📝 Template greeting created: ${outputPath}`);

    return {
      ok: true,
      artifacts: [outputPath],
      data,
    };
  },
});
