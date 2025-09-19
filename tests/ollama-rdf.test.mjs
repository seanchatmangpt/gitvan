import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { useOllamaRDF } from "../src/rdf-to-zod/useOllamaRDF.mjs";
import { withGitVan } from "../src/core/context.mjs";

describe("Ollama RDF Integration", () => {
  let testDir;
  let ollamaRDF;

  beforeEach(async () => {
    testDir = join(process.cwd(), "test-ollama-rdf");
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, "graph"), { recursive: true });

    execSync("git init", { cwd: testDir, stdio: "inherit" });
    execSync('git config user.name "Ollama RDF Test"', {
      cwd: testDir,
      stdio: "inherit",
    });
    execSync('git config user.email "ollama-rdf@test.com"', {
      cwd: testDir,
      stdio: "inherit",
    });

    // Create test ontology
    writeFileSync(
      join(testDir, "graph/test-ontology.ttl"),
      `
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix ex: <http://example.org/> .

ex:Developer rdf:type owl:Class ;
    rdfs:label "Developer" ;
    rdfs:comment "A software developer" .

ex:name rdf:type owl:DatatypeProperty ;
    rdfs:domain ex:Developer ;
    rdfs:range xsd:string ;
    rdfs:label "name" ;
    owl:cardinality 1 .

ex:email rdf:type owl:DatatypeProperty ;
    rdfs:domain ex:Developer ;
    rdfs:range xsd:string ;
    rdfs:label "email" ;
    owl:cardinality 1 .

ex:skills rdf:type owl:DatatypeProperty ;
    rdfs:domain ex:Developer ;
    rdfs:range xsd:string ;
    rdfs:label "skills" ;
    owl:cardinality 0 .
`
    );

    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "Add test ontology"', {
      cwd: testDir,
      stdio: "inherit",
    });

    await withGitVan({ cwd: testDir }, async () => {
      ollamaRDF = await useOllamaRDF({
        model: "qwen3-coder",
        graphDir: join(testDir, "graph"),
      });
    });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("Basic Ollama RDF Functionality", () => {
    it("should generate RDF ontology from natural language", async () => {
      const description = "A simple user management system";
      const ontology = await ollamaRDF.generateOntology(description);

      expect(ontology).toBeDefined();
      expect(typeof ontology).toBe("string");
      expect(ontology.length).toBeGreaterThan(0);
      expect(ontology).toContain("@prefix");
      expect(ontology).toContain("rdf:type");
    });

    it("should generate SPARQL query from natural language", async () => {
      const description = "A simple user management system";
      const ontology = await ollamaRDF.generateOntology(description);
      const queryDescription = "Find all users";

      const sparqlQuery = await ollamaRDF.generateSPARQLQuery(
        queryDescription,
        ontology
      );

      expect(sparqlQuery).toBeDefined();
      expect(typeof sparqlQuery).toBe("string");
      expect(sparqlQuery.length).toBeGreaterThan(0);
      expect(sparqlQuery).toContain("SELECT");
      expect(sparqlQuery).toContain("WHERE");
    });

    it("should generate Zod schema from RDF ontology", async () => {
      const description = "A simple user management system";
      const ontology = await ollamaRDF.generateOntology(description);

      const zodSchema = await ollamaRDF.generateZodSchemaFromOntology(
        ontology,
        "User"
      );

      expect(zodSchema).toBeDefined();
      expect(typeof zodSchema).toBe("string");
      expect(zodSchema.length).toBeGreaterThan(0);
      expect(zodSchema).toContain("z.object");
    });

    it("should generate RDF data from structured input", async () => {
      const description = "A simple user management system";
      const ontology = await ollamaRDF.generateOntology(description);

      const structuredData = {
        users: [
          { name: "Alice", email: "alice@example.com" },
          { name: "Bob", email: "bob@example.com" },
        ],
      };

      const rdfData = await ollamaRDF.generateRDFData(structuredData, ontology);

      expect(rdfData).toBeDefined();
      expect(typeof rdfData).toBe("string");
      expect(rdfData.length).toBeGreaterThan(0);
      expect(rdfData).toContain("@prefix");
      expect(rdfData).toContain("rdf:type");
    });

    it("should validate RDF data using AI", async () => {
      const description = "A simple user management system";
      const ontology = await ollamaRDF.generateOntology(description);
      const rdfData = await ollamaRDF.generateRDFFromDescription(
        description,
        ontology
      );

      const validation = await ollamaRDF.validateRDFData(rdfData, ontology);

      expect(validation).toBeDefined();
      expect(validation).toHaveProperty("isValid");
      expect(validation).toHaveProperty("score");
      expect(validation).toHaveProperty("syntaxErrors");
      expect(validation).toHaveProperty("semanticErrors");
      expect(validation).toHaveProperty("recommendations");
      expect(typeof validation.isValid).toBe("boolean");
      expect(typeof validation.score).toBe("number");
    });

    it("should generate Knowledge Hook definition", async () => {
      const description = "A simple user management system";
      const ontology = await ollamaRDF.generateOntology(description);
      const hookDescription = "Hook that triggers when a user is created";

      const knowledgeHook = await ollamaRDF.generateKnowledgeHook(
        hookDescription,
        ontology
      );

      expect(knowledgeHook).toBeDefined();
      expect(typeof knowledgeHook).toBe("string");
      expect(knowledgeHook.length).toBeGreaterThan(0);
      expect(knowledgeHook).toContain("@prefix");
      expect(knowledgeHook).toContain("gh:Hook");
    });

    it("should generate comprehensive RDF documentation", async () => {
      const description = "A simple user management system";
      const ontology = await ollamaRDF.generateOntology(description);

      const documentation = await ollamaRDF.generateRDFDocumentation(ontology);

      expect(documentation).toBeDefined();
      expect(typeof documentation).toBe("string");
      expect(documentation.length).toBeGreaterThan(0);
      expect(documentation).toContain("#");
    });
  });

  describe("Advanced Ollama RDF Features", () => {
    it("should complete RDF workflow", async () => {
      const description = "A project management system";
      const workflowResult = await ollamaRDF.completeRDFWorkflow(description);

      expect(workflowResult).toBeDefined();
      expect(workflowResult).toHaveProperty("ontology");
      expect(workflowResult).toHaveProperty("sampleData");
      expect(workflowResult).toHaveProperty("validation");
      expect(workflowResult).toHaveProperty("documentation");
      expect(workflowResult).toHaveProperty("isValid");
      expect(workflowResult).toHaveProperty("score");

      expect(typeof workflowResult.ontology).toBe("string");
      expect(typeof workflowResult.sampleData).toBe("string");
      expect(typeof workflowResult.documentation).toBe("string");
      expect(typeof workflowResult.isValid).toBe("boolean");
      expect(typeof workflowResult.score).toBe("number");
    });

    it("should generate Knowledge Hook with validation", async () => {
      const description = "A project management system";
      const ontology = await ollamaRDF.generateOntology(description);
      const hookDescription = "Hook that triggers when a project is completed";

      const hookResult = await ollamaRDF.generateKnowledgeHookWithValidation(
        hookDescription,
        ontology
      );

      expect(hookResult).toBeDefined();
      expect(hookResult).toHaveProperty("hookDefinition");
      expect(hookResult).toHaveProperty("sparqlQuery");
      expect(hookResult).toHaveProperty("zodSchema");
      expect(hookResult).toHaveProperty("description");

      expect(typeof hookResult.hookDefinition).toBe("string");
      expect(typeof hookResult.sparqlQuery).toBe("string");
      expect(typeof hookResult.zodSchema).toBe("string");
    });

    it("should generate RDF with Zod validation", async () => {
      const description = "A project management system";
      const ontology = await ollamaRDF.generateOntology(description);

      const rdfResult = await ollamaRDF.generateRDFWithZodValidation(
        description,
        ontology
      );

      expect(rdfResult).toBeDefined();
      expect(rdfResult).toHaveProperty("rdfData");
      expect(rdfResult).toHaveProperty("zodSchema");
      expect(rdfResult).toHaveProperty("validation");
      expect(rdfResult).toHaveProperty("isValid");
      expect(rdfResult).toHaveProperty("score");

      expect(typeof rdfResult.rdfData).toBe("string");
      expect(typeof rdfResult.zodSchema).toBe("string");
      expect(typeof rdfResult.isValid).toBe("boolean");
      expect(typeof rdfResult.score).toBe("number");
    });

    it("should generate complete Knowledge Hook system", async () => {
      const description = "A code review system";
      const hookSystem = await ollamaRDF.generateKnowledgeHookSystem(
        description
      );

      expect(hookSystem).toBeDefined();
      expect(hookSystem).toHaveProperty("ontology");
      expect(hookSystem).toHaveProperty("hooks");
      expect(hookSystem).toHaveProperty("queries");
      expect(hookSystem).toHaveProperty("schemas");
      expect(hookSystem).toHaveProperty("sampleData");
      expect(hookSystem).toHaveProperty("documentation");
      expect(hookSystem).toHaveProperty("description");

      expect(typeof hookSystem.ontology).toBe("string");
      expect(Array.isArray(hookSystem.hooks)).toBe(true);
      expect(Array.isArray(hookSystem.queries)).toBe(true);
      expect(Array.isArray(hookSystem.schemas)).toBe(true);
      expect(typeof hookSystem.sampleData).toBe("string");
      expect(typeof hookSystem.documentation).toBe("string");

      expect(hookSystem.hooks.length).toBeGreaterThan(0);
      expect(hookSystem.queries.length).toBeGreaterThan(0);
      expect(hookSystem.schemas.length).toBeGreaterThan(0);
    });
  });

  describe("Streaming Features", () => {
    it("should generate RDF ontology with streaming", async () => {
      const description = "A streaming test system";
      let streamedContent = "";

      for await (const chunk of ollamaRDF.generateOntologyStream(description)) {
        streamedContent += chunk;
      }

      expect(streamedContent).toBeDefined();
      expect(typeof streamedContent).toBe("string");
      expect(streamedContent.length).toBeGreaterThan(0);
      expect(streamedContent).toContain("@prefix");
    });

    it("should generate SPARQL query with streaming", async () => {
      const description = "A streaming test system";
      const ontology = await ollamaRDF.generateOntology(description);
      const queryDescription = "Find all items";
      let streamedContent = "";

      for await (const chunk of ollamaRDF.generateSPARQLQueryStream(
        queryDescription,
        ontology
      )) {
        streamedContent += chunk;
      }

      expect(streamedContent).toBeDefined();
      expect(typeof streamedContent).toBe("string");
      expect(streamedContent.length).toBeGreaterThan(0);
      expect(streamedContent).toContain("SELECT");
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid descriptions gracefully", async () => {
      const invalidDescription = "";

      try {
        const ontology = await ollamaRDF.generateOntology(invalidDescription);
        // Should still return something, even if empty
        expect(typeof ontology).toBe("string");
      } catch (error) {
        // Should handle errors gracefully
        expect(error).toBeDefined();
      }
    });

    it("should handle validation errors gracefully", async () => {
      const description = "A simple system";
      const ontology = await ollamaRDF.generateOntology(description);
      const invalidRDFData = "invalid turtle syntax";

      const validation = await ollamaRDF.validateRDFData(
        invalidRDFData,
        ontology
      );

      expect(validation).toBeDefined();
      expect(validation).toHaveProperty("isValid");
      expect(validation).toHaveProperty("syntaxErrors");
      expect(typeof validation.isValid).toBe("boolean");
      expect(Array.isArray(validation.syntaxErrors)).toBe(true);
    });
  });
});
