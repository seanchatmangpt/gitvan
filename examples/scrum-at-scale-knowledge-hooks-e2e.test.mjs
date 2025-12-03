import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { HookOrchestrator } from "../src/hooks/HookOrchestrator.mjs";
import { withGitVan } from "../src/core/context.mjs";

describe("Scrum at Scale Knowledge Hooks - E2E Test", () => {
  let testDir;
  let orchestrator;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(process.cwd(), "test-scrum-at-scale");
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });

    // Initialize Git repository
    execSync("git init", { cwd: testDir });
    execSync('git config user.email "test@example.com"', { cwd: testDir });
    execSync('git config user.name "Test User"', { cwd: testDir });

    // Create hooks directory
    const hooksDir = join(testDir, "hooks");
    mkdirSync(hooksDir, { recursive: true });

    // Create logs directory
    mkdirSync(join(testDir, "logs"), { recursive: true });

    // Create Scrum at Scale ontology
    const ontologyContent = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix scrum: <http://example.org/scrum#> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

# Scrum at Scale Ontology
scrum:Sprint rdf:type owl:Class .
scrum:Story rdf:type owl:Class .
scrum:Developer rdf:type owl:Class .
scrum:Impediment rdf:type owl:Class .
scrum:Team rdf:type owl:Class .

# Properties
scrum:hasStory rdf:type owl:ObjectProperty ;
    rdfs:domain scrum:Sprint ;
    rdfs:range scrum:Story .

scrum:storyTitle rdf:type owl:DatatypeProperty ;
    rdfs:domain scrum:Story ;
    rdfs:range xsd:string .

scrum:storyStatus rdf:type owl:DatatypeProperty ;
    rdfs:domain scrum:Story ;
    rdfs:range xsd:string .

scrum:storyPoints rdf:type owl:DatatypeProperty ;
    rdfs:domain scrum:Story ;
    rdfs:range xsd:integer .

scrum:developerName rdf:type owl:DatatypeProperty ;
    rdfs:domain scrum:Developer ;
    rdfs:range xsd:string .

scrum:developerCapacity rdf:type owl:DatatypeProperty ;
    rdfs:domain scrum:Developer ;
    rdfs:range xsd:integer .

scrum:impedimentTitle rdf:type owl:DatatypeProperty ;
    rdfs:domain scrum:Impediment ;
    rdfs:range xsd:string .

scrum:impedimentSeverity rdf:type owl:DatatypeProperty ;
    rdfs:domain scrum:Impediment ;
    rdfs:range xsd:string .

scrum:impedimentStatus rdf:type owl:DatatypeProperty ;
    rdfs:domain scrum:Impediment ;
    rdfs:range xsd:string .

# GitVan specific properties
gv:id rdf:type owl:DatatypeProperty ;
    rdfs:domain owl:Thing ;
    rdfs:range xsd:string .

gv:active rdf:type owl:DatatypeProperty ;
    rdfs:domain owl:Thing ;
    rdfs:range xsd:boolean .`;

    writeFileSync(join(hooksDir, "scrum-at-scale-ontology.ttl"), ontologyContent);

    // Create Scrum at Scale data
    const dataContent = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix scrum: <http://example.org/scrum#> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

# Sprint 1
scrum:sprint1 rdf:type scrum:Sprint ;
    gv:id "sprint1" ;
    gv:active true .

# Stories
scrum:story1 rdf:type scrum:Story ;
    gv:id "story1" ;
    gv:active true ;
    scrum:storyTitle "Knowledge Hook Registry" ;
    scrum:storyStatus "Done" ;
    scrum:storyPoints 8 .

scrum:story2 rdf:type scrum:Story ;
    gv:id "story2" ;
    gv:active true ;
    scrum:storyTitle "SPARQL Predicate Engine" ;
    scrum:storyStatus "In Progress" ;
    scrum:storyPoints 13 .

scrum:story3 rdf:type scrum:Story ;
    gv:id "story3" ;
    gv:active true ;
    scrum:storyTitle "Ollama AI Provider" ;
    scrum:storyStatus "To Do" ;
    scrum:storyPoints 5 .

scrum:story4 rdf:type scrum:Story ;
    gv:id "story4" ;
    gv:active true ;
    scrum:storyTitle "RDF to Zod Conversion" ;
    scrum:storyStatus "Done" ;
    scrum:storyPoints 3 .

# Developers
scrum:dev1 rdf:type scrum:Developer ;
    gv:id "dev1" ;
    gv:active true ;
    scrum:developerName "Alice Johnson" ;
    scrum:developerCapacity 85 .

scrum:dev2 rdf:type scrum:Developer ;
    gv:id "dev2" ;
    gv:active true ;
    scrum:developerName "Bob Smith" ;
    scrum:developerCapacity 70 .

scrum:dev3 rdf:type scrum:Developer ;
    gv:id "dev3" ;
    gv:active true ;
    scrum:developerName "Carol Davis" ;
    scrum:developerCapacity 90 .

# Impediments
scrum:impediment1 rdf:type scrum:Impediment ;
    gv:id "impediment1" ;
    gv:active true ;
    scrum:impedimentTitle "Database Performance Issues" ;
    scrum:impedimentSeverity "Critical" ;
    scrum:impedimentStatus "Open" .`;

    writeFileSync(join(hooksDir, "scrum-at-scale-data.ttl"), dataContent);

    // Create Sprint Progress Hook
    const sprintProgressHook = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix scrum: <http://example.org/scrum#> .
