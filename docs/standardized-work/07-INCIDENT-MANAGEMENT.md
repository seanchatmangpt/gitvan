# Procedure 07: Incident Management

## Purpose
Rapidly detect, respond to, and resolve production incidents while minimizing impact to users and maintaining system reliability.

## Scope
Incident detection, classification, response, resolution, and post-incident review for all GitVan services.

## Frequency
- **On-Demand**: When incidents occur
- **Post-Incident Review**: Within 48 hours of resolution
- **Incident Trend Review**: Monthly
- **Runbook Updates**: After each incident

## Responsible Party
**Primary**: On-call engineer, Incident commander
**Secondary**: Development team, DevOps, Management

## Prerequisites
- On-call rotation established
- Incident response tools configured
- Communication channels set up
- Escalation procedures understood
- Runbooks available

## Incident Severity Levels

| Severity | Description | Response Time | Example |
|----------|-------------|---------------|---------|
| **P0 - Critical** | Total service outage | 5 minutes | API down, data loss |
| **P1 - High** | Major feature broken | 30 minutes | Jobs failing, auth broken |
| **P2 - Medium** | Minor feature degraded | 2 hours | Slow performance, UI bug |
| **P3 - Low** | Cosmetic issue | Next business day | Typo, minor UI glitch |

## Step-by-Step Instructions

### Phase 1: Incident Detection

**Step 1.1: Alert Received**
```bash
# Monitoring alert triggers
# Email: "ALERT: High Error Rate"
# PagerDuty: Page sent to on-call
# Slack: Alert posted to #incidents

# Sources:
# - Automated monitoring (DataDog, Prometheus)
# - User reports (support tickets)
# - Internal discovery (team member)
```
**Expected Outcome**: Alert acknowledged
**Verification**: Acknowledgment sent

**Step 1.2: Acknowledge Alert**
```bash
# Via PagerDuty
pd incident ack <incident-id>

# Via Slack
# React with 👀 emoji to show you're looking

# Log acknowledgment
echo "$(date): Incident acknowledged by $(whoami)" >> incidents.log
```
**Expected Outcome**: Team knows someone is responding
**Verification**: Acknowledgment visible

**Step 1.3: Quick Assessment**
```bash
# Check service health
curl https://api.gitvan.example.com/health

# Check error rates
curl https://metrics.example.com/api/v1/query?query=error_rate

# Check recent deployments
git log -5 --oneline
```
**Expected Outcome**: Initial understanding of issue
**Verification**: Scope and impact understood

### Phase 2: Incident Classification

**Step 2.1: Determine Severity**
```bash
# Questions to ask:
# - Is the service completely down? → P0
# - Can users complete critical operations? No → P1, Yes → P2/P3
# - Is data at risk? → P0
# - How many users affected? All → P0, Some → P1, Few → P2

# Document decision
echo "Severity: P1 - Auth service failing for 20% of users" > incident.md
```
**Expected Outcome**: Severity assigned
**Verification**: Incident ticket updated

**Step 2.2: Create Incident**
```bash
# Create incident ticket
./scripts/create-incident.sh \
  --severity P1 \
  --title "Auth service failure" \
  --description "20% of auth requests failing with 500 error"

# Or via API
curl -X POST https://incidents.example.com/api/incidents \
  -d '{"severity":"P1","title":"Auth service failure"}'
```
**Expected Outcome**: Incident tracked
**Verification**: Ticket ID assigned

**Step 2.3: Notify Stakeholders**
```bash
# For P0/P1: Page incident commander
./scripts/page-incident-commander.sh

# Post in Slack
# @channel We are investigating authentication failures affecting 20% of users.
# Incident: INC-12345
# Severity: P1
# Incident Commander: @john
```
**Expected Outcome**: Team aware and mobilizing
**Verification**: Acknowledgments received

### Phase 3: Incident Response

**Step 3.1: Form Incident Response Team**
```markdown
# Roles:
- **Incident Commander**: Coordinates response (John Doe)
- **Technical Lead**: Investigates and fixes (Jane Smith)
- **Communications**: Updates stakeholders (Bob Johnson)
- **Scribe**: Documents timeline (Alice Brown)
```
**Expected Outcome**: Team assembled
**Verification**: Roles assigned in incident chat

**Step 3.2: Investigate Root Cause**
```bash
# Check logs
tail -n 1000 /var/log/gitvan/error.log | grep AUTH

# Check recent changes
git log --since="1 hour ago" --grep="auth"

# Check system resources
ssh production "top -b -n 1"
ssh production "free -h"

# Check dependencies
curl https://auth-service.example.com/health

# Query database
psql -c "SELECT COUNT(*) FROM auth_logs WHERE status='error' AND timestamp > NOW() - INTERVAL '1 hour';"
```
**Expected Outcome**: Root cause identified
**Verification**: Hypothesis documented

