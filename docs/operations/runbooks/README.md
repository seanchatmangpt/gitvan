# GitVan v4.0.0 Operational Runbooks

## Overview

This directory contains comprehensive operational runbooks for deploying, monitoring, and maintaining GitVan v4.0.0 in production.

---

## Quick Access

### For Deployment
1. **Start here**: [00-QUICK-REFERENCE.md](./00-QUICK-REFERENCE.md) - Print this!
2. **Pre-deployment**: [01-PRE-DEPLOYMENT-RUNBOOK.md](./01-PRE-DEPLOYMENT-RUNBOOK.md)
3. **Deployment**: [02-DEPLOYMENT-RUNBOOK.md](./02-DEPLOYMENT-RUNBOOK.md)
4. **Post-deployment**: [03-POST-DEPLOYMENT-RUNBOOK.md](./03-POST-DEPLOYMENT-RUNBOOK.md)

### For Incidents
1. **Rollback needed?**: [04-ROLLBACK-RUNBOOK.md](./04-ROLLBACK-RUNBOOK.md)
2. **Incident response**: [07-INCIDENT-RESPONSE-RUNBOOK.md](./07-INCIDENT-RESPONSE-RUNBOOK.md)

### For Operations
1. **Monitoring**: [05-MONITORING-RUNBOOK.md](./05-MONITORING-RUNBOOK.md)
2. **Support**: [06-SUPPORT-RUNBOOK.md](./06-SUPPORT-RUNBOOK.md)
3. **Communication**: [08-COMMUNICATION-RUNBOOK.md](./08-COMMUNICATION-RUNBOOK.md)

---

## Complete Runbook Index

### 00. Quick Reference Guide
**File**: [00-QUICK-REFERENCE.md](./00-QUICK-REFERENCE.md)
**Purpose**: Single-page cheat sheet for deployment
**Print**: Yes - Keep this handy!
**When to use**: Always - Quick access to key info

**Contents:**
- Emergency contacts
- Critical URLs
- Quick health checks
- Deployment timeline
- Rollback decision tree
- Common commands
- Escalation paths

---

### 01. Pre-Deployment Runbook
**File**: [01-PRE-DEPLOYMENT-RUNBOOK.md](./01-PRE-DEPLOYMENT-RUNBOOK.md)
**Purpose**: Prepare for deployment (T-7 days to T-0)
**When to use**: Before every deployment
**Duration**: 7 days of preparation

**Key Phases:**
- **T-7 days**: Initial preparation (tests, security, docs)
- **T-3 days**: Validation and rehearsal (staging, rollback test)
- **T-1 day**: Final readiness confirmation
- **T-1 hour**: Go/No-Go decision

**Success Criteria:**
- All tests passing
- Staging deployment successful
- Rollback rehearsed
- Team assembled and ready

---

### 02. Deployment Runbook
**File**: [02-DEPLOYMENT-RUNBOOK.md](./02-DEPLOYMENT-RUNBOOK.md)
**Purpose**: Execute production deployment
**When to use**: During deployment
**Duration**: 40 minutes (target)

**10 Phases:**
1. Pre-deployment validation (5 min)
2. Service shutdown (2 min)
3. Code deployment (10 min)
4. Configuration update (3 min)
5. Database migration (0 min - N/A for GitVan)
6. Service startup (5 min)
7. Health check validation (5 min)
8. Smoke tests (10 min)
9. Traffic enablement (0 min - N/A for GitVan)
10. Deployment completion (3 min)

**Rollback Triggers:**
- Services won't start
- Health checks fail
- Smoke tests fail
- Error rate > 50/min

---

### 03. Post-Deployment Runbook
**File**: [03-POST-DEPLOYMENT-RUNBOOK.md](./03-POST-DEPLOYMENT-RUNBOOK.md)
**Purpose**: Monitor and validate deployment success
**When to use**: After deployment completes
**Duration**: 24 hours intensive monitoring

**Monitoring Phases:**
- **T+0 to T+1 hour**: Critical monitoring (every 5 minutes)
- **T+1 to T+4 hours**: Active monitoring (every 15 minutes)
- **T+4 to T+24 hours**: Standard monitoring (hourly)
- **T+24 hours**: Post-deployment review

