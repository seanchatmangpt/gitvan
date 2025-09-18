import { defineJob } from 'gitvan';

export default defineJob({
  meta: {
    id: 'dev:diary',
    description: 'Generate daily development diary entry',
    tags: ['docs', 'development']
  },
  async run({ ctx }) {
    const { useGit } = ctx;
    const git = useGit();

    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Get commits from the last 24 hours
      const commits = await git.log({
        since: yesterday,
        until: today
      });

      if (commits.length === 0) {
        return {
          ok: true,
          summary: 'No commits found for today',
          artifacts: []
        };
      }

      // Analyze commit patterns
      const stats = {
        totalCommits: commits.length,
        authors: [...new Set(commits.map(c => c.author_name))],
        filesChanged: new Set(),
        categories: {
          features: 0,
          fixes: 0,
          docs: 0,
          tests: 0,
          other: 0
        }
      };

      commits.forEach(commit => {
        // Categorize commits
        const message = commit.message.toLowerCase();
        if (message.includes('feat') || message.includes('feature')) {
          stats.categories.features++;
        } else if (message.includes('fix') || message.includes('bug')) {
          stats.categories.fixes++;
        } else if (message.includes('doc') || message.includes('readme')) {
          stats.categories.docs++;
        } else if (message.includes('test')) {
          stats.categories.tests++;
        } else {
          stats.categories.other++;
        }

        // Track files (simplified)
        commit.files?.forEach(file => stats.filesChanged.add(file.filename));
      });

      // Generate diary entry
      let diaryEntry = `# Development Diary - ${today}\n\n`;
      diaryEntry += `## Summary\n\n`;
      diaryEntry += `- **${stats.totalCommits}** commits made\n`;
      diaryEntry += `- **${stats.authors.length}** contributor(s): ${stats.authors.join(', ')}\n`;
      diaryEntry += `- **${stats.filesChanged.size}** files modified\n\n`;

      diaryEntry += `## Activity Breakdown\n\n`;
      Object.entries(stats.categories).forEach(([category, count]) => {
        if (count > 0) {
          diaryEntry += `- ${category.charAt(0).toUpperCase() + category.slice(1)}: ${count}\n`;
        }
      });

      diaryEntry += `\n## Recent Commits\n\n`;
      commits.slice(0, 10).forEach(commit => {
        diaryEntry += `- \`${commit.hash.substring(0, 7)}\` ${commit.message}\n`;
      });

      diaryEntry += `\n---\n*Generated automatically by GitVan*\n`;

      // Write to docs/diary directory
      const fileName = `docs/diary/${today}.md`;
      await git.writeFile(fileName, diaryEntry);

      return {
        ok: true,
        artifacts: [fileName],
        summary: `Generated diary entry for ${today} with ${stats.totalCommits} commits`
      };
    } catch (error) {
      return {
        ok: false,
        error: error.message,
        summary: 'Failed to generate development diary'
      };
    }
  }
});