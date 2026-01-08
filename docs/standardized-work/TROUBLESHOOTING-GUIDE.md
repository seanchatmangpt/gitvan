# Comprehensive Troubleshooting Guide

Common issues across all GitVan procedures with solutions and prevention strategies.

---

## Development Workflow Issues

### Issue: Cannot Clone Repository
**Symptoms**: `git clone` fails with authentication error
**Cause**: SSH keys not configured or incorrect permissions

**Solution**:
```bash
# Check if SSH key exists
ls -la ~/.ssh/id_*.pub

# If not, generate SSH key
ssh-keygen -t ed25519 -C "your.email@example.com"

# Add to SSH agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Add public key to GitHub
cat ~/.ssh/id_ed25519.pub
# Copy and paste into GitHub Settings → SSH Keys

# Test connection
ssh -T git@github.com
```

**Prevention**: Set up SSH keys during onboarding

---

### Issue: Dependencies Won't Install
**Symptoms**: `npm install` fails or hangs
**Cause**: Network issues, corrupted cache, or version conflicts

**Solution**:
```bash
# Clean npm cache
npm cache clean --force

# Remove node_modules and lock file
rm -rf node_modules package-lock.json

# Reinstall
npm install

# If still fails, check Node.js version
node --version  # Should be 18+

# Update Node.js if needed
nvm install 18
nvm use 18
```

**Prevention**: Use correct Node.js version, stable network

---

### Issue: Tests Pass Locally But Fail in CI
**Symptoms**: Tests green locally, red in CI
**Cause**: Environment differences (timezone, locale, dependencies)

**Solution**:
```bash
# Match CI environment locally
export TZ=UTC
export LANG=C
export NODE_ENV=test

# Clean install dependencies (like CI does)
rm -rf node_modules package-lock.json
npm ci  # Use ci, not install

# Run tests
npm test
```

**Prevention**: Always use `npm ci` for reproducible builds

---

## Testing Issues

### Issue: Context Not Available Error
**Symptoms**: Error: "Cannot call useGit() outside of withGitVan() context"
**Cause**: Not wrapping async operations in `withGitVan()`

**Solution**:
```javascript
// ✗ WRONG - Context lost after await
it("test", async () => {
  const git = useGit();  // ✗ No context
  await someAsyncCall();
  await git.commit();    // ✗ Error!
});

// ✓ CORRECT - Wrap in withGitVan()
it("test", async () => {
  await withGitVan(context, async () => {
    const git = useGit();      // ✓ Context available
    await someAsyncCall();
    await git.commit();        // ✓ Works!
  });
});
```

**Prevention**: Always use `withGitVan()` wrapper for composables

---

### Issue: Flaky Tests
**Symptoms**: Tests sometimes pass, sometimes fail
**Cause**: Non-deterministic behavior (timing, random values, dates)

**Solution**:
```javascript
// ✗ WRONG - Non-deterministic
const now = new Date();  // Changes every run
const value = Math.random();  // Different every time
setTimeout(() => {}, 100);  // Timing dependent

// ✓ CORRECT - Deterministic
const now = new Date("2024-01-01T00:00:00Z");  // Fixed
const value = 0.5;  // Always same
await new Promise(resolve => setTimeout(resolve, 100));  // Await

// Use deterministic test environment
export TZ=UTC
export LANG=C
```

**Prevention**: No randomness, fixed dates, await promises

---

### Issue: Memory Leaks in Tests
**Symptoms**: Tests slow down over time, eventually crash
**Cause**: Resources not cleaned up properly

**Solution**:
```javascript
describe("tests", () => {
  let context;
  let handle;

  beforeEach(async () => {
    context = await createTestContext();
    handle = setupSomething();
  });

  afterEach(async () => {
    // ALWAYS cleanup!
    if (handle) {
      await handle.cleanup();
    }
    if (context) {
      await context.cleanup();
    }
  });
});
```

**Prevention**: Always cleanup in `afterEach()`

---

### Issue: Low Test Coverage
**Symptoms**: Coverage report shows < 80%
**Cause**: Missing test cases for branches, functions, or lines

**Solution**:
```bash
# Run coverage
npm run test:coverage

# Open HTML report
open coverage/index.html

# Find uncovered code (red lines)
# Add tests for:
# - Uncovered branches (if/else, switch)
# - Uncovered functions
# - Uncovered lines
# - Error paths

# Re-run coverage
npm run test:coverage
```

**Prevention**: Write tests for all code paths, including errors

---

## Build Issues

### Issue: Build Fails with "Cannot find module"
**Symptoms**: Build completes but CLI doesn't work
**Cause**: Missing dependency or incorrect import path

