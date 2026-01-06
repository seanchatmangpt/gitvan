import { useGitVan } from "../../core/context.mjs";

export function useRevOpsCustomers() {
  const { config } = useGitVan();

  return {
    async list(options = {}) {
      const { filter = "all", limit = 50 } = options;

      const allCustomers = await getCustomers();
      const filtered = filterCustomers(allCustomers, filter);
      const limited = filtered.slice(0, limit);

      const totalMrr = limited.reduce((sum, c) => sum + c.mrr, 0);
      const avgHealthScore = Math.round(
        limited.reduce((sum, c) => sum + c.healthScore, 0) / limited.length
      );

      return {
        customers: limited,
        totalMrr,
        avgHealthScore,
        filter,
        totalCount: filtered.length,
      };
    },
  };
}

async function getCustomers() {
  return [
    {
      id: 1,
      name: "Acme Corp",
      status: "active",
      healthScore: 92,
      mrr: 5000,
      ltv: 125000,
      churnRisk: 5,
      notes: "Strong engagement, good expansion potential",
    },
    {
      id: 2,
      name: "TechStart Inc",
      status: "active",
      healthScore: 65,
      mrr: 3500,
      ltv: 70000,
      churnRisk: 35,
      notes: "Low engagement last 2 months, at-risk",
    },
    {
      id: 3,
      name: "DevOps LLC",
      status: "active",
      healthScore: 55,
      mrr: 2800,
      ltv: 50400,
      churnRisk: 45,
      notes: "Payment issues, needs intervention",
    },
    {
      id: 4,
      name: "CloudNine Systems",
      status: "active",
      healthScore: 88,
      mrr: 7500,
      ltv: 187500,
      churnRisk: 8,
      notes: "Excellent customer, expansion opportunity",
    },
    {
      id: 5,
      name: "DataFlow Analytics",
      status: "active",
      healthScore: 78,
      mrr: 4200,
      ltv: 100800,
      churnRisk: 15,
      notes: null,
    },
    {
      id: 6,
      name: "SecureNet Partners",
      status: "active",
      healthScore: 95,
      mrr: 9800,
      ltv: 294000,
      churnRisk: 3,
      notes: "Champion customer, potential case study",
    },
    {
      id: 7,
      name: "AgileTeam Co",
      status: "active",
      healthScore: 70,
      mrr: 2200,
      ltv: 61600,
      churnRisk: 25,
      notes: "Needs onboarding support",
    },
    {
      id: 8,
      name: "InnovateHub",
      status: "active",
      healthScore: 82,
      mrr: 5600,
      ltv: 156800,
      churnRisk: 12,
      notes: "Expansion opportunity - interested in enterprise plan",
    },
  ];
}

function filterCustomers(customers, filter) {
  if (filter === "at-risk") {
    return customers.filter((c) => c.churnRisk > 30);
  }

  if (filter === "expansion") {
    return customers.filter((c) => c.healthScore > 80 && c.mrr > 4000);
  }

  return customers;
}