**Key Activities:**
- Health validation
- Log monitoring
- Performance validation
- User feedback collection
- Issue tracking

---

### 04. Rollback Runbook
**File**: [04-ROLLBACK-RUNBOOK.md](./04-ROLLBACK-RUNBOOK.md)
**Purpose**: Rapidly revert to previous version
**When to use**: When deployment fails
**Duration**: 5 minutes (target)

**Rollback Phases:**
1. Initiate rollback (30 sec)
2. Stop services (1 min)
3. Rollback code (2 min)
4. Restore configuration (30 sec)
5. Restart services (1 min)
6. Verify rollback (1 min)
7. Post-rollback communication (30 sec)

**Immediate Rollback Triggers:**
- Services crash repeatedly
- Health checks fail > 5 min
- Critical security vulnerability
- Data corruption
- Cannot start services

---

### 05. Monitoring Runbook
**File**: [05-MONITORING-RUNBOOK.md](./05-MONITORING-RUNBOOK.md)
**Purpose**: Monitor GitVan in production
**When to use**: Ongoing operations
**Duration**: Continuous

**Key Sections:**
- Monitoring architecture
- Key metrics and thresholds
- Monitoring procedures
- Alert interpretation guide
- Dashboard setup
- Troubleshooting monitoring issues

**Critical Metrics:**
- Overall health status
- Component health (git, cron, events)
- Error count
- Response time
- System resources (CPU, memory, disk)

---

### 06. Support Runbook
**File**: [06-SUPPORT-RUNBOOK.md](./06-SUPPORT-RUNBOOK.md)
**Purpose**: Troubleshoot and resolve issues
**When to use**: User-reported issues or detected problems
**Duration**: Varies by issue severity

**Support Tiers:**
- **Tier 1**: First line support (basic questions, known workarounds)
- **Tier 2**: Technical support (deep troubleshooting, log analysis)
- **Tier 3**: Engineering support (bug fixes, hotfixes, patches)

**Common Issues Covered:**
1. CLI not working
2. Daemon won't start
3. Jobs not running
4. High error rate
5. Slow performance
6. Health check failures

---

### 07. Incident Response Runbook
**File**: [07-INCIDENT-RESPONSE-RUNBOOK.md](./07-INCIDENT-RESPONSE-RUNBOOK.md)
**Purpose**: Respond to and manage incidents
**When to use**: When incidents occur
**Duration**: Varies by incident severity

**Incident Severity Levels:**
- **P1 - Critical**: Complete outage (< 5 min response)
- **P2 - High**: Major degradation (< 15 min response)
- **P3 - Medium**: Minor issues (< 1 hour response)
- **P4 - Low**: Cosmetic issues (< 24 hours response)

**Response Phases:**
1. Detection and alert
2. Notification
3. Investigation
4. Resolution
5. Communication
6. Post-incident review

---

### 08. Communication Runbook
**File**: [08-COMMUNICATION-RUNBOOK.md](./08-COMMUNICATION-RUNBOOK.md)
**Purpose**: Communicate effectively during all scenarios
**When to use**: Throughout deployment and operations
**Duration**: Ongoing

**Communication Types:**
- Pre-deployment communications
- During-deployment updates
- Post-deployment status
- Incident communications
- Routine operational updates

**Communication Channels:**
- Slack (internal)
- Email (formal)
- Status page (external)
- PagerDuty (alerts)

---

## Supporting Documents

### Contact List
**File**: [../CONTACT-LIST.md](../CONTACT-LIST.md)
**Purpose**: Emergency and team contacts
**Update**: Quarterly or when team changes

**Contains:**
- Emergency contacts (24/7)
- Deployment team
- Operations team
- Management
- Escalation paths
- On-call schedule

### Scripts
**Directory**: [../scripts/](../scripts/)
**Purpose**: Operational automation scripts

**Available Scripts:**
- `health-check.sh` - Comprehensive health check
- `smoke-tests.sh` - Functional validation tests
- `diagnostics.sh` - Collect diagnostic data
- `monitor.sh` - Continuous monitoring

---

## How to Use These Runbooks

### For First-Time Deployment

1. **Week Before (T-7 days)**
   - Read: [01-PRE-DEPLOYMENT-RUNBOOK.md](./01-PRE-DEPLOYMENT-RUNBOOK.md)
   - Execute all T-7 day tasks
   - Fill out [CONTACT-LIST.md](../CONTACT-LIST.md)

