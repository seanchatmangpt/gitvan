# Pre-Deployment Runbook - GitVan v4.0.0

## Objective
Ensure all systems, teams, and infrastructure are prepared for GitVan v4.0.0 production deployment with zero surprises and maximum readiness.

## Scope
This runbook covers all preparation activities from T-7 days (one week before deployment) through T-1 hour (immediately before deployment starts).

## Timeline
- **T-7 days**: Initial preparation phase
- **T-3 days**: Validation and rehearsal phase
- **T-1 day**: Final readiness confirmation
- **T-1 hour**: Go/No-Go decision

---

## Prerequisites

### Required Resources
- [ ] Deployment lead assigned
- [ ] Operations team on-call schedule confirmed
- [ ] Development team availability confirmed (48hr post-deployment)
- [ ] Stakeholder notification list updated
- [ ] Emergency rollback team identified

### Required Access
- [ ] Production server SSH/admin access
- [ ] Git repository write access
- [ ] NPM registry publish access (if publishing)
- [ ] Monitoring system access (dashboards, alerts)
- [ ] Communication channels (Slack, email, status page)

### Required Tools
- [ ] Node.js 18+ installed on all servers
- [ ] Git 2.35+ installed
- [ ] Health check scripts tested
- [ ] Backup tools verified
- [ ] Monitoring agents configured

---

## T-7 Days: Initial Preparation Phase

### Step 1: Codebase Validation

**1.1 Verify Release Branch**
```bash
cd /home/user/gitvan
git checkout main
git pull origin main
git log -5 --oneline

# Verify latest commit includes v4.0.0 changes
git show HEAD --stat

# Expected: Should see commit 30c8f54 or later
```

**Verification:** Latest commit should be "feat(v4.0.0): Complete 10-agent release implementation initiative" or newer.

**1.2 Run Complete Test Suite**
```bash
# Unit tests
npm test

# Coverage check (must be >= 80%)
npm run test:coverage

# BDD tests
npm run test:bdd 2>&1 | tee test-results-bdd.log

# Integration tests
npm run test:integration 2>&1 | tee test-results-integration.log
```

**Verification:**
- All tests passing
- Coverage >= 80% (branches, functions, lines, statements)
- No test timeouts or flakes
- Save logs for pre-deployment record

**1.3 Build Verification**
```bash
# Clean build
rm -rf dist/ node_modules/
npm install
npm run build

# Verify build artifacts
ls -lh dist/
ls -lh dist/bin/

# Test built CLI
node dist/bin/gitvan.mjs --version
node dist/bin/gitvan.mjs --help
```

**Verification:**
- Build completes without errors
- Artifacts present in dist/
- CLI executable responds correctly

### Step 2: Dependency Audit

**2.1 Security Audit**
```bash
# Run npm audit
npm audit 2>&1 | tee security-audit.log

# Check for critical/high vulnerabilities
npm audit --audit-level=high

# If vulnerabilities found, document and create plan
```

**Verification:** Zero critical/high vulnerabilities or documented mitigation plan for each.

**2.2 Dependency License Check**
```bash
# Check all dependency licenses
npm ls --depth=0

# Verify no license conflicts with Apache-2.0
# Document any GPL/AGPL dependencies
```

**Verification:** All dependencies have compatible licenses.

**2.3 Dependency Version Lock**
```bash
# Generate fresh package-lock.json
rm package-lock.json
npm install
git add package-lock.json
git commit -m "chore: lock dependencies for v4.0.0 release"
```

**Verification:** package-lock.json committed and pushed.

### Step 3: Documentation Validation

**3.1 README Accuracy**
```bash
# Validate README commands
node validate-readme-commands.mjs

# Manual review checklist:
# [ ] Installation instructions accurate
# [ ] Quick start works
# [ ] Examples are current
# [ ] Version number correct (v4.0.0)
# [ ] Links functional
```

**3.2 API Documentation**
```bash
# Check key documentation files exist and are current
ls -l docs/DEPLOYMENT.md
ls -l docs/migration/v4-migration-guide.md
ls -l CLAUDE.md
ls -l CHANGELOG.md

# Verify CHANGELOG.md has v4.0.0 entry
grep "v4.0.0" CHANGELOG.md
```

