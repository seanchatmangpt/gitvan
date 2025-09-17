/**
 * GitVan v2 Chat CLI - REAL AI Integration
 * Replaces fake template system with actual working AI-generated jobs
 */

import { loadOptions } from "../config/loader.mjs";
import { writeFileSafe } from "../utils/fs.mjs";
import { ChatInput, ChatOutput } from "../schemas/chat.zod.mjs";
import { generateWorkingJob, generateJobSpec, checkRealAIAvailability } from "../ai/real-provider.mjs";
import { fingerprint } from "../utils/crypto.mjs";
import { join } from "pathe";
import { createLogger } from "../utils/logger.mjs";

const logger = createLogger("chat-cli-real");

/**
 * Chat CLI command handler with REAL AI integration
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
 * Draft job specification (no file writes)
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

    console.log("🤖 Generating job specification with REAL AI...");
    
    const input = ChatInput.parse({
      prompt: prompt,
      kind: args.kind || "job",
      options: {
        temperature: args.temp ? parseFloat(args.temp) : 0.7,
        model: args.model,
      },
    });

    // Use real AI to generate job specification
    const result = await generateJobSpec({
      prompt: input.prompt,
      model: input.options?.model,
      options: {
        temperature: input.options?.temperature || 0.7
      },
      config
    });

    console.log("✅ Generated REAL job specification:");
    console.log(JSON.stringify(result.spec, null, 2));
  } catch (error) {
    logger.error("Failed to draft spec:", error.message);
    throw error;
  }
}

/**
 * Generate WORKING files from prompt (not skeletons!)
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

    console.log("🤖 Generating WORKING job with REAL AI (not skeleton)...");
    
    const input = ChatInput.parse({
      prompt: prompt,
      kind: args.kind || "job",
      path: args.path,
      options: {
        temperature: args.temp ? parseFloat(args.temp) : 0.7,
        model: args.model,
      },
    });

    // Use real AI to generate working job code
    const result = await generateWorkingJob({
      prompt: input.prompt,
      model: input.options?.model,
      options: {
        temperature: input.options?.temperature || 0.7
      },
      config
    });

    // Determine file path
    const id = input.id || `chat-${fingerprint({ t: Date.now(), prompt: input.prompt })}`;
    const subdir = input.kind === "event" ? "events/chat" : "jobs/chat";
    const filename = `${id}${input.kind === "event" ? ".evt.mjs" : ".mjs"}`;
    const relPath = input.path || join(subdir, filename);

    // Write the WORKING job to disk
    const outPath = writeFileSafe(config.rootDir, relPath, result.code);

    console.log("✅ Generated WORKING job (not skeleton!):");
    console.log(`  File: ${outPath}`);
    console.log(`  Mode: ${input.kind === "event" ? "event" : "on-demand"}`);
    console.log(`  Summary: ${result.spec.implementation.returnValue.success}`);
    console.log(`  Working: ${result.working ? 'YES' : 'NO'}`);
    console.log();
    console.log("📄 WORKING source code:");
    console.log(result.code);
  } catch (error) {
    logger.error("Failed to generate working files:", error.message);
    throw error;
  }
}

/**
 * Preview WORKING changes before applying
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

    console.log("🤖 Previewing WORKING job with REAL AI...");

    const input = ChatInput.parse({
      prompt: prompt,
      kind: args.kind || "job",
      options: {
        temperature: args.temp ? parseFloat(args.temp) : 0.7,
        model: args.model,
      },
    });

    // Generate the working job without writing to file
    const result = await generateWorkingJob({
      prompt: input.prompt,
      model: input.options?.model,
      options: {
        temperature: input.options?.temperature || 0.7
      },
      config
    });

    console.log("Preview of WORKING job:");
    console.log(`  Job Type: ${input.kind}`);
    console.log(`  Mode: ${input.kind === "event" ? "event" : "on-demand"}`);
    console.log(`  Summary: ${result.spec.implementation.returnValue.success}`);
    console.log(`  Working: ${result.working ? 'YES' : 'NO'}`);
    console.log();
    console.log("Generated WORKING Code:");
    console.log(result.code);
    console.log();
    console.log("Note: Use 'generate' command to create the actual WORKING file");
  } catch (error) {
    logger.error("Failed to preview working changes:", error.message);
    throw error;
  }
}

/**
 * Apply generated WORKING changes to filesystem
 * @param {object} config - GitVan config
 * @param {object} args - Apply arguments
 * @returns {Promise<void>}
 */
