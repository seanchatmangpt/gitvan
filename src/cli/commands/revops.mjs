import { defineCommand } from "citty";
import { withGitVan } from "../../core/context.mjs";
import { loadOptions } from "../../config/loader.mjs";
import { createLogger } from "../../utils/logger.mjs";

const logger = createLogger("revops-cli");

const metricsSubcommand = defineCommand({
  meta: {
    name: "metrics",
    description: "Show current RevOps metrics",
  },
  args: {
    format: {
      type: "string",
      description: "Output format (table|json)",
      default: "table",
    },
  },
  async run({ args }) {
    try {
      const config = await loadOptions();

      await withGitVan({ config }, async () => {
        const { useRevOpsMetrics } = await import("../../composables/revops/metrics.mjs");
        const metrics = useRevOpsMetrics();

        const data = await metrics.calculate();

        if (args.format === "json") {
          logger.log(JSON.stringify(data, null, 2));
        } else {
          logger.info("Current RevOps Metrics");
          logger.info("=".repeat(50));
          logger.info(`MRR:        $${formatNumber(data.mrr)}`);
          logger.info(`ARR:        $${formatNumber(data.arr)}`);
          logger.info(`ARPU:       $${formatNumber(data.arpu)}`);
          logger.info(`Churn Rate: ${formatPercent(data.churnRate)}`);
          logger.info(`NRR:        ${formatPercent(data.nrr)}`);
          logger.info(`LTV:        $${formatNumber(data.ltv)}`);
          logger.info(`CAC:        $${formatNumber(data.cac)}`);
          logger.info(`LTV/CAC:    ${formatRatio(data.ltvCacRatio)}`);
        }
      });
    } catch (error) {
      logger.error(`Failed to calculate metrics: ${error.message}`);
      process.exit(1);
    }
  },
});

const reportSubcommand = defineCommand({
  meta: {
    name: "report",
    description: "Generate revenue report",
  },
  args: {
    period: {
      type: "positional",
      description: "Report period (daily|weekly|monthly)",
      default: "monthly",
    },
    format: {
      type: "string",
      description: "Output format (table|json)",
      default: "table",
    },
    limit: {
      type: "string",
      description: "Number of periods to show",
      default: "12",
    },
  },
  async run({ args }) {
    try {
      const config = await loadOptions();
      const period = args.period || "monthly";
      const limit = parseInt(args.limit || "12", 10);

      await withGitVan({ config }, async () => {
        const { useRevOpsReport } = await import("../../composables/revops/report.mjs");
        const report = useRevOpsReport();

        const data = await report.generate(period, { limit });

        if (args.format === "json") {
          logger.log(JSON.stringify(data, null, 2));
        } else {
          logger.info(`Revenue Report - ${period.charAt(0).toUpperCase() + period.slice(1)}`);
          logger.info("=".repeat(70));

          logger.info("\nRevenue Trends:");
          data.trends.forEach((trend) => {
            logger.info(`  ${trend.period}: $${formatNumber(trend.revenue)} (${formatChange(trend.change)})`);
          });

          logger.info("\nCohort Performance:");
          data.cohorts.forEach((cohort) => {
            logger.info(`  ${cohort.name}: ${cohort.retention}% retention, $${formatNumber(cohort.revenue)} revenue`);
          });

          logger.info("\nAt-Risk Customers:");
          data.atRisk.forEach((customer) => {
            logger.info(`  ${customer.name}: ${customer.riskScore}% risk, MRR $${formatNumber(customer.mrr)}`);
          });
        }
      });
    } catch (error) {
      logger.error(`Failed to generate report: ${error.message}`);
      process.exit(1);
    }
  },
});

const healthSubcommand = defineCommand({
  meta: {
    name: "health",
    description: "Show business health score",
  },
  args: {
    format: {
      type: "string",
      description: "Output format (table|json)",
      default: "table",
    },
  },
  async run({ args }) {
    try {
      const config = await loadOptions();

      await withGitVan({ config }, async () => {
        const { useRevOpsHealth } = await import("../../composables/revops/health.mjs");
        const health = useRevOpsHealth();

        const data = await health.calculate();

        if (args.format === "json") {
          logger.log(JSON.stringify(data, null, 2));
        } else {
          logger.info("Business Health Dashboard");
          logger.info("=".repeat(70));

          const scoreColor = data.score >= 80 ? "✅" : data.score >= 60 ? "⚠️ " : "❌";
          logger.info(`\nOverall Health Score: ${scoreColor} ${data.score}/100`);

          logger.info("\nKey Metrics:");
          data.metrics.forEach((metric) => {
            const icon = metric.status === "good" ? "✅" : metric.status === "warning" ? "⚠️ " : "❌";
            logger.info(`  ${icon} ${metric.name}: ${metric.value} (${metric.target} target)`);
          });

          if (data.warnings.length > 0) {
            logger.info("\nWarnings:");
            data.warnings.forEach((warning) => {
              logger.info(`  ⚠️  ${warning.message}`);
            });
          }

          if (data.alerts.length > 0) {
            logger.info("\nAlerts:");
            data.alerts.forEach((alert) => {
              logger.info(`  ❌ ${alert.message}`);
            });
          }

          if (data.recommendations.length > 0) {
            logger.info("\nRecommendations:");
            data.recommendations.forEach((rec, idx) => {
              logger.info(`  ${idx + 1}. ${rec.title}`);
              logger.info(`     ${rec.description}`);
            });
          }
        }
      });
    } catch (error) {
      logger.error(`Failed to calculate health: ${error.message}`);
      process.exit(1);
    }
  },
});

