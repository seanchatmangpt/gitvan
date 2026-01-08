# Deployment Runbook - GitVan v4.0.0

## Objective
Execute a safe, controlled, and verifiable deployment of GitVan v4.0.0 to production with zero data loss and minimal disruption.

## Scope
This runbook covers the complete deployment procedure from pre-deployment validation through post-deployment verification.

## Expected Duration
- **Estimated Time**: 40 minutes
- **Maximum Time**: 60 minutes (if issues encountered)
- **Rollback Time**: 5 minutes

---

## Prerequisites

### Pre-Deployment Checklist Completed
- [ ] All items from [01-PRE-DEPLOYMENT-RUNBOOK.md](./01-PRE-DEPLOYMENT-RUNBOOK.md) completed
- [ ] Go/No-Go decision: GO
- [ ] Deployment team assembled
- [ ] Stakeholders notified

### Required Access
- [ ] Production server SSH access
- [ ] Git repository access
- [ ] NPM registry access (if publishing)
- [ ] Monitoring system access
- [ ] Communication channels access

### Required Information
- [ ] Production server hostname/IP
- [ ] Deployment directory path
- [ ] Service names
- [ ] Health check URLs
- [ ] Rollback commit SHA

---

## Deployment Procedure

### PHASE 1: Pre-Deployment Validation (5 minutes)

#### Step 1.1: Start Deployment Timer
```bash
DEPLOYMENT_START=$(date +%s)
echo "Deployment started at: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
```

#### Step 1.2: Send Deployment Start Notification
```bash
# Update status page
curl -X POST https://api.statuspage.io/v1/pages/PAGE_ID/incidents \
  -H "Authorization: OAuth YOUR_TOKEN" \
  -d "status=investigating" \
  -d "name=GitVan v4.0.0 Deployment In Progress"

# Slack notification
curl -X POST -H 'Content-type: application/json' \
  --data '{
    "text":"🚀 GitVan v4.0.0 deployment started",
    "attachments":[{
      "color":"#FFA500",
      "fields":[
        {"title":"Phase","value":"Pre-Deployment Validation","short":true},
        {"title":"ETA","value":"40 minutes","short":true}
      ]
    }]
  }' \
  $SLACK_WEBHOOK_URL
```

**Verification:** Status page updated, Slack message sent.

#### Step 1.3: Verify Production System Health
```bash
# SSH to production server
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

echo "=== System Health Check ==="
echo "Hostname: $(hostname)"
echo "Date: $(date -u)"
echo ""

# Disk space (need > 10GB free)
echo "Disk Space:"
df -h / | tail -1
FREE_GB=$(df -BG / | tail -1 | awk '{print $4}' | sed 's/G//')
if [ "$FREE_GB" -lt 10 ]; then
  echo "ERROR: Insufficient disk space (${FREE_GB}GB < 10GB)"
  exit 1
fi
echo "✓ Disk space OK (${FREE_GB}GB available)"
echo ""

# Memory (need > 2GB free)
echo "Memory:"
free -h | grep "Mem:"
FREE_MEM=$(free -m | grep "Mem:" | awk '{print $7}')
if [ "$FREE_MEM" -lt 2000 ]; then
  echo "ERROR: Insufficient memory (${FREE_MEM}MB < 2000MB)"
  exit 1
fi
echo "✓ Memory OK (${FREE_MEM}MB available)"
echo ""

# Load average
echo "Load Average:"
uptime
LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk -F',' '{print $1}' | tr -d ' ')
echo "✓ Load: $LOAD"
echo ""

# Network connectivity
echo "Network:"
ping -c 2 github.com > /dev/null 2>&1 && echo "✓ GitHub reachable" || echo "✗ GitHub unreachable"
curl -s -o /dev/null -w "%{http_code}" https://registry.npmjs.org | grep -q "200" && echo "✓ NPM registry reachable" || echo "✗ NPM registry unreachable"
echo ""

echo "=== Health Check Complete ==="
REMOTE_SCRIPT
```

**Verification:** All health checks pass. If any check fails, STOP and escalate.

**Rollback Trigger:** Critical system resource failure (disk, memory, network).

