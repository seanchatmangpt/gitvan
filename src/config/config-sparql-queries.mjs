/**
 * @fileoverview Configuration SPARQL Query Catalog
 *
 * Pre-written SPARQL queries for GitVan configuration management.
 * Provides templates and concrete examples for common config patterns.
 *
 * Usage:
 * import { getConfigQueries, executeConfigQuery } from './config-sparql-queries.mjs';
 *
 * const queries = getConfigQueries();
 * const results = await executeConfigQuery(store, 'find-all-ai-settings');
 */

const CONFIG_NS = 'urn:gitvan:';
const RDF_NS = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const SHACL_NS = 'http://www.w3.org/ns/shacl#';
const RDFS_NS = 'http://www.w3.org/2000/01/rdf-schema#';

/**
 * Get all available config queries
 * @returns {Object} Map of query name to query definition
 */
export function getConfigQueries() {
  return {
    // AI Provider Queries
    'find-all-ai-settings': findAllAISettings(),
    'get-ai-provider': getAIProvider(),
    'get-ai-model': getAIModel(),
    'get-ai-defaults': getAIDefaults(),
    'ai-provider-matches': aiProviderMatches(),
    'ai-temperature-range': aiTemperatureRange(),

    // Job Configuration Queries
    'find-all-job-directories': findAllJobDirectories(),
    'get-job-config': getJobConfig(),
    'job-scan-patterns': jobScanPatterns(),
    'list-ignored-patterns': listIgnoredPatterns(),

    // Template Configuration Queries
    'find-all-template-settings': findAllTemplateSettings(),
    'get-template-engine': getTemplateEngine(),
    'get-template-directories': getTemplateDirectories(),
    'get-template-filters': getTemplateFilters(),

    // Runtime Configuration Queries
    'find-runtime-settings': findRuntimeSettings(),
    'get-timezone': getTimezone(),
    'get-locale': getLocale(),
    'is-deterministic': isDeterministic(),

    // Daemon Configuration Queries
    'find-daemon-settings': findDaemonSettings(),
    'get-poll-interval': getPollInterval(),
    'get-daemon-lookback': getDaemonLookback(),

    // Graph Configuration Queries
    'find-graph-settings': findGraphSettings(),
    'get-graph-directory': getGraphDirectory(),
    'get-uri-mappings': getURIMappings(),

    // Validation & Consistency Queries
    'find-missing-required-fields': findMissingRequiredFields(),
    'find-invalid-values': findInvalidValues(),
    'validate-all-settings': validateAllSettings(),

    // Schema & Metadata Queries
    'list-all-config-properties': listAllConfigProperties(),
    'get-config-schema': getConfigSchema(),
    'find-deprecated-settings': findDeprecatedSettings(),

    // Cross-Subsystem Queries
    'find-all-paths': findAllPaths(),
    'count-config-entries': countConfigEntries(),
    'config-statistics': configStatistics(),
  };
}

// ============================================================================
// AI PROVIDER QUERIES
// ============================================================================

function findAllAISettings() {
  return {
    name: 'find-all-ai-settings',
    description: 'Find all AI provider configuration settings',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>
      PREFIX rdf: <${RDF_NS}>

      SELECT ?setting ?value ?type
      WHERE {
        gitvan:config gitvan:aiProvider ?provider .
        gitvan:config gitvan:aiModel ?model .
        ?setting a gitvan:AIConfig ;
                 gitvan:hasValue ?value ;
                 rdf:type ?type .
      }
      ORDER BY ?setting
    `
  };
}

function getAIProvider() {
  return {
    name: 'get-ai-provider',
    description: 'Get the current AI provider setting',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>

      SELECT ?provider
      WHERE {
        gitvan:config gitvan:aiProvider ?provider .
      }
      LIMIT 1
    `,
    template: (provider) => `
      PREFIX gitvan: <${CONFIG_NS}>

      SELECT ?provider
      WHERE {
        gitvan:config gitvan:aiProvider "${provider}" .
      }
    `
  };
}

function getAIModel() {
  return {
    name: 'get-ai-model',
    description: 'Get the current AI model setting',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>

      SELECT ?model
      WHERE {
        gitvan:config gitvan:aiModel ?model .
      }
      LIMIT 1
    `
  };
}

function getAIDefaults() {
  return {
    name: 'get-ai-defaults',
    description: 'Get all AI default parameters',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>

      SELECT ?param ?value
      WHERE {
        gitvan:config gitvan:aiDefaults ?defaults .
        ?defaults gitvan:hasParameter ?param ;
                  gitvan:parameterValue ?value .
      }
      ORDER BY ?param
    `
  };
}

