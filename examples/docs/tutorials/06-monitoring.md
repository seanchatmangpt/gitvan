# Tutorial 6: Monitoring with OTEL & Observability

**Time**: 15 minutes
**Level**: Intermediate
**Goal**: Add observability to GitVan workflows

## Why Monitoring Matters

GitVan hooks process thousands of events. You need visibility:

- 📊 How many events processed?
- ⏱️ What's the latency?
- 🚨 Are hooks failing?
- 📈 What's the trend?

## OpenTelemetry (OTEL) Setup

### Step 1: Install OTEL Packages

```bash
npm install @opentelemetry/api @opentelemetry/sdk-node
npm install @opentelemetry/sdk-trace-node
npm install @opentelemetry/exporter-otlp-proto
npm install @opentelemetry/resources @opentelemetry/semantic-conventions
```

### Step 2: Create OTEL Configuration

Create `src/lib/otel.ts`:

```typescript
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-otlp-proto";

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4317",
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

console.log("Tracing initialized");

process.on("SIGTERM", () => {
  sdk.shutdown()
    .then(() => console.log("Tracing terminated"))
    .catch((log) => console.log("Error terminating tracing", log))
    .finally(() => process.exit(0));
});
```

### Step 3: Add Custom Spans

Create `src/lib/gitvan-instrumentation.ts`:

```typescript
import { trace } from "@opentelemetry/api";

const tracer = trace.getTracer("gitvan");

export async function traceGitVanMetrics() {
  const span = tracer.startSpan("gitvan:fetch-metrics");

  try {
    // Your GitVan code
    const metrics = await getGitVanMetrics();

    span.setAttribute("metrics.total_events", metrics.totalEvents);
    span.setAttribute("metrics.hooks_executed", metrics.hooksExecuted);
    span.setStatus({ code: 0 });

    return metrics;
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: 2, message: "Failed to fetch metrics" });
    throw error;
  } finally {
    span.end();
  }
}

export async function traceHookExecution(hookName: string) {
  const span = tracer.startSpan("gitvan:hook-execution", {
    attributes: {
      "hook.name": hookName,
      "hook.type": "knowledge_hook",
    },
  });

  try {
    await runHook(hookName);
    span.setStatus({ code: 0 });
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: 2 });
    throw error;
  } finally {
    span.end();
  }
}
```

## Monitoring Options

### Option 1: Jaeger (Open Source)

```bash
# Start Jaeger locally
docker run -p 16686:16686 -p 4317:4317 jaegertracing/all-in-one

# Configure your app
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317

# View traces at http://localhost:16686
```

### Option 2: Datadog

```bash
# Set API key
export DD_API_KEY=your_key
export DD_SITE=datadoghq.com

# Configure endpoint
OTEL_EXPORTER_OTLP_ENDPOINT=https://opentelemetry-intake.datadoghq.com/v1/traces

# View in Datadog dashboard
```

### Option 3: Honeycomb

```bash
# Set API key
export HONEYCOMB_API_KEY=your_key

# Configure
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io/v1/traces

# View in Honeycomb
```

## Dashboard Metrics

### Key Metrics to Track

```typescript
interface GitVanMetrics {
  // Events
  totalEvents: number;
  eventsPerSecond: number;
  eventsByType: Record<string, number>;

  // Hooks
  hooksExecuted: number;
  hookSuccessRate: number;
  hookLatency: {
    p50: number;
    p95: number;
    p99: number;
  };

  // Performance
  queueDepth: number;
  processingTime: number;

  // Errors
  failureRate: number;
  errorsByType: Record<string, number>;
}
```

### Sample Dashboard Query

```typescript
// Get last hour metrics
const metrics = await getMetricsForTimeRange({
  start: Date.now() - 3600000,
  end: Date.now(),
});

// Calculate trends
const trend = {
  eventsPerMinute: metrics.totalEvents / 60,
  hookSuccessRate: (
    (metrics.hooksExecuted - metrics.errorCount) /
    metrics.hooksExecuted
  ) * 100,
  p99Latency: metrics.hookLatency.p99,
};
```