#### Step 1.4: Create Pre-Deployment Backup
```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

BACKUP_DIR="/backups/gitvan/pre-v4-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "Creating pre-deployment backup: $BACKUP_DIR"

# Backup current installation
if [ -d "/opt/gitvan" ]; then
  tar -czf "$BACKUP_DIR/gitvan-installation.tar.gz" -C /opt gitvan/ 2>/dev/null || true
  echo "✓ Installation backed up"
fi

# Backup configuration
if [ -d "/etc/gitvan" ]; then
  cp -r /etc/gitvan "$BACKUP_DIR/" 2>/dev/null || true
  echo "✓ Configuration backed up"
fi

# Backup data
if [ -d "/var/lib/gitvan" ]; then
  tar -czf "$BACKUP_DIR/gitvan-data.tar.gz" -C /var/lib gitvan/ 2>/dev/null || true
  echo "✓ Data backed up"
fi

# Create manifest
cat > "$BACKUP_DIR/manifest.txt" << MANIFEST
Backup Date: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Hostname: $(hostname)
Purpose: Pre-v4.0.0 deployment backup
MANIFEST

# Save backup location
echo "$BACKUP_DIR" > /tmp/gitvan-backup-location.txt

ls -lh "$BACKUP_DIR"
echo "✓ Backup complete: $BACKUP_DIR"
REMOTE_SCRIPT
```

**Verification:** Backup created successfully, location saved to `/tmp/gitvan-backup-location.txt`.

**Rollback Trigger:** Backup fails to create.

---

### PHASE 2: Service Shutdown (2 minutes)

#### Step 2.1: Notify Service Shutdown
```bash
# Send update
curl -X POST -H 'Content-type: application/json' \
  --data '{
    "text":"📦 GitVan v4.0.0 - Phase 2: Service Shutdown",
    "attachments":[{
      "color":"#FFA500",
      "text":"Stopping services for deployment"
    }]
  }' \
  $SLACK_WEBHOOK_URL
```

#### Step 2.2: Stop GitVan Services Gracefully
```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

cd /opt/gitvan

echo "=== Stopping GitVan Services ==="

# Stop daemon if running
if pgrep -f "gitvan daemon" > /dev/null; then
  echo "Stopping GitVan daemon..."
  ./bin/gitvan.mjs daemon stop || true
  sleep 3

  # Force kill if still running
  if pgrep -f "gitvan daemon" > /dev/null; then
    echo "Force killing daemon..."
    pkill -9 -f "gitvan daemon" || true
  fi
  echo "✓ Daemon stopped"
else
  echo "✓ Daemon not running"
fi

# Stop cron scheduler
if pgrep -f "gitvan cron" > /dev/null; then
  echo "Stopping cron scheduler..."
  pkill -f "gitvan cron" || true
  echo "✓ Cron stopped"
else
  echo "✓ Cron not running"
fi

# Stop health check server
if lsof -i:9090 > /dev/null 2>&1; then
  echo "Stopping health check server..."
  PID=$(lsof -t -i:9090)
  kill $PID || true
  sleep 2
  echo "✓ Health check server stopped"
else
  echo "✓ Health check server not running"
fi

# Verify all stopped
sleep 2
if pgrep -f "gitvan" > /dev/null; then
  echo "ERROR: GitVan processes still running"
  pgrep -af "gitvan"
  exit 1
fi

echo "✓ All services stopped"
REMOTE_SCRIPT
```

**Verification:** All GitVan processes stopped.

**Rollback Trigger:** Unable to stop services cleanly (indicates potential data corruption risk).

---

### PHASE 3: Code Deployment (10 minutes)

#### Step 3.1: Notify Code Deployment
```bash
curl -X POST -H 'Content-type: application/json' \
  --data '{
    "text":"📦 GitVan v4.0.0 - Phase 3: Code Deployment",
    "attachments":[{
      "color":"#0000FF",
      "text":"Deploying new code"
    }]
  }' \
  $SLACK_WEBHOOK_URL
```

