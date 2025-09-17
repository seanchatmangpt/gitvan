# GitVan v2 Troubleshooting Guide

Welcome to the GitVan v2 troubleshooting guide. This document helps you diagnose and resolve common issues quickly.

## Quick Diagnostics

### System Check
```bash
# Check GitVan installation
gitvan help

# Check Node.js version (>=18.0.0 required)
node --version

# Check pnpm version (>=8.0.0 required)
pnpm --version

# Check Git configuration
git --version
git config --global user.name
git config --global user.email
```

### GitVan Health Check
```bash
# Check daemon status
gitvan daemon status

# List available jobs
gitvan job list

# Check AI provider availability
gitvan llm models

# List worktrees
gitvan worktree list
```

## Common Issues & Solutions

### 1. Installation & Setup Issues

#### Error: `command not found: gitvan`
**Symptoms:** Shell can't find the gitvan command after installation

**Solutions:**
```bash
# If installed globally with npm/pnpm
pnpm install -g gitvan

# If using local installation
npx gitvan help

# Check PATH includes pnpm global bin
echo $PATH | grep pnpm

# Add pnpm to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$HOME/.local/share/pnpm:$PATH"
```

#### Error: `Module not found` or import errors
**Symptoms:** Node.js can't resolve GitVan modules

**Solutions:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Check Node.js version
node --version  # Must be >=18.0.0

# For ESM issues, ensure package.json has "type": "module"
cat package.json | grep '"type"'
```

### 2. CLI Command Issues

#### Error: `Unknown command: <command>`
**Symptoms:** GitVan doesn't recognize the command

**Solutions:**
```bash
# Check available commands
gitvan help

# Common typos and correct versions:
gitvan deamon start    # ❌ Wrong
gitvan daemon start    # ✅ Correct

gitvan events list     # ❌ Wrong
gitvan event list      # ✅ Correct

gitvan jobs run        # ❌ Wrong
gitvan job run         # ✅ Correct
```

#### Jobs not found or failing to run
**Symptoms:** `Job not found: <name>` or job execution errors

**Solutions:**
```bash
# Check jobs directory exists
ls -la jobs/

# Create jobs directory if missing
mkdir -p jobs

# Check job file naming (must be .mjs or .js)
ls jobs/
# Expected: my-job.mjs or my-job/index.mjs

# Test job syntax
node --check jobs/my-job.mjs

# Run with detailed error output
DEBUG=gitvan* gitvan run my-job
```

### 3. Daemon Issues

#### Daemon won't start
**Symptoms:** `gitvan daemon start` fails or exits immediately

**Solutions:**
```bash
# Check if already running
gitvan daemon status

# Stop existing daemon first
gitvan daemon stop

# Start with verbose logging
DEBUG=gitvan:daemon gitvan daemon start

# Check for port conflicts (daemon uses filesystem locks)
lsof +D .git/gitvan/

# Ensure .git directory exists and is writable
ls -la .git/
mkdir -p .git/gitvan
```

#### Daemon stops unexpectedly
**Symptoms:** Daemon was running but stopped

**Solutions:**
```bash
# Check daemon logs
cat .git/gitvan/daemon.log

# Check system resources
df -h .          # Disk space
free -m          # Memory (Linux)
top -l 1 | head  # CPU usage (macOS)

# Restart with error handling
gitvan daemon stop
sleep 2
gitvan daemon start
```

### 4. Git Integration Issues

#### Error: `Not a git repository`
**Symptoms:** GitVan can't find Git repository

**Solutions:**
```bash
# Ensure you're in a Git repository
git status

# Initialize Git repository if needed
git init

# Check for corrupted .git directory
ls -la .git/
git fsck
```

#### Worktree operations failing
**Symptoms:** `gitvan worktree list` fails or shows unexpected results

**Solutions:**
```bash
# Check Git worktree status
git worktree list

# Repair corrupted worktree links
git worktree prune

# For permission issues
chmod -R 755 .git/

# Check Git version (GitVan requires Git 2.20+)
git --version
```

### 5. AI/LLM Provider Issues

#### Error: `LLM call failed` or `Provider not available`
**Symptoms:** AI features don't work

**Solutions:**
```bash
# Check AI provider configuration
gitvan llm models

# For Ollama (local AI)
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama if needed
ollama serve

# Pull required model
ollama pull llama2

# For OpenAI API
# Check API key is set
echo $OPENAI_API_KEY

# Test connection
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models
```

#### Slow AI responses or timeouts
**Symptoms:** AI operations hang or timeout

**Solutions:**
```bash
# For Ollama: check system resources
docker stats        # If using Docker
htop               # Check CPU/memory

# Increase timeout in config
echo '{
  "ai": {
    "timeout": 60000,
    "provider": "ollama"
  }
}' > gitvan.config.json

# Use smaller/faster model
ollama pull llama2:7b  # Instead of larger models
```

### 6. Performance Issues

#### Slow job execution
**Symptoms:** Jobs take too long to complete

**Solutions:**
```bash
# Profile job execution
time gitvan run my-job