## Alerting

### Alert Rules

```yaml
# Alert if hook success rate drops
- name: "GitVan Hook Failures"
  condition: "hook_success_rate < 95"
  severity: "warning"
  action: "notify_slack"

# Alert if queue is backing up
- name: "GitVan Queue Depth"
  condition: "queue_depth > 1000"
  severity: "critical"
  action: "page_oncall"

# Alert if latency is high
- name: "GitVan High Latency"
  condition: "p99_latency > 5000ms"
  severity: "warning"
  action: "notify_slack"
```

## Real-World Example: NextJS with OTEL

Update `next.config.js`:

```javascript
module.exports = {
  experimental: {
    instrumentation: {
      enabled: true,
    },
  },
};
```

Create `instrumentation.ts`:

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./src/lib/otel");
  }
}
```

## Logging Best Practices

### Structured Logging

```typescript
import { pino } from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
  },
});

// Log with context
logger.info({
  event: "hook_executed",
  hookName: "enforce-commits",
  duration: 45,
  status: "success",
  userId: "user-123",
});
```

### Log Aggregation

Integrate with:
- 📊 ELK Stack (Elasticsearch, Logstash, Kibana)
- 📈 Grafana Loki
- ☁️ CloudWatch (AWS)
- 🎯 Datadog Logs

## Performance Monitoring

### Metrics to Watch

```
Hook Execution:
- Average latency: < 100ms
- P99 latency: < 500ms
- Success rate: > 99%

Event Processing:
- Throughput: 1,000+ events/second
- Queue depth: < 100
- Processing time: < 100ms

Database:
- Query time: < 50ms
- Storage usage: monitor growth
- Connection pool: healthy
```

### Dashboards

Create dashboard showing:

```
Top Left: Hook Success Rate (gauge)
Top Right: Events Per Minute (line chart)
Bottom Left: Hook Latency (histogram)
Bottom Right: Error Rate (trend)
```

## Troubleshooting Guide

### Issue: High Hook Latency

```typescript
// Profile hook execution
const start = performance.now();
await runHook(hookName);
const duration = performance.now() - start;

if (duration > 500) {
  logger.warn({
    event: "slow_hook",
    hookName,
    duration,
    threshold: 500,
  });
}
```

### Issue: Queue Backing Up

```typescript
// Monitor queue depth
const queueDepth = await getQueueDepth();

if (queueDepth > 1000) {
  logger.error({
    event: "queue_backed_up",
    depth: queueDepth,
    action: "consider_scaling",
  });
}
```

### Issue: Memory Leaks

```typescript
// Track memory usage
setInterval(() => {
  const usage = process.memoryUsage();

  logger.info({
    event: "memory_usage",
    heap_used: Math.round(usage.heapUsed / 1024 / 1024) + " MB",
    heap_total: Math.round(usage.heapTotal / 1024 / 1024) + " MB",
  });
}, 60000); // Every minute
```

## Summary

You've learned:
✓ How to set up OpenTelemetry
✓ How to instrument GitVan operations
✓ How to choose monitoring platforms
✓ How to set up dashboards and alerts
✓ How to troubleshoot issues

## Next Steps

1. **Choose Your Platform**:
   - Local: Jaeger
   - Cloud: Datadog, Honeycomb
   - Enterprise: New Relic

2. **Create Dashboards**: Monitor production

3. **Set Up Alerts**: Get notified of issues

4. **Optimize**: Use metrics to improve performance

## Resources

- [OpenTelemetry Docs](https://opentelemetry.io/docs/)
- [Jaeger Getting Started](https://www.jaegertracing.io/docs/)
- [Datadog APM](https://docs.datadoghq.com/tracing/)
- [Honeycomb Docs](https://docs.honeycomb.io/)

---

**Monitoring is critical for production systems. Implement it before deploying to users.**
