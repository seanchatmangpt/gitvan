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
  VERBOSE_JOB_WRITER_TEMPLATE,
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

    case "help":
      return await showHelp();

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
    const prompt = args.prompt || args.arg0;
    if (!prompt) {
      throw new Error("Prompt required for preview command");
    }

    const input = ChatInput.parse({
      prompt: prompt,
      kind: args.kind || "job",
      options: {
        temperature: args.temp ? parseFloat(args.temp) : 0.7,
        model: args.model,
      },
    });

    // Generate the job without writing to file
    const result = await generateJobFiles(input, config, false);

    console.log("Preview:");
    console.log(`  Job Type: ${input.kind}`);
    console.log(`  Mode: ${result.mode}`);
    console.log(`  Summary: ${result.summary}`);
    console.log();
    console.log("Generated Code:");
    console.log(result.source);
    console.log();
    console.log("Note: Use 'generate' command to create the actual file");
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
    const prompt = args.prompt || args.arg0;
    if (!prompt) {
      throw new Error("Prompt required for apply command");
    }

    const name = args.name || args.id;
    if (!name) {
      throw new Error("Job name required for apply command (use --name)");
    }

    const input = ChatInput.parse({
      prompt: prompt,
      kind: args.kind || "job",
      id: name,
      options: {
        temperature: args.temp ? parseFloat(args.temp) : 0.7,
        model: args.model,
      },
    });

    // Generate and apply the job
    const result = await generateJobFiles(input, config);

    console.log(`Applied job: ${name}`);
    console.log(`  File: ${result.filePath}`);
    console.log(`  Mode: ${result.mode}`);
    console.log(`  Summary: ${result.summary}`);
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
    const jobPath = args.job || args.arg0;
    if (!jobPath) {
      throw new Error("Job path required for explain command");
    }

    // Find the job file
    const { findJobFile, loadJobDefinition } = await import(
      "../runtime/jobs.mjs"
    );
    const jobFile = findJobFile(config.rootDir, jobPath);

    if (!jobFile) {
      throw new Error(`Job not found: ${jobPath}`);
    }

    // Load the job definition
    const definition = await loadJobDefinition(jobFile);

    if (!definition) {
      throw new Error(`Failed to load job definition: ${jobPath}`);
    }

    // Generate explanation using AI
    const prompt = `Explain this GitVan job in plain English:

File: ${jobPath}
Code:
${JSON.stringify(definition, null, 2)}

Provide a clear explanation of:
1. What this job does
2. When it runs
3. What inputs it expects
4. What outputs it produces
5. Any important configuration details`;

    const { generateText } = await import("../ai/provider.mjs");
    const result = await generateText({ prompt, config });

    console.log("Job Analysis:");
    console.log(`  Job: ${jobPath}`);
    console.log(`  File: ${jobFile}`);
    console.log();
    console.log("Explanation:");
    console.log(result.output);
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
 * Show help for chat commands
 * @returns {Promise<void>}
 */
async function showHelp() {
  console.log("GitVan Chat Commands:");
  console.log();
  console.log("  draft <prompt>              Generate job/event specification");
  console.log("  generate <prompt>           Generate complete job/event file");
  console.log("  preview <prompt>            Preview changes before applying");
  console.log(
    "  apply <prompt>              Apply generated changes to filesystem",
  );
  console.log(
    "  explain <job-path>          Explain existing job in plain English",
  );
  console.log(
    "  design <requirements>       Interactive design wizard (not implemented)",
  );
  console.log("  help                        Show this help");
  console.log();
  console.log("Options:");
  console.log(
    "  --kind <type>               Job type: job, event (default: job)",
  );
  console.log(
    "  --temp <number>             Temperature 0.0-1.0 (default: 0.7)",
  );
  console.log(
    "  --model <name>              AI model name (default: qwen3-coder:30b)",
  );
  console.log("  --output <path>             Output file path (generate only)");
  console.log("  --name <name>               Job name (apply only)");
  console.log();
  console.log("Examples:");
  console.log('  gitvan chat draft "Create a backup job"');
  console.log('  gitvan chat generate "Create a cleanup job" --kind job');
  console.log('  gitvan chat preview "Create a logging job"');
  console.log('  gitvan chat apply "Create a test job" --name "my-test-job"');
  console.log('  gitvan chat explain "test/simple"');
  console.log(
    '  gitvan chat draft "Create a push event" --kind event --temp 0.5',
  );
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
 * @param {boolean} writeFile - Whether to write file to disk (default: true)
 * @returns {Promise<object>} Generated files
 */
async function generateJobFiles(input, config, writeFile = true) {
  const prompt = await buildJobPrompt(input);

  const result = await generateText({
    prompt,
    model: input.options?.model,
    config,
  });

  // Clean up AI output - remove markdown code blocks
  let cleanedOutput = result.output;

  // Remove markdown code block wrappers
  cleanedOutput = cleanedOutput.replace(/^```javascript\s*\n?/i, "");
  cleanedOutput = cleanedOutput.replace(/^```js\s*\n?/i, "");
  cleanedOutput = cleanedOutput.replace(/^```\s*\n?/i, "");
  cleanedOutput = cleanedOutput.replace(/\n?```\s*$/i, "");

  // Validate cleaned code
  if (!/defineJob\s*\(/.test(cleanedOutput)) {
    throw new Error("Generated output is not a valid GitVan job module");
  }

  // Determine file path
  const id =
    input.id || `chat-${fingerprint({ t: Date.now(), prompt: input.prompt })}`;
  const subdir = input.kind === "event" ? "events/chat" : "jobs/chat";
  const filename = `${id}${input.kind === "event" ? ".evt.mjs" : ".mjs"}`;
  const relPath = input.path || join(subdir, filename);

  let outPath = null;
  if (writeFile) {
    outPath = writeFileSafe(config.rootDir, relPath, cleanedOutput);
  } else {
    outPath = join(config.rootDir, relPath);
  }

  return ChatOutput.parse({
    ok: true,
    id,
    mode: input.kind === "event" ? "event" : "on-demand",
    filePath: outPath,
    source: cleanedOutput,
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
 * Build comprehensive job generation prompt using useTemplate
 * @param {object} input - Chat input with prompt and options
 * @returns {Promise<string>} Generated prompt
 */
async function buildJobPrompt(input) {
  const { useTemplate } = await import("../composables/template.mjs");
  const template = await useTemplate();
  
  // Use verbose template for comprehensive guidance
  const templateContent = input.kind === "event" ? EVENT_WRITER_TEMPLATE : VERBOSE_JOB_WRITER_TEMPLATE;
  
  // Render the template with context
  const context = {
    prompt: input.prompt,
    kind: input.kind,
    target: input.target || "general automation",
    desc: input.desc || `Generated ${input.kind} for: ${input.prompt}`,
    tags: input.tags || ["ai-generated", input.kind],
    author: "GitVan AI",
    version: "1.0.0",
    cron: input.cron,
    on: input.on,
    schedule: input.schedule,
    body: input.body || `// Implementation for: ${input.prompt}`,
    summary: `Successfully executed ${input.kind} for: ${input.prompt}`
  };
  
  try {
    // Use the template system to render the prompt
    const renderedPrompt = await template.renderString(templateContent, context);
    return renderedPrompt;
  } catch (error) {
    // Fallback to simple template if rendering fails
    logger.warn("Template rendering failed, using fallback:", error.message);
    return `Generate a GitVan ${input.kind} module for the following request:

"${input.prompt}"

Use this template structure:
${templateContent}

Replace the placeholders with appropriate values based on the request. Generate complete, working code that can be executed by GitVan.`;
  }
}
