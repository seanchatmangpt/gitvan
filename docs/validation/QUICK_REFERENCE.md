# 🚀 Quick Reference - Hive Mind & Autonomic Patterns

> **One-page reference for rapid implementation**

## Hive Mind Pattern

### Basic Usage (Concurrent Agents)

```javascript
// ✅ CORRECT: All in ONE message
Task("Analyzer", "Find false positives in tests/", "code-analyzer")
Task("Architect", "Design autonomic patterns", "system-architect")
Task("Auditor", "Audit CRITICAL CVEs", "reviewer")
Task("Optimizer", "Find bottlenecks 80/20", "perf-analyzer")

TodoWrite({ todos: [
  {content: "Analyze tests", status: "in_progress", activeForm: "Analyzing tests"},
  {content: "Design patterns", status: "in_progress", activeForm: "Designing patterns"},
  {content: "Audit security", status: "in_progress", activeForm: "Auditing security"},
  {content: "Find bottlenecks", status: "in_progress", activeForm: "Finding bottlenecks"}
]})
```

## Circuit Breaker (Git Operations)

```javascript
// src/patterns/circuit-breaker.mjs
import { CircuitBreaker } from './patterns/circuit-breaker.mjs';

const gitCB = new CircuitBreaker({
  threshold: 5,         // OPEN after 5 failures
  resetTimeout: 30000   // Try recovery after 30s
});

// Use it
await gitCB.execute(
  () => execGit('status'),
  () => getCached() || { error: 'Git unavailable' }
);
```

### States
- **CLOSED** → Normal (all requests pass)
- **OPEN** → Fast-fail (reject immediately)
- **HALF_OPEN** → Test recovery (try one request)

## Error Boundary (Hooks)

```javascript
// src/patterns/error-boundary.mjs
import { ErrorBoundary } from './patterns/error-boundary.mjs';

const hookEB = new ErrorBoundary({
  maxRetries: 3,           // Retry 3 times
  quarantineThreshold: 10  // Quarantine after 10 failures
});

// Use it
await hookEB.executeWithBoundary(
  'hook-id',
  async (ctx) => { /* hook logic */ }
);
```

### Retry Strategy
- 1st retry: 1s delay
- 2nd retry: 2s delay
- 3rd retry: 4s delay
- Max delay: 10s

## Health Monitor (Daemon)

```javascript
// src/patterns/health-monitor.mjs
import { HealthMonitor } from './patterns/health-monitor.mjs';

const monitor = new HealthMonitor({
  checkInterval: 30000,   // Check every 30s
  restartThreshold: 3,    // Restart after 3 failures
  memoryThreshold: 512    // Restart if heap > 512MB
});

// Add checks
monitor.addCheck('git', async () => ({
  healthy: await isGitAvailable()
}));

monitor.start();
```

### Auto-Restart Triggers
- ✅ 3 consecutive health check failures
- ✅ No success in 5 minutes
- ✅ Memory > threshold

## Auto-Configuration

```javascript
// src/patterns/auto-config.mjs
import { autoConfig } from './patterns/auto-config.mjs';

// Auto-detects environment
const timeout = autoConfig.get('git.timeout');
//   CI: 120000ms
//   Local: 30000ms

// Override if needed
autoConfig.override('git.timeout', 60000);
```

### Auto-Detected Settings
| Setting | CI | Local | Production |
|---------|----|----|------------|
| Git timeout | 120s | 30s | 60s |
| Hook timeout | 60s | 10s | 30s |
| Cache enabled | ❌ | ✅ | ✅ |
| Log level | info | debug | warn |

## Graceful Degradation

```javascript
// Fallback pattern
async function withFallback(fn, fallback, timeout = 5000) {
  try {
    return await Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeout)
      )
    ]);
  } catch (error) {
    return fallback();
  }
}

// Usage
const metadata = await withFallback(
  () => fetchFromGit(),
  () => getCached() || { commit: 'unknown' }
);
```

## Production Readiness Checklist

### Phase 1: Critical (8-15h)
- [ ] Replace `eval()` and `new Function()`
- [ ] Add path traversal protection
- [ ] Whitelist commands in exec
- [ ] Enable template autoescape
- [ ] Add circuit breaker to git ops
- [ ] Add error boundaries to hooks
- [ ] Add health monitoring

### Phase 2: Hardening (6-8h)
- [ ] Convert sync to async I/O
- [ ] Add LRU caching
- [ ] Parallelize with Promise.all
- [ ] Input validation everywhere
- [ ] Rate limiting
- [ ] Graceful shutdown

### Phase 3: Excellence (4-6h)
- [ ] Structured logging
- [ ] Prometheus metrics
- [ ] Distributed tracing
- [ ] Mutation testing

