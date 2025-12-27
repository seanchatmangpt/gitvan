/**
 * @fileoverview GitVan v4 - Performance Monitoring Hooks
 *
 * Provides comprehensive performance monitoring for hook operations.
 * Tracks execution times, memory usage, and identifies bottlenecks.
 *
 * Key Features:
 * - Operation timing
 * - Memory usage tracking
 * - Performance budget enforcement
 * - Anomaly detection
 * - Performance regression alerts
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

/**
 * Performance monitor configuration defaults
 */
const DEFAULT_CONFIG = {
  enableTiming: true,
  enableMemory: true,
  sampleRate: 1.0, // Sample 100% of operations
  slowThreshold: 100, // ms
  warnThreshold: 500, // ms
  maxHistorySize: 1000,
  budgets: {},
};

/**
 * Creates a performance monitor for hook operations
 *
 * @param {Object} options - Monitor options
 * @returns {Object} Performance monitor interface
 *
 * @example
 * ```javascript
 * const monitor = usePerformanceMonitor({
 *   slowThreshold: 50,
 *   budgets: {
 *     query: 100,
 *     render: 16
 *   }
 * });
 *
 * const result = await monitor.track('query', async () => {
 *   return await graph.query(sparql);
 * });
 *
 * console.log(monitor.getReport());
 * ```
 */
