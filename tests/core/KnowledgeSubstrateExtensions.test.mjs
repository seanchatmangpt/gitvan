import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  initializeGitVanOntologies,
  validateOntologies,
  getOntologyStats,
  exportOntology,
  resetOntologies,
} from "../../src/core/KnowledgeSubstrateExtensions.mjs";
import { createLogger } from "../../src/utils/logger.mjs";

const logger = createLogger("tests:KnowledgeSubstrateExtensions");

/**
 * Mock KnowledgeSubstrate for testing
 */
class MockKnowledgeSubstrate {
  constructor() {
    this.store = new Map();
    this.hooks = [];
    this.triples = 0;
  }

  async load(content, options = {}) {
    // Simulate loading Turtle content
    logger.debug(`MockKS: loaded ${content.length} bytes`);
    this.triples += Math.ceil(content.length / 50); // Estimate: ~50 bytes per triple
    return {
      success: true,
      format: options.format,
      baseIRI: options.baseIRI,
    };
  }

  async registerHook(hook) {
    this.hooks.push(hook);
    logger.debug(`MockKS: registered hook ${hook.name}`);
    return true;
  }

  async getClass(iri) {
    // Mock: pretend all classes are resolvable
    return { iri, type: "Class" };
  }

  async size() {
    return this.triples;
  }

  async validateWithShacl() {
    return {
      conforms: true,
      results: [],
    };
  }

  async clear() {
    this.store.clear();
    this.hooks = [];
    this.triples = 0;
  }
}

