# AI Providers Configuration

GitVan v2 supports multiple AI providers with a unified interface, prioritizing local-first and privacy-preserving options.

## 🏠 Ollama Provider (Default)

**Recommended for most users** - Provides complete local AI processing with no data transmission.

### Installation & Setup

#### 1. Install Ollama
```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows
# Download from https://ollama.ai/download
```

#### 2. Start Ollama Service
```bash
# Start the Ollama daemon
ollama serve

# Verify installation
curl http://localhost:11434/api/tags
```

#### 3. Pull Recommended Models
```bash
# Primary model for code generation
ollama pull qwen3-coder:30b

# Lightweight alternative
ollama pull qwen3-coder:7b

# For documentation and text
ollama pull llama3:8b

# For embeddings
ollama pull nomic-embed-text
```

### Configuration

#### Basic Configuration
```json
{
  "ai": {
    "provider": "ollama",
    "model": "qwen3-coder:30b",
    "baseUrl": "http://localhost:11434"
  }
}
```

#### Advanced Configuration
```json
{
  "ai": {
    "provider": "ollama",
    "model": "qwen3-coder:30b",
    "baseUrl": "http://localhost:11434",
    "defaults": {
      "temperature": 0.7,
      "top_p": 0.8,
      "top_k": 20,
      "repeat_penalty": 1.05,
      "max_tokens": 4096,
      "seed": null
    },
    "models": {
      "code": "qwen3-coder:30b",
      "docs": "llama3:8b",
      "embeddings": "nomic-embed-text"
    }
  }
}
```

### Model Comparison

| Model | Size | RAM | Use Case | Speed | Quality |
|-------|------|-----|----------|-------|---------|
| qwen3-coder:7b | 7B | 8GB | Quick tasks | Very Fast | Good |
| qwen3-coder:30b | 30B | 16GB | Code generation | Fast | Excellent |
| qwen3-coder:70b | 70B | 32GB | Complex tasks | Medium | Outstanding |
| llama3:8b | 8B | 8GB | Documentation | Very Fast | Good |
| nomic-embed-text | 1.5B | 4GB | Embeddings | Very Fast | Excellent |

### Performance Tuning

#### Memory Optimization
```json
{
  "ai": {
    "defaults": {
      "num_ctx": 4096,
      "num_batch": 512,
      "num_gqa": 8,
      "num_gpu": 1,
      "num_thread": 8
    }
  }
}
```

#### GPU Acceleration
```bash
# Enable GPU support (NVIDIA)
OLLAMA_GPU=1 ollama serve

# Check GPU usage
nvidia-smi

# Configure GPU memory
export OLLAMA_GPU_MEMORY_FRACTION=0.8
```

### Troubleshooting

#### Common Issues
```bash
# Check Ollama status
ollama ps

# Restart Ollama
pkill ollama && ollama serve

# Clear model cache
ollama rm qwen3-coder:30b
ollama pull qwen3-coder:30b

# Check logs
tail -f ~/.ollama/logs/server.log
```

#### Model Not Found
```bash
# List available models
ollama list

# Pull missing model
ollama pull qwen3-coder:30b

# Verify model integrity
ollama show qwen3-coder:30b
```

## 🌐 HTTP Provider

**For custom AI endpoints** - Generic HTTP API integration for external providers.

### Configuration
```json
{
  "ai": {
    "provider": "http",
    "http": {
      "baseUrl": "https://api.example.com/v1",
      "apiKey": "${AI_API_KEY}",
      "headers": {
        "Content-Type": "application/json",
        "Authorization": "Bearer ${AI_API_KEY}"
      },
      "endpoints": {
        "generate": "/generate",
        "embed": "/embeddings"
      },
      "requestFormat": "openai",
      "responseFormat": "openai"
    }
  }
}
```

### Request Formats

#### OpenAI Compatible
```javascript
{
  "model": "qwen3-coder:30b",
  "messages": [
    {"role": "user", "content": "Generate a GitVan job"}
  ],
  "temperature": 0.7,
  "max_tokens": 4096
}
```

#### Anthropic Compatible
```javascript
{
  "model": "qwen3-coder:30b",
  "prompt": "Generate a GitVan job",
  "max_tokens": 4096,
  "temperature": 0.7
}
```

#### Custom Format
```javascript
{
  "text": "Generate a GitVan job",
  "parameters": {
    "model": "custom-model",
    "temperature": 0.7
  }
}
```

### Authentication

#### API Key
```bash
export AI_API_KEY="your-api-key"
```

