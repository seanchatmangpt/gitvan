# GitVan Git QA - Production Monitoring & Observability Guide

**Version**: 1.0
**Audience**: Operations, DevOps, Engineering
**Compliance**: SOC2, ISO 27001

---

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│              Observability Stack Architecture               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Applications] → [Instrumentation] → [Collectors]         │
│                                        ↓                     │
│                               ┌──────────────────────┐      │
│                               │  Prometheus          │      │
│                               │  (Metrics)           │      │
│                               └──────────────────────┘      │
│                                        ↓                     │
│                  ┌─────────────────────────────────────┐   │
│                  │   Grafana (Visualization)           │   │
│                  │   - Dashboards                       │   │
│                  │   - Alerts                           │   │
│                  │   - Correlations                     │   │
│                  └─────────────────────────────────────┘   │
│                                                              │
│  [Applications] → [Logs] → [Filebeat] → [ELK Stack]        │
│                                             ↓                │
│                               ┌──────────────────────┐      │
│                               │  Elasticsearch       │      │
│                               │  Kibana              │      │
│                               │  Logstash            │      │
│                               └──────────────────────┘      │
│                                                              │
│  [Applications] → [Traces] → [Jaeger Collector] →         │
│                                  ↓                           │
│                               [Jaeger Backend]              │
│                                  ↓                           │
│                               [Jaeger UI]                   │
│                                                              │
│  [Alerts] → [Alert Manager] → [PagerDuty/Slack]           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Metrics Collection & Monitoring

### Key Metrics

```
Application Metrics:
├─ Guard Operations (counter, histogram)
├─ Git Operations (counter, histogram)
├─ Failures Prevented (counter)
├─ Conflicts Detected (counter)
├─ Lock Acquisition Time (histogram)
└─ Guard Operation Errors (counter)

System Metrics:
├─ CPU Usage (gauge)
├─ Memory Usage (gauge)
├─ Disk I/O (counter)
├─ Network I/O (counter)
├─ Database Connections (gauge)
└─ Cache Performance (gauge)

Business Metrics:
├─ Availability (percent)
├─ Error Rate (percent)
├─ Mean Response Time (ms)
├─ P50/P95/P99 Latency (ms)
├─ Throughput (ops/sec)
└─ SLA Compliance (percent)
```

### Prometheus Configuration

```yaml
# prometheus.yml

global:
  scrape_interval: 15s
  evaluation_interval: 15s
  retention: 30d

scrape_configs:
  - job_name: 'git-qa-guards'
    static_configs:
      - targets: ['localhost:8080']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']
    scrape_interval: 30s

  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']
    scrape_interval: 30s

  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
    scrape_interval: 30s

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']

rule_files:
  - 'alert-rules.yml'
```

### Alert Rules

```yaml
# alert-rules.yml

groups:
  - name: GitQA
    interval: 30s
    rules:
      # High Error Rate
      - alert: HighErrorRate
        expr: |
          rate(git_qa_guard_operations_total{result="error"}[5m]) > 0.001
        for: 5m
        annotations:
          summary: "High error rate detected (>0.1%)"
          runbook: "runbook-high-error-rate.md"

      # High Latency
      - alert: HighLatency
        expr: |
          histogram_quantile(0.99, git_qa_guard_operation_duration_seconds) > 0.5
        for: 5m
        annotations:
          summary: "High P99 latency detected (>500ms)"
          runbook: "runbook-high-latency.md"

      # Lock Contention
      - alert: LockContention
        expr: |
          histogram_quantile(0.99, git_qa_lock_acquisition_time_seconds) > 0.05
        for: 5m
        annotations:
          summary: "Lock contention detected (acquisition time >50ms)"

      # Deadlock Detection
      - alert: DeadlockDetected
        expr: |
          increase(git_qa_deadlocks_detected_total[1m]) > 0
        for: 1m
        annotations:
          summary: "Deadlock condition detected"
          severity: critical

      # Database Connection Pool
      - alert: DatabaseConnectionPoolExhausted
        expr: |
          pg_stat_activity_count / on(instance) pg_settings_max_connections > 0.8
        for: 5m
        annotations:
          summary: "Database connection pool >80% utilized"

      # Backup Staleness
      - alert: BackupStale
        expr: |
          time() - last_backup_timestamp > 3600
        for: 5m
        annotations:
          summary: "Latest backup is older than 1 hour"
          severity: warning
```

### Grafana Dashboards

