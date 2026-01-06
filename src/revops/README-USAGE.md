# Churn Predictor - Usage Guide

## Features

### 1. Churn Prediction Model
- Track customer health metrics (0-100 score)
- Calculate churn risk score (0-100)
- Identify early warning signals:
  - No usage in 7+ days
  - Support tickets increasing
  - Failed payment attempts
  - Plan downgrade requests
  - Last login >30 days ago

### 2. Cohort Retention Tracking
- Day 1, 7, 30, 60, 90 retention
- Retention curves by cohort
- Cohort quality analysis

### 3. Expansion Opportunities
- Track expansion revenue
- Identify upsell candidates (usage >80%, plan small)
- Identify cross-sell opportunities
- Calculate expansion probability

### 4. Retention Campaigns
- Flag customers for outreach
- Track intervention outcomes
- Calculate intervention ROI

## Quick Start

```javascript
import { withGitVan } from "../core/context.mjs";
import { useChurnPredictor } from "./churn-predictor.mjs";

const context = { cwd: process.cwd(), env: { TZ: "UTC", LANG: "C" } };

await withGitVan(context, async () => {
  const predictor = useChurnPredictor();

  // Daily scoring
  const customers = [/* customer data */];
  const { scores, warnings } = await predictor.runDailyScoring(customers);

  // Flag for retention
  const flagged = predictor.flagForRetention(customers, scores.scores);

  // Identify expansion opportunities
  const opportunities = await predictor.identifyExpansionOpportunities(
    customers, subscriptions, products
  );

  // Run retention campaign
  const campaigns = await predictor.runRetentionCampaign(customers, scores.scores);

  // Analyze cohort retention
  const retentionData = await predictor.analyzeRetention(cohorts, customerData);
});
```

## Storage

All data stored in Git-native format:
- `refs/gitvan/revops/churn` - Churn scores and warnings
- `refs/gitvan/revops/cohorts` - Cohort retention data
- `refs/gitvan/revops/expansion` - Expansion opportunities
- `refs/gitvan/revops/campaigns` - Retention campaigns

## Scoring Algorithm

### Health Score (0-100)
- Base: 100
- No activity 7-30 days: -15
- No activity >30 days: -40
- 2-5 support tickets: -10
- >5 support tickets: -20
- Failed payment attempt: -25 each
- Plan downgrade request: -30
- Low usage (<10%): -25
- Moderate usage (10-30%): -10
- Infrequent login (>7 days): -10

### Churn Risk Score (0-100)
- Base: 100 - Health Score
- Revenue decline >20%: +20
- Revenue decline 10-20%: +10
- Engagement trend <-0.5: +15
- Engagement trend -0.2 to -0.5: +8

## Example Output

```javascript
// Churn Risk Scores
{
  "customer-001": 15,  // Low risk
  "customer-002": 85   // Critical risk
}

// Warning Signals
{
  "customer-002": [
    {
      type: "no_usage",
      severity: "critical",
      days: 35,
      message: "No usage in 35 days"
    },
    {
      type: "payment_failure",
      severity: "critical",
      attempts: 2,
      message: "2 failed payment attempts"
    }
  ]
}

// Flagged for Retention
[
  {
    customerId: "customer-002",
    priority: "critical",
    churnScore: 85,
    recommendedAction: "immediate_outreach",
    estimatedLoss: 7200
  }
]

// Expansion Opportunities
[
  {
    customerId: "customer-001",
    type: "upsell",
    reason: "high_usage",
    currentPlan: "basic",
    usagePercent: 85,
    probability: 94,
    estimatedRevenue: 750
  }
]

// Cohort Retention
[
  {
    cohortId: "cohort-2024-01",
    startDate: "2024-01-01",
    initialSize: 2,
    day1: 2,
    day1Percent: 100,
    day30: 2,
    day30Percent: 100,
    day90: 1,
    day90Percent: 50
  }
]
```
