// src/config/loader.mjs
// GitVan v2 — Configuration loader with c12 integration
// Nitro-style sugar and template string resolution
// Also exposes an RDF-aware compatibility projection without duplicating config ownership.

import { loadConfig, watchConfig } from "c12";
import { klona } from "klona/full";
import defu from "defu";
import { GitVanDefaults } from "./defaults.mjs";
import { normalizeRuntimeConfig } from "./runtime-config.mjs";

// Nitro-style sugar: defineGitVanConfig(() => ({ ... }))
globalThis.defineGitVanConfig = globalThis.defineGitVanConfig || ((c) => c);

/**
 * Load GitVan configuration with overrides and options.
 * @param {Object} overrides - Configuration overrides
 * @param {Object} opts - Loader options
 * @param {boolean} opts.watch - Enable config watching
 * @returns {Promise<Object>} Loaded configuration
 */
export async function loadOptions(overrides = {}, opts = {}) {
  const loaded = await _loadUserConfig(overrides, opts);
  const options = klona(loaded.config);

  options.runtimeConfig = normalizeRuntimeConfig(options);
  _materializeTemplateStrings(options);

  return options;
}

/**
 * Load configuration with the documented RDF compatibility projection.
 *
 * c12 remains the sole configuration owner. RDF is manufactured from that admitted
 * configuration using the canonical config parser ontology and is read-only here.
 * The deleted historical rdf-loader wrapper is intentionally not resurrected.
 *
 * @param {Object} overrides - c12 configuration overrides
 * @param {Object} opts - Compatibility options
 * @param {boolean} opts.watch - Enable c12 watch mode
 * @param {boolean} opts.validateConsistency - Manufacture a projection consistency report
 * @param {string} opts.rdfConfigUri - Subject IRI for the projected configuration
 * @returns {Promise<Object>} c12-compatible configuration plus the RDF projection API
 */
export async function loadWithRDFSupport(overrides = {}, opts = {}) {
  const startedAt = performance.now();
  const config = await loadOptions(overrides, { watch: opts.watch === true });
  const projection = _toPlainConfig(config);
  const [{ configToQuads, CONFIG_NS }, unrdf] = await Promise.all([
    import("./config-parser.mjs"),
    import("@unrdf/core"),
  ]);

  const configUri = opts.rdfConfigUri || "urn:gitvan:config";
  const quads = configToQuads(projection, configUri);
  const store = await unrdf.createStore();
  for (const item of quads) {
    unrdf.addQuad(store, item);
  }

  const get = async (path) => _getConfigPath(projection, path);
  const toPOJO = async () => klona(projection);
  const paths = async () => _configPaths(projection);
  const query = async (sparql) => {
    _assertReadOnlySparql(sparql);
    return unrdf.executeQuery(store, sparql);
  };

  const consistencyReport = opts.validateConsistency === true
    ? _projectionConsistencyReport()
    : null;

  const rdf = Object.freeze({
    query,
    async validate() {
      return {
        supported: false,
        valid: false,
        conformant: null,
        results: [],
        code: "SHACL_SHAPES_REQUIRED",
        reason:
          "SHACL validation requires explicit shapes; the compatibility projection does not manufacture a validation claim.",
      };
    },
    async toTurtle() {
      return _quadsToTurtle(quads, CONFIG_NS);
    },
    toPOJO,
    paths,
    all: toPOJO,
    get,
    isAvailable() {
      return true;
    },
    getConsistencyReport() {
      return consistencyReport;
    },
  });

  const adapter = klona(config);
  Object.defineProperties(adapter, {
    // Historical shape retained without making JSON serialization duplicate the config.
    config: {
      enumerable: false,
      configurable: false,
      value: klona(projection),
    },
    rdf: { enumerable: true, configurable: false, value: rdf },
    getRDF: { enumerable: true, configurable: false, value: get },
    getConsistencyReport: {
      enumerable: true,
      configurable: false,
      value: () => consistencyReport,
    },
    getLoadTimeMs: {
      enumerable: true,
      configurable: false,
      value: () => performance.now() - startedAt,
    },
  });

  return adapter;
}

/** Load user configuration using c12. */
async function _loadUserConfig(overrides = {}, opts = {}) {
  const name = "gitvan";
  const cwd = overrides.rootDir || process.cwd();
  const defaults = klona(GitVanDefaults);

  return (opts.watch ? watchConfig : loadConfig)({
    name,
    cwd,
    defaults,
    jitiOptions: { interopDefault: true },
    extend: { extendKey: ["extends"] },
    async overrides() {
      const merged = defu(overrides, {});
      if (overrides.templates?.dirs) {
        merged.templates = merged.templates || {};
        merged.templates.dirs = overrides.templates.dirs;
      }
      return merged;
    },
  });
}

