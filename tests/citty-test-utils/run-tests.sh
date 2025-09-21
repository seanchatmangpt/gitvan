#!/bin/bash

# Citty Test Utils - Test Runner Scripts

echo "🧪 Citty Test Utils - Comprehensive Test Suite"
echo "=============================================="

# Create test results directory
mkdir -p test-results

# Function to run tests with proper configuration
run_tests() {
  local test_type=$1
  local config_file="vitest.citty-test-utils.config.mjs"
  
  echo ""
  echo "📋 Running $test_type tests..."
  echo "----------------------------"
  
  case $test_type in
    "unit")
      pnpm vitest run tests/citty-test-utils/unit/ --config $config_file
      ;;
    "integration")
      pnpm vitest run tests/citty-test-utils/integration/ --config $config_file
      ;;
    "bdd")
      pnpm vitest run tests/citty-test-utils/bdd/ --config $config_file
      ;;
    "performance")
      pnpm vitest run tests/citty-test-utils/performance/ --config $config_file
      ;;
    "all")
      pnpm vitest run tests/citty-test-utils/ --config $config_file
      ;;
    "coverage")
      pnpm vitest run tests/citty-test-utils/ --config $config_file --coverage
      ;;
    *)
      echo "❌ Unknown test type: $test_type"
      echo "Available types: unit, integration, bdd, performance, all, coverage"
      exit 1
      ;;
  esac
}

# Function to show test results summary
show_summary() {
  echo ""
  echo "📊 Test Results Summary"
  echo "======================"
  
  if [ -f "test-results/citty-test-utils-results.json" ]; then
    echo "✅ Test results saved to: test-results/citty-test-utils-results.json"
    
    # Extract summary from JSON results
    if command -v jq &> /dev/null; then
      echo ""
      echo "Summary:"
      jq -r '.testResults | "Tests: \(.numTotalTests), Passed: \(.numPassedTests), Failed: \(.numFailedTests), Duration: \(.numTotalTestSuites)ms"' test-results/citty-test-utils-results.json
    fi
  else
    echo "⚠️  No test results file found"
  fi
}

# Function to run specific test scenarios
run_scenarios() {
  echo ""
  echo "🎭 Running BDD Scenarios..."
  echo "---------------------------"
  
  # Run BDD scenarios with detailed output
  pnpm vitest run tests/citty-test-utils/bdd/scenarios.test.mjs --config vitest.citty-test-utils.config.mjs --reporter=verbose
}

# Function to run performance benchmarks
run_benchmarks() {
  echo ""
  echo "⚡ Running Performance Benchmarks..."
  echo "------------------------------------"
  
  # Run performance tests
  pnpm vitest run tests/citty-test-utils/performance/ --config vitest.citty-test-utils.config.mjs --reporter=verbose
}

# Function to validate test coverage
validate_coverage() {
  echo ""
  echo "📈 Validating Test Coverage..."
  echo "-----------------------------"
  
  # Run tests with coverage
  pnpm vitest run tests/citty-test-utils/ --config vitest.citty-test-utils.config.mjs --coverage
  
  # Check coverage thresholds
  if [ -f "coverage/coverage-summary.json" ]; then
    echo "✅ Coverage report generated"
    
    if command -v jq &> /dev/null; then
      echo ""
      echo "Coverage Summary:"
      jq -r '.total | "Lines: \(.lines.pct)%, Functions: \(.functions.pct)%, Branches: \(.branches.pct)%, Statements: \(.statements.pct)%"' coverage/coverage-summary.json
    fi
  else
    echo "⚠️  No coverage report found"
  fi
}

# Main script logic
case "${1:-all}" in
  "unit")
    run_tests "unit"
    ;;
  "integration")
    run_tests "integration"
    ;;
  "bdd")
    run_tests "bdd"
    ;;
  "performance")
    run_tests "performance"
    ;;
  "scenarios")
    run_scenarios
    ;;
  "benchmarks")
    run_benchmarks
    ;;
  "coverage")
    validate_coverage
    ;;
  "all")
    run_tests "all"
    ;;
  "help")
    echo "Usage: $0 [test_type]"
    echo ""
    echo "Available test types:"
    echo "  unit        - Run unit tests only"
    echo "  integration - Run integration tests only"
    echo "  bdd         - Run BDD scenario tests only"
    echo "  performance - Run performance tests only"
    echo "  scenarios   - Run BDD scenarios with detailed output"
    echo "  benchmarks  - Run performance benchmarks"
    echo "  coverage    - Run tests with coverage analysis"
    echo "  all         - Run all tests (default)"
    echo "  help        - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 unit          # Run unit tests"
    echo "  $0 coverage      # Run with coverage"
    echo "  $0 scenarios     # Run BDD scenarios"
    exit 0
    ;;
  *)
    echo "❌ Unknown command: $1"
    echo "Use '$0 help' for usage information"
    exit 1
    ;;
esac

# Show summary
show_summary

echo ""
echo "🎉 Test execution completed!"
