# Monitoring Runbook - GitVan v4.0.0

## Objective
Provide comprehensive monitoring procedures to detect, diagnose, and respond to issues with GitVan v4.0.0 in production.

## Scope
This runbook covers monitoring setup, alert interpretation, dashboard usage, and metric analysis for GitVan production operations.

---

## Monitoring Architecture

### Components
1. **Health Check Server** (Port 9090)
   - Liveness probe: `/health/live`
   - Readiness probe: `/health/ready`
   - Overall health: `/health`

2. **Performance Monitoring**
   - Built-in performance hooks
   - Execution tracing
   - Resource utilization

3. **Log Aggregation**
   - Application logs: `/var/log/gitvan/application.log`
   - System logs: `journalctl -u gitvan`
   - Error logs: `/var/log/gitvan/error.log`

4. **External Monitoring** (if configured)
   - Prometheus metrics
   - Grafana dashboards
   - PagerDuty alerts

---

## Key Metrics to Monitor

### System Health Metrics

| Metric | Endpoint | Healthy Value | Warning Threshold | Critical Threshold |
|--------|----------|---------------|-------------------|-------------------|
| Overall Health | `/health` | "healthy" | "degraded" | "unhealthy" |
| Git Status | `/health` → `.checks.git.status` | "healthy" | "degraded" | "unhealthy" |
| Cron Status | `/health` → `.checks.cron.status` | "healthy" | "degraded" | "unhealthy" |
| Events Status | `/health` → `.checks.events.status` | "healthy" | "degraded" | "unhealthy" |
| Error Count | `/health` → `.checks.errors.errorCount` | 0-5 | 5-10 | > 10 |
| Uptime | `/health` → `.uptime` | > 60000ms | > 10000ms | < 10000ms |

### Performance Metrics

| Metric | Source | Good | Acceptable | Poor |
|--------|--------|------|-----------|------|
| Response Time | Health endpoint | < 50ms | 50-100ms | > 100ms |
| P95 Latency | Performance hooks | < 100ms | 100-300ms | > 300ms |
| P99 Latency | Performance hooks | < 300ms | 300-500ms | > 500ms |
| Error Rate | Logs | < 0.1% | 0.1-1% | > 1% |

### Resource Metrics

| Metric | Command | Good | Warning | Critical |
|--------|---------|------|---------|----------|
| CPU Usage | `top` | < 50% | 50-80% | > 80% |
| Memory Usage | `free -m` | < 60% | 60-80% | > 80% |
| Disk Usage | `df -h` | < 70% | 70-90% | > 90% |
| Load Average | `uptime` | < 2.0 | 2.0-4.0 | > 4.0 |

---

## Monitoring Procedures

### Procedure 1: Manual Health Check
```bash
#!/bin/bash
# Run this script for on-demand health check

echo "=== GitVan Health Check at $(date -u) ==="

# Overall health
echo ""
echo "Overall Health:"
curl -sf http://prod-server:9090/health | jq '{
  status,
  uptime,
  timestamp
}'

# Component health
echo ""
echo "Component Health:"
curl -sf http://prod-server:9090/health | jq -r '
  .checks | to_entries[] | "\(.key): \(.value.status)"
'

# Error details
echo ""
echo "Error Details:"
curl -sf http://prod-server:9090/health | jq '.checks.errors'

# Exit with status code
STATUS=$(curl -sf http://prod-server:9090/health | jq -r '.status')
if [ "$STATUS" = "healthy" ]; then
  echo ""
  echo "✓ System is HEALTHY"
  exit 0
elif [ "$STATUS" = "degraded" ]; then
  echo ""
  echo "⚠ System is DEGRADED"
  exit 1
else
  echo ""
  echo "✗ System is UNHEALTHY"
  exit 2
fi
```