**Step 3.3: Implement Mitigation**
```bash
# Quick mitigation options:
# 1. Rollback recent deployment
./scripts/rollback.sh

# 2. Scale up resources
./scripts/scale-instances.sh --service auth --count 5

# 3. Enable feature flag fallback
curl -X POST https://flags.example.com/auth/fallback -d "enabled=true"

# 4. Disable problematic feature
curl -X POST https://flags.example.com/new-auth -d "enabled=false"

# Choose fastest path to restore service
```
**Expected Outcome**: Service restored
**Verification**: Error rate returns to normal

**Step 3.4: Monitor Mitigation**
```bash
# Watch metrics
watch -n 5 'curl -s https://metrics.example.com/api/v1/query?query=error_rate'

# Check user reports
./scripts/check-support-tickets.sh --since 5m

# Verify critical paths
./scripts/test-critical-paths.sh production
```
**Expected Outcome**: Mitigation working
**Verification**: Metrics improving

### Phase 4: Communication

**Step 4.1: Status Updates (Every 15-30 minutes)**
```markdown
# Internal (Slack #incidents)
**Update 14:15**: Identified issue with auth service. Implementing rollback.
**Update 14:30**: Rollback complete. Error rate declining. Monitoring.
**Update 14:45**: Service fully restored. Error rate < 0.5%. Investigating root cause.

# External (Status Page)
**Investigating** (14:00): We are investigating issues with authentication.
**Identified** (14:15): We have identified the issue and are implementing a fix.
**Monitoring** (14:30): Service has been restored. We are monitoring for stability.
**Resolved** (14:45): This incident has been resolved.
```
**Expected Outcome**: Stakeholders informed
**Verification**: Updates posted

**Step 4.2: Update Incident Ticket**
```bash
# Add timeline entries
./scripts/update-incident.sh INC-12345 \
  --entry "14:00 - Incident detected" \
  --entry "14:15 - Root cause identified" \
  --entry "14:30 - Rollback initiated" \
  --entry "14:45 - Service restored"
```
**Expected Outcome**: Timeline documented
**Verification**: Ticket up to date

### Phase 5: Resolution

**Step 5.1: Verify Service Restored**
```bash
# Check all critical metrics
./scripts/health-check.sh --full

# Run smoke tests
npm run test:smoke -- --env=production

# Check user feedback
./scripts/check-user-feedback.sh --since incident-start
```
**Expected Outcome**: Service fully operational
**Verification**: All checks green

**Step 5.2: Implement Permanent Fix**
```bash
# Create fix branch
git checkout -b fix/auth-service-incident-12345

# Implement fix
# ... code changes ...

# Test thoroughly
npm test
npm run test:integration

# Deploy fix (follow deployment procedure)
./scripts/deploy.sh staging
./scripts/verify-staging.sh
./scripts/deploy.sh production
```
**Expected Outcome**: Root cause fixed
**Verification**: Issue cannot recur

**Step 5.3: Close Incident**
```bash
# Update incident status
./scripts/update-incident.sh INC-12345 --status resolved

# Final communication
# Slack: "Incident INC-12345 resolved. Auth service fully operational."
# Status page: "All systems operational"

# Thank the team
# "Thanks to @jane @bob @alice for quick response!"
```
**Expected Outcome**: Incident closed
**Verification**: Ticket marked resolved

### Phase 6: Post-Incident Review

**Step 6.1: Schedule Post-Mortem (Within 48 hours)**
```bash
# Create calendar event
# Title: Post-Mortem - INC-12345 Auth Service Failure
# Date: 2026-01-10 10:00 AM
# Attendees: Incident team + stakeholders
# Duration: 60 minutes
```
**Expected Outcome**: Review scheduled
**Verification**: Calendar invite sent

**Step 6.2: Write Post-Mortem Report**
```markdown
# Incident Post-Mortem: INC-12345

## Incident Summary
- **Date**: 2026-01-08 14:00 UTC
- **Duration**: 45 minutes
- **Severity**: P1
- **Impact**: 20% of authentication requests failed

## Timeline
- 14:00 - Alert: High error rate in auth service
- 14:05 - Incident declared, team assembled
- 14:15 - Root cause identified: Database connection pool exhausted
- 14:30 - Mitigation: Rolled back recent deployment
- 14:45 - Incident resolved: Service fully restored

## Root Cause
Recent deployment increased connection pool usage by 3x due to missing connection release in error handling path.

## What Went Well
- Alert fired within 1 minute of issue
- Team assembled quickly
- Rollback procedure executed smoothly
- Communication clear and frequent

## What Went Wrong
- Code review missed the connection leak
- No load testing before deployment
- Monitoring didn't catch connection pool exhaustion

## Action Items
1. [ ] Add connection pool monitoring - @jane - Due: 2026-01-15
2. [ ] Mandatory load testing for auth changes - @bob - Due: 2026-01-12
3. [ ] Update code review checklist - @alice - Due: 2026-01-10
4. [ ] Add automated connection leak detection - @john - Due: 2026-01-20

## Lessons Learned
- Always test connection handling in error paths
- Monitor resource pools (connections, threads, etc.)
- Load testing critical for auth service changes
```
**Expected Outcome**: Post-mortem complete
**Verification**: Document reviewed and approved

