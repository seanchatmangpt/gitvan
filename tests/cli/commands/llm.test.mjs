/**
 * Tests for LLM Command
 */

import { describe, it, expect } from "vitest";
import { llmCommand } from "../../../src/cli/commands/llm.mjs";

describe("LLM Command", () => {
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
      expect(llmCommand.meta.description).toContain(
        "AI-powered code generation"
      );
      expect(llmCommand.meta.usage).toContain("gitvan llm");
      expect(llmCommand.meta.examples).toBeDefined();
      expect(llmCommand.meta.examples.length).toBeGreaterThan(0);
    });
  });

  describe("generate subcommand", () => {
    it("should be properly defined", () => {
      const generateCmd = llmCommand.subCommands.generate;
      expect(generateCmd).toBeDefined();
      expect(generateCmd.meta.name).toBe("generate");
      expect(generateCmd.meta.description).toContain("Generate");
    });

    it("should have required prompt argument", () => {
      const generateCmd = llmCommand.subCommands.generate;
      expect(generateCmd.args).toBeDefined();
      expect(generateCmd.args.prompt).toBeDefined();
      expect(generateCmd.args.prompt.required).toBe(true);
    });

    it("should have optional model and provider arguments", () => {
      const generateCmd = llmCommand.subCommands.generate;
      expect(generateCmd.args.model).toBeDefined();
      expect(generateCmd.args.provider).toBeDefined();
      expect(generateCmd.args.output).toBeDefined();
    });
  });

  describe("job subcommand", () => {
    it("should be properly defined", () => {
      const jobCmd = llmCommand.subCommands.job;
      expect(jobCmd).toBeDefined();
      expect(jobCmd.meta.name).toBe("job");
      expect(jobCmd.meta.description).toContain("Generate a GitVan job");
    });

    it("should have required description argument", () => {
      const jobCmd = llmCommand.subCommands.job;
      expect(jobCmd.args).toBeDefined();
      expect(jobCmd.args.description).toBeDefined();
      expect(jobCmd.args.description.required).toBe(true);
    });

    it("should have save flag", () => {
      const jobCmd = llmCommand.subCommands.job;
      expect(jobCmd.args.save).toBeDefined();
      expect(jobCmd.args.save.type).toBe("boolean");
    });

    it("should have optional name argument", () => {
      const jobCmd = llmCommand.subCommands.job;
      expect(jobCmd.args.name).toBeDefined();
    });
  });

  describe("status subcommand", () => {
    it("should be properly defined", () => {
      const statusCmd = llmCommand.subCommands.status;
      expect(statusCmd).toBeDefined();
      expect(statusCmd.meta.name).toBe("status");
      expect(statusCmd.meta.description).toContain("Check AI provider");
    });

    it("should have optional provider argument", () => {
      const statusCmd = llmCommand.subCommands.status;
      expect(statusCmd.args).toBeDefined();
      expect(statusCmd.args.provider).toBeDefined();
    });
  });

  describe("chat subcommand", () => {
    it("should be properly defined", () => {
      const chatCmd = llmCommand.subCommands.chat;
      expect(chatCmd).toBeDefined();
      expect(chatCmd.meta.name).toBe("chat");
      expect(chatCmd.meta.description).toContain("interactive chat");
    });

    it("should have model and provider arguments", () => {
      const chatCmd = llmCommand.subCommands.chat;
      expect(chatCmd.args).toBeDefined();
      expect(chatCmd.args.model).toBeDefined();
      expect(chatCmd.args.provider).toBeDefined();
    });
  });

  describe("complete subcommand", () => {
    it("should be properly defined", () => {
      const completeCmd = llmCommand.subCommands.complete;
      expect(completeCmd).toBeDefined();
      expect(completeCmd.meta.name).toBe("complete");
      expect(completeCmd.meta.description).toContain("Complete code");
    });

    it("should have required file argument", () => {
      const completeCmd = llmCommand.subCommands.complete;
      expect(completeCmd.args).toBeDefined();
      expect(completeCmd.args.file).toBeDefined();
      expect(completeCmd.args.file.required).toBe(true);
    });
  });
});

describe("LLM Command Configuration", () => {
  it("should have default model settings", () => {
    const generateCmd = llmCommand.subCommands.generate;
    expect(generateCmd.args.model.default).toBe("qwen3-coder:30b");
    expect(generateCmd.args.provider.default).toBe("ollama");
  });

  it("should support multiple providers", () => {
    const statusCmd = llmCommand.subCommands.status;
    // Provider should be a string type
    expect(statusCmd.args.provider.type).toBe("string");
  });
});