#### Step 3.2: Deploy Code from Git
```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

cd /opt/gitvan

echo "=== Deploying GitVan v4.0.0 ==="

# Record current commit for rollback
CURRENT_COMMIT=$(git rev-parse HEAD)
echo "$CURRENT_COMMIT" > /tmp/gitvan-previous-commit.txt
echo "Previous commit: $CURRENT_COMMIT"

# Fetch latest changes
echo "Fetching latest code..."
git fetch origin

# Checkout v4.0.0
echo "Checking out main branch..."
git checkout main
git reset --hard origin/main

# Verify commit
NEW_COMMIT=$(git rev-parse HEAD)
echo "New commit: $NEW_COMMIT"

# Verify v4.0.0 marker
if ! git log -1 --oneline | grep -q "v4.0.0\|10-agent"; then
  echo "ERROR: Commit does not appear to be v4.0.0"
  git log -1 --oneline
  exit 1
fi

echo "✓ Code deployed successfully"
echo "✓ From: $CURRENT_COMMIT"
echo "✓ To:   $NEW_COMMIT"
REMOTE_SCRIPT
```

**Verification:** Code checkout successful, v4.0.0 commit verified.

**Rollback Trigger:** Unable to checkout code, wrong commit deployed.

#### Step 3.3: Install Dependencies
```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

cd /opt/gitvan

echo "=== Installing Dependencies ==="

# Clean old modules
rm -rf node_modules/

# Install dependencies
echo "Running npm install..."
npm install --production

# Verify key dependencies installed
echo "Verifying dependencies..."
npm ls bree --depth=0 || exit 1
npm ls citty --depth=0 || exit 1
npm ls unctx --depth=0 || exit 1
npm ls c12 --depth=0 || exit 1

echo "✓ Dependencies installed"
REMOTE_SCRIPT
```

**Verification:** Dependencies installed, key packages present.

**Rollback Trigger:** npm install fails, missing critical dependencies.

#### Step 3.4: Build Application
```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

cd /opt/gitvan

echo "=== Building Application ==="

# Clean previous build
rm -rf dist/

# Build
echo "Running build..."
npm run build 2>&1 | tee build.log

# Verify build artifacts
if [ ! -f "dist/bin/gitvan.mjs" ]; then
  echo "ERROR: Build failed - gitvan.mjs not found"
  cat build.log
  exit 1
fi

if [ ! -f "dist/cli.mjs" ]; then
  echo "ERROR: Build failed - cli.mjs not found"
  cat build.log
  exit 1
fi

# Make executable
chmod +x dist/bin/gitvan.mjs

echo "✓ Build complete"
ls -lh dist/
ls -lh dist/bin/
REMOTE_SCRIPT
```

**Verification:** Build successful, artifacts present and executable.

**Rollback Trigger:** Build fails, missing artifacts.

---

### PHASE 4: Configuration Update (3 minutes)

#### Step 4.1: Update Configuration Files
```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

echo "=== Updating Configuration ==="

cd /opt/gitvan

# Backup current config
cp gitvan.config.js gitvan.config.js.backup

# Update environment-specific settings if needed
# (In this case, config is already in repo, so no changes needed)

# Verify configuration
node -e "
import config from './gitvan.config.js';
console.log('Config loaded:', config);
if (!config.jobs || !config.templates) {
  process.exit(1);
}
"

echo "✓ Configuration updated"
REMOTE_SCRIPT
```

**Verification:** Configuration valid and loaded correctly.

#### Step 4.2: Update Environment Variables
```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

echo "=== Updating Environment Variables ==="

# Update /etc/environment or systemd service file
cat > /etc/gitvan/env.sh << 'EOF'
export NODE_ENV=production
export GITVAN_HOME=/var/lib/gitvan
export GITVAN_REPO=/var/lib/gitvan/repo
export GITVAN_LOG_LEVEL=info
export TZ=UTC
export LANG=C
export HEALTH_CHECK_PORT=9090
export HEALTH_CHECK_HOST=0.0.0.0
EOF

echo "✓ Environment variables updated"
cat /etc/gitvan/env.sh
REMOTE_SCRIPT
```

---

### PHASE 5: Database Migration (if applicable) (5 minutes)

**Note:** GitVan v4.0.0 uses Git-native storage, no database migrations needed. If your deployment uses a database, add migration steps here.

```bash
# Skip - No database migrations needed
echo "✓ No database migrations required (Git-native storage)"
```

---

### PHASE 6: Service Startup (5 minutes)

#### Step 6.1: Notify Service Startup
```bash
curl -X POST -H 'Content-type: application/json' \
  --data '{
    "text":"🚀 GitVan v4.0.0 - Phase 6: Service Startup",
    "attachments":[{
      "color":"#00FF00",
      "text":"Starting services"
    }]
  }' \
  $SLACK_WEBHOOK_URL
```

