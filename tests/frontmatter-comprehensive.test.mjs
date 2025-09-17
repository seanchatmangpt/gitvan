import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join, resolve } from "pathe";
import { useTemplate } from "../src/composables/template.mjs";

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

  it("should handle dry run without creating files", async () => {
    const templateContent = `---
to: "dry-run.txt"
---
Dry run content`;

    const templatePath = join(templateDir, "dry.njk");
    await fs.writeFile(templatePath, templateContent);

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
