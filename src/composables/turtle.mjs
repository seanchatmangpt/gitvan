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
import { createPersistenceHelper } from "../utils/persistence-helper.mjs";

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

  // Create persistence helper for this instance
  const persistence = createPersistenceHelper({
    logger: options.logger || console,
    atomicWrites: options.atomicWrites !== false,
    rdfEngine: options.rdfEngine,
  });

  // --- Internal loader ---
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
    } catch (error) {
      // If directory doesn't exist or can't be read, return empty store
      if (error.code === "ENOENT") {
        console.log(
          `Graph directory ${graphDir} doesn't exist yet, starting with empty store`
        );
        return { store: new N3.Store(), files: [] };
      }
      throw error;
    }
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

    // ============== Persistence Methods ==============

    /**
     * Save the current store to a Turtle file
     * @param {string} fileName - Name of the file to save (without .ttl extension)
     * @param {object} options - Save options
     * @returns {Promise<{path: string, bytes: number}>} Save result
     */
    async saveGraph(fileName, options = {}) {
      const { validate = true, createBackup = false, prefixes } = options;
      const filePath = join(graphDir, `${fileName}.ttl`);

      try {
        const turtleContent = await persistence.serializeStore(store, {
          prefixes,
        });
        const result = await persistence.writeTurtleFile(
          filePath,
          turtleContent,
          {
            validate,
            createBackup,
          }
        );

        console.log(
          `✅ Graph saved to: ${result.path} (${result.bytes} bytes)`
        );
        return result;
      } catch (error) {
        console.error(`❌ Failed to save graph to ${fileName}:`, error.message);
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
      const { validate = true, merge = true } = options;
      const filePath = join(graphDir, `${fileName}.ttl`);

      try {
        const turtleContent = await persistence.readTurtleFile(filePath, {
          validate,
        });
        if (!turtleContent) {
          throw new Error(`File not found: ${fileName}.ttl`);
        }

        const loadedStore = persistence.parseTurtle(turtleContent, {
          baseIRI: options.baseIRI || config.graph.baseIRI,
        });

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
        console.log(`✅ Graph loaded from: ${filePath} (${quads} quads)`);
        return { path: filePath, quads };
      } catch (error) {
        console.error(
          `❌ Failed to load graph from ${fileName}:`,
          error.message
        );
        throw error;
      }
    },

    /**
     * Save the current store to the default.ttl file
     * @param {object} options - Save options
     * @returns {Promise<{path: string, bytes: number}>} Save result
     */
    async saveDefaultGraph(options = {}) {
      const { validate = true, createBackup = true, prefixes } = options;

      try {
        const turtleContent = await persistence.serializeStore(store, {
          prefixes,
        });
        const result = await persistence.writeDefaultGraph(
          graphDir,
          turtleContent,
          {
            validate,
            createBackup,
          }
        );

        console.log(
          `✅ Default graph saved to: ${result.path} (${result.bytes} bytes)`
        );
        return result;
      } catch (error) {
        console.error(`❌ Failed to save default graph:`, error.message);
        throw error;
      }
    },

    /**
     * Load the default.ttl file into the current store
     * @param {object} options - Load options
     * @returns {Promise<{path: string, quads: number}|null>} Load result or null if not found
     */
    async loadDefaultGraph(options = {}) {
      const { validate = true, merge = true } = options;

      try {
        const turtleContent = await persistence.readDefaultGraph(graphDir, {
          validate,
        });
        if (!turtleContent) {
          console.log(`ℹ️  No default.ttl file found in ${graphDir}`);
          return null;
        }

        const loadedStore = persistence.parseTurtle(turtleContent, {
          baseIRI: options.baseIRI || config.graph.baseIRI,
        });

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
        const defaultPath = join(graphDir, "default.ttl");
        console.log(
          `✅ Default graph loaded from: ${defaultPath} (${quads} quads)`
        );
        return { path: defaultPath, quads };
      } catch (error) {
        console.error(`❌ Failed to load default graph:`, error.message);
        throw error;
      }
    },

    /**
     * Initialize default graph with template content if it doesn't exist
     * @param {object} options - Initialization options
     * @returns {Promise<{path: string, bytes: number, created: boolean}>} Initialization result
     */
    async initializeDefaultGraph(options = {}) {
      const { templatePath, validate = true } = options;

      try {
        // Check if default.ttl already exists
        const defaultPath = join(graphDir, "default.ttl");
        const exists = await persistence.fileExists(defaultPath);

        if (exists) {
          console.log(`ℹ️  Default graph already exists: ${defaultPath}`);
          const stats = await persistence.getFileStats(defaultPath);
          return { path: defaultPath, bytes: stats.size, created: false };
        }

        // Create default.ttl from template
        let templateContent;
        if (templatePath) {
          templateContent = await readFile(templatePath, "utf8");
        } else {
          // Use built-in default template
          templateContent = `# GitVan Default Graph
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix gv: <https://gitvan.dev/ontology#> .

<https://gitvan.dev/project/> a gv:Project ;
    dct:title "GitVan Project" ;
    dct:description "A GitVan-powered development automation project" ;
    dct:created "${new Date().toISOString()}"^^xsd:dateTime ;
    gv:version "1.0.0" ;
    gv:status gv:Active .

<https://gitvan.dev/graph/default/> a gv:Graph ;
    dct:title "Default Graph" ;
    dct:description "Default graph location for GitVan operations" ;
    gv:graphType gv:DefaultGraph ;
    gv:baseIRI "https://gitvan.dev/graph/default/" ;
    gv:persistenceEnabled true ;
    gv:autoSave true .`;
        }

        const result = await persistence.writeDefaultGraph(
          graphDir,
          templateContent,
          {
            validate,
          }
        );

        console.log(
          `✅ Default graph initialized: ${result.path} (${result.bytes} bytes)`
        );
        return { ...result, created: true };
      } catch (error) {
        console.error(`❌ Failed to initialize default graph:`, error.message);
        throw error;
      }
    },

    /**
     * Get list of available Turtle files in the graph directory
     * @returns {Promise<string[]>} Array of Turtle file names
     */
    async listGraphFiles() {
      try {
        const files = await persistence.listTurtleFiles(graphDir);
        console.log(`📁 Found ${files.length} Turtle files in ${graphDir}`);
        return files;
      } catch (error) {
        console.error(`❌ Failed to list graph files:`, error.message);
        throw error;
      }
    },

    /**
     * Get statistics about the current store
     * @returns {object} Store statistics
     */
    getStoreStats() {
      return persistence.rdfEngine.getStats(store);
    },

    /**
     * Get the persistence helper instance
     * @returns {PersistenceHelper} Persistence helper
     */
    getPersistenceHelper() {
      return persistence;
    },
  };
}