**Solution**:
```bash
# Check if dependency exists
npm ls <module-name>

# Install if missing
npm install <module-name>

# Check import paths
grep -r "from.*module-name" src/

# Verify build.config.ts externals
cat build.config.ts | grep external
```

**Prevention**: Keep dependencies up to date, verify imports

---

### Issue: Build Size Too Large
**Symptoms**: `dist/` directory > 50MB
**Cause**: Including unnecessary files or bundling dependencies

**Solution**:
```bash
# Analyze what's large
du -sh dist/*
find dist/ -type f -size +1M

# Ensure dependencies are external (not bundled)
# build.config.ts
export default defineBuildConfig({
  rollup: {
    external: [
      'citty',
      'consola',
      // ... all dependencies
    ]
  }
});
```

**Prevention**: Keep dependencies external, minimize bundling

---

### Issue: Build Works Locally But Fails in CI
**Symptoms**: Local build succeeds, CI build fails
**Cause**: Environment differences, missing files, or paths

**Solution**:
```bash
# Match CI environment
export NODE_ENV=production

# Clean build from scratch
rm -rf dist node_modules .cache
npm ci
npm run build

# Check for missing files
git status --ignored
# Add missing files to Git if needed
```

**Prevention**: Test builds with `npm ci`, not `npm install`

---

## Deployment Issues

### Issue: Deployment Fails - Permission Denied
**Symptoms**: Cannot write to deployment directory
**Cause**: Incorrect file permissions or ownership

**Solution**:
```bash
# Check permissions
ssh production "ls -la /opt/gitvan"

# Fix ownership
ssh production "sudo chown -R gitvan:gitvan /opt/gitvan"

# Fix permissions
ssh production "chmod -R 755 /opt/gitvan"
```

**Prevention**: Use correct user for deployment, set permissions

---

### Issue: Health Check Fails After Deployment
**Symptoms**: `/health` endpoint returns error or timeout
**Cause**: Service not started or dependency unavailable

**Solution**:
```bash
# Check service status
ssh production "systemctl status gitvan"

# Check logs
ssh production "journalctl -u gitvan -n 100"

# Restart service
ssh production "systemctl restart gitvan"

# Verify dependencies
curl http://database:5432/health
curl http://redis:6379/ping
```

**Prevention**: Verify all dependencies before deployment

---

### Issue: High Error Rate After Deployment
**Symptoms**: Error rate > 5% immediately after deployment
**Cause**: Code bug, configuration error, or incompatibility

**Solution**:
```bash
# ROLLBACK IMMEDIATELY
./scripts/rollback.sh

# Collect logs for analysis
ssh production "journalctl -u gitvan --since '1 hour ago' > /tmp/error.log"
scp production:/tmp/error.log ./

# Analyze logs
grep ERROR error.log | head -20

# Fix issue
# Test thoroughly
# Re-deploy when fixed
```

**Prevention**: Thorough testing, gradual rollout (canary)

---

## Configuration Issues

### Issue: Configuration Not Applied
**Symptoms**: Application uses old configuration values
**Cause**: Configuration not loaded or service not restarted

**Solution**:
```bash
# Verify environment variable set
ssh production "env | grep GITVAN"

# Verify configuration file
ssh production "cat /etc/gitvan/config.js"

# Restart service to pick up changes
ssh production "systemctl restart gitvan"

# Verify new config loaded
curl https://api/config | jq .
```

**Prevention**: Always restart services after config changes

---

### Issue: Secret Not Found
**Symptoms**: Application can't access secret from secrets manager
**Cause**: Missing secret, incorrect name, or permission issue

**Solution**:
```bash
# Verify secret exists
aws secretsmanager describe-secret --secret-id gitvan/prod/api-key

# Check IAM permissions
aws sts get-caller-identity

# Test secret retrieval
aws secretsmanager get-secret-value --secret-id gitvan/prod/api-key

# Grant permissions if needed
aws secretsmanager put-resource-policy --secret-id gitvan/prod/api-key --resource-policy '{...}'
```

**Prevention**: Verify secrets and permissions before deployment

---

### Issue: Configuration Mismatch Between Environments
**Symptoms**: Works in staging, fails in production
**Cause**: Different configuration values

**Solution**:
```bash
# Compare configurations
diff <(ssh staging "env | sort") <(ssh production "env | sort")

# Identify differences
# Update production config to match

# Verify critical settings match
ssh staging "echo \$GITVAN_API_TIMEOUT"
ssh production "echo \$GITVAN_API_TIMEOUT"
```

