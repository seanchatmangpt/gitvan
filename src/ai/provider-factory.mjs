/**
 * GitVan AI Provider Factory
 * Creates AI providers based on gitvan.config.js configuration
 * Uses official AI SDK testing utilities for deterministic testing
 */

import { createLogger } from "../utils/logger.mjs";
import { GITVAN_COMPLETE_CONTEXT } from "./prompts/gitvan-complete-context.mjs";
import { customProvider } from "ai";

const logger = createLogger("ai-provider-factory");

/**
 * Create AI provider based on configuration
 * @param {object} config - GitVan configuration
 * @returns {object} AI provider instance
 */
export async function createAIProvider(config = {}) {
  const aiConfig = config.ai || {};
  const provider = aiConfig.provider || "ollama";

  logger.info(`Creating AI provider: ${provider}`);

  switch (provider.toLowerCase()) {
    case "ollama":
      return await createOllamaProvider(aiConfig);

    case "openai":
      return await createOpenAIProvider(aiConfig);

    case "anthropic":
      return await createAnthropicProvider(aiConfig);

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
async function createOllamaProvider(aiConfig) {
  try {
    const { Ollama } = await import("ollama-ai-provider-v2");

    const provider = new Ollama({
      model: aiConfig.model || "qwen3-coder:30b",
      baseURL: aiConfig.baseURL || "http://localhost:11434",
      temperature: aiConfig.temperature || 0.7,
      ...aiConfig.options,
    });

    logger.info(
      `Ollama provider created with model: ${
        aiConfig.model || "qwen3-coder:30b"
      }`
    );
    return provider;
  } catch (error) {
    logger.warn(
      `Failed to create Ollama provider: ${error.message}, falling back to mock`
    );
    return createMockProvider(aiConfig);
  }
}

/**
 * Create OpenAI provider
 * @param {object} aiConfig - AI configuration
 * @returns {object} OpenAI provider
 */
async function createOpenAIProvider(aiConfig) {
  const { openai } = await import("ai/openai");

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
async function createAnthropicProvider(aiConfig) {
  const { anthropic } = await import("ai/anthropic");

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
 * Create mock provider for testing without vitest dependencies
 * @param {object} aiConfig - AI configuration
 * @returns {object} Mock provider
 */
function createMockProvider(aiConfig) {
  const mockProvider = customProvider({
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
        responseText = JSON.stringify({
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
        });
      }

      return {
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 30, totalTokens: 40 },
        text: responseText,
        warnings: [],
      };
    },
  });

  // Add the properties we need for detection
  mockProvider.provider = "mock";
  mockProvider.model = aiConfig.model || "mock-model";
  mockProvider.doGenerate = mockProvider.doGenerate;

  return mockProvider;
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