2. **3 Days Before (T-3 days)**
   - Execute T-3 day tasks (staging deployment)
   - Practice rollback using [04-ROLLBACK-RUNBOOK.md](./04-ROLLBACK-RUNBOOK.md)
   - Test monitoring scripts

3. **Day Before (T-1 day)**
   - Execute T-1 day tasks
   - Print [00-QUICK-REFERENCE.md](./00-QUICK-REFERENCE.md)
   - Hold Go/No-Go meeting

4. **Deployment Day (T-0)**
   - Follow [02-DEPLOYMENT-RUNBOOK.md](./02-DEPLOYMENT-RUNBOOK.md) step-by-step
   - Keep [00-QUICK-REFERENCE.md](./00-QUICK-REFERENCE.md) accessible
   - Update per [08-COMMUNICATION-RUNBOOK.md](./08-COMMUNICATION-RUNBOOK.md)

5. **After Deployment (T+0 to T+24h)**
   - Follow [03-POST-DEPLOYMENT-RUNBOOK.md](./03-POST-DEPLOYMENT-RUNBOOK.md)
   - Monitor continuously
   - Document lessons learned

### For Ongoing Operations

**Daily:**
- Run health checks ([05-MONITORING-RUNBOOK.md](./05-MONITORING-RUNBOOK.md))
- Review logs for errors
- Check monitoring dashboards

**Weekly:**
- Generate weekly status report
- Review open issues
- Update documentation if needed

**Monthly:**
- Generate monthly review report
- Review and update runbooks
- Conduct post-mortem for any incidents

**Quarterly:**
- Update contact list
- Review all runbooks for accuracy
- Update scripts and automation
- Team training/refresher

### For Incidents

1. **Incident Detected**
   - Consult [00-QUICK-REFERENCE.md](./00-QUICK-REFERENCE.md) for decision tree
   - Determine severity (P1/P2/P3/P4)

2. **P1 (Critical) Response**
   - Follow [07-INCIDENT-RESPONSE-RUNBOOK.md](./07-INCIDENT-RESPONSE-RUNBOOK.md)
   - Consider [04-ROLLBACK-RUNBOOK.md](./04-ROLLBACK-RUNBOOK.md)
   - Communicate per [08-COMMUNICATION-RUNBOOK.md](./08-COMMUNICATION-RUNBOOK.md)

3. **P2/P3 Response**
   - Use [06-SUPPORT-RUNBOOK.md](./06-SUPPORT-RUNBOOK.md) for troubleshooting
   - Apply hotfixes if available
   - Document and schedule permanent fix

4. **Post-Incident**
   - Conduct post-incident review
   - Update runbooks with lessons learned
   - Implement prevention measures

---

## Runbook Maintenance

### When to Update Runbooks

- After each deployment (lessons learned)
- After each incident (add new scenarios)
- When processes change
- Quarterly review minimum
- When team changes

### How to Update Runbooks

1. Edit the runbook markdown file
2. Update version number and last updated date
3. Commit to git with clear message
4. Notify team in #gitvan-ops
5. Update printed copies if needed

### Review Schedule

| Runbook | Review Frequency | Owner |
|---------|------------------|-------|
| 00-Quick-Reference | After each deployment | Deployment Lead |
| 01-Pre-Deployment | Quarterly | Deployment Lead |
| 02-Deployment | After each deployment | Deployment Lead |
| 03-Post-Deployment | After each deployment | Operations Lead |
| 04-Rollback | After each rollback | Operations Lead |
| 05-Monitoring | Monthly | Monitoring Lead |
| 06-Support | Monthly | Support Lead |
| 07-Incident-Response | After each P1/P2 | Incident Commander |
| 08-Communication | Quarterly | Communications Lead |
| Contact List | Quarterly | Operations Manager |

---

## Training and Onboarding

### New Team Member Checklist

- [ ] Read all 8 runbooks
- [ ] Review [00-QUICK-REFERENCE.md](./00-QUICK-REFERENCE.md)
- [ ] Get added to [CONTACT-LIST.md](../CONTACT-LIST.md)
- [ ] Practice on staging environment
- [ ] Shadow a deployment
- [ ] Practice rollback procedure
- [ ] Run health check and smoke test scripts
- [ ] Join #gitvan-ops and #gitvan-deployment Slack channels

