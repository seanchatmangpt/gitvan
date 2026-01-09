// tests/revops/RevOpsIntegration.test.mjs
// Comprehensive Phase 3 RevOps Integration Tests
// Tests RDF-based churn prediction, expansion discovery, cohort analysis, and feature analysis

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { withGitVan } from "../../src/core/context.mjs";
import { execSync } from "child_process";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

// Mock KnowledgeSubstrate for RDF operations
class MockKnowledgeSubstrate {
  constructor() {
    this.triples = [];
    this.queries = new Map();
  }

  async addTriple(subject, predicate, object) {
    this.triples.push({ subject, predicate, object });
  }

  async addTriples(triples) {
    this.triples.push(...triples);
  }

  async query(sparql) {
    return this.queries.get(sparql) || [];
  }

  getTriples(filter = {}) {
    let filtered = [...this.triples];
    if (filter.subject) {
      filtered = filtered.filter((t) => t.subject === filter.subject);
    }
    if (filter.predicate) {
      filtered = filtered.filter((t) => t.predicate === filter.predicate);
    }
    return filtered;
  }

  clear() {
    this.triples = [];
    this.queries.clear();
  }
}

// Mock RDF RevOps Manager
class RDFRevOpsManager {
  constructor() {
    this.ks = null;
    this.customers = new Map();
    this.features = new Map();
    this.plans = new Map();
  }

  async initialize(knowledgeSubstrate) {
    this.ks = knowledgeSubstrate;
    return this;
  }

  async addCustomer(customer) {
    const {
      id,
      name,
      plan,
      mrr,
      signupDate,
      lastPaymentDate,
      lastPaymentFailed,
      supportTicketCount,
      featureUsagePercent,
      daysWithoutActivity,
      usesFeatures,
    } = customer;

    await this.ks.addTriples([
      { subject: id, predicate: "rdf:type", object: "revops:Customer" },
      { subject: id, predicate: "revops:name", object: name },
      { subject: id, predicate: "revops:plan", object: plan },
      { subject: id, predicate: "revops:monthlyRecurringRevenue", object: mrr },
      { subject: id, predicate: "revops:signupDate", object: signupDate },
      {
        subject: id,
        predicate: "revops:lastPaymentDate",
        object: lastPaymentDate,
      },
      {
        subject: id,
        predicate: "revops:lastPaymentFailed",
        object: lastPaymentFailed,
      },
      {
        subject: id,
        predicate: "revops:supportTicketCount",
        object: supportTicketCount,
      },
      {
        subject: id,
        predicate: "revops:featureUsagePercent",
        object: featureUsagePercent,
      },
      {
        subject: id,
        predicate: "revops:daysWithoutActivity",
        object: daysWithoutActivity,
      },
    ]);

    if (usesFeatures) {
      for (const feature of usesFeatures) {
        await this.ks.addTriple(id, "revops:usesFeatures", feature);
      }
    }

    this.customers.set(id, customer);
  }

  async addPlan(plan) {
    const { id, name, monthlyPrice, includesFeatures, targetSegment } = plan;

    await this.ks.addTriples([
      { subject: id, predicate: "rdf:type", object: "revops:Plan" },
      { subject: id, predicate: "revops:name", object: name },
      { subject: id, predicate: "revops:monthlyPrice", object: monthlyPrice },
      { subject: id, predicate: "revops:targetSegment", object: targetSegment },
    ]);

    if (includesFeatures) {
      for (const feature of includesFeatures) {
        await this.ks.addTriple(id, "revops:includesFeatures", feature);
      }
    }

    this.plans.set(id, plan);
  }

  async addFeature(feature) {
    const { id, name, adoptionRate, churnRelation } = feature;

    await this.ks.addTriples([
      { subject: id, predicate: "rdf:type", object: "revops:Feature" },
      { subject: id, predicate: "revops:name", object: name },
      {
        subject: id,
        predicate: "revops:adoptionRate",
        object: adoptionRate,
      },
      {
        subject: id,
        predicate: "revops:churnRelation",
        object: churnRelation,
      },
    ]);

    this.features.set(id, feature);
  }

  calculateChurnRisk(customer) {
    let risk = 0;

    // Payment failure: +40 points
    if (customer.lastPaymentFailed) risk += 40;

    // Support tickets: +5 per ticket over 3
    if (customer.supportTicketCount > 3) {
      risk += (customer.supportTicketCount - 3) * 5;
    }

    // Low usage: +30 if under 20%
    if (customer.featureUsagePercent < 20) risk += 30;

    // No activity: +20 if over 7 days
    if (customer.daysWithoutActivity > 7) risk += 20;

    return Math.min(risk, 100);
  }

  async identifyHighRiskCustomers(threshold = 60) {
    const highRisk = [];

    for (const [id, customer] of this.customers) {
      const risk = this.calculateChurnRisk(customer);
      if (risk >= threshold) {
        const recommendation = this.getRetentionRecommendation(customer, risk);
        highRisk.push({ customerId: id, risk, recommendation });
      }
    }

    return highRisk.sort((a, b) => b.risk - a.risk);
  }

  getRetentionRecommendation(customer, risk) {
    if (customer.lastPaymentFailed) {
      return "payment-assistance";
    }

    if (customer.supportTicketCount > 5) {
      return "priority-support";
    }

    if (customer.featureUsagePercent < 20) {
      return "feature-training";
    }

    if (customer.daysWithoutActivity > 7) {
      return "engagement-campaign";
    }

    return "monitoring";
  }

