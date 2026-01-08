# Support Runbook - GitVan v4.0.0

## Objective
Provide comprehensive support procedures for troubleshooting and resolving GitVan v4.0.0 issues reported by users or detected by monitoring.

## Scope
This runbook covers common issues, troubleshooting procedures, workarounds, and escalation paths for GitVan support operations.

---

## Support Tiers

### Tier 1: First Line Support
- Handles basic questions
- Provides documentation links
- Applies known workarounds
- Collects initial diagnostics
- **Escalates to Tier 2 if:** Cannot resolve within 15 minutes

### Tier 2: Technical Support
- Deep troubleshooting
- Log analysis
- Configuration fixes
- Applies hotfixes
- **Escalates to Tier 3 if:** Requires code changes or deployment

### Tier 3: Engineering Support
- Bug fixes
- Hotfix deployment
- Architecture decisions
- Emergency patches
- **Escalates to Management if:** Critical business impact

---

## Common Issues and Solutions

### Issue 1: GitVan CLI Not Working

**Symptoms:**
- Command not found
- Permission denied
- Version mismatch

**Diagnosis:**
```bash
# Check if gitvan is installed
which gitvan

# Check version
gitvan --version

# Check permissions
ls -la $(which gitvan)

# Check Node.js version
node --version
```

**Solutions:**

**Problem: Command not found**
```bash
# Solution 1: Add to PATH
export PATH="/opt/gitvan/dist/bin:$PATH"

# Solution 2: Use full path
/opt/gitvan/dist/bin/gitvan.mjs --help

# Solution 3: Create symlink
sudo ln -s /opt/gitvan/dist/bin/gitvan.mjs /usr/local/bin/gitvan
```

**Problem: Permission denied**
```bash
# Solution: Fix permissions
chmod +x /opt/gitvan/dist/bin/gitvan.mjs
```

**Problem: Wrong version**
```bash
# Solution: Reinstall
cd /opt/gitvan
git fetch origin
git checkout main
git reset --hard origin/main
npm install
npm run build
```

### Issue 2: Daemon Won't Start

**Symptoms:**
- `gitvan daemon start` fails
- Process exits immediately
- Port already in use

**Diagnosis:**
```bash
# Check if already running
pgrep -af "gitvan daemon"

# Check logs
tail -50 /var/log/gitvan/daemon.log

# Check port availability
lsof -i:9090

# Check disk space
df -h

# Check memory
free -m
```

**Solutions:**

**Problem: Already running**
```bash
# Solution: Stop first
gitvan daemon stop
sleep 2
gitvan daemon start
```

**Problem: Port in use**
```bash
# Solution: Kill process using port
kill $(lsof -t -i:9090)
sleep 2
gitvan daemon start
```

**Problem: Out of resources**
```bash
# Solution: Free up resources
# Check what's consuming resources
ps aux --sort=-%mem | head -10

# Clear logs if disk full
find /var/log -name "*.log" -mtime +7 -delete

# Restart daemon
gitvan daemon start
```

### Issue 3: Jobs Not Running

**Symptoms:**
- Cron jobs not executing
- Event jobs not triggering
- Jobs fail with errors

**Diagnosis:**
```bash
# List all jobs
gitvan cron list

# Check cron scheduler status
gitvan daemon status

# Dry-run cron to see next execution
gitvan cron dry-run

# Check job logs
tail -50 /var/log/gitvan/jobs.log

# Test job manually
gitvan run <job-name>
```

**Solutions:**

**Problem: Cron scheduler not running**
```bash
# Solution: Restart daemon
gitvan daemon restart
sleep 5
gitvan daemon status
```

**Problem: Job syntax error**
```bash
# Solution: Validate job file
node -e "import job from './jobs/your-job.mjs'; console.log(job)"

# Check for common issues:
# - Missing export default
# - Invalid cron expression
# - Missing required fields
```

**Problem: Job dependencies missing**
```bash
# Solution: Install dependencies
cd /opt/gitvan
npm install <missing-package>
```

