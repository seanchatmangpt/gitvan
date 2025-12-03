// src/engines/RdfEngine.mjs
// Production-grade RDF engine for JavaScript - GitVan Edition
// Built on unrdf's RdfEngine with GitVan-specific extensions

import { RdfEngine as UnrdfEngine } from "unrdf";
import { DataFactory } from "n3";
import $rdf from "@zazuko/env";

const { namedNode, literal, quad, blankNode, defaultGraph, variable } =
  DataFactory;

/**
 * GitVan RDF Engine - extends unrdf's RdfEngine with GitVan-specific features
 *
 * This class wraps unrdf's production-ready RdfEngine and adds:
 * - Clownface graph traversal integration
 * - Prefix extraction from stores
 * - GitVan-specific metrics and logging
 * - Deterministic operations for testing
 *
 * @extends {UnrdfEngine}
 */
export class RdfEngine extends UnrdfEngine {
  /**
   * @param {object} [options]
   * @param {string} [options.baseIRI='http://example.org/']
   * @param {boolean} [options.deterministic=true]
   * @param {number} [options.timeoutMs=30000]
   * @param {(m:{event:string;data?:any;durMs?:number})=>void} [options.onMetric]
   * @param {{debug:Function,info:Function,warn:Function,error:Function}} [options.logger=console]
   */
  constructor(options = {}) {
    // Pass baseIRI to unrdf's RdfEngine
    super({ baseIRI: options.baseIRI || "http://example.org/" });

    // GitVan-specific options
    this.deterministic = options.deterministic !== false;
    this.timeoutMs = Number.isFinite(options.timeoutMs)
      ? options.timeoutMs
      : 30_000;
    this.onMetric =
      typeof options.onMetric === "function" ? options.onMetric : null;
    this.log = options.logger || console;

    // Use @zazuko/env which comes bundled with clownface
    this.$rdf = $rdf;
  }

  // ============== Terms & Store (inherited from unrdf) ==============
  // These methods are already available from UnrdfEngine:
  // - namedNode(value)
  // - literal(value, languageOrDatatype)
  // - blankNode(value)
  // - quad(s, p, o, g)
  // - parseTurtle(ttl)
  // - serializeTurtle(store, options)
  // - serializeNQuads(store)
  // - query(sparql)

  // ============== Additional Store Creation (for compatibility) ==============

  createStore(quads = []) {
    if (!quads || quads.length === 0) {
      return this.getStore();
    }
    const store = this.getStore();
    store.addQuads(quads);
    return store;
  }

  // ============== Parse & Serialize (override for deterministic support) ==============

  /**
   * Parse Turtle with deterministic output support
   * @param {string} ttl - Turtle string
   * @param {object} [options]
   * @param {string} [options.baseIRI] - Base IRI override
   * @returns {import('n3').Store}
   */
  parseTurtle(ttl, options = {}) {
    if (typeof ttl !== "string" || !ttl.length)
      throw new Error("parseTurtle: non-empty string required");

    // Use parent's parseTurtle which already handles baseIRI
    const store = super.parseTurtle(ttl);

    // Return deterministic if needed
    if (this.deterministic) {
      const sorted = this._maybeSort([...store]);
      const newStore = this.getStore();
      newStore.addQuads(sorted);
      return newStore;
    }

    return store;
  }

  async parseNQuads(nq) {
    if (typeof nq !== "string" || !nq.length)
      throw new Error("parseNQuads: non-empty string required");

    const { Parser } = await import("n3");
    const parser = new Parser({ format: "N-Quads" });
    const quads = parser.parse(nq);

    const store = this.getStore();
    store.addQuads(this._maybeSort(quads));
    return store;
  }

  async serializeTurtle(store, options = {}) {
    // Extract prefixes from the store if not provided
    const prefixes = options.prefixes || this._extractPrefixes(store);

    // Use parent's serialize with prefixes
    return super.serializeTurtle(store, { ...options, prefixes });
  }

  async serializeNQuads(store) {
    return super.serializeNQuads(store);
  }

  // ============== Canonicalization & Isomorphism (use unrdf's canonicalize) ==============

  async canonicalize(store) {
    const { canonicalize } = await import("unrdf");
    return canonicalize(store);
  }

  async isIsomorphic(a, b) {
    const t0 = performance.now();
    const { isIsomorphic } = await import("unrdf");
    const result = await isIsomorphic(a, b);
    this._metric("isomorphic.check", performance.now() - t0);
    return result;
  }

  // ============== SHACL Validation (use unrdf's validate) ==============

  async validateShacl(dataStore, shapesInput) {
    const { validateShacl } = await import("unrdf");

    const shapesStore =
      typeof shapesInput === "string"
        ? this.parseTurtle(shapesInput)
        : shapesInput;

    const report = await this._withTimeout(
      () => validateShacl(dataStore, shapesStore),
      this.timeoutMs,
      "shacl.validate"
    );

    return {
      conforms: report.conforms,
      results: report.results?.map((r) => ({
        focusNode: r.focusNode?.value || null,
        path: r.path?.value || null,
        message: r.message?.[0]?.value || null,
        severity: r.severity?.value || null,
        sourceShape: r.sourceShape?.value || null,
        value: r.value?.value || null,
      })) || [],
    };
  }

