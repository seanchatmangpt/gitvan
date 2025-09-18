import { defineJob } from 'gitvan';

export default defineJob({
  meta: {
    id: 'docs:release-notes',
    description: 'Generate release notes for new tags',
    tags: ['docs', 'release']
  },
  async run({ ctx, args }) {
    const { useGit } = ctx;
    const git = useGit();
    const tag = args.tag || args[0];

    if (!tag) {
      return {
        ok: false,
        error: 'No tag specified',
        summary: 'Tag required for release notes generation'
      };
    }

    try {
      // Get commits since last tag
      const tags = await git.tags();
      const previousTag = tags.all.filter(t => t !== tag).sort().pop();

      const range = previousTag ? `${previousTag}..${tag}` : tag;
      const commits = await git.log({ from: range });

      // Parse commits into categories
      const features = [];
      const fixes = [];
      const breaking = [];
      const other = [];

      for (const commit of commits) {
        const message = commit.message;

        if (message.includes('BREAKING CHANGE')) {
          breaking.push(message);
        } else if (message.startsWith('feat')) {
          features.push(message.replace(/^feat(\(.+\))?:\s*/, ''));
        } else if (message.startsWith('fix')) {
          fixes.push(message.replace(/^fix(\(.+\))?:\s*/, ''));
        } else {
          other.push(message);
        }
      }

      // Generate release notes content
      let releaseNotes = `# Release ${tag}\n\n`;
      releaseNotes += `Released on ${new Date().toISOString().split('T')[0]}\n\n`;

      if (breaking.length > 0) {
        releaseNotes += `## 🚨 Breaking Changes\n\n`;
        breaking.forEach(change => {
          releaseNotes += `- ${change}\n`;
        });
        releaseNotes += '\n';
      }

      if (features.length > 0) {
        releaseNotes += `## ✨ New Features\n\n`;
        features.forEach(feature => {
          releaseNotes += `- ${feature}\n`;
        });
        releaseNotes += '\n';
      }

      if (fixes.length > 0) {
        releaseNotes += `## 🐛 Bug Fixes\n\n`;
        fixes.forEach(fix => {
          releaseNotes += `- ${fix}\n`;
        });
        releaseNotes += '\n';
      }

      if (other.length > 0) {
        releaseNotes += `## 📝 Other Changes\n\n`;
        other.forEach(change => {
          releaseNotes += `- ${change}\n`;
        });
        releaseNotes += '\n';
      }

      // Write to docs/releases directory
      const fileName = `docs/releases/${tag}.md`;
      await git.writeFile(fileName, releaseNotes);

      return {
        ok: true,
        artifacts: [fileName],
        summary: `Generated release notes for ${tag}`
      };
    } catch (error) {
      return {
        ok: false,
        error: error.message,
        summary: `Failed to generate release notes for ${tag}`
      };
    }
  }
});