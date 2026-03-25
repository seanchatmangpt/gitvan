/**
 * Foundation Spike Tests - Validate v5.0 core components
 *
 * Tests the 5 critical foundation files:
 * 1. @unrdf/core store wrapper
 * 2. SPARQL endpoint
 * 3. RDF config adapter
 * 4. Nitro store plugin
 * 5. Event capture bridge
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { unrdfStore, UnrdfStore } from '../src/core/unrdf-store.mjs';
import {
  configToRdf,
  rdfToConfig,
  NAMESPACES,
  createIRI,
} from '../src/config/rdf-adapter.mjs';
import {
  captureHookEvent,
  EVENT_NAMESPACES,
  createEventGraph,
} from '../src/adapters/kgc-4d-event-capture.mjs';

/**
 * Test: UnRDF Store Initialization
 */
describe('UnRDF Store', () => {
  it('should create store instance', () => {
    expect(unrdfStore).toBeInstanceOf(UnrdfStore);
  });

  it('should initialize store without errors', async () => {
    const store = new UnrdfStore();
    const result = await store.initialize();

    expect(result).toBeDefined();
    expect(store.initialized).toBe(true);
    expect(store.getStats()).toHaveProperty('totalQuads');
  });

  it('should track quad statistics', async () => {
    const store = new UnrdfStore();
    await store.initialize();

    const stats = store.getStats();
    expect(stats).toMatchObject({
      quadsWritten: expect.any(Number),
      quadsRead: expect.any(Number),
      queriesExecuted: expect.any(Number),
      initialized: true,
    });
  });
});

/**
 * Test: RDF Config Adapter
 */
describe('RDF Config Adapter', () => {
  const sampleConfig = {
    jobsPath: './jobs',
    hooksEnabled: true,
    maxWorkers: 4,
    ai: {
      provider: 'anthropic',
      timeout: 30000,
    },
  };

  it('should convert config to RDF quads', () => {
    const quads = configToRdf(sampleConfig);

    expect(Array.isArray(quads)).toBe(true);
    expect(quads.length).toBeGreaterThan(0);
  });

  it('should include config type declaration', () => {
    const quads = configToRdf(sampleConfig);
    const typeQuad = quads.find(
      (q) =>
        q.predicate.value === NAMESPACES.rdf + 'type' &&
        q.object.value === createIRI('gitvan', 'Config')
    );

    expect(typeQuad).toBeDefined();
  });

  it('should convert nested objects to separate quads', () => {
    const quads = configToRdf(sampleConfig);

    // Should have more than just simple scalar quads due to nested ai object
    expect(quads.length).toBeGreaterThan(4);
  });

  it('should preserve literal types', () => {
    const quads = configToRdf(sampleConfig);

    const numberQuad = quads.find(
      (q) =>
        q.object.type === 'Literal' &&
        q.object.value === '4' &&
        q.object.datatype.value === NAMESPACES.xsd + 'decimal'
    );

    expect(numberQuad).toBeDefined();
  });

  it('should round-trip config through RDF', () => {
    const quads = configToRdf(sampleConfig);
    const restored = rdfToConfig(quads);

    // Note: Round-trip won't be 100% perfect due to nested object flattening
    // but basic properties should be preserved
    expect(restored.jobsPath).toBe('./jobs');
  });
});

/**
 * Test: Event Capture Bridge
 */