function aiProviderMatches() {
  return {
    name: 'ai-provider-matches',
    description: 'Find config where AI provider matches pattern',
    query: (pattern) => `
      PREFIX gitvan: <${CONFIG_NS}>

      ASK {
        gitvan:config gitvan:aiProvider ?provider .
        FILTER(REGEX(str(?provider), "${pattern}", "i"))
      }
    `,
    template: (pattern) => `
      PREFIX gitvan: <${CONFIG_NS}>

      SELECT ?provider
      WHERE {
        gitvan:config gitvan:aiProvider ?provider .
        FILTER(REGEX(str(?provider), "${pattern}", "i"))
      }
    `
  };
}

function aiTemperatureRange() {
  return {
    name: 'ai-temperature-range',
    description: 'Get AI temperature value and validate range',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

      SELECT ?temperature ?isValid
      WHERE {
        gitvan:config gitvan:aiDefaults ?defaults .
        ?defaults gitvan:temperature ?temperature .
        BIND((xsd:double(?temperature) >= 0.0 && xsd:double(?temperature) <= 2.0) AS ?isValid)
      }
    `
  };
}

// ============================================================================
// JOB CONFIGURATION QUERIES
// ============================================================================

function findAllJobDirectories() {
  return {
    name: 'find-all-job-directories',
    description: 'Find all configured job directories',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>

      SELECT ?directory
      WHERE {
        gitvan:config gitvan:jobDir ?directory .
      }
      ORDER BY ?directory
    `
  };
}

function getJobConfig() {
  return {
    name: 'get-job-config',
    description: 'Get complete job configuration',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>

      SELECT ?dir ?pattern
      WHERE {
        gitvan:config gitvan:jobDir ?dir ;
                      gitvan:jobScanPattern ?pattern .
      }
    `
  };
}

function jobScanPatterns() {
  return {
    name: 'job-scan-patterns',
    description: 'Get all job scan patterns',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>

      SELECT ?pattern ?priority
      WHERE {
        gitvan:config gitvan:jobScanPattern ?pattern .
        OPTIONAL { ?pattern gitvan:priority ?priority }
      }
      ORDER BY DESC(?priority)
    `
  };
}

function listIgnoredPatterns() {
  return {
    name: 'list-ignored-patterns',
    description: 'Get all ignore patterns for job scanning',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>

      SELECT ?pattern
      WHERE {
        gitvan:config gitvan:jobIgnorePattern ?pattern .
      }
      ORDER BY ?pattern
    `
  };
}

// ============================================================================
// TEMPLATE CONFIGURATION QUERIES
// ============================================================================

function findAllTemplateSettings() {
  return {
    name: 'find-all-template-settings',
    description: 'Find all template engine configuration',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>

      SELECT ?setting ?value
      WHERE {
        gitvan:config ?setting ?value .
        FILTER(STRSTARTS(str(?setting), "${CONFIG_NS}template"))
      }
    `
  };
}

function getTemplateEngine() {
  return {
    name: 'get-template-engine',
    description: 'Get the template engine type',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>

      SELECT ?engine
      WHERE {
        gitvan:config gitvan:templateEngine ?engine .
      }
      LIMIT 1
    `
  };
}

function getTemplateDirectories() {
  return {
    name: 'get-template-directories',
    description: 'Get all template directories',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>

      SELECT ?directory
      WHERE {
        gitvan:config gitvan:templateDir ?directory .
      }
      ORDER BY ?directory
    `
  };
}

function getTemplateFilters() {
  return {
    name: 'get-template-filters',
    description: 'Get all active template filters',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>

      SELECT ?filter
      WHERE {
        gitvan:config gitvan:templateFilter ?filter .
      }
      ORDER BY ?filter
    `
  };
}

// ============================================================================
// RUNTIME CONFIGURATION QUERIES
// ============================================================================

function findRuntimeSettings() {
  return {
    name: 'find-runtime-settings',
    description: 'Find all runtime configuration settings',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>

      SELECT ?setting ?value
      WHERE {
        gitvan:config ?setting ?value .
        FILTER(STRSTARTS(str(?setting), "${CONFIG_NS}runtime"))
      }
    `
  };
}

