# Ollama Setup Guide

This NextJS app integrates with Ollama for local LLM inference, offering privacy-preserving alternatives to cloud APIs.

## Quick Start

### 1. Install Ollama

Download from [ollama.ai](https://ollama.ai)

```bash
# macOS / Linux / Windows
ollama --version
```

### 2. Pull the Ministral Model

```bash
ollama pull ministral-3b
```

The `ministral-3b` model is optimized for:
- Fast inference (3B parameters)
- Low memory usage (~3GB VRAM)
- Good code understanding
- Fast generation speed

### 3. Start Ollama Server

```bash
ollama serve
```

Ollama will start at `http://localhost:11434` (configurable)

### 4. Configure NextJS App

Create `.env.local`:

```bash
# Anthropic Claude (optional - cloud alternative)
ANTHROPIC_API_KEY=sk-...

# Ollama Configuration (local inference)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=ministral-3b

# AI Engine Selection
# Options: 'anthropic', 'ollama', 'auto'
# 'auto' tries Anthropic first, falls back to Ollama
AI_ENGINE_TYPE=auto

# Enable automatic fallback between engines
AI_ENGINE_FALLBACK=true

# Node environment
NODE_ENV=development
```

### 5. Run the App

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`

## Available LLM Models

### Fast & Efficient (Recommended for this app)
- **ministral-3b** - 3B parameters, ~3GB VRAM (default)
- **llama2-uncensored** - 7B parameters, ~5GB VRAM
- **neural-chat** - 7B parameters, ~5GB VRAM

### Powerful but Slower
- **mistral** - 7B parameters, ~5GB VRAM
- **llama2** - 7B parameters, ~5GB VRAM
- **openchat** - 7B parameters, ~5GB VRAM

### Code Focused
- **codellama** - 7B parameters, specialized for code
- **deepseek-coder** - 6B parameters, code-focused

### Install Additional Models

```bash
ollama pull codellama
ollama pull deepseek-coder
ollama pull mistral
```

Then update `.env.local`:
```bash
OLLAMA_MODEL=codellama
```

## API Engine Selection

The app automatically selects between engines based on configuration:

### Option 1: Always Use Ollama (Recommended for Privacy)
```bash
AI_ENGINE_TYPE=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=ministral-3b
```

### Option 2: Always Use Claude (Cloud)
```bash
AI_ENGINE_TYPE=anthropic
ANTHROPIC_API_KEY=sk-...
```

### Option 3: Auto-Switch with Fallback (Best for Reliability)
```bash
AI_ENGINE_TYPE=auto
AI_ENGINE_FALLBACK=true
# Uses Claude if available, falls back to Ollama
```

## Features Using Ollama

These features work with Ollama:

1. **Hook Generation**
   - Generate git hooks with pattern matching
   - AI-powered hook optimization

2. **Code Analysis**
   - Analyze code quality
   - Suggest optimizations
   - Explain changes

3. **Documentation**
   - Generate test cases
   - Create API documentation
   - Explain code

4. **Pattern Recommendations**
   - Recommend best practices
   - Suggest workflow improvements
   - Security risk analysis

## Performance Metrics

### ministral-3b (Default)
- **VRAM Required**: 2-3GB
- **Time to Response**: 500ms-2s per request
- **Throughput**: 10-20 tokens/second
- **Use Case**: Quick feedback, development

### mistral-7b
- **VRAM Required**: 5-8GB
- **Time to Response**: 1-4s per request
- **Throughput**: 5-15 tokens/second
- **Use Case**: Better quality, more analysis

## Troubleshooting

### Ollama Not Responding

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Expected response:
# {"models":[{"name":"ministral-3b:latest",...}]}
```

### Model Not Installed

```bash
# List installed models
ollama list

# Install ministral-3b
ollama pull ministral-3b
```

### High Memory Usage

- Switch to smaller model: `ministral-3b` (3GB) instead of `mistral` (7GB)
- Close other applications
- Enable swap space if needed

### Slow Inference

- Use GPU acceleration if available (CUDA/Metal)
- Switch to faster model: `ministral-3b`
- Increase timeout in `AIEngineSelector` (default 30s)

## Health Checks

The app performs automatic health checks:

```typescript
// Ollama health check (5 second timeout)
GET http://localhost:11434/api/tags

// Claude health check (via API)
// Uses Anthropic's standard API
```

If both engines are unavailable:
- With `AI_ENGINE_FALLBACK=true`: Shows warning but continues
- With `AI_ENGINE_FALLBACK=false`: Fails fast with error

## Privacy & Cost

### Ollama (Local)
- ✅ 100% private (runs on your machine)
- ✅ Zero API costs
- ✅ No data sent to cloud
- ⚠️ Requires local compute power
- ⚠️ Slower than cloud models

### Claude (Cloud)
- ⚠️ Data sent to Anthropic servers
- ⚠️ API costs apply (0.003/1k tokens input)
- ✅ Faster, more powerful models
- ✅ No local compute needed
- ✅ Better at complex reasoning

## Environment Variables Reference

```bash
# Anthropic Claude API (optional)
ANTHROPIC_API_KEY=                # Your API key from console.anthropic.com

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434  # URL where Ollama is running
OLLAMA_MODEL=ministral-3b                # Model name (must be installed)

# Engine Selection
AI_ENGINE_TYPE=auto                # Options: anthropic, ollama, auto
AI_ENGINE_FALLBACK=true             # Fallback to backup engine if primary fails

# Node
NODE_ENV=development                # Options: development, production
```

## Integration Code Examples

### Using the AI Engine Selector

```typescript
import { aiEngineSelector } from '@/lib/ai-engine-selector';

// Automatically selects best available engine
const suggestion = await aiEngineSelector.generateCommitMessage({
  changes: diffContent,
  prefix: 'feat',
});
```

### Using Ollama Directly

```typescript
import { ollamaEngine } from '@/lib/ollama-engine';

const analysis = await ollamaEngine.analyzeCodeQuality(code);
```

### Using Nunjucks Templates

```typescript
import { enhancedWorkflowGenerator } from '@/lib/enhanced-workflow-generator';

const hook = await enhancedWorkflowGenerator.generateHookFromTemplate('basicHook', {
  name: 'my-hook',
  description: 'My automated hook',
  priority: 5,
  triggerType: 'CommitEvent',
  action: 'echo "Hook executed"',
});
```

## Next Steps

1. Start Ollama: `ollama serve`
2. Copy `.env.example` to `.env.local`
3. Update values for your setup
4. Run app: `npm run dev`
5. Check integration tests: `npm run test`

## Support

- Ollama Docs: https://ollama.ai
- Model Library: https://ollama.ai/library
- Issues: Report in GitHub

