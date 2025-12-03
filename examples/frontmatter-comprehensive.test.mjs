import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join, resolve } from "pathe";
import { useTemplate } from "../src/composables/template.mjs";
import { withGitVan } from "../src/core/context.mjs";
import { MockGit } from "./mock-git.mjs";

describe("Frontmatter Template System", () => {
  let testDir;
  let templateDir;

  beforeEach(async () => {
    testDir = resolve(process.cwd(), "test-frontmatter-temp");
    templateDir = join(testDir, "templates");
    await fs.mkdir(templateDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("should parse YAML front-matter and create plan", async () => {
    const templateContent = `---
to: "output.txt"
force: "overwrite"
when: true
---
Hello {{ name }}!`;

    const templatePath = join(templateDir, "test.njk");
    await fs.writeFile(templatePath, templateContent);

    const template = await useTemplate({ paths: [templateDir] });
    const plan = await template.plan("test.njk", { name: "World" });

    expect(plan.skipped).toBe(false);
    expect(plan.operations).toHaveLength(1);
    expect(plan.operations[0]).toMatchObject({
      type: "write",
      to: "output.txt",
      force: "overwrite",
    });
    expect(plan.operations[0].content).toBe("Hello World!");
  });

  it("should handle multi-output with to array", async () => {
    const templateContent = `---
to: 
  - "file1.txt"
  - "file2.txt"
force: "error"
---
Content for {{ name }}`;

    const templatePath = join(templateDir, "multi.njk");
    await fs.writeFile(templatePath, templateContent);

    const template = await useTemplate({ paths: [templateDir] });
    const plan = await template.plan("multi.njk", { name: "Test" });

    expect(plan.operations).toHaveLength(2);
    expect(plan.operations[0].to).toBe("file1.txt");
    expect(plan.operations[1].to).toBe("file2.txt");
    expect(plan.operations[0].content).toBe("Content for Test");
  });

  it("should handle injection operations", async () => {
    const templateContent = `---
inject:
  - into: "target.txt"
    snippet: "// {{ comment }}"
    find: "// INSERT_HERE"
    where: "after"
---
Main content`;

    const templatePath = join(templateDir, "inject.njk");
    await fs.writeFile(templatePath, templateContent);

    const template = await useTemplate({ paths: [templateDir] });
    const plan = await template.plan("inject.njk", {
      comment: "Auto-generated",
    });

    expect(plan.operations).toHaveLength(1);
    expect(plan.operations[0]).toMatchObject({
      type: "inject",
      into: "target.txt",
      snippet: "// Auto-generated",
      find: "// INSERT_HERE",
      where: "after",
    });
  });

  it("should handle copy operations", async () => {
    const templateContent = `---
copy:
  - from: "source.txt"
    to: "dest.txt"
---
Template content`;

    const templatePath = join(templateDir, "copy.njk");
    await fs.writeFile(templatePath, templateContent);

    const template = await useTemplate({ paths: [templateDir] });
    const plan = await template.plan("copy.njk");

    expect(plan.operations).toHaveLength(1);
    expect(plan.operations[0]).toMatchObject({
      type: "copy",
      from: expect.stringContaining("source.txt"),
      to: expect.stringContaining("dest.txt"),
    });
  });

  it("should skip template when when=false", async () => {
    const templateContent = `---
to: "output.txt"
when: false
---
Should not render`;

    const templatePath = join(templateDir, "skip.njk");
    await fs.writeFile(templatePath, templateContent);

    const template = await useTemplate({ paths: [templateDir] });
    const plan = await template.plan("skip.njk");

    expect(plan.skipped).toBe(true);
    expect(plan.reason).toBe("when=false");
    expect(plan.operations).toHaveLength(0);
  });

  it("should execute plan and create files", async () => {
    const templateContent = `---
to: "result.txt"
force: "overwrite"
---
Hello {{ name }}!`;

    const templatePath = join(templateDir, "execute.njk");
    await fs.writeFile(templatePath, templateContent);

    // Create a mock Git context for testing
    const mockGit = new MockGit({ root: testDir });
    const mockContext = {
      root: testDir,
      cwd: testDir,
      head: () => mockGit.head(),
      now: () => mockGit.nowISO(),
      git: mockGit,
    };

    await withGitVan(mockContext, async () => {
      const template = await useTemplate({ paths: [templateDir] });
      const plan = await template.plan("execute.njk", { name: "GitVan" });
      const result = await template.apply(plan);

      expect(result.status).toBe("OK");
      expect(result.operations).toHaveLength(1);
      expect(result.operations[0].status).toBe("OK");

      const outputPath = join(testDir, "result.txt");
      const content = await fs.readFile(outputPath, "utf8");
      expect(content).toBe("Hello GitVan!");
    });
  });

  it("should handle dry run without creating files", async () => {
    const templateContent = `---
to: "dry-run.txt"
---
Dry run content`;

    const templatePath = join(templateDir, "dry.njk");
    await fs.writeFile(templatePath, templateContent);

    // Create a mock Git context for testing
    const mockGit = new MockGit({ root: testDir });
    const mockContext = {
      root: testDir,
      cwd: testDir,
      head: () => mockGit.head(),
      now: () => mockGit.nowISO(),
      git: mockGit,
    };

    await withGitVan(mockContext, async () => {
      const template = await useTemplate({ paths: [templateDir] });
      const plan = await template.plan("dry.njk");
      const result = await template.apply(plan, { dryRun: true });

      expect(result.status).toBe("OK");
      expect(result.dryRun).toBe(true);
      expect(result.operations[0].status).toBe("DRY_RUN");

      const outputPath = join(testDir, "dry-run.txt");
      await expect(fs.access(outputPath)).rejects.toThrow();
    });
  });

  // Additional tests for all frontmatter requirements
  describe("Frontmatter Requirements Coverage", () => {
    let testDir;
    let templateDir;

    beforeEach(async () => {
      testDir = resolve(process.cwd(), "test-frontmatter-requirements");
      templateDir = join(testDir, "templates");
      await fs.mkdir(templateDir, { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(testDir, { recursive: true, force: true });
    });

    it("should parse TOML front-matter", async () => {
      const templateContent = `+++
to = "toml-output.txt"
force = "overwrite"
when = true
+++
TOML content: {{ name }}`;

      const templatePath = join(templateDir, "toml.njk");
      await fs.writeFile(templatePath, templateContent);

      const template = await useTemplate({ paths: [templateDir] });
      const plan = await template.plan("toml.njk", { name: "Test" });

      expect(plan.skipped).toBe(false);
      expect(plan.operations[0].to).toBe("toml-output.txt");
      expect(plan.operations[0].content).toBe("TOML content: Test");
    });

    it("should parse JSON front-matter", async () => {
      const templateContent = `;{"to":"json-output.txt","force":"overwrite","when":true}
JSON content: {{ name }}`;

      const templatePath = join(templateDir, "json.njk");
      await fs.writeFile(templatePath, templateContent);

      const template = await useTemplate({ paths: [templateDir] });
      const plan = await template.plan("json.njk", { name: "Test" });

      expect(plan.skipped).toBe(false);
      expect(plan.operations[0].to).toBe("json-output.txt");
      expect(plan.operations[0].content).toBe("JSON content: Test");
    });

    it("should handle perFile multi-output", async () => {
      const templateContent = `---
perFile:
  - to: "file1.txt"
    data:
      name: "First"
  - to: "file2.txt"
    data:
      name: "Second"
---
Content for {{ name }}`;

      const templatePath = join(templateDir, "perfile.njk");
      await fs.writeFile(templatePath, templateContent);

      const template = await useTemplate({ paths: [templateDir] });
      const plan = await template.plan("perfile.njk");

      expect(plan.operations).toHaveLength(2);
      expect(plan.operations[0].content).toBe("Content for First");
      expect(plan.operations[1].content).toBe("Content for Second");
    });

    it("should handle injection with different placement strategies", async () => {
      const templateContent = `---
inject:
  - into: "target.txt"
    snippet: "// {{ comment }}"
    find: "// INSERT_HERE"
    where: "before"
  - into: "target.txt"
    snippet: "/* {{ comment }} */"
    find: "/* END */"
    where: "after"
  - into: "target.txt"
    snippet: "// Line {{ line }}"
    where: "at_line"
    line: 5
---
Main content`;

      const templatePath = join(templateDir, "inject-strategies.njk");
      await fs.writeFile(templatePath, templateContent);

      const template = await useTemplate({ paths: [templateDir] });
      const plan = await template.plan("inject-strategies.njk", {
        comment: "Auto-generated",
        line: 42,
      });

      expect(plan.operations).toHaveLength(3);
      expect(plan.operations[0].where).toBe("before");
      expect(plan.operations[1].where).toBe("after");
      expect(plan.operations[2].where).toBe("at_line");
      expect(plan.operations[2].line).toBe(5);
    });

    it("should handle between injection strategy", async () => {
      const templateContent = `---
inject:
  - into: "target.txt"
    snippet: "{{ content }}"
    start: "<!-- START -->"
    end: "<!-- END -->"
    where: "between"
---
Main content`;

      const templatePath = join(templateDir, "between.njk");
      await fs.writeFile(templatePath, templateContent);

      const template = await useTemplate({ paths: [templateDir] });
      const plan = await template.plan("between.njk", {
        content: "Injected content",
      });

      expect(plan.operations).toHaveLength(1);
      expect(plan.operations[0].where).toBe("between");
      expect(plan.operations[0].start).toBe("<!-- START -->");
      expect(plan.operations[0].end).toBe("<!-- END -->");
    });

    it("should handle force policies correctly", async () => {
      const templateContent = `---
to: "force-test.txt"
force: "skip"
---
Should be skipped if exists`;

      const templatePath = join(templateDir, "force-skip.njk");
      await fs.writeFile(templatePath, templateContent);

      // Create the target file first
      const targetPath = join(testDir, "force-test.txt");
      await fs.writeFile(targetPath, "Existing content");

      const mockContext = {
        root: testDir,
        cwd: testDir,
        head: () => Promise.resolve("test-commit"),
        now: () => new Date().toISOString(),
      };

      await withGitVan(mockContext, async () => {
        const template = await useTemplate({ paths: [templateDir] });
        const plan = await template.plan("force-skip.njk");
        const result = await template.apply(plan);

        expect(result.status).toBe("OK");
        expect(result.operations[0].status).toBe("SKIPPED");
        expect(result.operations[0].reason).toBe("File exists");

        // Verify file wasn't changed
        const content = await fs.readFile(targetPath, "utf8");
        expect(content).toBe("Existing content");
      });
    });

    it("should handle append force policy", async () => {
      const templateContent = `---
to: "append-test.txt"
force: "append"
---
Appended content`;

      const templatePath = join(templateDir, "force-append.njk");
      await fs.writeFile(templatePath, templateContent);

      // Create the target file first
      const targetPath = join(testDir, "append-test.txt");
      await fs.writeFile(targetPath, "Original content\n");

      const mockContext = {
        root: testDir,
        cwd: testDir,
        head: () => Promise.resolve("test-commit"),
        now: () => new Date().toISOString(),
      };

      await withGitVan(mockContext, async () => {
        const template = await useTemplate({ paths: [templateDir] });
        const plan = await template.plan("force-append.njk");
        const result = await template.apply(plan);

        expect(result.status).toBe("OK");
        expect(result.operations[0].status).toBe("OK");

        // Verify content was appended
        const content = await fs.readFile(targetPath, "utf8");
        expect(content).toBe("Original content\nAppended content");
      });
    });

    it("should handle shell hooks (dry run)", async () => {
      const templateContent = `---
to: "hook-test.txt"
sh:
  before: ["echo 'Before hook'"]
  after: ["echo 'After hook'"]
---
Content with hooks`;

      const templatePath = join(templateDir, "hooks.njk");
      await fs.writeFile(templatePath, templateContent);

      const mockContext = {
        root: testDir,
        cwd: testDir,
        head: () => Promise.resolve("test-commit"),
        now: () => new Date().toISOString(),
      };

      await withGitVan(mockContext, async () => {
        const template = await useTemplate({ paths: [templateDir] });
        const plan = await template.plan("hooks.njk");

        expect(plan.hooks.before).toEqual(["echo 'Before hook'"]);
        expect(plan.hooks.after).toEqual(["echo 'After hook'"]);

        // Test dry run to avoid actual shell execution
        const result = await template.apply(plan, { dryRun: true });
        expect(result.status).toBe("OK");
      });
    });

    it("should handle complex when conditions", async () => {
      const templateContent = `---
to: "conditional.txt"
when: "{{ condition }}"
---
Conditional content`;

      const templatePath = join(templateDir, "conditional.njk");
      await fs.writeFile(templatePath, templateContent);

      const template = await useTemplate({ paths: [templateDir] });

      // Test with condition = true
      const planTrue = await template.plan("conditional.njk", {
        condition: true,
      });
      expect(planTrue.skipped).toBe(false);

      // Test with condition = false
      const planFalse = await template.plan("conditional.njk", {
        condition: false,
      });
      expect(planFalse.skipped).toBe(true);
      expect(planFalse.reason).toBe("when=false");
    });

    it("should handle copy operations", async () => {
      const templateContent = `---
copy:
  - from: "source.txt"
    to: "dest.txt"
---
Template content`;

      const templatePath = join(templateDir, "copy.njk");
      await fs.writeFile(templatePath, templateContent);

      // Create source file
      const sourcePath = join(testDir, "source.txt");
      await fs.writeFile(sourcePath, "Source content");

      const mockContext = {
        root: testDir,
        cwd: testDir,
        head: () => Promise.resolve("test-commit"),
        now: () => new Date().toISOString(),
      };

      await withGitVan(mockContext, async () => {
        const template = await useTemplate({ paths: [templateDir] });
        const plan = await template.plan("copy.njk");
        const result = await template.apply(plan);

        expect(result.status).toBe("OK");
        expect(result.operations[0].status).toBe("OK");

        // Verify file was copied
        const destPath = join(testDir, "dest.txt");
        const content = await fs.readFile(destPath, "utf8");
        expect(content).toBe("Source content");
      });
    });

    it("should handle path sandboxing", async () => {
      const templateContent = `---
to: "../../../escape.txt"
force: "overwrite"
---
Malicious content`;

      const templatePath = join(templateDir, "escape.njk");
      await fs.writeFile(templatePath, templateContent);

      const mockContext = {
        root: testDir,
        cwd: testDir,
        head: () => Promise.resolve("test-commit"),
        now: () => new Date().toISOString(),
      };

      await withGitVan(mockContext, async () => {
        const template = await useTemplate({ paths: [templateDir] });
        const plan = await template.plan("escape.njk");

        await expect(template.apply(plan)).rejects.toThrow(
          "Path escape violation"
        );
      });
    });

    it("should handle idempotent injection", async () => {
      const templateContent = `---
inject:
  - into: "target.txt"
    snippet: "// {{ comment }}"
    find: "// INSERT_HERE"
    where: "after"
    once: true
---
Main content`;

      const templatePath = join(templateDir, "idempotent.njk");
      await fs.writeFile(templatePath, templateContent);

      // Create target file with existing injection
      const targetPath = join(testDir, "target.txt");
      await fs.writeFile(
        targetPath,
        "// INSERT_HERE\n// Auto-generated\nMore content"
      );

      const mockContext = {
        root: testDir,
        cwd: testDir,
        head: () => Promise.resolve("test-commit"),
        now: () => new Date().toISOString(),
      };

      await withGitVan(mockContext, async () => {
        const template = await useTemplate({ paths: [templateDir] });
        const plan = await template.plan("idempotent.njk", {
          comment: "Auto-generated",
        });
        const result = await template.apply(plan);

        expect(result.status).toBe("OK");
        expect(result.operations[0].status).toBe("OK");
        expect(result.operations[0].changed).toBe(false); // Should not change due to idempotency

        // Verify content wasn't duplicated
        const content = await fs.readFile(targetPath, "utf8");
        const occurrences = (content.match(/\/\/ Auto-generated/g) || [])
          .length;
        expect(occurrences).toBe(1); // Should only appear once
      });
    });
  });
});
