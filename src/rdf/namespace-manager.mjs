/**
 * GitVan Namespace Manager
 * Centralized management of RDF namespace prefixes and URIs
 * Provides validation, consistency checking, and load-time verification
 */

import { consola } from "consola";

/**
 * Standard RDF namespaces used throughout GitVan
 */
const STANDARD_NAMESPACES = {
  // W3C Core Standards
  rdf: {
    prefix: "rdf",
    uri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    category: "core",
    description: "RDF core vocabulary",
  },
  rdfs: {
    prefix: "rdfs",
    uri: "http://www.w3.org/2000/01/rdf-schema#",
    category: "core",
    description: "RDF Schema vocabulary",
  },
  owl: {
    prefix: "owl",
    uri: "http://www.w3.org/2002/07/owl#",
    category: "core",
    description: "OWL ontology vocabulary",
  },
  xsd: {
    prefix: "xsd",
    uri: "http://www.w3.org/2001/XMLSchema#",
    category: "core",
    description: "XML Schema datatypes",
  },
  sh: {
    prefix: "sh",
    uri: "http://www.w3.org/ns/shacl#",
    category: "core",
    description: "SHACL shapes vocabulary",
  },

  // W3C Semantic Standards
  prov: {
    prefix: "prov",
    uri: "http://www.w3.org/ns/prov#",
    category: "semantics",
    description: "PROV provenance vocabulary",
  },
  dct: {
    prefix: "dct",
    uri: "http://purl.org/dc/terms/",
    category: "semantics",
    description: "Dublin Core metadata terms",
  },
  foaf: {
    prefix: "foaf",
    uri: "http://xmlns.com/foaf/0.1/",
    category: "semantics",
    description: "Friend of a Friend vocabulary",
  },

  // GitVan Domain Ontologies
  gitvan: {
    prefix: "gitvan",
    uri: "https://gitvan.dev/ontology#",
    category: "domain",
    version: "4.0.0",
    description: "GitVan primary domain ontology",
  },
  gv: {
    prefix: "gv",
    uri: "https://gitvan.dev/ontology#",
    category: "domain",
    version: "4.0.0",
    description: "GitVan ontology alias",
    aliasFor: "gitvan",
  },
  gitv: {
    prefix: "gitv",
    uri: "https://gitvan.dev/ontology/git#",
    category: "domain",
    version: "3.2.0",
    description: "Git-specific ontology",
  },
  gh: {
    prefix: "gh",
    uri: "https://gitvan.dev/graph-hook#",
    category: "domain",
    version: "3.0.0",
    description: "Knowledge hook schema",
  },
  op: {
    prefix: "op",
    uri: "https://gitvan.dev/op#",
    category: "domain",
    description: "Operations ontology",
  },
  perf: {
    prefix: "perf",
    uri: "https://gitvan.dev/performance#",
    category: "domain",
    description: "Performance monitoring ontology",
  },
  queue: {
    prefix: "queue",
    uri: "https://gitvan.dev/queue#",
    category: "domain",
    description: "Job queue ontology",
  },
  pack: {
    prefix: "pack",
    uri: "https://gitvan.dev/pack#",
    category: "domain",
    description: "Pack registry ontology",
  },

  // Test/Example Namespace
  ex: {
    prefix: "ex",
    uri: "http://example.org/",
    category: "test",
    description: "Example namespace for testing",
    constraints: "Use only in test files, not production",
  },
  local: {
    prefix: "local",
    uri: "local:",
    category: "test",
    description: "Local namespace for development",
  },
};

/**
 * Namespace Manager Class
 * Centralized management of RDF prefixes and URIs
 */
export class NamespaceManager {
  constructor(options = {}) {
    this.logger = options.logger || consola;
    this.namespaces = new Map();
    this.uriToPrefix = new Map();
    this.customNamespaces = new Map();
    this.initialized = false;

    // Initialize with standard namespaces
    this.registerStandardNamespaces();
  }