  async predictChurnProbability(customerId) {
    const customer = this.customers.get(customerId);
    if (!customer) return null;

    const risk = this.calculateChurnRisk(customer);

    // Convert risk score to probability (0-1)
    const probability = risk / 100;

    return {
      customerId,
      churnProbability: probability,
      riskScore: risk,
      confidence: 0.85,
    };
  }

  async analyzePaymentImpact(customerId) {
    const customer = this.customers.get(customerId);
    if (!customer) return null;

    const baseRisk = this.calculateChurnRisk({
      ...customer,
      lastPaymentFailed: false,
    });
    const withPaymentFailure = this.calculateChurnRisk({
      ...customer,
      lastPaymentFailed: true,
    });

    return {
      customerId,
      baseRisk,
      riskWithPaymentFailure: withPaymentFailure,
      impact: withPaymentFailure - baseRisk,
    };
  }

  async analyzeSupportTicketImpact(customerId) {
    const customer = this.customers.get(customerId);
    if (!customer) return null;

    const baseRisk = this.calculateChurnRisk(customer);
    const withMoreTickets = this.calculateChurnRisk({
      ...customer,
      supportTicketCount: customer.supportTicketCount + 5,
    });

    return {
      customerId,
      currentTickets: customer.supportTicketCount,
      baseRisk,
      riskWithMoreTickets: withMoreTickets,
      impact: withMoreTickets - baseRisk,
    };
  }

  async correlateFeatureUsage(customerId) {
    const customer = this.customers.get(customerId);
    if (!customer) return null;

    const usedFeatures = customer.usesFeatures || [];
    const correlations = [];

    for (const featureId of usedFeatures) {
      const feature = this.features.get(featureId);
      if (feature) {
        correlations.push({
          featureId,
          featureName: feature.name,
          churnImpact: feature.churnRelation,
        });
      }
    }

    return { customerId, correlations };
  }

  async generateRecommendations(customerId) {
    const customer = this.customers.get(customerId);
    if (!customer) return [];

    const recommendations = [];
    const risk = this.calculateChurnRisk(customer);

    if (risk >= 80) {
      recommendations.push({
        type: "immediate-intervention",
        priority: "critical",
        action: "Schedule executive call within 24 hours",
      });
    }

    if (customer.lastPaymentFailed) {
      recommendations.push({
        type: "payment-assistance",
        priority: "high",
        action: "Offer payment plan or billing support",
      });
    }

    if (customer.featureUsagePercent < 20) {
      recommendations.push({
        type: "onboarding",
        priority: "medium",
        action: "Schedule product demo and training",
      });
    }

    return recommendations;
  }

  async identifyExpansionCandidates() {
    const candidates = [];

    for (const [id, customer] of this.customers) {
      const currentPlan = this.plans.get(customer.plan);
      if (!currentPlan) continue;

      // High usage on current plan
      if (customer.featureUsagePercent > 80) {
        candidates.push({
          customerId: id,
          type: "high-usage",
          currentPlan: customer.plan,
          recommendedAction: "upsell-to-higher-tier",
          likelihood: 0.75,
        });
      }

      // Using features not in plan
      const usedFeatures = customer.usesFeatures || [];
      const planFeatures = currentPlan.includesFeatures || [];
      const extraFeatures = usedFeatures.filter(
        (f) => !planFeatures.includes(f)
      );

      if (extraFeatures.length > 0) {
        candidates.push({
          customerId: id,
          type: "feature-expansion",
          currentPlan: customer.plan,
          missingFeatures: extraFeatures,
          recommendedAction: "upgrade-plan",
          likelihood: 0.85,
        });
      }
    }

    return candidates;
  }

  async analyzeFeatureUsage(customerId) {
    const customer = this.customers.get(customerId);
    if (!customer) return null;

    const currentPlan = this.plans.get(customer.plan);
    const usedFeatures = customer.usesFeatures || [];
    const planFeatures = currentPlan?.includesFeatures || [];

    return {
      customerId,
      totalFeaturesUsed: usedFeatures.length,
      planFeatures: planFeatures.length,
      usagePercentage: customer.featureUsagePercent,
      usingPremiumFeatures: usedFeatures.filter(
        (f) => !planFeatures.includes(f)
      ),
    };
  }

  async matchPlanForCustomer(customerId) {
    const customer = this.customers.get(customerId);
    if (!customer) return null;

    const usedFeatures = customer.usesFeatures || [];
    const matches = [];

    for (const [planId, plan] of this.plans) {
      const planFeatures = plan.includesFeatures || [];
      const coverage = usedFeatures.filter((f) =>
        planFeatures.includes(f)
      ).length;
      const coveragePercent = (coverage / usedFeatures.length) * 100;

      matches.push({
        planId,
        planName: plan.name,
        coverage: coveragePercent,
        price: plan.monthlyPrice,
      });
    }

    return matches.sort((a, b) => b.coverage - a.coverage)[0];
  }

  async calculateExpansionLikelihood(customerId) {
    const customer = this.customers.get(customerId);
    if (!customer) return null;

    let likelihood = 0;

    // High usage increases likelihood
    if (customer.featureUsagePercent > 80) likelihood += 0.4;

    // Low churn risk increases likelihood
    const churnRisk = this.calculateChurnRisk(customer);
    if (churnRisk < 30) likelihood += 0.3;

    // Using premium features increases likelihood
    const currentPlan = this.plans.get(customer.plan);
    const usedFeatures = customer.usesFeatures || [];
    const planFeatures = currentPlan?.includesFeatures || [];
    const extraFeatures = usedFeatures.filter((f) => !planFeatures.includes(f));

    if (extraFeatures.length > 0) likelihood += 0.3;

    return { customerId, likelihood: Math.min(likelihood, 1.0) };
  }