**Dashboard 1: Git QA Operations**
```json
{
  "title": "Git QA Operations",
  "panels": [
    {
      "title": "Guard Operations Rate",
      "targets": [
        {
          "expr": "rate(git_qa_guard_operations_total[5m])",
          "legendFormat": "{{ guard_type }}"
        }
      ]
    },
    {
      "title": "Guard Operation Latency (P50/P99)",
      "targets": [
        {
          "expr": "histogram_quantile(0.50, git_qa_guard_operation_duration_seconds)"
        },
        {
          "expr": "histogram_quantile(0.99, git_qa_guard_operation_duration_seconds)"
        }
      ]
    },
    {
      "title": "Failures Prevented",
      "targets": [
        {
          "expr": "increase(git_qa_failures_prevented_total[1h])",
          "legendFormat": "{{ failure_type }}"
        }
      ]
    },
    {
      "title": "Error Rate",
      "targets": [
        {
          "expr": "rate(git_qa_guard_operations_total{result=\"error\"}[5m]) * 100"
        }
      ]
    }
  ]
}
```

**Dashboard 2: System Health**
```json
{
  "title": "System Health",
  "panels": [
    {
      "title": "CPU Usage",
      "targets": [
        {
          "expr": "1 - (avg by (instance) (irate(node_cpu_seconds_total{mode=\"idle\"}[5m])))"
        }
      ]
    },
    {
      "title": "Memory Usage",
      "targets": [
        {
          "expr": "node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes"
        }
      ]
    },
    {
      "title": "Disk Usage",
      "targets": [
        {
          "expr": "node_filesystem_avail_bytes / node_filesystem_size_bytes"
        }
      ]
    },
    {
      "title": "Database Connections",
      "targets": [
        {
          "expr": "pg_stat_activity_count"
        }
      ]
    }
  ]
}
```

---

## 2. Structured Logging

### Log Format

All logs should follow this JSON structure:

```json
{
  "@timestamp": "2025-11-16T12:34:56.789Z",
  "service": "git-qa-guards",
  "environment": "production",
  "version": "1.0.0",
  "level": "INFO",
  "message": "Guard operation completed",
  "fields": {
    "guard_type": "protected_branch",
    "operation": "force_push",
    "result": "BLOCKED",
    "repository_id": "repo-123",
    "user_id": "user-456",
    "duration_ms": 45,
    "timestamp": "2025-11-16T12:34:56Z"
  },
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7"
}
```

### ELK Stack Configuration

```
Filebeat → Logstash → Elasticsearch → Kibana

Logstash Pipeline:
├─ Input
│  └─ filebeat: ports 5000
├─ Filter
│  ├─ json: Parse JSON logs
│  ├─ if [service] == "git-qa-guards"
│  │  └─ Add custom fields
│  └─ mutate: Clean up
└─ Output
   ├─ elasticsearch: Index logs
   └─ stdout: Console output
```

### Kibana Dashboards

**Dashboard: Guard Operations Analysis**
- Guard operations by type
- Top 10 blocked operations
- Average operation duration
- Error rate trend

**Dashboard: Security Events**
- Failed authentication attempts
- Unauthorized access attempts
- Configuration changes
- User access patterns

**Dashboard: System Events**
- Deployment activities
- Configuration changes
- Database migrations
- Service restarts

---

## 3. Distributed Tracing

### Jaeger Configuration

```yaml
# jaeger-collector.yml

collector:
  port: 14268

sampling:
  type: probabilistic
  param: 0.1  # Sample 10% of traces

storage:
  type: elasticsearch
  elasticsearch:
    server_urls: ['http://elasticsearch:9200']
    index_prefix: jaeger

reporting_port: 14269
```

### Trace Instrumentation

Traces should track:
- Guard operation execution
- Git operation timing
- Database query duration
- API response time
- Lock acquisition time

### Jaeger UI Queries

```
# Find slow operations
operation.name="guard_operation"
minDuration=500ms

# Find error operations
operation.name="git_operation"
status=error

# Find lock contention
operation.name="lock_acquisition"
minDuration=100ms
```

---

## 4. Performance Baselines

| Metric | Target | P99 | Alert Threshold |
|--------|--------|-----|-----------------|
| Guard Operation | <100ms | <500ms | >500ms |
| Git Operation | <200ms | <1000ms | >1000ms |
| Lock Acquisition | <10ms | <50ms | >50ms |
| Database Query | <50ms | <100ms | >100ms |
| API Response | <100ms | <500ms | >500ms |
| Availability | 99.95% | N/A | <99.5% |
| Error Rate | <0.05% | N/A | >0.1% |