  /**
   * Register all standard namespaces
   * @private
   */
  registerStandardNamespaces() {
    for (const [key, ns] of Object.entries(STANDARD_NAMESPACES)) {
      this.namespaces.set(ns.prefix, ns);
      this.uriToPrefix.set(ns.uri, ns.prefix);
    }
    this.initialized = true;
    this.logger.debug("Registered standard namespaces");
  }

  /**
   * Register a custom namespace
   * @param {string} prefix - Namespace prefix
   * @param {string} uri - Namespace URI
   * @param {object} metadata - Additional metadata
   * @returns {object} Registered namespace
   */
  registerNamespace(prefix, uri, metadata = {}) {
    if (this.namespaces.has(prefix)) {
      const existing = this.namespaces.get(prefix);
      if (existing.uri !== uri) {
        throw new Error(
          `Prefix '${prefix}' already registered with URI '${existing.uri}', cannot use URI '${uri}'`
        );
      }
      return existing;
    }

    const ns = {
      prefix,
      uri,
      category: "custom",
      ...metadata,
    };

    this.namespaces.set(prefix, ns);
    this.uriToPrefix.set(uri, prefix);

    this.logger.debug(`Registered custom namespace: ${prefix} -> ${uri}`);
    return ns;
  }

  /**
   * Get namespace by prefix
   * @param {string} prefix - Namespace prefix
   * @returns {object|null} Namespace object or null
   */
  getNamespace(prefix) {
    return this.namespaces.get(prefix) || null;
  }

  /**
   * Get prefix by URI
   * @param {string} uri - Namespace URI
   * @returns {string|null} Prefix or null
   */
  getPrefixByUri(uri) {
    return this.uriToPrefix.get(uri) || null;
  }

  /**
   * Check if prefix is registered
   * @param {string} prefix - Namespace prefix
   * @returns {boolean}
   */
  hasPrefix(prefix) {
    return this.namespaces.has(prefix);
  }

  /**
   * Check if URI is registered
   * @param {string} uri - Namespace URI
   * @returns {boolean}
   */
  hasUri(uri) {
    return this.uriToPrefix.has(uri);
  }

  /**
   * Get all registered namespaces
   * @param {string} category - Optional filter by category
   * @returns {Map} Namespaces map
   */
  getAll(category = null) {
    if (!category) {
      return new Map(this.namespaces);
    }

    const filtered = new Map();
    for (const [prefix, ns] of this.namespaces) {
      if (ns.category === category) {
        filtered.set(prefix, ns);
      }
    }
    return filtered;
  }

  /**
   * Generate @prefix declarations for Turtle
   * @param {string[]} prefixes - Optional array of prefixes to include
   * @returns {string} Turtle prefix declarations
   */
  generatePrefixDeclarations(prefixes = null) {
    const namespacesToUse = prefixes
      ? prefixes
          .map((p) => this.namespaces.get(p))
          .filter((ns) => ns !== undefined)
      : Array.from(this.namespaces.values());

    return namespacesToUse
      .map((ns) => `@prefix ${ns.prefix}: <${ns.uri}> .`)
      .join("\n");
  }

  /**
   * Validate prefix declarations in Turtle content
   * @param {string} turtleContent - Turtle content to validate
   * @returns {object} Validation result with issues array
   */
  validatePrefixDeclarations(turtleContent) {
    const prefixRegex = /@prefix\s+(\w+):\s+<([^>]+)>\s*\./g;
    const issues = [];
    let match;

    while ((match = prefixRegex.exec(turtleContent)) !== null) {
      const [, prefix, uri] = match;
      const registered = this.getNamespace(prefix);

      if (registered && registered.uri !== uri) {
        issues.push({
          type: "mismatch",
          prefix,
          declared: uri,
          expected: registered.uri,
          line: turtleContent.substring(0, match.index).split("\n").length,
          severity: "warning",
          message: `Prefix '${prefix}' declared with URI '${uri}', expected '${registered.uri}'`,
        });
      }

      if (!registered && prefix !== "a") {
        // "a" is reserved RDF shorthand
        issues.push({
          type: "unknown",
          prefix,
          uri,
          line: turtleContent.substring(0, match.index).split("\n").length,
          severity: "info",
          message: `Prefix '${prefix}' not in standard registry (URI: ${uri})`,
        });
      }
    }

    return {
      valid: issues.filter((i) => i.severity === "warning").length === 0,
      issues,
      summary: {
        mismatches: issues.filter((i) => i.type === "mismatch").length,
        unknown: issues.filter((i) => i.type === "unknown").length,
        total: issues.length,
      },
    };
  }

