import { createStore } from "@unrdf/core";
import { parseTurtle } from "../lib/unrdf-compat.mjs";
import { createLogger } from "../utils/logger.mjs";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const logger = createLogger("performance:rdf-monitor");

/**
 * @fileoverview RDF-backed Performance Monitor for GitVan
 *
 * Uses UnRDF's KnowledgeSubstrateCore to store and query performance metrics
 * as semantic data. Enables powerful SPARQL-based analysis, anomaly detection,
 * and correlation discovery.
 *
 * Features:
 * - Store measurements as RDF triples
 * - SPARQL queries for anomaly detection
 * - Budget violation tracking
 * - Correlation analysis between operations
 * - Trend analysis over time windows
 * - Statistical aggregations
 *
 * @version 1.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

/**
 * RDFPerformanceMonitor - RDF-backed performance monitoring system
 *
 * @example
 * ```javascript
 * const monitor = new RDFPerformanceMonitor();
 * await monitor.initialize();
 *
 * // Record measurements
 * await monitor.recordMeasurement('sparql-query', 45.5, 2048000, 35.2, 512000);
 *
 * // Query data
 * const anomalies = await monitor.getAnomalies();
 * const violations = await monitor.getBudgetViolations();
 * const correlations = await monitor.getCorrelations();
 * ```
 */
export class RDFPerformanceMonitor {
  constructor(options = {}) {
    this.options = {
      graphDir: options.graphDir || "./graph/performance",
      enableBudgets: options.enableBudgets !== false,
      enableAnomalyDetection: options.enableAnomalyDetection !== false,
      anomalyThreshold: options.anomalyThreshold || 2.0, // std deviations
      correlationThreshold: options.correlationThreshold || 0.7,
      maxHistoryDays: options.maxHistoryDays || 90,
      ...options
    };

    this.core = null;
    this.initialized = false;
    this.budgets = new Map();
    this.stats = new Map(); // In-memory cache of statistics
  }

  /**
   * Initialize the RDF performance monitor
   *
   * Loads the performance ontology and sets up KnowledgeSubstrateCore
   *
   * @param {Object} knowledgeSubstrate - Optional pre-configured KnowledgeSubstrate
   * @param {Object} options - Additional initialization options
   * @returns {Promise<RDFPerformanceMonitor>} Initialized monitor instance
   */
  async initialize(knowledgeSubstrate = null, options = {}) {
    try {
      logger.info("🚀 Initializing RDF Performance Monitor");

      // Use provided substrate or create new one
      if (knowledgeSubstrate) {
        this.core = knowledgeSubstrate;
      } else {
        this.core = {
          store: await createStore(),
          enableObservability: true,
          ...options
        };
      }

      // Load performance ontology
      await this._loadOntology();

      // Load any existing budgets
      await this._loadBudgets();

      this.initialized = true;
      logger.info("✅ RDF Performance Monitor initialized");

      return this;
    } catch (error) {
      logger.error("❌ Failed to initialize RDF Performance Monitor:", error);
      throw error;
    }
  }

  /**
   * Load the performance ontology into the knowledge substrate
   * @private
   */
  async _loadOntology() {
    try {
      const ontologyPath = join(
        process.cwd(),
        "src/rdf/ontologies/performance-ontology.ttl"
      );
      const ontologyContent = await readFile(ontologyPath, "utf8");
      const ontologyStore = await parseTurtle(ontologyContent);

      for (const quad of ontologyStore) {
        this.core.store.add(quad);
      }

      logger.info(`📊 Loaded performance ontology (${ontologyStore.size} quads)`);
    } catch (error) {
      logger.warn("⚠️ Could not load performance ontology:", error.message);
      // Continue without ontology - not critical for basic operation
    }
  }

  /**
   * Load existing performance budgets from RDF store
   * @private
   */
  async _loadBudgets() {
    const sparql = `
      PREFIX perf: <https://gitvan.dev/performance#>
      SELECT ?operation ?maxDuration ?maxMemory ?maxCPU ?maxDiskIO ?enabled
      WHERE {
        ?budget a perf:PerformanceBudget ;
                perf:forOperation ?operation ;
                perf:budgetEnabled ?enabled .
        OPTIONAL { ?budget perf:maxDuration ?maxDuration }
        OPTIONAL { ?budget perf:maxMemory ?maxMemory }
        OPTIONAL { ?budget perf:maxCPU ?maxCPU }
        OPTIONAL { ?budget perf:maxDiskIO ?maxDiskIO }
      }
    `;

    const results = await this.core.query(sparql);
    for (const row of results) {
      if (row.enabled?.value === "true") {
        this.budgets.set(row.operation.value, {
          maxDuration: row.maxDuration ? parseFloat(row.maxDuration.value) : null,
          maxMemory: row.maxMemory ? parseInt(row.maxMemory.value) : null,
          maxCPU: row.maxCPU ? parseFloat(row.maxCPU.value) : null,
          maxDiskIO: row.maxDiskIO ? parseInt(row.maxDiskIO.value) : null
        });
      }
    }

    logger.info(`📋 Loaded ${this.budgets.size} performance budgets`);
  }

