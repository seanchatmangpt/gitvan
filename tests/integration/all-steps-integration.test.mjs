/**
 * All Steps Integration Test
 * Tests all step handlers working together in a real Turtle workflow
 */

import { describe, it, expect } from "vitest";
import { withNativeGitTestEnvironment } from "../../src/composables/test-environment.mjs";
import { WorkflowExecutor } from "../../src/workflow/WorkflowExecutor.mjs";
import { promises as fs } from "node:fs";
import { join } from "node:path";

describe("All Steps Integration Test", () => {
  it("should execute complete Turtle workflow with all step types", async () => {
    await withNativeGitTestEnvironment(
      {
        initialFiles: {
          "workflows/all-steps-integration.ttl": await fs.readFile(
            "tests/integration/all-steps-integration.ttl",
            "utf8"
          ),
        },
      },
      async (env) => {
        // Initialize workflow executor
        const executor = new WorkflowExecutor({
          graphDir: env.workflowsDir,
          logger: env.logger,
        });

        // Execute the workflow directly - WorkflowExecutor handles the parsing
        const result = await executor.execute(
          "http://example.org/AllStepsIntegrationWorkflow",
          {}
        );

        // Verify execution was successful
        expect(result.success).toBe(true);
        expect(result.steps).toHaveLength(5);

        // Verify each step executed successfully and returned proper data to workflow context
        const stepResults = result.steps;

        // SPARQL Step - Query executed and returned results
        expect(stepResults[0].success).toBe(true);
        expect(stepResults[0].outputs.type).toBe("select");
        expect(stepResults[0].outputs.results).toBeDefined();
        expect(stepResults[0].outputs.count).toBe(1);
        expect(stepResults[0].outputs.hasResults).toBe(true);

        // Template Step - Generated file with content
        expect(stepResults[1].success).toBe(true);
        expect(stepResults[1].outputs.outputPath).toBe(
          "test-results/integration-report.md"
        );
        expect(stepResults[1].outputs.content).toContain(
          "# GitVan Integration Test Results"
        );
        expect(stepResults[1].outputs.contentLength).toBeGreaterThan(0);

        // File Step - Created JSON file
        expect(stepResults[2].success).toBe(true);
        expect(stepResults[2].outputs.operation).toBe("write");
        expect(stepResults[2].outputs.filePath).toBe(
          "test-results/test-data.json"
        );
        expect(stepResults[2].outputs.contentLength).toBeGreaterThan(0);

        // HTTP Step - Made API call and received response
        expect(stepResults[3].success).toBe(true);
        expect(stepResults[3].outputs.status).toBe(200);
        expect(stepResults[3].outputs.responseData).toBeDefined();
        expect(stepResults[3].outputs.url).toBe("https://httpbin.org/json");

        // CLI Step - Executed command successfully
        expect(stepResults[4].success).toBe(true);
        expect(stepResults[4].outputs.exitCode).toBe(0);
        expect(stepResults[4].outputs.stdout).toContain(
          "Integration test completed successfully"
        );
        expect(stepResults[4].outputs.success).toBe(true);

        // Verify files were created in the current working directory
        const reportContent = await fs.readFile(
          "test-results/integration-report.md",
          "utf8"
        );
        expect(reportContent).toContain("# GitVan Integration Test Results");
        expect(reportContent).toContain("Integration Test");

        const dataContent = await fs.readFile(
          "test-results/test-data.json",
          "utf8"
        );
        const testData = JSON.parse(dataContent);
        expect(testData.testName).toBe("All Steps Integration Test");

        console.log("✅ All step handlers working together successfully!");
        console.log(`📊 Workflow executed ${result.steps.length} steps`);
        console.log(`📁 Generated files in test-results/`);
      }
    );
  });
});
