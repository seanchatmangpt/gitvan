#!/usr/bin/env node

/**
 * GitVan Unified Dashboard Specification
 *
 * Comprehensive dashboard showing metrics from all 4 phases with
 * cross-phase insights and real-time alerts.
 *
 * Dashboard Sections:
 * 1. Phase 1 (Git-Native I/O): Locks, Snapshots, Queue health
 * 2. Phase 2 (Performance): Metrics, Anomalies, Budgets
 * 3. Phase 3 (RevOps): Churn risk, Expansion, Customer cohorts
 * 4. Phase 4 (Packs): Popular packs, Compatibility, Marketplace
 * 5. Cross-Phase Insights: Correlations and trends
 *
 * Usage:
 *   node examples/dashboard-specification.mjs
 *
 * @module examples/dashboard-specification
 */

import { createLogger } from '../src/utils/logger.mjs';

const logger = createLogger('dashboard-specification');

// ============================================================================
// Dashboard Data Provider
// ============================================================================

class DashboardDataProvider {
  constructor() {
    this.refreshInterval = 30000;  // 30 seconds
    this.cache = new Map();
  }

  /**
   * Fetch all dashboard data
   */
  async fetchAll() {
    return {
      phase1: await this.fetchPhase1Data(),
      phase2: await this.fetchPhase2Data(),
      phase3: await this.fetchPhase3Data(),
      phase4: await this.fetchPhase4Data(),
      crossPhase: await this.fetchCrossPhaseInsights(),
      alerts: await this.fetchAlerts(),
      metadata: {
        lastRefresh: new Date().toISOString(),
        refreshInterval: this.refreshInterval
      }
    };
  }

  /**
   * Phase 1: Git-Native I/O Metrics
   */
  async fetchPhase1Data() {
    return {
      locks: {
        active: 23,
        pending: 7,
        avgDuration: 4200,
        maxDuration: 12000,
        contentionRate: 0.08,  // 8%
        deadlocksDetected: 0,
        topContentedResources: [
          { resource: 'workflow-state', contentionCount: 12, avgWait: 3500 },
          { resource: 'job-queue', contentionCount: 8, avgWait: 2800 },
          { resource: 'snapshot-store', contentionCount: 5, avgWait: 2100 }
        ]
      },
      snapshots: {
        total: 1523,
        last24h: 89,
        avgSize: 45000,  // bytes
        totalSize: 68545000,  // bytes
        recentSnapshots: [
          { id: 'snap-001', key: 'workflow-state', timestamp: '2026-01-09T14:23:00Z', size: 42000 },
          { id: 'snap-002', key: 'system-config', timestamp: '2026-01-09T14:18:00Z', size: 38000 },
          { id: 'snap-003', key: 'job-results', timestamp: '2026-01-09T14:12:00Z', size: 51000 }
        ]
      },
      queue: {
        pending: 34,
        running: 12,
        completed: 1847,
        failed: 23,
        avgProcessingTime: 8500,
        longestRunning: {
          jobId: 'job-456',
          name: 'data-export',
          duration: 45000,
          status: 'running'
        }
      }
    };
  }

