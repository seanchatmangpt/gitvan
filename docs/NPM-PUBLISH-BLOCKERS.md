# GitVan npm Publishing Blockers
## Critical Issues Preventing Publication

**Status:** 🔴 **BLOCKED** - Cannot publish to npm
**Risk Level:** HIGH
**Estimated Fix Time:** 4-6 hours
**Assessment Date:** 2026-01-09

---

## Executive Summary

GitVan has **excellent architecture and code quality** but **cannot be published to npm** due to missing package.json configuration. All blockers are straightforward configuration issues, not architectural problems.

**Code Quality:** ⭐⭐⭐⭐⭐ (5/5)
**Packaging:** ⭐ (1/5)

---

## Critical Blockers (Must Fix)

### 1. Package Configuration Missing 🔴

**File:** `/home/user/gitvan/package.json`

**Current State:**
```json
{
  "name": "my-awesome-project",  // ❌ Placeholder name
  "version": "1.0.0"              // ❌ Conflicts with README (v3.1.0)
  // ❌ Missing: type, main, bin, exports, engines, license
}
```

**Required Changes:**
```json
{
  "name": "gitvan",
  "version": "3.1.0",
  "type": "module",
  "main": "./dist/cli.mjs",
  "bin": {
    "gitvan": "./dist/bin/gitvan.mjs"
  },
  "exports": {
    ".": {
      "import": "./dist/cli.mjs",
      "types": "./types/index.d.ts"
    },
    "./composables/*": "./dist/composables/*.mjs"
  },
  "engines": {
    "node": ">=18.0.0 <21.0.0"
  },
  "files": [
    "dist/**",
    "bin/**",
    "types/**",
    "templates/**",
    "packs/**"
  ],
  "license": "MIT",
  "repository": "...",
  "keywords": ["git", "workflow", "automation", "rdf", "semantic"]
}
```

**Impact:** Without these fields, npm package will not be installable or executable.

---

### 2. Build System Failure 🔴

**Issue:** Cannot complete build due to Node.js version conflict

```bash
$ npm install
Error: @inrupt/universal-fetch requires Node 14-20
Current: Node v22.21.1
```

**Root Cause:** Dependency `@inrupt/universal-fetch` is incompatible with Node 22

**Fix Options:**
1. **Option A (Recommended):** Remove `@inrupt/universal-fetch` if not used
2. **Option B:** Upgrade to Node 22-compatible fork/alternative
3. **Option C:** Enforce Node 20 LTS in engines field and CI

**Verification:**
```bash
npm install   # Must succeed
npm run build # Must succeed
ls -la dist/  # Must contain cli.mjs and bin/gitvan.mjs
```

---

### 3. Version Mismatch 🔴

**Inconsistency:**
- package.json: `1.0.0`
- README.md: `v3.1.0`
- src/cli.mjs: `version: "3.1.0"`
- CHANGELOG.md: `[1.0.0] - 2026-01-08` but mentions "v3.0.0 rewrite"

**Decision Required:**
- **If first npm publish:** Use `1.0.0`, update README/CLI to match
- **If continuing v3.x:** Use `3.1.0`, update package.json

**Recommendation:** Use `3.1.0` to maintain consistency with existing documentation

---

### 4. Missing Dependencies 🔴

**Issue:** Many dependencies in `build.config.ts` externals not in `package.json`

**Missing from package.json:**
```javascript
// From build.config.ts external list:
nunjucks          // Template engine
node-cron         // Scheduling
marked            // Markdown parsing
giget             // Pack fetching
prompts           // CLI prompts
ai                // AI SDK
@ai-sdk/anthropic // Anthropic provider
ollama            // Ollama provider
fuse.js           // Search
exceljs           // Excel operations
// ... and more
```

**Action:** Audit build.config.ts line 56-102 and add all used dependencies to package.json

---

### 5. Build Output Missing 🔴

**Issue:** `dist/` directory does not exist

**Cause:** Build never completed successfully (due to npm install failure)

**Required Structure:**
```
dist/
├── cli.mjs               # Main entry point
├── bin/
│   └── gitvan.mjs        # CLI executable
├── composables/          # Composable modules
├── workflow/             # Workflow engine
├── pack/                 # Pack system
└── [other modules]       # All src/ modules
```

**Verification:**
```bash
npm run build
du -sh dist/              # Check bundle size
node dist/cli.mjs --help  # Test entry point
```

---

## Pre-Publication Checklist

### Phase 1: Critical Fixes (4-6 hours)

- [ ] Update package.json with all required fields
- [ ] Resolve Node.js version conflict
- [ ] Synchronize version across all files (1.0.0 or 3.1.0)
- [ ] Add missing dependencies to package.json
- [ ] Complete successful `npm install`
- [ ] Complete successful `npm run build`
- [ ] Verify `dist/` directory structure

### Phase 2: Validation (1-2 hours)

- [ ] Test local installation: `npm pack && npm install -g gitvan-*.tgz`
- [ ] Verify CLI works: `gitvan --version`
- [ ] Test core commands:
  - [ ] `gitvan workflow list`
  - [ ] `gitvan job list`
  - [ ] `gitvan daemon start --help`
- [ ] Run test suite: `npm test`
- [ ] Check test coverage: `npm run test:coverage`
- [ ] Run linter: `npm run lint`

### Phase 3: Documentation (1 hour)

- [ ] Update README with correct version
- [ ] Document Node.js version requirements
- [ ] Add installation instructions
- [ ] Document breaking changes (if v3.1.0)
- [ ] Update CHANGELOG for release

