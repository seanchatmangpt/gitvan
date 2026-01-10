import { consola } from 'consola';
import { useGitVan } from '../core/context.mjs';
import { PaymentWebhookHandler } from './payment-and-usage.mjs';
import { UsageTrackingIntegration } from './payment-and-usage.mjs';
import { MetricsCalculationWorkflow } from './metrics-and-retention.mjs';
import { RetentionWorkflow } from './metrics-and-retention.mjs';

/**
 * Reporting Schedule
 * Generates daily, weekly, and monthly business reports
 */
export class ReportingSchedule {
  constructor(metricsEngine, storage) {
    this.metricsEngine = metricsEngine;
    this.storage = storage;
    this.reporters = new Map();
    this.alertRules = [];
  }

  registerReporter(name, reporter) {
    this.reporters.set(name, reporter);
  }

  addAlertRule(rule) {
    this.alertRules.push(rule);
  }

  async generateDailySummary() {
    consola.info('Generating daily revenue summary');

    const today = new Date().toISOString().split('T')[0];
    const revenue = await this.metricsEngine.getRevenueForDate(today);
    const mrr = await this.storage.getMetric('mrr');
    const churn = await this.storage.getMetric('churn_rate');

    const summary = {
      date: today,
      revenue: {
        total: revenue.total,
        byType: revenue.byType,
        transactionCount: revenue.count
      },
      metrics: {
        mrr: mrr?.value,
        churn: churn?.value
      },
      alerts: await this._generateAlerts()
    };

    await this.storage.saveReport('daily_summary', today, summary);

    for (const [name, reporter] of this.reporters.entries()) {
      try {
        await reporter.sendDaily(summary);
      } catch (error) {
        consola.error(`Reporter ${name} failed: ${error.message}`);
      }
    }

    consola.success('Daily summary generated');
    return summary;
  }

  async generateWeeklyCohortAnalysis() {
    consola.info('Generating weekly cohort analysis');

    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);

    const cohorts = await this.storage.getCohortsInRange(
      startDate.toISOString(),
      endDate.toISOString()
    );

    const analysis = {
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      cohorts: cohorts.length,
      metrics: {}
    };

    for (const cohort of cohorts) {
      const metrics = await this.storage.getCohortMetrics(cohort.date);
      analysis.metrics[cohort.date] = metrics;
    }

    await this.storage.saveReport('weekly_cohort', endDate.toISOString(), analysis);

    for (const [name, reporter] of this.reporters.entries()) {
      try {
        await reporter.sendWeekly(analysis);
      } catch (error) {
        consola.error(`Reporter ${name} failed: ${error.message}`);
      }
    }

