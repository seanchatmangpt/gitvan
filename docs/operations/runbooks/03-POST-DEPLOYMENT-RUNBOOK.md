# Post-Deployment Runbook - GitVan v4.0.0

## Objective
Monitor, validate, and stabilize GitVan v4.0.0 in production during the critical first 24 hours after deployment.

## Scope
This runbook covers immediate post-deployment activities (T+0 to T+24 hours) including monitoring, validation, issue resolution, and communication.

## Timeline
- **T+0 to T+1 hour**: Critical monitoring period
- **T+1 to T+4 hours**: Active monitoring period
- **T+4 to T+24 hours**: Standard monitoring period
- **T+24 hours**: Post-deployment review

---

## Prerequisites

- [ ] Deployment completed successfully ([02-DEPLOYMENT-RUNBOOK.md](./02-DEPLOYMENT-RUNBOOK.md))
- [ ] All health checks passing
- [ ] Monitoring dashboards accessible
- [ ] Team available for immediate response

---

## T+0 to T+1 Hour: Critical Monitoring Period

### Step 1: Immediate Health Validation (First 5 Minutes)

#### 1.1 Verify All Health Endpoints
```bash
# Run every minute for first 5 minutes
for i in {1..5}; do
  echo "=== Health Check $i/5 at $(date -u +%H:%M:%S) ==="

  # Overall health
  curl -sf http://prod-server:9090/health | jq -r '.status'

  # Check each component
  curl -sf http://prod-server:9090/health | jq -r '.checks | to_entries[] | "\(.key): \(.value.status)"'

  sleep 60
done
```

**Expected:** All checks return "healthy" for all 5 iterations.

**Action if failed:**
- If 1-2 checks fail: Investigate specific component
- If 3+ checks fail: Consider rollback
- If all checks fail: Immediate rollback

#### 1.2 Monitor Error Rates
```bash
# Check error count every minute
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
for i in {1..5}; do
  echo "=== Error Check $i/5 at $(date -u +%H:%M:%S) ==="
  curl -s http://localhost:9090/health | jq -r '.checks.errors.errorCount'
  sleep 60
done
REMOTE_SCRIPT
```

**Expected:** Error count remains < 5.

**Action if exceeded:**
- Error count 5-10: Warning, investigate logs
- Error count > 10: Critical, consider rollback

#### 1.3 Monitor Service Stability
```bash
# Verify services don't crash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
for i in {1..5}; do
  echo "=== Service Check $i/5 at $(date -u +%H:%M:%S) ==="

  # Check daemon running
  if pgrep -f "gitvan daemon" > /dev/null; then
    echo "✓ Daemon running (PID: $(pgrep -f 'gitvan daemon'))"
  else
    echo "✗ Daemon NOT running - CRITICAL"
    exit 1
  fi

  # Check health server running
  if lsof -i:9090 > /dev/null 2>&1; then
    echo "✓ Health server running"
  else
    echo "✗ Health server NOT running - CRITICAL"
    exit 1
  fi

  sleep 60
done
REMOTE_SCRIPT
```

**Expected:** All services remain running for all 5 checks.

**Action if failed:** Immediate investigation, likely rollback needed.

### Step 2: Log Monitoring (First 10 Minutes)

#### 2.1 Check Application Logs
```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash
echo "=== Application Logs (last 50 lines) ==="
tail -50 /var/log/gitvan/application.log

echo ""
echo "=== Errors in Logs ==="
grep -i "error\|exception\|fatal" /var/log/gitvan/application.log | tail -20 || echo "No errors found"

echo ""
echo "=== Critical Issues ==="
grep -i "critical\|panic\|crash" /var/log/gitvan/application.log | tail -10 || echo "No critical issues found"
REMOTE_SCRIPT
```

**Expected:** No critical errors, minimal warnings.

**Action if errors found:**
- 1-5 errors: Document and monitor
- 5-10 errors: Investigate root cause immediately
- 10+ errors: Consider rollback

#### 2.2 Check System Logs
```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash
echo "=== System Logs (GitVan related) ==="
journalctl -u gitvan -n 50 --no-pager || echo "No systemd service"

echo ""
echo "=== Resource Issues ==="
dmesg | grep -i "out of memory\|oom\|killed" | tail -10 || echo "No resource issues"
REMOTE_SCRIPT
```