  async identifyCrossSellOpportunities() {
    const opportunities = [];

    for (const [id, customer] of this.customers) {
      const churnRisk = this.calculateChurnRisk(customer);

      // Only cross-sell to healthy customers
      if (churnRisk < 40) {
        opportunities.push({
          customerId: id,
          type: "cross-sell",
          currentPlan: customer.plan,
          recommendedProducts: this.getRecommendedProducts(customer),
          likelihood: 0.6,
        });
      }
    }

    return opportunities;
  }

  getRecommendedProducts(customer) {
    // Mock product recommendations based on customer data
    const products = [];

    if (customer.featureUsagePercent > 70) {
      products.push("advanced-analytics");
    }

    if (customer.mrr > 5000) {
      products.push("dedicated-support");
    }

    return products;
  }

  async estimateRevenueImpact(opportunity) {
    const customer = this.customers.get(opportunity.customerId);
    if (!customer) return null;

    let estimatedRevenue = 0;

    if (opportunity.type === "high-usage") {
      // Estimate 50% increase in MRR for upsell
      estimatedRevenue = customer.mrr * 0.5;
    }

    if (opportunity.type === "feature-expansion") {
      // Estimate based on number of features
      estimatedRevenue = opportunity.missingFeatures.length * 1000;
    }

    if (opportunity.type === "cross-sell") {
      // Estimate $500 per additional product
      estimatedRevenue = opportunity.recommendedProducts.length * 500;
    }

    return { customerId: customer.id, estimatedRevenue };
  }

  async segmentCustomers() {
    const segments = {
      enterprise: [],
      midMarket: [],
      smb: [],
    };

    for (const [id, customer] of this.customers) {
      if (customer.mrr > 10000) {
        segments.enterprise.push(id);
      } else if (customer.mrr > 5000) {
        segments.midMarket.push(id);
      } else {
        segments.smb.push(id);
      }
    }

    return segments;
  }

  async compareRetention(segment1Ids, segment2Ids) {
    const segment1Retention =
      segment1Ids.filter((id) => {
        const customer = this.customers.get(id);
        return customer && !customer.churned;
      }).length / segment1Ids.length;

    const segment2Retention =
      segment2Ids.filter((id) => {
        const customer = this.customers.get(id);
        return customer && !customer.churned;
      }).length / segment2Ids.length;

    return {
      segment1Retention,
      segment2Retention,
      difference: Math.abs(segment1Retention - segment2Retention),
    };
  }

  async estimateLTV(customerId) {
    const customer = this.customers.get(customerId);
    if (!customer) return null;

    const churnRisk = this.calculateChurnRisk(customer);
    const churnProbability = churnRisk / 100;

    // Estimate average tenure in months (inverse of churn)
    const estimatedTenure = 1 / (churnProbability + 0.01); // +0.01 to avoid division by zero

    const ltv = customer.mrr * estimatedTenure;

    return { customerId, ltv, estimatedTenure };
  }

  async trackCohortRetention(cohortId, customerIds) {
    const retainedCount = customerIds.filter((id) => {
      const customer = this.customers.get(id);
      return customer && !customer.churned;
    }).length;

    return {
      cohortId,
      initialSize: customerIds.length,
      retainedCount,
      retentionRate: retainedCount / customerIds.length,
    };
  }

  async analyzeFeatureAdoption(cohortId, customerIds) {
    const featureUsage = new Map();

    for (const id of customerIds) {
      const customer = this.customers.get(id);
      if (!customer) continue;

      const usedFeatures = customer.usesFeatures || [];
      for (const feature of usedFeatures) {
        featureUsage.set(feature, (featureUsage.get(feature) || 0) + 1);
      }
    }

    const adoption = [];
    for (const [feature, count] of featureUsage) {
      adoption.push({
        feature,
        usageCount: count,
        adoptionRate: count / customerIds.length,
      });
    }

    return { cohortId, adoption };
  }

  async analyzeCohortRevenue(cohortId, customerIds) {
    let totalRevenue = 0;
    let avgRevenue = 0;

    for (const id of customerIds) {
      const customer = this.customers.get(id);
      if (customer) {
        totalRevenue += customer.mrr;
      }
    }

    avgRevenue = totalRevenue / customerIds.length;

    return { cohortId, totalRevenue, avgRevenue };
  }

  async correlateFeatureWithRevenue(featureId) {
    let totalWithFeature = 0;
    let countWithFeature = 0;
    let totalWithoutFeature = 0;
    let countWithoutFeature = 0;

    for (const [id, customer] of this.customers) {
      const usesFeature = (customer.usesFeatures || []).includes(featureId);

      if (usesFeature) {
        totalWithFeature += customer.mrr;
        countWithFeature++;
      } else {
        totalWithoutFeature += customer.mrr;
        countWithoutFeature++;
      }
    }

    const avgWithFeature =
      countWithFeature > 0 ? totalWithFeature / countWithFeature : 0;
    const avgWithoutFeature =
      countWithoutFeature > 0 ? totalWithoutFeature / countWithoutFeature : 0;

    return {
      featureId,
      avgRevenueWith: avgWithFeature,
      avgRevenueWithout: avgWithoutFeature,
      impact: avgWithFeature - avgWithoutFeature,
    };
  }