### Procedure 2: Continuous Monitoring
```bash
#!/bin/bash
# Run this in background for continuous monitoring

INTERVAL=60  # Check every 60 seconds
LOG_FILE="/var/log/gitvan/monitor.log"

while true; do
  TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

  # Get health
  HEALTH=$(curl -sf http://prod-server:9090/health 2>/dev/null)

  if [ $? -ne 0 ]; then
    echo "$TIMESTAMP,ERROR,Health endpoint unreachable" >> "$LOG_FILE"
    # Send alert
    curl -X POST -H 'Content-type: application/json' \
      --data '{"text":"🚨 GitVan health endpoint unreachable!"}' \
      $SLACK_WEBHOOK_URL
    sleep "$INTERVAL"
    continue
  fi

  STATUS=$(echo "$HEALTH" | jq -r '.status')
  UPTIME=$(echo "$HEALTH" | jq -r '.uptime')
  ERROR_COUNT=$(echo "$HEALTH" | jq -r '.checks.errors.errorCount')

  # Log status
  echo "$TIMESTAMP,$STATUS,$UPTIME,$ERROR_COUNT" >> "$LOG_FILE"

  # Check for issues
  if [ "$STATUS" != "healthy" ]; then
    echo "$TIMESTAMP,ALERT,Status is $STATUS" >> "$LOG_FILE"
    # Send alert
    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"⚠️ GitVan status: $STATUS\"}" \
      $SLACK_WEBHOOK_URL
  fi

  if [ "$ERROR_COUNT" -gt 10 ]; then
    echo "$TIMESTAMP,ALERT,High error count: $ERROR_COUNT" >> "$LOG_FILE"
    # Send alert
    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"⚠️ GitVan high errors: $ERROR_COUNT\"}" \
      $SLACK_WEBHOOK_URL
  fi

  sleep "$INTERVAL"
done
```

### Procedure 3: Performance Monitoring
```bash
#!/bin/bash
# Monitor performance metrics

ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash

echo "=== Performance Metrics ==="

# Get performance report if available
cd /opt/gitvan
node -e "
import { createPerformanceContext } from './src/performance/monitoring.mjs';
const ctx = createPerformanceContext();
console.log(JSON.stringify(ctx.monitor.getReport(), null, 2));
" 2>/dev/null || echo "Performance monitoring not available"

# System performance
echo ""
echo "System Performance:"
echo "CPU: $(top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1)%"
echo "Memory: $(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2}')"
echo "Disk I/O: $(iostat -x 1 2 | tail -1 | awk '{print $14}')"
REMOTE_SCRIPT
```

### Procedure 4: Log Analysis
```bash
#!/bin/bash
# Analyze logs for patterns

ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash

echo "=== Log Analysis ==="

# Recent errors (last hour)
echo "Errors in last hour:"
find /var/log/gitvan -name "*.log" -mmin -60 -exec grep -i "error" {} \; | \
  awk -F: '{print $NF}' | sort | uniq -c | sort -rn | head -10

# Recent warnings (last hour)
echo ""
echo "Warnings in last hour:"
find /var/log/gitvan -name "*.log" -mmin -60 -exec grep -i "warn" {} \; | \
  awk -F: '{print $NF}' | sort | uniq -c | sort -rn | head -10

# Critical issues (last 24 hours)
echo ""
echo "Critical issues (24h):"
find /var/log/gitvan -name "*.log" -mtime -1 -exec grep -i "critical\|fatal\|panic" {} \; | wc -l

# Top log messages by frequency
echo ""
echo "Top log messages:"
cat /var/log/gitvan/*.log | awk '{print $5,$6,$7,$8}' | sort | uniq -c | sort -rn | head -10
REMOTE_SCRIPT
```

---

## Alert Interpretation Guide

### Alert: Health Check Failed
**Severity:** Critical (P1)

**Symptoms:**
- Health endpoint returns 503
- Status is "unhealthy"
- Health endpoint unreachable

**Possible Causes:**
- Services crashed
- Out of resources (memory, disk)
- Network issues
- Configuration error

**Response:**
1. Check if services are running: `pgrep -af gitvan`
2. Check health endpoint: `curl http://localhost:9090/health`
3. Check logs: `tail -100 /var/log/gitvan/application.log`
4. Check resources: `free -m && df -h`
5. Restart services if needed
6. If restart fails, consider rollback

**Escalation:** If issue persists > 5 minutes, escalate to P1 incident.

### Alert: High Error Rate
**Severity:** High (P2)

**Symptoms:**
- Error count > 10
- Multiple errors in logs
- Failed operations

**Possible Causes:**
- Bug in code
- Invalid configuration
- External dependency failure
- Resource exhaustion

**Response:**
1. Check error details: `curl http://localhost:9090/health | jq '.checks.errors'`
2. Review recent errors: `grep -i error /var/log/gitvan/*.log | tail -50`
3. Identify error pattern (same error repeated?)
4. Check if new deployment related
5. Apply fix or rollback if severe

**Escalation:** If error rate > 20 or affecting users, escalate to P1.

### Alert: Degraded Performance
**Severity:** Medium (P3)