**Prevention**: Use configuration management tool, version control configs

---

## Performance Issues

### Issue: Slow API Response Times
**Symptoms**: p95 latency > 300ms
**Cause**: Database queries, network latency, or inefficient code

**Solution**:
```bash
# Profile the application
node --prof src/cli.mjs run job
node --prof-process isolate-*.log > profile.txt

# Identify hot paths
grep -A 5 "ticks" profile.txt | head -20

# Optimize slow operations:
# - Add database indexes
# - Cache frequently accessed data
# - Use Promise.all() for parallel ops
# - Optimize queries

# Verify improvement
npm run benchmark -- --compare baseline
```

**Prevention**: Regular performance testing, profiling

---

### Issue: Memory Leak
**Symptoms**: Memory usage grows over time, eventually crashes
**Cause**: References not released, event listeners not removed

**Solution**:
```bash
# Profile memory
node --inspect src/cli.mjs run job

# In Chrome DevTools:
# 1. Take heap snapshot
# 2. Execute operations
# 3. Force GC
# 4. Take another snapshot
# 5. Compare snapshots

# Look for:
# - Detached DOM nodes
# - Unreleased event listeners
# - Large arrays/objects not cleared

# Fix leaks
# - Remove event listeners
# - Clear references
# - Call cleanup methods
```

**Prevention**: Profile memory regularly, cleanup resources

---

### Issue: High CPU Usage
**Symptoms**: CPU at 100%, slow performance
**Cause**: Infinite loops, heavy computation, or busy waiting

**Solution**:
```bash
# Check CPU usage
top -p $(pgrep -f gitvan)

# Get stack trace
kill -SIGUSR1 $(pgrep -f gitvan)

# Profile CPU
node --cpu-prof src/cli.mjs run job
node --cpu-prof-process cpu-*.log > cpu-profile.txt

# Identify hot functions
grep "ticks" cpu-profile.txt | head -20

# Optimize:
# - Break up large operations
# - Use async/await instead of busy waiting
# - Optimize algorithms
```

**Prevention**: Performance testing, profiling before release

---

## Security Issues

### Issue: npm audit Shows Vulnerabilities
**Symptoms**: `npm audit` reports high/critical vulnerabilities
**Cause**: Outdated dependencies with known security issues

**Solution**:
```bash
# Auto-fix if possible
npm audit fix

# Manual fix if auto-fix doesn't work
npm audit --json | jq '.vulnerabilities'

# Update specific package
npm update <package-name>

# If no fix available:
# 1. Document as exception
# 2. Implement mitigations
# 3. Monitor for patches
```

**Prevention**: Regular dependency updates, automated scanning

---

### Issue: Secret Committed to Git
**Symptoms**: Secret found in Git history
**Cause**: Accidentally committed secret

**Solution**:
```bash
# IMMEDIATELY revoke the secret
./scripts/revoke-secret.sh <secret-value>

# Remove from Git history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch path/to/file' \
  --prune-empty --tag-name-filter cat -- --all

# Force push (coordinate with team!)
git push origin --force --all

# Notify team to re-clone
# Generate new secret
# Update secrets manager
```

**Prevention**: Use git-secrets hook, never commit secrets

---

### Issue: Security Scan Fails in CI
**Symptoms**: CI security scan reports failures
**Cause**: Vulnerabilities in code or dependencies

**Solution**:
```bash
# Run locally to see details
snyk test
npm audit

# For false positives, document exception
echo "CVE-2024-12345: False positive, only affects Windows" >> SECURITY_EXCEPTIONS.md

# For real issues, fix immediately:
npm audit fix
npm update <vulnerable-package>

# If no fix available, implement mitigations
```

**Prevention**: Regular security reviews, keep dependencies updated

---

## Incident Management Issues

### Issue: Cannot Determine Root Cause
**Symptoms**: Incident ongoing but cause unclear
**Cause**: Insufficient logging or monitoring

**Solution**:
```bash
# Enable debug logging
ssh production "sed -i 's/LOG_LEVEL=info/LOG_LEVEL=debug/' /etc/gitvan/env"
ssh production "systemctl restart gitvan"

# Collect comprehensive diagnostics
./scripts/collect-diagnostics.sh --verbose

# Review all data sources:
# - Application logs
# - System logs
# - Database logs
# - Network logs
# - Recent deployments
# - Configuration changes

# Involve experts if needed
# Page database team, network team, etc.
```

**Prevention**: Comprehensive logging and monitoring

---

### Issue: Rollback Doesn't Fix Issue
**Symptoms**: Service still broken after rollback
**Cause**: Issue not in code (database, infrastructure, etc.)

