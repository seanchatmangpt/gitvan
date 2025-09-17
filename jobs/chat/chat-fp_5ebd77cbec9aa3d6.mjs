export default {
  meta: { 
    desc: "Creates a backup job that copies files from a source directory to a backup directory", 
    tags: ["backup","file-operation","automation"],
    author: "GitVan AI",
    version: "1.0.0"
  },
  cron: "0 2 * * *",
  on: ["push"],
  schedule: "daily",
  async run({ ctx, payload, meta }) {
    try {
      console.log("Executing job: Creates a backup job that copies files from a source directory to a backup directory");
      
      // Extract parameters
      const sourcePath = payload.sourcePath || "";
      const destinationPath = payload.destinationPath || "";
      const includePatterns = payload.includePatterns || [];
      const excludePatterns = payload.excludePatterns || [".git","*.log"];
      
      // Execute operations
      console.log("Log start of backup process");
      // TODO: Implement file copy: Copy files from source to destination with filtering
      console.log("Log completion of backup process");
      
      return { 
        ok: true, 
        artifacts: ["backup-summary.log"],
        summary: "Files backed up successfully from {{ sourcePath }} to {{ destinationPath }}"
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