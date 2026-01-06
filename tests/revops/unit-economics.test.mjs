import { describe, it, expect, beforeEach } from "vitest";

class UnitEconomics {
  constructor(options = {}) {
    this.data = {
      customers: new Map(),
      campaigns: new Map(),
      revenue: []
    };
  }

  calculateCAC(totalMarketingSpend, totalNewCustomers, period = 'month') {
    if (totalNewCustomers === 0) {
      throw new Error('Cannot calculate CAC with zero customers');
    }

    if (totalMarketingSpend < 0 || totalNewCustomers < 0) {
      throw new Error('Values must be non-negative');
    }

    return {
      cac: totalMarketingSpend / totalNewCustomers,
      period,
      totalSpend: totalMarketingSpend,
      totalCustomers: totalNewCustomers,
      timestamp: Date.now()
    };
  }

  calculateLTV(avgRevenuePerCustomer, avgCustomerLifespan, grossMargin = 1.0) {
    if (avgRevenuePerCustomer < 0 || avgCustomerLifespan < 0) {
      throw new Error('Values must be non-negative');
    }

    if (grossMargin < 0 || grossMargin > 1) {
      throw new Error('Gross margin must be between 0 and 1');
    }

    return {
      ltv: avgRevenuePerCustomer * avgCustomerLifespan * grossMargin,
      avgRevenue: avgRevenuePerCustomer,
      avgLifespan: avgCustomerLifespan,
      grossMargin,
      timestamp: Date.now()
    };
  }

  calculateLTVCACRatio(ltv, cac) {
    if (cac === 0) {
      throw new Error('CAC cannot be zero');
    }

    const ratio = ltv / cac;

    return {
      ratio,
      ltv,
      cac,
      health: this._assessRatioHealth(ratio),
      timestamp: Date.now()
    };
  }

  _assessRatioHealth(ratio) {
    if (ratio < 1) return 'critical';
    if (ratio < 3) return 'poor';
    if (ratio <= 5) return 'good';
    return 'excellent';
  }

  calculatePaybackPeriod(cac, monthlyRevenue) {
    if (monthlyRevenue === 0) {
      throw new Error('Monthly revenue cannot be zero');
    }

    if (cac < 0 || monthlyRevenue < 0) {
      throw new Error('Values must be non-negative');
    }

    return {
      months: cac / monthlyRevenue,
      cac,
      monthlyRevenue,
      timestamp: Date.now()
    };
  }

  calculateChurnRate(customersAtStart, customersLost, period = 'month') {
    if (customersAtStart === 0) {
      throw new Error('Cannot calculate churn with zero customers');
    }

    if (customersAtStart < 0 || customersLost < 0) {
      throw new Error('Values must be non-negative');
    }

    if (customersLost > customersAtStart) {
      throw new Error('Customers lost cannot exceed starting customers');
    }

    return {
      churnRate: (customersLost / customersAtStart) * 100,
      customersAtStart,
      customersLost,
      period,
      timestamp: Date.now()
    };
  }

  calculateMRR(subscriptions) {
    if (!Array.isArray(subscriptions)) {
      throw new Error('Subscriptions must be an array');
    }

    const totalMRR = subscriptions.reduce((sum, sub) => {
      if (sub.billingCycle === 'monthly') {
        return sum + sub.amount;
      } else if (sub.billingCycle === 'yearly') {
        return sum + (sub.amount / 12);
      } else if (sub.billingCycle === 'quarterly') {
        return sum + (sub.amount / 3);
      }
      return sum;
    }, 0);

    return {
      mrr: totalMRR,
      subscriptionCount: subscriptions.length,
      avgRevenuePerSub: subscriptions.length > 0 ? totalMRR / subscriptions.length : 0,
      timestamp: Date.now()
    };
  }

  calculateARR(mrr) {
    return {
      arr: mrr * 12,
      mrr,
      timestamp: Date.now()
    };
  }

  calculateARPU(totalRevenue, totalCustomers) {
    if (totalCustomers === 0) {
      throw new Error('Cannot calculate ARPU with zero customers');
    }

    if (totalRevenue < 0 || totalCustomers < 0) {
      throw new Error('Values must be non-negative');
    }

    return {
      arpu: totalRevenue / totalCustomers,
      totalRevenue,
      totalCustomers,
      timestamp: Date.now()
    };
  }