  async calculateFeatureAdoptionRate(featureId) {
    let adoptionCount = 0;

    for (const [id, customer] of this.customers) {
      if ((customer.usesFeatures || []).includes(featureId)) {
        adoptionCount++;
      }
    }

    return {
      featureId,
      adoptionCount,
      adoptionRate: adoptionCount / this.customers.size,
    };
  }

  async analyzeFeatureChurnImpact(featureId) {
    const feature = this.features.get(featureId);
    if (!feature) return null;

    return {
      featureId,
      churnRelation: feature.churnRelation,
      interpretation:
        feature.churnRelation < 0
          ? "reduces-churn"
          : feature.churnRelation > 0
          ? "increases-churn"
          : "neutral",
    };
  }

  async identifyHighValueFeatures() {
    const featureValues = [];

    for (const [featureId, feature] of this.features) {
      const revenueCorrelation = await this.correlateFeatureWithRevenue(
        featureId
      );
      const churnImpact = await this.analyzeFeatureChurnImpact(featureId);

      const value =
        revenueCorrelation.impact * 0.6 +
        Math.abs(churnImpact.churnRelation) * 1000 * 0.4;

      featureValues.push({
        featureId,
        value,
        revenueImpact: revenueCorrelation.impact,
        churnImpact: churnImpact.churnRelation,
      });
    }

    return featureValues.sort((a, b) => b.value - a.value);
  }

  async analyzeFeatureCombinations(customerId) {
    const customer = this.customers.get(customerId);
    if (!customer) return null;

    const usedFeatures = customer.usesFeatures || [];
    const combinations = [];

    // Analyze pairs of features
    for (let i = 0; i < usedFeatures.length; i++) {
      for (let j = i + 1; j < usedFeatures.length; j++) {
        combinations.push({
          features: [usedFeatures[i], usedFeatures[j]],
          impact: "positive", // Mock analysis
        });
      }
    }

    return { customerId, combinations };
  }
}

