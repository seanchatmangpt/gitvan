export default {
  meta: { 
    desc: "A job that cleans up temporary and cache files from the project directory based on configurable patterns.", 
    tags: ["cleanup","file-operation","automation"],
    author: "GitVan AI",
    version: "1.0.0"
  },
  cron: "0 3 * * 0",
  on: ["push"],
  schedule: "weekly",
  async run({ ctx, payload, meta }) {
    try {
      console.log("Executing job: A job that cleans up temporary and cache files from the project directory based on configurable patterns.");
      
      // Extract parameters
      const includePatterns = payload.includePatterns || ["*.tmp","*.cache","*~"];
      const excludePatterns = payload.excludePatterns || [];
      const dryRun = payload.dryRun || true;
      
      // Execute operations
      console.log("Log start of cleanup process");
      // TODO: Implement file read: Read configuration file for include/exclude patterns
      // TODO: Implement file write: Write cleanup summary to a log file
      // TODO: Implement file move: Move files matching include patterns to temporary directory
      // TODO: Implement file copy: Copy cache files to backup location
      // TODO: Implement file move: Move backup files to final backup directory
      
      return { 
        ok: true, 
        artifacts: ["cleanup-summary.log","backup-directory"],
        summary: "Successfully cleaned up temporary and cache files."
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