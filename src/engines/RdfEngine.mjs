// src/engines/RdfEngine.mjs
// Production-grade RDF engine for JavaScript.

import { Parser, Store, Writer, DataFactory } from "n3";
import { QueryEngine } from "@comunica/query-sparql";
import rdf from "rdf-ext";
import SHACLValidator from "rdf-validate-shacl";
import rdfCanonize from "rdf-canonize";
import jsonld from "jsonld";
import { n3reasoner } from "eyereasoner";
import $rdf from "@zazuko/env";

const { namedNode, literal, quad, blankNode, defaultGraph, variable } =
  DataFactory;

export class RdfEngine {
  /**
   * @param {object} [options]
   * @param {string} [options.baseIRI='http://example.org/']
   * @param {boolean} [options.deterministic=true]
   * @param {number} [options.timeoutMs=30000]
   * @param {(m:{event:string;data?:any;durMs?:number})=>void} [options.onMetric]
   * @param {{debug:Function,info:Function,warn:Function,error:Function}} [options.logger=console]
   */
  constructor(options = {}) {
    this.baseIRI = options.baseIRI || "http://example.org/";
    this.deterministic = options.deterministic !== false;
    this.timeoutMs = Number.isFinite(options.timeoutMs)
      ? options.timeoutMs
      : 30_000;
    this.onMetric =
      typeof options.onMetric === "function" ? options.onMetric : null;
    this.log = options.logger || console;
    this.engine = new QueryEngine();

    // Use @zazuko/env which comes bundled with clownface
    this.$rdf = $rdf;
  }

  // ============== Terms & Store ==============

  createStore(quads = []) {
    return new Store(quads);
  }
  namedNode(value) {
    return namedNode(value);
  }
  literal(value, languageOrDatatype) {
    return literal(value, languageOrDatatype);
  }
  blankNode(value) {
    return blankNode(value);
  }
  quad(s, p, o, g = defaultGraph()) {
    return quad(s, p, o, g);
  }

  // ============== Parse & Serialize (deterministic) ==============

  parseTurtle(ttl, options = {}) {
    if (typeof ttl !== "string" || !ttl.length)
      throw new Error("parseTurtle: non-empty string required");
    const parser = new Parser({ baseIRI: options.baseIRI || this.baseIRI });
    return new Store(parser.parse(ttl));
  }

  parseNQuads(nq) {
    if (typeof nq !== "string" || !nq.length)
      throw new Error("parseNQuads: non-empty string required");
    const parser = new Parser({ format: "N-Quads" });
    return new Store(parser.parse(nq));
  }

  async serializeTurtle(store, options = {}) {
    // Extract prefixes from the store if not provided
    const prefixes = options.prefixes || this._extractPrefixes(store);

    const writer = new Writer({
      format: "Turtle",
      prefixes,
    });
    const quads = this._maybeSort([...store]);
    writer.addQuads(quads);
    return new Promise((resolve, reject) =>
      writer.end((e, out) => (e ? reject(e) : resolve(out)))
    );
  }

  async serializeNQuads(store) {
    const writer = new Writer({ format: "N-Quads" });
    const quads = this._maybeSort([...store]);
    writer.addQuads(quads);
    return new Promise((resolve, reject) =>
      writer.end((e, out) => (e ? reject(e) : resolve(out)))
    );
  }

  // ============== Canonicalization & Isomorphism ==============

  async canonicalize(store) {
    const nquads = await this.serializeNQuads(store);
    return rdfCanonize.canonize(nquads, {
      algorithm: "URDNA2015",
      format: "application/n-quads",
    });
  }

  async isIsomorphic(a, b) {
    const t0 = performance.now();
    const [ca, cb] = await Promise.all([
      this.canonicalize(a),
      this.canonicalize(b),
    ]);
    this._metric("isomorphic.check", performance.now() - t0);
    return ca === cb;
  }

  // ============== SHACL Validation ==============