---

## 5. On-Call Dashboards

### SLA Dashboard

```
Current Period: Nov 1 - Nov 30

Uptime: 99.96% ✅ (Target: 99.95%)
Error Rate: 0.08% ✅ (Target: <0.1%)
P50 Latency: 87ms ✅ (Target: <100ms)
P99 Latency: 420ms ✅ (Target: <500ms)

Incidents This Month: 1 (resolved)
Credits Owed: $0

Status: COMPLIANT
```

### Real-Time Operations

```
Last Hour:
- Guard Operations: 450,000
- Success Rate: 99.92%
- Avg Latency: 89ms
- Peak QPS: 1,250

Current Issues:
- None

Recent Alerts (24h):
- [RESOLVED] High error rate (11:30 UTC)
```

### Security Status

```
Threats Detected: 3 (all blocked)
- Force push attempt to main
- Unauthorized merge attempt
- Suspicious branch delete

Failed Auth Attempts: 12
- 10 invalid credentials
- 2 expired tokens

Access Violations: 0
```

---

## 6. Runbook Integration

Each alert links to a runbook:

```
Alert: HighErrorRate
├─ Severity: P2
├─ SLA Response: 4 hours
├─ Runbook: runbook-high-error-rate.md
│  └─ Steps:
│     1. Check recent deployments
│     2. Review error logs
│     3. Check database connectivity
│     4. Check external service status
│     5. Consider rollback
└─ Escalation: On-call engineer → VP Engineering
```

---

## 7. Capacity Planning

### Usage Growth Tracking

```
Metrics to Track:
├─ Operations per second (OPS growth)
├─ Repository count
├─ User count
├─ Data volume
├─ Database size
└─ Cache memory

Growth Analysis (Monthly):
- OPS growth: 15% MoM
- Repository growth: 8% MoM
- User growth: 12% MoM

Forecast (6 months):
- OPS: Current 1000/s → 4000/s
- DB Size: Current 500GB → 1.2TB
- Cache: Current 100GB → 250GB

Action Items:
- Increase database resources (month 3)
- Increase cache nodes (month 4)
- Plan infrastructure scaling
```

---

## 8. Compliance Reporting

### Audit Metrics

```
Daily Report:
├─ Total Audit Events: 50,000
├─ Authentication Events: 15,000
│  ├─ Successful: 14,900 (99.3%)
│  └─ Failed: 100 (0.7%)
├─ Guard Operations: 30,000
│  ├─ Allowed: 29,700 (99%)
│  └─ Blocked: 300 (1%)
├─ Configuration Changes: 50
│  ├─ Approved: 50 (100%)
│  └─ Unapproved: 0
└─ Data Access: 5,000
   ├─ Granted: 4,950 (99%)
   └─ Denied: 50 (1%)
```

### Compliance Dashboard

```
SOC2 Controls Coverage: 98%
├─ CC6: Logical Access - 100%
├─ CC7: Monitoring - 98%
├─ CC8: Operations - 96%
└─ CC9: Recovery - 100%

ISO 27001 Coverage: 96%
├─ A.9: Access Control - 100%
├─ A.10: Cryptography - 95%
├─ A.12: Operations - 95%
└─ A.13: Communications - 96%

Last Audit: 2025-11-01
Next Audit: 2025-12-01
Issues: 0 critical, 1 minor
```

---

## 9. Troubleshooting Guide

### High Error Rate Investigation

1. **Check Recent Deployments**
   ```
   Query: Deployment events in last 1 hour
   ```

2. **Review Error Logs**
   ```
   Kibana: status=error service=git-qa-guards
   ```

3. **Check External Dependencies**
   - Database connectivity
   - Cache availability
   - Git server status

4. **Monitor Live Metrics**
   - Watch Grafana dashboard
   - Check trace sampling
   - Review alert history

---

## 10. Weekly Review Checklist

- [ ] SLA/SLO compliance: ≥ 99.95%
- [ ] Error rate: < 0.1%
- [ ] No unresolved critical alerts
- [ ] All backups verified
- [ ] Log storage < 80%
- [ ] Database replication: In sync
- [ ] Certificate expiration: > 90 days
- [ ] Incident post-mortems: Completed
- [ ] Team training: Current

---

**Status**: ✅ Production Ready

**Last Updated**: 2025-11-16

**Next Review**: 2025-12-16
