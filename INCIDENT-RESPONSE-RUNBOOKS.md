# GitVan Git QA - Incident Response Runbooks

**Version**: 1.0
**Audience**: On-Call Engineers, Incident Commanders
**Compliance**: Incident Management Best Practices

---

## Severity Levels

| Level | Definition | Response Time | On-Call | War Room |
|-------|-----------|---|---------|---------|
| **P1** | Service down, data loss risk | 15 min | Immediate | Immediate |
| **P2** | Significant degradation | 1 hour | Within 30 min | Within 1 hour |
| **P3** | Minor issues, workaround available | 4 hours | Within 2 hours | Optional |
| **P4** | Informational, no impact | 24 hours | Next business day | No |

---

## General Incident Response Process

```
1. DETECTION (Automated or Manual)
   ├─ Alert triggered or reported
   ├─ Verify incident (not false positive)
   └─ Determine severity

2. RESPONSE (First 30 minutes)
   ├─ Declare incident
   ├─ Page on-call team
   ├─ Create Slack channel
   ├─ Start incident timer
   └─ Begin investigation

3. INVESTIGATION (Parallel Activities)
   ├─ Identify root cause
   ├─ Assess impact scope
   ├─ Activate war room
   └─ Keep stakeholders updated (every 15 min)

4. MITIGATION (Get to Green)
   ├─ Apply temporary fix if available
   ├─ Escalate if needed
   ├─ Execute playbook
   └─ Monitor recovery

5. RESOLUTION (Full Recovery)
   ├─ Implement permanent fix
   ├─ Verify all systems healthy
   ├─ Communicate all-clear
   └─ Schedule post-mortem

6. FOLLOW-UP (24-48 hours)
   ├─ Conduct post-mortem
   ├─ Document findings
   ├─ Create action items
   └─ Update runbooks
```

---

## Runbook 1: High Error Rate

**Trigger**: Error rate > 0.1% for 5+ minutes
**Severity**: P2
**Response**: 1 hour
**Affected**: Git operations, users unable to work

### Investigation

```bash
# Step 1: Verify the alert
Query: SELECT count(*) FROM metrics WHERE error_rate > 0.001
       AND timestamp > now() - interval '10 minutes'

# Step 2: Check recent deployments
git log --oneline -n 20
kubectl rollout history deployment/git-qa-guards

# Step 3: Check application logs
kubectl logs -n gitvan deployment/git-qa-guards --tail=1000
grep -i error *.log | tail -100

# Step 4: Check external dependencies
- Database: SELECT version()
- Redis: PING
- Git: Check git server status

# Step 5: Review metrics
Prometheus: git_qa_guard_operations_total{result="error"}[5m]
Prometheus: rate(git_qa_guard_operations_total{result="error"}[5m])
```

### Diagnosis Decision Tree

```
Is error rate > 5%?
├─ YES → Go to CRITICAL RESPONSE section
└─ NO → Continue investigation

Are errors in one guard type?
├─ YES → Check that guard implementation
├─ Examples: protected_branch_guard, checkout_safety_guard
└─ NO → Check system-wide issues

Are errors correlated with recent deployment?
├─ YES → ROLLBACK (See Mitigation section)
└─ NO → Check external dependencies

Are database queries slow?
├─ YES → Database issue (See Runbook 4)
└─ NO → Check cache/Redis

Is there lock contention?
├─ YES → Lock issue (See Runbook 2)
└─ NO → Check application errors
```

### Mitigation Steps

**Option 1: Rollback (If Deployment Issue)**
```bash
# Identify problematic deployment
kubectl rollout history deployment/git-qa-guards

# Rollback to previous version
kubectl rollout undo deployment/git-qa-guards --to-revision=N

# Verify rollback
kubectl rollout status deployment/git-qa-guards
kubectl get pods

# Monitor error rate (should drop to <0.1% within 2 minutes)
watch 'curl -s http://localhost:9090/api/v1/query?query=rate(git_qa_guard_operations_total{result=\"error\"}[1m])'
```

**Option 2: Scale Up (If Load Issue)**
```bash
# Check current replicas
kubectl get deployment git-qa-guards

# Scale up
kubectl scale deployment git-qa-guards --replicas=15

# Monitor metrics
watch 'kubectl top nodes'
watch 'kubectl top pods -n gitvan'
```

**Option 3: Restart Pods (If Memory Leak)**
```bash
# Check memory usage
kubectl top pods -n gitvan | grep git-qa-guards

# Rolling restart
kubectl rollout restart deployment/git-qa-guards

# Monitor
kubectl get pods -w
```

