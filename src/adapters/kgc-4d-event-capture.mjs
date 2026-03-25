/**
 * Husky → @unrdf/kgc-4d Event Capture Bridge
 *
 * Captures Git events from Husky hooks and stores as 4D semantic facts:
 * - valid-time: when the fact became true in business time
 * - transaction-time: when the fact was recorded in the system
 * - subject: Git object (commit, ref, tree, blob)
 * - predicate: semantic relationship
 * - object: related entity or value
 *
 * Patterns:
 * - Commit creation: commit rdf:type "CommitEvent" @ timestamp
 * - Reference update: ref rdf:refersTo commit @ timestamp
 * - Author relationship: commit dct:creator person @ timestamp
 * - Timestamp tracking: Every triple includes transaction-time
 *
 * Storage: refs/rdf/events/{date}/quads.ttl
 */

import { createLogger } from '../utils/logger.mjs';
import { unrdfStore } from '../core/unrdf-store.mjs';
import { formatISO } from 'date-fns';

const logger = createLogger('adapters:kgc-4d-event-capture');

// RDF namespaces for event data
const EVENT_NAMESPACES = {
  gitvan: 'http://gitvan.local/ontology/',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  dct: 'http://purl.org/dc/terms/',
  prov: 'http://www.w3.org/ns/prov#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
};

/**
 * Capture Git hook event and convert to 4D RDF quads
 *
 * @param {Object} hookData - Data from Husky hook
 * @param {string} hookData.hookName - pre-commit, commit-msg, post-commit, etc.
 * @param {Object} hookData.git - Git context (refs, commits, etc)
 * @param {string} hookData.timestamp - ISO timestamp of hook execution
 * @returns {Promise<Array>} Array of RDF quads with 4D semantics
 */
export async function captureHookEvent(hookData, options = {}) {
  try {
    const { hookName, git: gitContext, timestamp } = hookData;
    const eventTime = new Date(timestamp || Date.now()).toISOString();
    const transactionTime = new Date().toISOString();

    logger.debug(`Capturing hook event: ${hookName} @ ${eventTime}`);

    // Note: Event capture creates quads independently - store initialization is optional
    // Quads can be stored later if needed via unrdfStore.insert()

    const quads = [];

    // Create event URI
    const eventId = `urn:gitvan:event:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`;

    // Root event triple with 4D metadata
    quads.push({
      subject: { type: 'NamedNode', value: eventId },
      predicate: { type: 'NamedNode', value: `${EVENT_NAMESPACES.rdf}type` },
      object: { type: 'NamedNode', value: `${EVENT_NAMESPACES.gitvan}${hookName}` },
      graph: {
        type: 'NamedNode',
        value: `${EVENT_NAMESPACES.gitvan}event:${eventTime}:${transactionTime}`,
      },
    });

    // Add hook-specific event data
    switch (hookName) {
      case 'pre-commit':
        quads.push(...captureStagingEvents(gitContext, eventId, eventTime, transactionTime));
        break;
      case 'commit-msg':
        quads.push(...captureCommitMessageEvent(gitContext, eventId, eventTime, transactionTime));
        break;
      case 'post-commit':
        quads.push(...captureCommitCreationEvent(gitContext, eventId, eventTime, transactionTime));
        break;
      case 'post-checkout':
        quads.push(...captureRefUpdateEvent(gitContext, eventId, eventTime, transactionTime));
        break;
      default:
        logger.debug(`No special handling for hook: ${hookName}`);
    }

    // Optional: Store in Git-native refs/rdf/events/{date}/...
    if (options.persist !== false) {
      const eventDate = formatISO(new Date(eventTime), { representation: 'date' });
      const refPath = `refs/rdf/events/${eventDate}/${hookName}/${eventId.split(':').pop()}`;

      // Try to persist if store is available
      if (unrdfStore.initialized) {
        await unrdfStore.insert(quads, refPath);
      } else {
        logger.debug(
          `Store not initialized - quads created but not persisted. Use unrdfStore.insert() later.`
        );
      }
    }

    logger.info(`Captured event: ${hookName} → ${quads.length} quads`);
    return quads;
  } catch (error) {
    logger.error('Failed to capture hook event:', error);
    throw new Error(`Event capture failed: ${error.message}`);
  }
}

/**
 * Capture pre-commit staging area changes
 */
