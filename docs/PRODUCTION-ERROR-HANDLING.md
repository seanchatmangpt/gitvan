# Production-Grade Error Handling & Logging

## Overview

This document describes the production-ready error handling and logging infrastructure implemented in GitVan.

## Implementation Summary

### Phase 1: Core Infrastructure (Completed)

#### 1. Structured Logging (`src/utils/logger.mjs`)

**Features:**
- Structured logging with JSON or text format
- Correlation IDs for request tracing
- ISO 8601 timestamps
- Multiple output targets (stdout, file)
- Environment-based log levels
- Context propagation

**Usage:**
```javascript
import { createLogger } from "../utils/logger.mjs";

const logger = createLogger("my-module");

logger.info("Operation started", { userId: 123 });
logger.error("Operation failed", { error: error.message });
logger.debug("Debug info", { data: debugData });
```

**Environment Variables:**
- `GITVAN_LOG_LEVEL`: Log level (silent, error, warn, info, debug)
- `GITVAN_LOG_FORMAT`: Output format (text, json)
- `GITVAN_LOG_FILE`: Optional log file path

#### 2. Error Classes (`src/core/errors.mjs`)

**Error Hierarchy:**
- `GitVanError` - Base error class with context and retry support
- `ValidationError` - Input validation failures
- `NotFoundError` - Missing resources
- `UnauthorizedError` - Authentication failures
- `ForbiddenError` - Authorization failures
- `TimeoutError` - Operation timeouts
- `RateLimitError` - API rate limit exceeded
- `ConfigurationError` - Invalid configuration
- `ProviderError` - AI provider failures
- `GitError` - Git operation failures
- `WorkflowError` - Workflow execution failures

**Features:**
- Structured error information
- Error categorization
- Retry logic support
- Context propagation
- Stack trace preservation
- JSON serialization

**Usage:**
```javascript
import { GitVanError, ValidationError } from "../core/errors.mjs";

// Throw structured error
throw new ValidationError("Invalid input", [
  { path: "email", message: "Invalid email", code: "INVALID_EMAIL" }
]);

// Check if error is retryable
if (error instanceof GitVanError && error.isRetryable) {
  // Retry logic
}
```

#### 3. Centralized Error Handler (`src/core/error-handler.mjs`)

**Features:**
- Global error boundary
- Error categorization (user, system, internal, external)
- Recovery strategies (retry, fallback, fail, ignore, manual)
- Graceful shutdown coordination
- Active operation tracking
- Error handler registry

**Usage:**
```javascript
import {
  withErrorBoundary,
  setupGlobalErrorHandlers,
  registerErrorHandler,
  exitWithError
} from "../core/error-handler.mjs";

// Setup global handlers (in main entry point)
setupGlobalErrorHandlers();

// Wrap operations with error boundary
const result = await withErrorBoundary(
  async () => {
    return await riskyOperation();
  },
  {
    maxRetries: 3,
    retryDelay: 1000,
    backoffFactor: 2,
    fallback: defaultValue,
    onError: (error, attempt) => {
      logger.error("Operation failed", { error, attempt });
    }
  }
);

// Register custom error handler
registerErrorHandler("CUSTOM_ERROR", async (error) => {
  // Handle error
  return true; // Error handled
});

// Exit with proper error message
await exitWithError(error, 1);
```

**Error Categories:**
- `USER` - User-caused errors (validation, not found)
- `SYSTEM` - System errors (timeout, rate limit)
- `INTERNAL` - Internal errors (bugs, assertions)
- `EXTERNAL` - External service errors (provider, Git)

**Recovery Strategies:**
- `RETRY` - Retry the operation with exponential backoff
- `FALLBACK` - Use fallback value/behavior
- `FAIL` - Fail immediately
- `IGNORE` - Ignore the error
- `MANUAL` - Require manual intervention

#### 4. Secrets Management (`src/utils/secrets.mjs`)

