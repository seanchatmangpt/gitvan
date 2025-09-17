/**
 * Test GitVan AI Context System
 * Validates that the rich context prompts work correctly
 */

import { describe, it, expect, beforeEach } from "vitest";
import { generateJobSpec, generateWorkingJob } from "../src/ai/provider.mjs";
import { GITVAN_COMPLETE_CONTEXT } from "../src/ai/prompts/gitvan-complete-context.mjs";

describe("GitVan AI Context System", () => {
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

  describe("Context Integration", () => {
    it("should include GitVan context in prompts", () => {
      expect(GITVAN_COMPLETE_CONTEXT).toContain(
        "GitVan v2 Complete AI Context"
      );
      expect(GITVAN_COMPLETE_CONTEXT).toContain("useGit()");
      expect(GITVAN_COMPLETE_CONTEXT).toContain("useTemplate()");
      expect(GITVAN_COMPLETE_CONTEXT).toContain("useNotes()");
      expect(GITVAN_COMPLETE_CONTEXT).toContain("defineJob");
    });

    it("should include composable documentation", () => {
      expect(GITVAN_COMPLETE_CONTEXT).toContain("worktreeRoot()");
      expect(GITVAN_COMPLETE_CONTEXT).toContain("writeFile(path, content)");
      expect(GITVAN_COMPLETE_CONTEXT).toContain("render(templatePath, data)");
      expect(GITVAN_COMPLETE_CONTEXT).toContain("noteAdd(key, value)");
    });

    it("should include job patterns", () => {
      expect(GITVAN_COMPLETE_CONTEXT).toContain("Standard Job Structure");
      expect(GITVAN_COMPLETE_CONTEXT).toContain("meta:");
      expect(GITVAN_COMPLETE_CONTEXT).toContain(
        "async run({ ctx, payload, meta })"
      );
      expect(GITVAN_COMPLETE_CONTEXT).toContain("return { ok: true");
    });

    it("should include error handling patterns", () => {
      expect(GITVAN_COMPLETE_CONTEXT).toContain("try {");
      expect(GITVAN_COMPLETE_CONTEXT).toContain("} catch (error) {");
      expect(GITVAN_COMPLETE_CONTEXT).toContain("console.error");
    });
  });

  describe("Job Generation with Context", () => {
    it("should generate job spec with GitVan context", async () => {
      const result = await generateJobSpec({
        prompt: "Create a backup job",
        config: mockConfig,
      });

      expect(result.success).toBe(true);
      expect(result.spec).toBeDefined();
      expect(result.spec.meta).toBeDefined();
      expect(result.spec.meta.desc).toBeDefined();
      expect(result.spec.implementation).toBeDefined();
    });

    it("should generate working job with proper GitVan patterns", async () => {
      const result = await generateWorkingJob({
        prompt: "Create a file processing job",
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
      expect(result.code).toContain("try {");
      expect(result.code).toContain("} catch (error) {");
    });

    it("should generate jobs that use composables", async () => {
      const result = await generateWorkingJob({
        prompt: "Create a changelog generator",
        config: mockConfig,
      });

      // Should use GitVan composables
      expect(result.code).toContain("useGit()");
      expect(result.code).toContain("useTemplate()");
      expect(result.code).toContain("useNotes()");

      // Should use composable methods
      expect(result.code).toContain("await git.writeFile");
      expect(result.code).toContain("await template.render");
      expect(result.code).toContain("await notes.write");
    });

    it("should generate jobs with proper error handling", async () => {
      const result = await generateWorkingJob({
        prompt: "Create a robust backup job",
        config: mockConfig,
      });

      // Should include proper error handling
      expect(result.code).toContain("try {");
      expect(result.code).toContain("} catch (error) {");
      expect(result.code).toContain(
        "console.error('Job failed:', error.message)"
      );
      expect(result.code).toContain("return {");
      expect(result.code).toContain("ok: false");
      expect(result.code).toContain("error: error.message");
    });

    it("should generate jobs with proper return structure", async () => {
      const result = await generateWorkingJob({
        prompt: "Create a documentation generator",
        config: mockConfig,
      });

      // Should return proper structure
      expect(result.code).toContain("return {");
      expect(result.code).toContain("ok: true");
      expect(result.code).toContain("artifacts:");
      expect(result.code).toContain("summary:");
    });
  });

  describe("Context Quality", () => {
    it("should provide comprehensive composable documentation", () => {
      // Check that context includes detailed composable information
      expect(GITVAN_COMPLETE_CONTEXT).toContain("worktreeRoot()");
      expect(GITVAN_COMPLETE_CONTEXT).toContain("currentHead()");
      expect(GITVAN_COMPLETE_CONTEXT).toContain("writeFile(path, content)");
      expect(GITVAN_COMPLETE_CONTEXT).toContain("readFile(path)");
      expect(GITVAN_COMPLETE_CONTEXT).toContain("render(templatePath, data)");
      expect(GITVAN_COMPLETE_CONTEXT).toContain("noteAdd(key, value)");
    });

    it("should include working examples", () => {
      // Check that context includes working code examples
      expect(GITVAN_COMPLETE_CONTEXT).toContain("const git = useGit()");
      expect(GITVAN_COMPLETE_CONTEXT).toContain(
        "const template = useTemplate()"
      );
      expect(GITVAN_COMPLETE_CONTEXT).toContain("const notes = useNotes()");
      expect(GITVAN_COMPLETE_CONTEXT).toContain("await git.writeFile");
      expect(GITVAN_COMPLETE_CONTEXT).toContain("await template.render");
      expect(GITVAN_COMPLETE_CONTEXT).toContain("await notes.write");
    });

    it("should include common patterns", () => {
      // Check that context includes common job patterns
      expect(GITVAN_COMPLETE_CONTEXT).toContain("File Processing Job");
      expect(GITVAN_COMPLETE_CONTEXT).toContain("Template Generation Job");
      expect(GITVAN_COMPLETE_CONTEXT).toContain("Backup Job");
      expect(GITVAN_COMPLETE_CONTEXT).toContain("Changelog Generation Job");
    });

    it("should include best practices", () => {
      // Check that context includes best practices
      expect(GITVAN_COMPLETE_CONTEXT).toContain("Common Mistakes to Avoid");
      expect(GITVAN_COMPLETE_CONTEXT).toContain("Don't Use Generic Operations");
      expect(GITVAN_COMPLETE_CONTEXT).toContain("Don't Skip Error Handling");
      expect(GITVAN_COMPLETE_CONTEXT).toContain("Don't Forget Composables");
    });
  });

  describe("Token Efficiency", () => {
    it("should provide rich context within reasonable token limits", () => {
      // Context should be comprehensive but not excessive
      const contextLength = GITVAN_COMPLETE_CONTEXT.length;

      // Should be substantial but not exceed reasonable limits
      expect(contextLength).toBeGreaterThan(10000); // At least 10k characters
      expect(contextLength).toBeLessThan(100000); // Less than 100k characters

      // Should include all essential components
      expect(GITVAN_COMPLETE_CONTEXT).toContain("useGit");
      expect(GITVAN_COMPLETE_CONTEXT).toContain("useTemplate");
      expect(GITVAN_COMPLETE_CONTEXT).toContain("useNotes");
      expect(GITVAN_COMPLETE_CONTEXT).toContain("defineJob");
    });
  });
});
