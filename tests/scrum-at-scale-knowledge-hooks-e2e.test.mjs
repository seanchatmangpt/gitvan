import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { HookOrchestrator } from "../src/hooks/HookOrchestrator.mjs";
import { withGitVan } from "../src/core/context.mjs";

describe("Scrum at Scale Knowledge Hooks - E2E Test", () => {
  let testDir;
  let orchestrator;

  beforeEach(async () => {
    testDir = join(process.cwd(), "test-scrum-at-scale");
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, "hooks"), { recursive: true });

    execSync("git init", { cwd: testDir, stdio: "inherit" });
    execSync('git config user.name "Scrum at Scale Test"', {
      cwd: testDir,
      stdio: "inherit",
    });
    execSync('git config user.email "scrum@test.com"', {
      cwd: testDir,
      stdio: "inherit",
    });

    // Create Scrum at Scale ontology
    writeFileSync(
      join(testDir, "hooks/scrum-at-scale-ontology.ttl"),
      `
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix scrum: <https://scrum.org/ontology#> .

# Scrum at Scale Classes
scrum:Sprint rdf:type owl:Class ;
    rdfs:label "Sprint" ;
    rdfs:comment "A time-boxed iteration in Scrum" .

scrum:Developer rdf:type owl:Class ;
    rdfs:label "Developer" ;
    rdfs:comment "A software developer" .

scrum:Story rdf:type owl:Class ;
    rdfs:label "Story" ;
    rdfs:comment "A user story" .

scrum:Impediment rdf:type owl:Class ;
    rdfs:label "Impediment" ;
    rdfs:comment "A blocker or impediment" .

scrum:Team rdf:type owl:Class ;
    rdfs:label "Team" ;
    rdfs:comment "A Scrum team" .

scrum:ScrumMaster rdf:type owl:Class ;
    rdfs:label "Scrum Master" ;
    rdfs:comment "A Scrum Master" .

scrum:ProductOwner rdf:type owl:Class ;
    rdfs:label "Product Owner" ;
    rdfs:comment "A Product Owner" .

# Properties
scrum:sprintName rdf:type owl:DatatypeProperty ;
    rdfs:domain scrum:Sprint ;
    rdfs:range xsd:string ;
    rdfs:label "sprintName" ;
    owl:cardinality 1 .

scrum:sprintGoal rdf:type owl:DatatypeProperty ;
    rdfs:domain scrum:Sprint ;
    rdfs:range xsd:string ;
    rdfs:label "sprintGoal" ;
    owl:cardinality 1 .

scrum:startDate rdf:type owl:DatatypeProperty ;
    rdfs:domain scrum:Sprint ;
    rdfs:range xsd:date ;
    rdfs:label "startDate" ;
    owl:cardinality 1 .

scrum:endDate rdf:type owl:DatatypeProperty ;
    rdfs:domain scrum:Sprint ;
    rdfs:range xsd:date ;
    rdfs:label "endDate" ;
    owl:cardinality 1 .

scrum:developerName rdf:type owl:DatatypeProperty ;
    rdfs:domain scrum:Developer ;
    rdfs:range xsd:string ;
    rdfs:label "developerName" ;
    owl:cardinality 1 .

scrum:developerEmail rdf:type owl:DatatypeProperty ;
    rdfs:domain scrum:Developer ;
    rdfs:range xsd:string ;
    rdfs:label "developerEmail" ;
    owl:cardinality 1 .

scrum:storyTitle rdf:type owl:DatatypeProperty ;
    rdfs:domain scrum:Story ;
    rdfs:range xsd:string ;
    rdfs:label "storyTitle" ;
    owl:cardinality 1 .

scrum:storyPoints rdf:type owl:DatatypeProperty ;
    rdfs:domain scrum:Story ;
    rdfs:range xsd:integer ;
    rdfs:label "storyPoints" ;
    owl:cardinality 1 .

scrum:storyStatus rdf:type owl:DatatypeProperty ;
    rdfs:domain scrum:Story ;
    rdfs:range xsd:string ;
    rdfs:label "storyStatus" ;
    owl:cardinality 1 .

scrum:impedimentTitle rdf:type owl:DatatypeProperty ;
    rdfs:domain scrum:Impediment ;
    rdfs:range xsd:string ;
    rdfs:label "impedimentTitle" ;
    owl:cardinality 1 .

scrum:impedimentAge rdf:type owl:DatatypeProperty ;
    rdfs:domain scrum:Impediment ;
    rdfs:range xsd:decimal ;
    rdfs:label "impedimentAge" ;
    owl:cardinality 1 .

scrum:impedimentSeverity rdf:type owl:DatatypeProperty ;
    rdfs:domain scrum:Impediment ;
    rdfs:range xsd:string ;
    rdfs:label "impedimentSeverity" ;
    owl:cardinality 1 .
`
    );

    // Create Scrum at Scale data
    writeFileSync(
      join(testDir, "hooks/scrum-at-scale-data.ttl"),
      `
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix scrum: <https://scrum.org/ontology#> .

# Sprint data
scrum:sprint-q1-2025 rdf:type scrum:Sprint ;
    scrum:sprintName "Q1 2025 Sprint - Knowledge Hooks + Ollama AI" ;
    scrum:sprintGoal "Complete Knowledge Hook system with Ollama AI integration" ;
    scrum:startDate "2025-01-20"^^xsd:date ;
    scrum:endDate "2025-02-17"^^xsd:date .

# Developer data
scrum:alice rdf:type scrum:Developer ;
    scrum:developerName "Alice Chen" ;
    scrum:developerEmail "alice@example.com" .

scrum:bob rdf:type scrum:Developer ;
    scrum:developerName "Bob Rodriguez" ;
    scrum:developerEmail "bob@example.com" .

scrum:carol rdf:type scrum:Developer ;
    scrum:developerName "Carol Kim" ;
    scrum:developerEmail "carol@example.com" .

# Story data
scrum:story-1 rdf:type scrum:Story ;
    scrum:storyTitle "Knowledge Hook Registry" ;
    scrum:storyPoints 8 ;
    scrum:storyStatus "done" .

scrum:story-2 rdf:type scrum:Story ;
    scrum:storyTitle "SPARQL Predicate Engine" ;
    scrum:storyPoints 13 ;
    scrum:storyStatus "done" .

scrum:story-3 rdf:type scrum:Story ;
    scrum:storyTitle "Ollama AI Provider" ;
    scrum:storyPoints 5 ;
    scrum:storyStatus "done" .

scrum:story-4 rdf:type scrum:Story ;
    scrum:storyTitle "RDF to Zod Conversion" ;
    scrum:storyPoints 8 ;
    scrum:storyStatus "in-progress" .

# Impediment data
scrum:impediment-1 rdf:type scrum:Impediment ;
    scrum:impedimentTitle "Ollama model loading performance issues" ;
    scrum:impedimentAge 72.5 ;
    scrum:impedimentSeverity "high" .

scrum:impediment-2 rdf:type scrum:Impediment ;
    scrum:impedimentTitle "Complex SPARQL queries causing timeouts" ;
    scrum:impedimentAge 48.0 ;
    scrum:impedimentSeverity "critical" .
`
    );

    // Create Knowledge Hooks for Scrum at Scale
    writeFileSync(
      join(testDir, "hooks/sprint-progress-hook.ttl"),
      `
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix scrum: <https://scrum.org/ontology#> .

gh:sprint-progress-hook rdf:type gh:Hook ;
    gh:id "sprint-progress-hook" ;
    gh:name "Sprint Progress Hook" ;
    gh:description "Monitors sprint progress and completion status" ;
    gh:predicate [
        gh:type "SELECT" ;
        gh:query """
            PREFIX scrum: <https://scrum.org/ontology#>
            SELECT ?storyTitle ?storyPoints ?storyStatus WHERE {
                ?story scrum:storyTitle ?storyTitle ;
                       scrum:storyPoints ?storyPoints ;
                       scrum:storyStatus ?storyStatus .
            }
        """
    ] ;
    gh:workflow [
        gh:steps (
            [ op:type "template" ; op:template "Sprint Progress: {{storyTitle}} - {{storyStatus}} ({{storyPoints}} points)" ]
        )
    ] .
`
    );

    writeFileSync(
      join(testDir, "hooks/impediment-escalation-hook.ttl"),
      `
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix scrum: <https://scrum.org/ontology#> .

gh:impediment-escalation-hook rdf:type gh:Hook ;
    gh:id "impediment-escalation-hook" ;
    gh:name "Impediment Escalation Hook" ;
    gh:description "Escalates critical impediments" ;
    gh:predicate [
        gh:type "ASK" ;
        gh:query """
            PREFIX scrum: <https://scrum.org/ontology#>
            ASK WHERE {
                ?impediment scrum:impedimentSeverity "critical" .
            }
        """
    ] ;
    gh:workflow [
        gh:steps (
            [ op:type "template" ; op:template "CRITICAL IMPEDIMENT: {{impedimentTitle}} - Age: {{impedimentAge}} hours" ]
        )
    ] .
`
    );

    writeFileSync(
      join(testDir, "hooks/developer-workload-hook.ttl"),
      `
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix scrum: <https://scrum.org/ontology#> .

gh:developer-workload-hook rdf:type gh:Hook ;
    gh:id "developer-workload-hook" ;
    gh:name "Developer Workload Hook" ;
    gh:description "Monitors developer workload and capacity" ;
    gh:predicate [
        gh:type "SELECT" ;
        gh:query """
            PREFIX scrum: <https://scrum.org/ontology#>
            SELECT ?developerName ?developerEmail WHERE {
                ?developer scrum:developerName ?developerName ;
                           scrum:developerEmail ?developerEmail .
            }
        """
    ] ;
    gh:workflow [
        gh:steps (
            [ op:type "template" ; op:template "Developer: {{developerName}} ({{developerEmail}})" ]
        )
    ] .
`
    );

    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "Add Scrum at Scale Knowledge Hooks"', {
      cwd: testDir,
      stdio: "inherit",
    });

    await withGitVan({ cwd: testDir }, async () => {
      orchestrator = new HookOrchestrator({
        graphDir: join(testDir, "hooks"),
        verbose: false,
      });
    });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("Scrum at Scale Knowledge Hooks E2E", () => {
    it("should evaluate sprint progress hook", async () => {
      const results = await orchestrator.evaluate();

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      // Find the sprint progress hook result
      const sprintProgressResult = results.find(
        (r) => r.hookId === "sprint-progress-hook"
      );

      expect(sprintProgressResult).toBeDefined();
      expect(sprintProgressResult.success).toBe(true);
      expect(sprintProgressResult.predicateType).toBe("SELECT");
      expect(sprintProgressResult.result).toBeDefined();
      expect(Array.isArray(sprintProgressResult.result)).toBe(true);
      expect(sprintProgressResult.result.length).toBeGreaterThan(0);

      // Verify story data
      const stories = sprintProgressResult.result;
      expect(
        stories.some((s) => s.storyTitle === "Knowledge Hook Registry")
      ).toBe(true);
      expect(
        stories.some((s) => s.storyTitle === "SPARQL Predicate Engine")
      ).toBe(true);
      expect(stories.some((s) => s.storyTitle === "Ollama AI Provider")).toBe(
        true
      );
      expect(
        stories.some((s) => s.storyTitle === "RDF to Zod Conversion")
      ).toBe(true);
    });

    it("should evaluate impediment escalation hook", async () => {
      const results = await orchestrator.evaluate();

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      // Find the impediment escalation hook result
      const impedimentResult = results.find(
        (r) => r.hookId === "impediment-escalation-hook"
      );

      expect(impedimentResult).toBeDefined();
      expect(impedimentResult.success).toBe(true);
      expect(impedimentResult.predicateType).toBe("ASK");
      expect(impedimentResult.result).toBe(true); // Should be true because there are critical impediments
    });

    it("should evaluate developer workload hook", async () => {
      const results = await orchestrator.evaluate();

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      // Find the developer workload hook result
      const developerResult = results.find(
        (r) => r.hookId === "developer-workload-hook"
      );

      expect(developerResult).toBeDefined();
      expect(developerResult.success).toBe(true);
      expect(developerResult.predicateType).toBe("SELECT");
      expect(developerResult.result).toBeDefined();
      expect(Array.isArray(developerResult.result)).toBe(true);
      expect(developerResult.result.length).toBeGreaterThan(0);

      // Verify developer data
      const developers = developerResult.result;
      expect(developers.some((d) => d.developerName === "Alice Chen")).toBe(
        true
      );
      expect(developers.some((d) => d.developerName === "Bob Rodriguez")).toBe(
        true
      );
      expect(developers.some((d) => d.developerName === "Carol Kim")).toBe(
        true
      );
    });

    it("should execute workflows for triggered hooks", async () => {
      const results = await orchestrator.evaluate();

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      // All hooks should have executed workflows
      results.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result.executionResults).toBeDefined();
        expect(Array.isArray(result.executionResults)).toBe(true);
        expect(result.executionResults.length).toBeGreaterThan(0);
      });
    });

    it("should handle multiple hook evaluations concurrently", async () => {
      // Run multiple evaluations concurrently
      const promises = Array.from({ length: 5 }, () => orchestrator.evaluate());
      const results = await Promise.all(promises);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(5);

      // Each evaluation should return the same results
      results.forEach((evaluationResults) => {
        expect(evaluationResults).toBeDefined();
        expect(Array.isArray(evaluationResults)).toBe(true);
        expect(evaluationResults.length).toBeGreaterThan(0);
      });
    });

    it("should provide comprehensive sprint metrics", async () => {
      const results = await orchestrator.evaluate();

      // Find sprint progress result
      const sprintProgressResult = results.find(
        (r) => r.hookId === "sprint-progress-hook"
      );

      expect(sprintProgressResult).toBeDefined();
      expect(sprintProgressResult.success).toBe(true);

      const stories = sprintProgressResult.result;

      // Calculate metrics
      const totalStories = stories.length;
      const completedStories = stories.filter(
        (s) => s.storyStatus === "done"
      ).length;
      const inProgressStories = stories.filter(
        (s) => s.storyStatus === "in-progress"
      ).length;
      const totalPoints = stories.reduce(
        (sum, s) => sum + parseInt(s.storyPoints),
        0
      );
      const completedPoints = stories
        .filter((s) => s.storyStatus === "done")
        .reduce((sum, s) => sum + parseInt(s.storyPoints), 0);

      expect(totalStories).toBe(4);
      expect(completedStories).toBe(3);
      expect(inProgressStories).toBe(1);
      expect(totalPoints).toBe(34); // 8 + 13 + 5 + 8
      expect(completedPoints).toBe(26); // 8 + 13 + 5

      // Calculate completion percentage
      const completionPercentage = (completedPoints / totalPoints) * 100;
      expect(completionPercentage).toBeCloseTo(76.47, 1);
    });

    it("should identify critical impediments", async () => {
      const results = await orchestrator.evaluate();

      // Find impediment escalation result
      const impedimentResult = results.find(
        (r) => r.hookId === "impediment-escalation-hook"
      );

      expect(impedimentResult).toBeDefined();
      expect(impedimentResult.success).toBe(true);
      expect(impedimentResult.result).toBe(true); // Critical impediments exist

      // Verify that critical impediments are identified
      expect(impedimentResult.result).toBe(true);
    });

    it("should track developer capacity", async () => {
      const results = await orchestrator.evaluate();

      // Find developer workload result
      const developerResult = results.find(
        (r) => r.hookId === "developer-workload-hook"
      );

      expect(developerResult).toBeDefined();
      expect(developerResult.success).toBe(true);

      const developers = developerResult.result;
      expect(developers.length).toBe(3);

      // Verify all developers are tracked
      const developerNames = developers.map((d) => d.developerName);
      expect(developerNames).toContain("Alice Chen");
      expect(developerNames).toContain("Bob Rodriguez");
      expect(developerNames).toContain("Carol Kim");
    });

    it("should provide orchestrator statistics", async () => {
      const stats = await orchestrator.getStats();

      expect(stats).toBeDefined();
      expect(stats.totalHooks).toBeGreaterThan(0);
      expect(stats.successfulEvaluations).toBeGreaterThan(0);
      expect(stats.failedEvaluations).toBe(0);
      expect(stats.totalExecutionTime).toBeGreaterThan(0);
      expect(stats.averageExecutionTime).toBeGreaterThan(0);
    });
  });

  describe("Scrum at Scale Integration Scenarios", () => {
    it("should simulate daily scrum meeting scenario", async () => {
      // Simulate daily scrum by evaluating all hooks
      const results = await orchestrator.evaluate();

      // Verify all hooks executed successfully
      expect(results.length).toBe(3);
      results.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result.executionResults).toBeDefined();
        expect(result.executionResults.length).toBeGreaterThan(0);
      });

      // Verify sprint progress is tracked
      const sprintProgressResult = results.find(
        (r) => r.hookId === "sprint-progress-hook"
      );
      expect(sprintProgressResult.result.length).toBe(4);

      // Verify impediments are monitored
      const impedimentResult = results.find(
        (r) => r.hookId === "impediment-escalation-hook"
      );
      expect(impedimentResult.result).toBe(true);

      // Verify team capacity is tracked
      const developerResult = results.find(
        (r) => r.hookId === "developer-workload-hook"
      );
      expect(developerResult.result.length).toBe(3);
    });

    it("should simulate sprint planning scenario", async () => {
      // Simulate sprint planning by evaluating hooks multiple times
      const results1 = await orchestrator.evaluate();
      const results2 = await orchestrator.evaluate();

      // Both evaluations should be consistent
      expect(results1.length).toBe(results2.length);
      expect(results1.length).toBe(3);

      // Verify sprint progress consistency
      const sprint1 = results1.find((r) => r.hookId === "sprint-progress-hook");
      const sprint2 = results2.find((r) => r.hookId === "sprint-progress-hook");

      expect(sprint1.result.length).toBe(sprint2.result.length);
      expect(sprint1.result.length).toBe(4);
    });

    it("should simulate impediment resolution scenario", async () => {
      const results = await orchestrator.evaluate();

      // Verify impediment escalation hook triggers
      const impedimentResult = results.find(
        (r) => r.hookId === "impediment-escalation-hook"
      );

      expect(impedimentResult).toBeDefined();
      expect(impedimentResult.success).toBe(true);
      expect(impedimentResult.result).toBe(true); // Critical impediments exist

      // Verify workflow execution for impediment escalation
      expect(impedimentResult.executionResults).toBeDefined();
      expect(impedimentResult.executionResults.length).toBeGreaterThan(0);
    });
  });
});
