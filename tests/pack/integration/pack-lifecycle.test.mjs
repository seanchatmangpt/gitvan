import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TemplateProcessor } from "../../../src/pack/operations/template-processor.mjs";
import { TransformProcessor } from "../../../src/pack/operations/transform-processor.mjs";
import { FileOperations } from "../../../src/pack/operations/file-ops.mjs";
import { JobInstaller } from "../../../src/pack/operations/job-installer.mjs";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { join } from "pathe";

const testDir = "/tmp/gitvan-integration-" + Date.now();

describe("Pack Operations Integration", () => {
  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should complete a full pack installation workflow", async () => {
    // Setup: Create a complete pack structure
    const packDir = join(testDir, "pack");
    const outputDir = join(testDir, "output");
    mkdirSync(packDir, { recursive: true });
    mkdirSync(outputDir, { recursive: true });

    // 1. Create template files
    const configTemplate = join(packDir, "config.json.njk");
    writeFileSync(
      configTemplate,
      `{
  "name": "{{inputs.projectName}}",
  "version": "{{inputs.version or '1.0.0'}}",
  "description": "{{inputs.description or 'Generated project'}}",
  "author": "{{inputs.author or 'Unknown'}}",
  "gitvan": {
    "installed": "{{nowISO}}",
    "template": "integration-test"
  }
}`
    );

    const readmeTemplate = join(packDir, "README.md.njk");
    writeFileSync(
      readmeTemplate,
      `---
title: Project README
mergeStrategy: replace
---
# {{inputs.projectName or 'My Project'}}

{{inputs.description or 'A project generated with GitVan'}}

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`bash
npm start
\`\`\`

Generated on {{nowISO}} using GitVan v2.
`
    );

    const jobFile = join(packDir, "build-job.mjs");
    writeFileSync(
      jobFile,
      `// Build job template
export default {
  name: 'build',
  description: 'Build the project',
  async run(context) {
    console.log('Building project...');
    return { status: 'success' };
  }
};`
    );

    // 2. Process templates
    const templateProcessor = new TemplateProcessor();

    const configResult = await templateProcessor.process(
      {
        src: configTemplate,
        target: join(outputDir, "package.json"),
        action: "write",
      },
      {
        projectName: "GitVan Integration Test",
        version: "2.0.0",
        description: "A test project for GitVan integration",
        author: "GitVan Team",
      }
    );

    const readmeResult = await templateProcessor.process(
      {
        src: readmeTemplate,
        target: join(outputDir, "README.md"),
        action: "write",
      },
      {
        projectName: "GitVan Integration Test",
        description: "A comprehensive test of GitVan pack operations",
      }
    );

    // 3. Copy files
    const fileOps = new FileOperations();
    const fileResult = await fileOps.apply({
      src: jobFile,
      target: join(outputDir, "scripts", "build.mjs"),
      action: "write",
    });

    // 4. Transform the generated config
    const transformProcessor = new TransformProcessor();
    const transformResult = await transformProcessor.apply({
      target: join(outputDir, "package.json"),
      kind: "json-merge",
      spec: {
        scripts: {
          build: "node scripts/build.mjs",
          test: 'echo "No tests specified"',
        },
        keywords: ["gitvan", "pack", "integration-test"],
      },
    });

    // 5. Install job
    const jobInstaller = new JobInstaller();
    const jobResult = await jobInstaller.install({
      src: jobFile,
      targetDir: join(outputDir, "jobs"),
      type: "job",
      id: "build-project",
    });

    // Verify all operations completed successfully
    expect(existsSync(configResult.target)).toBe(true);
    expect(existsSync(readmeResult.target)).toBe(true);
    expect(existsSync(fileResult.target)).toBe(true);
    expect(existsSync(jobResult.target)).toBe(true);

    // Verify content was processed correctly
    const generatedConfig = JSON.parse(
      readFileSync(join(outputDir, "package.json"), "utf8")
    );
    expect(generatedConfig.name).toBe("GitVan Integration Test");
    expect(generatedConfig.version).toBe("2.0.0");
    expect(generatedConfig.scripts.build).toBe("node scripts/build.mjs");
    expect(generatedConfig.keywords).toContain("gitvan");
    expect(generatedConfig.gitvan.installed).toBeDefined();

    const generatedReadme = readFileSync(join(outputDir, "README.md"), "utf8");
    expect(generatedReadme).toContain("# GitVan Integration Test");
    expect(generatedReadme).toContain("comprehensive test of GitVan");
    expect(generatedReadme).toContain("Generated on");

    const copiedScript = readFileSync(
      join(outputDir, "scripts", "build.mjs"),
      "utf8"
    );
    expect(copiedScript).toContain("Build job template");
    expect(copiedScript).toContain("export default");

    // Verify job was installed correctly
    expect(jobResult.id).toBe("build-project");
    expect(jobResult.type).toBe("job");
    expect(jobResult.target).toMatch(/build-project\.mjs$/);
  });

  it("should handle complex multi-step operations", async () => {
    // Test a more complex scenario with multiple transformations
    const workDir = join(testDir, "complex");
    mkdirSync(workDir, { recursive: true });

    // Create base configuration
    const baseConfig = join(workDir, "base.json");
    writeFileSync(
      baseConfig,
      JSON.stringify(
        {
          name: "base-project",
          version: "0.1.0",
        },
        null,
        2
      )
    );

    // Apply multiple transformations
    const processor = new TransformProcessor();

    // First transformation: add metadata
    await processor.apply({
      target: baseConfig,
      kind: "json-merge",
      spec: {
        description: "A complex multi-step project",
        keywords: ["complex", "multi-step"],
      },
    });

    // Second transformation: add scripts
    await processor.apply({
      target: baseConfig,
      kind: "json-merge",
      spec: {
        scripts: {
          start: "node index.js",
          test: "vitest",
        },
      },
    });

    // Third transformation: modify existing values
    await processor.apply({
      target: baseConfig,
      kind: "json-patch",
      spec: [
        { op: "replace", path: "version", value: "1.0.0" },
        { op: "add", path: "author", value: "GitVan Complex Test" },
      ],
    });

    // Verify final result
    const finalConfig = JSON.parse(readFileSync(baseConfig, "utf8"));
    expect(finalConfig.name).toBe("base-project");
    expect(finalConfig.version).toBe("1.0.0");
    expect(finalConfig.description).toBe("A complex multi-step project");
    expect(finalConfig.keywords).toEqual(["complex", "multi-step"]);
    expect(finalConfig.scripts.start).toBe("node index.js");
    expect(finalConfig.author).toBe("GitVan Complex Test");
  });

  it("should handle error scenarios gracefully", async () => {
    const errorDir = join(testDir, "errors");
    mkdirSync(errorDir, { recursive: true });

    // Test template processor with missing template
    const templateProcessor = new TemplateProcessor();
    await expect(
      templateProcessor.process({
        src: join(errorDir, "nonexistent.njk"),
        target: join(errorDir, "output.txt"),
        action: "write",
      })
    ).rejects.toThrow("Template not found");

    // Test transform processor with missing target
    const transformProcessor = new TransformProcessor();
    await expect(
      transformProcessor.apply({
        target: join(errorDir, "nonexistent.json"),
        kind: "json-merge",
        spec: { test: true },
      })
    ).rejects.toThrow("Transform target not found");

    // Test file operations with missing source
    const fileOps = new FileOperations();
    await expect(
      fileOps.apply({
        src: join(errorDir, "nonexistent.txt"),
        target: join(errorDir, "output.txt"),
        action: "write",
      })
    ).rejects.toThrow("Source file not found");

    // Test job installer with missing source
    const jobInstaller = new JobInstaller();
    await expect(
      jobInstaller.install({
        src: join(errorDir, "nonexistent.mjs"),
        targetDir: join(errorDir, "jobs"),
        type: "job",
      })
    ).rejects.toThrow("job source not found");
  });
});
