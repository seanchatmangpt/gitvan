import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { withGitVan } from "../../src/core/context.mjs";
import { useChurnPredictor } from "../../src/revops/churn-predictor.mjs";
import { useGit } from "../../src/composables/git.mjs";
import { execSync } from "child_process";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

describe("useChurnPredictor", () => {
  let testDir;
  let context;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "churn-test-"));
    execSync("git init", { cwd: testDir });
    execSync('git config user.email "test@test.com"', { cwd: testDir });
    execSync('git config user.name "Test User"', { cwd: testDir });
    execSync('echo "test" > README.md', { cwd: testDir });
    execSync("git add .", { cwd: testDir });
    execSync('git commit -m "initial"', { cwd: testDir });

    context = {
      cwd: testDir,
      env: { TZ: "UTC", LANG: "C" },
    };
  });

  afterEach(() => {
    if (testDir) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("calculateHealthScore", () => {
    it("should return 100 for healthy customer", async () => {
      await withGitVan(context, async () => {
        const predictor = useChurnPredictor();
        const customer = { id: "cust1" };
        const usage = {
          lastActivityDays: 1,
          currentUsage: 800,
          planLimit: 1000,
          loginFrequencyDays: 1,
          planDowngradeRequests: 0,
        };
        const support = {
          ticketsLast30Days: 0,
          failedPaymentAttempts: 0,
        };

        const score = predictor.calculateHealthScore(customer, usage, support);
        expect(score).toBe(100);
      });
    });

    it("should penalize for no activity", async () => {
      await withGitVan(context, async () => {
        const predictor = useChurnPredictor();
        const customer = { id: "cust1" };
        const usage = {
          lastActivityDays: 8,
          currentUsage: 500,
          planLimit: 1000,
          loginFrequencyDays: 2,
          planDowngradeRequests: 0,
        };
        const support = {
          ticketsLast30Days: 0,
          failedPaymentAttempts: 0,
        };

        const score = predictor.calculateHealthScore(customer, usage, support);
        expect(score).toBeLessThan(100);
        expect(score).toBeGreaterThan(0);
      });
    });

    it("should penalize for failed payments", async () => {
      await withGitVan(context, async () => {
        const predictor = useChurnPredictor();
        const customer = { id: "cust1" };
        const usage = {
          lastActivityDays: 1,
          currentUsage: 500,
          planLimit: 1000,
          loginFrequencyDays: 1,
          planDowngradeRequests: 0,
        };
        const support = {
          ticketsLast30Days: 0,
          failedPaymentAttempts: 2,
        };

        const score = predictor.calculateHealthScore(customer, usage, support);
        expect(score).toBeLessThan(100);
      });
    });
  });

  describe("calculateChurnRiskScore", () => {
    it("should calculate risk score", async () => {
      await withGitVan(context, async () => {
        const predictor = useChurnPredictor();
        const customer = { id: "cust1" };
        const history = {
          usage: {
            lastActivityDays: 35,
            currentUsage: 100,
            planLimit: 1000,
            loginFrequencyDays: 35,
            planDowngradeRequests: 0,
          },
          support: {
            ticketsLast30Days: 6,
            failedPaymentAttempts: 1,
          },
        };

        const riskScore = predictor.calculateChurnRiskScore(customer, history);
        expect(riskScore).toBeGreaterThan(50);
        expect(riskScore).toBeLessThanOrEqual(100);
      });
    });
  });

  describe("identifyWarningSignals", () => {
    it("should identify no usage signal", async () => {
      await withGitVan(context, async () => {
        const predictor = useChurnPredictor();
        const customer = { id: "cust1" };
        const history = {
          usage: { lastActivityDays: 10 },
          support: {},
        };

        const signals = predictor.identifyWarningSignals(customer, history);
        expect(signals.length).toBeGreaterThan(0);
        expect(signals[0].type).toBe("no_usage");
      });
    });

    it("should identify payment failure signal", async () => {
      await withGitVan(context, async () => {
        const predictor = useChurnPredictor();
        const customer = { id: "cust1" };
        const history = {
          usage: {},
          support: { failedPaymentAttempts: 2 },
        };

        const signals = predictor.identifyWarningSignals(customer, history);
        const paymentSignal = signals.find((s) => s.type === "payment_failure");
        expect(paymentSignal).toBeDefined();
        expect(paymentSignal.severity).toBe("critical");
      });
    });
  });

  describe("calculateCohortRetention", () => {
    it("should calculate retention metrics", async () => {
      await withGitVan(context, async () => {
        const predictor = useChurnPredictor();
        const cohort = {
          id: "cohort1",
          startDate: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
          customers: ["cust1", "cust2", "cust3"],
        };
        const customerData = {
          cust1: {
            signupDate: cohort.startDate,
          },
          cust2: {
            signupDate: cohort.startDate,
            churnDate: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
          },
          cust3: {
            signupDate: cohort.startDate,
          },
        };

        const retention = predictor.calculateCohortRetention(cohort, customerData);
        expect(retention.initialSize).toBe(3);
        expect(retention.day1).toBeLessThanOrEqual(3);
        expect(retention.day90Percent).toBeGreaterThan(0);
      });
    });
  });

  describe("identifyUpsellCandidates", () => {
    it("should identify high usage customers", async () => {
      await withGitVan(context, async () => {
        const predictor = useChurnPredictor();
        const customers = [
          {
            id: "cust1",
            usage: { currentUsage: 900, planLimit: 1000 },
          },
        ];
        const subscriptions = {
          cust1: { plan: "basic", mrr: 100 },
        };

        const candidates = predictor.identifyUpsellCandidates(customers, subscriptions);
        expect(candidates.length).toBeGreaterThan(0);
        expect(candidates[0].type).toBe("upsell");
        expect(candidates[0].reason).toBe("high_usage");
      });
    });
  });

  describe("identifyCrossSellCandidates", () => {
    it("should identify healthy customers for cross-sell", async () => {
      await withGitVan(context, async () => {
        const predictor = useChurnPredictor();
        const customers = [
          {
            id: "cust1",
            products: ["prod1"],
            engagement: 0.8,
            usage: { currentUsage: 500, planLimit: 1000, lastActivityDays: 1, loginFrequencyDays: 1, planDowngradeRequests: 0 },
            support: { ticketsLast30Days: 0, failedPaymentAttempts: 0 },
          },
        ];
        const products = [
          { id: "prod1", name: "Product 1", mrr: 50 },
          { id: "prod2", name: "Product 2", mrr: 75 },
        ];

        const candidates = predictor.identifyCrossSellCandidates(customers, products);
        expect(candidates.length).toBeGreaterThan(0);
        expect(candidates[0].type).toBe("cross_sell");
      });
    });
  });

  describe("flagForRetention", () => {
    it("should flag high churn risk customers", async () => {
      await withGitVan(context, async () => {
        const predictor = useChurnPredictor();
        const customers = [
          { id: "cust1", mrr: 100 },
          { id: "cust2", mrr: 200 },
        ];
        const churnScores = {
          cust1: 75,
          cust2: 55,
        };

        const flagged = predictor.flagForRetention(customers, churnScores);
        expect(flagged.length).toBe(2);
        expect(flagged[0].priority).toBe("critical");
        expect(flagged[1].priority).toBe("high");
      });
    });
  });

  describe("git-native storage", () => {
    it("should store and load churn scores", async () => {
      await withGitVan(context, async () => {
        const predictor = useChurnPredictor();
        const scores = {
          scores: { cust1: 75, cust2: 25 },
          warnings: {},
          timestamp: new Date().toISOString(),
        };

        await predictor.storeChurnScores(scores);
        const loaded = await predictor.loadLatestChurnScores();
        expect(loaded.scores.cust1).toBe(75);
        expect(loaded.scores.cust2).toBe(25);
      });
    });

    it("should store and load cohort data", async () => {
      await withGitVan(context, async () => {
        const predictor = useChurnPredictor();
        const cohorts = [
          {
            cohortId: "cohort1",
            day30Percent: 85,
          },
        ];

        await predictor.storeCohortData(cohorts);
        const loaded = await predictor.loadLatestCohortData();
        expect(loaded[0].cohortId).toBe("cohort1");
        expect(loaded[0].day30Percent).toBe(85);
      });
    });
  });

  describe("runDailyScoring", () => {
    it("should score all customers", async () => {
      await withGitVan(context, async () => {
        const predictor = useChurnPredictor();
        const customers = [
          {
            id: "cust1",
            history: {
              usage: { lastActivityDays: 35, currentUsage: 100, planLimit: 1000, loginFrequencyDays: 35, planDowngradeRequests: 0 },
              support: { ticketsLast30Days: 6, failedPaymentAttempts: 1 },
            },
          },
        ];

        const result = await predictor.runDailyScoring(customers);
        expect(result.scores.cust1).toBeDefined();
        expect(result.warnings.cust1).toBeDefined();
      });
    });
  });
});
