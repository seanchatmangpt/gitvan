#!/bin/bash
#
# GitVan v4.0.0 Health Check Script
#
# Purpose: Comprehensive health check of GitVan production system
# Usage: ./health-check.sh [prod-server]
# Exit codes: 0 = healthy, 1 = degraded, 2 = unhealthy
#

set -euo pipefail

# Configuration
SERVER="${1:-prod-server}"
HEALTH_PORT="${HEALTH_PORT:-9090}"
TIMEOUT="${TIMEOUT:-10}"

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

echo "============================================"
echo "GitVan v4.0.0 Health Check"
echo "Server: $SERVER"
echo "Time: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo "============================================"
echo ""

# Function to print status
print_status() {
  local status=$1
  local message=$2

  case $status in
    "PASS")
      echo -e "${GREEN}✓${NC} $message"
      ((CHECKS_PASSED++))
      ;;
    "WARN")
      echo -e "${YELLOW}⚠${NC} $message"
      ((CHECKS_WARNING++))
      ;;
    "FAIL")
      echo -e "${RED}✗${NC} $message"
      ((CHECKS_FAILED++))
      ;;
  esac
}

# Check 1: Health endpoint reachable
echo "=== Network Connectivity ==="
if curl -sf --connect-timeout "$TIMEOUT" "http://$SERVER:$HEALTH_PORT/health" > /dev/null 2>&1; then
  print_status "PASS" "Health endpoint reachable"
else
  print_status "FAIL" "Health endpoint NOT reachable"
fi
echo ""

# Check 2: Overall health status
echo "=== Overall Health ==="
HEALTH_JSON=$(curl -sf --connect-timeout "$TIMEOUT" "http://$SERVER:$HEALTH_PORT/health" 2>/dev/null || echo '{}')

if [ -n "$HEALTH_JSON" ] && [ "$HEALTH_JSON" != "{}" ]; then
  STATUS=$(echo "$HEALTH_JSON" | jq -r '.status // "unknown"')

  case $STATUS in
    "healthy")
      print_status "PASS" "Overall status: healthy"
      ;;
    "degraded")
      print_status "WARN" "Overall status: degraded"
      ;;
    "unhealthy"|*)
      print_status "FAIL" "Overall status: $STATUS"
      ;;
  esac

  # Show uptime
  UPTIME=$(echo "$HEALTH_JSON" | jq -r '.uptime // 0')
  UPTIME_MIN=$(echo "scale=2; $UPTIME / 1000 / 60" | bc 2>/dev/null || echo "0")
  echo "  Uptime: ${UPTIME_MIN} minutes"
else
  print_status "FAIL" "Could not retrieve health status"
fi
echo ""

# Check 3: Component health
echo "=== Component Health ==="

if [ -n "$HEALTH_JSON" ] && [ "$HEALTH_JSON" != "{}" ]; then
  # Git component
  GIT_STATUS=$(echo "$HEALTH_JSON" | jq -r '.checks.git.status // "unknown"')
  case $GIT_STATUS in
    "healthy") print_status "PASS" "Git: healthy" ;;
    "degraded") print_status "WARN" "Git: degraded" ;;
    *) print_status "FAIL" "Git: $GIT_STATUS" ;;
  esac

  # Cron component
  CRON_STATUS=$(echo "$HEALTH_JSON" | jq -r '.checks.cron.status // "unknown"')
  case $CRON_STATUS in
    "healthy") print_status "PASS" "Cron: healthy" ;;
    "degraded") print_status "WARN" "Cron: degraded" ;;
    *) print_status "FAIL" "Cron: $CRON_STATUS" ;;
  esac

  # Events component
  EVENTS_STATUS=$(echo "$HEALTH_JSON" | jq -r '.checks.events.status // "unknown"')
  case $EVENTS_STATUS in
    "healthy") print_status "PASS" "Events: healthy" ;;
    "degraded") print_status "WARN" "Events: degraded" ;;
    *) print_status "FAIL" "Events: $EVENTS_STATUS" ;;
  esac

  # Errors
  ERROR_COUNT=$(echo "$HEALTH_JSON" | jq -r '.checks.errors.errorCount // 0')
  if [ "$ERROR_COUNT" -lt 5 ]; then
    print_status "PASS" "Error count: $ERROR_COUNT (acceptable)"
  elif [ "$ERROR_COUNT" -lt 10 ]; then
    print_status "WARN" "Error count: $ERROR_COUNT (elevated)"
  else
    print_status "FAIL" "Error count: $ERROR_COUNT (critical)"
  fi
else
  print_status "FAIL" "Could not check components"
fi
echo ""

# Check 4: Service processes
echo "=== Service Processes ==="
if ssh -o ConnectTimeout=5 "$SERVER" "pgrep -f 'gitvan daemon' > /dev/null 2>&1"; then
  DAEMON_PID=$(ssh "$SERVER" "pgrep -f 'gitvan daemon'")
  print_status "PASS" "Daemon running (PID: $DAEMON_PID)"