  async validateShaclOrThrow(dataStore, shapesInput) {
    const rep = await this.validateShacl(dataStore, shapesInput);
    if (!rep.conforms) {
      const msg = rep.results
        .map((x) => `[${x.severity}] ${x.path} ${x.message}`)
        .join(" ; ");
      throw new Error(`SHACL validation failed: ${msg}`);
    }
    return rep;
  }

  // ============== SPARQL Query & Update (override for compatibility) ==============

  /**
   * Query with streaming, paging, and timeout - GitVan compatibility wrapper
   * @param {Store} store
   * @param {string} sparql
   * @param {{limit?:number,signal?:AbortSignal,deterministic?:boolean}} [opts]
   */
  async query(store, sparql, opts = {}) {
    if (typeof sparql !== "string" || !sparql.trim())
      throw new Error("query: non-empty SPARQL required");

    const q = sparql.trim();
    const limit = Number.isFinite(opts.limit) ? opts.limit : Infinity;
    const deterministic = opts.deterministic ?? this.deterministic;

    // Save current store and temporarily use the provided store
    const originalStore = this.getStore();
    this.clearStore();
    this.store.addQuads([...store]);

    try {
      const result = await this._withTimeout(
        () => super.query(q),
        this.timeoutMs,
        "sparql.query",
        opts.signal
      );

      // Process results based on type
      if (result.type === "select") {
        let rows = result.rows || [];

        // Apply limit
        if (rows.length > limit) {
          rows = rows.slice(0, limit);
        }

        // Apply deterministic sorting
        if (deterministic) {
          rows = rows.sort((a, b) =>
            JSON.stringify(a).localeCompare(JSON.stringify(b))
          );
        }

        return {
          type: "select",
          variables: result.variables || [],
          results: rows,
        };
      }

      if (result.type === "ask") {
        return { type: "ask", boolean: result.boolean || false };
      }

      if (result.type === "construct" || result.type === "describe") {
        const quads = deterministic
          ? this._maybeSort([...result.store])
          : [...result.store];
        const { Store } = await import("n3");
        return {
          type: result.type,
          store: new Store(quads),
          quads,
        };
      }

      // UPDATE operations
      return { type: "update", ok: true };
    } finally {
      // Restore original store
      this.clearStore();
      this.store.addQuads([...originalStore]);
    }
  }

  // ============== Graph Manipulation ==============

  /** Clownface pointer over an rdf-ext dataset view of the store. */
  getClownface(store) {
    // Convert N3 Store to RDF/JS dataset
    const dataset = this.$rdf.dataset();
    for (const quad of store) {
      dataset.add(
        this.$rdf.quad(
          this.$rdf.namedNode(quad.subject.value),
          this.$rdf.namedNode(quad.predicate.value),
          quad.object.termType === "NamedNode"
            ? this.$rdf.namedNode(quad.object.value)
            : quad.object.termType === "Literal"
            ? this.$rdf.literal(
                quad.object.value,
                quad.object.language || quad.object.datatype
              )
            : this.$rdf.blankNode(quad.object.value),
          quad.graph.termType === "DefaultGraph"
            ? this.$rdf.defaultGraph()
            : quad.graph.termType === "NamedNode"
            ? this.$rdf.namedNode(quad.graph.value)
            : this.$rdf.blankNode(quad.graph.value)
        )
      );
    }
    return this.$rdf.clownface({ dataset });
  }

  // ============== Reasoning (use unrdf's reason) ==============

  /**
   * N3 reasoning with timeout. Returns a new store.
   * @param {Store} dataStore
   * @param {Store} rulesStore
   */
  async reason(dataStore, rulesStore) {
    const { reason } = await import("unrdf");

    const run = async () => {
      return reason(dataStore, rulesStore);
    };

    return this._withTimeout(run, this.timeoutMs, "reasoning.n3");
  }

  // ============== JSON-LD I/O (use unrdf's toJsonLd/parseJsonLd) ==============

  /**
   * Store -> JSON-LD (compact or framed).
   * @param {Store} store
   * @param {{context?:object, frame?:object}} [opts]
   */
  async toJSONLD(store, opts = {}) {
    const { toJsonLd } = await import("unrdf");
    const jsonld = await import("jsonld");

    const doc = await toJsonLd(store);

    if (opts.frame) {
      return jsonld.frame(doc, opts.frame, { omitGraph: false });
    }

    const context = opts.context || {};
    const compacted = await jsonld.compact(doc, context);

    // Ensure @context is present
    if (!compacted["@context"]) {
      compacted["@context"] = context;
    }

    return compacted;
  }

