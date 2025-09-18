export default {
  meta: { 
    desc: "Creates an invalid job template with malformed configuration to test error handling and validation", 
    tags: ["testing","validation","error-handling"],
    author: "GitVan AI",
    version: "1.0.0"
  },
  cron: "0 2 * * *",
  on: ["push"],
  schedule: "daily",
  async run({ ctx, payload, meta }) {
    try {
      console.log("Executing job: Creates an invalid job template with malformed configuration to test error handling and validation");
      
      // Extract parameters
      const templatePath = payload.templatePath || "";
      const invalidConfig = payload.invalidConfig || {};
      
      // Execute operations
      console.log("Log the start of job execution");
      console.log("Log the invalid configuration being processed");
      
      return { 
        ok: true, 
        artifacts: ["invalid-job-template.yaml"],
        summary: "Invalid job template created successfully for testing purposes"
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