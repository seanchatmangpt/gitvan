// Simple test to validate basic workflow system fixes
import { describe, it, expect } from "vitest";
import { withMemFSTestEnvironment } from "../src/composables/test-environment.mjs";
import { StepRunner } from "../src/workflow/StepRunner.mjs";
import { ContextManager } from "../src/workflow/ContextManager.mjs";
import { useTemplate } from "../src/composables/template.mjs";
import { readFile } from "node:fs/promises";

describe("Workflow System - Basic Fix Validation", () => {
  describe("Template System - Basic Filters", () => {
    it("should render templates with basic filters", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Template Test\n",
          },
        },
        async (env) => {
          const testData = {
            name: "John Doe",
            count: 3,
            items: [
              { name: "Item 1", price: 10.99 },
              { name: "Item 2", price: 25.50 }
            ]
          };

          const templateContent = `Hello {{ name }}!

You have {{ count }} items:
{% for item in items %}
- {{ item.name }}: ${{ item.price }}
{% endfor %}

Total: ${{ items | sum(attribute='price') | round(2) }}
Generated: {{ "now" | date("YYYY-MM-DD") }}`;

          const stepRunner = new StepRunner();
          const contextManager = new ContextManager();
          await contextManager.initialize({
            workflowId: "test",
            inputs: testData,
            startTime: Date.now()
          });

          const templateStep = {
            id: "test-template",
            type: "template",
            config: {
              template: templateContent,
              filePath: "./output/test-template.md"
            }
          };

          const result = await stepRunner.executeStep(
            templateStep,
            contextManager,
            null,
            null
          );

          expect(result.success).toBe(true);
          const content = result.outputs.content;
          expect(content).toContain("Hello John Doe!");
          expect(content).toContain("You have 3 items:");
          expect(content).toContain("Item 1: $10.99");
          expect(content).toContain("Item 2: $25.50");
          expect(content).toContain("Total: $36.49");

          const fileContent = await readFile("./output/test-template.md", "utf8");
          expect(fileContent).toBe(content);

          console.log("✅ Basic template system works");
        }
      );
    });

    it("should test useTemplate directly", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Direct Test\n",
          },
        },
        async (env) => {
          const testData = {
            name: "Jane Smith",
            items: [
              { name: "Product A", value: 100 },
              { name: "Product B", value: 200 }
            ]
          };

          const templateContent = `Hello {{ name }}!

Items: {{ items | length }}
Total: {{ items | sum(attribute='value') }}
Date: {{ "now" | date("YYYY-MM-DD") }}`;

          const template = await useTemplate();
          const rendered = template.renderString(templateContent, testData);

          expect(rendered).toContain("Hello Jane Smith!");
          expect(rendered).toContain("Items: 2");
          expect(rendered).toContain("Total: 300");

          console.log("✅ useTemplate works directly");
        }
      );
    });
  });

  describe("File Operations - Directory Creation", () => {
    it("should create directories before writing files", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# File Test\n",
          },
        },
        async (env) => {
          const stepRunner = new StepRunner();
          const contextManager = new ContextManager();
          await contextManager.initialize({
            workflowId: "file-test",
            inputs: { content: "Test content", count: 42 },
            startTime: Date.now()
          });

          const fileStep = {
            id: "test-file",
            type: "file",
            config: {
              filePath: "./output/test-file.txt",
              operation: "write",
              content: "Hello {{ content }}! Count: {{ count }}"
            }
          };

          const result = await stepRunner.executeStep(
            fileStep,
            contextManager,
            null,
            null
          );

          expect(result.success).toBe(true);

          const fileContent = await readFile("./output/test-file.txt", "utf8");
          expect(fileContent).toContain("Hello Test content!");
          expect(fileContent).toContain("Count: 42");

          console.log("✅ File operations with directory creation work");
        }
      );
    });
  });
});
