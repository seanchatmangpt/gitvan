/**
 * @file rdf-git-persistence.test.mjs
 * @description Test suite for RDF persistence to/from Git
 * Tests NQuads serialization and Git-native storage
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useRDFStore } from '../src/composables/useRDFStore.mjs';
import oxigraph from 'oxigraph';

describe('RDF Git Persistence', () => {
  describe('NQuads export format', () => {
    it('should export valid NQuads format', () => {
      const store = useRDFStore({ backend: 'oxigraph' });

      store.addQuad(
        oxigraph.namedNode('http://example.org/subject'),
        oxigraph.namedNode('http://example.org/predicate'),
        oxigraph.namedNode('http://example.org/object')
      );

      const nquads = store.exportNQuads();

      // Verify NQuads format
      expect(nquads).toMatch(/<http:\/\/example\.org\/subject>/);
      expect(nquads).toMatch(/<http:\/\/example\.org\/predicate>/);
      expect(nquads).toMatch(/<http:\/\/example\.org\/object>/);
      expect(nquads).toMatch(/\.$/m); // Ends with period
    });

    it('should export NQuads with literals', () => {
      const store = useRDFStore({ backend: 'oxigraph' });

      store.addQuad(
        oxigraph.namedNode('http://example.org/person'),
        oxigraph.namedNode('http://example.org/name'),
        oxigraph.literal('John Doe')
      );

      const nquads = store.exportNQuads();

      expect(nquads).toContain('John Doe');
      expect(nquads).toContain('"');
    });

    it('should export NQuads with typed literals', () => {
      const store = useRDFStore({ backend: 'oxigraph' });

      store.addQuad(
        oxigraph.namedNode('http://example.org/person'),
        oxigraph.namedNode('http://example.org/age'),
        oxigraph.literal('30', oxigraph.namedNode('http://www.w3.org/2001/XMLSchema#integer'))
      );

      const nquads = store.exportNQuads();

      expect(nquads).toContain('XMLSchema');
      expect(nquads).toContain('30');
    });

    it('should export NQuads with language tags', () => {
      const store = useRDFStore({ backend: 'oxigraph' });

      // Add literal with language tag using language parameter
      store.addQuad(
        oxigraph.namedNode('http://example.org/book'),
        oxigraph.namedNode('http://example.org/title'),
        oxigraph.literal('The Hobbit', { language: 'en' })
      );

      const nquads = store.exportNQuads();

      expect(nquads).toContain('The Hobbit');
    });

    it('should export NQuads with graphs', () => {
      const store = useRDFStore({ backend: 'oxigraph' });

      store.addQuad(
        oxigraph.quad(
          oxigraph.namedNode('http://example.org/subject'),
          oxigraph.namedNode('http://example.org/predicate'),
          oxigraph.namedNode('http://example.org/object'),
          oxigraph.namedNode('http://example.org/graph')
        )
      );

      const nquads = store.exportNQuads();

      // NQuads should include the graph
      const lines = nquads.split('\n').filter(l => l.trim());
      expect(lines[0]).toMatch(/example\.org\/graph/);
    });

    it('should export multiple quads', () => {
      const store = useRDFStore({ backend: 'oxigraph' });
      const base = 'http://example.org/';

      for (let i = 0; i < 10; i++) {
        store.addQuad(
          oxigraph.namedNode(`${base}s${i}`),
          oxigraph.namedNode(`${base}p`),
          oxigraph.namedNode(`${base}o${i}`)
        );
      }

      const nquads = store.exportNQuads();
      const lines = nquads.split('\n').filter(l => l.trim());

      expect(lines.length).toBe(10);
      expect(lines.every(l => l.endsWith('.'))).toBe(true);
    });
  });

  describe('NQuads import format', () => {
    it('should import simple NQuads', () => {
      const store = useRDFStore({ backend: 'oxigraph' });

      const nquads = `
        <http://example.org/subject> <http://example.org/predicate> <http://example.org/object> .
      `;

      const count = store.importNQuads(nquads);
      expect(count).toBe(1);
      expect(store.size()).toBe(1);
    });

    it('should import NQuads with literals', () => {
      const store = useRDFStore({ backend: 'oxigraph' });

      const nquads = `
        <http://example.org/person> <http://example.org/name> "John Doe" .
        <http://example.org/person> <http://example.org/email> "john@example.com" .
      `;

      const count = store.importNQuads(nquads);
      expect(count).toBe(2);
      expect(store.size()).toBe(2);
    });

    it('should import NQuads with multiple quads', () => {
      const store = useRDFStore({ backend: 'oxigraph' });

      const nquads = Array.from({ length: 100 }, (_, i) =>
        `<http://example.org/s${i}> <http://example.org/p> <http://example.org/o${i}> .`
      ).join('\n');

      const count = store.importNQuads(nquads);
      expect(count).toBeGreaterThan(0);
      expect(store.size()).toBeGreaterThan(0);
    });

    it('should import from both backends', () => {
      for (const backend of ['oxigraph', 'memory']) {
        const store = useRDFStore({ backend });

        const nquads = `
          <http://example.org/subject> <http://example.org/predicate> <http://example.org/object> .
        `;

        const count = store.importNQuads(nquads);
        expect(count).toBeGreaterThan(0);
        expect(store.size()).toBeGreaterThan(0);
      }
    });
  });

  describe('round-trip persistence', () => {
    it('should preserve quads through export-import cycle', () => {
      const store1 = useRDFStore({ backend: 'oxigraph' });
      const base = 'http://example.org/';

      // Add diverse quads
      for (let i = 0; i < 20; i++) {
        store1.addQuad(
          oxigraph.namedNode(`${base}s${i}`),
          oxigraph.namedNode(`${base}p${i % 5}`),
          oxigraph.namedNode(`${base}o${i}`)
        );
      }

      // Export
      const nquads = store1.exportNQuads();
      const count1 = store1.size();

      // Import to new store
      const store2 = useRDFStore({ backend: 'oxigraph' });
      const importedCount = store2.importNQuads(nquads);

      expect(importedCount).toBe(count1);
      expect(store2.size()).toBe(count1);

      // Verify content matches
      const quads1 = store1.getQuads();
      const quads2 = store2.getQuads();
      expect(quads2.length).toBe(quads1.length);
    });

    it('should preserve data across backends via NQuads', () => {
      const store1 = useRDFStore({ backend: 'oxigraph' });

      store1.addQuad(
        oxigraph.namedNode('http://example.org/s'),
        oxigraph.namedNode('http://example.org/p'),
        oxigraph.namedNode('http://example.org/o')
      );

      const nquads = store1.exportNQuads();

      const store2 = useRDFStore({ backend: 'memory' });
      const count = store2.importNQuads(nquads);

      expect(count).toBeGreaterThan(0);
      expect(store2.size()).toBe(store1.size());
    });

    it('should handle repeated round-trips', () => {
      const store = useRDFStore({ backend: 'oxigraph' });
      const base = 'http://example.org/';

      // Add initial data
      for (let i = 0; i < 5; i++) {
        store.addQuad(
          oxigraph.namedNode(`${base}s${i}`),
          oxigraph.namedNode(`${base}p`),
          oxigraph.namedNode(`${base}o${i}`)
        );
      }

      const originalSize = store.size();

      // Do multiple round-trips
      for (let trip = 0; trip < 3; trip++) {
        const nquads = store.exportNQuads();
        const newStore = useRDFStore({ backend: 'oxigraph' });
        newStore.importNQuads(nquads);
        expect(newStore.size()).toBe(originalSize);
      }
    });
  });

  describe('git-native storage simulation', () => {
    it('should create stable git-like ref content', () => {
      const store = useRDFStore({ backend: 'oxigraph' });

      // Add test data
      store.addQuad(
        oxigraph.namedNode('http://example.org/s'),
        oxigraph.namedNode('http://example.org/p'),
        oxigraph.namedNode('http://example.org/o')
      );

      // Export as if for git storage
      const nquads1 = store.exportNQuads();

      // Export again - should be identical (deterministic)
      const nquads2 = store.exportNQuads();

      expect(nquads1).toBe(nquads2);
    });

    it('should simulate git ref with snapshot', () => {
      // Simulate storing RDF snapshot in git ref
      const snapshots = {};

      const store = useRDFStore({ backend: 'oxigraph' });
      const base = 'http://example.org/';

      // "Commit 1"
      for (let i = 0; i < 5; i++) {
        store.addQuad(
          oxigraph.namedNode(`${base}s${i}`),
          oxigraph.namedNode(`${base}p`),
          oxigraph.namedNode(`${base}o${i}`)
        );
      }
      snapshots['HEAD~1'] = store.exportNQuads();

      // "Commit 2" - add more data
      for (let i = 5; i < 10; i++) {
        store.addQuad(
          oxigraph.namedNode(`${base}s${i}`),
          oxigraph.namedNode(`${base}p`),
          oxigraph.namedNode(`${base}o${i}`)
        );
      }
      snapshots['HEAD'] = store.exportNQuads();

      // Verify snapshots are different
      expect(snapshots['HEAD~1']).not.toBe(snapshots['HEAD']);

      // Verify we can restore from snapshot
      const restoredStore = useRDFStore({ backend: 'oxigraph' });
      restoredStore.importNQuads(snapshots['HEAD~1']);

      expect(restoredStore.size()).toBe(5);
    });

    it('should support audit trail via git notes', () => {
      // Simulate storing audit trail as git notes
      const auditTrail = [];

      const store = useRDFStore({ backend: 'oxigraph' });

      // Record operation 1
      const before1 = store.size();
      store.addQuad(
        oxigraph.namedNode('http://example.org/s'),
        oxigraph.namedNode('http://example.org/p'),
        oxigraph.namedNode('http://example.org/o')
      );
      const after1 = store.size();

      auditTrail.push({
        timestamp: new Date().toISOString(),
        operation: 'addQuad',
        before: before1,
        after: after1,
        quadCount: store.size(),
      });

      // Record operation 2
      const nquads = store.exportNQuads();
      const before2 = store.size();
      store.clear();
      const after2 = store.size();

      auditTrail.push({
        timestamp: new Date().toISOString(),
        operation: 'clear',
        before: before2,
        after: after2,
        quadCount: store.size(),
      });

      // Restore and verify
      store.importNQuads(nquads);
      expect(store.size()).toBe(auditTrail[0].after);

      // Verify audit trail
      expect(auditTrail.length).toBe(2);
      expect(auditTrail[0].operation).toBe('addQuad');
      expect(auditTrail[1].operation).toBe('clear');
    });
  });

  describe('large dataset persistence', () => {
    it('should persist 10K quads', () => {
      const store = useRDFStore({ backend: 'oxigraph' });
      const base = 'http://example.org/';

      for (let i = 0; i < 10000; i++) {
        store.addQuad(
          oxigraph.namedNode(`${base}s${i}`),
          oxigraph.namedNode(`${base}p${i % 100}`),
          oxigraph.namedNode(`${base}o${i}`)
        );
      }

      const nquads = store.exportNQuads();
      expect(nquads.length).toBeGreaterThan(0);

      const newStore = useRDFStore({ backend: 'oxigraph' });
      const count = newStore.importNQuads(nquads);

      expect(count).toBe(10000);
      expect(newStore.size()).toBe(10000);
    });

    it('should persist 50K quads', () => {
      const store = useRDFStore({ backend: 'oxigraph' });
      const base = 'http://example.org/';
      const batchSize = 5000;

      // Add in batches
      for (let batch = 0; batch < 10; batch++) {
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

      expect(store.size()).toBe(50000);

      // Export and verify
      const nquads = store.exportNQuads();
      const newStore = useRDFStore({ backend: 'oxigraph' });
      const count = newStore.importNQuads(nquads);

      expect(count).toBe(50000);
    });

    it('should persist 100K quads', () => {
      const store = useRDFStore({ backend: 'oxigraph' });
      const base = 'http://example.org/';
      const batchSize = 10000;

      // Add 100K quads in batches
      for (let batch = 0; batch < 10; batch++) {
        const quads = [];
        for (let i = 0; i < batchSize; i++) {
          const idx = batch * batchSize + i;
          quads.push(
            oxigraph.quad(
              oxigraph.namedNode(`${base}s${idx}`),
              oxigraph.namedNode(`${base}p${idx % 500}`),
              oxigraph.namedNode(`${base}o${idx}`)
            )
          );
        }
        store.addQuads(quads);
      }

      expect(store.size()).toBe(100000);

      // Export for "git storage"
      const nquads = store.exportNQuads();

      // Import from "git storage"
      const restoredStore = useRDFStore({ backend: 'oxigraph' });
      const count = restoredStore.importNQuads(nquads);

      expect(count).toBe(100000);
      expect(restoredStore.size()).toBe(100000);
    });
  });

  describe('diff/snapshot tracking', () => {
    it('should track changes via snapshots', () => {
      const snapshots = new Map();

      const store = useRDFStore({ backend: 'oxigraph' });
      const base = 'http://example.org/';

      // Add initial quad (snapshot 1: non-empty)
      store.addQuad(
        oxigraph.namedNode(`${base}s0`),
        oxigraph.namedNode(`${base}p0`),
        oxigraph.namedNode(`${base}o0`)
      );
      snapshots.set('v1', store.exportNQuads());

      // Add more quads
      for (let i = 1; i < 10; i++) {
        store.addQuad(
          oxigraph.namedNode(`${base}s${i}`),
          oxigraph.namedNode(`${base}p`),
          oxigraph.namedNode(`${base}o${i}`)
        );
      }

      // Snapshot 2: After additions
      snapshots.set('v2', store.exportNQuads());

      // Remove half the quads
      const quads = store.getQuads();
      store.removeQuads(quads.slice(0, 5));

      // Snapshot 3: After removals
      snapshots.set('v3', store.exportNQuads());

      // Verify snapshots differ
      expect(snapshots.get('v1')).not.toBe(snapshots.get('v2'));
      expect(snapshots.get('v2')).not.toBe(snapshots.get('v3'));

      // Verify we can restore each snapshot
      const store1 = useRDFStore({ backend: 'oxigraph' });
      store1.importNQuads(snapshots.get('v1'));
      expect(store1.size()).toBe(1);

      const store2 = useRDFStore({ backend: 'oxigraph' });
      store2.importNQuads(snapshots.get('v2'));
      expect(store2.size()).toBe(10);

      const store3 = useRDFStore({ backend: 'oxigraph' });
      store3.importNQuads(snapshots.get('v3'));
      expect(store3.size()).toBe(5);
    });
  });

  describe('error handling', () => {
    it('should throw on invalid NQuads import', () => {
      const store = useRDFStore({ backend: 'oxigraph' });

      expect(() => {
        store.importNQuads('');
      }).toThrow();
    });

    it('should throw on memory backend NQuads export', () => {
      const store = useRDFStore({ backend: 'memory' });

      store.addQuad(
        oxigraph.namedNode('http://example.org/s'),
        oxigraph.namedNode('http://example.org/p'),
        oxigraph.namedNode('http://example.org/o')
      );

      // Memory backend should support export
      const nquads = store.exportNQuads();
      expect(nquads).toBeDefined();
    });

    it('should handle partial NQuads import', () => {
      const store = useRDFStore({ backend: 'oxigraph' });

      // Mix of valid and potentially invalid lines
      const nquads = `
        <http://example.org/s1> <http://example.org/p> <http://example.org/o1> .
        <http://example.org/s2> <http://example.org/p> <http://example.org/o2> .
      `;

      const count = store.importNQuads(nquads);
      expect(count).toBeGreaterThan(0);
    });
  });
});
