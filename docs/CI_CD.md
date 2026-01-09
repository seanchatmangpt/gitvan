# GitVan CI/CD Documentation

This document describes the Continuous Integration and Continuous Deployment (CI/CD) setup for GitVan, with a focus on Git submodule handling.

## Table of Contents

1. [Overview](#overview)
2. [Git Submodule Integration](#git-submodule-integration)
3. [Workflow Files](#workflow-files)
4. [Submodule Configuration](#submodule-configuration)
5. [Validation and Checks](#validation-and-checks)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

---

## Overview

GitVan uses GitHub Actions for automated testing, building, and deployment. The CI/CD pipeline includes comprehensive submodule support to ensure that the `vendor/unrdf` submodule is properly initialized and available across all workflow jobs.

### Key Features

- **Automated Submodule Initialization**: All workflows automatically clone and update submodules
- **Submodule Health Checks**: Dedicated workflow validates submodule configuration
- **Multi-Node Testing**: Tests run on Node.js 18, 20, and 22
- **Coverage Reporting**: Automated test coverage tracking with 80% minimum threshold
- **Documentation Generation**: Auto-generated API and coverage documentation
- **Release Automation**: Automated npm publishing and GitHub release creation

---

## Git Submodule Integration

### What Changed

As of January 2026, GitVan now uses `unrdf` as a Git submodule instead of a regular npm dependency. This change provides several benefits:

- **Version Control**: Explicit tracking of the exact unrdf version used
- **Development Workflow**: Easier to develop GitVan and unrdf together
- **Reproducible Builds**: Guaranteed consistency across environments
- **No Registry Dependencies**: Direct repository access

### Submodule Location

The unrdf package is located at:

```
vendor/unrdf/
```

This submodule is configured in `.gitmodules` and points to `https://github.com/unrdf/unrdf.git`.

### Configuration File

The `.gitmodules` file at the repository root contains:

```gitmodules
# Git submodules configuration
# This file defines external repositories included as submodules

[submodule "vendor/unrdf"]
	path = vendor/unrdf
	url = https://github.com/unrdf/unrdf.git
	branch = main
	# Shallow clone to reduce download size
	shallow = true
```

---

## Workflow Files

### 1. Main Test Workflow (`test.yml`)

**Location**: `.github/workflows/test.yml`

**Purpose**: Runs the complete test suite across multiple Node.js versions

**Submodule Integration**:
- All checkout steps include `submodules: recursive`
- All checkout steps include `fetch-depth: 0` for full Git history
- Submodules are explicitly initialized and updated after checkout

**Key Jobs**:
- `install`: Install dependencies
- `lint`: Run ESLint
- `build`: Build the project
- `test-matrix`: Run tests on Node 18, 20, 22 with 3-way sharding
- `coverage`: Generate coverage reports
- `integration`: Run integration tests
- `benchmarks`: Performance benchmarks

**Example Checkout Pattern**:

```yaml
- name: Checkout
  uses: actions/checkout@v4
  with:
    submodules: recursive
    fetch-depth: 0

- name: Initialize and update submodules
  run: |
    git submodule init
    git submodule update --recursive
```

### 2. Submodule Health Check Workflow (`submodule-check.yml`)

**Location**: `.github/workflows/submodule-check.yml`

**Purpose**: Validates that all Git submodules are properly configured and accessible

**Triggers**:
- Push to `main`, `develop`, or `claude/**` branches
- Pull requests to `main` or `develop`
- Daily at 3 AM UTC (scheduled)
- Manual workflow dispatch

**Key Jobs**:

#### `verify-submodules`
Performs comprehensive submodule verification:
- ✅ Verifies `.gitmodules` file exists
- ✅ Validates `.gitmodules` syntax
- ✅ Checks submodule paths exist
- ✅ Verifies `vendor/unrdf` is initialized
- ✅ Tests submodule URLs are accessible
- ✅ Checks submodule commits
- ✅ Verifies submodule integrity with `git fsck`
- ✅ Detects uncommitted submodule changes

#### `run-validation-script`
Runs the comprehensive validation script at `scripts/validate-submodules.sh`

#### `check-updates`
Checks for available submodule updates (scheduled runs only):
- Fetches latest commits from submodule remotes
- Reports if updates are available
- Provides current vs. latest commit comparison

#### `summary`
Generates a summary of all submodule health checks

### 3. Release Workflow (`release.yml`)

**Location**: `.github/workflows/release.yml`

**Purpose**: Handles version releases and npm publishing

**Submodule Integration**: All jobs include submodule checkout and initialization

**Key Jobs**:
- `validate`: Validate release version format
- `test`: Run full test suite before release
- `build`: Build release package
- `publish-npm`: Publish to npm registry
- `github-release`: Create GitHub release with artifacts

### 4. Checks Workflow (`checks.yml`)

**Location**: `.github/workflows/checks.yml`

**Purpose**: Quick checks for all pushes and pull requests

**Submodule Integration**: Includes recursive submodule checkout

**Operations**:
- Installs dependencies with pnpm
- Runs tests
- Runs documentation tests

### 5. Autofix Workflow (`autofix.yml`)

**Location**: `.github/workflows/autofix.yml`

**Purpose**: Automatically applies formatting and linting fixes

**Submodule Integration**: Includes recursive submodule checkout

**Operations**:
- Runs documentation tests
- Commits automated fixes via autofix.ci

### 6. Documentation Workflow (`docs.yml`)

**Location**: `.github/workflows/docs.yml`

**Purpose**: Generates and deploys documentation

**Submodule Integration**: All documentation jobs include submodule checkout

**Key Jobs**:
- `api-docs`: Generate JSDoc API documentation
- `readme-docs`: Generate CLI and example documentation
- `coverage-docs`: Generate coverage reports
- `build-site`: Build documentation site
- `deploy-pages`: Deploy to GitHub Pages (main branch only)

---

## Submodule Configuration

### Manual Submodule Operations

When working locally with submodules:

#### Initialize Submodules (First Time)

```bash
git submodule init
git submodule update --recursive
```

#### Update Submodules to Latest

```bash
git submodule update --remote --recursive
```

#### Clone Repository with Submodules

```bash
git clone --recurse-submodules https://github.com/seanchatmangpt/gitvan.git
```

#### Update Existing Clone

```bash
git pull
git submodule update --recursive
```

### Development Setup Script

The repository should include a `npm run setup-dev` script for initial development setup:

```json
{
  "scripts": {
    "setup-dev": "git submodule init && git submodule update --recursive && npm install"
  }
}
```

---

## Validation and Checks

### Validation Script

**Location**: `scripts/validate-submodules.sh`

**Purpose**: Comprehensive submodule validation

**Features**:
- Color-coded output (✅ success, ❌ error, ⚠️ warning)
- 10 comprehensive checks
- Detailed summary report
- Exit codes for CI/CD integration

**Checks Performed**:

1. **`.gitmodules` exists**: Verifies configuration file
2. **`.gitmodules` syntax**: Validates Git config syntax
3. **Submodule count**: Reports number of configured submodules
4. **Path verification**: Ensures all submodule paths exist
5. **vendor/unrdf verification**: Specific check for unrdf submodule
6. **URL accessibility**: Tests that submodule URLs can be reached
7. **Submodule status**: Runs `git submodule status`
8. **Commit sync**: Checks for staged `.gitmodules` changes
9. **Modified files**: Detects uncommitted changes in submodules
10. **Git config**: Verifies git config has submodule settings

**Usage**:

```bash
# Run validation script
./scripts/validate-submodules.sh

# Make executable if needed
chmod +x scripts/validate-submodules.sh
```

**Exit Codes**:
- `0`: All checks passed or warnings only
- `1`: One or more checks failed

### Health Check Schedule

The submodule health check workflow runs:
- On every push to main/develop branches
- On every pull request
- Daily at 3 AM UTC (via cron schedule)
- Manually via workflow dispatch

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: Submodule directory is empty

**Symptoms**: `vendor/unrdf/` exists but contains no files

**Solution**:
```bash
git submodule init
git submodule update --recursive
```

#### Issue: Submodule is not initialized in CI

**Symptoms**: Build fails with "module not found" errors for unrdf

**Solution**: Verify workflow file includes submodule checkout configuration:

```yaml
- uses: actions/checkout@v4
  with:
    submodules: recursive
    fetch-depth: 0

- name: Initialize and update submodules
  run: |
    git submodule init
    git submodule update --recursive
```

#### Issue: Submodule URL is not accessible

**Symptoms**: `git submodule update` fails with "fatal: repository not found"

**Solution**: Check `.gitmodules` URL is correct and accessible

#### Issue: Submodule commit mismatch

**Symptoms**: Submodule shows modified status in `git status`

**Solution**: Either commit the new submodule reference or reset:

```bash
# To use current submodule version
git add vendor/unrdf
git commit -m "chore: update unrdf submodule"

# To reset to committed version
git submodule update --recursive
```

#### Issue: CI fails with "No module named 'unrdf'"

**Symptoms**: Tests fail to import unrdf

**Possible Causes**:
1. Submodules not initialized in workflow
2. npm install didn't include submodule dependencies
3. Build artifacts missing

**Solution**:
1. Verify workflow includes submodule steps
2. Ensure `npm install` runs after submodule update
3. Check build configuration includes vendor directory

### Debug Commands

Use these commands to diagnose submodule issues:

```bash
# Show submodule status
git submodule status

# Show submodule configuration
git config --file .gitmodules --list

# Show git's submodule config
git config --get-regexp '^submodule\.'

# Check for submodule changes
git diff --submodule

# Show submodule log
git log --oneline --graph vendor/unrdf

# Verify submodule URL
git ls-remote https://github.com/unrdf/unrdf.git HEAD
```

---

## Best Practices

### For Contributors

1. **Always initialize submodules** after cloning or pulling:
   ```bash
   git submodule update --init --recursive
   ```

2. **Check submodule status** before committing:
   ```bash
   git status
   git submodule status
   ```

3. **Update submodules intentionally**: Don't accidentally update submodules unless you mean to

4. **Test locally before pushing**: Ensure submodule changes work in your local environment

5. **Document submodule updates**: Include submodule update reasons in commit messages

### For Maintainers

1. **Review submodule updates carefully**: Changes to submodules affect all users

2. **Pin specific commits**: Use specific commits rather than branch references for stability

3. **Test across environments**: Verify submodule changes work in CI before merging

4. **Monitor health checks**: Review daily submodule health check results

5. **Keep documentation updated**: Update this document when making submodule changes

### For CI/CD Configuration

1. **Always use `submodules: recursive`**: Ensures nested submodules are initialized

2. **Always use `fetch-depth: 0`**: Provides full Git history for proper submodule resolution

3. **Explicitly initialize submodules**: Don't rely on checkout alone - run init and update

4. **Cache carefully**: Be cautious with caching strategies that might skip submodule updates

5. **Validate in separate job**: Use dedicated health check workflow for validation

---

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Push / Pull Request                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │  All Workflows Execute        │
         │  with Submodule Support       │
         └───────────────┬───────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
┌─────────────────┐            ┌─────────────────┐
│   test.yml      │            │ submodule-      │
│                 │            │ check.yml       │
│ - Install       │            │                 │
│ - Lint          │            │ - Verify        │
│ - Build         │            │ - Validate      │
│ - Test Matrix   │            │ - Check URLs    │
│ - Coverage      │            │ - Run Script    │
│ - Integration   │            └─────────────────┘
└─────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  All Jobs Checkout with:                │
│  - submodules: recursive                │
│  - fetch-depth: 0                       │
│  - git submodule init && update         │
└─────────────────────────────────────────┘
```

---

## Summary

GitVan's CI/CD pipeline includes comprehensive Git submodule support to ensure the `vendor/unrdf` submodule is always properly initialized and available. Key features include:

✅ **Automatic Initialization**: All workflows automatically handle submodules
✅ **Health Monitoring**: Daily validation of submodule configuration
✅ **Validation Script**: Comprehensive 10-check validation tool
✅ **Multi-Environment Testing**: Tests across Node 18, 20, 22
✅ **Clear Documentation**: This guide for contributors and maintainers

### Quick Reference

| Task | Command |
|------|---------|
| Initialize submodules | `git submodule init && git submodule update --recursive` |
| Clone with submodules | `git clone --recurse-submodules <url>` |
| Update submodules | `git submodule update --remote --recursive` |
| Check submodule status | `git submodule status` |
| Run validation script | `./scripts/validate-submodules.sh` |
| Setup development | `npm run setup-dev` |

---

## Related Documentation

- **Main README**: `/README.md` - Project overview and getting started
- **Developer Guide**: `/CLAUDE.md` - Comprehensive development guidelines
- **Deployment Guide**: `/DEPLOYMENT.md` - Deployment procedures
- **Changelog**: `/CHANGELOG.md` - Version history

---

**Last Updated**: January 9, 2026
**Version**: 1.0.0
**Maintained by**: GitVan Development Team
