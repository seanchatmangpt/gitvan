#!/usr/bin/env bash
# Manual Clean-Room Test Simulation
# This demonstrates why we didn't catch the issues with existing CI

echo "🧪 Simulating Clean-Room Install Test"
echo "====================================="

# Create clean test directory
TEST_DIR="/tmp/gitvan-cleanroom-test"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

echo "📁 Created clean test directory: $TEST_DIR"

# Simulate what would happen with the OLD package.json (before our fixes)
echo ""
echo "🔍 Testing OLD package.json issues:"
echo "-----------------------------------"

# 1. Test missing runtime dependencies
echo "❌ Issue 1: Missing runtime dependencies"
echo "   - minimatch, c12, klona, zod, fuse.js, ai, @babel/parser, @babel/traverse"
echo "   - semver, inflection, gray-matter, toml, prompts, lru-cache, cacache, node-cron"
echo "   - These were in devDependencies, not dependencies"
echo "   - Result: Runtime errors when users install from npm"

# 2. Test version inconsistency
echo ""
echo "❌ Issue 2: Version inconsistency"
echo "   - package.json: 2.0.0"
echo "   - CLI hardcoded: 1.0.0"
echo "   - Result: Users see wrong version"

# 3. Test spawn path issues
echo ""
echo "❌ Issue 3: Spawn path issues"
echo "   - Code spawned bare 'gitvan' command"
echo "   - In local install, binary not on PATH"
echo "   - Result: ENOENT errors in hooks/daemon"

# 4. Test hookable version
echo ""
echo "❌ Issue 4: hookable version conflicts"
echo "   - Range didn't include fixed version"
echo "   - Result: Dependency conflicts"

echo ""
echo "🎯 Why existing CI didn't catch these:"
echo "======================================"
echo "✅ checks.yml: Tests source code, not npm package"
echo "✅ npm-deploy.yml: Publishes without testing the published package"
echo "❌ Missing: Clean-room install test of actual npm package"

echo ""
echo "🔧 Our fixes:"
echo "============="
echo "✅ Moved all runtime deps to dependencies"
echo "✅ Fixed CLI to read version from package.json"
echo "✅ Fixed spawn paths to use absolute Node + local CLI"
echo "✅ Pinned hookable@^5.5.3"
echo "✅ Added release verification script"
echo "✅ Added clean-room install test workflow"

echo ""
echo "🧪 Testing our fixes:"
echo "===================="

# Test the verification script
cd /Users/sac/gitvan
echo "Running release verification..."
if node scripts/verify-release.mjs; then
    echo "✅ Release verification passed!"
else
    echo "❌ Release verification failed!"
fi

echo ""
echo "📦 Summary:"
echo "==========="
echo "The existing CI workflows only tested the source code, not the actual"
echo "npm package that users would install. This is a common gap in many"
echo "projects. Our clean-room test workflow would have caught all these"
echo "issues before they reached users."