#### Step 6.2: Start Health Check Server
```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

cd /opt/gitvan

echo "=== Starting Health Check Server ==="

# Source environment
source /etc/gitvan/env.sh

# Start health check in background
nohup node -e "
import { HealthCheckManager, createDefaultHealthChecks } from './src/core/health-check.mjs';
const hc = new HealthCheckManager({ port: 9090, host: '0.0.0.0' });
await hc.start();
console.log('Health check server started');
process.on('SIGTERM', () => { hc.stop(); process.exit(0); });
" > /var/log/gitvan/health-check.log 2>&1 &

sleep 3

# Verify started
if ! lsof -i:9090 > /dev/null 2>&1; then
  echo "ERROR: Health check server failed to start"
  cat /var/log/gitvan/health-check.log
  exit 1
fi

echo "✓ Health check server started on port 9090"
REMOTE_SCRIPT
```

**Verification:** Health check server listening on port 9090.

**Rollback Trigger:** Health check server fails to start.

#### Step 6.3: Start GitVan Daemon
```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

cd /opt/gitvan

echo "=== Starting GitVan Daemon ==="

# Source environment
source /etc/gitvan/env.sh

# Start daemon
./dist/bin/gitvan.mjs daemon start

sleep 5

# Verify daemon started
./dist/bin/gitvan.mjs daemon status

if ! pgrep -f "gitvan daemon" > /dev/null; then
  echo "ERROR: Daemon failed to start"
  exit 1
fi

echo "✓ GitVan daemon started"
REMOTE_SCRIPT
```

**Verification:** Daemon running and healthy.

**Rollback Trigger:** Daemon fails to start or crashes immediately.

#### Step 6.4: Mark System as Ready
```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

# Health check should automatically mark ready once daemon is healthy
# Verify readiness endpoint
curl -f http://localhost:9090/health/ready | jq .

if [ $? -ne 0 ]; then
  echo "ERROR: System not ready"
  exit 1
fi

echo "✓ System marked as ready"
REMOTE_SCRIPT
```

---

### PHASE 7: Health Check Validation (5 minutes)

#### Step 7.1: Check All Health Endpoints
```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

echo "=== Validating Health Endpoints ==="

# Liveness
echo "Checking /health/live..."
RESPONSE=$(curl -s http://localhost:9090/health/live)
echo "$RESPONSE" | jq .
if ! echo "$RESPONSE" | jq -e '.status == "healthy"' > /dev/null; then
  echo "ERROR: Liveness check failed"
  exit 1
fi
echo "✓ Liveness: healthy"

# Readiness
echo "Checking /health/ready..."
RESPONSE=$(curl -s http://localhost:9090/health/ready)
echo "$RESPONSE" | jq .
if ! echo "$RESPONSE" | jq -e '.status == "healthy"' > /dev/null; then
  echo "ERROR: Readiness check failed"
  exit 1
fi
echo "✓ Readiness: healthy"

# Overall health
echo "Checking /health..."
RESPONSE=$(curl -s http://localhost:9090/health)
echo "$RESPONSE" | jq .
if ! echo "$RESPONSE" | jq -e '.status == "healthy"' > /dev/null; then
  echo "ERROR: Health check failed"
  exit 1
fi
echo "✓ Overall health: healthy"

# Check individual components
echo "Checking component health..."
if ! echo "$RESPONSE" | jq -e '.checks.git.status == "healthy"' > /dev/null; then
  echo "WARNING: Git health degraded"
fi
if ! echo "$RESPONSE" | jq -e '.checks.cron.status == "healthy"' > /dev/null; then
  echo "WARNING: Cron health degraded"
fi
if ! echo "$RESPONSE" | jq -e '.checks.events.status == "healthy"' > /dev/null; then
  echo "WARNING: Events health degraded"
fi

echo "✓ All health checks passed"
REMOTE_SCRIPT
```

**Verification:** All health checks return "healthy".

**Rollback Trigger:** Health checks fail or return "unhealthy".

