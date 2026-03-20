/**
 * Tests for LLM Command
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../src/core/context.mjs", () => ({
  useGitVan: vi.fn(),
  withGitVan: vi.fn(async (ctx, fn) => fn()),
}));

vi.mock("../../../src/ai/provider.mjs", () => ({
  generateText: vi.fn().mockResolvedValue({
    output: "generated code",
    model: "test-model",
    provider: "test",
    duration: 100,
  }),
  generateJobSpec: vi.fn().mockResolvedValue({}),
  generateWorkingJob: vi.fn().mockResolvedValue({
    spec: { name: "test-job", desc: "test", tags: ["test"], author: "ai", version: "1.0" },
    code: "export default {}",
    model: "test-model",
    provider: "test",
  }),
  checkAIAvailability: vi.fn().mockResolvedValue({
    available: true,
    provider: "ollama",
    model: "test-model",
  }),
}));

vi.mock("../../../src/utils/logger.mjs", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
  }),
}));

vi.mock("consola", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    start: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("node:fs", () => ({
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(false),
}));

const { llmCommand } = await import("../../../src/cli/commands/llm.mjs");

describe("LLM Command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("llmCommand", () => {
    it("should be defined", () => {
      expect(llmCommand).toBeDefined();
      expect(llmCommand.meta).toBeDefined();
      expect(llmCommand.meta.name).toBe("llm");
    });

    it("should have all required subcommands", () => {
      expect(llmCommand.subCommands).toBeDefined();
      expect(llmCommand.subCommands.generate).toBeDefined();
      expect(llmCommand.subCommands.job).toBeDefined();
      expect(llmCommand.subCommands.status).toBeDefined();
      expect(llmCommand.subCommands.chat).toBeDefined();
      expect(llmCommand.subCommands.complete).toBeDefined();
    });

    it("should have proper metadata", () => {
      expect(llmCommand.meta.description).toContain("AI-powered code generation");
      expect(llmCommand.meta.usage).toContain("gitvan llm");
      expect(llmCommand.meta.examples).toBeDefined();
      expect(llmCommand.meta.examples.length).toBeGreaterThan(0);
    });

    it("should export as default", async () => {
      const mod = await import("../../../src/cli/commands/llm.mjs");
      expect(mod.default).toBe(mod.llmCommand);
    });
  });

  describe("generate subcommand", () => {
    const generateCmd = llmCommand.subCommands.generate;

    it("should be properly defined", () => {
      expect(generateCmd.meta.name).toBe("generate");
      expect(generateCmd.meta.description).toContain("Generate");
    });

    it("should have required prompt argument", () => {
      expect(generateCmd.args.prompt).toBeDefined();
      expect(generateCmd.args.prompt.required).toBe(true);
    });

    it("should have model, provider, and output arguments", () => {
      expect(generateCmd.args.model).toBeDefined();
      expect(generateCmd.args.provider).toBeDefined();
      expect(generateCmd.args.output).toBeDefined();
    });

    it("should have default model settings", () => {
      expect(generateCmd.args.model.default).toBe("qwen3-coder:30b");
      expect(generateCmd.args.provider.default).toBe("ollama");
    });

    it("should run generate with prompt", async () => {
      const { generateText } = await import("../../../src/ai/provider.mjs");
      await generateCmd.run({
        args: {
          prompt: "create a job",
          model: "test-model",
          provider: "ollama",
          _: [],
        },
      });
      expect(generateText).toHaveBeenCalled();
    });

    it("should save output to file when output arg specified", async () => {
      const { writeFileSync } = await import("node:fs");
      await generateCmd.run({
        args: {
          prompt: "create something",
          model: "test-model",
          provider: "ollama",
          output: "/tmp/output.mjs",
          _: [],
        },
      });
      expect(writeFileSync).toHaveBeenCalledWith(
        "/tmp/output.mjs",
        "generated code"
      );
    });
  });

  describe("job subcommand", () => {
    const jobCmd = llmCommand.subCommands.job;

    it("should be properly defined", () => {
      expect(jobCmd.meta.name).toBe("job");
      expect(jobCmd.meta.description).toContain("Generate a GitVan job");
    });

    it("should have required description argument", () => {
      expect(jobCmd.args.description).toBeDefined();
      expect(jobCmd.args.description.required).toBe(true);
    });

    it("should have save flag", () => {
      expect(jobCmd.args.save).toBeDefined();
      expect(jobCmd.args.save.type).toBe("boolean");
      expect(jobCmd.args.save.default).toBe(false);
    });

    it("should have optional name argument", () => {
      expect(jobCmd.args.name).toBeDefined();
    });

    it("should generate a job", async () => {
      const { generateWorkingJob } = await import("../../../src/ai/provider.mjs");
      await jobCmd.run({
        args: {
          description: "backup files",
          model: "test-model",
          provider: "ollama",
          save: false,
          _: [],
        },
      });
      expect(generateWorkingJob).toHaveBeenCalled();
    });

    it("should save job when save flag is true", async () => {
      const { writeFileSync, mkdirSync } = await import("node:fs");
      await jobCmd.run({
        args: {
          description: "test job",
          model: "test-model",
          provider: "ollama",
          save: true,
          _: [],
        },
      });
      expect(mkdirSync).toHaveBeenCalled();
      expect(writeFileSync).toHaveBeenCalled();
    });
  });

  describe("status subcommand", () => {
    const statusCmd = llmCommand.subCommands.status;

    it("should be properly defined", () => {
      expect(statusCmd.meta.name).toBe("status");
      expect(statusCmd.meta.description).toContain("Check AI provider");
    });

    it("should have optional provider argument", () => {
      expect(statusCmd.args.provider).toBeDefined();
      expect(statusCmd.args.provider.type).toBe("string");
    });

    it("should check AI availability", async () => {
      const { checkAIAvailability } = await import("../../../src/ai/provider.mjs");
      await statusCmd.run({ args: {} });
      expect(checkAIAvailability).toHaveBeenCalled();
    });

    it("should handle unavailable provider", async () => {
      const { checkAIAvailability } = await import("../../../src/ai/provider.mjs");
      checkAIAvailability.mockResolvedValueOnce({
        available: false,
        provider: "ollama",
        model: "test",
        error: "Not running",
      });
      await statusCmd.run({ args: {} });
      expect(checkAIAvailability).toHaveBeenCalled();
    });
  });

  describe("chat subcommand", () => {
    const chatCmd = llmCommand.subCommands.chat;

    it("should be properly defined", () => {
      expect(chatCmd.meta.name).toBe("chat");
      expect(chatCmd.meta.description).toContain("interactive chat");
    });

    it("should have model and provider arguments", () => {
      expect(chatCmd.args.model).toBeDefined();
      expect(chatCmd.args.provider).toBeDefined();
    });

    it("should run without error (placeholder)", async () => {
      await chatCmd.run({ args: { model: "test", provider: "ollama" } });
    });
  });

  describe("complete subcommand", () => {
    const completeCmd = llmCommand.subCommands.complete;

    it("should be properly defined", () => {
      expect(completeCmd.meta.name).toBe("complete");
      expect(completeCmd.meta.description).toContain("Complete code");
    });

    it("should have required file argument", () => {
      expect(completeCmd.args.file).toBeDefined();
      expect(completeCmd.args.file.required).toBe(true);
    });

    it("should run without error (placeholder)", async () => {
      await completeCmd.run({
        args: { file: "test.mjs", model: "test", provider: "ollama" },
      });
    });
  });
});

describe("LLM Command Configuration", () => {
  it("should support multiple providers via string type", () => {
    const statusCmd = llmCommand.subCommands.status;
    expect(statusCmd.args.provider.type).toBe("string");
  });
});
