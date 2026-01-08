# Procedure 03: Build Procedure

## Purpose
Ensure consistent, reproducible builds that package GitVan for distribution with all necessary artifacts and minimal errors.

## Scope
Covers local development builds, CI/CD builds, production builds, and build verification procedures.

## Frequency
- **Development Builds**: As needed during development
- **CI Builds**: Every commit, every PR
- **Release Builds**: Every release candidate
- **Production Builds**: Every release

## Responsible Party
**Primary**: All developers (local builds), DevOps (CI/CD builds)
**Secondary**: Release manager (production builds)

## Prerequisites
- Node.js 18+ installed
- All dependencies installed (`npm install`)
- Clean working directory
- All tests passing
- No linting errors

## Step-by-Step Instructions

### Phase 1: Pre-Build Verification

**Step 1.1: Clean Working Directory**
```bash
git status
```
**Expected Outcome**: No uncommitted changes or untracked build files
**Verification**: See "working tree clean" or only expected changes

**Step 1.2: Clean Previous Build**
```bash
rm -rf dist/
rm -rf node_modules/.cache/
```
**Expected Outcome**: Old build artifacts removed
**Verification**: `dist/` directory doesn't exist

**Step 1.3: Verify Dependencies**
```bash
npm install
```
**Expected Outcome**: All dependencies installed, no vulnerabilities
**Verification**: See "up to date, audited X packages"

**Step 1.4: Run Pre-Build Checks**
```bash
# Lint check
npm run lint

# Format check
npm run format:check

# Type check (if applicable)
# npm run typecheck
```
**Expected Outcome**: All checks pass with 0 errors
**Verification**: See green checkmarks, no error messages

**Step 1.5: Run Tests**
```bash
npm test
```
**Expected Outcome**: All tests pass
**Verification**: "Tests passed" message, 0 failures

### Phase 2: Development Build

**Step 2.1: Run Build Command**
```bash
npm run build
```
**Expected Outcome**: Build completes successfully
**Verification**: See "Build succeeded" message

**Step 2.2: Verify Build Output**
```bash
ls -la dist/
```
**Expected Outcome**: Build artifacts created
**Verification**: Should see:
```
dist/
├── cli.mjs              # Main CLI entry
├── bin/
│   └── gitvan.mjs       # Binary entry point
├── templates/           # Copied templates
├── packs/              # Copied packs
└── types/              # Copied types
```

**Step 2.3: Check Build Size**
```bash
du -sh dist/
```
**Expected Outcome**: Build size reasonable (< 50MB)
**Verification**: Size shown, not excessive

**Step 2.4: Verify Entry Points**
```bash
node dist/cli.mjs --version
node dist/bin/gitvan.mjs --help
```
**Expected Outcome**: Commands execute successfully
**Verification**: Version number displayed, help text shown

### Phase 3: Production Build

**Step 3.1: Set Production Environment**
```bash
export NODE_ENV=production
```
**Expected Outcome**: Environment variable set
**Verification**: `echo $NODE_ENV` shows "production"

**Step 3.2: Clean Build**
```bash
rm -rf dist/
npm run build
```
**Expected Outcome**: Production build created with optimizations
**Verification**: Build completes, minified output (if applicable)

**Step 3.3: Verify No Development Dependencies**
```bash
# Check package.json
cat dist/package.json | grep devDependencies
```
**Expected Outcome**: No devDependencies in output
**Verification**: Empty or no match found

**Step 3.4: Test Production Build**
```bash
cd dist/
npm install --production
node cli.mjs --version
cd ..
```
**Expected Outcome**: Production build works standalone
**Verification**: Version displayed correctly

### Phase 4: Build Verification

**Step 4.1: Verify All Entry Points**
```bash
# Test CLI entry
node dist/cli.mjs help

# Test binary entry
node dist/bin/gitvan.mjs help

# Test with NODE_OPTIONS
NODE_OPTIONS="--experimental-vm-modules" node dist/cli.mjs help
```
**Expected Outcome**: All entry points work
**Verification**: Help text displayed for each

**Step 4.2: Verify Templates Copied**
```bash
ls -la dist/templates/
```
**Expected Outcome**: All templates present
**Verification**: Templates directory contains .njk files

**Step 4.3: Verify Packs Copied**
```bash
ls -la dist/packs/
```
**Expected Outcome**: All packs present
**Verification**: Packs directory contains pack directories

**Step 4.4: Check for Build Warnings**
```bash
npm run build 2>&1 | grep -i "warn"
```
**Expected Outcome**: No critical warnings
**Verification**: Empty output or only minor warnings

