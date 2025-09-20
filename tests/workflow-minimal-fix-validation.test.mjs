// Minimal test to validate workflow system fixes
import { describe, it, expect } from "vitest";
import { withMemFSTestEnvironment } from "../src/composables/test-environment.mjs";
import { StepRunner } from "../src/workflow/step-runner.mjs";
import { ContextManager } from "../src/workflow/context-manager.mjs";
import { useTemplate } from "../src/composables/template.mjs";
import { readFile } from "node:fs/promises";

describe("Workflow System - Minimal Fix Validation", () => {
  it("should render basic templates", async () => {
    await withMemFSTestEnvironment(
      {
        initialFiles: {
          "README.md": "# Test\n",
        },
      },
      async (env) => {
        const testData = {
          name: "John Doe",
          count: 3,
        };

        const templateContent = "Hello {{ name }}! Count: {{ count }}";

        const stepRunner = new StepRunner();
        const contextManager = new ContextManager();
        await contextManager.initialize({
          workflowId: "test",
          inputs: testData,
          startTime: Date.now(),
        });

        const templateStep = {
          id: "test-template",
          type: "template",
          config: {
            template: templateContent,
            filePath: "./output/test.txt",
          },
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
        expect(content).toContain("Count: 3");

        console.log("✅ Basic template rendering works");
      }
    );
  });

  it("should test useTemplate directly", async () => {
    await withMemFSTestEnvironment(
      {
        initialFiles: {
          "README.md": "# Test\n",
        },
      },
      async (env) => {
        const testData = {
          name: "Jane Smith",
        };

        const templateContent = "Hello {{ name }}!";

        const template = await useTemplate();
        const rendered = template.renderString(templateContent, testData);

        expect(rendered).toContain("Hello Jane Smith!");

        console.log("✅ useTemplate works directly");
      }
    );
  });

  it("should create directories before writing files", async () => {
    await withMemFSTestEnvironment(
      {
        initialFiles: {
          "README.md": "# Test\n",
        },
      },
      async (env) => {
        const stepRunner = new StepRunner();
        const contextManager = new ContextManager();
        await contextManager.initialize({
          workflowId: "file-test",
          inputs: { content: "Test content" },
          startTime: Date.now(),
        });

        const fileStep = {
          id: "test-file",
          type: "file",
          config: {
            filePath: "./output/test-file.txt",
            operation: "write",
            content: "Hello {{ content }}!",
          },
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

        console.log("✅ File operations with directory creation work");
      }
    );
  });
});