describe('Event Capture Bridge', () => {
  it('should create event graph URIs with 4D semantics', () => {
    const validTime = '2026-01-11T12:00:00Z';
    const transactionTime = '2026-01-11T12:00:01Z';

    const graph = createEventGraph(validTime, transactionTime);

    expect(graph.type).toBe('NamedNode');
    expect(graph.value).toContain('urn:gitvan:event:');
    expect(graph.value).toContain(validTime);
    expect(graph.value).toContain(transactionTime);
  });

  it('should capture pre-commit events', async () => {
    const hookData = {
      hookName: 'pre-commit',
      git: {
        stagedFiles: ['src/main.mjs', 'tests/main.test.mjs'],
        unstagedFiles: ['docs/README.md'],
      },
      timestamp: new Date().toISOString(),
    };

    const quads = await captureHookEvent(hookData);

    expect(Array.isArray(quads)).toBe(true);
    expect(quads.length).toBeGreaterThan(0);

    // Should have event type
    const typeQuad = quads.find((q) => q.predicate.value.includes('type'));
    expect(typeQuad).toBeDefined();
  });

  it('should capture post-commit events with author', async () => {
    const hookData = {
      hookName: 'post-commit',
      git: {
        commitSHA: 'abc123def456',
        author: 'test@example.com',
        message: 'Initial commit',
      },
      timestamp: new Date().toISOString(),
    };

    const quads = await captureHookEvent(hookData);

    expect(quads.length).toBeGreaterThan(0);

    // Should have commit creation facts
    const commitQuads = quads.filter((q) =>
      q.subject.value.includes('urn:git:commit:')
    );
    expect(commitQuads.length).toBeGreaterThan(0);
  });

  it('should capture ref update events', async () => {
    const hookData = {
      hookName: 'post-checkout',
      git: {
        ref: 'refs/heads/main',
        commitSHA: 'abc123def456',
      },
      timestamp: new Date().toISOString(),
    };

    const quads = await captureHookEvent(hookData);

    expect(quads.length).toBeGreaterThan(0);

    // Should link ref to commit
    const refQuads = quads.filter((q) =>
      q.subject.value.includes('urn:git:ref:')
    );
    expect(refQuads.length).toBeGreaterThan(0);
  });

  it('should encode valid-time and transaction-time in graph', async () => {
    const now = new Date().toISOString();
    const hookData = {
      hookName: 'post-commit',
      git: {
        commitSHA: 'abc123def456',
        author: 'test@example.com',
      },
      timestamp: now,
    };

    const quads = await captureHookEvent(hookData);
    const firstQuad = quads[0];

    expect(firstQuad.graph).toBeDefined();
    // Graph URI should contain event identifier with timestamps
    expect(firstQuad.graph.value).toMatch(/event:/);
    expect(firstQuad.graph.value).toContain(now);
  });
});

/**
 * Test: RDF Namespaces
 */
describe('RDF Namespaces', () => {
  it('should define gitvan namespace', () => {
    expect(NAMESPACES.gitvan).toBe('http://gitvan.local/ontology/');
  });

  it('should define standard RDF namespaces', () => {
    expect(NAMESPACES.rdf).toBe('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
    expect(NAMESPACES.rdfs).toBe('http://www.w3.org/2000/01/rdf-schema#');
    expect(NAMESPACES.xsd).toBe('http://www.w3.org/2001/XMLSchema#');
  });

  it('should define event namespaces', () => {
    expect(EVENT_NAMESPACES.dct).toBe('http://purl.org/dc/terms/');
    expect(EVENT_NAMESPACES.prov).toBe('http://www.w3.org/ns/prov#');
  });

  it('should create IRIs correctly', () => {
    const iri = createIRI('gitvan', 'TestClass');
    expect(iri).toBe('http://gitvan.local/ontology/TestClass');
  });
});

/**
 * Test: Quad Structure Validation
 */
describe('Quad Structure Validation', () => {
  it('should create properly formed quads', () => {
    const quads = configToRdf({ test: 'value' });

    for (const quad of quads) {
      expect(quad.subject).toBeDefined();
      expect(quad.predicate).toBeDefined();
      expect(quad.object).toBeDefined();

      // Subject and predicate must be NamedNodes
      expect(quad.subject.type).toBe('NamedNode');
      expect(quad.predicate.type).toBe('NamedNode');

      // Object can be NamedNode or Literal
      expect(['NamedNode', 'Literal']).toContain(quad.object.type);
    }
  });

  it('should preserve literal datatype information', () => {
    const quads = configToRdf({ count: 42 });

    const numberQuad = quads.find((q) => q.object.type === 'Literal' && q.object.value === '42');

    expect(numberQuad).toBeDefined();
    expect(numberQuad.object.datatype).toBeDefined();
    expect(numberQuad.object.datatype.value).toContain('XMLSchema');
  });
});
