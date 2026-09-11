/**
 * Husky → @unrdf/kgc-4d Event Capture Bridge
 *
 * Git hook observations are projected into RDF for querying while the same
 * mutation is admitted through KGC-4D for causal ordering and receipts.
 * Event identity is deterministic: identical hook observations produce the
 * same GitVan event URI. KGC-4D owns transaction-time and vector-clock state.
 */

import { createHash } from 'node:crypto';
import { createLogger } from '../utils/logger.mjs';
import { unrdfStore } from '../core/unrdf-store.mjs';

const logger = createLogger('adapters:kgc-4d-event-capture');

const EVENT_NAMESPACES = {
  gitvan: 'http://gitvan.local/ontology/',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  dct: 'http://purl.org/dc/terms/',
  prov: 'http://www.w3.org/ns/prov#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
};

const EVENT_CLASSES = {
  'pre-commit': 'PreCommitEvent',
  'commit-msg': 'CommitMsgEvent',
  'post-commit': 'PostCommitEvent',
  'post-checkout': 'PostCheckoutEvent',
};

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])])
    );
  }
  return value;
}

function namedNode(value) {
  return { type: 'NamedNode', value };
}

function literal(value, datatype) {
  const term = { type: 'Literal', value: String(value) };
  if (datatype) {
    term.datatype = namedNode(datatype);
  }
  return term;
}

/**
 * Deterministic identity for a Git hook observation.
 */
function createEventIdentity(hookData, eventTime) {
  const canonical = canonicalize({
    hookName: hookData.hookName,
    git: hookData.git || {},
    timestamp: eventTime,
  });
  const digest = createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
  return `urn:gitvan:event:sha256:${digest}`;
}

/**
 * Backward-compatible API: return RDF projection only.
 */
export async function captureHookEvent(hookData, options = {}) {
  const result = await captureHookEventWithReceipt(hookData, options);
  return result.quads;
}

/**
 * Capture a Git hook observation and expose the native KGC-4D receipt when
 * the shared store is initialized and persistence is enabled.
 */
export async function captureHookEventWithReceipt(hookData, options = {}) {
  try {
    if (!hookData || typeof hookData !== 'object') {
      throw new TypeError('hookData is required');
    }

    const { hookName, git: gitContext = {}, timestamp } = hookData;
    if (!hookName) {
      throw new TypeError('hookData.hookName is required');
    }
    if (!timestamp) {
      throw new TypeError('hookData.timestamp is required for deterministic event capture');
    }

    const eventTime = new Date(timestamp).toISOString();
    const eventId = createEventIdentity(hookData, eventTime);
    const eventGraph = createEventGraph(eventTime, eventId);
    const eventClass = EVENT_CLASSES[hookName] || 'GitHookEvent';

    logger.debug(`Capturing hook event: ${hookName} @ ${eventTime}`);

    const quads = [
      {
        subject: namedNode(eventId),
        predicate: namedNode(`${EVENT_NAMESPACES.rdf}type`),
        object: namedNode(`${EVENT_NAMESPACES.gitvan}${eventClass}`),
        graph: eventGraph,
      },
      {
        subject: namedNode(eventId),
        predicate: namedNode(`${EVENT_NAMESPACES.dct}created`),
        object: literal(eventTime, `${EVENT_NAMESPACES.xsd}dateTime`),
        graph: eventGraph,
      },
    ];

    switch (hookName) {
      case 'pre-commit':
        quads.push(...captureStagingEvents(gitContext, eventId, eventGraph));
        break;
      case 'commit-msg':
        quads.push(...captureCommitMessageEvent(gitContext, eventId, eventGraph));
        break;
      case 'post-commit':
        quads.push(...captureCommitCreationEvent(gitContext, eventTime, eventGraph));
        break;
      case 'post-checkout':
        quads.push(...captureRefUpdateEvent(gitContext, eventGraph));
        break;
      default:
        logger.debug(`No special handling for hook: ${hookName}`);
    }

    let receipt = null;
    let refPath = null;

    if (options.persist !== false) {
      const eventDate = eventTime.slice(0, 10);
      const digest = eventId.split(':').pop();
      refPath = `refs/rdf/events/${eventDate}/${hookName}/${digest}`;

      if (unrdfStore.initialized) {
        const result = await unrdfStore.insert(quads, refPath, {
          eventData: {
            type: 'GIT_HOOK',
            payload: {
              eventId,
              hookName,
              validTime: eventTime,
              git: canonicalize(gitContext),
            },
            git_ref:
              gitContext.ref ||
              (gitContext.commitSHA ? `urn:git:commit:${gitContext.commitSHA}` : refPath),
          },
        });
        receipt = result.receipt;
      } else {
        logger.debug(
          'Store not initialized - RDF projection created but KGC-4D event was not admitted'
        );
      }
    }

    logger.info(`Captured event: ${hookName} → ${quads.length} quads`);
    return { quads, receipt, eventId, refPath };
  } catch (error) {
    logger.error('Failed to capture hook event:', error);
    throw new Error(`Event capture failed: ${error.message}`);
  }
}

