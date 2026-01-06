import { useGitVan } from "../../core/context.mjs";

export function useRevOpsMetrics() {
  const { config } = useGitVan();

  return {
    async calculate() {
      const customers = await getCustomerData();
      const revenue = await getRevenueData();

      const mrr = calculateMRR(customers);
      const arr = mrr * 12;
      const arpu = mrr / customers.length;
      const churnRate = calculateChurnRate(customers);
      const nrr = calculateNRR(revenue);
      const ltv = calculateLTV(arpu, churnRate);
      const cac = calculateCAC();
      const ltvCacRatio = ltv / cac;

      return {
        mrr,
        arr,
        arpu,
        churnRate,
        nrr,
        ltv,
        cac,
        ltvCacRatio,
      };
    },
  };
}

async function getCustomerData() {
  return [
    { id: 1, mrr: 1000, status: "active", created: "2024-01-01", churned: null },
    { id: 2, mrr: 2000, status: "active", created: "2024-02-01", churned: null },
    { id: 3, mrr: 1500, status: "active", created: "2024-03-01", churned: null },
    { id: 4, mrr: 3000, status: "active", created: "2024-04-01", churned: null },
    { id: 5, mrr: 2500, status: "active", created: "2024-05-01", churned: null },
    { id: 6, mrr: 0, status: "churned", created: "2024-01-01", churned: "2024-12-01" },
  ];
}

async function getRevenueData() {
  return [
    { month: "2024-01", revenue: 1000, newRevenue: 1000, expansionRevenue: 0, churnRevenue: 0 },
    { month: "2024-02", revenue: 3000, newRevenue: 2000, expansionRevenue: 0, churnRevenue: 0 },
    { month: "2024-03", revenue: 4500, newRevenue: 1500, expansionRevenue: 0, churnRevenue: 0 },
    { month: "2024-04", revenue: 7500, newRevenue: 3000, expansionRevenue: 0, churnRevenue: 0 },
    { month: "2024-05", revenue: 10000, newRevenue: 2500, expansionRevenue: 0, churnRevenue: 0 },
    { month: "2024-06", revenue: 10000, newRevenue: 0, expansionRevenue: 0, churnRevenue: 0 },
    { month: "2024-07", revenue: 10500, newRevenue: 0, expansionRevenue: 500, churnRevenue: 0 },
    { month: "2024-08", revenue: 10500, newRevenue: 0, expansionRevenue: 0, churnRevenue: 0 },
    { month: "2024-09", revenue: 10500, newRevenue: 0, expansionRevenue: 0, churnRevenue: 0 },
    { month: "2024-10", revenue: 10500, newRevenue: 0, expansionRevenue: 0, churnRevenue: 0 },
    { month: "2024-11", revenue: 10500, newRevenue: 0, expansionRevenue: 0, churnRevenue: 0 },
    { month: "2024-12", revenue: 9000, newRevenue: 0, expansionRevenue: 0, churnRevenue: 1500 },
  ];
}

function calculateMRR(customers) {
  return customers
    .filter((c) => c.status === "active")
    .reduce((sum, c) => sum + c.mrr, 0);
}

function calculateChurnRate(customers) {
  const totalCustomers = customers.length;
  const churnedCustomers = customers.filter((c) => c.status === "churned").length;
  return totalCustomers > 0 ? (churnedCustomers / totalCustomers) * 100 : 0;
}

function calculateNRR(revenue) {
  const currentMonth = revenue[revenue.length - 1];
  const previousMonth = revenue[revenue.length - 2];

  if (!previousMonth || previousMonth.revenue === 0) return 100;

  const retainedRevenue = currentMonth.revenue - currentMonth.newRevenue;
  return (retainedRevenue / previousMonth.revenue) * 100;
}

function calculateLTV(arpu, churnRate) {
  if (churnRate === 0) return arpu * 36;
  return arpu / (churnRate / 100);
}

function calculateCAC() {
  return 500;
}
