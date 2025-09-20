/**
 * GitVan Save Command - AI-powered commit with automatic job execution
 * Replaces git add . && git commit with intelligent commit message generation
 */

import { defineCommand } from "citty";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "pathe";
import consola from "consola";

export const saveCommand = defineCommand({
  meta: {
    name: "save",
    description:
      "Save changes with AI-generated commit message and automatic job execution",
  },
  args: {
    message: {
      type: "string",
      description: "Optional custom commit message (overrides AI generation)",
      optional: true,
    },
    "no-ai": {
      type: "boolean",
      description: "Skip AI commit message generation",
      default: false,
    },
  },
  async run({ args }) {
    const worktreePath = process.cwd();

    // Check if we're in a Git repository
    if (!existsSync(join(worktreePath, ".git"))) {
      consola.error("Not in a Git repository. Run gitvan init first.");
      process.exit(1);
    }

    // Check if GitVan is initialized
    if (!existsSync(join(worktreePath, ".gitvan"))) {
      consola.error("GitVan not initialized. Run gitvan init first.");
      process.exit(1);
    }

    try {
      // Check for changes
      const statusOutput = execSync("git status --porcelain", {
        cwd: worktreePath,
        encoding: "utf8",
      });

      if (!statusOutput.trim()) {
        consola.info("No changes to save.");
        return;
      }

      // Stage all changes
      consola.start("Staging changes...");
      execSync("git add .", { cwd: worktreePath });
      consola.success("Changes staged");

      // Generate commit message
      let commitMessage = args.message;

      if (!commitMessage && !args["no-ai"]) {
        consola.start("Generating AI commit message...");
        commitMessage = await generateCommitMessage([], worktreePath);
        consola.success(`AI generated: "${commitMessage}"`);
      } else if (!commitMessage) {
        commitMessage = generateContextualMessage(statusOutput);
      }

      // Commit changes
      consola.start("Committing changes...");
      execSync(`git commit -m "${commitMessage}"`, {
        cwd: worktreePath,
        stdio: "inherit",
      });
      consola.success("Changes committed");

      // Note: GitVan jobs run automatically via daemon and hooks
      consola.success("✅ Save completed successfully!");
    } catch (error) {
      consola.error("Failed to save changes:", error.message);
      process.exit(1);
    }
  },
});

/**
 * Generate AI commit message using Vercel AI or Ollama
 */
export async function generateCommitMessage(filePaths, worktreePath) {
  let statusOutput = "";

  try {
    // Get git diff for context
    const diffOutput = execSync("git diff --cached", {
      cwd: worktreePath,
      encoding: "utf8",
    });

    // Get git status for file changes
    statusOutput = execSync("git status --porcelain", {
      cwd: worktreePath,
      encoding: "utf8",
    });

    // Always try Ollama first (local, secure, no API keys needed)
    if (await isOllamaAvailable()) {
      return await generateWithOllama(diffOutput, statusOutput);
    }

    // Only fallback to external AI if explicitly configured
    if (process.env.ANTHROPIC_API_KEY) {
      consola.info("Ollama not available, trying external AI...");
      return await generateWithVercelAI(diffOutput, statusOutput);
    }

    // No AI available, use heuristic fallback
    consola.info("No AI available, using contextual commit message");
    return generateContextualMessage(statusOutput);
  } catch (error) {
    consola.warn("AI generation failed, using fallback:", error.message);
    return generateContextualMessage(statusOutput);
  }
}

/**
 * Generate commit message using Vercel AI
 */
async function generateWithVercelAI(diffOutput, statusOutput) {
  const { generateText } = await import("ai");
  const { createAnthropic } = await import("@ai-sdk/anthropic");

  const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const prompt = `Generate a concise, conventional commit message for these changes:

Files changed:
${statusOutput}

Diff:
${diffOutput.slice(0, 2000)}...

Format: type(scope): description
Examples: feat: add user authentication, fix: resolve login bug, docs: update README`;

  const result = await generateText({
    model: anthropic("qwen3-coder:30b"),
    prompt,
    maxTokens: 100,
  });

  return result.text.trim();
}