  /**
   * Phase 2: Performance Monitoring Metrics
   */
  async fetchPhase2Data() {
    return {
      metrics: {
        avgResponseTime: 450,
        p50: 380,
        p95: 890,
        p99: 1200,
        requestRate: 1250,  // req/s
        errorRate: 0.003,  // 0.3%
        cpuUsage: 45,  // %
        memoryUsage: 62  // %
      },
      anomalies: [
        {
          id: 'anomaly-001',
          type: 'high-duration',
          operation: 'dashboard-load',
          severity: 'medium',
          description: 'Dashboard loading 25% slower than baseline',
          detectedAt: '2026-01-09T14:15:00Z',
          baseline: 5000,
          current: 6250
        },
        {
          id: 'anomaly-002',
          type: 'error-spike',
          operation: 'api-request',
          severity: 'low',
          description: 'Error rate elevated by 50%',
          detectedAt: '2026-01-09T14:10:00Z',
          baseline: 0.002,
          current: 0.003
        }
      ],
      budgets: [
        {
          operation: 'api-request',
          budget: 500,
          current: 450,
          status: 'healthy',
          utilization: 0.90
        },
        {
          operation: 'dashboard-load',
          budget: 5000,
          current: 6250,
          status: 'violated',
          utilization: 1.25
        },
        {
          operation: 'report-generation',
          budget: 10000,
          current: 8500,
          status: 'warning',
          utilization: 0.85
        }
      ],
      trends: {
        last24h: [
          { timestamp: '2026-01-09T00:00:00Z', avgDuration: 420 },
          { timestamp: '2026-01-09T04:00:00Z', avgDuration: 435 },
          { timestamp: '2026-01-09T08:00:00Z', avgDuration: 468 },
          { timestamp: '2026-01-09T12:00:00Z', avgDuration: 455 },
          { timestamp: '2026-01-09T14:00:00Z', avgDuration: 450 }
        ]
      }
    };
  }

  /**
   * Phase 3: RevOps Analytics Metrics
   */
  async fetchPhase3Data() {
    return {
      customers: {
        total: 579,
        active: 534,
        highRisk: 47,  // churn risk > 70
        mediumRisk: 123,  // churn risk 40-70
        lowRisk: 409  // churn risk < 40
      },
      revenue: {
        totalMRR: 2847000,
        avgMRR: 4916,
        growth30d: 0.08,  // 8% growth
        atRiskMRR: 287000,  // from high-risk customers
        expansionPipeline: 420000
      },
      churnRisk: {
        avgChurnRisk: 32.4,
        trend: -2.3,  // -2.3% change from last month
        topRiskCustomers: [
          {
            id: 'cust-001',
            name: 'Enterprise Corp',
            mrr: 25000,
            churnRisk: 78,
            reasons: ['performance-issues', 'support-tickets'],
            daysAtRisk: 12
          },
          {
            id: 'cust-002',
            name: 'Tech Startup',
            mrr: 12000,
            churnRisk: 72,
            reasons: ['low-usage', 'payment-failed'],
            daysAtRisk: 8
          },
          {
            id: 'cust-003',
            name: 'Analytics Co',
            mrr: 18000,
            churnRisk: 68,
            reasons: ['feature-requests'],
            daysAtRisk: 5
          }
        ]
      },
      expansion: {
        opportunities: 34,
        estimatedValue: 420000,
        conversionRate: 0.28,  // 28%
        topOpportunities: [
          {
            customer: 'Data Insights Inc',
            currentMRR: 8000,
            potentialMRR: 15000,
            probability: 0.75,
            reason: 'Using enterprise features on professional plan'
          },
          {
            customer: 'Global Analytics',
            currentMRR: 12000,
            potentialMRR: 20000,
            probability: 0.65,
            reason: 'High usage, multiple feature requests'
          }
        ]
      },
      cohorts: [
        { segment: 'Enterprise', count: 89, avgMRR: 18500, churnRate: 4.2 },
        { segment: 'Mid-market', count: 234, avgMRR: 4800, churnRate: 8.5 },
        { segment: 'SMB', count: 256, avgMRR: 980, churnRate: 15.3 }
      ]
    };
  }

