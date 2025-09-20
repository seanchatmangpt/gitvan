// Test individual workflow components to find what actually works
import { describe, it, expect } from "vitest";
import { withMemFSTestEnvironment } from "../src/composables/test-environment.mjs";
import { StepRunner } from "../src/workflow/step-runner.mjs";
import { ContextManager } from "../src/workflow/context-manager.mjs";
import { useTemplate } from "../src/composables/template.mjs";
import { useGraph } from "../src/composables/graph.mjs";
import { readFile } from "node:fs/promises";

describe("Workflow System Component Testing", () => {
  describe("Template Rendering - StepRunner vs useTemplate", () => {
    it("should test if StepRunner template execution actually works", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Template Test\n",
          },
        },
        async (env) => {
          // Simple test data
          const testData = {
            name: "John Doe",
            count: 5,
            items: [
              { id: 1, name: "Item 1" },
              { id: 2, name: "Item 2" },
              { id: 3, name: "Item 3" }
            ]
          };

          // Simple template
          const templateContent = `Hello {{ name }}!

You have {{ count }} items:
{% for item in items %}
- {{ item.name }} (ID: {{ item.id }})
{% endfor %}

Generated at: {{ "now" | date("YYYY-MM-DD") }}`;

          // Test StepRunner
          const stepRunner = new StepRunner();
          const contextManager = new ContextManager();
          await contextManager.initialize({
            workflowId: "test",
            inputs: testData,
            startTime: Date.now()
          });

          const templateStep = {
            id: "test-step",
            type: "template",
            config: {
              template: templateContent,
              filePath: "./output/test-template.md"
            }
          };

          try {
            const result = await stepRunner.executeStep(
              templateStep,
              contextManager,
              null,
              null
            );

            console.log("StepRunner result:", result);
            console.log("Success:", result.success);
            console.log("Content length:", result.outputs?.content?.length);
            console.log("Content preview:", result.outputs?.content?.substring(0, 200));

            // Check if file was created
            try {
              const fileContent = await readFile("./output/test-template.md", "utf8");
              console.log("File created successfully, length:", fileContent.length);
              console.log("File content preview:", fileContent.substring(0, 200));
            } catch (fileError) {
              console.log("File creation failed:", fileError.message);
            }

            expect(result.success).toBe(true);
          } catch (error) {
            console.log("StepRunner failed:", error.message);
            console.log("Stack:", error.stack);
            throw error;
          }
        }
      );
    });

    it("should test if useTemplate composable works directly", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Direct Template Test\n",
          },
        },
        async (env) => {
          // Simple test data
          const testData = {
            name: "Jane Smith",
            count: 3,
            items: [
              { id: 1, name: "Product A" },
              { id: 2, name: "Product B" }
            ]
          };

          // Simple template
          const templateContent = `Hello {{ name }}!

You have {{ count }} items:
{% for item in items %}
- {{ item.name }} (ID: {{ item.id }})
{% endfor %}

Generated at: {{ "now" | date("YYYY-MM-DD") }}`;

          try {
            // Test useTemplate directly
            const template = await useTemplate();
            const rendered = template.renderString(templateContent, testData);

            console.log("useTemplate result length:", rendered.length);
            console.log("useTemplate content preview:", rendered.substring(0, 200));

            expect(rendered).toContain("Hello Jane Smith!");
            expect(rendered).toContain("You have 3 items:");
            expect(rendered).toContain("Product A");
            expect(rendered).toContain("Product B");

            console.log("✅ useTemplate composable works correctly");
          } catch (error) {
            console.log("useTemplate failed:", error.message);
            console.log("Stack:", error.stack);
            throw error;
          }
        }
      );
    });
  });

  describe("SPARQL Query Execution", () => {
    it("should test if SPARQL queries work in StepRunner", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "test-data.ttl": `@prefix ex: <http://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:user1 rdf:type ex:User ;
    ex:name "John Doe" ;
    ex:age "30" .

ex:user2 rdf:type ex:User ;
    ex:name "Jane Smith" ;
    ex:age "25" .`,
          },
        },
        async (env) => {
          // Load test data
          const testDataContent = await readFile("test-data.ttl", "utf8");
          const store = new (await import("n3")).Store();
          const parser = new (await import("n3")).Parser();
          store.addQuads(parser.parse(testDataContent));

          const graph = useGraph(store);

          // Test StepRunner with SPARQL
          const stepRunner = new StepRunner();
          const contextManager = new ContextManager();
          await contextManager.initialize({
            workflowId: "sparql-test",
            inputs: {},
            startTime: Date.now()
          });

          const sparqlStep = {
            id: "test-sparql",
            type: "sparql",
            config: {
              query: `
                PREFIX ex: <http://example.org/>
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                
                SELECT ?name ?age WHERE {
                    ?user rdf:type ex:User .
                    ?user ex:name ?name .
                    ?user ex:age ?age .
                } ORDER BY ?age DESC
              `,
              outputMapping: '{"users": "results", "count": "results.length"}'
            }
          };

          try {
            const result = await stepRunner.executeStep(
              sparqlStep,
              contextManager,
              graph,
              null
            );

            console.log("SPARQL StepRunner result:", result);
            console.log("Success:", result.success);
            console.log("Results count:", result.outputs?.results?.length);
            console.log("Results:", result.outputs?.results);

            expect(result.success).toBe(true);
            expect(result.outputs.results).toHaveLength(2);
            expect(result.outputs.results[0].name.value).toBe("John Doe"); // Older first
            expect(result.outputs.results[1].name.value).toBe("Jane Smith");

            console.log("✅ SPARQL execution in StepRunner works");
          } catch (error) {
            console.log("SPARQL StepRunner failed:", error.message);
            console.log("Stack:", error.stack);
            throw error;
          }
        }
      );
    });
  });

  describe("File Operations", () => {
    it("should test if file operations work in StepRunner", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# File Operations Test\n",
          },
        },
        async (env) => {
          const stepRunner = new StepRunner();
          const contextManager = new ContextManager();
          await contextManager.initialize({
            workflowId: "file-test",
            inputs: { content: "Test file content", count: 42 },
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

          try {
            const result = await stepRunner.executeStep(
              fileStep,
              contextManager,
              null,
              null
            );

            console.log("File StepRunner result:", result);
            console.log("Success:", result.success);

            // Check if file was created
            try {
              const fileContent = await readFile("./output/test-file.txt", "utf8");
              console.log("File content:", fileContent);
              expect(fileContent).toContain("Hello Test file content!");
              expect(fileContent).toContain("Count: 42");
              console.log("✅ File operations work in StepRunner");
            } catch (fileError) {
              console.log("File read failed:", fileError.message);
              throw fileError;
            }

            expect(result.success).toBe(true);
          } catch (error) {
            console.log("File StepRunner failed:", error.message);
            console.log("Stack:", error.stack);
            throw error;
          }
        }
      );
    });
  });
});