  /**
   * JSON-LD -> Store.
   * @param {object} jsonldDoc
   */
  async fromJSONLD(jsonldDoc) {
    const { parseJsonLd } = await import("unrdf");
    return parseJsonLd(jsonldDoc);
  }

  // ============== Set Ops & Utilities ==============

  async union(...stores) {
    const { Store } = await import("n3");
    const out = new Store();
    for (const s of stores) for (const q of s) out.add(q);
    return out;
  }

  async difference(a, b) {
    const { Store } = await import("n3");
    const out = new Store();
    for (const q of a) if (!b.has(q)) out.add(q);
    return out;
  }

  async intersection(a, b) {
    const { Store } = await import("n3");
    const out = new Store();
    for (const q of a) if (b.has(q)) out.add(q);
    return out;
  }

  /**
   * Skolemize bnodes. Stable per run. Increments only on first-seen bnode.
   * @param {Store} store
   * @param {string} [baseIRI='http://example.org/.well-known/genid/']
   */
  async skolemize(store, baseIRI = "http://example.org/.well-known/genid/") {
    const { Store } = await import("n3");
    const out = new Store();
    const map = new Map();
    let i = 0;
    const sk = (b) => {
      if (!map.has(b.value)) map.set(b.value, namedNode(`${baseIRI}${i++}`));
      return map.get(b.value);
    };
    for (const qd of store) {
      const s =
        qd.subject.termType === "BlankNode" ? sk(qd.subject) : qd.subject;
      const o = qd.object.termType === "BlankNode" ? sk(qd.object) : qd.object;
      out.add(quad(s, qd.predicate, o, qd.graph));
    }
    return out;
  }

  getStats(store) {
    const S = new Set(),
      P = new Set(),
      O = new Set(),
      G = new Set();
    for (const q of store) {
      S.add(q.subject.value);
      P.add(q.predicate.value);
      O.add(q.object.value);
      G.add(q.graph.value);
    }
    return {
      quads: store.size,
      subjects: S.size,
      predicates: P.size,
      objects: O.size,
      graphs: G.size,
    };
  }

  // ============== Internals ==============

  _maybeSort(quads) {
    if (!this.deterministic) return quads;
    return quads.sort((a, b) =>
      `${a.subject.value}${a.predicate.value}${a.object.value}${a.graph.value}`.localeCompare(
        `${b.subject.value}${b.predicate.value}${b.object.value}${b.graph.value}`
      )
    );
  }

  _termToJSON(term) {
    if (!term) return null;
    const out = { termType: term.termType, value: term.value };
    if (term.termType === "Literal") {
      if (term.language) out.language = term.language;
      if (term.datatype?.value) out.datatype = term.datatype.value;
    }
    return out;
  }

  async _withTimeout(fn, ms, label, externalSignal) {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(new Error(`${label} timeout after ${ms}ms`)),
      ms
    );
    const t0 = performance.now();
    try {
      const res = await fn({ signal: controller.signal, externalSignal });
      this._metric(label, performance.now() - t0);
      return res;
    } catch (error) {
      this.log.error(`${label} failed:`, error.message);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  _metric(event, durMs) {
    if (this.onMetric) {
      try {
        this.onMetric({ event, durMs });
      } catch {
        /* ignore metrics errors */
      }
    }
  }

  _extractPrefixes(store) {
    const prefixes = {};
    const uris = new Set();

    // Collect all URIs from the store
    for (const quad of store) {
      if (quad.subject.termType === "NamedNode") uris.add(quad.subject.value);
      if (quad.predicate.termType === "NamedNode")
        uris.add(quad.predicate.value);
      if (quad.object.termType === "NamedNode") uris.add(quad.object.value);
      if (quad.graph.termType === "NamedNode") uris.add(quad.graph.value);
    }

    // Extract common prefixes
    const commonPrefixes = {
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#": "rdf",
      "http://www.w3.org/2000/01/rdf-schema#": "rdfs",
      "http://www.w3.org/2001/XMLSchema#": "xsd",
      "http://xmlns.com/foaf/0.1/": "foaf",
      "http://purl.org/dc/terms/": "dct",
      "http://www.w3.org/ns/shacl#": "sh",
      "https://gitvan.dev/ontology#": "gv",
      "https://gitvan.dev/graph-hook#": "gh",
      "https://gitvan.dev/op#": "op",
    };

    // Find the best prefix for each URI
    for (const uri of uris) {
      for (const [prefixUri, prefixName] of Object.entries(commonPrefixes)) {
        if (uri.startsWith(prefixUri)) {
          prefixes[prefixName] = prefixUri;
          break;
        }
      }
    }

    // Add example.org prefix if present
    const exampleUris = Array.from(uris).filter((uri) =>
      uri.startsWith("http://example.org/")
    );
    if (exampleUris.length > 0) {
      prefixes["ex"] = "http://example.org/";
    }

    return prefixes;
  }
}