**Symptoms:**
- Response time > 300ms
- High CPU usage
- High memory usage
- Slow operations

**Possible Causes:**
- Resource contention
- Memory leak
- Inefficient operation
- External dependency slow

**Response:**
1. Check system resources: `top`, `free -m`, `iostat`
2. Identify resource-intensive process: `ps aux --sort=-%mem | head`
3. Check for memory leaks: Monitor memory over time
4. Review performance metrics
5. Consider scaling resources or optimization

**Escalation:** If performance degrades > 50%, escalate to P2.

### Alert: Cron Scheduler Down
**Severity:** High (P2)

**Symptoms:**
- Cron status is "degraded" or "unhealthy"
- Scheduled jobs not running
- Cron process not found

**Possible Causes:**
- Process crashed
- Configuration error
- Job definition error
- Resource limitation

**Response:**
1. Check cron process: `pgrep -af "gitvan cron"`
2. Check cron status: `gitvan cron list`
3. Review cron logs: `grep cron /var/log/gitvan/*.log`
4. Restart cron: `gitvan daemon restart`
5. Verify jobs scheduled: `gitvan cron dry-run`

**Escalation:** If cron doesn't restart, escalate to P1.

### Alert: Git Operations Failing
**Severity:** Medium (P3)

**Symptoms:**
- Git status is "degraded" or "unhealthy"
- Git operations timeout or fail
- Repository access issues

**Possible Causes:**
- Repository corruption
- Disk full
- Permission issues
- Lock contention

**Response:**
1. Check git status: `curl http://localhost:9090/health | jq '.checks.git'`
2. Verify repository: `cd /opt/gitvan && git status`
3. Check disk space: `df -h`
4. Check permissions: `ls -la .git`
5. Run git fsck: `git fsck --full`

**Escalation:** If git operations completely fail, escalate to P2.

---

## Dashboard Setup

### Health Dashboard
Create real-time health dashboard using the health endpoint:

```html
<!DOCTYPE html>
<html>
<head>
  <title>GitVan Health Dashboard</title>
  <style>
    .healthy { background: #4CAF50; color: white; }
    .degraded { background: #FF9800; color: white; }
    .unhealthy { background: #F44336; color: white; }
    .metric { padding: 20px; margin: 10px; border-radius: 5px; }
  </style>
</head>
<body>
  <h1>GitVan v4.0.0 Health Dashboard</h1>
  <div id="dashboard">Loading...</div>

  <script>
    async function updateDashboard() {
      try {
        const response = await fetch('http://prod-server:9090/health');
        const health = await response.json();

        const statusClass = health.status === 'healthy' ? 'healthy' :
                           health.status === 'degraded' ? 'degraded' : 'unhealthy';

        document.getElementById('dashboard').innerHTML = `
          <div class="metric ${statusClass}">
            <h2>Overall Status: ${health.status.toUpperCase()}</h2>
            <p>Uptime: ${Math.floor(health.uptime / 1000 / 60)} minutes</p>
            <p>Timestamp: ${health.timestamp}</p>
          </div>
          ${Object.entries(health.checks).map(([name, check]) => `
            <div class="metric ${check.status}">
              <h3>${name}: ${check.status.toUpperCase()}</h3>
              <p>${check.message || ''}</p>
              ${check.errorCount !== undefined ? `<p>Errors: ${check.errorCount}</p>` : ''}
            </div>
          `).join('')}
        `;
      } catch (error) {
        document.getElementById('dashboard').innerHTML = `
          <div class="metric unhealthy">
            <h2>ERROR: Cannot reach health endpoint</h2>
            <p>${error.message}</p>
          </div>
        `;
      }
    }

    // Update every 10 seconds
    updateDashboard();
    setInterval(updateDashboard, 10000);
  </script>
</body>
</html>
```

---

## Metric Collection Scripts

### Script: Collect Daily Metrics
```bash
#!/bin/bash
# Save to: /usr/local/bin/gitvan-collect-metrics.sh

OUTPUT_DIR="/var/lib/gitvan/metrics"
DATE=$(date +%Y%m%d)
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

mkdir -p "$OUTPUT_DIR"

# Collect health metrics
curl -sf http://localhost:9090/health > "$OUTPUT_DIR/health-$DATE.json"

# Collect system metrics
cat > "$OUTPUT_DIR/system-$DATE.json" << EOF
{
  "timestamp": "$TIMESTAMP",
  "cpu": $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1),
  "memory_percent": $(free -m | awk 'NR==2{printf "%.1f", $3*100/$2}'),
  "disk_percent": $(df -h / | awk 'NR==2{print $5}' | tr -d '%'),
  "load_average": $(uptime | awk -F'load average:' '{print $2}' | awk -F',' '{print $1}' | tr -d ' ')
}
EOF

# Collect application metrics
ssh prod-server "cd /opt/gitvan && ./dist/bin/gitvan.mjs cron list" > "$OUTPUT_DIR/cron-$DATE.txt" 2>&1

echo "Metrics collected: $OUTPUT_DIR/*-$DATE.*"
```

