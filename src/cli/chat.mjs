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

    case "help":
      return await helpCommand();

    default:
      throw new Error(`Unknown chat subcommand: ${subcommand}. Use 'gitvan chat help' for available commands.`);
  }
}