**Features:**
- Environment variable loading
- Secret validation on startup
- Exposure warnings
- Secret masking for logs
- Provider-specific validation

**Usage:**
```javascript
import {
  getSecret,
  validateProviderSecrets,
  maskSecret,
  sanitizeForLogging
} from "../utils/secrets.mjs";

// Get secret with validation
const apiKey = getSecret("ANTHROPIC_API_KEY", { required: true });

// Validate provider secrets
validateProviderSecrets("anthropic"); // Throws if missing

// Mask secret for logging
logger.info("API Key", { key: maskSecret(apiKey) });

// Sanitize object for logging
logger.info("Config", sanitizeForLogging(config));
```

#### 5. Rate Limiting & Circuit Breakers (`src/utils/rate-limiter.mjs`)

**Features:**
- Token bucket rate limiting
- Circuit breaker for external APIs
- Exponential backoff with jitter
- Request queuing
- Per-service configuration

**Usage:**
```javascript
import {
  getRateLimiter,
  getCircuitBreaker,
  ExponentialBackoff
} from "../utils/rate-limiter.mjs";

// Get rate limiter for service
const limiter = getRateLimiter("anthropic", {
  maxTokens: 10,
  refillRate: 1,
  refillInterval: 1000
});

// Acquire tokens
await limiter.acquire(1);

// Get circuit breaker
const breaker = getCircuitBreaker("anthropic", {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000,
  resetTimeout: 60000
});

// Execute with circuit breaker
const result = await breaker.execute(async () => {
  return await externalApiCall();
});

// Exponential backoff
const backoff = new ExponentialBackoff({
  initialDelay: 1000,
  maxDelay: 60000,
  factor: 2,
  jitter: 0.1
});

await backoff.sleep(); // Sleep with backoff
```

#### 6. Health Check System (`src/core/health-check.mjs`)

**Features:**
- Kubernetes/Docker health probes
- Liveness and readiness endpoints
- Custom health checks
- HTTP health check server

**Endpoints:**
- `GET /health` - Overall health status
- `GET /health/live` or `/healthz` - Liveness probe
- `GET /health/ready` or `/readyz` - Readiness probe

**Usage:**
```javascript
import {
  HealthCheckManager,
  createDefaultHealthChecks,
  HealthStatus
} from "../core/health-check.mjs";

// Create health check manager
const healthChecks = new HealthCheckManager({ port: 9090 });

// Register custom check
healthChecks.register("database", async () => {
  try {
    await db.ping();
    return { status: HealthStatus.HEALTHY };
  } catch (error) {
    return {
      status: HealthStatus.UNHEALTHY,
      error: error.message
    };
  }
});

// Start health check server
await healthChecks.start();

// Mark as ready
healthChecks.setReady(true);
```

### Phase 2: Security Fixes (Completed)

#### 1. AI Provider Factory Security Fix

**Issue:** Silent fallback to mock provider in production
**Fix:** Strict provider validation with explicit errors

**Changes:**
- Removed silent fallback to mock provider
- Added environment-based provider validation
- Mock provider only allowed in test environment
- Explicit errors when provider creation fails
- API key validation for all providers

**File:** `src/ai/provider-factory.mjs`

```javascript
// Before (INSECURE):
default:
  logger.warn(`Unknown provider: ${provider}, falling back to mock`);
  return createMockProvider(aiConfig);

// After (SECURE):
default:
  throw new ConfigurationError(
    `Unknown AI provider: '${provider}'. Valid providers: ollama, openai, anthropic`,
    "ai.provider"
  );
```

### Phase 3: Daemon Improvements (Completed)

#### 1. Production-Grade Daemon

**Changes to `src/jobs/daemon.mjs`:**
- Added structured logging throughout
- Removed `process.exit()` calls (delegates to error handler)
- Added error recovery with circuit breaker
- Added operation tracking
- Added shutdown callbacks
- Integrated health checks
- Added error rate monitoring

