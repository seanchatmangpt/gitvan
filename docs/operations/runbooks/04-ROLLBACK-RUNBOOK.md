# Rollback Runbook - GitVan v4.0.0

## Objective
Rapidly and safely revert GitVan from v4.0.0 to the previous stable version (v3.x) when deployment issues cannot be resolved quickly.

## Scope
This runbook provides step-by-step procedures to rollback GitVan to the last known good state with minimal data loss and service disruption.

## Expected Duration
- **Target Rollback Time**: 5 minutes
- **Maximum Rollback Time**: 10 minutes

**CRITICAL:** Speed is essential. Follow steps exactly as written.

---

## When to Trigger Rollback

### Immediate Rollback Triggers (No Discussion Needed)
- Services crash repeatedly (> 3 times in 10 minutes)
- Health checks fail for > 5 minutes
- Critical security vulnerability discovered
- Data corruption detected
- Cannot start services after deployment
- Error rate > 50 errors/minute

### Escalated Rollback Triggers (Deployment Lead Decision)
- Smoke tests fail
- Performance degradation > 50%
- Multiple medium-severity bugs
- User-facing critical functionality broken
- Deployment exceeds 60 minutes
- Team loses confidence in deployment

### Rollback Decision Matrix

| Severity | Impact | Response Time | Action |
|----------|--------|---------------|--------|
| P1 - Critical | System down | Immediate | Rollback |
| P2 - High | Major features broken | < 5 min | Consider rollback |
| P3 - Medium | Minor issues | < 30 min | Fix forward if possible |
| P4 - Low | Cosmetic issues | No urgency | Fix in next release |

---

## Prerequisites

### Before Starting Rollback
- [ ] Rollback decision made and documented
- [ ] Deployment lead notified and approved
- [ ] Team notified via Slack
- [ ] Backup location verified (from deployment)
- [ ] Previous version commit SHA identified

### Required Access
- [ ] Production server SSH access
- [ ] Git repository access
- [ ] Restart services permission

### Required Information
- [ ] Previous commit SHA (from `/tmp/gitvan-previous-commit.txt`)
- [ ] Backup location (from `/tmp/gitvan-backup-location.txt`)
- [ ] Current error logs for post-mortem

---

## Rollback Procedure

### PHASE 1: Initiate Rollback (30 seconds)

#### Step 1.1: Start Rollback Timer
```bash
ROLLBACK_START=$(date +%s)
echo "ROLLBACK INITIATED at $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo "Reason: [Document reason here]"
```

#### Step 1.2: Send Immediate Notification
```bash
# Send URGENT rollback notification
curl -X POST -H 'Content-type: application/json' \
  --data '{
    "text":"🚨 URGENT: GitVan v4.0.0 ROLLBACK IN PROGRESS",
    "attachments":[{
      "color":"danger",
      "fields":[
        {"title":"Status","value":"Rollback initiated","short":true},
        {"title":"ETA","value":"5 minutes","short":true}
      ],
      "text":"@channel Rollback to v3.x in progress. Stand by."
    }]
  }' \
  $SLACK_WEBHOOK_URL

# Update status page
curl -X POST https://api.statuspage.io/v1/pages/PAGE_ID/incidents \
  -H "Authorization: OAuth YOUR_TOKEN" \
  -d "status=investigating" \
  -d "name=GitVan Emergency Rollback In Progress"
```

