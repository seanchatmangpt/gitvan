# Build System & Submodule Guide

**Version:** 3.0.0
**Purpose:** Complete guide to building GitVan and managing the UnRDF submodule

---

## Quick Start

### The Easiest Way

```bash
# Clone the repository
git clone https://github.com/seanchatmangpt/gitvan.git
cd gitvan

# Single command - does everything
npm run setup-dev
```

Done! This runs:
1. `git submodule update --init --recursive`
2. `npm install` (GitVan deps)
3. `cd vendor/unrdf && npm install && npm run build`
4. `npm run build` (GitVan)

---

## Why UnRDF Needs Special Handling

GitVan uses UnRDF as a **git submodule** (not just an npm dependency) because:

1. **Active Co-Development** - UnRDF is developed in parallel with GitVan
2. **Source-Level Integration** - Can debug across repository boundaries
3. **Build Dependency** - UnRDF must be built before GitVan
4. **Alias Resolution** - `build.config.ts` maps `import from 'unrdf'` to `vendor/unrdf/dist/`

**Critical:** If UnRDF is not built, GitVan's build fails with alias resolution errors.

---

## Complete Build Sequence

### Step 1: Initialize Git Submodule

```bash
git submodule update --init --recursive
```

**What happens:**
- Reads `.gitmodules` configuration
- Clones `https://github.com/seanchatmangpt/unrdf.git` to `vendor/unrdf/`
- Shallow clone (reduces size)
- Checks out configured branch (main)

**Verify:**
```bash
ls -la vendor/unrdf/
# Should show: .git, src/, package.json, dist/ (after build)
```

### Step 2: Install GitVan Dependencies

```bash
npm install
```

**What happens:**
- Installs dependencies listed in `package.json`
- Creates `node_modules/`
- Key dependencies:
  - `unbuild` - Build tool
  - `vitest` - Test framework
  - `citty` - CLI framework
  - `unctx` - Context preservation
  - `isomorphic-git` - Git operations
  - `@unrdf/kgn` - UnRDF npm package (different from submodule!)

**Note:** `@unrdf/kgn` on npm is complementary to the submodule

### Step 3: Install UnRDF Dependencies

```bash
cd vendor/unrdf
npm install
cd ../..
```

**What happens:**
- Installs UnRDF's dependencies
- Creates `vendor/unrdf/node_modules/`
- Key UnRDF dependencies:
  - `n3` - RDF parsing/writing
  - `query-al gebra` - SPARQL algebra
  - `lru-cache` - Caching

### Step 4: Build UnRDF (CRITICAL)

```bash
npm run build:unrdf
```

**Equivalent to:**
```bash
cd vendor/unrdf
npm run build
cd ../..
```

**What happens:**
- Runs unbuild on UnRDF source
- **Creates `vendor/unrdf/dist/index.mjs`** (essential!)
- Outputs compiled, bundled UnRDF
- Takes ~30 seconds

**Verify:**
```bash
ls vendor/unrdf/dist/
# Must have: index.mjs, plus type definitions
```

**If missing:** GitVan build fails with "Cannot find module 'unrdf'"

### Step 5: Prebuild Verification (Automatic)

```bash
npm run prebuild  # Runs automatically before npm run build
```

**What it does:**
- Checks `vendor/unrdf/` exists
- Checks `vendor/unrdf/dist/` exists
- Exits with error if either missing

**Code:**
```javascript
"prebuild": "node -e \"
  const fs=require('fs');
  const path=require('path');
  const vendorPath=path.join(process.cwd(),'vendor/unrdf');
  if(!fs.existsSync(vendorPath)){
    console.error('\\n❌ ERROR: vendor/unrdf submodule not found!');
    console.error('Run: git submodule update --init --recursive\\n');
    process.exit(1)
  }
\""
```

### Step 6: Build GitVan

```bash
npm run build
```

**What happens:**
- Runs unbuild using `build.config.ts`
- Builds `/src/cli.mjs` and `/bin/gitvan.mjs`
- **Key:** Alias resolves `'unrdf'` → `vendor/unrdf/dist/index.mjs`
- Outputs to `dist/`
- Tree-shaking enabled
- Minification in production