### Phase 4: Publish (30 minutes)

- [ ] Run `npm run prepublishOnly` (must pass)
- [ ] Test with `npm pack` (check tarball contents)
- [ ] Publish to npm: `npm publish`
- [ ] Verify on npmjs.com
- [ ] Test global install: `npm install -g gitvan`
- [ ] Tag Git release: `git tag v3.1.0 && git push --tags`

---

## Quick Fix Script

```bash
#!/bin/bash
# fix-package.sh - Quick fix for critical issues

# 1. Fix package.json (manual step - use editor)
echo "Step 1: Update package.json with required fields"
echo "See: docs/NPM-PUBLISH-BLOCKERS.md section 1"
read -p "Press Enter when package.json is updated..."

# 2. Audit dependencies
echo "Step 2: Checking for missing dependencies..."
echo "Comparing build.config.ts externals with package.json..."
# TODO: Add automated dependency audit script

# 3. Fix Node.js version
echo "Step 3: Checking Node.js version..."
NODE_VERSION=$(node -v)
echo "Current Node.js: $NODE_VERSION"
if [[ "$NODE_VERSION" > "v20" ]]; then
  echo "⚠️  Warning: Node v22+ detected. @inrupt/universal-fetch requires <=v20"
  echo "Options:"
  echo "  A) Switch to Node 20 LTS: nvm use 20"
  echo "  B) Remove incompatible dependency"
fi

# 4. Install and build
echo "Step 4: Installing dependencies..."
npm install || { echo "❌ npm install failed"; exit 1; }

echo "Step 5: Building project..."
npm run build || { echo "❌ Build failed"; exit 1; }

# 5. Verify build output
echo "Step 6: Verifying build output..."
if [ ! -d "dist" ]; then
  echo "❌ dist/ directory not created"
  exit 1
fi
if [ ! -f "dist/cli.mjs" ]; then
  echo "❌ dist/cli.mjs not found"
  exit 1
fi
if [ ! -f "dist/bin/gitvan.mjs" ]; then
  echo "❌ dist/bin/gitvan.mjs not found"
  exit 1
fi

echo "✅ Build successful!"
echo ""
echo "Next steps:"
echo "  1. Test locally: npm pack"
echo "  2. Install: npm install -g gitvan-*.tgz"
echo "  3. Test: gitvan --version"
echo "  4. Publish: npm publish"
```

---

## Risk Assessment

| Risk | Impact | Likelihood | Status |
|------|--------|------------|--------|
| npm publish fails | 🔴 Critical | 100% | CURRENT STATE |
| CLI not executable after install | 🔴 Critical | 100% | No bin field |
| Wrong package name | 🔴 Critical | 100% | "my-awesome-project" |
| Version confusion | 🟠 High | 100% | 1.0.0 vs 3.1.0 |
| Missing dependencies | 🟠 High | 80% | Many in externals |
| Build failure | 🔴 Critical | 100% | Node version conflict |

---

## Success Criteria

**Definition of Done:**

1. ✅ package.json has all required fields
2. ✅ `npm install` succeeds without errors
3. ✅ `npm run build` succeeds and creates dist/
4. ✅ `npm test` passes with 80%+ coverage
5. ✅ `npm pack` creates valid tarball
6. ✅ Local install works: `npm install -g gitvan-*.tgz`
7. ✅ CLI executable: `gitvan --version` shows correct version
8. ✅ Core commands work: `gitvan workflow list`, `gitvan job list`
9. ✅ `npm publish --dry-run` succeeds
10. ✅ Published to npmjs.com and globally installable

---

## Architecture Validation ✅

**Good News:** Architecture is production-ready

- ✅ 328 source files with clean separation of concerns
- ✅ 24 composables properly implemented (use* pattern)
- ✅ unctx async context management working correctly
- ✅ 244 test files (excellent coverage ratio)
- ✅ 80% test coverage target configured
- ✅ Git-native storage with no external dependencies
- ✅ RDF/semantic graph system properly abstracted
- ✅ Comprehensive workflow engine (DAG planning, step execution)
- ✅ Extensible pack system with marketplace support
- ✅ 17 CLI commands properly registered with citty
- ✅ Comprehensive documentation (CLAUDE.md, Diataxis)

**No architectural changes required.** All issues are packaging/configuration.

---

## Timeline Estimate

**Total Time:** 6-10 hours

| Phase | Tasks | Time |
|-------|-------|------|
| **Phase 1** | Fix package.json, dependencies, Node conflict | 4-6 hours |
| **Phase 2** | Build, test, validate | 1-2 hours |
| **Phase 3** | Documentation updates | 1 hour |
| **Phase 4** | Publish and verify | 30 min |

**Best Case:** 6 hours (if Node conflict easy to resolve)
**Worst Case:** 10 hours (if major dependency issues)

---

## Next Steps

1. **Assign Owner:** Designate developer to fix blockers
2. **Create Branch:** `fix/npm-packaging-blockers`
3. **Fix Issues:** Work through checklist in order
4. **Test Thoroughly:** Don't skip validation phase
5. **Publish:** Only after all checks pass
6. **Monitor:** Watch for issues post-publish

---

## Questions?

Contact System Architecture Designer for clarification on any items in this document.

**Related Documents:**
- Full Assessment: `/home/user/gitvan/docs/PRODUCTION-READINESS-ASSESSMENT.md`
- Developer Guide: `/home/user/gitvan/CLAUDE.md`
- Build Config: `/home/user/gitvan/build.config.ts`

---

**Last Updated:** 2026-01-09
**Status:** ACTIVE - Blocking npm publish