# Check for file system issues
df -h .              # Disk space
iostat 1 5          # I/O usage (Linux)

# Optimize Git operations
git gc --aggressive
git repack -ad

# Use lighter Git operations in jobs
# Avoid: git log --all --graph
# Use:   git log --oneline -10
```

#### High memory usage
**Symptoms:** GitVan consuming too much memory

**Solutions:**
```bash
# Monitor memory usage
ps aux | grep gitvan
top -p $(pgrep gitvan)

# Reduce memory usage:
# 1. Limit job concurrency
# 2. Use streaming for large files
# 3. Clear caches regularly

# Restart daemon periodically
echo "0 */6 * * * gitvan daemon stop && gitvan daemon start" | crontab -
```

### 7. File System & Permissions

#### Permission denied errors
**Symptoms:** `EACCES` or permission denied when accessing files

**Solutions:**
```bash
# Check file permissions
ls -la .git/gitvan/

# Fix ownership
sudo chown -R $USER:$USER .git/gitvan/

# Fix permissions
chmod -R 755 .git/gitvan/
chmod 644 .git/gitvan/*.json

# For locked files
lsof +D .git/gitvan/
```

#### Disk space issues
**Symptoms:** `ENOSPC` or disk full errors

**Solutions:**
```bash
# Check disk space
df -h .

# Clean Git repository
git gc --prune=now --aggressive
git clean -fd

# Remove old GitVan logs
find .git/gitvan/ -name "*.log" -mtime +7 -delete

# Clear npm/pnpm cache
pnpm store prune
npm cache clean --force
```

## Debug Mode & Logging

### Enable Debug Logging
```bash
# Full debug output
DEBUG=gitvan* gitvan daemon start

# Specific component debugging
DEBUG=gitvan:daemon gitvan daemon start
DEBUG=gitvan:jobs gitvan run my-job
DEBUG=gitvan:git gitvan worktree list

# Log to file
DEBUG=gitvan* gitvan daemon start 2>&1 | tee debug.log
```

### Log Locations
```bash
# Daemon logs
cat .git/gitvan/daemon.log

# Job execution logs
cat .git/gitvan/jobs/*.log

# Error logs
cat .git/gitvan/error.log

# System logs (macOS)
log show --predicate 'process == "gitvan"' --last 1h

# System logs (Linux)
journalctl -u gitvan --since "1 hour ago"
```

## Recovery Procedures

### Reset GitVan State
```bash
# Stop all GitVan processes
gitvan daemon stop
pkill -f gitvan

# Remove GitVan data (preserves Git history)
rm -rf .git/gitvan/

# Restart fresh
gitvan daemon start
```

### Repair Corrupted Installation
```bash
# Complete reinstall
pnpm uninstall -g gitvan
rm -rf ~/.local/share/pnpm/global/5/node_modules/gitvan
pnpm install -g gitvan@latest

# Reset configuration
rm -f gitvan.config.json
rm -rf .git/gitvan/config/
```

### Emergency Git Recovery
```bash
# If GitVan corrupted Git repository
git fsck --full
git reflog
git reset --hard HEAD

# Restore from backup
cp -r .git.backup .git

# Or clone fresh copy
git clone <remote-url> fresh-copy
```

## When to Seek Help

Contact support or file an issue when:

1. **Data loss occurs** - Git history is corrupted
2. **Security concerns** - Unexpected file access/modifications
3. **Persistent crashes** - After trying all recovery procedures
4. **Performance regression** - Significant slowdown after update
5. **New environment issues** - Works locally but fails in CI/CD

### Information to Include
```bash
# System information
uname -a
node --version
pnpm --version
git --version

# GitVan information
gitvan help
cat package.json | grep version

# Error details
DEBUG=gitvan* gitvan <failing-command> 2>&1
```

## Preventive Measures

### Regular Maintenance
```bash
# Weekly maintenance script
#!/bin/bash
gitvan daemon stop
git gc --prune=now
rm -f .git/gitvan/logs/*.log
gitvan daemon start
```

### Backup Strategy
```bash
# Backup GitVan configuration
tar -czf gitvan-backup.tar.gz .git/gitvan/ gitvan.config.json

# Schedule regular backups
echo "0 2 * * 0 tar -czf gitvan-backup-$(date +%Y%m%d).tar.gz .git/gitvan/" | crontab -
```

### Monitoring Setup
```bash
# Health check script
#!/bin/bash
if ! gitvan daemon status > /dev/null; then
    echo "GitVan daemon down - restarting"
    gitvan daemon start
fi
```

## Next Steps

- Review the [FAQ](./faq.md) for frequently asked questions
- Check [Configuration Guide](../configuration.md) for setup optimization
- See [Performance Tuning](../performance.md) for optimization tips
- Visit [GitHub Issues](https://github.com/sac/gitvan/issues) for known issues