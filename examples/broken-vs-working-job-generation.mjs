/**
 * Example: What GitVan AI Job Generation SHOULD Produce
 * This demonstrates the gap between current broken system and required functionality
 */

// ❌ CURRENT BROKEN OUTPUT
const brokenJob = `
import { defineJob, useGit, useTemplate, useNotes } from 'file:///Users/sac/gitvan/src/index.mjs'

export default defineJob({
  meta: {
    desc: "Generated job for: [{"role":"user","content":[{"type":"text","text":"...",
    tags: ["ai-generated","automation"],
    author: "GitVan AI",
    version: "1.0.0"
  },
  
  async run({ ctx, payload, meta }) {
    try {
      const git = useGit();
      const template = useTemplate();
      const notes = useNotes();
      
      console.log("Executing job: Generated job for: [{"role":"user","content":[{"type":"text","text":"...");
      
      // Execute operations
      // Execute task
    console.log('Execute task')
      
      return {
        ok: true,
        artifacts: ["output.txt"],
        summary: "Task completed successfully"
      };
    } catch (error) {
      console.error('Job failed:', error.message);
      return {
        ok: false,
        error: error.message,
        artifacts: []
      };
    }
  }
})
`;

// ✅ REQUIRED WORKING OUTPUT
const workingJob = `
import { defineJob, useGit, useTemplate, useNotes } from 'file:///Users/sac/gitvan/src/index.mjs'

export default defineJob({
  meta: {
    name: "backup-job",
    desc: "Backup important files using GitVan composables",
    tags: ["backup", "automation", "file-operation"],
    author: "GitVan AI",
    version: "1.0.0"
  },
  config: {
    cron: "0 2 * * *"
  },
  async run({ ctx, payload, meta }) {
    try {
      const git = useGit();
      const template = useTemplate();
      const notes = useNotes();
      
      console.log("Starting backup process");
      
      // Create backup directory
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = \`backups/\${timestamp}\`;
      
      // Create backup directory
      await git.writeFile(\`\${backupDir}/README.txt\`, \`Backup created at \${new Date().toISOString()}\`);
      
      // Copy important files
      const importantFiles = ['package.json', 'README.md', 'src/'];
      for (const file of importantFiles) {
        try {
          const content = await git.readFile(file);
          await git.writeFile(\`\${backupDir}/\${file}\`, content);
        } catch (error) {
          console.warn(\`Could not backup \${file}: \${error.message}\`);
        }
      }
      
      // Log backup completion
      await notes.write(\`Backup completed: \${backupDir}\`);
      
      return {
        ok: true,
        artifacts: [backupDir],
        summary: "Backup completed successfully with GitVan composables"
      };
    } catch (error) {
      console.error('Backup failed:', error.message);
      return {
        ok: false,
        error: error.message,
        artifacts: []
      };
    }
  }
})
`;

// Test that demonstrates the difference
export function testJobGeneration() {
  console.log("=== BROKEN JOB (Current System) ===");
  console.log("❌ Syntax errors:", brokenJob.includes("[{"));
  console.log(
    "❌ No actual GitVan operations:",
    !brokenJob.includes("await git.writeFile")
  );
  console.log(
    "❌ Generic console.log only:",
    brokenJob.includes("console.log('Execute task')")
  );

  console.log("\n=== WORKING JOB (Required System) ===");
  console.log("✅ Valid syntax:", !workingJob.includes("[{"));
  console.log(
    "✅ Uses GitVan composables:",
    workingJob.includes("await git.writeFile")
  );
  console.log(
    "✅ Uses GitVan notes:",
    workingJob.includes("await notes.write")
  );
  console.log("✅ Proper error handling:", workingJob.includes("try {"));
  console.log(
    "✅ Returns proper structure:",
    workingJob.includes("return { ok: true")
  );
}

// Export for testing
export { brokenJob, workingJob };
