# unrdf Submodule Integration - Changes Summary

## Files Modified

### 1. `/home/user/gitvan/build.config.ts`
**Changes:**
- Added imports: `existsSync` from `node:fs`, `resolve` from `node:path`
- Added pre-build verification code (lines 5-20):
  - Verifies `vendor/unrdf` exists, exits with error if not
  - Verifies `vendor/unrdf/dist` exists, shows warning if not
- Added `rollup.alias` configuration (lines 43-48):
  - Maps `"unrdf"` imports to `vendor/unrdf/dist/index.mjs`
- All verification happens at module load time (before build starts)

**How unrdf is resolved:**
```typescript
alias: {
  unrdf: resolve(vendorUnrdfPath, "dist/index.mjs"),
}
```

### 2. `/home/user/gitvan/tsconfig.json`
**Changes:**
- Added `"baseUrl": "."` (line 19)
- Added `"paths"` configuration (lines 20-23):
  ```json
  "paths": {
    "unrdf": ["./vendor/unrdf/dist/index.mjs"],
    "unrdf/*": ["./vendor/unrdf/dist/*"]
  }
  ```

**Purpose:** 
Enables TypeScript and IDEs to resolve `import ... from "unrdf"` to the vendor submodule during development and type checking.

### 3. `/home/user/gitvan/package.json`
**Changes:**
- Modified `prebuild` script (line 17): Added inline verification that `vendor/unrdf` exists
- Added `setup-dev` script (line 21): Runs `npm install` and initializes submodules
- Added `verify-deps` script (line 22): Runs verification script
- Added `update:submodule` script (line 23): Updates unrdf to latest version

**Note:** `postinstall` script was already configured to initialize submodules.

### 4. `/home/user/gitvan/.gitignore`
**Changes:**
- Added section "Vendor submodules" (lines 42-48):
  ```gitignore
  vendor/unrdf/node_modules/
  vendor/unrdf/dist/
  vendor/unrdf/*.log
  vendor/unrdf/coverage/
  vendor/unrdf/.turbo/
  ```

**Purpose:**
Ignore build artifacts within the submodule, but track the submodule itself.

## Files Created

### 5. `/home/user/gitvan/.gitmodules`
**New file** - Git submodule configuration:
```gitconfig
[submodule "vendor/unrdf"]
	path = vendor/unrdf
	url = https://github.com/unrdf/unrdf.git
	branch = main
	shallow = true
```

**Purpose:**
Defines the unrdf submodule location and configuration.

### 6. `/home/user/gitvan/vendor/README.md`
**New file** - Comprehensive vendor directory documentation including:
- Overview of submodule approach
- Setup instructions
- Building unrdf
- Updating procedures
- Build integration explanation
- TypeScript configuration
- Troubleshooting guide

### 7. `/home/user/gitvan/scripts/init-submodules.sh`
**New file** - Bash script to initialize and build all submodules:
- Runs `git submodule update --init --recursive`
- Builds `vendor/unrdf` by running `npm install && npm run build`
- Provides status messages

**Usage:** `bash scripts/init-submodules.sh` or `npm run setup-dev`

### 8. `/home/user/gitvan/scripts/verify-submodule.mjs`
**New file** - Node.js script to verify submodule setup:
- Checks if `vendor/unrdf` directory exists
- Checks if submodule is initialized (has `.git`)
- Checks if build artifacts exist (`dist` directory)
- Provides helpful error messages and instructions
- Exits with code 1 if verification fails

**Usage:** `node scripts/verify-submodule.mjs` or `npm run verify-deps`

### 9. `/home/user/gitvan/scripts/update-unrdf.sh`
**New file** - Bash script to update unrdf to latest:
- Fetches latest changes from remote
- Checks out main branch
- Pulls latest changes
- Runs `npm install && npm run build`
- Shows new commit hash
- Provides instructions for committing the update

**Usage:** `bash scripts/update-unrdf.sh` or `npm run update:submodule`

### 10. `/home/user/gitvan/scripts/setup-unrdf.sh`
**New file** - Interactive setup script:
- Initializes submodule if needed
- Installs dependencies if needed
- Builds if needed, or prompts to rebuild if artifacts exist
- Provides status messages at each step

**Usage:** `bash scripts/setup-unrdf.sh`