export function usePerformanceMonitor(options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };

  // Metrics storage
  const metrics = new Map();
  const history = [];
  const violations = [];
  const slowOperations = [];

  // Aggregated stats
  const aggregates = {
    totalOperations: 0,
    totalTime: 0,
    slowCount: 0,
    warnCount: 0,
    budgetViolations: 0,
    startTime: Date.now(),
  };

  /**
   * Get or create metrics for an operation type
   */
  function getMetrics(operationType) {
    if (!metrics.has(operationType)) {
      metrics.set(operationType, {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        avgTime: 0,
        lastTime: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        times: [],
        memoryBefore: 0,
        memoryAfter: 0,
        errors: 0,
      });
    }
    return metrics.get(operationType);
  }

  /**
   * Calculate percentiles
   */
  function calculatePercentiles(times) {
    if (times.length === 0) return { p50: 0, p95: 0, p99: 0 };

    const sorted = [...times].sort((a, b) => a - b);
    const p50Index = Math.floor(sorted.length * 0.5);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    return {
      p50: sorted[p50Index] || 0,
      p95: sorted[p95Index] || 0,
      p99: sorted[p99Index] || 0,
    };
  }

  /**
   * Get current memory usage
   */
  function getMemoryUsage() {
    if (!config.enableMemory) return 0;

    try {
      const usage = process.memoryUsage();
      return usage.heapUsed;
    } catch {
      return 0;
    }
  }

  /**
   * Check if operation should be sampled
   */
  function shouldSample() {
    return Math.random() < config.sampleRate;
  }

  return {
    /**
     * Track an operation's performance
     */
    async track(operationType, fn, context = {}) {
      if (!shouldSample()) {
        return fn();
      }

      const m = getMetrics(operationType);
      const memoryBefore = getMemoryUsage();
      const startTime = performance.now();
      let error = null;

      try {
        return await fn();
      } catch (e) {
        error = e;
        m.errors++;
        throw e;
      } finally {
        const endTime = performance.now();
        const duration = endTime - startTime;
        const memoryAfter = getMemoryUsage();

        // Update metrics
        m.count++;
        m.totalTime += duration;
        m.lastTime = duration;
        m.minTime = Math.min(m.minTime, duration);
        m.maxTime = Math.max(m.maxTime, duration);
        m.avgTime = m.totalTime / m.count;
        m.memoryBefore = memoryBefore;
        m.memoryAfter = memoryAfter;

        // Track times for percentiles
        m.times.push(duration);
        if (m.times.length > config.maxHistorySize) {
          m.times.shift();
        }

        // Calculate percentiles
        const percentiles = calculatePercentiles(m.times);
        m.p50 = percentiles.p50;
        m.p95 = percentiles.p95;
        m.p99 = percentiles.p99;

        // Update aggregates
        aggregates.totalOperations++;
        aggregates.totalTime += duration;

        // Check thresholds
        if (duration > config.warnThreshold) {
          aggregates.warnCount++;
          slowOperations.push({
            type: operationType,
            duration,
            timestamp: Date.now(),
            context,
            severity: "warn",
          });
        } else if (duration > config.slowThreshold) {
          aggregates.slowCount++;
          slowOperations.push({
            type: operationType,
            duration,
            timestamp: Date.now(),
            context,
            severity: "slow",
          });
        }

        // Check budget
        if (config.budgets[operationType]) {
          if (duration > config.budgets[operationType]) {
            aggregates.budgetViolations++;
            violations.push({
              type: operationType,
              budget: config.budgets[operationType],
              actual: duration,
              timestamp: Date.now(),
              context,
            });
          }
        }

        // Add to history
        history.push({
          type: operationType,
          duration,
          memory: memoryAfter - memoryBefore,
          timestamp: Date.now(),
          error: error ? error.message : null,
        });

        // Trim history
        if (history.length > config.maxHistorySize) {
          history.shift();
        }
      }
    },

    /**
     * Track a synchronous operation
     */
    trackSync(operationType, fn, context = {}) {
      if (!shouldSample()) {
        return fn();
      }

      const m = getMetrics(operationType);
      const memoryBefore = getMemoryUsage();
      const startTime = performance.now();

      try {
        return fn();
      } finally {
        const endTime = performance.now();
        const duration = endTime - startTime;
        const memoryAfter = getMemoryUsage();

        // Update metrics (same as async version)
        m.count++;
        m.totalTime += duration;
        m.lastTime = duration;
        m.minTime = Math.min(m.minTime, duration);
        m.maxTime = Math.max(m.maxTime, duration);
        m.avgTime = m.totalTime / m.count;
        m.memoryBefore = memoryBefore;
        m.memoryAfter = memoryAfter;

        m.times.push(duration);
        if (m.times.length > config.maxHistorySize) {
          m.times.shift();
        }

        const percentiles = calculatePercentiles(m.times);
        m.p50 = percentiles.p50;
        m.p95 = percentiles.p95;
        m.p99 = percentiles.p99;

        aggregates.totalOperations++;
        aggregates.totalTime += duration;
      }
    },

    /**
     * Create a tracked wrapper for a function
     */
    wrap(operationType, fn) {
      const monitor = this;
      return async function (...args) {
        return monitor.track(operationType, () => fn.apply(this, args), {
          args: args.length,
        });
      };
    },

    /**
     * Get metrics for a specific operation type
     */
    getMetrics(operationType) {
      return metrics.get(operationType) || null;
    },

    /**
     * Get all metrics
     */
    getAllMetrics() {
      return Object.fromEntries(metrics);
    },

    /**
     * Get aggregated statistics
     */
    getAggregates() {
      const uptime = Date.now() - aggregates.startTime;
      return {
        ...aggregates,
        uptime,
        operationsPerSecond: uptime > 0
          ? ((aggregates.totalOperations / uptime) * 1000).toFixed(2)
          : 0,
        avgOperationTime: aggregates.totalOperations > 0
          ? (aggregates.totalTime / aggregates.totalOperations).toFixed(2)
          : 0,
      };
    },

    /**
     * Get slow operations
     */
    getSlowOperations(limit = 10) {
      return slowOperations
        .slice(-limit)
        .sort((a, b) => b.duration - a.duration);
    },

    /**
     * Get budget violations
     */
    getViolations(limit = 10) {
      return violations.slice(-limit);
    },

    /**
     * Get history
     */
    getHistory(limit = 100) {
      return history.slice(-limit);
    },

    /**
     * Generate performance report
     */
    getReport() {
      const report = {
        summary: this.getAggregates(),
        operationTypes: {},
        slowOperations: this.getSlowOperations(),
        budgetViolations: this.getViolations(),
        recommendations: [],
      };

      // Per-operation type breakdown
      for (const [type, m] of metrics) {
        report.operationTypes[type] = {
          count: m.count,
          avgTime: m.avgTime.toFixed(2),
          minTime: m.minTime === Infinity ? 0 : m.minTime.toFixed(2),
          maxTime: m.maxTime.toFixed(2),
          p50: m.p50.toFixed(2),
          p95: m.p95.toFixed(2),
          p99: m.p99.toFixed(2),
          errors: m.errors,
          errorRate: m.count > 0
            ? ((m.errors / m.count) * 100).toFixed(2) + "%"
            : "0%",
        };
      }

      // Generate recommendations
      for (const [type, m] of metrics) {
        if (m.p99 > config.warnThreshold) {
          report.recommendations.push({
            type: "performance",
            operation: type,
            message: `P99 latency (${m.p99.toFixed(0)}ms) exceeds warning threshold`,
            suggestion: "Consider caching or optimizing this operation",
          });
        }

        if (m.errors > m.count * 0.05) {
          report.recommendations.push({
            type: "reliability",
            operation: type,
            message: `Error rate (${((m.errors / m.count) * 100).toFixed(1)}%) is high`,
            suggestion: "Investigate and fix error causes",
          });
        }

        if (m.maxTime > m.avgTime * 10) {
          report.recommendations.push({
            type: "variance",
            operation: type,
            message: `High variance detected (max=${m.maxTime.toFixed(0)}ms, avg=${m.avgTime.toFixed(0)}ms)`,
            suggestion: "Investigate outliers and consider timeout handling",
          });
        }
      }

      return report;
    },

    /**
     * Set a performance budget
     */
    setBudget(operationType, budgetMs) {
      config.budgets[operationType] = budgetMs;
    },

    /**
     * Clear all metrics
     */
    clear() {
      metrics.clear();
      history.length = 0;
      violations.length = 0;
      slowOperations.length = 0;
      aggregates.totalOperations = 0;
      aggregates.totalTime = 0;
      aggregates.slowCount = 0;
      aggregates.warnCount = 0;
      aggregates.budgetViolations = 0;
      aggregates.startTime = Date.now();
    },

    /**
     * Export metrics for external analysis
     */
    export() {
      return {
        config,
        metrics: this.getAllMetrics(),
        aggregates: this.getAggregates(),
        history: this.getHistory(),
        violations: this.getViolations(),
        slowOperations: this.getSlowOperations(),
        exportedAt: new Date().toISOString(),
      };
    },
  };
}

