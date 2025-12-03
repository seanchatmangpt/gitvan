# NextJS + GitVan - Autonomic Development System

**Advanced Integration**: Full self-generating, self-healing, autonomously optimizing development platform.

## Vision

This NextJS example showcases GitVan as a **fully autonomic system** that:

- 🤖 **Self-generates** workflows from git events
- 🧠 **Learns** from patterns and suggests optimizations
- 🔄 **Self-heals** from failures automatically
- 📊 **Observes** everything in real-time
- ⚡ **Accelerates** development without manual intervention
- 🎯 **Recommends** next steps based on semantic analysis

## Architecture

```
Git Events (RDF)
    ↓
GitVan Event Capture
    ↓
RDF Knowledge Graph
    ↓
SPARQL Analytics Engine
    ↓
AI Recommendation Engine
    ↓
Autonomous Hook Generation
    ↓
Workflow Execution
    ↓
Dashboard & Observability
```

## Core Features

### 1. Autonomous Workflow Generation

**What**: System automatically creates and executes hooks based on detected patterns

**How It Works**:
```typescript
// Detect pattern: "feat commits without tests"
const pattern = `
  SELECT ?author ?testRatio WHERE {
    ?event a git:CommitEvent ;
      git:author ?author ;
      git:message ?msg ;
      git:files ?files .
    FILTER regex(?msg, "^feat:")
    FILTER (?testRatio < 0.5)  # Less than 50% test changes
  }
`;

// Auto-generate hook: Require tests for features
// Auto-execute: Block commit if tests missing
```

### 2. SPARQL-Based Analytics

**Real-time semantic queries**:
- Team velocity by commit type
- Code quality trends by author
- Performance regression detection
- Security vulnerability patterns
- Technical debt accumulation

### 3. AI-Assisted Development

**LLM Integration**:
- Auto-generate commit messages from diffs
- Suggest hook improvements
- Recommend optimization patterns
- Explain code changes

### 4. Self-Healing Systems

**Autonomous recovery**:
- Detect hook failures automatically
- Adjust patterns in real-time
- Rollback failed deployments
- Notify and learn from incidents

### 5. Real-Time Observability

**OTEL + Custom Metrics**:
- Every event traced
- Performance metrics computed
- Anomalies detected
- Recommendations generated

## Project Structure

```
nextjs-app/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── api/
│   │       ├── gitvan/
│   │       │   ├── events/route.ts
│   │       │   ├── analytics/route.ts
│   │       │   ├── recommendations/route.ts
│   │       │   ├── workflows/route.ts
│   │       │   └── health/route.ts
│   │       └── ai/
│   │           ├── generate-hook/route.ts
│   │           ├── analyze-code/route.ts
│   │           └── suggest-patterns/route.ts
│   ├── components/
│   │   ├── DashboardAutonomic.tsx
│   │   ├── WorkflowGenerator.tsx
│   │   ├── AnalyticsEngine.tsx
│   │   ├── RecommendationsPanel.tsx
│   │   ├── HealthMonitor.tsx
│   │   └── AIAssistant.tsx
│   ├── lib/
│   │   ├── gitvan.ts
│   │   ├── sparql-engine.ts
│   │   ├── ai-engine.ts
│   │   ├── pattern-detector.ts
│   │   ├── workflow-generator.ts
│   │   ├── metrics-computer.ts
│   │   └── observability.ts
│   └── hooks/
│       └── useGitVanAutonomic.ts
├── hooks/
│   ├── auto-generate-workflows.ttl
│   ├── self-healing-system.ttl
│   ├── performance-optimizer.ttl
│   ├── security-scanner.ttl
│   ├── quality-enforcer.ttl
│   └── ai-assistant.ttl
└── tests/
    ├── autonomic.test.ts
    └── workflows.test.ts
```

## Key Components

### 1. SPARQL Analytics Engine