  runScenarioAnalysis(scenario) {
    const { cac, ltv, churnRate, monthlyRevenue } = scenario;

    const ltvCacRatio = this.calculateLTVCACRatio(ltv, cac);
    const paybackPeriod = this.calculatePaybackPeriod(cac, monthlyRevenue);

    const projectedCustomers = this._projectCustomerGrowth(
      scenario.startingCustomers || 100,
      scenario.acquisitionRate || 0.1,
      churnRate / 100,
      scenario.months || 12
    );

    return {
      ltvCacRatio: ltvCacRatio.ratio,
      health: ltvCacRatio.health,
      paybackMonths: paybackPeriod.months,
      churnRate,
      projectedCustomers,
      recommendations: this._generateRecommendations(ltvCacRatio.ratio, paybackPeriod.months, churnRate)
    };
  }

  _projectCustomerGrowth(starting, acquisitionRate, churnRate, months) {
    let customers = starting;
    const projection = [customers];

    for (let i = 0; i < months; i++) {
      const newCustomers = customers * acquisitionRate;
      const lostCustomers = customers * churnRate;
      customers = customers + newCustomers - lostCustomers;
      projection.push(Math.round(customers));
    }

    return projection;
  }

  _generateRecommendations(ltvCacRatio, paybackMonths, churnRate) {
    const recommendations = [];

    if (ltvCacRatio < 3) {
      recommendations.push('Improve LTV:CAC ratio by reducing acquisition costs or increasing customer value');
    }

    if (paybackMonths > 12) {
      recommendations.push('Reduce payback period to under 12 months for healthy cash flow');
    }

    if (churnRate > 5) {
      recommendations.push('High churn rate detected - focus on customer retention initiatives');
    }

    if (recommendations.length === 0) {
      recommendations.push('Metrics look healthy - maintain current strategy');
    }

    return recommendations;
  }

  compareCohorts(cohort1, cohort2) {
    const c1LTV = this.calculateLTV(cohort1.avgRevenue, cohort1.avgLifespan, cohort1.grossMargin);
    const c2LTV = this.calculateLTV(cohort2.avgRevenue, cohort2.avgLifespan, cohort2.grossMargin);

    const c1CAC = this.calculateCAC(cohort1.marketingSpend, cohort1.customers);
    const c2CAC = this.calculateCAC(cohort2.marketingSpend, cohort2.customers);

    return {
      cohort1: {
        ltv: c1LTV.ltv,
        cac: c1CAC.cac,
        ratio: c1LTV.ltv / c1CAC.cac
      },
      cohort2: {
        ltv: c2LTV.ltv,
        cac: c2CAC.cac,
        ratio: c2LTV.ltv / c2CAC.cac
      },
      winner: (c1LTV.ltv / c1CAC.cac) > (c2LTV.ltv / c2CAC.cac) ? 'cohort1' : 'cohort2'
    };
  }

  calculateBreakeven(fixedCosts, pricePerUnit, variableCostPerUnit) {
    const contributionMargin = pricePerUnit - variableCostPerUnit;

    if (contributionMargin <= 0) {
      throw new Error('Contribution margin must be positive');
    }

    return {
      units: Math.ceil(fixedCosts / contributionMargin),
      revenue: Math.ceil(fixedCosts / contributionMargin) * pricePerUnit,
      contributionMargin,
      timestamp: Date.now()
    };
  }
}

describe('UnitEconomics - CAC Calculation', () => {
  let economics;

  beforeEach(() => {
    economics = new UnitEconomics();
  });

  it('should calculate basic CAC correctly', () => {
    const result = economics.calculateCAC(10000, 100);

    expect(result.cac).toBe(100);
    expect(result.totalSpend).toBe(10000);
    expect(result.totalCustomers).toBe(100);
  });

  it('should calculate CAC for different customer counts', () => {
    const result1 = economics.calculateCAC(5000, 50);
    const result2 = economics.calculateCAC(5000, 25);

    expect(result1.cac).toBe(100);
    expect(result2.cac).toBe(200);
    expect(result2.cac).toBeGreaterThan(result1.cac);
  });

  it('should reject zero customers', () => {
    expect(() => economics.calculateCAC(10000, 0))
      .toThrow('Cannot calculate CAC with zero customers');
  });

  it('should reject negative values', () => {
    expect(() => economics.calculateCAC(-1000, 100))
      .toThrow('Values must be non-negative');
    expect(() => economics.calculateCAC(1000, -10))
      .toThrow('Values must be non-negative');
  });

  it('should include period in result', () => {
    const result = economics.calculateCAC(10000, 100, 'quarter');

    expect(result.period).toBe('quarter');
    expect(result.cac).toBe(100);
  });
});