### Recovery Verification

- [ ] Error rate < 0.1% for 5+ minutes
- [ ] Latency P99 < 500ms
- [ ] No errors in logs
- [ ] External dependencies healthy
- [ ] Users confirm functionality

### Escalation

**If unresolved after 30 minutes:**
- Escalate to VP Engineering
- Prepare for potential full rollback
- Consider data recovery procedures

### Post-Incident

1. **Post-Mortem** (within 24 hours)
   - What caused the error spike?
   - How was it missed in testing?
   - What alert improvement needed?

2. **Action Items**
   - Improve monitoring
   - Add test coverage
   - Update runbooks

---

## Runbook 2: Lock Deadlock

**Trigger**: Deadlock detected or lock acquisition > 1 second
**Severity**: P1
**Response**: 15 minutes
**Impact**: Git operations blocked, users stuck

### Investigation

```bash
# Step 1: Confirm deadlock
Query: SELECT * FROM lock_holders WHERE wait_time > 60s

# Step 2: Identify blocked operations
kubectl logs -n gitvan deployment/git-qa-guards | grep "lock.*timeout"

# Step 3: Check lock metrics
Prometheus: git_qa_deadlocks_detected_total
Prometheus: histogram_quantile(0.99, git_qa_lock_acquisition_time_seconds)

# Step 4: List active locks
curl http://localhost:8080/api/locks

# Step 5: Check database locks
SELECT * FROM pg_locks WHERE locktype='advisory'
SELECT * FROM pg_stat_statements WHERE query LIKE '%lock%'
```

### Deadlock Types & Recovery

**Type 1: Circular Lock Dependency**
```
Process A holds lock 1, waiting for lock 2
Process B holds lock 2, waiting for lock 1

Recovery:
1. Kill one of the processes (prefer younger)
2. Kill process: kill -9 <PID>
3. Clear locks: DELETE FROM locks WHERE status='STALE'
```

**Type 2: Stuck Lock Holder**
```
Process holds lock but is not responding

Recovery:
1. Kill stuck process
2. Force unlock: DELETE FROM locks WHERE process_id=<PID>
3. Restart pod: kubectl delete pod <POD_NAME>
```

**Type 3: Lock Timeout**
```
Lock acquisition taking > 5 seconds

Recovery:
1. Scale down operations (reduce concurrency)
2. Kill blocked operations: DELETE FROM operations WHERE status='WAITING'
3. Restart affected pods
4. Resume normal operations
```

### Immediate Actions

```bash
# Kill a specific lock holder
curl -X DELETE http://localhost:8080/api/locks/<LOCK_ID>

# Force cleanup stale locks
curl -X POST http://localhost:8080/api/locks/cleanup

# Restart git-qa-guards with less concurrency
kubectl set env deployment/git-qa-guards MAX_CONCURRENT_OPS=5

# Monitor recovery
watch 'curl -s http://localhost:8080/api/health | jq .locks'
```

### Recovery Verification

- [ ] No deadlock events in last 5 minutes
- [ ] Lock acquisition time < 50ms (p99)
- [ ] No waiting operations
- [ ] Git operations succeeding normally

### Prevention

- [ ] Increase lock timeout (currently 30s → try 60s)
- [ ] Implement lock ordering to prevent circular dependencies
- [ ] Add automatic deadlock detection with cleanup
- [ ] Upgrade to distributed lock service (etcd/Consul)

---

## Runbook 3: High Latency

**Trigger**: P99 latency > 500ms for 5+ minutes
**Severity**: P2
**Response**: 1 hour

### Investigation

```bash
# Step 1: Identify slow operations
Prometheus: histogram_quantile(0.99, git_qa_guard_operation_duration_seconds)

# Step 2: Check CPU/Memory
kubectl top nodes
kubectl top pods -n gitvan | head -20

# Step 3: Database performance
SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10

# Step 4: Network latency
ping git-server
traceroute database-host
curl -w "Time: %{time_total}s\n" http://git-qa-guards:8080/health

# Step 5: Check cache hit rate
Prometheus: git_qa_cache_hit_rate{cache_type="branch_protection"}
```

### Root Cause Analysis