  /**
   * Phase 4: Pack System Metrics
   */
  async fetchPhase4Data() {
    return {
      marketplace: {
        totalPacks: 247,
        installedPacks: 34,
        updatesAvailable: 8,
        avgRating: 4.3
      },
      popularPacks: [
        {
          id: 'pack-db-cache',
          name: 'Database Cache Pro',
          installs: 1823,
          rating: 4.7,
          category: 'performance',
          lastUpdate: '2026-01-05',
          yourVersion: '2.4.1',
          latestVersion: '2.5.0'
        },
        {
          id: 'pack-auth-system',
          name: 'Authentication System',
          installs: 1456,
          rating: 4.6,
          category: 'security',
          lastUpdate: '2026-01-08',
          yourVersion: '3.0.0',
          latestVersion: '3.0.0'
        },
        {
          id: 'pack-analytics',
          name: 'Analytics Suite',
          installs: 1234,
          rating: 4.5,
          category: 'analytics',
          lastUpdate: '2026-01-03',
          yourVersion: '1.8.2',
          latestVersion: '1.9.0'
        }
      ],
      compatibility: {
        compatible: 31,
        incompatible: 3,
        issues: [
          {
            pack: 'Redis Optimizer v4.0',
            issue: 'Incompatible with current GitVan version',
            resolution: 'Upgrade GitVan to v3.1+'
          }
        ]
      },
      performance: {
        packsImprovingPerformance: 12,
        avgImprovementFromPacks: 0.32,  // 32%
        topPerformingPacks: [
          { pack: 'Database Cache Pro', improvement: 0.45 },
          { pack: 'Query Optimizer', improvement: 0.38 },
          { pack: 'CDN Integration', improvement: 0.35 }
        ]
      }
    };
  }

  /**
   * Cross-Phase Insights
   */
  async fetchCrossPhaseInsights() {
    return {
      correlations: [
        {
          title: 'Performance Impact on Churn',
          correlation: -0.72,  // Strong negative correlation
          insight: 'Better performance strongly correlates with lower churn',
          data: [
            { performanceBucket: '< 500ms', avgChurnRisk: 28.3 },
            { performanceBucket: '500-1000ms', avgChurnRisk: 35.7 },
            { performanceBucket: '> 1000ms', avgChurnRisk: 52.4 }
          ]
        },
        {
          title: 'Pack Adoption vs Customer Success',
          correlation: 0.68,  // Strong positive correlation
          insight: 'Customers with more packs have higher satisfaction',
          data: [
            { packCount: '0-1', satisfaction: 6.1, churnRate: 15.3 },
            { packCount: '2-4', satisfaction: 7.4, churnRate: 8.5 },
            { packCount: '5+', satisfaction: 8.7, churnRate: 4.2 }
          ]
        },
        {
          title: 'Lock Contention vs System Performance',
          correlation: 0.85,  // Very strong positive correlation
          insight: 'High lock contention directly impacts response times',
          data: [
            { lockContentionRate: 0.05, avgResponseTime: 420 },
            { lockContentionRate: 0.10, avgResponseTime: 520 },
            { lockContentionRate: 0.20, avgResponseTime: 780 }
          ]
        }
      ],
      trends: [
        {
          title: 'System Health Over Time',
          period: '30d',
          metrics: [
            { date: '2026-01-01', performance: 8.2, churnRisk: 35.1, lockHealth: 7.5 },
            { date: '2026-01-08', performance: 8.5, churnRisk: 33.2, lockHealth: 8.1 },
            { date: '2026-01-09', performance: 8.7, churnRisk: 32.4, lockHealth: 8.3 }
          ]
        }
      ],
      predictions: [
        {
          metric: 'Churn Risk',
          current: 32.4,
          predicted30d: 29.8,
          confidence: 0.82,
          reasoning: 'Recent performance improvements and pack adoptions trending positive'
        },
        {
          metric: 'System Performance',
          current: 450,
          predicted30d: 420,
          confidence: 0.76,
          reasoning: 'Optimization packs showing sustained improvements'
        }
      ]
    };
  }

