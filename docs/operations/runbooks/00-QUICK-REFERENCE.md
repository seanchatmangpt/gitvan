# GitVan v4.0.0 Deployment - Quick Reference Guide

**Print this page and keep it handy during deployment!**

---

## Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| **Deployment Lead** | [NAME] | [PHONE] | [EMAIL] |
| **Operations Engineer** | [NAME] | [PHONE] | [EMAIL] |
| **On-Call Developer** | [NAME] | [PHONE] | [EMAIL] |
| **Engineering Manager** | [NAME] | [PHONE] | [EMAIL] |
| **Emergency Hotline** | N/A | [PHONE] | N/A |

---

## Critical URLs

- **Health Check**: `http://prod-server:9090/health`
- **Status Page**: `https://status.company.com`
- **Monitoring**: `https://monitoring.company.com/gitvan`
- **Runbooks**: `/home/user/gitvan/docs/operations/runbooks/`
- **War Room**: `#incident-response` (Slack)

---

## Quick Health Check

```bash
# One-liner health check
curl -sf http://prod-server:9090/health | jq '{status, uptime, errors: .checks.errors.errorCount}'

# Expected output:
# {
#   "status": "healthy",
#   "uptime": 123456,
#   "errors": 0
# }
```

---

## Deployment Timeline (40 minutes)

| Phase | Duration | Action |
|-------|----------|--------|
| **1. Pre-Deployment** | 5 min | Validate, backup |
| **2. Stop Services** | 2 min | Stop daemon |
| **3. Deploy Code** | 10 min | Git, npm, build |
| **4. Configuration** | 3 min | Update config |
| **5. Database** | 0 min | N/A (Git-native) |
| **6. Start Services** | 5 min | Start daemon |
| **7. Health Checks** | 5 min | Verify health |
| **8. Smoke Tests** | 10 min | Run tests |

---

## Rollback Decision Matrix

| Situation | Action |
|-----------|--------|
| Services won't start | **ROLLBACK** |
| Health checks fail | **ROLLBACK** |
| Smoke tests fail | **ROLLBACK** |
| Error rate > 50/min | **ROLLBACK** |
| Performance > 50% slower | Consider rollback |
| Minor bugs | Fix forward |

**Rollback Time: 5 minutes**
**Command**: See [04-ROLLBACK-RUNBOOK.md](./04-ROLLBACK-RUNBOOK.md)

---

## Common Commands

```bash
# Check daemon status
ssh prod-server "gitvan daemon status"

# Check health
curl http://prod-server:9090/health | jq .

# View logs
ssh prod-server "tail -50 /var/log/gitvan/application.log"

# List jobs
ssh prod-server "cd /opt/gitvan && ./dist/bin/gitvan.mjs cron list"

# Emergency stop
ssh prod-server "pkill -9 -f gitvan"

# Emergency start
ssh prod-server "cd /opt/gitvan && ./dist/bin/gitvan.mjs daemon start"

# Quick diagnostics
bash /usr/local/bin/gitvan-diagnostics.sh
```

---

## Severity Levels

### P1 - Critical (Page immediately)
- Services completely down
- Data loss/corruption
- Security breach
- **Response**: < 5 minutes
- **Updates**: Every 15 minutes

### P2 - High (Notify on-call)
- Major functionality broken
- High error rate
- Significant degradation
- **Response**: < 15 minutes
- **Updates**: Every 30 minutes

### P3 - Medium (Email on-call)
- Minor issues, workaround available
- **Response**: < 1 hour
- **Updates**: Every 4 hours

---

## Rollback Quick Start

```bash
# 1. Stop services (1 min)
ssh prod-server "pkill -9 -f gitvan"

# 2. Rollback code (2 min)
ssh prod-server "cd /opt/gitvan && git reset --hard $(cat /tmp/gitvan-previous-commit.txt)"

# 3. Restore dependencies (1 min)
BACKUP=$(ssh prod-server "cat /tmp/gitvan-backup-location.txt")
ssh prod-server "cd /opt && tar -xzf $BACKUP/gitvan-installation.tar.gz"

# 4. Restart services (1 min)
ssh prod-server "cd /opt/gitvan && ./dist/bin/gitvan.mjs daemon start"

# 5. Verify (30 seconds)
curl http://prod-server:9090/health | jq .
```

---

## Communication Quick Reference

### Slack Alerts
```bash
# Send alert
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"[MESSAGE]"}' \
  $SLACK_WEBHOOK_URL
```

### Status Page Update
```bash
# Update status
curl -X POST https://api.statuspage.io/v1/pages/PAGE_ID/incidents \
  -H "Authorization: OAuth YOUR_TOKEN" \
  -d "status=[investigating|resolved]"
```

### Email Template
```
Subject: [P1/P2] GitVan Issue
Status: [Investigating/Resolved]
Impact: [Description]
ETA: [Time]
Updates: Every [15/30/60] minutes
```

