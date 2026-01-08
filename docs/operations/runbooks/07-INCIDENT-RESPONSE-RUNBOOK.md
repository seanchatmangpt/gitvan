# Incident Response Runbook - GitVan v4.0.0

## Objective
Provide structured procedures for responding to, managing, and resolving incidents affecting GitVan v4.0.0 production services.

## Scope
This runbook covers incident classification, response procedures, escalation paths, communication protocols, and post-incident review processes.

---

## Incident Severity Levels

### P1 - Critical (Production Down)
**Definition:** Complete service outage or critical functionality unavailable

**Examples:**
- GitVan completely down (all services crashed)
- Health endpoint unreachable
- Data corruption or data loss
- Security breach
- All jobs failing

**Response Time:** Immediate (< 5 minutes)
**Resolution Target:** < 1 hour
**Notification:** Page on-call + notify management immediately
**Communication:** Update every 15 minutes

### P2 - High (Major Impact)
**Definition:** Major functionality degraded, significant user impact

**Examples:**
- Cron scheduler down (jobs not running)
- High error rate (> 20 errors/minute)
- Performance degraded > 50%
- Multiple component failures
- Partial service outage

**Response Time:** < 15 minutes
**Resolution Target:** < 4 hours
**Notification:** Notify on-call + email management
**Communication:** Update every 30 minutes

### P3 - Medium (Minor Impact)
**Definition:** Limited functionality affected, workaround available

**Examples:**
- Single component degraded
- Minor performance issues
- Non-critical errors
- Individual job failures
- Configuration issues

**Response Time:** < 1 hour
**Resolution Target:** < 24 hours
**Notification:** Email on-call
**Communication:** Update every 4 hours

### P4 - Low (Minimal Impact)
**Definition:** Cosmetic issues, no user impact

**Examples:**
- Documentation errors
- UI inconsistencies
- Minor logging issues
- Enhancement requests

**Response Time:** < 24 hours
**Resolution Target:** < 1 week
**Notification:** Email support team
**Communication:** Update as needed

---

## Incident Response Procedure

### PHASE 1: Detection and Alert (0-5 minutes)

#### Step 1.1: Incident Detected
Incident can be detected via:
- Monitoring alerts (automated)
- User reports (manual)
- Health check failures (automated)
- Support tickets (manual)
- Team member observation (manual)

#### Step 1.2: Initial Assessment
```bash
# Quick status check
bash /usr/local/bin/gitvan-status-quick.sh

# Check health
curl -sf http://prod-server:9090/health | jq '{status, uptime, checks}'

# Check if services running
ssh prod-server "pgrep -af gitvan"

# Check recent errors
ssh prod-server "tail -50 /var/log/gitvan/error.log"
```

#### Step 1.3: Determine Severity
Use the severity matrix above to classify the incident:
- What is the impact? (users affected, functionality lost)
- What is the urgency? (how quickly must this be resolved)
- What is the scope? (single component vs entire system)

#### Step 1.4: Create Incident Ticket
```bash
cat > incident-$(date +%Y%m%d_%H%M%S).txt << EOF
INCIDENT REPORT

Incident ID: INC-$(date +%Y%m%d-%H%M%S)
Detected: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Detected by: [Name/System]
Severity: [P1/P2/P3/P4]

INITIAL SUMMARY:
[Brief description of what's wrong]

IMPACT:
- Users affected: [Count/All/None]
- Services affected: [List]
- Functionality lost: [Description]

INITIAL SYMPTOMS:
[What was observed]

STATUS: INVESTIGATING
EOF

cat incident-*.txt
```

---

### PHASE 2: Notification (5-10 minutes)

#### Step 2.1: Send Initial Alert

**For P1 (Critical):**
```bash
# Page on-call immediately
curl -X POST https://events.pagerduty.com/v2/enqueue \
  -H 'Content-Type: application/json' \
  -d '{
    "routing_key": "YOUR_INTEGRATION_KEY",
    "event_action": "trigger",
    "payload": {
      "summary": "P1: GitVan Production Down",
      "severity": "critical",
      "source": "GitVan Monitoring"
    }
  }'

# Alert Slack immediately
curl -X POST -H 'Content-type: application/json' \
  --data '{
    "text":"🚨 @channel P1 INCIDENT: GitVan Production Issue",
    "attachments":[{
      "color":"danger",
      "fields":[
        {"title":"Severity","value":"P1 - Critical","short":true},
        {"title":"Impact","value":"[Description]","short":true},
        {"title":"Incident ID","value":"[INC-ID]","short":true},
        {"title":"Status","value":"Investigating","short":true}
      ]
    }]
  }' \
  $SLACK_WEBHOOK_URL

# Email management
mail -s "P1 INCIDENT: GitVan Production Down" management@company.com << EOF
P1 Critical Incident Detected

Incident ID: [INC-ID]
Time: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Impact: [Description]

Incident Commander: [Name]
War room: #incident-response

Updates will be provided every 15 minutes.

Initial investigation in progress.
EOF
```

