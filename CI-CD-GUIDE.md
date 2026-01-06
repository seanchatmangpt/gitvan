# GitVan CI/CD Pipeline Guide

Complete guide to the automated CI/CD pipeline for GitVan.

## Overview

GitVan uses a comprehensive GitHub Actions-based CI/CD pipeline that automates:

- Testing and code quality checks
- Security vulnerability scanning
- Building and packaging
- Documentation generation
- Release management
- Canary deployments
- Performance monitoring

## Workflows

### 1. Main CI/CD Pipeline (`test.yml`)

**Triggers:**
- Push to `main`, `develop`, `claude/**` branches
- Pull requests to `main`, `develop`
- Nightly at 2 AM UTC
- Manual dispatch

**Jobs:**
- `install` - Install and cache dependencies
- `lint` - Run ESLint (if configured)
- `build` - Build project with unbuild
- `test-matrix` - Run tests across Node.js 18, 20, 22 with 3 shards
- `coverage` - Generate test coverage reports
- `integration` - Run integration tests
- `benchmarks` - Run performance benchmarks (push/schedule only)
- `test-summary` - Aggregate results

**Artifacts:**
- Build artifacts (7 days)
- Test results (7 days)
- Coverage reports (30 days)
- Benchmark results (30 days)

### 2. Security Scanning (`security.yml`)

**Triggers:**
- Push to `main`, `develop`
- Pull requests
- Daily at 3 AM UTC
- Manual dispatch

**Jobs:**
- `dependency-audit` - npm audit for vulnerabilities
- `secrets-detection` - TruffleHog secret scanning
- `sast-eslint` - Static application security testing
- `license-check` - License compliance checking
- `dependency-review` - GitHub dependency review (PRs only)
- `codeql` - CodeQL security analysis
- `supply-chain` - Package integrity verification
- `security-summary` - Aggregate security results

**Artifacts:**
- npm audit report (30 days)
- License report (30 days)

### 3. Changelog Generation (`changelog.yml`)

**Triggers:**
- Push to `main`
- Version tags (`v*`)
- Manual dispatch

**Jobs:**
- `changelog` - Generate CHANGELOG.md from commits
- `release-notes` - Create GitHub release notes