**Verification:** All documentation up-to-date with v4.0.0 changes.

### Step 4: Configuration Review

**4.1 Review Production Config**
```bash
# Review gitvan.config.js
cat gitvan.config.js

# Checklist:
# [ ] Jobs directory correct
# [ ] Templates configuration appropriate
# [ ] Receipt ref configured
# [ ] Policy settings reviewed (requireSignedCommits, etc.)
# [ ] Graph configuration validated
# [ ] No hardcoded test values (now() function)
```

**4.2 Environment Variables Documentation**
Create `.env.example` for production:
```bash
cat > .env.example << 'EOF'
# GitVan v4.0.0 Production Configuration

# Core Configuration
NODE_ENV=production
GITVAN_HOME=/var/lib/gitvan
GITVAN_REPO=/var/lib/gitvan/repo
GITVAN_LOG_LEVEL=info

# Timezone and Locale
TZ=UTC
LANG=C

# AI Provider (optional)
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_api_key_here

# Health Check Server
HEALTH_CHECK_PORT=9090
HEALTH_CHECK_HOST=0.0.0.0

# Performance Monitoring
ENABLE_PERFORMANCE_MONITORING=true
PERFORMANCE_SAMPLE_RATE=1.0
EOF
```

**4.3 Review Security Settings**
```bash
# Check security audit report
cat docs/SECURITY_AUDIT_REPORT.md | grep -A 10 "Critical Issues"

# Verify security fixes applied
git log --grep="security" --oneline -10
```

### Step 5: Backup Strategy Preparation

**5.1 Create Pre-Deployment Backup Script**
```bash
cat > scripts/pre-deployment-backup.sh << 'EOF'
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/backups/gitvan/pre-v4-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "Creating pre-deployment backup to $BACKUP_DIR"

# Backup code
tar -czf "$BACKUP_DIR/gitvan-code.tar.gz" -C /home/user gitvan/

# Backup data (if any)
if [ -d "/var/lib/gitvan" ]; then
  tar -czf "$BACKUP_DIR/gitvan-data.tar.gz" -C /var/lib gitvan/
fi

# Backup configs
cp /etc/gitvan/* "$BACKUP_DIR/" 2>/dev/null || true

# Backup database (if any)
# pg_dump gitvan > "$BACKUP_DIR/gitvan-db.sql" 2>/dev/null || true

# Create backup manifest
cat > "$BACKUP_DIR/manifest.txt" << MANIFEST
Backup Date: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
GitVan Version: $(node dist/bin/gitvan.mjs --version 2>/dev/null || echo "unknown")
Git Commit: $(git rev-parse HEAD)
Git Branch: $(git branch --show-current)
Hostname: $(hostname)
User: $(whoami)
MANIFEST

echo "Backup complete: $BACKUP_DIR"
ls -lh "$BACKUP_DIR"
EOF

chmod +x scripts/pre-deployment-backup.sh
```

**5.2 Test Backup Script**
```bash
# Dry-run backup
./scripts/pre-deployment-backup.sh

# Verify backup created
ls -lh /backups/gitvan/

# Test restore process (on test system)
# Document restore procedure
```

### Step 6: Monitoring Setup

**6.1 Configure Health Check Endpoints**
```bash
# Verify health check system
cat src/core/health-check.mjs | grep -A 5 "class HealthCheckManager"

# Test health check locally
node -e "
import { HealthCheckManager } from './src/core/health-check.mjs';
const hc = new HealthCheckManager({ port: 9091 });
await hc.start();
console.log('Health check started on port 9091');
setTimeout(() => hc.stop(), 1000);
"

# Verify endpoints respond
curl http://localhost:9091/health
curl http://localhost:9091/health/live
curl http://localhost:9091/health/ready
```

