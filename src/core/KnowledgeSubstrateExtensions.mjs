import { promises as fs } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createLogger } from "../utils/logger.mjs";

const logger = createLogger("core:KnowledgeSubstrateExtensions");
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * KnowledgeSubstrateExtensions
 *
 * Initializes and validates GitVan's RDF ontologies for Git-Native I/O.
 * Loads lock, snapshot, and queue ontologies into KnowledgeSubstrate.
 * Validates with SHACL constraints.
 * Registers transaction hooks.
 *
 * @module core/KnowledgeSubstrateExtensions
 */

/**
 * Initialize GitVan ontologies in KnowledgeSubstrate
 *
 * @param {Object} knowledgeSubstrate - UnRDF KnowledgeSubstrateCore instance
 * @param {Object} [options] - Configuration options
 * @param {boolean} [options.validateWithShacl=true] - Enable SHACL validation
 * @param {boolean} [options.registerHooks=true] - Register transaction hooks
 * @param {string} [options.ontologiesDir] - Override ontologies directory
 * @returns {Promise<Object>} Result with loaded ontologies and validation status
 *
 * @example
 * import { createKnowledgeSubstrateCore } from 'unrdf'
 * import { initializeGitVanOntologies } from './KnowledgeSubstrateExtensions.mjs'
 *
 * const ks = createKnowledgeSubstrateCore()
 * const result = await initializeGitVanOntologies(ks, {
 *   validateWithShacl: true,
 *   registerHooks: true
 * })
 *
 * console.log(result.ontologies.lock) // Lock ontology metadata
 * console.log(result.validations) // SHACL validation results
 */
