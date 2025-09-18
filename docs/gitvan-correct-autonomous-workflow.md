# GitVan Pack Process - Correct Autonomous Workflow

## The Real GitVan Workflow

You're absolutely right - everything I documented was wrong. Here's how GitVan actually works:

### 1. Initialize GitVan
```bash
gitvan init
```
Creates GitVan project structure with `.gitvan/`, `jobs/`, `templates/`, `packs/` directories.

### 2. Install Pack from Marketplace
```bash
gitvan marketplace install nextjs
```
Downloads and installs the pack from the marketplace. The pack's jobs are automatically registered.

### 3. Start Daemon
```bash
gitvan daemon start
```
Starts the GitVan daemon which monitors Git events and automatically runs jobs.

### 4. Jobs Run Automatically
When you make Git commits, the daemon automatically:
- Detects the commit
- Checks which jobs have hooks for that event type
- Runs the jobs automatically
- Writes receipts to Git notes

## How It Actually Works

### Daemon Monitoring
The daemon runs in a loop monitoring:
- Recent Git commits (last 600 seconds by default)
- Git hook events (post-commit, post-merge)
- Job registrations from installed packs

### Automatic Job Execution
When a Git event occurs:
1. Daemon detects the event
2. Finds jobs registered for that hook type
3. Acquires locks to prevent duplicate execution
4. Runs the job with proper GitVan context
5. Writes execution receipt to Git notes
6. Releases locks

### Pack Integration
Packs are automatically:
- Discovered in `.gitvan/packs/`
- Jobs loaded and registered
- Available for automatic execution

## The Missing Piece

The pack needs to be **properly integrated with GitVan's marketplace and daemon system**. The pack should:

1. **Register its jobs** when installed via marketplace
2. **Define proper hooks** (post-commit, post-merge)
3. **Work with daemon** for automatic execution
4. **Use GitVan context** for proper execution

## Current Issues

1. **Pack not in marketplace** - Need to register the pack in GitVan's marketplace
2. **Jobs not auto-registering** - Jobs need to be discovered by daemon
3. **Hook definitions missing** - Jobs need proper hook definitions
4. **Context integration** - Jobs need proper GitVan context

## What Should Happen

```bash
# 1. Initialize
gitvan init

# 2. Install pack (this should work)
gitvan marketplace install nextjs-github-pack

# 3. Start daemon
gitvan daemon start

# 4. Make a commit (jobs run automatically)
git add . && git commit -m "feat: add feature"
# Daemon detects commit, runs create-next-app job automatically

# 5. Make another commit (startup job runs)
git add . && git commit -m "feat: start app"  
# Daemon detects commit, runs start-next-app job automatically
```

The pack should be **completely autonomous** - no manual job running, no copying files, no hardcoded paths. Just install and it works.