### Issue 4: High Error Rate

**Symptoms:**
- Many errors in logs
- Health check shows high error count
- Services degraded

**Diagnosis:**
```bash
# Get error details
curl -s http://localhost:9090/health | jq '.checks.errors'

# Check recent errors
grep -i error /var/log/gitvan/*.log | tail -100

# Find error patterns
grep -i error /var/log/gitvan/*.log | \
  awk -F: '{print $NF}' | sort | uniq -c | sort -rn | head -10

# Check for specific error types
grep -i "TypeError\|ReferenceError\|SyntaxError" /var/log/gitvan/*.log
```

**Solutions:**

**Problem: Configuration error**
```bash
# Solution: Verify configuration
node -e "import config from './gitvan.config.js'; console.log(config)"

# Fix configuration issues
# Restart services
gitvan daemon restart
```

**Problem: Missing dependencies**
```bash
# Solution: Reinstall dependencies
cd /opt/gitvan
rm -rf node_modules
npm install --production
gitvan daemon restart
```

**Problem: Bug in code**
```bash
# Solution: Apply hotfix (if available) or rollback
# See hotfix procedure below
```

### Issue 5: Slow Performance

**Symptoms:**
- Operations take long time
- High CPU usage
- High memory usage
- Response time > 300ms

**Diagnosis:**
```bash
# Check system resources
top -bn1 | head -20

# Check memory usage
free -m

# Check disk I/O
iostat -x 1 5

# Check performance metrics
curl -s http://localhost:9090/health | jq .

# Check for resource-intensive processes
ps aux --sort=-%cpu | head -10
ps aux --sort=-%mem | head -10
```

**Solutions:**

**Problem: High CPU usage**
```bash
# Solution 1: Identify CPU-intensive process
top -bn1 | grep gitvan

# Solution 2: Limit job concurrency (if applicable)
# Edit gitvan.config.js to reduce concurrent jobs

# Solution 3: Scale resources (add CPU)
```

**Problem: Memory leak**
```bash
# Solution: Monitor memory over time
watch -n 60 'free -m; pgrep -af gitvan'

# If memory grows continuously, restart services
gitvan daemon restart

# Report to Tier 3 for permanent fix
```

**Problem: Disk I/O bottleneck**
```bash
# Solution 1: Check what's writing to disk
iotop -ao

# Solution 2: Move logs to different disk
# Solution 3: Reduce logging verbosity
export GITVAN_LOG_LEVEL=warn
```

### Issue 6: Health Check Failures

**Symptoms:**
- Health endpoint returns 503
- Specific component unhealthy
- Health endpoint unreachable

**Diagnosis:**
```bash
# Check overall health
curl -sf http://localhost:9090/health | jq .

# Check specific endpoints
curl -sf http://localhost:9090/health/live | jq .
curl -sf http://localhost:9090/health/ready | jq .

# Check if health server running
lsof -i:9090

# Check health server logs
tail -50 /var/log/gitvan/health-check.log
```

**Solutions:**

**Problem: Health server not running**
```bash
# Solution: Restart health server
# Stop all services
pkill -f "gitvan"

# Start daemon (includes health server)
gitvan daemon start
sleep 5

# Verify
curl http://localhost:9090/health | jq .
```

**Problem: Git component unhealthy**
```bash
# Solution: Check git repository
cd /opt/gitvan
git status
git fsck --full

# Fix if needed
git gc
git prune

# Restart services
gitvan daemon restart
```

**Problem: Cron component unhealthy**
```bash
# Solution: Restart cron scheduler
gitvan daemon restart

# Verify cron jobs
gitvan cron list
gitvan cron dry-run
```

---

## Diagnostic Data Collection

### Standard Diagnostic Bundle
When escalating, collect this information:

