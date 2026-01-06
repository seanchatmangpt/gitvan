import { useGitVan, tryUseGitVan } from "../core/context.mjs";
import { useGit } from "../composables/git/index.mjs";

const NOTES_REF = "refs/notes/gitvan/unit-economics";

function round(value) {
  if (value === null || value === undefined || !isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

function safe(value, fallback = null) {
  if (value === null || value === undefined || !isFinite(value) || value < 0) {
    return fallback;
  }
  return value;
}

function safeDivide(numerator, denominator, fallback = null) {
  if (!denominator || denominator === 0 || !isFinite(numerator) || !isFinite(denominator) || numerator < 0 || denominator < 0) {
    return fallback;
  }
  return numerator / denominator;
}

export function useUnitEconomics() {
  let ctx;
  try {
    ctx = useGitVan();
  } catch {
    ctx = tryUseGitVan?.() || null;
  }

  const cwd = (ctx && ctx.cwd) || process.cwd();
  const env = {
    ...process.env,
    ...(ctx && ctx.env ? ctx.env : {}),
    TZ: "UTC",
    LANG: "C",
  };

  const base = { cwd, env };
  const git = useGit();

  async function readState() {
    try {
      const data = await git.noteShow(NOTES_REF, "HEAD");
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  async function writeState(state) {
    try {
      await git.noteAdd(NOTES_REF, JSON.stringify(state, null, 2), "HEAD");
      return { ok: true };
    } catch (error) {
      throw new Error(`Failed to write unit economics state: ${error.message}`);
    }
  }

  return {
    cwd: base.cwd,
    env: base.env,

    async calculateCAC(marketingSpend, customersAcquired) {
      const cac = safeDivide(marketingSpend, customersAcquired);
      return round(cac);
    },

    async calculateMagicNumber(arrGrowth, salesAndMarketingSpend) {
      const magicNumber = safeDivide(arrGrowth, salesAndMarketingSpend);
      return round(magicNumber);
    },

    async calculateLTV(avgRevPerCustomer, avgCustomerLifetimeMonths, grossMargin = 1.0) {
      if (!avgRevPerCustomer || !avgCustomerLifetimeMonths || avgCustomerLifetimeMonths <= 0) {
        return null;
      }
      const ltv = avgRevPerCustomer * avgCustomerLifetimeMonths * safe(grossMargin, 1.0);
      return round(ltv);
    },

    async calculateLTVFromChurn(avgRevPerCustomer, churnRate, grossMargin = 1.0) {
      if (!avgRevPerCustomer || !churnRate || churnRate <= 0 || churnRate >= 1) {
        return null;
      }
      const avgLifetimeMonths = 1 / churnRate;
      const ltv = avgRevPerCustomer * avgLifetimeMonths * safe(grossMargin, 1.0);
      return round(ltv);
    },

    async calculateLTVCACRatio(ltv, cac) {
      const ratio = safeDivide(ltv, cac);
      return round(ratio);
    },

    async calculatePaybackPeriod(cac, monthlyRevPerCustomer) {
      const payback = safeDivide(cac, monthlyRevPerCustomer);
      return round(payback);
    },

    async calculateContributionMargin(revenue, directCosts) {
      const margin = safe(revenue, 0) - safe(directCosts, 0);
      return round(margin);
    },

    async calculateContributionMarginPercent(revenue, directCosts) {
      if (!revenue || revenue <= 0) return null;
      const margin = (safe(revenue, 0) - safe(directCosts, 0)) / revenue;
      return round(margin * 100);
    },

    async calculateGrossMargin(revenue, cogs) {
      const margin = safe(revenue, 0) - safe(cogs, 0);
      return round(margin);
    },

    async calculateGrossMarginPercent(revenue, cogs) {
      if (!revenue || revenue <= 0) return null;
      const margin = (safe(revenue, 0) - safe(cogs, 0)) / revenue;
      return round(margin * 100);
    },

    async calculateNetMargin(revenue, totalCosts) {
      const margin = safe(revenue, 0) - safe(totalCosts, 0);
      return round(margin);
    },

    async calculateNetMarginPercent(revenue, totalCosts) {
      if (!revenue || revenue <= 0) return null;
      const margin = (safe(revenue, 0) - safe(totalCosts, 0)) / revenue;
      return round(margin * 100);
    },

    async calculateCohortCAC(cohortMarketingSpend, cohortCustomersAcquired) {
      const cac = safeDivide(cohortMarketingSpend, cohortCustomersAcquired);
      return round(cac);
    },

    async calculateCohortLTV(cohortTotalRevenue, cohortCustomerCount) {
      const ltv = safeDivide(cohortTotalRevenue, cohortCustomerCount);
      return round(ltv);
    },

    async calculateCohortPayback(cohortCAC, cohortMonthlyRevPerCustomer) {
      const payback = safeDivide(cohortCAC, cohortMonthlyRevPerCustomer);
      return round(payback);
    },

    async calculateCohortProfitability(cohortLTV, cohortCAC) {
      if (cohortLTV === null || cohortCAC === null) return null;
      const profit = cohortLTV - cohortCAC;
      return round(profit);
    },

    async calculateSalesEfficiency(newARR, salesSpend) {
      const efficiency = safeDivide(newARR, salesSpend);
      return round(efficiency);
    },

    async calculateMarketingROI(revenue, marketingSpend) {
      if (!marketingSpend || marketingSpend <= 0) return null;
      const roi = (safe(revenue, 0) - safe(marketingSpend, 0)) / marketingSpend;
      return round(roi * 100);
    },

    async calculateCustomerAcquisitionEfficiency(newMRR, salesAndMarketingSpend) {
      const efficiency = safeDivide(newMRR, salesAndMarketingSpend);
      return round(efficiency);
    },

    async calculateRevenuePerEmployee(revenue, employeeCount) {
      const revenuePerEmp = safeDivide(revenue, employeeCount);
      return round(revenuePerEmp);
    },

    async projectARR(currentARR, growthRate, periods) {
      if (!currentARR || !periods || periods <= 0) return null;
      const rate = safe(growthRate, 0);
      const projected = currentARR * Math.pow(1 + rate, periods);
      return round(projected);
    },

    async calculateBreakevenCustomers(fixedCosts, contributionMarginPerCustomer) {
      const breakeven = safeDivide(fixedCosts, contributionMarginPerCustomer);
      return breakeven ? Math.ceil(breakeven) : null;
    },

    async modelPricingChange(currentARR, currentCustomers, priceChangePercent, elasticity = 1.0) {
      if (!currentARR || !currentCustomers || currentCustomers <= 0) return null;

      const priceChange = safe(priceChangePercent, 0) / 100;
      const demandChange = -1 * priceChange * safe(elasticity, 1.0);

      const currentPrice = currentARR / currentCustomers;
      const newPrice = currentPrice * (1 + priceChange);
      const newCustomers = currentCustomers * (1 + demandChange);
      const newARR = newPrice * newCustomers;

      return {
        currentARR: round(currentARR),
        newARR: round(newARR),
        arrChange: round(newARR - currentARR),
        arrChangePercent: round(((newARR - currentARR) / currentARR) * 100),
        currentPrice: round(currentPrice),
        newPrice: round(newPrice),
        currentCustomers: round(currentCustomers),
        newCustomers: round(newCustomers),
        customerChange: round(newCustomers - currentCustomers),
        customerChangePercent: round(((newCustomers - currentCustomers) / currentCustomers) * 100),
      };
    },

    async modelChurnChange(currentARR, currentChurnRate, newChurnRate, averageMonthlyRev) {
      if (!currentARR || !averageMonthlyRev) return null;

      const currentAvgLifetime = safeDivide(1, currentChurnRate);
      const newAvgLifetime = safeDivide(1, newChurnRate);

      if (!currentAvgLifetime || !newAvgLifetime) return null;

      const currentLTV = averageMonthlyRev * currentAvgLifetime;
      const newLTV = averageMonthlyRev * newAvgLifetime;

      return {
        currentChurnRate: round(safe(currentChurnRate, 0) * 100),
        newChurnRate: round(safe(newChurnRate, 0) * 100),
        churnReduction: round((safe(currentChurnRate, 0) - safe(newChurnRate, 0)) * 100),
        currentAvgLifetimeMonths: round(currentAvgLifetime),
        newAvgLifetimeMonths: round(newAvgLifetime),
        lifetimeIncrease: round(newAvgLifetime - currentAvgLifetime),
        currentLTV: round(currentLTV),
        newLTV: round(newLTV),
        ltvIncrease: round(newLTV - currentLTV),
        ltvIncreasePercent: round(((newLTV - currentLTV) / currentLTV) * 100),
      };
    },

    async getUnitEconomicsSnapshot(data) {
      const {
        marketingSpend = 0,
        salesSpend = 0,
        customersAcquired = 0,
        currentARR = 0,
        previousARR = 0,
        revenue = 0,
        cogs = 0,
        directCosts = 0,
        totalCosts = 0,
        avgMonthlyRevPerCustomer = 0,
        churnRate = 0,
        grossMarginPercent = 100,
        employeeCount = 0,
      } = data;

      const salesAndMarketingSpend = safe(marketingSpend, 0) + safe(salesSpend, 0);
      const arrGrowth = safe(currentARR, 0) - safe(previousARR, 0);

      const cac = await this.calculateCAC(marketingSpend, customersAcquired);
      const magicNumber = await this.calculateMagicNumber(arrGrowth, salesAndMarketingSpend);
      const ltv = await this.calculateLTVFromChurn(
        avgMonthlyRevPerCustomer,
        churnRate,
        grossMarginPercent / 100
      );
      const ltvCacRatio = await this.calculateLTVCACRatio(ltv, cac);
      const paybackPeriod = await this.calculatePaybackPeriod(cac, avgMonthlyRevPerCustomer);
      const contributionMargin = await this.calculateContributionMargin(revenue, directCosts);
      const contributionMarginPercent = await this.calculateContributionMarginPercent(revenue, directCosts);
      const grossMargin = await this.calculateGrossMargin(revenue, cogs);
      const grossMarginCalcPercent = await this.calculateGrossMarginPercent(revenue, cogs);
      const netMargin = await this.calculateNetMargin(revenue, totalCosts);
      const netMarginPercent = await this.calculateNetMarginPercent(revenue, totalCosts);
      const salesEfficiency = await this.calculateSalesEfficiency(arrGrowth, salesSpend);
      const marketingROI = await this.calculateMarketingROI(revenue, marketingSpend);
      const cae = await this.calculateCustomerAcquisitionEfficiency(
        arrGrowth / 12,
        salesAndMarketingSpend
      );
      const revenuePerEmployee = employeeCount > 0
        ? await this.calculateRevenuePerEmployee(revenue, employeeCount)
        : null;

      return {
        cac,
        magicNumber,
        ltv,
        ltvCacRatio,
        paybackPeriod,
        contributionMargin,
        contributionMarginPercent,
        grossMargin,
        grossMarginPercent: grossMarginCalcPercent,
        netMargin,
        netMarginPercent,
        salesEfficiency,
        marketingROI,
        customerAcquisitionEfficiency: cae,
        revenuePerEmployee,
      };
    },

    async saveSnapshot(name, data) {
      const state = await readState();
      const timestamp = new Date().toISOString();

      if (!state.snapshots) {
        state.snapshots = {};
      }

      state.snapshots[name] = {
        ...data,
        timestamp,
      };

      await writeState(state);
      return { ok: true, name, timestamp };
    },

    async getSnapshot(name) {
      const state = await readState();
      return state.snapshots?.[name] || null;
    },

    async listSnapshots() {
      const state = await readState();
      return Object.keys(state.snapshots || {});
    },

    async deleteSnapshot(name) {
      const state = await readState();
      if (state.snapshots && state.snapshots[name]) {
        delete state.snapshots[name];
        await writeState(state);
        return { ok: true };
      }
      return { ok: false, error: "Snapshot not found" };
    },

    async saveCohort(cohortId, cohortData) {
      const state = await readState();
      const timestamp = new Date().toISOString();

      if (!state.cohorts) {
        state.cohorts = {};
      }

      state.cohorts[cohortId] = {
        ...cohortData,
        timestamp,
      };

      await writeState(state);
      return { ok: true, cohortId, timestamp };
    },

    async getCohort(cohortId) {
      const state = await readState();
      return state.cohorts?.[cohortId] || null;
    },

    async listCohorts() {
      const state = await readState();
      return Object.keys(state.cohorts || {});
    },

    async getCohortEconomics(cohortId) {
      const cohort = await this.getCohort(cohortId);
      if (!cohort) return null;

      const {
        marketingSpend = 0,
        customersAcquired = 0,
        totalRevenue = 0,
        customerCount = 0,
        monthlyRevPerCustomer = 0,
      } = cohort;

      const cohortCAC = await this.calculateCohortCAC(marketingSpend, customersAcquired);
      const cohortLTV = await this.calculateCohortLTV(totalRevenue, customerCount);
      const cohortPayback = await this.calculateCohortPayback(cohortCAC, monthlyRevPerCustomer);
      const cohortProfitability = await this.calculateCohortProfitability(cohortLTV, cohortCAC);

      return {
        cohortId,
        cohortCAC,
        cohortLTV,
        cohortPayback,
        cohortProfitability,
        ltvCacRatio: await this.calculateLTVCACRatio(cohortLTV, cohortCAC),
      };
    },

    async compareSnapshots(snapshot1Name, snapshot2Name) {
      const snap1 = await this.getSnapshot(snapshot1Name);
      const snap2 = await this.getSnapshot(snapshot2Name);

      if (!snap1 || !snap2) {
        return { error: "One or both snapshots not found" };
      }

      const comparison = {};
      const keys = new Set([...Object.keys(snap1), ...Object.keys(snap2)]);

      for (const key of keys) {
        if (key === "timestamp") continue;

        const val1 = snap1[key];
        const val2 = snap2[key];

        if (typeof val1 === "number" && typeof val2 === "number") {
          comparison[key] = {
            before: val1,
            after: val2,
            change: round(val2 - val1),
            changePercent: val1 !== 0 ? round(((val2 - val1) / Math.abs(val1)) * 100) : null,
          };
        }
      }

      return comparison;
    },

    async getState() {
      return await readState();
    },

    async clearState() {
      await writeState({});
      return { ok: true };
    },
  };
}
