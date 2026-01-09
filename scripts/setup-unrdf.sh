#!/usr/bin/env bash
# Setup script for unrdf git submodule
# This script initializes and builds the unrdf submodule

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VENDOR_UNRDF="$PROJECT_ROOT/vendor/unrdf"

echo "🔧 Setting up unrdf submodule..."
echo ""

# Check if vendor/unrdf exists
if [ ! -d "$VENDOR_UNRDF" ]; then
    echo "📦 Initializing git submodule..."
    cd "$PROJECT_ROOT"
    git submodule update --init --recursive
    echo "✅ Submodule initialized"
else
    echo "✅ Submodule already initialized"
fi

# Navigate to submodule
cd "$VENDOR_UNRDF"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Installing unrdf dependencies..."
    npm install
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

# Check if dist exists
if [ ! -d "dist" ]; then
    echo ""
    echo "🔨 Building unrdf..."
    npm run build
    echo "✅ Build complete"
else
    echo "✅ Build artifacts already exist"
    echo ""
    read -p "Rebuild unrdf? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔨 Rebuilding unrdf..."
        npm run build
        echo "✅ Build complete"
    fi
fi

echo ""
echo "✨ unrdf setup complete!"
echo ""
echo "To update unrdf in the future:"
echo "  cd vendor/unrdf"
echo "  git pull origin main"
echo "  npm install && npm run build"