**For P2 (High):**
```bash
# Slack alert
curl -X POST -H 'Content-type: application/json' \
  --data '{
    "text":"⚠️ P2 INCIDENT: GitVan Issue Detected",
    "attachments":[{
      "color":"warning",
      "fields":[
        {"title":"Severity","value":"P2 - High","short":true},
        {"title":"Impact","value":"[Description]","short":true}
      ]
    }]
  }' \
  $SLACK_WEBHOOK_URL

# Email on-call
mail -s "P2 Incident: GitVan Issue" oncall@company.com << EOF
[Incident details]
EOF
```

#### Step 2.2: Update Status Page
```bash
# Create incident on status page
curl -X POST https://api.statuspage.io/v1/pages/PAGE_ID/incidents \
  -H "Authorization: OAuth YOUR_TOKEN" \
  -d "status=investigating" \
  -d "name=GitVan Service Issue" \
  -d "impact=major"  # or minor, critical
```

#### Step 2.3: Assemble Response Team

**P1 Incident Team:**
- Incident Commander (IC)
- Operations Engineer
- Development Engineer
- Communications Lead

**P2 Incident Team:**
- On-call Engineer
- Operations Engineer

#### Step 2.4: Open War Room (P1 only)
- Create Slack channel: `#incident-YYYYMMDD-HHMM`
- Start Zoom/conference call
- Share war room link with team

---

### PHASE 3: Investigation (10-30 minutes)

#### Step 3.1: Collect Diagnostic Data
```bash
# Run comprehensive diagnostics
bash /usr/local/bin/gitvan-diagnostics.sh

# Collect to incident folder
INCIDENT_DIR="/tmp/incident-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$INCIDENT_DIR"

# Copy diagnostics
mv /tmp/gitvan-diagnostics-*.tar.gz "$INCIDENT_DIR/"

# Capture live state
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
# System state
top -bn1 > /tmp/top-snapshot.txt
ps aux > /tmp/processes-snapshot.txt
netstat -tulpn > /tmp/netstat-snapshot.txt
df -h > /tmp/disk-snapshot.txt
free -m > /tmp/memory-snapshot.txt

# GitVan state
curl -s http://localhost:9090/health > /tmp/health-snapshot.json 2>&1
pgrep -af gitvan > /tmp/gitvan-processes.txt

# Recent logs
tail -1000 /var/log/gitvan/*.log > /tmp/recent-logs-snapshot.txt
REMOTE_SCRIPT

# Copy snapshots
scp prod-server:/tmp/*-snapshot.* "$INCIDENT_DIR/"
```

#### Step 3.2: Analyze Symptoms
```bash
# Review diagnostic data
cd "$INCIDENT_DIR"

# Check health status
cat health-snapshot.json | jq .

# Check for common issues:
# - Out of disk space?
cat disk-snapshot.txt | grep "100%\|9[0-9]%"

# - Out of memory?
cat memory-snapshot.txt

# - Processes crashed?
cat gitvan-processes.txt

# - High error rate?
grep -i "error" recent-logs-snapshot.txt | wc -l

# - Network issues?
cat netstat-snapshot.txt | grep ESTABLISHED
```

#### Step 3.3: Identify Root Cause
Common root causes:
- **Resource Exhaustion**: Out of disk, memory, CPU
- **Configuration Error**: Invalid config after deployment
- **Code Bug**: Software defect
- **External Dependency**: GitHub, NPM, network issue
- **Infrastructure**: Server hardware, network issue

#### Step 3.4: Determine Response Strategy
- **Fix Forward**: Apply fix while system is down/degraded
- **Rollback**: Revert to previous version (see Rollback Runbook)
- **Workaround**: Temporary solution to restore service
- **Escalate**: Need additional expertise

---

### PHASE 4: Resolution (30-60 minutes)

#### Step 4.1: Execute Fix

**Option A: Quick Fix**
```bash
# Example: Restart services
ssh prod-server "cd /opt/gitvan && gitvan daemon restart"
sleep 10
curl http://prod-server:9090/health | jq .
```

**Option B: Apply Hotfix**
```bash
# Follow hotfix procedure from Support Runbook
# See: 06-SUPPORT-RUNBOOK.md - Hotfix Procedure
```

**Option C: Rollback**
```bash
# Execute rollback procedure
# See: 04-ROLLBACK-RUNBOOK.md
```

**Option D: Workaround**
```bash
# Apply temporary workaround to restore service
# Document workaround in incident report
# Plan permanent fix
```

