import { consola } from 'consola';
import { useGitVan } from '../core/context.mjs';

const PAYMENT_STATES = {
  SUCCESS: 'success',
  FAILED: 'failed',
  PENDING: 'pending',
  REFUNDED: 'refunded'
};

const USAGE_EVENTS = {
  API_CALL: 'api_call',
  STORAGE: 'storage',
  COMPUTE: 'compute',
  BANDWIDTH: 'bandwidth'
};

const CHURN_RISK_LEVELS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  NONE: 'none'
};

const RETENTION_ACTIONS = {
  EMAIL: 'email',
  DISCOUNT: 'discount',
  OUTREACH: 'outreach',
  SURVEY: 'survey'
};

export class PaymentWebhookHandler {
  constructor(storage, metricsEngine) {
    this.storage = storage;
    this.metricsEngine = metricsEngine;
    this.handlers = new Map();
    this._setupHandlers();
  }

  _setupHandlers() {
    this.handlers.set(PAYMENT_STATES.SUCCESS, this._handlePaymentSuccess.bind(this));
    this.handlers.set(PAYMENT_STATES.FAILED, this._handlePaymentFailure.bind(this));
    this.handlers.set(PAYMENT_STATES.REFUNDED, this._handlePaymentRefund.bind(this));
  }

  async handleWebhook(event) {
    const startTime = Date.now();
    const { type, data } = event;

    try {
      consola.info(`Processing payment webhook: ${type}`);

      const handler = this.handlers.get(type);
      if (!handler) {
        consola.warn(`Unknown webhook type: ${type}`);
        return { success: false, error: 'unknown_type' };
      }

      const result = await handler(data);

      await this._logWebhook({
        type,
        customerId: data.customerId,
        status: 'success',
        duration: Date.now() - startTime,
        result
      });

      consola.success(`Webhook processed: ${type}`);
      return { success: true, result };

    } catch (error) {
      consola.error(`Webhook processing failed: ${error.message}`);

      await this._logWebhook({
        type,
        customerId: data?.customerId,
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message
      });

      return { success: false, error: error.message };
    }
  }

  async _handlePaymentSuccess(data) {
    const { customerId, amount, subscriptionId, paymentId } = data;

    await this.storage.updateSubscription(customerId, {
      status: 'active',
      lastPaymentDate: new Date().toISOString(),
      lastPaymentAmount: amount,
      consecutiveFailures: 0
    });

    await this.metricsEngine.recordRevenue({
      customerId,
      amount,
      type: 'subscription',
      subscriptionId,
      paymentId,
      date: new Date().toISOString()
    });

    return { action: 'subscription_updated', customerId };
  }

  async _handlePaymentFailure(data) {
    const { customerId, reason, subscriptionId, attemptCount } = data;

    const subscription = await this.storage.getSubscription(customerId);
    const consecutiveFailures = (subscription?.consecutiveFailures || 0) + 1;

    await this.storage.updateSubscription(customerId, {
      status: consecutiveFailures >= 3 ? 'suspended' : 'payment_failed',
      lastFailureDate: new Date().toISOString(),
      lastFailureReason: reason,
      consecutiveFailures
    });

    if (consecutiveFailures >= 3) {
      await this._triggerRetentionAction({
        customerId,
        action: RETENTION_ACTIONS.EMAIL,
        reason: 'payment_failure',
        urgency: 'high'
      });
    }

    return {
      action: 'failure_recorded',
      customerId,
      consecutiveFailures,
      suspended: consecutiveFailures >= 3
    };
  }

  async _handlePaymentRefund(data) {
    const { customerId, amount, paymentId, reason } = data;

    await this.metricsEngine.recordRevenue({
      customerId,
      amount: -amount,
      type: 'refund',
      paymentId,
      reason,
      date: new Date().toISOString()
    });

    await this._triggerRetentionAction({
      customerId,
      action: RETENTION_ACTIONS.SURVEY,
      reason: 'refund',
      urgency: 'medium'
    });

    return { action: 'refund_processed', customerId, amount };
  }

  async _triggerRetentionAction(action) {
    await this.storage.queueRetentionAction(action);
  }

  async _logWebhook(logEntry) {
    await this.storage.appendLog('webhooks', logEntry);
  }
}

export class UsageTrackingIntegration {
  constructor(storage, metricsEngine) {
    this.storage = storage;
    this.metricsEngine = metricsEngine;
    this.pricingTiers = new Map();
    this.alertThresholds = new Map();
  }

  setPricingTier(eventType, tiers) {
    this.pricingTiers.set(eventType, tiers);
  }

  setAlertThreshold(customerId, eventType, threshold) {
    const key = `${customerId}:${eventType}`;
    this.alertThresholds.set(key, threshold);
  }

