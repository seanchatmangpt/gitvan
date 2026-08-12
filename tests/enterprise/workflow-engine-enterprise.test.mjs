import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WorkflowEngine } from "../../src/workflow/workflow-engine.mjs";

function turtleString(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function workflow(command) {
  return `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:fortune-ready rdf:type gh:Hook ;
  gv:title "Fortune Ready" ;
  gh:orderedPipelines ex:fortune-pipeline .

ex:fortune-pipeline rdf:type op:Pipeline ;
  op:steps ex:version-step .

ex:version-step rdf:type gv:CliStep ;
  gv:command "${turtleString(command)}" .
`;
}

function policy(rootDir) {
  return {
    enabled: true,
    rootDir,
    actor: "test:workflow-engine",
    tenant: "fortune5-fixture",
    cli: { allowedCommands: [[process.execPath, "--version"]] },
    file: { allowedOperations: ["read"] },
    http: { allowedHosts: [], allowedMethods: ["GET"] },
  };
}

describe("WorkflowEngine admitted RDF graph execution", () => {
  it("loads Turtle, resolves a unique workflow slug, and executes through StepRunner receipts", async () => {
    const rootDir = mkdtempSync(join(tmpdir(), "gitvan-workflow-"));
    writeFileSync(join(rootDir, "workflow.ttl"), workflow(`${process.execPath} --version`));

    const engine = new WorkflowEngine({ graphDir: rootDir, enterprisePolicy: policy(rootDir) });
    await engine.initialize();

    const listed = await engine.listWorkflows();
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({ id: "http://example.org/fortune-ready", title: "Fortune Ready", pipelineCount: 1 });

    const result = await engine.executeWorkflow("fortune-ready");
    expect(result.status).toBe("completed");
    expect(result.standing).toBe("EXECUTED");
    expect(result.executedSteps).toBe(1);
    expect(result.steps[0].success).toBe(true);
    expect(result.steps[0].receipts).toHaveLength(2);
  });

  it("stops the workflow and propagates a typed refusal when a step lacks authority", async () => {
    const rootDir = mkdtempSync(join(tmpdir(), "gitvan-workflow-"));
    writeFileSync(join(rootDir, "workflow.ttl"), workflow("/bin/sh -c true"));

    const engine = new WorkflowEngine({ graphDir: rootDir, enterprisePolicy: policy(rootDir) });
    await engine.initialize();
    const result = await engine.executeWorkflow("fortune-ready");

    expect(result.status).toBe("failed");
    expect(result.standing).toBe("REFUSED");
    expect(result.executedSteps).toBe(1);
    expect(result.steps[0].errorCode).toBe("CLI_AUTHORITY_REFUSED");
    expect(result.steps[0].receipts).toHaveLength(1);
  });

  it("refuses malformed Turtle before it becomes admitted workflow topology", async () => {
    const rootDir = mkdtempSync(join(tmpdir(), "gitvan-workflow-"));
    writeFileSync(join(rootDir, "broken.ttl"), "@prefix ex: <http://example.org/> . ex:a ex:b [");
    const engine = new WorkflowEngine({ graphDir: rootDir, enterprisePolicy: policy(rootDir) });
    await expect(engine.initialize()).rejects.toMatchObject({ code: "WORKFLOW_TURTLE_REFUSED" });
  });
});
