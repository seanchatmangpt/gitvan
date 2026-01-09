/**
 * @fileoverview GitVan Performance Queries - Main Entry Point
 *
 * Re-exports all performance analysis query functions for backwards compatibility.
 * Internally splits into focused modules for better maintainability:
 * - anomaly-detection.mjs: Budget violations, memory leaks, CPU spikes
 * - regression-analysis.mjs: Performance regressions, I/O-bound operations
 * - correlation-analysis.mjs: Operation correlations and impact chains
 * - trend-analysis.mjs: Trend lines and peak usage patterns
 * - optimization.mjs: Optimization opportunities and parallelization
 * - statistics.mjs: Comprehensive statistics and capacity analysis
 * - query-helpers.mjs: Utility functions and calculations
 *
 * @version 1.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

// Import all functions from specialized modules
import {
  detectBudgetViolations,
  detectMemoryLeaks,
  detectCpuSpikes,
  detectSlowdown
} from './anomaly-detection.mjs';

import {
  getPerformanceRegression,
  detectIoBoundness
} from './regression-analysis.mjs';

import {
  findCorrelatedOperations,
  getResourceChainImpact
} from './correlation-analysis.mjs';

import {
  getTrendLine,
  getPeakUsageTimes
} from './trend-analysis.mjs';

import {
  getOptimizationOpportunities,
  findParallelizableOps
} from './optimization.mjs';

import {
  getOperationStats,
  getSystemStats,
  getCapacityAnalysis
} from './statistics.mjs';

/**
 * Performance Queries Collection
 *
 * Unified interface providing access to all performance analysis queries.
 * All queries accept a KnowledgeSubstrate instance and return Promise<Array>.
 */
export const PerformanceQueries = {
  // Anomaly Detection
  detectBudgetViolations,
  detectMemoryLeaks,
  detectCpuSpikes,
  detectSlowdown,

  // Regression Analysis
  getPerformanceRegression,
  detectIoBoundness,

  // Correlation Analysis
  findCorrelatedOperations,
  getResourceChainImpact,

  // Trend Analysis
  getTrendLine,
  getPeakUsageTimes,

  // Optimization
  getOptimizationOpportunities,
  findParallelizableOps,

  // Statistics
  getOperationStats,
  getSystemStats,
  getCapacityAnalysis
};

export default PerformanceQueries;

// Also export individual functions for modular usage
export {
  detectBudgetViolations,
  detectMemoryLeaks,
  detectCpuSpikes,
  detectSlowdown,
  getPerformanceRegression,
  detectIoBoundness,
  findCorrelatedOperations,
  getResourceChainImpact,
  getTrendLine,
  getPeakUsageTimes,
  getOptimizationOpportunities,
  findParallelizableOps,
  getOperationStats,
  getSystemStats,
  getCapacityAnalysis
};
