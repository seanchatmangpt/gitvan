import { createLogger } from "../utils/logger.mjs";

const logger = createLogger("performance:analytics-engine");

/**
 * @fileoverview Advanced Analytics Engine for Performance Metrics
 *
 * Provides statistical analysis capabilities:
 * - Moving window analysis for trend detection
 * - Change point detection (CUSUM algorithm)
 * - Anomaly scoring with multiple methods
 * - Correlation analysis
 * - Trend forecasting
 *
 * @version 1.0.0
 */

/**
 * Statistical utilities
 */
export class StatisticalAnalyzer {
  /**
   * Calculate mean (average)
   */
  static mean(values) {
    if (!values || values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate median
   */
  static median(values) {
    if (!values || values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Calculate standard deviation
   */
  static stddev(values, mean = null) {
    if (!values || values.length === 0) return 0;
    const m = mean !== null ? mean : this.mean(values);
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) /
      values.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate percentile
   */
  static percentile(values, p) {
    if (!values || values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Calculate IQR (Interquartile Range)
   */
  static iqr(values) {
    if (!values || values.length < 4) return 0;
    const q1 = this.percentile(values, 25);
    const q3 = this.percentile(values, 75);
    return q3 - q1;
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  static pearsonCorrelation(x, y) {
    if (!x || !y || x.length !== y.length || x.length < 2) return 0;

    const n = x.length;
    const meanX = this.mean(x);
    const meanY = this.mean(y);

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

    const denom = Math.sqrt(denomX * denomY);
    if (denom === 0) return 0;

    return numerator / denom;
  }

  /**
   * Fit linear trend (least squares)
   */
  static linearTrend(values) {
    if (!values || values.length < 2) return { slope: 0, intercept: 0 };

    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const meanX = this.mean(x);
    const meanY = this.mean(values);

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (x[i] - meanX) * (values[i] - meanY);
      denominator += (x[i] - meanX) * (x[i] - meanX);
    }

    const slope = denominator === 0 ? 0 : numerator / denominator;
    const intercept = meanY - slope * meanX;

    return { slope, intercept };
  }

  /**
   * Calculate Z-scores for outlier detection
   */
  static zScores(values) {
    const mean = this.mean(values);
    const stddev = this.stddev(values, mean);

    if (stddev === 0) {
      return values.map((v) => (v === mean ? 0 : Infinity));
    }

    return values.map((v) => Math.abs((v - mean) / stddev));
  }
}

/**
 * Moving Window Analyzer
 */
export class MovingWindowAnalyzer {
  /**
   * Calculate moving statistics
   */
  static analyzeWindows(measurements, windowSize = 20) {
    if (!measurements || measurements.length < windowSize) {
      return [];
    }

    const windows = [];

    for (let i = 0; i <= measurements.length - windowSize; i++) {
      const window = measurements.slice(i, i + windowSize);

      windows.push({
        index: i,
        startValue: window[0],
        endValue: window[window.length - 1],
        mean: StatisticalAnalyzer.mean(window),
        median: StatisticalAnalyzer.median(window),
        stddev: StatisticalAnalyzer.stddev(window),
        min: Math.min(...window),
        max: Math.max(...window),
        range: Math.max(...window) - Math.min(...window),
        values: window
      });
    }

    return windows;
  }

  /**
   * Detect anomalies in moving windows
   */
  static detectAnomalies(windows, threshold = 2.0) {
    const anomalies = [];

    for (let i = 1; i < windows.length; i++) {
      const prev = windows[i - 1];
      const curr = windows[i];

      // Mean shift detection
      if (Math.abs(curr.mean - prev.mean) > threshold * prev.stddev) {
        const direction = curr.mean > prev.mean ? "degradation" : "improvement";
        anomalies.push({
          type: "MeanShift",
          index: i,
          severity: "high",
          direction,
          description: `Mean shifted from ${prev.mean.toFixed(2)} to ${curr.mean.toFixed(2)}`,
          magnitude: Math.abs(curr.mean - prev.mean),
          stddevMultiple:
            Math.abs(curr.mean - prev.mean) / prev.stddev
        });
      }

      // Variance increase (instability)
      if (curr.stddev > threshold * prev.stddev) {
        anomalies.push({
          type: "IncreasingVariance",
          index: i,
          severity: "medium",
          description: `Variance increased from ${prev.stddev.toFixed(2)} to ${curr.stddev.toFixed(2)}`,
          magnitude: curr.stddev - prev.stddev,
          stddevRatio: curr.stddev / prev.stddev
        });
      }

      // Range expansion
      if (curr.range > threshold * prev.range && prev.range > 0) {
        anomalies.push({
          type: "RangeExpansion",
          index: i,
          severity: "low",
          description: `Value range expanded from ${prev.range.toFixed(2)} to ${curr.range.toFixed(2)}`,
          magnitude: curr.range - prev.range
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect trend direction in windows
   */
  static detectTrend(windows) {
    if (!windows || windows.length < 2) {
      return { direction: "stable", strength: 0 };
    }

    const means = windows.map((w) => w.mean);
    const trend = StatisticalAnalyzer.linearTrend(means);

    // Determine strength and direction
    const avgValue = StatisticalAnalyzer.mean(means);
    const strength =
      avgValue === 0
        ? 0
        : Math.abs(trend.slope) / avgValue;

    const direction =
      trend.slope > 0.01 ? "increasing" : trend.slope < -0.01 ? "decreasing" : "stable";

    return {
      direction,
      strength: Math.min(strength, 1), // Clamp to 0-1
      slope: trend.slope,
      slope_pct_per_window: strength * 100
    };
  }
}

/**
 * Change Point Detector
 */
export class ChangePointDetector {
  /**
   * Detect change points using CUSUM algorithm
   */
  static detectCUSUM(measurements, threshold = 5.0, minDistance = 5) {
    if (!measurements || measurements.length < 10) {
      return [];
    }

    const mean = StatisticalAnalyzer.mean(measurements);
    const stddev = StatisticalAnalyzer.stddev(measurements);

    const changePoints = [];
    let cusum_pos = 0;
    let cusum_neg = 0;
    const h = threshold * (stddev || 1);

    for (let i = 0; i < measurements.length; i++) {
      const z = measurements[i] - mean;
      cusum_pos = Math.max(0, cusum_pos + z);
      cusum_neg = Math.min(0, cusum_neg + z);

      // Detect change point if either cusum exceeds threshold
      if (Math.abs(cusum_pos) > h || Math.abs(cusum_neg) > h) {
        const beforeIdx = Math.max(0, i - 10);
        const afterIdx = Math.min(measurements.length, i + 10);

        const beforeMean = StatisticalAnalyzer.mean(
          measurements.slice(beforeIdx, i)
        );
        const afterMean = StatisticalAnalyzer.mean(
          measurements.slice(i, afterIdx)
        );

        if (Math.abs(afterMean - beforeMean) > stddev || stddev === 0) {
          changePoints.push({
            index: i,
            timestamp: i,
            type: afterMean > beforeMean ? "degradation" : "improvement",
            magnitude: Math.abs(afterMean - beforeMean),
            severity:
              Math.abs(afterMean - beforeMean) > 2 * stddev ? "critical" :
              Math.abs(afterMean - beforeMean) > stddev ? "high" : "medium",
            before: beforeMean,
            after: afterMean
          });

          // Reset
          cusum_pos = 0;
          cusum_neg = 0;
        }
      }
    }

    return changePoints;
  }

  /**
   * Detect change points using binary segmentation
   */
  static detectBinarySegmentation(measurements, numSegments = 3) {
    if (!measurements || measurements.length < 2 * numSegments) {
      return [];
    }

    const segments = [];
    const meanFull = StatisticalAnalyzer.mean(measurements);
    let bestCut = this._findBestCut(measurements, 0, measurements.length);

    // Recursively partition
    const partition = (start, end, depth) => {
      if (depth >= numSegments || end - start < 2) {
        return;
      }

      const cut = this._findBestCut(measurements, start, end);
      if (cut.index > start && cut.index < end) {
        segments.push({
          index: cut.index,
          cost: cut.cost,
          left: StatisticalAnalyzer.mean(measurements.slice(start, cut.index)),
          right: StatisticalAnalyzer.mean(measurements.slice(cut.index, end))
        });

        partition(start, cut.index, depth + 1);
        partition(cut.index, end, depth + 1);
      }
    };

    partition(0, measurements.length, 0);

    return segments.sort((a, b) => a.index - b.index);
  }

  /**
   * Find the best cut point using cost minimization
   * @private
   */
  static _findBestCut(measurements, start, end) {
    let bestCost = Infinity;
    let bestIndex = start + 1;

    for (let i = start + 1; i < end; i++) {
      const leftMean = StatisticalAnalyzer.mean(
        measurements.slice(start, i)
      );
      const rightMean = StatisticalAnalyzer.mean(
        measurements.slice(i, end)
      );

      let cost = 0;
      for (let j = start; j < i; j++) {
        cost += Math.pow(measurements[j] - leftMean, 2);
      }
      for (let j = i; j < end; j++) {
        cost += Math.pow(measurements[j] - rightMean, 2);
      }

      if (cost < bestCost) {
        bestCost = cost;
        bestIndex = i;
      }
    }

    return { index: bestIndex, cost: bestCost };
  }
}

/**
 * Outlier Scorer
 */
export class OutlierScorer {
  /**
   * Score outliers using multiple methods
   */
  static scoreOutliers(measurements) {
    if (!measurements || measurements.length < 3) {
      return [];
    }

    const mean = StatisticalAnalyzer.mean(measurements);
    const stddev = StatisticalAnalyzer.stddev(measurements);
    const iqr = StatisticalAnalyzer.iqr(measurements);

    const scores = [];

    measurements.forEach((value, idx) => {
      // Z-score method
      const zScore = stddev === 0 ? 0 : Math.abs((value - mean) / stddev);

      // IQR method
      const q1 = StatisticalAnalyzer.percentile(measurements, 25);
      const q3 = StatisticalAnalyzer.percentile(measurements, 75);
      const iqrScore = iqr === 0 ? 0 : Math.max(
        Math.abs((value - q1) / iqr),
        Math.abs((value - q3) / iqr)
      );

      // Modified Z-score (using median absolute deviation)
      const median = StatisticalAnalyzer.median(measurements);
      const mad = StatisticalAnalyzer.median(
        measurements.map((v) => Math.abs(v - median))
      );
      const modifiedZScore = mad === 0 ? 0 : Math.abs((value - median) / (0.6745 * mad));

      // Composite score (average of normalized scores)
      const compositeScore = (
        Math.min(zScore, 5) / 5 * 0.4 +
        Math.min(iqrScore, 3) / 3 * 0.3 +
        Math.min(modifiedZScore, 5) / 5 * 0.3
      );

      scores.push({
        index: idx,
        value,
        zScore,
        iqrScore,
        modifiedZScore,
        compositeScore,
        isOutlier: compositeScore > 0.5,
        severity:
          compositeScore > 0.8 ? "critical" :
          compositeScore > 0.6 ? "high" :
          compositeScore > 0.5 ? "medium" : "low"
      });
    });

    return scores.sort((a, b) => b.compositeScore - a.compositeScore);
  }
}

/**
 * Correlation Analyzer
 */
export class CorrelationAnalyzer {
  /**
   * Find correlations between two time series
   */
  static findLaggedCorrelations(series1, series2, maxLag = 10) {
    if (!series1 || !series2 || series1.length < 5 || series2.length < 5) {
      return [];
    }

    const correlations = [];

    for (let lag = 0; lag <= maxLag; lag++) {
      const pairs = [];

      for (let i = 0; i < series1.length - lag; i++) {
        pairs.push({
          x: series1[i],
          y: series2[i + lag]
        });
      }

      if (pairs.length > 2) {
        const x = pairs.map((p) => p.x);
        const y = pairs.map((p) => p.y);
        const correlation = StatisticalAnalyzer.pearsonCorrelation(x, y);

        correlations.push({
          lag,
          correlation: Math.abs(correlation),
          direction: correlation > 0 ? "positive" : "negative",
          strength:
            Math.abs(correlation) > 0.7 ? "strong" :
            Math.abs(correlation) > 0.5 ? "moderate" :
            Math.abs(correlation) > 0.3 ? "weak" : "very_weak"
        });
      }
    }

    return correlations.sort((a, b) => b.correlation - a.correlation);
  }
}

/**
 * Comprehensive Analytics Engine
 */
export class AnalyticsEngine {
  constructor(options = {}) {
    this.options = {
      windowSize: options.windowSize || 20,
      anomalyThreshold: options.anomalyThreshold || 2.0,
      changePointThreshold: options.changePointThreshold || 5.0,
      outlierThreshold: options.outlierThreshold || 0.5,
      ...options
    };
  }

  /**
   * Analyze measurements for insights
   */
  analyzeMetrics(measurements, metricName = "metric") {
    if (!measurements || measurements.length === 0) {
      return {
        metricName,
        error: "No measurements provided"
      };
    }

    const windows = MovingWindowAnalyzer.analyzeWindows(
      measurements,
      this.options.windowSize
    );
    const windowAnomalies = MovingWindowAnalyzer.detectAnomalies(
      windows,
      this.options.anomalyThreshold
    );
    const trend = MovingWindowAnalyzer.detectTrend(windows);
    const changePoints = ChangePointDetector.detectCUSUM(
      measurements,
      this.options.changePointThreshold
    );
    const outliers = OutlierScorer.scoreOutliers(measurements);

    // Calculate basic stats
    const stats = {
      count: measurements.length,
      mean: StatisticalAnalyzer.mean(measurements),
      median: StatisticalAnalyzer.median(measurements),
      stddev: StatisticalAnalyzer.stddev(measurements),
      min: Math.min(...measurements),
      max: Math.max(...measurements),
      range: Math.max(...measurements) - Math.min(...measurements),
      p50: StatisticalAnalyzer.percentile(measurements, 50),
      p95: StatisticalAnalyzer.percentile(measurements, 95),
      p99: StatisticalAnalyzer.percentile(measurements, 99)
    };

    // Count anomalies by severity
    const anomalyCounts = {
      total: windowAnomalies.length + changePoints.length,
      high: windowAnomalies.filter((a) => a.severity === "high").length +
        changePoints.filter((c) => c.severity === "high").length,
      medium: windowAnomalies.filter((a) => a.severity === "medium").length +
        changePoints.filter((c) => c.severity === "medium").length,
      outliers: outliers.filter((o) => o.isOutlier).length
    };

    return {
      metricName,
      timestamp: new Date().toISOString(),
      stats,
      trend,
      anomalyCounts,
      recentAnomalies: windowAnomalies.slice(-5),
      changePoints: changePoints.slice(-5),
      topOutliers: outliers.slice(0, 3),
      health: this._calculateHealth(stats, anomalyCounts, trend)
    };
  }

  /**
   * Calculate overall health score
   * @private
   */
  _calculateHealth(stats, anomalyCounts, trend) {
    let score = 100;

    // Penalize for anomalies
    score -= anomalyCounts.total * 2;
    score -= anomalyCounts.high * 5;
    score -= anomalyCounts.outliers * 1;

    // Penalize for degrading trend
    if (trend.direction === "increasing") {
      score -= trend.strength * 10;
    }

    // Penalize for high variance
    const cv = stats.mean === 0 ? 0 : stats.stddev / stats.mean;
    if (cv > 0.5) {
      score -= (cv - 0.5) * 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Compare two metric periods
   */
  comparePeriods(before, after) {
    const beforeStats = {
      mean: StatisticalAnalyzer.mean(before),
      stddev: StatisticalAnalyzer.stddev(before),
      median: StatisticalAnalyzer.median(before)
    };

    const afterStats = {
      mean: StatisticalAnalyzer.mean(after),
      stddev: StatisticalAnalyzer.stddev(after),
      median: StatisticalAnalyzer.median(after)
    };

    return {
      meanChange: afterStats.mean - beforeStats.mean,
      meanChangePct:
        beforeStats.mean === 0
          ? 0
          : ((afterStats.mean - beforeStats.mean) / beforeStats.mean) * 100,
      stddevChange: afterStats.stddev - beforeStats.stddev,
      medianChange: afterStats.median - beforeStats.median,
      direction:
        afterStats.mean > beforeStats.mean ? "degradation" : "improvement",
      severity:
        Math.abs(afterStats.mean - beforeStats.mean) / beforeStats.stddev > 2
          ? "high"
          : "normal"
    };
  }

  /**
   * Get prediction for next N values
   */
  forecast(measurements, horizon = 5) {
    if (!measurements || measurements.length < 2) {
      return [];
    }

    const trend = StatisticalAnalyzer.linearTrend(measurements);
    const lastIdx = measurements.length - 1;
    const predictions = [];

    for (let i = 1; i <= horizon; i++) {
      const idx = lastIdx + i;
      const predicted =
        trend.intercept + trend.slope * idx;

      predictions.push({
        horizon: i,
        prediction: Math.max(0, predicted),
        confidence: 1 - (i / (horizon + 1)) * 0.3 // Confidence decreases with horizon
      });
    }

    return predictions;
  }
}

export default AnalyticsEngine;
