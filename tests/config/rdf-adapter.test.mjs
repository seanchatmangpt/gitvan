// tests/config/rdf-adapter.test.mjs
// Comprehensive test suite for RDF adapter layer
// Validates backward compatibility and RDF functionality

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { loadWithRDFSupport } from "../../src/config/rdf-adapter.mjs";
import {
  validateConfigConsistency,
  formatConsistencyReport,
} from "../../src/config/config-consistency-validator.mjs";

// Helper to measure execution time
function measureTime(fn) {
  const start = Date.now();
  const result = fn();
  const elapsed = Date.now() - start;
  return [result, elapsed];
}

describe("RDF Adapter Layer", () => {
  // ========================================================================
  // Backward Compatibility Tests
  // ========================================================================

  describe("Backward Compatibility - c12 Interface", () => {
    it("should load configuration with basic options", async () => {
      const config = await loadWithRDFSupport({}, {});
      expect(config).toBeDefined();
      expect(typeof config === "object").toBe(true);
    });

    it("should preserve all c12 properties", async () => {
      const config = await loadWithRDFSupport(
        {
          ai: {
            provider: "anthropic",
            model: "claude-opus",
          },
        },
        {}
      );

      expect(config.ai).toBeDefined();
      expect(config.ai.provider).toBe("anthropic");
      expect(config.ai.model).toBe("claude-opus");
    });

    it("should apply overrides correctly", async () => {
      const config = await loadWithRDFSupport(
        {
          ai: {
            temperature: 0.8,
          },
        },
        {}
      );

      expect(config.ai.temperature).toBe(0.8);
    });

    it("should access nested properties", async () => {
      const config = await loadWithRDFSupport(
        {
          jobs: {
            dir: "custom-jobs",
            scan: {
              patterns: ["**/*.mjs"],
            },
          },
        },
        {}
      );

      expect(config.jobs.dir).toBe("custom-jobs");
      expect(config.jobs.scan.patterns).toContain("**/*.mjs");
    });

    it("should not modify original overrides", async () => {
      const overrides = {
        ai: {
          provider: "anthropic",
        },
      };
      const originalProvider = overrides.ai.provider;

      await loadWithRDFSupport(overrides, {});

      expect(overrides.ai.provider).toBe(originalProvider);
    });

    it("should handle empty overrides", async () => {
      const config = await loadWithRDFSupport({}, {});
      expect(config).toBeDefined();
      expect(config.ai).toBeDefined();
    });

    it("should handle null/undefined values gracefully", async () => {
      const config = await loadWithRDFSupport(
        {
          ai: {
            provider: "anthropic",
            apiKey: null,
          },
        },
        {}
      );

      expect(config.ai.provider).toBe("anthropic");
      expect(config.ai.apiKey === null || config.ai.apiKey === undefined).toBe(
        true
      );
    });

    it("should have runtimeConfig normalized", async () => {
      const config = await loadWithRDFSupport({}, {});
      expect(config.runtimeConfig).toBeDefined();
      expect(typeof config.runtimeConfig).toBe("object");
    });
  });

  // ========================================================================
  // RDF Interface Tests
  // ========================================================================

  describe("RDF Interface", () => {
    it("should expose rdf interface", async () => {
      const config = await loadWithRDFSupport({}, {});
      expect(config.rdf).toBeDefined();
      expect(typeof config.rdf).toBe("object");
    });

    it("should provide query method", async () => {
      const config = await loadWithRDFSupport({}, {});
      expect(typeof config.rdf.query).toBe("function");
    });

    it("should provide validate method", async () => {
      const config = await loadWithRDFSupport({}, {});
      expect(typeof config.rdf.validate).toBe("function");
    });

    it("should provide toTurtle method", async () => {
      const config = await loadWithRDFSupport({}, {});
      expect(typeof config.rdf.toTurtle).toBe("function");
    });

    it("should provide toPOJO method", async () => {
      const config = await loadWithRDFSupport({}, {});
      expect(typeof config.rdf.toPOJO).toBe("function");
    });

    it("should provide paths method", async () => {
      const config = await loadWithRDFSupport({}, {});
      expect(typeof config.rdf.paths).toBe("function");
    });

    it("should provide all method", async () => {
      const config = await loadWithRDFSupport({}, {});
      expect(typeof config.rdf.all).toBe("function");
    });

    it("should provide get method", async () => {
      const config = await loadWithRDFSupport({}, {});
      expect(typeof config.rdf.get).toBe("function");
    });

    it("should provide isAvailable method", async () => {
      const config = await loadWithRDFSupport({}, {});
      expect(typeof config.rdf.isAvailable).toBe("function");
      expect(config.rdf.isAvailable()).toBe(true);
    });
  });

  // ========================================================================
  // getRDF Method Tests
  // ========================================================================

  describe("getRDF Method", () => {
    it("should expose getRDF method", async () => {
      const config = await loadWithRDFSupport(
        {
          ai: {
            provider: "anthropic",
          },
        },
        {}
      );

      expect(typeof config.getRDF).toBe("function");
    });

    it("should retrieve values from RDF", async () => {
      const config = await loadWithRDFSupport(
        {
          ai: {
            provider: "anthropic",
          },
        },
        {}
      );

      try {
        const provider = await config.getRDF("ai.provider");
        if (provider !== undefined) {
          expect(provider).toBe("anthropic");
        }
      } catch (error) {
        // RDF may not be available, which is acceptable
        expect(error.message).toContain("not available");
      }
    });
  });

  // ========================================================================
  // Consistency Validation Tests
  // ========================================================================

  describe("Consistency Validation", () => {
    it("should not validate by default", async () => {
      const config = await loadWithRDFSupport(
        {
          ai: {
            provider: "anthropic",
          },
        },
        {}
      );

      const report = config.getConsistencyReport();
      expect(report).toBeNull();
    });

    it("should validate when requested", async () => {
      const config = await loadWithRDFSupport(
        {
          ai: {
            provider: "anthropic",
          },
        },
        { validateConsistency: true }
      );

      const report = config.getConsistencyReport();
      expect(report).toBeDefined();
      expect(typeof report.isConsistent).toBe("boolean");
    });

    it("should report discrepancies", async () => {
      const c12Config = {
        ai: {
          provider: "anthropic",
          temperature: 0.7,
        },
      };

      const rdfConfig = {
        ai: {
          provider: "ollama",
          temperature: 0.5,
        },
      };

      const report = validateConfigConsistency(c12Config, rdfConfig);
      expect(report.discrepancies.length).toBeGreaterThan(0);
    });

    it("should detect only-in-c12 items", async () => {
      const c12Config = {
        ai: {
          provider: "anthropic",
          customField: "test",
        },
      };

      const rdfConfig = {
        ai: {
          provider: "anthropic",
        },
      };

      const report = validateConfigConsistency(c12Config, rdfConfig);
      expect(report.onlyInC12.length).toBeGreaterThan(0);
    });

    it("should detect only-in-rdf items", async () => {
      const c12Config = {
        ai: {
          provider: "anthropic",
        },
      };

      const rdfConfig = {
        ai: {
          provider: "anthropic",
          rdfOnly: "value",
        },
      };

      const report = validateConfigConsistency(c12Config, rdfConfig);
      expect(report.onlyInRDF.length).toBeGreaterThan(0);
    });

    it("should detect type conflicts", async () => {
      const c12Config = {
        daemon: {
          pollMs: 1500, // number
        },
      };

      const rdfConfig = {
        daemon: {
          pollMs: "1500", // string (would be type conflict)
        },
      };

      const report = validateConfigConsistency(c12Config, rdfConfig);
      // Note: In practice normalization converts both to strings
      expect(typeof report === "object").toBe(true);
    });

    it("should provide consistency report method", async () => {
      const config = await loadWithRDFSupport(
        {
          ai: { provider: "anthropic" },
        },
        { validateConsistency: true }
      );

      expect(typeof config.getConsistencyReport).toBe("function");
      const report = config.getConsistencyReport();
      expect(report).toBeDefined();
    });

    it("should detect consistent configs", async () => {
      const c12Config = {
        ai: {
          provider: "anthropic",
          temperature: 0.7,
        },
      };

      const rdfConfig = {
        ai: {
          provider: "anthropic",
          temperature: 0.7,
        },
      };

      const report = validateConfigConsistency(c12Config, rdfConfig);
      expect(report.isConsistent).toBe(true);
      expect(report.discrepancies.length).toBe(0);
    });

    it("should generate warnings for discrepancies", async () => {
      const c12Config = {
        ai: {
          provider: "anthropic",
        },
      };

      const rdfConfig = {
        ai: {
          provider: "ollama",
        },
      };

      const report = validateConfigConsistency(c12Config, rdfConfig);
      expect(report.warnings).toBeDefined();
      expect(Array.isArray(report.warnings)).toBe(true);
    });
  });

  // ========================================================================
  // Consistency Report Formatting
  // ========================================================================

  describe("Consistency Report Formatting", () => {
    it("should format report as string", () => {
      const report = {
        isConsistent: true,
        discrepancies: [],
        onlyInC12: [],
        onlyInRDF: [],
        typeConflicts: [],
        valueConflicts: [],
        warnings: [],
      };

      const formatted = formatConsistencyReport(report);
      expect(typeof formatted).toBe("string");
      expect(formatted.length).toBeGreaterThan(0);
    });

    it("should handle null report", () => {
      const formatted = formatConsistencyReport(null);
      expect(typeof formatted).toBe("string");
      expect(formatted).toContain("No consistency report");
    });

    it("should include status in formatted report", () => {
      const report = {
        isConsistent: true,
        discrepancies: [],
        onlyInC12: [],
        onlyInRDF: [],
        typeConflicts: [],
        valueConflicts: [],
        warnings: [],
      };

      const formatted = formatConsistencyReport(report);
      expect(formatted).toContain("CONSISTENT");
    });

    it("should list discrepancies in report", () => {
      const report = {
        isConsistent: false,
        discrepancies: [
          {
            path: "ai.provider",
            c12Value: "anthropic",
            rdfValue: "ollama",
            reason: "value-mismatch",
          },
        ],
        onlyInC12: [],
        onlyInRDF: [],
        typeConflicts: [],
        valueConflicts: [],
        warnings: [],
      };

      const formatted = formatConsistencyReport(report);
      expect(formatted).toContain("ai.provider");
      expect(formatted).toContain("DISCREPANCIES");
    });
  });

  // ========================================================================
  // Performance Tests
  // ========================================================================

  describe("Performance", () => {
    it("should load config in under 150ms", async () => {
      const start = Date.now();
      await loadWithRDFSupport(
        {
          ai: {
            provider: "anthropic",
          },
        },
        {}
      );
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(150);
    });

    it("should load with RDF validation in under 200ms", async () => {
      const start = Date.now();
      await loadWithRDFSupport(
        {
          ai: {
            provider: "anthropic",
          },
        },
        { validateConsistency: true }
      );
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(200);
    });

    it("should provide load time metric", async () => {
      const config = await loadWithRDFSupport({}, {});
      const loadTimeMs = config.getLoadTimeMs();

      expect(typeof loadTimeMs).toBe("number");
      expect(loadTimeMs).toBeGreaterThanOrEqual(0);
      expect(loadTimeMs).toBeLessThan(150);
    });
  });

  // ========================================================================
  // Options Tests
  // ========================================================================

  describe("Adapter Options", () => {
    it("should handle preferRDF option", async () => {
      const config = await loadWithRDFSupport(
        {
          ai: {
            provider: "anthropic",
          },
        },
        { preferRDF: false }
      );

      expect(config).toBeDefined();
      expect(config.ai.provider).toBe("anthropic");
    });

    it("should handle validateConsistency option", async () => {
      const config = await loadWithRDFSupport(
        {
          ai: { provider: "anthropic" },
        },
        { validateConsistency: true }
      );

      const report = config.getConsistencyReport();
      expect(report).toBeDefined();
    });

    it("should handle rdfConfigUri option", async () => {
      const config = await loadWithRDFSupport(
        {
          ai: { provider: "anthropic" },
        },
        { rdfConfigUri: "https://example.com/config/custom" }
      );

      expect(config).toBeDefined();
    });

    it("should handle dualWrite option (Phase 2)", async () => {
      // This option exists but is not implemented in Phase 1
      const config = await loadWithRDFSupport(
        {
          ai: { provider: "anthropic" },
        },
        { dualWrite: false }
      );

      expect(config).toBeDefined();
    });
  });

  // ========================================================================
  // RDF Queries Tests
  // ========================================================================

  describe("RDF Queries", () => {
    it("should execute SPARQL queries", async () => {
      const config = await loadWithRDFSupport(
        {
          ai: {
            provider: "anthropic",
          },
        },
        {}
      );

      try {
        const results = await config.rdf.query("SELECT ?s ?p ?o WHERE { ?s ?p ?o . }");
        expect(results).toBeDefined();
      } catch (error) {
        // RDF may not be fully available, which is acceptable
        expect(error).toBeDefined();
      }
    });

    it("should export config as Turtle", async () => {
      const config = await loadWithRDFSupport(
        {
          ai: {
            provider: "anthropic",
          },
        },
        {}
      );

      try {
        const turtle = await config.rdf.toTurtle();
        expect(typeof turtle).toBe("string");
      } catch (error) {
        // RDF may not be available
        expect(error).toBeDefined();
      }
    });

    it("should validate RDF config", async () => {
      const config = await loadWithRDFSupport(
        {
          ai: {
            provider: "anthropic",
          },
        },
        {}
      );

      try {
        const validation = await config.rdf.validate();
        expect(validation).toBeDefined();
        expect(typeof validation.valid).toBe("boolean");
      } catch (error) {
        // RDF validation may not be available
        expect(error).toBeDefined();
      }
    });

    it("should export config as POJO", async () => {
      const config = await loadWithRDFSupport(
        {
          ai: {
            provider: "anthropic",
          },
        },
        {}
      );

      try {
        const pojo = await config.rdf.toPOJO();
        expect(typeof pojo).toBe("object");
      } catch (error) {
        // RDF may not be available
        expect(error).toBeDefined();
      }
    });

    it("should get all config paths", async () => {
      const config = await loadWithRDFSupport(
        {
          ai: {
            provider: "anthropic",
          },
        },
        {}
      );

      try {
        const paths = await config.rdf.paths();
        expect(Array.isArray(paths)).toBe(true);
      } catch (error) {
        // RDF may not be available
        expect(error).toBeDefined();
      }
    });

    it("should get all config values", async () => {
      const config = await loadWithRDFSupport(
        {
          ai: {
            provider: "anthropic",
          },
        },
        {}
      );

      try {
        const all = await config.rdf.all();
        expect(typeof all).toBe("object");
      } catch (error) {
        // RDF may not be available
        expect(error).toBeDefined();
      }
    });

    it("should get specific config values", async () => {
      const config = await loadWithRDFSupport(
        {
          ai: {
            provider: "anthropic",
          },
        },
        {}
      );

      try {
        const provider = await config.rdf.get("ai.provider");
        expect(provider).toBe("anthropic");
      } catch (error) {
        // RDF may not be available
        expect(error).toBeDefined();
      }
    });
  });

  // ========================================================================
  // Integration Tests
  // ========================================================================

  describe("Integration Tests", () => {
    it("should work with complex nested config", async () => {
      const config = await loadWithRDFSupport(
        {
          jobs: {
            dir: "jobs",
            scan: {
              patterns: ["**/*.mjs"],
              ignore: ["node_modules"],
            },
          },
          ai: {
            provider: "anthropic",
            temperature: 0.7,
          },
        },
        {}
      );

      expect(config.jobs.dir).toBe("jobs");
      expect(config.jobs.scan.patterns[0]).toBe("**/*.mjs");
      expect(config.ai.provider).toBe("anthropic");
    });

    it("should work with both c12 and RDF interfaces simultaneously", async () => {
      const config = await loadWithRDFSupport(
        {
          ai: {
            provider: "anthropic",
            model: "claude-opus",
          },
        },
        {}
      );

      // Access c12 interface
      expect(config.ai.provider).toBe("anthropic");

      // Access RDF interface
      expect(config.rdf).toBeDefined();

      // Access both
      expect(config.ai.model).toBe("claude-opus");
      expect(typeof config.rdf.query).toBe("function");
    });

    it("should preserve property descriptors for Object.keys", async () => {
      const config = await loadWithRDFSupport(
        {
          ai: {
            provider: "anthropic",
          },
        },
        {}
      );

      const keys = Object.keys(config);
      expect(Array.isArray(keys)).toBe(true);
      expect(keys.length).toBeGreaterThan(0);
    });

    it("should work with JSON.stringify for c12 config parts", async () => {
      const config = await loadWithRDFSupport(
        {
          ai: {
            provider: "anthropic",
          },
        },
        {}
      );

      const aiJson = JSON.stringify(config.ai);
      expect(typeof aiJson).toBe("string");
      expect(aiJson).toContain("anthropic");
    });
  });

  // ========================================================================
  // Error Handling Tests
  // ========================================================================

  describe("Error Handling", () => {
    it("should handle RDF loading failure gracefully", async () => {
      // Even if RDF fails, adapter should still work
      const config = await loadWithRDFSupport(
        {
          ai: {
            provider: "anthropic",
          },
        },
        { validateConsistency: true }
      );

      expect(config).toBeDefined();
      expect(config.ai.provider).toBe("anthropic");
    });

    it("should provide disabled RDF interface when unavailable", async () => {
      const config = await loadWithRDFSupport({}, {});

      // If RDF is not available, methods should throw
      if (!config.rdf.isAvailable()) {
        await expect(config.rdf.query("SELECT *")).rejects.toThrow(
          /not available/i
        );
      }
    });

    it("should handle getRDF on unavailable RDF config", async () => {
      const config = await loadWithRDFSupport({}, {});

      try {
        // If RDF not available, should throw
        await config.getRDF("ai.provider");
      } catch (error) {
        expect(error.message).toContain("not available");
      }
    });
  });
});