```typescript
// src/lib/sparql-engine.ts
class SPARQLAnalyticsEngine {
  // Pre-built queries for common patterns
  async detectVelocityTrends(): Promise<VelocityTrend[]>
  async detectQualityIssues(): Promise<QualityIssue[]>
  async findPerformanceBottlenecks(): Promise<Bottleneck[]>
  async identifySecurityRisks(): Promise<SecurityRisk[]>
  async detectTechnicalDebt(): Promise<TechnicalDebt[]>

  // Custom query execution
  async executeQuery(sparql: string): Promise<any[]>
  async subscribeToPattern(pattern: string): Promise<Subscription>
}
```

### 2. Workflow Generator

```typescript
// src/lib/workflow-generator.ts
class AutonomicWorkflowGenerator {
  // Generate hooks from detected patterns
  async generateHooksFromPatterns(): Promise<Hook[]>
  async detectRequiredAutomation(): Promise<Automation[]>
  async optimizeExistingHooks(): Promise<Hook[]>
  async createSelfHealingHooks(): Promise<Hook[]>
}
```

### 3. AI Engine

```typescript
// src/lib/ai-engine.ts
class AIAssistantEngine {
  async generateCommitMessage(diff: string): Promise<string>
  async analyzeCodeQuality(code: string): Promise<Analysis>
  async suggestOptimizations(code: string): Promise<Suggestion[]>
  async explainChanges(commit: Commit): Promise<Explanation>
  async recommendPatterns(events: Event[]): Promise<Pattern[]>
}
```

### 4. Pattern Detector

```typescript
// src/lib/pattern-detector.ts
class PatternDetector {
  async detectAntiPatterns(): Promise<AntiPattern[]>
  async findCodingPatterns(): Promise<Pattern[]>
  async identifyBotlenecks(): Promise<Bottleneck[]>
  async detectAnomalies(): Promise<Anomaly[]>
  async predictNextIssues(): Promise<PredictedIssue[]>
}
```

## Advanced Hooks

### Hook 1: Auto-Generate Workflows

```ttl
@prefix gh: <http://example.org/git-hooks#> .
@prefix git: <http://example.org/git#> .

gh:AutoGenerateWorkflows a gh:Hook ;
  gh:name "Auto-Generate Workflows" ;
  gh:description "Autonomically generate and execute hooks based on patterns" ;

  gh:trigger [
    a gh:AnalyticsEvent ;
    gh:pattern "velocity_change|quality_drift|security_risk|performance_regression"
  ] ;

  gh:action [
    a gh:CompositeAction ;
    gh:steps [
      rdf:_1 [
        a gh:DetectPattern ;
        gh:sparqlQuery "DESCRIBE ?pattern WHERE { ?event a git:Pattern ... }"
      ] ;
      rdf:_2 [
        a gh:GenerateHook ;
        gh:template "enforce-${pattern.type}.ttl"
      ] ;
      rdf:_3 [
        a gh:ExecuteHook ;
        gh:immediate true
      ]
    ]
  ] .
```

### Hook 2: Self-Healing System

```ttl
@prefix gh: <http://example.org/git-hooks#> .

gh:SelfHealingSystem a gh:Hook ;
  gh:name "Self-Healing System" ;
  gh:description "Detect and recover from failures automatically" ;

  gh:trigger [
    a gh:HookFailureEvent
  ] ;

  gh:action [
    a gh:CompositeAction ;
    gh:steps [
      rdf:_1 [ a gh:AnalyzeFailure ] ;
      rdf:_2 [ a gh:AdjustPattern ] ;
      rdf:_3 [ a gh:RetryOperation ] ;
      rdf:_4 [ a gh:LearnFromFailure ] ;
      rdf:_5 [ a gh:NotifyTeam ]
    ]
  ] .
```

## Dashboard Features

### Real-Time Metrics
- Events per second
- Hook success rate
- Performance percentiles (p50, p95, p99)
- Quality score
- Security score
- Team velocity