describe('UnitEconomics - LTV Calculation', () => {
  let economics;

  beforeEach(() => {
    economics = new UnitEconomics();
  });

  it('should calculate basic LTV correctly', () => {
    const result = economics.calculateLTV(100, 24, 0.8);

    expect(result.ltv).toBe(1920);
    expect(result.avgRevenue).toBe(100);
    expect(result.avgLifespan).toBe(24);
  });

  it('should calculate LTV without gross margin', () => {
    const result = economics.calculateLTV(100, 24);

    expect(result.ltv).toBe(2400);
    expect(result.grossMargin).toBe(1.0);
  });

  it('should reject negative values', () => {
    expect(() => economics.calculateLTV(-100, 24))
      .toThrow('Values must be non-negative');
    expect(() => economics.calculateLTV(100, -24))
      .toThrow('Values must be non-negative');
  });

  it('should validate gross margin range', () => {
    expect(() => economics.calculateLTV(100, 24, 1.5))
      .toThrow('Gross margin must be between 0 and 1');
    expect(() => economics.calculateLTV(100, 24, -0.1))
      .toThrow('Gross margin must be between 0 and 1');
  });

  it('should calculate LTV with different lifespans', () => {
    const result1 = economics.calculateLTV(100, 12, 0.8);
    const result2 = economics.calculateLTV(100, 24, 0.8);

    expect(result2.ltv).toBe(result1.ltv * 2);
    expect(result2.ltv).toBeGreaterThan(result1.ltv);
  });
});

describe('UnitEconomics - LTV:CAC Ratio', () => {
  let economics;

  beforeEach(() => {
    economics = new UnitEconomics();
  });

  it('should calculate ratio correctly', () => {
    const result = economics.calculateLTVCACRatio(3000, 1000);

    expect(result.ratio).toBe(3);
    expect(result.ltv).toBe(3000);
    expect(result.cac).toBe(1000);
  });

  it('should assess critical health for ratio < 1', () => {
    const result = economics.calculateLTVCACRatio(500, 1000);

    expect(result.ratio).toBe(0.5);
    expect(result.health).toBe('critical');
  });

  it('should assess poor health for ratio 1-3', () => {
    const result = economics.calculateLTVCACRatio(2000, 1000);

    expect(result.ratio).toBe(2);
    expect(result.health).toBe('poor');
  });

  it('should assess good health for ratio 3-5', () => {
    const result = economics.calculateLTVCACRatio(4000, 1000);

    expect(result.ratio).toBe(4);
    expect(result.health).toBe('good');
  });

  it('should assess excellent health for ratio > 5', () => {
    const result = economics.calculateLTVCACRatio(6000, 1000);

    expect(result.ratio).toBe(6);
    expect(result.health).toBe('excellent');
  });

  it('should reject zero CAC', () => {
    expect(() => economics.calculateLTVCACRatio(3000, 0))
      .toThrow('CAC cannot be zero');
  });
});

describe('UnitEconomics - Additional Metrics', () => {
  let economics;

  beforeEach(() => {
    economics = new UnitEconomics();
  });

  it('should calculate payback period', () => {
    const result = economics.calculatePaybackPeriod(1200, 100);

    expect(result.months).toBe(12);
    expect(result.cac).toBe(1200);
    expect(result.monthlyRevenue).toBe(100);
  });

  it('should calculate churn rate', () => {
    const result = economics.calculateChurnRate(1000, 50);

    expect(result.churnRate).toBe(5);
    expect(result.customersAtStart).toBe(1000);
    expect(result.customersLost).toBe(50);
  });

  it('should validate churn rate inputs', () => {
    expect(() => economics.calculateChurnRate(0, 50))
      .toThrow('Cannot calculate churn with zero customers');
    expect(() => economics.calculateChurnRate(100, 150))
      .toThrow('Customers lost cannot exceed starting customers');
  });

  it('should calculate MRR from subscriptions', () => {
    const subscriptions = [
      { amount: 100, billingCycle: 'monthly' },
      { amount: 1200, billingCycle: 'yearly' },
      { amount: 300, billingCycle: 'quarterly' }
    ];

    const result = economics.calculateMRR(subscriptions);

    expect(result.mrr).toBe(300);
    expect(result.subscriptionCount).toBe(3);
    expect(result.avgRevenuePerSub).toBe(100);
  });

  it('should calculate ARR from MRR', () => {
    const result = economics.calculateARR(1000);

    expect(result.arr).toBe(12000);
    expect(result.mrr).toBe(1000);
  });

  it('should calculate ARPU', () => {
    const result = economics.calculateARPU(50000, 500);

    expect(result.arpu).toBe(100);
    expect(result.totalRevenue).toBe(50000);
    expect(result.totalCustomers).toBe(500);
  });

  it('should reject invalid MRR input', () => {
    expect(() => economics.calculateMRR('not-an-array'))
      .toThrow('Subscriptions must be an array');
  });
});