### Script: Generate Weekly Report
```bash
#!/bin/bash
# Save to: /usr/local/bin/gitvan-weekly-report.sh

REPORT_FILE="/var/lib/gitvan/reports/weekly-report-$(date +%Y%m%d).txt"
mkdir -p "$(dirname "$REPORT_FILE")"

cat > "$REPORT_FILE" << EOF
=== GitVan Weekly Report ===
Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

== Availability ==
$(grep -h "healthy" /var/lib/gitvan/metrics/health-*.json | wc -l) healthy checks
$(grep -h "degraded" /var/lib/gitvan/metrics/health-*.json | wc -l) degraded checks
$(grep -h "unhealthy" /var/lib/gitvan/metrics/health-*.json | wc -l) unhealthy checks

== Errors ==
Total errors this week: $(grep -h "errorCount" /var/lib/gitvan/metrics/health-*.json | \
  jq -r '.checks.errors.errorCount' | awk '{sum+=$1} END {print sum}')

== Performance ==
Average uptime: $(grep -h "uptime" /var/lib/gitvan/metrics/health-*.json | \
  jq -r '.uptime' | awk '{sum+=$1; count++} END {print sum/count/1000/60 " minutes"}')

== System Resources ==
Average CPU: $(jq -r '.cpu' /var/lib/gitvan/metrics/system-*.json | \
  awk '{sum+=$1; count++} END {print sum/count "%"}')
Average Memory: $(jq -r '.memory_percent' /var/lib/gitvan/metrics/system-*.json | \
  awk '{sum+=$1; count++} END {print sum/count "%"}')

== Recommendations ==
[Manual review and add recommendations]

EOF

echo "Weekly report generated: $REPORT_FILE"
cat "$REPORT_FILE"
```

---

## Automated Monitoring Setup

### Cron Jobs for Monitoring
Add these to crontab:
```cron
# Monitor health every 5 minutes
*/5 * * * * /usr/local/bin/gitvan-health-check.sh >> /var/log/gitvan/health-monitor.log 2>&1

# Collect metrics daily at midnight
0 0 * * * /usr/local/bin/gitvan-collect-metrics.sh

# Generate weekly report on Sundays
0 1 * * 0 /usr/local/bin/gitvan-weekly-report.sh

# Cleanup old logs weekly
0 2 * * 0 find /var/log/gitvan -name "*.log" -mtime +30 -delete
```

---

## Troubleshooting Monitoring Issues

### Issue: Health Endpoint Not Responding
1. Check if health server is running: `lsof -i:9090`
2. Check if port is blocked: `telnet prod-server 9090`
3. Check logs: `tail -100 /var/log/gitvan/health-check.log`
4. Restart health server
5. Verify firewall rules

### Issue: Metrics Not Being Collected
1. Check cron jobs: `crontab -l`
2. Check script permissions: `ls -l /usr/local/bin/gitvan-*.sh`
3. Check disk space: `df -h`
4. Check log files for errors
5. Run scripts manually to test

### Issue: False Positive Alerts
1. Review alert thresholds
2. Check for intermittent issues
3. Adjust sensitivity
4. Add confirmation checks (multiple failures before alert)
5. Improve monitoring granularity

---

## Contacts

### Monitoring Team
- **Monitoring Lead**: [Name] - [Phone] - [Email]
- **On-Call Engineer**: [Name] - [Phone] - [Email]

### Escalation
- **Operations Manager**: [Name] - [Phone] - [Email]

---

## References

- [Health Check Implementation](/home/user/gitvan/src/core/health-check.mjs)
- [Performance Monitoring](/home/user/gitvan/src/performance/monitoring.mjs)
- [07-INCIDENT-RESPONSE-RUNBOOK.md](./07-INCIDENT-RESPONSE-RUNBOOK.md)

---

**Document Version**: 1.0
**Last Updated**: 2026-01-08
**Owner**: Operations Team