```
Is CPU usage > 70%?
├─ YES → CPU bottleneck
│  ├─ Check for runaway processes
│  └─ Scale up or optimize code
└─ NO → Continue

Is Memory usage > 80%?
├─ YES → Memory bottleneck
│  ├─ Check for memory leaks
│  ├─ Reduce cache size
│  └─ Restart pods
└─ NO → Continue

Are database queries slow?
├─ YES → Database bottleneck
│  ├─ Check query plans: EXPLAIN ANALYZE
│  ├─ Add missing indexes
│  └─ Scale database
└─ NO → Continue

Is network latency high?
├─ YES → Network bottleneck
│  ├─ Check network metrics
│  └─ Contact infrastructure team
└─ NO → Continue

Is cache hit rate low?
├─ YES → Cache ineffective
│  ├─ Check cache configuration
│  ├─ Increase cache size
│  └─ Improve cache strategy
└─ NO → Code optimization needed
```

### Mitigation Steps

**For CPU Bottleneck:**
```bash
kubectl scale deployment git-qa-guards --replicas=20
# Monitor: should reduce latency within 1 minute
```

**For Memory Bottleneck:**
```bash
# Check memory leaks
kubectl top pods -n gitvan --containers

# Restart if persistent memory growth
kubectl rollout restart deployment/git-qa-guards

# Increase memory limits
kubectl patch deployment git-qa-guards -p '{"spec":{"template":{"spec":{"containers":[{"name":"git-qa-guards","resources":{"limits":{"memory":"4Gi"}}}]}}}}'
```

**For Database Bottleneck:**
```bash
# Check slow queries
SELECT * FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC;

# Add index if missing
CREATE INDEX idx_branch_protection_repo ON branch_protection(repository_id);

# Analyze query plan
EXPLAIN ANALYZE SELECT * FROM branch_protection WHERE repository_id = 'repo-123';
```

**For Network Bottleneck:**
- Contact infrastructure team
- Check network policies
- Verify service discovery

### Recovery Verification

- [ ] P50 latency < 100ms
- [ ] P99 latency < 500ms
- [ ] Error rate < 0.1%
- [ ] No slow queries
- [ ] CPU < 70%, Memory < 80%

---

## Runbook 4: Database Failover

**Trigger**: Primary database down or unreachable
**Severity**: P1
**Response**: 15 minutes
**Impact**: All operations blocked until recovery

### Detection

```bash
# Test primary connectivity
psql -h primary-postgres.prod -d gitvan -c "SELECT 1"

# Check replica status
psql -h replica-postgres.prod -d gitvan -c "SELECT pg_last_xlog_receive_location()"

# Check replication lag
SELECT EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp())) AS replication_lag_seconds;
```

### Failover Execution

**Step 1: Verify Primary is Really Down**
```bash
# Try multiple connection methods
ping primary-postgres.prod
curl -f https://primary-postgres.prod:8008/health || echo "FAILED"

# Wait 30 seconds for temporary network blip to clear
sleep 30
# Retry
```

**Step 2: Promote Replica to Primary**
```bash
# On replica, promote to primary
sudo -u postgres /usr/lib/postgresql/13/bin/pg_ctl promote -D /var/lib/postgresql/13/main

# Wait for promotion
sleep 5

# Test write capability
psql -h replica-postgres.prod -d gitvan -c "INSERT INTO health_check VALUES (NOW())"
```

**Step 3: Update Connection Strings**
```bash
# Update DNS to point to new primary (replica)
# Update application config:
kubectl set env deployment/git-qa-guards DATABASE_HOST=replica-postgres.prod

# Wait for rollout
kubectl rollout status deployment/git-qa-guards
```

**Step 4: Verify Operations**
```bash
# Test basic operations
curl -X POST http://localhost:8080/api/test/operation
# Should succeed

# Monitor error rate
watch 'curl -s http://localhost:9090/api/v1/query?query=rate(git_qa_guard_operations_total{result=\"error\"}[1m])'
# Should be < 0.1%
```

### Recovery Verification

- [ ] Write operations succeeding
- [ ] Error rate < 0.1%
- [ ] Replication lag < 1 second
- [ ] All replicas healthy
- [ ] Backups running normally

### Post-Failover

1. **Recover Original Primary**
   ```bash
   # Bring primary back online
   # Configure as replica to new primary
   # Verify replication sync
   ```

2. **Communication**
   - Update status page
   - Notify customers
   - Post post-mortem link

---

## Runbook 5: Security Incident

**Trigger**: Unauthorized access, failed audit, data breach
**Severity**: P1
**Response**: 15 minutes
**Impact**: Data security, compliance, reputation

### Immediate Actions

