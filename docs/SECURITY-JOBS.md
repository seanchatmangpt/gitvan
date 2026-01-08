# Job System Security Hardening Guide

GitVan v4.0.0 - Bree Integration

## Table of Contents

- [Security Principles](#security-principles)
- [Threat Model](#threat-model)
- [Security Mitigations](#security-mitigations)
- [Security Checklist for Job Definitions](#security-checklist-for-job-definitions)
- [Incident Response](#incident-response)

---

## Security Principles

### 1. Principle of Least Privilege

Jobs should run with minimum necessary permissions.

**Implementation:**
```javascript
export default {
  jobs: {
    workerOptions: {
      env: {
        // Only essential env vars
        NODE_ENV: process.env.NODE_ENV,
        TZ: 'UTC',
        LANG: 'C'
        // Exclude sensitive vars
      }
    }
  }
};
```

### 2. Environment Variable Isolation

Filter sensitive environment variables before passing to workers.

**Secure Configuration:**
```javascript
// JobBridge.executeJobWithLock()
const execContext = {
  env: {
    TZ: 'UTC',
    LANG: 'C',
    NODE_ENV: process.env.NODE_ENV,
    // Explicitly include only safe vars
    // Exclude: API_KEY, SECRET, PASSWORD, etc.
  }
};
```

**Validation:**
```javascript
const SENSITIVE_PATTERNS = [
  /API_KEY/i,
  /SECRET/i,
  /PASSWORD/i,
  /TOKEN/i,
  /PRIVATE/i
];

function filterEnv(env) {
  const filtered = {};
  for (const [key, value] of Object.entries(env)) {
    if (!SENSITIVE_PATTERNS.some(pattern => pattern.test(key))) {
      filtered[key] = value;
    }
  }
  return filtered;
}
```

### 3. File Path Validation

Prevent path traversal attacks.

**Secure Path Handling:**
```javascript
import { join, normalize, isAbsolute } from 'pathe';

function validateJobPath(jobId) {
  // Remove dangerous characters
  const sanitized = jobId.replace(/[^a-zA-Z0-9/_-]/g, '');

  // Prevent path traversal
  if (sanitized.includes('..')) {
    throw new Error('Path traversal detected');
  }

  // Ensure within jobs directory
  const jobPath = join('jobs', sanitized + '.mjs');
  const normalizedPath = normalize(jobPath);

  if (!normalizedPath.startsWith('jobs/')) {
    throw new Error('Job path outside jobs directory');
  }

  return normalizedPath;
}
```

### 4. Lock-Based Mutual Exclusion

Prevent concurrent execution vulnerabilities.

**Usage:**
```javascript
// Always use locks for critical operations
await job.runWithLock('critical-job', {
  payload,
  lockOptions: {
    timeout: 300000,  // 5 min TTL
    metadata: {
      user: ctx.user,
      reason: 'scheduled'
    }
  }
});
```

### 5. Audit Trail via Receipts

Maintain immutable audit logs.

**Receipt Verification:**
```javascript
const receipt = useReceipt();

// Verify receipt integrity
const verification = await receipt.verify(receiptId);
if (!verification.valid) {
  console.error('Receipt tampering detected!');
  // Trigger incident response
}
```

---

## Threat Model

### Threat 1: Code Injection via Job Definitions

**Attack Vector:** Malicious job file uploaded or modified

**Risk Level:** HIGH

**Mitigation:**
- Validate job definitions before loading
- Use `defineJob()` helper with schema validation
- Restrict job directory permissions
- Code review for all new jobs

**Example:**
```javascript
// Vulnerable
eval(jobDefinition);  // ✗ NEVER DO THIS

// Secure
import jobDef from './jobs/validated-job.mjs';  // ✓ Static import
```

### Threat 2: Path Traversal via Job IDs

**Attack Vector:** `../../etc/passwd` in job ID

**Risk Level:** MEDIUM

**Mitigation:**
- Sanitize job IDs
- Validate paths
- Use path normalization

**Example:**
```javascript
// Vulnerable
const jobPath = `jobs/${userInput}.mjs`;  // ✗

// Secure
const jobPath = validateJobPath(userInput);  // ✓
```

### Threat 3: Environment Variable Leakage

**Attack Vector:** Job accesses sensitive env vars and leaks them

**Risk Level:** HIGH

**Mitigation:**
- Filter env vars before passing to workers
- Use allowlist (not blocklist)
- Audit job code for env var access

**Example:**
```javascript
// Secure env filtering
const ALLOWED_VARS = ['NODE_ENV', 'TZ', 'LANG'];
const filteredEnv = Object.keys(process.env)
  .filter(key => ALLOWED_VARS.includes(key))
  .reduce((obj, key) => {
    obj[key] = process.env[key];
    return obj;
  }, {});
```

### Threat 4: Worker Thread Resource Exhaustion

**Attack Vector:** Job consumes excessive CPU/memory

**Risk Level:** MEDIUM

**Mitigation:**
- Set resource limits
- Implement timeouts
- Monitor resource usage

**Example:**
```javascript
export default {
  jobs: {
    timeout: 300000,  // 5 min max
    workerOptions: {
      resourceLimits: {
        maxOldGenerationSizeMb: 512,
        maxYoungGenerationSizeMb: 64
      }
    }
  }
};
```

### Threat 5: Lock Bypass Attempts

**Attack Vector:** Force flag used to bypass lock

**Risk Level:** LOW

**Mitigation:**
- Audit force flag usage
- Require authorization for force
- Log all force executions

**Example:**
```javascript
async function runWithForce(jobId, options) {
  // Require admin role
  if (!ctx.user.isAdmin) {
    throw new Error('Unauthorized: force requires admin');
  }

  // Log the action
  logger.warn('Force execution', { jobId, user: ctx.user.id });

  return job.runWithBree(jobId, { ...options, force: true });
}
```

---

## Security Mitigations

### Input Validation

**Job Payload Validation:**
```javascript
import { z } from 'zod';

const payloadSchema = z.object({
  target: z.string().min(1).max(100),
  compress: z.boolean().optional()
});

export default async function run({ payload }) {
  // Validate payload
  const validated = payloadSchema.parse(payload);

  // Use validated data
  await backup(validated.target, validated.compress);
}
```

**Job ID Validation:**
```javascript
const JOB_ID_PATTERN = /^[a-zA-Z0-9/_-]+$/;

function validateJobId(jobId) {
  if (!JOB_ID_PATTERN.test(jobId)) {
    throw new Error('Invalid job ID format');
  }

  if (jobId.includes('..')) {
    throw new Error('Path traversal detected');
  }

  return jobId;
}
```

### Environment Filtering

**Allowlist Approach:**
```javascript
const SAFE_ENV_VARS = new Set([
  'NODE_ENV',
  'TZ',
  'LANG',
  'PATH',
  'HOME'
]);

function getSafeEnv() {
  return Object.keys(process.env)
    .filter(key => SAFE_ENV_VARS.has(key))
    .reduce((obj, key) => {
      obj[key] = process.env[key];
      return obj;
    }, {
      TZ: 'UTC',
      LANG: 'C'
    });
}
```

### File Permission Management

**Secure Directory Permissions:**
```bash
# Jobs directory - read-only for workers
chmod 755 jobs/
chmod 644 jobs/**/*.mjs

# Worker directory - read/write for system only
chmod 700 .gitvan/workers/
```

**Check Permissions in Code:**
```javascript
import { access, constants } from 'fs/promises';

async function validatePermissions(path) {
  try {
    await access(path, constants.R_OK);  // Read OK
    await access(path, constants.W_OK);  // Write OK
  } catch {
    throw new Error(`Insufficient permissions: ${path}`);
  }
}
```

### Resource Limits

**Worker Resource Limits:**
```javascript
const workerOptions = {
  resourceLimits: {
    maxOldGenerationSizeMb: 512,     // Heap limit
    maxYoungGenerationSizeMb: 64,    // Young generation
    codeRangeSizeMb: 64,             // Code range
    stackSizeMb: 4                   // Stack size
  }
};
```

**Job Timeouts:**
```javascript
export const meta = {
  name: 'Secure Job',
  timeout: 60000  // 1 minute max
};

export default async function run({ payload }) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Job timeout')), 60000);
  });

  const jobPromise = actualWork(payload);

  return Promise.race([jobPromise, timeoutPromise]);
}
```

### Audit Logging

**Comprehensive Logging:**
```javascript
import { createLogger } from 'gitvan';
const logger = createLogger('security');

export default async function run({ payload, ctx }) {
  // Log job start
  logger.info('Job started', {
    jobId: ctx.job.id,
    user: ctx.user?.id,
    payload: sanitizePayload(payload),
    timestamp: new Date().toISOString()
  });

  try {
    const result = await performAction(payload);

    // Log success
    logger.info('Job completed', {
      jobId: ctx.job.id,
      result: sanitizeResult(result)
    });

    return result;
  } catch (error) {
    // Log failure
    logger.error('Job failed', {
      jobId: ctx.job.id,
      error: error.message,
      stack: error.stack
    });

    throw error;
  }
}

function sanitizePayload(payload) {
  const sanitized = { ...payload };
  // Remove sensitive fields
  delete sanitized.password;
  delete sanitized.apiKey;
  return sanitized;
}
```

---

## Security Checklist for Job Definitions

### Pre-Deployment

- [ ] Job ID follows naming conventions (alphanumeric, `/`, `-`, `_` only)
- [ ] No hardcoded secrets or credentials
- [ ] Input validation for all payload fields
- [ ] Error handling for all failure cases
- [ ] Timeout configured appropriately
- [ ] Resource limits set if needed
- [ ] Logging includes security events
- [ ] No use of `eval()`, `Function()`, or dynamic code execution
- [ ] File paths validated and sanitized
- [ ] Environment variable access is minimal
- [ ] Code review completed
- [ ] Security testing performed

### Runtime Security

- [ ] Locks used for critical operations
- [ ] Receipts verified for integrity
- [ ] Failed authentications logged
- [ ] Resource usage monitored
- [ ] Suspicious activity alerts configured
- [ ] Incident response plan in place
- [ ] Regular security audits scheduled

### Example Secure Job:

```javascript
import { z } from 'zod';
import { createLogger } from 'gitvan';

const logger = createLogger('secure-job');

// Schema validation
const payloadSchema = z.object({
  action: z.enum(['backup', 'restore']),
  target: z.string().regex(/^[a-zA-Z0-9/_-]+$/),
  options: z.object({
    compress: z.boolean().optional(),
    encrypt: z.boolean().optional()
  }).optional()
});

export const meta = {
  name: 'Secure Backup Job',
  desc: 'Secure backup with validation and audit',
  timeout: 300000  // 5 minutes
};

export default async function run({ payload, ctx }) {
  // Validate payload
  let validated;
  try {
    validated = payloadSchema.parse(payload);
  } catch (error) {
    logger.error('Invalid payload', { error: error.message });
    throw new Error('Payload validation failed');
  }

  // Audit log
  logger.info('Job started', {
    jobId: ctx.job.id,
    action: validated.action,
    target: validated.target,
    timestamp: new Date().toISOString()
  });

  try {
    // Perform action with validated data
    const result = await performSecureBackup(validated);

    // Success audit
    logger.info('Job completed', {
      jobId: ctx.job.id,
      success: true,
      filesProcessed: result.count
    });

    return result;
  } catch (error) {
    // Error audit
    logger.error('Job failed', {
      jobId: ctx.job.id,
      error: error.message
    });

    throw error;
  }
}

async function performSecureBackup(validated) {
  // Implementation with security best practices
  return { count: 42, size: '1.2GB' };
}
```

---

## Incident Response

### Detection

**Monitor for:**
- Failed job executions (high rate)
- Unauthorized access attempts
- Path traversal attempts
- Resource exhaustion
- Lock contention spikes
- Receipt tampering

**Alerting:**
```javascript
// jobs/security-monitor.mjs
export const cron = '*/5 * * * *';  // Every 5 minutes

export default async function run() {
  const receipt = useReceipt();
  const lock = useLock();

  // Check failure rate
  const recent = await receipt.list({ limit: 100 });
  const failures = recent.filter(r => r.status === 'error');
  const failureRate = failures.length / recent.length;

  if (failureRate > 0.2) {  // >20% failures
    logger.error('SECURITY ALERT: High failure rate', {
      rate: failureRate,
      failures: failures.length
    });

    // Trigger incident response
    await notifySecurityTeam({
      alert: 'High job failure rate',
      rate: failureRate,
      timestamp: new Date().toISOString()
    });
  }

  // Check lock contention
  const locks = await lock.list();
  if (locks.length > 50) {
    logger.warn('SECURITY ALERT: High lock count', {
      count: locks.length
    });
  }

  return {  failureRate, lockCount: locks.length };
}
```

### Response Procedures

1. **Immediate Actions:**
   - Stop affected jobs
   - Isolate compromised systems
   - Preserve logs and receipts
   - Notify security team

2. **Investigation:**
   - Review receipts for tampering
   - Check job definitions for malicious code
   - Analyze logs for attack patterns
   - Identify affected systems

3. **Remediation:**
   - Remove malicious jobs
   - Reset compromised credentials
   - Apply security patches
   - Update security rules

4. **Recovery:**
   - Restore from known-good state
   - Verify system integrity
   - Re-enable jobs gradually
   - Monitor for recurrence

5. **Post-Incident:**
   - Document incident
   - Update security procedures
   - Train team on lessons learned
   - Implement preventive measures

---

## See Also

- [API Reference](api/job-scheduler.md)
- [Architecture Guide](ARCHITECTURE-BREE-INTEGRATION.md)
- [Troubleshooting Guide](TROUBLESHOOTING-JOBS.md)
- [Performance Tuning](PERFORMANCE-TUNING-JOBS.md)
