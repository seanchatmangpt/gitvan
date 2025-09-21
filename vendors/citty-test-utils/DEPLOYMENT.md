# NPM Deployment Guide for citty-test-utils

## Pre-deployment Checklist

✅ **Package Configuration**
- [x] `package.json` with proper metadata
- [x] Version number set (0.1.0)
- [x] Description and keywords added
- [x] Repository and homepage URLs configured
- [x] License specified (MIT)
- [x] Node.js engine requirements set (>=18.0.0)
- [x] Files array configured to include only necessary files

✅ **Documentation**
- [x] README.md with installation instructions
- [x] API documentation and examples
- [x] CHANGELOG.md with version history
- [x] LICENSE file included

✅ **Package Structure**
- [x] `.npmignore` configured to exclude dev files
- [x] `.gitignore` for development
- [x] All source files included in package
- [x] TypeScript definitions included

✅ **Testing**
- [x] `npm pack` tested successfully
- [x] Package installation verified
- [x] Import functionality confirmed
- [x] All exports available

## Deployment Commands

### 1. Login to NPM (if not already logged in)
```bash
npm login
```

### 2. Verify Package Contents
```bash
cd vendors/citty-test-utils
npm pack --dry-run
```

### 3. Publish to NPM
```bash
npm publish
```

### 4. Verify Publication
```bash
npm view citty-test-utils
```

## Post-deployment Verification

### Test Installation from NPM
```bash
# Create a test directory
mkdir test-npm-install
cd test-npm-install

# Initialize npm project
npm init -y

# Install the published package
npm install citty-test-utils

# Test import
node -e "import('citty-test-utils').then(m => console.log('✅ Success:', Object.keys(m)))"
```

### Update Version for Future Releases
```bash
# Patch version (0.1.0 -> 0.1.1)
npm version patch

# Minor version (0.1.0 -> 0.2.0)
npm version minor

# Major version (0.1.0 -> 1.0.0)
npm version major

# Then publish
npm publish
```

## Package Information

- **Name**: `citty-test-utils`
- **Version**: `0.1.0`
- **Size**: ~9.1 kB (compressed), ~33.1 kB (unpacked)
- **Files**: 10 files included
- **Dependencies**: `testcontainers` ^10.0.0
- **Node.js**: >=18.0.0 required

## Installation Commands for Users

```bash
# npm
npm install citty-test-utils

# pnpm
pnpm add citty-test-utils

# yarn
yarn add citty-test-utils
```

## Package Contents

The published package includes:
- `index.js` - Main exports
- `cleanroom-runner.js` - Docker container execution
- `local-runner.js` - Local CLI execution
- `assertions.js` - Fluent assertion API
- `scenario-dsl.js` - Scenario DSL implementation
- `types.d.ts` - TypeScript definitions
- `README.md` - Documentation
- `LICENSE` - MIT license
- `CHANGELOG.md` - Version history
- `package.json` - Package metadata

## Security Notes

- Package is signed with npm's integrity checks
- All dependencies are properly specified
- No sensitive information included
- MIT license allows commercial use

## Rollback Procedure

If issues are discovered after publication:

1. **Deprecate the version**:
   ```bash
   npm deprecate citty-test-utils@0.1.0 "This version has issues, please use 0.1.1"
   ```

2. **Publish a fixed version**:
   ```bash
   npm version patch
   npm publish
   ```

3. **Update documentation** if needed

## Monitoring

After publication, monitor:
- Download statistics on npmjs.com
- GitHub issues for bug reports
- Package health score
- Dependency security alerts
