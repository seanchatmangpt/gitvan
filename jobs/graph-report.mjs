/**
 * GitVan Graph Report Job - Knowledge Hook Integration
 * Demonstrates RDF/SPARQL data processing with Knowledge Hook system
 */

import { defineJob, useGit } from "file:///Users/sac/gitvan/src/index.mjs";
import { useGraph } from "../composables/graph.mjs";
import { HookOrchestrator } from "../src/hooks/HookOrchestrator.mjs";

export default defineJob({
  meta: {
    name: "graph-report",
    description:
      "Generate reports from RDF/SPARQL data using Knowledge Hook system",
    tags: ["graph", "rdf", "sparql", "knowledge-hooks"],
    version: "1.0.0",
  },
  // Git hooks provide signals for Knowledge Hook evaluation
  hooks: ["post-commit"],
  async run(context) {
    console.log("🔄 Starting graph report generation with Knowledge Hook integration...");

    try {
      // Initialize Knowledge Hook Orchestrator
      const orchestrator = new HookOrchestrator({
        graphDir: "./hooks",
        context: { cwd: process.cwd() },
        logger: console,
      });

      // Get Git context for Knowledge Hook evaluation
      const git = useGit();
      const gitContext = {
        signalType: "post-commit",
        branch: await git.currentBranch(),
        commitSha: await git.headSha(),
        changedFiles: [], // Will be populated by Git signal processing
        timestamp: Date.now(),
      };

      // Evaluate Knowledge Hooks
      const evaluationResult = await orchestrator.evaluate({
        gitSignal: "post-commit",
        gitContext: gitContext,
        verbose: true,
      });

      console.log(`🧠 Knowledge Hooks evaluated: ${evaluationResult.hooksEvaluated}`);
      console.log(`⚡ Knowledge Hooks triggered: ${evaluationResult.hooksTriggered}`);

      // Initialize useGraph composable
      const g = await useGraph({
        baseIRI: "https://example.org/",
        snapshotsDir: "snapshots",
      });

      // Add data files (CSV and Turtle)
      await g.addFile("data/people.csv");
      await g.addFile("data/ontology.ttl");

      // Set SHACL shapes for validation
      await g.setShapes("shapes/validation.shacl.ttl");

      // Set SPARQL query
      await g.setQuery("queries/analysis.sparql");

      // Set template with front-matter
      await g.setTemplate("templates/report.md");

      // Run the complete pipeline
      const report = await g.run();

      // Write the generated report
      await useGit().writeFile("REPORT.md", report);

      console.log("✅ Graph report generated successfully with Knowledge Hook integration");
      console.log(`🧠 Knowledge Hook workflows executed: ${evaluationResult.workflowsExecuted}`);

      return {
        ok: true,
        artifacts: ["REPORT.md"],
        summary: "Generated RDF/SPARQL report with Knowledge Hook integration",
        knowledgeHooksEvaluated: evaluationResult.hooksEvaluated,
        knowledgeHooksTriggered: evaluationResult.hooksTriggered,
        knowledgeHookWorkflowsExecuted: evaluationResult.workflowsExecuted,
      };
    } catch (error) {
      console.error("❌ Graph report generation with Knowledge Hook integration failed:", error.message);
      return {
        ok: false,
        error: error.message,
        summary: "Failed to generate RDF/SPARQL report with Knowledge Hook integration",
      };
    }
  },
});