```bash
#!/bin/bash
# Save as: /usr/local/bin/gitvan-diagnostics.sh

BUNDLE_DIR="/tmp/gitvan-diagnostics-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BUNDLE_DIR"

echo "Collecting diagnostics to: $BUNDLE_DIR"

# System information
uname -a > "$BUNDLE_DIR/system-info.txt"
hostname > "$BUNDLE_DIR/hostname.txt"
date -u > "$BUNDLE_DIR/timestamp.txt"

# GitVan version
/opt/gitvan/dist/bin/gitvan.mjs --version > "$BUNDLE_DIR/gitvan-version.txt" 2>&1 || echo "Version check failed" > "$BUNDLE_DIR/gitvan-version.txt"

# Health status
curl -s http://localhost:9090/health > "$BUNDLE_DIR/health.json" 2>&1 || echo "Health check failed" > "$BUNDLE_DIR/health.json"

# Process status
ps aux | grep gitvan > "$BUNDLE_DIR/processes.txt"

# Service status
/opt/gitvan/dist/bin/gitvan.mjs daemon status > "$BUNDLE_DIR/daemon-status.txt" 2>&1 || echo "Daemon status check failed" > "$BUNDLE_DIR/daemon-status.txt"

# Job list
/opt/gitvan/dist/bin/gitvan.mjs cron list > "$BUNDLE_DIR/cron-list.txt" 2>&1 || echo "Cron list failed" > "$BUNDLE_DIR/cron-list.txt"

# Recent logs (last 1000 lines)
tail -1000 /var/log/gitvan/*.log > "$BUNDLE_DIR/recent-logs.txt" 2>/dev/null || echo "No logs found" > "$BUNDLE_DIR/recent-logs.txt"

# System resources
free -m > "$BUNDLE_DIR/memory.txt"
df -h > "$BUNDLE_DIR/disk.txt"
uptime > "$BUNDLE_DIR/uptime.txt"
top -bn1 | head -30 > "$BUNDLE_DIR/top.txt"

# Git repository status
cd /opt/gitvan
git status > "$BUNDLE_DIR/git-status.txt" 2>&1
git log -10 --oneline > "$BUNDLE_DIR/git-log.txt" 2>&1
git rev-parse HEAD > "$BUNDLE_DIR/git-commit.txt" 2>&1

# Configuration (sanitized)
cat gitvan.config.js | grep -v "password\|secret\|key" > "$BUNDLE_DIR/config-sanitized.js" 2>&1

# Package versions
npm ls --depth=0 > "$BUNDLE_DIR/packages.txt" 2>&1

# Network connectivity
ping -c 3 github.com > "$BUNDLE_DIR/network-github.txt" 2>&1
curl -I https://registry.npmjs.org > "$BUNDLE_DIR/network-npm.txt" 2>&1

# Create tarball
cd /tmp
tar -czf "$BUNDLE_DIR.tar.gz" "$(basename $BUNDLE_DIR)"

echo "Diagnostic bundle created: $BUNDLE_DIR.tar.gz"
echo "Size: $(du -h $BUNDLE_DIR.tar.gz | cut -f1)"
ls -lh "$BUNDLE_DIR.tar.gz"
```

### How to Use Diagnostics
```bash
# Run diagnostic collection
bash /usr/local/bin/gitvan-diagnostics.sh

# Send to support
# Email the .tar.gz file or upload to support portal
```

---

## Hotfix Procedure

### When to Apply Hotfix
- Critical bug fix available
- Security patch needed
- Workaround insufficient
- Approved by Tier 3 engineering

