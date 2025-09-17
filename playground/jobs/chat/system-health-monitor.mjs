import { defineJob, useGit, useTemplate, useNotes } from 'file:///Users/sac/gitvan/src/index.mjs';

export default defineJob({
  meta: {
    name: "system-health-monitor",
    desc: "Monitors system health and reports on resource usage and service status",
    tags: ["monitoring", "health", "system"],
    author: "GitVan",
    version: "1.0.0"
  },
  on: {
    cron: "0 * * * *"
  },
  async run({ ctx, payload, meta }) {
    const git = useGit();
    const template = useTemplate();
    const notes = useNotes();

    try {
      // Get system information
      const head = await git.currentHead();
      const branch = await git.currentBranch();
      
      // Get resource usage
      const uptime = await git.run(["rev-parse", "--short", "HEAD"]);
      const diskUsage = await git.run(["df", "-h"]);
      const memoryUsage = await git.run(["free", "-h"]);
      const loadAverage = await git.run(["uptime"]);
      
      // Get recent commits
      const recentCommits = await git.logSinceLastTag();
      
      // Generate health report
      const report = await template.renderString(
        `# System Health Report

## Repository Information
- **Commit**: {{ head }}
- **Branch**: {{ branch }}

## Resource Usage
### Uptime
{{ uptime }}

### Disk Usage
{{ diskUsage }}

### Memory Usage
{{ memoryUsage }}

### Load Average
{{ loadAverage }}

## Recent Commits
{{ recentCommits }}
`,
        {
          head: head,
          branch: branch,
          uptime: uptime.stdout.trim(),
          diskUsage: diskUsage.stdout.trim(),
          memoryUsage: memoryUsage.stdout.trim(),
          loadAverage: loadAverage.stdout.trim(),
          recentCommits: recentCommits.map(c => `- ${c.hash} ${c.message}`).join('\n')
        }
      );
      
      // Write report to repository
      const reportPath = `reports/system-health-${new Date().toISOString().slice(0, 10)}.md`;
      await git.writeFile(reportPath, report);
      
      // Log completion in notes
      await notes.write(`System health check completed at ${new Date().toISOString()}`);
      
      return {
        ok: true,
        artifacts: [reportPath],
        summary: "System health report generated successfully"
      };
    } catch (error) {
      console.error('Health monitoring failed:', error.message);
      
      // Log error in notes
      await notes.write(`Health monitoring failed: ${error.message}`);
      
      return {
        ok: false,
        error: error.message,
        artifacts: [],
        summary: "System health check failed"
      };
    }
  }
});