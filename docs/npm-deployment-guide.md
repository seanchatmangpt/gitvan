# GitVan v2 - NPM Deployment & Production Release Guide

## Overview

This guide provides step-by-step instructions for deploying GitVan v2 to npm, including pre-deployment verification, release processes, and post-deployment validation.

## 📋 **Pre-Deployment Checklist**

### **0. Release Hygiene Verification**
```bash
# Run release verification script
npm run verify-release

# This checks:
# ✅ All runtime dependencies are in dependencies (not devDependencies)
# ✅ Version consistency between package.json and CLI
# ✅ All required files are present and executable
# ✅ Hook spawn paths use absolute Node + local CLI paths
# ✅ hookable@^5.5.3 is pinned correctly
```

### **1. Code Quality Verification**
```bash
# Run all tests
pnpm test

# Run linting
pnpm run lint

# Check for TypeScript errors
pnpm run type-check

# Verify build process
pnpm run build
```

### **2. Documentation Verification**
- [ ] README.md is up to date
- [ ] All new features documented
- [ ] API documentation complete
- [ ] Examples and tutorials updated
- [ ] Changelog updated

### **3. Package Configuration**
```bash
# Verify package.json
cat package.json | jq '{
  name: .name,
  version: .version,
  description: .description,
  main: .main,
  bin: .bin,
  files: .files,
  keywords: .keywords,
  repository: .repository,
  license: .license
}'
```

### **4. Security Audit**
```bash
# Run security audit
pnpm audit

# Fix any vulnerabilities
pnpm audit --fix

# Verify no high/critical issues
pnpm audit --audit-level moderate
```

## 🏗️ **Build Process**

### **1. Clean Build Environment**
```bash
# Clean previous builds
rm -rf dist/
rm -rf node_modules/.cache/

# Fresh install
pnpm install

# Clean build
pnpm run build
```

### **2. Verify Build Output**
```bash
# Check build artifacts
ls -la dist/

# Verify main entry point
node -e "console.log(require('./dist/index.js'))"

# Test CLI binary
./dist/bin/gitvan.mjs --version
```

### **3. Test Built Package**
```bash
# Create test directory
mkdir -p /tmp/gitvan-test
cd /tmp/gitvan-test

# Install from local build
npm install /Users/sac/gitvan

# Test installation
gitvan --version
gitvan init --help
```

## 📦 **Package Preparation**

### **1. Update Version**
```bash
# Check current version
npm version

# Update version (patch/minor/major)
npm version patch   # 1.0.0 -> 1.0.1
npm version minor   # 1.0.0 -> 1.1.0
npm version major   # 1.0.0 -> 2.0.0

# Or use specific version
npm version 2.0.0
```

### **2. Update Changelog**
```bash
# Create/update CHANGELOG.md
cat > CHANGELOG.md << 'EOF'
# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - $(date +%Y-%m-%d)

### Added
- Autonomic initialization system
- Ollama-first AI integration
- GitHub template system
- Job-only architecture
- Non-blocking operations
- Comprehensive test suite

### Changed
- Simplified CLI commands
- Enhanced error handling
- Performance optimizations

### Security
- Local AI processing by default
- No external API dependencies
- Timeout protection for all operations
EOF
```

### **3. Verify Package Contents**
```bash
# Check what will be published
npm pack --dry-run

# Preview package contents
tar -tzf gitvan-2.0.0.tgz | head -20
```

## 🔐 **NPM Authentication**

### **1. NPM Token Management**

#### **Option A: Interactive Login (Recommended)**
```bash
# Login to npm interactively
npm login

# This will prompt for:
# - Username
# - Password  
# - Email
# - 2FA code (if enabled)
```

#### **Option B: Token-Based Authentication**
```bash
# Get a new token from npm website
# Go to: https://www.npmjs.com/settings/tokens
# Create "Automation" token for CI/CD
# Or "Publish" token for manual publishing

# Add token to ~/.npmrc
echo "//registry.npmjs.org/:_authToken=YOUR_TOKEN_HERE" >> ~/.npmrc

# Or set environment variable
export NPM_TOKEN="your_token_here"
echo "//registry.npmjs.org/:_authToken=\${NPM_TOKEN}" >> ~/.npmrc
```

#### **Option C: Project-Specific Token**
```bash
# Create .npmrc in project root
echo "//registry.npmjs.org/:_authToken=YOUR_TOKEN_HERE" > .npmrc

# Add to .gitignore to avoid committing tokens
echo ".npmrc" >> .gitignore
```

