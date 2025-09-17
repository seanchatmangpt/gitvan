/**
 * GitVan v2 Chat CLI - Conversational job generation commands
 * Provides commands for AI-powered job/event/template generation
 */

import { loadOptions } from "../config/loader.mjs";
import { getCachedEnvironment } from "../utils/nunjucks-config.mjs";
import { writeFileSafe } from "../utils/fs.mjs";
import { ChatInput, ChatOutput } from "../schemas/chat.zod.mjs";
import { JobDef } from "../schemas/job.zod.mjs";
import { generateText, checkAIAvailability } from "../ai/provider.mjs";
import { fingerprint } from "../utils/crypto.mjs";
import { join } from "pathe";
import { createLogger } from "../utils/logger.mjs";
import {
  JOB_WRITER_TEMPLATE,
  EVENT_WRITER_TEMPLATE,
  TEMPLATE_GENERATOR_TEMPLATE,
} from "../ai/prompts/templates.mjs";

const logger = createLogger("chat-cli");

/**
 * Chat CLI command handler
 * @param {string} subcommand - Subcommand (draft, generate, preview, apply, explain)
 * @param {object} args - Command arguments
 * @returns {Promise<void>}
 */
export async function chatCommand(subcommand = "draft", args = {}) {
  const config = await loadOptions();

  switch (subcommand) {
    case "draft":
      return await draftSpec(config, args);

    case "generate":
      return await generateFiles(config, args);

    case "preview":
      return await previewChanges(config, args);

    case "apply":
      return await applyChanges(config, args);

    case "explain":
      return await explainJob(config, args);

    case "design":
      return await designWizard(config, args);

    default:
      throw new Error(`Unknown chat subcommand: ${subcommand}`);
  }
}

/**
 * Draft a job/event spec from prompt (no file writes)
 * @param {object} config - GitVan config
 * @param {object} args - Draft arguments
 * @returns {Promise<void>}
 */
async function draftSpec(config, args) {
  try {
    const prompt = args.prompt || args.arg0;
    if (!prompt) {
      throw new Error("Prompt required for draft command");
    }

    const input = ChatInput.parse({
      prompt: prompt,
      kind: args.kind || "job",
      options: {
        temperature: args.temp ? parseFloat(args.temp) : 0.7,
        model: args.model,
        stream: false,
      },
    });

    // Check AI availability
    const availability = await checkAIAvailability(config);
    if (!availability.available) {
      console.log("AI not available, using wizard fallback...");
      return await designWizard(config, args);
    }

    // Generate spec using AI
    const result = await generateSpec(input, config);

    console.log("Generated specification:");
    console.log(JSON.stringify(result.spec, null, 2));
  } catch (error) {
    logger.error("Failed to draft spec:", error.message);
    throw error;
  }
}

/**
 * Generate files from prompt (no writes, shows plan)
 * @param {object} config - GitVan config
 * @param {object} args - Generate arguments
 * @returns {Promise<void>}
 */
async function generateFiles(config, args) {
  try {
    const prompt = args.prompt || args.arg0;
    if (!prompt) {
      throw new Error("Prompt required for generate command");
    }

    const input = ChatInput.parse({
      prompt: prompt,
      kind: args.kind || "job",
      path: args.path,
      options: {
        temperature: args.temp ? parseFloat(args.temp) : 0.7,
        model: args.model,
      },
    });

    // Generate files
    const result = await generateJobFiles(input, config);

    console.log("Generated files:");
    console.log(`  File: ${result.filePath}`);
    console.log(`  Mode: ${result.mode}`);
    console.log(`  Summary: ${result.summary}`);
    console.log();
    console.log("Source code:");
    console.log(result.source);
  } catch (error) {
    logger.error("Failed to generate files:", error.message);
    throw error;
  }
}

/**
 * Preview changes before applying
 * @param {object} config - GitVan config
 * @param {object} args - Preview arguments
 * @returns {Promise<void>}
 */
async function previewChanges(config, args) {
  try {
    console.log("Preview functionality not implemented in this version");
    console.log("Use 'generate' command to see proposed changes");
  } catch (error) {
    logger.error("Failed to preview changes:", error.message);
    throw error;
  }
}

