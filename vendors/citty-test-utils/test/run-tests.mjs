#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description) {
  log(`\n${colors.cyan}🔄 ${description}${colors.reset}`);
  try {
    const output = execSync(command, {
      cwd: process.cwd(),
      stdio: "inherit",
      encoding: "utf8",
    });
    log(`${colors.green}✅ ${description} completed${colors.reset}`);
    return true;
  } catch (error) {
    log(`${colors.red}❌ ${description} failed${colors.reset}`);
    log(`Error: ${error.message}`, "red");
    return false;
  }
}

async function main() {
  log(
    `${colors.bright}${colors.magenta}🚀 Citty Test Utils - Comprehensive Test Suite${colors.reset}`
  );
  log(
    `${colors.bright}${colors.blue}================================================${colors.reset}`
  );

  // Ensure coverage directory exists
  if (!existsSync("coverage")) {
    mkdirSync("coverage");
  }

  const results = {
    unit: false,
    integration: false,
    bdd: false,
    coverage: false,
    all: false,
  };

  // Run unit tests
  results.unit = runCommand("pnpm test:unit", "Running Unit Tests");

  // Run integration tests
  results.integration = runCommand(
    "pnpm test:integration",
    "Running Integration Tests"
  );

  // Run BDD tests
  results.bdd = runCommand("pnpm test:bdd", "Running BDD Tests");

  // Run coverage analysis
  results.coverage = runCommand(
    "pnpm test:coverage",
    "Running Coverage Analysis"
  );

  // Run all tests together
  results.all = runCommand("pnpm test:run", "Running All Tests");

  // Summary
  log(`\n${colors.bright}${colors.blue}📊 Test Results Summary${colors.reset}`);
  log(`${colors.blue}========================${colors.reset}`);

  Object.entries(results).forEach(([test, passed]) => {
    const status = passed
      ? `${colors.green}✅ PASS${colors.reset}`
      : `${colors.red}❌ FAIL${colors.reset}`;
    log(`${test.padEnd(12)}: ${status}`);
  });

  const allPassed = Object.values(results).every(Boolean);

  if (allPassed) {
    log(
      `\n${colors.bright}${colors.green}🎉 All tests passed! Citty Test Utils is ready for production.${colors.reset}`
    );
    log(`\n${colors.cyan}📋 Available Test Commands:${colors.reset}`);
    log(
      `  ${colors.yellow}pnpm test${colors.reset}           - Run all tests in watch mode`
    );
    log(
      `  ${colors.yellow}pnpm test:run${colors.reset}      - Run all tests once`
    );
    log(
      `  ${colors.yellow}pnpm test:coverage${colors.reset} - Run tests with coverage`
    );
    log(
      `  ${colors.yellow}pnpm test:unit${colors.reset}     - Run unit tests only`
    );
    log(
      `  ${colors.yellow}pnpm test:integration${colors.reset} - Run integration tests only`
    );
    log(
      `  ${colors.yellow}pnpm test:bdd${colors.reset}     - Run BDD tests only`
    );
    log(
      `  ${colors.yellow}pnpm test:watch${colors.reset}    - Run tests in watch mode`
    );
    log(
      `  ${colors.yellow}pnpm test:ui${colors.reset}       - Run tests with UI`
    );

    log(`\n${colors.cyan}📁 Test Structure:${colors.reset}`);
    log(
      `  ${colors.yellow}tests/unit/${colors.reset}        - Unit tests for individual components`
    );
    log(
      `  ${colors.yellow}tests/integration/${colors.reset} - Integration tests for component interactions`
    );
    log(
      `  ${colors.yellow}tests/bdd/${colors.reset}         - BDD tests with scenario-based testing`
    );

    log(`\n${colors.cyan}📈 Coverage Reports:${colors.reset}`);
    log(
      `  ${colors.yellow}coverage/lcov-report/index.html${colors.reset} - HTML coverage report`
    );
    log(
      `  ${colors.yellow}coverage/coverage-final.json${colors.reset} - JSON coverage data`
    );

    process.exit(0);
  } else {
    log(
      `\n${colors.bright}${colors.red}⚠️ Some tests failed. Please check the output above.${colors.reset}`
    );
    process.exit(1);
  }
}

main().catch((error) => {
  log(`\n${colors.red}💥 Test runner failed: ${error.message}${colors.reset}`);
  process.exit(1);
});