#### Custom Headers
```json
{
  "ai": {
    "http": {
      "headers": {
        "X-API-Key": "${API_KEY}",
        "X-Client-ID": "${CLIENT_ID}",
        "User-Agent": "GitVan/2.0"
      }
    }
  }
}
```

## ☁️ Vercel AI SDK (Future)

**Coming Soon** - Optional cloud provider integration with the Vercel AI SDK.

### Planned Features
- Unified interface for multiple cloud providers
- Streaming responses for real-time feedback
- Built-in rate limiting and retry logic
- Provider fallback and load balancing

### Supported Providers (Planned)
- OpenAI (Qwen3-Coder family)
- Ollama (Qwen3-Coder family)
- Google (Gemini Pro)
- Cohere (Command R+)
- Qwen3-Coder AI
- Hugging Face Inference

### Configuration Preview
```json
{
  "ai": {
    "provider": "vercel",
    "vercel": {
      "apiKey": "${VERCEL_AI_API_KEY}",
      "providers": [
        {
          "name": "openai",
          "model": "qwen3-coder:30b",
          "priority": 1
        },
        {
          "name": "anthropic",
          "model": "qwen3-coder:30b",
          "priority": 2
        }
      ],
      "fallback": true,
      "streaming": true
    }
  }
}
```

## 🔧 Provider Selection

### Automatic Provider Detection
GitVan automatically selects the best available provider:

```javascript
// Priority order:
// 1. Explicitly configured provider
// 2. Ollama (if available)
// 3. HTTP provider (if configured)
// 4. Vercel AI SDK (if configured)
```

### Manual Provider Override
```bash
# Use specific provider for one command
gitvan ai job --provider ollama "Create a deployment job"

# Switch provider temporarily
export GITVAN_AI_PROVIDER=http
gitvan ai chat "Generate documentation"
```

### Provider Health Check
```bash
# Check all providers
gitvan ai status --all

# Check specific provider
gitvan ai status --provider ollama

# Test provider with simple prompt
gitvan ai test --provider ollama "Hello world"
```

## 📊 Performance Comparison

| Provider | Latency | Privacy | Cost | Quality | Offline |
|----------|---------|---------|------|---------|---------|
| Ollama | Low | Excellent | Free | High | Yes |
| HTTP | Medium | Variable | Variable | Variable | No |
| Vercel AI | Medium | Good | Pay-per-use | High | No |

## 🛡 Security & Privacy

### Data Handling by Provider

#### Ollama (Local)
- ✅ No data transmission
- ✅ Complete local processing
- ✅ Full audit control
- ✅ Deterministic results

#### HTTP Provider
- ⚠️ Data sent to external API
- ⚠️ Subject to provider privacy policy
- ⚠️ Network dependency
- ⚠️ Variable data retention

#### Vercel AI SDK
- ⚠️ Data routing through cloud
- ✅ Enterprise privacy options
- ✅ SOC 2 compliant
- ⚠️ Per-provider policies

### Privacy Controls
```json
{
  "ai": {
    "privacy": {
      "redactSensitive": true,
      "allowExternal": false,
      "logRequests": false,
      "hashInputs": true
    }
  }
}
```

## 🔄 Migration Between Providers

### Export/Import Configurations
```bash
# Export current config
gitvan config export ai > ai-config.json

# Import to new environment
gitvan config import ai < ai-config.json

# Migrate models between systems
gitvan ai migrate --from ollama --to http
```

### Provider-Specific Migrations
```bash
# Ollama to HTTP
gitvan ai migrate ollama-to-http --endpoint https://api.example.com

# HTTP to Ollama
gitvan ai migrate http-to-ollama --model qwen3-coder:30b

# Backup/restore models
gitvan ai backup --provider ollama --output models.tar.gz
gitvan ai restore --input models.tar.gz
```

## 📋 Best Practices

### Provider Selection Guidelines

1. **Development**: Use Ollama for privacy and speed
2. **CI/CD**: Consider HTTP providers for consistency
3. **Team Environments**: Evaluate Vercel AI for cost-effectiveness
4. **Sensitive Code**: Always use Ollama for proprietary projects
5. **High Volume**: Optimize for cost and rate limits

### Configuration Management
- Store provider configs in version control
- Use environment variables for secrets
- Test providers before deployment
- Monitor performance and costs
- Have fallback providers configured

### Security Checklist
- [ ] Review provider privacy policies
- [ ] Enable automatic redaction
- [ ] Use API key rotation
- [ ] Monitor data transmission
- [ ] Audit AI operation logs
- [ ] Test provider health regularly

---

Choose the AI provider that best fits your privacy, performance, and cost requirements. Start with Ollama for the best local-first experience, then explore other providers as your needs evolve.