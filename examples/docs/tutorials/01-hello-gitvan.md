# Tutorial 1: Hello GitVan - Your First Hook

**Time**: 15 minutes
**Level**: Beginner
**Goal**: Create and run your first GitVan hook

## What You'll Learn

- How GitVan captures git lifecycle events
- How knowledge hooks work
- How to create a simple hook from scratch
- How to test your hook locally

## Prerequisites

- GitVan installed (`gitvan --version`)
- A git repository (or create one: `git init`)
- Basic understanding of git (commits, branches)

## Part 1: Understanding the Hook (3 minutes)

A GitVan hook is a **reactive pattern** that:
1. **Watches** git events (commits, pushes, merges, etc.)
2. **Matches** against semantic patterns
3. **Triggers** actions when matched

### Example: Prevent Commits to Main Branch

```ttl
@prefix gh: <http://example.org/git-hooks#> .
@prefix git: <http://example.org/git#> .

gh:PreventMainBranchCommit a gh:Hook ;
  gh:name "Prevent Main Branch Commit" ;
  gh:description "Block commits directly to main" ;

  # Trigger: Any commit event
  gh:trigger [
    a git:CommitEvent ;
  ] ;

  # Condition: On main branch
  gh:condition [
    a gh:BranchMatch ;
    gh:pattern "main|master"
  ] ;

  # Action: Reject and notify
  gh:action [
    a gh:ShellAction ;
    gh:script "echo 'ERROR: Direct commits to main are not allowed'; exit 1"
  ] .
```

**What this means**:
- When a commit happens
- Check if it's on main/master
- If yes, reject and show error message

## Part 2: Create Your First Hook (5 minutes)

### Step 1: Create a Hook File

```bash
mkdir -p .gitvan/hooks
touch .gitvan/hooks/hello-world.ttl
```

### Step 2: Add the Hook Content

Edit `.gitvan/hooks/hello-world.ttl`:

```ttl
@prefix gh: <http://example.org/git-hooks#> .
@prefix git: <http://example.org/git#> .

gh:HelloWorld a gh:Hook ;
  gh:name "Hello World" ;
  gh:description "Your first GitVan hook - logs all commits" ;

  # Trigger on every commit
  gh:trigger [
    a git:CommitEvent
  ] ;

  # Simple action: Print message
  gh:action [
    a gh:ShellAction ;
    gh:script """
      echo "⚡ GitVan: Commit captured!"
      echo "   Hook: Hello World"
      echo "   Time: $(date)"
    """
  ] .
```

### Step 3: Install the Hook

```bash
# Register hook with git
gitvan hooks install hello-world

# Verify it's installed
gitvan hooks list
```

Output:
```
Installed Hooks (1):
  ✓ hello-world (Hello World)
```

## Part 3: Test Your Hook (4 minutes)

### Step 1: Make a Commit

```bash
# Create a test file
echo "Testing GitVan" > test.txt

# Add and commit
git add test.txt
git commit -m "test: hello gitvan"
```

### Step 2: See Your Hook in Action

When you commit, you should see:
```
⚡ GitVan: Commit captured!
   Hook: Hello World
   Time: Tue Dec 3 10:15:30 PST 2024
```

### Step 3: Check the Logs

```bash
gitvan logs --tail 5
```

Output:
```
Time       | Event    | Hook         | Status | Duration
-----------|----------|--------------|--------|----------
10:15:30   | commit   | hello-world  | ✓      | 45ms
10:15:29   | pre-comm | hello-world  | ✓      | 12ms
```

### Step 4: View Captured Data

```bash
gitvan events list --latest 1
```

This shows:
- Event type (commit-msg)
- Commit hash
- Author
- File changes
- Full metadata as RDF triples

## Part 4: Enhance Your Hook (3 minutes)

Let's make the hook more useful by capturing metadata:

Edit `.gitvan/hooks/hello-world.ttl`:

