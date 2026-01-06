# Production Error Handling - Quick Start Guide

## What Was Implemented

Production-grade error handling, logging, and reliability infrastructure for GitVan.

## Key Files Created

### Core Infrastructure (8 new files)

1. **`/src/utils/logger.mjs`** - Structured logging system
   - JSON/text formats
   - Correlation IDs
   - File output
   - Context propagation

2. **`/src/core/errors.mjs`** - Error class hierarchy
   - 11 specialized error types
   - Retry support
   - JSON serialization
   - Stack trace preservation

3. **`/src/core/error-handler.mjs`** - Centralized error handling
   - Global error boundary
   - Error categorization
   - Recovery strategies
   - Graceful shutdown

4. **`/src/utils/secrets.mjs`** - Secrets management
   - Environment variable loading
   - Secret validation
   - Log masking
   - Provider validation

5. **`/src/core/health-check.mjs`** - Health check system
   - Liveness/readiness probes
   - HTTP server (port 9090)
   - Custom health checks
   - Kubernetes ready

6. **`/src/utils/rate-limiter.mjs`** - Rate limiting & circuit breakers
   - Token bucket rate limiting
   - Circuit breaker pattern
   - Exponential backoff
   - Request queuing

7. **`/scripts/migrate-console-to-logger.mjs`** - Migration script
   - Replaces 1,427 console statements
   - Adds logger imports
   - Dry-run mode
   - Statistics reporting

8. **`/docs/PRODUCTION-ERROR-HANDLING.md`** - Complete documentation

### Modified Files (2 files)

1. **`/src/ai/provider-factory.mjs`** - CRITICAL SECURITY FIX
   - Removed silent mock provider fallback
   - Added strict validation
   - API key validation

2. **`/src/jobs/daemon.mjs`** - Production improvements
   - Structured logging
   - Removed process.exit()
   - Health check integration
   - Error recovery

## Next Steps

### 1. Run Migration Script (5 minutes)

```bash
# Dry run first
node scripts/migrate-console-to-logger.mjs --dry-run

# Apply changes
node scripts/migrate-console-to-logger.mjs
```

This will replace 1,427 console statements with structured logging.

### 2. Update CLI Commands (30 minutes)

Remove 119 `process.exit()` calls in CLI commands:

```bash
# Find all process.exit calls
grep -r "process\.exit" src/cli/commands/*.mjs

# Replace with exitWithError()
import { exitWithError } from "../../core/error-handler.mjs";

// Before:
console.error("Error:", error.message);
process.exit(1);

// After:
await exitWithError(error, 1);
```

### 3. Add Input Validation (1-2 hours)

Install Zod and add validation:

```bash
npm install zod
```

Example validation:

```javascript
import { z } from "zod";
import { ValidationError } from "../core/errors.mjs";

const configSchema = z.object({
  ai: z.object({
    provider: z.enum(["anthropic", "openai", "ollama"]),
    apiKey: z.string().optional(),
    model: z.string().optional()
  }).optional()
});

try {
  const validConfig = configSchema.parse(config);
} catch (error) {
  throw new ValidationError("Invalid configuration", error.errors);
}
```

### 4. Write Tests (2-4 hours)

See example: `/tests/utils/logger.test.mjs`

```bash
# Run tests
npm test tests/utils/logger.test.mjs

# Run with coverage
npm test -- --coverage
```

Target: 80%+ coverage for all new modules.

### 5. Setup Global Error Handlers (5 minutes)

In your main entry point (`src/cli.mjs` or daemon startup):

```javascript
import { setupGlobalErrorHandlers } from "./core/error-handler.mjs";
import { initializeSecrets } from "./utils/secrets.mjs";

// Setup at application start
setupGlobalErrorHandlers();

// Initialize secrets
initializeSecrets(config);
```

### 6. Enable Health Checks (5 minutes)

In daemon startup:

```javascript
import { JobDaemon } from "./jobs/daemon.mjs";

const daemon = new JobDaemon();
await daemon.start();

// Enable health checks
await daemon.enableHealthChecks({ port: 9090 });

// Test health endpoints
// curl http://localhost:9090/health/live
// curl http://localhost:9090/health/ready
```

## Quick Reference

### Logging

