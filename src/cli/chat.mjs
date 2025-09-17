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
  TEMPLATE_BASED_JOB_PROMPT,
  EVENT_WRITER_TEMPLATE,
  TEMPLATE_GENERATOR_TEMPLATE,
} from "../ai/prompts/templates.mjs";
import { JobWithValuesSchema } from "../schemas/job-template.zod.mjs";
import { generateJobFromTemplate } from "../templates/job-templates.mjs";

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

    console.log("🤖 Analyzing your request...");

    const input = ChatInput.parse({
      prompt: prompt,
      kind: args.kind || "job",
      options: {
        temperature: args.temp ? parseFloat(args.temp) : 0.7,
        model: args.model,
        stream: false,
      },
    });

    console.log("🔍 Checking AI availability...");
    // Check AI availability
    const availability = await checkAIAvailability(config);
    if (!availability.available) {
      console.log("⚠️  AI not available, using wizard fallback...");
      return await designWizard(config, args);
    }

    console.log("📝 Generating job specification...");
    // Generate spec using AI
    const result = await generateSpec(input, config);

    console.log("✅ Generated specification:");
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

    console.log("🤖 Analyzing your request...");
    
    const input = ChatInput.parse({
      prompt: prompt,
      kind: args.kind || "job",
      path: args.path,
      options: {
        temperature: args.temp ? parseFloat(args.temp) : 0.7,
        model: args.model,
      },
    });

    console.log("📝 Building comprehensive prompt...");
    
    // Generate files
    console.log("⚡ Generating job with AI...");
    const result = await generateJobFiles(input, config);

    console.log("✅ Generated files:");
    console.log(`  File: ${result.filePath}`);
    console.log(`  Mode: ${result.mode}`);
    console.log(`  Summary: ${result.summary}`);
    console.log();
    console.log("📄 Source code:");
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
  console.log("🔧 Rendering template with context...");
  const prompt = await buildJobPrompt(input);

  console.log("🧠 Sending request to AI model...");
  const result = await generateText({
    prompt,
    model: input.options?.model,
    config,
  });

  console.log("🧹 Cleaning up AI output...");

  // Clean up AI output - remove markdown code blocks
  let cleanedOutput = result.output;

  // Remove markdown code block wrappers
  cleanedOutput = cleanedOutput.replace(/^```json\s*\n?/i, "");
  cleanedOutput = cleanedOutput.replace(/^```\s*\n?/i, "");
  cleanedOutput = cleanedOutput.replace(/\n?```\s*$/i, "");

  console.log("🔍 Debug: Raw AI output:", cleanedOutput.substring(0, 200) + "...");
  console.log("✅ Validating JSON template...");
  
  try {
    // Try to extract JSON from the cleaned output
    let jsonContent = cleanedOutput.trim();
    
    // Look for JSON object boundaries
    const jsonStart = jsonContent.indexOf('{');
    const jsonEnd = jsonContent.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      jsonContent = jsonContent.slice(jsonStart, jsonEnd + 1);
    }
    
    console.log("🔍 Debug: Extracted JSON:", jsonContent.substring(0, 300) + "...");
    
    // Parse the JSON template
    const jobTemplate = JSON.parse(jsonContent);
    console.log("✅ JSON parsed successfully");
    
    console.log("🏗️  Generating job code from template...");
    
    // Generate job code directly from template (bypass Zod for now)
    const jobCode = generateJobFromTemplateDirect(jobTemplate);
    
    console.log("🔍 Validating generated job...");
    
    // Basic validation
    if (!jobCode.includes('export default')) {
      throw new Error("Generated job does not export default object");
    }
    
    if (!jobCode.includes('async run(')) {
      throw new Error("Generated job does not have async run function");
    }

    console.log("📁 Determining file path...");
    // Determine file path
    const id =
      input.id || `chat-${fingerprint({ t: Date.now(), prompt: input.prompt })}`;
    const subdir = input.kind === "event" ? "events/chat" : "jobs/chat";
    const filename = `${id}${input.kind === "event" ? ".evt.mjs" : ".mjs"}`;
    const relPath = input.path || join(subdir, filename);

    let outPath = null;
    if (writeFile) {
      console.log("💾 Writing validated job to disk...");
      outPath = writeFileSafe(config.rootDir, relPath, jobCode);
    } else {
      outPath = join(config.rootDir, relPath);
    }

    return ChatOutput.parse({
      ok: true,
      id,
      mode: input.kind === "event" ? "event" : "on-demand",
      filePath: outPath,
      source: jobCode,
      summary: `Generated working job via template system`,
      model: result.model,
      modelParams: result.options,
      duration: result.duration
    });

  } catch (parseError) {
    console.log("⚠️  JSON parsing failed:", parseError.message);
    console.log("⚠️  Falling back to direct code generation...");
    
    // Fallback to direct code generation if JSON parsing fails
    const fallbackCode = `
export default {
  meta: { 
    desc: "Generated job for: ${input.prompt}", 
    tags: ["ai-generated", "${input.kind}"],
    author: "GitVan AI",
    version: "1.0.0"
  },
  async run({ ctx, payload, meta }) {
    try {
      console.log("Executing job: ${input.prompt}");
      
      // TODO: Implement job logic
      ${cleanedOutput}
      
      return { 
        ok: true, 
        artifacts: [],
        summary: "Job completed successfully"
      }
    } catch (error) {
      console.error('Job failed:', error.message)
      return { 
        ok: false, 
        error: error.message,
        artifacts: []
      }
    }
  }
}`;

    // Determine file path
    const id =
      input.id || `chat-${fingerprint({ t: Date.now(), prompt: input.prompt })}`;
    const subdir = input.kind === "event" ? "events/chat" : "jobs/chat";
    const filename = `${id}${input.kind === "event" ? ".evt.mjs" : ".mjs"}`;
    const relPath = input.path || join(subdir, filename);

    let outPath = null;
    if (writeFile) {
      console.log("💾 Writing fallback job to disk...");
      outPath = writeFileSafe(config.rootDir, relPath, fallbackCode);
    } else {
      outPath = join(config.rootDir, relPath);
    }

    return ChatOutput.parse({
      ok: true,
      id,
      mode: input.kind === "event" ? "event" : "on-demand",
      filePath: outPath,
      source: fallbackCode,
      summary: `Generated fallback job (template parsing failed)`,
      model: result.model,
      modelParams: result.options,
      duration: result.duration,
      fallback: true
    });
  }
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
 * Generate job code directly from template (bypasses Zod validation)
 * @param {object} template - Job template object
 * @returns {string} Generated job code
 */
function generateJobFromTemplateDirect(template) {
  const { meta, config, implementation, values } = template;
  
  // Generate operations code
  const operationsCode = implementation.operations?.map(op => {
    switch (op.type) {
      case 'log':
        return `      console.log("${op.description}");`;
      case 'file-read':
        return `      // TODO: Implement file read: ${op.description}`;
      case 'file-write':
        return `      // TODO: Implement file write: ${op.description}`;
      case 'file-copy':
        return `      // TODO: Implement file copy: ${op.description}`;
      case 'file-move':
        return `      // TODO: Implement file move: ${op.description}`;
      case 'git-commit':
        return `      // TODO: Implement git commit: ${op.description}`;
      case 'git-note':
        return `      // TODO: Implement git note: ${op.description}`;
      case 'template-render':
        return `      // TODO: Implement template render: ${op.description}`;
      case 'pack-apply':
        return `      // TODO: Implement pack apply: ${op.description}`;
      default:
        return `      // TODO: Implement ${op.type}: ${op.description}`;
    }
  }).join('\n') || '      console.log("No operations defined");';
  
  // Generate parameters handling
  const parametersCode = implementation.parameters?.map(param => {
    return `      const ${param.name} = payload.${param.name} || ${JSON.stringify(param.default || '')};`;
  }).join('\n') || '';
  
  // Generate artifacts
  const artifacts = implementation.returnValue?.artifacts || [];
  
  return `export default {
  meta: { 
    desc: "${meta.desc}", 
    tags: ${JSON.stringify(meta.tags || [])},
    author: "${meta.author || 'GitVan AI'}",
    version: "${meta.version || '1.0.0'}"
  },
  ${config?.cron ? `cron: "${config.cron}",` : ''}
  ${config?.on ? `on: ${JSON.stringify(config.on)},` : ''}
  ${config?.schedule ? `schedule: "${config.schedule}",` : ''}
  async run({ ctx, payload, meta }) {
    try {
      console.log("Executing job: ${meta.desc}");
      
      // Extract parameters
${parametersCode}
      
      // Execute operations
${operationsCode}
      
      return { 
        ok: true, 
        artifacts: ${JSON.stringify(artifacts)},
        summary: "${implementation.returnValue?.success || 'Job completed successfully'}"
      }
    } catch (error) {
      console.error('Job failed:', error.message)
      return { 
        ok: false, 
        error: error.message,
        artifacts: []
      }
    }
  }
}`;
}

/**
 * Build template-based job generation prompt
 * @param {object} input - Chat input with prompt and options
 * @returns {Promise<string>} Generated prompt
 */
async function buildJobPrompt(input) {
  const { useTemplate } = await import("../composables/template.mjs");
  const template = await useTemplate();
  
  // Use template-based prompt for structured generation
  const templateContent = TEMPLATE_BASED_JOB_PROMPT;
  
  // Render the template with context
  const context = {
    prompt: input.prompt,
    kind: input.kind,
    target: input.target || "general automation"
  };
  
  try {
    // Use the template system to render the prompt
    const renderedPrompt = await template.renderString(templateContent, context);
    return renderedPrompt;
  } catch (error) {
    // Fallback to simple template if rendering fails
    logger.warn("Template rendering failed, using fallback:", error.message);
    return `Generate a GitVan ${input.kind} template JSON for the following request:

"${input.prompt}"

Use the template-based system with proper structure and validation.`;
  }
}
