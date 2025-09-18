/**
 * GitVan AI Commands Test Suite
 * Uses official AI SDK testing utilities for deterministic testing
 */

import { describe, it, expect, beforeEach } from "vitest";
import { generateText, MockLanguageModelV2 } from "ai/test";
import { generateJobSpec, generateWorkingJob } from "../src/ai/provider.mjs";
import { draftCommand } from "../src/cli/chat/draft.mjs";
import { generateCommand } from "../src/cli/chat/generate.mjs";
import { generateText as aiGenerateText } from "ai";

describe("AI Provider Tests", () => {
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      ai: {
        provider: "mock",
        model: "test-model",
        temperature: 0.7,
      },
      rootDir: "/tmp/test-gitvan",
    };
  });

  describe("generateJobSpec", () => {
    it("should generate a changelog job specification", async () => {
      const result = await generateJobSpec({
        prompt: "Create a changelog generator",
        config: mockConfig,
      });

      expect(result.success).toBe(true);
      expect(result.spec).toBeDefined();
      expect(result.spec.meta.desc).toContain("changelog");
      expect(result.spec.config.on.tagCreate).toBe("v*");
      expect(result.spec.implementation.operations).toHaveLength(3);
    });

    it("should generate a backup job specification", async () => {
      const result = await generateJobSpec({
        prompt: "Create a backup job",
        config: mockConfig,
      });

      expect(result.success).toBe(true);
      expect(result.spec).toBeDefined();
      expect(result.spec.meta.desc).toContain("Backup");
    });

    it("should handle generic job requests", async () => {
      const result = await generateJobSpec({
        prompt: "Create a test job",
        config: mockConfig,
      });

      expect(result.success).toBe(true);
      expect(result.spec).toBeDefined();
      expect(result.spec.meta).toBeDefined();
      expect(result.spec.implementation).toBeDefined();
    });
  });

  describe("generateWorkingJob", () => {
    it("should generate working backup job code", async () => {
      const result = await generateWorkingJob({
        prompt: "Create a backup job",
        config: mockConfig,
      });

      expect(result.success).toBe(true);
      expect(result.working).toBe(true);
      expect(result.code).toContain(
        "import { defineJob, useGit, useTemplate, useNotes }"
      );
      expect(result.code).toContain("export default defineJob");
      expect(result.code).toContain("async run({ ctx, payload, meta })");
      expect(result.code).toContain("const git = useGit()");
      expect(result.code).toContain("const notes = useNotes()");
      expect(result.code).toContain("return {");
    });

    it("should generate working changelog job code", async () => {
      const result = await generateWorkingJob({
        prompt: "Create a changelog generator",
        config: mockConfig,
      });

      expect(result.success).toBe(true);
      expect(result.working).toBe(true);
      expect(result.code).toContain("import { defineJob");
      expect(result.code).toContain("export default defineJob");
      expect(result.code).toContain("async run({ ctx, payload, meta })");
    });

    it("should generate working generic job code", async () => {
      const result = await generateWorkingJob({
        prompt: "Create a test job",
        config: mockConfig,
      });

      expect(result.success).toBe(true);
      expect(result.working).toBe(true);
      expect(result.code).toContain(
        "import { defineJob, useGit, useTemplate, useNotes }"
      );
      expect(result.code).toContain("export default defineJob");
      expect(result.code).toContain("async run({ ctx, payload, meta })");
      expect(result.code).toContain("const git = useGit()");
    });
  });

  describe("Chat Commands Integration", () => {
    it("should draft a changelog job specification", async () => {
      // Mock console.log to capture output
      const originalLog = console.log;
      const logs = [];
      console.log = (...args) => logs.push(args.join(" "));

      try {
        await draftCommand(mockConfig, {
          prompt: "Create a changelog generator",
        });

        expect(
          logs.some((log) => log.includes("Generated GitVan job specification"))
        ).toBe(true);
        expect(logs.some((log) => log.includes("changelog"))).toBe(true);
      } finally {
        console.log = originalLog;
      }
    });

    it("should generate a backup job file", async () => {
      // Mock console.log to capture output
      const originalLog = console.log;
      const logs = [];
      console.log = (...args) => logs.push(args.join(" "));

      try {
        await generateCommand(mockConfig, {
          prompt: "Create a backup job",
        });

        expect(
          logs.some((log) => log.includes("Generated WORKING GitVan job"))
        ).toBe(true);
        expect(logs.some((log) => log.includes("Working: YES"))).toBe(true);
        expect(logs.some((log) => log.includes("import { defineJob"))).toBe(
          true
        );
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe("MockLanguageModelV2 Direct Usage", () => {
    it("should work with AI SDK generateText directly", async () => {
      const mockModel = new MockLanguageModelV2({
        doGenerate: async () => ({
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [{ type: "text", text: "Hello, world!" }],
          warnings: [],
        }),
      });

      const result = await aiGenerateText({
        model: mockModel,
        prompt: "Hello, test!",
      });

      expect(result.text).toBe("Hello, world!");
      expect(result.usage.totalTokens).toBe(30);
    });

    it("should generate GitVan job code with direct mock", async () => {
      const mockModel = new MockLanguageModelV2({
        doGenerate: async ({ prompt }) => ({
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 50, totalTokens: 60 },
          content: [
            {
              type: "text",
              text: `import { defineJob, useGit } from 'file:///Users/sac/gitvan/src/index.mjs'

export default defineJob({
  meta: { 
    name: "test-job", 
    desc: "Test job for: ${prompt}",
    tags: ["test", "ai-generated"],
    author: "GitVan AI",
    version: "1.0.0"
  },
  async run({ ctx, payload, meta }) {
    try {
      const git = useGit()
      
      console.log("Executing test job")
      
      await git.writeFile("test-output.txt", "Test completed")
      
      return {
        ok: true,
        artifacts: ["test-output.txt"],
        summary: "Test job completed successfully"
      }
    } catch (error) {
      console.error('Test job failed:', error.message)
      return {
        ok: false,
        error: error.message,
        artifacts: []
      }
    }
  }
})`,
            },
          ],
          warnings: [],
        }),
      });

      const result = await aiGenerateText({
        model: mockModel,
        prompt: "Create a test job",
      });

      expect(result.text).toContain("import { defineJob, useGit }");
      expect(result.text).toContain("export default defineJob");
      expect(result.text).toContain("async run({ ctx, payload, meta })");
      expect(result.text).toContain("const git = useGit()");
      expect(result.text).toContain("return {");
    });
  });
});