### Hotfix Steps
```bash
#!/bin/bash
# Hotfix application procedure

echo "=== GitVan Hotfix Application ==="
echo "Hotfix ID: [HOTFIX-ID]"
echo "Description: [DESCRIPTION]"
echo "Applied by: $(whoami)"
echo "Date: $(date -u)"

# 1. Backup current state
BACKUP_DIR="/backups/gitvan/pre-hotfix-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cd /opt/gitvan
tar -czf "$BACKUP_DIR/gitvan-pre-hotfix.tar.gz" .
echo "Backup created: $BACKUP_DIR"

# 2. Stop services
echo "Stopping services..."
gitvan daemon stop
sleep 3

# 3. Apply hotfix
echo "Applying hotfix..."
# Option A: Git patch
git fetch origin
git cherry-pick <hotfix-commit-sha>

# Option B: File replacement
# cp /tmp/hotfix-file.mjs src/path/to/file.mjs

# 4. Rebuild if needed
echo "Rebuilding..."
npm run build

# 5. Run quick tests
echo "Testing hotfix..."
npm test -- --grep "relevant-test-pattern" || echo "Tests not available"

# 6. Restart services
echo "Restarting services..."
gitvan daemon start
sleep 5

# 7. Verify
echo "Verifying..."
gitvan daemon status
curl -sf http://localhost:9090/health | jq .

# 8. Monitor for 10 minutes
echo "Monitoring..."
for i in {1..10}; do
  sleep 60
  STATUS=$(curl -sf http://localhost:9090/health | jq -r '.status')
  echo "$(date +%H:%M:%S) - Status: $STATUS"
done

echo "Hotfix application complete"
echo "Monitor closely for next hour"
```

### Hotfix Rollback
If hotfix causes issues:
```bash
# Restore from backup
BACKUP_DIR="[backup location from above]"
cd /opt
rm -rf gitvan
tar -xzf "$BACKUP_DIR/gitvan-pre-hotfix.tar.gz" -C gitvan/

# Restart services
cd /opt/gitvan
gitvan daemon start

# Verify
curl http://localhost:9090/health | jq .
```

---

## Known Issues and Workarounds

### Issue: Lock Contention
**Symptom:** Operations timeout waiting for lock

**Workaround:**
```bash
# Clear stale locks
cd /opt/gitvan
rm -f .gitvan/locks/*
gitvan daemon restart
```

**Permanent Fix:** Upgrade to next patch version (when available)

### Issue: Memory Leak in Long-Running Jobs
**Symptom:** Memory usage grows over time

**Workaround:**
```bash
# Restart daemon daily
# Add to crontab:
# 0 3 * * * gitvan daemon restart
```

**Permanent Fix:** Tracked in ticket GITVAN-XXX

### Issue: Event Jobs Not Triggered After Merge
**Symptom:** Git merge doesn't trigger event jobs

**Workaround:**
```bash
# Manual trigger
gitvan event simulate --event merge --ref HEAD
```

**Permanent Fix:** Fixed in v4.1.0

---

## Escalation Procedures

### When to Escalate to Tier 2
- Issue not in FAQ/known issues
- Workaround insufficient
- User impacted > 15 minutes
- Complex configuration issue

### When to Escalate to Tier 3
- Code bug confirmed
- Hotfix needed
- Database/data corruption
- Security issue
- Architectural question

### When to Escalate to Management
- Service down > 1 hour
- Data loss occurred
- Security breach
- Multiple customers impacted
- Revenue impact

### Escalation Template
```
Subject: [P1/P2/P3] GitVan Issue - [Brief Description]

ISSUE SUMMARY:
- User/System: [Name/Hostname]
- Issue: [Description]
- Impact: [Who/what is affected]
- Started: [Timestamp]

SYMPTOMS:
[Detailed symptoms]

DIAGNOSIS PERFORMED:
[Steps taken to diagnose]

ATTEMPTED SOLUTIONS:
[What was tried]

CURRENT STATE:
[Working/degraded/down]

DIAGNOSTIC DATA:
[Attach diagnostic bundle]

REQUESTED ACTION:
[What do you need from Tier 2/3]

URGENCY:
[Why this urgency level]
```

---

## Support Tools

