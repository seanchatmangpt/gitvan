// Invalid Job Example - This job demonstrates common violations of GitVan best practices
const invalidJob = {
  // Missing defineJob wrapper - This is the primary violation
  name: "invalid-job",
  description: "A job that violates GitVan best practices",
  
  // Invalid event system - Using non-canonical event format
  on: {
    push: ["refs/heads/main", "refs/heads/develop"], // Wrong format - should be string not array
    cron: "0 2 * * *" // This is valid but we'll make other parts invalid
  },
  
  // Missing meta object with required fields
  meta: {
    version: "1.0.0"
    // Missing required fields like author, category etc.
  },
  
  async run({ ctx, payload, meta }) {
    // Direct Git command usage - Violation of composables rule
    const { execSync } = require('child_process');
    try {
      // This violates the rule of not using direct Git commands
      const result = execSync('git status', { encoding: 'utf8' });
      
      // Missing proper error handling - no try/catch around Git operations
      const git = useGit(); // This function doesn't exist in GitVan context
      
      // Wrong method names - using snake_case instead of camelCase
      const fileContent = git.read_file("config.json"); 
      const newFile = git.write_file("output.txt", "content");
      
      // No proper artifact tracking
      const artifacts = ["output.txt"];
      
      // Returning invalid result structure
      return {
        success: true, // Invalid field name - should be 'ok'
        files_created: artifacts, // Invalid field names
        message: "Job completed successfully"
      };
      
    } catch (error) {
      // Error handling that doesn't follow GitVan patterns
      console.error("Job failed:", error.message);
      
      // Return invalid result structure
      return {
        success: false,
        error_message: error.message,
        files_created: []
      };
    }
  }
};

// This job has multiple violations:
// 1. No defineJob wrapper
// 2. Direct Git command usage instead of composables
// 3. Wrong event format (array instead of string)
// 4. Invalid method naming (snake_case instead of camelCase)
// 5. Incorrect result structure (success instead of ok, etc.)
// 6. Missing required metadata fields
// 7. Improper error handling patterns