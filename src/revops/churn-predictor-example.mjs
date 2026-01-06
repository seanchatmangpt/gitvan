import { withGitVan } from "../core/context.mjs";
import { useChurnPredictor } from "./churn-predictor.mjs";

export async function exampleUsage() {
  const context = {
    cwd: process.cwd(),
    env: { TZ: "UTC", LANG: "C" },
  };

  await withGitVan(context, async () => {
    const predictor = useChurnPredictor();

    const customers = [
      {
        id: "customer-001",
        mrr: 500,
        ltv: 12000,
        tenure: 8,
        engagement: 0.75,
        products: ["product-a"],
        history: {
          usage: {
            lastActivityDays: 2,
            currentUsage: 850,
            planLimit: 1000,
            loginFrequencyDays: 1,
            planDowngradeRequests: 0,
          },
          support: {
            ticketsLast30Days: 1,
            failedPaymentAttempts: 0,
          },
          revenue: {
            changePercent: 5,
          },
          engagement: {
            trend: 0.1,
          },
        },
      },
      {
        id: "customer-002",
        mrr: 300,
        ltv: 7200,
        tenure: 12,
        engagement: 0.4,
        products: ["product-a"],
        history: {
          usage: {
            lastActivityDays: 35,
            currentUsage: 150,
            planLimit: 1000,
            loginFrequencyDays: 40,
            planDowngradeRequests: 1,
          },
          support: {
            ticketsLast30Days: 6,
            failedPaymentAttempts: 2,
          },
          revenue: {
            changePercent: -15,
          },
          engagement: {
            trend: -0.6,
          },
        },
      },
    ];

    const { scores, warnings } = await predictor.runDailyScoring(customers);
    console.log("Churn Risk Scores:", scores);
    console.log("Warning Signals:", warnings);

    const flagged = predictor.flagForRetention(
      customers,
      scores.scores
    );
    console.log("Flagged for Retention:", flagged);

    const subscriptions = {
      "customer-001": { plan: "basic", mrr: 500 },
      "customer-002": { plan: "basic", mrr: 300 },
    };

    const products = [
      { id: "product-a", name: "Product A", mrr: 100 },
      { id: "product-b", name: "Product B", mrr: 150 },
      { id: "product-c", name: "Product C", mrr: 200 },
    ];

    const opportunities = await predictor.identifyExpansionOpportunities(
      customers,
      subscriptions,
      products
    );
    console.log("Expansion Opportunities:", opportunities);

    const campaigns = await predictor.runRetentionCampaign(
      customers,
      scores.scores
    );
    console.log("Retention Campaigns:", campaigns);

    const cohorts = [
      {
        id: "cohort-2024-01",
        startDate: "2024-01-01T00:00:00.000Z",
        customers: ["customer-001", "customer-002"],
      },
    ];

    const customerData = {
      "customer-001": {
        signupDate: "2024-01-01T00:00:00.000Z",
      },
      "customer-002": {
        signupDate: "2024-01-01T00:00:00.000Z",
        churnDate: "2024-06-15T00:00:00.000Z",
      },
    };

    const retentionData = await predictor.analyzeRetention(cohorts, customerData);
    console.log("Cohort Retention:", retentionData);
  });
}
