# Hooks System CI/CD Workflows - Configuration Summary

## Overview

Four GitHub Actions workflows have been created to provide comprehensive CI/CD pipeline support for the GitVan hooks system integration with @unrdf/hooks, Husky, and Bree.

## Workflows Created

### 1. **hooks-test.yml** - Hooks Integration Tests
**Purpose:** Test the hooks system integration on every push

**File:** `.github/workflows/hooks-test.yml`
**Lines:** 276
**Size:** 8.6K

**Jobs:**
- `hooks-test` - Integration tests across Node.js versions (18, 20, 22)
  - Tests hooks unit tests
  - Tests hooks integration tests
  - Tests submodule integration
  - Generates test results and coverage artifacts

- `hooks-stress` - Stress and performance tests
  - Runs stress tests on hooks system
  - Extended timeout (120 seconds)
  - Runs only on push/manual trigger

- `hooks-coverage` - Test coverage reporting
  - Generates coverage reports
  - Uploads to Codecov with `hooks` flag
  - Checks coverage thresholds

- `hooks-test-summary` - Test results summary
  - Aggregates all test results
  - Creates GitHub Step Summary
  - Posts PR comments on failure

**Triggers:**
- Push to `main`, `develop`, `claude/**` branches
- Pull requests to `main`, `develop`
- Manual workflow dispatch
- Path filters: hooks/, src/unrdf-hooks/, tests/*hooks*, vendor/unrdf/

**Artifacts Generated:**
- `hooks-test-results-node{version}` - Test results per Node version (7 days)
- `hooks-stress-test-results` - Stress test results (30 days)
- `hooks-coverage-report` - Coverage HTML and JSON (30 days)

**Critical Failure Conditions:**
- Integration tests fail
- Coverage tests fail
- Submodule integration tests fail

---

### 2. **hooks-lint.yml** - Hooks Code Linting
**Purpose:** Lint hooks code and check code quality

**File:** `.github/workflows/hooks-lint.yml`
**Lines:** 305
**Size:** 9.8K

**Jobs:**
- `eslint-hooks` - ESLint linting
  - Lints hooks/ directory
  - Lints src/unrdf-hooks/ integration
  - Lints hooks CLI and jobs
  - Zero warnings tolerance (`--max-warnings=0`)
  - Generates JSON lint report

- `prettier-hooks` - Code formatting check
  - Checks formatting consistency
  - Applies to .js, .mjs, .json files

- `type-check` - TypeScript type checking
  - Checks for .ts files in unrdf-hooks
  - Runs tsc if TypeScript files found

- `complexity` - Code complexity analysis
  - Analyzes cyclomatic complexity
  - Generates complexity reports

- `validate-imports` - Import/export validation
  - Checks for CommonJS require() in ES modules
  - Validates .mjs extensions
  - Checks vendor/unrdf imports

- `lint-summary` - Linting results summary
  - Aggregates all linting results
  - Posts PR comments on failure

**Triggers:**
- Push to `main`, `develop`, `claude/**` branches
- Pull requests to `main`, `develop`
- Manual workflow dispatch
- Path filters: hooks/, src/unrdf-hooks/, eslint.config.mjs

**Artifacts Generated:**
- `hooks-lint-report` - ESLint JSON report (30 days)
- `hooks-complexity-report` - Complexity analysis (30 days)

**Critical Failure Conditions:**
- ESLint errors
- Prettier formatting violations
- Import validation failures

---

### 3. **hooks-build.yml** - Hooks System Build
**Purpose:** Build hooks system and verify all imports work

**File:** `.github/workflows/hooks-build.yml`
**Lines:** 376
**Size:** 12K

**Jobs:**
- `build-unrdf` - Build unrdf submodule
  - Initializes and updates submodules
  - Detects pnpm vs npm
  - Builds vendor/unrdf
  - Uploads unrdf build artifacts

- `build-hooks` - Build hooks system
  - Downloads unrdf build artifacts
  - Runs npm build
  - Verifies build output
  - Uploads hooks build artifacts

- `verify-imports` - Verify all imports work
  - Tests hooks/pre-commit.mjs imports
  - Tests unrdf-hooks-bridge.mjs imports
  - Tests CLI hooks imports
  - Fails on import errors

- `circular-deps` - Check for circular dependencies
  - Uses madge to detect circular dependencies
  - Generates dependency graph SVG

- `bundle-size` - Bundle size analysis
  - Analyzes bundle size
  - Checks 10MB size limit
  - Reports in GitHub Step Summary

- `build-summary` - Build results summary
  - Aggregates all build results
  - Posts PR comments on failure

**Triggers:**
- Push to `main`, `develop`, `claude/**` branches
- Pull requests to `main`, `develop`
- Manual workflow dispatch
- Path filters: hooks/, src/unrdf-hooks/, vendor/unrdf/, build.config.ts

**Artifacts Generated:**
- `unrdf-build` - Built unrdf submodule (7 days)
- `hooks-build` - Built hooks system (7 days)
- `hooks-dependency-graph` - Dependency graph SVG (30 days)

**Critical Failure Conditions:**
- Build fails
- Import verification fails
- Submodule missing

---

### 4. **hooks-security.yml** - Hooks Security Checks
**Purpose:** Security scanning for vulnerabilities, secrets, and injection risks

**File:** `.github/workflows/hooks-security.yml`
**Lines:** 432
**Size:** 15K

**Jobs:**
- `dependency-audit` - Check for vulnerable dependencies
  - Runs npm audit (moderate level)
  - Audits unrdf submodule (pnpm)
  - Generates vulnerability report

- `secrets-detection` - Detect secrets in code
  - TruffleHog scan on hooks/
  - TruffleHog scan on src/unrdf-hooks/
  - Pattern matching for API keys, tokens, passwords

- `git-security` - Verify git operations don't expose secrets
  - Checks git remote operations
  - Checks git clone operations
  - Reviews process.env usage
  - Checks git notes operations

- `injection-check` - Check for injection vulnerabilities
  - Command injection check (exec with template literals)
  - eval() detection
  - Function constructor detection
  - SQL injection check
  - Path traversal check

- `codeql` - CodeQL security analysis
  - GitHub's advanced security scanning
  - JavaScript security-extended queries
  - Scans hooks, src/unrdf-hooks, integrations

- `license-check` - Check dependency licenses
  - Uses license-checker
  - Generates license report

- `runtime-security` - Runtime security validation
  - Tests hooks in sandboxed environment
  - Checks for privilege escalation (sudo, chmod 777)

- `security-summary` - Security scan summary
  - Aggregates all security results
  - Posts PR comments on failure
  - Creates GitHub issues on scheduled runs if vulnerabilities found

**Triggers:**
- Push to `main`, `develop`, `claude/**` branches
- Pull requests to `main`, `develop`
- Schedule: Daily at 4 AM UTC
- Manual workflow dispatch
- Path filters: hooks/, src/unrdf-hooks/, vendor/unrdf/

**Artifacts Generated:**
- `hooks-security-audit` - npm audit JSON report (30 days)
- `hooks-license-report` - License report JSON (30 days)

**Critical Failure Conditions:**
- Injection vulnerabilities found
- Privilege escalation risks detected
- Runtime security validation fails

**Security Alert Features:**
- Creates GitHub issues on scheduled scans if vulnerabilities detected
- Posts PR comments on security failures
- Uses TruffleHog for secret detection
- CodeQL integration for advanced analysis

---

## Common Configuration

### Environment Variables
All workflows use consistent environment variables:
```yaml
env:
  TZ: UTC
  LANG: C
  NODE_ENV: test|production
```

### Node.js Versions
- Primary: Node.js 20 (LTS)
- Matrix testing: Node.js 18, 20, 22

### Submodule Handling
All workflows properly initialize submodules:
```yaml
- uses: actions/checkout@v4
  with:
    submodules: recursive
    fetch-depth: 0
- run: git submodule init && git submodule update --recursive
```

### Caching Strategy
- npm cache via `actions/setup-node@v4`
- node_modules cache via `actions/cache@v4`
- pnpm cache for unrdf submodule

### Path Filters
Workflows only run when relevant files change:
- `hooks/**` - Git hook scripts
- `src/unrdf-hooks/**` - Hooks integration code
- `src/integrations/unrdf-hooks-bridge.mjs` - Bree bridge
- `src/jobs/hooks.mjs` - Background jobs
- `src/cli/commands/hooks.mjs` - CLI commands
- `tests/**/*hooks*.mjs` - Test files
- `vendor/unrdf/**` - Submodule changes

---

## Trigger Conditions Summary

| Workflow | Push (main/develop) | Push (claude/**) | Pull Request | Schedule | Manual |
|----------|---------------------|------------------|--------------|----------|--------|
| hooks-test.yml | ✅ | ✅ | ✅ | ❌ | ✅ |
| hooks-lint.yml | ✅ | ✅ | ✅ | ❌ | ✅ |
| hooks-build.yml | ✅ | ✅ | ✅ | ❌ | ✅ |
| hooks-security.yml | ✅ | ✅ | ✅ | ✅ (4 AM UTC) | ✅ |

---

## Artifact Retention

| Artifact Type | Retention Period |
|--------------|------------------|
| Test results | 7 days |
| Coverage reports | 30 days |
| Stress test results | 30 days |
| Lint reports | 30 days |
| Build artifacts | 7 days |
| Security audit reports | 30 days |
| Dependency graphs | 30 days |

---

## Notification Strategy

### Pull Request Comments
All workflows post comments on PR failures with:
- Clear failure indication
- Actionable next steps
- Links to workflow runs

### GitHub Step Summaries
All workflows generate detailed summaries with:
- Job status indicators
- Coverage/security/build metrics
- Pass/fail criteria

### Security Alerts
- **hooks-security.yml** creates GitHub issues on scheduled runs if vulnerabilities detected
- Labeled with `security`, `hooks`, `automated`

---

## Integration with Existing Workflows

### Complementary to Main CI/CD
- **test.yml** - Main test suite (all tests)
- **hooks-test.yml** - Focused hooks testing with stress tests
- **security.yml** - General security scanning
- **hooks-security.yml** - Hooks-specific security (injection, git ops)
- **checks.yml** - General checks (uses pnpm)
- **hooks-build.yml** - Hooks build with pnpm support for unrdf

### No Conflicts
- Different job names
- Parallel execution safe
- Separate artifact namespaces
- Independent failure conditions

---

## Testing the Workflows

### Local Validation
```bash
# Install act for local GitHub Actions testing
# https://github.com/nektos/act

# Test hooks-test.yml
act push -W .github/workflows/hooks-test.yml

# Test hooks-lint.yml
act push -W .github/workflows/hooks-lint.yml

# Test hooks-build.yml
act push -W .github/workflows/hooks-build.yml

# Test hooks-security.yml
act push -W .github/workflows/hooks-security.yml
```

### Manual Trigger
All workflows support `workflow_dispatch` for manual testing:
1. Go to Actions tab
2. Select workflow
3. Click "Run workflow"
4. Select branch
5. Run

---

## Maintenance Notes

### Adding New Jobs
When adding new jobs to workflows:
1. Add job to appropriate workflow
2. Update `{workflow}-summary` needs array
3. Update failure conditions if critical
4. Add artifact uploads if needed
5. Update this documentation

### Updating Dependencies
When updating dependencies:
1. `hooks-security.yml` will detect vulnerabilities
2. Review audit reports
3. Update package.json
4. Re-run security workflow

### Changing Triggers
When modifying trigger conditions:
1. Update `on:` section
2. Update path filters if needed
3. Test with `act` locally
4. Document changes here

---

## Security Best Practices

### Secrets Management
- No secrets in workflow files
- Use GitHub Secrets for sensitive data
- TruffleHog scans prevent secret commits

### Permissions
- `contents: read` by default
- `security-events: write` for CodeQL
- Minimal necessary permissions

### Submodule Security
- Recursive checkout with depth=0
- Verification steps after checkout
- Audit of submodule dependencies

---

## Performance Considerations

### Parallel Execution
- Matrix builds run in parallel
- Independent jobs run concurrently
- Typical runtime: 5-10 minutes per workflow

### Caching
- node_modules cached between runs
- Build artifacts cached across jobs
- pnpm store cached for unrdf

### Resource Usage
- Standard GitHub runners (ubuntu-latest)
- No special hardware requirements
- Efficient for hooks system testing

---

## Future Enhancements

### Potential Additions
1. **E2E Testing** - Full integration tests with real git operations
2. **Performance Benchmarking** - Track performance metrics over time
3. **Deployment** - Auto-deploy hooks system on success
4. **Notifications** - Slack/Discord integration
5. **Release Automation** - Auto-versioning and changelog

### Monitoring
- Consider adding metrics collection
- Track test execution times
- Monitor security scan findings

---

## Troubleshooting

### Common Issues

**Issue:** Submodule not found
- **Solution:** Ensure `git submodule update --init --recursive` runs
- **Check:** `.gitmodules` file exists and is correct

**Issue:** pnpm not found
- **Solution:** Install corepack: `npm i -g corepack && corepack enable`
- **Check:** `pnpm-lock.yaml` exists in vendor/unrdf

**Issue:** Tests timeout
- **Solution:** Increase `testTimeout` in vitest config
- **Check:** Stress tests use 120000ms timeout

**Issue:** Build fails on import
- **Solution:** Verify .mjs extensions on all imports
- **Check:** ESLint import validation rules

---

## Documentation

- **Main CI/CD:** `.github/workflows/test.yml`
- **Security:** `.github/workflows/security.yml`
- **Hooks Test:** `.github/workflows/hooks-test.yml`
- **Hooks Lint:** `.github/workflows/hooks-lint.yml`
- **Hooks Build:** `.github/workflows/hooks-build.yml`
- **Hooks Security:** `.github/workflows/hooks-security.yml`

---

**Created:** 2026-01-09
**Agent:** Agent 6 (CI/CD Pipeline Setup)
**Task:** Configure GitHub Actions workflows for hooks system
**Status:** ✅ Complete
