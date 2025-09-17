# GitVan v2 Deployment Guide

## Quick Start

GitVan v2 is ready for deployment! Here's how to get started:

### Prerequisites

- Node.js 18+ 
- Git repository
- Ollama (for AI features) - optional but recommended

### Installation

```bash
# Install GitVan
npm install gitvan

# Or with pnpm (recommended)
pnpm add gitvan
```

### Basic Setup

1. **Initialize GitVan in your repository:**
   ```bash
   cd your-repo
   gitvan help
   ```

2. **Create your first job:**
   ```bash
   # Using AI to generate a job
   gitvan chat generate "Create a changelog job that runs on git tags"
   
   # Or create manually in jobs/ directory
   ```

3. **Test your setup:**
   ```bash
   # List available jobs
   gitvan cron list
   
   # Run a job manually
   gitvan run your-job-name
   ```

## Configuration

### Environment Variables

```bash
# AI Configuration
export OLLAMA_BASE_URL="http://localhost:11434"
export GITVAN_MODEL="qwen3-coder:30b"
export GITVAN_LOG_LEVEL="info"

# Runtime Configuration  
export GITVAN_NOW="2024-01-01T00:00:00Z"  # For deterministic testing
export TZ="UTC"
```

### Configuration File

Create `gitvan.config.js` in your repository root:

```javascript
export default {
  // Job configuration
  jobs: {
    dir: "jobs",
    scan: {
      patterns: ["jobs/**/*.mjs", "jobs/**/*.cron.mjs"],
      ignore: ["node_modules/**", ".git/**"]
    }
  },

  // AI configuration
  ai: {
    provider: "ollama",
    model: "qwen3-coder:30b",
    temperature: 0.7
  },

  // Template configuration
  templates: {
    dirs: ["templates"],
    autoescape: false
  },

  // Receipt configuration
  receipts: {
    ref: "refs/notes/gitvan/results",
    enabled: true
  }
}
```

## Commands Reference

### Core Commands

```bash
# Job Management
gitvan cron list                    # List cron jobs
gitvan cron start                   # Start cron scheduler
gitvan cron dry-run                 # Test cron schedule

# Event Management  
gitvan event list                   # List event jobs
gitvan event simulate --files "src/**"  # Simulate file changes

# AI Features
gitvan chat draft "Create a job"    # Draft job specification
gitvan chat generate "Create a job" # Generate job files
gitvan llm call "Summarize commits" # Direct AI calls

# Audit & Receipts
gitvan audit build                  # Build audit pack
gitvan audit list                   # List receipts
gitvan audit verify <id>            # Verify receipt

# Daemon Management
gitvan daemon start                 # Start daemon
gitvan daemon status                # Check daemon status
gitvan daemon stop                  # Stop daemon
```

### Job Types

#### On-Demand Jobs
```javascript
// jobs/hello.mjs
import { defineJob } from "gitvan/define"

export default defineJob({
  meta: { desc: "Hello world job" },
  async run({ ctx, payload }) {
    console.log("Hello World!")
    return { ok: true, artifacts: [] }
  }
})
```

#### Cron Jobs
```javascript
// jobs/cleanup.cron.mjs
import { defineJob } from "gitvan/define"

export default defineJob({
  meta: { desc: "Daily cleanup" },
  cron: "0 2 * * *", // 2 AM daily
  async run({ ctx, payload }) {
    // Cleanup logic
    return { ok: true, artifacts: [] }
  }
})
```

#### Event Jobs
```javascript
// jobs/changelog.evt.mjs
import { defineJob } from "gitvan/define"

export default defineJob({
  meta: { desc: "Generate changelog on tag" },
  on: {
    tagCreate: "v.*"
  },
  async run({ ctx, payload, meta }) {
    // Generate changelog
    return { ok: true, artifacts: [] }
  }
})
```

## AI Integration

### Ollama Setup

1. **Install Ollama:**
   ```bash
   # macOS
   brew install ollama
   
   # Linux
   curl -fsSL https://ollama.com/install.sh | sh
   ```

2. **Pull the recommended model:**
   ```bash
   ollama pull qwen3-coder:30b
   ```

3. **Start Ollama:**
   ```bash
   ollama serve
   ```

### AI Features

- **Job Generation:** `gitvan chat generate "Create a deployment job"`
- **Spec Drafting:** `gitvan chat draft "Create a CI job"`
- **Direct AI Calls:** `gitvan llm call "Explain this code"`
- **Model Management:** `gitvan llm models`

## Production Deployment

### Security Considerations

1. **Sandboxed Operations:** All file operations are sandboxed to prevent directory traversal
2. **Receipt Verification:** All operations generate verifiable receipts in Git notes
3. **Path Safety:** Safe file system utilities prevent unsafe writes
4. **AI Redaction:** Sensitive data is redacted from AI receipts by default

### Performance

- **CTQ-1:** TTFJ ≤ 10 min (Time to First Job)
- **CTQ-2:** p95 runtime ≤ 300 ms (simple jobs)
- **CTQ-3:** 100% receipt coverage
- **CTQ-4:** 0 unsafe writes outside sandbox
- **CTQ-5:** Chat prompt → Zod-valid spec ≥ 95% success
- **CTQ-6:** Lock contention < 1% under concurrent operations

### Monitoring

```bash
# Check daemon status
gitvan daemon status

# Build audit pack
gitvan audit build --out audit.json

# Verify receipts
gitvan audit verify <receipt-id>
```

## Troubleshooting

### Common Issues

1. **AI Not Available:**
   ```bash
   gitvan llm models  # Check AI status
   ollama serve       # Start Ollama if needed
   ```

2. **Job Not Found:**
   ```bash
   gitvan cron list   # List available jobs
   ```

3. **Permission Errors:**
   - Ensure Git repository is properly initialized
   - Check file permissions in jobs/ directory

### Debug Mode

```bash
export GITVAN_LOG_LEVEL="debug"
gitvan <command>
```

## Support

- **Documentation:** See `docs/` directory
- **Examples:** See `playground/` directory  
- **Tests:** Run `pnpm test` for comprehensive testing

## Migration from v1

GitVan v2 is backward compatible with v1 job definitions. Existing jobs will continue to work without modification.

---

**GitVan v2** - AI-powered Git workflow automation with composables and Nunjucks templates.