**Features:**
- Graceful shutdown (no data loss)
- Error rate monitoring (stops after 10 errors)
- Health check integration
- Operation tracking for observability
- Structured logging with context

**Usage:**
```javascript
import { JobDaemon } from "./jobs/daemon.mjs";

const daemon = new JobDaemon({
  eventCheckInterval: 30000,
  cronTickInterval: 60000
});

// Start daemon
await daemon.start();

// Enable health checks
await daemon.enableHealthChecks({ port: 9090 });

// Register shutdown callback
daemon.onShutdown(async () => {
  await cleanup();
});

// Get status
const status = daemon.getStatus();
```

### Phase 4: Migration Tools (Completed)

#### Console to Logger Migration Script

**File:** `scripts/migrate-console-to-logger.mjs`

**Features:**
- Scans all .mjs files
- Replaces console.* with logger.*
- Adds logger imports automatically
- Dry-run mode for testing
- Statistics reporting

**Usage:**
```bash
# Dry run (no changes)
node scripts/migrate-console-to-logger.mjs --dry-run

# Apply changes
node scripts/migrate-console-to-logger.mjs

# Verbose output
node scripts/migrate-console-to-logger.mjs --verbose
```

**Replacements:**
- `console.log()` → `logger.info()`
- `console.error()` → `logger.error()`
- `console.warn()` → `logger.warn()`
- `console.debug()` → `logger.debug()`

## Files Created/Modified

### New Files Created:

1. `/src/utils/logger.mjs` - Enhanced structured logging
2. `/src/core/errors.mjs` - Error class hierarchy
3. `/src/core/error-handler.mjs` - Centralized error handling
4. `/src/utils/secrets.mjs` - Secrets management
5. `/src/utils/rate-limiter.mjs` - Rate limiting & circuit breakers
6. `/src/core/health-check.mjs` - Health check system
7. `/scripts/migrate-console-to-logger.mjs` - Migration script
8. `/docs/PRODUCTION-ERROR-HANDLING.md` - This document

### Modified Files:

1. `/src/ai/provider-factory.mjs` - Security fixes
2. `/src/jobs/daemon.mjs` - Production improvements

## Current Status

### Completed (Phase 1-3):

- [x] Structured logging infrastructure
- [x] Error class hierarchy
- [x] Centralized error handler
- [x] Secrets management
- [x] Rate limiting & circuit breakers
- [x] Health check system
- [x] AI provider security fixes
- [x] Daemon improvements
- [x] Migration script

### Remaining Work:

#### Immediate:
1. **Run migration script** - Replace 1,427 console statements
2. **Remove process.exit()** - Replace 119 instances in CLI commands
3. **Input validation** - Add Zod validation for external inputs
4. **Write tests** - Comprehensive test coverage

#### Future Phases:
5. **Observability** - OpenTelemetry integration
6. **Metrics** - Prometheus metrics collection
7. **Distributed Tracing** - Request tracing across services
8. **Log Aggregation** - Integration with log aggregation services

## Usage Guidelines

### 1. Logging Best Practices

```javascript
// Good - Structured logging with context
logger.info("User logged in", {
  userId: user.id,
  email: sanitizeForLogging({ email: user.email })
});

// Bad - Unstructured logging
console.log("User logged in: " + user.id);

// Good - Log levels
logger.debug("Cache hit", { key, ttl });  // Development only
logger.info("Request processed", { duration });  // Normal operations
logger.warn("Retry attempt", { attempt, maxRetries });  // Warnings
logger.error("Operation failed", { error: error.message });  // Errors

// Good - Child loggers
const requestLogger = logger.child("request", { requestId });
requestLogger.info("Processing");
```

### 2. Error Handling Best Practices

```javascript
// Good - Structured errors
throw new ValidationError("Invalid input", [
  { path: "email", message: "Invalid format", code: "INVALID_EMAIL" }
]);

// Bad - Generic errors
throw new Error("Invalid email");

// Good - Error boundaries
const result = await withErrorBoundary(
  async () => await riskyOperation(),
  { maxRetries: 3, fallback: defaultValue }
);

// Bad - Unhandled errors
const result = await riskyOperation(); // May throw
```

