/**
 * @fileoverview GitVan v3.2.0 — Git Event Store
 *
 * This module manages storage, retention, and querying of git lifecycle events.
 * Implements a two-tier retention policy:
 * - Detail tier: 90 days of full event data
 * - Aggregate tier: 1 year of aggregated statistics
 *
 * Key Features:
 * - SPARQL-based event querying
 * - Automatic retention policy enforcement
 * - Event aggregation for long-term analytics
 * - Efficient event purging and archival
 * - Statistical aggregation by time periods
 * - Integration with unrdf KnowledgeSubstrateCore
 *
 * @version 3.2.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { UnrdfStore, namedNode, literal, quad } from "@unrdf/core";

// RDF namespace constants
const GITV = "https://gitvan.dev/ontology/git#";
const PROV = "http://www.w3.org/ns/prov#";
const XSD = "http://www.w3.org/2001/XMLSchema#";
const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";

// Retention periods in milliseconds
const DETAIL_RETENTION_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const AGGREGATE_RETENTION_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

/**
 * Git Event Store
 *
 * Manages storage, retention, and querying of git lifecycle events.
 * Provides SPARQL querying, automatic retention enforcement, and event aggregation.
 *
 * @class GitEventStore
 */
export class GitEventStore {
  /**
   * Create GitEventStore instance
   *
   * @constructor
   * @param {Object} [options={}] - Configuration options
   * @param {string} [options.storePath] - Path to persist event data
   * @param {Object} [options.logger=console] - Logger instance
   * @param {Object} [options.core] - Existing KnowledgeSubstrateCore instance
   * @param {boolean} [options.enableObservability=true] - Enable OpenTelemetry tracing
   * @param {number} [options.detailRetentionDays=90] - Days to retain detailed events
   * @param {number} [options.aggregateRetentionDays=365] - Days to retain aggregates
   * @param {boolean} [options.autoCleanup=true] - Automatically cleanup expired events
   */
  constructor(options = {}) {
    this.storePath = options.storePath || join(process.cwd(), ".gitvan", "events");
    this.logger = options.logger || console;
    this.core = options.core || null;
    this.enableObservability = options.enableObservability ?? true;
    this.detailRetentionMs = (options.detailRetentionDays || 90) * 24 * 60 * 60 * 1000;
    this.aggregateRetentionMs = (options.aggregateRetentionDays || 365) * 24 * 60 * 60 * 1000;
    this.autoCleanup = options.autoCleanup ?? true;
    this.initialized = false;
    this.cleanupInterval = null;
  }

  /**
   * Initialize the event store
   *
   * @async
   * @returns {Promise<void>}
   * @throws {Error} If initialization fails
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Create store directory
      await mkdir(this.storePath, { recursive: true });

      // Initialize UnrdfStore
      if (!this.core) {
        this.core = new UnrdfStore([]);
      }

      // Load persisted events if they exist
      await this._loadPersistedEvents();

      // Start automatic cleanup if enabled
      if (this.autoCleanup) {
        this._startAutoCleanup();
      }

      this.initialized = true;
      this.logger.info("✅ GitEventStore initialized");
    } catch (error) {
      this.logger.error("❌ GitEventStore initialization failed:", error);
      throw new Error(`Failed to initialize GitEventStore: ${error.message}`);
    }
  }

  /**
   * Query events using SPARQL
   *
   * @async
   * @param {string} query - SPARQL query string
   * @returns {Promise<Array<Object>>} Query results
   * @throws {Error} If query execution fails
   */
  async query(query) {
    await this.initialize();

    try {
      const results = await sparqlQuery(this.core.store, query);
      return results;
    } catch (error) {
      this.logger.error("❌ SPARQL query failed:", error);
      throw new Error(`Failed to execute SPARQL query: ${error.message}`);
    }
  }

  /**
   * Get events by type
   *
   * @async
   * @param {string} eventType - Event type (e.g., 'pre-commit', 'post-commit')
   * @param {Object} [options={}] - Query options
   * @param {number} [options.limit=100] - Maximum number of events to return
   * @param {Date} [options.since] - Return events since this date
   * @param {Date} [options.until] - Return events until this date
   * @returns {Promise<Array<Object>>} Array of events
   */
  async getEventsByType(eventType, options = {}) {
    const limit = options.limit || 100;
    const sinceFilter = options.since
      ? `FILTER(?timestamp >= "${options.since.toISOString()}"^^xsd:dateTime)`
      : "";
    const untilFilter = options.until
      ? `FILTER(?timestamp <= "${options.until.toISOString()}"^^xsd:dateTime)`
      : "";

    const query = `
      PREFIX gitv: <${GITV}>
      PREFIX prov: <${PROV}>
      PREFIX xsd: <${XSD}>

      SELECT ?event ?timestamp ?exitCode ?duration ?branchName ?commitHash
      WHERE {
        ?event gitv:eventType "${eventType}" ;
               prov:atTime ?timestamp ;
               gitv:exitCode ?exitCode .
        OPTIONAL { ?event gitv:duration ?duration }
        OPTIONAL { ?event gitv:branchName ?branchName }
        OPTIONAL { ?event gitv:commitHash ?commitHash }
        ${sinceFilter}
        ${untilFilter}
      }
      ORDER BY DESC(?timestamp)
      LIMIT ${limit}
    `;

    return this.query(query);
  }