#### Step 1.3: Capture Current State for Post-Mortem
```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash

INCIDENT_DIR="/tmp/gitvan-incident-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$INCIDENT_DIR"

echo "Capturing state for post-mortem: $INCIDENT_DIR"

# Capture logs
cp /var/log/gitvan/*.log "$INCIDENT_DIR/" 2>/dev/null || true

# Capture health status
curl -s http://localhost:9090/health > "$INCIDENT_DIR/health.json" 2>/dev/null || echo "Health endpoint unavailable" > "$INCIDENT_DIR/health.json"

# Capture process list
ps aux | grep gitvan > "$INCIDENT_DIR/processes.txt"

# Capture system state
df -h > "$INCIDENT_DIR/disk.txt"
free -m > "$INCIDENT_DIR/memory.txt"
uptime > "$INCIDENT_DIR/uptime.txt"

# Capture git state
cd /opt/gitvan
git log -5 --oneline > "$INCIDENT_DIR/git-log.txt"
git status > "$INCIDENT_DIR/git-status.txt"
git rev-parse HEAD > "$INCIDENT_DIR/current-commit.txt"

echo "$INCIDENT_DIR" > /tmp/gitvan-incident-location.txt
echo "State captured: $INCIDENT_DIR"
ls -lh "$INCIDENT_DIR"
REMOTE_SCRIPT
```

**Verification:** State captured. Continue immediately even if capture fails.

---

### PHASE 2: Stop Services (1 minute)

#### Step 2.1: Force Stop All GitVan Services
```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash

echo "=== Force Stopping All Services ==="

# Kill daemon (force)
if pgrep -f "gitvan daemon" > /dev/null; then
  echo "Killing daemon..."
  pkill -9 -f "gitvan daemon" || true
fi

# Kill cron (force)
if pgrep -f "gitvan cron" > /dev/null; then
  echo "Killing cron..."
  pkill -9 -f "gitvan cron" || true
fi

# Kill health server (force)
if lsof -i:9090 > /dev/null 2>&1; then
  echo "Killing health server..."
  kill -9 $(lsof -t -i:9090) || true
fi

# Kill any remaining gitvan processes
pkill -9 -f "gitvan" || true

# Wait for processes to die
sleep 2

# Verify all stopped
if pgrep -f "gitvan" > /dev/null; then
  echo "WARNING: Some processes still running, but continuing..."
  pgrep -af "gitvan"
else
  echo "✓ All services stopped"
fi
REMOTE_SCRIPT
```

**Verification:** Services stopped (or forced). Do NOT wait for clean shutdown.

---

### PHASE 3: Rollback Code (2 minutes)

#### Step 3.1: Revert to Previous Version
```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

cd /opt/gitvan

echo "=== Rolling Back Code ==="

# Get previous commit
if [ -f "/tmp/gitvan-previous-commit.txt" ]; then
  PREVIOUS_COMMIT=$(cat /tmp/gitvan-previous-commit.txt)
  echo "Rolling back to: $PREVIOUS_COMMIT"
else
  echo "ERROR: Previous commit not found!"
  echo "Attempting to rollback to previous tag..."
  PREVIOUS_COMMIT=$(git describe --tags --abbrev=0 HEAD~1)
  echo "Using previous tag: $PREVIOUS_COMMIT"
fi

# Hard reset to previous version
git reset --hard "$PREVIOUS_COMMIT"

# Verify rollback
CURRENT=$(git rev-parse HEAD)
if [ "$CURRENT" = "$PREVIOUS_COMMIT" ]; then
  echo "✓ Code rolled back successfully"
  echo "✓ Current commit: $CURRENT"
else
  echo "ERROR: Rollback verification failed!"
  echo "Expected: $PREVIOUS_COMMIT"
  echo "Got: $CURRENT"
  exit 1
fi

# Log rollback
git log -1 --oneline
REMOTE_SCRIPT
```

**Verification:** Git commit matches previous version.

**Failure Recovery:** If git reset fails, restore from backup (see Step 3.3).

#### Step 3.2: Restore Dependencies
```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

cd /opt/gitvan

echo "=== Restoring Dependencies ==="

# Remove new dependencies
rm -rf node_modules/

# Restore from backup if available, otherwise install
BACKUP_LOCATION=$(cat /tmp/gitvan-backup-location.txt 2>/dev/null || echo "")

if [ -n "$BACKUP_LOCATION" ] && [ -f "$BACKUP_LOCATION/gitvan-installation.tar.gz" ]; then
  echo "Restoring from backup..."
  cd /opt
  tar -xzf "$BACKUP_LOCATION/gitvan-installation.tar.gz"
  cd /opt/gitvan
  echo "✓ Restored from backup"
else
  echo "No backup found, running npm install..."
  npm install --production
  echo "✓ Dependencies installed"
fi

# Verify key dependencies
npm ls bree --depth=0 || echo "WARNING: bree not found"
npm ls citty --depth=0 || echo "WARNING: citty not found"
REMOTE_SCRIPT
```