### 11. `/home/user/gitvan/UNRDF_SUBMODULE_INTEGRATION.md`
**New file** - Comprehensive integration documentation:
- Overview of changes
- Detailed explanation of each modified file
- Import resolution flow
- Developer workflow instructions
- Troubleshooting guide
- Maintenance procedures
- Migration guide from npm package

## How unrdf Resolution Works Now

### Source Code
```javascript
import { query } from "unrdf";  // No change - same import statement
```

### Build Time (unbuild/rollup)
1. `build.config.ts` loads
2. Pre-build verification runs:
   - Checks `vendor/unrdf` exists → Error if not
   - Checks `vendor/unrdf/dist` exists → Warning if not
3. Rollup alias configuration maps:
   - `"unrdf"` → `resolve(vendorUnrdfPath, "dist/index.mjs")`
4. All imports resolve to local submodule

### Development Time (TypeScript/IDE)
1. TypeScript reads `tsconfig.json`
2. Path mappings direct:
   - `"unrdf"` → `"./vendor/unrdf/dist/index.mjs"`
   - `"unrdf/*"` → `"./vendor/unrdf/dist/*"`
3. IDE can find types and provide intellisense

### Runtime
- Built code includes bundled version from `vendor/unrdf/dist`
- No external dependency on npm package

## Pre-build Verification Flow

```
Developer runs: npm run build
  ↓
package.json prebuild script runs
  ↓
Checks vendor/unrdf exists
  ↓ (if fails)
Exit with error message
  ↓ (if succeeds)
unbuild runs
  ↓
build.config.ts loads
  ↓
Pre-build verification code runs
  ↓
Checks vendor/unrdf exists → Exit if not
Checks vendor/unrdf/dist exists → Warn if not
  ↓
Rollup alias configured
  ↓
Build proceeds with submodule reference
```

## Build Paths Updated

### Before Integration
```
import { query } from "unrdf"
  ↓
Resolves to: node_modules/unrdf/dist/...
  ↓
Bundled from: npm package
```

### After Integration
```
import { query } from "unrdf"
  ↓
TypeScript resolves to: ./vendor/unrdf/dist/index.mjs (via tsconfig paths)
Build resolves to: vendor/unrdf/dist/index.mjs (via rollup alias)
  ↓
Bundled from: git submodule
```

## Developer Commands

### Setup (first time)
```bash
# Automatic (recommended)
npm install  # Initializes submodules via postinstall
npm run setup-dev  # Builds everything

# Manual
git submodule update --init --recursive
cd vendor/unrdf && npm install && npm run build && cd ../..
npm run build
```

### Verify Setup
```bash
npm run verify-deps
```

### Build Project
```bash
npm run build
# Pre-build verification runs automatically
```

### Update unrdf
```bash
npm run update:submodule
```

## Key Benefits

1. **Version Control**: Git tracks exact commit of unrdf
2. **Reproducible**: Same unrdf version across all environments
3. **Offline**: No npm registry dependency after initial clone
4. **Transparent**: Source code imports unchanged
5. **Verified**: Multiple verification points prevent build issues
6. **Documented**: Comprehensive guides for developers

## Files Summary

### Modified (4 files)
1. `build.config.ts` - Build alias and verification
2. `tsconfig.json` - TypeScript path mappings
3. `package.json` - Scripts for setup/verify/update
4. `.gitignore` - Ignore vendor build artifacts

### Created (7 files)
1. `.gitmodules` - Submodule configuration
2. `vendor/README.md` - Vendor documentation
3. `scripts/init-submodules.sh` - Initialize and build
4. `scripts/verify-submodule.mjs` - Verification script
5. `scripts/update-unrdf.sh` - Update script
6. `scripts/setup-unrdf.sh` - Interactive setup
7. `UNRDF_SUBMODULE_INTEGRATION.md` - Full documentation

## Next Steps for Developers

1. **Initialize the submodule:**
   ```bash
   git submodule update --init --recursive
   ```

2. **Build unrdf:**
   ```bash
   cd vendor/unrdf
   npm install
   npm run build
   cd ../..
   ```

3. **Verify setup:**
   ```bash
   npm run verify-deps
   ```

4. **Build GitVan:**
   ```bash
   npm run build
   ```

Or simply run: `npm run setup-dev`
