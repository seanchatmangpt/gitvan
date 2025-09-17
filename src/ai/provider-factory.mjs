/**
 * GitVan AI Provider Factory
 * Creates AI providers based on gitvan.config.js configuration
 * Uses official AI SDK testing utilities for deterministic testing
 */

import { createLogger } from "../utils/logger.mjs";
import { MockLanguageModelV2 } from "ai/test";
import { GITVAN_COMPLETE_CONTEXT } from "./prompts/gitvan-complete-context.mjs";

const logger = createLogger("ai-provider-factory");

/**
 * Create AI provider based on configuration
 * @param {object} config - GitVan configuration
 * @returns {object} AI provider instance
 */
export function createAIProvider(config = {}) {
  const aiConfig = config.ai || {};
  const provider = aiConfig.provider || "ollama";

  logger.info(`Creating AI provider: ${provider}`);

  switch (provider.toLowerCase()) {
    case "ollama":
      return createOllamaProvider(aiConfig);

    case "openai":
      return createOpenAIProvider(aiConfig);

    case "anthropic":
      return createAnthropicProvider(aiConfig);

    case "mock":
    case "test":
      return createMockProvider(aiConfig);

    default:
      logger.warn(`Unknown provider: ${provider}, falling back to mock`);
      return createMockProvider(aiConfig);
  }
}

/**
 * Create Ollama provider
 * @param {object} aiConfig - AI configuration
 * @returns {object} Ollama provider
 */
function createOllamaProvider(aiConfig) {
  const { Ollama } = require("ollama-ai-provider-v2");

  const provider = new Ollama({
    model: aiConfig.model || "qwen3-coder:30b",
    baseURL: aiConfig.baseURL || "http://localhost:11434",
    temperature: aiConfig.temperature || 0.7,
    ...aiConfig.options,
  });

  logger.info(
    `Ollama provider created with model: ${aiConfig.model || "qwen3-coder:30b"}`
  );
  return provider;
}

/**
 * Create OpenAI provider
 * @param {object} aiConfig - AI configuration
 * @returns {object} OpenAI provider
 */
function createOpenAIProvider(aiConfig) {
  const { openai } = require("ai/openai");

  const provider = openai({
    apiKey: aiConfig.apiKey || process.env.OPENAI_API_KEY,
    model: aiConfig.model || "gpt-4",
    temperature: aiConfig.temperature || 0.7,
    ...aiConfig.options,
  });

  logger.info(
    `OpenAI provider created with model: ${aiConfig.model || "gpt-4"}`
  );
  return provider;
}

/**
 * Create Anthropic provider
 * @param {object} aiConfig - AI configuration
 * @returns {object} Anthropic provider
 */
function createAnthropicProvider(aiConfig) {
  const { anthropic } = require("ai/anthropic");

  const provider = anthropic({
    apiKey: aiConfig.apiKey || process.env.ANTHROPIC_API_KEY,
    model: aiConfig.model || "claude-3-sonnet-20240229",
    temperature: aiConfig.temperature || 0.7,
    ...aiConfig.options,
  });

  logger.info(
    `Anthropic provider created with model: ${
      aiConfig.model || "claude-3-sonnet-20240229"
    }`
  );
  return provider;
}

/**
 * Create mock provider for testing using official AI SDK utilities
 * @param {object} aiConfig - AI configuration
 * @returns {object} Mock provider using MockLanguageModelV2
 */
function createMockProvider(aiConfig) {
  return new MockLanguageModelV2({
    doGenerate: async ({ prompt }) => {
      logger.info("Mock provider generating text with GitVan context");

      // Extract text from prompt object
      const promptText =
        typeof prompt === "string"
          ? prompt
          : prompt.text || JSON.stringify(prompt);
      const lowerPrompt = promptText.toLowerCase();

      if (lowerPrompt.includes("changelog")) {
        return {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: "text",
              text: JSON.stringify({
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
                      description:
                        "Log changelog generation using notes.write()",
                    },
                  ],
                  returnValue: {
                    success:
                      "Changelog generated successfully with GitVan composables",
                    artifacts: ["CHANGELOG.md"],
                  },
                },
              }),
            },
          ],
          warnings: [],
        };
      }

      if (lowerPrompt.includes("backup")) {
        return {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: "text",
              text: JSON.stringify({
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
                      description:
                        "Create backup directory using git.writeFile()",
                    },
                    {
                      type: "git-note",
                      description: "Log backup completion using notes.write()",
                    },
                    {
                      type: "file-copy",
                      description:
                        "Copy files to backup using git.readFile() and git.writeFile()",
                    },
                  ],
                  returnValue: {
                    success:
                      "Backup completed successfully with GitVan composables",
                    artifacts: ["backup/"],
                  },
                },
              }),
            },
          ],
          warnings: [],
        };
      }

      // Default mock response - return JSON spec for generateJobSpec
      return {
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 30, totalTokens: 40 },
        content: [
          {
            type: "text",
            text: JSON.stringify({
              meta: {
                desc: `Generated job for: ${promptText.substring(0, 50)}...`,
                tags: ["ai-generated", "automation"],
                author: "GitVan AI",
                version: "1.0.0",
              },
              implementation: {
                operations: [{ type: "log", description: "Execute task" }],
                returnValue: {
                  success: "Task completed successfully",
                  artifacts: ["output.txt"],
                },
              },
            }),
          },
        ],
        warnings: [],
      };
    },
  });
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
