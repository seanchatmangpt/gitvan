import { consola } from 'consola';

export const CHURN_RISK_LEVELS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  NONE: 'none'
};

export const RETENTION_ACTIONS = {
  EMAIL: 'email',
  DISCOUNT: 'discount',
  OUTREACH: 'outreach',
  SURVEY: 'survey'
};

/**
 * Metrics Calculation Workflow
 * Orchestrates daily/periodic metrics refreshes and churn prediction
 */
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

/**
 * Retention Workflow
 * Manages customer retention interventions and campaigns
 */
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