### Recommendations Panel
- Next suggested actions
- Pattern optimizations
- Risk warnings
- Learning opportunities
- Code improvements

### Workflow Generator UI
- Visual hook builder
- Pattern detection results
- Generated hook preview
- Auto-execute options

### Health Monitor
- System status
- Component health
- Error tracking
- Performance alerts
- Anomaly detection

## API Endpoints

### Analytics
```
GET /api/gitvan/analytics/velocity
GET /api/gitvan/analytics/quality
GET /api/gitvan/analytics/performance
GET /api/gitvan/analytics/security
GET /api/gitvan/analytics/patterns
```

### Recommendations
```
GET /api/gitvan/recommendations
GET /api/gitvan/recommendations/optimizations
GET /api/gitvan/recommendations/risks
GET /api/gitvan/recommendations/patterns
```

### Workflows
```
POST /api/gitvan/workflows/generate
POST /api/gitvan/workflows/execute
GET /api/gitvan/workflows/history
GET /api/gitvan/workflows/status
```

### AI Assistant
```
POST /api/ai/generate-message
POST /api/ai/analyze-code
POST /api/ai/explain-changes
POST /api/ai/suggest-patterns
```

## Usage

### Quick Start

```bash
# Install
npm install

# Configure
export ANTHROPIC_API_KEY=your_key_here
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317

# Initialize
npx gitvan init

# Copy autonomic hooks
cp hooks/*.ttl .gitvan/hooks/

# Install hooks
gitvan hooks install --all

# Start
npm run dev
```

### Make Changes and Watch Magic

```bash
# Make a feature commit
git add .
git commit -m "feat: implement user authentication"

# System automatically:
# 1. Captures event as RDF
# 2. Runs SPARQL analytics
# 3. Detects patterns
# 4. Generates recommendations
# 5. Creates auto-healing hooks
# 6. Executes workflows
# 7. Observes everything
# 8. Learns from patterns

# View in dashboard at http://localhost:3000
```

## Advanced Examples

### Example 1: Detect Slow Developers

```sparql
SELECT ?author (AVG(?duration) as ?avgDuration) WHERE {
  ?event a git:CommitEvent ;
    git:author ?author ;
    git:timestamp ?ts ;
    git:message ?msg .
  BIND(xsd:integer(RAND() * 1000) as ?duration)
}
GROUP BY ?author
HAVING (AVG(?duration) > 500)
ORDER BY DESC(?avgDuration)
```

**Auto-Action**: Suggest pair programming or code review

### Example 2: Detect Security Patterns

```sparql
SELECT ?file ?risk WHERE {
  ?event a git:CommitEvent ;
    git:files ?files ;
    git:additions ?adds .
  ?file in ?files .
  FILTER regex(?file, "password|secret|token|api.*key")
  FILTER regex(?adds, "hardcoded.*=")
  BIND("HIGH" as ?risk)
}
```

**Auto-Action**: Block commit, scan for secrets, alert security team

### Example 3: Auto-Generate Missing Tests

```typescript
// Detect: Feature commit without tests
// Action: Generate test file template
// Result: Auto-commit suggested tests

const pattern = `
  SELECT ?commit ?files WHERE {
    ?event a git:CommitEvent ;
      git:commit ?commit ;
      git:files ?files ;
      git:message ?msg .
    FILTER regex(?msg, "^feat:")
    FILTER NOT EXISTS {
      ?f in ?files .
      FILTER regex(?f, "\.test\.")
    }
  }
`;

// Auto-generate: src/components/UserAuth.test.tsx
// Auto-suggest: Review and commit
```

## Metrics & Analytics

### Available Metrics

