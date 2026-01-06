import { useGitVan } from "../../core/context.mjs";

export function useRevOpsHealth() {
  const { config } = useGitVan();

  return {
    async calculate() {
      const metrics = await getHealthMetrics();
      const score = calculateHealthScore(metrics);
      const warnings = generateWarnings(metrics);
      const alerts = generateAlerts(metrics);
      const recommendations = generateRecommendations(metrics, score);

      return {
        score,
        metrics,
        warnings,
        alerts,
        recommendations,
        calculatedAt: new Date().toISOString(),
      };
    },
  };
}

async function getHealthMetrics() {
  return [
    { name: "MRR Growth", value: "12%", target: "10%", status: "good", weight: 20 },
    { name: "Churn Rate", value: "3.5%", target: "<5%", status: "good", weight: 25 },
    { name: "NRR", value: "95%", target: ">100%", status: "warning", weight: 20 },
    { name: "LTV/CAC", value: "3.2", target: ">3.0", status: "good", weight: 15 },
    { name: "Customer Health", value: "82/100", target: ">80", status: "good", weight: 10 },
    { name: "Payment Success", value: "96%", target: ">95%", status: "good", weight: 10 },
  ];
}

function calculateHealthScore(metrics) {
  let totalScore = 0;
  let totalWeight = 0;

  metrics.forEach((metric) => {
    const weight = metric.weight || 1;
    let score = 0;

    if (metric.status === "good") score = 100;
    else if (metric.status === "warning") score = 70;
    else if (metric.status === "alert") score = 40;

    totalScore += score * weight;
    totalWeight += weight;
  });

  return Math.round(totalScore / totalWeight);
}

function generateWarnings(metrics) {
  const warnings = [];

  const nrr = metrics.find((m) => m.name === "NRR");
  if (nrr && nrr.status === "warning") {
    warnings.push({
      message: "Net Revenue Retention is below target - focus on expansion revenue",
      severity: "medium",
    });
  }

  return warnings;
}

function generateAlerts(metrics) {
  const alerts = [];

  metrics.forEach((metric) => {
    if (metric.status === "alert") {
      alerts.push({
        message: `${metric.name} is critically below target`,
        severity: "high",
      });
    }
  });

  return alerts;
}

function generateRecommendations(metrics, score) {
  const recommendations = [];

  if (score < 80) {
    recommendations.push({
      title: "Improve Customer Retention",
      description: "Focus on reducing churn through proactive customer success",
    });
  }

  const nrr = metrics.find((m) => m.name === "NRR");
  if (nrr && nrr.status === "warning") {
    recommendations.push({
      title: "Drive Expansion Revenue",
      description: "Implement upsell and cross-sell strategies to increase NRR above 100%",
    });
  }

  recommendations.push({
    title: "Monitor Payment Health",
    description: "Continue maintaining high payment success rates through proactive retry logic",
  });

  return recommendations;
}
