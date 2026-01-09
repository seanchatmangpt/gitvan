# unrdf Git Submodule Integration

## Overview

This document describes the integration of the `unrdf` library as a git submodule instead of an npm dependency. This change allows GitVan to:

1. **Version Control**: Track specific commits of unrdf
2. **Local Development**: Make local modifications when needed
3. **Reproducible Builds**: Ensure consistent builds across environments
4. **Reduced npm Dependency**: Less reliance on npm registry

## Changes Made

### 1. Build Configuration (`build.config.ts`)

**Key Changes:**
- Added pre-build verification to check if `vendor/unrdf` exists
- Added build artifact verification for `vendor/unrdf/dist`
- Configured Rollup alias to resolve `import ... from "unrdf"` to `vendor/unrdf/dist/index.mjs`
- Added helpful error messages with instructions

**How it works:**
```typescript
// Alias configuration maps 'unrdf' imports to vendor submodule
alias: {
  unrdf: resolve(vendorUnrdfPath, "dist/index.mjs"),
}
```

When the build runs:
1. Checks if `vendor/unrdf` directory exists (exits with error if not)
2. Checks if `vendor/unrdf/dist` exists (warns if not)
3. Resolves all `import ... from "unrdf"` to the local submodule

### 2. TypeScript Configuration (`tsconfig.json`)

**Key Changes:**
- Added `baseUrl: "."` to enable path mappings
- Added path mappings for `unrdf` and `unrdf/*`

**Path Mappings:**
```json
{
  "paths": {
    "unrdf": ["./vendor/unrdf/dist/index.mjs"],
    "unrdf/*": ["./vendor/unrdf/dist/*"]
  }
}
```

This ensures TypeScript can resolve unrdf imports during:
- Development
- Type checking
- IDE intellisense

### 3. Git Configuration (`.gitmodules`)

**Created new file** defining the unrdf submodule:

```gitconfig
[submodule "vendor/unrdf"]
	path = vendor/unrdf
	url = https://github.com/unrdf/unrdf.git
	branch = main
	shallow = true
```

The `shallow = true` option reduces clone size by fetching only recent history.

### 4. Package.json Scripts

**Added/Modified:**
- `prebuild`: Verifies `vendor/unrdf` exists before building
- `setup-dev`: Initializes submodules and builds dependencies
- `verify-deps`: Runs comprehensive submodule verification
- `update:submodule`: Updates unrdf to latest version

**Existing:**
- `postinstall`: Already configured to initialize git submodules

### 5. Helper Scripts

Created several helper scripts in `/scripts` directory:

#### `scripts/init-submodules.sh`
Initializes all git submodules and builds vendor dependencies.

**Usage:**
```bash
bash scripts/init-submodules.sh
# or via npm
npm run setup-dev
```

#### `scripts/verify-submodule.mjs`
Comprehensive verification script that checks:
1. `vendor/unrdf` directory exists
2. Submodule is initialized (has `.git`)
3. Build artifacts exist (`dist` directory)

**Usage:**
```bash
node scripts/verify-submodule.mjs
# or via npm
npm run verify-deps
```

#### `scripts/update-unrdf.sh`
Updates unrdf submodule to the latest version from main branch.

**Usage:**
```bash
bash scripts/update-unrdf.sh
# or via npm
npm run update:submodule
```

#### `scripts/setup-unrdf.sh`
Interactive setup script for unrdf submodule with rebuild option.

**Usage:**
```bash
bash scripts/setup-unrdf.sh
```

### 6. .gitignore

**Added entries** to ignore build artifacts while tracking the submodule:

```gitignore
# Vendor submodules - ignore build artifacts but not the submodule itself
vendor/unrdf/node_modules/
vendor/unrdf/dist/
vendor/unrdf/*.log
vendor/unrdf/coverage/
vendor/unrdf/.turbo/
```

**Note:** The `vendor/unrdf` directory itself is tracked as a git submodule.

### 7. Documentation

Created comprehensive documentation:

#### `vendor/README.md`
Explains the vendor directory structure, how to set up and build unrdf, troubleshooting, and update procedures.

## How unrdf is Now Resolved

### Import Resolution Flow

1. **Source Code** contains: `import { query } from "unrdf"`
2. **Build Time** (unbuild/rollup):
   - Alias configuration maps `"unrdf"` → `vendor/unrdf/dist/index.mjs`
   - Rollup resolves the import to the local file
   - Code is bundled with the local unrdf version
3. **TypeScript** (development):
   - Path mapping resolves `"unrdf"` → `./vendor/unrdf/dist/index.mjs`
   - IDE and type checker can find type definitions
4. **Runtime**:
   - Built code references the bundled unrdf from vendor submodule

### Verification Points

The build process includes multiple verification points:

```
npm install
  ↓
postinstall hook runs
  ↓
git submodule update --init --recursive
  ↓
npm run build
  ↓
prebuild hook runs (package.json)
  ↓
build.config.ts pre-build verification runs
  ↓
Checks vendor/unrdf exists
  ↓
Checks vendor/unrdf/dist exists
  ↓
unbuild runs with alias configuration
  ↓
Build succeeds
```