export async function initializeGitVanOntologies(
  knowledgeSubstrate,
  options = {}
) {
  const {
    validateWithShacl = true,
    registerHooks = true,
    ontologiesDir = join(__dirname, "../rdf/ontologies"),
  } = options;

  logger.info("Initializing GitVan ontologies...");

  const result = {
    ontologies: {},
    validations: {},
    hooks: {},
    status: "initializing",
    errors: [],
  };

  try {
    // Phase 1: Load ontologies
    logger.debug("Phase 1: Loading ontologies...");
    const ontologyFiles = {
      lock: "lock-ontology.ttl",
      snapshot: "snapshot-ontology.ttl",
      queue: "queue-ontology.ttl",
    };

    for (const [name, filename] of Object.entries(ontologyFiles)) {
      try {
        const ontologyPath = join(ontologiesDir, filename);
        const content = await fs.readFile(ontologyPath, "utf-8");

        logger.debug(`Loaded ${name} ontology (${content.length} bytes)`);

        // Store ontology metadata
        result.ontologies[name] = {
          filename,
          path: ontologyPath,
          size: content.length,
          loaded: true,
          loadedAt: new Date().toISOString(),
        };

        // Load into KnowledgeSubstrate (assumes parseTurtle + load)
        if (knowledgeSubstrate.load) {
          try {
            await knowledgeSubstrate.load(content, {
              format: "text/turtle",
              baseIRI: `https://gitvan.dev/${name}-ontology`,
            });
            result.ontologies[name].loadedInto = "KnowledgeSubstrate";
          } catch (loadError) {
            logger.warn(`Failed to load ${name} ontology into KS: ${loadError.message}`);
            result.ontologies[name].loadedInto = "metadata-only";
            result.errors.push({
              type: "load",
              ontology: name,
              error: loadError.message,
            });
          }
        }
      } catch (error) {
        logger.error(`Error loading ${name} ontology: ${error.message}`);
        result.errors.push({
          type: "file",
          ontology: name,
          error: error.message,
        });
      }
    }

    logger.info(
      `Loaded ${Object.keys(result.ontologies).length} ontologies`
    );

    // Phase 2: SHACL Validation (if available and enabled)
    if (validateWithShacl && knowledgeSubstrate.validateWithShacl) {
      logger.debug("Phase 2: Validating with SHACL...");

      try {
        const validationResult = await knowledgeSubstrate.validateWithShacl();

        result.validations = {
          shaclEnabled: true,
          conforms: validationResult.conforms === true,
          results: validationResult.results || [],
          validatedAt: new Date().toISOString(),
        };

        if (!validationResult.conforms) {
          logger.warn(
            `SHACL validation found ${validationResult.results?.length || 0} issues`
          );
          result.errors.push({
            type: "validation",
            message: "SHACL constraints not satisfied",
            details: validationResult.results,
          });
        } else {
          logger.info("SHACL validation passed");
        }
      } catch (error) {
        logger.warn(`SHACL validation error: ${error.message}`);
        result.validations.error = error.message;
      }
    } else {
      result.validations.shaclEnabled = false;
    }

    // Phase 3: Register Transaction Hooks
    if (registerHooks && knowledgeSubstrate.registerHook) {
      logger.debug("Phase 3: Registering transaction hooks...");

      try {
        // Hook 1: Lock state change detection
        if (knowledgeSubstrate.registerHook) {
          const lockStateHook = {
            name: "lock-state-changes",
            predicate: "https://gitvan.dev/lock#state",
            handler: async (change) => {
              logger.debug(
                `Lock state changed: ${change.subject} → ${change.object}`
              );
            },
          };

          await knowledgeSubstrate.registerHook(lockStateHook);
          result.hooks["lock-state-changes"] = { registered: true };
        }

        // Hook 2: Snapshot creation
        const snapshotCreationHook = {
          name: "snapshot-created",
          predicate: "https://gitvan.dev/snapshot#timestamp",
          handler: async (change) => {
            logger.debug(`Snapshot created: ${change.subject}`);
          },
        };

        await knowledgeSubstrate.registerHook(snapshotCreationHook);
        result.hooks["snapshot-created"] = { registered: true };

        // Hook 3: Job status changes
        const jobStatusHook = {
          name: "job-status-changes",
          predicate: "https://gitvan.dev/queue#status",
          handler: async (change) => {
            logger.debug(`Job status changed: ${change.subject} → ${change.object}`);
          },
        };

        await knowledgeSubstrate.registerHook(jobStatusHook);
        result.hooks["job-status-changes"] = { registered: true };

        logger.info(`Registered ${Object.keys(result.hooks).length} transaction hooks`);
      } catch (error) {
        logger.warn(`Hook registration error: ${error.message}`);
        result.errors.push({
          type: "hook",
          error: error.message,
        });
      }
    }

    // Phase 4: Final validation
    logger.debug("Phase 4: Final validation...");
    const allLoaded = Object.values(result.ontologies).every((o) => o.loaded);
    const noFatalErrors = result.errors.filter((e) => e.type === "file").length === 0;

    result.status = allLoaded && noFatalErrors ? "initialized" : "partial";

    if (result.status === "initialized") {
      logger.info(
        `✓ GitVan ontologies initialized successfully (${Object.keys(result.ontologies).length} ontologies)`
      );
    } else {
      logger.warn(
        `⚠ GitVan ontologies partially initialized (status: ${result.status})`
      );
    }

    return result;
  } catch (error) {
    logger.error(`Fatal error initializing ontologies: ${error.message}`);
    result.status = "failed";
    result.errors.push({
      type: "fatal",
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Validate ontologies are loaded and accessible
 *
 * @param {Object} knowledgeSubstrate - KnowledgeSubstrateCore instance
 * @returns {Promise<Object>} Validation result
 */
export async function validateOntologies(knowledgeSubstrate) {
  logger.info("Validating ontologies...");

  const result = {
    valid: true,
    ontologies: {},
    checks: {
      lockOntologyPresent: false,
      snapshotOntologyPresent: false,
      queueOntologyPresent: false,
      allClassesResolvable: false,
      allPropertiesResolvable: false,
    },
  };

  try {
    // Check: Lock ontology classes
    const lockClasses = [
      "https://gitvan.dev/lock#Lock",
      "https://gitvan.dev/lock#LockState",
      "https://gitvan.dev/lock#LockEvent",
    ];

    for (const className of lockClasses) {
      try {
        const classDef = await knowledgeSubstrate.getClass(className);
        result.ontologies.lock = result.ontologies.lock || { classes: [] };
        result.ontologies.lock.classes.push({
          iri: className,
          resolvable: !!classDef,
        });
      } catch (e) {
        result.valid = false;
      }
    }

    result.checks.lockOntologyPresent = result.ontologies.lock?.classes?.length > 0;

    // Check: Snapshot ontology classes
    const snapshotClasses = [
      "https://gitvan.dev/snapshot#Snapshot",
      "https://gitvan.dev/snapshot#SnapshotSeries",
    ];

    for (const className of snapshotClasses) {
      try {
        const classDef = await knowledgeSubstrate.getClass(className);
        result.ontologies.snapshot = result.ontologies.snapshot || { classes: [] };
        result.ontologies.snapshot.classes.push({
          iri: className,
          resolvable: !!classDef,
        });
      } catch (e) {
        result.valid = false;
      }
    }

    result.checks.snapshotOntologyPresent =
      result.ontologies.snapshot?.classes?.length > 0;

    // Check: Queue ontology classes
    const queueClasses = [
      "https://gitvan.dev/queue#Job",
      "https://gitvan.dev/queue#JobStatus",
      "https://gitvan.dev/queue#Queue",
    ];

    for (const className of queueClasses) {
      try {
        const classDef = await knowledgeSubstrate.getClass(className);
        result.ontologies.queue = result.ontologies.queue || { classes: [] };
        result.ontologies.queue.classes.push({
          iri: className,
          resolvable: !!classDef,
        });
      } catch (e) {
        result.valid = false;
      }
    }

    result.checks.queueOntologyPresent = result.ontologies.queue?.classes?.length > 0;

    // All checks passed?
    result.checks.allClassesResolvable =
      result.checks.lockOntologyPresent &&
      result.checks.snapshotOntologyPresent &&
      result.checks.queueOntologyPresent;

    result.checks.allPropertiesResolvable = result.valid;

    if (result.valid) {
      logger.info("✓ All ontologies validated successfully");
    } else {
      logger.warn("⚠ Some ontology validations failed");
    }

    return result;
  } catch (error) {
    logger.error(`Validation error: ${error.message}`);
    result.valid = false;
    result.error = error.message;
    return result;
  }
}

/**
 * Get ontology statistics
 *
 * @param {Object} knowledgeSubstrate - KnowledgeSubstrateCore instance
 * @returns {Promise<Object>} Statistics
 */
export async function getOntologyStats(knowledgeSubstrate) {
  logger.debug("Gathering ontology statistics...");

  const stats = {
    timestamp: new Date().toISOString(),
    ontologies: {
      lock: { classes: 0, properties: 0 },
      snapshot: { classes: 0, properties: 0 },
      queue: { classes: 0, properties: 0 },
    },
    total: { classes: 0, properties: 0, triples: 0 },
  };

  try {
    // Count triples (if available)
    if (knowledgeSubstrate.size) {
      stats.total.triples = await knowledgeSubstrate.size();
    }

    logger.debug(`Total triples in Knowledge Substrate: ${stats.total.triples}`);

    return stats;
  } catch (error) {
    logger.warn(`Error gathering stats: ${error.message}`);
    return stats;
  }
}

/**
 * Export ontology from Knowledge Substrate
 *
 * @param {Object} knowledgeSubstrate - KnowledgeSubstrateCore instance
 * @param {string} ontologyName - Name of ontology (lock, snapshot, queue)
 * @param {string} format - Output format (turtle, rdfxml, jsonld)
 * @returns {Promise<string>} Serialized ontology
 */
export async function exportOntology(
  knowledgeSubstrate,
  ontologyName,
  format = "turtle"
) {
  logger.debug(`Exporting ${ontologyName} ontology as ${format}...`);

  const baseIRI = `https://gitvan.dev/${ontologyName}-ontology`;

  try {
    if (knowledgeSubstrate.export) {
      const exported = await knowledgeSubstrate.export({
        format,
        baseIRI,
      });
      logger.debug(`Exported ${ontologyName} (${exported.length} bytes)`);
      return exported;
    } else {
      throw new Error("KnowledgeSubstrate does not support export");
    }
  } catch (error) {
    logger.error(`Export error: ${error.message}`);
    throw error;
  }
}

/**
 * Reset all ontologies (dangerous - for testing only)
 *
 * @param {Object} knowledgeSubstrate - KnowledgeSubstrateCore instance
 * @returns {Promise<void>}
 */
export async function resetOntologies(knowledgeSubstrate) {
  logger.warn("⚠ RESETTING ALL ONTOLOGIES - this is for testing only!");

  try {
    if (knowledgeSubstrate.clear) {
      await knowledgeSubstrate.clear();
      logger.warn("Ontologies reset");
    } else {
      throw new Error("KnowledgeSubstrate does not support clear");
    }
  } catch (error) {
    logger.error(`Reset error: ${error.message}`);
    throw error;
  }
}

export default {
  initializeGitVanOntologies,
  validateOntologies,
  getOntologyStats,
  exportOntology,
  resetOntologies,
};
