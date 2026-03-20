import { QueueManager } from './QueueManager.mjs';
import { randomUUID } from 'crypto';
import { useGraph } from '../composables/graph.mjs';
import { parseTurtle } from "../lib/unrdf-compat.mjs";
import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('git-native:RDFQueueManager');

/**
 * RDFQueueManager - Queue manager with RDF/SPARQL-based dependency resolution
 *
 * Extends QueueManager to store job metadata as RDF triples, enabling:
 * - Topological sorting via SPARQL queries
 * - Circular dependency detection
 * - Critical path analysis
 * - Job dependency graph visualization
 *
 * Design Pattern:
 * - RDF stores dependency graph and metadata
 * - SPARQL provides DAG operations
 * - JSON stores job content/results (backward compatibility)
 * - Automatic ordering without explicit scheduling
 *
 * @extends QueueManager
 * @example
 * const queueManager = new RDFQueueManager({ cwd: '/path/to/repo' });
 * await queueManager.initialize(knowledgeSubstrate);
 * await queueManager.addJob('high', jobFunction, {
 *   name: 'build',
 *   dependsOn: ['test']
 * });
 */
export class RDFQueueManager extends QueueManager {
  /**
   * @param {object} [options] - Configuration options
   * @param {string} [options.cwd] - Working directory
   * @param {Console} [options.logger] - Logger instance
   * @param {object} [options.queue] - Queue configuration
   * @param {object} [options.paths] - Path configuration
   */
  constructor(options = {}) {
    super(options);

    this.knowledgeSubstrate = null;
    this.graph = null;
    this._rdfInitialized = false;

    // Namespace URIs
    this.QUEUE_NS = 'https://gitvan.dev/queue#';
    this.RDF_NS = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
    this.XSD_NS = 'http://www.w3.org/2001/XMLSchema#';
  }

