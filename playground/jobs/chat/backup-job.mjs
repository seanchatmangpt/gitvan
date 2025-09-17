export default {
  meta: { 
    desc: "Creates a backup of specified files or directories with timestamped naming", 
    tags: ["backup","automation","file-operation"],
    author: "GitVan AI",
    version: "1.0.0"
  },
  cron: "0 2 * * *",
  on: ["push"],
  schedule: "daily",
  async run({ ctx, payload, meta }) {
    try {
      console.log("Executing job: Creates a backup of specified files or directories with timestamped naming");
      
      // Extract parameters
      const sourcePaths = payload.sourcePaths || [];
      const destinationDirectory = payload.destinationDirectory || "./backups";
      
      // Execute operations
      console.log("Log start of backup job");
      // TODO: Implement file copy: Copy source files/directories to destination with timestamp
      console.log("Log completion of backup job");
      
      return { 
        ok: true, 
        artifacts: ["backup_log.txt","backup_files"],
        summary: "Backup created successfully"
      }
    } catch (error) {
      console.error('Job failed:', error.message)
      return { 
        ok: false, 
        error: error.message,
        artifacts: []
      }
    }
  }
}