#### Step 3.3: Restore Build Artifacts
```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

cd /opt/gitvan

echo "=== Restoring Build ==="

# If backup has build, use it
BACKUP_LOCATION=$(cat /tmp/gitvan-backup-location.txt 2>/dev/null || echo "")

if [ -n "$BACKUP_LOCATION" ] && [ -f "$BACKUP_LOCATION/gitvan-installation.tar.gz" ]; then
  echo "Build restored from backup"
else
  echo "Rebuilding..."
  rm -rf dist/
  npm run build
  chmod +x dist/bin/gitvan.mjs
fi

# Verify build
if [ ! -f "dist/bin/gitvan.mjs" ]; then
  echo "ERROR: Build verification failed"
  exit 1
fi

echo "✓ Build restored"
ls -lh dist/bin/
REMOTE_SCRIPT
```

---

### PHASE 4: Restore Configuration (30 seconds)

#### Step 4.1: Restore Previous Configuration
```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

cd /opt/gitvan

echo "=== Restoring Configuration ==="

# Configuration is in git, so already restored
# Just verify it's correct

if [ -f "gitvan.config.js" ]; then
  echo "✓ Configuration file present"
else
  echo "ERROR: Configuration file missing"
  exit 1
fi

# Verify environment variables still correct
if [ -f "/etc/gitvan/env.sh" ]; then
  echo "✓ Environment variables present"
else
  echo "WARNING: Environment variables file missing"
fi
REMOTE_SCRIPT
```

---

### PHASE 5: Restart Services (1 minute)

#### Step 5.1: Start Health Check Server
```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

cd /opt/gitvan
source /etc/gitvan/env.sh 2>/dev/null || true

echo "=== Starting Health Check Server ==="

# Start health check in background
nohup node -e "
import { HealthCheckManager } from './src/core/health-check.mjs';
const hc = new HealthCheckManager({ port: 9090, host: '0.0.0.0' });
await hc.start();
console.log('Health check server started after rollback');
" > /var/log/gitvan/health-check.log 2>&1 &

sleep 3

# Verify started
if lsof -i:9090 > /dev/null 2>&1; then
  echo "✓ Health check server started"
else
  echo "ERROR: Health check server failed to start"
  cat /var/log/gitvan/health-check.log
  exit 1
fi
REMOTE_SCRIPT
```

#### Step 5.2: Start GitVan Daemon
```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

cd /opt/gitvan
source /etc/gitvan/env.sh 2>/dev/null || true

echo "=== Starting GitVan Daemon ==="

# Start daemon
./dist/bin/gitvan.mjs daemon start

sleep 5

# Verify daemon started
if pgrep -f "gitvan daemon" > /dev/null; then
  echo "✓ Daemon started"
  ./dist/bin/gitvan.mjs daemon status
else
  echo "ERROR: Daemon failed to start"
  exit 1
fi
REMOTE_SCRIPT
```

**Verification:** Services running.

**Failure Recovery:** If services fail to start, this is CRITICAL. Escalate immediately and restore from full backup.

---

### PHASE 6: Verify Rollback (1 minute)

#### Step 6.1: Health Check Verification
```bash
# Wait 30 seconds for stabilization
sleep 30

echo "=== Verifying Rollback Health ==="

# Check health multiple times
for i in {1..3}; do
  echo "Health check $i/3..."
  HEALTH=$(curl -sf http://prod-server:9090/health)

  STATUS=$(echo "$HEALTH" | jq -r '.status')
  echo "Status: $STATUS"

  if [ "$STATUS" = "healthy" ]; then
    echo "✓ Health check $i passed"
  else
    echo "✗ Health check $i failed"
    echo "$HEALTH" | jq .
  fi

  sleep 10
done
```