@prefix gv: <https://gitvan.dev/ontology#> .

gh:sprint-progress-hook rdf:type gh:Hook ;
    dct:title "Sprint Progress Monitor" ;
    gh:hasPredicate gh:sprint-progress-predicate ;
    gh:orderedPipelines ( gh:sprint-progress-workflow ) .

gh:sprint-progress-predicate rdf:type gh:SELECTThreshold ;
    gh:queryText """
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX scrum: <http://example.org/scrum#>
        PREFIX gv: <http://example.org/gitvan#>
        
        SELECT ?storyTitle ?storyStatus ?storyPoints
        WHERE {
            ?story rdf:type scrum:Story .
            ?story gv:active true .
            ?story scrum:storyTitle ?storyTitle .
            ?story scrum:storyStatus ?storyStatus .
            ?story scrum:storyPoints ?storyPoints .
        }
    """ ;
    gh:threshold 1 .

gh:sprint-progress-workflow rdf:type gh:Workflow ;
    op:steps ( gh:log-step ) .

gh:log-step rdf:type gv:FileStep ;
    gv:filePath "./logs/sprint-progress.log" ;
    gv:content "Sprint Progress Hook Triggered" .`;

    writeFileSync(join(hooksDir, "sprint-progress-hook.ttl"), sprintProgressHook);

    // Create Impediment Escalation Hook
    const impedimentHook = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix scrum: <http://example.org/scrum#> .
@prefix gv: <https://gitvan.dev/ontology#> .

gh:impediment-escalation-hook rdf:type gh:Hook ;
    dct:title "Impediment Escalation Alert" ;
    gh:hasPredicate gh:impediment-predicate ;
    gh:orderedPipelines ( gh:impediment-workflow ) .

gh:impediment-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX scrum: <http://example.org/scrum#>
        PREFIX gv: <http://example.org/gitvan#>
        
        ASK WHERE {
            ?impediment rdf:type scrum:Impediment .
            ?impediment gv:active true .
            ?impediment scrum:impedimentSeverity "Critical" .
            ?impediment scrum:impedimentStatus "Open" .
        }
    """ .

gh:impediment-workflow rdf:type gh:Workflow ;
    op:steps ( gh:impediment-log-step ) .

gh:impediment-log-step rdf:type gv:FileStep ;
    gv:filePath "./logs/impediment-escalation.log" ;
    gv:content "Critical Impediment Detected" .`;

    writeFileSync(join(hooksDir, "impediment-escalation-hook.ttl"), impedimentHook);

    // Create Developer Workload Hook
    const developerHook = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix scrum: <http://example.org/scrum#> .
@prefix gv: <https://gitvan.dev/ontology#> .

gh:developer-workload-hook rdf:type gh:Hook ;
    dct:title "Developer Workload Monitor" ;
    gh:hasPredicate gh:developer-predicate ;
    gh:orderedPipelines ( gh:developer-workflow ) .

gh:developer-predicate rdf:type gh:SELECTThreshold ;
    gh:queryText """
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX scrum: <http://example.org/scrum#>
        PREFIX gv: <http://example.org/gitvan#>
        
        SELECT ?developerName ?developerCapacity
        WHERE {
            ?developer rdf:type scrum:Developer .
            ?developer gv:active true .
            ?developer scrum:developerName ?developerName .
            ?developer scrum:developerCapacity ?developerCapacity .
        }
    """ ;
    gh:threshold 1 .

gh:developer-workflow rdf:type gh:Workflow ;
    op:steps ( gh:developer-log-step ) .

