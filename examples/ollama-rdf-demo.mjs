#!/usr/bin/env node
/**
 * Ollama RDF Demo
 * Demonstrates AI-powered RDF data processing, validation, and generation using Ollama models
 */

import { useOllamaRDF } from "../src/rdf-to-zod/useOllamaRDF.mjs";
import { withGitVan } from "../src/core/context.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

async function demonstrateOllamaRDF() {
  console.log("🤖 Ollama RDF Integration Demo");
  console.log("=".repeat(50));

  const testDir = join(process.cwd(), "demo-ollama-rdf");
  mkdirSync(testDir, { recursive: true });
  mkdirSync(join(testDir, "graph"), { recursive: true });

  await withGitVan({ cwd: testDir }, async () => {
    // Initialize Ollama RDF
    const ollamaRDF = await useOllamaRDF({
      model: "qwen3-coder", // Use qwen3-coder model
      graphDir: join(testDir, "graph"),
    });

    console.log("🧠 1. Generating RDF Ontology from Natural Language");
    console.log("-".repeat(40));

    const description =
      "A software development team management system with developers, projects, tasks, and sprints";

    const ontology = await ollamaRDF.generateOntology(description);
    console.log("Generated Ontology:");
    console.log(ontology);

    // Save ontology to file
    writeFileSync(join(testDir, "graph/generated-ontology.ttl"), ontology);

    console.log("\n🔍 2. Generating SPARQL Query from Natural Language");
    console.log("-".repeat(40));

    const queryDescription =
      "Find all developers who are working on active projects";
    const sparqlQuery = await ollamaRDF.generateSPARQLQuery(
      queryDescription,
      ontology
    );
    console.log("Generated SPARQL Query:");
    console.log(sparqlQuery);

    console.log("\n📋 3. Generating Zod Schema from RDF Ontology");
    console.log("-".repeat(40));

    const zodSchema = await ollamaRDF.generateZodSchemaFromOntology(
      ontology,
      "Developer"
    );
    console.log("Generated Zod Schema:");
    console.log(zodSchema);

    console.log("\n📊 4. Generating RDF Data from Structured Input");
    console.log("-".repeat(40));

    const structuredData = {
      developers: [
        {
          name: "Alice Chen",
          email: "alice@example.com",
          role: "Senior Developer",
          skills: ["JavaScript", "TypeScript", "React"],
          experience: 5,
          isActive: true,
        },
        {
          name: "Bob Rodriguez",
          email: "bob@example.com",
          role: "Full Stack Developer",
          skills: ["Python", "Django", "PostgreSQL"],
          experience: 8,
          isActive: true,
        },
      ],
      projects: [
        {
          name: "Knowledge Hook System",
          description: "AI-powered RDF processing system",
          status: "active",
          startDate: "2025-01-20",
          endDate: "2025-02-17",
        },
      ],
    };

    const rdfData = await ollamaRDF.generateRDFData(structuredData, ontology);
    console.log("Generated RDF Data:");
    console.log(rdfData);

    // Save RDF data to file
    writeFileSync(join(testDir, "graph/generated-data.ttl"), rdfData);

    console.log("\n✅ 5. Validating RDF Data using AI");
    console.log("-".repeat(40));

    const validation = await ollamaRDF.validateRDFData(rdfData, ontology);
    console.log("Validation Results:");
    console.log(JSON.stringify(validation, null, 2));

    console.log("\n🎯 6. Generating Knowledge Hook Definition");
    console.log("-".repeat(40));

    const hookDescription =
      "Hook that triggers when a developer completes a task";
    const knowledgeHook = await ollamaRDF.generateKnowledgeHook(
      hookDescription,
      ontology
    );
    console.log("Generated Knowledge Hook:");
    console.log(knowledgeHook);

    // Save knowledge hook to file
    writeFileSync(join(testDir, "graph/generated-hook.ttl"), knowledgeHook);

    console.log("\n📚 7. Generating Comprehensive RDF Documentation");
    console.log("-".repeat(40));

    const documentation = await ollamaRDF.generateRDFDocumentation(ontology);
    console.log("Generated Documentation:");
    console.log(documentation);

    // Save documentation to file
    writeFileSync(join(testDir, "RDF-DOCUMENTATION.md"), documentation);

    console.log("\n🔄 8. Complete RDF Workflow");
    console.log("-".repeat(40));

    const workflowDescription =
      "A project management system with teams, milestones, and deliverables";
    const workflowResult = await ollamaRDF.completeRDFWorkflow(
      workflowDescription
    );

    console.log("Workflow Results:");
    console.log(
      `✅ Ontology Generated: ${workflowResult.ontology.length} characters`
    );
    console.log(
      `✅ Sample Data Generated: ${workflowResult.sampleData.length} characters`
    );
    console.log(`✅ Validation Score: ${workflowResult.score}/100`);
    console.log(
      `✅ Documentation Generated: ${workflowResult.documentation.length} characters`
    );

    console.log("\n🎪 9. Knowledge Hook System Generation");
    console.log("-".repeat(40));

    const systemDescription =
      "A code review system with reviewers, pull requests, and feedback";
    const hookSystem = await ollamaRDF.generateKnowledgeHookSystem(
      systemDescription
    );

    console.log("Knowledge Hook System Results:");
    console.log(`✅ Ontology: ${hookSystem.ontology.length} characters`);
    console.log(`✅ Hooks Generated: ${hookSystem.hooks.length}`);
    console.log(`✅ SPARQL Queries: ${hookSystem.queries.length}`);
    console.log(`✅ Zod Schemas: ${hookSystem.schemas.length}`);
    console.log(`✅ Sample Data: ${hookSystem.sampleData.length} characters`);
    console.log(
      `✅ Documentation: ${hookSystem.documentation.length} characters`
    );

    // Save complete system to files
    writeFileSync(
      join(testDir, "graph/system-ontology.ttl"),
      hookSystem.ontology
    );
    writeFileSync(
      join(testDir, "graph/system-data.ttl"),
      hookSystem.sampleData
    );
    writeFileSync(
      join(testDir, "SYSTEM-DOCUMENTATION.md"),
      hookSystem.documentation
    );

    console.log("\n🚀 10. Streaming RDF Generation");
    console.log("-".repeat(40));

    console.log("Generating RDF ontology with streaming...");
    const streamDescription =
      "A machine learning model training system with datasets, models, and experiments";

    let streamedOntology = "";
    for await (const chunk of ollamaRDF.generateOntologyStream(
      streamDescription
    )) {
      streamedOntology += chunk;
      process.stdout.write(chunk);
    }

    console.log("\n\nStreaming completed!");

    // Save streamed ontology
    writeFileSync(
      join(testDir, "graph/streamed-ontology.ttl"),
      streamedOntology
    );

    console.log("\n✅ Ollama RDF Integration Demo Complete!");
    console.log("=".repeat(50));
    console.log("📁 Generated files:");
    console.log("  - graph/generated-ontology.ttl");
    console.log("  - graph/generated-data.ttl");
    console.log("  - graph/generated-hook.ttl");
    console.log("  - graph/system-ontology.ttl");
    console.log("  - graph/system-data.ttl");
    console.log("  - graph/streamed-ontology.ttl");
    console.log("  - RDF-DOCUMENTATION.md");
    console.log("  - SYSTEM-DOCUMENTATION.md");
  });
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateOllamaRDF().catch(console.error);
}

export { demonstrateOllamaRDF };