/**
 * Apply generated changes to filesystem
 * @param {object} config - GitVan config
 * @param {object} args - Apply arguments
 * @returns {Promise<void>}
 */
async function applyChanges(config, args) {
  try {
    if (!args.id) {
      throw new Error("Generated ID required for apply command");
    }

    console.log("Apply functionality not implemented in this version");
    console.log("Use 'generate' command and manually copy the output");
  } catch (error) {
    logger.error("Failed to apply changes:", error.message);
    throw error;
  }
}

/**
 * Explain an existing job in plain English
 * @param {object} config - GitVan config
 * @param {object} args - Explain arguments
 * @returns {Promise<void>}
 */
async function explainJob(config, args) {
  try {
    if (!args.job) {
      throw new Error("Job path required for explain command");
    }

    console.log(
      "Job explanation functionality not implemented in this version",
    );
    console.log("Use 'list' command to see available jobs");
  } catch (error) {
    logger.error("Failed to explain job:", error.message);
    throw error;
  }
}

/**
 * Interactive design wizard (no AI required)
 * @param {object} config - GitVan config
 * @param {object} args - Design arguments
 * @returns {Promise<void>}
 */
async function designWizard(config, args) {
  try {
    console.log("Design wizard not implemented in this version");
    console.log("Use 'draft' or 'generate' commands with AI");
  } catch (error) {
    logger.error("Failed to run design wizard:", error.message);
    throw error;
  }
}

/**
 * Generate job specification using AI
 * @param {object} input - Chat input
 * @param {object} config - GitVan config
 * @returns {Promise<object>} Generated spec
 */
async function generateSpec(input, config) {
  const prompt = buildSpecPrompt(input);

  const result = await generateText({
    prompt,
    model: input.options?.model,
    config,
  });

  try {
    const spec = JSON.parse(result.output);
    return { spec, metadata: result };
  } catch (error) {
    throw new Error(`Failed to parse generated spec: ${error.message}`);
  }
}

/**
 * Generate job files using AI
 * @param {object} input - Chat input
 * @param {object} config - GitVan config
 * @returns {Promise<object>} Generated files
 */
async function generateJobFiles(input, config) {
  const prompt = buildJobPrompt(input);

  const result = await generateText({
    prompt,
    model: input.options?.model,
    config,
  });

  // Validate generated code
  if (!/defineJob\s*\(/.test(result.output)) {
    throw new Error("Generated output is not a valid GitVan job module");
  }

  // Determine file path
  const id =
    input.id || `chat-${fingerprint({ t: Date.now(), prompt: input.prompt })}`;
  const subdir = input.kind === "event" ? "events/chat" : "jobs/chat";
  const filename = `${id}${input.kind === "event" ? ".evt.mjs" : ".mjs"}`;
  const relPath = input.path || join(subdir, filename);

  const outPath = writeFileSafe(config.rootDir, relPath, result.output);

  return ChatOutput.parse({
    ok: true,
    id,
    mode: input.kind === "event" ? "event" : "on-demand",
    filePath: outPath,
    source: result.output,
    summary: "Generated via chat interface",
    model: result.model,
    modelParams: result.options,
    duration: result.duration,
  });
}

/**
 * Build specification generation prompt
 * @param {object} input - Chat input
 * @returns {string} Prompt text
 */
function buildSpecPrompt(input) {
  return `Generate a GitVan ${input.kind} specification in JSON format for the following request:

"${input.prompt}"

Return only valid JSON that matches the GitVan ${input.kind} schema. Include:
- id: unique identifier
- meta: description and tags
- ${input.kind === "event" ? "on: event predicate" : "run: function signature"}
- appropriate configuration options

Do not include any explanatory text, only the JSON specification.`;
}

/**
 * Build job generation prompt
 * @param {object} input - Chat input
 * @returns {string} Prompt text
 */
function buildJobPrompt(input) {
  const template =
    input.kind === "event" ? EVENT_WRITER_TEMPLATE : JOB_WRITER_TEMPLATE;

  return `Generate a GitVan ${input.kind} module for the following request:

"${input.prompt}"

Use this template structure:
${template}

Replace the placeholders with appropriate values based on the request. Generate complete, working code that can be executed by GitVan.`;
}