### **2. Token Verification**
```bash
# Verify authentication
npm whoami

# Check token permissions
npm profile get

# Test package access
npm view gitvan
```

### **3. Two-Factor Authentication**
```bash
# Enable 2FA for publishing (recommended)
npm profile enable-2fa auth-and-writes

# Verify 2FA status
npm profile get

# Note: With 2FA enabled, you'll need to use npm login
# instead of token-based auth for publishing
```

### **4. Token Security Best Practices**
```bash
# Use automation tokens for CI/CD
# Use publish tokens for manual releases
# Never commit tokens to git
# Rotate tokens regularly
# Use environment variables in CI/CD
```

## 🚀 **Deployment Process**

### **1. Pre-Publish Verification**
```bash
# Final verification
pnpm test
pnpm run build
pnpm run lint

# Check package size
npm pack --dry-run | grep -E "(packed|unpacked)"
```

### **2. Publish to NPM**
```bash
# Publish to npm
npm publish

# Or publish with specific tag
npm publish --tag beta
npm publish --tag latest
```

### **3. Verify Publication**
```bash
# Check published package
npm view gitvan

# Verify installation
npm install -g gitvan@latest
gitvan --version
```

## 🔍 **Post-Deployment Verification**

### **1. Installation Testing**
```bash
# Test global installation
npm install -g gitvan@latest
gitvan --version
gitvan init --help

# Test local installation
mkdir -p /tmp/gitvan-verify
cd /tmp/gitvan-verify
npm init -y
npm install gitvan@latest
npx gitvan --version
```

### **2. Functionality Testing**
```bash
# Test core functionality
cd /tmp/gitvan-verify
gitvan init
ls -la .gitvan/
cat gitvan.config.js

# Test AI integration
echo "console.log('test');" > test.js
gitvan save
git log --oneline -1
```

### **3. Performance Verification**
```bash
# Test initialization speed
time gitvan init

# Test memory usage
node -e "
const start = process.memoryUsage();
require('gitvan');
const end = process.memoryUsage();
console.log('Memory increase:', (end.heapUsed - start.heapUsed) / 1024 / 1024, 'MB');
"
```

## 📊 **Release Monitoring**

### **1. Download Statistics**
```bash
# Check download stats
npm view gitvan downloads

# Monitor over time
npm view gitvan time
```

### **2. Error Monitoring**
```bash
# Check for issues
npm view gitvan bugs
npm view gitvan issues

# Monitor GitHub issues
gh issue list --repo sac/gitvan --state open
```

### **3. User Feedback**
```bash
# Check npm reviews
npm view gitvan reviews

# Monitor GitHub discussions
gh api repos/sac/gitvan/discussions
```

## 🔄 **Rollback Procedures**

### **1. Unpublish (Within 24 Hours)**
```bash
# Unpublish specific version
npm unpublish gitvan@2.0.0

# Unpublish entire package (if needed)
npm unpublish gitvan --force
```

### **2. Deprecate Version**
```bash
# Deprecate specific version
npm deprecate gitvan@2.0.0 "This version has critical issues"

# Update deprecation message
npm deprecate gitvan@2.0.0 "Please upgrade to 2.0.1"
```

### **3. Emergency Fix**
```bash
# Quick patch release
npm version patch
npm publish

# Notify users
npm deprecate gitvan@2.0.0 "Critical security fix in 2.0.1"
```

## 🎯 **Production Checklist**

### **Pre-Release**
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Version bumped
- [ ] Changelog updated
- [ ] Security audit clean
- [ ] Build verified
- [ ] Package contents checked

### **Release**
- [ ] NPM authentication verified
- [ ] Package published successfully
- [ ] Installation tested
- [ ] Functionality verified
- [ ] Performance confirmed

### **Post-Release**
- [ ] Download stats monitored
- [ ] Error reports checked
- [ ] User feedback reviewed
- [ ] Documentation updated
- [ ] Support channels monitored

## 🚨 **Common Issues & Solutions**

### **1. Authentication Errors**
```bash
# Clear npm cache
npm cache clean --force

# Re-login
npm logout
npm login

# Check registry
npm config get registry

# Verify token format
cat ~/.npmrc
# Should show: //registry.npmjs.org/:_authToken=npm_xxxxxxxxx

# Test token validity
npm whoami
```

### **2. Token Issues**
```bash
# If token is expired/invalid:
# 1. Go to https://www.npmjs.com/settings/tokens
# 2. Generate new token
# 3. Update ~/.npmrc:
echo "//registry.npmjs.org/:_authToken=NEW_TOKEN_HERE" > ~/.npmrc

# If 2FA is enabled, use npm login instead of tokens
npm login

# Check token permissions
npm profile get
```

