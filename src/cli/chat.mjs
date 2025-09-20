/**
 * GitVan Chat Command - Citty Implementation
 * Proper Citty-based implementation of the chat CLI
 */

import { defineCommand } from "citty";
import { loadOptions } from "../config/loader.mjs";
import { createLogger } from "../utils/logger.mjs";

// Import subcommand modules
import { draftCommand } from "./chat/draft.mjs";
import { generateCommand } from "./chat/generate.mjs";
import { previewCommand } from "./chat/preview.mjs";
import { applyCommand } from "./chat/apply.mjs";
import { explainCommand } from "./chat/explain.mjs";
import { designCommand } from "./chat/design.mjs";
import { helpCommand } from "./chat/help.mjs";

// Import AI template loop commands
import { generateTemplateCommand } from "./ai-template-loop.mjs";
import { optimizeTemplateCommand } from "./ai-template-loop.mjs";
import { collectFeedbackCommand } from "./ai-template-loop.mjs";
import { getInsightsCommand } from "./ai-template-loop.mjs";
import { getSystemMetricsCommand } from "./ai-template-loop.mjs";
import { persistLearningDataCommand } from "./ai-template-loop.mjs";
import { showHistoryCommand } from "./ai-template-loop.mjs";
import { clearHistoryCommand } from "./ai-template-loop.mjs";

const logger = createLogger("chat-cli");

/**
 * Chat command with subcommands
 */
export const chatCommand = defineCommand({
  meta: {
    name: "chat",
    description: "AI-powered chat interface for job generation",
  },
  args: {
    prompt: {
      type: "string",
      description: "Natural language prompt for job generation",
    },
    temp: {
      type: "number",
      description: "Temperature (0.0-1.0, default: 0.7)",
      default: 0.7,
    },
    model: {
      type: "string",
      description: "AI model name (from gitvan.config.js)",
    },
    name: {
      type: "string",
      description: "Custom job name (for apply command)",
    },
    kind: {
      type: "string",
      description: "Job type (job, event, default: job)",
      default: "job",
    },
    path: {
      type: "string",
      description: "Custom output path (for generate command)",
    },
  },
  subCommands: {
    draft: defineCommand({
      meta: {
        name: "draft",
        description: "Generate job specification (no files)",
      },
      args: {
        prompt: {
          type: "string",
          description: "Natural language prompt",
          required: true,
        },
        temp: {
          type: "number",
          description: "Temperature (0.0-1.0)",
          default: 0.7,
        },
        model: {
          type: "string",
          description: "AI model name",
        },
      },
      async run({ args }) {
        const config = await loadOptions();
        return await draftCommand(config, args);
      },
    }),
    generate: defineCommand({
      meta: {
        name: "generate",
        description: "Generate WORKING job file",
      },
      args: {
        prompt: {
          type: "string",
          description: "Natural language prompt",
          required: true,
        },
        temp: {
          type: "number",
          description: "Temperature (0.0-1.0)",
          default: 0.7,
        },
        model: {
          type: "string",
          description: "AI model name",
        },
        path: {
          type: "string",
          description: "Custom output path",
        },
      },
      async run({ args }) {
        const config = await loadOptions();
        return await generateCommand(config, args);
      },
    }),
    preview: defineCommand({
      meta: {
        name: "preview",
        description: "Preview WORKING job code",
      },
      args: {
        prompt: {
          type: "string",
          description: "Natural language prompt",
          required: true,
        },
        temp: {
          type: "number",
          description: "Temperature (0.0-1.0)",
          default: 0.7,
        },
        model: {
          type: "string",
          description: "AI model name",
        },
      },
      async run({ args }) {
        const config = await loadOptions();
        return await previewCommand(config, args);
      },
    }),
    apply: defineCommand({
      meta: {
        name: "apply",
        description: "Apply with custom name",
      },
      args: {
        prompt: {
          type: "string",
          description: "Natural language prompt",
          required: true,
        },
        name: {
          type: "string",
          description: "Custom job name",
          required: true,
        },
        temp: {
          type: "number",
          description: "Temperature (0.0-1.0)",
          default: 0.7,
        },
        model: {
          type: "string",
          description: "AI model name",
        },
      },
      async run({ args }) {
        const config = await loadOptions();
        return await applyCommand(config, args);
      },
    }),
    explain: defineCommand({
      meta: {
        name: "explain",
        description: "Explain existing job in plain English",
      },
      args: {
        job: {
          type: "string",
          description: "Job file path or name",
          required: true,
        },
      },
      async run({ args }) {
        const config = await loadOptions();
        return await explainCommand(config, args);
      },
    }),
    design: defineCommand({
      meta: {
        name: "design",
        description: "Interactive design wizard",
      },
      args: {
        prompt: {
          type: "string",
          description: "Natural language prompt",
          required: true,
        },
      },
      async run({ args }) {
        const config = await loadOptions();
        return await designCommand(config, args);
      },
    }),
    help: defineCommand({
      meta: {
        name: "help",
        description: "Show chat help",
      },
      async run() {
        return await helpCommand();
      },
    }),
  },
  async run({ args }) {
    // If no subcommand provided, show help
    return await helpCommand();
  },
});
