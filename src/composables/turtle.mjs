/**
 * @fileoverview GitVan Turtle/RDF domain composable.
 *
 * @unrdf/core owns the store. This composable restores the GitVan domain
 * projection that was lost when the old unrdf wrapper was removed: bounded
 * Turtle-file ingestion plus hook/list/query/template helpers over that store.
 *
 * N3 is used only at the Turtle parsing boundary and quads immediately re-enter
 * the @unrdf/core store.
 */
import { readdir, readFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { createStore, addQuad, removeQuad } from "@unrdf/core";
import { tryUseGitVan } from "../core/context.mjs";
import { loadOptions } from "../config/loader.mjs";
import { createLogger } from "../utils/logger.mjs";

const logger = createLogger("composables:turtle");
const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const DCT = "http://purl.org/dc/terms/";
const GH = "https://gitvan.dev/graph-hook#";
const GV = "https://gitvan.dev/ontology#";
const OP = "https://gitvan.dev/op#";

const asStr = (term) => term?.value;

/**
 * Create a GitVan RDF store and load its admitted Turtle graph surface.
 * @param {Object} options
 * @param {string} [options.graphDir] explicit graph directory
 * @param {string} [options.cwd] explicit repository root
 * @param {Object} [options.uriRoots] URI-root overrides
 * @returns {Promise<Object>} GitVan Turtle domain interface
 */
export async function useTurtle(options = {}) {
  const ctx = tryUseGitVan?.() || null;
  const root = options.cwd || ctx?.cwd || process.cwd();
  const loadedConfig = await loadOptions({ rootDir: root });
  const graphDir = options.graphDir || join(root, loadedConfig.graph.dir);
  const uriRoots = {
    ...(loadedConfig.graph?.uriRoots || {}),
    ...(options.uriRoots || {}),
  };
  if (!uriRoots["graph://"]) uriRoots["graph://"] = `${graphDir}/`;

  const store = await createStore();
  const files = await loadTurtleDirectory(store, graphDir);

  const api = {
    store,
    files,
    config: {
      root,
      graphDir,
      uriRoots: { ...uriRoots },
      ...(loadedConfig.graph || {}),
    },

    findQuads(pattern = {}) {
      return store.getQuads(
        pattern.subject ?? null,
        pattern.predicate ?? null,
        pattern.object ?? null,
        pattern.graph ?? null
      );
    },

    addQuad(quad) {
      addQuad(store, quad);
    },

    removeQuad(quad) {
      removeQuad(store, quad);
    },

    getSubjectsByType(type) {
      return matchingQuads(store, null, RDF + "type", type).map((q) => q.subject);
    },

    hasType(subject, type) {
      return matchingQuads(store, subject, RDF + "type", type).length > 0;
    },

    // Historical public name retained for HookParser.
    isA(subject, type) {
      return this.hasType(subject, type);
    },

    getOne(subject, predicate) {
      return matchingQuads(store, subject, predicate, null)[0]?.object ?? null;
    },

    getAll(subject, predicate) {
      return matchingQuads(store, subject, predicate, null).map((q) => q.object);
    },

    readList(head) {
      return readRdfSequence(store, head);
    },

    /** Discover hook definitions from the graph; no separate registry owns them. */
    getHooks() {
      return this.getSubjectsByType(GH + "Hook").map((hookNode) => {
        const id = hookNode.value;
        const title =
          asStr(this.getOne(hookNode, DCT + "title")) ||
          asStr(this.getOne(hookNode, GV + "title")) ||
          id;
        const pred = this.getOne(hookNode, GH + "hasPredicate");
        const pipelineHead = this.getOne(hookNode, GH + "orderedPipelines");
        return {
          node: hookNode,
          id,
          title,
          pred,
          pipelines: readRdfSequence(store, pipelineHead),
        };
      });
    },

    getPipelineSteps(pipelineNode) {
      return readRdfSequence(store, this.getOne(pipelineNode, OP + "steps"));
    },

    async resolveText(maybeUri) {
      if (typeof maybeUri !== "string") return maybeUri;
      const prefix = Object.keys(uriRoots).find((candidate) =>
        maybeUri.startsWith(candidate)
      );
      if (prefix) {
        return readFile(join(uriRoots[prefix], maybeUri.slice(prefix.length)), "utf8");
      }
      if (isAbsolute(maybeUri)) return readFile(maybeUri, "utf8");
      return maybeUri;
    },

    async getQueryText(queryNode) {
      const inline = this.getOne(queryNode, GV + "text");
      if (inline) return asStr(inline);
      const path = this.getOne(queryNode, GV + "path");
      return path ? this.resolveText(asStr(path)) : "";
    },

    async getTemplateText(templateNode) {
      const inline = this.getOne(templateNode, GV + "text");
      if (inline) return asStr(inline);
      const path = this.getOne(templateNode, GV + "path");
      return path ? this.resolveText(asStr(path)) : "";
    },

    getGraphDir() {
      return graphDir;
    },

    getUriRoots() {
      return { ...uriRoots };
    },

    isAutoLoadEnabled() {
      return loadedConfig.graph?.autoLoad !== false;
    },

    isValidationEnabled() {
      return loadedConfig.graph?.validateOnLoad === true;
    },
  };

  return api;
}

async function loadTurtleDirectory(store, graphDir) {
  let names;
  try {
    names = (await readdir(graphDir)).filter((name) => name.endsWith(".ttl")).sort();
  } catch (error) {
    if (error?.code === "ENOENT") {
      logger.info(`Graph directory ${graphDir} does not exist; using an empty store`);
      return [];
    }
    throw error;
  }

  if (names.length === 0) return [];

  let Parser;
  try {
    ({ Parser } = await import("n3"));
  } catch (cause) {
    const error = new Error(
      "Turtle ingestion requires the declared n3 parser dependency"
    );
    error.code = "TURTLE_PARSER_UNAVAILABLE";
    error.cause = cause;
    throw error;
  }

  const files = [];
  for (const name of names) {
    const path = join(graphDir, name);
    const content = await readFile(path, "utf8");
    let quads;
    try {
      quads = new Parser({ baseIRI: `file://${path}` }).parse(content);
    } catch (cause) {
      const error = new Error(`Refused malformed Turtle graph: ${path}`);
      error.code = "TURTLE_PARSE_REFUSED";
      error.file = path;
      error.cause = cause;
      throw error;
    }
    for (const quad of quads) addQuad(store, quad);
    files.push({ name, path, content, quads: quads.length });
  }
  return files;
}

function matchingQuads(store, subject, predicate, object) {
  return store.getQuads(subject ?? null, null, null, null).filter((quad) => {
    if (predicate && quad.predicate?.value !== termValue(predicate)) return false;
    if (object && quad.object?.value !== termValue(object)) return false;
    return true;
  });
}

function termValue(value) {
  return typeof value === "string" ? value : value?.value;
}

/**
 * Read either an RDF Collection or the direct singleton resource accepted by
 * historical GitVan hook files. Cycles and malformed list cells are refused.
 */
function readRdfSequence(store, head) {
  if (!head || termValue(head) === RDF + "nil") return [];

  const first = matchingQuads(store, head, RDF + "first", null)[0]?.object;
  if (!first) return [head];

  const values = [];
  const visited = new Set();
  let current = head;
  while (current && termValue(current) !== RDF + "nil") {
    const key = `${current.termType || "term"}:${termValue(current)}`;
    if (visited.has(key)) {
      const error = new Error(`Refused cyclic RDF list at ${termValue(current)}`);
      error.code = "RDF_LIST_CYCLE_REFUSED";
      throw error;
    }
    visited.add(key);

    const value = matchingQuads(store, current, RDF + "first", null)[0]?.object;
    const rest = matchingQuads(store, current, RDF + "rest", null)[0]?.object;
    if (!value || !rest) {
      const error = new Error(`Refused malformed RDF list at ${termValue(current)}`);
      error.code = "RDF_LIST_MALFORMED_REFUSED";
      throw error;
    }
    values.push(value);
    current = rest;
  }
  return values;
}
