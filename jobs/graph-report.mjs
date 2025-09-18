/**
 * Example GitVan Job using useGraph Composable
 * Demonstrates RDF/SPARQL data processing with commit-scoped snapshots
 */

import { defineJob, useGit } from "file:///Users/sac/gitvan/src/index.mjs";
import { useGraph } from "../composables/graph.mjs";

export default defineJob({
  meta: {
    name: "graph-report",
    description:
      "Generate reports from RDF/SPARQL data using useGraph composable",
  },
  hooks: ["post-commit"],
  async run() {
    console.log("🔄 Starting graph report generation...");

    try {
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

      console.log("✅ Graph report generated successfully");

      return {
        ok: true,
        artifacts: ["REPORT.md"],
        summary: "Generated RDF/SPARQL report with commit-scoped snapshots",
      };
    } catch (error) {
      console.error("❌ Graph report generation failed:", error.message);
      return {
        ok: false,
        error: error.message,
        summary: "Failed to generate RDF/SPARQL report",
      };
    }
  },
});