**Build configuration** (`build.config.ts`):
```typescript
{
  entries: [
    "./src/cli.mjs",
    "./bin/gitvan.mjs"
  ],
  outDir: "dist",
  clean: true,

  rollup: {
    alias: {
      "unrdf": resolve(vendorUnrdfPath, "dist/index.mjs")
      // Critical: Maps 'unrdf' imports to built UnRDF
    }
  },

  // All dependencies marked external (not bundled)
  external: [
    "citty", "consola", "unctx", "isomorphic-git",
    // ... 50+ more external deps
  ]
}
```

**Verify:**
```bash
ls dist/
# Should have: cli.mjs, bin/gitvan.mjs, plus chunks
```

---

## Common Build Scenarios

### Fresh Install

```bash
git clone https://github.com/seanchatmangpt/gitvan.git
cd gitvan
npm run setup-dev     # Everything at once
npm test              # Verify it works
```

### After Cloning Existing Repository

```bash
# Submodules might not be initialized
npm run setup-dev     # Safe to run multiple times
```

### Updating Code

```bash
# If you pulled changes from GitHub:
npm run build         # Rebuild if src/ changed
npm test              # Verify tests pass
```

### After Updating UnRDF

```bash
cd vendor/unrdf
git pull origin main
npm install           # If deps changed
npm run build
cd ../..
npm run build         # Rebuild GitVan with new UnRDF
npm test              # Verify integration
```

### Rebuilding From Scratch

```bash
# Clean build
rm -rf node_modules vendor/unrdf/node_modules dist/
npm run setup-dev
npm test
```

---

## Submodule Management

### Checking Submodule Status

```bash
git submodule status
```

**Output:**
```
 1a2b3c4d5e6f7g8h9i10j11k12l13m14n15o16p vendor/unrdf (tag-or-branch)
 ^                                         ^
 submodule is clean                        current commit
```

**Possible status indicators:**
- ` ` (space) - Submodule is at correct commit
- `-` (minus) - Submodule not initialized
- `+` (plus) - Submodule has uncommitted changes
- `U` (U) - Submodule merge conflict

### Git CLI Commands

```bash
# Update submodule to latest
git submodule update --remote

# Update all submodules
git submodule update --remote --recursive

# Sync URLs from .gitmodules
git submodule sync

# Foreach submodule
git submodule foreach git pull origin main

# Clone with submodules
git clone --recursive <repo-url>
```

### GitVan CLI Commands

```bash
# Check submodule health
gitvan submodule status

# Check for remote updates
gitvan submodule check

# Update to latest remote
gitvan submodule update

# Verify exports and compatibility
gitvan submodule verify

# Initialize submodule
gitvan submodule init

# Sync to expected commit
gitvan submodule sync
```

### Configuration: `.gitmodules`

```ini
[submodule "vendor/unrdf"]
	path = vendor/unrdf
	url = https://github.com/seanchatmangpt/unrdf.git
	branch = main
	shallow = true
```

**Parameters:**
- `path` - Where submodule is cloned
- `url` - GitHub repository URL
- `branch` - Which branch to track (main)
- `shallow` - Reduces clone size (faster)

### Making Changes to UnRDF

```bash
# Navigate to submodule
cd vendor/unrdf

# Create feature branch
git checkout -b feature/my-enhancement

# Make changes
# Edit files in vendor/unrdf/src/

# Commit changes
git add src/
git commit -m "feat: my enhancement"

# Push to GitHub
git push origin feature/my-enhancement

# Return to parent
cd ../..

# Parent repository now shows submodule as modified
git status
# On branch main
# Your branch is ahead of 'origin/main' by 2 commits
# Changes not staged for commit:
#   modified:   vendor/unrdf (new commits)

# Commit the submodule reference update
git add vendor/unrdf
git commit -m "chore: update unrdf submodule"
git push origin main
```

### Pinning to Specific Commit

```bash
cd vendor/unrdf

# Checkout specific commit
git checkout abc1234def5678

cd ../..

# Commit the pin
git add vendor/unrdf
git commit -m "chore: pin unrdf to abc1234"
```