/**
 * Generate commit message using Ollama
 */
async function generateWithOllama(diffOutput, statusOutput) {
  const { default: ollama } = await import("ollama");

  const prompt = `Generate a concise, conventional commit message for these changes:

Files changed:
${statusOutput}

Diff:
${diffOutput.slice(0, 2000)}...

Format: type(scope): description
Examples: feat: add user authentication, fix: resolve login bug, docs: update README

Response:`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await ollama.generate({
      model: "qwen3-coder:30b",
      prompt,
      stream: false,
    });

    clearTimeout(timeoutId);
    const trimmedResponse = response.response.trim();
    if (!trimmedResponse) {
      throw new Error("Empty response from Ollama");
    }
    return trimmedResponse;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Check if Ollama is available
 */
async function isOllamaAvailable() {
  try {
    const { default: ollama } = await import("ollama");
    await ollama.list();
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate contextual commit message based on file changes
 */
function generateContextualMessage(statusOutput) {
  const lines = statusOutput
    .trim()
    .split("\n")
    .filter((line) => line.trim());

  // Handle empty status
  if (lines.length === 0) {
    return "chore: save changes";
  }

  const addedFiles = lines.filter((line) => line.startsWith("A")).length;
  const modifiedFiles = lines.filter((line) => line.startsWith("M")).length;
  const deletedFiles = lines.filter((line) => line.startsWith("D")).length;
  const renamedFiles = lines.filter((line) => line.startsWith("R")).length;

  // Analyze file types for more specific messages
  const fileTypes = new Set();
  const importantFiles = [];

  lines.forEach((line) => {
    const filePath = line.substring(3); // Remove status prefix
    const extension = filePath.split(".").pop()?.toLowerCase();

    if (extension) {
      fileTypes.add(extension);
    }

    // Track important files for context
    if (
      filePath.includes("package.json") ||
      filePath.includes("README") ||
      filePath.includes("config") ||
      filePath.includes("test")
    ) {
      importantFiles.push(filePath);
    }
  });

  // Generate contextual messages based on changes
  if (addedFiles > 0 && modifiedFiles === 0 && deletedFiles === 0) {
    if (fileTypes.has("test") || fileTypes.has("spec")) {
      return "test: add test files";
    } else if (fileTypes.has("md") || fileTypes.has("txt")) {
      return "docs: add documentation";
    } else if (
      fileTypes.has("json") &&
      importantFiles.some((f) => f.includes("package"))
    ) {
      return "deps: add new dependencies";
    } else {
      return `feat: add ${addedFiles} new file${addedFiles > 1 ? "s" : ""}`;
    }
  } else if (modifiedFiles > 0 && addedFiles === 0 && deletedFiles === 0) {
    if (fileTypes.has("test") || fileTypes.has("spec")) {
      return "test: update test files";
    } else if (fileTypes.has("md") || fileTypes.has("txt")) {
      return "docs: update documentation";
    } else if (
      fileTypes.has("json") &&
      importantFiles.some((f) => f.includes("package"))
    ) {
      return "deps: update dependencies";
    } else if (
      fileTypes.has("js") ||
      fileTypes.has("ts") ||
      fileTypes.has("mjs")
    ) {
      return "refactor: update source code";
    } else {
      return `fix: update ${modifiedFiles} file${modifiedFiles > 1 ? "s" : ""}`;
    }
  } else if (deletedFiles > 0) {
    return `refactor: remove ${deletedFiles} file${
      deletedFiles > 1 ? "s" : ""
    }`;
  } else if (renamedFiles > 0) {
    return `refactor: rename ${renamedFiles} file${
      renamedFiles > 1 ? "s" : ""
    }`;
  } else {
    // Mixed changes - provide a more descriptive message
    const totalChanges =
      addedFiles + modifiedFiles + deletedFiles + renamedFiles;
    return `chore: update ${totalChanges} file${
      totalChanges > 1 ? "s" : ""
    } (${addedFiles}A ${modifiedFiles}M ${deletedFiles}D)`;
  }
}