**Verification:** At least 2 out of 3 health checks pass.

**Failure Recovery:** If health checks still fail after rollback, this indicates a deeper issue. Emergency escalation required.

#### Step 6.2: Functional Verification
```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash

cd /opt/gitvan
source /etc/gitvan/env.sh 2>/dev/null || true

echo "=== Functional Verification ==="

# Test CLI
echo "Test 1: CLI version..."
./dist/bin/gitvan.mjs --version || echo "CLI version check failed"

# Test daemon status
echo "Test 2: Daemon status..."
./dist/bin/gitvan.mjs daemon status || echo "Daemon status check failed"

# Test basic operations
echo "Test 3: Job listing..."
./dist/bin/gitvan.mjs cron list || echo "Job listing failed"

echo "✓ Functional verification complete"
REMOTE_SCRIPT
```

#### Step 6.3: Calculate Rollback Time
```bash
ROLLBACK_END=$(date +%s)
ROLLBACK_DURATION=$((ROLLBACK_END - ROLLBACK_START))
ROLLBACK_MINUTES=$((ROLLBACK_DURATION / 60))
ROLLBACK_SECONDS=$((ROLLBACK_DURATION % 60))
echo "Rollback completed in: ${ROLLBACK_MINUTES}m ${ROLLBACK_SECONDS}s"

if [ "$ROLLBACK_DURATION" -gt 600 ]; then
  echo "WARNING: Rollback exceeded 10 minutes target"
fi
```

---

### PHASE 7: Post-Rollback Communication (30 seconds)

#### Step 7.1: Send Rollback Complete Notification
```bash
curl -X POST -H 'Content-type: application/json' \
  --data "{
    \"text\":\"✅ GitVan v4.0.0 ROLLBACK COMPLETE\",
    \"attachments\":[{
      \"color\":\"warning\",
      \"fields\":[
        {\"title\":\"Duration\",\"value\":\"${ROLLBACK_MINUTES}m ${ROLLBACK_SECONDS}s\",\"short\":true},
        {\"title\":\"Status\",\"value\":\"Services restored\",\"short\":true},
        {\"title\":\"Version\",\"value\":\"v3.x (previous)\",\"short\":true},
        {\"title\":\"Health\",\"value\":\"[Status]\",\"short\":true}
      ],
      \"text\":\"@channel Rollback complete. System restored to previous version. Post-mortem to follow.\"
    }]
  }" \
  $SLACK_WEBHOOK_URL

# Update status page
curl -X POST https://api.statuspage.io/v1/pages/PAGE_ID/incidents \
  -H "Authorization: OAuth YOUR_TOKEN" \
  -d "status=resolved" \
  -d "name=GitVan Emergency Rollback Complete - Service Restored"

# Send email
cat > rollback-notification.txt << EOF
Subject: [RESOLVED] GitVan v4.0.0 Rollback Complete

The emergency rollback of GitVan v4.0.0 has been completed successfully.

Rollback Duration: ${ROLLBACK_MINUTES}m ${ROLLBACK_SECONDS}s
Completed At: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

Status: Services restored to previous version (v3.x)
Health Check: [Status]

A post-mortem meeting will be scheduled to analyze the root cause and prevent future occurrences.

Operations Team
EOF

mail -s "[RESOLVED] GitVan Rollback Complete" stakeholders@company.com < rollback-notification.txt
```

---

## Post-Rollback Activities

