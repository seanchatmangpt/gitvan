const { 
  defineJob,
  useGit,
  useReceipt,
  useNotes,
  usePack
} = require('gitvan');

module.exports = defineJob({
  meta: {
    name: "backup-job",
    description: "Creates a backup of the repository with timestamp",
    version: "1.0.0"
  },
  
  on: {
    cron: "0 2 * * *"
  },

  async run({ ctx, payload, meta }) {
    const git = useGit();
    const receipt = useReceipt();
    const notes = useNotes();
    const pack = usePack();
    
    const { writeFile, add, commit } = git;
    const { write: writeReceipt } = receipt;
    const { write: writeNote } = notes;
    const { apply: applyPack } = pack;
    
    const startTime = Date.now();
    
    try {
      // Create timestamp for backup
      const timestamp = new Date().toISOString();
      const backupFileName = `backup-${timestamp.replace(/[:.]/g, '-')}.txt`;
      
      // Generate backup content
      const backupContent = `
Backup of repository created at: ${timestamp}
Repository: ${process.env.GIT_REPO_NAME || 'unknown'}
Branch: ${process.env.GIT_BRANCH || 'unknown'}
      `;
      
      // Write backup file
      await writeFile(backupFileName, backupContent);
      
      // Add to git index
      await add([backupFileName]);
      
      // Commit the backup
      await commit(`Backup: ${backupFileName}`);
      
      // Apply changelog generator pack for additional processing
      const packResult = await applyPack("changelog-generator");
      
      // Write receipt
      await writeReceipt({
        status: "success",
        artifacts: [backupFileName],
        duration: Date.now() - startTime,
        metadata: {
          timestamp: timestamp,
          packProcessed: packResult ? true : false
        }
      });
      
      // Add audit note
      await writeNote(`Backup job completed successfully at ${timestamp}`);
      
      return { 
        ok: true, 
        artifacts: [backupFileName],
        summary: `Backup created successfully`,
        metadata: {
          timestamp: timestamp,
          duration: Date.now() - startTime
        }
      };
      
    } catch (error) {
      // Write error receipt
      await writeReceipt({
        status: "error",
        error: error.message,
        duration: Date.now() - startTime
      });
      
      // Add error note
      await writeNote(`Backup job failed at ${new Date().toISOString()}: ${error.message}`);
      
      console.error('Backup job failed:', error);
      
      return { 
        ok: false, 
        error: error.message,
        artifacts: [],
        summary: "Backup job failed",
        metadata: {
          duration: Date.now() - startTime
        }
      };
    }
  }
});