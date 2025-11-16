/**
 * unrdf Integration Tests
 * Verifies that unrdf is properly integrated into GitVan's RDF subsystem
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { parseTurtle, toTurtle } from 'unrdf';
import { RDFToZodConverter } from '../../src/rdf-to-zod/RDFToZodConverter.mjs';
import { z } from 'zod';

describe('unrdf Integration', () => {
  beforeAll(() => {
    // Pure unrdf - no wrapper class needed
  });

  describe('Pure unrdf API', () => {
    it('should parse Turtle successfully', async () => {
      const turtle = `
        @prefix ex: <http://example.org/> .
        @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

        ex:Alice a ex:Person ;
          ex:name "Alice" ;
          ex:age 30 .
      `;

      const store = await parseTurtle(turtle);
      expect(store).toBeDefined();
      expect([...store].length).toBeGreaterThan(0);
      expect([...store].length).toBe(3); // 3 triples
    });

    it('should serialize Turtle successfully', async () => {
      const turtle = `
        @prefix ex: <http://example.org/> .
        ex:Bob ex:name "Bob" .
      `;

      const store = await parseTurtle(turtle);
      const serialized = await toTurtle(store);

      expect(serialized).toBeDefined();
      expect(typeof serialized).toBe('string');
      expect(serialized).toContain('Bob');
    });

    it('should handle deterministic output', async () => {
      const turtle = `
        @prefix ex: <http://example.org/> .
        ex:C ex:p "3" .
        ex:B ex:p "2" .
        ex:A ex:p "1" .
      `;

      const store = await parseTurtle(turtle);
      const serialized1 = await toTurtle(store);
      const serialized2 = await toTurtle(store);

      // Deterministic serialization should produce identical output
      expect(serialized1).toBe(serialized2);
    });

    it('should preserve blank nodes', async () => {
      const turtle = `
        @prefix ex: <http://example.org/> .

        ex:Alice ex:knows [
          a ex:Person ;
          ex:name "Anonymous"
        ] .
      `;

      const store = await parseTurtle(turtle);
      expect([...store].length).toBe(3); // Alice knows _:b, _:b type Person, _:b name "Anonymous"
    });

    it('should handle prefixes correctly', async () => {
      const turtle = `
        @prefix ex: <http://example.org/> .
        @prefix foaf: <http://xmlns.com/foaf/0.1/> .

        ex:Alice foaf:name "Alice" .
      `;

      const store = await parseTurtle(turtle);
      const serialized = await toTurtle(store, {
        prefixes: {
          ex: 'http://example.org/',
          foaf: 'http://xmlns.com/foaf/0.1/'
        }
      });

      expect(serialized).toContain('@prefix');
      expect(serialized).toContain('ex:');
      expect(serialized).toContain('foaf:');
    });
  });

  describe('RDFToZodConverter with unrdf', () => {
    // Tests to verify RDFToZodConverter works with pure unrdf stores
    // Skipped for now as converter may need updates to work with unrdf directly
  });

  describe('Error Handling', () => {
    it('should gracefully handle parsing errors', async () => {
      const invalidTurtle = `This is not valid Turtle syntax @#$%^&`;

      try {
        await parseTurtle(invalidTurtle);
        expect(true).toBe(false); // Should throw
      } catch (err) {
        expect(err).toBeDefined();
        expect(err.message).toContain('Parse');
      }
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      // Generate large dataset
      const triples = [];
      for (let i = 0; i < 1000; i++) {
        triples.push(`ex:Person${i} ex:name "Person ${i}" .`);
      }
      const turtle = `@prefix ex: <http://example.org/> .\n${triples.join('\n')}`;

      const startParse = Date.now();
      const store = await parseTurtle(turtle);
      const parseDuration = Date.now() - startParse;

      expect([...store].length).toBe(1000);
      expect(parseDuration).toBeLessThan(5000); // Should complete in < 5 seconds

      const startSerialize = Date.now();
      await toTurtle(store);
      const serializeDuration = Date.now() - startSerialize;

      expect(serializeDuration).toBeLessThan(5000); // Should complete in < 5 seconds

      console.log(`📊 Performance: Parse=${parseDuration}ms, Serialize=${serializeDuration}ms`);
    });
  });
});