gh:developer-log-step rdf:type gv:FileStep ;
    gv:filePath "./logs/developer-workload.log" ;
    gv:content "Developer Workload Hook Triggered" .`;

    writeFileSync(join(hooksDir, "developer-workload-hook.ttl"), developerHook);

    // Commit all files
    execSync("git add .", { cwd: testDir });
    execSync('git commit -m "Add Scrum at Scale Knowledge Hooks"', { cwd: testDir });

    // Initialize HookOrchestrator
    await withGitVan({ cwd: testDir }, async () => {
      orchestrator = new HookOrchestrator({
        graphDir: hooksDir,
        context: { cwd: testDir },
      });
    });
  });

  afterEach(() => {
    if (testDir && existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("Scrum at Scale Knowledge Hooks E2E", () => {
    it("should evaluate sprint progress hook", async () => {
      const evaluationResult = await orchestrator.evaluate();

      // Debug: Check what's in the knowledge graph
      const stats = await orchestrator.getStats();
      console.log("DEBUG: stats =", JSON.stringify(stats, null, 2));

      expect(evaluationResult).toBeDefined();
      expect(evaluationResult.success).toBe(true);
      expect(evaluationResult.hooksEvaluated).toBeGreaterThan(0);

      // Find the sprint progress hook result in metadata
      const sprintProgressResult = evaluationResult.metadata.evaluationResults.find(
        (r) => r.hookId === "https://gitvan.dev/graph-hook#sprint-progress-hook"
      );

      expect(sprintProgressResult).toBeDefined();
      expect(sprintProgressResult.triggered).toBe(true);
      expect(sprintProgressResult.predicateType).toBe("SELECT");

      // Verify triggered hooks include sprint progress
      const triggeredHook = evaluationResult.triggeredHooks.find(
        (h) => h.id === "https://gitvan.dev/graph-hook#sprint-progress-hook"
      );
      expect(triggeredHook).toBeDefined();
      expect(triggeredHook.title).toBeDefined();
    });

    it("should evaluate impediment escalation hook", async () => {
      const evaluationResult = await orchestrator.evaluate();

      expect(evaluationResult).toBeDefined();
      expect(evaluationResult.success).toBe(true);
      expect(evaluationResult.hooksEvaluated).toBeGreaterThan(0);

      // Find the impediment escalation hook result in metadata
      const impedimentResult = evaluationResult.metadata.evaluationResults.find(
        (r) => r.hookId === "https://gitvan.dev/graph-hook#impediment-escalation-hook"
      );

      expect(impedimentResult).toBeDefined();
      expect(impedimentResult.triggered).toBe(true);
      expect(impedimentResult.predicateType).toBe("ASK");

      // Verify triggered hooks include impediment escalation
      const triggeredHook = evaluationResult.triggeredHooks.find(
        (h) => h.id === "https://gitvan.dev/graph-hook#impediment-escalation-hook"
      );
      expect(triggeredHook).toBeDefined();
      expect(triggeredHook.title).toBeDefined();
    });

    it("should evaluate developer workload hook", async () => {
      const evaluationResult = await orchestrator.evaluate();

      expect(evaluationResult).toBeDefined();
      expect(evaluationResult.success).toBe(true);
      expect(evaluationResult.hooksEvaluated).toBeGreaterThan(0);

      // Find the developer workload hook result in metadata
      const developerResult = evaluationResult.metadata.evaluationResults.find(
        (r) => r.hookId === "https://gitvan.dev/graph-hook#developer-workload-hook"
      );

      expect(developerResult).toBeDefined();
      expect(developerResult.triggered).toBe(true);
      expect(developerResult.predicateType).toBe("SELECT");

      // Verify triggered hooks include developer workload
      const triggeredHook = evaluationResult.triggeredHooks.find(
        (h) => h.id === "https://gitvan.dev/graph-hook#developer-workload-hook"
      );
      expect(triggeredHook).toBeDefined();
      expect(triggeredHook.title).toBeDefined();
    });

    it("should execute workflows for triggered hooks", async () => {
      const evaluationResult = await orchestrator.evaluate();

      expect(evaluationResult).toBeDefined();
      expect(evaluationResult.success).toBe(true);
      expect(evaluationResult.hooksTriggered).toBeGreaterThan(0);
      expect(evaluationResult.workflowsExecuted).toBeGreaterThan(0);

      // Verify executions were recorded
      expect(evaluationResult.executions).toBeDefined();
      expect(Array.isArray(evaluationResult.executions)).toBe(true);
      expect(evaluationResult.executions.length).toBeGreaterThan(0);

      // Check that workflow execution was logged
      const logFile = join(testDir, "logs", "sprint-progress.log");
      expect(existsSync(logFile)).toBe(true);

      const logContent = readFileSync(logFile, "utf-8");
      expect(logContent).toContain("Sprint Progress Hook Triggered");
      expect(logContent).toContain("Knowledge Hook Registry");
    });

    it("should handle multiple hook evaluations concurrently", async () => {
      const promises = Array(5)
        .fill()
        .map(() => orchestrator.evaluate());

      const results = await Promise.all(promises);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(5);

      results.forEach((evaluationResult) => {
        expect(evaluationResult).toBeDefined();
        expect(evaluationResult.success).toBe(true);
        expect(evaluationResult.hooksEvaluated).toBeGreaterThan(0);
      });

      // Verify consistency across evaluations
      const firstResult = results[0];
      results.forEach((result) => {
        expect(result.hooksEvaluated).toBe(firstResult.hooksEvaluated);
      });
    });

    it("should provide comprehensive sprint metrics", async () => {
      const evaluationResult = await orchestrator.evaluate();

      expect(evaluationResult).toBeDefined();
      expect(evaluationResult.success).toBe(true);
      expect(evaluationResult.hooksEvaluated).toBeGreaterThan(0);

      // Verify sprint progress hook was triggered
      const sprintProgressResult = evaluationResult.metadata.evaluationResults.find(
        (r) => r.hookId === "https://gitvan.dev/graph-hook#sprint-progress-hook"
      );

      expect(sprintProgressResult).toBeDefined();
      expect(sprintProgressResult.triggered).toBe(true);

      // Verify triggered hooks include sprint progress
      const triggeredHook = evaluationResult.triggeredHooks.find(
        (h) => h.id === "https://gitvan.dev/graph-hook#sprint-progress-hook"
      );
      expect(triggeredHook).toBeDefined();
      expect(triggeredHook.title).toBeDefined();

      // Verify workflow execution
      expect(evaluationResult.workflowsExecuted).toBeGreaterThan(0);
      expect(evaluationResult.workflowsSuccessful).toBeGreaterThan(0);
    });

    it("should identify critical impediments", async () => {
      const evaluationResult = await orchestrator.evaluate();

      expect(evaluationResult).toBeDefined();
      expect(evaluationResult.success).toBe(true);
      expect(evaluationResult.hooksEvaluated).toBeGreaterThan(0);

      // Find impediment escalation result
      const impedimentResult = evaluationResult.metadata.evaluationResults.find(
        (r) => r.hookId === "https://gitvan.dev/graph-hook#impediment-escalation-hook"
      );

      expect(impedimentResult).toBeDefined();
      expect(impedimentResult.triggered).toBe(true);

      // Verify impediment escalation workflow was triggered
      const logFile = join(testDir, "logs", "impediment-escalation.log");
      expect(existsSync(logFile)).toBe(true);

      const logContent = readFileSync(logFile, "utf-8");
      expect(logContent).toContain("Critical Impediment Detected");
      expect(logContent).toContain("Database Performance Issues");
    });

    it("should track developer capacity", async () => {
      const evaluationResult = await orchestrator.evaluate();

      expect(evaluationResult).toBeDefined();
      expect(evaluationResult.success).toBe(true);
      expect(evaluationResult.hooksEvaluated).toBeGreaterThan(0);

      // Find developer workload result
      const developerResult = evaluationResult.metadata.evaluationResults.find(
        (r) => r.hookId === "https://gitvan.dev/graph-hook#developer-workload-hook"
      );

      expect(developerResult).toBeDefined();
      expect(developerResult.triggered).toBe(true);

      // Verify triggered hooks include developer workload
      const triggeredHook = evaluationResult.triggeredHooks.find(
        (h) => h.id === "https://gitvan.dev/graph-hook#developer-workload-hook"
      );
      expect(triggeredHook).toBeDefined();
      expect(triggeredHook.title).toBeDefined();

      // Verify workflow execution
      expect(evaluationResult.workflowsExecuted).toBeGreaterThan(0);
      expect(evaluationResult.workflowsSuccessful).toBeGreaterThan(0);
    });

    it("should provide orchestrator statistics", async () => {
      const stats = await orchestrator.getStats();

      expect(stats).toBeDefined();
      expect(stats.hooksLoaded).toBeGreaterThan(0);
      expect(stats.contextInitialized).toBe(true);
      expect(stats.graphSize).toBeGreaterThan(0);
      expect(stats.gitNativeIO).toBeDefined();
    });
  });

  describe("Scrum at Scale Integration Scenarios", () => {
    it("should simulate daily scrum meeting scenario", async () => {
      // Simulate daily scrum by evaluating all hooks
      const evaluationResult = await orchestrator.evaluate();

      expect(evaluationResult).toBeDefined();
      expect(evaluationResult.success).toBe(true);

      // Verify all hooks executed successfully
      expect(evaluationResult.hooksEvaluated).toBe(3);
      expect(evaluationResult.hooksTriggered).toBeGreaterThan(0);
      expect(evaluationResult.workflowsExecuted).toBeGreaterThan(0);

      // Verify sprint progress was tracked
      const sprintProgress = evaluationResult.metadata.evaluationResults.find(
        (r) => r.hookId === "https://gitvan.dev/graph-hook#sprint-progress-hook"
      );
      expect(sprintProgress).toBeDefined();
      expect(sprintProgress.triggered).toBe(true);

      // Verify impediments were identified
      const impediments = evaluationResult.metadata.evaluationResults.find(
        (r) => r.hookId === "https://gitvan.dev/graph-hook#impediment-escalation-hook"
      );
      expect(impediments).toBeDefined();
      expect(impediments.triggered).toBe(true);

      // Verify developer capacity was assessed
      const developers = evaluationResult.metadata.evaluationResults.find(
        (r) => r.hookId === "https://gitvan.dev/graph-hook#developer-workload-hook"
      );
      expect(developers).toBeDefined();
      expect(developers.triggered).toBe(true);
    });

    it("should simulate sprint planning scenario", async () => {
      // Simulate sprint planning by running multiple evaluations
      const evaluationResult1 = await orchestrator.evaluate();
      const evaluationResult2 = await orchestrator.evaluate();

      expect(evaluationResult1).toBeDefined();
      expect(evaluationResult2).toBeDefined();
      expect(evaluationResult1.success).toBe(true);
      expect(evaluationResult2.success).toBe(true);

      // Both evaluations should be consistent
      expect(evaluationResult1.hooksEvaluated).toBe(evaluationResult2.hooksEvaluated);
      expect(evaluationResult1.hooksEvaluated).toBe(3);

      // Verify sprint progress consistency
      const sprint1 = evaluationResult1.metadata.evaluationResults.find((r) => r.hookId === "https://gitvan.dev/graph-hook#sprint-progress-hook");
      const sprint2 = evaluationResult2.metadata.evaluationResults.find((r) => r.hookId === "https://gitvan.dev/graph-hook#sprint-progress-hook");

      expect(sprint1).toBeDefined();
      expect(sprint2).toBeDefined();
      expect(sprint1.triggered).toBe(sprint2.triggered);

      // Verify impediment detection consistency
      const impediment1 = evaluationResult1.metadata.evaluationResults.find(
        (r) => r.hookId === "https://gitvan.dev/graph-hook#impediment-escalation-hook"
      );
      const impediment2 = evaluationResult2.metadata.evaluationResults.find(
        (r) => r.hookId === "https://gitvan.dev/graph-hook#impediment-escalation-hook"
      );

      expect(impediment1).toBeDefined();
      expect(impediment2).toBeDefined();
      expect(impediment1.triggered).toBe(impediment2.triggered);
    });

    it("should simulate impediment resolution scenario", async () => {
      const evaluationResult = await orchestrator.evaluate();

      expect(evaluationResult).toBeDefined();
      expect(evaluationResult.success).toBe(true);
      expect(evaluationResult.hooksEvaluated).toBeGreaterThan(0);

      // Verify impediment escalation hook triggers
      const impedimentResult = evaluationResult.metadata.evaluationResults.find(
        (r) => r.hookId === "https://gitvan.dev/graph-hook#impediment-escalation-hook"
      );

      expect(impedimentResult).toBeDefined();
      expect(impedimentResult.triggered).toBe(true);

      // Verify impediment resolution workflow was executed
      const logFile = join(testDir, "logs", "impediment-escalation.log");
      expect(existsSync(logFile)).toBe(true);

      const logContent = readFileSync(logFile, "utf-8");
      expect(logContent).toContain("Critical Impediment Detected");
      expect(logContent).toContain("Database Performance Issues");
      expect(logContent).toContain("Escalating to Scrum Master");
      expect(logContent).toContain("Notifying Development Team");
    });
  });
});