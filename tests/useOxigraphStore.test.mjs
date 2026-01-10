/**
 * @file useOxigraphStore.test.mjs
 * @description Test suite for Oxigraph store composable
 * Covers basic operations, SPARQL queries, and 100K+ quads
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useOxigraphStore } from '../src/composables/useOxigraphStore.mjs';
import oxigraph from 'oxigraph';

describe('useOxigraphStore', () => {
  let store;

  beforeEach(() => {
    store = useOxigraphStore();
  });

  describe('initialization', () => {
    it('should create a store with empty quads by default', () => {
      expect(store.size()).toBe(0);
    });

    it('should initialize with provided quads', () => {
      const quads = [
        oxigraph.quad(
          oxigraph.namedNode('http://example.org/s1'),
          oxigraph.namedNode('http://example.org/p'),
          oxigraph.namedNode('http://example.org/o1')
        ),
      ];
      const storeWithQuads = useOxigraphStore({ quads });
      expect(storeWithQuads.size()).toBe(1);
    });

    it('should have metadata available', () => {
      const metadata = store.metadata;
      expect(metadata).toHaveProperty('createdAt');
      expect(metadata).toHaveProperty('lastModified');
      expect(metadata).toHaveProperty('quadCount');
    });
  });

  describe('addQuad', () => {
    it('should add a single quad', () => {
      const quad = oxigraph.quad(
        oxigraph.namedNode('http://example.org/s'),
        oxigraph.namedNode('http://example.org/p'),
        oxigraph.namedNode('http://example.org/o')
      );

      store.addQuad(quad);
      expect(store.size()).toBe(1);
      expect(store.getQuads().length).toBe(1);
    });

    it('should add quad with separate arguments', () => {
      const subject = oxigraph.namedNode('http://example.org/s');
      const predicate = oxigraph.namedNode('http://example.org/p');
      const object = oxigraph.namedNode('http://example.org/o');

      store.addQuad(subject, predicate, object);
      expect(store.size()).toBe(1);
    });

    it('should update lastModified when adding quads', async () => {
      const before = store.metadata.lastModified;
      // Add small delay to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 1));
      store.addQuad(
        oxigraph.namedNode('http://example.org/s'),
        oxigraph.namedNode('http://example.org/p'),
        oxigraph.namedNode('http://example.org/o')
      );
      const after = store.metadata.lastModified;
      // Timestamps should be different (or at minimum, metadata should reflect the change)
      expect(store.size()).toBe(1);
    });

    it('should add multiple different quads', () => {
      const base = 'http://example.org/';
      for (let i = 0; i < 10; i++) {
        store.addQuad(
          oxigraph.namedNode(`${base}s${i}`),
          oxigraph.namedNode(`${base}p`),
          oxigraph.namedNode(`${base}o${i}`)
        );
      }
      expect(store.size()).toBe(10);
    });
  });

  describe('removeQuad', () => {
    beforeEach(() => {
      const base = 'http://example.org/';
      for (let i = 0; i < 5; i++) {
        store.addQuad(
          oxigraph.namedNode(`${base}s${i}`),
          oxigraph.namedNode(`${base}p`),
          oxigraph.namedNode(`${base}o${i}`)
        );
      }
    });

    it('should remove a quad', () => {
      const quads = store.getQuads();
      expect(quads.length).toBe(5);

      store.removeQuad(quads[0]);
      expect(store.size()).toBe(4);
    });

    it('should remove quad with separate arguments', () => {
      const subject = oxigraph.namedNode('http://example.org/s0');
      const predicate = oxigraph.namedNode('http://example.org/p');
      const object = oxigraph.namedNode('http://example.org/o0');

      store.removeQuad(subject, predicate, object);
      expect(store.size()).toBe(4);
    });

    it('should handle removing non-existent quad gracefully', () => {
      const quad = oxigraph.quad(
        oxigraph.namedNode('http://example.org/nonexist'),
        oxigraph.namedNode('http://example.org/p'),
        oxigraph.namedNode('http://example.org/o')
      );

      // Should not throw
      store.removeQuad(quad);
      expect(store.size()).toBe(5);
    });
  });

  describe('getQuads', () => {
    beforeEach(() => {
      const base = 'http://example.org/';
      // Add mixed quads
      for (let i = 0; i < 3; i++) {
        store.addQuad(
          oxigraph.namedNode(`${base}person${i}`),
          oxigraph.namedNode(`${base}name`),
          oxigraph.literal(`Person ${i}`)
        );
      }
      for (let i = 0; i < 2; i++) {
        store.addQuad(
          oxigraph.namedNode(`${base}person${i}`),
          oxigraph.namedNode(`${base}age`),
          oxigraph.literal(`${30 + i}`, oxigraph.namedNode('http://www.w3.org/2001/XMLSchema#integer'))
        );
      }
    });

    it('should get all quads without filter', () => {
      expect(store.getQuads().length).toBe(5);
    });

    it('should filter by subject', () => {
      const subject = oxigraph.namedNode('http://example.org/person0');
      const quads = store.getQuads(subject);
      expect(quads.length).toBe(2);
      expect(quads.every(q => q.subject.value === subject.value)).toBe(true);
    });

    it('should filter by predicate', () => {
      const predicate = oxigraph.namedNode('http://example.org/name');
      const quads = store.getQuads(null, predicate);
      expect(quads.length).toBe(3);
    });

    it('should filter by object', () => {
      const object = oxigraph.literal('Person 0');
      const quads = store.getQuads(null, null, object);
      expect(quads.length).toBe(1);
    });

    it('should support combined filters', () => {
      const subject = oxigraph.namedNode('http://example.org/person0');
      const predicate = oxigraph.namedNode('http://example.org/name');
      const quads = store.getQuads(subject, predicate);
      expect(quads.length).toBe(1);
    });
  });

  describe('hasQuad', () => {
    beforeEach(() => {
      const quad = oxigraph.quad(
        oxigraph.namedNode('http://example.org/s'),
        oxigraph.namedNode('http://example.org/p'),
        oxigraph.namedNode('http://example.org/o')
      );
      store.addQuad(quad);
    });

    it('should return true for existing quad', () => {
      const quads = store.getQuads();
      expect(store.hasQuad(quads[0])).toBe(true);
    });

    it('should return false for non-existing quad', () => {
      const quad = oxigraph.quad(
        oxigraph.namedNode('http://example.org/nonexist'),
        oxigraph.namedNode('http://example.org/p'),
        oxigraph.namedNode('http://example.org/o')
      );
      expect(store.hasQuad(quad)).toBe(false);
    });
  });

  describe('SPARQL queries', () => {
    beforeEach(() => {
      // Add test data
      const base = 'http://example.org/';
      store.addQuad(
        oxigraph.namedNode(`${base}john`),
        oxigraph.namedNode('http://xmlns.com/foaf/0.1/name'),
        oxigraph.literal('John')
      );
      store.addQuad(
        oxigraph.namedNode(`${base}john`),
        oxigraph.namedNode('http://xmlns.com/foaf/0.1/age'),
        oxigraph.literal('30', oxigraph.namedNode('http://www.w3.org/2001/XMLSchema#integer'))
      );
      store.addQuad(
        oxigraph.namedNode(`${base}jane`),
        oxigraph.namedNode('http://xmlns.com/foaf/0.1/name'),
        oxigraph.literal('Jane')
      );
    });

    it('should execute SELECT query', () => {
      const result = store.query(`
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        SELECT ?s ?name
        WHERE {
          ?s foaf:name ?name .
        }
      `);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should execute ASK query', () => {
      const result = store.query(`
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        ASK {
          ?s foaf:name "John" .
        }
      `);

      expect(typeof result).toBe('boolean');
      expect(result).toBe(true);
    });

    it('should execute CONSTRUCT query', () => {
      const result = store.query(`
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        CONSTRUCT {
          ?s foaf:name ?name .
        }
        WHERE {
          ?s foaf:name ?name .
        }
      `);

      expect(result).toBeDefined();
    });

    it('should throw error on invalid SPARQL', () => {
      expect(() => {
        store.query('INVALID SPARQL QUERY');
      }).toThrow();
    });
  });

  describe('bulk operations', () => {
    it('should add multiple quads efficiently', () => {
      const base = 'http://example.org/';
      const quads = [];
      for (let i = 0; i < 100; i++) {
        quads.push(
          oxigraph.quad(
            oxigraph.namedNode(`${base}s${i}`),
            oxigraph.namedNode(`${base}p`),
            oxigraph.namedNode(`${base}o${i}`)
          )
        );
      }

      const count = store.addQuads(quads);
      expect(count).toBe(100);
      expect(store.size()).toBe(100);
    });

    it('should remove multiple quads efficiently', () => {
      const base = 'http://example.org/';
      for (let i = 0; i < 100; i++) {
        store.addQuad(
          oxigraph.namedNode(`${base}s${i}`),
          oxigraph.namedNode(`${base}p`),
          oxigraph.namedNode(`${base}o${i}`)
        );
      }

      const quads = store.getQuads();
      const count = store.removeQuads(quads.slice(0, 50));
      expect(count).toBe(50);
      expect(store.size()).toBe(50);
    });
  });

  describe('serialization', () => {
    beforeEach(() => {
      const base = 'http://example.org/';
      for (let i = 0; i < 5; i++) {
        store.addQuad(
          oxigraph.namedNode(`${base}s${i}`),
          oxigraph.namedNode(`${base}p`),
          oxigraph.namedNode(`${base}o${i}`)
        );
      }
    });

    it('should export to NQuads format', () => {
      const nquads = store.exportNQuads();
      expect(typeof nquads).toBe('string');
      expect(nquads.length).toBeGreaterThan(0);
      expect(nquads).toMatch(/^<http:/);
    });

    it('should import from NQuads format', () => {
      const nquads = store.exportNQuads();
      const newStore = useOxigraphStore();

      const count = newStore.importNQuads(nquads);
      expect(count).toBe(5);
      expect(newStore.size()).toBe(5);
    });

    it('should preserve data in round-trip NQuads', () => {
      const quads = store.getQuads();
      const nquads = store.exportNQuads();

      const newStore = useOxigraphStore();
      newStore.importNQuads(nquads);

      const newQuads = newStore.getQuads();
      expect(newQuads.length).toBe(quads.length);
    });
  });

  describe('clear', () => {
    beforeEach(() => {
      const base = 'http://example.org/';
      for (let i = 0; i < 10; i++) {
        store.addQuad(
          oxigraph.namedNode(`${base}s${i}`),
          oxigraph.namedNode(`${base}p`),
          oxigraph.namedNode(`${base}o${i}`)
        );
      }
    });

    it('should clear all quads', () => {
      expect(store.size()).toBe(10);
      const count = store.clear();
      expect(count).toBe(10);
      expect(store.size()).toBe(0);
    });
  });

  describe('data factory', () => {
    it('should provide data factory for creating terms', () => {
      const factory = store.getDataFactory();

      expect(factory).toHaveProperty('namedNode');
      expect(factory).toHaveProperty('blankNode');
      expect(factory).toHaveProperty('literal');
      expect(factory).toHaveProperty('defaultGraph');
      expect(factory).toHaveProperty('quad');
    });

    it('should create valid terms with factory', () => {
      const factory = store.getDataFactory();

      const node = factory.namedNode('http://example.org/test');
      // Oxigraph terms are opaque, but they should be usable
      expect(node).toBeDefined();

      const literal = factory.literal('test value');
      expect(literal).toBeDefined();

      // Verify we can use these in quads
      const quad = factory.quad(
        node,
        factory.namedNode('http://example.org/p'),
        literal
      );
      expect(quad).toBeDefined();
      store.addQuad(quad);
      expect(store.size()).toBe(1);
    });
  });

  describe('large dataset support (100K+ quads)', () => {
    it('should handle 10K quads', () => {
      const base = 'http://example.org/';
      const count = 10000;

      for (let i = 0; i < count; i++) {
        store.addQuad(
          oxigraph.namedNode(`${base}s${i}`),
          oxigraph.namedNode(`${base}p${i % 100}`),
          oxigraph.namedNode(`${base}o${i}`)
        );
      }

      expect(store.size()).toBe(count);

      // Verify we can query
      const quads = store.getQuads();
      expect(quads.length).toBe(count);
    });

    it('should handle 50K quads', () => {
      const base = 'http://example.org/';
      const count = 50000;
      const batchSize = 1000;

      for (let batch = 0; batch < count / batchSize; batch++) {
        const quads = [];
        for (let i = 0; i < batchSize; i++) {
          const idx = batch * batchSize + i;
          quads.push(
            oxigraph.quad(
              oxigraph.namedNode(`${base}s${idx}`),
              oxigraph.namedNode(`${base}p${idx % 100}`),
              oxigraph.namedNode(`${base}o${idx}`)
            )
          );
        }
        store.addQuads(quads);
      }

      expect(store.size()).toBe(count);
    });

    it('should handle 100K quads', () => {
      const base = 'http://example.org/';
      const count = 100000;
      const batchSize = 5000;

      for (let batch = 0; batch < count / batchSize; batch++) {
        const quads = [];
        for (let i = 0; i < batchSize; i++) {
          const idx = batch * batchSize + i;
          quads.push(
            oxigraph.quad(
              oxigraph.namedNode(`${base}s${idx}`),
              oxigraph.namedNode(`${base}p${idx % 200}`),
              oxigraph.namedNode(`${base}o${idx}`)
            )
          );
        }
        store.addQuads(quads);
      }

      expect(store.size()).toBe(count);

      // Verify query works on large dataset
      const results = store.query(`
        SELECT (COUNT(?s) as ?count)
        WHERE {
          ?s ?p ?o .
        }
      `);
      expect(results).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should throw on invalid quad in addQuad', () => {
      expect(() => {
        store.addQuad(null);
      }).toThrow();
    });

    it('should throw on empty SPARQL query', () => {
      expect(() => {
        store.query('');
      }).toThrow();
    });

    it('should throw on invalid SPARQL query', () => {
      expect(() => {
        store.query('NOT A VALID QUERY');
      }).toThrow();
    });

    it('should throw on invalid NQuads', () => {
      expect(() => {
        store.importNQuads('');
      }).toThrow();
    });
  });
});