### Step 3: Performance Validation (First 15 Minutes)

#### 3.1 Measure Key Performance Indicators
```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash
echo "=== Performance Metrics ==="

# Get health metrics
HEALTH=$(curl -s http://localhost:9090/health)
echo "$HEALTH" | jq '{
  status: .status,
  uptime: .uptime,
  error_count: .checks.errors.errorCount,
  git_status: .checks.git.status,
  cron_status: .checks.cron.status,
  events_status: .checks.events.status
}'

# System resources
echo ""
echo "=== System Resources ==="
echo "CPU:"
top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}'

echo "Memory:"
free -m | awk 'NR==2{printf "Used: %sMB (%.2f%%)\n", $3,$3*100/$2 }'

echo "Disk:"
df -h / | awk 'NR==2{printf "Used: %s (%s)\n", $3,$5}'
REMOTE_SCRIPT
```

**Expected:**
- Health status: "healthy"
- CPU usage: < 50%
- Memory usage: < 80%
- Disk usage: < 80%

#### 3.2 Response Time Check
```bash
# Measure health endpoint response time
for i in {1..10}; do
  curl -w "Response time: %{time_total}s\n" -o /dev/null -s http://prod-server:9090/health
done | awk '{sum+=$3; count++} END {print "Average response time:", sum/count "s"}'
```

**Expected:** Average response time < 0.1s (100ms)

### Step 4: Functional Validation (First 20 Minutes)

#### 4.1 Run Production Smoke Tests
```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

cd /opt/gitvan
source /etc/gitvan/env.sh

echo "=== Production Smoke Tests ==="

# Test 1: CLI version
echo "Test 1: CLI version..."
VERSION=$(./dist/bin/gitvan.mjs --version)
echo "Version: $VERSION"
if ! echo "$VERSION" | grep -q "4.0.0\|v4"; then
  echo "ERROR: Wrong version"
  exit 1
fi
echo "✓ Test 1 passed"

# Test 2: Job listing
echo "Test 2: Job listing..."
./dist/bin/gitvan.mjs cron list > /dev/null
echo "✓ Test 2 passed"

# Test 3: Daemon status
echo "Test 3: Daemon status..."
./dist/bin/gitvan.mjs daemon status > /dev/null
echo "✓ Test 3 passed"

# Test 4: Health endpoint
echo "Test 4: Health endpoint..."
curl -sf http://localhost:9090/health > /dev/null
echo "✓ Test 4 passed"

echo "✓ All smoke tests passed"
REMOTE_SCRIPT
```

**Expected:** All tests pass.

**Action if failed:** Investigate specific failure, may need rollback.

#### 4.2 Verify Cron Jobs Scheduling
```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash
cd /opt/gitvan
source /etc/gitvan/env.sh

echo "=== Cron Jobs Scheduling ==="
./dist/bin/gitvan.mjs cron list

echo ""
echo "=== Next Scheduled Runs ==="
./dist/bin/gitvan.mjs cron dry-run
REMOTE_SCRIPT
```

**Verification:** Cron jobs are scheduled and will run at expected times.

### Step 5: Send T+1 Hour Status Update

```bash
# Calculate metrics
UPTIME_MINUTES=$(($(date +%s) - DEPLOYMENT_START) / 60)

# Send update
curl -X POST -H 'Content-type: application/json' \
  --data "{
    \"text\":\"📊 GitVan v4.0.0 - T+1 Hour Status\",
    \"attachments\":[{
      \"color\":\"good\",
      \"fields\":[
        {\"title\":\"Uptime\",\"value\":\"${UPTIME_MINUTES} minutes\",\"short\":true},
        {\"title\":\"Health\",\"value\":\"All systems healthy\",\"short\":true},
        {\"title\":\"Errors\",\"value\":\"[Error count from health check]\",\"short\":true},
        {\"title\":\"Performance\",\"value\":\"Within baseline\",\"short\":true}
      ],
      \"text\":\"Critical monitoring period complete. Transitioning to active monitoring.\"
    }]
  }" \
  $SLACK_WEBHOOK_URL
```

---

