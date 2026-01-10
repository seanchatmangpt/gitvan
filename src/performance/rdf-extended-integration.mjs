import { createLogger } from "../utils/logger.mjs";
import { ExtendedMetricsCollector } from "./extended-metrics.mjs";
import { AnalyticsEngine } from "./analytics-engine.mjs";
import { parseTurtle } from "unrdf";
import { randomUUID } from "node:crypto";

const logger = createLogger("performance:rdf-extended");

/**
 * @fileoverview RDF Extended Integration for Performance Monitoring
 *
 * Extends RDFPerformanceMonitor with extended metrics collection
 * and analytics capabilities, storing results in RDF format.
 *
 * @version 1.0.0
 */

/**
 * RDF Extended Measurement Recorder
 */
export class RDFExtendedMeasurement {
  constructor(rdfMonitor) {
    this.monitor = rdfMonitor;
    this.metrics = new Map();
  }

  /**
   * Record an extended measurement
   */
  async recordExtended(operation, fn, context = {}) {
    const collector = new ExtendedMetricsCollector();
    collector.start();

    const startTime = performance.now();

    try {
      const result = await fn();
      const endTime = performance.now();
      const metrics = collector.getFlatMetrics();

      const measurementId = `meas-${randomUUID()}`;
      const timestamp = new Date().toISOString();

      // Build RDF triples with extended metrics
      const turtle = this._buildExtendedTurtle(
        measurementId,
        operation,
        {
          duration: endTime - startTime,
          ...metrics,
          ...context
        },
        timestamp
      );

      // Parse and store in RDF
      const store = await parseTurtle(turtle);
      for (const quad of store.values()) {
        this.monitor.core.store.add(quad);
      }

      // Track in memory
      await this.monitor._updateStats(
        operation,
        endTime - startTime,
        metrics.heapUsed || 0,
        metrics.cpuPercent || 0
      );

      logger.debug(
        `📊 Recorded extended measurement ${measurementId} for ${operation}`
      );

      return {
        measurementId,
        duration: endTime - startTime,
        metrics
      };
    } catch (error) {
      logger.error(`❌ Extended measurement failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build RDF Turtle for extended measurement
   * @private
   */
  _buildExtendedTurtle(measurementId, operation, metrics, timestamp) {
    let properties = `
      perf:measurementId "${measurementId}" ;
      perf:operation "${operation}" ;
      perf:timestamp "${timestamp}"^^xsd:dateTime ;
      perf:success true ;
    `;

    // Map extended metrics to RDF properties
    const metricMappings = {
      duration: "perf:duration",
      heapUsed: "perf:heapUsed",
      heapTotal: "perf:heapTotal",
      heapDelta: "perf:heapDelta",
      external: "perf:external",
      gcPressure: "perf:gcPressure",
      userCPU: "perf:userCPU",
      systemCPU: "perf:systemCPU",
      totalCPU: "perf:totalCPU",
      cpuPercent: "perf:cpuPercent",
      blockingFraction: "perf:blockingFraction",
      diskReadBytes: "perf:diskReadBytes",
      diskWriteBytes: "perf:diskWriteBytes",
      diskReadOps: "perf:diskReadOps",
      diskWriteOps: "perf:diskWriteOps",
      eventLoopLag: "perf:eventLoopLag",
      cacheHitRate: "perf:cacheHitRate"
    };

    for (const [key, prop] of Object.entries(metricMappings)) {
      if (key in metrics) {
        const value = metrics[key];
        if (typeof value === "number") {
          properties += `\n      ${prop} ${value.toFixed(3)} ;`;
        }
      }
    }

    return `
      @prefix perf: <https://gitvan.dev/performance#> .
      @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

      <urn:measurement:${measurementId}> a perf:ExtendedMeasurement ;
        ${properties}
        perf:contextData ${JSON.stringify(JSON.stringify(metrics))} .
    `;
  }
}

/**
 * RDF Analytics Integration
 */
export class RDFAnalyticsIntegration {
  constructor(rdfMonitor) {
    this.monitor = rdfMonitor;
    this.engine = new AnalyticsEngine();
    this.analyses = new Map();
  }

  /**
   * Analyze stored measurements
   */
  async analyzeOperation(operation, timeWindow = 3600000) {
    const measurements = await this.monitor.getMeasurements(
      operation,
      timeWindow
    );

    if (measurements.length === 0) {
      logger.warn(
        `No measurements found for ${operation} in last ${timeWindow}ms`
      );
      return null;
    }

    // Extract durations for analysis
    const durations = measurements.map((m) => m.duration);

    // Perform comprehensive analysis
    const analysis = this.engine.analyzeMetrics(durations, operation);

    // Store analysis
    this.analyses.set(operation, {
      timestamp: new Date().toISOString(),
      measurement_count: measurements.length,
      time_window: timeWindow,
      analysis
    });

    // Log findings
    this._logAnalysisSummary(operation, analysis);

    return analysis;
  }

  /**
   * Compare periods and detect regression
   */
  async detectRegression(operation, period1Ms, period2Ms) {
    const currentTime = Date.now();
    const before = await this.monitor.getMeasurements(
      operation,
      period1Ms,
      new Date(currentTime - period1Ms - period2Ms)
    );
    const after = await this.monitor.getMeasurements(operation, period2Ms);

    if (before.length === 0 || after.length === 0) {
      return null;
    }

    const beforeDurations = before.map((m) => m.duration);
    const afterDurations = after.map((m) => m.duration);

    const comparison = this.engine.comparePeriods(
      beforeDurations,
      afterDurations
    );

    logger.info(
      `📊 Period comparison for ${operation}: ${comparison.direction} ${comparison.meanChangePct.toFixed(1)}%`
    );

    return comparison;
  }

  /**
   * Forecast future performance
   */
  async forecast(operation, horizon = 10) {
    const measurements = await this.monitor.getMeasurements(operation, 24 * 60 * 60 * 1000); // Last 24 hours

    if (measurements.length < 5) {
      logger.warn(`Insufficient data for forecasting ${operation}`);
      return null;
    }

    const durations = measurements.map((m) => m.duration);
    const forecast = this.engine.forecast(durations, horizon);

    logger.debug(`🔮 Forecasted ${horizon} points for ${operation}`);

    return forecast;
  }

  /**
   * Get health score for operation
   */
  getHealthScore(operation) {
    const analysis = this.analyses.get(operation);
    if (!analysis) {
      return null;
    }

    return analysis.analysis.health;
  }

  /**
   * Get all analyses
   */
  getAllAnalyses() {
    return Array.from(this.analyses.values());
  }

  /**
   * Log analysis summary
   * @private
   */
  _logAnalysisSummary(operation, analysis) {
    const healthColor =
      analysis.health > 75
        ? "✅"
        : analysis.health > 50
        ? "⚠️"
        : "❌";

    logger.info(
      `${healthColor} ${operation}: health=${analysis.health.toFixed(0)}/100, ` +
      `mean=${analysis.stats.mean.toFixed(2)}ms, ` +
      `p95=${analysis.stats.p95.toFixed(2)}ms, ` +
      `trend=${analysis.trend.direction}`
    );

    if (analysis.anomalyCounts.high > 0) {
      logger.warn(
        `⚠️ Found ${analysis.anomalyCounts.high} high-severity anomalies`
      );
    }
  }
}

/**
 * RDF Performance Monitor Extension
 *
 * Adds extended metrics and analytics to RDFPerformanceMonitor
 */
export function extendRDFPerformanceMonitor(monitor) {
  // Add extended measurement recording
  monitor.extendedMeasurement = new RDFExtendedMeasurement(monitor);

  // Add analytics integration
  monitor.analytics = new RDFAnalyticsIntegration(monitor);

  // Helper method to record with extended metrics
  monitor.recordWithExtendedMetrics = async function (operation, fn, context) {
    return this.extendedMeasurement.recordExtended(operation, fn, context);
  };

  // Helper method to analyze operation
  monitor.analyzeOperation = async function (operation, timeWindow) {
    return this.analytics.analyzeOperation(operation, timeWindow);
  };

  // Helper method to detect regression
  monitor.detectRegression = async function (operation, period1, period2) {
    return this.analytics.detectRegression(operation, period1, period2);
  };

  // Helper method to forecast
  monitor.forecastPerformance = async function (operation, horizon) {
    return this.analytics.forecast(operation, horizon);
  };

  // Helper method to get health
  monitor.getHealthScore = function (operation) {
    return this.analytics.getHealthScore(operation);
  };

  logger.info("✅ RDF Performance Monitor extended with analytics capabilities");

  return monitor;
}

export default extendRDFPerformanceMonitor;
