# Procedure 06: Performance Monitoring

## Purpose
Proactively identify and resolve performance issues through continuous monitoring, analysis, and optimization.

## Scope
Application performance metrics, infrastructure monitoring, optimization procedures, and performance incident response.

## Frequency
- **Real-time Monitoring**: Continuous
- **Performance Review**: Weekly
- **Optimization Sprint**: Monthly
- **Benchmarking**: Quarterly

## Responsible Party
**Primary**: All developers, DevOps
**Secondary**: Performance team

## Prerequisites
- Monitoring tools configured
- Metrics collection enabled
- Dashboard access
- Alert thresholds defined

## Key Performance Indicators (KPIs)

### Critical to Quality (CTQ) Metrics

| Metric | Target | Threshold |
|--------|--------|-----------|
| TTFJ (Time to First Job) | ≤ 10 min | Alert if > 15 min |
| p95 Runtime (simple jobs) | ≤ 300 ms | Alert if > 500 ms |
| Receipt Coverage | 100% | Alert if < 100% |
| Lock Contention | < 1% | Alert if ≥ 5% |
| Error Rate | < 1% | Alert if ≥ 2% |
| API Response Time (p95) | < 200 ms | Alert if ≥ 300 ms |

## Step-by-Step Instructions

### Phase 1: Set Up Monitoring

**Step 1.1: Install Monitoring Agent**
```bash
# Example: DataDog agent
DD_API_KEY=<key> DD_SITE="datadoghq.com" bash -c \
  "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"

# Or custom metrics collection
npm install --save prom-client
```
**Expected Outcome**: Agent installed
**Verification**: Agent reporting metrics

**Step 1.2: Configure Metrics Collection**
```javascript
// src/metrics/collector.mjs
import { Counter, Histogram, Gauge } from 'prom-client';

export const jobDuration = new Histogram({
  name: 'gitvan_job_duration_seconds',
  help: 'Job execution duration',
  labelNames: ['job_name', 'status']
});

export const jobsTotal = new Counter({
  name: 'gitvan_jobs_total',
  help: 'Total jobs executed',
  labelNames: ['job_name', 'status']
});

export const activeJobs = new Gauge({
  name: 'gitvan_active_jobs',
  help: 'Number of currently running jobs'
});
```
**Expected Outcome**: Metrics defined
**Verification**: Metrics exposed at `/metrics`

**Step 1.3: Instrument Code**
```javascript
// Example: Instrument job execution
export async function executeJob(jobName) {
  const timer = jobDuration.startTimer();
  activeJobs.inc();

  try {
    const result = await runJob(jobName);
    jobsTotal.inc({ job_name: jobName, status: 'success' });
    return result;
  } catch (error) {
    jobsTotal.inc({ job_name: jobName, status: 'failure' });
    throw error;
  } finally {
    timer({ job_name: jobName });
    activeJobs.dec();
  }
}
```
**Expected Outcome**: Code instrumented
**Verification**: Metrics updating on execution

**Step 1.4: Create Dashboards**
```bash
# Import dashboard templates
./scripts/import-dashboards.sh

# Or create custom dashboard
# - Job execution rate
# - Job duration percentiles
# - Error rate
# - Active jobs
# - Memory usage
# - CPU usage
```
**Expected Outcome**: Dashboards created
**Verification**: Visualizations showing data

### Phase 2: Monitor Performance

**Step 2.1: Check Real-Time Metrics**
```bash
# CLI metrics check
gitvan metrics show

# Or query Prometheus
curl http://localhost:9090/api/v1/query?query=gitvan_job_duration_seconds

# Check dashboard
open https://grafana.example.com/d/gitvan-overview
```
**Expected Outcome**: Current metrics visible
**Verification**: Metrics within expected ranges

**Step 2.2: Review Performance Dashboard Daily**
```bash
# Morning routine:
# 1. Check overnight job performance
# 2. Review error rates
# 3. Check resource utilization
# 4. Identify any anomalies
```
**Expected Outcome**: Performance understood
**Verification**: Anomalies noted for investigation

