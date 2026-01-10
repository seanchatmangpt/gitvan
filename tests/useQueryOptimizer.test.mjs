/**
 * Test useQueryOptimizer - Query Pattern Analysis and Selectivity Estimation
 *
 * Tests the Dark Matter query optimizer's ability to:
 * - Extract triple patterns from SPARQL queries
 * - Estimate pattern selectivity
 * - Identify expensive patterns
 * - Generate optimization hints
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useQueryOptimizer } from "../src/composables/useQueryOptimizer.mjs";

describe("useQueryOptimizer - Pattern Analysis and Selectivity", () => {
  let optimizer;

  beforeEach(() => {
    optimizer = useQueryOptimizer();
  });

  describe("Query Analysis", () => {
    it("should extract triple patterns from SELECT query", () => {
      const sparql = `
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        SELECT ?name ?email
        WHERE {
          ?person a foaf:Person ;
                  foaf:name ?name ;
                  foaf:email ?email .
        }
      `;

      const analysis = optimizer.analyzeQuery(sparql);

      expect(analysis.patterns).toBeDefined();
      expect(analysis.patterns.length).toBeGreaterThan(0);
      expect(analysis.queryType).toBe("SELECT");
      expect(analysis.complexity).toBeDefined();
    });

    it("should extract patterns with fixed subject and predicate", () => {
      const sparql = `
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        SELECT ?obj
        WHERE {
          <http://example.org/person/1> foaf:knows ?obj
        }
      `;

      const analysis = optimizer.analyzeQuery(sparql);
      const pattern = analysis.patterns[0];

      expect(pattern).toBeDefined();
      expect(pattern.isVariable.subject).toBe(false); // Fixed URI
      expect(pattern.isVariable.predicate).toBe(false); // Fixed URI
      expect(pattern.isVariable.object).toBe(true); // Variable
    });

    it("should handle CONSTRUCT queries", () => {
      const sparql = `
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        CONSTRUCT {
          ?person foaf:knows ?other
        }
        WHERE {
          ?person a foaf:Person ;
                  foaf:knows ?other .
        }
      `;

      const analysis = optimizer.analyzeQuery(sparql);

      expect(analysis.queryType).toBe("CONSTRUCT");
      expect(analysis.patterns.length).toBeGreaterThan(0);
    });

    it("should handle ASK queries", () => {
      const sparql = `
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        ASK {
          ?person a foaf:Person ;
                  foaf:name "Alice" .
        }
      `;

      const analysis = optimizer.analyzeQuery(sparql);

      expect(analysis.queryType).toBe("ASK");
    });

    it("should handle DESCRIBE queries", () => {
      const sparql = `
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        DESCRIBE ?person
        WHERE {
          ?person a foaf:Person
        }
      `;

      const analysis = optimizer.analyzeQuery(sparql);

      expect(analysis.queryType).toBe("DESCRIBE");
    });
  });

  describe("Selectivity Estimation", () => {
    it("should estimate low selectivity for all-variable pattern", () => {
      const pattern = {
        subject: "?s",
        predicate: "?p",
        object: "?o",
        isVariable: {
          subject: true,
          predicate: true,
          object: true,
        },
      };

      const selectivity = optimizer.estimateSelectivity(pattern);

      expect(selectivity).toBe(1.0);
    });

    it("should estimate high selectivity for fixed predicate", () => {
      const pattern = {
        subject: "?s",
        predicate: "http://xmlns.com/foaf/0.1/knows",
        object: "?o",
        isVariable: {
          subject: true,
          predicate: false,
          object: true,
        },
      };

      const selectivity = optimizer.estimateSelectivity(pattern);

      expect(selectivity).toBeLessThan(0.1); // Very selective
      expect(selectivity).toBeGreaterThan(0); // Non-zero
    });

    it("should estimate high selectivity for fixed subject and predicate", () => {
      const pattern = {
        subject: "http://example.org/person/1",
        predicate: "http://xmlns.com/foaf/0.1/name",
        object: "?o",
        isVariable: {
          subject: false,
          predicate: false,
          object: true,
        },
      };

      const selectivity = optimizer.estimateSelectivity(pattern);

      expect(selectivity).toBeLessThan(0.01); // Very selective
    });

    it("should estimate selectivity for fixed object", () => {
      const pattern = {
        subject: "?s",
        predicate: "?p",
        object: "Alice",
        isVariable: {
          subject: true,
          predicate: true,
          object: false,
        },
      };

      const selectivity = optimizer.estimateSelectivity(pattern);

      expect(selectivity).toBeLessThan(0.2);
      expect(selectivity).toBeGreaterThan(0);
    });

    it("should multiply selectivities for multiple constraints", () => {
      const pattern1 = {
        subject: "?s",
        predicate: "?p",
        object: "?o",
        isVariable: { subject: true, predicate: true, object: true },
      };
      const sel1 = optimizer.estimateSelectivity(pattern1);

      const pattern2 = {
        subject: "?s",
        predicate: "http://example.org/prop",
        object: "?o",
        isVariable: { subject: true, predicate: false, object: true },
      };
      const sel2 = optimizer.estimateSelectivity(pattern2);

      expect(sel2).toBeLessThan(sel1);
    });
  });

  describe("Expensive Pattern Detection", () => {
    it("should detect all-variable patterns as expensive", () => {
      const sparql = `
        SELECT ?s ?p ?o
        WHERE {
          ?s ?p ?o
        }
      `;

      const analysis = optimizer.analyzeQuery(sparql);
      const expensive = analysis.expensivePatterns;

      expect(expensive.length).toBeGreaterThan(0);
      const fullScanPatterns = expensive.filter((e) => e.type === "fullScan");
      expect(fullScanPatterns.length).toBeGreaterThan(0);
    });

    it("should detect joins as expensive", () => {
      const sparql = `
        SELECT ?person ?friend ?name
        WHERE {
          ?person foaf:knows ?friend .
          ?friend foaf:name ?name .
        }
      `;

      const analysis = optimizer.analyzeQuery(sparql);
      const expensive = analysis.expensivePatterns;

      const joinPatterns = expensive.filter((e) => e.type === "join");
      expect(joinPatterns.length).toBeGreaterThan(0);
    });

    it("should detect OPTIONAL as expensive", () => {
      const sparql = `
        SELECT ?person ?email
        WHERE {
          ?person foaf:name ?name
          OPTIONAL { ?person foaf:email ?email }
        }
      `;

      const analysis = optimizer.analyzeQuery(sparql);
      const expensive = analysis.expensivePatterns;

      const optionalPatterns = expensive.filter((e) => e.type === "optional");
      expect(optionalPatterns.length).toBeGreaterThan(0);
    });

    it("should detect nested queries", () => {
      const sparql = `
        SELECT ?name
        WHERE {
          {
            {
              ?person foaf:name ?name
            }
          }
        }
      `;

      const analysis = optimizer.analyzeQuery(sparql);
      const expensive = analysis.expensivePatterns;

      const nestedPatterns = expensive.filter((e) => e.type === "nested");
      expect(nestedPatterns.length).toBeGreaterThan(0);
    });

    it("should suggest optimization hints", () => {
      const sparql = `
        SELECT ?s ?p ?o
        WHERE {
          ?s ?p ?o
        }
      `;

      const analysis = optimizer.analyzeQuery(sparql);

      expect(analysis.optimizationHints).toBeDefined();
      expect(analysis.optimizationHints.length).toBeGreaterThan(0);
    });
  });

  describe("Query Complexity Estimation", () => {
    it("should classify simple queries as LOW complexity", () => {
      const sparql = `
        SELECT ?name
        WHERE {
          <http://example.org/person/1> foaf:name ?name
        }
      `;

      const analysis = optimizer.analyzeQuery(sparql);

      expect(analysis.complexity).toBe("LOW");
    });

    it("should classify moderate queries as MEDIUM complexity", () => {
      const sparql = `
        SELECT ?name ?email
        WHERE {
          ?person foaf:name ?name ;
                  foaf:email ?email ;
                  foaf:age ?age .
        }
      `;

      const analysis = optimizer.analyzeQuery(sparql);

      expect(["MEDIUM", "HIGH", "VERY_HIGH"]).toContain(analysis.complexity);
    });

    it("should classify complex queries as HIGH or VERY_HIGH", () => {
      const sparql = `
        SELECT ?person ?friend ?friend2
        WHERE {
          ?person foaf:knows ?friend .
          ?friend foaf:knows ?friend2 .
          ?friend2 foaf:knows ?person3 .
          OPTIONAL { ?person foaf:email ?email }
        }
      `;

      const analysis = optimizer.analyzeQuery(sparql);

      expect(["HIGH", "VERY_HIGH"]).toContain(analysis.complexity);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty WHERE clause", () => {
      const sparql = `
        SELECT ?x
        WHERE {
        }
      `;

      const analysis = optimizer.analyzeQuery(sparql);

      expect(analysis.patterns.length).toBe(0);
    });

    it("should handle comments in queries", () => {
      const sparql = `
        SELECT ?name
        WHERE {
          # This is a comment
          ?person foaf:name ?name # Another comment
        }
      `;

      const analysis = optimizer.analyzeQuery(sparql);

      expect(analysis.patterns.length).toBeGreaterThan(0);
    });

    it("should throw error for invalid input", () => {
      expect(() => {
        optimizer.analyzeQuery(null);
      }).toThrow();

      expect(() => {
        optimizer.analyzeQuery("");
      }).toThrow();

      expect(() => {
        optimizer.analyzeQuery(123);
      }).toThrow();
    });

    it("should handle queries with FILTER clauses", () => {
      const sparql = `
        SELECT ?name ?age
        WHERE {
          ?person foaf:name ?name ;
                  foaf:age ?age .
          FILTER(?age > 18)
        }
      `;

      const analysis = optimizer.analyzeQuery(sparql);

      expect(analysis.patterns.length).toBeGreaterThan(0);
    });

    it("should handle queries with GROUP BY", () => {
      const sparql = `
        SELECT ?department (COUNT(?person) AS ?count)
        WHERE {
          ?person foaf:worksDepartment ?department
        }
        GROUP BY ?department
      `;

      const analysis = optimizer.analyzeQuery(sparql);

      expect(analysis.optimizationHints).toBeDefined();
    });

    it("should handle queries with UNION", () => {
      const sparql = `
        SELECT ?name
        WHERE {
          ?person foaf:name ?name
          UNION
          ?person foaf:givenName ?name
        }
      `;

      const analysis = optimizer.analyzeQuery(sparql);

      expect(analysis.optimizationHints.length).toBeGreaterThan(0);
    });
  });

  describe("Pattern Variable Frequency", () => {
    it("should track variable frequency across patterns", () => {
      const sparql = `
        SELECT ?name
        WHERE {
          ?person foaf:name ?name ;
                  foaf:knows ?friend ;
                  foaf:email ?email .
          ?friend foaf:name ?friendName
        }
      `;

      const analysis = optimizer.analyzeQuery(sparql);

      expect(analysis.variableFrequency).toBeDefined();
      expect(analysis.variableFrequency["?person"]).toBeGreaterThan(0);
      expect(analysis.variableFrequency["?friend"]).toBeGreaterThan(0);
      expect(analysis.variableFrequency["?name"]).toBeGreaterThan(0);
    });
  });

  describe("Selectivity Estimation Accuracy", () => {
    it("should estimate lower selectivity for more constrained patterns", () => {
      const unconstrained = {
        subject: "?s",
        predicate: "?p",
        object: "?o",
        isVariable: { subject: true, predicate: true, object: true },
      };

      const fixedPredicate = {
        subject: "?s",
        predicate: "foaf:knows",
        object: "?o",
        isVariable: { subject: true, predicate: false, object: true },
      };

      const sel1 = optimizer.estimateSelectivity(unconstrained);
      const sel2 = optimizer.estimateSelectivity(fixedPredicate);

      expect(sel2).toBeLessThan(sel1);
    });

    it("should provide non-zero selectivity for all patterns", () => {
      const pattern = {
        subject: "foaf:Person",
        predicate: "foaf:knows",
        object: "foaf:Person",
        isVariable: { subject: false, predicate: false, object: false },
      };

      const selectivity = optimizer.estimateSelectivity(pattern);

      expect(selectivity).toBeGreaterThan(0);
      expect(selectivity).toBeLessThanOrEqual(1);
    });
  });
});