#### Step 7.2: Verify Component Functionality
```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

cd /opt/gitvan
source /etc/gitvan/env.sh

echo "=== Verifying Component Functionality ==="

# Test CLI
echo "Testing CLI..."
./dist/bin/gitvan.mjs --version || exit 1
./dist/bin/gitvan.mjs --help || exit 1
echo "✓ CLI functional"

# Test daemon status
echo "Testing daemon..."
./dist/bin/gitvan.mjs daemon status || exit 1
echo "✓ Daemon functional"

# Test cron listing
echo "Testing cron..."
./dist/bin/gitvan.mjs cron list || exit 1
echo "✓ Cron functional"

# Test event listing
echo "Testing events..."
./dist/bin/gitvan.mjs event list || exit 1
echo "✓ Events functional"

echo "✓ All components functional"
REMOTE_SCRIPT
```

**Verification:** All components respond correctly.

---

### PHASE 8: Smoke Tests (10 minutes)

#### Step 8.1: Run Automated Smoke Tests
```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

cd /opt/gitvan
source /etc/gitvan/env.sh

echo "=== Running Smoke Tests ==="

# Smoke test 1: Job listing
echo "Test 1: List jobs..."
JOBS=$(./dist/bin/gitvan.mjs cron list)
echo "$JOBS"
echo "✓ Test 1 passed"

# Smoke test 2: Dry-run cron
echo "Test 2: Cron dry-run..."
./dist/bin/gitvan.mjs cron dry-run || exit 1
echo "✓ Test 2 passed"

# Smoke test 3: Event simulation (if safe)
# echo "Test 3: Event simulation..."
# ./dist/bin/gitvan.mjs event simulate --files "README.md" || exit 1
# echo "✓ Test 3 passed"

# Smoke test 4: Health endpoint stress
echo "Test 4: Health endpoint stress..."
for i in {1..10}; do
  curl -sf http://localhost:9090/health > /dev/null || exit 1
done
echo "✓ Test 4 passed"

# Smoke test 5: Daemon restart
echo "Test 5: Daemon restart..."
./dist/bin/gitvan.mjs daemon stop
sleep 3
./dist/bin/gitvan.mjs daemon start
sleep 5
./dist/bin/gitvan.mjs daemon status || exit 1
echo "✓ Test 5 passed"

echo "✓ All smoke tests passed"
REMOTE_SCRIPT
```

**Verification:** All smoke tests pass.

**Rollback Trigger:** Any smoke test fails.

#### Step 8.2: Performance Baseline Check
```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

echo "=== Performance Baseline Check ==="

# Capture current performance
PERF=$(curl -s http://localhost:9090/health)
echo "$PERF" | jq .

# Check uptime is > 0
UPTIME=$(echo "$PERF" | jq -r '.uptime')
if [ "$UPTIME" -lt 1000 ]; then
  echo "WARNING: Low uptime: ${UPTIME}ms"
fi

# Check no high error rate
ERROR_COUNT=$(echo "$PERF" | jq -r '.checks.errors.errorCount // 0')
if [ "$ERROR_COUNT" -gt 5 ]; then
  echo "ERROR: High error count: $ERROR_COUNT"
  exit 1
fi

echo "✓ Performance baseline acceptable"
echo "  Uptime: ${UPTIME}ms"
echo "  Errors: $ERROR_COUNT"
REMOTE_SCRIPT
```

---

### PHASE 9: Traffic Enablement (if applicable) (2 minutes)

**Note:** GitVan is typically not load-balanced. If you use a load balancer:

```bash
# Enable traffic to production server
# curl -X POST https://loadbalancer-api/enable -d "server=prod-server"

echo "✓ No load balancer - skipping traffic enablement"
```

---

### PHASE 10: Deployment Completion (3 minutes)

#### Step 10.1: Calculate Deployment Duration
```bash
DEPLOYMENT_END=$(date +%s)
DEPLOYMENT_DURATION=$((DEPLOYMENT_END - DEPLOYMENT_START))
DEPLOYMENT_MINUTES=$((DEPLOYMENT_DURATION / 60))
echo "Deployment completed in: ${DEPLOYMENT_MINUTES} minutes"
```

#### Step 10.2: Create Deployment Record
```bash
cat > deployment-record-v4.0.0.txt << EOF
GitVan v4.0.0 Deployment Record

Deployment Date: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Duration: ${DEPLOYMENT_MINUTES} minutes
Status: SUCCESS

Commits:
- From: [previous commit from /tmp/gitvan-previous-commit.txt]
- To: [current commit]

Verification:
- Health checks: PASSED
- Smoke tests: PASSED
- Performance: ACCEPTABLE

Backup Location: [from /tmp/gitvan-backup-location.txt]

Deployed by: [Your name]
Verified by: [Verifier name]
EOF

cat deployment-record-v4.0.0.txt
```

