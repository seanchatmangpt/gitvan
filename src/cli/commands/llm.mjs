#!/usr/bin/env node

/**
 * GitVan LLM Command - Citty Implementation
 *
 * Provides AI-powered code generation and assistance
 * Supports job generation, code completion, and context-aware help
 */

import { defineCommand } from "citty";
import { useGitVan, withGitVan } from "../../core/context.mjs";
import {
  generateText,
  generateJobSpec,
  generateWorkingJob,
  checkAIAvailability,
} from "../../ai/provider.mjs";
import { createLogger } from "../../utils/logger.mjs";
import consola from "consola";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const logger = createLogger("llm-cli");

/**
 * Generate code using AI
 */
const generateSubcommand = defineCommand({
  meta: {
    name: "generate",
    description: "Generate code using AI",
    usage: "gitvan llm generate <prompt> [options]",
    examples: [
      "gitvan llm generate 'create a job that backs up files'",
      "gitvan llm generate 'job to run tests on push' --model gpt-4",
      "gitvan llm generate 'deploy to production' --provider anthropic",
    ],
  },
  args: {
    prompt: {
      type: "positional",
      description: "Description of what to generate",
      required: true,
    },
    model: {
      type: "string",
      description: "AI model to use",
      default: "qwen3-coder:30b",
    },
    provider: {
      type: "string",
      description: "AI provider (ollama, anthropic)",
      default: "ollama",
    },
    output: {
      type: "string",
      description: "Output file path",
    },
  },
  async run({ args }) {
    try {
      await withGitVan({ cwd: process.cwd() }, async () => {
        // Build prompt from positional arguments
        const promptParts = args._;
        const prompt = promptParts.length > 0 ? promptParts.join(" ") : args.prompt;

        consola.start(`Generating code with AI...`);
        consola.info(`Prompt: ${prompt}`);
        consola.info(`Model: ${args.model}`);
        consola.info(`Provider: ${args.provider}`);

        const config = {
          provider: args.provider,
          model: args.model,
        };

        const result = await generateText({
          prompt,
          model: args.model,
          config,
        });

        consola.success("Code generated successfully!");

        logger.info("\n" + "=".repeat(80));
        logger.info("Generated Code:");
        logger.info("=".repeat(80));
        logger.info(result.output);
        logger.info("=".repeat(80));
        logger.info(`\nModel: ${result.model}`);
        logger.info(`Provider: ${result.provider}`);
        logger.info(`Duration: ${result.duration}ms\n`);

        // Save to file if output path specified
        if (args.output) {
          writeFileSync(args.output, result.output);
          consola.success(`Saved to: ${args.output}`);
        }
      });
    } catch (error) {
      logger.error("Failed to generate code:", error);
      consola.error(`Failed to generate code: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Generate a GitVan job
 */
const jobSubcommand = defineCommand({
  meta: {
    name: "job",
    description: "Generate a GitVan job using AI",
    usage: "gitvan llm job <description> [options]",
    examples: [
      "gitvan llm job 'backup files daily'",
      "gitvan llm job 'run tests on push' --save",
      "gitvan llm job 'deploy to production' --name deploy-prod",
    ],
  },
  args: {
    description: {
      type: "positional",
      description: "Job description",
      required: true,
    },
    model: {
      type: "string",
      description: "AI model to use",
      default: "qwen3-coder:30b",
    },
    provider: {
      type: "string",
      description: "AI provider (ollama, anthropic)",
      default: "ollama",
    },
    name: {
      type: "string",
      description: "Job name (auto-generated if not specified)",
    },
    save: {
      type: "boolean",
      description: "Save to jobs directory",
      default: false,
    },
  },
  async run({ args }) {
    try {
      await withGitVan({ cwd: process.cwd() }, async () => {
        // Build description from positional arguments
        const descParts = args._;
        const description =
          descParts.length > 0 ? descParts.join(" ") : args.description;

        consola.start("Generating GitVan job...");
        consola.info(`Description: ${description}`);
        consola.info(`Model: ${args.model}`);
        consola.info(`Provider: ${args.provider}`);

        const config = {
          provider: args.provider,
          model: args.model,
        };

        const result = await generateWorkingJob({
          prompt: description,
          model: args.model,
          config,
        });

        consola.success("Job generated successfully!");

        logger.info("\n" + "=".repeat(80));
        logger.info("Generated Job:");
        logger.info("=".repeat(80));
        logger.info(`Name: ${result.spec.name}`);
        logger.info(`Description: ${result.spec.desc}`);
        logger.info(`Tags: ${result.spec.tags.join(", ")}`);
        logger.info(`Author: ${result.spec.author}`);
        logger.info(`Version: ${result.spec.version}`);
        logger.info("\nCode:");
        logger.info("-".repeat(80));
        logger.info(result.code);
        logger.info("=".repeat(80));
        logger.info(`\nModel: ${result.model}`);
        logger.info(`Provider: ${result.provider}\n`);

        // Save to jobs directory if requested
        if (args.save) {
          const jobsDir = join(process.cwd(), "jobs");
          if (!existsSync(jobsDir)) {
            mkdirSync(jobsDir, { recursive: true });
          }

          const jobName = args.name || result.spec.name || "ai-generated-job";
          const jobFile = join(jobsDir, `${jobName}.mjs`);

          writeFileSync(jobFile, result.code);
          consola.success(`Job saved to: ${jobFile}`);
        }
      });
    } catch (error) {
      logger.error("Failed to generate job:", error);
      consola.error(`Failed to generate job: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Check AI provider status
 */
const statusSubcommand = defineCommand({
  meta: {
    name: "status",
    description: "Check AI provider availability",
    usage: "gitvan llm status [options]",
    examples: [
      "gitvan llm status",
      "gitvan llm status --provider ollama",
      "gitvan llm status --provider anthropic",
    ],
  },
  args: {
    provider: {
      type: "string",
      description: "AI provider to check (ollama, anthropic)",
    },
  },
  async run({ args }) {
    try {
      await withGitVan({ cwd: process.cwd() }, async () => {
        consola.start("Checking AI provider status...");

        const config = args.provider ? { provider: args.provider } : {};
        const status = await checkAIAvailability(config);

        logger.info("\n" + "=".repeat(80));
        logger.info("AI Provider Status");
        logger.info("=".repeat(80));
        logger.info(`Available: ${status.available ? "✓ Yes" : "✗ No"}`);
        logger.info(`Provider: ${status.provider}`);
        logger.info(`Model: ${status.model}`);
        if (status.message) {
          logger.info(`Message: ${status.message}`);
        }
        if (status.error) {
          logger.info(`Error: ${status.error}`);
        }
        logger.info("=".repeat(80) + "\n");

        if (!status.available) {
          consola.warn("AI provider is not available");
          if (status.provider === "ollama") {
            consola.info("Make sure Ollama is running: ollama serve");
          } else if (status.provider === "anthropic") {
            consola.info("Make sure ANTHROPIC_API_KEY is set");
          }
        } else {
          consola.success("AI provider is ready");
        }
      });
    } catch (error) {
      logger.error("Failed to check AI status:", error);
      consola.error(`Failed to check AI status: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Interactive chat mode (placeholder for future implementation)
 */
const chatSubcommand = defineCommand({
  meta: {
    name: "chat",
    description: "Start interactive chat with AI",
    usage: "gitvan llm chat [options]",
    examples: ["gitvan llm chat", "gitvan llm chat --model gpt-4"],
  },
  args: {
    model: {
      type: "string",
      description: "AI model to use",
      default: "qwen3-coder:30b",
    },
    provider: {
      type: "string",
      description: "AI provider (ollama, anthropic)",
      default: "ollama",
    },
  },
  async run({ args }) {
    try {
      consola.info("Interactive chat mode is coming soon!");
      consola.info("For now, use 'gitvan chat' for interactive AI assistance");
      consola.info("Or use 'gitvan llm generate <prompt>' for single queries");
    } catch (error) {
      logger.error("Failed to start chat:", error);
      consola.error(`Failed to start chat: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Complete code based on context
 */
const completeSubcommand = defineCommand({
  meta: {
    name: "complete",
    description: "Complete code based on context",
    usage: "gitvan llm complete <file> [options]",
    examples: [
      "gitvan llm complete src/job.mjs",
      "gitvan llm complete src/job.mjs --model gpt-4",
    ],
  },
  args: {
    file: {
      type: "positional",
      description: "File to complete",
      required: true,
    },
    model: {
      type: "string",
      description: "AI model to use",
      default: "qwen3-coder:30b",
    },
    provider: {
      type: "string",
      description: "AI provider (ollama, anthropic)",
      default: "ollama",
    },
  },
  async run({ args }) {
    try {
      consola.info("Code completion is coming soon!");
      consola.info(
        "For now, use 'gitvan llm generate <prompt>' to generate code"
      );
    } catch (error) {
      logger.error("Failed to complete code:", error);
      consola.error(`Failed to complete code: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Main LLM command with all subcommands
 */
export const llmCommand = defineCommand({
  meta: {
    name: "llm",
    description: "AI-powered code generation and assistance",
    usage: "gitvan llm <subcommand> [options]",
    examples: [
      "gitvan llm generate 'create a backup job'",
      "gitvan llm job 'run tests on push' --save",
      "gitvan llm status",
      "gitvan llm chat",
    ],
  },
  subCommands: {
    generate: generateSubcommand,
    job: jobSubcommand,
    status: statusSubcommand,
    chat: chatSubcommand,
    complete: completeSubcommand,
  },
});

export default llmCommand;