**Step 4.5: Verify Exports**
```bash
# Test that composables can be imported
node -e "import('./dist/cli.mjs').then(m => console.log('Imports OK'))"
```
**Expected Outcome**: No import errors
**Verification**: "Imports OK" message

### Phase 5: Build Artifacts

**Step 5.1: Create Build Manifest**
```bash
cat > dist/BUILD_MANIFEST.json <<EOF
{
  "buildTime": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "gitCommit": "$(git rev-parse HEAD)",
  "gitBranch": "$(git branch --show-current)",
  "nodeVersion": "$(node --version)",
  "npmVersion": "$(npm --version)",
  "buildEnvironment": "${NODE_ENV:-development}"
}
EOF
```
**Expected Outcome**: Build manifest created
**Verification**: `cat dist/BUILD_MANIFEST.json` shows metadata

**Step 5.2: Generate Checksums**
```bash
cd dist/
find . -type f -name "*.mjs" -exec sha256sum {} \; > CHECKSUMS.txt
cd ..
```
**Expected Outcome**: Checksums file created
**Verification**: `cat dist/CHECKSUMS.txt` shows file hashes

**Step 5.3: Create Build Archive (Optional)**
```bash
tar -czf gitvan-build-$(git rev-parse --short HEAD).tar.gz dist/
```
**Expected Outcome**: Archive created
**Verification**: `.tar.gz` file exists

### Phase 6: CI/CD Build

**Step 6.1: Verify CI Configuration**
```yaml
# .github/workflows/test.yml
name: Build and Test
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    steps:
      - uses: actions/checkout@v3
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm run build
      - run: npm test
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/
```
**Expected Outcome**: CI configuration exists
**Verification**: File present and valid

**Step 6.2: Monitor CI Build**
```bash
# Check CI status
gh run list --limit 5

# View specific run
gh run view <run-id>

# Download artifacts
gh run download <run-id>
```
**Expected Outcome**: CI build succeeds
**Verification**: Green checkmark on GitHub

**Step 6.3: Verify CI Artifacts**
```bash
# After downloading from CI
ls -la dist/
node dist/cli.mjs --version
```
**Expected Outcome**: CI-built artifacts work
**Verification**: Commands execute successfully

### Phase 7: Release Build

**Step 7.1: Update Version**
```bash
npm version patch  # or minor, or major
```
**Expected Outcome**: Version bumped, git tag created
**Verification**: `package.json` version updated

**Step 7.2: Build for Release**
```bash
export NODE_ENV=production
rm -rf dist/
npm run build
```
**Expected Outcome**: Clean production build
**Verification**: Build succeeds, optimized output

**Step 7.3: Run Release Tests**
```bash
npm test
npm run test:coverage
```
**Expected Outcome**: All tests pass, coverage ≥80%
**Verification**: Green results, coverage thresholds met

**Step 7.4: Create Release Package**
```bash
npm pack
```
**Expected Outcome**: `.tgz` package created
**Verification**: File like `gitvan-4.0.0.tgz` exists

**Step 7.5: Test Release Package**
```bash
# Create test directory
mkdir -p /tmp/test-gitvan-release
cd /tmp/test-gitvan-release

# Install from package
npm install /path/to/gitvan-4.0.0.tgz

# Test installation
npx gitvan --version
npx gitvan help

# Cleanup
cd -
rm -rf /tmp/test-gitvan-release
```
**Expected Outcome**: Package installs and works
**Verification**: Commands execute correctly

### Phase 8: Build Optimization

**Step 8.1: Analyze Bundle Size**
```bash
# Check total size
du -sh dist/

# Check individual files
du -h dist/*.mjs | sort -h

# Find largest files
find dist/ -type f -exec du -h {} \; | sort -rh | head -20
```
**Expected Outcome**: Understand what's large
**Verification**: Size breakdown displayed

**Step 8.2: Check for Unnecessary Files**
```bash
# Look for source maps in production
find dist/ -name "*.map"

# Look for test files
find dist/ -name "*.test.mjs"

# Look for development files
find dist/ -name "*.dev.mjs"
```
**Expected Outcome**: No unnecessary files in production build
**Verification**: Empty results (or expected files only)

**Step 8.3: Verify Tree-Shaking**
```bash
# Check that unused code is removed
grep -r "unused-function-name" dist/
```
**Expected Outcome**: Unused code not in bundle
**Verification**: No matches found

### Phase 9: Build Cleanup

**Step 9.1: Remove Build Artifacts (If Needed)**
```bash
npm run clean  # If script exists
# Or manually:
rm -rf dist/
rm -rf node_modules/.cache/
```
**Expected Outcome**: Build artifacts removed
**Verification**: Directories deleted

