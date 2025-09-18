import { defineJob, useGit, useTemplate, useNotes } from 'file:///Users/sac/gitvan/src/index.mjs';

export default defineJob({
  meta: { 
    name: "backup-job", 
    desc: "Creates automated backups of repository files with audit trail",
    tags: ["backup", "automation", "git-native"],
    author: "GitVan",
    version: "1.0.0"
  },
  on: { 
    cron: "0 0 * * *"
  },
  async run({ ctx, payload, meta }) {
    const git = useGit();
    const template = useTemplate();
    const notes = useNotes();
    
    try {
      // Get repository info
      const repoInfo = await git.info();
      const timestamp = new Date().toISOString();
      const backupDir = `backups/${timestamp.replace(/:/g, '-')}`;
      
      // Create backup directory
      await git.writeFile(`${backupDir}/README.md`, `# Backup created at ${timestamp}\n\nRepository: ${repoInfo.name}\nBranch: ${repoInfo.branch}\nCommit: ${repoInfo.commit}`);
      
      // Get list of files to backup
      const filesToBackup = ['package.json', 'README.md', 'LICENSE'];
      const backedUpFiles = [];
      
      for (const file of filesToBackup) {
        try {
          if (await git.exists(file)) {
            const content = await git.readFile(file);
            await git.writeFile(`${backupDir}/${file}`, content);
            backedUpFiles.push(file);
          }
        } catch (error) {
          console.warn(`Could not backup ${file}: ${error.message}`);
        }
      }
      
      // Create manifest
      const manifest = await template.renderString(
        `{"timestamp": "{{ timestamp }}", "files": {{ files | dump }}, "backupDir": "{{ backupDir }}"}`,
        {
          timestamp: timestamp,
          files: backedUpFiles,
          backupDir: backupDir
        }
      );
      
      await git.writeFile(`${backupDir}/manifest.json`, manifest);
      
      // Log backup completion to notes
      await notes.write(`Backup completed at ${timestamp} for branch ${repoInfo.branch}`);
      
      return {
        ok: true,
        artifacts: [backupDir],
        summary: `Backup created successfully with ${backedUpFiles.length} files`
      };
    } catch (error) {
      console.error('Backup job failed:', error.message);
      await notes.write(`Backup failed: ${error.message}`);
      
      return { 
        ok: false, 
        error: error.message, 
        artifacts: [],
        summary: "Backup job failed"
      };
    }
  }
})