function getTimezone() {
  return {
    name: 'get-timezone',
    description: 'Get the configured timezone',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>

      SELECT ?timezone
      WHERE {
        gitvan:config gitvan:runtimeTimezone ?timezone .
      }
      LIMIT 1
    `
  };
}

function getLocale() {
  return {
    name: 'get-locale',
    description: 'Get the configured locale',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>

      SELECT ?locale
      WHERE {
        gitvan:config gitvan:runtimeLocale ?locale .
      }
      LIMIT 1
    `
  };
}

function isDeterministic() {
  return {
    name: 'is-deterministic',
    description: 'Check if deterministic mode is enabled',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>

      ASK {
        gitvan:config gitvan:runtimeDeterministic true .
      }
    `
  };
}

// ============================================================================
// DAEMON CONFIGURATION QUERIES
// ============================================================================

function findDaemonSettings() {
  return {
    name: 'find-daemon-settings',
    description: 'Find all daemon configuration',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>

      SELECT ?setting ?value
      WHERE {
        gitvan:config ?setting ?value .
        FILTER(STRSTARTS(str(?setting), "${CONFIG_NS}daemon"))
      }
    `
  };
}

function getPollInterval() {
  return {
    name: 'get-poll-interval',
    description: 'Get daemon poll interval in milliseconds',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

      SELECT ?interval
      WHERE {
        gitvan:config gitvan:daemonPollMs ?interval .
      }
      LIMIT 1
    `
  };
}

function getDaemonLookback() {
  return {
    name: 'get-daemon-lookback',
    description: 'Get daemon lookback period in seconds',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>

      SELECT ?lookback
      WHERE {
        gitvan:config gitvan:daemonLookback ?lookback .
      }
      LIMIT 1
    `
  };
}

// ============================================================================
// GRAPH CONFIGURATION QUERIES
// ============================================================================

function findGraphSettings() {
  return {
    name: 'find-graph-settings',
    description: 'Find all graph configuration',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>

      SELECT ?setting ?value
      WHERE {
        gitvan:config ?setting ?value .
        FILTER(STRSTARTS(str(?setting), "${CONFIG_NS}graph"))
      }
    `
  };
}

function getGraphDirectory() {
  return {
    name: 'get-graph-directory',
    description: 'Get graph storage directory',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>

      SELECT ?directory
      WHERE {
        gitvan:config gitvan:graphDir ?directory .
      }
      LIMIT 1
    `
  };
}

function getURIMappings() {
  return {
    name: 'get-uri-mappings',
    description: 'Get all URI prefix mappings',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>

      SELECT ?prefix ?mapping
      WHERE {
        gitvan:config gitvan:uriMapping ?mapping .
        ?mapping gitvan:prefix ?prefix .
      }
      ORDER BY ?prefix
    `
  };
}

// ============================================================================
// VALIDATION & CONSISTENCY QUERIES
// ============================================================================

function findMissingRequiredFields() {
  return {
    name: 'find-missing-required-fields',
    description: 'Find missing required configuration fields',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>
      PREFIX shacl: <${SHACL_NS}>

      SELECT ?field
      WHERE {
        ?field shacl:minCount 1 .
        FILTER NOT EXISTS {
          gitvan:config ?field ?value .
        }
      }
    `
  };
}

function findInvalidValues() {
  return {
    name: 'find-invalid-values',
    description: 'Find configuration values that violate constraints',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>
      PREFIX shacl: <${SHACL_NS}>

      SELECT ?property ?value ?constraint
      WHERE {
        gitvan:config ?property ?value .
        ?property shacl:datatype ?constraint .
        FILTER(!REGEX(str(?value), str(?constraint)))
      }
    `
  };
}

function validateAllSettings() {
  return {
    name: 'validate-all-settings',
    description: 'Validate all configuration settings against schema',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>
      PREFIX rdf: <${RDF_NS}>

      SELECT ?property ?value (COUNT(?error) AS ?errorCount)
      WHERE {
        gitvan:config ?property ?value .
        OPTIONAL {
          ?property a gitvan:ValidationRule ;
                    gitvan:constraint ?error .
        }
      }
      GROUP BY ?property ?value
      HAVING (?errorCount > 0)
    `
  };
}