**Step 6.3: Implement Prevention Measures**
```bash
# Add monitoring
./scripts/add-monitoring.sh --metric connection_pool_usage

# Update runbooks
./scripts/update-runbook.sh auth-service --add-section "Connection pool exhaustion"

# Add automated tests
# ... create tests for connection handling ...

# Update deployment checklist
echo "- [ ] Load testing completed for auth changes" >> .github/PULL_REQUEST_TEMPLATE.md
```
**Expected Outcome**: Prevention measures in place
**Verification**: Measures tested and verified

### Phase 7: Knowledge Sharing

**Step 7.1: Update Runbooks**
```markdown
# runbooks/auth-service-incidents.md

## Connection Pool Exhaustion

### Symptoms
- Auth requests failing with 500 errors
- "Connection pool exhausted" in logs
- Database connections at maximum

### Diagnosis
\```bash
# Check connection pool status
psql -c "SELECT count(*) FROM pg_stat_activity;"
\```

### Mitigation
1. Roll back recent deployment
2. Increase connection pool size temporarily
3. Monitor for improvement

### Prevention
- Always release connections in error handlers
- Load test before deploying auth changes
- Monitor connection pool usage
```
**Expected Outcome**: Runbook updated
**Verification**: Team can follow runbook

**Step 7.2: Share Learnings**
```bash
# Post in #engineering channel
# "Learnings from INC-12345: Always test error paths for resource cleanup"

# Add to team wiki
# "Common Incidents and How to Prevent Them"

# Include in next team all-hands
```
**Expected Outcome**: Team learns from incident
**Verification**: Knowledge shared

## Success Criteria

- [ ] Incident detected < 5 minutes
- [ ] Team mobilized < 15 minutes
- [ ] Mitigation implemented < target response time
- [ ] Service restored
- [ ] Users notified of status
- [ ] Root cause identified
- [ ] Permanent fix deployed
- [ ] Post-mortem completed within 48 hours
- [ ] Action items assigned and tracked
- [ ] Runbooks updated

## Troubleshooting

### Issue: Cannot Determine Root Cause
```bash
# Enable debug logging
ssh production "sed -i 's/LOG_LEVEL=info/LOG_LEVEL=debug/' /etc/gitvan/env"
ssh production "systemctl restart gitvan"

# Collect more data
./scripts/collect-diagnostics.sh --verbose

# Involve more experts
# Page database team, infrastructure team, etc.
```

### Issue: Mitigation Not Working
```bash
# Try alternative mitigation
# If rollback doesn't work, try:
# - Scaling resources
# - Enabling fallback
# - Isolating bad traffic
# - Manual intervention

# Escalate if needed
./scripts/escalate-incident.sh INC-12345 --to director-on-call
```

### Issue: Communication Breakdown
```bash
# Designate clear roles
# - One person for internal updates
# - One person for external updates
# - One person for executive updates

# Use structured format
# Status: Investigating/Identified/Monitoring/Resolved
# Impact: X% of users
# ETA: Expected resolution in X minutes
```

## Escalation Path

```
Level 1: On-Call Engineer (0-15 min)
    ↓ (If not resolved)
Level 2: Team Lead (15-30 min)
    ↓ (If still not resolved or P0)
Level 3: Director of Engineering (30+ min or P0)
    ↓ (If company-wide impact)
Level 4: CTO/CEO (Critical business impact)
```

## References
- [Deployment Procedure](04-DEPLOYMENT-PROCEDURE.md)
- [Performance Monitoring](06-PERFORMANCE-MONITORING.md)
- [Security Procedures](08-SECURITY-PROCEDURES.md)

## Training Requirements
**Duration**: 1 hour + incident drills
**Competency**: Can respond to incidents, communicate effectively, write post-mortems

## Revision History
| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-01-08 | 1.0 | Initial creation | GitVan Team |

---

**Remember**: Incidents are learning opportunities. Blameless post-mortems improve the system, not punish individuals.