#### Step 10.3: Send Success Notification
```bash
# Update status page
curl -X POST https://api.statuspage.io/v1/pages/PAGE_ID/incidents \
  -H "Authorization: OAuth YOUR_TOKEN" \
  -d "status=resolved" \
  -d "name=GitVan v4.0.0 Deployment Complete"

# Slack success notification
curl -X POST -H 'Content-type: application/json' \
  --data "{
    \"text\":\"✅ GitVan v4.0.0 deployment SUCCESSFUL\",
    \"attachments\":[{
      \"color\":\"good\",
      \"fields\":[
        {\"title\":\"Duration\",\"value\":\"${DEPLOYMENT_MINUTES} minutes\",\"short\":true},
        {\"title\":\"Health\",\"value\":\"All systems healthy\",\"short\":true},
        {\"title\":\"Status\",\"value\":\"https://status.company.com\",\"short\":false}
      ]
    }]
  }" \
  $SLACK_WEBHOOK_URL

# Email notification
cat > email-success.txt << EOF
Subject: [SUCCESS] GitVan v4.0.0 Deployment Complete

The GitVan v4.0.0 deployment has completed successfully.

Deployment Time: ${DEPLOYMENT_MINUTES} minutes
Completed At: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

Status: All systems healthy
Health Check: https://prod-server:9090/health

Next Steps:
1. Monitor for 1 hour (see Post-Deployment Runbook)
2. Run validation tests
3. Collect user feedback

Deployment Team
EOF

# Send email
mail -s "[SUCCESS] GitVan v4.0.0 Deployment Complete" stakeholders@company.com < email-success.txt
```

#### Step 10.4: Activate Post-Deployment Monitoring
```bash
echo "✓ Deployment complete - activating post-deployment monitoring"
echo "Follow: 03-POST-DEPLOYMENT-RUNBOOK.md"
```

---

## Success Criteria

Deployment is successful when:
- [ ] All 10 phases completed without errors
- [ ] Health checks all return "healthy"
- [ ] All smoke tests passed
- [ ] Performance within acceptable baseline
- [ ] Services running stably for 5+ minutes
- [ ] Zero critical errors in logs
- [ ] Deployment duration < 60 minutes

---

## Rollback Criteria

Trigger rollback immediately if:
- Any phase fails and cannot be fixed within 5 minutes
- Health checks fail after service startup
- Smoke tests fail
- Critical error rate > 10 errors/minute
- Services crash repeatedly (> 3 times)
- Deployment duration exceeds 60 minutes
- Deployment lead orders rollback

**If rollback needed, immediately execute: [04-ROLLBACK-RUNBOOK.md](./04-ROLLBACK-RUNBOOK.md)**

---

## Contacts

### Deployment Team
- **Deployment Lead**: [Name] - [Phone] - [Email]
- **Operations Engineer**: [Name] - [Phone] - [Email]
- **Developer On-Call**: [Name] - [Phone] - [Email]

### Emergency Escalation
- **Engineering Manager**: [Name] - [Phone] - [Email]
- **CTO**: [Name] - [Phone] - [Email]

### Support
- **Hotline**: [Phone]
- **Slack**: #gitvan-deployment
- **Status Page**: https://status.company.com

---

## References

- [01-PRE-DEPLOYMENT-RUNBOOK.md](./01-PRE-DEPLOYMENT-RUNBOOK.md)
- [03-POST-DEPLOYMENT-RUNBOOK.md](./03-POST-DEPLOYMENT-RUNBOOK.md)
- [04-ROLLBACK-RUNBOOK.md](./04-ROLLBACK-RUNBOOK.md)
- [Health Check Documentation](/home/user/gitvan/src/core/health-check.mjs)
- [GitVan v4.0.0 Release Notes](/docs/releases/v4.0.0-release-notes.md)

---

**Document Version**: 1.0
**Last Updated**: 2026-01-08
**Owner**: Deployment Team
**Review Cycle**: After each deployment (lessons learned)