### Quick Status Check
```bash
#!/bin/bash
# Save as: /usr/local/bin/gitvan-status-quick.sh

echo "=== GitVan Quick Status ==="
echo ""

# Services running?
if pgrep -f "gitvan daemon" > /dev/null; then
  echo "✓ Daemon running"
else
  echo "✗ Daemon NOT running"
fi

# Health check
if curl -sf http://localhost:9090/health > /dev/null 2>&1; then
  STATUS=$(curl -sf http://localhost:9090/health | jq -r '.status')
  echo "✓ Health check: $STATUS"
else
  echo "✗ Health check failed"
fi

# Disk space
DISK_FREE=$(df -h / | awk 'NR==2{print $4}')
echo "  Disk free: $DISK_FREE"

# Memory free
MEM_FREE=$(free -m | awk 'NR==2{print $7}')
echo "  Memory free: ${MEM_FREE}MB"

# Error count
ERROR_COUNT=$(curl -sf http://localhost:9090/health | jq -r '.checks.errors.errorCount // 0')
echo "  Errors: $ERROR_COUNT"
```

### Log Grep Helper
```bash
#!/bin/bash
# Save as: /usr/local/bin/gitvan-log-search.sh

PATTERN="$1"
TIMEFRAME="${2:-60}"  # Default: last 60 minutes

if [ -z "$PATTERN" ]; then
  echo "Usage: $0 <pattern> [minutes-ago]"
  exit 1
fi

echo "Searching for '$PATTERN' in logs from last $TIMEFRAME minutes..."
find /var/log/gitvan -name "*.log" -mmin "-$TIMEFRAME" -exec grep -i "$PATTERN" {} + | tail -100
```

---

## User Communication Templates

### Template: Issue Acknowledged
```
Hi [User],

Thank you for reporting this issue. We've received your request and are investigating.

Issue: [Brief description]
Ticket: [TICKET-ID]
Priority: [P1/P2/P3/P4]
Assigned to: [Support engineer name]

We will update you within [timeframe] with our findings or a resolution.

In the meantime, if you have additional information that might help, please reply to this email.

Best regards,
GitVan Support Team
```

### Template: Workaround Provided
```
Hi [User],

We've identified a workaround for your issue:

WORKAROUND:
[Step-by-step instructions]

This workaround should allow you to continue working while we develop a permanent fix.

A permanent fix is being developed and will be included in the next release. We'll notify you when it's available.

Please let us know if this workaround resolves your immediate need.

Best regards,
GitVan Support Team
```

### Template: Issue Resolved
```
Hi [User],

Good news! Your issue has been resolved.

Issue: [Description]
Resolution: [What was done]
Resolved by: [Name]

The fix has been applied and verified. Please test on your end and confirm it's working as expected.

If you encounter any further issues, please don't hesitate to reach out.

Thank you for your patience.

Best regards,
GitVan Support Team
```

---

## Support Metrics to Track

- **First Response Time:** Target < 15 minutes
- **Resolution Time:** Target < 2 hours (P2), < 4 hours (P3)
- **Escalation Rate:** Target < 20%
- **Customer Satisfaction:** Target > 90%
- **Repeat Issues:** Target < 10%

---

## Contacts

### Support Team
- **Tier 1 Lead**: [Name] - [Email]
- **Tier 2 Lead**: [Name] - [Email] - [Phone]
- **Tier 3 Lead**: [Name] - [Email] - [Phone]

### On-Call
- **Primary**: [Name] - [Phone]
- **Secondary**: [Name] - [Phone]

### Support Channels
- **Email**: gitvan-support@company.com
- **Slack**: #gitvan-support
- **Phone**: [Number]
- **Portal**: https://support.company.com

---

## References

- [05-MONITORING-RUNBOOK.md](./05-MONITORING-RUNBOOK.md)
- [07-INCIDENT-RESPONSE-RUNBOOK.md](./07-INCIDENT-RESPONSE-RUNBOOK.md)
- [GitVan Documentation](/docs)
- [Troubleshooting Guide](/docs/TROUBLESHOOTING-JOBS.md)

---

**Document Version**: 1.0
**Last Updated**: 2026-01-08
**Owner**: Support Team
**Review Cycle**: Monthly or after major issues
