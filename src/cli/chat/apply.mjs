/**
 * GitVan Chat Apply Subcommand
 * Applies generated working jobs with custom names
 */

import { ChatInput } from "../../schemas/chat.zod.mjs";
import { generateWorkingJob } from "../../ai/provider.mjs";
import {
  GITVAN_SYSTEM_CONTEXT,
  JOB_GENERATION_CONTEXT,
} from "../../ai/prompts/gitvan-context.mjs";
import { writeFileSafe } from "../../utils/fs.mjs";
import { join } from "pathe";
import { createLogger } from "../../utils/logger.mjs";

const logger = createLogger("chat-apply");

/**
 * Apply generated working changes to filesystem
 * @param {object} config - GitVan config
 * @param {object} args - Apply arguments
 * @returns {Promise<void>}
 */
export async function applyCommand(config, args) {
  try {
    const prompt = args.prompt || args.arg0;
    const name = args.name;

    if (!prompt) {
      throw new Error("Prompt required for apply command");
    }

    if (!name) {
      throw new Error("Job name required for apply command (use --name)");
    }

    logger.info(`🤖 Applying WORKING GitVan job "${name}" with AI...`);

    const input = ChatInput.parse({
      prompt: prompt,
      kind: args.kind || "job",
      id: name,
      options: {
        temperature: args.temp ? parseFloat(args.temp) : 0.7,
        model: args.model,
      },
    });

    // Build context-aware prompt with custom name
    const contextPrompt = `${GITVAN_SYSTEM_CONTEXT}

${JOB_GENERATION_CONTEXT}

User Request: "${input.prompt}"
Job Name: "${name}"

Generate a COMPLETE, WORKING GitVan job file with the specified name. Requirements:
- Use the exact canonical job structure with defineJob()
- Import composables correctly from GitVan index
- Implement actual functionality (NO TODO comments)
- Use proper camelCase Git method names
- Include comprehensive error handling
- Return proper result objects
- Make the job immediately runnable
- Use "${name}" as the job identifier in meta.name

The generated code must be production-ready and functional.`;

    // Generate working job with custom name
    const result = await generateWorkingJob({
      prompt: contextPrompt,
      model: input.options?.model,
      options: {
        temperature: input.options?.temperature || 0.7,
      },
      config,
    });

    // Write with custom name
    const filename = `${name}.mjs`;
    const relPath =
      input.kind === "event"
        ? join("events", filename)
        : join("jobs", filename);
    const outPath = writeFileSafe(config.rootDir, relPath, result.code);

    logger.info(`✅ Applied WORKING GitVan job "${name}":`);
    logger.info(`  File: ${outPath}`);
    logger.info(`  Working: ${result.working ? "YES" : "NO"}`);
    logger.info(`  Summary: ${result.spec.implementation.returnValue.success}`);

    logger.info("\n🚀 Ready to use:");
    logger.info(`  • Run: gitvan job run ${relPath}`);
    logger.info(`  • Test: gitvan job test ${relPath}`);
    logger.info(`  • Explain: gitvan chat explain ${relPath}`);
    logger.info(`  • List: gitvan job list`);
  } catch (error) {
    logger.error("Failed to apply working changes:", error.message);
    throw error;
  }
}