### Practice Scenarios

**Scenario 1: Routine Deployment**
- Follow deployment runbook on staging
- Practice communication updates
- Time yourself - should be < 40 minutes

**Scenario 2: Deployment Rollback**
- Simulate deployment failure on staging
- Execute rollback procedure
- Verify rollback successful - should be < 5 minutes

**Scenario 3: P1 Incident Response**
- Simulate production outage
- Practice incident response procedure
- Practice communication protocol

---

## Metrics and KPIs

### Deployment Metrics
- **Deployment Duration**: Target < 40 min
- **Deployment Success Rate**: Target > 95%
- **Rollback Rate**: Target < 5%
- **Downtime per Deployment**: Target 0 (zero-downtime)

### Operational Metrics
- **MTTD** (Mean Time To Detect): Target < 5 min
- **MTTR** (Mean Time To Respond): Target < 15 min (P1)
- **MTTM** (Mean Time To Mitigate): Target < 1 hour (P1)
- **Availability**: Target 99.9%
- **Incident Rate**: Track by severity

### Support Metrics
- **First Response Time**: Target < 15 min
- **Resolution Time**: Target < 2 hours (P2)
- **Customer Satisfaction**: Target > 90%
- **Escalation Rate**: Target < 20%

---

## Feedback and Improvements

### How to Provide Feedback

- **Slack**: Post in #gitvan-ops
- **Email**: ops-team@company.com
- **Git**: Create issue or pull request
- **Meetings**: Bring up in retrospectives

### Continuous Improvement

These runbooks are living documents. After every deployment and incident:

1. Document what worked well
2. Document what could be improved
3. Update runbooks with new information
4. Share lessons learned with team
5. Implement process improvements

---

## FAQ

### Q: Do I need to follow these runbooks exactly?

**A**: Yes for critical procedures (deployment, rollback, P1 incidents). Use judgment for routine operations, but document deviations.

### Q: What if the runbook doesn't cover my scenario?

**A**: Use the closest applicable runbook, document your actions, then update the runbook with the new scenario for next time.

### Q: Can I skip steps to save time?

**A**: Never skip verification steps. You may parallelize independent steps, but always verify before proceeding.

### Q: What if I make a mistake during deployment?

**A**: Stop immediately. Assess impact. If uncertain, rollback. Document the mistake and update runbooks to prevent recurrence.

### Q: How do I know when to rollback vs fix forward?

**A**: Use the decision tree in [00-QUICK-REFERENCE.md](./00-QUICK-REFERENCE.md). When in doubt, rollback - you can always redeploy later.

---

## Emergency Information

### Critical Numbers

- **Emergency Hotline**: [See CONTACT-LIST.md](../CONTACT-LIST.md)
- **PagerDuty**: 1-844-800-7243
- **Primary On-Call**: [See CONTACT-LIST.md](../CONTACT-LIST.md)

### Critical URLs

- **Health Check**: http://prod-server:9090/health
- **Status Page**: https://status.company.com
- **Monitoring**: https://monitoring.company.com/gitvan
- **War Room**: #incident-response (Slack)

### If Everything is Broken

1. **DON'T PANIC**
2. Call primary on-call
3. Page management for P1
4. Open war room: #incident-YYYYMMDD-HHMM
5. Follow [07-INCIDENT-RESPONSE-RUNBOOK.md](./07-INCIDENT-RESPONSE-RUNBOOK.md)
6. Consider rollback if recent deployment
7. Document everything

---

## Document Information

- **Version**: 1.0
- **Last Updated**: 2026-01-08
- **Owner**: Operations Team
- **Review Cycle**: Quarterly
- **Location**: `/home/user/gitvan/docs/operations/runbooks/`

---

## Quick Links

- [GitVan Documentation](/docs)
- [Architecture Documentation](/docs/architecture)
- [Production Readiness Report](/docs/PRODUCTION_READINESS_VALIDATION_REPORT.md)
- [Security Audit Report](/docs/SECURITY_AUDIT_REPORT.md)
- [Release Notes](/docs/releases)

---

**Remember: These runbooks exist to help you succeed. Use them, update them, improve them!**