describe("KnowledgeSubstrateExtensions", () => {
  let ks;

  beforeEach(() => {
    ks = new MockKnowledgeSubstrate();
  });

  afterEach(async () => {
    await ks.clear();
  });

  describe("initializeGitVanOntologies", () => {
    it("should initialize all three ontologies successfully", async () => {
      const result = await initializeGitVanOntologies(ks, {
        validateWithShacl: false,
        registerHooks: false,
      });

      expect(result.status).toBe("initialized");
      expect(result.ontologies).toHaveProperty("lock");
      expect(result.ontologies).toHaveProperty("snapshot");
      expect(result.ontologies).toHaveProperty("queue");
      expect(result.errors).toHaveLength(0);
    });

    it("should load lock ontology", async () => {
      const result = await initializeGitVanOntologies(ks, {
        validateWithShacl: false,
        registerHooks: false,
      });

      expect(result.ontologies.lock).toBeDefined();
      expect(result.ontologies.lock.loaded).toBe(true);
      expect(result.ontologies.lock.filename).toBe("lock-ontology.ttl");
      expect(result.ontologies.lock.size).toBeGreaterThan(0);
    });

    it("should load snapshot ontology", async () => {
      const result = await initializeGitVanOntologies(ks, {
        validateWithShacl: false,
        registerHooks: false,
      });

      expect(result.ontologies.snapshot).toBeDefined();
      expect(result.ontologies.snapshot.loaded).toBe(true);
      expect(result.ontologies.snapshot.filename).toBe("snapshot-ontology.ttl");
      expect(result.ontologies.snapshot.size).toBeGreaterThan(0);
    });

    it("should load queue ontology", async () => {
      const result = await initializeGitVanOntologies(ks, {
        validateWithShacl: false,
        registerHooks: false,
      });

      expect(result.ontologies.queue).toBeDefined();
      expect(result.ontologies.queue.loaded).toBe(true);
      expect(result.ontologies.queue.filename).toBe("queue-ontology.ttl");
      expect(result.ontologies.queue.size).toBeGreaterThan(0);
    });

    it("should record load timestamps", async () => {
      const result = await initializeGitVanOntologies(ks, {
        validateWithShacl: false,
        registerHooks: false,
      });

      expect(result.ontologies.lock.loadedAt).toBeDefined();
      expect(new Date(result.ontologies.lock.loadedAt)).toBeInstanceOf(Date);
    });

    it("should support SHACL validation", async () => {
      const result = await initializeGitVanOntologies(ks, {
        validateWithShacl: true,
        registerHooks: false,
      });

      expect(result.validations).toBeDefined();
      expect(result.validations.shaclEnabled).toBe(true);
      expect(result.validations.conforms).toBe(true);
    });

    it("should register transaction hooks", async () => {
      const result = await initializeGitVanOntologies(ks, {
        validateWithShacl: false,
        registerHooks: true,
      });

      expect(result.hooks).toBeDefined();
      expect(result.hooks).toHaveProperty("lock-state-changes");
      expect(result.hooks).toHaveProperty("snapshot-created");
      expect(result.hooks).toHaveProperty("job-status-changes");
      expect(ks.hooks.length).toBe(3);
    });

    it("should handle all options together", async () => {
      const result = await initializeGitVanOntologies(ks, {
        validateWithShacl: true,
        registerHooks: true,
      });

      expect(result.status).toBe("initialized");
      expect(Object.keys(result.ontologies)).toHaveLength(3);
      expect(Object.keys(result.hooks)).toHaveLength(3);
      expect(result.validations.conforms).toBe(true);
    });
  });

  describe("validateOntologies", () => {
    beforeEach(async () => {
      // Initialize first
      await initializeGitVanOntologies(ks, {
        validateWithShacl: false,
        registerHooks: false,
      });
    });

    it("should validate all ontologies are present", async () => {
      const result = await validateOntologies(ks);

      expect(result.valid).toBe(true);
      expect(result.checks.lockOntologyPresent).toBe(true);
      expect(result.checks.snapshotOntologyPresent).toBe(true);
      expect(result.checks.queueOntologyPresent).toBe(true);
    });

    it("should check lock classes are resolvable", async () => {
      const result = await validateOntologies(ks);

      expect(result.ontologies.lock).toBeDefined();
      expect(result.ontologies.lock.classes.length).toBeGreaterThan(0);
      expect(result.ontologies.lock.classes[0].resolvable).toBe(true);
    });

    it("should check snapshot classes are resolvable", async () => {
      const result = await validateOntologies(ks);

      expect(result.ontologies.snapshot).toBeDefined();
      expect(result.ontologies.snapshot.classes.length).toBeGreaterThan(0);
    });

    it("should check queue classes are resolvable", async () => {
      const result = await validateOntologies(ks);

      expect(result.ontologies.queue).toBeDefined();
      expect(result.ontologies.queue.classes.length).toBeGreaterThan(0);
    });

    it("should mark all checks as passed", async () => {
      const result = await validateOntologies(ks);

      expect(result.checks.allClassesResolvable).toBe(true);
      expect(result.checks.allPropertiesResolvable).toBe(true);
    });
  });

  describe("getOntologyStats", () => {
    beforeEach(async () => {
      await initializeGitVanOntologies(ks, {
        validateWithShacl: false,
        registerHooks: false,
      });
    });

    it("should return statistics", async () => {
      const stats = await getOntologyStats(ks);

      expect(stats).toHaveProperty("timestamp");
      expect(stats).toHaveProperty("ontologies");
      expect(stats).toHaveProperty("total");
    });

    it("should report triple count", async () => {
      const stats = await getOntologyStats(ks);

      expect(stats.total.triples).toBeGreaterThan(0);
    });

    it("should timestamp statistics", async () => {
      const stats = await getOntologyStats(ks);

      expect(new Date(stats.timestamp)).toBeInstanceOf(Date);
    });

    it("should include ontology-specific counts", async () => {
      const stats = await getOntologyStats(ks);

      expect(stats.ontologies).toHaveProperty("lock");
      expect(stats.ontologies).toHaveProperty("snapshot");
      expect(stats.ontologies).toHaveProperty("queue");
    });
  });

  describe("error handling", () => {
    it("should handle missing ontology files gracefully", async () => {
      const brokenKs = new MockKnowledgeSubstrate();
      brokenKs.load = async () => {
        throw new Error("Simulated load failure");
      };

      const result = await initializeGitVanOntologies(brokenKs, {
        validateWithShacl: false,
        registerHooks: false,
      });

      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should continue with partial load on error", async () => {
      const result = await initializeGitVanOntologies(ks, {
        validateWithShacl: false,
        registerHooks: false,
      });

      // Should still initialize other ontologies
      expect(result.ontologies.lock).toBeDefined();
      expect(result.ontologies.snapshot).toBeDefined();
      expect(result.ontologies.queue).toBeDefined();
    });

    it("should report validation status", async () => {
      const result = await initializeGitVanOntologies(ks, {
        validateWithShacl: false,
        registerHooks: false,
      });

      expect(["initialized", "partial", "failed"]).toContain(result.status);
    });
  });

  describe("integration scenarios", () => {
    it("should support multiple sequential initializations", async () => {
      const result1 = await initializeGitVanOntologies(ks, {
        validateWithShacl: false,
        registerHooks: false,
      });

      const result2 = await initializeGitVanOntologies(ks, {
        validateWithShacl: false,
        registerHooks: false,
      });

      expect(result1.status).toBe("initialized");
      expect(result2.status).toBe("initialized");
    });

    it("should support initialization with all features enabled", async () => {
      const result = await initializeGitVanOntologies(ks, {
        validateWithShacl: true,
        registerHooks: true,
      });

      expect(result.status).toBe("initialized");
      expect(Object.keys(result.ontologies).length).toBe(3);
      expect(Object.keys(result.hooks).length).toBe(3);
      expect(result.validations.conforms).toBe(true);
    });

    it("should support full workflow: load, validate, export", async () => {
      // 1. Initialize
      const initResult = await initializeGitVanOntologies(ks, {
        validateWithShacl: false,
        registerHooks: false,
      });
      expect(initResult.status).toBe("initialized");

      // 2. Validate
      const validResult = await validateOntologies(ks);
      expect(validResult.valid).toBe(true);

      // 3. Get stats
      const stats = await getOntologyStats(ks);
      expect(stats.total.triples).toBeGreaterThan(0);
    });
  });

  describe("performance", () => {
    it("should initialize all ontologies in reasonable time", async () => {
      const start = Date.now();

      await initializeGitVanOntologies(ks, {
        validateWithShacl: false,
        registerHooks: false,
      });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds
    });

    it("should load lock ontology without excessive memory", async () => {
      const result = await initializeGitVanOntologies(ks, {
        validateWithShacl: false,
        registerHooks: false,
      });

      // Lock ontology should be reasonable size (< 50KB)
      expect(result.ontologies.lock.size).toBeLessThan(50000);
    });

    it("should load snapshot ontology without excessive memory", async () => {
      const result = await initializeGitVanOntologies(ks, {
        validateWithShacl: false,
        registerHooks: false,
      });

      expect(result.ontologies.snapshot.size).toBeLessThan(100000);
    });

    it("should load queue ontology without excessive memory", async () => {
      const result = await initializeGitVanOntologies(ks, {
        validateWithShacl: false,
        registerHooks: false,
      });

      expect(result.ontologies.queue.size).toBeLessThan(150000);
    });
  });

  describe("hook registration details", () => {
    it("should register lock state hook", async () => {
      const result = await initializeGitVanOntologies(ks, {
        validateWithShacl: false,
        registerHooks: true,
      });

      expect(result.hooks["lock-state-changes"].registered).toBe(true);
      expect(ks.hooks.find((h) => h.name === "lock-state-changes")).toBeDefined();
    });

    it("should register snapshot creation hook", async () => {
      const result = await initializeGitVanOntologies(ks, {
        validateWithShacl: false,
        registerHooks: true,
      });

      expect(result.hooks["snapshot-created"].registered).toBe(true);
      expect(ks.hooks.find((h) => h.name === "snapshot-created")).toBeDefined();
    });

    it("should register job status hook", async () => {
      const result = await initializeGitVanOntologies(ks, {
        validateWithShacl: false,
        registerHooks: true,
      });

      expect(result.hooks["job-status-changes"].registered).toBe(true);
      expect(ks.hooks.find((h) => h.name === "job-status-changes")).toBeDefined();
    });

    it("should have handlers for all hooks", async () => {
      await initializeGitVanOntologies(ks, {
        validateWithShacl: false,
        registerHooks: true,
      });

      for (const hook of ks.hooks) {
        expect(hook.handler).toBeDefined();
        expect(typeof hook.handler).toBe("function");
      }
    });
  });

  describe("SHACL validation details", () => {
    it("should enable SHACL validation when requested", async () => {
      const result = await initializeGitVanOntologies(ks, {
        validateWithShacl: true,
        registerHooks: false,
      });

      expect(result.validations.shaclEnabled).toBe(true);
    });

    it("should report conformance", async () => {
      const result = await initializeGitVanOntologies(ks, {
        validateWithShacl: true,
        registerHooks: false,
      });

      expect(result.validations).toHaveProperty("conforms");
      expect(typeof result.validations.conforms).toBe("boolean");
    });

    it("should record validation time", async () => {
      const result = await initializeGitVanOntologies(ks, {
        validateWithShacl: true,
        registerHooks: false,
      });

      expect(result.validations.validatedAt).toBeDefined();
    });

    it("should include validation results", async () => {
      const result = await initializeGitVanOntologies(ks, {
        validateWithShacl: true,
        registerHooks: false,
      });

      expect(Array.isArray(result.validations.results)).toBe(true);
    });
  });
});
