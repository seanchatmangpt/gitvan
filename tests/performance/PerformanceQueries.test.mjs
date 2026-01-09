/**
 * @fileoverview Comprehensive test suite for PerformanceQueries
 *
 * Tests 15+ query functions for anomaly detection, regression analysis,
 * correlation discovery, trend analysis, and optimization recommendations.
 *
 * Test Coverage: 25+ tests
 * - Budget violation detection (3 tests)
 * - Memory leak identification (2 tests)
 * - CPU spike detection (2 tests)
 * - I/O-bound detection (2 tests)
 * - Regression detection (3 tests)
 * - Slowdown detection (2 tests)
 * - Correlation discovery (2 tests)
 * - Resource chain impact (2 tests)
 * - Trend analysis (2 tests)
 * - Peak usage times (1 test)
 * - Optimization opportunities (2 tests)
 * - Parallelizable operations (1 test)
 * - Operation statistics (1 test)
 * - System statistics (1 test)
 * - Capacity analysis (1 test)
 * - Performance assertions (<100ms queries)
 *
 * @version 1.0.0
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { PerformanceQueries } from '../../src/performance/queries/PerformanceQueries.mjs';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');

// Check if unrdf is available
const unrdfPath = join(rootDir, 'vendor/unrdf/packages/core/src/index.mjs');
const hasUnrdf = existsSync(unrdfPath);

// Dynamic import with fallback
let createKnowledgeSubstrateCore;
if (hasUnrdf) {
  try {
    const unrdf = await import('../../src/lib/unrdf-loader.mjs');
    createKnowledgeSubstrateCore = unrdf.createKnowledgeSubstrateCore;
  } catch (e) {
    console.warn('UnRDF not available, using mock:', e.message);
  }
}

describe('PerformanceQueries', () => {
  let ks;
  let testData;

  /**
   * Setup test knowledge substrate with sample data
   */
  beforeAll(async () => {
    if (!hasUnrdf || !createKnowledgeSubstrateCore) {
      // Create mock knowledge substrate for testing
      ks = createMockKnowledgeSubstrate();
      return;
    }

    try {
      // Load performance ontology
      const ontologyPath = join(rootDir, 'src/rdf/ontologies/performance-ontology.ttl');
      const ontologyTtl = readFileSync(ontologyPath, 'utf-8');

      // Create knowledge substrate
      ks = createKnowledgeSubstrateCore();
      await ks.load(ontologyTtl, { format: 'text/turtle' });

      // Load test data
      testData = generateTestData();
      await ks.load(testData, { format: 'text/turtle' });
    } catch (error) {
      console.warn('Failed to load UnRDF, using mock:', error.message);
      ks = createMockKnowledgeSubstrate();
    }
  });

  beforeEach(() => {
    // Each test starts with clean slate (if needed)
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  // ========================================================================
  // Budget Violation Detection Tests
  // ========================================================================

  describe('detectBudgetViolations', () => {
    it('should detect operations exceeding budgets', async () => {
      const start = performance.now();
      const violations = await PerformanceQueries.detectBudgetViolations(ks);
      const duration = performance.now() - start;

      expect(violations).toBeDefined();
      expect(Array.isArray(violations)).toBe(true);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0]).toHaveProperty('measurementId');
      expect(violations[0]).toHaveProperty('operation');
      expect(violations[0]).toHaveProperty('duration');
      expect(violations[0]).toHaveProperty('budget');
      expect(violations[0]).toHaveProperty('excess');

      // Verify violation logic
      expect(parseFloat(violations[0].duration.value)).toBeGreaterThan(
        parseFloat(violations[0].budget.value)
      );

      // Performance assertion: query should complete in <100ms
      expect(duration).toBeLessThan(100);
    });

    it('should filter violations by operation name', async () => {
      const violations = await PerformanceQueries.detectBudgetViolations(ks, {
        operation: 'sparql-query'
      });

      expect(violations).toBeDefined();
      if (violations.length > 0) {
        expect(violations[0].operation.value).toBe('sparql-query');
      }
    });

    it('should respect limit parameter', async () => {
      const violations = await PerformanceQueries.detectBudgetViolations(ks, {
        limit: 5
      });

      expect(violations).toBeDefined();
      expect(violations.length).toBeLessThanOrEqual(5);
    });
  });

  // ========================================================================
  // Memory Leak Detection Tests
  // ========================================================================

  describe('detectMemoryLeaks', () => {
    it('should identify operations with memory leak patterns', async () => {
      const start = performance.now();
      const leaks = await PerformanceQueries.detectMemoryLeaks(ks);
      const duration = performance.now() - start;

      expect(leaks).toBeDefined();
      expect(Array.isArray(leaks)).toBe(true);

      if (leaks.length > 0) {
        expect(leaks[0]).toHaveProperty('operation');
        expect(leaks[0]).toHaveProperty('measurements');
        expect(leaks[0]).toHaveProperty('totalIncrease');
        expect(leaks[0].totalIncrease).toBeGreaterThan(0);
      }

      // Performance assertion
      expect(duration).toBeLessThan(100);
    });

    it('should respect windowSize and increaseThreshold parameters', async () => {
      const leaks = await PerformanceQueries.detectMemoryLeaks(ks, {
        windowSize: 3,
        increaseThreshold: 1.2
      });

      expect(leaks).toBeDefined();
      expect(Array.isArray(leaks)).toBe(true);
    });
  });

  // ========================================================================
  // CPU Spike Detection Tests
  // ========================================================================

  describe('detectCpuSpikes', () => {
    it('should detect abnormally high CPU usage', async () => {
      const start = performance.now();
      const spikes = await PerformanceQueries.detectCpuSpikes(ks);
      const duration = performance.now() - start;

      expect(spikes).toBeDefined();
      expect(Array.isArray(spikes)).toBe(true);

      if (spikes.length > 0) {
        expect(spikes[0]).toHaveProperty('measurementId');
        expect(spikes[0]).toHaveProperty('cpuPercent');
        expect(spikes[0].cpuPercent).toBeGreaterThan(80); // Default threshold
      }

      // Performance assertion
      expect(duration).toBeLessThan(100);
    });

    it('should respect custom CPU threshold', async () => {
      const spikes = await PerformanceQueries.detectCpuSpikes(ks, {
        threshold: 90
      });

      expect(spikes).toBeDefined();
      if (spikes.length > 0) {
        expect(spikes[0].cpuPercent).toBeGreaterThan(90);
      }
    });
  });

  // ========================================================================
  // I/O-Bound Detection Tests
  // ========================================================================

  describe('detectIoBoundness', () => {
    it('should identify I/O-bound operations', async () => {
      const start = performance.now();
      const ioBound = await PerformanceQueries.detectIoBoundness(ks);
      const duration = performance.now() - start;

      expect(ioBound).toBeDefined();
      expect(Array.isArray(ioBound)).toBe(true);

      if (ioBound.length > 0) {
        expect(ioBound[0]).toHaveProperty('operation');
        expect(ioBound[0]).toHaveProperty('avgMemory');
        expect(ioBound[0]).toHaveProperty('avgCpu');
        expect(ioBound[0].avgMemory).toBeGreaterThan(400000); // Default threshold
        expect(ioBound[0].avgCpu).toBeLessThan(30); // Default threshold
      }

      // Performance assertion
      expect(duration).toBeLessThan(100);
    });

    it('should respect custom thresholds', async () => {
      const ioBound = await PerformanceQueries.detectIoBoundness(ks, {
        memoryThreshold: 500000,
        cpuThreshold: 25
      });

      expect(ioBound).toBeDefined();
      if (ioBound.length > 0) {
        expect(ioBound[0].avgMemory).toBeGreaterThan(500000);
        expect(ioBound[0].avgCpu).toBeLessThan(25);
      }
    });
  });

  // ========================================================================
  // Performance Regression Tests
  // ========================================================================

  describe('getPerformanceRegression', () => {
    it('should detect performance regressions', async () => {
      const start = performance.now();
      const regressions = await PerformanceQueries.getPerformanceRegression(ks, 7);
      const duration = performance.now() - start;

      expect(regressions).toBeDefined();
      expect(Array.isArray(regressions)).toBe(true);

      if (regressions.length > 0) {
        expect(regressions[0]).toHaveProperty('operation');
        expect(regressions[0]).toHaveProperty('baselineAvg');
        expect(regressions[0]).toHaveProperty('currentAvg');
        expect(regressions[0]).toHaveProperty('change');
        expect(regressions[0].status).toBe('regression');
        expect(regressions[0].change).toBeGreaterThan(10); // >10% threshold
      }

      // Performance assertion
      expect(duration).toBeLessThan(100);
    });

    it('should respect custom days and threshold', async () => {
      const regressions = await PerformanceQueries.getPerformanceRegression(ks, 30, 0.15);

      expect(regressions).toBeDefined();
      expect(Array.isArray(regressions)).toBe(true);
    });

    it('should return results sorted by change percentage', async () => {
      const regressions = await PerformanceQueries.getPerformanceRegression(ks, 7);

      if (regressions.length > 1) {
        expect(regressions[0].change).toBeGreaterThanOrEqual(regressions[1].change);
      }
    });
  });

  // ========================================================================
  // Slowdown Detection Tests
  // ========================================================================

  describe('detectSlowdown', () => {
    it('should detect operations slower than baseline', async () => {
      const start = performance.now();
      const slowdowns = await PerformanceQueries.detectSlowdown(ks);
      const duration = performance.now() - start;

      expect(slowdowns).toBeDefined();
      expect(Array.isArray(slowdowns)).toBe(true);

      if (slowdowns.length > 0) {
        expect(slowdowns[0]).toHaveProperty('operation');
        expect(slowdowns[0]).toHaveProperty('currentAvg');
        expect(slowdowns[0]).toHaveProperty('historicalAvg');
        expect(slowdowns[0]).toHaveProperty('slowdown');
        expect(slowdowns[0].currentAvg).toBeGreaterThan(slowdowns[0].historicalAvg);
      }

      // Performance assertion
      expect(duration).toBeLessThan(100);
    });

    it('should respect custom threshold', async () => {
      const slowdowns = await PerformanceQueries.detectSlowdown(ks, 0.20);

      expect(slowdowns).toBeDefined();
      if (slowdowns.length > 0) {
        expect(slowdowns[0].slowdown).toBeGreaterThan(20);
      }
    });
  });

  // ========================================================================
  // Correlation Discovery Tests
  // ========================================================================

  describe('findCorrelatedOperations', () => {
    it('should discover correlated operation pairs', async () => {
      const start = performance.now();
      const correlations = await PerformanceQueries.findCorrelatedOperations(ks);
      const duration = performance.now() - start;

      expect(correlations).toBeDefined();
      expect(Array.isArray(correlations)).toBe(true);

      if (correlations.length > 0) {
        expect(correlations[0]).toHaveProperty('operation1');
        expect(correlations[0]).toHaveProperty('operation2');
        expect(correlations[0]).toHaveProperty('correlation');
        expect(correlations[0]).toHaveProperty('metric');
        expect(Math.abs(correlations[0].correlation)).toBeGreaterThanOrEqual(0.7); // Default threshold
      }

      // Performance assertion
      expect(duration).toBeLessThan(100);
    });

    it('should respect custom correlation threshold', async () => {
      const correlations = await PerformanceQueries.findCorrelatedOperations(ks, {
        minCorrelation: 0.85
      });

      expect(correlations).toBeDefined();
      if (correlations.length > 0) {
        expect(Math.abs(correlations[0].correlation)).toBeGreaterThanOrEqual(0.85);
      }
    });
  });

  // ========================================================================
  // Resource Chain Impact Tests
  // ========================================================================

  describe('getResourceChainImpact', () => {
    it('should analyze impact chain for specific operation', async () => {
      const start = performance.now();
      const chain = await PerformanceQueries.getResourceChainImpact(ks, 'git-lock-acquire');
      const duration = performance.now() - start;

      expect(chain).toBeDefined();
      expect(Array.isArray(chain)).toBe(true);

      if (chain.length > 0) {
        expect(chain[0]).toHaveProperty('operation');
        expect(chain[0]).toHaveProperty('correlation');
        expect(chain[0]).toHaveProperty('impact');
        expect(['high', 'medium', 'low']).toContain(chain[0].impact);
      }

      // Performance assertion
      expect(duration).toBeLessThan(100);
    });

    it('should return top impactful operations when no operation specified', async () => {
      const chain = await PerformanceQueries.getResourceChainImpact(ks);

      expect(chain).toBeDefined();
      expect(Array.isArray(chain)).toBe(true);

      if (chain.length > 0) {
        expect(chain[0]).toHaveProperty('operation');
        expect(chain[0]).toHaveProperty('impactedOperations');
        expect(chain[0]).toHaveProperty('avgCorrelation');
      }
    });
  });

  // ========================================================================
  // Trend Analysis Tests
  // ========================================================================

  describe('getTrendLine', () => {
    it('should calculate performance trend for operation', async () => {
      const start = performance.now();
      const trend = await PerformanceQueries.getTrendLine(ks, 'sparql-query', 30);
      const duration = performance.now() - start;

      if (trend) {
        expect(trend).toHaveProperty('operation');
        expect(trend).toHaveProperty('slope');
        expect(trend).toHaveProperty('direction');
        expect(trend).toHaveProperty('dataPoints');
        expect(['improving', 'stable', 'degrading']).toContain(trend.direction);
      }

      // Performance assertion
      expect(duration).toBeLessThan(100);
    });

    it('should respect custom days parameter', async () => {
      const trend = await PerformanceQueries.getTrendLine(ks, 'sparql-query', 90);

      // Test should not throw
      expect(trend === null || typeof trend === 'object').toBe(true);
    });
  });

  // ========================================================================
  // Peak Usage Times Tests
  // ========================================================================

  describe('getPeakUsageTimes', () => {
    it('should identify peak usage windows', async () => {
      const start = performance.now();
      const peaks = await PerformanceQueries.getPeakUsageTimes(ks);
      const duration = performance.now() - start;

      expect(peaks).toBeDefined();
      expect(Array.isArray(peaks)).toBe(true);

      if (peaks.length > 0) {
        expect(peaks[0]).toHaveProperty('hour');
        expect(peaks[0]).toHaveProperty('dayOfWeek');
        expect(peaks[0]).toHaveProperty('avgOperations');
        expect(peaks[0].hour).toBeGreaterThanOrEqual(0);
        expect(peaks[0].hour).toBeLessThan(24);
      }

      // Performance assertion
      expect(duration).toBeLessThan(100);
    });
  });

  // ========================================================================
  // Optimization Opportunities Tests
  // ========================================================================

  describe('getOptimizationOpportunities', () => {
    it('should identify optimization opportunities', async () => {
      const start = performance.now();
      const opportunities = await PerformanceQueries.getOptimizationOpportunities(ks);
      const duration = performance.now() - start;

      expect(opportunities).toBeDefined();
      expect(Array.isArray(opportunities)).toBe(true);

      if (opportunities.length > 0) {
        expect(opportunities[0]).toHaveProperty('operation');
        expect(opportunities[0]).toHaveProperty('score');
        expect(opportunities[0]).toHaveProperty('frequency');
        expect(opportunities[0]).toHaveProperty('avgDuration');
        expect(opportunities[0]).toHaveProperty('potentialSavings');
        expect(opportunities[0]).toHaveProperty('reason');
        expect(opportunities[0].score).toBeGreaterThan(0);
        expect(opportunities[0].score).toBeLessThanOrEqual(100);
      }

      // Performance assertion
      expect(duration).toBeLessThan(100);
    });

    it('should sort by optimization score descending', async () => {
      const opportunities = await PerformanceQueries.getOptimizationOpportunities(ks);

      if (opportunities.length > 1) {
        expect(opportunities[0].score).toBeGreaterThanOrEqual(opportunities[1].score);
      }
    });
  });

  // ========================================================================
  // Parallelizable Operations Tests
  // ========================================================================

  describe('findParallelizableOps', () => {
    it('should identify operations suitable for parallelization', async () => {
      const start = performance.now();
      const parallelizable = await PerformanceQueries.findParallelizableOps(ks);
      const duration = performance.now() - start;

      expect(parallelizable).toBeDefined();
      expect(Array.isArray(parallelizable)).toBe(true);

      if (parallelizable.length > 0) {
        expect(parallelizable[0]).toHaveProperty('operation');
        expect(parallelizable[0]).toHaveProperty('avgCpu');
        expect(parallelizable[0]).toHaveProperty('parallelizationPotential');
        expect(['high', 'medium', 'low']).toContain(parallelizable[0].parallelizationPotential);
        expect(parallelizable[0].avgCpu).toBeLessThan(40); // Default threshold
      }

      // Performance assertion
      expect(duration).toBeLessThan(100);
    });
  });

  // ========================================================================
  // Operation Statistics Tests
  // ========================================================================

  describe('getOperationStats', () => {
    it('should return comprehensive stats for operation', async () => {
      const start = performance.now();
      const stats = await PerformanceQueries.getOperationStats(ks, 'sparql-query');
      const duration = performance.now() - start;

      if (stats) {
        expect(stats).toHaveProperty('operation');
        expect(stats).toHaveProperty('count');
        expect(stats).toHaveProperty('duration');
        expect(stats.duration).toHaveProperty('mean');
        expect(stats.duration).toHaveProperty('median');
        expect(stats.duration).toHaveProperty('p95');
        expect(stats.duration).toHaveProperty('p99');
        expect(stats.duration).toHaveProperty('min');
        expect(stats.duration).toHaveProperty('max');
        expect(stats.duration).toHaveProperty('stddev');
      }

      // Performance assertion
      expect(duration).toBeLessThan(100);
    });
  });

  // ========================================================================
  // System Statistics Tests
  // ========================================================================

  describe('getSystemStats', () => {
    it('should return overall system health metrics', async () => {
      const start = performance.now();
      const stats = await PerformanceQueries.getSystemStats(ks);
      const duration = performance.now() - start;

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('totalMeasurements');
      expect(stats.totalMeasurements).toBeGreaterThanOrEqual(0);

      if (stats.totalMeasurements > 0) {
        expect(stats).toHaveProperty('uniqueOperations');
        expect(stats).toHaveProperty('avgDuration');
        expect(stats).toHaveProperty('errorRate');
      }

      // Performance assertion
      expect(duration).toBeLessThan(100);
    });
  });

  // ========================================================================
  // Capacity Analysis Tests
  // ========================================================================

  describe('getCapacityAnalysis', () => {
    it('should analyze resource utilization trends', async () => {
      const start = performance.now();
      const capacity = await PerformanceQueries.getCapacityAnalysis(ks);
      const duration = performance.now() - start;

      expect(capacity).toBeDefined();
      expect(capacity).toHaveProperty('utilizationTrend');
      expect(['increasing', 'stable', 'decreasing', 'insufficient_data', 'error'])
        .toContain(capacity.utilizationTrend);

      if (capacity.utilizationTrend !== 'insufficient_data') {
        expect(capacity).toHaveProperty('avgUtilization');
        expect(capacity).toHaveProperty('headroom');
      }

      // Performance assertion
      expect(duration).toBeLessThan(100);
    });
  });

  // ========================================================================
  // Integration Tests
  // ========================================================================

  describe('Integration Tests', () => {
    it('should handle empty knowledge substrate gracefully', async () => {
      const emptyKs = createKnowledgeSubstrateCore();
      const violations = await PerformanceQueries.detectBudgetViolations(emptyKs);

      expect(violations).toBeDefined();
      expect(Array.isArray(violations)).toBe(true);
      expect(violations.length).toBe(0);
    });

    it('should handle malformed queries gracefully', async () => {
      // Should not throw, should return empty array
      const result = await PerformanceQueries.detectBudgetViolations(ks, {
        operation: undefined
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should maintain performance under load', async () => {
      // Run multiple queries in parallel
      const promises = [
        PerformanceQueries.detectBudgetViolations(ks),
        PerformanceQueries.detectCpuSpikes(ks),
        PerformanceQueries.detectIoBoundness(ks),
        PerformanceQueries.getSystemStats(ks),
        PerformanceQueries.getOptimizationOpportunities(ks)
      ];

      const start = performance.now();
      const results = await Promise.all(promises);
      const duration = performance.now() - start;

      expect(results.every(r => r !== undefined)).toBe(true);
      // All 5 queries should complete in <200ms total
      expect(duration).toBeLessThan(200);
    });
  });
});

