/**
 * GitVan AI Provider Factory
 * Creates AI providers based on gitvan.config.js configuration
 * Uses official AI SDK testing utilities for deterministic testing
 */

import { createLogger } from "../utils/logger.mjs";
import { ProviderError, ConfigurationError } from "../core/errors.mjs";
import { GITVAN_COMPLETE_CONTEXT } from "./prompts/gitvan-complete-context.mjs";

const logger = createLogger("ai-provider-factory");

/**
 * Create AI provider based on configuration
 * @param {object} config - GitVan configuration
 * @returns {object} AI provider instance
 * @throws {ConfigurationError} If provider is invalid or not configured
 * @throws {ProviderError} If provider creation fails
 */
export async function createAIProvider(config = {}) {
  const aiConfig = config.ai || {};
  const provider = aiConfig.provider || "ollama";

  // Validate environment (never use mock in production)
  const isProduction = process.env.NODE_ENV === "production";
  const isTest = process.env.NODE_ENV === "test" || process.env.VITEST;

  logger.info("Creating AI provider", {
    provider,
    environment: process.env.NODE_ENV || "development",
  });

  switch (provider.toLowerCase()) {
    case "ollama":
      return await createOllamaProvider(aiConfig);

    case "openai":
      return await createOpenAIProvider(aiConfig);

    case "anthropic":
      return await createAnthropicProvider(aiConfig);

    case "mock":
    case "test":
      // Only allow mock provider in test environment
      if (isProduction) {
        throw new ConfigurationError(
          "Mock provider is not allowed in production environment",
          "ai.provider"
        );
      }
      logger.warn("Using mock provider (test environment only)");
      return createMockProvider(aiConfig);

    default:
      throw new ConfigurationError(
        `Unknown AI provider: '${provider}'. Valid providers: ollama, openai, anthropic${isTest ? ", mock" : ""}`,
        "ai.provider"
      );
  }
}

/**
 * Create Ollama provider
 * @param {object} aiConfig - AI configuration
 * @returns {object} Ollama provider
 * @throws {ProviderError} If Ollama provider creation fails
 */
async function createOllamaProvider(aiConfig) {
  try {
    const { ollama } = await import("ollama-ai-provider-v2");

    // Use the simple ollama function with model name
    const provider = ollama(aiConfig.model || "qwen3-coder:30b");

    logger.info("Ollama provider created", {
      model: aiConfig.model || "qwen3-coder:30b",
    });

    return provider;
  } catch (error) {
    logger.error("Failed to create Ollama provider", {
      error: error.message,
      model: aiConfig.model,
    });

    throw new ProviderError("ollama", error.message, error);
  }
}

/**
 * Create OpenAI provider
 * @param {object} aiConfig - AI configuration
 * @returns {object} OpenAI provider
 * @throws {ProviderError} If OpenAI provider creation fails
 * @throws {ConfigurationError} If API key is missing
 */
async function createOpenAIProvider(aiConfig) {
  try {
    const apiKey = aiConfig.apiKey || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new ConfigurationError(
        "OpenAI API key is required. Set OPENAI_API_KEY environment variable or configure ai.apiKey",
        "ai.apiKey"
      );
    }

    const { openai } = await import("ai/openai");

    const provider = openai({
      apiKey,
      model: aiConfig.model || "gpt-4",
      temperature: aiConfig.temperature || 0.7,
      ...aiConfig.options,
    });

    logger.info("OpenAI provider created", {
      model: aiConfig.model || "gpt-4",
    });

    return provider;
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw error;
    }

    logger.error("Failed to create OpenAI provider", {
      error: error.message,
    });

    throw new ProviderError("openai", error.message, error);
  }
}

/**
 * Create Anthropic provider
 * @param {object} aiConfig - AI configuration
 * @returns {object} Anthropic provider
 * @throws {ProviderError} If Anthropic provider creation fails
 * @throws {ConfigurationError} If API key is missing
 */
