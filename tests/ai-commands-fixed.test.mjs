/**
 * GitVan AI Commands Testing Framework - FIXED VERSION
 * Tests actual GitVan integration with proper composable usage
 * Based on AI SDK testing patterns from https://ai-sdk.dev/docs/ai-sdk-core/testing
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MockLanguageModelV2, simulateReadableStream } from "ai/test";
import { generateText, streamText } from "ai";
import { z } from "zod";
import { join } from "pathe";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { TestUtils } from "./setup.mjs";
import { generateJobSpec, generateWorkingJob } from "../src/ai/provider.mjs";
import { createAIProvider } from "../src/ai/provider-factory.mjs";

describe("GitVan AI Commands Testing - Fixed", () => {
  let testDir;
  let testUtils;
  let mockConfig;

  beforeEach(async () => {
    // Create test directory
    testDir = join(process.cwd(), `test-ai-fixed-${Date.now()}`);
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(testDir, { recursive: true });

    // Create test utilities
    testUtils = new TestUtils(testDir);
    testUtils.setupTestDir();

    // Mock config with GitVan context
    mockConfig = {
      ai: {
        provider: "mock",
        model: "test-model",
        temperature: 0.7,
      },
      rootDir: testDir,
    };
  });

  afterEach(() => {
    // Cleanup test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  describe("AI SDK Mock Testing - Updated", () => {
    it("should generate text with MockLanguageModelV2", async () => {
      const mockModel = new MockLanguageModelV2({
        doGenerate: async ({ prompt }) => ({
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [{ type: "text", text: "Hello, world!" }],
          warnings: [],
        }),
      });

      const result = await generateText({
        model: mockModel,
        prompt: "Hello, test!",
      });

      expect(result.text).toBe("Hello, world!");
      expect(result.usage.totalTokens).toBeDefined();
    });

    it("should handle streaming responses with V2", async () => {
      const mockModel = new MockLanguageModelV2({
        doStream: async () => ({
          stream: simulateReadableStream({
            chunks: [
              { type: "text-start", id: "text-1" },
              { type: "text-delta", id: "text-1", delta: "Hello" },
              { type: "text-delta", id: "text-1", delta: ", " },
              { type: "text-delta", id: "text-1", delta: "world!" },
              { type: "text-end", id: "text-1" },
              {
                type: "finish",
                finishReason: "stop",
                usage: { inputTokens: 3, outputTokens: 10, totalTokens: 13 },
              },
            ],
          }),
        }),
      });

      const result = streamText({
        model: mockModel,
        prompt: "Hello, test!",
      });

      let fullText = "";
      for await (const chunk of result.textStream) {
        fullText += chunk;
      }

      expect(fullText).toBe("Hello, world!");
    });
  });

  describe("GitVan Composable Integration Testing", () => {
    it("should generate job with proper GitVan composables", async () => {
      const result = await generateWorkingJob({
        prompt: "Create a backup job that uses GitVan composables",
        config: mockConfig,
      });

      // Validate GitVan patterns
      expect(result.code).toContain(
        "import { defineJob, useGit, useTemplate, useNotes }"
      );
      expect(result.code).toContain("export default defineJob");
      expect(result.code).toContain("const git = useGit()");
      expect(result.code).toContain("const template = useTemplate()");
      expect(result.code).toContain("const notes = useNotes()");

      // Validate actual GitVan operations
      expect(result.code).toContain("await git.writeFile");
      expect(result.code).toContain("await notes.write");

      // Validate proper return structure
      expect(result.code).toContain("return {");
      expect(result.code).toContain("ok: true");
      expect(result.code).toContain("artifacts:");
    });

    it("should generate changelog job with template usage", async () => {
      const result = await generateWorkingJob({
        prompt: "Create a changelog generator",
        config: mockConfig,
      });

      // Validate changelog-specific patterns
      expect(result.code).toContain("changelog");
      expect(result.code).toContain("useTemplate()");
      expect(result.code).toContain("CHANGELOG.md");

      // Validate GitVan composable usage
      expect(result.code).toContain("const git = useGit()");
      expect(result.code).toContain("const template = useTemplate()");
    });

    it("should validate generated job actually runs", async () => {
      const result = await generateWorkingJob({
        prompt: "Create a simple test job",
        config: mockConfig,
      });

      // Write the generated job to disk
      const jobPath = join(testDir, "generated-job.mjs");
      writeFileSync(jobPath, result.code);

      // Test that it can be imported (syntax validation)
      try {
        const jobModule = await import(jobPath);
        expect(jobModule.default).toBeDefined();
        expect(typeof jobModule.default.run).toBe("function");

        // Test that the job structure is correct
        expect(jobModule.default.meta).toBeDefined();
        expect(jobModule.default.meta.desc).toBeDefined();
      } catch (error) {
        expect.fail(`Generated job has syntax errors: ${error.message}`);
      }
    });
  });

  describe("Job Specification Validation", () => {
    it("should generate valid job specifications", async () => {
      const result = await generateJobSpec({
        prompt: "Create a backup job",
        config: mockConfig,
      });

      expect(result.success).toBe(true);
      expect(result.spec).toBeDefined();
      expect(result.spec.meta).toBeDefined();
      expect(result.spec.meta.desc).toBeDefined();
      expect(result.spec.implementation).toBeDefined();
      expect(result.spec.implementation.operations).toBeInstanceOf(Array);
      expect(result.spec.implementation.returnValue).toBeDefined();
    });

    it("should include GitVan-specific operations in specs", async () => {
      const result = await generateJobSpec({
        prompt: "Create a file processing job",
        config: mockConfig,
      });

      const operations = result.spec.implementation.operations;
      const operationTypes = operations.map((op) => op.type);

      // Should include GitVan-specific operations
      expect(operationTypes).toContain("file-write");
      expect(operationTypes).toContain("git-note");
    });
  });

  describe("AI Provider Factory Testing", () => {
    it("should create mock provider with GitVan context", async () => {
      const provider = createAIProvider(mockConfig);
      expect(provider).toBeDefined();

      // Test that provider can generate GitVan-aware responses
      const result = await generateText({
        model: provider,
        prompt: "Create a GitVan job",
      });

      expect(result.text).toBeDefined();
      // The mock should return GitVan-specific content
      expect(result.text).toContain("defineJob");
    });

    it("should handle different AI providers", async () => {
      const providers = ["mock", "ollama", "openai", "anthropic"];

      for (const providerType of providers) {
        const config = {
          ...mockConfig,
          ai: { ...mockConfig.ai, provider: providerType },
        };
        const provider = createAIProvider(config);
        expect(provider).toBeDefined();
      }
    });
  });

  describe("End-to-End Job Generation Workflow", () => {
    it("should complete full workflow from prompt to working job", async () => {
      // Step 1: Generate job specification
      const specResult = await generateJobSpec({
        prompt: "Create a backup job that saves important files",
        config: mockConfig,
      });

      expect(specResult.success).toBe(true);
      expect(specResult.spec.meta.desc).toContain("backup");

      // Step 2: Generate working job code
      const jobResult = await generateWorkingJob({
        prompt: "Create a backup job that saves important files",
        config: mockConfig,
      });

      expect(jobResult.success).toBe(true);
      expect(jobResult.working).toBe(true);
      expect(jobResult.code).toContain("defineJob");

      // Step 3: Validate generated code
      const jobPath = join(testDir, "backup-job.mjs");
      writeFileSync(jobPath, jobResult.code);

      // Step 4: Test that job can be imported and has correct structure
      const jobModule = await import(jobPath);
      expect(jobModule.default).toBeDefined();
      expect(jobModule.default.meta).toBeDefined();
      expect(typeof jobModule.default.run).toBe("function");

      // Step 5: Validate GitVan composable usage
      expect(jobResult.code).toContain("useGit()");
      expect(jobResult.code).toContain("useNotes()");
    });

    it("should generate jobs that follow GitVan patterns", async () => {
      const result = await generateWorkingJob({
        prompt: "Create a deployment job",
        config: mockConfig,
      });

      // Validate GitVan job structure
      expect(result.code).toContain("export default defineJob");
      expect(result.code).toContain("meta: {");
      expect(result.code).toContain("async run({ ctx, payload, meta })");
      expect(result.code).toContain("try {");
      expect(result.code).toContain("return {");
      expect(result.code).toContain("ok: true");
      expect(result.code).toContain("} catch (error) {");
      expect(result.code).toContain("ok: false");
    });
  });

  describe("Composable Usage Validation", () => {
    it("should use GitVan composables correctly", async () => {
      const result = await generateWorkingJob({
        prompt: "Create a job that reads files and writes notes",
        config: mockConfig,
      });

      // Validate composable imports
      expect(result.code).toContain(
        "import { defineJob, useGit, useTemplate, useNotes }"
      );

      // Validate composable instantiation
      expect(result.code).toContain("const git = useGit()");
      expect(result.code).toContain("const notes = useNotes()");

      // Validate composable usage
      expect(result.code).toContain("await git.writeFile");
      expect(result.code).toContain("await notes.write");
    });

    it("should generate jobs with proper error handling", async () => {
      const result = await generateWorkingJob({
        prompt: "Create a robust file processing job",
        config: mockConfig,
      });

      // Validate error handling pattern
      expect(result.code).toContain("try {");
      expect(result.code).toContain("} catch (error) {");
      expect(result.code).toContain(
        "console.error('Job failed:', error.message)"
      );
      expect(result.code).toContain("return {");
      expect(result.code).toContain("ok: false");
      expect(result.code).toContain("error: error.message");
    });
  });
});

// Helper function to validate GitVan job structure
function validateGitVanJobStructure(code) {
  const requiredPatterns = [
    "import { defineJob",
    "export default defineJob",
    "meta: {",
    "async run({ ctx, payload, meta })",
    "try {",
    "return {",
    "ok: true",
    "} catch (error) {",
    "ok: false",
  ];

  return requiredPatterns.every((pattern) => code.includes(pattern));
}

// Helper function to validate composable usage
function validateComposableUsage(code) {
  const composablePatterns = ["useGit()", "useNotes()", "useTemplate()"];

  return composablePatterns.some((pattern) => code.includes(pattern));
}