## Developer Workflow

### Initial Setup

For new developers cloning the repository:

```bash
# Clone repository
git clone <repo-url>
cd gitvan

# Install dependencies (automatically initializes submodules)
npm install

# Build vendor dependencies
cd vendor/unrdf
npm install
npm run build
cd ../..

# Build GitVan
npm run build
```

**OR use the setup script:**

```bash
npm run setup-dev
```

### Daily Development

```bash
# Verify dependencies are set up correctly
npm run verify-deps

# Run tests
npm test

# Build project
npm run build
```

### Updating unrdf

```bash
# Update to latest version
npm run update:submodule

# Or manually:
cd vendor/unrdf
git pull origin main
npm install && npm run build
cd ../..

# Commit the update
git add vendor/unrdf
git commit -m "chore: update unrdf submodule"
```

## Build Paths Updated

### Before (npm package)

```javascript
import { query } from "unrdf";  // Resolved to node_modules/unrdf/dist/...
```

### After (git submodule)

```javascript
import { query } from "unrdf";  // Resolved to vendor/unrdf/dist/index.mjs
```

The import statement **stays the same** in source code. The resolution changes:

- **TypeScript**: Uses `tsconfig.json` paths
- **Build**: Uses `build.config.ts` alias
- **Runtime**: Uses bundled code from build

## Pre-build Verification

The build process now includes two levels of verification:

### Level 1: package.json prebuild script

```javascript
// Runs before 'npm run build'
const vendorPath = path.join(process.cwd(), 'vendor/unrdf');
if (!fs.existsSync(vendorPath)) {
  console.error('ERROR: vendor/unrdf submodule not found!');
  process.exit(1);
}
```

### Level 2: build.config.ts pre-build checks

```typescript
// Runs when build.config.ts is loaded
if (!existsSync(vendorUnrdfPath)) {
  console.error("ERROR: vendor/unrdf submodule not found!");
  process.exit(1);
}

if (!existsSync(unrdfDistPath)) {
  console.error("WARNING: vendor/unrdf/dist not found!");
  console.error("The unrdf submodule may need to be built.");
}
```

## Troubleshooting

### Error: "vendor/unrdf submodule not found!"

**Cause:** Git submodule hasn't been initialized.

**Solution:**
```bash
git submodule update --init --recursive
```

### Warning: "vendor/unrdf/dist not found!"

**Cause:** unrdf hasn't been built yet.

**Solution:**
```bash
cd vendor/unrdf
npm install
npm run build
cd ../..
```

### Build fails with module resolution errors

**Cause:** TypeScript or build tool can't find unrdf.

**Solution:**
1. Verify submodule is initialized: `ls vendor/unrdf`
2. Verify build artifacts exist: `ls vendor/unrdf/dist`
3. Run verification: `npm run verify-deps`
4. Clean and rebuild: `rm -rf dist && npm run build`

### Submodule shows as modified in git status

**Cause:** Normal - build artifacts are generated locally.

**Note:** The `.gitignore` entries prevent committing build artifacts. The submodule reference (commit SHA) is what's tracked.

## Migration from npm Package

If migrating from an existing setup with unrdf as an npm package:

1. **Remove from package.json** (if present):
   ```bash
   npm uninstall unrdf
   ```

2. **Initialize submodule**:
   ```bash
   git submodule update --init --recursive
   ```

3. **Build unrdf**:
   ```bash
   cd vendor/unrdf
   npm install && npm run build
   cd ../..
   ```

4. **Update imports** (if needed):
   - Most imports should work as-is
   - Deep imports like `unrdf/utils` should be changed to match the build output structure

5. **Test the build**:
   ```bash
   npm run build
   npm test
   ```

## Benefits

1. **Version Pinning**: Exact commit of unrdf is tracked in git
2. **Offline Development**: No need to fetch from npm registry
3. **Local Modifications**: Can modify unrdf locally if needed
4. **Reproducible Builds**: Same unrdf version across all environments
5. **Transparent Updates**: Git history shows when unrdf was updated
6. **No npm Dependency**: Reduces dependency on external package registry

## Maintenance

### Regular Updates

Periodically update unrdf:

```bash
# Check current version
git -C vendor/unrdf log -1 --oneline

# Update to latest
npm run update:submodule

# Test
npm test

# Commit
git add vendor/unrdf
git commit -m "chore: update unrdf to [version/commit]"
```

### Checking Submodule Status

```bash
# View submodule status
git submodule status

# View current commit
git -C vendor/unrdf log -1

# Check for upstream changes
cd vendor/unrdf
git fetch origin
git log HEAD..origin/main --oneline
cd ../..
```

## Summary

The unrdf git submodule integration provides a robust, version-controlled approach to managing this critical dependency. The build system includes comprehensive verification, helpful error messages, and automated setup scripts to ensure smooth developer experience.

All imports remain the same in source code - the resolution mechanism handles directing them to the local submodule transparently.