```ttl
@prefix gh: <http://example.org/git-hooks#> .
@prefix git: <http://example.org/git#> .
@prefix dcterms: <http://purl.org/dc/terms/> .

gh:HelloWorld a gh:Hook ;
  gh:name "Hello World" ;
  gh:description "Log commits with metadata" ;

  gh:trigger [
    a git:CommitEvent
  ] ;

  gh:condition [
    # Match any commit (no filters)
    a gh:AlwaysMatch
  ] ;

  gh:action [
    a gh:ShellAction ;
    gh:script """
      echo "📝 Commit Details:"
      echo "   Message: {{ .commit.message }}"
      echo "   Author: {{ .commit.author }}"
      echo "   Files: {{ .commit.files | length }}"
      echo "   Insertions: {{ .commit.stats.additions }}"
      echo "   Deletions: {{ .commit.stats.deletions }}"
    """
  ] .
```

Reload and test:
```bash
gitvan hooks reload hello-world
git commit --allow-empty -m "feat: test metadata extraction"
```

## Part 5: Real-World Example (2 minutes)

Here's a practical hook that prevents committing to protected branches:

```ttl
@prefix gh: <http://example.org/git-hooks#> .
@prefix git: <http://example.org/git#> .

gh:ProtectMainBranch a gh:Hook ;
  gh:name "Protect Main Branch" ;
  gh:description "Prevent accidental commits to main/master" ;

  gh:trigger [
    a git:CommitEvent
  ] ;

  gh:condition [
    a gh:BranchMatch ;
    gh:pattern "^(main|master)$" ;  # Regex pattern
    gh:action "reject"
  ] ;

  gh:action [
    a gh:ShellAction ;
    gh:script """
      echo "❌ ERROR: Cannot commit directly to $(git rev-parse --abbrev-ref HEAD)"
      echo ""
      echo "Instead:"
      echo "  1. Create a feature branch: git checkout -b feature/my-changes"
      echo "  2. Make your commits on that branch"
      echo "  3. Create a pull request for review"
      exit 1
    """
  ] .
```

Test it:
```bash
# Create main branch
git checkout -b main

# Try to commit (will fail)
git commit --allow-empty -m "test"
# ERROR: Cannot commit directly to main
```

## Summary

You've learned:
✓ How GitVan hooks work
✓ How to create a `.ttl` hook file
✓ How to register and install hooks
✓ How to trigger and test hooks
✓ How to capture git metadata
✓ How to add conditions and actions

## Next Steps

1. **Tutorial 2**: Setup with your framework
   - [NextJS Setup](./02-nextjs-setup.md)
   - [Express Setup](./03-express-setup.md)
   - [Vue Setup](./04-vue-setup.md)
   - [Django Setup](./05-django-setup.md)

2. **How-To Guides**: Solve specific problems
   - [Enforce Commit Conventions](../how-to/enforce-commit-conventions.md)
   - [Auto-Version Bumping](../how-to/auto-version-bumping.md)
   - [Trigger Deployments](../how-to/trigger-deployments.md)

3. **Reference**: Deep dive into features
   - [Hook Configuration](../reference/hook-configuration.md)
   - [SPARQL Patterns](../reference/sparql-patterns.md)
   - [Git Events](../reference/git-events.md)

## Tips & Tricks

### Debug Your Hook
```bash
# Test without running
gitvan hooks run hello-world --dry-run

# Verbose output
gitvan hooks run hello-world --verbose

# See what triggered
gitvan hooks debug hello-world
```

### Edit a Hook
```bash
# Reload after changes
gitvan hooks reload hello-world

# Or use watch mode
gitvan hooks watch hello-world
```

### View Hook Metrics
```bash
# Statistics
gitvan hooks stats hello-world

# Performance
gitvan hooks perf hello-world
```

---

**Now continue to Tutorial 2** to integrate with your framework of choice.
