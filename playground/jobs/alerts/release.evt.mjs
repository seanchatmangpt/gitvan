import { defineJob } from "gitvan/define";
import { useGit } from "gitvan/useGit";
import { promises as fs } from "node:fs";
import { join } from "pathe";

export default defineJob({
  meta: {
    desc: "Notify on new tags or releases",
    tags: ["notification", "release"],
  },
  on: {
    any: [{ tagCreate: "v*.*.*" }, { semverTag: true }],
  },
  async run({ ctx, trigger }) {
    const git = useGit();

    // Get the latest tag (handle case where no tags exist)
    let latestTag;
    try {
      latestTag = await git.run(["describe", "--tags", "--abbrev=0", "HEAD"]);
    } catch (error) {
      if (error.message.includes("No names found")) {
        // No tags exist, this is normal for new repositories
        ctx.logger.log("No tags found in repository");
        latestTag = "no-tags";
      } else {
        throw error;
      }
    }

    const notification = {
      type: "release",
      tag: latestTag.trim(),
      timestamp: ctx.nowISO,
      trigger: trigger?.data || {},
      repository: {
        head: await git.head(),
        branch: await git.getCurrentBranch(),
      },
    };

    // Create notification file
    const outputPath = join(
      ctx.root,
      "dist",
      "notifications",
      `${Date.now()}-release.json`,
    );
    await fs.mkdir(join(ctx.root, "dist", "notifications"), {
      recursive: true,
    });
    await fs.writeFile(outputPath, JSON.stringify(notification, null, 2));

    ctx.logger.log(`Release notification created for tag: ${latestTag}`);

    return {
      ok: true,
      artifacts: [outputPath],
      data: notification,
    };
  },
});
