#!/usr/bin/env bash
# Initialize all git submodules and build vendor dependencies
set -e

echo "🔧 Initializing GitVan submodules..."
echo ""

# Initialize git submodules
echo "📦 Updating git submodules..."
git submodule update --init --recursive
echo "✅ Submodules initialized"
echo ""

# Build unrdf
if [ -d "vendor/unrdf" ]; then
    echo "🔨 Building vendor/unrdf..."
    cd vendor/unrdf
    npm install
    npm run build
    cd ../..
    echo "✅ unrdf built successfully"
else
    echo "⚠️  vendor/unrdf not found - skipping build"
fi

echo ""
echo "✨ Submodule initialization complete!"