```javascript
import { createLogger } from "../utils/logger.mjs";

const logger = createLogger("module-name");

logger.info("Message", { context: "data" });
logger.error("Error occurred", { error: error.message });
logger.warn("Warning", { userId: 123 });
logger.debug("Debug info", { data });
```

### Error Handling

```javascript
import { withErrorBoundary, GitVanError } from "../core/error-handler.mjs";

// Wrap risky operations
const result = await withErrorBoundary(
  async () => await riskyOperation(),
  { maxRetries: 3, fallback: defaultValue }
);

// Throw structured errors
throw new GitVanError("Operation failed", {
  code: "OPERATION_FAILED",
  context: { userId: 123 },
  isRetryable: true
});
```

### Secrets

```javascript
import { getSecret, validateProviderSecrets } from "../utils/secrets.mjs";

// Get required secret
const apiKey = getSecret("ANTHROPIC_API_KEY", { required: true });

// Validate provider
validateProviderSecrets("anthropic");
```

### Health Checks

```bash
# Liveness (is process alive?)
curl http://localhost:9090/health/live

# Readiness (ready for traffic?)
curl http://localhost:9090/health/ready

# Full health status
curl http://localhost:9090/health
```

## Environment Variables

```bash
# Logging
export GITVAN_LOG_LEVEL=info       # silent, error, warn, info, debug
export GITVAN_LOG_FORMAT=text      # text or json
export GITVAN_LOG_FILE=/var/log/gitvan.log  # optional

# Environment
export NODE_ENV=production

# Secrets (example)
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...
```

## Production Deployment

```bash
# 1. Run migration
node scripts/migrate-console-to-logger.mjs

# 2. Set environment
export NODE_ENV=production
export GITVAN_LOG_LEVEL=warn
export GITVAN_LOG_FORMAT=json
export GITVAN_LOG_FILE=/var/log/gitvan.log

# 3. Set secrets
export ANTHROPIC_API_KEY=...

# 4. Start with health checks
# (Health checks enabled in daemon.start())

# 5. Verify health
curl http://localhost:9090/health
```

## Kubernetes Configuration

```yaml
# Liveness probe
livenessProbe:
  httpGet:
    path: /health/live
    port: 9090
  initialDelaySeconds: 30
  periodSeconds: 10

# Readiness probe
readinessProbe:
  httpGet:
    path: /health/ready
    port: 9090
  initialDelaySeconds: 10
  periodSeconds: 5
```

## Troubleshooting

### Migration Script Issues

```bash
# If migration fails, check syntax errors
npm run build

# Re-run in dry-run mode
node scripts/migrate-console-to-logger.mjs --dry-run --verbose
```

### Logger Not Working

```bash
# Check log level
echo $GITVAN_LOG_LEVEL

# Test logger
node -e "import('./src/utils/logger.mjs').then(({ createLogger }) => {
  const logger = createLogger('test');
  logger.info('Test message');
})"
```

### Health Checks Failing

```bash
# Check if daemon is running
curl http://localhost:9090/health/live

# Check individual checks
curl http://localhost:9090/health | jq '.checks'

# Check daemon status
# daemon.getStatus()
```

## Success Criteria

After completing next steps, verify:

- [ ] Migration script completed successfully
- [ ] All tests passing (80%+ coverage)
- [ ] No console.* statements in src/ (except fallbacks)
- [ ] No process.exit() calls in CLI commands
- [ ] Health checks responding on port 9090
- [ ] Logs are structured (JSON or text with correlation IDs)
- [ ] No secrets appearing in logs
- [ ] Graceful shutdown working (SIGTERM/SIGINT)
- [ ] Error recovery functional

## Documentation

For complete documentation, see:
- `/docs/PRODUCTION-ERROR-HANDLING.md` - Full documentation
- `/IMPLEMENTATION-SUMMARY.md` - Implementation details
- `/CLAUDE.md` - GitVan architecture guide

## Support

Questions or issues? Check:
1. Full documentation: `/docs/PRODUCTION-ERROR-HANDLING.md`
2. Implementation summary: `/IMPLEMENTATION-SUMMARY.md`
3. Test examples: `/tests/utils/logger.test.mjs`
4. Code examples in documentation

---

**Status:** ✓ Core infrastructure complete
**Next:** Run migration script and write tests