## T+1 to T+4 Hours: Active Monitoring Period

### Step 6: Periodic Health Checks (Every 15 Minutes)

Create monitoring script:
```bash
cat > /tmp/monitor-gitvan.sh << 'MONITOR_SCRIPT'
#!/bin/bash

while true; do
  echo "=== Health Check at $(date -u +"%Y-%m-%d %H:%M:%S UTC") ==="

  # Health status
  HEALTH=$(curl -sf http://prod-server:9090/health)
  STATUS=$(echo "$HEALTH" | jq -r '.status')
  ERROR_COUNT=$(echo "$HEALTH" | jq -r '.checks.errors.errorCount')

  echo "Status: $STATUS"
  echo "Errors: $ERROR_COUNT"

  # Alert if issues
  if [ "$STATUS" != "healthy" ]; then
    echo "ALERT: System not healthy!"
    # Send alert
    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"⚠️ GitVan health check failed: $STATUS\"}" \
      $SLACK_WEBHOOK_URL
  fi

  if [ "$ERROR_COUNT" -gt 10 ]; then
    echo "ALERT: High error rate: $ERROR_COUNT"
    # Send alert
    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"⚠️ GitVan high error rate: $ERROR_COUNT errors\"}" \
      $SLACK_WEBHOOK_URL
  fi

  sleep 900  # 15 minutes
done
MONITOR_SCRIPT

chmod +x /tmp/monitor-gitvan.sh

# Run in background
nohup /tmp/monitor-gitvan.sh > /tmp/monitor-gitvan.log 2>&1 &
echo "Monitoring started (PID: $!)"
```

### Step 7: User Validation (T+2 Hours)

#### 7.1 Collect User Feedback
```bash
# If you have users, check for feedback
cat > user-validation.md << 'EOF'
# GitVan v4.0.0 User Validation

## Validation Questions:
1. Can you access GitVan CLI?
2. Are your jobs running as expected?
3. Any errors or unexpected behavior?
4. Performance acceptable?

## Feedback Collection:
- Slack: #gitvan-feedback
- Email: gitvan-feedback@company.com
- Survey: https://survey.company.com/gitvan-v4

## Status:
- [  ] No major issues reported
- [  ] Minor issues documented
- [  ] Critical issues escalated
EOF

echo "User validation checklist created: user-validation.md"
```

#### 7.2 Monitor Support Tickets
```bash
# Check for new support tickets
cat > check-support.sh << 'EOF'
#!/bin/bash
# Query your support system API
# curl -H "Authorization: Bearer $TOKEN" https://support.company.com/api/tickets?product=gitvan&created_after=2h

echo "=== Support Tickets (last 2 hours) ==="
echo "Tickets: [Count]"
echo "Critical: [Count]"
echo "High: [Count]"
EOF

chmod +x check-support.sh
```

### Step 8: Performance Trending (T+3 Hours)

```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash
echo "=== Performance Trending (3 hours) ==="

# Collect performance data
for i in {1..12}; do  # Every 15 minutes for 3 hours
  TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S")
  HEALTH=$(curl -s http://localhost:9090/health)

  STATUS=$(echo "$HEALTH" | jq -r '.status')
  UPTIME=$(echo "$HEALTH" | jq -r '.uptime')
  ERRORS=$(echo "$HEALTH" | jq -r '.checks.errors.errorCount')

  echo "$TIMESTAMP,$STATUS,$UPTIME,$ERRORS" >> /tmp/performance-trend.csv

  sleep 900  # 15 minutes
done
REMOTE_SCRIPT
```

### Step 9: Send T+4 Hour Status Update

```bash
curl -X POST -H 'Content-type: application/json' \
  --data "{
    \"text\":\"📊 GitVan v4.0.0 - T+4 Hour Status\",
    \"attachments\":[{
      \"color\":\"good\",
      \"fields\":[
        {\"title\":\"Uptime\",\"value\":\"4 hours\",\"short\":true},
        {\"title\":\"Stability\",\"value\":\"Excellent\",\"short\":true},
        {\"title\":\"Issues\",\"value\":\"[Count]\",\"short\":true},
        {\"title\":\"User Feedback\",\"value\":\"[Summary]\",\"short\":true}
      ],
      \"text\":\"Active monitoring period complete. Transitioning to standard monitoring.\"
    }]
  }" \
  $SLACK_WEBHOOK_URL
```

