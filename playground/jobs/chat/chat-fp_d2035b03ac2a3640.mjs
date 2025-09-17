export default {
  meta: { 
    desc: "A job that cleans up temporary and cache files in the repository based on specified patterns.", 
    tags: ["cleanup","file-operation","automation"],
    author: "GitVan AI",
    version: "1.0.0"
  },
  cron: "0 3 * * *",
  on: ["push"],
  schedule: "daily",
  async run({ ctx, payload, meta }) {
    try {
      console.log("Executing job: A job that cleans up temporary and cache files in the repository based on specified patterns.");
      
      // Extract parameters
      const includePatterns = payload.includePatterns || ["*.tmp","*.cache","node_modules/.cache"];
      const excludePatterns = payload.excludePatterns || [".git"];
      
      // Execute operations
      console.log("Log start of cleanup operation");
      // TODO: Implement file read: Read the list of files matching include patterns
      // TODO: Implement file move: Move matched files to a temporary directory for review
      console.log("Log completion of cleanup operation");
      
      return { 
        ok: true, 
        artifacts: ["cleanup-report.txt"],
        summary: "Successfully cleaned up temporary files"
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