/** Materialize Nitro-style rootDir templates. */
function _materializeTemplateStrings(options) {
  const map = {
    "{{ rootDir }}/.out": `${options.rootDir}/.out`,
    "{{ rootDir }}/dist": `${options.rootDir}/dist`,
  };
  const out = options.output || {};
  out.dir = _subst(out.dir, map, options.rootDir);
  out.distDir = _subst(out.distDir, map, options.rootDir);
  options.output = out;
}

function _subst(val, map, root) {
  if (typeof val !== "string") return val;
  return val
    .replace("{{ rootDir }}/.out", map["{{ rootDir }}/.out"])
    .replace("{{ rootDir }}/dist", map["{{ rootDir }}/dist"])
    .replace("{{ rootDir }}", root);
}

function _projectionConsistencyReport() {
  return {
    isConsistent: true,
    discrepancies: [],
    onlyInC12: [],
    onlyInRDF: [],
    typeConflicts: [],
    valueConflicts: [],
    warnings: [],
    basis: "RDF projection was deterministically manufactured from the admitted c12 configuration",
  };
}

function _toPlainConfig(value, seen = new WeakSet()) {
  if (value === null || value === undefined) return value;
  if (typeof value === "function" || typeof value === "symbol") return undefined;
  if (typeof value !== "object") return value;
  if (seen.has(value)) return undefined;

  seen.add(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => _toPlainConfig(item, seen))
      .filter((item) => item !== undefined);
  }

  const result = {};
  for (const [key, item] of Object.entries(value)) {
    const projected = _toPlainConfig(item, seen);
    if (projected !== undefined) result[key] = projected;
  }
  return result;
}

function _getConfigPath(config, path) {
  if (typeof path !== "string" || path.length === 0) return undefined;
  return path.split(".").reduce((value, key) => value?.[key], config);
}

function _configPaths(value, prefix = "") {
  if (value === null || typeof value !== "object") return prefix ? [prefix] : [];

  const result = [];
  for (const [key, item] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (item !== null && typeof item === "object" && !Array.isArray(item)) {
      result.push(..._configPaths(item, path));
    } else {
      result.push(path);
    }
  }
  return result;
}

function _assertReadOnlySparql(sparql) {
  if (typeof sparql !== "string" || sparql.trim().length === 0) {
    const error = new TypeError("SPARQL query must be a non-empty string");
    error.code = "RDF_QUERY_INVALID";
    throw error;
  }

  let source = sparql.replace(/^\uFEFF/, "").trimStart();
  source = source.replace(/^(?:\s*#[^\r\n]*(?:\r?\n|$))+/, "").trimStart();
  const declaration = /^(?:PREFIX\s+(?:[A-Za-z][\w-]*)?:\s*<[^>]+>|BASE\s*<[^>]+>)\s*/i;
  while (declaration.test(source)) {
    source = source.replace(declaration, "").trimStart();
    source = source.replace(/^(?:\s*#[^\r\n]*(?:\r?\n|$))+/, "").trimStart();
  }

  const operation = source.match(/^([A-Za-z]+)/)?.[1]?.toUpperCase();
  if (!["SELECT", "ASK", "CONSTRUCT", "DESCRIBE"].includes(operation)) {
    const error = new Error(
      `SPARQL operation ${operation || "UNKNOWN"} is not admitted by the read-only config projection`
    );
    error.code = "RDF_QUERY_MUTATION_REFUSED";
    error.operation = operation || "UNKNOWN";
    throw error;
  }
}

function _quadsToTurtle(quads, configNamespace) {
  const header = `@prefix gvc: <${configNamespace}> .`;
  return [header, ...quads.map(_quadToTurtle)].join("\n");
}

function _quadToTurtle(item) {
  return `${_termToTurtle(item.subject)} ${_termToTurtle(item.predicate)} ${_termToTurtle(item.object)} .`;
}

function _termToTurtle(term) {
  if (term?.termType === "NamedNode") return `<${term.value}>`;
  if (term?.termType === "BlankNode") return `_:${term.value}`;
  if (term?.termType === "Literal") {
    const value = JSON.stringify(String(term.value ?? ""));
    if (term.language) return `${value}@${term.language}`;
    const datatype = term.datatype?.value;
    if (datatype && datatype !== "http://www.w3.org/2001/XMLSchema#string") {
      return `${value}^^<${datatype}>`;
    }
    return value;
  }
  throw new TypeError(`Unsupported RDF term: ${JSON.stringify(term)}`);
}
