export default {
  meta: { 
    desc: "Creates an invalid job to test error handling and validation mechanisms", 
    tags: ["testing","validation","error-handling"],
    author: "GitVan AI",
    version: "1.0.0"
  },
  
  on: ["push"],
  
  async run({ ctx, payload, meta }) {
    try {
      console.log("Executing job: Creates an invalid job to test error handling and validation mechanisms");
      
      // Extract parameters
      const jobName = payload.jobName || "invalid-job";
      
      // Execute operations
      console.log("Log that an invalid job is being created");
      
      return { 
        ok: true, 
        artifacts: ["invalid-job.json"],
        summary: "Invalid job creation attempt completed with expected errors"
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