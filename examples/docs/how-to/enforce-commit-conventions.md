# How-To: Enforce Commit Conventions

**Goal**: Ensure your team follows consistent commit message formats
**Time**: 10 minutes
**Difficulty**: Beginner

## Problem

Team members write inconsistent commit messages:
- ❌ "fix stuff"
- ❌ "Updated the thing"
- ❌ "asdfasdf"

This makes commit history hard to read and automates tools (changelog, semantic versioning) unreliable.

## Solution

Use GitVan to validate commit messages against semantic commit format:
- ✅ "feat: add user authentication"
- ✅ "fix(auth): resolve login timeout"
- ✅ "docs: update API documentation"

## Step-by-Step Guide

### Step 1: Create the Hook File

Create `.gitvan/hooks/enforce-semantic-commits.ttl`:

```ttl
@prefix gh: <http://example.org/git-hooks#> .
@prefix git: <http://example.org/git#> .

gh:EnforceSemanticCommits a gh:Hook ;
  gh:name "Enforce Semantic Commits" ;
  gh:description "Require semantic commit format" ;

  # Trigger when commit message is created
  gh:trigger [
    a git:CommitMsgEvent
  ] ;

  # Validate message format
  gh:condition [
    a gh:PatternMatch ;
    # Pattern: type(scope)?: message
    # Example: feat(auth): add login page
    gh:pattern "(feat|fix|docs|style|refactor|perf|test|chore|build)(\\([^)]+\\))?:\\s.{10,}" ;
    gh:flags "i"
  ] ;

  # Reject if not matching
  gh:action [
    a gh:ShellAction ;
    gh:script """
      MSG=$(cat "$1")

      # Extract commit type
      TYPE=$(echo "$MSG" | grep -oE "^(feat|fix|docs|style|refactor|perf|test|chore|build)" | head -1)

      if [ -z "$TYPE" ]; then
        echo ""
        echo "❌ INVALID COMMIT MESSAGE"
        echo ""
        echo "Format: <type>(<scope>): <description>"
        echo ""
        echo "Types:"
        echo "  • feat     - New feature"
        echo "  • fix      - Bug fix"
        echo "  • docs     - Documentation changes"
        echo "  • style    - Code style (formatting, semicolons, etc)"
        echo "  • refactor - Code refactoring without feature/fix"
        echo "  • perf     - Performance improvements"
        echo "  • test     - Test additions or changes"
        echo "  • chore    - Build, dependencies, tooling"
        echo "  • build    - Build system changes"
        echo ""
        echo "Scope (optional):"
        echo "  • Specific part of codebase (auth, api, ui, etc)"
        echo ""
        echo "Examples:"
        echo "  • feat: add user authentication"
        echo "  • feat(auth): add login page"
        echo "  • fix(api): resolve null pointer exception"
        echo "  • docs: update README"
        echo "  • refactor(core): simplify logic"
        echo ""
        echo "Your message: $MSG"
        exit 1
      fi
    """
  ] .
```

### Step 2: Install the Hook

```bash
gitvan hooks install enforce-semantic-commits
```

Verify it's installed:
```bash
gitvan hooks list
```

### Step 3: Test It

Make a bad commit:
```bash
git add .
git commit -m "fix stuff"
```

You'll see:
```
❌ INVALID COMMIT MESSAGE

Format: <type>(<scope>): <description>

Types:
  • feat     - New feature
  • fix      - Bug fix
  ...
```

Try a valid commit:
```bash
git commit --amend -m "fix(auth): resolve login timeout"
```

Success! ✅

## Advanced: Multiple Patterns

Want to support different formats? Create variations:

`.gitvan/hooks/enforce-conventional-commits.ttl`:

```ttl
@prefix gh: <http://example.org/git-hooks#> .
@prefix git: <http://example.org/git#> .

gh:EnforceConventionalCommits a gh:Hook ;
  gh:name "Enforce Conventional Commits" ;
  gh:description "Support both semantic and gitmoji formats" ;

  gh:trigger [
    a git:CommitMsgEvent
  ] ;

  gh:condition [
    a gh:AlternativeMatch ;
    # Support semantic commits
    gh:pattern1 "(feat|fix|docs|style|refactor|perf|test|chore):" ;
    # Also support gitmoji
    gh:pattern2 ":[a-z_]+:" ;  # :sparkles: :bug: etc
  ] ;

  gh:action [
    a gh:ShellAction ;
    gh:script """
      echo "✅ Commit message validated"
    """
  ] .
```

## Real-World Example: GitHub Actions

Integrate with CI/CD (`.github/workflows/commit-lint.yml`):

```yaml
name: Commit Lint

on: [pull_request]

jobs:
  commitlint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Run GitVan commit validation
        run: |
          npm install -g gitvan
          gitvan hooks run enforce-semantic-commits --all-commits

      - name: Report results
        if: failure()
        run: echo "❌ Some commits don't follow conventions"
```

## Monitoring: View Validated Commits

See which commits passed validation:

```bash
# View recent commits
gitvan events list --type commit --limit 10

# Export with validation status
gitvan metrics export --format json | jq '.events[] | {message, author, validated}'

# Find commits by type
gitvan events search --pattern "^feat:" --limit 5
```

## Common Issues

### "Pattern too strict"
**Problem**: Valid commits still rejected

**Solution**: Test your regex pattern:
```bash
# Test pattern
echo "feat: add feature" | grep -E "(feat|fix):"

# Should output: feat: add feature
```

### "Too many false positives"
**Problem**: Rejecting valid messages

**Solution**: Broaden the pattern:
```ttl
# Too strict: requires exactly 10+ characters
gh:pattern "(feat|fix):\\s.{10,}"

# Better: at least 5 characters, more flexible
gh:pattern "(feat|fix):\\s.{5,}"
```

### "Team has existing commits that don't match"
**Problem**: Retroactive validation

**Solution**: Run only on new commits:
```bash
# Only new commits on current branch
gitvan hooks run enforce-semantic-commits --since HEAD~10

# Only commits after a certain date
gitvan hooks run enforce-semantic-commits --since 2024-01-01
```

## Benefits

✅ **Consistency**: All commits follow same format
✅ **Automation**: Tools can parse commit type (feat, fix, etc.)
✅ **Changelog Generation**: Automatically generates release notes
✅ **Semantic Versioning**: Auto-increment version based on commits
✅ **Better History**: Easy to understand what changed and why

## Next Steps

1. **Auto-Versioning**: [Auto-Version Bumping How-To](./auto-version-bumping.md)
2. **Changelog**: [Generate Changelog from Commits](./changelog-generation.md)
3. **Deployment**: [Trigger Deployments](./trigger-deployments.md)

## See Also

- **Reference**: [SPARQL Patterns](../reference/sparql-patterns.md)
- **Explanation**: [Semantic Git](../explanation/why-semantic-git.md)

---

**Continue to other How-To Guides or return to main documentation.**