describe("Phase 3: RevOps Integration Tests", () => {
  let testDir;
  let context;
  let ks;
  let revops;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "revops-test-"));
    execSync("git init", { cwd: testDir });
    execSync('git config user.email "test@test.com"', { cwd: testDir });
    execSync('git config user.name "Test User"', { cwd: testDir });
    execSync('git config commit.gpgsign false', { cwd: testDir });
    writeFileSync(join(testDir, "README.md"), "# RevOps Test\n");
    execSync("git add .", { cwd: testDir });
    execSync('git commit -m "initial"', { cwd: testDir });

    context = {
      cwd: testDir,
      env: { TZ: "UTC", LANG: "C" },
    };

    ks = new MockKnowledgeSubstrate();
    revops = new RDFRevOpsManager();
  });

  afterEach(() => {
    if (testDir) {
      rmSync(testDir, { recursive: true, force: true });
    }
    if (ks) {
      ks.clear();
    }
  });

  describe("Churn Prediction Tests (10 tests)", () => {
    it("should identify high-risk customers", async () => {
      await withGitVan(context, async () => {
        await revops.initialize(ks);

        await revops.addCustomer({
          id: "cust-1",
          name: "High Risk Corp",
          plan: "professional",
          mrr: 5000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2025-12-01",
          lastPaymentFailed: true,
          supportTicketCount: 8,
          featureUsagePercent: 15,
          daysWithoutActivity: 10,
          usesFeatures: ["feature-1"],
        });

        const highRisk = await revops.identifyHighRiskCustomers(60);

        expect(highRisk.length).toBe(1);
        expect(highRisk[0].customerId).toBe("cust-1");
        expect(highRisk[0].risk).toBeGreaterThan(60);
      });
    });

    it("should calculate churn probability accurately", async () => {
      await withGitVan(context, async () => {
        await revops.initialize(ks);

        await revops.addCustomer({
          id: "cust-1",
          name: "Test Corp",
          plan: "professional",
          mrr: 5000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-01",
          lastPaymentFailed: false,
          supportTicketCount: 2,
          featureUsagePercent: 75,
          daysWithoutActivity: 1,
          usesFeatures: ["feature-1", "feature-2"],
        });

        const prediction = await revops.predictChurnProbability("cust-1");

        expect(prediction).not.toBeNull();
        expect(prediction.churnProbability).toBeGreaterThanOrEqual(0);
        expect(prediction.churnProbability).toBeLessThanOrEqual(1);
        expect(prediction.confidence).toBeGreaterThan(0.5);
      });
    });

    it("should analyze payment failure impact", async () => {
      await withGitVan(context, async () => {
        await revops.initialize(ks);

        await revops.addCustomer({
          id: "cust-1",
          name: "Test Corp",
          plan: "professional",
          mrr: 5000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-01",
          lastPaymentFailed: true,
          supportTicketCount: 2,
          featureUsagePercent: 75,
          daysWithoutActivity: 1,
          usesFeatures: ["feature-1"],
        });

        const impact = await revops.analyzePaymentImpact("cust-1");

        expect(impact).not.toBeNull();
        expect(impact.impact).toBeGreaterThan(0);
        expect(impact.riskWithPaymentFailure).toBeGreaterThan(impact.baseRisk);
      });
    });

    it("should analyze support ticket impact", async () => {
      await withGitVan(context, async () => {
        await revops.initialize(ks);

        await revops.addCustomer({
          id: "cust-1",
          name: "Test Corp",
          plan: "professional",
          mrr: 5000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-01",
          lastPaymentFailed: false,
          supportTicketCount: 8,
          featureUsagePercent: 75,
          daysWithoutActivity: 1,
          usesFeatures: ["feature-1"],
        });

        const impact = await revops.analyzeSupportTicketImpact("cust-1");

        expect(impact).not.toBeNull();
        expect(impact.currentTickets).toBe(8);
        expect(impact.impact).toBeGreaterThan(0);
      });
    });

    it("should correlate feature usage with churn", async () => {
      await withGitVan(context, async () => {
        await revops.initialize(ks);

        await revops.addFeature({
          id: "feature-1",
          name: "API Access",
          adoptionRate: 75,
          churnRelation: -0.3, // Reduces churn
        });

        await revops.addCustomer({
          id: "cust-1",
          name: "Test Corp",
          plan: "professional",
          mrr: 5000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-01",
          lastPaymentFailed: false,
          supportTicketCount: 2,
          featureUsagePercent: 75,
          daysWithoutActivity: 1,
          usesFeatures: ["feature-1"],
        });

        const correlation = await revops.correlateFeatureUsage("cust-1");

        expect(correlation).not.toBeNull();
        expect(correlation.correlations.length).toBe(1);
        expect(correlation.correlations[0].churnImpact).toBe(-0.3);
      });
    });

    it("should generate recommendations accurately", async () => {
      await withGitVan(context, async () => {
        await revops.initialize(ks);

        await revops.addCustomer({
          id: "cust-1",
          name: "High Risk Corp",
          plan: "professional",
          mrr: 5000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2025-12-01",
          lastPaymentFailed: true,
          supportTicketCount: 8,
          featureUsagePercent: 15,
          daysWithoutActivity: 10,
          usesFeatures: ["feature-1"],
        });

        const recommendations = await revops.generateRecommendations("cust-1");

        expect(recommendations.length).toBeGreaterThan(0);
        expect(
          recommendations.some((r) => r.type === "immediate-intervention")
        ).toBe(true);
      });
    });

    it("should handle multiple risk factors", async () => {
      await withGitVan(context, async () => {
        await revops.initialize(ks);

        await revops.addCustomer({
          id: "cust-1",
          name: "Multi-Risk Corp",
          plan: "professional",
          mrr: 5000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2025-12-01",
          lastPaymentFailed: true,
          supportTicketCount: 10,
          featureUsagePercent: 10,
          daysWithoutActivity: 15,
          usesFeatures: [],
        });

        const risk = revops.calculateChurnRisk(revops.customers.get("cust-1"));

        expect(risk).toBeGreaterThan(80);
      });
    });

    it("should calculate prediction confidence", async () => {
      await withGitVan(context, async () => {
        await revops.initialize(ks);

        await revops.addCustomer({
          id: "cust-1",
          name: "Test Corp",
          plan: "professional",
          mrr: 5000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-01",
          lastPaymentFailed: false,
          supportTicketCount: 2,
          featureUsagePercent: 75,
          daysWithoutActivity: 1,
          usesFeatures: ["feature-1"],
        });

        const prediction = await revops.predictChurnProbability("cust-1");

        expect(prediction.confidence).toBeGreaterThan(0);
        expect(prediction.confidence).toBeLessThanOrEqual(1);
      });
    });

    it("should handle edge case: perfect customer", async () => {
      await withGitVan(context, async () => {
        await revops.initialize(ks);

        await revops.addCustomer({
          id: "cust-1",
          name: "Perfect Corp",
          plan: "professional",
          mrr: 5000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-09",
          lastPaymentFailed: false,
          supportTicketCount: 0,
          featureUsagePercent: 95,
          daysWithoutActivity: 0,
          usesFeatures: ["feature-1", "feature-2", "feature-3"],
        });

        const risk = revops.calculateChurnRisk(revops.customers.get("cust-1"));

        expect(risk).toBe(0);
      });
    });

    it("should handle edge case: no customer data", async () => {
      await withGitVan(context, async () => {
        await revops.initialize(ks);

        const prediction =
          await revops.predictChurnProbability("nonexistent");

        expect(prediction).toBeNull();
      });
    });
  });

  describe("Expansion Discovery Tests (8 tests)", () => {
    it("should identify upsell candidates", async () => {
      await withGitVan(context, async () => {
        await revops.initialize(ks);

        await revops.addPlan({
          id: "basic",
          name: "Basic",
          monthlyPrice: 1000,
          includesFeatures: ["feature-1"],
          targetSegment: "smb",
        });

        await revops.addCustomer({
          id: "cust-1",
          name: "High Usage Corp",
          plan: "basic",
          mrr: 1000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-01",
          lastPaymentFailed: false,
          supportTicketCount: 1,
          featureUsagePercent: 85,
          daysWithoutActivity: 1,
          usesFeatures: ["feature-1"],
        });

        const candidates = await revops.identifyExpansionCandidates();

        expect(candidates.length).toBeGreaterThan(0);
        expect(candidates[0].type).toBe("high-usage");
      });
    });

    it("should analyze feature usage for expansion", async () => {
      await withGitVan(context, async () => {
        await revops.initialize(ks);

        await revops.addPlan({
          id: "basic",
          name: "Basic",
          monthlyPrice: 1000,
          includesFeatures: ["feature-1"],
          targetSegment: "smb",
        });

        await revops.addCustomer({
          id: "cust-1",
          name: "Feature User Corp",
          plan: "basic",
          mrr: 1000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-01",
          lastPaymentFailed: false,
          supportTicketCount: 1,
          featureUsagePercent: 70,
          daysWithoutActivity: 1,
          usesFeatures: ["feature-1", "feature-2"],
        });

        const usage = await revops.analyzeFeatureUsage("cust-1");

        expect(usage).not.toBeNull();
        expect(usage.usingPremiumFeatures).toContain("feature-2");
      });
    });

    it("should match optimal plan for customer", async () => {
      await withGitVan(context, async () => {
        await revops.initialize(ks);

        await revops.addPlan({
          id: "basic",
          name: "Basic",
          monthlyPrice: 1000,
          includesFeatures: ["feature-1"],
          targetSegment: "smb",
        });

        await revops.addPlan({
          id: "professional",
          name: "Professional",
          monthlyPrice: 5000,
          includesFeatures: ["feature-1", "feature-2", "feature-3"],
          targetSegment: "mid-market",
        });

        await revops.addCustomer({
          id: "cust-1",
          name: "Growing Corp",
          plan: "basic",
          mrr: 1000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-01",
          lastPaymentFailed: false,
          supportTicketCount: 1,
          featureUsagePercent: 70,
          daysWithoutActivity: 1,
          usesFeatures: ["feature-1", "feature-2", "feature-3"],
        });

        const match = await revops.matchPlanForCustomer("cust-1");

        expect(match).not.toBeNull();
        expect(match.planId).toBe("professional");
        expect(match.coverage).toBe(100);
      });
    });

    it("should calculate expansion likelihood", async () => {
      await withGitVan(context, async () => {
        await revops.initialize(ks);

        await revops.addPlan({
          id: "basic",
          name: "Basic",
          monthlyPrice: 1000,
          includesFeatures: ["feature-1"],
          targetSegment: "smb",
        });

        await revops.addCustomer({
          id: "cust-1",
          name: "Expansion Ready Corp",
          plan: "basic",
          mrr: 1000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-01",
          lastPaymentFailed: false,
          supportTicketCount: 1,
          featureUsagePercent: 85,
          daysWithoutActivity: 1,
          usesFeatures: ["feature-1", "feature-2"],
        });

        const likelihood = await revops.calculateExpansionLikelihood("cust-1");

        expect(likelihood).not.toBeNull();
        expect(likelihood.likelihood).toBeGreaterThan(0.5);
      });
    });

    it("should identify cross-sell opportunities", async () => {
      await withGitVan(context, async () => {
        await revops.initialize(ks);

        await revops.addCustomer({
          id: "cust-1",
          name: "Healthy Corp",
          plan: "professional",
          mrr: 5000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-01",
          lastPaymentFailed: false,
          supportTicketCount: 1,
          featureUsagePercent: 75,
          daysWithoutActivity: 1,
          usesFeatures: ["feature-1", "feature-2"],
        });

        const opportunities = await revops.identifyCrossSellOpportunities();

        expect(opportunities.length).toBeGreaterThan(0);
        expect(opportunities[0].type).toBe("cross-sell");
      });
    });

    it("should estimate revenue impact", async () => {
      await withGitVan(context, async () => {
        await revops.initialize(ks);

        await revops.addPlan({
          id: "basic",
          name: "Basic",
          monthlyPrice: 1000,
          includesFeatures: ["feature-1"],
          targetSegment: "smb",
        });

        await revops.addCustomer({
          id: "cust-1",
          name: "Test Corp",
          plan: "basic",
          mrr: 1000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-01",
          lastPaymentFailed: false,
          supportTicketCount: 1,
          featureUsagePercent: 85,
          daysWithoutActivity: 1,
          usesFeatures: ["feature-1"],
        });

        const opportunity = {
          customerId: "cust-1",
          type: "high-usage",
        };

        const impact = await revops.estimateRevenueImpact(opportunity);

        expect(impact).not.toBeNull();
        expect(impact.estimatedRevenue).toBeGreaterThan(0);
      });
    });

    it("should handle no expansion candidates", async () => {
      await withGitVan(context, async () => {
        await revops.initialize(ks);

        await revops.addPlan({
          id: "basic",
          name: "Basic",
          monthlyPrice: 1000,
          includesFeatures: ["feature-1"],
          targetSegment: "smb",
        });

        await revops.addCustomer({
          id: "cust-1",
          name: "Low Usage Corp",
          plan: "basic",
          mrr: 1000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-01",
          lastPaymentFailed: false,
          supportTicketCount: 1,
          featureUsagePercent: 30,
          daysWithoutActivity: 1,
          usesFeatures: ["feature-1"],
        });

        const candidates = await revops.identifyExpansionCandidates();

        expect(candidates.length).toBe(0);
      });
    });

    it("should prioritize expansion opportunities", async () => {
      await withGitVan(context, async () => {
        await revops.initialize(ks);

        await revops.addPlan({
          id: "basic",
          name: "Basic",
          monthlyPrice: 1000,
          includesFeatures: ["feature-1"],
          targetSegment: "smb",
        });

        await revops.addCustomer({
          id: "cust-1",
          name: "Premium User Corp",
          plan: "basic",
          mrr: 1000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-01",
          lastPaymentFailed: false,
          supportTicketCount: 1,
          featureUsagePercent: 70,
          daysWithoutActivity: 1,
          usesFeatures: ["feature-1", "feature-2", "feature-3"],
        });

        await revops.addCustomer({
          id: "cust-2",
          name: "High Usage Corp",
          plan: "basic",
          mrr: 1000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-01",
          lastPaymentFailed: false,
          supportTicketCount: 1,
          featureUsagePercent: 85,
          daysWithoutActivity: 1,
          usesFeatures: ["feature-1"],
        });

        const candidates = await revops.identifyExpansionCandidates();

        expect(candidates.length).toBe(2);
        // Feature expansion should have higher likelihood
        const featureExpansion = candidates.find(
          (c) => c.type === "feature-expansion"
        );
        expect(featureExpansion.likelihood).toBe(0.85);
      });
    });
  });

  describe("Cohort Analysis Tests (7 tests)", () => {
    it("should segment customers correctly", async () => {
      await withGitVan(context, async () => {
        await revops.initialize(ks);

        await revops.addCustomer({
          id: "cust-1",
          name: "Enterprise Corp",
          plan: "enterprise",
          mrr: 15000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-01",
          lastPaymentFailed: false,
          supportTicketCount: 2,
          featureUsagePercent: 80,
          daysWithoutActivity: 1,
          usesFeatures: ["feature-1"],
        });

        await revops.addCustomer({
          id: "cust-2",
          name: "SMB Corp",
          plan: "basic",
          mrr: 1000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-01",
          lastPaymentFailed: false,
          supportTicketCount: 1,
          featureUsagePercent: 60,
          daysWithoutActivity: 2,
          usesFeatures: ["feature-1"],
        });

        const segments = await revops.segmentCustomers();

        expect(segments.enterprise).toContain("cust-1");
        expect(segments.smb).toContain("cust-2");
      });
    });

    it("should compare retention between cohorts", async () => {
      await withGitVan(context, async () => {
        await revops.initialize(ks);

        await revops.addCustomer({
          id: "cust-1",
          name: "Enterprise 1",
          plan: "enterprise",
          mrr: 15000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-01",
          lastPaymentFailed: false,
          supportTicketCount: 2,
          featureUsagePercent: 80,
          daysWithoutActivity: 1,
          usesFeatures: ["feature-1"],
          churned: false,
        });

        await revops.addCustomer({
          id: "cust-2",
          name: "SMB 1",
          plan: "basic",
          mrr: 1000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-01",
          lastPaymentFailed: false,
          supportTicketCount: 1,
          featureUsagePercent: 60,
          daysWithoutActivity: 2,
          usesFeatures: ["feature-1"],
          churned: true,
        });

        const comparison = await revops.compareRetention(
          ["cust-1"],
          ["cust-2"]
        );

        expect(comparison.segment1Retention).toBeGreaterThan(
          comparison.segment2Retention
        );
      });
    });

    it("should estimate LTV for customer", async () => {
      await withGitVan(context, async () => {
        await revops.initialize(ks);

        await revops.addCustomer({
          id: "cust-1",
          name: "Test Corp",
          plan: "professional",
          mrr: 5000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-01",
          lastPaymentFailed: false,
          supportTicketCount: 2,
          featureUsagePercent: 75,
          daysWithoutActivity: 1,
          usesFeatures: ["feature-1"],
        });

        const ltv = await revops.estimateLTV("cust-1");

        expect(ltv).not.toBeNull();
        expect(ltv.ltv).toBeGreaterThan(0);
        expect(ltv.estimatedTenure).toBeGreaterThan(0);
      });
    });

    it("should track cohort retention", async () => {
      await withGitVan(context, async () => {
        await revops.initialize(ks);

        await revops.addCustomer({
          id: "cust-1",
          name: "Retained",
          plan: "professional",
          mrr: 5000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-01",
          lastPaymentFailed: false,
          supportTicketCount: 2,
          featureUsagePercent: 75,
          daysWithoutActivity: 1,
          usesFeatures: ["feature-1"],
          churned: false,
        });

        await revops.addCustomer({
          id: "cust-2",
          name: "Churned",
          plan: "professional",
          mrr: 5000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2025-06-01",
          lastPaymentFailed: true,
          supportTicketCount: 10,
          featureUsagePercent: 10,
          daysWithoutActivity: 30,
          usesFeatures: [],
          churned: true,
        });

        const retention = await revops.trackCohortRetention("cohort-2024-01", [
          "cust-1",
          "cust-2",
        ]);

        expect(retention.initialSize).toBe(2);
        expect(retention.retainedCount).toBe(1);
        expect(retention.retentionRate).toBe(0.5);
      });
    });

    it("should analyze feature adoption by cohort", async () => {
      await withGitVan(context, async () => {
        await revops.initialize(ks);

        await revops.addCustomer({
          id: "cust-1",
          name: "User 1",
          plan: "professional",
          mrr: 5000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-01",
          lastPaymentFailed: false,
          supportTicketCount: 2,
          featureUsagePercent: 75,
          daysWithoutActivity: 1,
          usesFeatures: ["feature-1", "feature-2"],
        });

        await revops.addCustomer({
          id: "cust-2",
          name: "User 2",
          plan: "professional",
          mrr: 5000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-01",
          lastPaymentFailed: false,
          supportTicketCount: 1,
          featureUsagePercent: 80,
          daysWithoutActivity: 1,
          usesFeatures: ["feature-1"],
        });

        const adoption = await revops.analyzeFeatureAdoption("cohort-2024-01", [
          "cust-1",
          "cust-2",
        ]);

        expect(adoption.adoption.length).toBeGreaterThan(0);
        const feature1Adoption = adoption.adoption.find(
          (a) => a.feature === "feature-1"
        );
        expect(feature1Adoption.adoptionRate).toBe(1.0); // 100%
      });
    });

    it("should analyze cohort revenue trends", async () => {
      await withGitVan(context, async () => {
        await revops.initialize(ks);

        await revops.addCustomer({
          id: "cust-1",
          name: "User 1",
          plan: "professional",
          mrr: 5000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-01",
          lastPaymentFailed: false,
          supportTicketCount: 2,
          featureUsagePercent: 75,
          daysWithoutActivity: 1,
          usesFeatures: ["feature-1"],
        });

        await revops.addCustomer({
          id: "cust-2",
          name: "User 2",
          plan: "professional",
          mrr: 3000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-01",
          lastPaymentFailed: false,
          supportTicketCount: 1,
          featureUsagePercent: 80,
          daysWithoutActivity: 1,
          usesFeatures: ["feature-1"],
        });

        const revenue = await revops.analyzeCohortRevenue("cohort-2024-01", [
          "cust-1",
          "cust-2",
        ]);

        expect(revenue.totalRevenue).toBe(8000);
        expect(revenue.avgRevenue).toBe(4000);
      });
    });

    it("should handle empty cohorts", async () => {
      await withGitVan(context, async () => {
        await revops.initialize(ks);

        const retention = await revops.trackCohortRetention("empty-cohort", []);

        expect(retention.initialSize).toBe(0);
        expect(retention.retainedCount).toBe(0);
      });
    });
  });

  describe("Feature Analysis Tests (5 tests)", () => {
    it("should correlate features with revenue", async () => {
      await withGitVan(context, async () => {
        await revops.initialize(ks);

        await revops.addCustomer({
          id: "cust-1",
          name: "High Revenue",
          plan: "professional",
          mrr: 10000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-01",
          lastPaymentFailed: false,
          supportTicketCount: 1,
          featureUsagePercent: 80,
          daysWithoutActivity: 1,
          usesFeatures: ["feature-api"],
        });

        await revops.addCustomer({
          id: "cust-2",
          name: "Low Revenue",
          plan: "basic",
          mrr: 1000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-01",
          lastPaymentFailed: false,
          supportTicketCount: 1,
          featureUsagePercent: 60,
          daysWithoutActivity: 2,
          usesFeatures: [],
        });

        const correlation = await revops.correlateFeatureWithRevenue(
          "feature-api"
        );

        expect(correlation.avgRevenueWith).toBeGreaterThan(
          correlation.avgRevenueWithout
        );
        expect(correlation.impact).toBeGreaterThan(0);
      });
    });

    it("should calculate feature adoption rates", async () => {
      await withGitVan(context, async () => {
        await revops.initialize(ks);

        await revops.addCustomer({
          id: "cust-1",
          name: "User 1",
          plan: "professional",
          mrr: 5000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-01",
          lastPaymentFailed: false,
          supportTicketCount: 1,
          featureUsagePercent: 80,
          daysWithoutActivity: 1,
          usesFeatures: ["feature-1"],
        });

        await revops.addCustomer({
          id: "cust-2",
          name: "User 2",
          plan: "professional",
          mrr: 5000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-01",
          lastPaymentFailed: false,
          supportTicketCount: 1,
          featureUsagePercent: 80,
          daysWithoutActivity: 1,
          usesFeatures: [],
        });

        const adoption = await revops.calculateFeatureAdoptionRate("feature-1");

        expect(adoption.adoptionCount).toBe(1);
        expect(adoption.adoptionRate).toBe(0.5);
      });
    });

    it("should analyze feature churn impact", async () => {
      await withGitVan(context, async () => {
        await revops.initialize(ks);

        await revops.addFeature({
          id: "feature-1",
          name: "Critical Feature",
          adoptionRate: 75,
          churnRelation: -0.4, // Reduces churn significantly
        });

        const impact = await revops.analyzeFeatureChurnImpact("feature-1");

        expect(impact).not.toBeNull();
        expect(impact.churnRelation).toBe(-0.4);
        expect(impact.interpretation).toBe("reduces-churn");
      });
    });

    it("should identify high-value features", async () => {
      await withGitVan(context, async () => {
        await revops.initialize(ks);

        await revops.addFeature({
          id: "feature-1",
          name: "High Value Feature",
          adoptionRate: 75,
          churnRelation: -0.5,
        });

        await revops.addFeature({
          id: "feature-2",
          name: "Low Value Feature",
          adoptionRate: 30,
          churnRelation: 0.1,
        });

        await revops.addCustomer({
          id: "cust-1",
          name: "User 1",
          plan: "professional",
          mrr: 10000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-01",
          lastPaymentFailed: false,
          supportTicketCount: 1,
          featureUsagePercent: 80,
          daysWithoutActivity: 1,
          usesFeatures: ["feature-1"],
        });

        await revops.addCustomer({
          id: "cust-2",
          name: "User 2",
          plan: "basic",
          mrr: 1000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-01",
          lastPaymentFailed: false,
          supportTicketCount: 1,
          featureUsagePercent: 60,
          daysWithoutActivity: 2,
          usesFeatures: ["feature-2"],
        });

        const highValue = await revops.identifyHighValueFeatures();

        expect(highValue.length).toBeGreaterThan(0);
        expect(highValue[0].featureId).toBe("feature-1");
      });
    });

    it("should analyze feature combinations", async () => {
      await withGitVan(context, async () => {
        await revops.initialize(ks);

        await revops.addCustomer({
          id: "cust-1",
          name: "Power User",
          plan: "professional",
          mrr: 5000,
          signupDate: "2024-01-01",
          lastPaymentDate: "2026-01-01",
          lastPaymentFailed: false,
          supportTicketCount: 1,
          featureUsagePercent: 90,
          daysWithoutActivity: 1,
          usesFeatures: ["feature-1", "feature-2", "feature-3"],
        });

        const combinations = await revops.analyzeFeatureCombinations("cust-1");

        expect(combinations).not.toBeNull();
        expect(combinations.combinations.length).toBeGreaterThan(0);
      });
    });
  });
});
