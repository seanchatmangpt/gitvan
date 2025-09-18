/**
 * GitVan v2 Chat CLI - Modular AI Integration
 * Uses separate subcommand files with context-aware prompts
 */

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
 * Chat CLI command handler with modular subcommands
 * @param {string} subcommand - Subcommand (draft, generate, preview, apply, explain, design, help)
 * @param {object} args - Command arguments
 * @returns {Promise<void>}
 */
export async function chatCommand(subcommand = "help", args = {}) {
  const config = await loadOptions();

  switch (subcommand) {
    case "draft":
      return await draftCommand(config, args);

    case "generate":
      return await generateCommand(config, args);

    case "preview":
      return await previewCommand(config, args);

    case "apply":
      return await applyCommand(config, args);

    case "explain":
      return await explainCommand(config, args);

    case "design":
      return await designCommand(config, args);

    // AI Template Loop commands
    case "template":
      return await generateTemplateCommand(args);

    case "optimize":
      return await optimizeTemplateCommand(args);

    case "feedback":
      return await collectFeedbackCommand(args);

    case "insights":
      return await getInsightsCommand(args);

    case "metrics":
      return await getSystemMetricsCommand(args);

    case "persist":
      return await persistLearningDataCommand(args);

    case "history":
      return await showHistoryCommand(args);

    case "clear":
      return await clearHistoryCommand(args);

    case "help":
      return await helpCommand();

    default:
      throw new Error(`Unknown chat subcommand: ${subcommand}. Use 'gitvan chat help' for available commands.`);
  }
}