function captureStagingEvents(gitContext, eventId, eventTime, transactionTime) {
  const quads = [];

  // Track staged files
  if (gitContext.stagedFiles) {
    for (const file of gitContext.stagedFiles) {
      quads.push({
        subject: { type: 'NamedNode', value: eventId },
        predicate: { type: 'NamedNode', value: `${EVENT_NAMESPACES.prov}wasAssociatedWith` },
        object: { type: 'Literal', value: file },
        graph: createEventGraph(eventTime, transactionTime),
      });
    }
  }

  // Track unstaged changes
  if (gitContext.unstagedFiles) {
    for (const file of gitContext.unstagedFiles) {
      quads.push({
        subject: { type: 'NamedNode', value: eventId },
        predicate: { type: 'NamedNode', value: `${EVENT_NAMESPACES.gitvan}hasUnstagedChange` },
        object: { type: 'Literal', value: file },
        graph: createEventGraph(eventTime, transactionTime),
      });
    }
  }

  return quads;
}

/**
 * Capture commit message event
 */
function captureCommitMessageEvent(gitContext, eventId, eventTime, transactionTime) {
  const quads = [];

  if (gitContext.message) {
    quads.push({
      subject: { type: 'NamedNode', value: eventId },
      predicate: { type: 'NamedNode', value: `${EVENT_NAMESPACES.dct}description` },
      object: {
        type: 'Literal',
        value: gitContext.message.substring(0, 500), // Truncate very long messages
      },
      graph: createEventGraph(eventTime, transactionTime),
    });
  }

  return quads;
}

/**
 * Capture commit creation event
 */
function captureCommitCreationEvent(gitContext, eventId, eventTime, transactionTime) {
  const quads = [];

  if (gitContext.commitSHA) {
    const commitUri = `urn:git:commit:${gitContext.commitSHA}`;

    // Commit creation fact
    quads.push({
      subject: { type: 'NamedNode', value: commitUri },
      predicate: { type: 'NamedNode', value: `${EVENT_NAMESPACES.rdf}type` },
      object: { type: 'NamedNode', value: `${EVENT_NAMESPACES.gitvan}Commit` },
      graph: createEventGraph(eventTime, transactionTime),
    });

    // Commit timestamp (valid-time)
    quads.push({
      subject: { type: 'NamedNode', value: commitUri },
      predicate: { type: 'NamedNode', value: `${EVENT_NAMESPACES.dct}created` },
      object: {
        type: 'Literal',
        value: eventTime,
        datatype: { type: 'NamedNode', value: EVENT_NAMESPACES.xsd + 'dateTime' },
      },
      graph: createEventGraph(eventTime, transactionTime),
    });

    // Author
    if (gitContext.author) {
      quads.push({
        subject: { type: 'NamedNode', value: commitUri },
        predicate: { type: 'NamedNode', value: `${EVENT_NAMESPACES.dct}creator` },
        object: { type: 'Literal', value: gitContext.author },
        graph: createEventGraph(eventTime, transactionTime),
      });
    }
  }

  return quads;
}

/**
 * Capture ref update event (post-checkout)
 */
function captureRefUpdateEvent(gitContext, eventId, eventTime, transactionTime) {
  const quads = [];

  if (gitContext.ref && gitContext.commitSHA) {
    const refUri = `urn:git:ref:${gitContext.ref}`;
    const commitUri = `urn:git:commit:${gitContext.commitSHA}`;

    quads.push({
      subject: { type: 'NamedNode', value: refUri },
      predicate: { type: 'NamedNode', value: `${EVENT_NAMESPACES.gitvan}pointsTo` },
      object: { type: 'NamedNode', value: commitUri },
      graph: createEventGraph(eventTime, transactionTime),
    });
  }

  return quads;
}

/**
 * Create RDF named graph URI with 4D semantics
 *
 * Named graphs encode:
 * - valid-time: when the fact was true in business logic
 * - transaction-time: when the fact was recorded in the system
 *
 * Format: urn:gitvan:event:{validTime}:{transactionTime}
 */
function createEventGraph(validTime, transactionTime) {
  return {
    type: 'NamedNode',
    value: `urn:gitvan:event:${validTime}:${transactionTime}`,
  };
}

/**
 * Query events within time range
 */
export async function queryEvents(startTime, endTime) {
  if (!unrdfStore.initialized) {
    await unrdfStore.initialize();
  }

  const sparqlQuery = `
    PREFIX gitvan: <http://gitvan.local/ontology/>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

    SELECT ?event ?type ?time
    WHERE {
      GRAPH ?g {
        ?event rdf:type ?type .
      }
      FILTER (
        ?type = gitvan:PreCommitEvent ||
        ?type = gitvan:CommitMsgEvent ||
        ?type = gitvan:PostCommitEvent ||
        ?type = gitvan:PostCheckoutEvent
      )
    }
    ORDER BY DESC(?time)
  `;

  try {
    const results = await unrdfStore.sparql(sparqlQuery);
    return results;
  } catch (error) {
    logger.warn('Failed to query events:', error);
    return [];
  }
}

export { EVENT_NAMESPACES, createEventGraph };