  /**
   * Real-time Alerts
   */
  async fetchAlerts() {
    return [
      {
        id: 'alert-001',
        severity: 'critical',
        phase: 'phase3',
        title: 'High-value customer at critical churn risk',
        description: 'Enterprise Corp ($25K MRR) churn risk reached 78%',
        timestamp: '2026-01-09T14:20:00Z',
        action: 'Immediate customer success intervention required',
        relatedData: {
          customerId: 'cust-001',
          mrr: 25000,
          churnRisk: 78
        }
      },
      {
        id: 'alert-002',
        severity: 'warning',
        phase: 'phase2',
        title: 'Performance budget violation',
        description: 'Dashboard load time exceeds budget by 25%',
        timestamp: '2026-01-09T14:15:00Z',
        action: 'Investigate dashboard performance',
        relatedData: {
          operation: 'dashboard-load',
          budget: 5000,
          current: 6250
        }
      },
      {
        id: 'alert-003',
        severity: 'info',
        phase: 'phase4',
        title: 'Pack updates available',
        description: '8 pack updates available with performance improvements',
        timestamp: '2026-01-09T14:00:00Z',
        action: 'Review and schedule updates',
        relatedData: {
          updateCount: 8,
          estimatedImprovement: 0.15
        }
      },
      {
        id: 'alert-004',
        severity: 'warning',
        phase: 'phase1',
        title: 'Lock contention increasing',
        description: 'Lock contention rate increased to 8%',
        timestamp: '2026-01-09T13:45:00Z',
        action: 'Monitor for deadlocks, consider scaling',
        relatedData: {
          contentionRate: 0.08,
          threshold: 0.05
        }
      }
    ];
  }
}

// ============================================================================
// Dashboard Renderer
// ============================================================================

class DashboardRenderer {
  /**
   * Render complete dashboard
   */
  render(data) {
    console.clear();
    this.renderHeader();
    this.renderAlerts(data.alerts);
    this.renderPhase1(data.phase1);
    this.renderPhase2(data.phase2);
    this.renderPhase3(data.phase3);
    this.renderPhase4(data.phase4);
    this.renderCrossPhaseInsights(data.crossPhase);
    this.renderFooter(data.metadata);
  }

  renderHeader() {
    console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
    console.log('║                      GitVan Unified Dashboard                             ║');
    console.log('║                   All Phases - Real-time Metrics                          ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');
  }

  renderAlerts(alerts) {
    if (alerts.length === 0) return;

    console.log('┌─────────────────────────────────────────────────────────────────────────┐');
    console.log('│ 🚨 ACTIVE ALERTS                                                        │');
    console.log('├─────────────────────────────────────────────────────────────────────────┤');

    alerts.forEach(alert => {
      const icon = this.getSeverityIcon(alert.severity);
      const phase = alert.phase.replace('phase', 'Phase ');
      console.log(`│ ${icon} [${phase}] ${alert.title.padEnd(60)} │`);
      console.log(`│    ${alert.description.padEnd(69)} │`);
      console.log(`│    Action: ${alert.action.padEnd(62)} │`);
      console.log('│ ─────────────────────────────────────────────────────────────────────── │');
    });

    console.log('└─────────────────────────────────────────────────────────────────────────┘\n');
  }

  renderPhase1(data) {
    console.log('┌─────────────────────────────────────────────────────────────────────────┐');
    console.log('│ 🔒 PHASE 1: GIT-NATIVE I/O                                              │');
    console.log('├─────────────────────────────────────────────────────────────────────────┤');

    // Locks
    console.log('│ Locks:                                                                  │');
    console.log(`│   Active: ${data.locks.active}  Pending: ${data.locks.pending}  Avg Duration: ${data.locks.avgDuration}ms  Contention: ${(data.locks.contentionRate * 100).toFixed(1)}% │`);
    console.log(`│   Status: ${data.locks.deadlocksDetected === 0 ? '✅ Healthy (no deadlocks)' : '⚠️  Deadlocks detected'}                              │`);

    // Snapshots
    console.log('│                                                                         │');
    console.log('│ Snapshots:                                                              │');
    console.log(`│   Total: ${data.snapshots.total}  Last 24h: ${data.snapshots.last24h}  Storage: ${(data.snapshots.totalSize / 1024 / 1024).toFixed(1)}MB                    │`);

    // Queue
    console.log('│                                                                         │');
    console.log('│ Job Queue:                                                              │');
    console.log(`│   Pending: ${data.queue.pending}  Running: ${data.queue.running}  Completed: ${data.queue.completed}  Failed: ${data.queue.failed}           │`);

    console.log('└─────────────────────────────────────────────────────────────────────────┘\n');
  }