### Step 8: Document Rollback
```bash
cat > rollback-report-v4.0.0.md << EOF
# GitVan v4.0.0 Rollback Report

## Rollback Summary
- **Rollback Date**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
- **Rollback Duration**: ${ROLLBACK_MINUTES}m ${ROLLBACK_SECONDS}s
- **Decision Made By**: [Name]
- **Executed By**: [Name]

## Rollback Trigger
- **Severity**: [P1/P2/P3/P4]
- **Reason**: [Detailed reason]
- **Time of Incident**: [Time when issue discovered]

## Issues Encountered
### Critical Issues
[List critical issues that triggered rollback]

### Supporting Issues
[List additional issues discovered]

## Rollback Procedure
- **Phase 1 - Initiate**: [Duration]
- **Phase 2 - Stop Services**: [Duration]
- **Phase 3 - Rollback Code**: [Duration]
- **Phase 4 - Restore Config**: [Duration]
- **Phase 5 - Restart Services**: [Duration]
- **Phase 6 - Verify**: [Duration]
- **Phase 7 - Communicate**: [Duration]

## Verification Results
- Health checks: [Pass/Fail]
- Functional tests: [Pass/Fail]
- Services running: [Yes/No]

## Data Impact
- **Data Loss**: [Yes/No - Details]
- **Data Corruption**: [Yes/No - Details]
- **Transactions Lost**: [Count]

## User Impact
- **Users Affected**: [Count]
- **Duration of Impact**: [Duration]
- **Impact Level**: [Critical/High/Medium/Low]

## Incident Data Location
Captured state: $(cat /tmp/gitvan-incident-location.txt 2>/dev/null || echo "N/A")

## Root Cause (Preliminary)
[Initial analysis - full post-mortem to follow]

## Next Steps
- [ ] Schedule post-mortem meeting
- [ ] Analyze root cause thoroughly
- [ ] Fix issues discovered
- [ ] Update runbooks with lessons learned
- [ ] Plan re-deployment strategy

## Sign-off
- **Deployment Lead**: ___________
- **Operations Lead**: ___________
- **Engineering Manager**: ___________

Date: $(date -u +"%Y-%m-%d")
EOF

cat rollback-report-v4.0.0.md
```

### Step 9: Schedule Post-Mortem
```bash
cat > post-mortem-agenda.md << 'EOF'
# GitVan v4.0.0 Deployment Failure - Post-Mortem Agenda

## Meeting Details
- **Date**: [Schedule within 48 hours]
- **Duration**: 90 minutes
- **Attendees**:
  - Deployment Lead
  - Operations Team
  - Development Team
  - QA Team
  - Engineering Manager

## Agenda

### 1. Timeline Review (15 min)
- When was issue first detected?
- What symptoms were observed?
- When was rollback decision made?
- How long did rollback take?

### 2. Root Cause Analysis (30 min)
- What was the primary root cause?
- What were contributing factors?
- Why wasn't this caught in testing?
- Why wasn't this caught in staging?

### 3. Impact Assessment (15 min)
- User impact (count, duration)
- Data impact (loss, corruption)
- Business impact (revenue, reputation)
- Team impact (stress, morale)

### 4. What Went Wrong (20 min)
- Testing gaps
- Staging environment differences
- Monitoring blind spots
- Runbook gaps
- Communication issues

### 5. What Went Right (10 min)
- What worked well in rollback?
- What saved us from worse outcome?
- What should we keep doing?

### 6. Action Items (10 min)
- Immediate fixes needed
- Testing improvements
- Process improvements
- Runbook updates
- Re-deployment plan

## Output
- Post-mortem document
- Action items with owners and dates
- Lessons learned for team
EOF

cat post-mortem-agenda.md
```

### Step 10: Analyze Incident Data
```bash
# Review captured incident data
INCIDENT_LOCATION=$(cat /tmp/gitvan-incident-location.txt 2>/dev/null)

if [ -n "$INCIDENT_LOCATION" ]; then
  echo "=== Incident Data Analysis ==="
  echo "Location: $INCIDENT_LOCATION"

  # Copy incident data locally for analysis
  scp -r prod-server:"$INCIDENT_LOCATION" ./incident-data-v4-rollback/

  echo "Incident data copied to: ./incident-data-v4-rollback/"
  echo "Review logs and state for root cause analysis"
fi
```