/**
 * Creates a profiling session for detailed performance analysis
 *
 * @param {string} name - Session name
 * @param {Object} options - Profiling options
 * @returns {Object} Profiling session interface
 *
 * @example
 * ```javascript
 * const session = createProfilingSession('hook-evaluation');
 *
 * session.mark('start');
 * await parseHooks();
 * session.mark('parsed');
 * await evaluatePredicates();
 * session.mark('evaluated');
 *
 * console.log(session.getTimeline());
 * session.end();
 * ```
 */
export function createProfilingSession(name, options = {}) {
  const marks = [];
  const measures = [];
  const startTime = performance.now();
  const startMemory = process.memoryUsage?.().heapUsed || 0;
  let ended = false;

  return {
    name,

    /**
     * Add a mark at the current point
     */
    mark(label, metadata = {}) {
      if (ended) return;

      marks.push({
        label,
        time: performance.now() - startTime,
        memory: (process.memoryUsage?.().heapUsed || 0) - startMemory,
        metadata,
        timestamp: Date.now(),
      });
    },

    /**
     * Measure between two marks
     */
    measure(name, startMark, endMark) {
      const start = marks.find((m) => m.label === startMark);
      const end = marks.find((m) => m.label === endMark);

      if (!start || !end) {
        throw new Error(`Marks not found: ${startMark} -> ${endMark}`);
      }

      const measure = {
        name,
        duration: end.time - start.time,
        memoryDelta: end.memory - start.memory,
        startMark,
        endMark,
      };

      measures.push(measure);
      return measure;
    },

    /**
     * Get timeline of marks
     */
    getTimeline() {
      return marks.map((mark, i) => ({
        ...mark,
        delta: i > 0 ? mark.time - marks[i - 1].time : 0,
      }));
    },

    /**
     * Get all measures
     */
    getMeasures() {
      return [...measures];
    },

    /**
     * Get session duration
     */
    getDuration() {
      return performance.now() - startTime;
    },

    /**
     * End the profiling session
     */
    end() {
      if (ended) return;

      ended = true;
      this.mark("end");

      return {
        name,
        totalDuration: this.getDuration(),
        totalMemoryDelta:
          (process.memoryUsage?.().heapUsed || 0) - startMemory,
        markCount: marks.length,
        measureCount: measures.length,
        timeline: this.getTimeline(),
        measures: this.getMeasures(),
      };
    },

    /**
     * Generate a summary
     */
    getSummary() {
      const timeline = this.getTimeline();
      const totalTime = this.getDuration();

      // Find bottlenecks
      const bottlenecks = timeline
        .filter((m) => m.delta > 0)
        .sort((a, b) => b.delta - a.delta)
        .slice(0, 3);

      return {
        name,
        totalTime: totalTime.toFixed(2),
        markCount: marks.length,
        bottlenecks: bottlenecks.map((b) => ({
          label: b.label,
          time: b.delta.toFixed(2),
          percentage: ((b.delta / totalTime) * 100).toFixed(1) + "%",
        })),
      };
    },
  };
}

