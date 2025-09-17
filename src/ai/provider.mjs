/**
 * GitVan v2 AI Provider - Unified AI provider interface
 * Supports Ollama (default), HTTP providers, and future Vercel AI SDK integration
 */

import {
  generate as ollamaGenerate,
  embed as ollamaEmbed,
  checkModel,
  pullModel,
} from "./ollama.mjs";
import { createLogger } from "../utils/logger.mjs";
import { sha256Hex, fingerprint } from "../utils/crypto.mjs";

const logger = createLogger("ai");

/**
 * Generate text using configured AI provider
 * @param {object} options - Generation options
 * @param {string} options.prompt - Input prompt
 * @param {string} options.model - Model name (default: qwen3-coder:30b)
 * @param {object} options.options - Provider-specific options
 * @param {object} options.config - GitVan config
 * @returns {Promise<object>} Generation result with metadata
 */
export async function generateText({
  prompt,
  model,
  options = {},
  config = {},
}) {
  const aiConfig = config.ai || {};
  const provider = aiConfig.provider || "ollama";
  const defaultModel = aiConfig.model || "qwen3-coder:30b";
  const finalModel = model || defaultModel;

  // Default options optimized for qwen3-coder:30b
  const defaultOptions = {
    temperature: 0.7,
    top_p: 0.8,
    top_k: 20,
    repeat_penalty: 1.05,
    max_tokens: 4096,
    ...aiConfig.defaults,
    ...options,
  };

  const startTime = Date.now();

  try {
    let response;

    switch (provider) {
      case "ollama":
        response = await ollamaGenerate({
          model: finalModel,
          prompt,
          options: defaultOptions,
        });
        break;

      case "http":
        response = await generateWithHTTP({
          model: finalModel,
          prompt,
          options: defaultOptions,
          config: aiConfig.http,
        });
        break;

      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }

    const duration = Date.now() - startTime;

    return {
      output: response,
      model: finalModel,
      provider,
      options: defaultOptions,
      duration,
      promptHash: sha256Hex(prompt),
      outputHash: sha256Hex(response),
      fingerprint: fingerprint({
        model: finalModel,
        prompt: prompt,
        options: defaultOptions,
      }),
    };
  } catch (error) {
    logger.error("AI generation failed:", error.message);
    throw error;
  }
}

/**
 * Generate embeddings using configured AI provider
 * @param {object} options - Embedding options
 * @param {string} options.text - Text to embed
 * @param {string} options.model - Model name
 * @param {object} options.config - GitVan config
 * @returns {Promise<object>} Embedding result with metadata
 */
export async function generateEmbeddings({ text, model, config = {} }) {
  const aiConfig = config.ai || {};
  const provider = aiConfig.provider || "ollama";
  const defaultModel = aiConfig.model || "qwen3-coder:30b";
  const finalModel = model || defaultModel;

  const startTime = Date.now();

  try {
    let embedding;

    switch (provider) {
      case "ollama":
        embedding = await ollamaEmbed({
          model: finalModel,
          text,
        });
        break;

      case "http":
        embedding = await embedWithHTTP({
          model: finalModel,
          text,
          config: aiConfig.http,
        });
        break;

      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }

    const duration = Date.now() - startTime;

    return {
      embedding,
      model: finalModel,
      provider,
      dimensions: embedding.length,
      duration,
      textHash: sha256Hex(text),
    };
  } catch (error) {
    logger.error("AI embedding failed:", error.message);
    throw error;
  }
}

/**
 * Check if AI provider and model are available
 * @param {object} config - GitVan config
 * @returns {Promise<object>} Availability status
 */
export async function checkAIAvailability(config = {}) {
  const aiConfig = config.ai || {};
  const provider = aiConfig.provider || "ollama";
  const model = aiConfig.model || "qwen3-coder:30b";

  try {
    switch (provider) {
      case "ollama":
        const isAvailable = await checkModel(model);
        return {
          available: isAvailable,
          provider,
          model,
          message: isAvailable
            ? "Ollama model available"
            : `Model ${model} not found in Ollama`,
        };

      case "http":
        return {
          available: true,
          provider,
          model,
          message: "HTTP provider configured",
        };

      default:
        return {
          available: false,
          provider,
          model,
          message: `Unknown provider: ${provider}`,
        };
    }
  } catch (error) {
    return {
      available: false,
      provider,
      model,
      message: `Provider check failed: ${error.message}`,
    };
  }
}

/**
 * Pull/download model for Ollama provider
 * @param {string} model - Model name
 * @returns {Promise<void>}
 */
export async function ensureModel(model = "qwen3-coder:30b") {
  try {
    await pullModel(model);
    logger.info(`Model ${model} pulled successfully`);
  } catch (error) {
    logger.error(`Failed to pull model ${model}:`, error.message);
    throw error;
  }
}

// HTTP provider implementations (placeholder)
async function generateWithHTTP({ model, prompt, options, config }) {
  // Implementation for generic HTTP AI providers
  throw new Error("HTTP provider not yet implemented");
}

async function embedWithHTTP({ model, text, config }) {
  // Implementation for generic HTTP embedding providers
  throw new Error("HTTP embedding provider not yet implemented");
}