/**
 * Create mock knowledge substrate for testing without UnRDF
 */
function createMockKnowledgeSubstrate() {
  // Create sample data
  const mockMeasurements = [];
  const now = new Date();

  for (let i = 0; i < 50; i++) {
    const op = ['sparql-query', 'git-commit', 'workflow-exec', 'template-render'][i % 4];
    const timestamp = new Date(now.getTime() - (50 - i) * 3600000);
    const duration = 50 + Math.random() * 200 + (i > 40 ? 100 : 0);
    const memory = 200000 + Math.random() * 500000 + (i * 1000);
    const cpu = 20 + Math.random() * 60;

    mockMeasurements.push({
      measurementId: { value: `meas-${i}` },
      operation: { value: op },
      duration: { value: duration.toString() },
      memoryUsed: { value: Math.floor(memory).toString() },
      cpuPercent: { value: cpu.toFixed(2) },
      diskIO: { value: Math.floor(Math.random() * 1000000).toString() },
      timestamp: { value: timestamp.toISOString() },
      success: { value: (Math.random() > 0.05).toString() }
    });
  }

  // Mock query function that returns sample data
  return {
    async query(sparql) {
      // Parse SPARQL to determine what type of query
      if (sparql.includes('perf:maxDuration') && sparql.includes('BudgetViolation')) {
        // Budget violations query
        return {
          results: mockMeasurements.slice(0, 5).map((m, i) => ({
            measurementId: m.measurementId,
            operation: m.operation,
            duration: { value: (parseFloat(m.duration.value) + 50).toString() },
            budget: { value: '150.0' },
            timestamp: m.timestamp,
            excess: { value: ((parseFloat(m.duration.value) + 50) - 150).toString() }
          }))
        };
      }

      if (sparql.includes('cpuPercent') && sparql.includes('greaterThan')) {
        // CPU spikes query
        return {
          results: mockMeasurements.filter(m => parseFloat(m.cpuPercent.value) > 80).slice(0, 5)
        };
      }

      if (sparql.includes('memoryUsed') && sparql.includes('GROUP BY')) {
        // Memory leak or I/O bound query
        return {
          results: [
            {
              operation: { value: 'workflow-exec' },
              measurements: { value: '10' },
              avgMemory: { value: '450000' },
              totalIncrease: { value: '50000' }
            }
          ]
        };
      }

      if (sparql.includes('perf:Correlation')) {
        // Correlations query
        return {
          results: [
            {
              operation1: { value: 'git-commit' },
              operation2: { value: 'snapshot-save' },
              correlation: { value: '0.85' },
              metric: { value: 'duration' }
            }
          ]
        };
      }

      if (sparql.includes('COUNT') && sparql.includes('totalMeasurements')) {
        // System stats query
        return {
          results: [
            {
              totalMeasurements: { value: '50' },
              uniqueOperations: { value: '8' },
              avgDuration: { value: '125.5' },
              avgMemory: { value: '450000' },
              avgCpu: { value: '45.2' },
              errorCount: { value: '3' }
            }
          ]
        };
      }

      if (sparql.includes('perf:Anomaly')) {
        // Anomaly count query
        return {
          results: [
            {
              anomalyCount: { value: '12' }
            }
          ]
        };
      }

      if (sparql.includes('ORDER BY ?duration')) {
        // Operation stats query
        return {
          results: mockMeasurements.filter(m => m.operation.value === 'sparql-query')
        };
      }

      // Default: return all measurements
      return {
        results: mockMeasurements
      };
    }
  };
}

