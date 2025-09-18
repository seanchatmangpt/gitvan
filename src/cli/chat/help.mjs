/**
 * GitVan Chat Help Subcommand
 * Shows comprehensive help for chat commands
 */

/**
 * Show help for chat commands
 * @returns {Promise<void>}
 */
export async function helpCommand() {
  console.log(`
🤖 GitVan Chat Commands - AI-Powered Job Generation

GitVan's chat interface uses AI to generate working GitVan jobs from natural language prompts.
All commands generate production-ready code, not skeleton templates.

## 📋 Available Commands

### Core Commands
  gitvan chat draft "Create a backup job"     - Generate job specification (no files)
  gitvan chat generate "Create a test job"    - Generate WORKING job file
  gitvan chat preview "Create a log job"      - Preview WORKING job code
  gitvan chat apply "Create a deploy job" --name "deploy" - Apply with custom name
  gitvan chat explain jobs/hello.mjs         - Explain existing job in plain English
  gitvan chat design "Create CI pipeline"    - Interactive design wizard
  gitvan chat help                            - Show this help

### AI Template Loop Commands
  gitvan chat template "Create React component" - Generate template with AI loop integration
  gitvan chat optimize templates/component.njk   - Optimize template based on execution metrics
  gitvan chat feedback templates/component.njk --rating 5 --comment "Great!" - Collect user feedback
  gitvan chat insights templates/component.njk  - Get comprehensive template insights
  gitvan chat metrics                           - Get system-wide AI metrics
  gitvan chat persist                           - Persist all learning data
  gitvan chat history                           - Show execution history
  gitvan chat clear                             - Clear execution history

### Command Options
  --temp <number>     - Temperature (0.0-1.0, default: 0.7)
  --model <name>      - AI model name (from gitvan.config.js)
  --name <name>       - Custom job name (for apply command)
  --kind <type>       - Job type (job, event, default: job)
  --path <path>       - Custom output path (for generate command)

## 🔄 AI Template Loop System

GitVan's AI Template Loop creates a tight feedback loop between Large Language Models and front-matter templates:

### Learning Components
- **Template Learning**: Tracks execution patterns and learns from success/failure
- **Prompt Evolution**: AI prompts improve based on template execution results
- **Context Awareness**: Generates templates with rich project context
- **Continuous Optimization**: Templates improve based on metrics and user feedback
- **User Feedback Integration**: Collects and integrates user feedback for improvements

### Benefits
- **Self-Improving Templates**: Templates get better with every use
- **Context-Aware Generation**: AI understands project structure and user patterns
- **Learning from Success**: Successful patterns are preserved and reused
- **Failure Pattern Avoidance**: Known failure patterns are avoided
- **User-Driven Improvements**: Templates evolve based on user feedback

## 🎯 Command Workflow

### 1. Design & Plan
\`\`\`bash
# Get design guidance for complex requirements
gitvan chat design "Create a deployment pipeline"
\`\`\`

### 2. Draft Specification
\`\`\`bash
# Generate job specification without creating files
gitvan chat draft "Create a backup job"
\`\`\`

### 3. Preview Code
\`\`\`bash
# See the generated code before creating files
gitvan chat preview "Create a cleanup job"
\`\`\`

### 4. Generate Job
\`\`\`bash
# Create working job file
gitvan chat generate "Create a changelog generator"
\`\`\`

### 5. Apply with Custom Name
\`\`\`bash
# Create job with specific name
gitvan chat apply "Deploy to staging" --name "staging-deploy"
\`\`\`

### 6. Understand Existing Jobs
\`\`\`bash
# Explain what a job does
gitvan chat explain jobs/hello.mjs
gitvan chat explain "backup-job"
\`\`\`

## 🔧 Configuration

Configure AI provider in \`gitvan.config.js\`:

\`\`\`javascript
export default {
  ai: {
    provider: 'ollama',  // or 'openai', 'anthropic', etc.
    model: 'qwen3-coder:30b',
    temperature: 0.7,
    baseURL: 'http://localhost:11434'  // for Ollama
  }
}
\`\`\`

## 📚 Examples

### Simple Automation
\`\`\`bash
gitvan chat generate "Backup important files daily"
gitvan chat apply "Clean temporary files" --name "cleanup"
\`\`\`

### CI/CD Pipeline
\`\`\`bash
gitvan chat design "Create deployment pipeline"
gitvan chat generate "Run tests on push to main"
gitvan chat generate "Deploy on version tag creation"
\`\`\`

### Documentation
\`\`\`bash
gitvan chat generate "Generate changelog from commits"
gitvan chat generate "Update README with project stats"
\`\`\`

### Monitoring
\`\`\`bash
gitvan chat generate "Check for security vulnerabilities"
gitvan chat generate "Monitor build performance metrics"
\`\`\`

## 🎨 Advanced Usage

### Custom Temperature
\`\`\`bash
gitvan chat generate "Create complex job" --temp 0.3  # More deterministic
gitvan chat generate "Create creative job" --temp 0.9  # More creative
\`\`\`

### Event-Based Jobs
\`\`\`bash
gitvan chat generate "Deploy on tag creation" --kind event
gitvan chat generate "Run tests on push" --kind event
\`\`\`

### Custom Paths
\`\`\`bash
gitvan chat generate "Create monitoring job" --path "jobs/monitoring/health-check.mjs"
\`\`\`

## 🚀 Generated Jobs

All generated jobs:
- Use the canonical \`defineJob()\` structure
- Import composables correctly from GitVan
- Implement actual functionality (no TODOs)
- Include comprehensive error handling
- Return proper result objects
- Are immediately runnable

## 🔍 Troubleshooting

### AI Not Available
If AI provider is not configured or unavailable:
- Check \`gitvan.config.js\` configuration
- Ensure Ollama is running (if using Ollama)
- Verify API keys (if using cloud providers)

### Job Not Working
- Use \`gitvan chat explain <job>\` to understand the job
- Check job syntax with \`gitvan job test <job>\`
- Review error logs for specific issues

### Need Help
- Use \`gitvan chat help\` for command reference
- Use \`gitvan chat design\` for complex requirements
- Check GitVan documentation for composable reference

## 📖 Learn More

- GitVan Composables: \`gitvan chat explain jobs/hello.mjs\`
- Event System: \`gitvan chat design "event-based job"\`
- Template System: \`gitvan chat explain jobs/changelog.generate.mjs\`
- Best Practices: \`gitvan chat design "best practices job"\`

Remember: GitVan generates WORKING jobs, not skeleton templates!
`);
}
