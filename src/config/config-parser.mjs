// src/config/config-parser.mjs
// Parser for converting environment variables to RDF quads

import n3 from "n3";

const { namedNode, literal } = n3.DataFactory;

const CONFIG_NS = "https://gitvan.dev/ontology/config#";
const RDF_NS = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const XSD_NS = "http://www.w3.org/2001/XMLSchema#";

/**
 * Mapping of config paths to RDF predicates
 * Nested paths like "ai.provider" map to "gvc:aiProvider"
 */
const CONFIG_PROPERTY_MAP = {
  "rootDir": `${CONFIG_NS}hasRootDir`,
  "jobs.dir": `${CONFIG_NS}jobsDir`,
  "jobs.scan.patterns": `${CONFIG_NS}jobScanPatterns`,
  "jobs.scan.ignore": `${CONFIG_NS}jobIgnorePatterns`,
  "templates.engine": `${CONFIG_NS}templateEngine`,
  "templates.dirs": `${CONFIG_NS}templateDirs`,
  "templates.autoescape": `${CONFIG_NS}templateAutoescape`,
  "templates.noCache": `${CONFIG_NS}templateNoCache`,
  "templates.filters": `${CONFIG_NS}templateFilters`,
  "receipts.ref": `${CONFIG_NS}receiptRef`,
  "receipts.enabled": `${CONFIG_NS}receiptEnabled`,
  "receipts.compress": `${CONFIG_NS}receiptCompress`,
  "locks.ref": `${CONFIG_NS}lockRef`,
  "locks.timeout": `${CONFIG_NS}lockTimeout`,
  "locks.retries": `${CONFIG_NS}lockRetries`,
  "ai.provider": `${CONFIG_NS}aiProvider`,
  "ai.model": `${CONFIG_NS}aiModel`,
  "ai.baseUrl": `${CONFIG_NS}aiBaseUrl`,
  "ai.temperature": `${CONFIG_NS}aiTemperature`,
  "ai.maxTokens": `${CONFIG_NS}aiMaxTokens`,
  "ai.max.tokens": `${CONFIG_NS}aiMaxTokens`,
  "ai.topP": `${CONFIG_NS}aiTopP`,
  "ai.top.p": `${CONFIG_NS}aiTopP`,
  "ai.topK": `${CONFIG_NS}aiTopK`,
  "ai.top.k": `${CONFIG_NS}aiTopK`,
  "ai.repeatPenalty": `${CONFIG_NS}aiRepeatPenalty`,
  "ai.repeat.penalty": `${CONFIG_NS}aiRepeatPenalty`,
  "ai.apiKey": `${CONFIG_NS}aiApiKey`,
  "ai.api.key": `${CONFIG_NS}aiApiKey`,
  "runtime.timezone": `${CONFIG_NS}runtimeTimezone`,
  "runtime.locale": `${CONFIG_NS}runtimeLocale`,
  "runtime.deterministic": `${CONFIG_NS}runtimeDeterministic`,
  "runtime.sandbox": `${CONFIG_NS}runtimeSandbox`,
  "daemon.pollMs": `${CONFIG_NS}daemonPollMs`,
  "daemon.poll.ms": `${CONFIG_NS}daemonPollMs`,
  "daemon.lookback": `${CONFIG_NS}daemonLookback`,
  "daemon.maxPerTick": `${CONFIG_NS}daemonMaxPerTick`,
  "daemon.max.per.tick": `${CONFIG_NS}daemonMaxPerTick`,
  "events.directory": `${CONFIG_NS}eventsDirectory`,
  "graph.dir": `${CONFIG_NS}graphDir`,
  "graph.snapshotsDir": `${CONFIG_NS}graphSnapshotsDir`,
  "graph.snapshots.dir": `${CONFIG_NS}graphSnapshotsDir`,
  "graph.uriRoots": `${CONFIG_NS}graphUriRoots`,
  "graph.uri.roots": `${CONFIG_NS}graphUriRoots`,
  "graph.autoLoad": `${CONFIG_NS}graphAutoLoad`,
  "graph.auto.load": `${CONFIG_NS}graphAutoLoad`,
  "graph.validateOnLoad": `${CONFIG_NS}graphValidateOnLoad`,
  "graph.validate.on.load": `${CONFIG_NS}graphValidateOnLoad`,
};

/**
 * Type inference for values
 */
function inferType(value) {
  if (typeof value === "boolean") return `${XSD_NS}boolean`;
  if (typeof value === "number") {
    return Number.isInteger(value) ? `${XSD_NS}integer` : `${XSD_NS}decimal`;
  }
  return `${XSD_NS}string`;
}

/**
 * Create an RDF list from array values
 */
function createRDFList(store, items) {
  if (!Array.isArray(items) || items.length === 0) {
    return namedNode(`${RDF_NS}nil`);
  }

  let listNode = namedNode(`${RDF_NS}nil`);

  // Build from end to start to create proper RDF list structure
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    const newNode = namedNode(`urn:blank:${Math.random().toString(36)}`);

    // Add rdf:first and rdf:rest properties
    store.push({
      subject: newNode,
      predicate: namedNode(`${RDF_NS}first`),
      object: typeof item === "string" ? literal(item) : literal(item.toString()),
    });

    store.push({
      subject: newNode,
      predicate: namedNode(`${RDF_NS}rest`),
      object: listNode,
    });

    listNode = newNode;
  }

  return listNode;
}

