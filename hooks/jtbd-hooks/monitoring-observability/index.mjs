import { defineJob } from "../../../src/core/job-registry.mjs";

export default defineJob({
  meta: {
    name: "monitoring-observability-jtbd-hooks",
    desc: "Master orchestrator for Monitoring & Observability JTBD Hooks",
    tags: ["jtbd", "master-orchestrator", "monitoring-observability"],
    version: "1.0.0",
  },
  hooks: ["post-merge", "post-commit", "timer-hourly", "timer-daily"],
  async run(context) {
    const { hookName } = context;
    const timestamp = new Date().toISOString();

    try {
      // Load Monitoring & Observability JTBD hooks
      const hooks = await this.loadMonitoringObservabilityHooks();

      // Run appropriate hook based on context
      const result = await this.runAppropriateHook(hooks, hookName, context);

      // Generate master summary
      const masterSummary = this.generateMasterSummary(result);

      // Generate master recommendations
      const masterRecommendations = this.generateMasterRecommendations(result);

      // Log results
      console.log(
        `📊 Monitoring & Observability JTBD Hooks (${hookName}): ${
          result.success ? "SUCCESS" : "FAILURE"
        }`
      );
      console.log(`📈 Overall Score: ${masterSummary.overallScore}/100`);

      return {
        success: result.success,
        result,
        masterSummary,
        masterRecommendations,
        message: `Monitoring & Observability JTBD hooks ${
          result.success ? "completed successfully" : "failed"
        }`,
      };
    } catch (error) {
      console.error(
        `❌ Monitoring & Observability JTBD Hooks Error (${hookName}):`,
        error.message
      );
      return {
        success: false,
        error: error.message,
        message: "Monitoring & Observability JTBD hooks failed due to error",
      };
    }
  },

  async loadMonitoringObservabilityHooks() {
    const hooks = {};

    try {
      // Load JTBD #16: Application Performance Monitor
      const { default: applicationPerformanceMonitor } = await import(
        "./application-performance-monitor.mjs"
      );
      hooks.applicationPerformanceMonitor = applicationPerformanceMonitor;

      // Load JTBD #17: System Health Monitor
      const { default: systemHealthMonitor } = await import(
        "./system-health-monitor.mjs"
      );
      hooks.systemHealthMonitor = systemHealthMonitor;

      // Load JTBD #18: Error Tracking & Alerting
      const { default: errorTrackingAlerting } = await import(
        "./error-tracking-alerting.mjs"
      );
      hooks.errorTrackingAlerting = errorTrackingAlerting;

      // Load JTBD #19: Log Aggregation & Analysis
      const { default: logAggregationAnalysis } = await import(
        "./log-aggregation-analysis.mjs"
      );
      hooks.logAggregationAnalysis = logAggregationAnalysis;

      // Load JTBD #20: Real-time Monitoring Dashboard
      const { default: realtimeMonitoringDashboard } = await import(
        "./realtime-monitoring-dashboard.mjs"
      );
      hooks.realtimeMonitoringDashboard = realtimeMonitoringDashboard;

      return hooks;
    } catch (error) {
      console.error(
        "Error loading Monitoring & Observability JTBD hooks:",
        error.message
      );
      throw error;
    }
  },

  async runAppropriateHook(hooks, hookName, context) {
    const results = {};

    try {
      // Run Application Performance Monitor for post-merge and timer-hourly
      if (hookName === "post-merge" || hookName === "timer-hourly") {
        if (hooks.applicationPerformanceMonitor) {
          results.applicationPerformanceMonitor =
            await hooks.applicationPerformanceMonitor.run(context);
        }
      }

      // Run System Health Monitor for timer-hourly and post-merge
      if (hookName === "timer-hourly" || hookName === "post-merge") {
        if (hooks.systemHealthMonitor) {
          results.systemHealthMonitor = await hooks.systemHealthMonitor.run(
            context
          );
        }
      }

      // Run Error Tracking & Alerting for post-commit and timer-hourly
      if (hookName === "post-commit" || hookName === "timer-hourly") {
        if (hooks.errorTrackingAlerting) {
          results.errorTrackingAlerting = await hooks.errorTrackingAlerting.run(
            context
          );
        }
      }

      // Run Log Aggregation & Analysis for post-merge and timer-daily
      if (hookName === "post-merge" || hookName === "timer-daily") {
        if (hooks.logAggregationAnalysis) {
          results.logAggregationAnalysis =
            await hooks.logAggregationAnalysis.run(context);
        }
      }

      // Run Real-time Monitoring Dashboard for timer-hourly and post-merge
      if (hookName === "timer-hourly" || hookName === "post-merge") {
        if (hooks.realtimeMonitoringDashboard) {
          results.realtimeMonitoringDashboard =
            await hooks.realtimeMonitoringDashboard.run(context);
        }
      }

      // Determine overall success
      const success = Object.values(results).every((result) => result.success);

      return {
        success,
        results,
        hookName,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(
        "Error running Monitoring & Observability JTBD hooks:",
        error.message
      );
      return {
        success: false,
        error: error.message,
        hookName,
        timestamp: new Date().toISOString(),
      };
    }
  },

  generateMasterSummary(result) {
    if (!result.success) {
      return {
        overallScore: 0,
        status: "FAILURE",
        message: "Monitoring & Observability JTBD hooks failed",
        timestamp: new Date().toISOString(),
      };
    }

    const results = result.results || {};
    const scores = [];

    // Extract scores from each hook result
    if (
      results.applicationPerformanceMonitor?.report?.performanceMonitoring
        ?.overallStatus === "PASS"
    ) {
      scores.push(85);
    } else {
      scores.push(65);
    }

    if (
      results.systemHealthMonitor?.report?.systemHealth?.overallStatus ===
      "HEALTHY"
    ) {
      scores.push(88);
    } else {
      scores.push(68);
    }

    if (
      results.errorTrackingAlerting?.report?.errorTracking?.overallStatus ===
      "HEALTHY"
    ) {
      scores.push(90);
    } else {
      scores.push(70);
    }

    if (
      results.logAggregationAnalysis?.report?.logAggregation?.overallStatus ===
      "HEALTHY"
    ) {
      scores.push(87);
    } else {
      scores.push(67);
    }

    if (
      results.realtimeMonitoringDashboard?.report?.dashboardMonitoring
        ?.overallStatus === "HEALTHY"
    ) {
      scores.push(89);
    } else {
      scores.push(69);
    }

    const overallScore = Math.round(
      scores.reduce((a, b) => a + b, 0) / scores.length
    );

    return {
      overallScore,
      status: overallScore >= 80 ? "SUCCESS" : "NEEDS_ATTENTION",
      message: `Monitoring & Observability JTBD hooks completed with score: ${overallScore}/100`,
      individualScores: {
        applicationPerformance: scores[0] || 0,
        systemHealth: scores[1] || 0,
        errorTracking: scores[2] || 0,
        logAggregation: scores[3] || 0,
        realtimeDashboard: scores[4] || 0,
      },
      timestamp: new Date().toISOString(),
    };
  },

  generateMasterRecommendations(result) {
    const recommendations = [];

    if (!result.success) {
      recommendations.push(
        "📊 Fix Monitoring & Observability JTBD hook failures"
      );
      return recommendations;
    }

    const results = result.results || {};

    // Application Performance Monitor recommendations
    if (
      results.applicationPerformanceMonitor?.report?.performanceMonitoring
        ?.overallStatus === "FAIL"
    ) {
      recommendations.push("⚡ Address application performance issues");
    }

    // System Health Monitor recommendations
    if (
      results.systemHealthMonitor?.report?.systemHealth?.overallStatus ===
      "DEGRADED"
    ) {
      recommendations.push("🏥 Fix system health issues");
    }

    // Error Tracking & Alerting recommendations
    if (
      results.errorTrackingAlerting?.report?.errorTracking?.overallStatus ===
      "DEGRADED"
    ) {
      recommendations.push("🚨 Improve error tracking and alerting");
    }

    // Log Aggregation & Analysis recommendations
    if (
      results.logAggregationAnalysis?.report?.logAggregation?.overallStatus ===
      "DEGRADED"
    ) {
      recommendations.push("📝 Enhance log aggregation and analysis");
    }

    // Real-time Monitoring Dashboard recommendations
    if (
      results.realtimeMonitoringDashboard?.report?.dashboardMonitoring
        ?.overallStatus === "DEGRADED"
    ) {
      recommendations.push("📊 Improve real-time monitoring dashboard");
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push(
        "✅ All Monitoring & Observability JTBD hooks passed successfully"
      );
    }

    return recommendations;
  },

  getHookMetrics() {
    return {
      totalHooks: 5,
      supportedHooks: [
        "post-merge",
        "post-commit",
        "timer-hourly",
        "timer-daily",
      ],
      hookCategories: [
        "Application Performance Monitoring",
        "System Health Monitoring",
        "Error Tracking & Alerting",
        "Log Aggregation & Analysis",
        "Real-time Monitoring Dashboard",
      ],
      coveragePercentage: 100,
      timestamp: new Date().toISOString(),
    };
  },
});