**Features:**
- Follows [Keep a Changelog](https://keepachangelog.com/) format
- Categorizes commits: Added, Changed, Fixed, Security, Documentation
- Auto-commits updated CHANGELOG.md
- Creates GitHub releases for tags

### 4. Release and Publish (`release.yml`)

**Triggers:**
- Version tags (`v*.*.*`)
- Manual dispatch with version input

**Jobs:**
- `validate` - Validate version format and detect prerelease
- `test` - Run full test suite
- `build` - Build production package
- `publish-npm` - Publish to npm registry
- `github-release` - Create GitHub release
- `post-release` - Post-release tasks and notifications

**Environment Variables Required:**
- `NPM_TOKEN` - npm authentication token (secret)

**Features:**
- Semantic versioning enforcement
- Prerelease detection (alpha, beta, rc)
- Dry run support
- Package size monitoring
- Automatic GitHub release creation

### 5. Canary Deployment (`canary.yml`)

**Triggers:**
- Push to `develop`, `claude/**` branches
- Manual dispatch

**Jobs:**
- `validate` - Generate canary version
- `test` - Test on Node.js 18, 20, 22
- `build` - Build canary package
- `integration-test` - Test canary installation
- `publish` - Publish to npm with `canary` tag (develop only)
- `summary` - Deployment summary
- `cleanup` - Remove old artifacts

**Canary Version Format:**
```
{base-version}-canary.{timestamp}.{commit-sha}
Example: 3.1.0-canary.20260106051823.a1b2c3d
```

**Installation:**
```bash
npm install gitvan@canary
```

### 6. Build Metrics (`metrics.yml`)

**Triggers:**
- Push to `main`, `develop`
- Pull requests
- Daily at 4 AM UTC
- Manual dispatch

**Jobs:**
- `build-metrics` - Build performance and size metrics
- `test-metrics` - Test execution metrics
- `code-quality` - Code statistics and quality metrics
- `dependency-analysis` - Dependency count and analysis
- `summary` - Overall metrics summary

**Metrics Collected:**
- Dependency installation time
- Build time
- Build output size
- Package size
- Test execution time
- Test counts (passed/failed/skipped)
- Source/test file counts and lines
- Dependency counts

**Thresholds:**
- Build time: ≤60 seconds
- Package size: ≤5MB
- Test execution: ≤3 minutes

### 7. Documentation Generation (`docs.yml`)

**Triggers:**
- Push to `main`, `develop` (when docs/src files change)
- Pull requests to `main` (when docs files change)
- Manual dispatch

**Jobs:**
- `api-docs` - Generate JSDoc API documentation
- `readme-docs` - Generate CLI and examples documentation
- `coverage-docs` - Generate coverage reports
- `build-site` - Build complete documentation site
- `deploy-pages` - Deploy to GitHub Pages (main branch only)
- `summary` - Documentation generation summary

**Documentation Site Includes:**
- README.md
- CLAUDE.md (Developer Guide)
- API Reference (JSDoc)
- Coverage Reports
- CLI Help
- Examples

**GitHub Pages URL:**
```
https://seanchatmangpt.github.io/gitvan/
```

## CI/CD Pipeline Flow

### On Commit to Feature Branch
```
1. test.yml runs (lint, build, test, coverage)
2. security.yml runs (audit, secrets, SAST)
3. metrics.yml runs (build/test metrics)
4. docs.yml runs (if docs files changed)
```

### On Merge to Develop
```
1. All checks from above
2. canary.yml runs
   - Tests on multiple Node versions
   - Builds canary package
   - Publishes to npm with @canary tag
```

### On Merge to Main
```
1. All checks from above
2. changelog.yml runs
   - Updates CHANGELOG.md
   - Commits changes
3. docs.yml deploys to GitHub Pages
```

### On Version Tag (v*)
```
1. changelog.yml creates release notes
2. release.yml runs
   - Validates version
   - Runs full test suite
   - Builds production package
   - Publishes to npm
   - Creates GitHub release
```

## Scripts Reference

### Build Scripts
```bash
npm run build              # Build for production
npm run build:watch        # Build with watch mode
```

### Test Scripts
```bash
npm test                   # Run tests
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage
npm run test:ui            # UI mode
npm run test:bdd           # BDD tests
npm run test:citty         # Citty CLI tests
```

### Code Quality Scripts
```bash
npm run lint               # Run ESLint
npm run lint:fix           # Fix ESLint issues
npm run format             # Format with Prettier
npm run format:check       # Check formatting
npm run typecheck          # TypeScript type checking
```

### Release Scripts
```bash
npm run release            # Patch release (0.0.x)
npm run release:minor      # Minor release (0.x.0)
npm run release:major      # Major release (x.0.0)
```

### Maintenance Scripts
```bash
npm run clean              # Clean build artifacts
npm run audit:check        # Check for vulnerabilities
npm run audit:fix          # Fix vulnerabilities
```

## Environment Variables

### Required for CI/CD

**GitHub Secrets:**
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions
- `NPM_TOKEN` - npm authentication token for publishing

**Optional:**
- `CODECOV_TOKEN` - Codecov upload token (for code coverage)

### Build Environment
```bash
NODE_ENV=production        # Production build mode
TZ=UTC                     # Timezone (deterministic builds)
LANG=C                     # Locale (deterministic builds)
```

## Release Process

### Automated Release (Recommended)

1. **Create version tag:**
   ```bash
   git tag v3.1.0
   git push origin v3.1.0
   ```

2. **Workflow automatically:**
   - Validates version format
   - Runs full test suite
   - Builds production package
   - Publishes to npm
   - Creates GitHub release
   - Generates changelog

### Manual Release

1. **Update version:**
   ```bash
   npm version patch  # or minor, major
   ```

2. **Build and test:**
   ```bash
   npm run build
   npm test
   ```

3. **Publish:**
   ```bash
   npm publish --access public
   ```

## Canary Releases

### Publishing Canary

Canary releases are automatically published when pushing to `develop`:

```bash
git checkout develop
git push origin develop
# Workflow publishes canary automatically
```

### Installing Canary

```bash
npm install gitvan@canary
```

### Testing Canary Locally

```bash
npm pack
npm install -g ./gitvan-*.tgz
gitvan --version
```

## Monitoring and Metrics

### Build Performance

Metrics tracked:
- Dependency installation time
- Build time
- Package size
- Build output size

View in workflow artifacts or GitHub Actions summary.

### Test Performance

Metrics tracked:
- Test execution time
- Test counts (passed/failed/skipped)
- Coverage percentages

### Code Quality

Metrics tracked:
- Source file/line counts
- Test file/line counts
- Test/source ratio
- Dependency counts

## Troubleshooting

### Workflow Failures

**Tests failing:**
1. Check test logs in GitHub Actions
2. Run tests locally: `npm test`
3. Check coverage: `npm run test:coverage`

**Build failing:**
1. Check build logs
2. Run build locally: `npm run build`
3. Check for missing dependencies

**Security issues:**
1. Check security workflow logs
2. Run audit locally: `npm audit`
3. Fix vulnerabilities: `npm audit fix`

**Publish failing:**
1. Verify `NPM_TOKEN` is set in GitHub Secrets
2. Check npm package permissions
3. Verify version doesn't already exist

### Common Issues

**Issue: "npm ERR! 403 Forbidden"**
- Solution: Check `NPM_TOKEN` secret is valid and has publish permissions

**Issue: "Build time exceeds threshold"**
- Solution: Optimize build config or increase threshold in metrics.yml

**Issue: "Package size too large"**
- Solution: Review .npmignore, check bundled dependencies

**Issue: "Tests timeout"**
- Solution: Increase test timeout in vitest.config.mjs

## Best Practices

### Commits

Follow conventional commits format for changelog generation:
```
feat: add new feature
fix: fix bug
docs: update documentation
refactor: refactor code
test: add tests
chore: maintenance tasks
```

### Versioning

Follow semantic versioning:
- **Major (x.0.0)**: Breaking changes
- **Minor (0.x.0)**: New features (backward compatible)
- **Patch (0.0.x)**: Bug fixes

### Testing

- Write tests before implementation (TDD)
- Maintain 80%+ coverage
- Run tests locally before pushing
- Use `npm run test:watch` during development

### Security

- Never commit secrets or API keys
- Run `npm audit` regularly
- Review security scan results
- Keep dependencies updated

## Workflow Maintenance

### Adding New Workflows

1. Create `.github/workflows/new-workflow.yml`
2. Define triggers and jobs
3. Test locally with act (if possible)
4. Commit and push
5. Monitor first run

### Updating Existing Workflows

1. Edit workflow file
2. Test changes on feature branch
3. Review workflow runs
4. Merge to main if successful

### Workflow Optimization

- Use caching for dependencies
- Run jobs in parallel where possible
- Use matrix strategy for multi-version testing
- Set appropriate retention days for artifacts

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)

---

**Last Updated**: 2026-01-06
**GitVan Version**: 3.1.0
