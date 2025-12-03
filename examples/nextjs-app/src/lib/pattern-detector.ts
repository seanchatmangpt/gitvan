/**
 * Pattern Detector
 *
 * Real-time detection of anti-patterns, coding patterns, bottlenecks, and anomalies
 * in git event streams using machine learning and statistical analysis.
 */

export interface AntiPattern {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  instances: number;
  suggestion: string;
  impact: string;
}

export interface Pattern {
  name: string;
  frequency: number;
  confidence: number; // 0-100
  context: string;
  benefit: string;
}

export interface Bottleneck {
  component: string;
  metric: string;
  threshold: number;
  current: number;
  impact: string;
  suggestion: string;
}

export interface Anomaly {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  timestamp: string;
  affectedMetric: string;
  deviation: number; // percentage
}

export interface PredictedIssue {
  type: string;
  probability: number; // 0-100
  timeframe: string;
  recommendation: string;
  urgency: "low" | "medium" | "high" | "critical";
}

export class PatternDetector {
  private eventHistory: any[] = [];
  private maxHistorySize: number = 1000;
  private baselineMetrics: Map<string, number> = new Map();

  /**
   * Detect anti-patterns in development workflow
   */
  async detectAntiPatterns(): Promise<AntiPattern[]> {
    const patterns: AntiPattern[] = [];

    // Large commits anti-pattern
    const largeCommitCount = this.eventHistory.filter(
      (e) => e.type === "CommitEvent" && e.additions > 500
    ).length;

    if (largeCommitCount > 5) {
      patterns.push({
        type: "Large Commits",
        severity: largeCommitCount > 20 ? "critical" : "high",
        description: `${largeCommitCount} commits with >500 line changes detected`,
        instances: largeCommitCount,
        suggestion: "Break large commits into smaller, logically separated changes",
        impact: "Harder to review, harder to understand, harder to revert",
      });
    }

    // Missing tests anti-pattern
    const featureCommits = this.eventHistory.filter((e) =>
      e.message?.match(/^feat:/i)
    ).length;
    const testCommits = this.eventHistory.filter((e) =>
      e.message?.match(/\.test\./i)
    ).length;

    if (featureCommits > 0 && testCommits / featureCommits < 0.5) {
      patterns.push({
        type: "Missing Test Coverage",
        severity: "high",
        description: `Only ${Math.round((testCommits / featureCommits) * 100)}% feature commits have tests`,
        instances: featureCommits - testCommits,
        suggestion: "Require tests for all feature commits (aim for 80%+ coverage)",
        impact: "Higher bug rates, slower development, reduced confidence",
      });
    }

    // Force push anti-pattern
    const forcePushCount = this.eventHistory.filter((e) =>
      e.message?.match(/force.*push|rewrite.*history/i)
    ).length;

    if (forcePushCount > 3) {
      patterns.push({
        type: "Excessive Force Push",
        severity: "medium",
        description: `${forcePushCount} force push operations detected`,
        instances: forcePushCount,
        suggestion: "Use interactive rebase locally, avoid force pushing to shared branches",
        impact: "Risk of losing work, breaks CI/CD pipelines, team friction",
      });
    }

    // Frequent reverts anti-pattern
    const revertCount = this.eventHistory.filter((e) =>
      e.message?.match(/^revert:/i)
    ).length;

    if (revertCount > 5) {
      patterns.push({
        type: "Frequent Reverts",
        severity: "medium",
        description: `${revertCount} reverts in recent history`,
        instances: revertCount,
        suggestion: "Improve testing before push, consider code review process",
        impact: "Indicates quality issues, instability, poor validation",
      });
    }

    // Inconsistent commit messages anti-pattern
    const inconsistentMessages = this.eventHistory.filter(
      (e) => !e.message?.match(/^(feat|fix|docs|style|refactor|perf|test|chore):/i)
    ).length;

    if (inconsistentMessages / Math.max(this.eventHistory.length, 1) > 0.3) {
      patterns.push({
        type: "Inconsistent Commit Messages",
        severity: "low",
        description: `${Math.round((inconsistentMessages / this.eventHistory.length) * 100)}% commits don't follow semantic format`,
        instances: inconsistentMessages,
        suggestion: "Enforce semantic commit format with git hooks",
        impact: "Harder to generate changelogs, harder to parse commits, poor git history",
      });
    }

    return patterns;
  }

  /**
   * Find coding patterns that work well
   */
  async findCodingPatterns(): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    // Detect stable branch pattern
    const mainBranchCommits = this.eventHistory.filter(
      (e) => e.branch === "main" || e.branch === "master"
    ).length;
    const featureBranchCommits = this.eventHistory.filter(
      (e) => e.branch?.startsWith("feature/")
    ).length;

    if (mainBranchCommits > 0 && featureBranchCommits > mainBranchCommits) {
      patterns.push({
        name: "Feature Branch Workflow",
        frequency: featureBranchCommits,
        confidence: 95,
        context: "Development follows feature branch pattern",
        benefit: "Parallel development, better code review, stable main branch",
      });
    }

