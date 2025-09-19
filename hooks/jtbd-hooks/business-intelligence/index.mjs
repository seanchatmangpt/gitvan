import { defineJob } from "../../../src/core/job-registry.mjs";

export default defineJob({
  meta: {
    name: "business-intelligence-jtbd-hooks",
    desc: "Master orchestrator for Business Intelligence JTBD Hooks - Comprehensive automation for business intelligence and analytics",
    tags: ["jtbd", "master-orchestrator", "business-intelligence"],
    version: "1.0.0",
  },
  hooks: ["post-merge", "timer-daily"],
  async run(context) {
    const { hookName } = context;
    const timestamp = new Date().toISOString();

    try {
      // Load Business Intelligence JTBD hooks
      const hooks = await this.loadBusinessIntelligenceHooks();

      // Run appropriate hook based on context
      const result = await this.runAppropriateHook(hooks, hookName, context);

      // Generate master summary
      const masterSummary = this.generateMasterSummary(result);

      // Generate master recommendations
      const masterRecommendations = this.generateMasterRecommendations(result);

      // Log results
      console.log(
        `📊 Business Intelligence JTBD Hooks (${hookName}): ${
          result.success ? "SUCCESS" : "FAILURE"
        }`
      );
      console.log(`📈 Overall Score: ${masterSummary.overallScore}/100`);

      return {
        success: result.success,
        result,
        masterSummary,
        masterRecommendations,
        message: `Business Intelligence JTBD hooks ${
          result.success ? "completed successfully" : "failed"
        }`,
      };
    } catch (error) {
      console.error(
        `❌ Business Intelligence JTBD Hooks Error (${hookName}):`,
        error.message
      );
      return {
        success: false,
        error: error.message,
        message: "Business Intelligence JTBD hooks failed due to error",
      };
    }
  },

  async loadBusinessIntelligenceHooks() {
    const hooks = {};

    try {
      // Load JTBD #21: Business Metrics Tracker
      const { default: businessMetricsTracker } = await import(
        "./business-metrics-tracker.mjs"
      );
      hooks.businessMetricsTracker = businessMetricsTracker;

      // Load JTBD #22: User Behavior Analytics
      const { default: userBehaviorAnalytics } = await import(
        "./user-behavior-analytics.mjs"
      );
      hooks.userBehaviorAnalytics = userBehaviorAnalytics;

      // Load JTBD #23: Market Intelligence Analyzer
      const { default: marketIntelligenceAnalyzer } = await import(
        "./market-intelligence-analyzer.mjs"
      );
      hooks.marketIntelligenceAnalyzer = marketIntelligenceAnalyzer;

      // Load JTBD #24: Predictive Analytics Engine
      const { default: predictiveAnalyticsEngine } = await import(
        "./predictive-analytics-engine.mjs"
      );
      hooks.predictiveAnalyticsEngine = predictiveAnalyticsEngine;

      // Load JTBD #25: Business Intelligence Dashboard
      const { default: businessIntelligenceDashboard } = await import(
        "./business-intelligence-dashboard.mjs"
      );
      hooks.businessIntelligenceDashboard = businessIntelligenceDashboard;

      return hooks;
    } catch (error) {
      console.error(
        "Error loading Business Intelligence JTBD hooks:",
        error.message
      );
      throw error;
    }
  },

  async runAppropriateHook(hooks, hookName, context) {
    const results = {};

    try {
      // Run Business Metrics Tracker for post-merge and timer-daily
      if (hookName === "post-merge" || hookName === "timer-daily") {
        if (hooks.businessMetricsTracker) {
          results.businessMetricsTracker =
            await hooks.businessMetricsTracker.run(context);
        }
      }

      // Run User Behavior Analytics for post-merge and timer-daily
      if (hookName === "post-merge" || hookName === "timer-daily") {
        if (hooks.userBehaviorAnalytics) {
          results.userBehaviorAnalytics = await hooks.userBehaviorAnalytics.run(
            context
          );
        }
      }

      // Run Market Intelligence Analyzer for timer-daily and post-merge
      if (hookName === "timer-daily" || hookName === "post-merge") {
        if (hooks.marketIntelligenceAnalyzer) {
          results.marketIntelligenceAnalyzer =
            await hooks.marketIntelligenceAnalyzer.run(context);
        }
      }

      // Run Predictive Analytics Engine for timer-daily and post-merge
      if (hookName === "timer-daily" || hookName === "post-merge") {
        if (hooks.predictiveAnalyticsEngine) {
          results.predictiveAnalyticsEngine =
            await hooks.predictiveAnalyticsEngine.run(context);
        }
      }

      // Run Business Intelligence Dashboard for timer-daily and post-merge
      if (hookName === "timer-daily" || hookName === "post-merge") {
        if (hooks.businessIntelligenceDashboard) {
          results.businessIntelligenceDashboard =
            await hooks.businessIntelligenceDashboard.run(context);
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
        "Error running Business Intelligence JTBD hooks:",
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
        message: "Business Intelligence JTBD hooks failed",
        timestamp: new Date().toISOString(),
      };
    }

    const results = result.results || {};
    const scores = [];

    // Extract scores from each hook result
    if (
      results.businessMetricsTracker?.report?.businessMetrics?.overallStatus ===
      "HEALTHY"
    ) {
      scores.push(88);
    } else {
      scores.push(68);
    }

    if (
      results.userBehaviorAnalytics?.report?.userBehavior?.overallStatus ===
      "HEALTHY"
    ) {
      scores.push(85);
    } else {
      scores.push(65);
    }

    if (
      results.marketIntelligenceAnalyzer?.report?.marketIntelligence
        ?.overallStatus === "HEALTHY"
    ) {
      scores.push(87);
    } else {
      scores.push(67);
    }

    if (
      results.predictiveAnalyticsEngine?.report?.predictiveAnalytics
        ?.overallStatus === "HEALTHY"
    ) {
      scores.push(90);
    } else {
      scores.push(70);
    }

    if (
      results.businessIntelligenceDashboard?.report?.biDashboard
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
      message: `Business Intelligence JTBD hooks completed with score: ${overallScore}/100`,
      individualScores: {
        businessMetrics: scores[0] || 0,
        userBehavior: scores[1] || 0,
        marketIntelligence: scores[2] || 0,
        predictiveAnalytics: scores[3] || 0,
        biDashboard: scores[4] || 0,
      },
      timestamp: new Date().toISOString(),
    };
  },

  generateMasterRecommendations(result) {
    const recommendations = [];

    if (!result.success) {
      recommendations.push("📊 Fix Business Intelligence JTBD hook failures");
      return recommendations;
    }

    const results = result.results || {};

    // Business Metrics Tracker recommendations
    if (
      results.businessMetricsTracker?.report?.businessMetrics?.overallStatus ===
      "DEGRADED"
    ) {
      recommendations.push("📈 Improve business metrics tracking");
    }

    // User Behavior Analytics recommendations
    if (
      results.userBehaviorAnalytics?.report?.userBehavior?.overallStatus ===
      "DEGRADED"
    ) {
      recommendations.push("👥 Enhance user behavior analytics");
    }

    // Market Intelligence Analyzer recommendations
    if (
      results.marketIntelligenceAnalyzer?.report?.marketIntelligence
        ?.overallStatus === "DEGRADED"
    ) {
      recommendations.push("🌐 Strengthen market intelligence analysis");
    }

    // Predictive Analytics Engine recommendations
    if (
      results.predictiveAnalyticsEngine?.report?.predictiveAnalytics
        ?.overallStatus === "DEGRADED"
    ) {
      recommendations.push("🔮 Improve predictive analytics capabilities");
    }

    // Business Intelligence Dashboard recommendations
    if (
      results.businessIntelligenceDashboard?.report?.biDashboard
        ?.overallStatus === "DEGRADED"
    ) {
      recommendations.push("📊 Enhance business intelligence dashboard");
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push(
        "✅ All Business Intelligence JTBD hooks passed successfully"
      );
    }

    return recommendations;
  },

  getHookMetrics() {
    return {
      totalHooks: 5,
      supportedHooks: ["post-merge", "timer-daily"],
      hookCategories: [
        "Business Metrics Tracking",
        "User Behavior Analytics",
        "Market Intelligence Analysis",
        "Predictive Analytics",
        "Business Intelligence Dashboard",
      ],
      coveragePercentage: 100,
      timestamp: new Date().toISOString(),
    };
  },
});