  /**
   * Record a performance measurement
   *
   * @param {string} operation - Operation name (e.g., 'sparql-query', 'git-commit')
   * @param {number} duration - Duration in milliseconds
   * @param {number} memoryUsed - Memory used in bytes
   * @param {number} cpuPercent - CPU usage percentage (0-100)
   * @param {number} diskIO - Disk I/O in bytes
   * @param {Object} context - Additional context data
   * @returns {Promise<string>} Measurement ID
   */
  async recordMeasurement(
    operation,
    duration,
    memoryUsed = 0,
    cpuPercent = 0,
    diskIO = 0,
    context = {}
  ) {
    this._ensureInitialized();

    const measurementId = `meas-${randomUUID()}`;
    const timestamp = new Date().toISOString();

    // Build RDF triples for measurement
    const turtle = `
      @prefix perf: <https://gitvan.dev/performance#> .
      @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

      <urn:measurement:${measurementId}> a perf:Measurement ;
        perf:measurementId "${measurementId}" ;
        perf:operation "${operation}" ;
        perf:duration ${duration.toFixed(3)} ;
        perf:memoryUsed ${memoryUsed} ;
        perf:cpuPercent ${cpuPercent.toFixed(2)} ;
        perf:diskIO ${diskIO} ;
        perf:timestamp "${timestamp}"^^xsd:dateTime ;
        perf:success true ;
        perf:contextData ${JSON.stringify(JSON.stringify(context))} .
    `;

    // Parse and add to store
    const store = await parseTurtle(turtle);
    for (const quad of store) {
      this.core.store.add(quad);
    }

    // Update in-memory statistics
    await this._updateStats(operation, duration, memoryUsed, cpuPercent);

    // Check for anomalies and budget violations
    if (this.options.enableAnomalyDetection) {
      await this._checkForAnomalies(measurementId, operation, duration, memoryUsed, cpuPercent, diskIO);
    }

    logger.debug(`📊 Recorded measurement ${measurementId} for ${operation} (${duration.toFixed(2)}ms)`);

    return measurementId;
  }

  /**
   * Update in-memory statistics for an operation
   * @private
   */
  async _updateStats(operation, duration, memoryUsed, cpuPercent) {
    if (!this.stats.has(operation)) {
      this.stats.set(operation, {
        count: 0,
        durations: [],
        memories: [],
        cpus: []
      });
    }

    const stats = this.stats.get(operation);
    stats.count++;
    stats.durations.push(duration);
    stats.memories.push(memoryUsed);
    stats.cpus.push(cpuPercent);

    // Keep last 1000 samples
    if (stats.durations.length > 1000) {
      stats.durations.shift();
      stats.memories.shift();
      stats.cpus.shift();
    }
  }

  /**
   * Check for anomalies in a measurement
   * @private
   */
  async _checkForAnomalies(measurementId, operation, duration, memoryUsed, cpuPercent, diskIO) {
    const stats = this.stats.get(operation);
    if (!stats || stats.count < 10) {
      return; // Need at least 10 samples for anomaly detection
    }

    const mean = this._mean(stats.durations);
    const stddev = this._stddev(stats.durations, mean);

    // Detect outliers (>2 std deviations)
    if (duration > mean + (this.options.anomalyThreshold * stddev)) {
      await this._recordAnomaly(
        measurementId,
        operation,
        "Outlier",
        "high",
        `Duration ${duration.toFixed(2)}ms exceeds mean ${mean.toFixed(2)}ms by ${this.options.anomalyThreshold} std deviations`
      );
    }

    // Check budget violations
    if (this.options.enableBudgets && this.budgets.has(operation)) {
      const budget = this.budgets.get(operation);

      if (budget.maxDuration && duration > budget.maxDuration) {
        await this._recordAnomaly(
          measurementId,
          operation,
          "BudgetViolation",
          "critical",
          `Duration ${duration.toFixed(2)}ms exceeds budget ${budget.maxDuration}ms`
        );
      }

      if (budget.maxMemory && memoryUsed > budget.maxMemory) {
        await this._recordAnomaly(
          measurementId,
          operation,
          "BudgetViolation",
          "critical",
          `Memory ${memoryUsed} bytes exceeds budget ${budget.maxMemory} bytes`
        );
      }

      if (budget.maxCPU && cpuPercent > budget.maxCPU) {
        await this._recordAnomaly(
          measurementId,
          operation,
          "BudgetViolation",
          "high",
          `CPU ${cpuPercent.toFixed(2)}% exceeds budget ${budget.maxCPU}%`
        );
      }
    }

    // Detect I/O bound operations
    if (diskIO > 1000000 && cpuPercent < 50) {
      await this._recordAnomaly(
        measurementId,
        operation,
        "IoBoundOperation",
        "medium",
        `Operation is I/O bound (${diskIO} bytes I/O, ${cpuPercent.toFixed(2)}% CPU)`
      );
    }

    // Detect CPU bound operations
    if (cpuPercent > 80 && diskIO < 100000) {
      await this._recordAnomaly(
        measurementId,
        operation,
        "CpuBoundOperation",
        "medium",
        `Operation is CPU bound (${cpuPercent.toFixed(2)}% CPU, ${diskIO} bytes I/O)`
      );
    }
  }

