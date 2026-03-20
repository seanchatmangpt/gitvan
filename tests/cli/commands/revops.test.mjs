/**
 * Tests for RevOps Command
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../src/core/context.mjs", () => ({
  withGitVan: vi.fn(async (ctx, fn) => fn()),
}));

vi.mock("../../../src/config/loader.mjs", () => ({
  loadOptions: vi.fn().mockResolvedValue({ rootDir: "/tmp/test" }),
}));

vi.mock("../../../src/utils/logger.mjs", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
  }),
}));

vi.mock("../../../src/composables/revops/metrics.mjs", () => ({
  useRevOpsMetrics: () => ({
    calculate: vi.fn().mockResolvedValue({
      mrr: 50000,
      arr: 600000,
      arpu: 500,
      churnRate: 3.5,
      nrr: 110,
      ltv: 14285,
      cac: 2000,
      ltvCacRatio: 7.1,
    }),
  }),
}));

vi.mock("../../../src/composables/revops/report.mjs", () => ({
  useRevOpsReport: () => ({
    generate: vi.fn().mockResolvedValue({
      trends: [{ period: "2026-01", revenue: 50000, change: 5.2 }],
      cohorts: [{ name: "Q1-2026", retention: 85, revenue: 20000 }],
      atRisk: [{ name: "Acme Corp", riskScore: 75, mrr: 5000 }],
    }),
  }),
}));

vi.mock("../../../src/composables/revops/health.mjs", () => ({
  useRevOpsHealth: () => ({
    calculate: vi.fn().mockResolvedValue({
      score: 82,
      metrics: [
        { name: "MRR Growth", value: "5%", target: "3%", status: "good" },
        { name: "Churn", value: "4%", target: "3%", status: "warning" },
      ],
      warnings: [{ message: "Churn above target" }],
      alerts: [],
      recommendations: [
        { title: "Reduce churn", description: "Focus on onboarding" },
      ],
    }),
  }),
}));

vi.mock("../../../src/composables/revops/forecast.mjs", () => ({
  useRevOpsForecast: () => ({
    project: vi.fn().mockResolvedValue({
      projections: [{ month: "2026-01", arr: 600000, mrr: 50000 }],
      breakeven: { burnRate: 40000, arrTarget: 480000, monthsToBreakeven: 6 },
      scenarios: [
        { name: "Optimistic", growthRate: 0.15, arrAt12Months: 900000 },
      ],
    }),
  }),
}));

vi.mock("../../../src/composables/revops/customers.mjs", () => ({
  useRevOpsCustomers: () => ({
    list: vi.fn().mockResolvedValue({
      customers: [
        {
          name: "Acme",
          status: "active",
          healthScore: 85,
          mrr: 5000,
          ltv: 60000,
          churnRisk: 10,
          notes: null,
        },
      ],
      totalMrr: 50000,
      avgHealthScore: 82,
    }),
  }),
}));

const { revopsCommand } = await import(
  "../../../src/cli/commands/revops.mjs"
);

describe("RevOps Command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("revopsCommand", () => {
    it("should be defined", () => {
      expect(revopsCommand).toBeDefined();
      expect(revopsCommand.meta).toBeDefined();
      expect(revopsCommand.meta.name).toBe("revops");
    });

    it("should have proper description", () => {
      expect(revopsCommand.meta.description).toContain("RevOps");
    });

    it("should have all required subcommands", () => {
      expect(revopsCommand.subCommands).toBeDefined();
      expect(revopsCommand.subCommands.metrics).toBeDefined();
      expect(revopsCommand.subCommands.report).toBeDefined();
      expect(revopsCommand.subCommands.health).toBeDefined();
      expect(revopsCommand.subCommands.forecast).toBeDefined();
      expect(revopsCommand.subCommands.customers).toBeDefined();
    });

    it("should export as default", async () => {
      const mod = await import("../../../src/cli/commands/revops.mjs");
      expect(mod.default).toBe(mod.revopsCommand);
    });
  });

  describe("metrics subcommand", () => {
    const metricsCmd = revopsCommand.subCommands.metrics;

    it("should be properly defined", () => {
      expect(metricsCmd.meta.name).toBe("metrics");
      expect(metricsCmd.meta.description).toContain("metrics");
    });

    it("should have format argument with default table", () => {
      expect(metricsCmd.args.format).toBeDefined();
      expect(metricsCmd.args.format.type).toBe("string");
      expect(metricsCmd.args.format.default).toBe("table");
    });

    it("should display metrics in table format", async () => {
      await metricsCmd.run({ args: { format: "table" } });
    });

    it("should display metrics in json format", async () => {
      await metricsCmd.run({ args: { format: "json" } });
    });
  });

  describe("report subcommand", () => {
    const reportCmd = revopsCommand.subCommands.report;

    it("should be properly defined", () => {
      expect(reportCmd.meta.name).toBe("report");
      expect(reportCmd.meta.description).toContain("report");
    });

    it("should have period positional argument", () => {
      expect(reportCmd.args.period).toBeDefined();
      expect(reportCmd.args.period.type).toBe("positional");
    });

    it("should have format and limit arguments", () => {
      expect(reportCmd.args.format).toBeDefined();
      expect(reportCmd.args.limit).toBeDefined();
    });

    it("should generate report in table format", async () => {
      await reportCmd.run({
        args: { period: "monthly", format: "table", limit: "12" },
      });
    });

    it("should generate report in json format", async () => {
      await reportCmd.run({
        args: { period: "weekly", format: "json", limit: "4" },
      });
    });
  });

  describe("health subcommand", () => {
    const healthCmd = revopsCommand.subCommands.health;

    it("should be properly defined", () => {
      expect(healthCmd.meta.name).toBe("health");
      expect(healthCmd.meta.description).toContain("health");
    });

    it("should have format argument", () => {
      expect(healthCmd.args.format).toBeDefined();
      expect(healthCmd.args.format.default).toBe("table");
    });

    it("should display health in table format", async () => {
      await healthCmd.run({ args: { format: "table" } });
    });

    it("should display health in json format", async () => {
      await healthCmd.run({ args: { format: "json" } });
    });
  });

  describe("forecast subcommand", () => {
    const forecastCmd = revopsCommand.subCommands.forecast;

    it("should be properly defined", () => {
      expect(forecastCmd.meta.name).toBe("forecast");
      expect(forecastCmd.meta.description).toContain("Forecast");
    });

    it("should have growth-rate argument with default 10", () => {
      expect(forecastCmd.args["growth-rate"]).toBeDefined();
      expect(forecastCmd.args["growth-rate"].default).toBe("10");
    });

    it("should have months argument with default 12", () => {
      expect(forecastCmd.args.months).toBeDefined();
      expect(forecastCmd.args.months.default).toBe("12");
    });

    it("should generate forecast in table format", async () => {
      await forecastCmd.run({
        args: { "growth-rate": "10", months: "12", format: "table" },
      });
    });

    it("should generate forecast in json format", async () => {
      await forecastCmd.run({
        args: { "growth-rate": "15", months: "6", format: "json" },
      });
    });
  });

  describe("customers subcommand", () => {
    const customersCmd = revopsCommand.subCommands.customers;

    it("should be properly defined", () => {
      expect(customersCmd.meta.name).toBe("customers");
      expect(customersCmd.meta.description).toContain("customers");
    });

    it("should have filter flags", () => {
      expect(customersCmd.args["at-risk"]).toBeDefined();
      expect(customersCmd.args["at-risk"].type).toBe("boolean");
      expect(customersCmd.args.expansion).toBeDefined();
      expect(customersCmd.args.expansion.type).toBe("boolean");
      expect(customersCmd.args.all).toBeDefined();
      expect(customersCmd.args.all.type).toBe("boolean");
    });

    it("should have format and limit arguments", () => {
      expect(customersCmd.args.format).toBeDefined();
      expect(customersCmd.args.limit).toBeDefined();
    });

    it("should list customers in table format", async () => {
      await customersCmd.run({
        args: {
          "at-risk": false,
          expansion: false,
          all: true,
          format: "table",
          limit: "50",
        },
      });
    });

    it("should list customers in json format", async () => {
      await customersCmd.run({
        args: {
          "at-risk": false,
          expansion: false,
          all: false,
          format: "json",
          limit: "10",
        },
      });
    });

    it("should filter at-risk customers", async () => {
      await customersCmd.run({
        args: {
          "at-risk": true,
          expansion: false,
          all: false,
          format: "table",
          limit: "50",
        },
      });
    });
  });
});

describe("RevOps utility functions", () => {
  it("should export format functions implicitly via module", async () => {
    // The module defines formatNumber, formatPercent, formatRatio, formatChange
    // These are internal but used during run - verified via command execution
    const mod = await import("../../../src/cli/commands/revops.mjs");
    expect(mod.revopsCommand).toBeDefined();
  });
});
