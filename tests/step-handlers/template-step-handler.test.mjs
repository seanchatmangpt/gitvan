/**
 * TemplateStepHandler Individual Test
 * Tests the template step handler in isolation to ensure it properly renders templates
 */

import { describe, it, expect } from "vitest";
import { TemplateStepHandler } from "../../src/workflow/step-handlers/template-step-handler.mjs";
import { withMemFSTestEnvironment } from "../../src/composables/test-environment.mjs";

describe("TemplateStepHandler", () => {
  it("should render inline template with variables", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      // Create handler
      const handler = new TemplateStepHandler();

      // Define step with inline template
      const step = {
        id: "test-inline",
        type: "template",
        config: {
          template: `
# {{ title }}

## Overview
{{ description }}

## Status
- **Current Status**: {{ status }}
- **Priority**: {{ priority }}
- **Created**: {{ created }}

## Tasks
{% for task in tasks %}
- [ ] {{ task.name }} ({{ task.priority }})
{% endfor %}
          `,
          outputPath: "output/test-template.md",
        },
      };

      // Define inputs
      const inputs = {
        title: "Project Alpha",
        description: "A test project for template rendering",
        status: "active",
        priority: "high",
        created: "2024-01-15",
        tasks: [
          { name: "Setup infrastructure", priority: "high" },
          { name: "Write documentation", priority: "medium" },
          { name: "Add tests", priority: "low" },
        ],
      };

      // Execute step
      const result = await handler.execute(step, inputs, { files: env.files });

      // Verify results
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.outputPath).toBe("output/test-template.md");
      expect(result.data.contentLength).toBeGreaterThan(0);
      expect(result.data.templateUsed).toBe("inline");

      // Verify file was created
      const content = await env.files.read("output/test-template.md");
      expect(content).toContain("# Project Alpha");
      expect(content).toContain("A test project for template rendering");
      expect(content).toContain("**Current Status**: active");
      expect(content).toContain("**Priority**: high");
      expect(content).toContain("- [ ] Setup infrastructure (high)");
      expect(content).toContain("- [ ] Write documentation (medium)");
      expect(content).toContain("- [ ] Add tests (low)");
    });
  });

  it("should render template from file", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      // Create template file in native filesystem for useTemplate
      const templateContent = `
# {{ project.name }}

## Description
{{ project.description }}

## Configuration
- **Environment**: {{ project.env }}
- **Version**: {{ project.version }}

## Dependencies
{% for dep in project.dependencies %}
- {{ dep.name }}@{{ dep.version }}
{% endfor %}
`;

      const { promises: fs } = await import("node:fs");
      const { join } = await import("node:path");
      const tempDir = await fs.mkdtemp(join(process.cwd(), "test-template-"));
      const templateFile = join(tempDir, "project-template.md");
      await fs.writeFile(templateFile, templateContent, "utf8");

      // Create handler
      const handler = new TemplateStepHandler();

      // Define step with template file
      const step = {
        id: "test-file-template",
        type: "template",
        config: {
          templatePath: "project-template.md",
          outputPath: "output/project-readme.md",
          paths: [tempDir], // Use the temp directory for templates
        },
      };

      // Define inputs
      const inputs = {
        project: {
          name: "GitVan",
          description: "Git-native development automation platform",
          env: "production",
          version: "2.0.1",
          dependencies: [
            { name: "n3", version: "^1.16.0" },
            { name: "nunjucks", version: "^3.2.4" },
            { name: "vitest", version: "^1.6.1" },
          ],
        },
      };

      // Execute step
      const result = await handler.execute(step, inputs, { files: env.files });

      // Verify results
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.outputPath).toBe("output/project-readme.md");
      expect(result.data.templateUsed).toBe("project-template.md");

      // Verify file was created
      const content = await env.files.read("output/project-readme.md");
      expect(content).toContain("# GitVan");
      expect(content).toContain("Git-native development automation platform");
      expect(content).toContain("**Environment**: production");
      expect(content).toContain("**Version**: 2.0.1");
      expect(content).toContain("- n3@^1.16.0");
      expect(content).toContain("- nunjucks@^3.2.4");
      expect(content).toContain("- vitest@^1.6.1");

      // Clean up
      await fs.rm(tempDir, { recursive: true, force: true });
    });
  });

  it("should handle template with filters", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      // Create handler
      const handler = new TemplateStepHandler();

      // Define step with template using filters
      const step = {
        id: "test-filters",
        type: "template",
        config: {
          template: `
# {{ title | capitalize }}

## Summary
{{ description | truncate(50) }}

## Metadata
- **Created**: {{ created | date("YYYY-MM-DD") }}
- **Tags**: {{ tags | join(", ") }}
- **Count**: {{ items | length }} items
          `,
          outputPath: "output/filtered-template.md",
        },
      };

      // Define inputs
      const inputs = {
        title: "test project",
        description:
          "This is a very long description that should be truncated when rendered",
        created: new Date("2024-01-15T10:30:00Z"),
        tags: ["javascript", "automation", "git"],
        items: ["item1", "item2", "item3", "item4"],
      };

      // Execute step
      const result = await handler.execute(step, inputs, { files: env.files });

      // Verify results
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // Verify file was created
      const content = await env.files.read("output/filtered-template.md");
      expect(content).toContain("# Test project"); // capitalize filter
      expect(content).toContain(
        "This is a very long description that should be"
      ); // truncate filter
      expect(content).toContain("**Created**: 2024-01-15"); // date filter
      expect(content).toContain("**Tags**: javascript, automation, git"); // join filter
      expect(content).toContain("**Count**: 4 items"); // length filter
    });
  });

  it("should handle missing template gracefully", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      // Create handler
      const handler = new TemplateStepHandler();

      // Define step with missing template file
      const step = {
        id: "test-missing-template",
        type: "template",
        config: {
          templatePath: "templates/nonexistent-template.md",
          outputPath: "output/missing.md",
        },
      };

      // Execute step
      const result = await handler.execute(step, {}, { files: env.files });

      // Verify error handling
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("template not found");
    });
  });

  it("should handle missing template and templatePath", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      // Create handler
      const handler = new TemplateStepHandler();

      // Define step without template or templatePath
      const step = {
        id: "test-no-template",
        type: "template",
        config: {
          outputPath: "output/no-template.md",
        },
      };

      // Execute step
      const result = await handler.execute(step, {}, { files: env.files });

      // Verify error handling
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("No template or templatePath provided");
    });
  });

  it("should create output directory if it doesn't exist", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      // Create handler
      const handler = new TemplateStepHandler();

      // Define step with nested output path
      const step = {
        id: "test-nested-output",
        type: "template",
        config: {
          template: "# {{ title }}\n\n{{ content }}",
          outputPath: "deeply/nested/path/output.md",
        },
      };

      // Define inputs
      const inputs = {
        title: "Nested Output Test",
        content: "This file should be created in a nested directory structure.",
      };

      // Execute step
      const result = await handler.execute(step, inputs, { files: env.files });

      // Verify results
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.outputPath).toBe("deeply/nested/path/output.md");

      // Verify file was created in nested directory
      const content = await env.files.read("deeply/nested/path/output.md");
      expect(content).toContain("# Nested Output Test");
      expect(content).toContain(
        "This file should be created in a nested directory structure."
      );
    });
  });
});
