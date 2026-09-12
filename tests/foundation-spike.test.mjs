/**
 * Foundation Spike Tests - Validate v5.0 core components
 *
 * Tests the critical foundation files, including the GitVan ↔ KGC-4D seam.
 */

import { describe, it, expect } from 'vitest';
import {
  unrdfStore,
  UnrdfStore,
  namedNode,
  literal,
  quad,
} from '../src/core/unrdf-store.mjs';
import {
  configToRdf,
  rdfToConfig,
  NAMESPACES,
  createIRI,
} from '../src/config/rdf-adapter.mjs';
import {
  captureHookEvent,
  captureHookEventWithReceipt,
  EVENT_NAMESPACES,
  createEventGraph,
  createEventIdentity,
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

  it('should return native KGC-4D receipts for admitted mutations', async () => {
    const store = new UnrdfStore();
    await store.initialize({ kgcNodeId: 'gitvan-foundation-test' });

    const testQuad = quad(
      namedNode('urn:gitvan:test:subject'),
      namedNode('urn:gitvan:test:predicate'),
      literal('value')
    );

    const inserted = await store.insert([testQuad], null, {
      eventData: {
        type: 'FOUNDATION_TEST',
        payload: { boundary: 'gitvan-kgc4d' },
        git_ref: null,
      },
    });

    expect(inserted.receipt).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        t_ns: expect.any(String),
      })
    );
    expect(store.getTemporalStats()).toMatchObject({
      nodeId: 'gitvan-foundation-test',
      eventCount: 1,
    });

    const deleted = await store.delete([testQuad]);
    expect(deleted.receipt).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        t_ns: expect.any(String),
      })
    );
    expect(store.getTemporalStats().eventCount).toBe(2);
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
    expect(restored.jobsPath).toBe('./jobs');
  });
});

/**
 * Test: Event Capture Bridge
 */
describe('Event Capture Bridge', () => {
  const FIXED_TIME = '2026-09-11T21:25:00.000Z';

  it('should create deterministic event graph URIs while KGC-4D owns transaction-time', () => {
    const eventId = 'urn:gitvan:event:sha256:abc123';
    const graph = createEventGraph(FIXED_TIME, eventId);

    expect(graph.termType).toBe('NamedNode');
    expect(graph.value).toContain('urn:gitvan:event-graph:');
    expect(graph.value).toContain(encodeURIComponent(FIXED_TIME));
    expect(graph.value).toContain('abc123');
  });

  it('should derive stable event identity independent of object key order', () => {
    const left = {
      hookName: 'post-commit',
      git: {
        commitSHA: 'abc123def456',
        author: 'test@example.com',
      },
      timestamp: FIXED_TIME,
    };
    const right = {
      timestamp: FIXED_TIME,
      git: {
        author: 'test@example.com',
        commitSHA: 'abc123def456',
      },
      hookName: 'post-commit',
    };

    expect(createEventIdentity(left, FIXED_TIME)).toBe(
      createEventIdentity(right, FIXED_TIME)
    );
  });

  it('should reject observations without valid-time instead of inventing a timestamp', async () => {
    await expect(
      captureHookEvent(
        {
          hookName: 'pre-commit',
          git: { stagedFiles: ['src/main.mjs'] },
        },
        { persist: false }
      )
    ).rejects.toThrow('timestamp is required');
  });

  it('should capture pre-commit events', async () => {
    const hookData = {
      hookName: 'pre-commit',
      git: {
        stagedFiles: ['src/main.mjs', 'tests/main.test.mjs'],
        unstagedFiles: ['docs/README.md'],
      },
      timestamp: FIXED_TIME,
    };

    const quads = await captureHookEvent(hookData, { persist: false });

    expect(Array.isArray(quads)).toBe(true);
    expect(quads.length).toBeGreaterThan(0);

    const typeQuad = quads.find((q) => q.predicate.value.includes('type'));
    expect(typeQuad).toBeDefined();
    expect(typeQuad.object.value).toBe(
      'http://gitvan.local/ontology/PreCommitEvent'
    );
  });

  it('should capture post-commit events with author', async () => {
    const hookData = {
      hookName: 'post-commit',
      git: {
        commitSHA: 'abc123def456',
        author: 'test@example.com',
        message: 'Initial commit',
      },
      timestamp: FIXED_TIME,
    };

    const quads = await captureHookEvent(hookData, { persist: false });

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
      timestamp: FIXED_TIME,
    };

    const quads = await captureHookEvent(hookData, { persist: false });

    const refQuads = quads.filter((q) =>
      q.subject.value.includes('urn:git:ref:')
    );
    expect(refQuads.length).toBeGreaterThan(0);
  });

  it('should encode valid-time as RDF and keep receipt optional before admission', async () => {
    const result = await captureHookEventWithReceipt(
      {
        hookName: 'post-commit',
        git: {
          commitSHA: 'abc123def456',
          author: 'test@example.com',
        },
        timestamp: FIXED_TIME,
      },
      { persist: false }
    );

    const validTimeQuad = result.quads.find(
      (q) =>
        q.subject.value === result.eventId &&
        q.predicate.value === `${EVENT_NAMESPACES.dct}created`
    );

    expect(validTimeQuad.object.value).toBe(FIXED_TIME);
    expect(result.receipt).toBeNull();
    expect(result.refPath).toBeNull();
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
  it('should create properly formed config quads', () => {
    const quads = configToRdf({ test: 'value' });

    for (const rdfQuad of quads) {
      expect(rdfQuad.subject).toBeDefined();
      expect(rdfQuad.predicate).toBeDefined();
      expect(rdfQuad.object).toBeDefined();
      expect(rdfQuad.subject.type).toBe('NamedNode');
      expect(rdfQuad.predicate.type).toBe('NamedNode');
      expect(['NamedNode', 'Literal']).toContain(rdfQuad.object.type);
    }
  });

  it('should preserve literal datatype information', () => {
    const quads = configToRdf({ count: 42 });

    const numberQuad = quads.find(
      (q) => q.object.type === 'Literal' && q.object.value === '42'
    );

    expect(numberQuad).toBeDefined();
    expect(numberQuad.object.datatype).toBeDefined();
    expect(numberQuad.object.datatype.value).toContain('XMLSchema');
  });
});