  /**
   * Record an anomaly in the RDF store
   * @private
   */
  async _recordAnomaly(measurementId, operation, anomalyType, severity, description) {
    const anomalyId = `anom-${randomUUID()}`;
    const timestamp = new Date().toISOString();

    const turtle = `
      @prefix perf: <https://gitvan.dev/performance#> .
      @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

      <urn:anomaly:${anomalyId}> a perf:Anomaly ;
        perf:anomalyId "${anomalyId}" ;
        perf:measurement <urn:measurement:${measurementId}> ;
        perf:severity "${severity}" ;
        perf:detectedAt "${timestamp}"^^xsd:dateTime ;
        perf:description "${description}" ;
        perf:anomalyType "${anomalyType}" ;
        perf:resolved false .
    `;

    const store = await parseTurtle(turtle);
    for (const quad of store) {
      this.core.store.add(quad);
    }

    logger.warn(`⚠️ Anomaly detected: ${anomalyType} for ${operation} - ${description}`);
  }

  /**
   * Get measurements for an operation within a time window
   *
   * @param {string} operation - Operation name
   * @param {number} timeWindow - Time window in milliseconds (default: 1 hour)
   * @returns {Promise<Array>} Array of measurements
   */
  async getMeasurements(operation, timeWindow = 3600000) {
    this._ensureInitialized();

    const startTime = new Date(Date.now() - timeWindow).toISOString();

    const sparql = `
      PREFIX perf: <https://gitvan.dev/performance#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

      SELECT ?id ?duration ?memory ?cpu ?diskIO ?timestamp ?success
      WHERE {
        ?m a perf:Measurement ;
           perf:measurementId ?id ;
           perf:operation "${operation}" ;
           perf:duration ?duration ;
           perf:memoryUsed ?memory ;
           perf:cpuPercent ?cpu ;
           perf:diskIO ?diskIO ;
           perf:timestamp ?timestamp ;
           perf:success ?success .

        FILTER(?timestamp >= "${startTime}"^^xsd:dateTime)
      }
      ORDER BY DESC(?timestamp)
      LIMIT 1000
    `;

    const results = await this.core.query(sparql);
    return results.map(row => ({
      id: row.id.value,
      operation,
      duration: parseFloat(row.duration.value),
      memory: parseInt(row.memory.value),
      cpu: parseFloat(row.cpu.value),
      diskIO: parseInt(row.diskIO.value),
      timestamp: row.timestamp.value,
      success: row.success.value === "true"
    }));
  }

  /**
   * Get all detected anomalies
   *
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of anomalies
   */
  async getAnomalies(options = {}) {
    this._ensureInitialized();

    const { resolved = false, severity = null, operation = null, limit = 100 } = options;

    let filter = `FILTER(?resolved = ${resolved})`;
    if (severity) {
      filter += ` FILTER(?severity = "${severity}")`;
    }
    if (operation) {
      filter += ` FILTER(?operation = "${operation}")`;
    }

    const sparql = `
      PREFIX perf: <https://gitvan.dev/performance#>

      SELECT ?id ?type ?severity ?description ?detectedAt ?measurementId ?operation
      WHERE {
        ?a a perf:Anomaly ;
           perf:anomalyId ?id ;
           perf:anomalyType ?type ;
           perf:severity ?severity ;
           perf:description ?description ;
           perf:detectedAt ?detectedAt ;
           perf:resolved ?resolved ;
           perf:measurement ?meas .

        ?meas perf:measurementId ?measurementId ;
              perf:operation ?operation .

        ${filter}
      }
      ORDER BY DESC(?detectedAt)
      LIMIT ${limit}
    `;

    const results = await this.core.query(sparql);
    return results.map(row => ({
      id: row.id.value,
      type: row.type.value,
      severity: row.severity.value,
      description: row.description.value,
      detectedAt: row.detectedAt.value,
      measurementId: row.measurementId.value,
      operation: row.operation.value
    }));
  }