  /**
   * Get events by date range
   *
   * @async
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} [options={}] - Query options
   * @param {number} [options.limit=1000] - Maximum number of events
   * @returns {Promise<Array<Object>>} Array of events
   */
  async getEventsByDateRange(startDate, endDate, options = {}) {
    const limit = options.limit || 1000;

    const query = `
      PREFIX gitv: <${GITV}>
      PREFIX prov: <${PROV}>
      PREFIX xsd: <${XSD}>

      SELECT ?event ?eventType ?timestamp ?exitCode ?branchName
      WHERE {
        ?event gitv:eventType ?eventType ;
               prov:atTime ?timestamp ;
               gitv:exitCode ?exitCode .
        OPTIONAL { ?event gitv:branchName ?branchName }
        FILTER(?timestamp >= "${startDate.toISOString()}"^^xsd:dateTime)
        FILTER(?timestamp <= "${endDate.toISOString()}"^^xsd:dateTime)
      }
      ORDER BY DESC(?timestamp)
      LIMIT ${limit}
    `;

    return this.query(query);
  }

  /**
   * Get events by branch
   *
   * @async
   * @param {string} branchName - Branch name
   * @param {Object} [options={}] - Query options
   * @param {number} [options.limit=100] - Maximum number of events
   * @returns {Promise<Array<Object>>} Array of events
   */
  async getEventsByBranch(branchName, options = {}) {
    const limit = options.limit || 100;

    const query = `
      PREFIX gitv: <${GITV}>
      PREFIX prov: <${PROV}>

      SELECT ?event ?eventType ?timestamp ?commitHash
      WHERE {
        ?event gitv:eventType ?eventType ;
               gitv:branchName "${branchName}" ;
               prov:atTime ?timestamp .
        OPTIONAL { ?event gitv:commitHash ?commitHash }
      }
      ORDER BY DESC(?timestamp)
      LIMIT ${limit}
    `;

    return this.query(query);
  }

  /**
   * Get event statistics
   *
   * @async
   * @param {Object} [options={}] - Statistics options
   * @param {Date} [options.since] - Statistics since this date
   * @returns {Promise<Object>} Event statistics
   */
  async getStats(options = {}) {
    await this.initialize();

    const store = this.core.store;
    const stats = {
      totalEvents: 0,
      eventTypes: {},
      branches: {},
      recentActivity: {},
      retentionPolicies: {
        detail: 0,
        aggregate: 0,
      },
    };

    // Count total events
    const sinceFilter = options.since
      ? `FILTER(?timestamp >= "${options.since.toISOString()}"^^xsd:dateTime)`
      : "";

    const countQuery = `
      PREFIX gitv: <${GITV}>
      PREFIX prov: <${PROV}>
      PREFIX xsd: <${XSD}>

      SELECT (COUNT(?event) as ?count)
      WHERE {
        ?event gitv:eventType ?eventType ;
               prov:atTime ?timestamp .
        ${sinceFilter}
      }
    `;

    try {
      const countResult = await this.query(countQuery);
      stats.totalEvents = parseInt(
        countResult[0]?.count?.value || "0",
        10
      );
    } catch (error) {
      this.logger.warn("Failed to count total events:", error.message);
    }

    // Count by event type
    const typeQuery = `
      PREFIX gitv: <${GITV}>
      PREFIX prov: <${PROV}>
      PREFIX xsd: <${XSD}>

      SELECT ?eventType (COUNT(?event) as ?count)
      WHERE {
        ?event gitv:eventType ?eventType ;
               prov:atTime ?timestamp .
        ${sinceFilter}
      }
      GROUP BY ?eventType
    `;

    try {
      const typeResults = await this.query(typeQuery);
      for (const row of typeResults) {
        stats.eventTypes[row.eventType.value] = parseInt(
          row.count.value,
          10
        );
      }
    } catch (error) {
      this.logger.warn("Failed to count by event type:", error.message);
    }

    // Count by retention policy
    const retentionQuery = `
      PREFIX gitv: <${GITV}>

      SELECT ?retentionPolicy (COUNT(?event) as ?count)
      WHERE {
        ?event gitv:retentionPolicy ?retentionPolicy .
      }
      GROUP BY ?retentionPolicy
    `;

    try {
      const retentionResults = await this.query(retentionQuery);
      for (const row of retentionResults) {
        const policy = row.retentionPolicy.value;
        stats.retentionPolicies[policy] = parseInt(row.count.value, 10);
      }
    } catch (error) {
      this.logger.warn(
        "Failed to count by retention policy:",
        error.message
      );
    }

    return stats;
  }

