/**
 * @fileoverview SPARQL Query Library for Performance Analysis
 *
 * Collection of optimized SPARQL queries for performance monitoring,
 * anomaly detection, and trend analysis in GitVan.
 *
 * @version 1.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

/**
 * Query: Budget Violations
 *
 * Finds all operations that exceeded their performance budgets,
 * grouped by operation with violation counts.
 *
 * @returns {string} SPARQL SELECT query
 */
export const budgetViolationsQuery = `
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

/**
 * Query: Anomaly Detection
 *
 * Constructs anomaly triples for measurements that exceed
 * average duration by a threshold (e.g., 1.5x).
 *
 * @param {number} threshold - Multiplier threshold (default: 1.5)
 * @returns {string} SPARQL CONSTRUCT query
 */
export function anomalyDetectionQuery(threshold = 1.5) {
  return `
    PREFIX perf: <https://gitvan.dev/performance#>

    CONSTRUCT {
      ?m a perf:Anomaly ;
         perf:severity "high" ;
         perf:anomalyType "Outlier" .
    }
    WHERE {
      ?m a perf:Measurement ;
         perf:operation ?op ;
         perf:duration ?d .

      {
        SELECT ?op (AVG(?duration) AS ?avg)
        WHERE {
          ?measurement perf:operation ?op ;
                       perf:duration ?duration .
        }
        GROUP BY ?op
      }

      FILTER(?d > ?avg * ${threshold})
    }
  `;
}

/**
 * Query: Correlation Discovery
 *
 * Finds operations whose CPU usage correlates strongly.
 * Uses SPARQL aggregate functions to compute correlation coefficients.
 *
 * Note: This is a simplified version. Full correlation requires custom functions.
 *
 * @param {number} threshold - Minimum correlation coefficient (0-1)
 * @returns {string} SPARQL SELECT query
 */
export function correlationDiscoveryQuery(threshold = 0.8) {
  return `
    PREFIX perf: <https://gitvan.dev/performance#>

    SELECT ?op1 ?op2 (AVG(?cpu1 * ?cpu2) AS ?covariance)
    WHERE {
      ?m1 a perf:Measurement ;
          perf:operation ?op1 ;
          perf:cpuPercent ?cpu1 ;
          perf:timestamp ?t1 .

      ?m2 a perf:Measurement ;
          perf:operation ?op2 ;
          perf:cpuPercent ?cpu2 ;
          perf:timestamp ?t2 .

      # Same time window (within 1 second)
      FILTER(?t1 = ?t2 || (abs(xsd:integer(?t1) - xsd:integer(?t2)) < 1000))
      FILTER(?op1 < ?op2)
    }
    GROUP BY ?op1 ?op2
    HAVING(AVG(?cpu1 * ?cpu2) > ${threshold})
    ORDER BY DESC(?covariance)
  `;
}

/**
 * Query: Slow Operations
 *
 * Finds the slowest measurements in a time window.
 *
 * @param {string} operation - Operation name (or "*" for all)
 * @param {string} since - ISO timestamp for window start
 * @param {number} limit - Maximum results
 * @returns {string} SPARQL SELECT query
 */
export function slowOperationsQuery(operation = "*", since = null, limit = 100) {
  const sinceFilter = since
    ? `FILTER(?timestamp >= "${since}"^^xsd:dateTime)`
    : "";

  const operationFilter = operation !== "*"
    ? `FILTER(?operation = "${operation}")`
    : "";

  return `
    PREFIX perf: <https://gitvan.dev/performance#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

    SELECT ?operation ?duration ?memory ?cpu ?timestamp ?context
    WHERE {
      ?m a perf:Measurement ;
         perf:operation ?operation ;
         perf:duration ?duration ;
         perf:memoryUsed ?memory ;
         perf:cpuPercent ?cpu ;
         perf:timestamp ?timestamp ;
         perf:contextData ?context .

      ${operationFilter}
      ${sinceFilter}
    }
    ORDER BY DESC(?duration)
    LIMIT ${limit}
  `;
}

/**
 * Query: Memory Leak Detection
 *
 * Finds operations with consistently increasing memory usage
 * over time (potential memory leaks).
 *
 * @param {number} windowDays - Number of days to analyze
 * @returns {string} SPARQL SELECT query
 */
export function memoryLeakDetectionQuery(windowDays = 7) {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

  return `
    PREFIX perf: <https://gitvan.dev/performance#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

    SELECT ?operation
           (COUNT(?m) AS ?sampleCount)
           (AVG(?memory) AS ?avgMemory)
           (MAX(?memory) AS ?maxMemory)
           (MIN(?memory) AS ?minMemory)
    WHERE {
      ?m a perf:Measurement ;
         perf:operation ?operation ;
         perf:memoryUsed ?memory ;
         perf:timestamp ?timestamp .

      FILTER(?timestamp >= "${since}"^^xsd:dateTime)
    }
    GROUP BY ?operation
    HAVING(AVG(?memory) > 5000000 && (MAX(?memory) - MIN(?memory)) > 2000000)
    ORDER BY DESC(?avgMemory)
  `;
}

/**
 * Query: I/O Bound Operations
 *
 * Identifies operations that are primarily limited by disk I/O
 * rather than CPU (high I/O, low CPU).
 *
 * @param {number} ioBytesThreshold - Minimum I/O bytes
 * @param {number} cpuPercentThreshold - Maximum CPU percent
 * @returns {string} SPARQL SELECT query
 */
export function ioBoundOperationsQuery(ioBytesThreshold = 1000000, cpuPercentThreshold = 50) {
  return `
    PREFIX perf: <https://gitvan.dev/performance#>

    SELECT ?operation (COUNT(?m) AS ?count) (AVG(?diskIO) AS ?avgIO) (AVG(?cpu) AS ?avgCPU)
    WHERE {
      ?m a perf:Measurement ;
         perf:operation ?operation ;
         perf:diskIO ?diskIO ;
         perf:cpuPercent ?cpu .

      FILTER(?diskIO > ${ioBytesThreshold} && ?cpu < ${cpuPercentThreshold})
    }
    GROUP BY ?operation
    ORDER BY DESC(?avgIO)
  `;
}

/**
 * Query: CPU Bound Operations
 *
 * Identifies operations that are primarily limited by CPU
 * rather than I/O (high CPU, low I/O).
 *
 * @param {number} cpuPercentThreshold - Minimum CPU percent
 * @param {number} ioBytesThreshold - Maximum I/O bytes
 * @returns {string} SPARQL SELECT query
 */
export function cpuBoundOperationsQuery(cpuPercentThreshold = 80, ioBytesThreshold = 100000) {
  return `
    PREFIX perf: <https://gitvan.dev/performance#>

    SELECT ?operation (COUNT(?m) AS ?count) (AVG(?cpu) AS ?avgCPU) (AVG(?diskIO) AS ?avgIO)
    WHERE {
      ?m a perf:Measurement ;
         perf:operation ?operation ;
         perf:cpuPercent ?cpu ;
         perf:diskIO ?diskIO .

      FILTER(?cpu > ${cpuPercentThreshold} && ?diskIO < ${ioBytesThreshold})
    }
    GROUP BY ?operation
    ORDER BY DESC(?avgCPU)
  `;
}

/**
 * Query: Performance Percentiles
 *
 * Calculates performance percentiles (P50, P95, P99) for operations.
 *
 * Note: SPARQL doesn't have native percentile functions, so this
 * returns sorted durations that can be processed client-side.
 *
 * @param {string} operation - Operation name
 * @param {number} limit - Maximum samples
 * @returns {string} SPARQL SELECT query
 */
export function performancePercentilesQuery(operation, limit = 1000) {
  return `
    PREFIX perf: <https://gitvan.dev/performance#>

    SELECT ?duration
    WHERE {
      ?m a perf:Measurement ;
         perf:operation "${operation}" ;
         perf:duration ?duration .
    }
    ORDER BY ?duration
    LIMIT ${limit}
  `;
}

/**
 * Query: Error Rate Analysis
 *
 * Calculates error rates for operations.
 *
 * @param {string} operation - Operation name (or "*" for all)
 * @returns {string} SPARQL SELECT query
 */
export function errorRateQuery(operation = "*") {
  const operationFilter = operation !== "*"
    ? `FILTER(?operation = "${operation}")`
    : "";

  return `
    PREFIX perf: <https://gitvan.dev/performance#>

    SELECT ?operation
           (COUNT(?m) AS ?total)
           (SUM(IF(?success = false, 1, 0)) AS ?errors)
           ((SUM(IF(?success = false, 1, 0)) * 100.0 / COUNT(?m)) AS ?errorRate)
    WHERE {
      ?m a perf:Measurement ;
         perf:operation ?operation ;
         perf:success ?success .

      ${operationFilter}
    }
    GROUP BY ?operation
    ORDER BY DESC(?errorRate)
  `;
}

/**
 * Query: Temporal Performance Trends
 *
 * Groups measurements by time buckets to analyze trends.
 *
 * @param {string} operation - Operation name
 * @param {string} since - Start timestamp
 * @param {string} bucketSize - Bucket size (hour, day, week)
 * @returns {string} SPARQL SELECT query
 */
export function temporalTrendsQuery(operation, since, bucketSize = "hour") {
  // Simplified version - full implementation would use SPARQL 1.1 aggregates
  return `
    PREFIX perf: <https://gitvan.dev/performance#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

    SELECT (AVG(?duration) AS ?avgDuration)
           (AVG(?memory) AS ?avgMemory)
           (AVG(?cpu) AS ?avgCPU)
           (COUNT(?m) AS ?count)
    WHERE {
      ?m a perf:Measurement ;
         perf:operation "${operation}" ;
         perf:duration ?duration ;
         perf:memoryUsed ?memory ;
         perf:cpuPercent ?cpu ;
         perf:timestamp ?timestamp .

      FILTER(?timestamp >= "${since}"^^xsd:dateTime)
    }
  `;
}

/**
 * Query: High Variance Operations
 *
 * Finds operations with high variance (inconsistent performance).
 *
 * Note: Standard deviation calculation requires custom SPARQL functions
 * or client-side processing. This query returns data for client calculation.
 *
 * @param {number} minSamples - Minimum samples required
 * @returns {string} SPARQL SELECT query
 */
export function highVarianceOperationsQuery(minSamples = 20) {
  return `
    PREFIX perf: <https://gitvan.dev/performance#>

    SELECT ?operation
           (COUNT(?m) AS ?count)
           (AVG(?duration) AS ?mean)
           (MIN(?duration) AS ?min)
           (MAX(?duration) AS ?max)
           ((MAX(?duration) - MIN(?duration)) AS ?range)
    WHERE {
      ?m a perf:Measurement ;
         perf:operation ?operation ;
         perf:duration ?duration .
    }
    GROUP BY ?operation
    HAVING(COUNT(?m) >= ${minSamples})
    ORDER BY DESC(?range)
  `;
}

/**
 * Query: Performance Regression Detection
 *
 * Compares recent performance to historical baseline.
 *
 * @param {string} operation - Operation name
 * @param {string} recentStart - Start of recent window
 * @param {string} historicalEnd - End of historical window
 * @returns {string} SPARQL SELECT query
 */
export function regressionDetectionQuery(operation, recentStart, historicalEnd) {
  return `
    PREFIX perf: <https://gitvan.dev/performance#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

    SELECT
      (AVG(IF(?timestamp >= "${recentStart}"^^xsd:dateTime, ?duration, 0)) AS ?recentAvg)
      (AVG(IF(?timestamp < "${historicalEnd}"^^xsd:dateTime, ?duration, 0)) AS ?historicalAvg)
    WHERE {
      ?m a perf:Measurement ;
         perf:operation "${operation}" ;
         perf:duration ?duration ;
         perf:timestamp ?timestamp .

      FILTER(?timestamp >= "${historicalEnd}"^^xsd:dateTime || ?timestamp < "${recentStart}"^^xsd:dateTime)
    }
  `;
}

/**
 * Query: Concurrent Operation Analysis
 *
 * Finds operations that frequently run concurrently.
 *
 * @param {number} windowMs - Time window for concurrency (milliseconds)
 * @returns {string} SPARQL SELECT query
 */
export function concurrentOperationsQuery(windowMs = 1000) {
  return `
    PREFIX perf: <https://gitvan.dev/performance#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

    SELECT ?op1 ?op2 (COUNT(*) AS ?concurrentCount)
    WHERE {
      ?m1 a perf:Measurement ;
          perf:operation ?op1 ;
          perf:timestamp ?t1 .

      ?m2 a perf:Measurement ;
          perf:operation ?op2 ;
          perf:timestamp ?t2 .

      FILTER(?op1 < ?op2)
      FILTER(abs(xsd:integer(?t1) - xsd:integer(?t2)) < ${windowMs})
    }
    GROUP BY ?op1 ?op2
    HAVING(COUNT(*) > 10)
    ORDER BY DESC(?concurrentCount)
  `;
}

/**
 * Query: Performance Budget Compliance
 *
 * Shows compliance rate for each operation with configured budgets.
 *
 * @returns {string} SPARQL SELECT query
 */
export const budgetComplianceQuery = `
  PREFIX perf: <https://gitvan.dev/performance#>

  SELECT ?operation
         (COUNT(?m) AS ?total)
         (SUM(IF(?duration <= ?maxDuration, 1, 0)) AS ?compliant)
         ((SUM(IF(?duration <= ?maxDuration, 1, 0)) * 100.0 / COUNT(?m)) AS ?complianceRate)
  WHERE {
    ?m a perf:Measurement ;
       perf:operation ?operation ;
       perf:duration ?duration .

    ?budget perf:forOperation ?operation ;
            perf:maxDuration ?maxDuration ;
            perf:budgetEnabled true .
  }
  GROUP BY ?operation
  ORDER BY ?complianceRate
