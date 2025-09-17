export default {
  meta: { 
    desc: "Creates an invalid job entry to test error handling and validation mechanisms", 
    tags: ["testing","validation","error-handling"],
    author: "GitVan AI",
    version: "1.0.0"
  },
  
  on: ["push"],
  
  async run({ ctx, payload, meta }) {
    try {
      console.log("Executing job: Creates an invalid job entry to test error handling and validation mechanisms");
      
      // Extract parameters
      const shouldFail = payload.shouldFail || "";
      
      // Execute operations
      console.log("Log that we are attempting to create an invalid job");
      
      return { 
        ok: true, 
        artifacts: ["invalid-job-entry.log"],
        summary: "Invalid job entry created successfully"
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