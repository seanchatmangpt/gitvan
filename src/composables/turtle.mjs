/**
 * @fileoverview GitVan v3 — Turtle/RDF Composable
 *
 * This module provides Turtle/RDF file loading, parsing, and querying capabilities
 * within the GitVan context. It handles loading .ttl files from directories,
 * parsing them into stores, and providing methods to query and extract
 * knowledge hooks and RDF data.
 *
 * @version 3.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createKnowledgeSubstrateCore, parseTurtle, toTurtle, getStoreStats } from "unrdf";
import { useGitVan, tryUseGitVan } from "../core/context.mjs";
import { loadOptions } from "../config/loader.mjs";
import { createLogger } from "../utils/logger.mjs";
const logger = createLogger("composables:turtle");

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
 * This function loads all .ttl files from a directory, parses them into a store,
 * and provides methods to query the RDF data and extract knowledge hooks.
 *
 * @async
 * @function useTurtle
 * @param {Object} [options={}] - Turtle options
 * @param {string} [options.graphDir] - Directory containing Turtle files
 * @returns {Promise<Object>} Turtle operations interface
 */
export async function useTurtle(options = {}) {
  const { root, graphDir, uriRoots, config } = await bindContext(options);

  // --- Internal loader using KnowledgeSubstrateCore ---
  const load = async () => {
    try {
      const fileNames = (await readdir(graphDir)).filter((f) =>
        f.endsWith(".ttl")
      );
      const files = await Promise.all(
        fileNames.map(async (name) => ({
          name,
          content: await readFile(join(graphDir, name), "utf8"),
        }))
      );

      // Create KnowledgeSubstrateCore - handles store, transactions, hooks, observability
      const core = await createKnowledgeSubstrateCore({
        enableObservability: true,
        enableKnowledgeHookManager: true,
        enableTransactionManager: true,
      });

      // Load turtle files into the core's internal store
      for (const file of files) {
        try {
          const fileStore = parseTurtle(file.content);
          for (const quad of fileStore) {
            core.store.add(quad);
          }
        } catch (error) {
          // Skip malformed turtle files gracefully
          logger.warn(
            `Warning: Failed to parse turtle file ${file.name}: ${error.message}`
          );
        }
      }
      return { core, store: core.store, files };
    } catch (error) {
      // If directory doesn't exist or can't be read, return empty core
      if (error.code === "ENOENT") {
        logger.info(
          `Graph directory ${graphDir} doesn't exist yet, starting with empty store`
        );
        const core = await createKnowledgeSubstrateCore({
          enableObservability: true,
          enableKnowledgeHookManager: true,
          enableTransactionManager: true,
        });
        return { core, store: core.store, files: [] };
      }
      throw error;
    }
  };

  const { core, store, files } = await load();

  // --- Public API ---
  return {
    /** The KnowledgeSubstrateCore instance (provides OTEL, transactions, hooks). */
    core,
    /** The Store instance (for backward compatibility). */
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

    // ============== Persistence Methods ==============

    /**
     * Save the current store to a Turtle file
     * @param {string} fileName - Name of the file to save (without .ttl extension)
     * @param {object} options - Save options
     * @returns {Promise<{path: string, bytes: number}>} Save result
     */
    async saveGraph(fileName, options = {}) {
      const { promises: fs } = await import("node:fs");
      const { prefixes } = options;
      const filePath = join(graphDir, `${fileName}.ttl`);

      try {
        const turtleContent = await toTurtle(store, { prefixes });
        await fs.mkdir(graphDir, { recursive: true });
        await fs.writeFile(filePath, turtleContent, "utf8");
        const stats = await fs.stat(filePath);

        logger.info(
          `Graph saved to: ${filePath} (${stats.size} bytes)`
        );
        return { path: filePath, bytes: stats.size };
      } catch (error) {
        logger.error(`Failed to save graph to ${fileName}:`, error.message);
        throw error;
      }
    },

    /**
     * Load a Turtle file into the current store
     * @param {string} fileName - Name of the file to load (without .ttl extension)
     * @param {object} options - Load options
     * @returns {Promise<{path: string, quads: number}>} Load result
     */
    async loadGraph(fileName, options = {}) {
      const { merge = true } = options;
      const filePath = join(graphDir, `${fileName}.ttl`);

      try {
        const turtleContent = await readFile(filePath, "utf8");
        const loadedStore = parseTurtle(turtleContent);

        if (merge) {
          // Merge with existing store
          for (const quad of loadedStore) {
            store.add(quad);
          }
        } else {
          // Replace existing store
          store.removeQuads([...store]);
          for (const quad of loadedStore) {
            store.add(quad);
          }
        }

        const quads = store.size;
        logger.info(`Graph loaded from: ${filePath} (${quads} quads)`);
        return { path: filePath, quads };
      } catch (error) {
        logger.error(
          `Failed to load graph from ${fileName}:`,
          error.message
        );
        throw error;
      }
    },

    /**
     * Get list of available Turtle files in the graph directory
     * @returns {Promise<string[]>} Array of Turtle file names
     */
    async listGraphFiles() {
      try {
        const allFiles = await readdir(graphDir);
        const turtleFiles = allFiles.filter((file) => file.endsWith(".ttl"));
        logger.info(`Found ${turtleFiles.length} Turtle files in ${graphDir}`);
        return turtleFiles;
      } catch (error) {
        logger.error(`Failed to list graph files:`, error.message);
        throw error;
      }
    },

    /**
     * Get statistics about the current store
     * @returns {object} Store statistics
     */
    getStoreStats() {
      return getStoreStats(store);
    },
  };
}
