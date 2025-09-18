/**
 * GitVan Chat Generate Subcommand
 * Generates working job files from prompts
 */

import { ChatInput } from "../../schemas/chat.zod.mjs";
import { generateWorkingJob } from "../../ai/provider.mjs";
import {
  GITVAN_SYSTEM_CONTEXT,
  JOB_GENERATION_CONTEXT,
} from "../../ai/prompts/gitvan-context.mjs";
import { writeFileSafe } from "../../utils/fs.mjs";
import { fingerprint } from "../../utils/crypto.mjs";
import { join } from "pathe";
import { createLogger } from "../../utils/logger.mjs";

const logger = createLogger("chat-generate");

/**
 * Generate working files from prompt (not skeletons!)
 * @param {object} config - GitVan config
 * @param {object} args - Generate arguments
 * @returns {Promise<void>}
 */
export async function generateCommand(config, args) {
  try {
    const prompt = args.prompt || args.arg0;
    if (!prompt) {
      throw new Error("Prompt required for generate command");
    }

    console.log("🤖 Generating WORKING GitVan job with AI...");

    const input = ChatInput.parse({
      prompt: prompt,
      kind: args.kind || "job",
      path: args.path,
      options: {
        temperature: args.temp ? parseFloat(args.temp) : 0.7,
        model: args.model,
      },
    });

    // Build context-aware prompt for working code generation
    const contextPrompt = `${GITVAN_SYSTEM_CONTEXT}

${JOB_GENERATION_CONTEXT}

User Request: "${input.prompt}"

Generate a COMPLETE, WORKING GitVan job file. Requirements:
- Use the exact canonical job structure with defineJob()
- Import composables correctly from GitVan index
- Implement actual functionality (NO TODO comments)
- Use proper camelCase Git method names
- Include comprehensive error handling
- Return proper result objects
- Make the job immediately runnable

The generated code must be production-ready and functional.`;

    // Use AI to generate working job code
    const result = await generateWorkingJob({
      prompt: contextPrompt,
      model: input.options?.model,
      options: {
        temperature: input.options?.temperature || 0.7,
      },
      config,
    });

    // Determine file path - use AI-generated name if available
    let id;
    if (input.id) {
      id = input.id;
    } else if (result.spec?.meta?.name) {
      // Use AI-generated job name
      id = result.spec.meta.name;
    } else if (result.spec?.name) {
      // Use AI-generated job name (flat structure)
      id = result.spec.name;
    } else {
      // Fallback to fingerprint
      id = `chat-${fingerprint({ t: Date.now(), prompt: input.prompt })}`;
    }

    const subdir = input.kind === "event" ? "events/chat" : "jobs/chat";
    const filename = `${id}${input.kind === "event" ? ".evt.mjs" : ".mjs"}`;
    const relPath = input.path || join(subdir, filename);

    // Write the WORKING job to disk
    const outPath = writeFileSafe(config.rootDir, relPath, result.code);

    console.log("✅ Generated WORKING GitVan job:");
    console.log(`  File: ${outPath}`);
    console.log(`  Mode: ${input.kind === "event" ? "event" : "on-demand"}`);
    console.log(
      `  Summary: ${
        result.spec?.meta?.desc ||
        result.spec?.desc ||
        "Job generated successfully"
      }`
    );
    console.log(`  Working: ${result.working ? "YES" : "NO"}`);
    console.log();
    console.log("📄 Generated source code:");
    console.log(result.code);

    console.log("\n🚀 Ready to use:");
    console.log(`  • Run: gitvan job run ${relPath}`);
    console.log(`  • Test: gitvan job test ${relPath}`);
    console.log(`  • Explain: gitvan chat explain ${relPath}`);
  } catch (error) {
    logger.error("Failed to generate working files:", error.message);
    throw error;
  }
}
