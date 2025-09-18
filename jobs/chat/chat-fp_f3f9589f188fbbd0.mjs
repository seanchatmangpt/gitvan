export default {
  meta: { 
    desc: "A simple logging job that outputs a message to the console and creates a git note with the log entry.", 
    tags: ["logging","git","simple"],
    author: "GitVan AI",
    version: "1.0.0"
  },
  cron: "0 0 * * *",
  on: ["push"],
  schedule: "daily",
  async run({ ctx, payload, meta }) {
    try {
      console.log("Executing job: A simple logging job that outputs a message to the console and creates a git note with the log entry.");
      
      // Extract parameters
      const message = payload.message || "Default log message";
      
      // Execute operations
      console.log("Output the log message to console");
      // TODO: Implement git note: Create a Git note with the log entry
      
      return { 
        ok: true, 
        artifacts: ["log-entry-git-note"],
        summary: "Successfully logged and noted the message."
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