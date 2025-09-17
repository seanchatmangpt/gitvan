/**
 * GitVan Chat Draft Subcommand
 * Generates job specifications without creating files
 */

import { ChatInput } from "../../schemas/chat.zod.mjs";
import { generateJobSpec } from "../../ai/provider.mjs";
import {
  GITVAN_SYSTEM_CONTEXT,
  JOB_GENERATION_CONTEXT,
} from "../../ai/prompts/gitvan-context.mjs";
import { createLogger } from "../../utils/logger.mjs";

const logger = createLogger("chat-draft");

/**
 * Draft job specification (no file writes)
 * @param {object} config - GitVan config
 * @param {object} args - Draft arguments
 * @returns {Promise<void>}
 */
export async function draftCommand(config, args) {
  try {
    const prompt = args.prompt || args.arg0;
    if (!prompt) {
      throw new Error("Prompt required for draft command");
    }

    console.log("🤖 Analyzing your request with GitVan context...");

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

Generate a detailed job specification that follows GitVan patterns exactly. Include:
- Complete meta object with name, description, tags, author, version
- Appropriate event triggers (on object)
- Detailed implementation plan
- Expected return values
- Error handling strategy

Return only valid JSON specification.`;

    // Use AI to generate job specification
    const result = await generateJobSpec({
      prompt: contextPrompt,
      model: input.options?.model,
      options: {
        temperature: input.options?.temperature || 0.7,
      },
      config,
    });

    console.log("✅ Generated GitVan job specification:");
    console.log(JSON.stringify(result.spec, null, 2));

    console.log("\n📋 Next steps:");
    console.log("  • Use 'gitvan chat generate' to create the actual job file");
    console.log("  • Use 'gitvan chat preview' to see the generated code");
    console.log(
      "  • Use 'gitvan chat apply --name <name>' to create with custom name"
    );
  } catch (error) {
    logger.error("Failed to draft spec:", error.message);
    throw error;
  }
}
