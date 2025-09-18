# GitVan v2 AI Integration

**Revolutionary AI-powered Git workflow automation with local-first, privacy-preserving design**

GitVan v2 introduces groundbreaking AI capabilities that transform how you interact with Git repositories. Built with privacy and local-first principles, GitVan's AI features provide intelligent automation while keeping your code and data secure.

## 🚀 Key Features

### 🏠 Local-First AI with Ollama
- **Default Provider**: Ollama integration for completely local AI processing
- **No Data Leakage**: Your code never leaves your machine
- **Optimized Models**: Pre-configured with `qwen3-coder:30b` for superior code generation
- **Zero Dependencies**: Works offline once models are downloaded

### 💬 Conversational Job Generation
- **Chat Interface**: Natural language job creation and refinement
- **Context Aware**: Understands your Git repository structure and history
- **Template Driven**: Uses Nunjucks templates for consistent, high-quality output
- **Interactive Refinement**: Iteratively improve jobs through conversation

### 🔒 Privacy & Security by Design
- **Redaction by Default**: Sensitive data automatically filtered
- **Git-Native Receipts**: Complete audit trail stored in Git notes
- **Deterministic Controls**: Reproducible results with seeds and parameters
- **Hash Verification**: Content integrity through cryptographic fingerprints

### ⚡ Intelligent Automation
- **Changelog Generation**: AI-powered release notes and changelogs
- **Code Review Summaries**: Automated PR analysis and documentation
- **Development Diaries**: Track progress with AI-generated insights
- **Template Generation**: Create reusable templates from natural language

## 🛠 Quick Start

### 1. Install Ollama
```bash
# Install Ollama locally
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
ollama serve

# Pull the recommended model
ollama pull qwen3-coder:30b
```

### 2. Configure GitVan AI
```bash
# Enable AI features in your GitVan config
gitvan config set ai.provider ollama
gitvan config set ai.model qwen3-coder:30b
gitvan config set ai.defaults.temperature 0.7
```

### 3. Generate Your First AI Job
```bash
# Start an AI conversation to create a new job
gitvan ai chat "Create a job that generates release notes from Git commits"

# Or use the job generator directly
gitvan ai job --desc "Release notes generator" --template changelog
```

## 🎯 Core AI Capabilities

### Job Generation
Create GitVan jobs through natural language conversation:

```bash
# Interactive job creation
gitvan ai chat "I need a job that automatically tags releases when package.json version changes"

# Direct job generation
gitvan ai job --desc "Auto-tagger" --on "file:package.json" --body "tag based on version"
```

### Template-Driven Prompts
All AI generation uses battle-tested Nunjucks templates:

- **Job Writer**: Generates complete GitVan job modules
- **Event Handler**: Creates event-driven automation
- **Changelog**: Produces formatted release documentation
- **Dev Diary**: Captures development progress
- **Template Generator**: Creates reusable templates

### Deterministic AI
Control AI behavior for consistent results:

```javascript
// Deterministic generation with seeds
await generateText({
  prompt: "Create a Git pre-commit hook",
  options: {
    seed: 12345,
    temperature: 0.1,
    top_p: 0.9
  }
});
```

## 🔐 Privacy & Audit Features

### Git-Native Receipts
Every AI operation creates an audit trail:

```bash
# View AI operation history
git notes --ref=refs/notes/gitvan/ai list

# Inspect specific AI generation
git notes --ref=refs/notes/gitvan/ai show <commit>
```

### Content Verification
Verify AI-generated content integrity:

```javascript
{
  "output": "generated content",
  "promptHash": "sha256:abc123...",
  "outputHash": "sha256:def456...",
  "fingerprint": "deterministic-signature",
  "model": "qwen3-coder:30b",
  "duration": 1247
}
```

### Automatic Redaction
Sensitive patterns are automatically filtered:

- API keys and tokens
- Email addresses and PII
- Internal file paths
- Private repository URLs

## 🌟 Advanced Workflows

### AI-Powered Changelog Generation
```bash
# Generate changelog from Git history
gitvan ai changelog --from v1.0.0 --to HEAD --style conventional

# Output: Formatted changelog with categorized changes
```

### Code Review Automation
```bash
# Generate PR review summary
gitvan ai review --pr 123 --focus security,performance

# Create code review checklist
gitvan ai checklist --files src/ --type security-audit
```

### Development Diary
```bash
# Generate daily development summary
gitvan ai diary --date today --include commits,prs,issues

# Track weekly progress
gitvan ai diary --week --template progress-report
```

## 🔧 Configuration

### AI Provider Configuration
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
      "max_tokens": 4096
    },
    "privacy": {
      "redactSensitive": true,
      "storeHashes": true,
      "auditLevel": "full"
    }
  }
}
```

### Model Management
```bash
# Check model availability
gitvan ai status

# Pull new models
gitvan ai pull qwen3-coder:70b

# List available models
gitvan ai models
```

## 📊 Performance & Quality

### Benchmarks
- **qwen3-coder:30b**: Optimized for code generation with 87% accuracy
- **Local Processing**: 2-5s generation time on modern hardware
- **Memory Efficient**: 16GB RAM recommended for 30B model
- **Quality Metrics**: High coherence with GitVan patterns

### Model Recommendations
| Use Case | Recommended Model | Memory | Speed |
|----------|------------------|---------|-------|
| Job Generation | qwen3-coder:30b | 16GB | Fast |
| Code Review | qwen3-coder:70b | 32GB | Medium |
| Documentation | llama3:8b | 8GB | Very Fast |
| Embeddings | nomic-embed-text | 4GB | Very Fast |

## 🚀 Future Roadmap

### Planned Integrations
- **Vercel AI SDK**: Optional cloud provider support
- **Custom HTTP Providers**: Generic REST API integration
- **Multi-Modal**: Image and diagram generation
- **Vector Search**: Semantic code search and similarity

### Advanced Features
- **Collaborative AI**: Team-based model fine-tuning
- **Workflow Learning**: AI learns from successful patterns
- **Cross-Repository**: Multi-repo context and insights
- **Real-time Assistance**: Live coding suggestions

## 🛡 Security Considerations

### Local-First Benefits
- No data transmission to external services
- Complete control over model behavior
- Audit trail stored locally in Git
- Deterministic and reproducible results

### Privacy Controls
- Automatic sensitive data detection
- Configurable redaction patterns
- Hash-based content verification
- Optional telemetry with user consent

### Best Practices
1. **Use Strong Models**: qwen3-coder:30b+ for production
2. **Monitor Output**: Review AI-generated code before commit
3. **Version Control**: Store AI configurations in Git
4. **Audit Regularly**: Check AI operation logs
5. **Update Models**: Keep models current for best results

---

**GitVan v2 AI: Where Privacy Meets Intelligence**

Experience the future of Git workflow automation with AI that respects your privacy and enhances your productivity. Get started today and discover how local-first AI can transform your development workflow.