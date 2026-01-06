import { useGitVan } from "../core/context.mjs";
import { useGit } from "../composables/git.mjs";

const CHURN_REF = "refs/gitvan/revops/churn";
const COHORT_REF = "refs/gitvan/revops/cohorts";
const EXPANSION_REF = "refs/gitvan/revops/expansion";
const CAMPAIGNS_REF = "refs/gitvan/revops/campaigns";

export function useChurnPredictor() {
  const ctx = useGitVan();
  const git = useGit();

  function calculateHealthScore(customer, usage, support) {
    let score = 100;

    if (usage.lastActivityDays > 30) score -= 40;
    else if (usage.lastActivityDays > 7) score -= 15;

    if (support.ticketsLast30Days > 5) score -= 20;
    else if (support.ticketsLast30Days > 2) score -= 10;

    if (support.failedPaymentAttempts > 0) score -= 25 * support.failedPaymentAttempts;

    if (usage.planDowngradeRequests > 0) score -= 30;

    const usageRate = usage.currentUsage / usage.planLimit;
    if (usageRate < 0.1) score -= 25;
    else if (usageRate < 0.3) score -= 10;

    if (usage.loginFrequencyDays > 7) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  function calculateChurnRiskScore(customer, history) {
    const baseScore = calculateHealthScore(
      customer,
      history.usage || {},
      history.support || {}
    );

    let riskScore = 100 - baseScore;

    if (history.revenue) {
      const revenueChange = history.revenue.changePercent || 0;
      if (revenueChange < -20) riskScore += 20;
      else if (revenueChange < -10) riskScore += 10;
    }

    if (history.engagement) {
      const engagementTrend = history.engagement.trend || 0;
      if (engagementTrend < -0.5) riskScore += 15;
      else if (engagementTrend < -0.2) riskScore += 8;
    }

    return Math.max(0, Math.min(100, riskScore));
  }

  function identifyWarningSignals(customer, history) {
    const signals = [];
    const usage = history.usage || {};
    const support = history.support || {};

    if (usage.lastActivityDays > 7) {
      signals.push({
        type: "no_usage",
        severity: usage.lastActivityDays > 30 ? "critical" : "high",
        days: usage.lastActivityDays,
        message: `No usage in ${usage.lastActivityDays} days`,
      });
    }

    if (support.ticketsLast30Days > 3) {
      signals.push({
        type: "support_increase",
        severity: "medium",
        count: support.ticketsLast30Days,
        message: `${support.ticketsLast30Days} support tickets in 30 days`,
      });
    }

    if (support.failedPaymentAttempts > 0) {
      signals.push({
        type: "payment_failure",
        severity: "critical",
        attempts: support.failedPaymentAttempts,
        message: `${support.failedPaymentAttempts} failed payment attempts`,
      });
    }

    if (usage.planDowngradeRequests > 0) {
      signals.push({
        type: "downgrade_request",
        severity: "high",
        requests: usage.planDowngradeRequests,
        message: "Plan downgrade requested",
      });
    }

    if (usage.loginFrequencyDays > 30) {
      signals.push({
        type: "login_inactive",
        severity: "critical",
        days: usage.loginFrequencyDays,
        message: `Last login ${usage.loginFrequencyDays} days ago`,
      });
    }

    return signals;
  }

  function calculateCohortRetention(cohort, customerData) {
    const cohortStart = new Date(cohort.startDate).getTime();
    const now = Date.now();
    const daysSinceStart = Math.floor((now - cohortStart) / (1000 * 60 * 60 * 24));

    const retention = {
      cohortId: cohort.id,
      startDate: cohort.startDate,
      initialSize: cohort.customers.length,
      day1: 0,
      day7: 0,
      day30: 0,
      day60: 0,
      day90: 0,
    };

    for (const customerId of cohort.customers) {
      const customer = customerData[customerId];
      if (!customer) continue;

      const signupDate = new Date(customer.signupDate).getTime();
      const daysActive = customer.churnDate
        ? Math.floor((new Date(customer.churnDate).getTime() - signupDate) / (1000 * 60 * 60 * 24))
        : daysSinceStart;

      if (daysActive >= 1) retention.day1++;
      if (daysActive >= 7) retention.day7++;
      if (daysActive >= 30) retention.day30++;
      if (daysActive >= 60) retention.day60++;
      if (daysActive >= 90) retention.day90++;
    }

    retention.day1Percent = (retention.day1 / retention.initialSize) * 100;
    retention.day7Percent = (retention.day7 / retention.initialSize) * 100;
    retention.day30Percent = (retention.day30 / retention.initialSize) * 100;
    retention.day60Percent = (retention.day60 / retention.initialSize) * 100;
    retention.day90Percent = (retention.day90 / retention.initialSize) * 100;

    return retention;
  }

  function identifyUpsellCandidates(customers, subscriptions) {
    const candidates = [];

    for (const customer of customers) {
      const subscription = subscriptions[customer.id];
      if (!subscription) continue;

      const usage = customer.usage || {};
      const usageRate = usage.currentUsage / usage.planLimit;

      if (usageRate > 0.8) {
        candidates.push({
          customerId: customer.id,
          type: "upsell",
          reason: "high_usage",
          currentPlan: subscription.plan,
          usagePercent: Math.round(usageRate * 100),
          probability: Math.min(95, 60 + usageRate * 40),
          estimatedRevenue: subscription.mrr * 1.5,
        });
      }
    }

    return candidates;
  }

  function identifyCrossSellCandidates(customers, products) {
    const candidates = [];

    for (const customer of customers) {
      const currentProducts = customer.products || [];
      const availableProducts = products.filter(
        (p) => !currentProducts.includes(p.id)
      );

      if (availableProducts.length === 0) continue;

      const engagement = customer.engagement || 0;
      const healthScore = calculateHealthScore(
        customer,
        customer.usage || {},
        customer.support || {}
      );

      if (healthScore > 70 && engagement > 0.6) {
        for (const product of availableProducts) {
          candidates.push({
            customerId: customer.id,
            type: "cross_sell",
            product: product.id,
            productName: product.name,
            probability: Math.min(90, 40 + engagement * 50),
            estimatedRevenue: product.mrr,
          });
        }
      }
    }

    return candidates;
  }

  function calculateExpansionProbability(customer, opportunity) {
    let probability = 0;

    const healthScore = calculateHealthScore(
      customer,
      customer.usage || {},
      customer.support || {}
    );

    probability += healthScore * 0.4;

    const tenure = customer.tenure || 0;
    if (tenure > 12) probability += 20;
    else if (tenure > 6) probability += 10;

    const engagement = customer.engagement || 0;
    probability += engagement * 30;

    if (opportunity.type === "upsell") {
      const usageRate = customer.usage?.currentUsage / customer.usage?.planLimit || 0;
      probability += usageRate * 10;
    }

    return Math.min(95, Math.max(5, probability));
  }

  function flagForRetention(customers, churnScores) {
    const flagged = [];

    for (const customer of customers) {
      const churnScore = churnScores[customer.id] || 0;

      if (churnScore > 70) {
        flagged.push({
          customerId: customer.id,
          priority: "critical",
          churnScore,
          recommendedAction: "immediate_outreach",
          estimatedLoss: customer.ltv || customer.mrr * 24,
        });
      } else if (churnScore > 50) {
        flagged.push({
          customerId: customer.id,
          priority: "high",
          churnScore,
          recommendedAction: "proactive_support",
          estimatedLoss: customer.ltv || customer.mrr * 24,
        });
      } else if (churnScore > 30) {
        flagged.push({
          customerId: customer.id,
          priority: "medium",
          churnScore,
          recommendedAction: "engagement_campaign",
          estimatedLoss: customer.ltv || customer.mrr * 24,
        });
      }
    }

    return flagged.sort((a, b) => b.churnScore - a.churnScore);
  }

  function trackInterventionOutcome(intervention, outcome) {
    const roi = {
      interventionId: intervention.id,
      customerId: intervention.customerId,
      type: intervention.type,
      cost: intervention.cost || 0,
      outcome: outcome.result,
      retainedRevenue: outcome.retained ? outcome.revenue : 0,
      timestamp: Date.now(),
    };

    roi.roiValue = roi.retainedRevenue - roi.cost;
    roi.roiPercent =
      roi.cost > 0 ? ((roi.roiValue / roi.cost) * 100).toFixed(2) : 0;

    return roi;
  }

  async function storeChurnScores(scores) {
    const data = JSON.stringify(scores, null, 2);
    const timestamp = git.nowISO();
    const blob = await git.hashObject(
      await git.writeFile(`.gitvan/churn-scores-${timestamp}.json`, data),
      { write: true }
    );

    await git.noteAdd(CHURN_REF, JSON.stringify({ blob, timestamp, type: "churn_scores" }));
    return blob;
  }

  async function storeCohortData(cohorts) {
    const data = JSON.stringify(cohorts, null, 2);
    const timestamp = git.nowISO();
    const blob = await git.hashObject(
      await git.writeFile(`.gitvan/cohorts-${timestamp}.json`, data),
      { write: true }
    );

    await git.noteAdd(COHORT_REF, JSON.stringify({ blob, timestamp, type: "cohort_retention" }));
    return blob;
  }

  async function storeExpansionOpportunities(opportunities) {
    const data = JSON.stringify(opportunities, null, 2);
    const timestamp = git.nowISO();
    const blob = await git.hashObject(
      await git.writeFile(`.gitvan/expansion-${timestamp}.json`, data),
      { write: true }
    );

    await git.noteAdd(EXPANSION_REF, JSON.stringify({ blob, timestamp, type: "expansion" }));
    return blob;
  }

  async function storeCampaignData(campaigns) {
    const data = JSON.stringify(campaigns, null, 2);
    const timestamp = git.nowISO();
    const blob = await git.hashObject(
      await git.writeFile(`.gitvan/campaigns-${timestamp}.json`, data),
      { write: true }
    );

    await git.noteAdd(CAMPAIGNS_REF, JSON.stringify({ blob, timestamp, type: "campaigns" }));
    return blob;
  }

  async function loadLatestChurnScores() {
    try {
      const note = await git.noteShow(CHURN_REF);
      const { blob } = JSON.parse(note);
      const data = await git.catFilePretty(blob);
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }

  async function loadLatestCohortData() {
    try {
      const note = await git.noteShow(COHORT_REF);
      const { blob } = JSON.parse(note);
      const data = await git.catFilePretty(blob);
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  async function loadLatestExpansionOpportunities() {
    try {
      const note = await git.noteShow(EXPANSION_REF);
      const { blob } = JSON.parse(note);
      const data = await git.catFilePretty(blob);
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  async function loadLatestCampaignData() {
    try {
      const note = await git.noteShow(CAMPAIGNS_REF);
      const { blob } = JSON.parse(note);
      const data = await git.catFilePretty(blob);
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  async function runDailyScoring(customers) {
    const scores = {};
    const warnings = {};

    for (const customer of customers) {
      const history = customer.history || {};
      scores[customer.id] = calculateChurnRiskScore(customer, history);
      warnings[customer.id] = identifyWarningSignals(customer, history);
    }

    await storeChurnScores({ scores, warnings, timestamp: git.nowISO() });

    return { scores, warnings };
  }

  async function analyzeRetention(cohorts, customerData) {
    const retentionData = cohorts.map((cohort) =>
      calculateCohortRetention(cohort, customerData)
    );

    await storeCohortData(retentionData);

    return retentionData;
  }

  async function identifyExpansionOpportunities(customers, subscriptions, products) {
    const upsellCandidates = identifyUpsellCandidates(customers, subscriptions);
    const crossSellCandidates = identifyCrossSellCandidates(customers, products);

    const allOpportunities = [...upsellCandidates, ...crossSellCandidates].map(
      (opp) => ({
        ...opp,
        probability: calculateExpansionProbability(
          customers.find((c) => c.id === opp.customerId),
          opp
        ),
      })
    );

    await storeExpansionOpportunities(allOpportunities);

    return allOpportunities;
  }

  async function runRetentionCampaign(customers, churnScores) {
    const flagged = flagForRetention(customers, churnScores);

    const campaigns = flagged.map((flag) => ({
      id: `campaign-${flag.customerId}-${Date.now()}`,
      customerId: flag.customerId,
      priority: flag.priority,
      action: flag.recommendedAction,
      estimatedLoss: flag.estimatedLoss,
      status: "pending",
      createdAt: git.nowISO(),
    }));

    await storeCampaignData(campaigns);

    return campaigns;
  }

  async function recordIntervention(intervention, outcome) {
    const roi = trackInterventionOutcome(intervention, outcome);

    const campaigns = await loadLatestCampaignData();
    const campaignIndex = campaigns.findIndex(
      (c) => c.id === intervention.campaignId
    );

    if (campaignIndex >= 0) {
      campaigns[campaignIndex].status = "completed";
      campaigns[campaignIndex].outcome = outcome;
      campaigns[campaignIndex].roi = roi;
      await storeCampaignData(campaigns);
    }

    return roi;
  }

  return {
    calculateHealthScore,
    calculateChurnRiskScore,
    identifyWarningSignals,
    calculateCohortRetention,
    identifyUpsellCandidates,
    identifyCrossSellCandidates,
    calculateExpansionProbability,
    flagForRetention,
    trackInterventionOutcome,

    storeChurnScores,
    storeCohortData,
    storeExpansionOpportunities,
    storeCampaignData,

    loadLatestChurnScores,
    loadLatestCohortData,
    loadLatestExpansionOpportunities,
    loadLatestCampaignData,

    runDailyScoring,
    analyzeRetention,
    identifyExpansionOpportunities,
    runRetentionCampaign,
    recordIntervention,
  };
}
