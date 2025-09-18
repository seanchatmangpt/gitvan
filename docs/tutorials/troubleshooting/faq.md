# GitVan v2 Frequently Asked Questions

## Installation & Setup

### Q: What are the minimum system requirements?
**A:** GitVan v2 requires:
- Node.js >= 18.0.0
- pnpm >= 8.0.0 (preferred) or npm >= 9.0.0
- Git >= 2.20.0
- 4GB RAM (8GB recommended for AI features)
- 1GB free disk space

### Q: Can I use npm instead of pnpm?
**A:** While GitVan v2 is optimized for pnpm, you can use npm:
```bash
# Install with npm
npm install -g gitvan

# Run commands
npx gitvan help
```
However, pnpm is recommended for better performance and dependency management.

### Q: Why do I get "Permission denied" during installation?
**A:** This typically happens with global installations:
```bash
# Solution 1: Use npx (no global install needed)
npx gitvan help

# Solution 2: Fix npm/pnpm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc

# Solution 3: Use package manager
# macOS
brew install gitvan

# Linux
sudo apt install gitvan  # If available
```

### Q: How do I update GitVan to the latest version?
**A:** Update depends on your installation method:
```bash
# Global installation
pnpm update -g gitvan

# Check version
gitvan --version

# Or reinstall for clean update
pnpm uninstall -g gitvan
pnpm install -g gitvan@latest
```

## Configuration

### Q: Where should I place my GitVan configuration?
**A:** GitVan looks for configuration in this order:
1. `gitvan.config.js` (current directory)
2. `gitvan.config.json` (current directory)
3. `.gitvan/config.js` (current directory)
4. `~/.gitvan/config.js` (home directory)

Example configuration:
```json
{
  "ai": {
    "provider": "ollama",
    "model": "qwen3-coder:30b",
    "timeout": 30000
  },
  "daemon": {
    "watchInterval": 1000,
    "logLevel": "info"
  }
}
```

### Q: How do I configure AI providers?
**A:** GitVan supports multiple AI providers:

**Ollama (Local AI):**
```json
{
  "ai": {
    "provider": "ollama",
    "baseUrl": "http://localhost:11434",
    "model": "qwen3-coder:30b"
  }
}
```

**OpenAI:**
```json
{
  "ai": {
    "provider": "openai",
    "apiKey": "${OPENAI_API_KEY}",
    "model": "qwen3-coder:30b"
  }
}
```

**Environment Variables:**
```bash
export OPENAI_API_KEY="your-api-key"
export GITVAN_AI_PROVIDER="openai"
export GITVAN_AI_MODEL="qwen3-coder:30b"
```

### Q: Can I disable AI features entirely?
**A:** Yes, AI features are optional:
```json
{
  "ai": {
    "enabled": false
  }
}
```

Or run GitVan without AI commands:
```bash
# These work without AI
gitvan daemon start
gitvan worktree list
gitvan job list

# These require AI
gitvan chat generate
gitvan llm call
```

## Jobs & Workflows

### Q: How do I create my first job?
**A:** Create a jobs directory and add a .mjs file:
```bash
# Create jobs directory
mkdir jobs

# Create simple job
cat > jobs/hello.mjs << 'EOF'
export default async function(ctx) {
  const { useGit } = ctx
  const git = useGit()

  console.log('Current branch:', git.currentBranch())
  return { message: 'Hello from GitVan!' }
}
EOF

# Run the job
gitvan run hello
```

### Q: What's the difference between jobs and events?
**A:**
- **Jobs**: Manual tasks you run explicitly (`gitvan run my-job`)
- **Events**: Automated responses to Git changes (file changes, commits, etc.)

```bash
# Jobs - manual execution
gitvan run deploy
gitvan job run --name test-suite

# Events - automatic triggers
gitvan event list          # See available events
gitvan daemon start        # Enable event watching
```

### Q: How do I pass parameters to jobs?
**A:** Use environment variables or command-line args:
```bash
# Environment variables
DEPLOY_ENV=staging gitvan run deploy

# Command-line args (in development)
gitvan run deploy --env staging --force
```

In your job:
```javascript
export default async function(ctx) {
  const env = process.env.DEPLOY_ENV || 'development'
  const force = process.env.FORCE === 'true'

  console.log(`Deploying to ${env}`)
  // ... deployment logic
}
```

### Q: Can I run multiple jobs in parallel?
**A:** Currently, jobs run sequentially. For parallel execution:
```bash
# Background execution
gitvan run job1 &
gitvan run job2 &
wait

# Or use job orchestration
cat > jobs/parallel-runner.mjs << 'EOF'
import { spawn } from 'child_process'

export default async function(ctx) {
  const jobs = ['test', 'lint', 'build']
  const promises = jobs.map(job =>
    new Promise((resolve, reject) => {
      const child = spawn('gitvan', ['run', job])
      child.on('close', code => code === 0 ? resolve() : reject())
    })
  )

  await Promise.all(promises)
  return { message: 'All jobs completed' }
}
EOF
```