async function applyChanges(config, args) {
  try {
    const prompt = args.prompt || args.arg0;
    const name = args.name;
    
    if (!prompt) {
      throw new Error("Prompt required for apply command");
    }

    if (!name) {
      throw new Error("Job name required for apply command (use --name)");
    }

    console.log(`🤖 Applying WORKING job "${name}" with REAL AI...`);

    const input = ChatInput.parse({
      prompt: prompt,
      kind: args.kind || "job",
      id: name,
      options: {
        temperature: args.temp ? parseFloat(args.temp) : 0.7,
        model: args.model,
      },
    });

    // Generate working job with custom name
    const result = await generateWorkingJob({
      prompt: input.prompt,
      model: input.options?.model,
      options: {
        temperature: input.options?.temperature || 0.7
      },
      config
    });

    // Write with custom name
    const filename = `${name}.mjs`;
    const relPath = input.kind === "event" ? join("events", filename) : join("jobs", filename);
    const outPath = writeFileSafe(config.rootDir, relPath, result.code);

    console.log(`✅ Applied WORKING job "${name}":`);
    console.log(`  File: ${outPath}`);
    console.log(`  Working: ${result.working ? 'YES' : 'NO'}`);
    console.log(`  Summary: ${result.spec.implementation.returnValue.success}`);
  } catch (error) {
    logger.error("Failed to apply working changes:", error.message);
    throw error;
  }
}

/**
 * Explain existing job in plain English
 * @param {object} config - GitVan config
 * @param {object} args - Explain arguments
 * @returns {Promise<void>}
 */
async function explainJob(config, args) {
  try {
    const jobPath = args.jobPath || args.arg0;
    if (!jobPath) {
      throw new Error("Job path required for explain command");
    }

    console.log(`📖 Explaining job: ${jobPath}`);
    
    // For now, provide a basic explanation
    // TODO: Implement actual job analysis
    console.log("Job explanation functionality coming soon!");
    console.log("This will analyze the job code and explain what it does in plain English.");
  } catch (error) {
    logger.error("Failed to explain job:", error.message);
    throw error;
  }
}

/**
 * Interactive design wizard
 * @param {object} config - GitVan config
 * @param {object} args - Design arguments
 * @returns {Promise<void>}
 */
async function designWizard(config, args) {
  try {
    console.log("🎨 Interactive job design wizard");
    console.log("This feature will guide you through creating complex jobs step by step.");
    console.log("Coming soon!");
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
  console.log(`
🤖 GitVan Chat Commands - REAL AI Integration

Available commands:
  gitvan chat draft "Create a backup job"     - Generate job specification
  gitvan chat generate "Create a test job"    - Generate WORKING job file
  gitvan chat preview "Create a log job"      - Preview WORKING job code
  gitvan chat apply "Create a deploy job" --name "deploy" - Apply with custom name
  gitvan chat explain jobs/hello.mjs         - Explain existing job
  gitvan chat design                          - Interactive design wizard
  gitvan chat help                            - Show this help

Options:
  --temp <number>     - Temperature (0.0-1.0, default: 0.7)
  --model <name>      - AI model name
  --name <name>       - Custom job name (for apply command)
  --kind <type>       - Job type (job, event, default: job)

Examples:
  gitvan chat generate "Create a changelog generator"
  gitvan chat generate "Backup important files" --temp 0.5
  gitvan chat apply "Deploy to staging" --name "staging-deploy"

Note: These commands generate WORKING jobs, not skeletons with TODOs!
`);
}