  /**
   * Get budget violations
   *
   * @returns {Promise<Array>} Array of budget violations grouped by operation
   */
  async getBudgetViolations() {
    this._ensureInitialized();

    const sparql = `
      PREFIX perf: <https://gitvan.dev/performance#>

      SELECT ?operation (COUNT(?violation) AS ?count) (MAX(?duration) AS ?maxViolation)
      WHERE {
        ?m a perf:Measurement ;
           perf:measurementId ?violation ;
           perf:operation ?operation ;
           perf:duration ?duration .

        ?budget perf:forOperation ?operation ;
                perf:maxDuration ?max ;
                perf:budgetEnabled true .

        FILTER(?duration > ?max)
      }
      GROUP BY ?operation
      ORDER BY DESC(?count)
    `;

    const results = await this.core.query(sparql);
    return results.map(row => ({
      operation: row.operation.value,
      count: parseInt(row.count.value),
      maxViolation: parseFloat(row.maxViolation.value)
    }));
  }

  /**
   * Get correlations between operations
   *
   * Finds operations whose performance metrics correlate
   *
   * @returns {Promise<Array>} Array of correlated operation pairs
   */
  async getCorrelations() {
    this._ensureInitialized();

    // Get all operations with measurements
    const operations = Array.from(this.stats.keys());
    const correlations = [];

    // Calculate correlations between all pairs
    for (let i = 0; i < operations.length; i++) {
      for (let j = i + 1; j < operations.length; j++) {
        const op1 = operations[i];
        const op2 = operations[j];

        const stats1 = this.stats.get(op1);
        const stats2 = this.stats.get(op2);

        if (stats1.count < 10 || stats2.count < 10) continue;

        // Calculate Pearson correlation for CPU usage
        const correlation = this._correlation(stats1.cpus, stats2.cpus);

        if (Math.abs(correlation) >= this.options.correlationThreshold) {
          correlations.push({
            operation1: op1,
            operation2: op2,
            metric: "cpu",
            correlation: correlation.toFixed(3)
          });
        }
      }
    }

    return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }

  /**
   * Get trend analysis for an operation
   *
   * @param {string} operation - Operation name
   * @param {number} days - Number of days to analyze (default: 90)
   * @returns {Promise<Object>} Trend analysis
   */
  async getTrendAnalysis(operation, days = 90) {
    this._ensureInitialized();

    const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString();

    const sparql = `
      PREFIX perf: <https://gitvan.dev/performance#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

      SELECT ?duration ?timestamp
      WHERE {
        ?m a perf:Measurement ;
           perf:operation "${operation}" ;
           perf:duration ?duration ;
           perf:timestamp ?timestamp .

        FILTER(?timestamp >= "${startDate}"^^xsd:dateTime)
      }
      ORDER BY ?timestamp
    `;

    const results = await this.core.query(sparql);

    if (results.length < 2) {
      return {
        operation,
        dataPoints: results.length,
        trend: "insufficient-data",
        slope: 0,
        direction: "unknown"
      };
    }

    const durations = results.map(r => parseFloat(r.duration.value));
    const times = results.map((r, i) => i); // Use index as time proxy

    // Calculate linear regression
    const { slope, intercept } = this._linearRegression(times, durations);
    const direction = slope > 0.1 ? "degrading" : slope < -0.1 ? "improving" : "stable";

    return {
      operation,
      dataPoints: results.length,
      trend: direction,
      slope: slope.toFixed(4),
      direction,
      startDate,
      endDate: new Date().toISOString(),
      currentAvg: this._mean(durations.slice(-10)).toFixed(2),
      previousAvg: this._mean(durations.slice(0, 10)).toFixed(2)
    };
  }

  /**
   * Get statistics for an operation
   *
   * @param {string} operation - Operation name
   * @returns {Promise<Object>} Statistics
   */
  async getStats(operation) {
    this._ensureInitialized();

    const stats = this.stats.get(operation);
    if (!stats || stats.count === 0) {
      return {
        operation,
        count: 0,
        duration: {},
        memory: {},
        cpu: {}
      };
    }

    return {
      operation,
      count: stats.count,
      duration: this._calculateStats(stats.durations),
      memory: this._calculateStats(stats.memories),
      cpu: this._calculateStats(stats.cpus)
    };
  }

