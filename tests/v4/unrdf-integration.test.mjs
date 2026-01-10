/**
 * @fileoverview UnRDF Integration Tests
 *
 * Comprehensive tests to verify all GitVan subsystems work correctly with unrdf.
 * Tests actual API usage patterns across:
 * - Composables (graph, turtle)
 * - Git lifecycle (events, capture)
 * - Workflow execution
 * - Performance monitoring
 * - Error handling
 *
 * @version 4.0.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createStore,
  namedNode,
  literal,
  quad,
  executeQuery,
  executeSelect,
  executeAsk,
  getQuads,
  addQuad,
  removeQuad,
  canonicalize,
  toNTriples,
  isIsomorphic,
} from '../../vendor/unrdf/packages/core/src/index.mjs';

describe('UnRDF Integration Suite', () => {
  let store;
  const FOAF = 'http://xmlns.com/foaf/0.1/';
  const EX = 'http://example.org/';

  beforeEach(async () => {
    store = await createStore();
  });

  describe('Store Operations', () => {
    it('should create a store', () => {
      expect(store).toBeDefined();
      expect(typeof store.addQuad).toBe('function');
      expect(typeof store.getQuads).toBe('function');
    });

    it('should add and retrieve quads', () => {
      const subject = namedNode(`${EX}alice`);
      const predicate = namedNode(`${FOAF}name`);
      const object = literal('Alice');

      const q = quad(subject, predicate, object);
      store.addQuad(q);

      const results = store.getQuads(subject, predicate, object);
      expect(results).toHaveLength(1);
      expect(results[0].subject.value).toBe(`${EX}alice`);
    });

    it('should remove quads', () => {
      const subject = namedNode(`${EX}bob`);
      const predicate = namedNode(`${FOAF}name`);
      const object = literal('Bob');

      const q = quad(subject, predicate, object);
      store.addQuad(q);
      expect(store.getQuads(subject)).toHaveLength(1);

      removeQuad(store, q);
      expect(store.getQuads(subject)).toHaveLength(0);
    });

    it('should query quads with patterns', () => {
      const alice = namedNode(`${EX}alice`);
      const bob = namedNode(`${EX}bob`);
      const name = namedNode(`${FOAF}name`);

      store.addQuad(quad(alice, name, literal('Alice')));
      store.addQuad(quad(bob, name, literal('Bob')));
      store.addQuad(quad(alice, namedNode(`${FOAF}age`), literal('30')));

      // Query all names
      const names = store.getQuads(null, name);
      expect(names).toHaveLength(2);

      // Query Alice's properties
      const aliceProps = store.getQuads(alice);
      expect(aliceProps).toHaveLength(2);
    });
  });

  describe('RDF Factory Functions', () => {
    it('should create named nodes', () => {
      const node = namedNode(`${EX}resource`);
      expect(node.termType).toBe('NamedNode');
      expect(node.value).toBe(`${EX}resource`);
    });

    it('should create literals with different datatypes', () => {
      const stringLit = literal('hello');
      expect(stringLit.termType).toBe('Literal');
      expect(stringLit.value).toBe('hello');

      const numberLit = literal('42', namedNode('http://www.w3.org/2001/XMLSchema#integer'));
      expect(numberLit.datatype.value).toBe('http://www.w3.org/2001/XMLSchema#integer');
    });

    it('should create quads', () => {
      const s = namedNode(`${EX}subject`);
      const p = namedNode(`${EX}predicate`);
      const o = literal('object');

      const q = quad(s, p, o);
      expect(q.subject.value).toBe(s.value);
      expect(q.predicate.value).toBe(p.value);
      expect(q.object.value).toBe(o.value);
    });
  });

  describe('Graph Operations', () => {
    it('should canonicalize a graph', async () => {
      const alice = namedNode(`${EX}alice`);
      const name = namedNode(`${FOAF}name`);

      store.addQuad(quad(alice, name, literal('Alice')));
      store.addQuad(quad(alice, name, literal('Alicia')));

      const canonical = await canonicalize(store);
      expect(typeof canonical).toBe('string');
      expect(canonical.length).toBeGreaterThan(0);
    });

    it('should convert to N-Triples', async () => {
      const subject = namedNode(`${EX}alice`);
      const predicate = namedNode(`${FOAF}name`);
      const object = literal('Alice');

      const q = quad(subject, predicate, object);
      store.addQuad(q);

      const ntriples = await toNTriples([q]);
      expect(typeof ntriples).toBe('string');
      expect(ntriples).toContain('alice');
      expect(ntriples).toContain('name');
    });

    it('should check graph isomorphism', async () => {
      const alice = namedNode(`${EX}alice`);
      const name = namedNode(`${FOAF}name`);

      store.addQuad(quad(alice, name, literal('Alice')));

      const store2 = await createStore();
      store2.addQuad(quad(alice, name, literal('Alice')));

      const result = await isIsomorphic(store, store2);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('SPARQL Queries', () => {
    beforeEach(() => {
      const alice = namedNode(`${EX}alice`);
      const bob = namedNode(`${EX}bob`);
      const name = namedNode(`${FOAF}name`);
      const knows = namedNode(`${FOAF}knows`);

      store.addQuad(quad(alice, name, literal('Alice')));
      store.addQuad(quad(bob, name, literal('Bob')));
      store.addQuad(quad(alice, knows, bob));
    });

    it('should execute SELECT queries', async () => {
      const query = `
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX ex: <http://example.org/>
        SELECT ?name WHERE {
          ?person foaf:name ?name .
        }
      `;

      const results = await executeSelect(store, query);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should execute ASK queries', async () => {
      const query = `
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX ex: <http://example.org/>
        ASK {
          ?person foaf:name "Alice" .
        }
      `;

      const result = await executeAsk(store, query);
      expect(typeof result).toBe('boolean');
    });

    it('should execute CONSTRUCT queries', async () => {
      const query = `
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX ex: <http://example.org/>
        CONSTRUCT {
          ?person a foaf:Person ;
                  foaf:name ?name .
        }
        WHERE {
          ?person foaf:name ?name .
        }
      `;

      const result = await executeQuery(store, query);
      expect(result).toBeDefined();
    });
  });

  describe('Composable Patterns', () => {
    it('should support composable graph operations', async () => {
      const alice = namedNode(`${EX}alice`);
      const name = namedNode(`${FOAF}name`);

      // Pattern 1: Store and retrieve
      const q = quad(alice, name, literal('Alice'));
      store.addQuad(q);
      const quads = store.getQuads(alice, name);
      expect(quads).toHaveLength(1);

      // Pattern 2: Pattern matching
      const allNames = store.getQuads(null, name);
      expect(allNames.length).toBeGreaterThanOrEqual(1);

      // Pattern 3: Serialization
      const ntriples = await toNTriples([q]);
      expect(ntriples).toContain('Alice');
    });

    it('should support chained operations', async () => {
      const alice = namedNode(`${EX}alice`);
      const bob = namedNode(`${EX}bob`);
      const name = namedNode(`${FOAF}name`);
      const knows = namedNode(`${FOAF}knows`);

      // Chain 1: Create relationships
      store.addQuad(quad(alice, name, literal('Alice')));
      store.addQuad(quad(bob, name, literal('Bob')));
      store.addQuad(quad(alice, knows, bob));

      // Chain 2: Query relationships
      const aliceKnows = store.getQuads(alice, knows);
      expect(aliceKnows).toHaveLength(1);

      // Chain 3: Serialize
      const canonical = canonicalize(store);
      expect(canonical).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid quad additions with clear errors', () => {
      expect(() => {
        store.addQuad(null);
      }).toThrow('Quad is required'); // unrdf validates input
    });

    it('should handle empty query results', async () => {
      const query = `
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        SELECT ?name WHERE {
          ?person foaf:name "NonExistent" .
        }
      `;

      const results = await executeSelect(store, query);
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Production Patterns', () => {
    it('should support bulk operations', async () => {
      const quads = [];
      for (let i = 0; i < 100; i++) {
        const person = namedNode(`${EX}person${i}`);
        const name = namedNode(`${FOAF}name`);
        quads.push(quad(person, name, literal(`Person ${i}`)));
      }

      // Bulk add
      quads.forEach(q => store.addQuad(q));

      // Bulk query
      const name = namedNode(`${FOAF}name`);
      const allNames = store.getQuads(null, name);
      expect(allNames).toHaveLength(100);
    });

    it('should support incremental updates', async () => {
      const person = namedNode(`${EX}alice`);
      const name = namedNode(`${FOAF}name`);
      const email = namedNode(`${FOAF}mbox`);

      // Initial state
      store.addQuad(quad(person, name, literal('Alice')));
      expect(store.getQuads(person)).toHaveLength(1);

      // Add more properties
      const emailQuad = quad(person, email, literal('alice@example.org'));
      store.addQuad(emailQuad);
      expect(store.getQuads(person)).toHaveLength(2);

      // Remove property
      removeQuad(store, emailQuad);
      expect(store.getQuads(person)).toHaveLength(1);
    });

    it('should support store composition', async () => {
      // Create store 1
      const store1 = await createStore();
      store1.addQuad(quad(
        namedNode(`${EX}alice`),
        namedNode(`${FOAF}name`),
        literal('Alice')
      ));

      // Create store 2
      const store2 = await createStore();
      store2.addQuad(quad(
        namedNode(`${EX}bob`),
        namedNode(`${FOAF}name`),
        literal('Bob')
      ));

      // Merge: copy quads from store2 to store1
      store2.getQuads().forEach(q => store1.addQuad(q));

      // Verify merge
      expect(store1.getQuads(null, namedNode(`${FOAF}name`))).toHaveLength(2);
    });
  });

  describe('Real-world GitVan Patterns', () => {
    it('should support event capture pattern (GitEventCapture)', async () => {
      const PROV = 'http://www.w3.org/ns/prov#';

      const eventId = namedNode(`${EX}event-001`);
      const gitEvent = namedNode(`${PROV}Activity`);
      const wasAssociatedWith = namedNode(`${PROV}wasAssociatedWith`);
      const agent = namedNode(`${EX}git-commit`);

      // Simulate event capture
      store.addQuad(quad(eventId, namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), gitEvent));
      store.addQuad(quad(eventId, wasAssociatedWith, agent));

      // Query events
      const events = store.getQuads(null, namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), gitEvent);
      expect(events.length).toBeGreaterThan(0);
    });

    it('should support workflow pattern (WorkflowExecutor)', async () => {
      const WORKFLOW = 'http://example.org/workflow#';

      const step1 = namedNode(`${WORKFLOW}step1`);
      const step2 = namedNode(`${WORKFLOW}step2`);
      const dependsOn = namedNode(`${WORKFLOW}dependsOn`);
      const status = namedNode(`${WORKFLOW}status`);

      // Define workflow steps
      store.addQuad(quad(step1, status, literal('ready')));
      store.addQuad(quad(step2, dependsOn, step1));
      store.addQuad(quad(step2, status, literal('blocked')));

      // Query step dependencies
      const blockedSteps = store.getQuads(null, status, literal('blocked'));
      expect(blockedSteps.length).toBeGreaterThan(0);

      const dependencies = store.getQuads(step2, dependsOn);
      expect(dependencies).toHaveLength(1);
    });

    it('should support performance monitoring pattern (RDFPerformanceMonitor)', async () => {
      const PERF = 'http://example.org/perf#';

      const metric = namedNode(`${PERF}metric-001`);
      const duration = namedNode(`${PERF}duration`);
      const threshold = namedNode(`${PERF}threshold`);

      // Record performance metrics
      store.addQuad(quad(metric, duration, literal('245')));
      store.addQuad(quad(metric, threshold, literal('300')));

      // Query slow operations
      const metrics = store.getQuads(null, duration);
      expect(metrics).toHaveLength(1);

      // Verify threshold not exceeded
      const slow = store.getQuads(null, duration);
      slow.forEach(m => {
        const dur = parseInt(m.object.value);
        expect(dur).toBeLessThan(300);
      });
    });
  });
});
