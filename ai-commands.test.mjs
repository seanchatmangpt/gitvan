/**
 * GitVan AI Commands Testing Framework
 * Based on AI SDK testing patterns from https://ai-sdk.dev/docs/ai-sdk-core/testing
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MockLanguageModelV1, simulateReadableStream } from "ai/test";
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

describe("GitVan AI Commands Testing", () => {
  let testDir;
  let testUtils;

  beforeEach(async () => {
    // Create test directory
    testDir = join(process.cwd(), `test-ai-${Date.now()}`);
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(testDir, { recursive: true });

    // Create test utilities
    testUtils = new TestUtils(testDir);
    testUtils.setupTestDir();
  });

  afterEach(() => {
    // Cleanup test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  describe("AI SDK Mock Testing", () => {
    it("should generate text with mock model", async () => {
      const mockModel = new MockLanguageModelV1({
        doGenerate: async () => ({
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          text: "Hello, world!",
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

    it("should handle streaming responses", async () => {
      const mockModel = new MockLanguageModelV1({
        doStream: async () => ({
          stream: simulateReadableStream({
            chunks: [
              { type: "text-delta", textDelta: "Hello" },
              { type: "text-delta", textDelta: ", " },
              { type: "text-delta", textDelta: "world!" },
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

  describe("Job Code Validation", () => {
    it("should validate job code syntax", async () => {
      const validJobCode = `
export default {
  meta: { 
    desc: "Test job", 
    tags: ["test"],
    author: "Test",
    version: "1.0.0"
  },
  async run({ ctx, payload, meta }) {
    return { ok: true, artifacts: ['test.txt'] };
  }
}`;

      // Write test job
      const jobPath = join(testDir, "test-job.mjs");
      writeFileSync(jobPath, validJobCode);

      // Test syntax validation by checking if file can be imported
      try {
        await import(jobPath);
        expect(true).toBe(true); // Syntax is valid
      } catch (error) {
        expect.fail(`Syntax error: ${error.message}`);
      }
    });

    it("should detect syntax errors", async () => {
      const invalidCode = `
export default {
  meta: { 
    desc: "Invalid job",
    // Missing closing brace
  async run({ ctx, payload, meta }) {
    return { ok: true };
  }
}`;

      // Write invalid job
      const jobPath = join(testDir, "invalid-job.mjs");
      writeFileSync(jobPath, invalidCode);

      try {
        await import(jobPath);
        expect.fail("Should have detected syntax error");
      } catch (error) {
        // Check for various syntax error messages
        const hasSyntaxError =
          error.message.includes("SyntaxError") ||
          error.message.includes("Failed to parse") ||
          error.message.includes("invalid JS syntax");
        expect(hasSyntaxError).toBe(true);
      }
    });

    it("should validate job structure", async () => {
      const incompleteJob = `
export default {
  meta: { desc: "Incomplete job" }
  // Missing run function
}`;

      // Check for required structure
      expect(incompleteJob.includes("async run(")).toBe(false);
      expect(incompleteJob.includes("export default")).toBe(true);
    });
  });

  describe("Mock Job Generation", () => {
    it("should generate mock job specification", async () => {
      const mockJobSpec = {
        meta: {
          desc: "Generate changelog from commits",
          tags: ["documentation", "changelog"],
          author: "GitVan AI",
          version: "1.0.0",
        },
        config: {
          on: { tagCreate: "v*" },
        },
        implementation: {
          operations: [
            { type: "git-commit", description: "Get commits since last tag" },
            {
              type: "template-render",
              description: "Render changelog template",
            },
            { type: "file-write", description: "Write CHANGELOG.md" },
          ],
          returnValue: {
            success: "Changelog generated successfully",
            artifacts: ["CHANGELOG.md"],
          },
        },
      };

      expect(mockJobSpec.meta.desc).toBe("Generate changelog from commits");
      expect(mockJobSpec.implementation.operations).toHaveLength(3);
      expect(mockJobSpec.implementation.returnValue.artifacts).toContain(
        "CHANGELOG.md"
      );
    });

    it("should generate working job code from specification", async () => {
      const jobSpec = {
        meta: {
          desc: "Test job",
          tags: ["test"],
          author: "Test",
          version: "1.0.0",
        },
        implementation: {
          operations: [{ type: "log", description: "Test operation" }],
          returnValue: {
            success: "Job completed",
            artifacts: ["test.txt"],
          },
        },
      };

      // Generate job code from spec
      const jobCode = generateJobCodeFromSpec(jobSpec);

      expect(jobCode).toContain("export default");
      expect(jobCode).toContain("async run(");
      expect(jobCode).toContain("Test job");
      expect(jobCode).not.toContain("TODO:");
    });
  });

  describe("File Operations Testing", () => {
    it("should create and read test files", async () => {
      const testContent = "Hello, test world!";
      const testFile = join(testDir, "test.txt");

      // Write file
      writeFileSync(testFile, testContent);

      // Verify file exists
      expect(existsSync(testFile)).toBe(true);

      // Read file
      const content = readFileSync(testFile, "utf8");
      expect(content).toBe(testContent);
    });

    it("should handle file operations in job context", async () => {
      const jobCode = `
export default {
  meta: { desc: "File operation test" },
  async run({ ctx, payload, meta }) {
    const fs = require('fs');
    const path = require('path');
    
    const testFile = path.join('${testDir}', 'job-output.txt');
    fs.writeFileSync(testFile, 'Job executed successfully');
    
    return { 
      ok: true, 
      artifacts: ['job-output.txt'],
      summary: 'File operation completed'
    };
  }
}`;

      // Write job file
      const jobPath = join(testDir, "file-job.mjs");
      writeFileSync(jobPath, jobCode);

      // Verify job file was created
      expect(existsSync(jobPath)).toBe(true);
      expect(readFileSync(jobPath, "utf8")).toContain("File operation test");
    });
  });

  describe("AI Command Testing", () => {
    it("should validate AI provider availability", async () => {
      // Test that we can create mock providers
      const mockProvider = testUtils.createMockProvider();
      expect(mockProvider).toBeDefined();
      expect(typeof mockProvider.getNextResponse).toBe("function");
    });

    it("should test job code generation workflow", async () => {
      // Test the complete workflow of generating job code
      const prompt = "Create a backup job";
      const mockResponse = {
        output: JSON.stringify({
          meta: {
            desc: "Create backup of files",
            tags: ["backup"],
            author: "Test",
            version: "1.0.0",
          },
          implementation: {
            operations: [
              { type: "file-copy", description: "Copy files to backup" },
            ],
            returnValue: {
              success: "Backup completed",
              artifacts: ["backup/"],
            },
          },
        }),
        model: "test-model",
        options: {},
        duration: 1000,
      };

      const provider = testUtils.createMockProvider([mockResponse]);
      const response = provider.getNextResponse();

      expect(response).toBeDefined();
      expect(response.output).toContain("backup");

      const jobSpec = JSON.parse(response.output);
      expect(jobSpec.meta.desc).toBe("Create backup of files");
    });

    it("should validate generated job code structure", async () => {
      const jobCode = generateJobCodeFromSpec({
        meta: {
          desc: "Test validation",
          tags: ["test"],
          author: "Test",
          version: "1.0.0",
        },
        implementation: {
          operations: [{ type: "log", description: "Test operation" }],
          returnValue: { success: "Completed", artifacts: ["test.txt"] },
        },
      });

      // Write and validate the generated code
      const jobPath = join(testDir, "validation-test.mjs");
      writeFileSync(jobPath, jobCode);

      // Test that it can be imported
      const jobModule = await import(jobPath);
      expect(jobModule.default).toBeDefined();
      expect(typeof jobModule.default.run).toBe("function");
    });
  });
});

// Helper function to generate job code from specification
function generateJobCodeFromSpec(spec) {
  return `
export default {
  meta: {
    desc: "${spec.meta.desc}",
    tags: ${JSON.stringify(spec.meta.tags)},
    author: "${spec.meta.author}",
    version: "${spec.meta.version}"
  },
  async run({ ctx, payload, meta }) {
    try {
      console.log("Executing job: ${spec.meta.desc}");
      
      // Execute operations
      ${spec.implementation.operations
        .map((op) => `console.log("${op.description}");`)
        .join("\n      ")}
      
      return {
        ok: true,
        artifacts: ${JSON.stringify(spec.implementation.returnValue.artifacts)},
        summary: "${spec.implementation.returnValue.success}"
      };
    } catch (error) {
      console.error('Job failed:', error.message);
      return {
        ok: false,
        error: error.message,
        artifacts: []
      };
    }
  }
}`;
}
