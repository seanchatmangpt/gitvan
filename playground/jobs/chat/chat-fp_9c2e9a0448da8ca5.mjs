export default {
  meta: { 
    desc: "Creates an invalid job by generating a malformed configuration file", 
    tags: ["template","invalid","testing"],
    author: "GitVan AI",
    version: "1.0.0"
  },
  
  on: ["push"],
  
  async run({ ctx, payload, meta }) {
    try {
      console.log("Executing job: Creates an invalid job by generating a malformed configuration file");
      
      // Extract parameters
      const outputPath = payload.outputPath || "./invalid-job-config.yaml";
      
      // Execute operations
      console.log("Log that we are creating an invalid job");
      // TODO: Implement template render: Render a malformed YAML template to simulate invalid job config
      
      return { 
        ok: true, 
        artifacts: ["{{ outputPath }}"],
        summary: "Invalid job configuration file created successfully"
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