/**
 * Convert plain object configuration to RDF quads
 * @param {Object} config - Configuration object
 * @param {string} configUri - Base URI for config (default: urn:gitvan:config)
 * @returns {Array<Object>} Array of RDF quads
 */
export function configToQuads(config, configUri = "urn:gitvan:config") {
  const quads = [];
  const configNode = namedNode(configUri);

  // Add rdf:type
  quads.push({
    subject: configNode,
    predicate: namedNode(`${RDF_NS}type`),
    object: namedNode(`${CONFIG_NS}Configuration`),
  });

  // Flatten nested config object and create quads
  function addQuads(obj, prefix = "") {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      let predicateUri = CONFIG_PROPERTY_MAP[path];

      if (value === null || value === undefined) {
        continue;
      }

      // If it's an object and not an array, recurse or use mapped predicate
      if (typeof value === "object" && !Array.isArray(value)) {
        if (predicateUri) {
          // Has a direct mapping - treat the entire object as the value
          // For now, skip complex nested objects with their own predicate
          continue;
        } else {
          // No direct mapping - recurse to find nested properties
          addQuads(value, path);
        }
        continue;
      }

      // If no predicateUri found, create a dynamic one for unmapped keys
      if (!predicateUri) {
        // Use a dynamic predicate based on the path
        predicateUri = `${CONFIG_NS}${path.replace(/\./g, "-")}`;
      }

      // Add literal value with proper datatype
      if (Array.isArray(value)) {
        // Create RDF list
        const listNode = createRDFList(quads, value);
        quads.push({
          subject: configNode,
          predicate: namedNode(predicateUri),
          object: listNode,
        });
      } else {
        // Scalar value - add with proper datatype
        const datatypeUri = inferType(value);
        const obj = datatypeUri !== `${XSD_NS}string`
          ? literal(value.toString(), namedNode(datatypeUri))
          : literal(value.toString());
        quads.push({
          subject: configNode,
          predicate: namedNode(predicateUri),
          object: obj,
        });
      }
    }
  }

  addQuads(config);
  return quads;
}

/**
 * Convert environment variables to RDF quads
 * Environment variable names should follow pattern GITVAN_<PATH>
 * E.g., GITVAN_AI_PROVIDER -> ai.provider
 *
 * @param {Object} env - Environment object (process.env)
 * @param {string} prefix - Environment variable prefix (default: "GITVAN_")
 * @param {string} configUri - Base URI for config
 * @returns {Array<Object>} Array of RDF quads
 */
export function envToQuads(env, prefix = "GITVAN_", configUri = "urn:gitvan:config") {
  const config = {};
  const configNode = namedNode(configUri);
  const quads = [];

  // Add rdf:type
  quads.push({
    subject: configNode,
    predicate: namedNode(`${RDF_NS}type`),
    object: namedNode(`${CONFIG_NS}Configuration`),
  });

  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith(prefix)) continue;

    // Convert GITVAN_AI_PROVIDER to ai.provider
    const configPath = key
      .slice(prefix.length)
      .toLowerCase()
      .split("_")
      .join(".");

    const predicateUri = CONFIG_PROPERTY_MAP[configPath];
    if (!predicateUri) continue;
    if (!value) continue;

    // Type conversion
    let objValue;
    let datatypeUri = `${XSD_NS}string`;

    if (value === "true") {
      datatypeUri = `${XSD_NS}boolean`;
      objValue = literal("true", namedNode(datatypeUri));
    } else if (value === "false") {
      datatypeUri = `${XSD_NS}boolean`;
      objValue = literal("false", namedNode(datatypeUri));
    } else if (/^\d+$/.test(value)) {
      datatypeUri = `${XSD_NS}integer`;
      objValue = literal(value, namedNode(datatypeUri));
    } else if (/^\d+\.\d+$/.test(value)) {
      datatypeUri = `${XSD_NS}decimal`;
      objValue = literal(value, namedNode(datatypeUri));
    } else {
      objValue = literal(value);
    }

    quads.push({
      subject: configNode,
      predicate: namedNode(predicateUri),
      object: objValue,
    });
  }

  return quads;
}

/**
 * Parse SPARQL result bindings to plain objects
 * @param {Array<Object>} bindings - SPARQL SELECT result bindings
 * @returns {Array<Object>} Plain objects
 */
export function bindingsToObjects(bindings) {
  return bindings.map((binding) => {
    const obj = {};
    for (const [key, value] of Object.entries(binding)) {
      if (value && typeof value === "object") {
        if (value.termType === "Literal") {
          obj[key] = value.value;
        } else if (value.termType === "NamedNode") {
          obj[key] = value.value;
        } else {
          obj[key] = value.value || value;
        }
      } else {
        obj[key] = value;
      }
    }
    return obj;
  });
}

/**
 * Export config property map for external use
 */
export { CONFIG_PROPERTY_MAP, CONFIG_NS };
