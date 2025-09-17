/**
 * GitVan Chat Explain Subcommand
 * Explains existing jobs in plain English
 */

import { GITVAN_SYSTEM_CONTEXT } from "../../ai/prompts/gitvan-context.mjs";
import { generateText } from "../../ai/provider.mjs";
import { createLogger } from "../../utils/logger.mjs";
import { readFile } from "fs/promises";
import { join } from "pathe";

const logger = createLogger("chat-explain");

/**
 * Explain existing job in plain English
 * @param {object} config - GitVan config
 * @param {object} args - Explain arguments
 * @returns {Promise<void>}
 */
export async function explainCommand(config, args) {
  try {
    const jobPath = args.jobPath || args.arg0;
    if (!jobPath) {
      throw new Error("Job path required for explain command");
    }

    console.log(`📖 Explaining GitVan job: ${jobPath}`);

    // Find and read the job file
    const possiblePaths = [
      jobPath,
      join("jobs", jobPath),
      join("jobs", `${jobPath}.mjs`),
      join("events", jobPath),
      join("events", `${jobPath}.mjs`),
      join("jobs/chat", jobPath),
      join("jobs/chat", `${jobPath}.mjs`),
      join("events/chat", jobPath),
      join("events/chat", `${jobPath}.mjs`),
    ];

    let jobFile = null;
    let jobContent = null;

    for (const path of possiblePaths) {
      try {
        const fullPath = join(config.rootDir, path);
        jobContent = await readFile(fullPath, "utf-8");
        jobFile = fullPath;
        break;
      } catch (error) {
        // Continue to next path
      }
    }

    if (!jobFile || !jobContent) {
      throw new Error(
        `Job not found: ${jobPath}. Searched paths: ${possiblePaths.join(", ")}`
      );
    }

    // Build context-aware explanation prompt
    const explanationPrompt = `${GITVAN_SYSTEM_CONTEXT}

Analyze this GitVan job file and explain it in plain English:

File: ${jobFile}
Content:
\`\`\`javascript
${jobContent}
\`\`\`

Provide a comprehensive explanation covering:

1. **Purpose**: What does this job do?
2. **Triggers**: When does it run? (events, cron, etc.)
3. **Inputs**: What data does it expect?
4. **Process**: How does it work step by step?
5. **Outputs**: What does it produce?
6. **Dependencies**: What composables does it use?
7. **Configuration**: Any special settings or options?
8. **Error Handling**: How does it handle failures?
9. **Artifacts**: What files does it create/modify?
10. **Usage**: How would you run or test this job?

Format the explanation clearly with headers and bullet points.`;

    // Generate explanation using AI
    const result = await generateText({
      prompt: explanationPrompt,
      config,
    });

    console.log("📋 Job Analysis:");
    console.log(`  Job: ${jobPath}`);
    console.log(`  File: ${jobFile}`);
    console.log();
    console.log("📖 Explanation:");
    console.log(result.output);

    console.log("\n🔧 Quick Commands:");
    console.log(`  • Run: gitvan job run ${jobPath}`);
    console.log(`  • Test: gitvan job test ${jobPath}`);
    console.log(`  • Edit: code ${jobFile}`);
  } catch (error) {
    logger.error("Failed to explain job:", error.message);
    throw error;
  }
}