// ============================================================================
// SCHEMA & METADATA QUERIES
// ============================================================================

function listAllConfigProperties() {
  return {
    name: 'list-all-config-properties',
    description: 'List all configuration properties with metadata',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>
      PREFIX rdfs: <${RDFS_NS}>

      SELECT ?property ?label ?comment
      WHERE {
        ?property rdfs:domain gitvan:Config .
        OPTIONAL { ?property rdfs:label ?label }
        OPTIONAL { ?property rdfs:comment ?comment }
      }
      ORDER BY ?property
    `
  };
}

function getConfigSchema() {
  return {
    name: 'get-config-schema',
    description: 'Get the configuration schema definition',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>
      PREFIX shacl: <${SHACL_NS}>

      SELECT ?nodeShape ?property ?datatype ?minCount ?maxCount
      WHERE {
        ?nodeShape shacl:targetClass gitvan:Config ;
                   shacl:property ?property .
        OPTIONAL { ?property shacl:datatype ?datatype }
        OPTIONAL { ?property shacl:minCount ?minCount }
        OPTIONAL { ?property shacl:maxCount ?maxCount }
      }
    `
  };
}

function findDeprecatedSettings() {
  return {
    name: 'find-deprecated-settings',
    description: 'Find deprecated configuration settings',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>

      SELECT ?setting ?replacement
      WHERE {
        ?setting a gitvan:DeprecatedSetting ;
                 gitvan:replacedBy ?replacement .
        gitvan:config ?setting ?value .
      }
    `
  };
}

// ============================================================================
// CROSS-SUBSYSTEM QUERIES
// ============================================================================

function findAllPaths() {
  return {
    name: 'find-all-paths',
    description: 'Find all configuration paths (dot notation)',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>

      SELECT ?path
      WHERE {
        gitvan:config ?property ?value .
        BIND(REPLACE(str(?property), "${CONFIG_NS}", "") AS ?path)
      }
      ORDER BY ?path
    `,
    description: 'Returns configuration paths suitable for dot notation access (e.g., "ai.provider")'
  };
}

function countConfigEntries() {
  return {
    name: 'count-config-entries',
    description: 'Count total configuration entries',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>

      SELECT (COUNT(?property) AS ?totalEntries)
      WHERE {
        gitvan:config ?property ?value .
      }
    `
  };
}

function configStatistics() {
  return {
    name: 'config-statistics',
    description: 'Get configuration statistics and metrics',
    query: `
      PREFIX gitvan: <${CONFIG_NS}>

      SELECT
        (COUNT(DISTINCT ?property) AS ?uniqueProperties)
        (COUNT(DISTINCT ?value) AS ?uniqueValues)
        (COUNT(?property) AS ?totalEntries)
      WHERE {
        gitvan:config ?property ?value .
      }
    `
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Execute a named query from the catalog
 * @param {Store} store - RDF store with config data
 * @param {string} queryName - Name of query to execute
 * @param {...any} args - Arguments for query template
 * @returns {Promise<Array>} Query results
 */
export async function executeConfigQuery(store, queryName, ...args) {
  const queries = getConfigQueries();
  const queryDef = queries[queryName];

  if (!queryDef) {
    throw new Error(`Unknown query: ${queryName}`);
  }

  // Determine the actual query string
  let queryStr = queryDef.query;
  if (typeof queryStr === 'function') {
    queryStr = queryStr(...args);
  }

  // Execute the query
  try {
    return await store.executeQuery(queryStr);
  } catch (error) {
    throw new Error(
      `Failed to execute query "${queryName}": ${error.message}`
    );
  }
}

/**
 * Get a specific query definition
 * @param {string} name - Query name
 * @returns {Object} Query definition or null
 */
export function getQuery(name) {
  const queries = getConfigQueries();
  return queries[name] || null;
}

/**
 * List all available query names
 * @returns {Array<string>} Query names
 */
export function listQueries() {
  return Object.keys(getConfigQueries());
}

/**
 * Get query documentation
 * @returns {Array<Object>} Query documentation with name, description, usage
 */
export function getQueryDocumentation() {
  const queries = getConfigQueries();
  return Object.entries(queries).map(([name, def]) => ({
    name,
    description: def.description || 'No description',
    hasTemplate: typeof def.query === 'function',
    usage: def.usage || 'Execute directly or with parameters'
  }));
}