## Daemon & Events

### Q: Why won't the daemon start?
**A:** Common causes and solutions:

1. **Already running:**
```bash
gitvan daemon status
gitvan daemon stop  # Stop first
gitvan daemon start
```

2. **Permission issues:**
```bash
ls -la .git/gitvan/
chmod -R 755 .git/gitvan/
```

3. **Not in Git repository:**
```bash
git init  # Initialize if needed
```

4. **Port conflicts:**
```bash
lsof -i :3000  # Check if port is used
```

### Q: How do I monitor daemon activity?
**A:** Use logging and status commands:
```bash
# Check status
gitvan daemon status

# View logs
cat .git/gitvan/daemon.log

# Real-time monitoring
tail -f .git/gitvan/daemon.log

# Debug mode
DEBUG=gitvan:daemon gitvan daemon start
```

### Q: What events does GitVan watch for?
**A:** GitVan monitors these Git events:
- File changes (add, modify, delete)
- Commits (pre-commit, post-commit)
- Branch changes (checkout, merge)
- Remote operations (push, pull, fetch)

```bash
# List available events
gitvan event list

# Test event simulation
gitvan event simulate --files "src/**/*.js"
```

### Q: How do I create custom event handlers?
**A:** Create event files in the events directory:
```bash
mkdir -p events

cat > events/on-commit.mjs << 'EOF'
export default async function(ctx, event) {
  const { useGit } = ctx
  const git = useGit()

  if (event.type === 'commit') {
    console.log(`New commit: ${event.hash}`)
    // Run tests, send notifications, etc.
  }
}
EOF
```

## AI Integration

### Q: Which AI models work best with GitVan?
**A:** Recommended models by use case:

**Local Development (Ollama):**
- `qwen3-coder:30b` - Fast, good for code completion
- `qwen3-coder:30b` - Specialized for code generation
- `qwen3-coder:30b` - Good balance of speed/quality

**Cloud APIs:**
- `qwen3-coder:30b` - Fast, cost-effective
- `qwen3-coder:30b` - Best quality, slower
- `qwen3-coder:30b` - Good for complex analysis

### Q: How do I reduce AI costs?
**A:** Several strategies:
1. **Use local models (Ollama)**
2. **Cache responses**
3. **Optimize prompts**
4. **Set timeouts**

```json
{
  "ai": {
    "provider": "ollama",
    "cache": true,
    "timeout": 15000,
    "maxTokens": 1000
  }
}
```

### Q: Can I use GitVan without internet?
**A:** Yes, with local AI:
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull model
ollama pull llama2

# Configure GitVan
echo '{
  "ai": {
    "provider": "ollama",
    "model": "qwen3-coder:30b"
  }
}' > gitvan.config.json

# Test offline
gitvan llm call "Hello world"
```

## Git Integration

### Q: Does GitVan modify my Git history?
**A:** No, GitVan never modifies existing Git history. It only:
- Creates new commits when explicitly requested
- Adds Git notes for metadata
- Creates refs in `refs/gitvan/` namespace

Your main Git history remains untouched.

### Q: How does GitVan handle multiple worktrees?
**A:** GitVan supports Git worktrees:
```bash
# List all worktrees
gitvan worktree list

# Start daemon for all worktrees
gitvan daemon start --worktrees all

# Start daemon for specific worktree
cd /path/to/worktree
gitvan daemon start
```

Each worktree has its own daemon and job execution context.

### Q: What happens if I delete .git/gitvan/?
**A:** GitVan data is stored in `.git/gitvan/`:
- Daemon state and logs
- Job execution history
- Configuration cache
- Event handlers

Deleting this directory:
- ✅ Safe - no Git history lost
- ❌ Loses GitVan metadata and logs
- ❌ Stops running daemon
- ❌ Resets configuration

To recover:
```bash
gitvan daemon start  # Recreates directory
```

## Performance & Optimization

### Q: GitVan is running slowly. How can I optimize it?
**A:** Performance optimization steps:

1. **Git repository optimization:**
```bash
git gc --aggressive
git repack -ad
git prune
```

2. **Reduce file watching scope:**
```json
{
  "daemon": {
    "watchPatterns": ["src/**", "docs/**"],
    "ignorePatterns": ["node_modules/**", "*.log"]
  }
}
```

3. **Optimize AI calls:**
```json
{
  "ai": {
    "cache": true,
    "timeout": 10000,
    "maxTokens": 500
  }
}
```

4. **System resources:**
```bash
# Monitor resource usage
top -p $(pgrep gitvan)

# Increase Node.js memory if needed
export NODE_OPTIONS="--max-old-space-size=4096"
```

### Q: How much disk space does GitVan use?
**A:** GitVan storage usage:
- Configuration: < 1MB
- Logs: 10-100MB (rotated automatically)
- Job data: Depends on job outputs
- AI cache: 10-500MB (optional)

Clean up storage:
```bash
# Remove old logs
find .git/gitvan/logs/ -mtime +30 -delete