  /**
   * Enforce retention policies
   * Removes expired detail events and aggregates expired aggregate events
   *
   * @async
   * @param {Object} [options={}] - Cleanup options
   * @param {boolean} [options.dryRun=false] - Dry run mode (don't actually delete)
   * @returns {Promise<Object>} Cleanup result
   */
  async enforceRetention(options = {}) {
    await this.initialize();

    const dryRun = options.dryRun || false;
    const now = new Date();
    const result = {
      detailEventsRemoved: 0,
      aggregateEventsRemoved: 0,
      eventsAggregated: 0,
      dryRun,
    };

    try {
      this.logger.info("🧹 Enforcing retention policies...");

      // Find expired detail events (older than 90 days)
      const expiredDetailQuery = `
        PREFIX gitv: <${GITV}>
        PREFIX prov: <${PROV}>
        PREFIX xsd: <${XSD}>

        SELECT ?event
        WHERE {
          ?event gitv:retentionPolicy "detail" ;
                 gitv:expiresAt ?expiresAt .
          FILTER(?expiresAt < "${now.toISOString()}"^^xsd:dateTime)
        }
      `;

      const expiredDetailEvents = await this.query(expiredDetailQuery);

      // Aggregate expired detail events before deletion
      for (const row of expiredDetailEvents) {
        const eventUri = row.event.value;
        await this._aggregateEvent(eventUri, dryRun);
        result.eventsAggregated++;
      }

      // Remove expired detail events
      if (!dryRun) {
        for (const row of expiredDetailEvents) {
          const eventNode = row.event;
          // Remove all quads associated with this event
          const quads = this.core.store.match(eventNode, null, null, null);
          for (const q of quads) {
            this.core.store.delete(q);
          }
          result.detailEventsRemoved++;
        }
      } else {
        result.detailEventsRemoved = expiredDetailEvents.length;
      }

      // Find expired aggregate events (older than 1 year)
      const expiredAggregateQuery = `
        PREFIX gitv: <${GITV}>
        PREFIX prov: <${PROV}>
        PREFIX xsd: <${XSD}>

        SELECT ?event
        WHERE {
          ?event gitv:retentionPolicy "aggregate" ;
                 gitv:expiresAt ?expiresAt .
          FILTER(?expiresAt < "${now.toISOString()}"^^xsd:dateTime)
        }
      `;

      const expiredAggregateEvents = await this.query(expiredAggregateQuery);

      // Remove expired aggregate events
      if (!dryRun) {
        for (const row of expiredAggregateEvents) {
          const eventNode = row.event;
          const quads = this.core.store.match(eventNode, null, null, null);
          for (const q of quads) {
            this.core.store.delete(q);
          }
          result.aggregateEventsRemoved++;
        }
      } else {
        result.aggregateEventsRemoved = expiredAggregateEvents.length;
      }

      // Persist changes
      if (!dryRun) {
        await this.persist();
      }

      this.logger.info(
        `✅ Retention enforcement complete: ${result.detailEventsRemoved} detail events removed, ${result.aggregateEventsRemoved} aggregate events removed, ${result.eventsAggregated} events aggregated`
      );

      return result;
    } catch (error) {
      this.logger.error("❌ Retention enforcement failed:", error);
      throw new Error(`Failed to enforce retention: ${error.message}`);
    }
  }