## Test Commands

```bash
# Run all tests
npm test

# Production validation suite
npm test tests/validation/production-readiness.test.mjs

# Pattern tests
npm test tests/patterns/

# Coverage
npm test -- --coverage
```

## Agent Types (54 total)

### Most Used
- `code-analyzer` - Find issues
- `system-architect` - Design patterns
- `reviewer` - Security audit
- `perf-analyzer` - Bottlenecks
- `coder` - Implementation
- `tester` - Validation
- `production-validator` - Deployment

### SPARC Modes
```bash
npx claude-flow sparc run refinement-optimization-mode "task"
npx claude-flow sparc run security-review "task"
npx claude-flow sparc run code "task"
```

## 80/20 Priority Matrix

| Domain | Issues | Time | Value | Priority |
|--------|--------|------|-------|----------|
| Security | 7 CVEs | 8-15h | 100% critical | 🔴 HIGH |
| Test Quality | 23 | 16h | 80% improvement | 🔴 HIGH |
| Autonomic | 12 | 6h | Self-healing | 🟡 MEDIUM |
| Performance | 10 | 2h | 5-8x speedup | 🟢 QUICK WIN |

## Common Patterns

### Research → Design → Implement → Test
```javascript
Task("Researcher", "Analyze problem...", "researcher")
Task("Architect", "Design solution...", "system-architect")
Task("Coder", "Implement...", "coder")
Task("Tester", "Validate...", "tester")
```

### Audit → Fix → Verify
```javascript
Task("Auditor", "Find vulnerabilities...", "reviewer")
Task("Coder", "Apply patches...", "coder")
Task("Validator", "Run security tests...", "production-validator")
```

### Analyze → Optimize → Benchmark
```javascript
Task("Analyzer", "Find bottlenecks...", "perf-analyzer")
Task("Optimizer", "Apply optimizations...", "coder")
Task("Benchmarker", "Measure improvement...", "performance-benchmarker")
```

## Metrics

### Before Implementation
- Tests: 51/66 passing (77.3%)
- Autonomy: 19%
- Security: 7 CRITICAL CVEs
- Performance: Baseline

### After Implementation (Target)
- Tests: 66/66 passing (100%) ✅
- Autonomy: 94% (+75%)
- Security: 0 CRITICAL CVEs ✅
- Performance: 5-8x faster ✅

## Key Files

```
src/
  patterns/
    circuit-breaker.mjs     # Prevent cascade failures
    error-boundary.mjs      # Isolate and retry
    health-monitor.mjs      # Auto-restart
    auto-config.mjs         # Environment detection

tests/
  patterns/
    *.test.mjs              # Pattern tests
  validation/
    production-readiness.test.mjs  # 21 safety tests

docs/
  validation/
    README.md                         # Overview
    HIVE_MIND_USAGE_GUIDE.md         # Usage guide
    AUTONOMIC_PATTERNS_GUIDE.md      # Implementation
    HIVE_QUEEN_SYNTHESIS_REPORT.md   # Analysis
```

## Emergency Fixes (Day 1-2)

### Security (8h)
```javascript
// ❌ NEVER DO THIS
eval(userInput);
new Function(userCode)();

// ✅ DO THIS
JSON.parse(userInput);
vm.runInContext(userCode, sandbox);
```

### Path Traversal (1h)
```javascript
// ❌ VULNERABLE
await writeFile(userPath, data);

// ✅ PROTECTED
import { resolve, normalize } from 'path';
const safePath = normalize(resolve(baseDir, userPath));
if (!safePath.startsWith(baseDir)) throw new Error('Invalid path');
await writeFile(safePath, data);
```

### Command Injection (1h)
```javascript
// ❌ VULNERABLE
exec(`git ${userCommand}`);

// ✅ PROTECTED
const ALLOWED = ['status', 'log', 'diff'];
if (!ALLOWED.includes(userCommand)) throw new Error('Invalid command');
execFile('git', [userCommand]);
```

## Next Steps

1. **Read**: [HIVE_MIND_USAGE_GUIDE.md](./HIVE_MIND_USAGE_GUIDE.md)
2. **Implement**: [AUTONOMIC_PATTERNS_GUIDE.md](./AUTONOMIC_PATTERNS_GUIDE.md)
3. **Review**: [HIVE_QUEEN_SYNTHESIS_REPORT.md](./HIVE_QUEEN_SYNTHESIS_REPORT.md)
4. **Validate**: Run `npm test tests/validation/`

## Support

- Issues: https://github.com/ruvnet/gitvan/issues
- Docs: [/docs/validation/](./README.md)
- SPARC: `npx claude-flow sparc --help`

---

**One mind, many agents, infinite possibilities.**
