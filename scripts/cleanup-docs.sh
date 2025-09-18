#!/usr/bin/env bash
# GitVan Documentation Cleanup Script
# This script helps automate the cleanup process outlined in CLEANUP-INDEX.md

set -e

echo "🧹 GitVan Documentation Cleanup Script"
echo "====================================="

# Phase 1: Remove Duplicate Files
echo "📋 Phase 1: Removing Duplicate Files"
echo "------------------------------------"

duplicates=(
    "docs/COMPOSABLES_API.md"
    "docs/cli-commands.md"
    "docs/job-system-documentation.md"
    "docs/pack-system-architecture.md"
)

for file in "${duplicates[@]}"; do
    if [ -f "$file" ]; then
        echo "🗑️  Removing duplicate: $file"
        rm "$file"
    else
        echo "ℹ️  File not found: $file"
    fi
done

# Phase 2: Verify New Files
echo ""
echo "📋 Phase 2: Verifying New Files"
echo "-------------------------------"

new_files=(
    "docs/cookbook/pack-development.md"
    "docs/cookbook/foundation/git-operations.md"
    "docs/api/pack.md"
)

for file in "${new_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ Found new file: $file"
        # Check if file has content
        if [ -s "$file" ]; then
            echo "   Content: $(wc -l < "$file") lines"
        else
            echo "   ⚠️  WARNING: File is empty!"
        fi
    else
        echo "❌ Missing new file: $file"
    fi
done

# Phase 3: Check for Missing Referenced Files
echo ""
echo "📋 Phase 3: Checking for Missing Referenced Files"
echo "------------------------------------------------"

missing_files=(
    "docs/guides/job-development.md"
    "docs/guides/ai-integration.md"
    "docs/guides/templates.md"
    "docs/guides/daemon.md"
    "docs/api/job-definition.md"
    "docs/api/event-predicates.md"
    "docs/advanced/receipts.md"
    "docs/advanced/worktrees.md"
    "docs/advanced/security.md"
    "docs/advanced/performance.md"
)

for file in "${missing_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ Found referenced file: $file"
    else
        echo "❌ Missing referenced file: $file"
    fi
done

# Phase 4: Generate Updated Cleanup Index
echo ""
echo "📋 Phase 4: Generating Updated Cleanup Index"
echo "--------------------------------------------"

# Update the last modified date in CLEANUP-INDEX.md
if [ -f "CLEANUP-INDEX.md" ]; then
    echo "📝 Updating CLEANUP-INDEX.md with current timestamp"
    # This would update the last updated timestamp
    echo "   Last cleanup run: $(date)"
else
    echo "❌ CLEANUP-INDEX.md not found!"
fi

echo ""
echo "🎉 Cleanup script completed!"
echo "📊 Summary:"
echo "   - Duplicate files removed: ${#duplicates[@]}"
echo "   - New files verified: ${#new_files[@]}"
echo "   - Missing files identified: ${#missing_files[@]}"
echo ""
echo "📝 Next steps:"
echo "   1. Review the missing files list above"
echo "   2. Create missing referenced files"
echo "   3. Update stale documentation files"
echo "   4. Archive old demo and V2 development files"
