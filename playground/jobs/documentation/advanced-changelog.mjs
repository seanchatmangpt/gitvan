// playground/jobs/documentation/advanced-changelog.mjs
import { defineJob } from "gitvan/define";
import { useGit } from "gitvan/useGit";
import { useTemplate } from "gitvan/useTemplate";

export default defineJob({
  meta: {
    desc: "Generate advanced changelog with release notes and statistics",
    tags: ["documentation", "changelog", "advanced", "releases", "cookbook"],
  },
  async run({ ctx, payload }) {
    const git = useGit();
    const template = await useTemplate();

    // Get configuration
    const since = payload?.since || "1 month ago";
    const limit = payload?.limit || 100;
    const includeStats = payload?.includeStats !== false;

    // Get commits since specified date
    const logOutput = await git.log("%h%x09%s%x09%an%x09%ae%x09%ad%x09%at", [
      "--since",
      since,
      "-n",
      limit.toString(),
    ]);

    const lines = logOutput.split("\n").filter(Boolean);
    const commits = lines.map((line) => {
      const [hash, subject, author, email, date, timestamp] = line.split("\t");
      return {
        hash,
        subject,
        author,
        email,
        date: new Date(date).toISOString(),
        timestamp: parseInt(timestamp),
        shortHash: hash.substring(0, 7),
      };
    });

    // Analyze commits
    const analysis = {
      totalCommits: commits.length,
      uniqueAuthors: [...new Set(commits.map((c) => c.author))].length,
      dateRange: {
        first: commits[commits.length - 1]?.date,
        last: commits[0]?.date,
      },
      commitTypes: {},
      authorStats: {},
      weeklyStats: {},
    };

    // Analyze commit types
    commits.forEach((commit) => {
      const type = commit.subject.split(":")[0].toLowerCase();
      analysis.commitTypes[type] = (analysis.commitTypes[type] || 0) + 1;

      // Author statistics
      analysis.authorStats[commit.author] =
        (analysis.authorStats[commit.author] || 0) + 1;

      // Weekly statistics
      const week = new Date(commit.timestamp * 1000);
      const weekKey = `${week.getFullYear()}-W${Math.ceil(week.getDate() / 7)}`;
      analysis.weeklyStats[weekKey] = (analysis.weeklyStats[weekKey] || 0) + 1;
    });

    // Group commits by type
    const groupedCommits = {
      features: [],
      fixes: [],
      docs: [],
      style: [],
      refactor: [],
      test: [],
      chore: [],
      breaking: [],
      other: [],
    };

    commits.forEach((commit) => {
      const subject = commit.subject.toLowerCase();
      const type = subject.split(":")[0];

      if (subject.includes("breaking change") || subject.includes("!:")) {
        groupedCommits.breaking.push(commit);
      } else if (type === "feat") {
        groupedCommits.features.push(commit);
      } else if (type === "fix") {
        groupedCommits.fixes.push(commit);
      } else if (type === "docs") {
        groupedCommits.docs.push(commit);
      } else if (type === "style") {
        groupedCommits.style.push(commit);
      } else if (type === "refactor") {
        groupedCommits.refactor.push(commit);
      } else if (type === "test") {
        groupedCommits.test.push(commit);
      } else if (type === "chore") {
        groupedCommits.chore.push(commit);
      } else {
        groupedCommits.other.push(commit);
      }
    });

    // Get repository information
    const repository = {
      head: await git.head(),
      branch: await git.getCurrentBranch(),
      isClean: await git.isClean(),
    };

    // Prepare template data
    const data = {
      title: "Advanced Changelog - Cookbook Recipe",
      subtitle: `Generated from ${commits.length} commits since ${since}`,
      commits,
      groupedCommits,
      analysis: includeStats ? analysis : null,
      generatedAt: ctx.nowISO,
      repository,
      config: {
        since,
        limit,
        includeStats,
      },
    };

    // Render template to file
    const outputPath = await template.renderToFile(
      "documentation/advanced-changelog.njk",
      "dist/documentation/ADVANCED_CHANGELOG.md",
      data,
    );

    ctx.logger.log(`📝 Advanced changelog generated: ${outputPath}`);
    ctx.logger.log(
      `📊 Processed ${commits.length} commits from ${analysis.uniqueAuthors} authors`,
    );

    return {
      ok: true,
      artifacts: [outputPath],
      data: {
        outputPath,
        analysis,
        groupedCommits: Object.keys(groupedCommits).reduce((acc, key) => {
          acc[key] = groupedCommits[key].length;
          return acc;
        }, {}),
      },
    };
  },
});