async function createAnthropicProvider(aiConfig) {
  try {
    const apiKey = aiConfig.apiKey || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new ConfigurationError(
        "Anthropic API key is required. Set ANTHROPIC_API_KEY environment variable or configure ai.apiKey",
        "ai.apiKey"
      );
    }

    const { anthropic } = await import("ai/anthropic");

    const provider = anthropic({
      apiKey,
      model: aiConfig.model || "claude-3-5-sonnet-20241022",
      temperature: aiConfig.temperature || 0.7,
      ...aiConfig.options,
    });

    logger.info("Anthropic provider created", {
      model: aiConfig.model || "claude-3-5-sonnet-20241022",
    });

    return provider;
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw error;
    }

    logger.error("Failed to create Anthropic provider", {
      error: error.message,
    });

    throw new ProviderError("anthropic", error.message, error);
  }
}

/**
 * Create mock provider for testing without vitest dependencies
 * @param {object} aiConfig - AI configuration
 * @returns {object} Mock provider
 */
function createMockProvider(aiConfig) {
  logger.info("Creating simple mock provider");

  return {
    provider: "mock",
    model: aiConfig.model || "mock-model",
    specificationVersion: "v2",

    async doGenerate({ prompt }) {
      logger.info("Mock provider generating text with GitVan context");

      // Extract text from prompt object
      const promptText =
        typeof prompt === "string"
          ? prompt
          : prompt.text || JSON.stringify(prompt);
      const lowerPrompt = promptText.toLowerCase();

      let responseText;
      if (lowerPrompt.includes("changelog")) {
        responseText = JSON.stringify({
          meta: {
            desc: "Generate changelog from commits using GitVan composables",
            tags: ["documentation", "changelog"],
            author: "GitVan AI",
            version: "1.0.0",
          },
          config: {
            on: { tagCreate: "v*" },
          },
          implementation: {
            operations: [
              {
                type: "git-commit",
                description:
                  "Get commits since last tag using git.getCommitsSinceLastTag()",
              },
              {
                type: "template-render",
                description:
                  "Render changelog template using template.render()",
              },
              {
                type: "file-write",
                description: "Write CHANGELOG.md using git.writeFile()",
              },
              {
                type: "git-note",
                description: "Log changelog generation using notes.write()",
              },
            ],
            returnValue: {
              success:
                "Changelog generated successfully with GitVan composables",
              artifacts: ["CHANGELOG.md"],
            },
          },
        });
      } else if (lowerPrompt.includes("backup")) {
        responseText = JSON.stringify({
          meta: {
            desc: "Backup important files using GitVan composables",
            tags: ["backup", "automation", "file-operation"],
            author: "GitVan AI",
            version: "1.0.0",
          },
          config: {
            cron: "0 2 * * *",
          },
          implementation: {
            operations: [
              {
                type: "file-write",
                description: "Create backup directory using Node.js fs module",
              },
              {
                type: "git-note",
                description: "Log backup completion using notes.write()",
              },
              {
                type: "file-copy",
                description: "Copy files using Node.js fs readFile/writeFile",
              },
            ],
            returnValue: {
              success: "Backup completed successfully with GitVan composables",
              artifacts: ["backup/"],
            },
          },
        });
      } else {
        // For explain commands, return a simple explanation
        responseText = `This is a GitVan job that performs automated tasks. It uses GitVan composables like useGit(), useTemplate(), and useNotes() to interact with the Git repository and file system. The job follows GitVan's defineJob() pattern and includes proper error handling and artifact reporting.`;
      }

      return {
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 30, totalTokens: 40 },
        text: responseText,
        warnings: [],
      };
    },
  };
}

/**
 * Check if AI provider is available
 * @param {object} config - GitVan configuration
 * @returns {Promise<object>} Availability status
 */
export async function checkAIProviderAvailability(config = {}) {
  try {
    const provider = createAIProvider(config);

    // Test the provider with a simple request
    const testResult = await provider.generateText({
      prompt: "Test",
      maxTokens: 10,
    });

    return {
      available: true,
      provider: provider.provider || "unknown",
      model: provider.model || "unknown",
    };
  } catch (error) {
    logger.warn("AI provider not available:", error.message);
    return {
      available: false,
      error: error.message,
      provider: "none",
    };
  }
}