```
1. ISOLATE (< 5 minutes)
   ├─ Isolate affected systems
   ├─ Block suspicious IPs
   ├─ Revoke suspicious tokens
   └─ Enable enhanced logging

2. CONTAIN (5-30 minutes)
   ├─ Identify scope of compromise
   ├─ Determine exposed data
   ├─ Collect evidence
   └─ Notify security team

3. COMMUNICATE (30-60 minutes)
   ├─ Notify CISO
   ├─ Notify Legal
   ├─ Notify customers (if data exposed)
   └─ Prepare press statement

4. INVESTIGATE (2-4 hours)
   ├─ Timeline of events
   ├─ Attack vectors
   ├─ Indicators of compromise
   └─ Lessons learned
```

### Incident Response Contacts

```
CISO: ciso@company.com (Page on-call CISO)
Legal: legal@company.com
Privacy Officer: privacy@company.com
Communications: comms@company.com

On-Call Security Engineer: <CURRENT_ONCALL>
Public Incident Commander: comms@company.com
```

### Forensic Analysis

```bash
# Collect audit logs
SELECT * FROM audit_logs WHERE timestamp > 'INCIDENT_START_TIME' ORDER BY timestamp

# Identify unauthorized access
SELECT * FROM audit_logs WHERE result = 'DENIED' ORDER BY timestamp DESC LIMIT 100

# Find data exfiltration
SELECT * FROM git_operations WHERE action = 'CLONE' AND timestamp > 'INCIDENT_START_TIME'

# Preserve logs (immutable)
cp -r /var/log/gitvan-qa /var/log/incident-forensics-YYYY-MM-DD-HH
chmod 000 /var/log/incident-forensics-YYYY-MM-DD-HH
```

### Investigation Checklist

- [ ] Timeline of events established
- [ ] Affected systems identified
- [ ] Exposed data quantified
- [ ] Attack vector identified
- [ ] Remediation plan created
- [ ] Root cause identified
- [ ] Preventive measures implemented

---

## Communication Templates

### Initial Incident Notice (First 15 min)

```
🚨 INCIDENT DECLARED

Severity: [P1/P2/P3]
Service: Git QA Guards
Status: INVESTIGATING
Estimated Resolution: [TIME]

Impact: [BRIEF DESCRIPTION]

We are actively investigating and will provide updates every 15 minutes.
```

### Update (Every 15 minutes)

```
🔍 INCIDENT UPDATE #1

Status: IN PROGRESS
Last Updated: [TIME]
Next Update: [TIME]

Progress:
- [ACTION TAKEN]
- [FINDING]
- [NEXT STEPS]

Current Impact: [DESCRIPTION]
```

### All Clear

```
✅ INCIDENT RESOLVED

Service: Git QA Guards
Status: FULLY RECOVERED
Resolution Time: [DURATION]

Root Cause: [SUMMARY]
Mitigation: [WHAT WAS DONE]

Post-mortem scheduled: [DATE/TIME]
```

---

## Post-Incident Review Template

```
INCIDENT POST-MORTEM
====================

Incident: [TITLE]
Date: [DATE]
Duration: [DURATION]
Severity: [P1/P2/P3]
Participants: [NAMES]

Timeline:
├─ [TIME]: Detected
├─ [TIME]: Investigation started
├─ [TIME]: Mitigation applied
├─ [TIME]: Resolved
└─ Total duration: [TIME]

Root Cause: [ANALYSIS]

Contributing Factors: [LIST]

What Went Well:
- [POSITIVE]

What Could Be Better:
- [IMPROVEMENT]

Action Items:
- [ ] [ACTION] - Owner: [NAME] - Due: [DATE]
- [ ] [ACTION] - Owner: [NAME] - Due: [DATE]

Review Schedule: [DATE/TIME]
```

---

## Escalation Contacts

| Role | Name | Contact | Availability |
|------|------|---------|--------------|
| VP Engineering | [NAME] | [EMAIL/PHONE] | On-call |
| CISO | [NAME] | [EMAIL/PHONE] | Business hours |
| General Counsel | [NAME] | [EMAIL/PHONE] | Business hours |
| Communications | [NAME] | [EMAIL/PHONE] | On-call |
| Database Admin | [NAME] | [EMAIL/PHONE] | On-call |
| Infrastructure | [NAME] | [EMAIL/PHONE] | On-call |

---

**Status**: ✅ Production Ready

**Last Updated**: 2025-11-16

**Next Review**: 2025-12-16

**Test Frequency**: Monthly incident simulations
