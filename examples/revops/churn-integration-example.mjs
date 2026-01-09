import { withGitVan } from "../core/context.mjs";
import { useChurnPredictor } from "./churn-predictor.mjs";
import { useSubscriptionManager } from "./subscription-manager.mjs";
import { useRevenueMetrics } from "./revenue-metrics.mjs";

export async function integratedChurnAnalysis() {
  const context = {
    cwd: process.cwd(),
    env: { TZ: "UTC", LANG: "C" },
  };

  await withGitVan(context, async () => {
    const predictor = useChurnPredictor();
    const subscriptions = useSubscriptionManager();
    const revenue = useRevenueMetrics();

    const customerIds = ["cust-001", "cust-002", "cust-003"];
    const customers = [];

    for (const customerId of customerIds) {
      const subscription = await subscriptions.getSubscription(customerId);
      const usageData = await subscriptions.getUsageMetrics(customerId);
      const revenueData = await revenue.getCustomerRevenue(customerId);

      customers.push({
        id: customerId,
        mrr: subscription.amount,
        ltv: revenueData.ltv,
        tenure: Math.floor(
          (Date.now() - new Date(subscription.startDate).getTime()) /
            (1000 * 60 * 60 * 24 * 30)
        ),
        engagement: usageData.engagementScore || 0.5,
        products: subscription.items.map((i) => i.productId),
        history: {
          usage: {
            lastActivityDays: usageData.daysSinceLastActivity || 0,
            currentUsage: usageData.currentUsage || 0,
            planLimit: subscription.plan.limits.usage,
            loginFrequencyDays: usageData.averageLoginFrequency || 1,
            planDowngradeRequests: usageData.downgradeRequests || 0,
          },
          support: {
            ticketsLast30Days: usageData.supportTickets30d || 0,
            failedPaymentAttempts: subscription.failedPayments || 0,
          },
          revenue: {
            changePercent: revenueData.mrrGrowthPercent || 0,
          },
          engagement: {
            trend: usageData.engagementTrend || 0,
          },
        },
      });
    }

    const { scores, warnings } = await predictor.runDailyScoring(customers);

    console.log("Daily Churn Analysis");
    console.log("===================");
    console.log("Risk Scores:", scores.scores);
    console.log("\nWarning Signals:");
    for (const [custId, signals] of Object.entries(warnings)) {
      if (signals.length > 0) {
        console.log(`  ${custId}:`);
        signals.forEach((s) => console.log(`    - ${s.message} (${s.severity})`));
      }
    }

    const flagged = predictor.flagForRetention(customers, scores.scores);
    console.log("\nCustomers Flagged for Retention:", flagged.length);
    flagged.forEach((f) => {
      console.log(
        `  ${f.customerId}: ${f.priority} priority, score ${f.churnScore}, action: ${f.recommendedAction}`
      );
    });

    const subscriptionData = {};
    for (const customer of customers) {
      const sub = await subscriptions.getSubscription(customer.id);
      subscriptionData[customer.id] = {
        plan: sub.plan.name,
        mrr: sub.amount,
      };
    }

    const products = [
      { id: "prod-premium", name: "Premium Features", mrr: 100 },
      { id: "prod-analytics", name: "Advanced Analytics", mrr: 150 },
      { id: "prod-api", name: "API Access", mrr: 200 },
    ];

    const opportunities = await predictor.identifyExpansionOpportunities(
      customers,
      subscriptionData,
      products
    );

    console.log("\nExpansion Opportunities:", opportunities.length);
    opportunities.forEach((opp) => {
      console.log(
        `  ${opp.customerId}: ${opp.type} - ${opp.probability}% probability, +$${opp.estimatedRevenue}/mo`
      );
    });

    const campaigns = await predictor.runRetentionCampaign(
      customers,
      scores.scores
    );

    console.log("\nRetention Campaigns Created:", campaigns.length);
    campaigns.forEach((c) => {
      console.log(
        `  Campaign ${c.id}: ${c.priority} priority for ${c.customerId}`
      );
    });

    const simulateIntervention = {
      id: "intervention-001",
      campaignId: campaigns[0]?.id,
      customerId: campaigns[0]?.customerId,
      type: "proactive_support",
      cost: 150,
    };

    const interventionOutcome = {
      result: "retained",
      retained: true,
      revenue: 7200,
    };

    if (campaigns.length > 0) {
      const roi = await predictor.recordIntervention(
        simulateIntervention,
        interventionOutcome
      );
      console.log("\nIntervention ROI:");
      console.log(`  Value: $${roi.roiValue}`);
      console.log(`  Percent: ${roi.roiPercent}%`);
    }

    console.log("\nAll data stored in Git-native format at:");
    console.log("  - refs/gitvan/revops/churn");
    console.log("  - refs/gitvan/revops/expansion");
    console.log("  - refs/gitvan/revops/campaigns");
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  integratedChurnAnalysis().catch(console.error);
}
