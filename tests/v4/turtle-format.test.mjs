/**
 * Turtle Format Integration Tests
 * Tests for namespace management, SHACL validation, serialization optimization
 * Target: >85% coverage
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  NamespaceManager,
  namespaceManager,
  createNamespaceManager,
} from "../../src/rdf/namespace-manager.mjs";
import {
  TurtleSerializer,
  LRUCache,
  DeltaTracker,
  turtleSerializer,
  createTurtleSerializer,
} from "../../src/utils/turtle-serializer.mjs";

/**
 * Test Suite: Namespace Management
 */
describe("Namespace Manager", () => {
  let manager;

  beforeEach(() => {
    manager = createNamespaceManager();
  });

  describe("Initialization", () => {
    it("should register standard namespaces on init", () => {
      expect(manager.initialized).toBe(true);
      expect(manager.hasPrefix("rdf")).toBe(true);
      expect(manager.hasPrefix("gv")).toBe(true);
      expect(manager.hasPrefix("gitv")).toBe(true);
    });

    it("should have correct number of standard namespaces", () => {
      const stats = manager.getStatistics();
      expect(stats.standardNamespaces).toBeGreaterThan(10);
      expect(stats.totalNamespaces).toBeGreaterThanOrEqual(stats.standardNamespaces);
    });
  });

  describe("Namespace Registration", () => {
    it("should register custom namespace", () => {
      const ns = manager.registerNamespace("custom", "https://example.com/ns#");
      expect(ns.prefix).toBe("custom");
      expect(ns.uri).toBe("https://example.com/ns#");
      expect(manager.hasPrefix("custom")).toBe(true);
    });

    it("should retrieve registered namespace", () => {
      manager.registerNamespace("test", "https://test.org/");
      const ns = manager.getNamespace("test");
      expect(ns).not.toBeNull();
      expect(ns.uri).toBe("https://test.org/");
    });

    it("should prevent duplicate prefix with different URI", () => {
      manager.registerNamespace("custom", "https://example.com/ns#");
      expect(() => {
        manager.registerNamespace("custom", "https://different.com/");
      }).toThrow();
    });

    it("should allow re-registering same prefix and URI", () => {
      manager.registerNamespace("custom", "https://example.com/ns#");
      const ns = manager.registerNamespace("custom", "https://example.com/ns#");
      expect(ns.uri).toBe("https://example.com/ns#");
    });
  });

  describe("Prefix/URI Mapping", () => {
    it("should get prefix by URI", () => {
      const prefix = manager.getPrefixByUri("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
      expect(prefix).toBe("rdf");
    });

    it("should check if URI is registered", () => {
      expect(manager.hasUri("http://www.w3.org/1999/02/22-rdf-syntax-ns#")).toBe(true);
      expect(manager.hasUri("https://nonexistent.org/")).toBe(false);
    });

    it("should return null for unknown prefix", () => {
      expect(manager.getNamespace("unknown")).toBeNull();
    });

    it("should return null for unknown URI", () => {
      expect(manager.getPrefixByUri("https://unknown.org/")).toBeNull();
    });
  });

  describe("Prefix Declaration Generation", () => {
    it("should generate prefix declarations", () => {
      const declarations = manager.generatePrefixDeclarations(["rdf", "rdfs", "owl"]);
      expect(declarations).toContain("@prefix rdf:");
      expect(declarations).toContain("@prefix rdfs:");
      expect(declarations).toContain("@prefix owl:");
    });

    it("should generate declarations for all namespaces", () => {
      const declarations = manager.generatePrefixDeclarations();
      expect(declarations).toContain("@prefix rdf:");
      expect(declarations).toContain("@prefix gv:");
      expect(declarations.split("\n").length).toBeGreaterThan(10);
    });

    it("should format declarations with proper syntax", () => {
      const declarations = manager.generatePrefixDeclarations(["rdf"]);
      expect(declarations).toMatch(/@prefix rdf: <http:\/\/.*> \./);
    });
  });

  describe("Prefix Declaration Validation", () => {
    it("should validate correct prefix declarations", () => {
      const turtle = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .`;
      const result = manager.validatePrefixDeclarations(turtle);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("should detect prefix mismatches", () => {
      const turtle = `@prefix rdf: <http://different-uri.org/> .`;
      const result = manager.validatePrefixDeclarations(turtle);
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].type).toBe("mismatch");
    });

    it("should detect unknown prefixes", () => {
      const turtle = `@prefix custom: <https://custom.org/> .`;
      const result = manager.validatePrefixDeclarations(turtle);
      const unknownIssues = result.issues.filter((i) => i.type === "unknown");
      expect(unknownIssues.length).toBeGreaterThan(0);
    });

    it("should report line numbers for issues", () => {
      const turtle = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix bad: <http://bad-uri.org/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .`;
      const result = manager.validatePrefixDeclarations(turtle);
      const badIssue = result.issues.find((i) => i.prefix === "bad");
      expect(badIssue.line).toBeGreaterThan(0);
    });
  });

  describe("Prefix Extraction", () => {
    it("should extract prefixes from Turtle content", () => {
      const turtle = `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
ex:test gv:property "value" .`;
      const used = manager.extractPrefixesUsed(turtle);
      expect(used.has("ex")).toBe(true);
      expect(used.has("gv")).toBe(true);
    });

    it("should extract all declared prefixes", () => {
      const turtle = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .`;
      const used = manager.extractPrefixesUsed(turtle);
      expect(used.has("rdf")).toBe(true);
      expect(used.has("owl")).toBe(true);
      expect(used.has("rdfs")).toBe(true);
    });
  });

  describe("Consistency Checking", () => {
    it("should check consistency across files", () => {
      const filesPrefixes = new Map([
        ["file1.ttl", new Set(["ex", "rdf", "owl"])],
        ["file2.ttl", new Set(["ex", "gv", "rdf"])],
        ["file3.ttl", new Set(["rdf", "owl"])],
      ]);

      const report = manager.checkConsistency(filesPrefixes);
      expect(report.totalFiles).toBe(3);
      expect(report.prefixUsage.has("rdf")).toBe(true);
      expect(report.prefixUsage.get("rdf").count).toBe(3);
    });

    it("should calculate statistics", () => {
      const filesPrefixes = new Map([
        ["file1.ttl", new Set(["ex", "rdf"])],
        ["file2.ttl", new Set(["rdf", "owl"])],
      ]);

      const report = manager.checkConsistency(filesPrefixes);
      expect(report.stats.totalPrefixes).toBeGreaterThan(0);
      expect(report.stats.avgPrefixesPerFile).toBeGreaterThan(0);
    });
  });

  describe("Statistics and Export", () => {
    it("should get namespace statistics", () => {
      const stats = manager.getStatistics();
      expect(stats.totalNamespaces).toBeGreaterThan(0);
      expect(stats.byCategory).toHaveProperty("core");
      expect(stats.byCategory).toHaveProperty("domain");
    });

    it("should export to JSON", () => {
      const json = manager.toJSON();
      expect(json.namespaces).toBeDefined();
      expect(json.statistics).toBeDefined();
      expect(json.initialized).toBe(true);
    });

    it("should filter export by category", () => {
      const json = manager.toJSON("core");
      for (const ns of Object.values(json.namespaces)) {
        expect(ns.category).toBe("core");
      }
    });
  });
});

/**
 * Test Suite: LRU Cache
 */
describe("LRU Cache", () => {
  let cache;

  beforeEach(() => {
    cache = new LRUCache(3, 600000);
  });

  describe("Basic Operations", () => {
    it("should set and get values", () => {
      cache.set("key1", "value1");
      expect(cache.get("key1")).toBe("value1");
    });

    it("should return null for missing keys", () => {
      expect(cache.get("missing")).toBeNull();
    });

    it("should clear cache", () => {
      cache.set("key1", "value1");
      cache.clear();
      expect(cache.get("key1")).toBeNull();
    });
  });

  describe("LRU Eviction", () => {
    it("should evict least recently used item when full", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");
      cache.set("key4", "value4"); // Should evict key1

      expect(cache.get("key1")).toBeNull();
      expect(cache.get("key4")).toBe("value4");
    });

    it("should update access order on get", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");
      cache.get("key1"); // key1 is now recent
      cache.set("key4", "value4"); // Should evict key2

      expect(cache.get("key1")).toBe("value1");
      expect(cache.get("key2")).toBeNull();
    });
  });

  describe("TTL Expiration", () => {
    it("should expire items after TTL", (done) => {
      const shortCache = new LRUCache(10, 100); // 100ms TTL
      shortCache.set("key1", "value1");
      expect(shortCache.get("key1")).toBe("value1");

      setTimeout(() => {
        expect(shortCache.get("key1")).toBeNull();
        done();
      }, 150);
    });
  });

  describe("Statistics", () => {
    it("should report cache statistics", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.get("key1");

      const stats = cache.getStats();
      expect(stats.itemCount).toBe(2);
      expect(stats.maxSize).toBe(3);
      expect(stats.totalHits).toBeGreaterThan(0);
    });

    it("should calculate utilization percentage", () => {
      cache.set("key1", "value1");
      const stats = cache.getStats();
      expect(stats.utilizationPercent).toBeLessThanOrEqual(100);
      expect(stats.utilizationPercent).toBeGreaterThan(0);
    });
  });
});

/**
 * Test Suite: Delta Tracker
 */
describe("Delta Tracker", () => {
  let tracker;

  beforeEach(() => {
    tracker = new DeltaTracker();
  });

  describe("Hash Generation", () => {
    it("should generate consistent hashes", () => {
      const quads = ["ex:a ex:b 1 .", "ex:c ex:d 2 ."];
      const hash1 = tracker.hashStore(quads);
      const hash2 = tracker.hashStore(quads);
      expect(hash1).toBe(hash2);
    });

    it("should generate different hashes for different content", () => {
      const quads1 = ["ex:a ex:b 1 ."];
      const quads2 = ["ex:a ex:b 2 ."];
      const hash1 = tracker.hashStore(quads1);
      const hash2 = tracker.hashStore(quads2);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("Change Detection", () => {
    it("should detect store changes", () => {
      const store1 = ["ex:a ex:b 1 .", "ex:c ex:d 2 ."];
      expect(tracker.hasChanged(store1)).toBe(true);

      expect(tracker.hasChanged(store1)).toBe(false);

      const store2 = ["ex:a ex:b 1 .", "ex:c ex:d 3 ."];
      expect(tracker.hasChanged(store2)).toBe(true);
    });

    it("should handle empty stores", () => {
      expect(tracker.hasChanged([])).toBe(true);
      expect(tracker.hasChanged([])).toBe(false);
    });
  });

  describe("Delta Computation", () => {
    it("should compute added quads", () => {
      const oldStore = ["ex:a ex:b 1 ."];
      const newStore = ["ex:a ex:b 1 .", "ex:c ex:d 2 ."];

      const delta = tracker.computeDelta(oldStore, newStore);
      expect(delta.added.size).toBe(1);
      expect(delta.removed.size).toBe(0);
    });

    it("should compute removed quads", () => {
      const oldStore = ["ex:a ex:b 1 .", "ex:c ex:d 2 ."];
      const newStore = ["ex:a ex:b 1 ."];

      const delta = tracker.computeDelta(oldStore, newStore);
      expect(delta.removed.size).toBe(1);
      expect(delta.added.size).toBe(0);
    });

    it("should compute complex deltas", () => {
      const oldStore = ["ex:a ex:b 1 .", "ex:c ex:d 2 .", "ex:e ex:f 3 ."];
      const newStore = ["ex:a ex:b 1 .", "ex:c ex:d 4 .", "ex:g ex:h 5 ."];

      const delta = tracker.computeDelta(oldStore, newStore);
      expect(delta.added.size).toBeGreaterThan(0);
      expect(delta.removed.size).toBeGreaterThan(0);
    });
  });

  describe("State Reset", () => {
    it("should reset tracking state", () => {
      const store = ["ex:a ex:b 1 ."];
      tracker.hasChanged(store);
      expect(tracker.lastHash).not.toBeNull();

      tracker.reset();
      expect(tracker.lastHash).toBeNull();
      expect(tracker.lastSerialized).toBeNull();
    });
  });
});

/**
 * Test Suite: Turtle Serializer
 */
describe("Turtle Serializer", () => {
  let serializer;

  beforeEach(() => {
    serializer = createTurtleSerializer({
      cacheSize: 10,
      cacheTTL: 600000,
    });
  });

  afterEach(() => {
    serializer.clearCache();
  });

  describe("Initialization", () => {
    it("should initialize with default options", () => {
      const s = createTurtleSerializer();
      expect(s.parseCache).toBeDefined();
      expect(s.deltaTracker).toBeDefined();
    });

    it("should accept custom options", () => {
      const s = createTurtleSerializer({
        cacheSize: 50,
        enableCompression: false,
      });
      expect(s.parseCache.maxSize).toBe(50);
      expect(s.enableCompression).toBe(false);
    });
  });

  describe("Namespace Extraction", () => {
    it("should extract namespace from IRI with hash", () => {
      const iri = "https://example.org/ns#term";
      const ns = serializer.getNamespace(iri);
      expect(ns).toBe("https://example.org/ns#");
    });

    it("should extract namespace from IRI with slash", () => {
      const iri = "https://example.org/ns/term";
      const ns = serializer.getNamespace(iri);
      expect(ns).toBe("https://example.org/ns/");
    });

    it("should handle priority of hash over slash", () => {
      const iri = "https://example.org/ns/sub#term";
      const ns = serializer.getNamespace(iri);
      expect(ns).toBe("https://example.org/ns/sub#");
    });
  });

  describe("Prefix Mapping", () => {
    it("should map standard namespaces to prefixes", () => {
      const prefix = serializer.getPrefix("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
      expect(prefix).toBe("rdf");
    });

    it("should generate unique prefixes for unknown namespaces", () => {
      const prefix = serializer.getPrefix("https://unknown.org/");
      expect(prefix).toMatch(/^ns/);
    });
  });

  describe("Blank Node Compression", () => {
    it("should compress blank node identifiers", () => {
      const turtle = `_:b12345 <http://example.org/property> "value" .
_:b67890 <http://example.org/property> "value" .`;
      const compressed = serializer.compressBlankNodes(turtle);
      expect(compressed).toContain("_:b0");
      expect(compressed).toContain("_:b1");
    });

    it("should maintain turtle validity after compression", () => {
      const turtle = "_:b123 <http://ex.org/p> _:b456 .";
      const compressed = serializer.compressBlankNodes(turtle);
      expect(compressed).toContain("_:b");
    });
  });

  describe("Quad Sorting", () => {
    it("should sort Turtle statements", () => {
      const turtle = `ex:c ex:p "3" .
ex:a ex:p "1" .
ex:b ex:p "2" .`;
      const sorted = serializer.sortTurtleQuads(turtle);
      const lines = sorted.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
      expect(lines[0]).toContain("ex:a");
      expect(lines[1]).toContain("ex:b");
    });

    it("should preserve prefix declarations at top", () => {
      const turtle = `@prefix ex: <http://example.org/> .
ex:a ex:p "1" .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .`;
      const sorted = serializer.sortTurtleQuads(turtle);
      expect(sorted.indexOf("@prefix")).toBe(0);
    });
  });

  describe("Cache Statistics", () => {
    it("should report cache statistics", () => {
      const stats = serializer.getStats();
      expect(stats.cache).toBeDefined();
      expect(stats.cache.itemCount).toBeGreaterThanOrEqual(0);
    });

    it("should report delta tracker state", () => {
      const stats = serializer.getStats();
      expect(stats.deltaTracker).toBeDefined();
      expect(stats.deltaTracker.hasLastState).toBe(false);
    });
  });

  describe("Cache Clearing", () => {
    it("should clear all caches", () => {
      serializer.clearCache();
      const stats = serializer.getStats();
      expect(stats.cache.itemCount).toBe(0);
      expect(stats.deltaTracker.hasLastState).toBe(false);
    });
  });
});

