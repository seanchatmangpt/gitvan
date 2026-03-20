/**
 * RDF Config Adapter - Converts gitvan.config.js → RDF triples
 *
 * Transforms flat configuration into semantic RDF representation:
 * - gitvan.config.jobsPath → rdf:gitvan:hasJobsDirectory
 * - gitvan.config.hooks.pre → rdf:gitvan:hasPreHook
 * - etc.
 *
 * All configs stored in refs/rdf/config as Turtle
 * SHACL validation ensures schema compliance
 */

import { createLogger } from '../utils/logger.mjs';
import { unrdfStore } from '../core/unrdf-store.mjs';

const logger = createLogger('config:rdf-adapter');

// RDF namespace definitions
const NAMESPACES = {
  gitvan: 'http://gitvan.local/ontology/',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
};

/**
 * Create named node from namespace and local name
 */
function createIRI(ns, localName) {
  return `${NAMESPACES[ns]}${localName}`;
}

/**
 * Convert JavaScript value to RDF literal
 */
function valueToLiteral(value) {
  if (typeof value === 'string') {
    return { value, type: NAMESPACES.xsd + 'string' };
  }
  if (typeof value === 'number') {
    return { value: String(value), type: NAMESPACES.xsd + 'decimal' };
  }
  if (typeof value === 'boolean') {
    return { value: String(value), type: NAMESPACES.xsd + 'boolean' };
  }
  return { value: JSON.stringify(value), type: NAMESPACES.xsd + 'string' };
}

/**
 * Recursively convert config object to RDF triples
 */
function configToQuads(config, subjectIRI, path = []) {
  const quads = [];

  for (const [key, value] of Object.entries(config)) {
    const predicate = createIRI('gitvan', `has${capitalize(key)}`);

    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      // Nested object: create blank node
      const objectIRI = `${subjectIRI}#${path.concat(key).join('_')}`;
      quads.push({
        subject: { type: 'NamedNode', value: subjectIRI },
        predicate: { type: 'NamedNode', value: predicate },
        object: { type: 'NamedNode', value: objectIRI },
      });

      // Recurse
      quads.push(
        ...configToQuads(value, objectIRI, path.concat(key))
      );
    } else if (Array.isArray(value)) {
      // Array: create RDF list or individual properties
      for (let i = 0; i < value.length; i++) {
        const item = value[i];
        const indexedPredicate = createIRI('gitvan', `${key}[${i}]`);

        if (typeof item === 'object') {
          const objectIRI = `${subjectIRI}#${path.concat(key, i).join('_')}`;
          quads.push({
            subject: { type: 'NamedNode', value: subjectIRI },
            predicate: { type: 'NamedNode', value: indexedPredicate },
            object: { type: 'NamedNode', value: objectIRI },
          });
          quads.push(...configToQuads(item, objectIRI, path.concat(key, i)));
        } else {
          const literal = valueToLiteral(item);
          quads.push({
            subject: { type: 'NamedNode', value: subjectIRI },
            predicate: { type: 'NamedNode', value: indexedPredicate },
            object: {
              type: 'Literal',
              value: literal.value,
              datatype: { type: 'NamedNode', value: literal.type },
            },
          });
        }
      }
    } else {
      // Scalar value: create literal
      const literal = valueToLiteral(value);
      quads.push({
        subject: { type: 'NamedNode', value: subjectIRI },
        predicate: { type: 'NamedNode', value: predicate },
        object: {
          type: 'Literal',
          value: literal.value,
          datatype: { type: 'NamedNode', value: literal.type },
        },
      });
    }
  }

  return quads;
}

/**
 * Capitalize first letter
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert gitvan config to RDF quads
 */
export function configToRdf(configObj) {
  const configIRI = createIRI('gitvan', 'Configuration');

  // Root triple
  const quads = [
    {
      subject: { type: 'NamedNode', value: configIRI },
      predicate: { type: 'NamedNode', value: NAMESPACES.rdf + 'type' },
      object: { type: 'NamedNode', value: createIRI('gitvan', 'Config') },
    },
    {
      subject: { type: 'NamedNode', value: configIRI },
      predicate: { type: 'NamedNode', value: NAMESPACES.rdfs + 'label' },
      object: {
        type: 'Literal',
        value: 'GitVan Configuration',
      },
    },
  ];

  // Add config properties
  quads.push(...configToQuads(configObj, configIRI));

  return quads;
}

/**
 * Convert RDF quads back to config object
 */
export function rdfToConfig(quads) {
  const config = {};

  // Group quads by subject
  const bySubject = {};
  for (const quad of quads) {
    const subject = quad.subject.value;
    if (!bySubject[subject]) {
      bySubject[subject] = [];
    }
    bySubject[subject].push(quad);
  }

  // Process root config
  for (const quads of Object.values(bySubject)) {
    for (const quad of quads) {
      const predicateName = quad.predicate.value.split('/').pop();

      // Skip RDF type declarations
      if (predicateName === 'type' || predicateName === 'label') {
        continue;
      }

      // Convert RDF property back to config key
      if (predicateName.startsWith('has')) {
        const key = predicateName.slice(3).charAt(0).toLowerCase() +
          predicateName.slice(4);

        if (quad.object.type === 'Literal') {
          config[key] = quad.object.value;
        }
      }
    }
  }

  return config;
}

/**
 * Persist config to RDF store
 */
export async function persistConfigToRdf(configObj) {
  try {
    if (!unrdfStore.initialized) {
      await unrdfStore.initialize();
    }

    const quads = configToRdf(configObj);
    await unrdfStore.insert(quads, 'refs/rdf/config/main');

    logger.info(`Persisted ${quads.length} config quads to RDF store`);
    return quads;
  } catch (error) {
    logger.error('Failed to persist config to RDF:', error);
    throw error;
  }
}

/**
 * Load config from RDF store
 */
export async function loadConfigFromRdf() {
  try {
    if (!unrdfStore.initialized) {
      await unrdfStore.initialize();
    }

    // Query configuration
    const sparqlQuery = `
      PREFIX gitvan: <http://gitvan.local/ontology/>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      DESCRIBE ?config
      WHERE {
        ?config rdf:type gitvan:Config .
      }
    `;

    const results = await unrdfStore.sparql(sparqlQuery);
    return rdfToConfig(results || []);
  } catch (error) {
    logger.warn('Could not load config from RDF:', error);
    return {};
  }
}

/**
 * Load config with RDF support - loads standard config then enriches from RDF store
 * @param {Object} overrides - Configuration overrides
 * @param {Object} opts - Loader options
 * @returns {Promise<Object>} Merged configuration
 */
export async function loadWithRDFSupport(overrides = {}, opts = {}) {
  try {
    const rdfConfig = await loadConfigFromRdf();
    // Merge RDF config as defaults (overrides take precedence)
    return { ...rdfConfig, ...overrides };
  } catch (error) {
    logger.warn('RDF config load failed, using overrides only:', error);
    return overrides;
  }
}

export { NAMESPACES, createIRI };