const forecastSubcommand = defineCommand({
  meta: {
    name: "forecast",
    description: "Forecast ARR growth",
  },
  args: {
    "growth-rate": {
      type: "string",
      description: "Monthly growth rate (percentage)",
      default: "10",
    },
    months: {
      type: "string",
      description: "Number of months to forecast",
      default: "12",
    },
    format: {
      type: "string",
      description: "Output format (table|json)",
      default: "table",
    },
  },
  async run({ args }) {
    try {
      const config = await loadOptions();
      const growthRate = parseFloat(args["growth-rate"] || "10") / 100;
      const months = parseInt(args.months || "12", 10);

      await withGitVan({ config }, async () => {
        const { useRevOpsForecast } = await import("../../composables/revops/forecast.mjs");
        const forecast = useRevOpsForecast();

        const data = await forecast.project({ growthRate, months });

        if (args.format === "json") {
          logger.log(JSON.stringify(data, null, 2));
        } else {
          logger.info("ARR Growth Forecast");
          logger.info("=".repeat(70));
          logger.info(`Growth Rate: ${formatPercent(growthRate * 100)}/month`);
          logger.info(`Forecast Period: ${months} months\n`);

          logger.info("Monthly Projections:");
          data.projections.forEach((proj) => {
            logger.info(`  ${proj.month}: ARR $${formatNumber(proj.arr)}, MRR $${formatNumber(proj.mrr)}`);
          });

          logger.info("\nPath to Breakeven:");
          logger.info(`  Current Burn Rate: $${formatNumber(data.breakeven.burnRate)}/month`);
          logger.info(`  Breakeven ARR: $${formatNumber(data.breakeven.arrTarget)}`);
          logger.info(`  Months to Breakeven: ${data.breakeven.monthsToBreakeven}`);

          if (data.scenarios.length > 0) {
            logger.info("\nScenario Analysis:");
            data.scenarios.forEach((scenario) => {
              logger.info(`  ${scenario.name}:`);
              logger.info(`    Growth: ${formatPercent(scenario.growthRate * 100)}/month`);
              logger.info(`    12-month ARR: $${formatNumber(scenario.arrAt12Months)}`);
            });
          }
        }
      });
    } catch (error) {
      logger.error(`Failed to generate forecast: ${error.message}`);
      process.exit(1);
    }
  },
});

const customersSubcommand = defineCommand({
  meta: {
    name: "customers",
    description: "List customers with status",
  },
  args: {
    "at-risk": {
      type: "boolean",
      description: "Show only at-risk customers",
      default: false,
    },
    expansion: {
      type: "boolean",
      description: "Show only expansion opportunities",
      default: false,
    },
    all: {
      type: "boolean",
      description: "Show all customers",
      default: false,
    },
    format: {
      type: "string",
      description: "Output format (table|json)",
      default: "table",
    },
    limit: {
      type: "string",
      description: "Number of customers to show",
      default: "50",
    },
  },
  async run({ args }) {
    try {
      const config = await loadOptions();
      const limit = parseInt(args.limit || "50", 10);

      const filter = args["at-risk"] ? "at-risk" :
                     args.expansion ? "expansion" :
                     args.all ? "all" : "all";

      await withGitVan({ config }, async () => {
        const { useRevOpsCustomers } = await import("../../composables/revops/customers.mjs");
        const customers = useRevOpsCustomers();

        const data = await customers.list({ filter, limit });

        if (args.format === "json") {
          logger.log(JSON.stringify(data, null, 2));
        } else {
          const filterLabel = filter === "at-risk" ? "At-Risk" :
                            filter === "expansion" ? "Expansion Opportunities" :
                            "All";

          logger.info(`Customers - ${filterLabel}`);
          logger.info("=".repeat(70));

          data.customers.forEach((customer, idx) => {
            const healthIcon = customer.healthScore >= 80 ? "🟢" :
                             customer.healthScore >= 60 ? "🟡" : "🔴";

            logger.info(`\n${idx + 1}. ${customer.name} ${healthIcon}`);
            logger.info(`   Status: ${customer.status}`);
            logger.info(`   Health Score: ${customer.healthScore}/100`);
            logger.info(`   MRR: $${formatNumber(customer.mrr)}`);
            logger.info(`   LTV: $${formatNumber(customer.ltv)}`);
            logger.info(`   Churn Risk: ${formatPercent(customer.churnRisk)}`);

            if (customer.notes) {
              logger.info(`   Notes: ${customer.notes}`);
            }
          });

          logger.info(`\nTotal: ${data.customers.length} customers`);
          logger.info(`Total MRR: $${formatNumber(data.totalMrr)}`);
          logger.info(`Average Health Score: ${data.avgHealthScore}/100`);
        }
      });
    } catch (error) {
      logger.error(`Failed to list customers: ${error.message}`);
      process.exit(1);
    }
  },
});

export const revopsCommand = defineCommand({
  meta: {
    name: "revops",
    description: "RevOps analytics and reporting",
  },
  subCommands: {
    metrics: metricsSubcommand,
    report: reportSubcommand,
    health: healthSubcommand,
    forecast: forecastSubcommand,
    customers: customersSubcommand,
  },
});

export default revopsCommand;

function formatNumber(num) {
  if (num === undefined || num === null) return "0";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function formatPercent(num) {
  if (num === undefined || num === null) return "0%";
  return `${num.toFixed(1)}%`;
}

function formatRatio(num) {
  if (num === undefined || num === null) return "0.0";
  return num.toFixed(1);
}

function formatChange(change) {
  if (change === undefined || change === null) return "±0%";
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}%`;
}