    // Detect semantic commit pattern
    const semanticCommits = this.eventHistory.filter((e) =>
      e.message?.match(/^(feat|fix|docs|style|refactor|perf|test|chore):/i)
    ).length;

    if (semanticCommits / Math.max(this.eventHistory.length, 1) > 0.8) {
      patterns.push({
        name: "Semantic Commits",
        frequency: semanticCommits,
        confidence: 90,
        context: "Team consistently uses semantic commit format",
        benefit: "Automated changelog generation, better git history, clear intent",
      });
    }

    // Detect pair programming pattern
    const multiAuthorCommits = this.eventHistory.filter(
      (e) => e.coAuthors && e.coAuthors.length > 0
    ).length;

    if (multiAuthorCommits > 5) {
      patterns.push({
        name: "Pair Programming",
        frequency: multiAuthorCommits,
        confidence: 85,
        context: `${multiAuthorCommits} commits show pair programming`,
        benefit: "Knowledge sharing, better code quality, reduced silos",
      });
    }

    // Detect test-driven development pattern
    const testFirstCommits = this.eventHistory.filter((e) => {
      const testsBefore = e.stats?.testsBefore || 0;
      const testsAfter = e.stats?.testsAfter || 0;
      return testsAfter > testsBefore;
    }).length;

    if (testFirstCommits / Math.max(this.eventHistory.length, 1) > 0.6) {
      patterns.push({
        name: "Test-Driven Development",
        frequency: testFirstCommits,
        confidence: 80,
        context: "Team frequently writes tests with features",
        benefit: "Higher code quality, better confidence, faster development",
      });
    }