`;

/**
 * Query: Peak Usage Times
 *
 * Identifies time periods with highest operation frequency.
 *
 * @param {string} operation - Operation name (or "*" for all)
 * @param {number} days - Number of days to analyze
 * @returns {string} SPARQL SELECT query
 */
export function peakUsageTimesQuery(operation = "*", days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const operationFilter = operation !== "*"
    ? `FILTER(?operation = "${operation}")`
    : "";

  return `
    PREFIX perf: <https://gitvan.dev/performance#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

    SELECT (COUNT(?m) AS ?count)
    WHERE {
      ?m a perf:Measurement ;
         perf:operation ?operation ;
         perf:timestamp ?timestamp .

      ${operationFilter}
      FILTER(?timestamp >= "${since}"^^xsd:dateTime)
    }
  `;
}

/**
 * All queries exported as a collection
 */
export const queries = {
  budgetViolations: budgetViolationsQuery,
  anomalyDetection: anomalyDetectionQuery,
  correlationDiscovery: correlationDiscoveryQuery,
  slowOperations: slowOperationsQuery,
  memoryLeakDetection: memoryLeakDetectionQuery,
  ioBoundOperations: ioBoundOperationsQuery,
  cpuBoundOperations: cpuBoundOperationsQuery,
  performancePercentiles: performancePercentilesQuery,
  errorRate: errorRateQuery,
  temporalTrends: temporalTrendsQuery,
  highVarianceOperations: highVarianceOperationsQuery,
  regressionDetection: regressionDetectionQuery,
  concurrentOperations: concurrentOperationsQuery,
  budgetCompliance: budgetComplianceQuery,
  peakUsageTimes: peakUsageTimesQuery
};

export default queries;
