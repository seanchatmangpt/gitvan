/**
 * @fileoverview GitVan v2 — Turtle/RDF Composable
 *
 * This module provides Turtle/RDF file loading, parsing, and querying capabilities
 * within the GitVan context. It handles loading .ttl files from directories,
 * parsing them into N3 stores, and providing methods to query and extract
 * knowledge hooks and RDF data.
 *
 * Key Features:
 * - Turtle (.ttl) file loading and parsing
 * - N3 store integration for RDF operations
 * - Knowledge hook extraction from RDF data
 * - SPARQL query execution
 * - Namespace management for RDF vocabularies
 * - RDF list traversal utilities
 *
 * @version 2.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import N3 from "n3";
import { useGitVan, tryUseGitVan } from "../core/context.mjs";
import { loadOptions } from "../config/loader.mjs";

// Namespace constants for RDF vocabularies
const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const DCT = "http://purl.org/dc/terms/";
const GH = "https://gitvan.dev/graph-hook#";
const GV = "https://gitvan.dev/ontology#";
const OP = "https://gitvan.dev/op#";

// Helper to convert an RDF term to a plain string
const asStr = (term) =>
  term?.termType === "Literal" ? term.value : term?.value;

// Helper to traverse and read an RDF list
const readList = (store, head) => {
  if (!head) return [];
  const out = [];
  let current = head;
  while (current && current.value !== RDF + "nil") {
    out.push(store.getObjects(current, RDF + "first", null)[0]);
    current = store.getObjects(current, RDF + "rest", null)[0];
  }
  return out;
};

/**
 * Bind context and resolve graph configuration
 * Integrates with GitVan config system for robust graph path resolution
 */
async function bindContext(opts = {}) {
  let ctx;
  try {
    ctx = useGitVan();
  } catch {
    ctx = tryUseGitVan?.() || null;
  }

  const root = (ctx && ctx.cwd) || process.cwd();

  // Load configuration using GitVan config system
  const config = await loadOptions({ rootDir: root });

  // Resolve graph directory with precedence: opts > config > defaults
  const graphDir = opts.graphDir || join(root, config.graph.dir);

  // Merge URI roots with precedence: opts > config > defaults
  const uriRoots = {
    ...config.graph.uriRoots,
    ...opts.uriRoots,
  };

  // Add graph:// prefix if not present
  if (!uriRoots["graph://"]) {
    uriRoots["graph://"] = `${graphDir}/`;
  }

  return { root, graphDir, uriRoots, config };
}

/**
 * Turtle/RDF operations composable
 *
 * Provides Turtle file loading, parsing, and querying capabilities within the GitVan context.
 * This function loads all .ttl files from a directory, parses them into an N3 store,
 * and provides methods to query the RDF data and extract knowledge hooks.
 *
 * @async
 * @function useTurtle
 * @param {Object} [options={}] - Turtle options
 * @param {string} [options.graphDir] - Directory containing Turtle files
 * @returns {Promise<Object>} Turtle operations interface
 * @returns {Function} returns.loadFiles - Load Turtle files from directory
 * @returns {Function} returns.getHooks - Get knowledge hooks from loaded data
 * @returns {Function} returns.query - Query the loaded RDF store
 * @returns {Function} returns.store - Access to the N3 store
 * @returns {Function} returns.parser - Access to the N3 parser
 *
 * @example
 * ```javascript
 * const turtle = await useTurtle({ graphDir: './knowledge' });
 *
 * // Load files
 * await turtle.loadFiles();
 *
 * // Get knowledge hooks
 * const hooks = turtle.getHooks();
 *
 * // Query RDF data
 * const results = turtle.query(`
 *   PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
 *   SELECT ?s ?p ?o WHERE { ?s ?p ?o }
 * `);
 * ```
 */
