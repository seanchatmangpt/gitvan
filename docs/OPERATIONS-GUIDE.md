# GitVan Operations Guide

**Version:** 3.0.0
**Date:** January 9, 2026
**Target:** Production operations across all RDF phases (1-4)

---

## Table of Contents

1. [Daily Operations](#daily-operations)
2. [Health Checks](#health-checks)
3. [Performance Tuning](#performance-tuning)
4. [Backup and Recovery](#backup-and-recovery)
5. [Scaling Guidelines](#scaling-guidelines)
6. [Incident Response](#incident-response)
7. [Maintenance Windows](#maintenance-windows)
8. [Monitoring and Alerting](#monitoring-and-alerting)

---

## Daily Operations

### Morning Checklist

**1. System Health (5 minutes)**
```bash
# Check service status
kubectl get pods -n gitvan
docker-compose ps  # or systemctl status gitvan

# Review overnight alerts
open http://localhost:9093  # AlertManager

# Check Grafana dashboards
open http://localhost:3001
```

**2. Performance Review (10 minutes)**
```bash
# Run automated benchmarks
node scripts/benchmark-phase1.mjs
node scripts/benchmark-phase2.mjs
node scripts/benchmark-phase3.mjs
node scripts/benchmark-phase4.mjs

# Check for regressions
node scripts/check-regressions.mjs

# Review results
cat .benchmarks/latest-regression-report.json
```

**3. Data Quality Checks (5 minutes)**
```bash
# Phase 1: Check lock status
gitvan debug locks --status

# Phase 2: Review anomalies
gitvan performance anomalies --last-24h

# Phase 3: Check churn risks
gitvan revops churn --high-risk

# Phase 4: Verify pack registry
gitvan pack registry --health-check
```

### Evening Checklist

**1. Backup Verification**
```bash
# Verify backups completed
ls -lh /backups/gitvan-$(date +%Y%m%d)*

# Test backup integrity
tar tzf /backups/gitvan-latest.tar.gz | head -20
```

**2. Log Review**
```bash
# Check error logs
kubectl logs deployment/gitvan -n gitvan | grep ERROR | tail -50
journalctl -u gitvan --since today | grep ERROR
```

**3. Capacity Planning**
```bash
# Check resource usage
kubectl top pods -n gitvan
docker stats --no-stream

# Review trends in Grafana
```

---

## Health Checks

### Automated Health Checks

**Docker:**
```bash
# Check container health
docker inspect gitvan | jq '.[0].State.Health'

# Manual health check
docker exec gitvan node -e "console.log('healthy')"
```

**Kubernetes:**
```bash
# Check pod health
kubectl get pods -n gitvan -o wide

# Describe pod for events
kubectl describe pod <pod-name> -n gitvan

# Check readiness/liveness probes
kubectl get pods -n gitvan -o json | jq '.items[].status.conditions'
```

### Phase-Specific Health Checks

**Phase 1: Git-Native I/O**
```bash
# Check lock manager
gitvan debug locks --status

# Expected output:
# Active locks: 5
# Deadlocks: 0
# Average lock duration: 245ms
# Lock contention rate: 2.3%

# Check snapshot store
gitvan debug snapshots --stats

# Check queue manager
gitvan debug queues --status
```

**Phase 2: Performance Monitoring**
```bash
# Check for performance issues
gitvan performance status

# Review recent regressions
gitvan performance regressions --last-24h

# Check SPARQL query performance
gitvan performance sparql --slow-queries
```

**Phase 3: RevOps**
```bash
# Check RevOps data freshness
gitvan revops status

# Review high-risk customers
gitvan revops churn --high-risk --count

# Check LTV calculations
gitvan revops ltv --validate
```

**Phase 4: Pack System**
```bash
# Check pack registry health
gitvan pack registry --health

# Verify dependency resolution
gitvan pack resolve-test

# Check federated connectivity
gitvan pack federated --ping-all
```

### Service Dependencies

**Check external services:**
```bash
# Prometheus
curl -f http://localhost:9090/-/healthy

# Grafana
curl -f http://localhost:3001/api/health

# AlertManager
curl -f http://localhost:9093/-/healthy

# Ollama (if using local AI)
curl -f http://localhost:11434/api/health
```

---

## Performance Tuning

### Phase 1: Lock Manager Optimization

**Reduce lock contention:**
```javascript
// gitvan.config.js
export default {
  gitNative: {
    locks: {
      // Reduce timeout for faster failure
      timeout: 30000,  // 30s instead of 60s

      // Increase retry attempts
      maxRetries: 5,

      // Enable priority locking
      priorityLocking: true,

      // Shard locks by resource type
      sharding: {
        enabled: true,
        shards: 16
      }
    }
  }
}
```

**Monitor lock performance:**
```promql
# Grafana query
histogram_quantile(0.95, rate(gitvan_lock_duration_seconds_bucket[5m]))
```

### Phase 2: SPARQL Query Optimization

**Enable query caching:**
```javascript
export default {
  sparql: {
    cache: {
      enabled: true,
      ttl: 300,  // 5 minutes
      maxSize: 1000
    },
    timeout: 30000,
    optimizations: {
      indexHints: true,
      parallelQueries: true
    }
  }
}
```

**Identify slow queries:**
```bash
# Find P99 slow queries
gitvan performance sparql --p99 --min-duration=1000
```

### Phase 3: RevOps Data Optimization

**Batch processing:**
```javascript
export default {
  revops: {
    batchProcessing: {
      enabled: true,
      batchSize: 100,
      intervalMs: 60000  // 1 minute
    },
    caching: {
      churnScores: { ttl: 3600 },  // 1 hour
      ltvEstimates: { ttl: 86400 }  // 24 hours
    }
  }
}
```

### Phase 4: Pack Registry Optimization

**Enable federated caching:**
```javascript
export default {
  packs: {
    cache: {
      enabled: true,
      ttl: 3600,  // 1 hour
      strategies: ['memory', 'disk']
    },
    federation: {
      timeout: 10000,
      parallel: true,
      cacheRemoteResults: true
    }
  }
}
```

### System-Level Tuning

**Node.js optimization:**
```bash
# Increase heap size
export NODE_OPTIONS="--max-old-space-size=4096"

# Enable V8 optimizations
export NODE_OPTIONS="--max-old-space-size=4096 --optimize-for-size"

# For large RDF graphs
export NODE_OPTIONS="--max-old-space-size=8192"
```

**Resource limits (Kubernetes):**
```yaml
resources:
  requests:
    memory: "1Gi"
    cpu: "1000m"
  limits:
    memory: "4Gi"
    cpu: "2000m"
```

---

## Backup and Recovery

### Automated Backups

**Setup automated backups:**

```bash
# Create backup script
cat > /usr/local/bin/gitvan-backup.sh <<'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR=/backups/gitvan
mkdir -p $BACKUP_DIR

# Backup data volume
docker run --rm \
  -v gitvan-data:/data \
  -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/gitvan-data-$DATE.tar.gz /data

# Backup configuration
cp /etc/gitvan/* $BACKUP_DIR/config-$DATE/

# Backup Prometheus data
docker run --rm \
  -v prometheus-data:/data \
  -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/prometheus-$DATE.tar.gz /data

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /usr/local/bin/gitvan-backup.sh
```

**Schedule with cron:**
```bash
# Daily at 2 AM
0 2 * * * /usr/local/bin/gitvan-backup.sh >> /var/log/gitvan-backup.log 2>&1
```

### Manual Backup

```bash
# Full backup
docker-compose down
tar czf gitvan-backup-$(date +%Y%m%d).tar.gz \
  /var/lib/gitvan \
  /etc/gitvan \
  /var/lib/docker/volumes/prometheus-data \
  /var/lib/docker/volumes/grafana-data
docker-compose up -d
```

### Recovery Procedures

**1. Restore from backup:**
```bash
# Stop services
docker-compose down

# Extract backup
tar xzf gitvan-backup-20260109.tar.gz -C /

# Start services
docker-compose up -d

# Verify restoration
docker exec gitvan node -e "console.log('healthy')"
```

**2. Disaster recovery:**
```bash
# New environment setup
git clone https://github.com/your-org/gitvan.git
cd gitvan

# Restore configuration
cp /path/to/backup/gitvan.config.js .
cp /path/to/backup/.env .

# Restore data
tar xzf /path/to/backup/gitvan-data-*.tar.gz -C /var/lib/

# Deploy
docker-compose up -d
```

**3. Point-in-time recovery:**
```bash
# List available backups
ls -lh /backups/gitvan-*

# Restore specific timestamp
BACKUP_DATE=20260109-140000
tar xzf /backups/gitvan-data-$BACKUP_DATE.tar.gz -C /var/lib/
```

---

## Scaling Guidelines

### Horizontal Scaling (Kubernetes)

**Manual scaling:**
```bash
# Scale to 5 replicas
kubectl scale deployment gitvan --replicas=5 -n gitvan

# Check scaling progress
kubectl get pods -n gitvan -w
```

**Auto-scaling:**
```yaml
# HPA already configured in deployment.yaml
# Monitor HPA status
kubectl get hpa -n gitvan

# Adjust HPA thresholds
kubectl patch hpa gitvan-hpa -n gitvan --type=json \
  -p='[{"op": "replace", "path": "/spec/minReplicas", "value": 5}]'
```

### Vertical Scaling

**Increase resources:**
```yaml
# Edit deployment
kubectl edit deployment gitvan -n gitvan

# Increase limits
resources:
  limits:
    memory: "8Gi"
    cpu: "4000m"
```

### Database Scaling

**RDF Graph partitioning:**
```javascript
export default {
  graph: {
    partitioning: {
      enabled: true,
      strategy: 'subject-hash',
      partitions: 16
    },
    replication: {
      enabled: true,
      replicas: 3
    }
  }
}
```

### Load Balancing

**Configure ingress load balancing:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    nginx.ingress.kubernetes.io/load-balance: "round_robin"
    nginx.ingress.kubernetes.io/upstream-hash-by: "$request_uri"
```

---

## Incident Response

### Severity Levels

**Critical (P0):**
- Complete service outage
- Data loss
- Security breach

**High (P1):**
- Major functionality broken
- Performance degradation >50%
- Multiple phase failures

**Medium (P2):**
- Single phase failure
- Performance degradation 20-50%
- Non-critical features broken

**Low (P3):**
- Minor issues
- Performance degradation <20%
- Enhancement requests

### Response Procedures

**P0 - Critical Incident:**

1. **Immediate actions (0-5 min):**
```bash
# Check system status
kubectl get pods -n gitvan
docker-compose ps

# Check logs
kubectl logs -f deployment/gitvan -n gitvan --tail=100

# Page on-call engineer
# Notify stakeholders
```

2. **Mitigation (5-30 min):**
```bash
# Rollback if recent deployment
kubectl rollout undo deployment/gitvan -n gitvan

# Scale up if capacity issue
kubectl scale deployment gitvan --replicas=10 -n gitvan

# Enable circuit breakers
gitvan config set circuit-breaker.enabled=true
```

3. **Root cause analysis (30 min - 2 hours):**
```bash
# Collect diagnostics
kubectl describe pod <pod-name> -n gitvan
kubectl logs --previous <pod-name> -n gitvan

# Check metrics
curl http://localhost:9090/api/v1/query?query=up

# Review recent changes
git log --since="2 hours ago" --oneline
```

4. **Post-incident (2+ hours):**
- Write incident report
- Identify preventive measures
- Update runbooks
- Schedule postmortem

### Common Incidents

**Deadlock detected:**
```bash
# Identify deadlock
gitvan debug locks --deadlock-graph

# Force release locks
gitvan debug locks --force-release --confirm

# Restart affected workers
kubectl delete pod -l app=gitvan -n gitvan --field-selector=status.phase=Running
```

**Performance regression:**
```bash
# Identify regression
node scripts/check-regressions.mjs

# Roll back changes
git revert <commit-sha>
npm run build
kubectl rollout restart deployment/gitvan -n gitvan
```

**High churn risk:**
```bash
# Get list of at-risk customers
gitvan revops churn --high-risk --export=csv

# Trigger intervention workflow
gitvan revops intervene --batch --dry-run
```

---

## Maintenance Windows

### Planned Maintenance

**Schedule:**
- **Weekly:** Sunday 2-4 AM UTC (minor updates, backups)
- **Monthly:** First Sunday 2-6 AM UTC (major updates, database maintenance)
- **Quarterly:** Scheduled separately (major version upgrades)

**Procedure:**

```bash
# 1. Notify users (24h advance)
gitvan notify --maintenance-window "2026-01-12 02:00 UTC" --duration=2h

# 2. Enable maintenance mode
kubectl annotate deployment gitvan maintenance-mode=true -n gitvan

# 3. Backup current state
/usr/local/bin/gitvan-backup.sh

# 4. Perform maintenance
kubectl set image deployment/gitvan gitvan=gitvan:3.0.1 -n gitvan
kubectl rollout status deployment/gitvan -n gitvan

# 5. Run smoke tests
node scripts/smoke-tests.mjs

# 6. Disable maintenance mode
kubectl annotate deployment gitvan maintenance-mode- -n gitvan

# 7. Notify users (completion)
gitvan notify --maintenance-complete
```

---

## Monitoring and Alerting

### Key Metrics

**Phase 1:**
- Lock acquisition rate: `rate(gitvan_lock_acquire_total[5m])`
- Lock failures: `rate(gitvan_lock_acquire_failures_total[5m])`
- Deadlocks: `gitvan_deadlock_detected_total`

**Phase 2:**
- Performance regressions: `rate(gitvan_performance_regression_total[10m])`
- Budget violations: `rate(gitvan_budget_violation_total[5m])`
- Anomalies: `rate(gitvan_anomaly_detected_total[10m])`

**Phase 3:**
- High churn risk: `gitvan_customers_high_churn_risk`
- Churn rate: `rate(gitvan_customer_churned_total[7d])`
- Expansion opportunities: `gitvan_expansion_opportunities_total`

**Phase 4:**
- Dependency failures: `rate(gitvan_dependency_resolution_failures_total[10m])`
- License conflicts: `gitvan_license_conflict_total`
- Federated query failures: `rate(gitvan_federated_query_failures_total[10m])`

### Alert Configuration

Already configured in `deploy/prometheus/alerts.yml`. Review and adjust thresholds as needed.

### On-Call Rotation

**Setup PagerDuty integration:**
```yaml
# alertmanager.yml
receivers:
  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_KEY'
        description: '{{ .CommonAnnotations.description }}'
```

---

**Next Steps:**
- Review SECURITY-GUIDE.md for security operations
- Set up monitoring dashboards
- Configure backup automation
- Establish on-call rotation

---

**Support:**
- Operations Docs: https://docs.gitvan.dev/operations
- Runbooks: https://runbooks.gitvan.dev
- On-Call: https://pagerduty.gitvan.dev
