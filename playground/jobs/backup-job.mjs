import { defineJob } from 'gitvan/index.js';

export default defineJob({
  meta: {
    name: "backup-job",
    description: "Creates a backup of the repository with timestamped files",
    version: "1.0.0"
  },
  
  on: {
    cron: "0 2 * * *"
  },

  async run({ ctx, payload, meta }) {
    const git = useGit();
    const receipt = useReceipt();
    const notes = useNotes();
    
    // Destructure methods
    const { 
      writeFile, 
      add, 
      commit,
      getBranchName,
      getCommitHash
    } = git;
    
    const { write: writeReceipt } = receipt;
    const { write: writeNote } = notes;
    
    const startTime = Date.now();
    
    try {
      // Get current branch and commit hash for backup metadata
      const branch = await getBranchName();
      const commitHash = await getCommitHash();
      
      // Create timestamped backup files
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFiles = [];
      
      // Backup current state
      const backupContent = {
        timestamp,
        branch,
        commit: commitHash,
        files: []
      };
      
      // Create backup manifest file
      const manifestFile = `backup-${timestamp}.json`;
      await writeFile(manifestFile, JSON.stringify(backupContent, null, 2));
      backupFiles.push(manifestFile);
      
      // Add manifest to git
      await add([manifestFile]);
      
      // Commit the backup
      const commitMessage = `Backup: ${branch} at ${timestamp}`;
      await commit(commitMessage);
      
      // Log backup completion
      await writeNote(`Backup completed successfully at ${timestamp}`);
      
      // Track job result
      await writeReceipt({
        status: "success",
        artifacts: backupFiles,
        duration: Date.now() - startTime,
        metadata: {
          branch,
          commit: commitHash
        }
      });
      
      return { 
        ok: true, 
        artifacts: backupFiles,
        summary: `Backup created for branch ${branch} at ${timestamp}`,
        metadata: {
          branch,
          commit: commitHash
        }
      };
      
    } catch (error) {
      // Track failure
      await writeReceipt({
        status: "error",
        error: error.message,
        duration: Date.now() - startTime
      });
      
      console.error('Backup job failed:', error);
      return { 
        ok: false, 
        error: error.message,
        artifacts: [],
        summary: "Backup job failed"
      };
    }
  }
});