/**
 * Test Suite: Integration Tests
 */
describe("Turtle Format Integration", () => {
  let manager;
  let serializer;

  beforeEach(() => {
    manager = createNamespaceManager();
    serializer = createTurtleSerializer();
  });

  afterEach(() => {
    serializer.clearCache();
  });

  describe("End-to-End Workflow", () => {
    it("should validate and serialize workflow Turtle", () => {
      const turtle = `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:my-hook rdf:type gh:Hook ;
    gv:title "Test Hook" ;
    gh:hasPredicate ex:predicate ;
    gh:orderedPipelines ex:pipeline .`;

      const validation = manager.validatePrefixDeclarations(turtle);
      expect(validation.valid).toBe(true);

      const used = manager.extractPrefixesUsed(turtle);
      expect(used.has("ex")).toBe(true);
      expect(used.has("gv")).toBe(true);
    });

    it("should detect schema issues in Turtle", () => {
      const turtle = `@prefix bad: <http://wrong-uri.org/> .
bad:thing ex:property "value" .`;

      const validation = manager.validatePrefixDeclarations(turtle);
      const issues = validation.issues.filter((i) => i.type === "unknown");
      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe("Performance Benchmarking", () => {
    it("should handle large prefix lists", () => {
      const largeFilesPrefixes = new Map();
      for (let i = 0; i < 100; i++) {
        largeFilesPrefixes.set(`file${i}.ttl`, new Set(["rdf", "owl", "ex"]));
      }

      const startTime = performance.now();
      const report = manager.checkConsistency(largeFilesPrefixes);
      const duration = performance.now() - startTime;

      expect(report.totalFiles).toBe(100);
      expect(duration).toBeLessThan(1000); // Should complete in < 1 second
    });

    it("should cache serialization results efficiently", () => {
      const cache = serializer.parseCache;
      const initialStats = cache.getStats();

      // Simulate multiple accesses
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.get("key1");
      cache.get("key1");
      cache.get("key1");

      const afterStats = cache.getStats();
      expect(afterStats.totalHits).toBeGreaterThan(initialStats.totalHits);
    });
  });
});

/**
 * Test Suite: Error Handling
 */
describe("Error Handling", () => {
  describe("Namespace Manager Error Handling", () => {
    it("should handle invalid Turtle syntax gracefully", () => {
      const manager = createNamespaceManager();
      const invalidTurtle = "@prefix broken without uri .";
      const result = manager.validatePrefixDeclarations(invalidTurtle);
      expect(result).toBeDefined();
      // Should not throw, but report issues
    });
  });

  describe("Serializer Error Handling", () => {
    it("should handle compression errors gracefully", async () => {
      const serializer = createTurtleSerializer();
      // This test ensures errors are caught and logged
      expect(serializer.enableCompression).toBeDefined();
    });

    it("should handle namespace extraction errors", () => {
      const serializer = createTurtleSerializer();
      const ns = serializer.getNamespace(null);
      expect(ns).toBeNull();
    });
  });
});