---

## T+4 to T+24 Hours: Standard Monitoring Period

### Step 10: Hourly Health Checks

```bash
# Reduce monitoring frequency to hourly
cat > /tmp/monitor-gitvan-hourly.sh << 'MONITOR_SCRIPT'
#!/bin/bash

while true; do
  echo "=== Hourly Health Check at $(date -u +"%Y-%m-%d %H:%M:%S UTC") ==="

  HEALTH=$(curl -sf http://prod-server:9090/health)
  echo "$HEALTH" | jq '{
    status, uptime,
    git: .checks.git.status,
    cron: .checks.cron.status,
    events: .checks.events.status,
    errors: .checks.errors.errorCount
  }'

  sleep 3600  # 1 hour
done
MONITOR_SCRIPT

chmod +x /tmp/monitor-gitvan-hourly.sh

# Stop 15-minute monitoring
pkill -f "monitor-gitvan.sh"

# Start hourly monitoring
nohup /tmp/monitor-gitvan-hourly.sh > /tmp/monitor-gitvan-hourly.log 2>&1 &
echo "Hourly monitoring started (PID: $!)"
```

### Step 11: Log Analysis

```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash
echo "=== Log Analysis (last 24 hours) ==="

# Error summary
echo "Errors by type:"
grep -i "error" /var/log/gitvan/*.log | \
  awk -F: '{print $NF}' | \
  sort | uniq -c | sort -rn | head -10

# Warning summary
echo ""
echo "Warnings by type:"
grep -i "warning\|warn" /var/log/gitvan/*.log | \
  awk -F: '{print $NF}' | \
  sort | uniq -c | sort -rn | head -10

# Performance issues
echo ""
echo "Slow operations:"
grep -i "slow\|timeout" /var/log/gitvan/*.log | tail -10 || echo "None"
REMOTE_SCRIPT
```

### Step 12: Resource Utilization Trends

```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash
echo "=== Resource Utilization (24hr trend) ==="

# CPU trend
echo "CPU usage:"
sar -u 1 5 | tail -5

# Memory trend
echo ""
echo "Memory usage:"
free -m

# Disk I/O
echo ""
echo "Disk I/O:"
iostat -x 1 5 | tail -10

# Network
echo ""
echo "Network:"
ifconfig | grep "RX packets\|TX packets"
REMOTE_SCRIPT
```

---

## T+24 Hours: Post-Deployment Review

### Step 13: Collect Metrics for Review

#### 13.1 Generate Deployment Report
```bash
cat > deployment-review-v4.0.0.md << 'EOF'
# GitVan v4.0.0 - 24 Hour Post-Deployment Review

## Deployment Summary
- **Deployment Date**: [Date]
- **Deployment Duration**: [Duration]
- **Downtime**: [Duration or None]

## Health Status
- **Current Status**: [Healthy/Degraded/Unhealthy]
- **Uptime**: 24 hours
- **Availability**: [Percentage]

## Performance Metrics
- **Average Response Time**: [Time]
- **P95 Response Time**: [Time]
- **P99 Response Time**: [Time]
- **Error Rate**: [Percentage]

## Issues Encountered
### Critical Issues
- [None or list]

### High Priority Issues
- [None or list]

### Medium Priority Issues
- [None or list]

### Resolved Issues
- [List]

## User Feedback
- **Positive Feedback**: [Count]
- **Negative Feedback**: [Count]
- **Feature Requests**: [Count]

## Resource Utilization
- **Average CPU**: [Percentage]
- **Average Memory**: [Percentage]
- **Average Disk**: [Percentage]
- **Peak CPU**: [Percentage]
- **Peak Memory**: [Percentage]

## Cron Jobs
- **Total Jobs**: [Count]
- **Successful Runs**: [Count]
- **Failed Runs**: [Count]
- **Success Rate**: [Percentage]

## Lessons Learned
### What Went Well
- [List]

### What Could Be Improved
- [List]

### Action Items
- [ ] [Action 1]
- [ ] [Action 2]

## Recommendation
- [ ] Continue monitoring
- [ ] Address minor issues
- [ ] Plan hotfix (if needed)
- [ ] Document lessons learned

## Sign-off
- **Deployment Lead**: ___________
- **Operations Lead**: ___________
- **Engineering Manager**: ___________

Date: [Date]
EOF
```