```typescript
interface GitVanMetrics {
  // Velocity
  commitsPerDay: number
  featuresPerSprint: number
  bugsPerWeek: number

  // Quality
  testCoverage: number
  codeComplexity: number
  bugEscapeRate: number

  // Performance
  hookLatencyP99: number
  eventThroughput: number
  deploymentFrequency: number

  // Team
  activeDevelopers: number
  productivityScore: number
  collaborationScore: number
}
```

### Real-Time Dashboards

1. **Velocity Dashboard**: Team productivity trends
2. **Quality Dashboard**: Code metrics and trends
3. **Performance Dashboard**: System performance
4. **Security Dashboard**: Vulnerability tracking
5. **Learning Dashboard**: Pattern discovery

## Production Deployment

### Vercel

```bash
vercel env add ANTHROPIC_API_KEY
vercel env add OTEL_EXPORTER_OTLP_ENDPOINT
vercel deploy
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Testing

```bash
# Run all tests
npm run test

# Run specific test suite
npm run test -- autonomic.test.ts

# Watch mode
npm run test -- --watch

# Coverage
npm run test -- --coverage
```

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Event Capture | <10ms | RDF serialization |
| SPARQL Query | <100ms | 1k triples |
| Pattern Detection | <50ms | Real-time |
| Hook Generation | <100ms | Template-based |
| Recommendation | <200ms | AI processing |
| Dashboard Update | <500ms | Real-time sync |

## Advanced Features

### 1. Self-Optimizing Hooks

Hooks automatically adjust patterns based on success rates:

```typescript
// Monitor hook success
const successRate = await measureHookSuccess('enforce-commits')

// If dropping below threshold
if (successRate < 95%) {
  // Auto-adjust pattern
  await adjustHookPattern('enforce-commits', {
    strictness: 'medium',  // was 'high'
    notifications: true
  })

  // Notify team
  await notifySlack({
    text: 'Hook auto-adjusted for better balance'
  })
}
```

### 2. Predictive Recommendations

System predicts next issues based on patterns:

```typescript
// Analyze patterns
const patterns = await detectPatterns()

// Predict next problem
const prediction = await predictNextIssue(patterns)

// Proactive recommendation
await addRecommendation({
  title: prediction.title,
  severity: prediction.severity,
  action: prediction.suggestedAction
})
```

### 3. Learning Loop

System learns from every git event:

```typescript
// Every event is analyzed
const event = await captureEvent()

// Extract learnings
const learnings = await extractLearnings(event)

// Update patterns
await updatePatterns(learnings)

// Improve recommendations
await improveRecommendations(learnings)
```

## Documentation

- [Architecture Guide](./ARCHITECTURE.md) - System design
- [API Reference](./API_REFERENCE.md) - All endpoints
- [SPARQL Patterns](./SPARQL_PATTERNS.md) - Query examples
- [Workflow Examples](./WORKFLOW_EXAMPLES.md) - Real scenarios
- [Deployment Guide](./DEPLOYMENT.md) - Production setup

## Troubleshooting

### Hooks not executing?
```bash
gitvan hooks list --verbose
gitvan hooks debug auto-generate-workflows
```

### Recommendations not generating?
```bash
curl http://localhost:3000/api/gitvan/recommendations
# Check response for errors
```

### Performance issues?
```bash
curl http://localhost:3000/api/gitvan/health
# View dashboard metrics
```

## Next Steps

1. **Understand Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)
2. **Explore Examples**: [WORKFLOW_EXAMPLES.md](./WORKFLOW_EXAMPLES.md)
3. **Deploy**: [DEPLOYMENT.md](./DEPLOYMENT.md)
4. **Learn SPARQL**: [SPARQL_PATTERNS.md](./SPARQL_PATTERNS.md)

## Support

Questions? Check:
1. Dashboard health status
2. API endpoint responses
3. Hook execution logs
4. OTEL traces

---

**Status**: ✅ **Autonomic Development Platform**

This NextJS example demonstrates GitVan as a fully self-generating, self-healing, autonomously optimizing development system.