  /**
   * Initialize queue manager with RDF knowledge substrate
   *
   * @param {object} knowledgeSubstrate - KnowledgeSubstrateCore instance
   * @param {object} [options] - Additional options
   * @param {boolean} [options.loadOntology=true] - Load queue ontology
   * @returns {Promise<void>}
   *
   * @example
   * import { createKnowledgeSubstrateCore } from "@unrdf/core";
   * const ks = createKnowledgeSubstrateCore();
   * await queueManager.initialize(ks);
   */
  async initialize(knowledgeSubstrate, options = {}) {
    // Initialize parent QueueManager
    await super.initialize();

    if (!knowledgeSubstrate) {
      logger.warn('No KnowledgeSubstrate provided - RDF features disabled');
      return;
    }

    this.knowledgeSubstrate = knowledgeSubstrate;

    try {
      // Get graph interface from knowledge substrate
      if (knowledgeSubstrate.store) {
        this.graph = useGraph(knowledgeSubstrate.store);
        this._rdfInitialized = true;
        logger.info('RDFQueueManager initialized with RDF support');
      } else {
        logger.warn('KnowledgeSubstrate missing store - RDF features disabled');
      }
    } catch (error) {
      logger.error(`Failed to initialize RDF support: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add a job to the queue with RDF metadata
   *
   * @template T
   * @param {string} priority - Priority level ('high', 'medium', 'low')
   * @param {() => Promise<T>} job - Job function to execute
   * @param {object} [metadata] - Job metadata
   * @param {string} [metadata.name] - Human-readable job name
   * @param {string} [metadata.description] - Job description
   * @param {string[]} [metadata.dependsOn] - Array of job IDs this job depends on
   * @param {number} [metadata.timeout] - Timeout in milliseconds
   * @param {number} [metadata.maxRetries] - Maximum retry attempts
   * @returns {Promise<{jobId: string, result: T}>}
   *
   * @example
   * const { jobId } = await queueManager.addJob('high', async () => {
   *   return await buildProject();
   * }, {
   *   name: 'build-project',
   *   dependsOn: ['install-deps', 'lint'],
   *   timeout: 60000
   * });
   */
  async addJob(priority, job, metadata = {}) {
    const jobId = metadata.jobId || randomUUID();
    const now = new Date().toISOString();

    // Store RDF metadata if available
    if (this._rdfInitialized && this.graph) {
      try {
        await this._storeJobMetadata(jobId, priority, metadata, now);
      } catch (error) {
        logger.warn(`Failed to store RDF metadata: ${error.message}`);
      }
    }

    // Add to parent queue with enhanced metadata
    const enhancedMetadata = {
      ...metadata,
      jobId,
      rdfEnabled: this._rdfInitialized
    };

    const result = await super.addJob(priority, job, enhancedMetadata);

    return { jobId, result };
  }

  /**
   * Get job information with RDF enrichment
   *
   * @param {string} jobId - Job identifier
   * @returns {Promise<object|null>} Job information or null if not found
   *
   * @example
   * const job = await queueManager.getJob('job-uuid-123');
   * console.log(job.name, job.status, job.dependsOn);
   */
  async getJob(jobId) {
    if (!this._rdfInitialized || !this.graph) {
      return null;
    }

    try {
      const query = `
        PREFIX queue: <${this.QUEUE_NS}>
        PREFIX xsd: <${this.XSD_NS}>

        SELECT ?name ?description ?status ?priority ?createdAt ?startedAt ?completedAt
               ?timeout ?depth ?criticalPath
        WHERE {
          ?job queue:jobId "${jobId}" .

          OPTIONAL { ?job queue:jobName ?name }
          OPTIONAL { ?job queue:description ?description }
          OPTIONAL { ?job queue:status ?statusUri .
                     BIND(STRAFTER(STR(?statusUri), "#") AS ?status) }
          OPTIONAL { ?job queue:priority ?priorityUri .
                     BIND(STRAFTER(STR(?priorityUri), "#") AS ?priority) }
          OPTIONAL { ?job queue:createdAt ?createdAt }
          OPTIONAL { ?job queue:startedAt ?startedAt }
          OPTIONAL { ?job queue:completedAt ?completedAt }
          OPTIONAL { ?job queue:timeout ?timeout }
          OPTIONAL { ?job queue:depth ?depth }
          OPTIONAL { ?job queue:criticalPath ?criticalPath }
        }
        LIMIT 1
      `;

      const results = await this.graph.select(query);

      if (results.length === 0) {
        return null;
      }

      const result = results[0];

      return {
        jobId,
        name: result.name?.value,
        description: result.description?.value,
        status: result.status?.value,
        priority: result.priority?.value,
        createdAt: result.createdAt?.value,
        startedAt: result.startedAt?.value,
        completedAt: result.completedAt?.value,
        timeout: result.timeout?.value ? parseInt(result.timeout.value, 10) : null,
        depth: result.depth?.value ? parseInt(result.depth.value, 10) : null,
        criticalPath: result.criticalPath?.value === 'true'
      };
    } catch (error) {
      logger.error(`Error retrieving job ${jobId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Update job status in RDF store
   *
   * @param {string} jobId - Job identifier
   * @param {string} status - New status ('Pending', 'Running', 'Completed', 'Failed')
   * @returns {Promise<void>}
   */
  async updateJobStatus(jobId, status) {
    if (!this._rdfInitialized || !this.graph) {
      return;
    }

    try {
      const statusUri = `${this.QUEUE_NS}${status}`;
      const timestamp = new Date().toISOString();

      const update = `
        PREFIX queue: <${this.QUEUE_NS}>
        PREFIX xsd: <${this.XSD_NS}>

        DELETE {
          ?job queue:status ?oldStatus .
        }
        INSERT {
          ?job queue:status <${statusUri}> .
          ${status === 'Running' ? `?job queue:startedAt "${timestamp}"^^xsd:dateTime .` : ''}
          ${status === 'Completed' || status === 'Failed' ?
            `?job queue:completedAt "${timestamp}"^^xsd:dateTime .` : ''}
        }
        WHERE {
          ?job queue:jobId "${jobId}" .
          OPTIONAL { ?job queue:status ?oldStatus }
        }
      `;

      await this.graph.query(update);
      logger.debug(`Updated job ${jobId} status to ${status}`);
    } catch (error) {
      logger.error(`Error updating job status: ${error.message}`);
    }
  }

  /**
   * List jobs with optional status filter
   *
   * @param {string|null} [status] - Filter by status ('Pending', 'Running', etc.)
   * @returns {Promise<Array<object>>} Array of job information
   *
   * @example
   * const pendingJobs = await queueManager.listJobs('Pending');
   * const allJobs = await queueManager.listJobs();
   */
  async listJobs(status = null) {
    if (!this._rdfInitialized || !this.graph) {
      return [];
    }

    try {
      const statusFilter = status ?
        `FILTER(?status = <${this.QUEUE_NS}${status}>)` : '';

      const query = `
        PREFIX queue: <${this.QUEUE_NS}>

        SELECT ?jobId ?name ?status ?priority ?createdAt
        WHERE {
          ?job queue:jobId ?jobId ;
               queue:status ?status .

          OPTIONAL { ?job queue:jobName ?name }
          OPTIONAL { ?job queue:priority ?priority }
          OPTIONAL { ?job queue:createdAt ?createdAt }

          ${statusFilter}
        }
        ORDER BY DESC(?priority) ?createdAt
      `;

      const results = await this.graph.select(query);

      return results.map(row => ({
        jobId: row.jobId?.value,
        name: row.name?.value,
        status: row.status?.value?.split('#')[1],
        priority: row.priority?.value?.split('#')[1],
        createdAt: row.createdAt?.value
      }));
    } catch (error) {
      logger.error(`Error listing jobs: ${error.message}`);
      return [];
    }
  }

  /**
   * Perform topological sort on jobs using SPARQL
   * Returns jobs that have no pending dependencies
   *
   * @returns {Promise<Array<string>>} Array of job IDs ready for execution
   *
   * @example
   * const readyJobs = await queueManager.topologicalSort();
   * // Execute jobs in order
   */
  async topologicalSort() {
    if (!this._rdfInitialized || !this.graph) {
      return [];
    }

    try {
      const query = `
        PREFIX queue: <${this.QUEUE_NS}>

        SELECT ?jobId WHERE {
          ?job a queue:Job ;
               queue:jobId ?jobId ;
               queue:status queue:Pending .

          # No dependencies, OR all dependencies are completed
          FILTER NOT EXISTS {
            ?job queue:dependsOn ?dep .
            ?dep queue:status ?depStatus .
            FILTER(?depStatus != queue:Completed)
          }
        }
        ORDER BY ?jobId
      `;

      const results = await this.graph.select(query);
      return results.map(row => row.jobId?.value).filter(Boolean);
    } catch (error) {
      logger.error(`Error in topological sort: ${error.message}`);
      return [];
    }
  }

  /**
   * Detect circular dependencies using SPARQL ASK query
   *
   * @returns {Promise<boolean>} True if circular dependencies exist
   *
   * @example
   * if (await queueManager.detectCircularDependencies()) {
   *   throw new Error('Circular dependencies detected!');
   * }
   */
  async detectCircularDependencies() {
    if (!this._rdfInitialized || !this.graph) {
      return false;
    }

    try {
      const query = `
        PREFIX queue: <${this.QUEUE_NS}>

        ASK WHERE {
          ?job1 queue:dependsOn ?job2 .
          ?job2 queue:dependsOn+ ?job1 .
        }
      `;

      return await this.graph.ask(query);
    } catch (error) {
      logger.error(`Error detecting circular dependencies: ${error.message}`);
      return false;
    }
  }

  /**
   * Calculate critical path (longest dependency chain)
   *
   * @returns {Promise<Array<object>>} Jobs on critical path, ordered by depth
   *
   * @example
   * const criticalPath = await queueManager.getCriticalPath();
   * console.log('Critical path length:', criticalPath.length);
   */
  async getCriticalPath() {
    if (!this._rdfInitialized || !this.graph) {
      return [];
    }

    try {
      const query = `
        PREFIX queue: <${this.QUEUE_NS}>

        SELECT ?jobId ?name (COUNT(DISTINCT ?dep) AS ?depth) WHERE {
          ?job queue:jobId ?jobId .
          OPTIONAL { ?job queue:jobName ?name }
          OPTIONAL { ?job queue:dependsOn* ?dep }
        }
        GROUP BY ?jobId ?name
        ORDER BY DESC(?depth)
      `;

      const results = await this.graph.select(query);

      return results.map(row => ({
        jobId: row.jobId?.value,
        name: row.name?.value,
        depth: parseInt(row.depth?.value || '0', 10)
      }));
    } catch (error) {
      logger.error(`Error calculating critical path: ${error.message}`);
      return [];
    }
  }

  /**
   * Get all jobs that depend on a given job
   *
   * @param {string} jobId - Job identifier
   * @returns {Promise<Array<string>>} Array of dependent job IDs
   *
   * @example
   * const dependents = await queueManager.getJobDependents('build-job');
   * console.log('Jobs waiting for build:', dependents);
   */
  async getJobDependents(jobId) {
    if (!this._rdfInitialized || !this.graph) {
      return [];
    }

    try {
      const query = `
        PREFIX queue: <${this.QUEUE_NS}>

        SELECT ?dependentId WHERE {
          ?dependent queue:jobId ?dependentId ;
                     queue:dependsOn ?job .
          ?job queue:jobId "${jobId}" .
        }
      `;

      const results = await this.graph.select(query);
      return results.map(row => row.dependentId?.value).filter(Boolean);
    } catch (error) {
      logger.error(`Error getting job dependents: ${error.message}`);
      return [];
    }
  }

  /**
   * Cleanup completed and failed jobs from RDF store
   *
   * @returns {Promise<number>} Number of jobs cleaned up
   */
  async cleanupCompleted() {
    // First cleanup parent (file system)
    const fileCleanupCount = await super.clearCompleted();

    if (!this._rdfInitialized || !this.graph) {
      return fileCleanupCount;
    }

    try {
      // Query for completed/failed jobs
      const query = `
        PREFIX queue: <${this.QUEUE_NS}>

        SELECT ?jobId WHERE {
          ?job queue:jobId ?jobId ;
               queue:status ?status .

          FILTER(?status = queue:Completed || ?status = queue:Failed)
        }
      `;

      const results = await this.graph.select(query);

      // Delete each completed/failed job
      for (const row of results) {
        const jobId = row.jobId?.value;
        if (jobId) {
          await this._deleteJobFromRDF(jobId);
        }
      }

      logger.info(`Cleaned up ${results.length} jobs from RDF store`);
      return results.length;
    } catch (error) {
      logger.error(`Error cleaning up completed jobs: ${error.message}`);
      return fileCleanupCount;
    }
  }

  /**
   * Store job metadata as RDF triples
   * @private
   */
  async _storeJobMetadata(jobId, priority, metadata, timestamp) {
    const jobUri = `${this.QUEUE_NS}job/${jobId}`;
    const priorityUri = `${this.QUEUE_NS}${this._normalizePriority(priority)}`;

    let insertQuery = `
      PREFIX queue: <${this.QUEUE_NS}>
      PREFIX rdf: <${this.RDF_NS}>
      PREFIX xsd: <${this.XSD_NS}>

      INSERT DATA {
        <${jobUri}> rdf:type queue:Job ;
                    queue:jobId "${jobId}" ;
                    queue:status queue:Pending ;
                    queue:priority <${priorityUri}> ;
                    queue:createdAt "${timestamp}"^^xsd:dateTime .
    `;

    if (metadata.name) {
      insertQuery += `        <${jobUri}> queue:jobName "${metadata.name}" .\n`;
    }

    if (metadata.description) {
      insertQuery += `        <${jobUri}> queue:description "${metadata.description}" .\n`;
    }

    if (metadata.timeout) {
      insertQuery += `        <${jobUri}> queue:timeout ${metadata.timeout} .\n`;
    }

    if (metadata.dependsOn && Array.isArray(metadata.dependsOn)) {
      for (const depId of metadata.dependsOn) {
        const depUri = `${this.QUEUE_NS}job/${depId}`;
        insertQuery += `        <${jobUri}> queue:dependsOn <${depUri}> .\n`;
      }
    }

    insertQuery += '      }';

    await this.graph.query(insertQuery);
    logger.debug(`Stored RDF metadata for job ${jobId}`);
  }

  /**
   * Delete job from RDF store
   * @private
   */
  async _deleteJobFromRDF(jobId) {
    const deleteQuery = `
      PREFIX queue: <${this.QUEUE_NS}>

      DELETE {
        ?job ?p ?o .
      }
      WHERE {
        ?job queue:jobId "${jobId}" ;
             ?p ?o .
      }
    `;

    await this.graph.query(deleteQuery);
  }

  /**
   * Normalize priority string to ontology class name
   * @private
   */
  _normalizePriority(priority) {
    const map = {
      'high': 'High',
      'medium': 'Normal',
      'normal': 'Normal',
      'low': 'Low'
    };
    return map[priority?.toLowerCase()] || 'Normal';
  }
}