export async function useTurtle(options = {}) {
  const { root, graphDir, uriRoots, config } = await bindContext(options);

  // --- Internal loader ---
  const load = async () => {
    const fileNames = (await readdir(graphDir)).filter((f) =>
      f.endsWith(".ttl")
    );
    const files = await Promise.all(
      fileNames.map(async (name) => ({
        name,
        content: await readFile(join(graphDir, name), "utf8"),
      }))
    );
    const store = new N3.Store();
    const parser = new N3.Parser();
    for (const file of files) {
      try {
        store.addQuads(parser.parse(file.content));
      } catch (error) {
        // Skip malformed turtle files gracefully
        console.warn(
          `Warning: Failed to parse turtle file ${file.name}: ${error.message}`
        );
      }
    }
    return { store, files };
  };

  const { store, files } = await load();

  // --- Public API ---
  return {
    /** The raw N3.Store instance. */
    store,
    /** An array of the raw file contents that were loaded. */
    files,
    /** Configuration used by this instance. */
    config: {
      root,
      graphDir,
      uriRoots,
      ...config.graph,
    },

    /** Helper to traverse and read an RDF list */
    readList(head) {
      return readList(store, head);
    },

    /** Checks if a subject has a specific rdf:type. */
    isA(subject, type) {
      return store.countQuads(subject, RDF + "type", type, null) > 0;
    },

    /** Gets a single object for a given subject and predicate. */
    getOne(subject, predicate) {
      return store.getObjects(subject, predicate, null)[0];
    },

    /** Gets all objects for a given subject and predicate. */
    getAll(subject, predicate) {
      return store.getObjects(subject, predicate, null);
    },

    /** Finds all defined Knowledge Hooks in the graph. */
    getHooks() {
      const hooks = store.getSubjects(RDF + "type", GH + "Hook", null);
      return hooks.map((hookNode) => {
        const id = hookNode.value;
        const title = asStr(this.getOne(hookNode, DCT + "title")) || id;
        const pred = this.getOne(hookNode, GH + "hasPredicate");
        const pipelinesList = this.getOne(hookNode, GH + "orderedPipelines");
        const pipelines = pipelinesList ? readList(store, pipelinesList) : [];
        return { node: hookNode, id, title, pred, pipelines };
      });
    },

    /** Gets the steps for a given pipeline node. */
    getPipelineSteps(pipelineNode) {
      const listHead = this.getOne(pipelineNode, OP + "steps");
      return readList(store, listHead);
    },

    /** Resolves a URI (like graph://) to its file content. */
    async resolveText(maybeUri) {
      if (typeof maybeUri !== "string") return maybeUri;

      // Check for URI prefixes first
      const prefix = Object.keys(uriRoots).find((p) => maybeUri.startsWith(p));
      if (prefix) {
        const path = join(uriRoots[prefix], maybeUri.slice(prefix.length));
        return readFile(path, "utf8");
      }

      // If it's an absolute path or looks like a file path, try to read it directly
      if (maybeUri.startsWith("/") || maybeUri.includes("/")) {
        try {
          return await readFile(maybeUri, "utf8");
        } catch (error) {
          // If file doesn't exist, return the original string
          return maybeUri;
        }
      }

      return maybeUri;
    },

    /** Extracts SPARQL query text from a query node in the graph. */
    async getQueryText(queryNode) {
      const inlineText = this.getOne(queryNode, GV + "text");
      if (inlineText) return asStr(inlineText);
      const path = this.getOne(queryNode, GV + "path");
      if (path) return this.resolveText(asStr(path));
      return "";
    },

    /** Extracts template text from a template node in the graph. */
    async getTemplateText(templateNode) {
      // This logic is identical to getQueryText, can be merged later if desired
      const inlineText = this.getOne(templateNode, GV + "text");
      if (inlineText) return asStr(inlineText);
      const path = this.getOne(templateNode, GV + "path");
      if (path) return this.resolveText(asStr(path));
      return "";
    },

    /** Gets the graph directory path. */
    getGraphDir() {
      return graphDir;
    },

    /** Gets the URI roots mapping. */
    getUriRoots() {
      return { ...uriRoots };
    },

    /** Checks if auto-loading is enabled. */
    isAutoLoadEnabled() {
      return config.graph.autoLoad;
    },

    /** Checks if validation on load is enabled. */
    isValidationEnabled() {
      return config.graph.validateOnLoad;
    },
  };
}
