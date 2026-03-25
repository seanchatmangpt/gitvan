/**
 * GitVan Knowledge Hook Registry
 *
 * Central registry for all Knowledge Hooks in the GitVan system.
 * Provides discovery, registration, and management of Knowledge Hooks
 * across different categories and domains.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { HookOrchestrator } from "./HookOrchestrator.mjs";

/**
 * Knowledge Hook Registry
 *
 * Manages all Knowledge Hooks in the GitVan system:
 * - Discovers Knowledge Hook files (.ttl)
 * - Registers hooks by category and domain
 * - Provides centralized access to HookOrchestrator
 * - Manages hook lifecycle and evaluation
 */
/**
 * @deprecated v4.0.0
 * 
 * DEPRECATION NOTICE: KnowledgeHookRegistry will be replaced in v5.0.0
 * with @unrdf/hooks integration and RDF-backed git-native storage.
 * 
 * Current status: Uses in-memory Map registry with no audit trail.
 * Planned replacement: SPARQL queries over git-native RDF storage.
 * 
 * For migration details, see: docs/HOOKS_MIGRATION_STRATEGY.md
 * 
 * Migration timeline:
 * - v4.1: Hook system refactored to use @unrdf/hooks foundations
 * - v4.2: SPARQL queries replace Map-based lookups  
 * - v5.0: Full replacement with git-native RDF storage
 */
export class KnowledgeHookRegistry {
  constructor(options = {}) {
    this.hooksDir = options.hooksDir || "./hooks";
    this.logger = options.logger || console;
    this.orchestrator = options.orchestrator || null; // Accept orchestrator from options
    this.hooks = new Map();
    this.categories = new Map();
    this.domains = new Map();
    
    // Don't auto-initialize - let the caller control when to initialize
  }

  /**
   * Initialize the Knowledge Hook registry
   */
  async initialize() {
    this.logger.info("🧠 Initializing Knowledge Hook Registry...");

    // Use provided orchestrator or create a new one
    if (!this.orchestrator) {
      this.orchestrator = new HookOrchestrator({
        graphDir: this.hooksDir,
        logger: this.logger,
      });
    }

    // Discover and register all Knowledge Hooks
    await this.discoverKnowledgeHooks();

    this.logger.info(
      `✅ Knowledge Hook Registry initialized with ${this.hooks.size} hooks`
    );
  }

  /**
   * Discover all Knowledge Hook files in the hooks directory
   */
  async discoverKnowledgeHooks() {
    this.logger.info(`🔍 Discovering Knowledge Hooks in ${this.hooksDir}...`);

    if (!existsSync(this.hooksDir)) {
      this.logger.warn(`⚠️ Hooks directory not found: ${this.hooksDir}`);
      return;
    }

    const hookFiles = this.findHookFiles(this.hooksDir);
    this.logger.info(`📁 Found ${hookFiles.length} Knowledge Hook files`);

    for (const file of hookFiles) {
      try {
        await this.registerHookFile(file);
      } catch (error) {
        this.logger.error(
          `❌ Failed to register hook file ${file}:`,
          error.message
        );
      }
    }
  }

  /**
   * Find all .ttl files in the hooks directory
   */
  findHookFiles(dir) {
    const files = [];

    const scanDirectory = (currentDir) => {
      if (!existsSync(currentDir)) return;

      const entries = readdirSync(currentDir);

      for (const entry of entries) {
        const fullPath = join(currentDir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (extname(entry) === ".ttl") {
          files.push(fullPath);
        }
      }
    };

    scanDirectory(dir);
    return files;
  }

  /**
   * Register a Knowledge Hook file
   */
  async registerHookFile(filePath) {
    try {
      const content = readFileSync(filePath, "utf8");
      const hookInfo = this.parseHookFile(filePath, content);

      if (hookInfo) {
        this.hooks.set(hookInfo.id, hookInfo);
        this.categorizeHook(hookInfo);
        this.logger.info(`✅ Registered Knowledge Hook: ${hookInfo.id}`);
      }
    } catch (error) {
      this.logger.error(
        `❌ Failed to parse hook file ${filePath}:`,
        error.message
      );
    }
  }

  /**
   * Parse a Knowledge Hook file to extract metadata
   */
  parseHookFile(filePath, content) {
    // Extract hook ID from file path
    const relativePath = filePath.replace(this.hooksDir + "/", "");
    const hookId = relativePath.replace(".ttl", "").replace(/\//g, ":");

    // Extract basic metadata from Turtle content
    const metadata = this.extractMetadata(content);

    return {
      id: hookId,
      filePath: filePath,
      relativePath: relativePath,
      content: content,
      metadata: metadata,
      category: this.determineCategory(relativePath),
      domain: this.determineDomain(relativePath),
    };
  }

  /**
   * Extract metadata from Turtle content
   */
  extractMetadata(content) {
    const metadata = {};

    // Extract title
    const titleMatch = content.match(/gv:title\s+"([^"]+)"/);
    if (titleMatch) {
      metadata.title = titleMatch[1];
    }

    // Extract description
    const descMatch = content.match(/gh:description\s+"([^"]+)"/);
    if (descMatch) {
      metadata.description = descMatch[1];
    }

    // Extract predicate type
    const predicateMatch = content.match(/rdf:type\s+gh:(\w+Predicate)/);
    if (predicateMatch) {
      metadata.predicateType = predicateMatch[1];
    }

    return metadata;
  }