  renderPhase2(data) {
    console.log('┌─────────────────────────────────────────────────────────────────────────┐');
    console.log('│ 📊 PHASE 2: PERFORMANCE MONITORING                                      │');
    console.log('├─────────────────────────────────────────────────────────────────────────┤');

    // Core metrics
    console.log('│ System Metrics:                                                         │');
    console.log(`│   Response Time: ${data.metrics.avgResponseTime}ms (P50: ${data.metrics.p50}ms, P95: ${data.metrics.p95}ms, P99: ${data.metrics.p99}ms)         │`);
    console.log(`│   Request Rate: ${data.metrics.requestRate}/s  Error Rate: ${(data.metrics.errorRate * 100).toFixed(2)}%  CPU: ${data.metrics.cpuUsage}%  Memory: ${data.metrics.memoryUsage}% │`);

    // Budgets
    console.log('│                                                                         │');
    console.log('│ Performance Budgets:                                                    │');
    data.budgets.forEach(budget => {
      const status = budget.status === 'healthy' ? '✅' : budget.status === 'warning' ? '⚠️' : '❌';
      const util = (budget.utilization * 100).toFixed(0);
      console.log(`│   ${status} ${budget.operation.padEnd(20)} ${budget.current}ms / ${budget.budget}ms (${util}%)          │`);
    });

    // Anomalies
    if (data.anomalies.length > 0) {
      console.log('│                                                                         │');
      console.log(`│ Anomalies Detected: ${data.anomalies.length}                                                    │`);
      data.anomalies.slice(0, 2).forEach(anomaly => {
        console.log(`│   • ${anomaly.description.padEnd(67)} │`);
      });
    }

    console.log('└─────────────────────────────────────────────────────────────────────────┘\n');
  }

  renderPhase3(data) {
    console.log('┌─────────────────────────────────────────────────────────────────────────┐');
    console.log('│ 💼 PHASE 3: REVOPS ANALYTICS                                            │');
    console.log('├─────────────────────────────────────────────────────────────────────────┤');

    // Customer overview
    console.log('│ Customer Overview:                                                      │');
    console.log(`│   Total: ${data.customers.total}  Active: ${data.customers.active}  High Risk: ${data.customers.highRisk}  Medium Risk: ${data.customers.mediumRisk}         │`);

    // Revenue
    console.log('│                                                                         │');
    console.log('│ Revenue:                                                                │');
    console.log(`│   Total MRR: $${(data.revenue.totalMRR / 1000).toFixed(0)}K  Growth: ${(data.revenue.growth30d * 100).toFixed(1)}%  At Risk: $${(data.revenue.atRiskMRR / 1000).toFixed(0)}K              │`);
    console.log(`│   Expansion Pipeline: $${(data.revenue.expansionPipeline / 1000).toFixed(0)}K                                           │`);

    // Churn risk
    console.log('│                                                                         │');
    console.log('│ Churn Risk:                                                             │');
    console.log(`│   Average: ${data.churnRisk.avgChurnRisk.toFixed(1)}%  Trend: ${data.churnRisk.trend > 0 ? '+' : ''}${data.churnRisk.trend.toFixed(1)}% (30d)                                │`);
    console.log(`│   Top Risk Customers:                                                   │`);
    data.churnRisk.topRiskCustomers.slice(0, 3).forEach(cust => {
      console.log(`│     • ${cust.name.padEnd(20)} $${(cust.mrr / 1000).toFixed(0)}K MRR  ${cust.churnRisk}% risk               │`);
    });

    console.log('└─────────────────────────────────────────────────────────────────────────┘\n');
  }