### 3. Secrets Best Practices

```javascript
// Good - Secret validation
const apiKey = getSecret("API_KEY", { required: true });

// Good - Sanitize for logs
logger.info("Config", sanitizeForLogging(config));

// Bad - Log secrets
logger.info("Config", config); // May contain secrets
```

### 4. Health Check Best Practices

```javascript
// Good - Specific health checks
healthChecks.register("database", async () => {
  const start = Date.now();
  await db.ping();
  return {
    status: HealthStatus.HEALTHY,
    latency: Date.now() - start
  };
});

// Good - Degraded state for warnings
if (cacheHitRate < 0.5) {
  return {
    status: HealthStatus.DEGRADED,
    message: "Low cache hit rate",
    cacheHitRate
  };
}
```

## Testing

### Running Tests

```bash
# Test logger
npm test src/utils/logger.mjs

# Test error handling
npm test src/core/errors.mjs
npm test src/core/error-handler.mjs

# Test secrets
npm test src/utils/secrets.mjs

# Test rate limiting
npm test src/utils/rate-limiter.mjs

# Test health checks
npm test src/core/health-check.mjs
```

### Test Coverage Goals

- Minimum 80% coverage for all modules
- 100% coverage for error handling paths
- Integration tests for daemon with health checks
- E2E tests for error recovery

## Monitoring & Observability

### Log Levels in Production

```bash
# Production (only errors and warnings)
export GITVAN_LOG_LEVEL=warn

# Staging (info and above)
export GITVAN_LOG_LEVEL=info

# Development (all logs)
export GITVAN_LOG_LEVEL=debug
```

### Health Check Endpoints

```bash
# Check liveness (is process alive?)
curl http://localhost:9090/health/live

# Check readiness (ready for traffic?)
curl http://localhost:9090/health/ready

# Full health status
curl http://localhost:9090/health
```

### Metrics to Monitor

1. **Error Rate** - Errors per minute
2. **Latency** - Request processing time
3. **Health Status** - Overall system health
4. **Circuit Breaker State** - Open/closed/half-open
5. **Rate Limit Hits** - Requests rate-limited
6. **Uptime** - Time since daemon started

## Deployment Checklist

Before deploying to production:

- [ ] Run migration script to replace console statements
- [ ] Remove all process.exit() calls
- [ ] Set `NODE_ENV=production`
- [ ] Set appropriate `GITVAN_LOG_LEVEL` (warn or error)
- [ ] Set `GITVAN_LOG_FORMAT=json` for log aggregation
- [ ] Set `GITVAN_LOG_FILE` for file logging
- [ ] Configure all required secrets
- [ ] Enable health checks on port 9090
- [ ] Configure Kubernetes liveness/readiness probes
- [ ] Set up log aggregation
- [ ] Set up metrics collection
- [ ] Test graceful shutdown
- [ ] Test error recovery
- [ ] Verify no secrets in logs

## Kubernetes Integration

### Liveness Probe

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 9090
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

### Readiness Probe

```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 9090
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

## Troubleshooting

### High Error Rate

1. Check error logs: `GITVAN_LOG_LEVEL=debug`
2. Check health status: `curl http://localhost:9090/health`
3. Check circuit breaker state
4. Review recent changes

### Daemon Not Starting

1. Check secrets validation
2. Check Git availability
3. Check configuration
4. Review startup logs

### Health Checks Failing

1. Check daemon status: `daemon.getStatus()`
2. Check individual health checks
3. Review error count
4. Check external dependencies

## References

- [GitVan Architecture](../CLAUDE.md)
- [Error Handling Patterns](https://www.npmjs.com/package/error-handling-patterns)
- [Structured Logging](https://www.npmjs.com/package/pino)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
