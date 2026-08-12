import { describe, expect, it } from "vitest";
import { mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
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

function sparqlWorkflow() {
  return `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:query-ready rdf:type gh:Hook ;
  gv:title "Query Ready" ;
  gh:orderedPipelines ex:query-pipeline .

ex:query-pipeline rdf:type op:Pipeline ;
  op:steps ex:query-step .

ex:query-step rdf:type gv:SparqlStep ;
  gv:text "SELECT ?s WHERE { ?s a <https://gitvan.dev/graph-hook#Hook> }" .
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
  it("receipts source observations and executes an admitted command through StepRunner", async () => {
    const rootDir = mkdtempSync(join(tmpdir(), "gitvan-workflow-"));
    writeFileSync(join(rootDir, "workflow.ttl"), workflow(`${process.execPath} --version`));

    const engine = new WorkflowEngine({ graphDir: rootDir, enterprisePolicy: policy(rootDir) });
    await engine.initialize();

    const listed = await engine.listWorkflows();
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({ id: "http://example.org/fortune-ready", title: "Fortune Ready", pipelineCount: 1 });
    expect(engine.observationReceipts).toHaveLength(4);

    const result = await engine.executeWorkflow("fortune-ready");
    expect(result.status).toBe("completed");
    expect(result.standing).toBe("EXECUTED");
    expect(result.executedSteps).toBe(1);
    expect(result.steps[0].success).toBe(true);
    expect(result.steps[0].receipts).toHaveLength(2);
    expect(result.observationReceipts).toHaveLength(4);
  });

  it("stops the workflow and propagates typed refusal when a step lacks authority", async () => {
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

  it("admits bounded in-memory SPARQL against the explicit graph adapter", async () => {
    const rootDir = mkdtempSync(join(tmpdir(), "gitvan-workflow-"));
    writeFileSync(join(rootDir, "query.ttl"), sparqlWorkflow());

    const engine = new WorkflowEngine({ graphDir: rootDir, enterprisePolicy: policy(rootDir) });
    await engine.initialize();
    const result = await engine.executeWorkflow("query-ready");

    expect(result.status).toBe("completed");
    expect(result.steps[0].standing).toBe("EXECUTED");
    expect(result.steps[0].outputs.type).toBe("select");
    expect(result.steps[0].outputs.hasResults).toBe(true);
    expect(result.steps[0].outputs.results[0].s.value).toBe("http://example.org/query-ready");
  });

  it("refuses malformed Turtle before it becomes admitted workflow topology", async () => {
    const rootDir = mkdtempSync(join(tmpdir(), "gitvan-workflow-"));
    writeFileSync(join(rootDir, "broken.ttl"), "@prefix ex: <http://example.org/> . ex:a ex:b [");
    const engine = new WorkflowEngine({ graphDir: rootDir, enterprisePolicy: policy(rootDir) });
    await expect(engine.initialize()).rejects.toMatchObject({ code: "WORKFLOW_TURTLE_REFUSED" });
  });

  it("refuses a symlinked workflow source that resolves outside the admitted root", async () => {
    if (process.platform === "win32") return;
    const rootDir = mkdtempSync(join(tmpdir(), "gitvan-workflow-root-"));
    const outside = mkdtempSync(join(tmpdir(), "gitvan-workflow-outside-"));
    writeFileSync(join(outside, "outside.ttl"), workflow(`${process.execPath} --version`));
    const link = join(rootDir, "workflows");
    symlinkSync(outside, link, "dir");

    const engine = new WorkflowEngine({ graphDir: link, enterprisePolicy: policy(rootDir) });
    await expect(engine.initialize()).rejects.toMatchObject({ code: "FILESYSTEM_SYMLINK_REFUSED" });
  });
});