**6.2 Configure Monitoring Alerts**
Create alert configuration:
```yaml
# monitoring-alerts.yml
alerts:
  - name: gitvan_health_check_failed
    condition: health_status != "healthy"
    severity: critical
    notification: pagerduty

  - name: gitvan_high_error_rate
    condition: error_count > 10 in 5m
    severity: high
    notification: slack

  - name: gitvan_slow_performance
    condition: p95_latency > 500ms
    severity: medium
    notification: slack

  - name: gitvan_cron_scheduler_down
    condition: cron_status != "running"
    severity: high
    notification: pagerduty
```

**6.3 Dashboard Preparation**
```bash
# Document dashboard URLs
cat > docs/operations/dashboard-urls.md << 'EOF'
# GitVan v4.0.0 Monitoring Dashboards

## Health Checks
- Production: http://prod-server:9090/health
- Staging: http://staging-server:9090/health

## Monitoring
- Grafana: https://monitoring.company.com/gitvan
- Prometheus: https://prometheus.company.com
- Logs: https://logs.company.com/gitvan

## Application
- Status Page: https://status.company.com
- Admin Panel: https://gitvan.company.com/admin
EOF
```

### Step 7: Team Briefing

**7.1 Schedule Pre-Deployment Meeting**
Agenda:
- [ ] Review deployment timeline
- [ ] Review runbooks (deployment, rollback)
- [ ] Assign roles and responsibilities
- [ ] Review communication plan
- [ ] Review rollback criteria
- [ ] Q&A session

**7.2 Distribute Pre-Deployment Checklist**
Send to all team members:
```markdown
# GitVan v4.0.0 Pre-Deployment Checklist - Your Role

## [Role: Deployment Lead]
- [ ] All runbooks reviewed
- [ ] Go/No-Go criteria defined
- [ ] Communication plan ready
- [ ] Rollback team identified

## [Role: Operations Engineer]
- [ ] Server access verified
- [ ] Monitoring configured
- [ ] Health checks tested
- [ ] On-call schedule confirmed

## [Role: Developer]
- [ ] Code review complete
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Available for 48hr support

## [Role: QA Engineer]
- [ ] Smoke tests prepared
- [ ] Test data ready
- [ ] Validation scripts ready
```

---

## T-3 Days: Validation and Rehearsal Phase

### Step 8: Staging Deployment Rehearsal

**8.1 Deploy to Staging**
```bash
# On staging server
cd /opt/gitvan-staging
git fetch origin
git checkout main
git reset --hard origin/main

# Run full deployment procedure (from deployment runbook)
npm install
npm run build
npm test

# Start services
./scripts/stop-gitvan.sh || true
./scripts/start-gitvan.sh

# Wait 10 seconds
sleep 10

# Verify health
curl http://localhost:9090/health | jq .
```

**8.2 Run Smoke Tests on Staging**
```bash
# Test CLI
gitvan --version
gitvan --help

# Test daemon
gitvan daemon start
sleep 5
gitvan daemon status
gitvan daemon stop

# Test cron
gitvan cron list
gitvan cron dry-run

# Test events
gitvan event list

# Test health
curl http://localhost:9090/health/ready | jq .
```

**Verification:** All smoke tests pass on staging.

**8.3 Performance Baseline on Staging**
```bash
# Capture performance metrics
curl http://localhost:9090/health | jq . > staging-performance-baseline.json

# Run load test
ab -n 1000 -c 10 http://localhost:9090/health

# Document results
echo "Staging Performance Baseline: $(date)" >> staging-baseline.log
cat staging-performance-baseline.json >> staging-baseline.log
```

### Step 9: Rollback Rehearsal

**9.1 Practice Rollback on Staging**
```bash
# Simulate failed deployment
git tag -a v4.0.0-rollback-test -m "Rollback rehearsal"

# Execute rollback procedure (from rollback runbook)
./scripts/rollback-to-v3.sh

# Verify services recover
curl http://localhost:9090/health | jq .

# Re-deploy v4 to staging
git checkout main
./scripts/deploy.sh
```

**Verification:** Rollback completes in < 5 minutes, services healthy.

### Step 10: Communication Plan Validation

**10.1 Prepare Communication Templates**
```bash
mkdir -p docs/operations/communications/
```

Create all communication templates (see Communication Runbook section).

