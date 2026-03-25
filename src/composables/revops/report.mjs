import { useGitVan } from "../../core/context.mjs";

/**
 * RevOps report composable
 * Provides business reporting and analytics
 *
 * @returns {Object} Report interface
 */
export function useRevOpsReport() {
  const { config } = useGitVan();

  return {
    async generate(period, options = {}) {
      const { limit = 12 } = options;

      const trends = await getRevenueTrends(period, limit);
      const cohorts = await getCohortPerformance();
      const atRisk = await getAtRiskCustomers();

      return {
        period,
        trends,
        cohorts,
        atRisk,
        generatedAt: new Date().toISOString(),
      };
    },
  };
}

async function getRevenueTrends(period, limit) {
  const data = {
    daily: generateDailyData(limit),
    weekly: generateWeeklyData(limit),
    monthly: generateMonthlyData(limit),
  };

  return data[period] || data.monthly;
}

function generateMonthlyData(limit) {
  const trends = [];
  let baseRevenue = 5000;

  for (let i = limit - 1; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    const growth = Math.random() * 20 - 5;
    const revenue = Math.floor(baseRevenue * (1 + growth / 100));
    const change = ((revenue - baseRevenue) / baseRevenue) * 100;

    trends.push({
      period,
      revenue,
      change,
    });

    baseRevenue = revenue;
  }

  return trends;
}

function generateWeeklyData(limit) {
  const trends = [];
  let baseRevenue = 1250;

  for (let i = limit - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i * 7);
    const period = `W${Math.floor(i / 4) + 1}`;

    const growth = Math.random() * 15 - 3;
    const revenue = Math.floor(baseRevenue * (1 + growth / 100));
    const change = ((revenue - baseRevenue) / baseRevenue) * 100;

    trends.push({
      period,
      revenue,
      change,
    });

    baseRevenue = revenue;
  }

  return trends;
}

function generateDailyData(limit) {
  const trends = [];
  let baseRevenue = 350;

  for (let i = limit - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const period = date.toISOString().split("T")[0];

    const growth = Math.random() * 10 - 2;
    const revenue = Math.floor(baseRevenue * (1 + growth / 100));
    const change = ((revenue - baseRevenue) / baseRevenue) * 100;

    trends.push({
      period,
      revenue,
      change,
    });

    baseRevenue = revenue;
  }

  return trends;
}

async function getCohortPerformance() {
  return [
    { name: "2024-Q1", retention: 92, revenue: 25000 },
    { name: "2024-Q2", retention: 88, revenue: 32000 },
    { name: "2024-Q3", retention: 85, revenue: 28000 },
    { name: "2024-Q4", retention: 90, revenue: 35000 },
  ];
}

async function getAtRiskCustomers() {
  return [
    { name: "Acme Corp", riskScore: 75, mrr: 5000 },
    { name: "TechStart Inc", riskScore: 68, mrr: 3500 },
    { name: "DevOps LLC", riskScore: 82, mrr: 2800 },
  ];
}