  renderPhase4(data) {
    console.log('┌─────────────────────────────────────────────────────────────────────────┐');
    console.log('│ 📦 PHASE 4: PACK SYSTEM                                                 │');
    console.log('├─────────────────────────────────────────────────────────────────────────┤');

    // Marketplace
    console.log('│ Marketplace:                                                            │');
    console.log(`│   Total Packs: ${data.marketplace.totalPacks}  Installed: ${data.marketplace.installedPacks}  Updates: ${data.marketplace.updatesAvailable}  Avg Rating: ⭐ ${data.marketplace.avgRating} │`);

    // Popular packs
    console.log('│                                                                         │');
    console.log('│ Your Top Packs:                                                         │');
    data.popularPacks.slice(0, 3).forEach(pack => {
      const status = pack.yourVersion === pack.latestVersion ? '✅' : '🔄';
      console.log(`│   ${status} ${pack.name.padEnd(25)} v${pack.yourVersion.padEnd(6)} ⭐ ${pack.rating}           │`);
    });

    // Performance impact
    console.log('│                                                                         │');
    console.log('│ Pack Performance Impact:                                                │');
    console.log(`│   Packs improving performance: ${data.performance.packsImprovingPerformance}                                  │`);
    console.log(`│   Avg improvement from packs: ${(data.performance.avgImprovementFromPacks * 100).toFixed(0)}%                                │`);

    console.log('└─────────────────────────────────────────────────────────────────────────┘\n');
  }

  renderCrossPhaseInsights(data) {
    console.log('┌─────────────────────────────────────────────────────────────────────────┐');
    console.log('│ 🔗 CROSS-PHASE INSIGHTS                                                 │');
    console.log('├─────────────────────────────────────────────────────────────────────────┤');

    // Correlations
    console.log('│ Key Correlations:                                                       │');
    data.correlations.forEach(corr => {
      const strength = Math.abs(corr.correlation);
      const label = strength > 0.7 ? 'Strong' : strength > 0.5 ? 'Moderate' : 'Weak';
      console.log(`│   • ${corr.title.padEnd(40)} (${label})    │`);
      console.log(`│     ${corr.insight.padEnd(67)} │`);
    });

    // Predictions
    console.log('│                                                                         │');
    console.log('│ 30-Day Predictions:                                                     │');
    data.predictions.forEach(pred => {
      const direction = pred.predicted30d < pred.current ? '↓' : '↑';
      const change = Math.abs(((pred.predicted30d - pred.current) / pred.current) * 100).toFixed(1);
      console.log(`│   ${pred.metric}: ${direction} ${change}% (Confidence: ${(pred.confidence * 100).toFixed(0)}%)                          │`);
    });

    console.log('└─────────────────────────────────────────────────────────────────────────┘\n');
  }

  renderFooter(metadata) {
    const refreshTime = new Date(metadata.lastRefresh).toLocaleTimeString();
    console.log(`Last refresh: ${refreshTime}  |  Refresh interval: ${metadata.refreshInterval / 1000}s\n`);
  }

  getSeverityIcon(severity) {
    const icons = {
      critical: '🔴',
      warning: '⚠️ ',
      info: 'ℹ️ '
    };
    return icons[severity] || 'ℹ️';
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const provider = new DashboardDataProvider();
  const renderer = new DashboardRenderer();

  console.log('GitVan Unified Dashboard - Starting...\n');
  console.log('Fetching data from all phases...\n');

  // Fetch and render dashboard
  const data = await provider.fetchAll();
  renderer.render(data);

  // In a real implementation, this would refresh periodically
  console.log('✨ Dashboard ready! (This is a static snapshot)\n');
  console.log('In production, this would refresh every 30 seconds with live data.\n');
}

main().catch(console.error);