#### Step 4.2: Verify Resolution
```bash
# Check health multiple times
for i in {1..5}; do
  echo "Verification check $i/5..."
  curl -sf http://prod-server:9090/health | jq '{status, uptime, checks}'
  sleep 60
done

# Run smoke tests
ssh prod-server 'bash -s' << 'REMOTE_SCRIPT'
cd /opt/gitvan

# Test CLI
./dist/bin/gitvan.mjs --version

# Test daemon
./dist/bin/gitvan.mjs daemon status

# Test jobs
./dist/bin/gitvan.mjs cron list

echo "Smoke tests complete"
REMOTE_SCRIPT

# Monitor for 10 minutes
echo "Monitoring for stability..."
for i in {1..10}; do
  sleep 60
  STATUS=$(curl -sf http://prod-server:9090/health | jq -r '.status')
  ERROR_COUNT=$(curl -sf http://prod-server:9090/health | jq -r '.checks.errors.errorCount')
  echo "$(date +%H:%M:%S) - Status: $STATUS, Errors: $ERROR_COUNT"
done
```

#### Step 4.3: Document Resolution
```bash
cat >> incident-*.txt << EOF

RESOLUTION:
Resolved: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Duration: [Calculate from detected time]

ROOT CAUSE:
[Detailed root cause description]

RESOLUTION STEPS:
1. [Step 1]
2. [Step 2]
...

VERIFICATION:
- Health checks: PASSED
- Smoke tests: PASSED
- Monitoring: STABLE

STATUS: RESOLVED
EOF
```

---

### PHASE 5: Communication (Ongoing)

#### Step 5.1: Send Resolution Notification

**P1 Resolution:**
```bash
# Slack
curl -X POST -H 'Content-type: application/json' \
  --data "{
    \"text\":\"✅ @channel P1 INCIDENT RESOLVED\",
    \"attachments\":[{
      \"color\":\"good\",
      \"fields\":[
        {\"title\":\"Incident ID\",\"value\":\"[INC-ID]\",\"short\":true},
        {\"title\":\"Duration\",\"value\":\"[Duration]\",\"short\":true},
        {\"title\":\"Root Cause\",\"value\":\"[Brief description]\",\"short\":false},
        {\"title\":\"Status\",\"value\":\"All systems operational\",\"short\":false}
      ]
    }]
  }" \
  $SLACK_WEBHOOK_URL

# Update status page
curl -X POST https://api.statuspage.io/v1/pages/PAGE_ID/incidents/INCIDENT_ID \
  -H "Authorization: OAuth YOUR_TOKEN" \
  -d "status=resolved"

# Email stakeholders
mail -s "RESOLVED: P1 GitVan Incident" stakeholders@company.com << EOF
The P1 GitVan incident has been resolved.

Incident ID: [INC-ID]
Duration: [Duration]
Impact: [Description]

Root Cause: [Description]
Resolution: [Description]

Services are now fully operational. A post-incident review will be scheduled.

Thank you for your patience.
EOF
```

#### Step 5.2: Close Incident
- Mark incident as resolved in tracking system
- Close war room
- Thank response team
- Schedule post-incident review

---

### PHASE 6: Post-Incident Review (Within 48 hours)

#### Step 6.1: Schedule Post-Incident Meeting
- **Attendees:**
  - Incident Commander
  - Response team members
  - Engineering manager
  - Product/business stakeholders (for P1)

- **Duration:** 60-90 minutes

- **Agenda:**
  1. Timeline review (15 min)
  2. Root cause analysis (20 min)
  3. Response evaluation (15 min)
  4. What went well (10 min)
  5. What needs improvement (20 min)
  6. Action items (10 min)

#### Step 6.2: Post-Incident Report Template
```markdown
# Post-Incident Review - [INC-ID]

## Incident Summary
- **Incident ID**: [INC-ID]
- **Date**: [Date]
- **Duration**: [Total duration]
- **Severity**: [P1/P2/P3/P4]
- **Impact**: [User/system impact description]

## Timeline
| Time (UTC) | Event |
|------------|-------|
| [HH:MM] | Incident detected |
| [HH:MM] | Alert sent |
| [HH:MM] | Response team assembled |
| [HH:MM] | Root cause identified |
| [HH:MM] | Fix applied |
| [HH:MM] | Service restored |
| [HH:MM] | Incident resolved |

## Root Cause
### Immediate Cause
[What directly caused the incident]

### Contributing Factors
[What conditions allowed this to happen]

### Root Cause
[Deep underlying reason]

## Impact Assessment
- **Users Affected**: [Count or percentage]
- **Services Affected**: [List]
- **Data Impact**: [Any data loss/corruption]
- **Revenue Impact**: [If applicable]
- **Duration of Impact**: [How long users were affected]

## Response Evaluation
### What Went Well
- [List things that worked]

### What Could Be Improved
- [List areas for improvement]

### Response Metrics
- **Detection Time**: [Time to detect]
- **Response Time**: [Time to start responding]
- **Resolution Time**: [Time to resolve]
- **Communication**: [How well we communicated]

## Lessons Learned
### Technical Lessons
- [Technical insights]

### Process Lessons
- [Process improvements]

## Action Items
| Action | Owner | Due Date | Priority |
|--------|-------|----------|----------|
| [Action 1] | [Name] | [Date] | High |
| [Action 2] | [Name] | [Date] | Medium |
...

## Prevention Measures
- [What we'll do to prevent recurrence]

## Monitoring Improvements
- [How we'll detect this faster next time]

## Documentation Updates
- [ ] Update runbooks
- [ ] Update monitoring
- [ ] Update architecture docs
- [ ] Share lessons learned

## Participants
- Incident Commander: [Name]
- Response Team: [Names]
- Document Author: [Name]

## Sign-off
- Engineering Manager: ___________
- Date: ___________
```

