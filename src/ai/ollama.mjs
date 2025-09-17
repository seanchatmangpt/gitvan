/**
 * GitVan v2 Ollama AI Provider - Direct Ollama HTTP client
 * Provides integration with Ollama API for AI-powered job generation
 */

const BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

/**
 * Generate text using Ollama API
 * @param {object} options - Generation options
 * @param {string} options.model - Model name (default: qwen3-coder:30b)
 * @param {string} options.prompt - Input prompt
 * @param {object} options.options - Ollama options
 * @param {boolean} options.stream - Whether to stream response
 * @returns {Promise<string>} Generated text
 */
export async function generate({
  model = "qwen3-coder:30b",
  prompt,
  options = {},
  stream = false,
}) {
  const requestBody = {
    model,
    prompt,
    stream,
    options: {
      temperature: 0.7,
      top_p: 0.8,
      top_k: 20,
      repeat_penalty: 1.05,
      ...options,
    },
  };

  try {
    const response = await fetch(`${BASE_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(
        `Ollama API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data.response || "";
  } catch (error) {
    throw new Error(`Failed to generate text with Ollama: ${error.message}`);
  }
}

/**
 * Generate embeddings using Ollama API
 * @param {object} options - Embedding options
 * @param {string} options.model - Model name
 * @param {string} options.text - Text to embed
 * @returns {Promise<Array<number>>} Embedding vector
 */
export async function embed({ model = "qwen3-coder:30b", text }) {
  try {
    const response = await fetch(`${BASE_URL}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt: text }),
    });

    if (!response.ok) {
      throw new Error(`Ollama embeddings error: ${response.status}`);
    }

    const data = await response.json();
    return data.embedding || [];
  } catch (error) {
    throw new Error(`Failed to generate embeddings: ${error.message}`);
  }
}

/**
 * Check if Ollama is available and model is loaded
 * @param {string} model - Model name to check
 * @returns {Promise<boolean>} True if model is available
 */
export async function checkModel(model = "qwen3-coder:30b") {
  try {
    const response = await fetch(`${BASE_URL}/api/tags`);
    if (!response.ok) return false;

    const data = await response.json();
    return data.models?.some((m) => m.name === model) || false;
  } catch {
    return false;
  }
}

/**
 * Pull/download a model from Ollama
 * @param {string} model - Model name to pull
 * @returns {Promise<void>}
 */
export async function pullModel(model = "qwen3-coder:30b") {
  try {
    const response = await fetch(`${BASE_URL}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: model, stream: false }),
    });

    if (!response.ok) {
      throw new Error(`Failed to pull model: ${response.status}`);
    }
  } catch (error) {
    throw new Error(`Failed to pull model ${model}: ${error.message}`);
  }
}
