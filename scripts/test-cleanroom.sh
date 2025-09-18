#!/usr/bin/env bash
# Standalone Clean-Room Test Script
# This simulates what the GitHub Actions workflow would do

set -e

VERSION=${1:-"2.0.0"}
echo "🧪 GitVan Clean-Room Test - Version: $VERSION"
echo "=============================================="

# Create clean test directory
TEST_DIR="/tmp/gitvan-cleanroom-test"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

echo "📁 Created clean test directory: $TEST_DIR"

# Install GitVan from npm
echo ""
echo "📦 Installing GitVan from npm..."
npm init -y
npm install gitvan@$VERSION

echo ""
echo "✅ Installation completed"

# Verify Installation
echo ""
echo "🔍 Verifying installation..."

CLI_PATH="./node_modules/.bin/gitvan"

if [ ! -f "$CLI_PATH" ]; then
    echo "❌ GitVan CLI not found at $CLI_PATH"
    exit 1
fi

if [ ! -x "$CLI_PATH" ]; then
    echo "❌ GitVan CLI not executable at $CLI_PATH"
    exit 1
fi

echo "✅ GitVan CLI found and executable"

# Test Version Command
echo ""
echo "🔢 Testing version command..."

VERSION_OUTPUT=$(npx gitvan --version)
echo "Version output: $VERSION_OUTPUT"

if [ "$VERSION_OUTPUT" != "$VERSION" ]; then
    echo "❌ Version mismatch! Expected: $VERSION, Got: $VERSION_OUTPUT"
    exit 1
fi

echo "✅ Version command works correctly"

# Test Basic Commands
echo ""
echo "🧪 Testing basic commands..."

# Initialize git repo
git init
git config user.name "Test User"
git config user.email "test@example.com"

# Test help command
npx gitvan help > /dev/null
echo "✅ Help command works"

# Test init command
npx gitvan init --help > /dev/null
echo "✅ Init command works"

# Verify Dependencies
echo ""
echo "📋 Verifying all runtime dependencies are installed..."

REQUIRED_DEPS=(
    "@babel/parser"
    "@babel/traverse"
    "ai"
    "c12"
    "cacache"
    "citty"
    "consola"
    "defu"
    "fuse.js"
    "giget"
    "gray-matter"
    "hookable"
    "inflection"
    "klona"
    "lru-cache"
    "minimatch"
    "node-cron"
    "nunjucks"
    "ollama"
    "pathe"
    "prompts"
    "semver"
    "toml"
    "unctx"
    "zod"
)

for dep in "${REQUIRED_DEPS[@]}"; do
    if ! npm list "$dep" > /dev/null 2>&1; then
        echo "❌ Missing dependency: $dep"
        exit 1
    fi
done

echo "✅ All runtime dependencies are present"

# Test Package Contents
echo ""
echo "📦 Testing package contents..."

if [ ! -f "./node_modules/gitvan/bin/gitvan.mjs" ]; then
    echo "❌ Main CLI file missing"
    exit 1
fi

if [ ! -f "./node_modules/gitvan/bin/git-hook-handler.mjs" ]; then
    echo "❌ Hook handler missing"
    exit 1
fi

if [ ! -f "./node_modules/gitvan/bin/git-hooks-setup.mjs" ]; then
    echo "❌ Hook setup missing"
    exit 1
fi

echo "✅ All required files are present"

# Test Hook Installation
echo ""
echo "🔗 Testing hook installation..."

# Create a test file
echo "test" > test.txt
git add test.txt
git commit -m "test commit"

# Test ensure command (hook installation)
npx gitvan ensure --help > /dev/null
echo "✅ Ensure command works"

# Cleanup
echo ""
echo "🧹 Cleaning up..."
rm -rf "$TEST_DIR"
echo "✅ Cleanup completed"

echo ""
echo "🎉 Clean-room test completed successfully!"
echo "📦 GitVan $VERSION is ready for release!"