    consola.success('Weekly cohort analysis generated');
    return analysis;
  }

  async generateMonthlyBusinessReview() {
    consola.info('Generating monthly business review');

    const today = new Date();
    const month = today.toISOString().substring(0, 7);

    const [mrr, arr, churn, ltv, cac] = await Promise.all([
      this.metricsEngine.calculateMRR(),
      this.metricsEngine.calculateARR(),
      this.metricsEngine.calculateChurnRate(),
      this.metricsEngine.calculateLTV(),
      this.metricsEngine.calculateCAC()
    ]);

    const revenue = await this.metricsEngine.getRevenueForMonth(month);
    const cohorts = await this.storage.getCohortsForMonth(month);

    const review = {
      month,
      revenue: {
        total: revenue.total,
        mrr,
        arr,
        byType: revenue.byType
      },
      metrics: {
        churn,
        ltv,
        cac,
        ltvCacRatio: cac > 0 ? ltv / cac : 0
      },
      cohorts: {
        count: cohorts.length,
        totalCustomers: cohorts.reduce((sum, c) => sum + c.size, 0)
      },
      trends: await this._calculateTrends(month),
      alerts: await this._generateAlerts()
    };

    await this.storage.saveReport('monthly_review', month, review);

    for (const [name, reporter] of this.reporters.entries()) {
      try {
        await reporter.sendMonthly(review);
      } catch (error) {
        consola.error(`Reporter ${name} failed: ${error.message}`);
      }
    }

    consola.success('Monthly business review generated');
    return review;
  }

  async _generateAlerts() {
    const alerts = [];

    for (const rule of this.alertRules) {
      try {
        const value = await this._evaluateRule(rule);
        if (this._shouldAlert(rule, value)) {
          alerts.push({
            rule: rule.name,
            value,
            threshold: rule.threshold,
            severity: rule.severity,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        consola.error(`Alert rule ${rule.name} failed: ${error.message}`);
      }
    }

    return alerts;
  }

  async _evaluateRule(rule) {
    switch (rule.metric) {
      case 'churn_rate':
        return await this.metricsEngine.calculateChurnRate();
      case 'mrr':
        return await this.metricsEngine.calculateMRR();
      case 'arr':
        return await this.metricsEngine.calculateARR();
      default:
        const metric = await this.storage.getMetric(rule.metric);
        return metric?.value;
    }
  }

  _shouldAlert(rule, value) {
    if (value === null || value === undefined) return false;

    switch (rule.operator) {
      case 'gt':
        return value > rule.threshold;
      case 'lt':
        return value < rule.threshold;
      case 'eq':
        return value === rule.threshold;
      case 'gte':
        return value >= rule.threshold;
      case 'lte':
        return value <= rule.threshold;
      default:
        return false;
    }
  }

  async _calculateTrends(month) {
    const currentMRR = await this.metricsEngine.calculateMRR();
    const previousMonth = this._getPreviousMonth(month);
    const previousMRRData = await this.storage.getMetric('mrr', previousMonth);
    const previousMRR = previousMRRData?.value || 0;

    const mrrGrowth = previousMRR > 0
      ? ((currentMRR - previousMRR) / previousMRR) * 100
      : 0;

    return {
      mrrGrowth,
      mrrChange: currentMRR - previousMRR
    };
  }

  _getPreviousMonth(month) {
    const date = new Date(month + '-01');
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().substring(0, 7);
  }
}

/**
 * RevOps Integration Orchestrator
 * Central hub coordinating all RevOps integrations and workflows
 */
export class RevOpsIntegrationOrchestrator {
  constructor(storage, metricsEngine) {
    this.storage = storage;
    this.metricsEngine = metricsEngine;

    this.paymentHandler = new PaymentWebhookHandler(storage, metricsEngine);
    this.usageTracking = new UsageTrackingIntegration(storage, metricsEngine);
    this.metricsWorkflow = new MetricsCalculationWorkflow(metricsEngine, storage);
    this.retentionWorkflow = new RetentionWorkflow(storage);
    this.reporting = new ReportingSchedule(metricsEngine, storage);

    this.jobs = new Map();
  }

  async initialize() {
    consola.info('Initializing RevOps integrations');

    this._scheduleJobs();

    consola.success('RevOps integrations initialized');
  }

  _scheduleJobs() {
    this.jobs.set('daily_metrics', {
      schedule: 'daily',
      hour: 1,
      handler: () => this.metricsWorkflow.runDailyRefresh()
    });

    this.jobs.set('daily_retention', {
      schedule: 'daily',
      hour: 2,
      handler: () => this.retentionWorkflow.runDailyRetentionWorkflow()
    });

    this.jobs.set('daily_summary', {
      schedule: 'daily',
      hour: 3,
      handler: () => this.reporting.generateDailySummary()
    });

    this.jobs.set('weekly_cohort', {
      schedule: 'weekly',
      dayOfWeek: 1,
      hour: 4,
      handler: () => this.reporting.generateWeeklyCohortAnalysis()
    });

    this.jobs.set('monthly_review', {
      schedule: 'monthly',
      dayOfMonth: 1,
      hour: 5,
      handler: () => this.reporting.generateMonthlyBusinessReview()
    });

    this.jobs.set('churn_predictions', {
      schedule: 'daily',
      hour: 0,
      handler: () => this.metricsWorkflow.refreshChurnPredictions()
    });
  }

  async runJob(jobName) {
    const job = this.jobs.get(jobName);
    if (!job) {
      throw new Error(`Job not found: ${jobName}`);
    }

    consola.info(`Running job: ${jobName}`);
    const startTime = Date.now();

    try {
      const result = await job.handler();
      const duration = Date.now() - startTime;

      await this.storage.appendLog('jobs', {
        name: jobName,
        status: 'success',
        duration,
        timestamp: new Date().toISOString()
      });

      consola.success(`Job ${jobName} completed in ${duration}ms`);
      return { success: true, result, duration };

    } catch (error) {
      const duration = Date.now() - startTime;

      await this.storage.appendLog('jobs', {
        name: jobName,
        status: 'failed',
        error: error.message,
        duration,
        timestamp: new Date().toISOString()
      });

      consola.error(`Job ${jobName} failed: ${error.message}`);
      throw error;
    }
  }

  async handlePaymentWebhook(event) {
    return await this.paymentHandler.handleWebhook(event);
  }

  async trackUsage(event) {
    return await this.usageTracking.trackUsage(event);
  }

  getJobSchedule() {
    const schedule = [];
    for (const [name, job] of this.jobs.entries()) {
      schedule.push({
        name,
        schedule: job.schedule,
        hour: job.hour,
        dayOfWeek: job.dayOfWeek,
        dayOfMonth: job.dayOfMonth
      });
    }
    return schedule;
  }
}

export function useRevOpsIntegrations() {
  const { repo, config } = useGitVan();

  return {
    createOrchestrator(storage, metricsEngine) {
      return new RevOpsIntegrationOrchestrator(storage, metricsEngine);
    },

    createPaymentHandler(storage, metricsEngine) {
      return new PaymentWebhookHandler(storage, metricsEngine);
    },

    createUsageTracking(storage, metricsEngine) {
      return new UsageTrackingIntegration(storage, metricsEngine);
    },

    createMetricsWorkflow(metricsEngine, storage) {
      return new MetricsCalculationWorkflow(metricsEngine, storage);
    },

    createRetentionWorkflow(storage) {
      return new RetentionWorkflow(storage);
    },

    createReporting(metricsEngine, storage) {
      return new ReportingSchedule(metricsEngine, storage);
    }
  };
}