  async trackUsage(event) {
    const { customerId, eventType, quantity, metadata } = event;

    try {
      const usage = await this.storage.incrementUsage(customerId, eventType, quantity);

      await this._checkOverage(customerId, eventType, usage);
      await this._checkAlerts(customerId, eventType, usage);

      await this.storage.appendLog('usage', {
        customerId,
        eventType,
        quantity,
        total: usage.total,
        timestamp: new Date().toISOString(),
        metadata
      });

      return { success: true, usage: usage.total };

    } catch (error) {
      consola.error(`Usage tracking failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async calculateUsageCharges(customerId, period) {
    const usage = await this.storage.getUsageForPeriod(customerId, period);
    let totalCharges = 0;
    const breakdown = {};

    for (const [eventType, quantity] of Object.entries(usage)) {
      const tiers = this.pricingTiers.get(eventType);
      if (!tiers) continue;

      const charge = this._calculateTieredPricing(quantity, tiers);
      totalCharges += charge;
      breakdown[eventType] = { quantity, charge };
    }

    return { totalCharges, breakdown };
  }

  _calculateTieredPricing(quantity, tiers) {
    let remaining = quantity;
    let cost = 0;

    for (const tier of tiers) {
      if (remaining <= 0) break;

      const tierQuantity = tier.max
        ? Math.min(remaining, tier.max - (tier.min || 0))
        : remaining;

      cost += tierQuantity * tier.price;
      remaining -= tierQuantity;
    }

    return cost;
  }

  async _checkOverage(customerId, eventType, usage) {
    const subscription = await this.storage.getSubscription(customerId);
    const limit = subscription?.limits?.[eventType];

    if (limit && usage.total > limit) {
      const overage = usage.total - limit;
      await this.storage.recordOverage(customerId, {
        eventType,
        limit,
        usage: usage.total,
        overage,
        date: new Date().toISOString()
      });

      consola.warn(`Overage detected: ${customerId} - ${eventType} - ${overage}`);
    }
  }

  async _checkAlerts(customerId, eventType, usage) {
    const key = `${customerId}:${eventType}`;
    const threshold = this.alertThresholds.get(key);

    if (threshold && usage.total >= threshold) {
      await this.storage.queueAlert({
        customerId,
        type: 'usage_threshold',
        eventType,
        threshold,
        current: usage.total,
        date: new Date().toISOString()
      });
    }
  }
}

export class MetricsCalculationWorkflow {
  constructor(metricsEngine, storage) {
    this.metricsEngine = metricsEngine;
    this.storage = storage;
    this.schedules = new Map();
  }

  scheduleDaily(hour = 0) {
    this.schedules.set('daily', { type: 'daily', hour });
  }

  scheduleWeekly(dayOfWeek = 0, hour = 0) {
    this.schedules.set('weekly', { type: 'weekly', dayOfWeek, hour });
  }

  scheduleMonthly(dayOfMonth = 1, hour = 0) {
    this.schedules.set('monthly', { type: 'monthly', dayOfMonth, hour });
  }

  async runDailyRefresh() {
    const startTime = Date.now();
    consola.info('Starting daily metrics refresh');

    try {
      await Promise.all([
        this._refreshMRR(),
        this._refreshARR(),
        this._refreshChurnMetrics(),
        this._warmCache()
      ]);

      const duration = Date.now() - startTime;
      consola.success(`Daily refresh completed in ${duration}ms`);

      await this.storage.appendLog('workflows', {
        type: 'daily_refresh',
        status: 'success',
        duration,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      consola.error(`Daily refresh failed: ${error.message}`);

      await this.storage.appendLog('workflows', {
        type: 'daily_refresh',
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  async runCohortAnalysis() {
    consola.info('Running cohort analysis');

    const cohorts = await this.metricsEngine.calculateAllCohorts();

    for (const [cohortDate, metrics] of Object.entries(cohorts)) {
      await this.storage.saveCohortMetrics(cohortDate, metrics);
    }

    consola.success('Cohort analysis complete');
    return cohorts;
  }

  async refreshChurnPredictions() {
    consola.info('Refreshing churn predictions');

    const customers = await this.storage.getAllCustomers();
    const predictions = [];

    for (const customer of customers) {
      const riskScore = await this._calculateChurnRisk(customer);
      predictions.push({
        customerId: customer.id,
        riskScore,
        riskLevel: this._getRiskLevel(riskScore),
        timestamp: new Date().toISOString()
      });
    }

    await this.storage.saveChurnPredictions(predictions);

    consola.success(`Churn predictions refreshed for ${predictions.length} customers`);
    return predictions;
  }

  async _refreshMRR() {
    const mrr = await this.metricsEngine.calculateMRR();
    await this.storage.saveMetric('mrr', mrr, new Date().toISOString());
  }

  async _refreshARR() {
    const arr = await this.metricsEngine.calculateARR();
    await this.storage.saveMetric('arr', arr, new Date().toISOString());
  }

  async _refreshChurnMetrics() {
    const churn = await this.metricsEngine.calculateChurnRate();
    await this.storage.saveMetric('churn_rate', churn, new Date().toISOString());
  }

  async _warmCache() {
    await this.metricsEngine.warmCache();
  }

  async _calculateChurnRisk(customer) {
    let score = 0;

    const subscription = await this.storage.getSubscription(customer.id);
    if (!subscription) return 0;

    if (subscription.consecutiveFailures > 0) {
      score += subscription.consecutiveFailures * 20;
    }

    const lastLogin = subscription.lastLoginDate
      ? new Date(subscription.lastLoginDate)
      : null;
    if (lastLogin) {
      const daysSinceLogin = (Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLogin > 30) score += 30;
      else if (daysSinceLogin > 14) score += 15;
    }

    const usage = await this.storage.getCurrentUsage(customer.id);
    const totalUsage = Object.values(usage).reduce((sum, val) => sum + val, 0);
    if (totalUsage < 100) score += 25;

    return Math.min(score, 100);
  }

  _getRiskLevel(score) {
    if (score >= 70) return CHURN_RISK_LEVELS.HIGH;
    if (score >= 40) return CHURN_RISK_LEVELS.MEDIUM;
    if (score >= 20) return CHURN_RISK_LEVELS.LOW;
    return CHURN_RISK_LEVELS.NONE;
  }
}

export class RetentionWorkflow {
  constructor(storage) {
    this.storage = storage;
    this.campaigns = new Map();
    this.interventionTracking = new Map();
  }

  registerCampaign(riskLevel, campaign) {
    this.campaigns.set(riskLevel, campaign);
  }

  async runDailyRetentionWorkflow() {
    consola.info('Starting daily retention workflow');

    const predictions = await this.storage.getLatestChurnPredictions();
    const atRiskCustomers = predictions.filter(p => p.riskLevel !== CHURN_RISK_LEVELS.NONE);

    consola.info(`Found ${atRiskCustomers.length} at-risk customers`);

    const results = [];
    for (const prediction of atRiskCustomers) {
      try {
        const result = await this._processAtRiskCustomer(prediction);
        results.push(result);
      } catch (error) {
        consola.error(`Failed to process customer ${prediction.customerId}: ${error.message}`);
      }
    }

    await this.storage.appendLog('workflows', {
      type: 'retention',
      processed: atRiskCustomers.length,
      successful: results.filter(r => r.success).length,
      timestamp: new Date().toISOString()
    });

    consola.success('Daily retention workflow complete');
    return results;
  }

  async _processAtRiskCustomer(prediction) {
    const { customerId, riskLevel, riskScore } = prediction;

    const existingIntervention = await this.storage.getActiveIntervention(customerId);
    if (existingIntervention) {
      return { success: true, action: 'skipped', reason: 'intervention_active' };
    }

    const campaign = this.campaigns.get(riskLevel);
    if (!campaign) {
      return { success: false, reason: 'no_campaign_configured' };
    }

    const intervention = {
      customerId,
      riskLevel,
      riskScore,
      campaignId: campaign.id,
      actions: campaign.actions,
      startDate: new Date().toISOString(),
      status: 'active'
    };

    await this.storage.saveIntervention(intervention);

    for (const action of campaign.actions) {
      await this.storage.queueRetentionAction({
        customerId,
        action: action.type,
        parameters: action.parameters,
        interventionId: intervention.id
      });
    }

    return { success: true, action: 'intervention_created', campaignId: campaign.id };
  }

  async trackInterventionOutcome(interventionId, outcome) {
    const intervention = await this.storage.getIntervention(interventionId);
    if (!intervention) {
      throw new Error(`Intervention not found: ${interventionId}`);
    }

    intervention.status = 'completed';
    intervention.outcome = outcome;
    intervention.completedDate = new Date().toISOString();

    await this.storage.updateIntervention(interventionId, intervention);

    this.interventionTracking.set(interventionId, outcome);

    await this.storage.appendLog('interventions', {
      interventionId,
      customerId: intervention.customerId,
      outcome,
      duration: new Date(intervention.completedDate).getTime() -
                new Date(intervention.startDate).getTime(),
      timestamp: new Date().toISOString()
    });
  }

  async getInterventionStats(period) {
    const interventions = await this.storage.getInterventionsForPeriod(period);

    const stats = {
      total: interventions.length,
      successful: 0,
      failed: 0,
      active: 0,
      byRiskLevel: {},
      byCampaign: {}
    };

    for (const intervention of interventions) {
      if (intervention.status === 'active') {
        stats.active++;
      } else if (intervention.outcome === 'retained') {
        stats.successful++;
      } else if (intervention.outcome === 'churned') {
        stats.failed++;
      }

      stats.byRiskLevel[intervention.riskLevel] =
        (stats.byRiskLevel[intervention.riskLevel] || 0) + 1;

      stats.byCampaign[intervention.campaignId] =
        (stats.byCampaign[intervention.campaignId] || 0) + 1;
    }

    return stats;
  }
}

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