---

## Pre-Deployment Checklist (Last Minute)

- [ ] All tests passing
- [ ] Backup created
- [ ] Team assembled
- [ ] Stakeholders notified
- [ ] Monitoring dashboards open
- [ ] War room ready
- [ ] Rollback plan reviewed
- [ ] Previous commit SHA saved

---

## Post-Deployment Checklist (First Hour)

- [ ] Health checks passing (5 checks)
- [ ] Error count < 5
- [ ] Services stable (no crashes)
- [ ] Smoke tests passed
- [ ] Performance baseline acceptable
- [ ] T+1 hour update sent

---

## Key Files Locations

```bash
# Runbooks
/home/user/gitvan/docs/operations/runbooks/

# Health check source
/home/user/gitvan/src/core/health-check.mjs

# Logs
/var/log/gitvan/*.log

# Backups
/backups/gitvan/

# Config
/opt/gitvan/gitvan.config.js
/etc/gitvan/env.sh

# GitVan installation
/opt/gitvan/
```

---

## Escalation Path

1. **On-Call Engineer** → Issue detected, initial response
2. **Engineering Manager** → Issue > 30 min or P1
3. **Director of Engineering** → Issue > 1 hour or data loss
4. **CTO** → Security breach or major business impact
5. **CEO** → Revenue impact or PR crisis

---

## Decision Trees

### Should I Rollback?

```
┌─────────────────────────────────────┐
│ Services won't start?               │
└─────────────┬───────────────────────┘
              │ YES → ROLLBACK
              │ NO
              ▼
┌─────────────────────────────────────┐
│ Health checks failing > 5 min?      │
└─────────────┬───────────────────────┘
              │ YES → ROLLBACK
              │ NO
              ▼
┌─────────────────────────────────────┐
│ Error rate > 50/min?                │
└─────────────┬───────────────────────┘
              │ YES → ROLLBACK
              │ NO
              ▼
┌─────────────────────────────────────┐
│ Can fix in < 5 minutes?             │
└─────────────┬───────────────────────┘
              │ NO → ROLLBACK
              │ YES → FIX FORWARD
              ▼
           CONTINUE
```

### Who Do I Call?

```
┌─────────────────────────────────────┐
│ Services completely down?           │
└─────────────┬───────────────────────┘
              │ YES → Page On-Call + Management
              │ NO
              ▼
┌─────────────────────────────────────┐
│ Major functionality broken?         │
└─────────────┬───────────────────────┘
              │ YES → Call On-Call
              │ NO
              ▼
┌─────────────────────────────────────┐
│ Minor issue, workaround available?  │
└─────────────┬───────────────────────┘
              │ YES → Email On-Call
              │ NO → Escalate
```

---

## Monitoring Quick Checks

```bash
# System resources
ssh prod-server "top -bn1 | head -20"
ssh prod-server "free -m"
ssh prod-server "df -h"

# GitVan processes
ssh prod-server "pgrep -af gitvan"

# Recent errors
ssh prod-server "grep -i error /var/log/gitvan/*.log | tail -20"

# Performance
curl -s http://prod-server:9090/health | jq '{
  status,
  uptime,
  git: .checks.git.status,
  cron: .checks.cron.status,
  events: .checks.events.status,
  errors: .checks.errors.errorCount
}'
```

---

## Remember

✅ **Stay calm** - You have runbooks and backups
✅ **Communicate often** - Every 15 minutes during issues
✅ **Trust the process** - Follow runbooks step-by-step
✅ **Document everything** - Notes help post-mortem
✅ **Ask for help** - Escalate early if unsure
✅ **Backup first** - Always before making changes

---

## Full Runbooks

1. [01-PRE-DEPLOYMENT-RUNBOOK.md](./01-PRE-DEPLOYMENT-RUNBOOK.md)
2. [02-DEPLOYMENT-RUNBOOK.md](./02-DEPLOYMENT-RUNBOOK.md)
3. [03-POST-DEPLOYMENT-RUNBOOK.md](./03-POST-DEPLOYMENT-RUNBOOK.md)
4. [04-ROLLBACK-RUNBOOK.md](./04-ROLLBACK-RUNBOOK.md)
5. [05-MONITORING-RUNBOOK.md](./05-MONITORING-RUNBOOK.md)
6. [06-SUPPORT-RUNBOOK.md](./06-SUPPORT-RUNBOOK.md)
7. [07-INCIDENT-RESPONSE-RUNBOOK.md](./07-INCIDENT-RESPONSE-RUNBOOK.md)
8. [08-COMMUNICATION-RUNBOOK.md](./08-COMMUNICATION-RUNBOOK.md)

---

**Print Date**: _____________
**Deployment Date**: _____________
**On-Call Today**: _____________

**Keep this guide accessible during deployment!**
