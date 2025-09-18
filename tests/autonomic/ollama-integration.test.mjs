import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { join } from "pathe";
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";

// Mock Ollama and external AI providers
vi.mock("ollama", () => ({
  default: {
    generate: vi.fn().mockResolvedValue({
      response: "feat: add new feature with AI-generated commit message",
    }),
  },
}));

vi.mock("@anthropic-ai/sdk", () => ({
  Anthropic: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ text: "feat: add new feature with Anthropic AI" }],
      }),
    },
  })),
}));

describe("Ollama-First AI Integration - Security", () => {
  let testDir;
  let originalCwd;
  let originalEnv;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "gitvan-ollama-test-"));
    originalCwd = process.cwd();
    originalEnv = { ...process.env };
    process.chdir(testDir);

    // Initialize git repository
    execSync("git init", { cwd: testDir });
    execSync('git config user.name "Test User"', { cwd: testDir });
    execSync('git config user.email "test@example.com"', { cwd: testDir });

    vi.clearAllMocks();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    process.env = originalEnv;
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("AI Provider Selection", () => {
    it("should prefer Ollama when available", async () => {
      // Mock Ollama as available
      const ollama = await import("ollama");
      ollama.default.generate.mockResolvedValue({
        response: "feat: test commit message from Ollama",
      });

      const { generateCommitMessage } = await import("../../src/cli/save.mjs");

      const message = await generateCommitMessage(["test.js"], testDir);

      expect(ollama.default.generate).toHaveBeenCalled();
      expect(message).toContain("test commit message from Ollama");
    });

    it("should fallback to external AI when Ollama fails", async () => {
      // Mock Ollama failure
      const ollama = await import("ollama");
      ollama.default.generate.mockRejectedValue(
        new Error("Ollama not available")
      );

      // Mock Anthropic as fallback
      const anthropic = await import("@anthropic-ai/sdk");
      const mockAnthropic = {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ text: "feat: fallback commit message from Anthropic" }],
          }),
        },
      };
      anthropic.Anthropic.mockImplementation(() => mockAnthropic);

      // Set API key for fallback
      process.env.ANTHROPIC_API_KEY = "test-key";

      const { generateCommitMessage } = await import("../../src/cli/save.mjs");

      const message = await generateCommitMessage(["test.js"], testDir);

      expect(ollama.default.generate).toHaveBeenCalled();
      expect(mockAnthropic.messages.create).toHaveBeenCalled();
      expect(message).toContain("fallback commit message from Anthropic");
    });

    it("should not use external AI without API key", async () => {
      // Mock Ollama failure
      const ollama = await import("ollama");
      ollama.default.generate.mockRejectedValue(
        new Error("Ollama not available")
      );

      // No API key set
      delete process.env.ANTHROPIC_API_KEY;

      const { generateCommitMessage } = await import("../../src/cli/save.mjs");

      const message = await generateCommitMessage(["test.js"], testDir);

      // Should return default message when no AI is available
      expect(message).toBe("feat: update files");
    });
  });

  describe("Security Features", () => {
    it("should process AI requests locally with Ollama", async () => {
      const ollama = await import("ollama");
      ollama.default.generate.mockResolvedValue({
        response: "feat: secure local processing",
      });

      const { generateCommitMessage } = await import("../../src/cli/save.mjs");

      const message = await generateCommitMessage(["src/index.js"], testDir);

      // Verify Ollama was called with local processing
      expect(ollama.default.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "qwen3-coder:30b",
          prompt: expect.stringContaining("src/index.js"),
        })
      );

      expect(message).toContain("secure local processing");
    });

    it("should not send data to external services by default", async () => {
      const ollama = await import("ollama");
      ollama.default.generate.mockResolvedValue({
        response: "feat: local processing only",
      });

      // Ensure no external API keys
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const { generateCommitMessage } = await import("../../src/cli/save.mjs");

      const message = await generateCommitMessage(
        ["sensitive-data.js"],
        testDir
      );

      // Should only use Ollama (local)
      expect(ollama.default.generate).toHaveBeenCalled();
      expect(message).toContain("local processing only");
    });

    it("should handle timeout for AI requests", async () => {
      const ollama = await import("ollama");
      ollama.default.generate.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000)) // 10 second delay
      );

      const { generateCommitMessage } = await import("../../src/cli/save.mjs");

      const startTime = Date.now();
      const message = await generateCommitMessage(["test.js"], testDir);
      const duration = Date.now() - startTime;

      // Should timeout and return default message
      expect(duration).toBeLessThan(5000); // Should timeout before 10 seconds
      expect(message).toBe("feat: update files");
    });
  });

  describe("Configuration", () => {
    it("should use configured Ollama model", async () => {
      const ollama = await import("ollama");
      ollama.default.generate.mockResolvedValue({
        response: "feat: using configured model",
      });

      // Create gitvan config with custom model
      writeFileSync(
        join(testDir, "gitvan.config.js"),
        `
        export default {
          ai: {
            provider: 'ollama',
            model: 'custom-model:latest',
            endpoint: 'http://localhost:11434'
          }
        };
      `
      );

      const { generateCommitMessage } = await import("../../src/cli/save.mjs");

      await generateCommitMessage(["test.js"], testDir);

      expect(ollama.default.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "custom-model:latest",
        })
      );
    });

    it("should use default Ollama configuration when no config", async () => {
      const ollama = await import("ollama");
      ollama.default.generate.mockResolvedValue({
        response: "feat: using default config",
      });

      const { generateCommitMessage } = await import("../../src/cli/save.mjs");

      await generateCommitMessage(["test.js"], testDir);

      expect(ollama.default.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "qwen3-coder:30b",
          endpoint: "http://localhost:11434",
        })
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle Ollama connection errors gracefully", async () => {
      const ollama = await import("ollama");
      ollama.default.generate.mockRejectedValue(
        new Error("Connection refused")
      );

      const { generateCommitMessage } = await import("../../src/cli/save.mjs");

      const message = await generateCommitMessage(["test.js"], testDir);

      // Should return default message on connection error
      expect(message).toBe("feat: update files");
    });

    it("should handle invalid AI responses gracefully", async () => {
      const ollama = await import("ollama");
      ollama.default.generate.mockResolvedValue({
        response: null, // Invalid response
      });

      const { generateCommitMessage } = await import("../../src/cli/save.mjs");

      const message = await generateCommitMessage(["test.js"], testDir);

      // Should return default message on invalid response
      expect(message).toBe("feat: update files");
    });

    it("should handle empty AI responses gracefully", async () => {
      const ollama = await import("ollama");
      ollama.default.generate.mockResolvedValue({
        response: "", // Empty response
      });

      const { generateCommitMessage } = await import("../../src/cli/save.mjs");

      const message = await generateCommitMessage(["test.js"], testDir);

      // Should return default message on empty response
      expect(message).toBe("feat: update files");
    });
  });

  describe("Performance", () => {
    it("should complete AI requests quickly", async () => {
      const ollama = await import("ollama");
      ollama.default.generate.mockResolvedValue({
        response: "feat: fast response",
      });

      const { generateCommitMessage } = await import("../../src/cli/save.mjs");

      const startTime = Date.now();
      const message = await generateCommitMessage(["test.js"], testDir);
      const duration = Date.now() - startTime;

      // Should complete quickly
      expect(duration).toBeLessThan(2000);
      expect(message).toContain("fast response");
    });

    it("should not block on slow AI responses", async () => {
      const ollama = await import("ollama");
      ollama.default.generate.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ response: "slow response" }), 5000)
          )
      );

      const { generateCommitMessage } = await import("../../src/cli/save.mjs");

      const startTime = Date.now();
      const message = await generateCommitMessage(["test.js"], testDir);
      const duration = Date.now() - startTime;

      // Should timeout before 5 seconds
      expect(duration).toBeLessThan(3000);
      expect(message).toBe("feat: update files");
    });
  });
});