# Clear AI cache
rm -rf .git/gitvan/cache/ai/

# Compress logs
gzip .git/gitvan/logs/*.log
```

## Migration & Compatibility

### Q: How do I migrate from GitVan v1 to v2?
**A:** v2 is a major rewrite with breaking changes:

1. **Backup v1 data:**
```bash
cp -r .gitvan .gitvan.v1.backup
```

2. **Install v2:**
```bash
pnpm uninstall -g gitvan
pnpm install -g gitvan@2
```

3. **Migrate configuration:**
```bash
# v1 config location: .gitvan/config.json
# v2 config location: gitvan.config.json

# Convert manually or use migration tool (if available)
```

4. **Update job syntax:**
v1 jobs need updating to v2 format. See migration guide.

### Q: Can I use GitVan with monorepos?
**A:** Yes, GitVan works well with monorepos:
```bash
# Start daemon at root
cd /path/to/monorepo
gitvan daemon start

# Create package-specific jobs
mkdir -p jobs/frontend jobs/backend jobs/shared

# Use workspace-aware patterns
cat > jobs/test-all.mjs << 'EOF'
export default async function(ctx) {
  const { exec } = ctx

  // Test each package
  await exec('pnpm', ['-r', 'test'])
  return { message: 'All packages tested' }
}
EOF
```

### Q: Does GitVan work with Git hooks?
**A:** Yes, GitVan complements Git hooks:
- **Git hooks**: Fast, simple scripts
- **GitVan events**: Complex workflows with AI

You can use both together:
```bash
# Git hook triggers GitVan job
cat > .git/hooks/post-commit << 'EOF'
#!/bin/bash
gitvan run post-commit-analysis
EOF

chmod +x .git/hooks/post-commit
```

## Security & Privacy

### Q: What data does GitVan send to AI providers?
**A:** GitVan only sends:
- Code snippets you explicitly ask to analyze
- Commit messages for AI generation
- File diffs for review (if enabled)

GitVan never sends:
- Complete file contents without permission
- Sensitive files (.env, keys, secrets)
- Personal data or credentials

### Q: How do I prevent sensitive data from being sent to AI?
**A:** Configure exclusions:
```json
{
  "ai": {
    "excludePatterns": [
      "**/*.key",
      "**/*.pem",
      "**/.env*",
      "**/secrets/**",
      "**/config/production.js"
    ]
  }
}
```

### Q: Can I audit what GitVan sends to AI?
**A:** Yes, enable audit logging:
```json
{
  "ai": {
    "auditLog": true,
    "logLevel": "debug"
  }
}
```

View audit logs:
```bash
cat .git/gitvan/audit.log
```

## Troubleshooting

### Q: I'm getting "Module not found" errors
**A:** This is usually an ESM/CommonJS issue:
1. Ensure `package.json` has `"type": "module"`
2. Use `.mjs` extension for GitVan jobs
3. Use `import` instead of `require`
4. Check Node.js version (>=18.0.0)

### Q: The daemon keeps crashing
**A:** Debug steps:
```bash
# Check logs
cat .git/gitvan/daemon.log

# Run in foreground with debug
DEBUG=gitvan* gitvan daemon start

# Check system resources
df -h .        # Disk space
free -m        # Memory

# Reset daemon state
rm -rf .git/gitvan/
gitvan daemon start
```

### Q: Jobs run but don't do anything
**A:** Common issues:
1. **Missing context:** Jobs need to use GitVan composables
2. **Async issues:** Make sure to await promises
3. **Error handling:** Check for silent failures

Debug a job:
```bash
# Add logging to job
cat > jobs/debug-job.mjs << 'EOF'
export default async function(ctx) {
  console.log('Job started')
  console.log('Context:', Object.keys(ctx))

  try {
    const { useGit } = ctx
    const git = useGit()
    console.log('Current branch:', git.currentBranch())
  } catch (error) {
    console.error('Error:', error.message)
    throw error
  }

  return { success: true }
}
EOF

gitvan run debug-job
```

## Getting Help

### Q: Where can I get more help?
**A:** Support resources:
- 📖 [Documentation](../README.md)
- 🐛 [GitHub Issues](https://github.com/sac/gitvan/issues)
- 💬 [Discussions](https://github.com/sac/gitvan/discussions)
- 📧 Email: support@gitvan.dev

### Q: How do I report a bug?
**A:** Include this information:
```bash
# System info
uname -a
node --version
pnpm --version
git --version

# GitVan info
gitvan --version
cat gitvan.config.json

# Error reproduction
DEBUG=gitvan* gitvan <failing-command> 2>&1 | tee error.log
```

### Q: How do I contribute to GitVan?
**A:** Contribution steps:
1. Fork the repository
2. Create feature branch
3. Add tests for new features
4. Run test suite: `pnpm test`
5. Submit pull request

See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed guidelines.

---

**Can't find your answer?**
Check the [Troubleshooting Guide](./README.md) or [create an issue](https://github.com/sac/gitvan/issues/new).