function captureStagingEvents(gitContext, eventId, eventGraph) {
  const quads = [];

  for (const file of gitContext.stagedFiles || []) {
    quads.push({
      subject: namedNode(eventId),
      predicate: namedNode(`${EVENT_NAMESPACES.prov}wasAssociatedWith`),
      object: literal(file),
      graph: eventGraph,
    });
  }

  for (const file of gitContext.unstagedFiles || []) {
    quads.push({
      subject: namedNode(eventId),
      predicate: namedNode(`${EVENT_NAMESPACES.gitvan}hasUnstagedChange`),
      object: literal(file),
      graph: eventGraph,
    });
  }

  return quads;
}

function captureCommitMessageEvent(gitContext, eventId, eventGraph) {
  if (!gitContext.message) return [];

  return [
    {
      subject: namedNode(eventId),
      predicate: namedNode(`${EVENT_NAMESPACES.dct}description`),
      object: literal(gitContext.message.substring(0, 500)),
      graph: eventGraph,
    },
  ];
}

function captureCommitCreationEvent(gitContext, eventTime, eventGraph) {
  if (!gitContext.commitSHA) return [];

  const commitUri = `urn:git:commit:${gitContext.commitSHA}`;
  const quads = [
    {
      subject: namedNode(commitUri),
      predicate: namedNode(`${EVENT_NAMESPACES.rdf}type`),
      object: namedNode(`${EVENT_NAMESPACES.gitvan}Commit`),
      graph: eventGraph,
    },
    {
      subject: namedNode(commitUri),
      predicate: namedNode(`${EVENT_NAMESPACES.dct}created`),
      object: literal(eventTime, `${EVENT_NAMESPACES.xsd}dateTime`),
      graph: eventGraph,
    },
  ];

  if (gitContext.author) {
    quads.push({
      subject: namedNode(commitUri),
      predicate: namedNode(`${EVENT_NAMESPACES.dct}creator`),
      object: literal(gitContext.author),
      graph: eventGraph,
    });
  }

  return quads;
}

function captureRefUpdateEvent(gitContext, eventGraph) {
  if (!gitContext.ref || !gitContext.commitSHA) return [];

  return [
    {
      subject: namedNode(`urn:git:ref:${gitContext.ref}`),
      predicate: namedNode(`${EVENT_NAMESPACES.gitvan}pointsTo`),
      object: namedNode(`urn:git:commit:${gitContext.commitSHA}`),
      graph: eventGraph,
    },
  ];
}

/**
 * Deterministic named graph for the RDF projection. KGC-4D, not this URI,
 * owns transaction-time and vector-clock causality.
 */
function createEventGraph(validTime, eventId) {
  const digest = eventId.split(':').pop();
  return namedNode(`urn:gitvan:event-graph:${encodeURIComponent(validTime)}:${digest}`);
}

export async function queryEvents(startTime, endTime) {
  if (!unrdfStore.initialized) {
    await unrdfStore.initialize();
  }

  const timeFilters = [];
  if (startTime) {
    timeFilters.push(
      `?time >= "${new Date(startTime).toISOString()}"^^xsd:dateTime`
    );
  }
  if (endTime) {
    timeFilters.push(
      `?time <= "${new Date(endTime).toISOString()}"^^xsd:dateTime`
    );
  }

  const sparqlQuery = `
    PREFIX gitvan: <http://gitvan.local/ontology/>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX dct: <http://purl.org/dc/terms/>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

    SELECT ?event ?type ?time
    WHERE {
      GRAPH ?g {
        ?event rdf:type ?type ;
               dct:created ?time .
      }
      FILTER (
        ?type = gitvan:PreCommitEvent ||
        ?type = gitvan:CommitMsgEvent ||
        ?type = gitvan:PostCommitEvent ||
        ?type = gitvan:PostCheckoutEvent ||
        ?type = gitvan:GitHookEvent
      )
      ${timeFilters.length ? `FILTER (${timeFilters.join(' && ')})` : ''}
    }
    ORDER BY DESC(?time)
  `;

  try {
    return await unrdfStore.sparql(sparqlQuery);
  } catch (error) {
    logger.warn('Failed to query events:', error);
    return [];
  }
}

export { EVENT_NAMESPACES, EVENT_CLASSES, createEventGraph, createEventIdentity };