**Step 2.3: Set Up Alerts**
```yaml
# alerts.yml
groups:
  - name: gitvan_performance
    rules:
      - alert: HighJobDuration
        expr: histogram_quantile(0.95, gitvan_job_duration_seconds) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Job duration p95 above 500ms"

      - alert: HighErrorRate
        expr: rate(gitvan_jobs_total{status="failure"}[5m]) > 0.02
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Error rate above 2%"
```
**Expected Outcome**: Alerts configured
**Verification**: Test alert fires

### Phase 3: Analyze Performance

**Step 3.1: Identify Bottlenecks**
```bash
# Profile application
node --prof src/cli.mjs run my-job

# Generate profile report
node --prof-process isolate-*.log > profile.txt

# Analyze
less profile.txt
```
**Expected Outcome**: Bottlenecks identified
**Verification**: Hot paths visible

**Step 3.2: Benchmark Critical Paths**
```javascript
// benchmarks/job-execution.bench.mjs
import { bench, describe } from 'vitest';
import { executeJob } from '@/jobs/runner.mjs';

describe('Job Execution Performance', () => {
  bench('simple job execution', async () => {
    await executeJob('simple-job');
  }, { iterations: 100 });

  bench('complex job execution', async () => {
    await executeJob('complex-job');
  }, { iterations: 50 });
});
```
**Expected Outcome**: Benchmarks established
**Verification**: Baseline performance recorded

**Step 3.3: Run Performance Tests**
```bash
# Load testing
npm run test:load -- --users 100 --duration 5m

# Stress testing
npm run test:stress -- --users 1000 --ramp-up 60s

# Endurance testing
npm run test:endurance -- --users 50 --duration 24h
```
**Expected Outcome**: Performance under load known
**Verification**: Thresholds identified

**Step 3.4: Memory Profiling**
```bash
# Check for memory leaks
node --inspect src/cli.mjs run long-job

# In Chrome DevTools:
# 1. Take heap snapshot before
# 2. Execute operations
# 3. Force GC
# 4. Take heap snapshot after
# 5. Compare snapshots
```
**Expected Outcome**: Memory leaks identified (if any)
**Verification**: Memory stable over time

### Phase 4: Optimize Performance

**Step 4.1: Database Query Optimization**
```javascript
// Before: N+1 query problem
for (const job of jobs) {
  job.results = await db.query('SELECT * FROM results WHERE job_id = ?', job.id);
}

// After: Single query with JOIN
const jobs = await db.query(`
  SELECT j.*, r.*
  FROM jobs j
  LEFT JOIN results r ON r.job_id = j.id
`);
```
**Expected Outcome**: Queries optimized
**Verification**: Query time reduced

**Step 4.2: Caching Strategy**
```javascript
// src/cache/cache.mjs
import { LRUCache } from 'lru-cache';

const cache = new LRUCache({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes
});

export function getCachedOrFetch(key, fetchFn) {
  const cached = cache.get(key);
  if (cached) return cached;

  const value = fetchFn();
  cache.set(key, value);
  return value;
}
```
**Expected Outcome**: Caching implemented
**Verification**: Cache hit rate > 80%

**Step 4.3: Async Optimization**
```javascript
// Before: Sequential
const result1 = await operation1();
const result2 = await operation2();
const result3 = await operation3();

// After: Parallel
const [result1, result2, result3] = await Promise.all([
  operation1(),
  operation2(),
  operation3(),
]);
```
**Expected Outcome**: Parallelization improved
**Verification**: Total time reduced

**Step 4.4: Bundle Size Optimization**
```bash
# Analyze bundle
npm run build
npx vite-bundle-analyzer

# Tree-shake unused code
# Lazy load heavy dependencies
# Use dynamic imports
```
**Expected Outcome**: Bundle smaller
**Verification**: Load time improved

### Phase 5: Performance Incident Response

