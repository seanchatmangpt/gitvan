/**
 * GitVan Chat Preview Subcommand
 * Previews working job code before applying
 */

import { ChatInput } from "../../schemas/chat.zod.mjs";
import { generateWorkingJob } from "../../ai/real-provider.mjs";
import {
  GITVAN_SYSTEM_CONTEXT,
  JOB_GENERATION_CONTEXT,
} from "../../ai/prompts/gitvan-context.mjs";
import { createLogger } from "../../utils/logger.mjs";

const logger = createLogger("chat-preview");

/**
 * Preview working changes before applying
 * @param {object} config - GitVan config
 * @param {object} args - Preview arguments
 * @returns {Promise<void>}
 */
export async function previewCommand(config, args) {
  try {
    const prompt = args.prompt || args.arg0;
    if (!prompt) {
      throw new Error("Prompt required for preview command");
    }

    console.log("🤖 Previewing WORKING GitVan job with AI...");

    const input = ChatInput.parse({
      prompt: prompt,
      kind: args.kind || "job",
      options: {
        temperature: args.temp ? parseFloat(args.temp) : 0.7,
        model: args.model,
      },
    });

    // Build context-aware prompt
    const contextPrompt = `${GITVAN_SYSTEM_CONTEXT}

${JOB_GENERATION_CONTEXT}

User Request: "${input.prompt}"

Generate a COMPLETE, WORKING GitVan job file for preview. Requirements:
- Use the exact canonical job structure with defineJob()
- Import composables correctly from GitVan index
- Implement actual functionality (NO TODO comments)
- Use proper camelCase Git method names
- Include comprehensive error handling
- Return proper result objects
- Make the job immediately runnable

The generated code must be production-ready and functional.`;

    // Generate the working job without writing to file
    const result = await generateWorkingJob({
      prompt: contextPrompt,
      model: input.options?.model,
      options: {
        temperature: input.options?.temperature || 0.7,
      },
      config,
    });

    console.log("📋 Preview of WORKING GitVan job:");
    console.log(`  Job Type: ${input.kind}`);
    console.log(`  Mode: ${input.kind === "event" ? "event" : "on-demand"}`);
    console.log(`  Summary: ${result.spec.implementation.returnValue.success}`);
    console.log(`  Working: ${result.working ? "YES" : "NO"}`);
    console.log();
    console.log("📄 Generated WORKING Code:");
    console.log(result.code);
    console.log();
    console.log("💡 Next steps:");
    console.log("  • Use 'gitvan chat generate' to create the actual file");
    console.log(
      "  • Use 'gitvan chat apply --name <name>' to create with custom name"
    );
    console.log(
      "  • Use 'gitvan chat draft' to refine the specification first"
    );
  } catch (error) {
    logger.error("Failed to preview working changes:", error.message);
    throw error;
  }
}
