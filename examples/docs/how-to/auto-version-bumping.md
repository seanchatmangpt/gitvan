# How-To: Auto-Version Bumping

**Goal**: Automatically bump version based on commit types
**Time**: 15 minutes
**Difficulty**: Intermediate

## Problem

Manual version bumping is error-prone:
- Forget to bump version before release
- Inconsistent versioning (1.0.0 vs 1.0.1)
- Hard to maintain multiple branches

## Solution

Use semantic commit types to automatically increment versions:
- `feat:` → Minor version bump (0.1.0 → 0.2.0)
- `fix:` or `hotfix:` → Patch bump (0.1.0 → 0.1.1)
- `BREAKING CHANGE:` → Major version bump (1.0.0 → 2.0.0)

## Setup

### Step 1: Install Versioning Tools

```bash
npm install -D semantic-release standard-version
# or
pnpm add -D semantic-release standard-version
```

### Step 2: Create Version Bump Hook

Create `.gitvan/hooks/auto-version-bump.ttl`:

```ttl
@prefix gh: <http://example.org/git-hooks#> .
@prefix git: <http://example.org/git#> .

gh:AutoVersionBump a gh:Hook ;
  gh:name "Auto Version Bump" ;
  gh:description "Automatically bump version on main branch" ;

  # Trigger on push to main
  gh:trigger [
    a git:PostPushEvent
  ] ;

  # Only on main branch
  gh:condition [
    a gh:BranchMatch ;
    gh:pattern "^main$"
  ] ;

  gh:action [
    a gh:ShellAction ;
    gh:script """
      echo "📦 Checking for version bump..."

      # Get current version
      CURRENT_VERSION=$(jq -r .version package.json)

      # Get last tag
      LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")

      # Determine version bump based on commits since last tag
      COMMITS=$(git log $LAST_TAG..HEAD --oneline)

      if echo "$COMMITS" | grep -E "^(feat|break)" > /dev/null; then
        # Minor or major bump needed
        npx standard-version
      elif echo "$COMMITS" | grep -E "^fix" > /dev/null; then
        # Patch bump needed
        npx standard-version --release-as patch
      else
        echo "ℹ️  No version bump needed"
        exit 0
      fi

      # New version
      NEW_VERSION=$(jq -r .version package.json)

      echo "✅ Version bumped: $CURRENT_VERSION → $NEW_VERSION"

      # Create tag
      git tag v$NEW_VERSION
      git push origin v$NEW_VERSION
    """
  ] .
```

### Step 3: Configure package.json

Add version bump scripts:

```json
{
  "version": "1.0.0",
  "scripts": {
    "release": "semantic-release",
    "bump": "standard-version"
  },
  "standard-version": {
    "types": [
      { "type": "feat", "section": "Features" },
      { "type": "fix", "section": "Bug Fixes" },
      { "type": "chore", "hidden": true },
      { "type": "docs", "section": "Documentation" },
      { "type": "style", "hidden": true },
      { "type": "refactor", "section": "Code Refactoring" },
      { "type": "perf", "section": "Performance" },
      { "type": "test", "hidden": true }
    ],
    "commitUrlFormat": "{{repository}}/commits/{{hash}}",
    "compareUrlFormat": "{{repository}}/compare/{{previousTag}}...{{currentTag}}"
  }
}
```

### Step 4: Test It

Make commits with semantic format:

```bash
# Feature commit
git commit -m "feat: add user authentication"

# Push to main
git push origin main

# GitVan hook runs automatically:
# → Detects feat:
# → Bumps minor version
# → Creates tag
# → Pushes tag
```

Check result:

```bash
# See new version
jq .version package.json

# See new tag
git tag
```

## Advanced: Multi-Package Versioning

For monorepos, bump versions per package:

`.gitvan/hooks/bump-all-packages.ttl`:

```ttl
@prefix gh: <http://example.org/git-hooks#> .
@prefix git: <http://example.org/git#> .

gh:BumpAllPackages a gh:Hook ;
  gh:name "Bump All Packages" ;
  gh:description "Bump versions for all changed packages" ;

  gh:trigger [
    a git:PostPushEvent
  ] ;

  gh:condition [
    a gh:BranchMatch ;
    gh:pattern "^main$"
  ] ;

  gh:action [
    a gh:ShellAction ;
    gh:script """
      # Find all changed packages
      CHANGED_PACKAGES=$(git diff HEAD~1 --name-only | grep -E "^packages/[^/]+/" | cut -d/ -f2 | sort -u)

      for PACKAGE in $CHANGED_PACKAGES; do
        cd packages/$PACKAGE
        echo "📦 Bumping $PACKAGE..."
        npx standard-version
        cd ../..
      done

      # Create release tag
      npm run release
    """
  ] .
```

## Real-World Example: GitHub Release

Automatically create GitHub release:

`.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    branches: [main]
    tags: [v*]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Check version changed
        id: version-check
        run: |
          CURRENT=$(jq -r .version package.json)
          LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
          LAST_VERSION=${LAST_TAG#v}
          echo "current=$CURRENT" >> $GITHUB_OUTPUT
          echo "changed=$([[ "$CURRENT" != "$LAST_VERSION" ]] && echo "true" || echo "false")" >> $GITHUB_OUTPUT

      - name: Create Release
        if: steps.version-check.outputs.changed == 'true'
        uses: softprops/action-gh-release@v1
        with:
          tag_name: v${{ steps.version-check.outputs.current }}
          files: dist/**
          generate_release_notes: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Monitoring: Track Version Changes

```bash
# See all version tags
git tag | grep "^v" | sort -V

# See version history
git log --oneline --tags

# Find commits in version range
git log v1.0.0..v1.1.0 --oneline

# Export version metrics
gitvan metrics export --format json | jq '.versions'
```

## Common Issues

### "Version not bumping"
**Problem**: Hook running but version unchanged

**Solution**: Check commit types:
```bash
# Verify commits match semantic format
git log -1 --pretty=%B | head -1

# Should start with: feat:, fix:, etc.
```

### "Tag conflicts"
**Problem**: Tag already exists

**Solution**: Increment manually:
```bash
# See what tags exist
git tag

# Create new release manually
npm run bump -- --release-as minor
```

### "Out of sync with GitHub"
**Problem**: Local version differs from published

**Solution**: Rebuild from tags:
```bash
# Get latest tags
git fetch --tags

# Rebuild version
npm run bump
```

## Benefits

✅ **Automated**: No manual version management
✅ **Consistent**: Same logic always used
✅ **Traceable**: Every version has tag and changelog
✅ **CI/CD Friendly**: Integrates with pipelines
✅ **Semantic**: Version matches development activity

## Next Steps

1. **Changelog**: [Generate Changelog](./changelog-generation.md)
2. **Deployment**: [Trigger Deployments on Release](./trigger-deployments.md)
3. **SPARQL**: [Query Version History](../reference/sparql-patterns.md#version-queries)

---

**Continue to other How-To Guides.**