  /**
   * Extract prefixes used in Turtle content
   * @param {string} turtleContent - Turtle content to analyze
   * @returns {Set} Set of prefixes used
   */
  extractPrefixesUsed(turtleContent) {
    const used = new Set();

    // Find prefix declarations
    const declareRegex = /@prefix\s+(\w+):/g;
    let match;

    while ((match = declareRegex.exec(turtleContent)) !== null) {
      used.add(match[1]);
    }

    // Find prefix usage (prefix:localname)
    const usageRegex = /\b(\w+):[\w.-]+/g;
    while ((match = usageRegex.exec(turtleContent)) !== null) {
      const prefix = match[1];
      // Exclude common keywords
      if (!["a", "is", "rdf", "rdfs"].includes(prefix) || prefix.length > 1) {
        used.add(prefix);
      }
    }

    return used;
  }

  /**
   * Check consistency of namespace usage across multiple files
   * @param {Map} filesPrefixes - Map of filename -> Set of prefixes
   * @returns {object} Consistency report
   */
  checkConsistency(filesPrefixes) {
    const report = {
      totalFiles: filesPrefixes.size,
      prefixUsage: new Map(),
      inconsistencies: [],
      stats: {},
    };

    // Analyze prefix usage across files
    for (const [filename, prefixes] of filesPrefixes) {
      for (const prefix of prefixes) {
        if (!report.prefixUsage.has(prefix)) {
          report.prefixUsage.set(prefix, {
            prefix,
            files: [],
            count: 0,
          });
        }

        const usage = report.prefixUsage.get(prefix);
        usage.files.push(filename);
        usage.count++;
      }
    }

    // Calculate statistics
    report.stats.totalPrefixes = report.prefixUsage.size;
    report.stats.avgPrefixesPerFile =
      report.totalFiles > 0
        ? Array.from(filesPrefixes.values()).reduce(
            (sum, p) => sum + p.size,
            0
          ) / report.totalFiles
        : 0;

    // Find unused standard prefixes
    const usedPrefixes = new Set(report.prefixUsage.keys());
    report.stats.standardPrefixesUsed = Array.from(
      STANDARD_NAMESPACES.keys()
    ).filter((p) => usedPrefixes.has(p)).length;
    report.stats.standardPrefixesTotal = Object.keys(STANDARD_NAMESPACES).length;

    return report;
  }

  /**
   * Get namespace statistics
   * @returns {object} Namespace statistics
   */
  getStatistics() {
    const categories = {};

    for (const ns of this.namespaces.values()) {
      if (!categories[ns.category]) {
        categories[ns.category] = 0;
      }
      categories[ns.category]++;
    }

    return {
      totalNamespaces: this.namespaces.size,
      byCategory: categories,
      standardNamespaces: Object.keys(STANDARD_NAMESPACES).length,
      customNamespaces: this.namespaces.size - Object.keys(STANDARD_NAMESPACES).length,
    };
  }

  /**
   * Export namespaces as JSON
   * @param {string} category - Optional filter by category
   * @returns {object} JSON representation
   */
  toJSON(category = null) {
    const namespaces = {};

    for (const [prefix, ns] of this.getAll(category)) {
      namespaces[prefix] = {
        uri: ns.uri,
        category: ns.category,
        description: ns.description,
        ...(ns.version && { version: ns.version }),
        ...(ns.constraints && { constraints: ns.constraints }),
      };
    }

    return {
      namespaces,
      statistics: this.getStatistics(),
      initialized: this.initialized,
    };
  }
}

/**
 * Global namespace manager instance
 */
export const namespaceManager = new NamespaceManager();

/**
 * Create a namespace manager instance
 * @param {object} options - Manager options
 * @returns {NamespaceManager}
 */
export function createNamespaceManager(options = {}) {
  return new NamespaceManager(options);
}