  /**
   * Determine hook category from file path
   */
  determineCategory(relativePath) {
    if (relativePath.includes("developer-workflow"))
      return "developer-workflow";
    if (relativePath.includes("jtbd-hooks")) return "jtbd";
    if (relativePath.includes("knowledge-hooks-suite")) return "git-lifecycle";
    if (relativePath.includes("scrum-at-scale")) return "scrum-at-scale";
    return "general";
  }

  /**
   * Determine hook domain from file path
   */
  determineDomain(relativePath) {
    if (relativePath.includes("core-development-lifecycle"))
      return "core-development";
    if (relativePath.includes("security-compliance")) return "security";
    if (relativePath.includes("infrastructure-devops")) return "infrastructure";
    if (relativePath.includes("start-of-day")) return "developer-workflow";
    if (relativePath.includes("end-of-day")) return "developer-workflow";
    if (relativePath.includes("file-saving")) return "developer-workflow";
    if (relativePath.includes("definition-of-done"))
      return "developer-workflow";
    return "general";
  }

  /**
   * Categorize a hook for easy lookup
   */
  categorizeHook(hookInfo) {
    // Add to category map
    if (!this.categories.has(hookInfo.category)) {
      this.categories.set(hookInfo.category, []);
    }
    this.categories.get(hookInfo.category).push(hookInfo);

    // Add to domain map
    if (!this.domains.has(hookInfo.domain)) {
      this.domains.set(hookInfo.domain, []);
    }
    this.domains.get(hookInfo.domain).push(hookInfo);
  }

  /**
   * Get all registered hooks
   */
  getAllHooks() {
    return Array.from(this.hooks.values());
  }

  /**
   * Get hooks by category
   */
  getHooksByCategory(category) {
    return this.categories.get(category) || [];
  }

  /**
   * Get hooks by domain
   */
  getHooksByDomain(domain) {
    return this.domains.get(domain) || [];
  }

  /**
   * Get a specific hook by ID
   */
  getHook(hookId) {
    return this.hooks.get(hookId);
  }

  /**
   * Evaluate all Knowledge Hooks
   */
  async evaluateAll(options = {}) {
    if (!this.orchestrator) {
      throw new Error("Knowledge Hook Registry not initialized");
    }

    return await this.orchestrator.evaluate(options);
  }

  /**
   * Evaluate hooks by category
   */
  async evaluateByCategory(category, options = {}) {
    const categoryHooks = this.getHooksByCategory(category);
    if (categoryHooks.length === 0) {
      this.logger.warn(`⚠️ No hooks found for category: ${category}`);
      return { hooksEvaluated: 0, hooksTriggered: 0, workflowsExecuted: 0 };
    }

    // Filter orchestrator to only evaluate hooks in this category
    const filteredOptions = {
      ...options,
      hookFilter: (hook) => categoryHooks.some((ch) => ch.id === hook.id),
    };

    return await this.orchestrator.evaluate(filteredOptions);
  }

  /**
   * Evaluate hooks by domain
   */
  async evaluateByDomain(domain, options = {}) {
    const domainHooks = this.getHooksByDomain(domain);
    if (domainHooks.length === 0) {
      this.logger.warn(`⚠️ No hooks found for domain: ${domain}`);
      return { hooksEvaluated: 0, hooksTriggered: 0, workflowsExecuted: 0 };
    }

    // Filter orchestrator to only evaluate hooks in this domain
    const filteredOptions = {
      ...options,
      hookFilter: (hook) => domainHooks.some((dh) => dh.id === hook.id),
    };

    return await this.orchestrator.evaluate(filteredOptions);
  }

  /**
   * Get registry statistics
   */
  getStats() {
    return {
      totalHooks: this.hooks.size,
      categories: Object.fromEntries(
        Array.from(this.categories.entries()).map(([cat, hooks]) => [
          cat,
          hooks.length,
        ])
      ),
      domains: Object.fromEntries(
        Array.from(this.domains.entries()).map(([domain, hooks]) => [
          domain,
          hooks.length,
        ])
      ),
      predicateTypes: this.getPredicateTypeStats(),
    };
  }

  /**
   * Get predicate type statistics
   */
  getPredicateTypeStats() {
    const stats = {};
    for (const hook of this.hooks.values()) {
      const type = hook.metadata.predicateType || "unknown";
      stats[type] = (stats[type] || 0) + 1;
    }
    return stats;
  }

  /**
   * List all available categories
   */
  getCategories() {
    return Array.from(this.categories.keys());
  }

  /**
   * List all available domains
   */
  getDomains() {
    return Array.from(this.domains.keys());
  }

  /**
   * Refresh the registry (re-discover hooks)
   */
  async refresh() {
    this.logger.info("🔄 Refreshing Knowledge Hook Registry...");

    // Clear existing data
    this.hooks.clear();
    this.categories.clear();
    this.domains.clear();

    // Re-discover hooks
    await this.discoverKnowledgeHooks();

    this.logger.info(`✅ Registry refreshed with ${this.hooks.size} hooks`);
  }
}

/**
 * Create a Knowledge Hook Registry instance
 */
export function createKnowledgeHookRegistry(options = {}) {
  return new KnowledgeHookRegistry(options);
}

/**
 * Default Knowledge Hook Registry instance
 */
export const knowledgeHookRegistry = createKnowledgeHookRegistry();

export default knowledgeHookRegistry;