### Absorbing Submodule into Parent

If you want to convert submodule to regular folder:

```bash
# Remove submodule reference
git submodule deinit -f vendor/unrdf

# Convert to regular git history
git rm -f vendor/unrdf
git reset vendor/unrdf

# Copy files and commit
cp -r vendor/unrdf/* vendor/unrdf.local/
git add vendor/unrdf.local/
git commit -m "chore: absorb unrdf into parent repo"
```

---

## NPM Scripts Reference

### Development

```bash
npm run setup-dev           # Initial setup (do this first!)
npm install                 # Install dependencies
npm run build:unrdf         # Build UnRDF only
npm run build               # Build GitVan
npm run dev                 # Watch mode with tests
npm test                    # Run test suite
npm test -- --coverage      # Run with coverage report
npm run lint                # Run ESLint
npm run lint --fix          # Auto-fix lint issues
```

### Submodule Management

```bash
npm run verify-deps         # Verify submodule integrity
npm run update:submodule    # Update UnRDF to latest
```

### CI/CD

These are used in GitHub Actions:

```bash
git submodule update --init --recursive  # Initialize
npm ci                                    # Clean install
npm run build:unrdf                       # Build UnRDF
npm run build                             # Build GitVan
npm test                                  # Run tests
```

---

## Troubleshooting

### Issue: Submodule Directory Empty

**Error:**
```
vendor/unrdf/ exists but is empty
fatal: not a git repository
```

**Solution:**
```bash
git submodule update --init --recursive
```

### Issue: Cannot Build - "Cannot find module 'unrdf'"

**Error:**
```
Module not found: Error: Can't resolve 'unrdf'
```

**Cause:** `vendor/unrdf/dist/index.mjs` not built

**Solution:**
```bash
npm run build:unrdf
npm run build
```

### Issue: Permission Denied Cloning Submodule

**Error:**
```
fatal: could not read Username for 'https://github.com': No such file or directory
```

**Solution 1** - Use HTTPS with Git Credentials:
```bash
git config --global credential.helper store
# Enter credentials when prompted
npm run setup-dev
```

**Solution 2** - Use SSH:
```bash
# Add SSH key to GitHub
git config --global url."git@github.com:".insteadOf "https://github.com/"
npm run setup-dev
```

### Issue: Submodule Detached HEAD

**Status:**
```
abc1234 vendor/unrdf (detached HEAD)
```

**Explanation:** This is normal! Parent repo pins submodule to specific commit.

**To update:**
```bash
cd vendor/unrdf
git checkout main
git pull origin main
cd ../..
git add vendor/unrdf
git commit -m "chore: update unrdf"
```

### Issue: Merge Conflict in Submodule

**During merge:**
```
conflict (submodule): merge conflict in vendor/unrdf
```

**Resolve - accept incoming:**
```bash
git checkout --theirs vendor/unrdf
git add vendor/unrdf
git commit -m "chore: resolve submodule conflict"
```

**Resolve - accept current:**
```bash
git checkout --ours vendor/unrdf
git add vendor/unrdf
git commit -m "chore: resolve submodule conflict"
```

**Resolve - manually:**
```bash
cd vendor/unrdf
git merge origin/main
# Resolve conflicts
git add .
git commit
cd ../..
git add vendor/unrdf
git commit -m "chore: merge submodule"
```

### Issue: CI Fails but Local Build Works

**Cause:** Submodules not initialized in CI

**Solution:** Ensure GitHub Actions uses `submodules: recursive`

```yaml
- uses: actions/checkout@v4
  with:
    submodules: recursive  # IMPORTANT!
```

### Issue: Build System Changes

If you modify `build.config.ts` or `unbuild` configuration:

```bash
# Clean rebuild
rm -rf dist
npm run build

# Or full clean
rm -rf node_modules dist vendor/unrdf/dist
npm run setup-dev
```

---

## Performance Tips

### Fast Development

```bash
# Skip full rebuild, just watch tests
npm test -- --watch

# Quick build check only
npm run build

# Incremental builds (after first setup)
npm test -- --watch   # Fastest iteration
```

