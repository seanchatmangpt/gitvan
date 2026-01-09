#!/usr/bin/env bash
# Update unrdf submodule to latest version
set -e

echo "🔄 Updating vendor/unrdf submodule..."
echo ""

# Check if vendor/unrdf exists
if [ ! -d "vendor/unrdf" ]; then
    echo "❌ ERROR: vendor/unrdf not found!"
    echo "   Initialize the submodule first: git submodule update --init --recursive"
    exit 1
fi

# Navigate to submodule
cd vendor/unrdf

# Fetch latest changes
echo "📦 Fetching latest changes from remote..."
git fetch origin

# Checkout main branch
echo "🔀 Checking out main branch..."
git checkout main

# Pull latest changes
echo "⬇️  Pulling latest changes..."
git pull origin main

# Update dependencies
echo ""
echo "📦 Updating dependencies..."
npm install

# Rebuild
echo ""
echo "🔨 Rebuilding unrdf..."
npm run build

# Return to project root
cd ../..

# Show the new commit
echo ""
echo "✅ Update complete!"
echo ""
echo "New commit:"
git -C vendor/unrdf log -1 --oneline
echo ""
echo "To commit this update to GitVan:"
echo "  git add vendor/unrdf"
echo "  git commit -m 'chore: update unrdf submodule'"