**Step 5.1: Detect Performance Degradation**
```bash
# Alert received: "p95 latency above threshold"

# Check current status
curl https://api.gitvan.example.com/metrics | grep latency

# Compare to baseline
./scripts/compare-performance.sh --baseline yesterday
```
**Expected Outcome**: Degradation confirmed
**Verification**: Metrics above threshold

**Step 5.2: Investigate Root Cause**
```bash
# Check recent deployments
git log --since="1 hour ago" --oneline

# Review system resources
ssh production "top -b -n 1"
ssh production "free -h"
ssh production "iostat"

# Check logs for errors
tail -n 1000 /var/log/gitvan/app.log | grep ERROR
```
**Expected Outcome**: Cause identified
**Verification**: Root cause documented

**Step 5.3: Immediate Mitigation**
```bash
# If caused by recent deployment: rollback
./scripts/rollback.sh

# If resource exhaustion: scale up
./scripts/scale-instances.sh --count 5

# If database slow: add read replicas
./scripts/add-read-replica.sh
```
**Expected Outcome**: Service stabilized
**Verification**: Metrics return to normal

**Step 5.4: Permanent Fix**
```bash
# Create fix
git checkout -b fix/performance-degradation

# Implement optimization
# ... code changes ...

# Test performance improvement
npm run test:performance

# Deploy fix
# ... follow deployment procedure ...
```
**Expected Outcome**: Issue resolved
**Verification**: Performance improved

### Phase 6: Performance Reporting

**Step 6.1: Weekly Performance Report**
```bash
# Generate report
./scripts/generate-performance-report.sh --week last

# Report includes:
# - Average response times
# - p50, p95, p99 latencies
# - Error rates
# - Resource utilization
# - Top slow queries/operations
# - Recommendations
```
**Expected Outcome**: Report generated
**Verification**: Trends visible

**Step 6.2: Performance Review Meeting**
```markdown
# Agenda
1. Review last week's metrics
2. Discuss any incidents
3. Review optimization efforts
4. Plan next optimizations
5. Assign action items
```
**Expected Outcome**: Team aligned
**Verification**: Action items assigned

## Success Criteria

- [ ] Monitoring infrastructure operational
- [ ] All metrics collected
- [ ] Dashboards accessible
- [ ] Alerts configured and tested
- [ ] Performance within SLA
- [ ] Bottlenecks identified
- [ ] Optimization plan exists
- [ ] Weekly reports generated

## Troubleshooting

### Issue: Metrics Not Updating
```bash
# Check collector running
ps aux | grep metrics-collector

# Verify network connectivity
curl http://localhost:9090/metrics

# Check logs
tail -f /var/log/metrics-collector.log
```

### Issue: False Alerts
```bash
# Adjust thresholds
# Edit alerts.yml
# Increase threshold or duration

# Add filters
expr: rate(errors[5m]) > 0.02 AND hour() > 8 AND hour() < 18
```

### Issue: Dashboard Not Loading
```bash
# Check Grafana service
systemctl status grafana-server

# Verify data source
curl http://grafana:3000/api/datasources

# Re-import dashboard
./scripts/import-dashboards.sh --force
```

## Performance Budget

| Operation | Budget | Measurement |
|-----------|--------|-------------|
| Cold start | 3 seconds | Time to CLI ready |
| Simple job | 300 ms (p95) | End-to-end execution |
| Complex job | 5 seconds (p95) | End-to-end execution |
| API call | 200 ms (p95) | Request to response |
| Page load | 2 seconds | DOMContentLoaded |

## References
- [Deployment Procedure](04-DEPLOYMENT-PROCEDURE.md)
- [Incident Management](07-INCIDENT-MANAGEMENT.md)
- [Testing Procedure](02-TESTING-PROCEDURE.md)

## Training Requirements
**Duration**: 2 hours
**Competency**: Can monitor metrics, identify issues, optimize code

## Revision History
| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-01-08 | 1.0 | Initial creation | GitVan Team |

---

**Remember**: Premature optimization is the root of all evil. Measure first, then optimize.
