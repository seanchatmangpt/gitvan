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
        commitMessage = await generateCommitMessage(worktreePath);
        consola.success(`AI generated: "${commitMessage}"`);
      } else if (!commitMessage) {
        commitMessage = "feat: save changes";
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
async function generateCommitMessage(worktreePath) {
  try {
    // Get git diff for context
    const diffOutput = execSync("git diff --cached", {
      cwd: worktreePath,
      encoding: "utf8",
    });

    // Get git status for file changes
    const statusOutput = execSync("git status --porcelain", {
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
    consola.info("No AI available, using heuristic commit message");
    return generateHeuristicMessage(statusOutput);
  } catch (error) {
    consola.warn("AI generation failed, using fallback:", error.message);
    return "feat: save changes";
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

  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "qwen3-coder:30b",
      prompt,
      stream: false,
    }),
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  const data = await response.json();
  return data.response.trim();
}

/**
 * Check if Ollama is available
 */
async function isOllamaAvailable() {
  try {
    const response = await fetch("http://localhost:11434/api/tags", {
      method: "GET",
      signal: AbortSignal.timeout(1000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Generate heuristic commit message
 */
function generateHeuristicMessage(statusOutput) {
  const lines = statusOutput.trim().split("\n");
  const addedFiles = lines.filter((line) => line.startsWith("A")).length;
  const modifiedFiles = lines.filter((line) => line.startsWith("M")).length;
  const deletedFiles = lines.filter((line) => line.startsWith("D")).length;

  if (addedFiles > 0 && modifiedFiles === 0 && deletedFiles === 0) {
    return "feat: add new files";
  } else if (modifiedFiles > 0 && addedFiles === 0 && deletedFiles === 0) {
    return "fix: update existing files";
  } else if (deletedFiles > 0) {
    return "refactor: remove files";
  } else {
    return "feat: save changes";
  }
}