---

## Alternative Rollback Methods

### Method A: Full Backup Restore (If Code Rollback Fails)
```bash
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

BACKUP_LOCATION=$(cat /tmp/gitvan-backup-location.txt)

echo "=== Full Backup Restore ==="
echo "Backup: $BACKUP_LOCATION"

# Stop all services
pkill -9 -f "gitvan" || true

# Remove current installation
rm -rf /opt/gitvan.failed
mv /opt/gitvan /opt/gitvan.failed

# Restore from backup
cd /opt
tar -xzf "$BACKUP_LOCATION/gitvan-installation.tar.gz"

# Restore data if needed
if [ -f "$BACKUP_LOCATION/gitvan-data.tar.gz" ]; then
  cd /var/lib
  tar -xzf "$BACKUP_LOCATION/gitvan-data.tar.gz"
fi

# Restore configuration
if [ -d "$BACKUP_LOCATION/gitvan" ]; then
  cp -r "$BACKUP_LOCATION/gitvan/"* /etc/gitvan/ 2>/dev/null || true
fi

echo "✓ Full backup restored"

# Start services
cd /opt/gitvan
./dist/bin/gitvan.mjs daemon start
REMOTE_SCRIPT
```

### Method B: Cold Start from Clean State
```bash
# If all else fails, deploy previous version from scratch
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

echo "=== Cold Start Deployment ==="

# Stop and remove current
pkill -9 -f "gitvan" || true
rm -rf /opt/gitvan.failed
mv /opt/gitvan /opt/gitvan.failed

# Clone fresh from repository
cd /opt
git clone [repository-url] gitvan
cd gitvan
git checkout [previous-stable-tag]

# Install and build
npm install --production
npm run build

# Start services
./dist/bin/gitvan.mjs daemon start

echo "✓ Cold start complete"
REMOTE_SCRIPT
```

---

## Preventing Future Rollbacks

### Checklist for Next Deployment
- [ ] More thorough staging testing
- [ ] Longer staging soak time (72 hours)
- [ ] Load testing on staging
- [ ] Canary deployment strategy
- [ ] Feature flags for risky changes
- [ ] More granular health checks
- [ ] Automated rollback triggers
- [ ] Better monitoring alerts

### Process Improvements
- [ ] Enhance pre-deployment checklist
- [ ] Add more smoke tests
- [ ] Improve staging environment parity
- [ ] Add chaos engineering tests
- [ ] Enhance rollback automation
- [ ] Improve team training

---

## Success Criteria

Rollback is successful when:
- [ ] Rollback completed in < 10 minutes
- [ ] Services running and stable
- [ ] Health checks passing
- [ ] No data loss or corruption
- [ ] Previous functionality restored
- [ ] Team notified of completion
- [ ] Incident data captured for analysis

---

## Contacts

### Emergency Rollback Team
- **Rollback Lead**: [Name] - [Phone] - [Email]
- **Operations Engineer**: [Name] - [Phone] - [Email]
- **Database Admin** (if applicable): [Name] - [Phone] - [Email]

### Escalation
- **Engineering Manager**: [Name] - [Phone] - [Email]
- **CTO**: [Name] - [Phone] - [Email]

### 24/7 Hotline
- **Emergency**: [Phone]

---

## References

- [02-DEPLOYMENT-RUNBOOK.md](./02-DEPLOYMENT-RUNBOOK.md)
- [03-POST-DEPLOYMENT-RUNBOOK.md](./03-POST-DEPLOYMENT-RUNBOOK.md)
- [07-INCIDENT-RESPONSE-RUNBOOK.md](./07-INCIDENT-RESPONSE-RUNBOOK.md)
- [Post-Mortem Template](/docs/operations/templates/post-mortem-template.md)

---

**Document Version**: 1.0
**Last Updated**: 2026-01-08
**Owner**: Operations Team
**Review Cycle**: After each rollback (lessons learned)
**Emergency Contact**: [Primary contact for this runbook]