**10.2 Test Communication Channels**
```bash
# Send test message to Slack
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"GitVan v4.0.0 deployment test message"}' \
  $SLACK_WEBHOOK_URL

# Test email notifications
echo "Deployment test" | mail -s "GitVan Test" team@company.com

# Test status page update
curl -X POST https://api.statuspage.io/v1/pages/PAGE_ID/incidents \
  -H "Authorization: OAuth YOUR_TOKEN" \
  -d "status=investigating"
```

---

## T-1 Day: Final Readiness Confirmation

### Step 11: Final Validation

**11.1 Re-run All Tests**
```bash
# Clean environment
cd /home/user/gitvan
git pull origin main
rm -rf node_modules dist
npm install

# Complete test suite
npm test 2>&1 | tee final-test-run.log
npm run test:coverage 2>&1 | tee final-coverage.log
npm run test:bdd 2>&1 | tee final-bdd.log

# Verify all passing
grep -i "fail\|error" final-test-run.log && echo "TESTS FAILED" || echo "TESTS PASSED"
```

**Verification:** All tests passing, no regressions.

**11.2 Final Security Check**
```bash
# Re-run security audit
npm audit --audit-level=high

# Check for new CVEs
npm outdated
```

**11.3 Verify Production Environment**
```bash
# SSH to production server
ssh prod-server

# Check system resources
df -h  # Disk space (should have > 10GB free)
free -h  # Memory (should have > 2GB free)
uptime  # Load average (should be < 2.0)

# Check Node.js version
node --version  # Should be >= 18.0.0

# Check Git version
git --version  # Should be >= 2.35.0

# Check network connectivity
ping -c 3 github.com
curl -I https://registry.npmjs.org
```

### Step 12: Deployment Dry-Run

**12.1 Walk Through Deployment Steps**
With the team, manually walk through each step of the deployment runbook without executing. Identify any gaps or questions.

**12.2 Timing Estimate**
Document expected timing for each phase:
- Pre-deployment backup: 5 minutes
- Code deployment: 10 minutes
- Dependency installation: 5 minutes
- Build: 3 minutes
- Service restart: 2 minutes
- Health check validation: 5 minutes
- Smoke tests: 10 minutes

**Total estimated deployment time: 40 minutes**

### Step 13: Go/No-Go Checklist

**13.1 Technical Readiness**
- [ ] All tests passing (100%)
- [ ] Security audit clean
- [ ] Staging deployment successful
- [ ] Rollback rehearsal successful
- [ ] Performance baseline documented
- [ ] Monitoring alerts configured
- [ ] Health check endpoints responding
- [ ] Backup script tested
- [ ] Documentation complete

**13.2 Team Readiness**
- [ ] Deployment lead available
- [ ] Operations team on-call
- [ ] Development team available (48hr)
- [ ] All team members briefed
- [ ] Roles and responsibilities clear
- [ ] Communication channels tested
- [ ] Emergency contacts confirmed

**13.3 Business Readiness**
- [ ] Stakeholders notified
- [ ] Maintenance window scheduled
- [ ] Users notified (if downtime)
- [ ] Support team prepared
- [ ] Status page ready
- [ ] Rollback criteria defined

**13.4 Infrastructure Readiness**
- [ ] Production servers healthy
- [ ] Network stable
- [ ] DNS records correct
- [ ] SSL certificates valid
- [ ] Firewall rules configured
- [ ] Load balancers configured
- [ ] Backup systems verified

---

## T-1 Hour: Go/No-Go Decision

### Step 14: Final Go/No-Go Meeting

**14.1 Review All Checklists**
- Review T-1 Day checklist (Step 13)
- Any red flags or concerns?
- Any new issues discovered?

**14.2 Weather Check**
- [ ] No ongoing production incidents
- [ ] No scheduled maintenance by dependencies (GitHub, NPM, etc.)
- [ ] No major holidays or events
- [ ] Team fully available

**14.3 Make Decision**

**GO Decision Criteria:**
- All technical readiness items checked
- All team readiness items checked
- All business readiness items checked
- All infrastructure readiness items checked
- No critical blockers identified
- Deployment lead approval
- Operations lead approval