#### Step 6.3: Implement Action Items
- Assign owners to each action item
- Set due dates
- Track completion
- Review in next team meeting

---

## Incident Communication Guidelines

### Internal Communication
- **During Incident**: Update every 15 min (P1), 30 min (P2), 1 hour (P3)
- **Channel**: Dedicated Slack channel or war room
- **Tone**: Factual, concise, actionable
- **Include**: What happened, current status, next steps, ETA

### External Communication
- **Status Page**: Update immediately when incident detected
- **Email**: For P1/P2, email affected users
- **Social Media**: For major outages (P1) if applicable
- **Tone**: Apologetic, transparent, professional

### Communication Templates

**Initial Alert:**
```
[STATUS UPDATE] GitVan Service Issue Detected

We are currently investigating an issue affecting GitVan services.

Impact: [Brief description]
Detected: [Time]

Our team is actively working on a resolution. We will provide updates every [15/30/60] minutes.

Status page: https://status.company.com
```

**Progress Update:**
```
[STATUS UPDATE] GitVan Issue - Investigation Ongoing

We have identified the root cause and are implementing a fix.

Root Cause: [Brief description]
ETA: [Estimated time to resolution]

Next update: [Time]
```

**Resolution:**
```
[RESOLVED] GitVan Services Restored

The GitVan service issue has been resolved. All services are now operational.

Duration: [Total time]
Cause: [Brief description]

We apologize for any inconvenience. A full post-incident report will be published within 48 hours.

Thank you for your patience.
```

---

## Incident Escalation

### When to Escalate to Management
- P1 incident duration > 1 hour
- Data loss or security breach
- Media attention or PR risk
- Legal or compliance implications
- Multiple customers complaining
- Revenue impact > $X

### Escalation Path
1. **Tier 1**: On-call Engineer
2. **Tier 2**: Engineering Manager
3. **Tier 3**: Director of Engineering
4. **Tier 4**: CTO
5. **Tier 5**: CEO (for critical business impact)

---

## Incident Metrics to Track

- **MTTD (Mean Time To Detect)**: Target < 5 minutes
- **MTTR (Mean Time To Respond)**: Target < 15 minutes
- **MTTM (Mean Time To Mitigate)**: Target < 1 hour (P1)
- **MTTF (Mean Time To Fix)**: Track per severity
- **Incident Count**: Track by severity and root cause
- **False Positive Rate**: Target < 5%

---

## Contacts

### Incident Response Team
- **Primary On-Call**: [Name] - [Phone]
- **Secondary On-Call**: [Name] - [Phone]
- **Engineering Manager**: [Name] - [Phone]
- **Communications Lead**: [Name] - [Phone]

### Escalation Contacts
- **Director of Engineering**: [Name] - [Phone]
- **CTO**: [Name] - [Phone]
- **CEO**: [Name] - [Phone]

### Emergency Numbers
- **PagerDuty**: [Phone]
- **Conference Bridge**: [Number / Link]
- **Slack Emergency**: #incident-response

---

## References

- [04-ROLLBACK-RUNBOOK.md](./04-ROLLBACK-RUNBOOK.md)
- [05-MONITORING-RUNBOOK.md](./05-MONITORING-RUNBOOK.md)
- [06-SUPPORT-RUNBOOK.md](./06-SUPPORT-RUNBOOK.md)
- [08-COMMUNICATION-RUNBOOK.md](./08-COMMUNICATION-RUNBOOK.md)
- [Post-Incident Review Template](/docs/operations/templates/post-incident-review-template.md)

---

**Document Version**: 1.0
**Last Updated**: 2026-01-08
**Owner**: Operations Team
**Review Cycle**: After each P1/P2 incident
