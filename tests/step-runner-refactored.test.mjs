// tests/step-runner-refactored.test.mjs
// Test the refactored modular StepRunner

import { describe, it, expect, beforeEach } from "vitest";
import { StepRunner } from "../src/workflow/StepRunner.mjs";
import { withMemFSTestEnvironment } from "../src/composables/test-environment.mjs";
import { useTurtle } from "../src/composables/turtle.mjs";

describe("Refactored StepRunner", () => {
  let stepRunner;

  beforeEach(() => {
    stepRunner = new StepRunner({
      logger: console,
      defaultTimeout: 5000,
    });
  });

  it("should register default step handlers", () => {
    const registeredTypes = stepRunner.getRegisteredStepTypes();

    expect(registeredTypes).toContain("sparql");
    expect(registeredTypes).toContain("template");
    expect(registeredTypes).toContain("file");
    expect(registeredTypes).toContain("http");
    expect(registeredTypes).toContain("git");
  });

  it("should check if step types are supported", () => {
    expect(stepRunner.isStepTypeSupported("sparql")).toBe(true);
    expect(stepRunner.isStepTypeSupported("template")).toBe(true);
    expect(stepRunner.isStepTypeSupported("file")).toBe(true);
    expect(stepRunner.isStepTypeSupported("http")).toBe(true);
    expect(stepRunner.isStepTypeSupported("git")).toBe(true);
    expect(stepRunner.isStepTypeSupported("unknown")).toBe(false);
  });

  it("should execute SPARQL step with enhanced useGraph integration", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      // Create a simple Turtle file with test data
      const turtleContent = `
@prefix ex: <http://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:test-project rdf:type ex:Project ;
    ex:name "Test Project" ;
    ex:status "active" .
`;

      await env.files.write("test.ttl", turtleContent);

      // Load Turtle data - we need to use the native filesystem for useTurtle
      // Copy the file to a temporary location that useTurtle can read
      const { promises: fs } = await import("node:fs");
      const { join } = await import("node:path");
      const tempDir = await fs.mkdtemp(join(process.cwd(), "test-turtle-"));
      const tempFile = join(tempDir, "test.ttl");
      await fs.writeFile(tempFile, turtleContent, "utf8");

      const turtle = await useTurtle({ graphDir: tempDir });
      const { useGraph } = await import("../src/composables/graph.mjs");
      const graph = useGraph(turtle.store);

      // Clean up temp directory after test
      setTimeout(async () => {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (e) {
          // Ignore cleanup errors
        }
      }, 1000);

      // Create a mock context manager
      const contextManager = {
        get: async (key) => {
          const context = {
            projectName: "Test Project",
            status: "active",
          };
          return context[key] || null;
        },
        set: async (key, value) => {
          // Mock set operation
        },
      };

      // Define SPARQL step
      const step = {
        id: "test-sparql",
        type: "sparql",
        config: {
          query: `
            SELECT ?project ?name ?status WHERE {
              ?project rdf:type ex:Project .
              ?project ex:name ?name .
              ?project ex:status ?status .
            }
          `,
        },
      };

      // Execute step
      const result = await stepRunner.executeStep(
        step,
        contextManager,
        graph,
        turtle,
        { verbose: true, files: env.files }
      );

      // Validate result
      expect(result.success).toBe(true);
      expect(result.stepType).toBe("sparql");
      expect(result.handlerUsed).toBe("sparql");
      expect(result.outputs).toBeDefined();
      expect(result.outputs.type).toBe("select");
      expect(result.outputs.results).toBeDefined();
      expect(result.outputs.results.length).toBeGreaterThan(0);
      expect(result.outputs.queryMetadata).toBeDefined();
      expect(result.outputs.queryMetadata.resultCount).toBe(1);
    });
  });

  it("should execute template step with useTemplate integration", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      // Create template directory
      await env.files.mkdir("templates");

      // Create a simple template
      const templateContent = `
# {{ projectName }}

Status: {{ status }}
Generated at: {{ timestamp }}

## Project Details
- Name: {{ projectName }}
- Status: {{ status }}
- Created: {{ timestamp }}
`;

      await env.files.write("templates/project-template.md", templateContent);

      // Create mock context manager
      const contextManager = {
        get: async (key) => {
          const context = {
            projectName: "Test Project",
            status: "active",
            timestamp: "2024-01-01T00:00:00Z",
          };
          return context[key] || null;
        },
        set: async (key, value) => {
          // Mock set operation
        },
      };

      // Define template step with inline template
      const step = {
        id: "test-template",
        type: "template",
        config: {
          template: `
# {{ projectName }}

Status: {{ status }}
Generated at: {{ timestamp }}

## Project Details
- Name: {{ projectName }}
- Status: {{ status }}
- Created: {{ timestamp }}
`,
          outputPath: "output/project-report.md",
        },
        inputMapping: {
          projectName: "projectName",
          status: "status",
          timestamp: "timestamp",
        },
      };

      // Execute step
      const result = await stepRunner.executeStep(
        step,
        contextManager,
        null,
        null,
        { verbose: true, files: env.files }
      );

      // Validate result
      expect(result.success).toBe(true);
      expect(result.stepType).toBe("template");
      expect(result.handlerUsed).toBe("template");
      expect(result.outputs).toBeDefined();
      expect(result.outputs.outputPath).toBeDefined();
      expect(result.outputs.contentLength).toBeGreaterThan(0);

      // Verify file was created
      const outputContent = await env.files.read("output/project-report.md");
      expect(outputContent).toContain("Test Project");
      expect(outputContent).toContain("active");
    });
  });

  it("should execute file step with template rendering", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      // Create mock context manager
      const contextManager = {
        get: async (key) => {
          const context = {
            projectName: "Test Project",
            content: "This is test content",
          };
          return context[key] || null;
        },
        set: async (key, value) => {
          // Mock set operation
        },
      };

      // Define file step with template content
      const step = {
        id: "test-file",
        type: "file",
        config: {
          operation: "write",
          filePath: "output/test-file.md",
          content: "# {{ projectName }}\n\n{{ content }}",
        },
        inputMapping: {
          projectName: "projectName",
          content: "content",
        },
      };

      // Execute step
      const result = await stepRunner.executeStep(
        step,
        contextManager,
        null,
        null,
        { verbose: true, files: env.files }
      );

      // Validate result
      expect(result.success).toBe(true);
      expect(result.stepType).toBe("file");
      expect(result.handlerUsed).toBe("file");
      expect(result.outputs).toBeDefined();
      expect(result.outputs.operation).toBe("write");
      expect(result.outputs.rendered).toBe(true);

      // Verify file was created with rendered content
      const fileContent = await env.files.read("output/test-file.md");
      expect(fileContent).toContain("# Test Project");
      expect(fileContent).toContain("This is test content");
    });
  });

  it("should handle unknown step types gracefully", async () => {
    const step = {
      id: "test-unknown",
      type: "unknown",
      config: {},
    };

    const contextManager = {
      get: async () => null,
      set: async () => {},
    };

    const result = await stepRunner.executeStep(
      step,
      contextManager,
      null,
      null,
      { verbose: true }
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain(
      "No handler registered for step type: unknown"
    );
  });

  it("should validate step configuration", async () => {
    const invalidStep = {
      id: "test-invalid",
      type: "sparql",
      config: {
        // Missing required 'query' field
      },
    };

    const contextManager = {
      get: async () => null,
      set: async () => {},
    };

    const result = await stepRunner.executeStep(
      invalidStep,
      contextManager,
      null,
      null,
      { verbose: true }
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("SPARQL step missing query configuration");
  });
});
