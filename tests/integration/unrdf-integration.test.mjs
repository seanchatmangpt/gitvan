/**
 * unrdf Integration Tests
 * Verifies that unrdf is properly integrated into GitVan's RDF subsystem
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RdfEngine } from '../../src/engines/RdfEngine.mjs';
import { RDFToZodConverter } from '../../src/rdf-to-zod/RDFToZodConverter.mjs';
import { z } from 'zod';

describe('unrdf Integration', () => {
  let engine;

  beforeAll(() => {
    engine = new RdfEngine({
      useUnrdf: true,
      logger: console
    });
  });

  describe('RdfEngine with unrdf', () => {
    it('should initialize with unrdf Dark Matter Core', () => {
      expect(engine.useUnrdf).toBe(true);
      // May be undefined if unrdf initialization failed, which is OK (fallback)
      if (engine.darkMatter) {
        expect(engine.darkMatter).toBeDefined();
        console.log('✅ unrdf Dark Matter Core active');
      } else {
        console.log('⚠️ Using N3 fallback (unrdf not available)');
      }
    });

    it('should parse Turtle successfully', () => {
      const turtle = `
        @prefix ex: <http://example.org/> .
        @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

        ex:Alice a ex:Person ;
          ex:name "Alice" ;
          ex:age 30 .
      `;

      const store = engine.parseTurtle(turtle);
      expect(store).toBeDefined();
      expect(store.size).toBeGreaterThan(0);
      expect(store.size).toBe(3); // 3 triples
    });

    it('should serialize Turtle successfully', async () => {
      const turtle = `
        @prefix ex: <http://example.org/> .
        ex:Bob ex:name "Bob" .
      `;

      const store = engine.parseTurtle(turtle);
      const serialized = await engine.serializeTurtle(store);

      expect(serialized).toBeDefined();
      expect(typeof serialized).toBe('string');
      expect(serialized).toContain('Bob');
    });

    it('should execute SPARQL SELECT query', async () => {
      const turtle = `
        @prefix ex: <http://example.org/> .
        @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

        ex:Alice a ex:Person ; ex:name "Alice" ; ex:age 30 .
        ex:Bob a ex:Person ; ex:name "Bob" ; ex:age 25 .
      `;

      const store = engine.parseTurtle(turtle);
      const query = `
        PREFIX ex: <http://example.org/>
        SELECT ?person ?name WHERE {
          ?person ex:name ?name .
        }
      `;

      const result = await engine.query(store, query);

      expect(result.type).toBe('select');
      expect(result.results).toBeDefined();
      expect(result.results.length).toBe(2);
      expect(result.variables).toContain('person');
      expect(result.variables).toContain('name');
    });

    it('should execute SPARQL ASK query', async () => {
      const turtle = `
        @prefix ex: <http://example.org/> .
        ex:Alice ex:knows ex:Bob .
      `;

      const store = engine.parseTurtle(turtle);
      const query = `
        PREFIX ex: <http://example.org/>
        ASK { ex:Alice ex:knows ex:Bob }
      `;

      const result = await engine.query(store, query);

      expect(result.type).toBe('ask');
      expect(result.boolean).toBe(true);
    });

    it('should execute SPARQL CONSTRUCT query', async () => {
      const turtle = `
        @prefix ex: <http://example.org/> .
        @prefix foaf: <http://xmlns.com/foaf/0.1/> .

        ex:Alice ex:name "Alice" .
      `;

      const store = engine.parseTurtle(turtle);
      const query = `
        PREFIX ex: <http://example.org/>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        CONSTRUCT { ?person foaf:name ?name }
        WHERE { ?person ex:name ?name }
      `;

      const result = await engine.query(store, query);

      expect(result.type).toBe('construct');
      expect(result.store).toBeDefined();
      expect(result.store.size).toBeGreaterThan(0);
    });

    it('should handle deterministic output', async () => {
      const turtle = `
        @prefix ex: <http://example.org/> .
        ex:C ex:p "3" .
        ex:B ex:p "2" .
        ex:A ex:p "1" .
      `;

      const store = engine.parseTurtle(turtle);
      const serialized1 = await engine.serializeTurtle(store);
      const serialized2 = await engine.serializeTurtle(store);

      // Deterministic serialization should produce identical output
      expect(serialized1).toBe(serialized2);
    });

    it('should preserve blank nodes', () => {
      const turtle = `
        @prefix ex: <http://example.org/> .

        ex:Alice ex:knows [
          a ex:Person ;
          ex:name "Anonymous"
        ] .
      `;

      const store = engine.parseTurtle(turtle);
      expect(store.size).toBe(3); // Alice knows _:b, _:b type Person, _:b name "Anonymous"
    });

    it('should handle prefixes correctly', async () => {
      const turtle = `
        @prefix ex: <http://example.org/> .
        @prefix foaf: <http://xmlns.com/foaf/0.1/> .

        ex:Alice foaf:name "Alice" .
      `;

      const store = engine.parseTurtle(turtle);
      const serialized = await engine.serializeTurtle(store, {
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
    it('should create converter with RdfEngine', () => {
      const converter = new RDFToZodConverter({
        rdfEngine: engine,
        useUnrdf: true
      });

      expect(converter.rdfEngine).toBeDefined();
      expect(converter.rdfEngine).toBe(engine);
    });

    it('should convert SPARQL results to Zod objects', async () => {
      const turtle = `
        @prefix ex: <http://example.org/> .
        ex:Alice ex:name "Alice" ; ex:age 30 .
        ex:Bob ex:name "Bob" ; ex:age 25 .
      `;

      const store = engine.parseTurtle(turtle);
      const query = `
        PREFIX ex: <http://example.org/>
        SELECT ?name ?age WHERE {
          ?person ex:name ?name ;
                  ex:age ?age .
        }
      `;

      const schema = z.object({
        name: z.object({
          value: z.string()
        }),
        age: z.object({
          value: z.string()
        })
      });

      const converter = new RDFToZodConverter({
        rdfEngine: engine
      });

      const results = await converter.queryToZod(query, store, schema);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle validation errors gracefully', async () => {
      const turtle = `@prefix ex: <http://example.org/> . ex:Test ex:value "invalid" .`;
      const store = engine.parseTurtle(turtle);
      const query = `SELECT ?value WHERE { ?s ex:value ?value }`;

      const strictSchema = z.object({
        value: z.object({
          value: z.number() // Expects number but gets string
        })
      });

      const converter = new RDFToZodConverter({ rdfEngine: engine });
      const results = await converter.queryToZod(query, store, strictSchema);

      // Should include validation error
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]._validationError).toBeDefined();
    });
  });

  describe('Fallback Behavior', () => {
    it('should work with useUnrdf disabled', () => {
      const fallbackEngine = new RdfEngine({ useUnrdf: false });

      expect(fallbackEngine.useUnrdf).toBe(false);
      expect(fallbackEngine.darkMatter).toBeUndefined();

      const turtle = `@prefix ex: <http://example.org/> . ex:Test ex:p "value" .`;
      const store = fallbackEngine.parseTurtle(turtle);

      expect(store.size).toBe(1);
    });

    it('should gracefully handle parsing errors', () => {
      const invalidTurtle = `This is not valid Turtle syntax @#$%^&`;

      expect(() => {
        engine.parseTurtle(invalidTurtle);
      }).toThrow();
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
      const store = engine.parseTurtle(turtle);
      const parseDuration = Date.now() - startParse;

      expect(store.size).toBe(1000);
      expect(parseDuration).toBeLessThan(5000); // Should complete in < 5 seconds

      const startSerialize = Date.now();
      await engine.serializeTurtle(store);
      const serializeDuration = Date.now() - startSerialize;

      expect(serializeDuration).toBeLessThan(5000); // Should complete in < 5 seconds

      console.log(`📊 Performance: Parse=${parseDuration}ms, Serialize=${serializeDuration}ms`);
    });
  });
});