else
  print_status "FAIL" "Daemon NOT running"
fi

if ssh -o ConnectTimeout=5 "$SERVER" "lsof -i:$HEALTH_PORT > /dev/null 2>&1"; then
  print_status "PASS" "Health server listening on port $HEALTH_PORT"
else
  print_status "FAIL" "Health server NOT listening"
fi
echo ""

# Check 5: System resources
echo "=== System Resources ==="

# CPU
CPU_USAGE=$(ssh "$SERVER" "top -bn1 | grep 'Cpu(s)' | awk '{print \$2}' | cut -d'%' -f1" 2>/dev/null || echo "0")
CPU_USAGE_INT=$(printf "%.0f" "$CPU_USAGE" 2>/dev/null || echo "0")
if [ "$CPU_USAGE_INT" -lt 50 ]; then
  print_status "PASS" "CPU usage: ${CPU_USAGE}% (good)"
elif [ "$CPU_USAGE_INT" -lt 80 ]; then
  print_status "WARN" "CPU usage: ${CPU_USAGE}% (elevated)"
else
  print_status "FAIL" "CPU usage: ${CPU_USAGE}% (critical)"
fi

# Memory
MEM_USAGE=$(ssh "$SERVER" "free -m | awk 'NR==2{printf \"%.1f\", \$3*100/\$2}'" 2>/dev/null || echo "0")
MEM_USAGE_INT=$(printf "%.0f" "$MEM_USAGE" 2>/dev/null || echo "0")
if [ "$MEM_USAGE_INT" -lt 60 ]; then
  print_status "PASS" "Memory usage: ${MEM_USAGE}% (good)"
elif [ "$MEM_USAGE_INT" -lt 80 ]; then
  print_status "WARN" "Memory usage: ${MEM_USAGE}% (elevated)"
else
  print_status "FAIL" "Memory usage: ${MEM_USAGE}% (critical)"
fi

# Disk
DISK_USAGE=$(ssh "$SERVER" "df -h / | awk 'NR==2{print \$5}' | tr -d '%'" 2>/dev/null || echo "0")
if [ "$DISK_USAGE" -lt 70 ]; then
  print_status "PASS" "Disk usage: ${DISK_USAGE}% (good)"
elif [ "$DISK_USAGE" -lt 90 ]; then
  print_status "WARN" "Disk usage: ${DISK_USAGE}% (elevated)"
else
  print_status "FAIL" "Disk usage: ${DISK_USAGE}% (critical)"
fi

# Load average
LOAD_AVG=$(ssh "$SERVER" "uptime | awk -F'load average:' '{print \$2}' | awk -F',' '{print \$1}' | tr -d ' '" 2>/dev/null || echo "0")
LOAD_AVG_INT=$(printf "%.0f" "$LOAD_AVG" 2>/dev/null || echo "0")
if [ "$LOAD_AVG_INT" -lt 2 ]; then
  print_status "PASS" "Load average: $LOAD_AVG (good)"
elif [ "$LOAD_AVG_INT" -lt 4 ]; then
  print_status "WARN" "Load average: $LOAD_AVG (elevated)"
else
  print_status "FAIL" "Load average: $LOAD_AVG (critical)"
fi
echo ""

# Check 6: Response time
echo "=== Performance ==="
RESPONSE_TIME=$(curl -sf --connect-timeout "$TIMEOUT" -w "%{time_total}" -o /dev/null "http://$SERVER:$HEALTH_PORT/health" 2>/dev/null || echo "999")
RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc 2>/dev/null || echo "999")
RESPONSE_MS_INT=$(printf "%.0f" "$RESPONSE_MS")

if [ "$RESPONSE_MS_INT" -lt 100 ]; then
  print_status "PASS" "Response time: ${RESPONSE_MS_INT}ms (excellent)"
elif [ "$RESPONSE_MS_INT" -lt 300 ]; then
  print_status "WARN" "Response time: ${RESPONSE_MS_INT}ms (acceptable)"
else
  print_status "FAIL" "Response time: ${RESPONSE_MS_INT}ms (slow)"
fi
echo ""

# Summary
echo "============================================"
echo "Summary"
echo "============================================"
echo -e "${GREEN}Passed:${NC}  $CHECKS_PASSED"
echo -e "${YELLOW}Warnings:${NC} $CHECKS_WARNING"
echo -e "${RED}Failed:${NC}  $CHECKS_FAILED"
echo ""

# Overall result
TOTAL_CHECKS=$((CHECKS_PASSED + CHECKS_WARNING + CHECKS_FAILED))
if [ "$CHECKS_FAILED" -eq 0 ] && [ "$CHECKS_WARNING" -eq 0 ]; then
  echo -e "${GREEN}Overall Status: HEALTHY ✓${NC}"
  exit 0
elif [ "$CHECKS_FAILED" -eq 0 ]; then
  echo -e "${YELLOW}Overall Status: DEGRADED ⚠${NC}"
  exit 1
else
  echo -e "${RED}Overall Status: UNHEALTHY ✗${NC}"
  exit 2
fi
