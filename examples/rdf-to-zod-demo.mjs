#!/usr/bin/env node
/**
 * RDF to Zod Integration Example
 * Demonstrates how to use RDF to Zod conversion with Knowledge Hooks
 */

import { useRDFToZod } from "../src/rdf-to-zod/useRDFToZod.mjs";
import { HookOrchestrator } from "../src/hooks/HookOrchestrator.mjs";
import { withGitVan } from "../src/core/context.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

async function demonstrateRDFToZodIntegration() {
  console.log("🔄 RDF to Zod Integration Demo");
  console.log("=".repeat(50));

  const testDir = join(process.cwd(), "demo-rdf-zod");
  mkdirSync(testDir, { recursive: true });
  mkdirSync(join(testDir, "graph"), { recursive: true });

  // Create demo RDF data
  writeFileSync(
    join(testDir, "graph/demo-ontology.ttl"),
    `
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix ex: <http://example.org/> .

# Scrum at Scale Ontology
ex:Sprint rdf:type owl:Class ;
    rdfs:label "Sprint" ;
    rdfs:comment "A time-boxed iteration in Scrum" .

ex:Developer rdf:type owl:Class ;
    rdfs:label "Developer" ;
    rdfs:comment "A software developer" .

ex:Story rdf:type owl:Class ;
    rdfs:label "Story" ;
    rdfs:comment "A user story" .

ex:Impediment rdf:type owl:Class ;
    rdfs:label "Impediment" ;
    rdfs:comment "A blocker or impediment" .

# Properties
ex:sprintName rdf:type owl:DatatypeProperty ;
    rdfs:domain ex:Sprint ;
    rdfs:range xsd:string ;
    owl:cardinality 1 .

ex:sprintGoal rdf:type owl:DatatypeProperty ;
    rdfs:domain ex:Sprint ;
    rdfs:range xsd:string ;
    owl:cardinality 1 .

ex:startDate rdf:type owl:DatatypeProperty ;
    rdfs:domain ex:Sprint ;
    rdfs:range xsd:date ;
    owl:cardinality 1 .

ex:endDate rdf:type owl:DatatypeProperty ;
    rdfs:domain ex:Sprint ;
    rdfs:range xsd:date ;
    owl:cardinality 1 .

ex:developerName rdf:type owl:DatatypeProperty ;
    rdfs:domain ex:Developer ;
    rdfs:range xsd:string ;
    owl:cardinality 1 .

ex:developerEmail rdf:type owl:DatatypeProperty ;
    rdfs:domain ex:Developer ;
    rdfs:range xsd:string ;
    owl:cardinality 1 .

ex:storyTitle rdf:type owl:DatatypeProperty ;
    rdfs:domain ex:Story ;
    rdfs:range xsd:string ;
    owl:cardinality 1 .

ex:storyPoints rdf:type owl:DatatypeProperty ;
    rdfs:domain ex:Story ;
    rdfs:range xsd:integer ;
    owl:cardinality 1 .

ex:storyStatus rdf:type owl:DatatypeProperty ;
    rdfs:domain ex:Story ;
    rdfs:range xsd:string ;
    owl:cardinality 1 .

ex:impedimentTitle rdf:type owl:DatatypeProperty ;
    rdfs:domain ex:Impediment ;
    rdfs:range xsd:string ;
    owl:cardinality 1 .

ex:impedimentAge rdf:type owl:DatatypeProperty ;
    rdfs:domain ex:Impediment ;
    rdfs:range xsd:decimal ;
    owl:cardinality 1 .

ex:impedimentSeverity rdf:type owl:DatatypeProperty ;
    rdfs:domain ex:Impediment ;
    rdfs:range xsd:string ;
    owl:cardinality 1 .
`
  );

  writeFileSync(
    join(testDir, "graph/demo-data.ttl"),
    `
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix ex: <http://example.org/> .

# Sprint data
ex:sprint-q1-2025 rdf:type ex:Sprint ;
    ex:sprintName "Q1 2025 Sprint - Knowledge Hooks + Ollama AI" ;
    ex:sprintGoal "Complete Knowledge Hook system with Ollama AI integration" ;
    ex:startDate "2025-01-20"^^xsd:date ;
    ex:endDate "2025-02-17"^^xsd:date .

# Developer data
ex:alice rdf:type ex:Developer ;
    ex:developerName "Alice Chen" ;
    ex:developerEmail "alice@example.com" .

ex:bob rdf:type ex:Developer ;
    ex:developerName "Bob Rodriguez" ;
    ex:developerEmail "bob@example.com" .

ex:carol rdf:type ex:Developer ;
    ex:developerName "Carol Kim" ;
    ex:developerEmail "carol@example.com" .

# Story data
ex:story-1 rdf:type ex:Story ;
    ex:storyTitle "Knowledge Hook Registry" ;
    ex:storyPoints 8 ;
    ex:storyStatus "done" .

ex:story-2 rdf:type ex:Story ;
    ex:storyTitle "SPARQL Predicate Engine" ;
    ex:storyPoints 13 ;
    ex:storyStatus "done" .

ex:story-3 rdf:type ex:Story ;
    ex:storyTitle "Ollama AI Provider" ;
    ex:storyPoints 5 ;
    ex:storyStatus "done" .

ex:story-4 rdf:type ex:Story ;
    ex:storyTitle "RDF to Zod Conversion" ;
    ex:storyPoints 8 ;
    ex:storyStatus "in-progress" .

# Impediment data
ex:impediment-1 rdf:type ex:Impediment ;
    ex:impedimentTitle "Ollama model loading performance issues" ;
    ex:impedimentAge 72.5 ;
    ex:impedimentSeverity "high" .

ex:impediment-2 rdf:type ex:Impediment ;
    ex:impedimentTitle "Complex SPARQL queries causing timeouts" ;
    ex:impedimentAge 48.0 ;
    ex:impedimentSeverity "critical" .
`
  );

  await withGitVan({ cwd: testDir }, async () => {
    // Initialize RDF to Zod converter
    const rdfToZod = await useRDFToZod({
      graphDir: join(testDir, "graph"),
    });

    console.log("📊 1. Querying Sprint Data with Zod Validation");
    console.log("-".repeat(40));

    const sprintQuery = `
      PREFIX ex: <http://example.org/>
      SELECT ?sprintName ?sprintGoal ?startDate ?endDate WHERE {
        ?sprint ex:sprintName ?sprintName ;
                ex:sprintGoal ?sprintGoal ;
                ex:startDate ?startDate ;
                ex:endDate ?endDate .
      }
    `;

    const sprintSchema = z.object({
      sprintName: z.string(),
      sprintGoal: z.string(),
      startDate: z.string(),
      endDate: z.string(),
    });

    const sprintResults = await rdfToZod.queryWithValidation(
      sprintQuery,
      sprintSchema
    );
    console.log("Sprint Results:", JSON.stringify(sprintResults, null, 2));

    console.log("\n👥 2. Querying Developer Data with Zod Validation");
    console.log("-".repeat(40));

    const developerQuery = `
      PREFIX ex: <http://example.org/>
      SELECT ?developerName ?developerEmail WHERE {
        ?developer ex:developerName ?developerName ;
                   ex:developerEmail ?developerEmail .
      }
    `;

    const developerSchema = z.object({
      developerName: z.string(),
      developerEmail: z.string(),
    });

    const developerResults = await rdfToZod.queryWithValidation(
      developerQuery,
      developerSchema
    );
    console.log(
      "Developer Results:",
      JSON.stringify(developerResults, null, 2)
    );

    console.log("\n📋 3. Querying Story Data with Zod Validation");
    console.log("-".repeat(40));

    const storyQuery = `
      PREFIX ex: <http://example.org/>
      SELECT ?storyTitle ?storyPoints ?storyStatus WHERE {
        ?story ex:storyTitle ?storyTitle ;
               ex:storyPoints ?storyPoints ;
               ex:storyStatus ?storyStatus .
      }
    `;

    const storySchema = z.object({
      storyTitle: z.string(),
      storyPoints: z.number(),
      storyStatus: z.enum(["todo", "in-progress", "done"]),
    });

    const storyResults = await rdfToZod.queryWithValidation(
      storyQuery,
      storySchema
    );
    console.log("Story Results:", JSON.stringify(storyResults, null, 2));

    console.log("\n🚨 4. Querying Impediment Data with Zod Validation");
    console.log("-".repeat(40));

    const impedimentQuery = `
      PREFIX ex: <http://example.org/>
      SELECT ?impedimentTitle ?impedimentAge ?impedimentSeverity WHERE {
        ?impediment ex:impedimentTitle ?impedimentTitle ;
                    ex:impedimentAge ?impedimentAge ;
                    ex:impedimentSeverity ?impedimentSeverity .
      }
    `;

    const impedimentSchema = z.object({
      impedimentTitle: z.string(),
      impedimentAge: z.number(),
      impedimentSeverity: z.enum(["low", "medium", "high", "critical"]),
    });

    const impedimentResults = await rdfToZod.queryWithValidation(
      impedimentQuery,
      impedimentSchema
    );
    console.log(
      "Impediment Results:",
      JSON.stringify(impedimentResults, null, 2)
    );

    console.log("\n🧠 5. Generating Zod Schema from RDF Class");
    console.log("-".repeat(40));

    const sprintSchemaFromRDF = await rdfToZod.generateSchemaFromClass(
      "http://example.org/Sprint"
    );
    console.log("Generated Sprint Schema:", sprintSchemaFromRDF);

    console.log("\n📝 6. Generating TypeScript Types");
    console.log("-".repeat(40));

    const schemas = {
      sprint: sprintSchema,
      developer: developerSchema,
      story: storySchema,
      impediment: impedimentSchema,
    };

    const typeDefinitions = rdfToZod.generateTypeScriptTypes(schemas);
    console.log("Generated TypeScript Types:");
    console.log(typeDefinitions);

    console.log("\n🔍 7. Validating Knowledge Hook Results");
    console.log("-".repeat(40));

    const hookResults = [
      {
        hookId: "sprint-progress-hook",
        predicateType: "SELECT",
        result: { completedStories: 3, totalStories: 4 },
        timestamp: new Date(),
        success: true,
      },
      {
        hookId: "impediment-escalation-hook",
        predicateType: "ASK",
        result: true,
        timestamp: new Date(),
        success: true,
      },
    ];

    const hookSchema = rdfToZod.createHookResultSchema();
    const validatedHookResults = await rdfToZod.validatePredicateResults(
      hookResults,
      hookSchema
    );

    console.log(
      "Validated Hook Results:",
      JSON.stringify(validatedHookResults, null, 2)
    );

    console.log("\n✅ RDF to Zod Integration Demo Complete!");
    console.log("=".repeat(50));
  });
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateRDFToZodIntegration().catch(console.error);
}

export { demonstrateRDFToZodIntegration };