  async validateShacl(dataStore, shapesInput) {
    const shapesStore =
      typeof shapesInput === "string"
        ? this.parseTurtle(shapesInput)
        : shapesInput;
    const dataDataset = rdf.dataset([...dataStore]);
    const shapesDataset = rdf.dataset([...shapesStore]);
    const validator = new SHACLValidator(shapesDataset);
    const report = await this._withTimeout(
      () => validator.validate(dataDataset),
      this.timeoutMs,
      "shacl.validate"
    );
    return {
      conforms: report.conforms,
      results: report.results.map((r) => ({
        focusNode: r.focusNode?.value || null,
        path: r.path?.value || null,
        message: r.message?.[0]?.value || null,
        severity: r.severity?.value || null,
        sourceShape: r.sourceShape?.value || null,
        value: r.value?.value || null,
      })),
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

  // ============== SPARQL Query & Update ==============

  /**
   * Query with streaming, paging, and timeout.
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

    const ctx = { sources: [store] };
    const kind = q
      .toUpperCase()
      .match(
        /\b(SELECT|ASK|CONSTRUCT|DESCRIBE|WITH|INSERT|DELETE|LOAD|CREATE|DROP|CLEAR|MOVE|COPY|ADD)\b/
      )?.[1];

    const run = async () => {
      if (!kind) throw new Error("query: unknown query type");

      // SPARQL UPDATE
      if (
        /^(WITH|INSERT|DELETE|LOAD|CREATE|DROP|CLEAR|MOVE|COPY|ADD)$/i.test(
          kind
        )
      ) {
        await this.engine.queryVoid(q, { ...ctx, destination: store });
        return { type: "update", ok: true };
      }

      if (kind === "ASK") {
        const boolean = await this.engine.queryBoolean(q, ctx);
        return { type: "ask", boolean };
      }

      if (kind === "CONSTRUCT" || kind === "DESCRIBE") {
        const quadStream = await this.engine.queryQuads(q, ctx);
        const out = new Store();
        for await (const qq of quadStream) out.add(qq);
        const quads = deterministic ? this._maybeSort([...out]) : [...out];
        return { type: kind.toLowerCase(), store: new Store(quads), quads };
      }

      // SELECT
      const bindings = await this.engine.queryBindings(q, ctx);
      const rows = [];
      const varSet = new Set();
      for await (const b of bindings) {
        for (const k of b.keys()) varSet.add(k.value);
        const row = {};
        for (const v of varSet) {
          const term = b.get(variable(v));
          row[v] = this._termToJSON(term);
        }
        rows.push(row);
        if (rows.length >= limit) break;
      }
      const variables = [...varSet].sort();
      const results = deterministic
        ? rows.sort((a, b) =>
            JSON.stringify(a).localeCompare(JSON.stringify(b))
          )
        : rows;
      return { type: "select", variables, results };
    };

    return this._withTimeout(run, this.timeoutMs, "sparql.query", opts.signal);
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

  // ============== Reasoning ==============

  /**
   * N3 reasoning with timeout. Returns a new store.
   * @param {Store} dataStore
   * @param {Store} rulesStore
   */
  async reason(dataStore, rulesStore) {
    const run = async () => {
      const dataN3 = await this.serializeTurtle(dataStore);
      const rulesN3 = await this.serializeTurtle(rulesStore);
      const out = await n3reasoner(dataN3, rulesN3);
      return this.parseTurtle(out);
    };
    return this._withTimeout(run, this.timeoutMs, "reasoning.n3");
  }

  // ============== JSON-LD I/O ==============

  /**
   * Store -> JSON-LD (compact or framed).
   * @param {Store} store
   * @param {{context?:object, frame?:object}} [opts]
   */
  async toJSONLD(store, opts = {}) {
    const nquads = await this.serializeNQuads(store);
    const doc = await jsonld.fromRDF(nquads, { format: "application/n-quads" });
    if (opts.frame) return jsonld.frame(doc, opts.frame, { omitGraph: false });
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
    const nquads = await jsonld.toRDF(jsonldDoc, {
      format: "application/n-quads",
    });
    return this.parseNQuads(nquads);
  }

  // ============== Set Ops & Utilities ==============

  union(...stores) {
    const out = new Store();
    for (const s of stores) for (const q of s) out.add(q);
    return out;
  }
  difference(a, b) {
    const out = new Store();
    for (const q of a) if (!b.has(q)) out.add(q);
    return out;
  }
  intersection(a, b) {
    const out = new Store();
    for (const q of a) if (b.has(q)) out.add(q);
    return out;
  }

  /**
   * Skolemize bnodes. Stable per run. Increments only on first-seen bnode.
   * @param {Store} store
   * @param {string} [baseIRI='http://example.org/.well-known/genid/']
   */
  skolemize(store, baseIRI = "http://example.org/.well-known/genid/") {
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
