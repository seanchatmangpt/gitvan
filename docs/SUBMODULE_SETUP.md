# Git Submodule Setup Guide - UnRDF Integration

This document provides comprehensive guidance for working with the UnRDF submodule in the GitVan project.

## Table of Contents

1. [What is a Git Submodule?](#what-is-a-git-submodule)
2. [Why We Use a Submodule for UnRDF](#why-we-use-a-submodule-for-unrdf)
3. [Initial Setup for Developers](#initial-setup-for-developers)
4. [Updating the Submodule](#updating-the-submodule)
5. [Working with vendor/unrdf Code](#working-with-vendorunrdf-code)
6. [Troubleshooting Common Issues](#troubleshooting-common-issues)
7. [CI/CD Considerations](#cicd-considerations)
8. [Best Practices](#best-practices)

---

## What is a Git Submodule?

A **git submodule** is a Git repository embedded inside another Git repository. It allows you to:

- **Keep external dependencies separate**: The submodule maintains its own history and version control
- **Pin to specific commits**: Lock to a known-good version of a dependency
- **Track upstream changes**: Easily update to newer versions when ready
- **Maintain clean separation**: The parent repo doesn't contain the submodule's files directly

### Key Characteristics

```
Parent Repository (gitvan)
├── .git/
├── .gitmodules          # Submodule configuration
├── src/
├── vendor/
│   └── unrdf/           # Submodule (separate Git repo)
│       ├── .git         # Points to actual repo
│       ├── src/
│       └── package.json
└── package.json
```

**Important**: The parent repo only stores:
1. The submodule's remote URL
2. The specific commit SHA to check out
3. The path where the submodule should be located

The actual submodule content is **not** stored in the parent repo's history.

---

## Why We Use a Submodule for UnRDF

GitVan uses UnRDF as a git submodule (at `vendor/unrdf/`) rather than an npm dependency for several strategic reasons:

### 1. **Active Development & Tight Integration**
- UnRDF is under active development specifically for GitVan's semantic graph needs
- We contribute features and fixes directly to UnRDF
- Changes in UnRDF often require corresponding changes in GitVan
- Submodule allows seamless cross-repository development

### 2. **Version Control & Stability**
```bash
# Pin to specific commit for stability
git submodule update --init --recursive

# Update to latest when ready
cd vendor/unrdf
git pull origin main
cd ../..
git add vendor/unrdf
git commit -m "chore: update unrdf to latest"
```

### 3. **Monorepo-Like Benefits**
- Work on both codebases simultaneously in one workspace
- Test UnRDF changes immediately in GitVan context
- Debug across repository boundaries easily
- No publish/install cycle during development

### 4. **Build Pipeline Integration**
```json
{
  "scripts": {
    "setup-dev": "git submodule update --init --recursive && npm install && cd vendor/unrdf && npm install && npm run build",
    "build:unrdf": "cd vendor/unrdf && npm run build",
    "build": "npm run build:unrdf && unbuild"
  }
}
```

### 5. **Dependency Transparency**
- Exact version is visible in Git history: `git log vendor/unrdf`
- No hidden npm registry dependencies
- Full source code available for inspection and debugging
- Can modify UnRDF locally for experiments

### When to Use Submodules vs npm Packages

| Scenario | Use Submodule | Use npm Package |
|----------|---------------|-----------------|
| Active co-development | ✓ | |
| Frequent breaking changes | ✓ | |
| Need source-level debugging | ✓ | |
| Cross-repo refactoring | ✓ | |
| Stable public API | | ✓ |
| Third-party library | | ✓ |
| Published to registry | | ✓ |

---

## Initial Setup for Developers

### Quick Setup (Recommended)

Use the automated setup script:

```bash
# Clone and setup in one command
git clone https://github.com/gitvan/gitvan.git
cd gitvan
npm run setup-dev
```

**What `npm run setup-dev` does:**
1. Initializes and clones all git submodules (`git submodule update --init --recursive`)
2. Installs GitVan's dependencies (`npm install`)
3. Navigates to `vendor/unrdf/`
4. Installs UnRDF's dependencies
5. Builds UnRDF
6. Returns to parent directory and builds GitVan

### Manual Setup

If you prefer step-by-step control:

```bash
# 1. Clone the repository
git clone https://github.com/gitvan/gitvan.git
cd gitvan

# 2. Initialize submodules
git submodule init

# 3. Fetch submodule content
git submodule update --recursive

# 4. Verify submodule is present
ls -la vendor/unrdf/
# Should show UnRDF files

# 5. Install dependencies in parent repo
npm install

# 6. Install dependencies in UnRDF submodule
cd vendor/unrdf
npm install

# 7. Build UnRDF
npm run build

# 8. Return to parent and build GitVan
cd ../..
npm run build

# 9. Run tests to verify setup
npm test
```

### Verification

After setup, verify everything is working:

```bash
# Check submodule status
git submodule status
# Should show: <commit-sha> vendor/unrdf (tag-or-branch)

# Verify UnRDF is built
ls -la vendor/unrdf/dist/
# Should contain compiled files

# Run tests
npm test

# Check UnRDF integration
node -e "import('vendor/unrdf/dist/index.mjs').then(m => console.log('UnRDF loaded:', !!m))"
```

### For Existing Clones

If you cloned the repo before submodules were added:

```bash
# Update .gitmodules and initialize submodule
git pull origin main

# Initialize and fetch submodule
git submodule update --init --recursive

# Complete setup
npm run setup-dev
```

---

## Updating the Submodule

### Update to Latest Upstream Version

```bash
# 1. Navigate to submodule directory
cd vendor/unrdf

# 2. Fetch latest changes
git fetch origin

# 3. Checkout desired branch/tag/commit
git checkout main
git pull origin main

# Or checkout specific version
# git checkout v2.1.0

# 4. Return to parent repo
cd ../..

# 5. Stage the submodule update
git add vendor/unrdf

# 6. Commit the update
git commit -m "chore(deps): update unrdf submodule to latest

- Update to commit: $(cd vendor/unrdf && git rev-parse --short HEAD)
- Includes: [describe changes]"

# 7. Rebuild UnRDF
npm run build:unrdf

# 8. Test integration
npm test
```

### Update All Submodules

```bash
# Update all submodules to their registered commits
git submodule update --remote --merge

# Commit the updates
git add .
git commit -m "chore(deps): update all submodules"
```

### Pin to Specific Commit

```bash
cd vendor/unrdf
git checkout <commit-sha>
cd ../..
git add vendor/unrdf
git commit -m "chore(deps): pin unrdf to <commit-sha>"
```

### Rollback a Submodule Update

```bash
# Find previous commit
git log vendor/unrdf

# Reset to previous state
git checkout <previous-commit> -- vendor/unrdf
git submodule update --init --recursive

# Rebuild
npm run build:unrdf
```

---

## Working with vendor/unrdf Code

### Development Workflow

#### Scenario 1: Making Changes to UnRDF

```bash
# 1. Create feature branch in GitVan
git checkout -b feature/update-unrdf

# 2. Navigate to UnRDF submodule
cd vendor/unrdf

# 3. Create feature branch in UnRDF
git checkout -b feature/my-unrdf-feature

# 4. Make changes to UnRDF code
# Edit files in vendor/unrdf/src/

# 5. Test changes locally
npm run build
npm test

# 6. Commit changes in UnRDF
git add .
git commit -m "feat: add new feature"

# 7. Push UnRDF branch
git push origin feature/my-unrdf-feature

# 8. Return to parent repo
cd ../..

# 9. Stage submodule update
git add vendor/unrdf

# 10. Commit in GitVan
git commit -m "feat: integrate new UnRDF feature"

# 11. Test integration
npm run build
npm test

# 12. Push GitVan branch
git push origin feature/update-unrdf
```

#### Scenario 2: Testing UnRDF Changes Before Committing

```bash
# Make changes in vendor/unrdf without committing

cd vendor/unrdf
# Edit files...
npm run build

cd ../..
npm run build
npm test

# If tests pass, commit UnRDF changes
cd vendor/unrdf
git add .
git commit -m "feat: experimental feature"

cd ../..
git add vendor/unrdf
git commit -m "test: integrate experimental UnRDF feature"
```

#### Scenario 3: Submitting UnRDF Changes Upstream

```bash
# 1. Fork UnRDF repository on GitHub
# 2. Add your fork as remote
cd vendor/unrdf
git remote add fork https://github.com/YOUR_USERNAME/unrdf.git

# 3. Push your branch to fork
git push fork feature/my-unrdf-feature

# 4. Create pull request on GitHub
# 5. After PR is merged, update submodule to latest
git fetch origin
git checkout main
git pull origin main

cd ../..
git add vendor/unrdf
git commit -m "chore(deps): update unrdf to include merged feature"
```

### Importing UnRDF in GitVan Code

```javascript
// Use relative path from GitVan source
import { SomeUnRDFFunction } from '../../vendor/unrdf/dist/index.mjs';

// Or configure alias in build config
import { SomeUnRDFFunction } from 'vendor/unrdf';
```

### Build Configuration

**gitvan package.json:**
```json
{
  "scripts": {
    "build:unrdf": "cd vendor/unrdf && npm run build",
    "build": "npm run build:unrdf && unbuild",
    "dev": "npm run build:unrdf && vitest --watch",
    "prebuild": "npm run build:unrdf"
  }
}
```

### Path Aliases (Optional)

**build.config.ts:**
```typescript
export default defineBuildConfig({
  alias: {
    'vendor/unrdf': './vendor/unrdf/dist/index.mjs'
  }
});
```

---

## Troubleshooting Common Issues

### Issue 1: Submodule Directory is Empty

**Symptom:**
```bash
ls vendor/unrdf
# Empty or only shows .git
```

**Solution:**
```bash
git submodule update --init --recursive
```

**Root Cause:** Submodule was not initialized after cloning.

---

### Issue 2: "fatal: no submodule mapping found"

**Symptom:**
```bash
git submodule status
fatal: no submodule mapping found in .gitmodules for path 'vendor/unrdf'
```

**Solution:**
```bash
# Remove corrupted submodule
git rm --cached vendor/unrdf
rm -rf vendor/unrdf

# Re-add submodule
git submodule add https://github.com/unjs/unrdf.git vendor/unrdf
git submodule update --init --recursive
```

---

### Issue 3: Submodule Detached HEAD

**Symptom:**
```bash
cd vendor/unrdf
git branch
# * (HEAD detached at abc1234)
```

**Explanation:** This is **normal** for submodules. The parent repo pins to a specific commit, not a branch.

**If you need to work on a branch:**
```bash
cd vendor/unrdf
git checkout main
git pull origin main

# Work on your changes
# ...

# Commit and return
git add .
git commit -m "fix: something"

cd ../..
git add vendor/unrdf
git commit -m "chore(deps): update unrdf"
```

---

### Issue 4: Permission Denied (SSH Keys)

**Symptom:**
```bash
git submodule update --init --recursive
Permission denied (publickey)
```

**Solution:**
```bash
# Option 1: Use HTTPS instead
git config --global url."https://github.com/".insteadOf git@github.com:

# Option 2: Add SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub
# Add to GitHub → Settings → SSH Keys

# Option 3: Update .gitmodules to use HTTPS
# Edit .gitmodules:
[submodule "vendor/unrdf"]
    path = vendor/unrdf
    url = https://github.com/unjs/unrdf.git
```

---

### Issue 5: Merge Conflicts in Submodule

**Symptom:**
```bash
git pull origin main
CONFLICT (submodule): Merge conflict in vendor/unrdf
```

**Solution:**
```bash
# Option 1: Accept incoming version
git checkout --theirs vendor/unrdf
git submodule update --init --recursive

# Option 2: Accept current version
git checkout --ours vendor/unrdf

# Option 3: Manual resolution
cd vendor/unrdf
git fetch
git merge origin/main
# Resolve conflicts
git add .
git commit

cd ../..
git add vendor/unrdf
git commit -m "chore: resolve submodule merge conflict"
```

---

### Issue 6: Build Errors After Submodule Update

**Symptom:**
```bash
npm run build
Error: Cannot find module 'vendor/unrdf/dist/index.mjs'
```

**Solution:**
```bash
# Rebuild UnRDF
npm run build:unrdf

# If still failing, clean and rebuild
cd vendor/unrdf
rm -rf node_modules dist
npm install
npm run build

cd ../..
npm run build
```

---

### Issue 7: Tests Failing After Update

**Symptom:**
```bash
npm test
FAIL src/unrdf-integration.test.mjs
```

**Solution:**
```bash
# Check what changed in UnRDF
cd vendor/unrdf
git log --oneline -10

# Review breaking changes
git show <commit-sha>

# Update GitVan code to match new API
# ...

# Or rollback UnRDF to previous version
git checkout <previous-commit>
cd ../..
git add vendor/unrdf
git commit -m "chore(deps): rollback unrdf due to breaking changes"
```

---

### Issue 8: Submodule Not Updating in CI

**Symptom:** CI builds fail with missing submodule content.

**Solution:**

**GitHub Actions (.github/workflows/ci.yml):**
```yaml
- name: Checkout code
  uses: actions/checkout@v4
  with:
    submodules: 'recursive'  # ← Important!

- name: Setup submodules
  run: |
    git submodule update --init --recursive
```

**GitLab CI (.gitlab-ci.yml):**
```yaml
variables:
  GIT_SUBMODULE_STRATEGY: recursive  # ← Important!

before_script:
  - git submodule sync --recursive
  - git submodule update --init --recursive
```

---

## CI/CD Considerations

### GitHub Actions

**Complete workflow example:**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      # 1. Checkout with submodules
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          submodules: 'recursive'  # Clone submodules
          fetch-depth: 0           # Full history for better debugging

      # 2. Setup Node.js
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      # 3. Install dependencies
      - name: Install dependencies
        run: npm ci

      # 4. Setup UnRDF submodule
      - name: Build UnRDF
        run: |
          cd vendor/unrdf
          npm ci
          npm run build

      # 5. Build GitVan
      - name: Build
        run: npm run build

      # 6. Run tests
      - name: Test
        run: npm test -- --coverage

      # 7. Upload coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

### GitLab CI

```yaml
variables:
  GIT_SUBMODULE_STRATEGY: recursive
  GIT_DEPTH: 0

stages:
  - build
  - test

cache:
  paths:
    - node_modules/
    - vendor/unrdf/node_modules/

before_script:
  - git submodule sync --recursive
  - git submodule update --init --recursive

build:
  stage: build
  script:
    - npm ci
    - cd vendor/unrdf && npm ci && npm run build
    - cd ../.. && npm run build
  artifacts:
    paths:
      - dist/
      - vendor/unrdf/dist/
    expire_in: 1 day

test:
  stage: test
  dependencies:
    - build
  script:
    - npm test -- --coverage
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
```

### CircleCI

```yaml
version: 2.1

jobs:
  build-and-test:
    docker:
      - image: cimg/node:18.0
    steps:
      - checkout

      # Initialize submodules
      - run:
          name: Update submodules
          command: |
            git submodule sync
            git submodule update --init --recursive

      # Restore cache
      - restore_cache:
          keys:
            - v1-dependencies-{{ checksum "package-lock.json" }}
            - v1-dependencies-

      # Install dependencies
      - run:
          name: Install dependencies
          command: |
            npm ci
            cd vendor/unrdf && npm ci

      # Build
      - run:
          name: Build
          command: |
            npm run build:unrdf
            npm run build

      # Test
      - run:
          name: Test
          command: npm test

      # Save cache
      - save_cache:
          paths:
            - node_modules
            - vendor/unrdf/node_modules
          key: v1-dependencies-{{ checksum "package-lock.json" }}

workflows:
  version: 2
  build-test:
    jobs:
      - build-and-test
```

### Key CI/CD Best Practices

1. **Always use `submodules: 'recursive'`** in checkout actions
2. **Cache submodule dependencies** separately
3. **Build submodule before parent** in build scripts
4. **Fail fast** if submodule initialization fails
5. **Use consistent Node.js versions** across environments
6. **Pin submodule to specific commits** for reproducible builds
7. **Test submodule updates** in separate CI runs before merging

### Docker Considerations

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Initialize Git for submodules
RUN apk add --no-cache git

# Clone repository with submodules
RUN git clone --recurse-submodules https://github.com/gitvan/gitvan.git .

# Install dependencies
RUN npm ci

# Build UnRDF
WORKDIR /app/vendor/unrdf
RUN npm ci && npm run build

# Build GitVan
WORKDIR /app
RUN npm run build

CMD ["node", "dist/cli.mjs"]
```

---

## Best Practices

### 1. Always Use `npm run setup-dev`

New developers should **always** use the automated setup:

```bash
npm run setup-dev
```

This ensures:
- Submodules are initialized correctly
- Dependencies are installed in correct order
- UnRDF is built before GitVan
- Consistent setup across team

### 2. Commit Submodule Updates Separately

```bash
# ✓ Good: Separate commits
git add vendor/unrdf
git commit -m "chore(deps): update unrdf to v2.1.0"

git add src/
git commit -m "feat: use new unrdf API"

# ✗ Bad: Mixed commit
git add vendor/unrdf src/
git commit -m "update stuff"
```

### 3. Document Breaking Changes

When updating UnRDF:

```bash
git commit -m "chore(deps): update unrdf to v2.1.0

BREAKING CHANGE: UnRDF v2.1.0 changes API:
- parseGraph() now returns Promise
- Updated all call sites in src/rdf/

Closes #123"
```

### 4. Test Before Pushing Submodule Updates

```bash
# Update submodule
cd vendor/unrdf
git pull origin main
cd ../..

# Build and test
npm run build
npm test

# Only commit if tests pass
git add vendor/unrdf
git commit -m "chore(deps): update unrdf"
```

### 5. Use Shallow Clones for CI

Speed up CI by using shallow submodule clones:

```yaml
- uses: actions/checkout@v4
  with:
    submodules: 'recursive'
    fetch-depth: 1  # Shallow clone
```

### 6. Keep Submodule Documentation Updated

When adding/removing submodules, update:
- This file (SUBMODULE_SETUP.md)
- README.md
- CI/CD configuration
- Development setup scripts

### 7. Automate Submodule Checks

**package.json:**
```json
{
  "scripts": {
    "postinstall": "git submodule update --init --recursive",
    "check-submodules": "git submodule status | grep -q '^-' && echo 'ERROR: Submodules not initialized' && exit 1 || echo 'OK'"
  }
}
```

### 8. Use Pre-commit Hooks

**.husky/pre-commit:**
```bash
#!/bin/sh

# Check if submodule is properly initialized
if [ ! -f "vendor/unrdf/package.json" ]; then
  echo "ERROR: UnRDF submodule not initialized"
  echo "Run: npm run setup-dev"
  exit 1
fi

# Check if submodule is built
if [ ! -d "vendor/unrdf/dist" ]; then
  echo "WARNING: UnRDF not built"
  echo "Run: npm run build:unrdf"
fi
```

---

## Summary

### Quick Reference

| Task | Command |
|------|---------|
| **Initial setup** | `npm run setup-dev` |
| **Update submodule** | `cd vendor/unrdf && git pull origin main` |
| **Build UnRDF** | `npm run build:unrdf` |
| **Check status** | `git submodule status` |
| **Reinitialize** | `git submodule update --init --recursive` |
| **Work on UnRDF** | `cd vendor/unrdf && git checkout -b feature/...` |

### Key Takeaways

1. **Use `npm run setup-dev`** for initial setup
2. **Submodules are pinned to commits**, not branches
3. **Always rebuild UnRDF** after updating: `npm run build:unrdf`
4. **Test integration** after submodule changes: `npm test`
5. **Commit submodule updates separately** from code changes
6. **CI/CD must use `submodules: 'recursive'`** in checkout
7. **Document breaking changes** in commit messages

### Getting Help

If you encounter issues not covered here:

1. Check [Troubleshooting](#troubleshooting-common-issues) section
2. Run `git submodule status` and `git submodule summary`
3. Review recent commits: `git log vendor/unrdf`
4. Open an issue on GitHub with error details
5. Ask in team chat with output of:
   ```bash
   git submodule status
   ls -la vendor/unrdf/
   cd vendor/unrdf && git log --oneline -5
   ```

---

**Last Updated**: January 9, 2026
**For**: GitVan v3.1.0+
**Maintained by**: GitVan Development Team
