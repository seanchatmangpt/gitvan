import { useGitVan } from "../../core/context.mjs";

export function useRevOpsForecast() {
  const { config } = useGitVan();

  return {
    async project(options = {}) {
      const { growthRate = 0.1, months = 12 } = options;

      const currentMetrics = await getCurrentMetrics();
      const projections = generateProjections(currentMetrics, growthRate, months);
      const breakeven = calculateBreakeven(currentMetrics, growthRate);
      const scenarios = generateScenarios(currentMetrics, months);

      return {
        currentMetrics,
        projections,
        breakeven,
        scenarios,
        parameters: { growthRate, months },
        generatedAt: new Date().toISOString(),
      };
    },
  };
}

async function getCurrentMetrics() {
  return {
    mrr: 10000,
    arr: 120000,
    customers: 25,
    arpu: 400,
    churnRate: 3.5,
  };
}

function generateProjections(current, growthRate, months) {
  const projections = [];
  let currentMRR = current.mrr;

  for (let i = 1; i <= months; i++) {
    currentMRR = currentMRR * (1 + growthRate);
    const arr = currentMRR * 12;

    projections.push({
      month: `Month ${i}`,
      mrr: Math.round(currentMRR),
      arr: Math.round(arr),
    });
  }

  return projections;
}

function calculateBreakeven(current, growthRate) {
  const burnRate = 15000;
  const arrTarget = burnRate * 12;

  let monthsToBreakeven = 0;
  let projectedARR = current.arr;

  while (projectedARR < arrTarget && monthsToBreakeven < 120) {
    projectedARR = projectedARR * (1 + growthRate);
    monthsToBreakeven++;
  }

  return {
    burnRate,
    arrTarget,
    monthsToBreakeven: monthsToBreakeven < 120 ? monthsToBreakeven : null,
  };
}

function generateScenarios(current, months) {
  const scenarios = [
    { name: "Conservative", growthRate: 0.05 },
    { name: "Base Case", growthRate: 0.10 },
    { name: "Aggressive", growthRate: 0.15 },
  ];

  return scenarios.map((scenario) => {
    let mrr = current.mrr;
    for (let i = 0; i < months; i++) {
      mrr = mrr * (1 + scenario.growthRate);
    }

    return {
      name: scenario.name,
      growthRate: scenario.growthRate,
      arrAt12Months: Math.round(mrr * 12),
    };
  });
}