  /**
   * Aggregate an event (convert from detail to aggregate)
   *
   * @private
   * @async
   * @param {string} eventUri - Event URI to aggregate
   * @param {boolean} dryRun - Dry run mode
   * @returns {Promise<void>}
   */
  async _aggregateEvent(eventUri, dryRun) {
    if (dryRun) return;

    try {
      const eventNode = namedNode(eventUri);
      const store = this.core.store;

      // Get event data
      const eventType = store.getObjects(
        eventNode,
        namedNode(GITV + "eventType"),
        null
      )[0]?.value;
      const timestamp = store.getObjects(
        eventNode,
        namedNode(PROV + "atTime"),
        null
      )[0]?.value;
      const exitCode = store.getObjects(
        eventNode,
        namedNode(GITV + "exitCode"),
        null
      )[0]?.value;

      if (!eventType || !timestamp) {
        this.logger.warn(`Cannot aggregate event ${eventUri}: missing data`);
        return;
      }

      // Create aggregate event URI
      const date = new Date(timestamp);
      const aggregateId = `aggregate-${eventType}-${date.getFullYear()}-${
        date.getMonth() + 1
      }-${date.getDate()}`;
      const aggregateUri = `${GITV}event/${aggregateId}`;
      const aggregateNode = namedNode(aggregateUri);

      // Check if aggregate already exists
      const existingAggregate = store.countQuads(
        aggregateNode,
        namedNode(RDF + "type"),
        null,
        null
      );

      if (existingAggregate === 0) {
        // Create new aggregate
        const expiresAt = new Date(
          Date.now() + AGGREGATE_RETENTION_MS
        ).toISOString();

        store.add(
          quad(
            aggregateNode,
            namedNode(RDF + "type"),
            namedNode(GITV + "GitEvent")
          )
        );
        store.add(
          quad(
            aggregateNode,
            namedNode(GITV + "eventType"),
            literal(eventType)
          )
        );
        store.add(
          quad(
            aggregateNode,
            namedNode(PROV + "atTime"),
            literal(timestamp, namedNode(XSD + "dateTime"))
          )
        );
        store.add(
          quad(
            aggregateNode,
            namedNode(GITV + "retentionPolicy"),
            literal("aggregate")
          )
        );
        store.add(
          quad(
            aggregateNode,
            namedNode(GITV + "expiresAt"),
            literal(expiresAt, namedNode(XSD + "dateTime"))
          )
        );
        store.add(
          quad(
            aggregateNode,
            namedNode(GITV + "aggregatedFrom"),
            eventNode
          )
        );
      } else {
        // Update existing aggregate
        store.add(
          quad(
            aggregateNode,
            namedNode(GITV + "aggregatedFrom"),
            eventNode
          )
        );
      }
    } catch (error) {
      this.logger.warn(`Failed to aggregate event ${eventUri}:`, error);
    }
  }

  /**
   * Persist event store to disk
   *
   * @async
   * @returns {Promise<Object>} Persistence result
   */
  async persist() {
    await this.initialize();

    try {
      const { toTurtle } = await import("unrdf");
      const turtleContent = await toTurtle(this.core.store);
      const filePath = join(this.storePath, "events.ttl");

      await writeFile(filePath, turtleContent, "utf8");

      this.logger.info(`💾 Event store persisted to ${filePath}`);
      return { path: filePath, size: turtleContent.length };
    } catch (error) {
      this.logger.error("❌ Failed to persist event store:", error);
      throw new Error(`Failed to persist event store: ${error.message}`);
    }
  }

  /**
   * Load persisted events from disk
   *
   * @private
   * @async
   * @returns {Promise<void>}
   */
  async _loadPersistedEvents() {
    try {
      const { parseTurtle } = await import("unrdf");
      const filePath = join(this.storePath, "events.ttl");
      const content = await readFile(filePath, "utf8");
      const eventStore = parseTurtle(content);

      for (const q of eventStore) {
        this.core.store.add(q);
      }

      this.logger.info(`📚 Loaded ${eventStore.size} persisted event quads`);
    } catch (error) {
      if (error.code !== "ENOENT") {
        this.logger.warn("⚠️ Failed to load persisted events:", error.message);
      }
    }
  }

  /**
   * Start automatic cleanup interval
   *
   * @private
   */
  _startAutoCleanup() {
    // Run cleanup every 24 hours
    this.cleanupInterval = setInterval(
      async () => {
        try {
          await this.enforceRetention();
        } catch (error) {
          this.logger.error("Auto-cleanup failed:", error);
        }
      },
      24 * 60 * 60 * 1000
    );

    this.logger.info("🔄 Auto-cleanup started (24 hour interval)");
  }

  /**
   * Stop automatic cleanup
   */
  stopAutoCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      this.logger.info("⏸️ Auto-cleanup stopped");
    }
  }

  /**
   * Cleanup resources
   *
   * @async
   * @returns {Promise<void>}
   */
  async cleanup() {
    this.stopAutoCleanup();

    // Persist before cleanup
    if (this.initialized) {
      await this.persist();
    }

    this.initialized = false;
    this.logger.info("🧹 GitEventStore cleaned up");
  }
}
