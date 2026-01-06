import { useGitVan, tryUseGitVan } from "../core/context.mjs";
import { createLogger } from "../utils/logger.mjs";
import { createHash } from "node:crypto";

const logger = createLogger("revops:revenue-metrics");

export function useRevenueMetrics() {
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
  const cache = new Map();

  function getCacheKey(fn, args) {
    return createHash("sha256")
      .update(`${fn}-${JSON.stringify(args)}`)
      .digest("hex");
  }

  function withCache(fn, args, ttl = 60000) {
    const key = getCacheKey(fn, args);
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.value;
    }
    return null;
  }

  function setCache(fn, args, value, ttl = 60000) {
    const key = getCacheKey(fn, args);
    cache.set(key, { value, timestamp: Date.now() });
    return value;
  }

  function parseDate(date) {
    if (date instanceof Date) return date;
    if (typeof date === "string") return new Date(date);
    if (typeof date === "number") return new Date(date);
    throw new Error(`Invalid date: ${date}`);
  }

  function getMonthKey(date) {
    const d = parseDate(date);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  function getWeekKey(date) {
    const d = parseDate(date);
    const weekStart = new Date(d);
    weekStart.setUTCDate(d.getUTCDate() - d.getUTCDay());
    return weekStart.toISOString().split("T")[0];
  }

  function getDayKey(date) {
    return parseDate(date).toISOString().split("T")[0];
  }

  function daysBetween(start, end) {
    const s = parseDate(start);
    const e = parseDate(end);
    return Math.floor((e - s) / (1000 * 60 * 60 * 24));
  }

  function monthsBetween(start, end) {
    const s = parseDate(start);
    const e = parseDate(end);
    const years = e.getUTCFullYear() - s.getUTCFullYear();
    const months = e.getUTCMonth() - s.getUTCMonth();
    return years * 12 + months;
  }

  return {
    cwd: base.cwd,
    env: base.env,

    calculateMRR(subscriptions, referenceDate = new Date()) {
      const cached = withCache("calculateMRR", { subscriptions, referenceDate });
      if (cached) return cached;

      const refDate = parseDate(referenceDate);
      const monthKey = getMonthKey(refDate);

      let totalMRR = 0;
      const activeSubscriptions = subscriptions.filter((sub) => {
        const startDate = parseDate(sub.startDate);
        const endDate = sub.endDate ? parseDate(sub.endDate) : null;
        return startDate <= refDate && (!endDate || endDate >= refDate);
      });

      for (const sub of activeSubscriptions) {
        if (sub.billingInterval === "monthly") {
          totalMRR += sub.amount;
        } else if (sub.billingInterval === "annual") {
          totalMRR += sub.amount / 12;
        } else if (sub.billingInterval === "quarterly") {
          totalMRR += sub.amount / 3;
        } else if (sub.billingInterval === "weekly") {
          totalMRR += sub.amount * 4.33;
        } else {
          totalMRR += sub.amount;
        }
      }

      const result = {
        mrr: totalMRR,
        activeSubscriptions: activeSubscriptions.length,
        month: monthKey,
        referenceDate: refDate.toISOString(),
      };

      return setCache("calculateMRR", { subscriptions, referenceDate }, result);
    },

    calculateARR(subscriptions, referenceDate = new Date()) {
      const mrr = this.calculateMRR(subscriptions, referenceDate);
      return {
        arr: mrr.mrr * 12,
        mrr: mrr.mrr,
        activeSubscriptions: mrr.activeSubscriptions,
        referenceDate: mrr.referenceDate,
      };
    },

    calculateARPU(subscriptions, referenceDate = new Date()) {
      const mrr = this.calculateMRR(subscriptions, referenceDate);
      const uniqueUsers = new Set(
        subscriptions
          .filter((sub) => {
            const startDate = parseDate(sub.startDate);
            const endDate = sub.endDate ? parseDate(sub.endDate) : null;
            const refDate = parseDate(referenceDate);
            return startDate <= refDate && (!endDate || endDate >= refDate);
          })
          .map((sub) => sub.userId)
      ).size;

      return {
        arpu: uniqueUsers > 0 ? mrr.mrr / uniqueUsers : 0,
        mrr: mrr.mrr,
        totalUsers: uniqueUsers,
        referenceDate: mrr.referenceDate,
      };
    },

    calculateACPU(costs, referenceDate = new Date()) {
      const refDate = parseDate(referenceDate);
      const monthKey = getMonthKey(refDate);

      const monthlyCosts = costs.filter((cost) => {
        const costDate = parseDate(cost.date);
        return getMonthKey(costDate) === monthKey;
      });

      const totalCost = monthlyCosts.reduce((sum, cost) => sum + cost.amount, 0);
      const uniqueUsers = new Set(monthlyCosts.map((c) => c.userId)).size;

      return {
        acpu: uniqueUsers > 0 ? totalCost / uniqueUsers : 0,
        totalCost,
        totalUsers: uniqueUsers,
        month: monthKey,
        referenceDate: refDate.toISOString(),
      };
    },

    calculateLTV(subscriptions, userId, referenceDate = new Date()) {
      const userSubs = subscriptions.filter((sub) => sub.userId === userId);
      if (userSubs.length === 0) {
        return {
          ltv: 0,
          totalRevenue: 0,
          lifetimeMonths: 0,
          userId,
        };
      }

      const firstSub = userSubs.reduce((earliest, sub) =>
        parseDate(sub.startDate) < parseDate(earliest.startDate) ? sub : earliest
      );

      const lastSub = userSubs.reduce((latest, sub) => {
        const subEnd = sub.endDate || referenceDate;
        const latestEnd = latest.endDate || referenceDate;
        return parseDate(subEnd) > parseDate(latestEnd) ? sub : latest;
      });

      const lifetimeStart = parseDate(firstSub.startDate);
      const lifetimeEnd = lastSub.endDate
        ? parseDate(lastSub.endDate)
        : parseDate(referenceDate);

      const lifetimeMonths = Math.max(1, monthsBetween(lifetimeStart, lifetimeEnd));

      const totalRevenue = userSubs.reduce((sum, sub) => {
        const start = parseDate(sub.startDate);
        const end = sub.endDate ? parseDate(sub.endDate) : parseDate(referenceDate);
        const months = Math.max(1, monthsBetween(start, end));

        let monthlyAmount = sub.amount;
        if (sub.billingInterval === "annual") {
          monthlyAmount = sub.amount / 12;
        } else if (sub.billingInterval === "quarterly") {
          monthlyAmount = sub.amount / 3;
        } else if (sub.billingInterval === "weekly") {
          monthlyAmount = sub.amount * 4.33;
        }

        return sum + monthlyAmount * months;
      }, 0);

      return {
        ltv: totalRevenue,
        totalRevenue,
        lifetimeMonths,
        avgMonthlyRevenue: totalRevenue / lifetimeMonths,
        userId,
        firstSubscription: firstSub.startDate,
        lastActivity: lastSub.endDate || referenceDate,
      };
    },

    calculateCAC(acquisitionCosts, newCustomers, period) {
      const totalCost = acquisitionCosts.reduce((sum, cost) => sum + cost.amount, 0);
      const customerCount = newCustomers.length;

      return {
        cac: customerCount > 0 ? totalCost / customerCount : 0,
        totalCost,
        newCustomers: customerCount,
        period,
      };
    },

    calculatePaybackPeriod(subscriptions, userId, cac) {
      const ltv = this.calculateLTV(subscriptions, userId);
      if (ltv.avgMonthlyRevenue === 0) {
        return {
          paybackMonths: Infinity,
          cac,
          avgMonthlyRevenue: 0,
          userId,
        };
      }

      return {
        paybackMonths: cac / ltv.avgMonthlyRevenue,
        cac,
        avgMonthlyRevenue: ltv.avgMonthlyRevenue,
        userId,
      };
    },

    calculateNRR(subscriptions, startDate, endDate) {
      const start = parseDate(startDate);
      const end = parseDate(endDate);

      const startMRR = this.calculateMRR(subscriptions, start).mrr;
      const endMRR = this.calculateMRR(subscriptions, end).mrr;

      const newCustomerRevenue = subscriptions
        .filter((sub) => {
          const subStart = parseDate(sub.startDate);
          return subStart > start && subStart <= end;
        })
        .reduce((sum, sub) => {
          let monthlyAmount = sub.amount;
          if (sub.billingInterval === "annual") monthlyAmount = sub.amount / 12;
          else if (sub.billingInterval === "quarterly") monthlyAmount = sub.amount / 3;
          else if (sub.billingInterval === "weekly") monthlyAmount = sub.amount * 4.33;
          return sum + monthlyAmount;
        }, 0);

      const adjustedEndMRR = endMRR - newCustomerRevenue;
      const nrr = startMRR > 0 ? (adjustedEndMRR / startMRR) * 100 : 0;

      return {
        nrr,
        startMRR,
        endMRR,
        adjustedEndMRR,
        newCustomerRevenue,
        expansionRevenue: Math.max(0, adjustedEndMRR - startMRR),
        contractionRevenue: Math.max(0, startMRR - adjustedEndMRR),
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      };
    },

    createCohorts(subscriptions, cohortBy = "month") {
      const cohorts = new Map();

      for (const sub of subscriptions) {
        const startDate = parseDate(sub.startDate);
        let cohortKey;

        if (cohortBy === "month") {
          cohortKey = getMonthKey(startDate);
        } else if (cohortBy === "week") {
          cohortKey = getWeekKey(startDate);
        } else if (cohortBy === "quarter") {
          const quarter = Math.floor(startDate.getUTCMonth() / 3) + 1;
          cohortKey = `${startDate.getUTCFullYear()}-Q${quarter}`;
        } else {
          cohortKey = getDayKey(startDate);
        }

        if (!cohorts.has(cohortKey)) {
          cohorts.set(cohortKey, {
            cohortKey,
            cohortDate: startDate.toISOString(),
            customers: new Set(),
            subscriptions: [],
          });
        }

        const cohort = cohorts.get(cohortKey);
        cohort.customers.add(sub.userId);
        cohort.subscriptions.push(sub);
      }

      return Array.from(cohorts.values()).map((cohort) => ({
        ...cohort,
        customerCount: cohort.customers.size,
        customers: Array.from(cohort.customers),
      }));
    },

    calculateCohortRevenue(cohort, subscriptions, referenceDate = new Date()) {
      const refDate = parseDate(referenceDate);
      const cohortStart = parseDate(cohort.cohortDate);
      const monthsElapsed = Math.max(0, monthsBetween(cohortStart, refDate));

      const cohortUserIds = new Set(cohort.customers);
      const cohortSubs = subscriptions.filter((sub) =>
        cohortUserIds.has(sub.userId)
      );

      const revenueByMonth = {};
      for (let i = 0; i <= monthsElapsed; i++) {
        const monthDate = new Date(cohortStart);
        monthDate.setUTCMonth(cohortStart.getUTCMonth() + i);
        const monthKey = getMonthKey(monthDate);

        const monthlyRevenue = cohortSubs
          .filter((sub) => {
            const start = parseDate(sub.startDate);
            const end = sub.endDate ? parseDate(sub.endDate) : refDate;
            return start <= monthDate && end >= monthDate;
          })
          .reduce((sum, sub) => {
            let monthlyAmount = sub.amount;
            if (sub.billingInterval === "annual") monthlyAmount = sub.amount / 12;
            else if (sub.billingInterval === "quarterly")
              monthlyAmount = sub.amount / 3;
            else if (sub.billingInterval === "weekly")
              monthlyAmount = sub.amount * 4.33;
            return sum + monthlyAmount;
          }, 0);

        revenueByMonth[monthKey] = monthlyRevenue;
      }

      const totalRevenue = Object.values(revenueByMonth).reduce(
        (sum, rev) => sum + rev,
        0
      );

      return {
        cohortKey: cohort.cohortKey,
        totalRevenue,
        revenueByMonth,
        monthsElapsed,
        avgMonthlyRevenue:
          monthsElapsed > 0 ? totalRevenue / (monthsElapsed + 1) : totalRevenue,
      };
    },

    calculateCohortChurn(cohort, subscriptions, referenceDate = new Date()) {
      const refDate = parseDate(referenceDate);
      const cohortStart = parseDate(cohort.cohortDate);

      const cohortUserIds = new Set(cohort.customers);
      const cohortSubs = subscriptions.filter((sub) =>
        cohortUserIds.has(sub.userId)
      );

      const initialCustomers = cohort.customerCount;
      const activeCustomers = new Set(
        cohortSubs
          .filter((sub) => {
            const start = parseDate(sub.startDate);
            const end = sub.endDate ? parseDate(sub.endDate) : null;
            return start <= refDate && (!end || end >= refDate);
          })
          .map((sub) => sub.userId)
      ).size;

      const churnedCustomers = initialCustomers - activeCustomers;
      const churnRate =
        initialCustomers > 0 ? (churnedCustomers / initialCustomers) * 100 : 0;
      const retentionRate = 100 - churnRate;

      return {
        cohortKey: cohort.cohortKey,
        initialCustomers,
        activeCustomers,
        churnedCustomers,
        churnRate,
        retentionRate,
        referenceDate: refDate.toISOString(),
      };
    },

    calculateCohortLTV(cohort, subscriptions, referenceDate = new Date()) {
      const revenue = this.calculateCohortRevenue(cohort, subscriptions, referenceDate);
      const churn = this.calculateCohortChurn(cohort, subscriptions, referenceDate);

      const avgLTV =
        churn.initialCustomers > 0
          ? revenue.totalRevenue / churn.initialCustomers
          : 0;

      return {
        cohortKey: cohort.cohortKey,
        avgLTV,
        totalRevenue: revenue.totalRevenue,
        initialCustomers: churn.initialCustomers,
        activeCustomers: churn.activeCustomers,
        retentionRate: churn.retentionRate,
      };
    },

    calculateChurnRate(subscriptions, startDate, endDate) {
      const start = parseDate(startDate);
      const end = parseDate(endDate);

      const startingCustomers = new Set(
        subscriptions
          .filter((sub) => {
            const subStart = parseDate(sub.startDate);
            const subEnd = sub.endDate ? parseDate(sub.endDate) : null;
            return subStart <= start && (!subEnd || subEnd >= start);
          })
          .map((sub) => sub.userId)
      ).size;

      const endingCustomers = new Set(
        subscriptions
          .filter((sub) => {
            const subStart = parseDate(sub.startDate);
            const subEnd = sub.endDate ? parseDate(sub.endDate) : null;
            return subStart <= end && (!subEnd || subEnd >= end);
          })
          .map((sub) => sub.userId)
      ).size;

      const churnedCustomers = startingCustomers - endingCustomers;
      const churnRate =
        startingCustomers > 0 ? (churnedCustomers / startingCustomers) * 100 : 0;

      return {
        churnRate,
        startingCustomers,
        endingCustomers,
        churnedCustomers,
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      };
    },

    identifyAtRiskCustomers(subscriptions, payments, referenceDate = new Date()) {
      const refDate = parseDate(referenceDate);
      const atRisk = {
        high: [],
        medium: [],
        low: [],
      };

      const userMap = new Map();
      for (const sub of subscriptions) {
        if (!userMap.has(sub.userId)) {
          userMap.set(sub.userId, { subscriptions: [], payments: [] });
        }
        userMap.get(sub.userId).subscriptions.push(sub);
      }

      for (const payment of payments) {
        if (userMap.has(payment.userId)) {
          userMap.get(payment.userId).payments.push(payment);
        }
      }

      for (const [userId, data] of userMap.entries()) {
        const activeSubs = data.subscriptions.filter((sub) => {
          const start = parseDate(sub.startDate);
          const end = sub.endDate ? parseDate(sub.endDate) : null;
          return start <= refDate && (!end || end >= refDate);
        });

        if (activeSubs.length === 0) continue;

        const recentPayments = data.payments
          .filter((p) => parseDate(p.date) >= new Date(refDate - 90 * 24 * 60 * 60 * 1000))
          .sort((a, b) => parseDate(b.date) - parseDate(a.date));

        const failedPayments = recentPayments.filter((p) => p.status === "failed");
        const daysSinceLastPayment = recentPayments.length > 0
          ? daysBetween(parseDate(recentPayments[0].date), refDate)
          : 999;

        const riskFactors = {
          userId,
          daysSinceLastPayment,
          failedPaymentCount: failedPayments.length,
          activeSubscriptions: activeSubs.length,
          totalRevenue: activeSubs.reduce((sum, sub) => sum + sub.amount, 0),
        };

        if (daysSinceLastPayment >= 90 || failedPayments.length >= 3) {
          atRisk.high.push(riskFactors);
        } else if (daysSinceLastPayment >= 60 || failedPayments.length >= 2) {
          atRisk.medium.push(riskFactors);
        } else if (daysSinceLastPayment >= 30 || failedPayments.length >= 1) {
          atRisk.low.push(riskFactors);
        }
      }

      return {
        high: atRisk.high,
        medium: atRisk.medium,
        low: atRisk.low,
        total: atRisk.high.length + atRisk.medium.length + atRisk.low.length,
        referenceDate: refDate.toISOString(),
      };
    },

    calculateExpansionContraction(subscriptions, startDate, endDate) {
      const start = parseDate(startDate);
      const end = parseDate(endDate);

      const userRevenueStart = new Map();
      const userRevenueEnd = new Map();

      for (const sub of subscriptions) {
        const subStart = parseDate(sub.startDate);
        const subEnd = sub.endDate ? parseDate(sub.endDate) : null;

        let monthlyAmount = sub.amount;
        if (sub.billingInterval === "annual") monthlyAmount = sub.amount / 12;
        else if (sub.billingInterval === "quarterly") monthlyAmount = sub.amount / 3;
        else if (sub.billingInterval === "weekly") monthlyAmount = sub.amount * 4.33;

        if (subStart <= start && (!subEnd || subEnd >= start)) {
          userRevenueStart.set(
            sub.userId,
            (userRevenueStart.get(sub.userId) || 0) + monthlyAmount
          );
        }

        if (subStart <= end && (!subEnd || subEnd >= end)) {
          userRevenueEnd.set(
            sub.userId,
            (userRevenueEnd.get(sub.userId) || 0) + monthlyAmount
          );
        }
      }

      let expansionRevenue = 0;
      let contractionRevenue = 0;
      const expansions = [];
      const contractions = [];
      const downgrades = [];
      const upgrades = [];

      for (const [userId, startRevenue] of userRevenueStart.entries()) {
        const endRevenue = userRevenueEnd.get(userId) || 0;
        const change = endRevenue - startRevenue;

        if (change > 0) {
          expansionRevenue += change;
          expansions.push({ userId, startRevenue, endRevenue, change });
          upgrades.push(userId);
        } else if (change < 0) {
          contractionRevenue += Math.abs(change);
          contractions.push({ userId, startRevenue, endRevenue, change });
          downgrades.push(userId);
        }
      }

      return {
        expansionRevenue,
        contractionRevenue,
        netChange: expansionRevenue - contractionRevenue,
        expansionCount: expansions.length,
        contractionCount: contractions.length,
        expansions,
        contractions,
        downgrades,
        upgrades,
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      };
    },

    dailyRevenueSummary(subscriptions, payments, date) {
      const refDate = parseDate(date);
      const dayKey = getDayKey(refDate);

      const dailyPayments = payments.filter(
        (p) => getDayKey(p.date) === dayKey && p.status === "success"
      );

      const totalRevenue = dailyPayments.reduce((sum, p) => sum + p.amount, 0);
      const transactionCount = dailyPayments.length;
      const uniqueCustomers = new Set(dailyPayments.map((p) => p.userId)).size;

      const mrr = this.calculateMRR(subscriptions, refDate);
      const activeSubscriptions = subscriptions.filter((sub) => {
        const start = parseDate(sub.startDate);
        const end = sub.endDate ? parseDate(sub.endDate) : null;
        return start <= refDate && (!end || end >= refDate);
      });

      return {
        date: dayKey,
        revenue: totalRevenue,
        transactionCount,
        uniqueCustomers,
        avgTransactionValue: transactionCount > 0 ? totalRevenue / transactionCount : 0,
        mrr: mrr.mrr,
        activeSubscriptions: activeSubscriptions.length,
      };
    },

    weeklyCohortReport(subscriptions, weekStartDate) {
      const startDate = parseDate(weekStartDate);
      const weekKey = getWeekKey(startDate);

      const cohorts = this.createCohorts(subscriptions, "week");
      const cohort = cohorts.find((c) => getWeekKey(c.cohortDate) === weekKey);

      if (!cohort) {
        return {
          weekKey,
          error: "No cohort found for this week",
        };
      }

      const revenue = this.calculateCohortRevenue(cohort, subscriptions);
      const churn = this.calculateCohortChurn(cohort, subscriptions);
      const ltv = this.calculateCohortLTV(cohort, subscriptions);

      return {
        weekKey,
        cohort: cohort.cohortKey,
        customers: cohort.customerCount,
        revenue: revenue.totalRevenue,
        avgMonthlyRevenue: revenue.avgMonthlyRevenue,
        churnRate: churn.churnRate,
        retentionRate: churn.retentionRate,
        avgLTV: ltv.avgLTV,
        activeCustomers: churn.activeCustomers,
      };
    },

    monthlyBusinessMetrics(subscriptions, payments, costs, monthDate) {
      const refDate = parseDate(monthDate);
      const monthKey = getMonthKey(refDate);

      const monthStart = new Date(refDate);
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);

      const monthEnd = new Date(monthStart);
      monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
      monthEnd.setUTCDate(0);
      monthEnd.setUTCHours(23, 59, 59, 999);

      const mrr = this.calculateMRR(subscriptions, refDate);
      const arr = this.calculateARR(subscriptions, refDate);
      const arpu = this.calculateARPU(subscriptions, refDate);
      const churn = this.calculateChurnRate(subscriptions, monthStart, monthEnd);
      const expansion = this.calculateExpansionContraction(
        subscriptions,
        monthStart,
        monthEnd
      );

      const monthlyPayments = payments.filter((p) => {
        const pDate = parseDate(p.date);
        return pDate >= monthStart && pDate <= monthEnd && p.status === "success";
      });

      const totalRevenue = monthlyPayments.reduce((sum, p) => sum + p.amount, 0);

      const monthlyCosts = costs.filter((c) => {
        const cDate = parseDate(c.date);
        return cDate >= monthStart && cDate <= monthEnd;
      });

      const totalCosts = monthlyCosts.reduce((sum, c) => sum + c.amount, 0);
      const grossProfit = totalRevenue - totalCosts;
      const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

      return {
        month: monthKey,
        mrr: mrr.mrr,
        arr: arr.arr,
        arpu: arpu.arpu,
        revenue: totalRevenue,
        costs: totalCosts,
        grossProfit,
        grossMargin,
        churnRate: churn.churnRate,
        expansionRevenue: expansion.expansionRevenue,
        contractionRevenue: expansion.contractionRevenue,
        netExpansion: expansion.netChange,
        activeSubscriptions: mrr.activeSubscriptions,
        totalUsers: arpu.totalUsers,
      };
    },

    customDateRangeReport(subscriptions, payments, costs, startDate, endDate) {
      const start = parseDate(startDate);
      const end = parseDate(endDate);
      const days = daysBetween(start, end);

      const mrr = this.calculateMRR(subscriptions, end);
      const arr = this.calculateARR(subscriptions, end);
      const nrr = this.calculateNRR(subscriptions, start, end);
      const churn = this.calculateChurnRate(subscriptions, start, end);
      const expansion = this.calculateExpansionContraction(subscriptions, start, end);

      const periodPayments = payments.filter((p) => {
        const pDate = parseDate(p.date);
        return pDate >= start && pDate <= end && p.status === "success";
      });

      const totalRevenue = periodPayments.reduce((sum, p) => sum + p.amount, 0);

      const periodCosts = costs.filter((c) => {
        const cDate = parseDate(c.date);
        return cDate >= start && cDate <= end;
      });

      const totalCosts = periodCosts.reduce((sum, c) => sum + c.amount, 0);
      const grossProfit = totalRevenue - totalCosts;

      return {
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
          days,
        },
        mrr: mrr.mrr,
        arr: arr.arr,
        nrr: nrr.nrr,
        revenue: totalRevenue,
        costs: totalCosts,
        grossProfit,
        churnRate: churn.churnRate,
        expansionRevenue: expansion.expansionRevenue,
        contractionRevenue: expansion.contractionRevenue,
        activeSubscriptions: mrr.activeSubscriptions,
        avgDailyRevenue: days > 0 ? totalRevenue / days : 0,
      };
    },

    clearCache() {
      cache.clear();
      return { cleared: true };
    },
  };
}