describe('UnitEconomics - Scenario Analysis', () => {
  let economics;

  beforeEach(() => {
    economics = new UnitEconomics();
  });

  it('should run complete scenario analysis', () => {
    const scenario = {
      cac: 1000,
      ltv: 4000,
      churnRate: 3,
      monthlyRevenue: 100,
      startingCustomers: 100,
      acquisitionRate: 0.1,
      months: 12
    };

    const result = economics.runScenarioAnalysis(scenario);

    expect(result.ltvCacRatio).toBe(4);
    expect(result.health).toBe('good');
    expect(result.paybackMonths).toBe(10);
    expect(result.projectedCustomers).toHaveLength(13);
  });

  it('should project customer growth accurately', () => {
    const scenario = {
      cac: 1000,
      ltv: 4000,
      churnRate: 5,
      monthlyRevenue: 100,
      startingCustomers: 100,
      acquisitionRate: 0.1,
      months: 6
    };

    const result = economics.runScenarioAnalysis(scenario);

    expect(result.projectedCustomers[0]).toBe(100);
    expect(result.projectedCustomers[result.projectedCustomers.length - 1]).toBeGreaterThan(90);
  });

  it('should generate recommendations for poor metrics', () => {
    const scenario = {
      cac: 2000,
      ltv: 3000,
      churnRate: 8,
      monthlyRevenue: 100
    };

    const result = economics.runScenarioAnalysis(scenario);

    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.some(r => r.includes('churn'))).toBe(true);
  });

  it('should generate positive recommendations for good metrics', () => {
    const scenario = {
      cac: 1000,
      ltv: 5000,
      churnRate: 2,
      monthlyRevenue: 200
    };

    const result = economics.runScenarioAnalysis(scenario);

    expect(result.health).toBe('excellent');
    expect(result.recommendations.some(r => r.includes('healthy'))).toBe(true);
  });
});

describe('UnitEconomics - Cohort Comparison', () => {
  let economics;

  beforeEach(() => {
    economics = new UnitEconomics();
  });

  it('should compare two cohorts', () => {
    const cohort1 = {
      avgRevenue: 100,
      avgLifespan: 24,
      grossMargin: 0.8,
      marketingSpend: 50000,
      customers: 100
    };

    const cohort2 = {
      avgRevenue: 120,
      avgLifespan: 30,
      grossMargin: 0.8,
      marketingSpend: 60000,
      customers: 100
    };

    const result = economics.compareCohorts(cohort1, cohort2);

    expect(result.cohort1).toBeDefined();
    expect(result.cohort2).toBeDefined();
    expect(result.winner).toBeDefined();
    expect(['cohort1', 'cohort2']).toContain(result.winner);
  });

  it('should identify better performing cohort', () => {
    const cohort1 = {
      avgRevenue: 100,
      avgLifespan: 24,
      grossMargin: 0.8,
      marketingSpend: 100000,
      customers: 100
    };

    const cohort2 = {
      avgRevenue: 100,
      avgLifespan: 24,
      grossMargin: 0.8,
      marketingSpend: 50000,
      customers: 100
    };

    const result = economics.compareCohorts(cohort1, cohort2);

    expect(result.winner).toBe('cohort2');
    expect(result.cohort2.ratio).toBeGreaterThan(result.cohort1.ratio);
  });
});

describe('UnitEconomics - Breakeven Analysis', () => {
  let economics;

  beforeEach(() => {
    economics = new UnitEconomics();
  });

  it('should calculate breakeven point', () => {
    const result = economics.calculateBreakeven(10000, 100, 40);

    expect(result.units).toBe(167);
    expect(result.revenue).toBe(16700);
    expect(result.contributionMargin).toBe(60);
  });

  it('should reject negative contribution margin', () => {
    expect(() => economics.calculateBreakeven(10000, 50, 60))
      .toThrow('Contribution margin must be positive');
  });

  it('should handle different cost structures', () => {
    const result1 = economics.calculateBreakeven(10000, 100, 50);
    const result2 = economics.calculateBreakeven(10000, 100, 30);

    expect(result2.units).toBeLessThan(result1.units);
    expect(result2.contributionMargin).toBeGreaterThan(result1.contributionMargin);
  });
});
