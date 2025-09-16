import { defineJob } from "gitvan/define";
import { useGit } from "gitvan/useGit";
import { useTemplate } from "gitvan/useTemplate";

export default defineJob({
  meta: { desc: "Render changelog from git log" },
  async run({ ctx }) {
    const git = useGit();
    const template = await useTemplate();

    // Get recent commits
    const logOutput = await git.log("%h%x09%s", ["-n", "30"]);
    const lines = logOutput.split("\n").filter(Boolean);

    const commits = lines.map((line) => {
      const [hash, subject] = line.split("\t");
      return { hash, subject };
    });

    // Render template to file
    const outputPath = await template.renderToFile(
      "changelog.njk",
      "dist/CHANGELOG.md",
      {
        commits,
        generatedAt: ctx.nowISO,
        totalCommits: commits.length,
      },
    );

    return {
      ok: true,
      artifacts: [outputPath],
      data: {
        commitsProcessed: commits.length,
        outputPath,
      },
    };
  },
});
