# GitVan Grafana Dashboards

This directory contains Grafana dashboard definitions for monitoring GitVan across all phases.

## Dashboards

### Phase 1: Git-Native I/O
**File:** `phase1-git-native-io.json`

**Panels:**
- Lock acquisition rate and failures
- Lock duration histogram (P50, P95, P99)
- Deadlock detection events
- Snapshot storage usage
- Queue backlog size
- SPARQL query performance

**Key Metrics:**
- `gitvan_lock_acquire_total`
- `gitvan_lock_acquire_failures_total`
- `gitvan_lock_duration_seconds`
- `gitvan_deadlock_detected_total`
- `gitvan_snapshot_storage_bytes`
- `gitvan_queue_size`

### Phase 2: Performance Monitoring
**File:** `phase2-performance.json`

**Panels:**
- Performance regression trends
- Budget violation rate
- Anomaly detection timeline
- SPARQL query latency
- N3 rule application timing
- Operation correlation matrix

**Key Metrics:**
- `gitvan_performance_regression_total`
- `gitvan_budget_violation_total`
- `gitvan_anomaly_detected_total`
- `gitvan_sparql_query_duration_seconds`
- `gitvan_n3_rule_duration_seconds`
- `gitvan_operation_duration_seconds`

### Phase 3: RevOps
**File:** `phase3-revops.json`

**Panels:**
- Churn risk distribution
- High-risk customer count
- Expansion opportunities timeline
- Feature adoption rates
- LTV trends by cohort
- Revenue forecast accuracy

**Key Metrics:**
- `gitvan_customers_high_churn_risk`
- `gitvan_customer_churned_total`
- `gitvan_expansion_opportunities_total`
- `gitvan_feature_adoption_rate`
- `gitvan_ltv_estimate`
- `gitvan_revenue_forecast_error`

### Phase 4: Pack System
**File:** `phase4-pack-system.json`

**Panels:**
- Dependency resolution success/failure rate
- Resolution duration histogram
- License conflict events
- Circular dependency detection
- Federated query performance
- Pack registry operations rate

**Key Metrics:**
- `gitvan_dependency_resolution_total`
- `gitvan_dependency_resolution_failures_total`
- `gitvan_dependency_resolution_duration_seconds`
- `gitvan_license_conflict_total`
- `gitvan_circular_dependencies_total`
- `gitvan_federated_query_duration_seconds`

### System Overview
**File:** `system-overview.json`

**Panels:**
- CPU and memory usage
- Request rate and latency
- Error rate
- Active connections
- Disk I/O
- Network I/O

## Creating Dashboard JSON Files

To create actual dashboard JSON files, use the Grafana UI:

1. Access Grafana at `http://localhost:3001`
2. Create dashboards using the queries from this README
3. Export as JSON: Dashboard Settings → JSON Model → Copy to Clipboard
4. Save to this directory

Alternatively, use the Grafana HTTP API:

```bash
# Export dashboard
curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
  http://localhost:3001/api/dashboards/uid/<dashboard-uid> \
  > phase1-git-native-io.json

# Import dashboard
curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GRAFANA_API_KEY" \
  -d @phase1-git-native-io.json \
  http://localhost:3001/api/dashboards/db
```

## Sample Queries

### Phase 1 Queries

```promql
# Lock acquisition rate
rate(gitvan_lock_acquire_total[5m])

# Lock failures
rate(gitvan_lock_acquire_failures_total[5m])

# P95 lock duration
histogram_quantile(0.95, rate(gitvan_lock_duration_seconds_bucket[5m]))

# Deadlock events
increase(gitvan_deadlock_detected_total[5m])

# Snapshot storage usage
(gitvan_snapshot_storage_bytes / gitvan_snapshot_storage_max_bytes) * 100

# Queue backlog
gitvan_queue_size
```

### Phase 2 Queries

```promql
# Regression rate
rate(gitvan_performance_regression_total[10m])

# Budget violations
rate(gitvan_budget_violation_total[5m])

# Anomalies detected
rate(gitvan_anomaly_detected_total[10m])

# SPARQL query P95
histogram_quantile(0.95, rate(gitvan_sparql_query_duration_seconds_bucket[5m]))

# N3 rule timing
histogram_quantile(0.99, rate(gitvan_n3_rule_duration_seconds_bucket[5m]))
```

### Phase 3 Queries

```promql
# High churn risk customers
gitvan_customers_high_churn_risk

# Churn rate (7-day)
rate(gitvan_customer_churned_total[7d])

# Expansion opportunities
gitvan_expansion_opportunities_total

# Feature adoption
gitvan_feature_adoption_rate

# Average LTV by cohort
avg(gitvan_ltv_estimate) by (cohort)

# Forecast error
abs(gitvan_revenue_forecast_error)
```

### Phase 4 Queries

```promql
# Dependency resolution success rate
(rate(gitvan_dependency_resolution_total[5m]) - rate(gitvan_dependency_resolution_failures_total[5m])) / rate(gitvan_dependency_resolution_total[5m])

# Resolution duration P95
histogram_quantile(0.95, rate(gitvan_dependency_resolution_duration_seconds_bucket[5m]))

# License conflicts
increase(gitvan_license_conflict_total[10m])

# Circular dependencies
gitvan_circular_dependencies_total

# Federated query latency
histogram_quantile(0.95, rate(gitvan_federated_query_duration_seconds_bucket[5m]))
```

## Alert Annotations

Alerts are automatically annotated on dashboards. Configure in dashboard settings:

```json
{
  "annotations": {
    "list": [
      {
        "datasource": "Prometheus",
        "enable": true,
        "expr": "ALERTS{alertstate=\"firing\"}",
        "iconColor": "red",
        "name": "Alerts",
        "step": "60s",
        "tagKeys": "alertname,severity,phase",
        "textFormat": "{{alertname}}: {{annotations.description}}",
        "titleFormat": "Alert"
      }
    ]
  }
}
```

## Variables

Configure dashboard variables for filtering:

- **Phase**: `label_values(up, phase)`
- **Component**: `label_values(up, component)`
- **Instance**: `label_values(up, instance)`
- **Interval**: `$__auto_interval_interval`

## Refresh Rate

Recommended refresh rates:
- **Phase 1**: 10s (high-frequency lock operations)
- **Phase 2**: 15s (performance monitoring)
- **Phase 3**: 5m (RevOps updates slowly)
- **Phase 4**: 30s (pack operations)
- **System**: 5s (real-time system metrics)