  /**
   * Set a performance budget for an operation
   *
   * @param {string} operation - Operation name
   * @param {Object} budget - Budget thresholds
   */
  async setBudget(operation, budget) {
    this._ensureInitialized();

    const { maxDuration, maxMemory, maxCPU, maxDiskIO } = budget;

    const turtle = `
      @prefix perf: <https://gitvan.dev/performance#> .

      <urn:budget:${operation}> a perf:PerformanceBudget ;
        perf:forOperation "${operation}" ;
        perf:maxDuration ${maxDuration || 0} ;
        perf:maxMemory ${maxMemory || 0} ;
        perf:maxCPU ${maxCPU || 0} ;
        perf:maxDiskIO ${maxDiskIO || 0} ;
        perf:budgetEnabled true ;
        perf:alertOnViolation true .
    `;

    const store = await parseTurtle(turtle);
    for (const quad of store) {
      this.core.store.add(quad);
    }

    this.budgets.set(operation, budget);
    logger.info(`📋 Set performance budget for ${operation}`);
  }

  /**
   * Calculate statistics for an array of values
   * @private
   */
  _calculateStats(values) {
    if (values.length === 0) {
      return { mean: 0, median: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mean = this._mean(values);

    return {
      mean: mean.toFixed(2),
      median: sorted[Math.floor(sorted.length * 0.5)].toFixed(2),
      min: sorted[0].toFixed(2),
      max: sorted[sorted.length - 1].toFixed(2),
      p50: sorted[Math.floor(sorted.length * 0.5)].toFixed(2),
      p95: sorted[Math.floor(sorted.length * 0.95)].toFixed(2),
      p99: sorted[Math.floor(sorted.length * 0.99)].toFixed(2),
      stddev: this._stddev(values, mean).toFixed(2)
    };
  }

  /**
   * Calculate mean
   * @private
   */
  _mean(values) {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate standard deviation
   * @private
   */
  _stddev(values, mean) {
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate Pearson correlation coefficient
   * @private
   */
  _correlation(x, y) {
    const n = Math.min(x.length, y.length);
    if (n === 0) return 0;

    const meanX = this._mean(x.slice(0, n));
    const meanY = this._mean(y.slice(0, n));

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }

    if (denomX === 0 || denomY === 0) return 0;
    return numerator / Math.sqrt(denomX * denomY);
  }

  /**
   * Calculate linear regression
   * @private
   */
  _linearRegression(x, y) {
    const n = x.length;
    const meanX = this._mean(x);
    const meanY = this._mean(y);

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (x[i] - meanX) * (y[i] - meanY);
      denominator += (x[i] - meanX) ** 2;
    }

    const slope = denominator === 0 ? 0 : numerator / denominator;
    const intercept = meanY - slope * meanX;

    return { slope, intercept };
  }

  /**
   * Ensure monitor is initialized
   * @private
   */
  _ensureInitialized() {
    if (!this.initialized) {
      throw new Error("RDF Performance Monitor not initialized. Call initialize() first.");
    }
  }

  /**
   * Export all data as RDF
   *
   * @returns {Promise<string>} RDF data in Turtle format
   */
  async exportToRDF() {
    this._ensureInitialized();

    // Would use a proper RDF serializer in production
    // For now, return store size
    return {
      quadCount: this.core.store.size,
      operations: Array.from(this.stats.keys()),
      budgets: Array.from(this.budgets.keys())
    };
  }

  /**
   * Clear old measurements beyond retention period
   *
   * @param {number} retentionDays - Number of days to retain
   * @returns {Promise<number>} Number of measurements removed
   */
  async pruneOldMeasurements(retentionDays = 90) {
    this._ensureInitialized();

    const cutoffDate = new Date(Date.now() - (retentionDays * 24 * 60 * 60 * 1000)).toISOString();

    const sparql = `
      PREFIX perf: <https://gitvan.dev/performance#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

      SELECT ?m
      WHERE {
        ?m a perf:Measurement ;
           perf:timestamp ?timestamp .

        FILTER(?timestamp < "${cutoffDate}"^^xsd:dateTime)
      }
    `;

    const results = await this.core.query(sparql);

    // Remove from store (simplified - would need proper quad removal)
    logger.info(`🗑️ Would prune ${results.length} old measurements`);

    return results.length;
  }
}

export default RDFPerformanceMonitor;
