import { defineJob } from 'gitvan';

export default defineJob({
  meta: {
    id: 'docs:changelog',
    description: 'Generate changelog from Git history',
    tags: ['docs', 'release']
  },
  async run({ ctx }) {
    const { useGit, useTemplate } = ctx;
    const git = useGit();
    const template = await useTemplate();

    try {
      // Get recent commits
      const commits = await git.log({ limit: 50 });

      // Group by conventional commit types
      const grouped = {
        feat: [],
        fix: [],
        docs: [],
        style: [],
        refactor: [],
        test: [],
        chore: [],
        other: []
      };

      for (const commit of commits) {
        const match = commit.message.match(/^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?:/);
        const type = match ? match[1] : 'other';
        grouped[type].push({
          hash: commit.hash.substring(0, 7),
          message: commit.message,
          date: commit.date,
          author: commit.author_name
        });
      }

      // Get latest tag for version
      let version = 'unreleased';
      try {
        const tags = await git.tags();
        version = tags.latest || 'v1.0.0';
      } catch (err) {
        console.warn('No tags found, using default version');
      }

      // Generate changelog content
      let changelogContent = `# Changelog\n\n## ${version} (${new Date().toISOString().split('T')[0]})\n\n`;

      for (const [type, commits] of Object.entries(grouped)) {
        if (commits.length > 0) {
          const typeTitle = {
            feat: 'Features',
            fix: 'Bug Fixes',
            docs: 'Documentation',
            style: 'Styles',
            refactor: 'Code Refactoring',
            test: 'Tests',
            chore: 'Chores',
            other: 'Other Changes'
          }[type];

          changelogContent += `### ${typeTitle}\n\n`;
          for (const commit of commits) {
            changelogContent += `- ${commit.message} (${commit.hash})\n`;
          }
          changelogContent += '\n';
        }
      }

      // Write changelog to file
      await git.writeFile('CHANGELOG.md', changelogContent);

      return {
        ok: true,
        artifacts: ['CHANGELOG.md'],
        summary: `Generated changelog with ${Object.values(grouped).flat().length} commits`
      };
    } catch (error) {
      return {
        ok: false,
        error: error.message,
        summary: 'Failed to generate changelog'
      };
    }
  }
});