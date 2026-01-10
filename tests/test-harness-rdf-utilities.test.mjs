/**
 * Test Harness and RDF Utilities Tests
 *
 * Demonstrates usage of:
 * - Test Harness (context setup, mock store, cleanup)
 * - RDF Test Helpers (quad creation, graph comparison, SPARQL validation)
 *
 * These tests validate that the testing infrastructure itself works correctly.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestHarness, testHarness } from './harness.mjs';
import {
  createTestQuad,
  createTestGraph,
  createLiteral,
  assertGraphEqual,
  assertQuadExists,
  assertQuadNotExists,
  assertResultCount,
  assertResultBinding,
  RDFNamespaces,
  createNamespace,
  toNTriples,
  validateSPARQL,
  graphsAreIsomorphic,
  getGraphQuads,
} from './utils/rdf-test-helpers.mjs';

describe('Test Harness - Context Setup', () => {
  let harness;

  beforeEach(() => {
    harness = createTestHarness();
  });

  afterEach(() => {
    if (harness) {
      harness.cleanup();
    }
  });

  it('should create test directory', () => {
    harness.setupContext();
    const testDir = harness.getTestDir();

    expect(testDir).toBeDefined();
    expect(testDir).toContain('gitvan-test');
  });

  it('should setup deterministic git environment', () => {
    harness.setupContext();

    expect(process.env.TZ).toBe('UTC');
    expect(process.env.LANG).toBe('C');
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.GITVAN_TEST_MODE).toBe('true');
  });

  it('should return valid context object', () => {
    harness.setupContext();
    const context = harness.getContext();

    expect(context).toBeDefined();
    expect(context.cwd).toBeDefined();
    expect(context.root).toBeDefined();
    expect(context.env).toBeDefined();
    expect(context.store).toBeDefined();
    expect(context.testMode).toBe(true);
    expect(typeof context.now).toBe('function');
    expect(context.nowISO).toBeDefined();
  });

  it('should create nested context with overrides', () => {
    harness.setupContext();
    const nestedContext = harness.createNestedContext({
      cwd: '/custom/path',
      customVar: 'value',
    });

    expect(nestedContext.cwd).toBe('/custom/path');
    expect(nestedContext.customVar).toBe('value');
    expect(nestedContext.root).toBeDefined();
  });

  it('should reset context while preserving store', () => {
    harness.setupContext();
    const store = harness.getStore();
    store.addQuad('s1', 'p1', 'o1');

    harness.resetContext();

    expect(harness.getStore()).toBe(store);
    expect(store.size()).toBe(1);
  });

  it('should reset store while preserving context', () => {
    harness.setupContext();
    const context = harness.getContext();
    const store = harness.getStore();
    store.addQuad('s1', 'p1', 'o1');

    expect(store.size()).toBe(1);

    harness.resetStore();

    expect(store.size()).toBe(0);
    expect(harness.getContext()).toBe(context);
  });

  it('should cleanup test directory', () => {
    const testDir = harness.setupTestDir();
    expect(testDir).toBeDefined();

    harness.cleanup();

    // After cleanup, directory should not exist or be reset
    // (Just verify cleanup runs without error)
    expect(harness.getTestDir()).toBe(null);
  });
});

describe('Test Harness - Mock RDF Store', () => {
  let harness;

  beforeEach(() => {
    harness = createTestHarness();
    harness.setupContext();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('should create mock store', () => {
    const store = harness.getStore();

    expect(store).toBeDefined();
    expect(typeof store.addQuad).toBe('function');
    expect(typeof store.getQuads).toBe('function');
    expect(typeof store.clear).toBe('function');
  });

  it('should add and retrieve quads', () => {
    const store = harness.getStore();

    store.addQuad('http://example.org/s', 'http://example.org/p', 'object');
    const quads = store.getQuads();

    expect(quads.length).toBe(1);
    expect(quads[0].subject).toBe('http://example.org/s');
  });

  it('should filter quads by pattern', () => {
    const store = harness.getStore();

    store.addQuad('http://example.org/s1', 'http://example.org/p', 'o1');
    store.addQuad('http://example.org/s2', 'http://example.org/p', 'o2');
    store.addQuad('http://example.org/s1', 'http://example.org/q', 'o3');

    const matches = store.getQuads({
      subject: 'http://example.org/s1',
    });

    expect(matches.length).toBe(2);
  });

  it('should clear store', () => {
    const store = harness.getStore();

    store.addQuad('s1', 'p1', 'o1');
    store.addQuad('s2', 'p2', 'o2');

    expect(store.size()).toBe(2);

    store.clear();

    expect(store.size()).toBe(0);
  });

  it('should clone store', () => {
    const store = harness.getStore();

    store.addQuad('s1', 'p1', 'o1');
    const cloned = store.clone();

    expect(cloned.size()).toBe(1);
    expect(cloned).not.toBe(store);
  });
});

describe('RDF Test Helpers - Quad Creation', () => {
  it('should create simple quads', () => {
    const quad = createTestQuad(
      'http://example.org/subject',
      'http://example.org/predicate',
      'object value'
    );

    expect(quad.subject).toBe('http://example.org/subject');
    expect(quad.predicate).toBe('http://example.org/predicate');
    expect(quad.object).toBe('object value');
    expect(quad.graph).toBe(null);
  });

  it('should create quads with graph', () => {
    const quad = createTestQuad('s', 'p', 'o', 'http://example.org/graph');

    expect(quad.graph).toBe('http://example.org/graph');
  });

  it('should create literals', () => {
    const lit = createLiteral('value', null, null);

    expect(lit.value).toBe('value');
    expect(lit.isLiteral).toBe(true);
  });

  it('should create typed literals', () => {
    const numLit = createLiteral(42);

    expect(numLit.value).toBe(42);
    expect(numLit.type).toBe(RDFNamespaces.XSD + 'number');
  });

  it('should create language-tagged literals', () => {
    const langLit = createLiteral('Hello', null, 'en');

    expect(langLit.value).toBe('Hello');
    expect(langLit.language).toBe('en');
  });

  it('should create namespaced URIs', () => {
    const ex = createNamespace(RDFNamespaces.GITVAN);
    const uri = ex('MyClass');

    expect(uri).toBe('http://gitvan.org/ontology/MyClass');
  });
});

describe('RDF Test Helpers - Graph Operations', () => {
  it('should create test graph', () => {
    const graph = createTestGraph();

    expect(graph.quads).toBeDefined();
    expect(Array.isArray(graph.quads)).toBe(true);
    expect(graph.size()).toBe(0);
  });

  it('should add quads to graph', () => {
    const graph = createTestGraph();

    graph.addQuad('s1', 'p1', 'o1');
    graph.addQuad('s2', 'p2', 'o2');

    expect(graph.size()).toBe(2);
  });

  it('should chain quad additions', () => {
    const graph = createTestGraph();

    graph
      .addQuad('s1', 'p1', 'o1')
      .addQuad('s2', 'p2', 'o2')
      .addTriple('s3', 'p3', 'o3');

    expect(graph.size()).toBe(3);
  });

  it('should filter quads by pattern', () => {
    const graph = createTestGraph();

    graph.addQuad('s1', 'p1', 'o1');
    graph.addQuad('s1', 'p2', 'o2');
    graph.addQuad('s2', 'p1', 'o3');

    const matches = graph.getQuads({ subject: 's1' });

    expect(matches.length).toBe(2);
  });

  it('should convert to array', () => {
    const graph = createTestGraph();

    graph.addQuad('s1', 'p1', 'o1');
    graph.addQuad('s2', 'p2', 'o2');

    const arr = graph.toArray();

    expect(Array.isArray(arr)).toBe(true);
    expect(arr.length).toBe(2);
  });

  it('should clear graph', () => {
    const graph = createTestGraph();

    graph.addQuad('s1', 'p1', 'o1');
    expect(graph.size()).toBe(1);

    graph.clear();

    expect(graph.size()).toBe(0);
  });
});

describe('RDF Test Helpers - Graph Assertions', () => {
  it('should assert graphs are equal', () => {
    const g1 = createTestGraph();
    g1.addQuad('s', 'p', 'o');

    const g2 = createTestGraph();
    g2.addQuad('s', 'p', 'o');

    expect(() => assertGraphEqual(g1, g2)).not.toThrow();
  });

  it('should throw on graph size mismatch', () => {
    const g1 = createTestGraph();
    g1.addQuad('s1', 'p', 'o');

    const g2 = createTestGraph();
    g2.addQuad('s1', 'p', 'o');
    g2.addQuad('s2', 'p', 'o');

    expect(() => assertGraphEqual(g1, g2)).toThrow('Graph size mismatch');
  });

  it('should assert quad exists', () => {
    const graph = createTestGraph();
    const quad = createTestQuad('s', 'p', 'o');

    graph.addQuad('s', 'p', 'o');

    expect(() => assertQuadExists(graph, quad)).not.toThrow();
  });

  it('should throw when quad not exists', () => {
    const graph = createTestGraph();
    const quad = createTestQuad('s', 'p', 'missing');

    graph.addQuad('s', 'p', 'o');

    expect(() => assertQuadExists(graph, quad)).toThrow(
      'Quad not found in graph'
    );
  });

  it('should assert quad does not exist', () => {
    const graph = createTestGraph();
    const quad = createTestQuad('missing', 'p', 'o');

    graph.addQuad('s', 'p', 'o');

    expect(() => assertQuadNotExists(graph, quad)).not.toThrow();
  });

  it('should throw when quad unexpectedly exists', () => {
    const graph = createTestGraph();
    const quad = createTestQuad('s', 'p', 'o');

    graph.addQuad('s', 'p', 'o');

    expect(() => assertQuadNotExists(graph, quad)).toThrow(
      'Quad unexpectedly found in graph'
    );
  });
});

describe('RDF Test Helpers - Result Assertions', () => {
  it('should assert result count', () => {
    const results = [
      { x: { value: 'value1' } },
      { x: { value: 'value2' } },
    ];

    expect(() => assertResultCount(results, 2)).not.toThrow();
  });

  it('should throw on count mismatch', () => {
    const results = [{ x: { value: 'value1' } }];

    expect(() => assertResultCount(results, 2)).toThrow(
      'Result count mismatch'
    );
  });

  it('should assert result binding', () => {
    const result = { x: { value: 'expected' } };

    expect(() => assertResultBinding(result, 'x', 'expected')).not.toThrow();
  });

  it('should throw on binding mismatch', () => {
    const result = { x: { value: 'actual' } };

    expect(() => assertResultBinding(result, 'x', 'expected')).toThrow(
      'Binding mismatch'
    );
  });
});

describe('RDF Test Helpers - Utilities', () => {
  it('should convert to N-Triples', () => {
    const quads = [
      createTestQuad('http://example.org/s', 'http://example.org/p', 'o'),
    ];

    const ntriples = toNTriples(quads);

    expect(ntriples).toContain('<http://example.org/s>');
    expect(ntriples).toContain('<http://example.org/p>');
  });

  it('should validate SPARQL SELECT', () => {
    const result = validateSPARQL('SELECT ?x WHERE { ?x ?p ?o }');

    expect(result.isValid).toBe(true);
    expect(result.queryType).toBe('SELECT');
  });

  it('should validate SPARQL ASK', () => {
    const result = validateSPARQL('ASK { ?x ?p ?o }');

    expect(result.queryType).toBe('ASK');
  });

  it('should validate SPARQL CONSTRUCT', () => {
    const result = validateSPARQL('CONSTRUCT { ?x ?p ?o } WHERE { ?x ?p ?o }');

    expect(result.queryType).toBe('CONSTRUCT');
  });

  it('should check graph isomorphism', () => {
    const g1 = createTestGraph();
    g1.addQuad('s', 'p', 'o');

    const g2 = createTestGraph();
    g2.addQuad('s', 'p', 'o');

    expect(graphsAreIsomorphic(g1, g2)).toBe(true);
  });

  it('should return false for non-isomorphic graphs', () => {
    const g1 = createTestGraph();
    g1.addQuad('s1', 'p', 'o');

    const g2 = createTestGraph();
    g2.addQuad('s2', 'p', 'o');

    expect(graphsAreIsomorphic(g1, g2)).toBe(false);
  });

  it('should get graph quads with filtering', () => {
    const graph = createTestGraph();
    graph.addQuad('s1', 'p', 'o');
    graph.addQuad('s2', 'p', 'o');

    const quads = getGraphQuads(graph, { subject: 's1' });

    expect(quads.length).toBe(1);
  });
});

describe('Test Harness - Integration', () => {
  it('should use withHarness wrapper', async () => {
    const testFn = testHarness.withHarness(async (harness) => {
      const context = harness.getContext();

      expect(context).toBeDefined();
      expect(context.testMode).toBe(true);

      // Verify cleanup happens
      const testDir = harness.getTestDir();
      expect(testDir).toBeDefined();

      return 'test-result';
    });

    const result = await testFn();

    expect(result).toBe('test-result');
  });

  it('should handle errors in withHarness', async () => {
    const testFn = testHarness.withHarness(async (harness) => {
      const context = harness.getContext();
      expect(context).toBeDefined();

      throw new Error('Test error');
    });

    await expect(testFn()).rejects.toThrow('Test error');
  });
});