**Step 9.2: Reset Environment**
```bash
unset NODE_ENV
```
**Expected Outcome**: Environment reset to default
**Verification**: `echo $NODE_ENV` shows nothing

## Success Criteria

- [ ] Build completes without errors
- [ ] All entry points work
- [ ] Templates and packs copied
- [ ] Build size reasonable (< 50MB)
- [ ] No development dependencies in production build
- [ ] All tests pass with built code
- [ ] CI build succeeds
- [ ] Build manifest created
- [ ] Checksums generated
- [ ] Release package works when installed

## Troubleshooting

### Issue: Build Fails with "Cannot find module"
**Cause**: Missing dependency or incorrect import path
**Solution**:
```bash
# Clean and reinstall
rm -rf node_modules package-lock.json
npm install

# Check import paths
grep -r "from.*missing-module" src/

# Verify dependency in package.json
cat package.json | grep missing-module
```

### Issue: Build Succeeds But CLI Doesn't Work
**Cause**: Entry point misconfigured or missing shebang
**Solution**:
```bash
# Check shebang in bin file
head -1 dist/bin/gitvan.mjs
# Should be: #!/usr/bin/env node

# Make executable
chmod +x dist/bin/gitvan.mjs

# Test directly
node dist/cli.mjs --version
```

### Issue: Build Size Too Large
**Cause**: Including unnecessary files or dependencies
**Solution**:
```bash
# Analyze what's large
npm run build
du -h dist/*.mjs | sort -rh | head -10

# Check external dependencies in build.config.ts
cat build.config.ts | grep external

# Ensure dependencies are external, not bundled
# Update build.config.ts external array
```

### Issue: Templates Not Copied
**Cause**: Copy configuration incorrect
**Solution**:
```javascript
// build.config.ts
export default defineBuildConfig({
  // ...
  externals: [
    {
      input: "./templates",
      outDir: "./dist/templates",
    },
  ],
});
```

### Issue: Build Works Locally But Fails in CI
**Cause**: Environment differences
**Solution**:
```bash
# Match CI environment
export NODE_ENV=test
export TZ=UTC
export LANG=C

# Clean build
rm -rf node_modules dist
npm ci  # Use ci, not install
npm run build
```

### Issue: "Cannot use import statement outside module"
**Cause**: Missing "type": "module" or wrong file extension
**Solution**:
```json
// package.json
{
  "type": "module",
  "exports": {
    ".": "./dist/cli.mjs"
  }
}
```

### Issue: Build Performance Slow
**Cause**: Large number of files or inefficient build config
**Solution**:
```bash
# Use unbuild cache
export UNBUILD_CACHE=true

# Parallel builds (if supported)
npm run build -- --parallel

# Profile build
time npm run build
```

## Performance Standards

| Metric | Target | Measurement |
|--------|--------|-------------|
| Build Time (Development) | < 30 seconds | `time npm run build` |
| Build Time (Production) | < 60 seconds | `time NODE_ENV=production npm run build` |
| Build Size (Total) | < 50 MB | `du -sh dist/` |
| Build Size (CLI) | < 5 MB | `du -sh dist/cli.mjs` |
| Clean Build Time | < 90 seconds | `time (rm -rf dist && npm run build)` |

## References
- [unbuild Documentation](https://github.com/unjs/unbuild)
- [Development Workflow](01-DEVELOPMENT-WORKFLOW.md)
- [Deployment Procedure](04-DEPLOYMENT-PROCEDURE.md)
- [build.config.ts](/home/user/gitvan/build.config.ts)

## Training Requirements

**Who Needs This Training**: All developers

**Training Duration**: 1 hour

**Training Method**:
1. Read this procedure (20 min)
2. Perform local build with supervision (20 min)
3. Review build configuration (20 min)

**Competency Check**:
- [ ] Can run local build
- [ ] Can verify build artifacts
- [ ] Can debug build failures
- [ ] Can create release package
- [ ] Understands build configuration
- [ ] Can interpret CI build results

## Related Procedures
- [01-DEVELOPMENT-WORKFLOW.md](01-DEVELOPMENT-WORKFLOW.md)
- [02-TESTING-PROCEDURE.md](02-TESTING-PROCEDURE.md)
- [04-DEPLOYMENT-PROCEDURE.md](04-DEPLOYMENT-PROCEDURE.md)
- [10-RELEASE-PROCEDURES.md](10-RELEASE-PROCEDURES.md)

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-01-08 | 1.0 | Initial creation | GitVan Team |

## Approval

**Approved By**: Team Lead
**Date**: 2026-01-08
**Next Review**: 2026-04-08 (Quarterly)

---

**Remember**: Always run tests before building. A successful build with failing tests is worthless.