/**
 * Generate test data in Turtle format
 * Creates realistic performance measurements, budgets, and anomalies
 */
function generateTestData() {
  const now = new Date();
  const measurements = [];
  const budgets = [];
  const statistics = [];
  const correlations = [];
  const trends = [];

  // Generate 50 measurements across different operations
  const operations = [
    'sparql-query', 'git-commit', 'workflow-exec', 'template-render',
    'snapshot-save', 'lock-acquire', 'git-merge', 'cache-lookup'
  ];

  for (let i = 0; i < 50; i++) {
    const op = operations[i % operations.length];
    const timestamp = new Date(now.getTime() - (50 - i) * 3600000); // Spread over 50 hours

    // Vary performance metrics
    const duration = 50 + Math.random() * 200 + (i > 40 ? 100 : 0); // Last 10 are slower
    const memory = 200000 + Math.random() * 500000 + (i * 1000); // Gradual increase
    const cpu = 20 + Math.random() * 60;
    const diskIO = Math.random() * 1000000;
    const success = Math.random() > 0.05; // 95% success rate

    measurements.push(`
      :measurement-${i} a perf:Measurement ;
        perf:measurementId "meas-${i}" ;
        perf:operation "${op}" ;
        perf:duration ${duration.toFixed(2)} ;
        perf:memoryUsed ${Math.floor(memory)} ;
        perf:cpuPercent ${cpu.toFixed(2)} ;
        perf:diskIO ${Math.floor(diskIO)} ;
        perf:timestamp "${timestamp.toISOString()}"^^xsd:dateTime ;
        perf:success ${success} ;
        perf:contextData "{\\"test\\": true}" .
    `);
  }

  // Generate budgets
  operations.forEach(op => {
    budgets.push(`
      :budget-${op} a perf:PerformanceBudget ;
        perf:forOperation "${op}" ;
        perf:maxDuration 150.0 ;
        perf:maxMemory 1000000 ;
        perf:maxCPU 80.0 ;
        perf:budgetEnabled true ;
        perf:alertOnViolation true .
    `);
  });

  // Generate statistics
  operations.forEach(op => {
    statistics.push(`
      :stats-${op} a perf:Statistics ;
        perf:operation "${op}" ;
        perf:count 50 ;
        perf:mean 125.5 ;
        perf:median 115.2 ;
        perf:stddev 35.8 ;
        perf:p50 115.2 ;
        perf:p95 185.3 ;
        perf:p99 210.5 ;
        perf:min 50.1 ;
        perf:max 250.8 .
    `);
  });

  // Generate correlations
  correlations.push(`
    :corr-1 a perf:Correlation ;
      perf:operation1 "git-commit" ;
      perf:operation2 "snapshot-save" ;
      perf:correlationCoefficient 0.85 ;
      perf:metric "duration" .

    :corr-2 a perf:Correlation ;
      perf:operation1 "lock-acquire" ;
      perf:operation2 "git-commit" ;
      perf:correlationCoefficient 0.92 ;
      perf:metric "duration" .
  `);

  // Generate trends
  trends.push(`
    :trend-1 a perf:Trend ;
      perf:trendId "trend-sparql" ;
      perf:operation "sparql-query" ;
      perf:startDate "${new Date(now.getTime() - 30 * 86400000).toISOString()}"^^xsd:dateTime ;
      perf:endDate "${now.toISOString()}"^^xsd:dateTime ;
      perf:slope 0.08 ;
      perf:direction "degrading" .
  `);

  return `
    @prefix : <http://example.com/test#> .
    @prefix perf: <https://gitvan.dev/performance#> .
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

    ${measurements.join('\n')}
    ${budgets.join('\n')}
    ${statistics.join('\n')}
    ${correlations.join('\n')}
    ${trends.join('\n')}
  `;
}