**NO-GO Decision Criteria:**
- Any critical technical issue
- Team member unavailability
- Production incident in progress
- Major infrastructure issue
- Stakeholder concern

**14.4 Document Decision**
```bash
cat > deployment-decision.txt << EOF
GitVan v4.0.0 Deployment Go/No-Go Decision

Date: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Decision: [GO / NO-GO]
Deployment Lead: [Name]
Operations Lead: [Name]

Checklist Status:
- Technical: [PASS/FAIL]
- Team: [PASS/FAIL]
- Business: [PASS/FAIL]
- Infrastructure: [PASS/FAIL]

Notes:
[Any additional context]

Signatures:
- Deployment Lead: ___________
- Operations Lead: ___________
- Engineering Manager: ___________
EOF
```

### Step 15: Pre-Deployment Communications

**15.1 Notify Stakeholders**
Send pre-deployment notification (1 hour before):
```
Subject: GitVan v4.0.0 Deployment Starting in 1 Hour

The GitVan v4.0.0 deployment is scheduled to begin at [TIME] UTC.

Deployment Window: [START] - [END] UTC
Expected Duration: 40 minutes
Expected Downtime: None (zero-downtime deployment)

We will provide updates every 15 minutes during deployment.

Status Page: https://status.company.com
```

**15.2 Update Status Page**
```bash
# Update status page to "scheduled maintenance"
curl -X POST https://api.statuspage.io/v1/pages/PAGE_ID/incidents \
  -H "Authorization: OAuth YOUR_TOKEN" \
  -d "status=scheduled" \
  -d "name=GitVan v4.0.0 Deployment" \
  -d "scheduled_for=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

**15.3 Post to Communication Channels**
```bash
# Slack notification
curl -X POST -H 'Content-type: application/json' \
  --data '{
    "text":"🚀 GitVan v4.0.0 deployment starting in 1 hour",
    "attachments":[{
      "color":"warning",
      "text":"Expected duration: 40 minutes\nStatus: https://status.company.com"
    }]
  }' \
  $SLACK_WEBHOOK_URL
```

---

## Success Criteria

Pre-deployment is successful when:
- [ ] All T-7 day tasks completed
- [ ] All T-3 day tasks completed
- [ ] All T-1 day tasks completed
- [ ] Go/No-Go decision made (GO)
- [ ] All stakeholders notified
- [ ] Team assembled and ready
- [ ] Deployment runbook accessible

---

## Rollback Criteria

Abort pre-deployment and delay if:
- Critical test failures discovered
- Security vulnerability found
- Team member unavailability
- Production incident in progress
- Infrastructure instability
- Deployment lead recommends delay

If abort occurs:
1. Notify all stakeholders immediately
2. Document reason for delay
3. Schedule new deployment date
4. Address blocking issues
5. Restart pre-deployment checklist

---

## Contacts

### Deployment Team
- **Deployment Lead**: [Name] - [Phone] - [Email]
- **Operations Lead**: [Name] - [Phone] - [Email]
- **Engineering Lead**: [Name] - [Phone] - [Email]
- **QA Lead**: [Name] - [Phone] - [Email]

### Escalation
- **Engineering Manager**: [Name] - [Phone] - [Email]
- **CTO**: [Name] - [Phone] - [Email]

### On-Call
- **Primary**: [Name] - [Phone] - [Email]
- **Secondary**: [Name] - [Phone] - [Email]

---

## References

- [02-DEPLOYMENT-RUNBOOK.md](./02-DEPLOYMENT-RUNBOOK.md)
- [04-ROLLBACK-RUNBOOK.md](./04-ROLLBACK-RUNBOOK.md)
- [08-COMMUNICATION-RUNBOOK.md](./08-COMMUNICATION-RUNBOOK.md)
- [GitVan v4.0.0 Release Plan](/docs/releases/v4.0.0-release-plan.md)
- [Production Readiness Validation](/docs/PRODUCTION_READINESS_VALIDATION_REPORT.md)

---

**Document Version**: 1.0
**Last Updated**: 2026-01-08
**Owner**: Deployment Team
**Review Cycle**: Before each major release