### Faster Clone

UnRDF uses shallow clone by default:

```bash
git clone --depth 1 https://github.com/seanchatmangpt/unrdf.git vendor/unrdf
```

### Faster CI

```yaml
# In GitHub Actions
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'          # Cache node_modules
```

---

## Environment Variables

Set in shell or `.env`:

```bash
# Build behavior
TZ=UTC                    # Timezone (required for tests)
LANG=C                    # Locale (required for tests)
NODE_ENV=production       # For minified build

# Git submodule
GIT_SSH_COMMAND="ssh -i ~/.ssh/id_rsa"  # For SSH clones
```

---

## File Structure

### Build Outputs

```
dist/
├── cli.mjs                # Main CLI (entry point)
├── cli-[hash].mjs         # Code chunks
├── bin/
│   └── gitvan.mjs        # Binary entry point
├── templates/            # Copied from ./templates
├── packs/                # Copied from ./packs
└── types/                # TypeScript definitions
```

### Submodule Structure

```
vendor/unrdf/
├── .git                  # Git repository pointer
├── src/
│   ├── index.mjs         # Source entry point
│   ├── [modules...]
│   └── ...
├── dist/                 # Build output (CRITICAL for GitVan)
│   ├── index.mjs        # Compiled UnRDF
│   └── ...
├── node_modules/        # UnRDF dependencies
├── package.json
├── vitest.config.mjs    # UnRDF tests
└── build.config.ts      # UnRDF build config
```

---

## Best Practices

### ✅ DO

- **Always run `npm run setup-dev` first** - Sets everything up
- **Test after submodule updates** - Ensure integration works
- **Commit submodule changes separately** - Makes history clear
- **Use shallow clones** - Faster, smaller
- **Pin to specific commits** - Stability and reproducibility
- **Document submodule changes** - In commit messages

### ❌ DON'T

- **Edit directly in `vendor/unrdf/`** - Changes are local, not tracked
- **Force-push submodule updates** - Breaks other developers' repos
- **Ignore submodule initialization errors** - Fix immediately
- **Mix git commands with npm scripts** - Use npm scripts for consistency
- **Assume submodule is always up-to-date** - Check status regularly

---

## Advanced: CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Test

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive          # IMPORTANT!

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm run setup-dev           # Full setup

      - run: npm run lint                # Lint

      - run: npm run build:unrdf         # Build UnRDF

      - run: npm run build               # Build GitVan

      - run: npm test                    # Tests
```

### GitLab CI Example

```yaml
stages:
  - build
  - test

build:
  stage: build
  script:
    - git submodule update --init --recursive
    - npm run setup-dev
    - npm run build:unrdf
    - npm run build
  artifacts:
    paths:
      - dist/

test:
  stage: test
  needs: ["build"]
  script:
    - npm test
```

---

## Debugging

### Debug Submodule Issues

```bash
# Verbose submodule status
git config -l | grep submodule

# Check submodule configuration
cat .gitmodules

# Verify submodule is properly initialized
git submodule status --recursive

# Check what was cloned
ls -la vendor/unrdf/.git
```

### Debug Build Issues

```bash
# Verbose build output
npm run build 2>&1 | head -50

# Check alias resolution
node -e "console.log(require('path').resolve('vendor/unrdf/dist/index.mjs'))"

# Verify UnRDF build
ls vendor/unrdf/dist/index.mjs

# Check unbuild config
cat build.config.ts
```

---

## Resources

### Official Documentation
- **[Unbuild](https://github.com/unjs/unbuild)** - Build tool
- **[Git Submodules](https://git-scm.com/book/en/v2/Git-Tools-Submodules)** - Official guide
- **[Node.js Resolution](https://nodejs.org/api/esm.html#resolution-algorithm)** - ES module resolution

### GitVan References
- **[UnRDF Architecture](./UNRDF-ARCHITECTURE.md)** - Architecture details
- **[CLAUDE.md](../CLAUDE.md)** - Developer guide
- **[package.json](../package.json)** - All npm scripts

---

**Last Updated:** January 9, 2026
**For:** GitVan v3.0.0
**Maintained by:** Development Team