**Solution**:
```bash
# Check all components:

# 1. Database
psql -c "SELECT version();"
# Check for schema changes

# 2. Cache
redis-cli PING
redis-cli FLUSHALL  # If stale data

# 3. Load balancer
curl http://lb:8080/health

# 4. Infrastructure
# Check AWS/GCP/Azure status

# 5. Third-party services
# Check status pages of dependencies
```

**Prevention**: Test rollback procedures, monitor all components

---

## Documentation Issues

### Issue: Documentation Build Fails
**Symptoms**: `npm run docs:build` fails
**Cause**: Markdown syntax errors or broken links

**Solution**:
```bash
# Check for syntax errors
npx markdownlint docs/**/*.md

# Fix errors
# Re-run build
npm run docs:build

# Check for broken links
npm run docs:check-links

# Fix broken links
```

**Prevention**: Validate markdown, check links before commit

---

### Issue: Examples Don't Work
**Symptoms**: Copy-paste code examples fail
**Cause**: Outdated examples or API changes

**Solution**:
```bash
# Test all examples
cd examples/
for example in *.mjs; do
  echo "Testing $example"
  node "$example" || echo "FAILED: $example"
done

# Fix broken examples
# Update to match current API
# Re-test
```

**Prevention**: Automated example testing in CI

---

## Release Issues

### Issue: Release Tag Already Exists
**Symptoms**: `git tag` fails because tag exists
**Cause**: Previous release attempt or manual tag

**Solution**:
```bash
# Check existing tag
git tag -l v4.1.0

# Delete local tag
git tag -d v4.1.0

# Delete remote tag
git push origin :refs/tags/v4.1.0

# Recreate tag
git tag -a v4.1.0 -m "Release v4.1.0"
git push origin v4.1.0
```

**Prevention**: Use automated release scripts, check before tagging

---

### Issue: npm Publish Fails
**Symptoms**: `npm publish` returns error
**Cause**: Not logged in, version already published, or permission issue

**Solution**:
```bash
# Check if logged in
npm whoami

# Login if needed
npm login

# Check if version exists
npm view gitvan@4.1.0

# If exists, bump version
npm version patch
npm publish

# Check permissions
npm access list packages
```

**Prevention**: Verify version unique, ensure npm login

---

## General Troubleshooting Process

### Step 1: Reproduce the Issue
```bash
# Can you make it happen again?
# Document exact steps to reproduce
# Note any error messages
```

### Step 2: Isolate the Problem
```bash
# When did it start?
# What changed recently?
# Does it happen everywhere or just certain environments?
# Can you narrow down the component?
```

### Step 3: Gather Information
```bash
# Collect logs
# Check metrics/dashboards
# Review recent changes (git log)
# Check system resources
# Test dependencies
```

### Step 4: Form Hypothesis
```bash
# Based on data, what do you think is wrong?
# What would confirm or refute this?
```

### Step 5: Test Hypothesis
```bash
# Make one change at a time
# Verify effect
# If fixed, document solution
# If not, form new hypothesis
```

### Step 6: Implement Solution
```bash
# Make the fix
# Test thoroughly
# Deploy (following procedures)
# Monitor for recurrence
```

### Step 7: Prevent Recurrence
```bash
# Update procedures/runbooks
# Add monitoring/alerting
# Add tests
# Share learnings with team
```

---

## Getting Help

### When to Escalate
- Issue is P0 or P1 severity
- You've tried for 30+ minutes with no progress
- Issue affects production users
- You need access/permissions you don't have

### Who to Contact

| Issue Type | Contact |
|------------|---------|
| Code/Development | Team lead, senior developer |
| Deployment/Infrastructure | DevOps team |
| Security | Security team (immediate!) |
| Performance | Performance team |
| Database | Database team |
| Production incident | On-call engineer, incident commander |

### How to Ask for Help

```markdown
# Issue Description
[Clear, concise description of the problem]

# Steps to Reproduce
1. [First step]
2. [Second step]
3. [Error occurs]

# Expected Behavior
[What should happen]

# Actual Behavior
[What actually happens]

# Environment
- Environment: [production/staging/local]
- Version: [version number]
- OS: [operating system]
- Node.js: [version]

# Already Tried
- [Thing 1 you tried]
- [Thing 2 you tried]

# Relevant Logs/Errors
```
[Paste error messages, stack traces]
```

# Additional Context
[Anything else that might be relevant]
```

---

**Remember**: Every problem is an opportunity to improve our systems and procedures.

**Last Updated**: 2026-01-08
**Version**: 1.0