### **3. Build Failures**
```bash
# Check Node.js version
node --version

# Verify dependencies
pnpm install --frozen-lockfile

# Clean rebuild
rm -rf node_modules dist/
pnpm install
pnpm run build
```

### **4. Publishing Errors**
```bash
# Check package name availability
npm view gitvan

# Verify package.json
npm pack --dry-run

# Check file permissions
ls -la dist/
```

## 📈 **Release Strategy**

### **1. Semantic Versioning**
- **Patch (1.0.0 → 1.0.1)**: Bug fixes, minor improvements
- **Minor (1.0.0 → 1.1.0)**: New features, backward compatible
- **Major (1.0.0 → 2.0.0)**: Breaking changes, major features

### **2. Release Channels**
- **Latest**: Stable releases
- **Beta**: Pre-release testing
- **Alpha**: Development builds

### **3. Release Schedule**
- **Patch**: As needed for critical fixes
- **Minor**: Monthly feature releases
- **Major**: Quarterly major updates

## 🔧 **Automation Scripts**

### **1. Release Script**
```bash
#!/bin/bash
# scripts/release.sh

set -e

echo "🚀 Starting GitVan release process..."

# Pre-release checks
echo "📋 Running pre-release checks..."
pnpm test
pnpm run lint
pnpm run build

# Version bump
echo "📦 Bumping version..."
npm version $1

# Publish
echo "🚀 Publishing to npm..."
npm publish

# Post-release verification
echo "✅ Verifying release..."
npm install -g gitvan@latest
gitvan --version

echo "🎉 Release complete!"
```

### **2. Verification Script**
```bash
#!/bin/bash
# scripts/verify-release.sh

set -e

echo "🔍 Verifying GitVan release..."

# Test installation
echo "📦 Testing installation..."
npm install -g gitvan@latest

# Test functionality
echo "🧪 Testing functionality..."
cd /tmp
mkdir gitvan-test
cd gitvan-test
gitvan init
ls -la .gitvan/

echo "✅ Release verification complete!"
```

## 📚 **Documentation Updates**

### **1. README.md**
- Update installation instructions
- Add new features
- Update examples
- Verify all commands work

### **2. API Documentation**
- Update function signatures
- Add new methods
- Update examples
- Verify accuracy

### **3. Migration Guide**
- Document breaking changes
- Provide upgrade path
- Include examples
- Test migration steps

## 🎉 **Success Metrics**

### **Release Success Indicators**
- ✅ Package published successfully
- ✅ Installation works globally and locally
- ✅ Core functionality verified
- ✅ Performance benchmarks met
- ✅ No critical errors reported
- ✅ Documentation updated
- ✅ User feedback positive

### **Post-Release Monitoring**
- 📊 Download statistics
- 🐛 Error reports
- 💬 User feedback
- ⭐ GitHub stars
- 🔄 Issue resolution

## 🔧 **Troubleshooting Common Issues**

### **Issue: CLI reports wrong version (1.0.0 instead of 2.0.0)**
**Root Cause:** Version hardcoded in CLI instead of reading from package.json
**Fix:** Ensure CLI uses `join(__dirname, "..", "package.json")` to read version

### **Issue: Missing dependencies at runtime**
**Root Cause:** Runtime dependencies in devDependencies instead of dependencies
**Fix:** Move all runtime deps to dependencies array in package.json

### **Issue: Hooks fail with ENOENT error**
**Root Cause:** Spawning bare "gitvan" command instead of absolute Node + local CLI path
**Fix:** Use `spawn(process.execPath, [cliPath, ...args])` with resolved CLI path

### **Issue: hookable version conflicts**
**Root Cause:** hookable range doesn't include fixed version
**Fix:** Pin to `hookable@^5.5.3` or update range to include fixed version

### **Issue: Clean-room install fails**
**Root Cause:** Package missing required files or dependencies
**Fix:** Run `npm run verify-release` before publishing

## 🏆 **Conclusion**

This guide provides a comprehensive framework for deploying GitVan v2 to npm with confidence. Following these steps ensures:

- **Quality Assurance**: Thorough testing and verification
- **Security**: Secure deployment practices
- **Reliability**: Robust release process
- **Monitoring**: Post-deployment oversight
- **Recovery**: Rollback procedures if needed

The autonomic architecture of GitVan v2 is now ready for production deployment, providing users with a truly autonomous Git-native development experience! 🚀✨
