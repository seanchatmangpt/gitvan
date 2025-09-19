import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { useRDFToZod } from "../src/rdf-to-zod/useRDFToZod.mjs";
import { withGitVan } from "../src/core/context.mjs";
import { z } from "zod";

describe("RDF to Zod Conversion", () => {
  let testDir;
  let rdfToZod;

  beforeEach(async () => {
    testDir = join(process.cwd(), "test-rdf-to-zod");
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, "graph"), { recursive: true });

    execSync("git init", { cwd: testDir, stdio: "inherit" });
    execSync('git config user.name "RDF to Zod Test"', {
      cwd: testDir,
      stdio: "inherit",
    });
    execSync('git config user.email "rdf-zod@test.com"', {
      cwd: testDir,
      stdio: "inherit",
    });

    // Create test RDF data
    writeFileSync(
      join(testDir, "graph/test-ontology.ttl"),
      `
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix ex: <http://example.org/> .

# Class definitions
ex:Person rdf:type owl:Class ;
    rdfs:label "Person" ;
    rdfs:comment "A person in the system" .

ex:Developer rdf:type owl:Class ;
    rdfs:subClassOf ex:Person ;
    rdfs:label "Developer" ;
    rdfs:comment "A software developer" .

# Property definitions
ex:name rdf:type owl:DatatypeProperty ;
    rdfs:domain ex:Person ;
    rdfs:range xsd:string ;
    rdfs:label "name" ;
    owl:cardinality 1 .

ex:email rdf:type owl:DatatypeProperty ;
    rdfs:domain ex:Person ;
    rdfs:range xsd:string ;
    rdfs:label "email" ;
    owl:cardinality 1 .

ex:age rdf:type owl:DatatypeProperty ;
    rdfs:domain ex:Person ;
    rdfs:range xsd:integer ;
    rdfs:label "age" ;
    owl:minCardinality 0 ;
    owl:maxCardinality 1 .

ex:skills rdf:type owl:DatatypeProperty ;
    rdfs:domain ex:Developer ;
    rdfs:range xsd:string ;
    rdfs:label "skills" ;
    owl:cardinality 0 .

ex:experience rdf:type owl:DatatypeProperty ;
    rdfs:domain ex:Developer ;
    rdfs:range xsd:integer ;
    rdfs:label "experience" ;
    owl:cardinality 1 .

ex:isActive rdf:type owl:DatatypeProperty ;
    rdfs:domain ex:Developer ;
    rdfs:range xsd:boolean ;
    rdfs:label "isActive" ;
    owl:cardinality 1 .
`
    );

    // Create test instance data
    writeFileSync(
      join(testDir, "graph/test-data.ttl"),
      `
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix ex: <http://example.org/> .

ex:alice rdf:type ex:Developer ;
    ex:name "Alice Chen" ;
    ex:email "alice@example.com" ;
    ex:age 28 ;
    ex:skills "JavaScript" ;
    ex:skills "TypeScript" ;
    ex:skills "React" ;
    ex:experience 5 ;
    ex:isActive true .

ex:bob rdf:type ex:Developer ;
    ex:name "Bob Rodriguez" ;
    ex:email "bob@example.com" ;
    ex:age 32 ;
    ex:skills "Python" ;
    ex:skills "Django" ;
    ex:skills "PostgreSQL" ;
    ex:experience 8 ;
    ex:isActive true .

ex:carol rdf:type ex:Developer ;
    ex:name "Carol Kim" ;
    ex:email "carol@example.com" ;
    ex:age 25 ;
    ex:skills "Go" ;
    ex:skills "Kubernetes" ;
    ex:skills "Docker" ;
    ex:experience 3 ;
    ex:isActive false .
`
    );

    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "Add RDF test data"', {
      cwd: testDir,
      stdio: "inherit",
    });

    await withGitVan({ cwd: testDir }, async () => {
      rdfToZod = await useRDFToZod({
        graphDir: join(testDir, "graph"),
      });
    });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("Basic RDF to Zod Conversion", () => {
    it("should convert SPARQL query results to Zod-validated objects", async () => {
      const query = `
        PREFIX ex: <http://example.org/>
        SELECT ?name ?email ?age WHERE {
          ?person ex:name ?name ;
                  ex:email ?email ;
                  ex:age ?age .
        }
      `;

      const schema = z.object({
        name: z.string(),
        email: z.string(),
        age: z.number(),
      });

      const results = await rdfToZod.queryWithValidation(query, schema);

      expect(results).toHaveLength(3);
      expect(results[0]).toMatchObject({
        name: expect.any(String),
        email: expect.any(String),
        age: expect.any(Number),
      });
    });

    it("should generate Zod schema from RDF class definition", async () => {
      const schema = await rdfToZod.generateSchemaFromClass(
        "http://example.org/Developer"
      );

      expect(schema).toBeDefined();

      // Test the schema with valid data
      const validData = {
        name: "Alice Chen",
        email: "alice@example.com",
        age: 28,
        skills: ["JavaScript", "TypeScript"],
        experience: 5,
        isActive: true,
      };

      const result = schema.parse(validData);
      expect(result).toEqual(validData);
    });

    it("should validate Knowledge Hook results", async () => {
      const hookResults = [
        {
          hookId: "test-hook-1",
          predicateType: "ASK",
          result: true,
          timestamp: new Date(),
          success: true,
        },
        {
          hookId: "test-hook-2",
          predicateType: "SELECT",
          result: { count: 5 },
          timestamp: new Date(),
          success: true,
        },
      ];

      const schema = rdfToZod.createHookResultSchema();
      const validatedResults = await rdfToZod.validatePredicateResults(
        hookResults,
        schema
      );

      expect(validatedResults).toHaveLength(2);
      expect(validatedResults[0]._validated).toBe(true);
      expect(validatedResults[1]._validated).toBe(true);
    });

    it("should handle validation errors gracefully", async () => {
      const invalidResults = [
        {
          hookId: "test-hook-1",
          predicateType: "INVALID_TYPE", // Invalid enum value
          result: true,
          timestamp: "invalid-date", // Invalid date
          success: true,
        },
      ];

      const schema = rdfToZod.createHookResultSchema();
      const validatedResults = await rdfToZod.validatePredicateResults(
        invalidResults,
        schema
      );

      expect(validatedResults).toHaveLength(1);
      expect(validatedResults[0]._validated).toBe(false);
      expect(validatedResults[0]._validationError).toBeDefined();
    });
  });

  describe("Advanced RDF to Zod Features", () => {
    it("should handle optional and required fields correctly", async () => {
      const query = `
        PREFIX ex: <http://example.org/>
        SELECT ?name ?email ?age ?skills WHERE {
          ?person ex:name ?name ;
                  ex:email ?email .
          OPTIONAL { ?person ex:age ?age }
          OPTIONAL { ?person ex:skills ?skills }
        }
      `;

      const schema = z.object({
        name: z.string(),
        email: z.string(),
        age: z.number().optional(),
        skills: z.string().optional(),
      });

      const results = await rdfToZod.queryWithValidation(query, schema);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.name).toBeDefined();
        expect(result.email).toBeDefined();
        // age and skills are optional
      });
    });

    it("should handle arrays in RDF data", async () => {
      const query = `
        PREFIX ex: <http://example.org/>
        SELECT ?name ?skills WHERE {
          ?person ex:name ?name ;
                  ex:skills ?skills .
        }
      `;

      const schema = z.object({
        name: z.string(),
        skills: z.string(),
      });

      const results = await rdfToZod.queryWithValidation(query, schema);

      // Group by name to handle multiple skills per person
      const groupedResults = {};
      results.forEach((result) => {
        if (!groupedResults[result.name]) {
          groupedResults[result.name] = {
            name: result.name,
            skills: [],
          };
        }
        groupedResults[result.name].skills.push(result.skills);
      });

      const alice = groupedResults["Alice Chen"];
      expect(alice.skills).toContain("JavaScript");
      expect(alice.skills).toContain("TypeScript");
      expect(alice.skills).toContain("React");
    });

    it("should generate TypeScript types from Zod schemas", () => {
      const schemas = {
        developer: z.object({
          name: z.string(),
          email: z.string(),
          age: z.number().optional(),
          skills: z.array(z.string()),
          experience: z.number(),
          isActive: z.boolean(),
        }),
        hookResult: z.object({
          hookId: z.string(),
          predicateType: z.enum(["ASK", "SELECT", "CONSTRUCT", "DESCRIBE"]),
          result: z.any(),
          timestamp: z.date(),
          success: z.boolean(),
        }),
      };

      const typeDefinitions = rdfToZod.generateTypeScriptTypes(schemas);

      expect(typeDefinitions).toContain(
        "export type Developer = z.infer<typeof developerSchema>;"
      );
      expect(typeDefinitions).toContain(
        "export type HookResult = z.infer<typeof hookResultSchema>;"
      );
    });
  });

  describe("Integration with Knowledge Hooks", () => {
    it("should validate Knowledge Hook predicate results", async () => {
      const predicateResults = [
        {
          hookId: "developer-count-hook",
          predicateType: "SELECT",
          result: { count: 3 },
          timestamp: new Date(),
          success: true,
        },
        {
          hookId: "active-developer-hook",
          predicateType: "ASK",
          result: true,
          timestamp: new Date(),
          success: true,
        },
      ];

      const schema = rdfToZod.createHookResultSchema();
      const validatedResults = await rdfToZod.validatePredicateResults(
        predicateResults,
        schema
      );

      expect(validatedResults).toHaveLength(2);
      expect(validatedResults.every((r) => r._validated)).toBe(true);
    });

    it("should validate workflow execution results", async () => {
      const workflowResults = [
        {
          workflowId: "developer-notification-workflow",
          stepId: "send-email-step",
          status: "completed",
          result: { emailsSent: 3 },
          duration: 1500,
          timestamp: new Date(),
        },
        {
          workflowId: "developer-notification-workflow",
          stepId: "update-database-step",
          status: "failed",
          error: "Connection timeout",
          duration: 5000,
          timestamp: new Date(),
        },
      ];

      const schema = rdfToZod.createWorkflowResultSchema();
      const validatedResults = await rdfToZod.validatePredicateResults(
        workflowResults,
        schema
      );

      expect(validatedResults).toHaveLength(2);
      expect(validatedResults[0]._validated).toBe(true);
      expect(validatedResults[1]._validated).toBe(true);
    });

    it("should validate Git context data", async () => {
      const gitContext = {
        commitSha: "abc123def456",
        branch: "main",
        changedFiles: ["src/developer.ts", "tests/developer.test.ts"],
        eventType: "post-commit",
        timestamp: new Date(),
        author: "Alice Chen",
        message: "Add developer validation",
      };

      const schema = rdfToZod.createGitContextSchema();
      const validatedResults = await rdfToZod.validatePredicateResults(
        [gitContext],
        schema
      );

      expect(validatedResults).toHaveLength(1);
      expect(validatedResults[0]._validated).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle malformed RDF data gracefully", async () => {
      const query = `
        PREFIX ex: <http://example.org/>
        SELECT ?name ?age WHERE {
          ?person ex:name ?name ;
                  ex:age ?age .
        }
      `;

      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      // This should not throw an error even if some data is malformed
      const results = await rdfToZod.queryWithValidation(query, schema);
      expect(Array.isArray(results)).toBe(true);
    });

    it("should provide detailed validation error messages", async () => {
      const invalidData = {
        hookId: "test-hook",
        predicateType: "INVALID",
        result: "test",
        timestamp: "not-a-date",
        success: "not-a-boolean",
      };

      const schema = rdfToZod.createHookResultSchema();
      const validatedResults = await rdfToZod.validatePredicateResults(
        [invalidData],
        schema
      );

      expect(validatedResults[0]._validated).toBe(false);
      expect(validatedResults[0]._validationError).toContain(
        "Invalid enum value"
      );
    });
  });
});
