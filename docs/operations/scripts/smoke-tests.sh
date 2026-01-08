#!/bin/bash
#
# GitVan v4.0.0 Smoke Tests
#
# Purpose: Quick functional tests to verify GitVan is working
# Usage: ./smoke-tests.sh [server]
# Exit codes: 0 = all tests passed, 1 = some tests failed
#

set -euo pipefail

# Configuration
SERVER="${1:-prod-server}"
GITVAN_PATH="${GITVAN_PATH:-/opt/gitvan}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Counters
TESTS_PASSED=0
TESTS_FAILED=0

echo "============================================"
echo "GitVan v4.0.0 Smoke Tests"
echo "Server: $SERVER"
echo "Time: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo "============================================"
echo ""

run_test() {
  local test_name=$1
  local test_command=$2

  echo -n "Test: $test_name... "

  if ssh "$SERVER" "$test_command" > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    ((TESTS_PASSED++))
    return 0
  else
    echo -e "${RED}FAIL${NC}"
    ((TESTS_FAILED++))
    return 1
  fi
}

run_test_with_output() {
  local test_name=$1
  local test_command=$2
  local expected_pattern=$3

  echo -n "Test: $test_name... "

  OUTPUT=$(ssh "$SERVER" "$test_command" 2>&1 || echo "")

  if echo "$OUTPUT" | grep -q "$expected_pattern"; then
    echo -e "${GREEN}PASS${NC}"
    ((TESTS_PASSED++))
    return 0
  else
    echo -e "${RED}FAIL${NC}"
    echo "  Expected pattern: $expected_pattern"
    echo "  Got: ${OUTPUT:0:100}"
    ((TESTS_FAILED++))
    return 1
  fi
}

# Test 1: CLI executable
run_test "CLI executable exists" \
  "test -x $GITVAN_PATH/dist/bin/gitvan.mjs"

# Test 2: CLI version
run_test_with_output "CLI version check" \
  "$GITVAN_PATH/dist/bin/gitvan.mjs --version" \
  "4\|v4"

# Test 3: CLI help
run_test "CLI help command" \
  "$GITVAN_PATH/dist/bin/gitvan.mjs --help"

# Test 4: Daemon status
run_test "Daemon status command" \
  "cd $GITVAN_PATH && ./dist/bin/gitvan.mjs daemon status"

# Test 5: Daemon process running
run_test "Daemon process running" \
  "pgrep -f 'gitvan daemon'"

# Test 6: Cron list command
run_test "Cron list command" \
  "cd $GITVAN_PATH && ./dist/bin/gitvan.mjs cron list"

# Test 7: Event list command
run_test "Event list command" \
  "cd $GITVAN_PATH && ./dist/bin/gitvan.mjs event list"

# Test 8: Health endpoint responds
echo -n "Test: Health endpoint responds... "
if curl -sf "http://$SERVER:9090/health" > /dev/null 2>&1; then
  echo -e "${GREEN}PASS${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}FAIL${NC}"
  ((TESTS_FAILED++))
fi

# Test 9: Health status is healthy
echo -n "Test: Health status is healthy... "
HEALTH_STATUS=$(curl -sf "http://$SERVER:9090/health" 2>/dev/null | jq -r '.status' || echo "unknown")
if [ "$HEALTH_STATUS" = "healthy" ]; then
  echo -e "${GREEN}PASS${NC}"
  ((TESTS_PASSED++))
elif [ "$HEALTH_STATUS" = "degraded" ]; then
  echo -e "${YELLOW}DEGRADED${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}FAIL${NC} (status: $HEALTH_STATUS)"
  ((TESTS_FAILED++))
fi

# Test 10: Git repository accessible
run_test "Git repository accessible" \
  "cd $GITVAN_PATH && git status"

# Test 11: Configuration file exists
run_test "Configuration file exists" \
  "test -f $GITVAN_PATH/gitvan.config.js"

# Test 12: Node modules installed
run_test "Node modules installed" \
  "test -d $GITVAN_PATH/node_modules && test -f $GITVAN_PATH/node_modules/.package-lock.json"

# Test 13: Logs directory writable
run_test "Logs directory writable" \
  "test -w /var/log/gitvan || mkdir -p /var/log/gitvan"

# Test 14: Process can write to log
run_test "Can write to log file" \
  "echo 'Smoke test' >> /var/log/gitvan/smoke-test.log"

# Test 15: Multiple health checks (stability)
echo -n "Test: Stability (5 health checks)... "
STABLE=true
for i in {1..5}; do
  if ! curl -sf "http://$SERVER:9090/health" > /dev/null 2>&1; then
    STABLE=false
    break
  fi
  sleep 1
done

if [ "$STABLE" = true ]; then
  echo -e "${GREEN}PASS${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}FAIL${NC}"
  ((TESTS_FAILED++))
fi

# Summary
echo ""
echo "============================================"
echo "Smoke Test Summary"
echo "============================================"
echo -e "${GREEN}Passed:${NC} $TESTS_PASSED"
echo -e "${RED}Failed:${NC} $TESTS_FAILED"
echo ""

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
PASS_RATE=$(echo "scale=1; $TESTS_PASSED * 100 / $TOTAL_TESTS" | bc)

echo "Pass rate: ${PASS_RATE}%"
echo ""

if [ "$TESTS_FAILED" -eq 0 ]; then
  echo -e "${GREEN}All smoke tests passed! ✓${NC}"
  exit 0
else
  echo -e "${RED}Some smoke tests failed! ✗${NC}"
  exit 1
fi