/**
 * Creates a hook execution tracer
 *
 * @param {Object} options - Tracer options
 * @returns {Object} Tracer interface
 */
export function useExecutionTracer(options = {}) {
  const traces = [];
  const activeTraces = new Map();
  let traceIdCounter = 0;

  const config = {
    maxTraces: options.maxTraces || 100,
    includeStackTrace: options.includeStackTrace || false,
  };

  return {
    /**
     * Start tracing an operation
     */
    start(operation, metadata = {}) {
      const traceId = ++traceIdCounter;
      const trace = {
        id: traceId,
        operation,
        metadata,
        startTime: performance.now(),
        startMemory: process.memoryUsage?.().heapUsed || 0,
        stack: config.includeStackTrace ? new Error().stack : null,
        children: [],
        parent: null,
      };

      // Link to parent if exists
      if (activeTraces.size > 0) {
        const parentId = Array.from(activeTraces.keys()).pop();
        const parent = activeTraces.get(parentId);
        trace.parent = parentId;
        parent.children.push(traceId);
      }

      activeTraces.set(traceId, trace);
      return traceId;
    },

    /**
     * End a trace
     */
    end(traceId, result = {}) {
      const trace = activeTraces.get(traceId);
      if (!trace) return;

      trace.endTime = performance.now();
      trace.duration = trace.endTime - trace.startTime;
      trace.endMemory = process.memoryUsage?.().heapUsed || 0;
      trace.memoryDelta = trace.endMemory - trace.startMemory;
      trace.result = result;

      activeTraces.delete(traceId);
      traces.push(trace);

      // Trim traces
      if (traces.length > config.maxTraces) {
        traces.shift();
      }

      return trace;
    },

    /**
     * Record an error in a trace
     */
    error(traceId, error) {
      const trace = activeTraces.get(traceId);
      if (!trace) return;

      trace.error = {
        message: error.message,
        name: error.name,
        stack: error.stack,
      };

      return this.end(traceId, { error: true });
    },

    /**
     * Get all completed traces
     */
    getTraces() {
      return [...traces];
    },

    /**
     * Get active traces
     */
    getActiveTraces() {
      return Array.from(activeTraces.values());
    },

    /**
     * Build trace tree
     */
    getTraceTree() {
      const roots = traces.filter((t) => !t.parent);
      const buildTree = (trace) => ({
        ...trace,
        children: traces
          .filter((t) => t.parent === trace.id)
          .map(buildTree),
      });

      return roots.map(buildTree);
    },

    /**
     * Get trace statistics
     */
    getStats() {
      if (traces.length === 0) {
        return {
          totalTraces: 0,
          avgDuration: 0,
          maxDuration: 0,
          errorRate: "0%",
        };
      }

      const durations = traces.map((t) => t.duration);
      const errors = traces.filter((t) => t.error).length;

      return {
        totalTraces: traces.length,
        avgDuration: (
          durations.reduce((a, b) => a + b, 0) / durations.length
        ).toFixed(2),
        maxDuration: Math.max(...durations).toFixed(2),
        minDuration: Math.min(...durations).toFixed(2),
        errorRate: ((errors / traces.length) * 100).toFixed(2) + "%",
        activeTraces: activeTraces.size,
      };
    },

    /**
     * Clear all traces
     */
    clear() {
      traces.length = 0;
      activeTraces.clear();
    },
  };
}

/**
 * Create a global performance context
 */
export function createPerformanceContext() {
  const monitor = usePerformanceMonitor();
  const tracer = useExecutionTracer();

  return {
    monitor,
    tracer,

    /**
     * Track and trace an operation
     */
    async trackWithTrace(operation, fn, context = {}) {
      const traceId = tracer.start(operation, context);

      try {
        const result = await monitor.track(operation, fn, context);
        tracer.end(traceId, { success: true });
        return result;
      } catch (error) {
        tracer.error(traceId, error);
        throw error;
      }
    },

    /**
     * Get combined report
     */
    getReport() {
      return {
        performance: monitor.getReport(),
        traces: tracer.getStats(),
        traceTree: tracer.getTraceTree(),
      };
    },

    /**
     * Clear all data
     */
    clear() {
      monitor.clear();
      tracer.clear();
    },
  };
}

export default {
  usePerformanceMonitor,
  createProfilingSession,
  useExecutionTracer,
  createPerformanceContext,
};