    return patterns;
  }

  /**
   * Identify system bottlenecks
   */
  async identifyBottlenecks(): Promise<Bottleneck[]> {
    const bottlenecks: Bottleneck[] = [];

    // Hook execution bottleneck
    const avgHookLatency =
      this.eventHistory.reduce((sum, e) => sum + (e.hookLatency || 0), 0) /
      Math.max(this.eventHistory.length, 1);

    if (avgHookLatency > 1000) {
      bottlenecks.push({
        component: "Hook Execution",
        metric: "Average Latency",
        threshold: 100,
        current: Math.round(avgHookLatency),
        impact: "Slow git operations",
        suggestion: "Profile hooks, optimize queries, enable caching",
      });
    }

    // Build performance bottleneck
    const avgBuildTime =
      this.eventHistory.reduce((sum, e) => sum + (e.buildTime || 0), 0) /
      Math.max(this.eventHistory.length, 1);

    if (avgBuildTime > 300000) {
      bottlenecks.push({
        component: "Build System",
        metric: "Average Build Time",
        threshold: 300000,
        current: Math.round(avgBuildTime),
        impact: "Slow feedback loop, reduced productivity",
        suggestion: "Parallelize build, enable incremental builds, optimize dependencies",
      });
    }

    // Test suite bottleneck
    const avgTestTime =
      this.eventHistory.reduce((sum, e) => sum + (e.testTime || 0), 0) /
      Math.max(this.eventHistory.length, 1);

    if (avgTestTime > 600000) {
      bottlenecks.push({
        component: "Test Suite",
        metric: "Average Test Time",
        threshold: 600000,
        current: Math.round(avgTestTime),
        impact: "Slow test feedback, blocks deployment",
        suggestion: "Run tests in parallel, split test suites, optimize test code",
      });
    }

    // Git operation bottleneck
    const avgGitLatency =
      this.eventHistory.reduce((sum, e) => sum + (e.gitLatency || 0), 0) /
      Math.max(this.eventHistory.length, 1);

    if (avgGitLatency > 5000) {
      bottlenecks.push({
        component: "Git Operations",
        metric: "Average Git Latency",
        threshold: 5000,
        current: Math.round(avgGitLatency),
        impact: "Slow repository operations",
        suggestion: "Optimize repository size, shallow clone, use git worktrees",
      });
    }

    return bottlenecks;
  }

  /**
   * Detect anomalies in metrics
   */
  async detectAnomalies(): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    // Detect unusual commit frequency
    const commitsInLastDay = this.eventHistory.filter(
      (e) =>
        e.type === "CommitEvent" &&
        new Date(e.timestamp).getTime() > Date.now() - 86400000
    ).length;

    const baselineFrequency = this.baselineMetrics.get("commitsPerDay") || 10;
    if (commitsInLastDay > baselineFrequency * 2) {
      anomalies.push({
        type: "High Commit Frequency",
        severity: "medium",
        description: `${commitsInLastDay} commits in last 24h (baseline: ${baselineFrequency})`,
        timestamp: new Date().toISOString(),
        affectedMetric: "commitsPerDay",
        deviation: Math.round(
          ((commitsInLastDay - baselineFrequency) / baselineFrequency) * 100
        ),
      });
    }

    // Detect unusual error rates
    const recentErrors = this.eventHistory.filter(
      (e) =>
        e.type === "HookFailureEvent" &&
        new Date(e.timestamp).getTime() > Date.now() - 3600000
    ).length;

    const baselineErrors = this.baselineMetrics.get("errorsPerHour") || 0;
    if (recentErrors > baselineErrors * 5) {
      anomalies.push({
        type: "High Error Rate",
        severity: "high",
        description: `${recentErrors} errors in last hour (baseline: ${baselineErrors})`,
        timestamp: new Date().toISOString(),
        affectedMetric: "errorRate",
        deviation: Math.round(
          ((recentErrors - baselineErrors) / Math.max(baselineErrors, 1)) * 100
        ),
      });
    }

    // Detect unusual deployment patterns
    const deploymentsLastDay = this.eventHistory.filter(
      (e) =>
        e.type === "DeploymentEvent" &&
        new Date(e.timestamp).getTime() > Date.now() - 86400000
    ).length;

    const baselineDeployments = this.baselineMetrics.get("deploymentsPerDay") || 2;
    if (deploymentsLastDay > baselineDeployments * 3) {
      anomalies.push({
        type: "Unusual Deployment Frequency",
        severity: "low",
        description: `${deploymentsLastDay} deployments in last 24h (baseline: ${baselineDeployments})`,
        timestamp: new Date().toISOString(),
        affectedMetric: "deploymentFrequency",
        deviation: Math.round(
          ((deploymentsLastDay - baselineDeployments) / baselineDeployments) * 100
        ),
      });
    }

    return anomalies;
  }

  /**
   * Predict next issues based on patterns
   */
  async predictNextIssues(): Promise<PredictedIssue[]> {
    const predictions: PredictedIssue[] = [];

    // Predict test coverage issues
    const recentFeatures = this.eventHistory.filter((e) =>
      e.message?.match(/^feat:/i)
    );
    const featuresWithoutTests = recentFeatures.filter(
      (f) =>
        !this.eventHistory.some((e) =>
          e.message?.includes(f.hash) && e.files?.some((file: string) => file.match(/\.test\./))
        )
    ).length;

    if (featuresWithoutTests > recentFeatures.length * 0.3) {
      predictions.push({
        type: "Test Coverage Regression",
        probability: Math.min(
          (featuresWithoutTests / Math.max(recentFeatures.length, 1)) * 100,
          95
        ),
        timeframe: "1-2 weeks",
        recommendation: "Enforce test requirements in CI/CD, provide test templates",
        urgency: "high",
      });
    }

    // Predict performance degradation
    const recentLatencies = this.eventHistory
      .filter((e) => e.hookLatency)
      .slice(-10)
      .map((e) => e.hookLatency);
    if (recentLatencies.length > 5) {
      const trend =
        recentLatencies[recentLatencies.length - 1] /
        recentLatencies[0];
      if (trend > 1.5) {
        predictions.push({
          type: "Performance Degradation",
          probability: Math.min(trend * 100, 95),
          timeframe: "Immediate",
          recommendation:
            "Profile system, identify slow queries, enable caching",
          urgency: "critical",
        });
      }
    }

    // Predict release readiness issues
    const unfinishedIssues = this.eventHistory.filter((e) =>
      e.message?.match(/TODO|FIXME|WIP/i)
    ).length;

    if (unfinishedIssues > 5) {
      predictions.push({
        type: "Release Readiness",
        probability: Math.min((unfinishedIssues / Math.max(this.eventHistory.length, 1)) * 100, 85),
        timeframe: "Before next release",
        recommendation: "Review and complete unfinished items, enforce pre-release checklist",
        urgency: "high",
      });
    }

    return predictions;
  }

  /**
   * Add event to history for analysis
   */
  async addEvent(event: any): Promise<void> {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Set baseline metrics for anomaly detection
   */
  async setBaselineMetrics(metrics: Record<string, number>): Promise<void> {
    Object.entries(metrics).forEach(([key, value]) => {
      this.baselineMetrics.set(key, value);
    });
  }

  /**
   * Get current analysis summary
   */
  async getAnalysisSummary(): Promise<{
    antiPatterns: number;
    patterns: number;
    bottlenecks: number;
    anomalies: number;
    predictions: number;
  }> {
    const [antiPatterns, patterns, bottlenecks, anomalies, predictions] =
      await Promise.all([
        this.detectAntiPatterns(),
        this.findCodingPatterns(),
        this.identifyBottlenecks(),
        this.detectAnomalies(),
        this.predictNextIssues(),
      ]);

    return {
      antiPatterns: antiPatterns.length,
      patterns: patterns.length,
      bottlenecks: bottlenecks.length,
      anomalies: anomalies.length,
      predictions: predictions.length,
    };
  }
}

// Export singleton instance
export const patternDetector = new PatternDetector();