#### 13.2 Final Status Update
```bash
curl -X POST -H 'Content-type: application/json' \
  --data "{
    \"text\":\"✅ GitVan v4.0.0 - 24 Hour Review Complete\",
    \"attachments\":[{
      \"color\":\"good\",
      \"fields\":[
        {\"title\":\"Uptime\",\"value\":\"24 hours\",\"short\":true},
        {\"title\":\"Availability\",\"value\":\"99.9%\",\"short\":true},
        {\"title\":\"Critical Issues\",\"value\":\"0\",\"short\":true},
        {\"title\":\"Status\",\"value\":\"Stable\",\"short\":true}
      ],
      \"text\":\"Deployment successful. Transitioning to standard operations.\"
    }]
  }" \
  $SLACK_WEBHOOK_URL
```

### Step 14: Transition to Standard Operations

#### 14.1 Stop Intensive Monitoring
```bash
# Stop monitoring scripts
pkill -f "monitor-gitvan"

echo "Intensive monitoring stopped. Transitioning to standard monitoring."
```

#### 14.2 Update Documentation
```bash
# Document any configuration changes
# Update runbooks with lessons learned
# Update known issues list
```

#### 14.3 Schedule Follow-Up
```bash
cat > follow-up-schedule.txt << 'EOF'
# GitVan v4.0.0 Follow-Up Schedule

## Week 1 (Days 1-7)
- Daily health checks
- Daily error log review
- Collect user feedback

## Week 2 (Days 8-14)
- Every 2 days health checks
- Weekly performance review
- Address minor issues

## Month 1 (Days 15-30)
- Weekly health checks
- Bi-weekly performance review
- Plan v4.1.0 improvements

## Ongoing
- Standard monitoring via dashboards
- Automated alerts
- Regular updates
EOF

cat follow-up-schedule.txt
```

---

## Success Criteria

Post-deployment is successful when:
- [ ] 24 hours uptime with no critical issues
- [ ] Health checks consistently return "healthy"
- [ ] Error rate < 1%
- [ ] Performance within baseline
- [ ] No user-reported critical issues
- [ ] All monitoring systems functioning
- [ ] Team comfortable with system stability

---

## Issue Response Procedures

### Minor Issues (Can wait)
1. Document issue
2. Add to backlog
3. Plan for next release

### Medium Issues (Address soon)
1. Create ticket
2. Assign to developer
3. Target fix within 48 hours
4. Test on staging
5. Deploy hotfix if needed

### Critical Issues (Immediate action)
1. Alert team immediately
2. Assess impact and severity
3. Consider rollback if severe
4. If continuing, apply emergency fix
5. Test fix thoroughly
6. Deploy hotfix with expedited process
7. Document incident

---

## Contacts

### Post-Deployment Team
- **Operations On-Call**: [Name] - [Phone] - [Email]
- **Developer On-Call**: [Name] - [Phone] - [Email]
- **Deployment Lead**: [Name] - [Phone] - [Email]

### Escalation
- **Engineering Manager**: [Name] - [Phone] - [Email]
- **CTO**: [Name] - [Phone] - [Email]

### Support
- **Hotline**: [Phone]
- **Slack**: #gitvan-ops
- **Email**: gitvan-ops@company.com

---

## References

- [02-DEPLOYMENT-RUNBOOK.md](./02-DEPLOYMENT-RUNBOOK.md)
- [04-ROLLBACK-RUNBOOK.md](./04-ROLLBACK-RUNBOOK.md)
- [05-MONITORING-RUNBOOK.md](./05-MONITORING-RUNBOOK.md)
- [06-SUPPORT-RUNBOOK.md](./06-SUPPORT-RUNBOOK.md)
- [07-INCIDENT-RESPONSE-RUNBOOK.md](./07-INCIDENT-RESPONSE-RUNBOOK.md)

---

**Document Version**: 1.0
**Last Updated**: 2026-01-08
**Owner**: Operations Team
**Review Cycle**: After each deployment
