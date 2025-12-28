# GitVan v4 Security Best Practices

Comprehensive security guidelines for Knowledge Hook development.

---

## Table of Contents

1. [Security Model](#security-model)
2. [Secrets Management](#secrets-management)
3. [Command Injection Prevention](#command-injection-prevention)
4. [Graph Security](#graph-security)
5. [Access Control](#access-control)
6. [Audit and Compliance](#audit-and-compliance)
7. [Secure Patterns](#secure-patterns)

---

## Security Model

### Trust Boundaries

```
+------------------+     +-------------------+     +------------------+
|   User Input     |     |   GitVan Core     |     |   External       |
|   (Untrusted)    |---->|   (Sandboxed)     |---->|   Systems        |
+------------------+     +-------------------+     +------------------+
        |                        |                        |
        v                        v                        v
   Validation              Execution                 Authenticated
   Sanitization            Controls                  API Calls
```

### Execution Context

GitVan executes hooks with:
- Process-level isolation
- Configurable timeouts
- Resource limits
- Environment variable filtering

---

## Secrets Management

### Never Hardcode Secrets

**WRONG:**
```turtle
ex:deploy-step rdf:type op:CLIStep ;
    op:command "curl -H 'Authorization: Bearer sk-12345secret' ..." .
```

**CORRECT:**
```turtle
ex:deploy-step rdf:type op:CLIStep ;
    op:command "curl -H 'Authorization: Bearer ${API_TOKEN}' ..." .
```

### Use Environment Variables

```bash
# Set in environment
export API_TOKEN="sk-12345..."
export SLACK_WEBHOOK="https://hooks.slack.com/..."

# Reference in hooks
gitvan hooks evaluate
```

### Secrets in CI/CD

**GitHub Actions:**
```yaml
jobs:
  hooks:
    runs-on: ubuntu-latest
    env:
      API_TOKEN: ${{ secrets.API_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - run: gitvan hooks evaluate
```

**GitLab CI:**
```yaml
hooks:
  script:
    - gitvan hooks evaluate
  variables:
    API_TOKEN: $API_TOKEN  # From CI/CD Settings
```

### Secret Rotation

```turtle
# Use secret versioning
ex:deploy-step rdf:type op:CLIStep ;
    op:command "curl -H 'Authorization: Bearer ${API_TOKEN_V2}' ..." .
```

### Secrets Scanning

Add to pre-commit:
```turtle
ex:secrets-scan rdf:type gh:Hook ;
    gh:hasPredicate ex:always-run ;
    gh:orderedPipelines ex:scan-pipeline .

ex:scan-pipeline rdf:type op:Pipeline ;
    op:steps (ex:run-scan) .

ex:run-scan rdf:type op:CLIStep ;
    op:command "git secrets --scan" ;
    op:failOn "error" .
```

---

## Command Injection Prevention

### Validate Input

**Vulnerable:**
```turtle
ex:process-user-input rdf:type op:CLIStep ;
    op:command "echo {{ userInput }}" .  # Dangerous!
```

**Secure:**
```turtle
ex:process-user-input rdf:type op:CLIStep ;
    op:command "echo {{ userInput | escape }}" .
```

### Use Allowlists

```javascript
// Only allow specific commands
const orchestrator = new HookOrchestrator({
  allowedCommands: [
    'npm',
    'node',
    'git',
    'echo',
    'curl'
  ],
  blockedPatterns: [
    /rm\s+-rf/,
    /chmod\s+777/,
    /eval/,
    /exec/
  ]
});
```

### Avoid Shell Interpolation

**Vulnerable:**
```turtle
ex:dangerous rdf:type op:CLIStep ;
    op:command "bash -c '{{ userCommand }}'" .
```

**Secure:**
```turtle
ex:safe rdf:type op:CLIStep ;
    op:command "npm run {{ taskName | alphanumeric }}" .
```

### Parameter Validation

```javascript
// In custom step implementation
function validateParams(params) {
  const allowedTasks = ['build', 'test', 'lint', 'deploy'];

  if (!allowedTasks.includes(params.taskName)) {
    throw new Error(`Invalid task: ${params.taskName}`);
  }

  return params;
}
```

---

## Graph Security

### Schema Validation with SHACL

```turtle
# Validate all data conforms to schema
ex:schema-validation rdf:type gh:Hook ;
    gh:hasPredicate ex:schema-pred ;
    gh:orderedPipelines ex:validation-pipeline .

ex:schema-pred rdf:type gh:SHACLAllConform ;
    gh:shapesText """
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix gv: <https://gitvan.dev/ontology#> .

        gv:CommandShape a sh:NodeShape ;
            sh:targetClass op:CLIStep ;
            sh:property [
                sh:path op:command ;
                sh:pattern "^[a-zA-Z0-9\\s\\-_./]+$" ;
                sh:message "Commands must be alphanumeric" ;
            ] .
    """ .
```

### Query Injection Prevention

**Vulnerable:**
```javascript
const query = `SELECT * WHERE { ?s ?p "${userInput}" }`;
```

**Secure:**
```javascript
const query = `
  SELECT * WHERE {
    ?s ?p ?value .
    FILTER(?value = $userInput)
  }
`;

const result = await graph.query(query, {
  bindings: { userInput: sanitize(userInput) }
});
```

### Access Control for Graphs

```javascript
// Restrict graph access by category
const registry = new KnowledgeHookRegistry({
  accessControl: {
    'security-hooks': ['admin'],
    'developer-hooks': ['admin', 'developer'],
    'public-hooks': ['*']
  }
});
```

---

## Access Control

### Hook Categories and Permissions

```javascript
// Define role-based access
const orchestrator = new HookOrchestrator({
  permissions: {
    roles: {
      admin: ['*'],
      developer: ['development', 'testing'],
      ci: ['build', 'test', 'deploy-staging']
    },
    users: {
      'ci-bot': 'ci',
      'john@example.com': 'developer'
    }
  }
});
```

### Protected Hooks

```turtle
# Mark hook as protected
ex:production-deploy rdf:type gh:Hook ;
    gv:title "Production Deployment" ;
    gv:protected true ;
    gv:requiredApprovers 2 ;
    gv:allowedRoles ("admin" "release-manager") .
```

### Approval Workflows

```turtle
ex:requires-approval rdf:type gh:Hook ;
    gh:hasPredicate ex:deploy-requested ;
    gh:orderedPipelines ex:approval-pipeline .

ex:approval-pipeline rdf:type op:Pipeline ;
    op:steps (ex:request-approval ex:wait-approval ex:deploy) .

ex:request-approval rdf:type op:HTTPStep ;
    op:url "https://approval.example.com/request" ;
    op:body """{"hook": "production-deploy", "requester": "{{ user }}"}""" .

ex:wait-approval rdf:type op:WaitStep ;
    op:condition "{{ approval.status == 'approved' }}" ;
    op:timeout 86400000 ;  # 24 hours
    op:dependsOn ex:request-approval .

ex:deploy rdf:type op:CLIStep ;
    op:command "npm run deploy:production" ;
    op:dependsOn ex:wait-approval .
```

---

## Audit and Compliance

### Execution Logging

All hook executions are logged to Git Notes:

```javascript
// Automatic audit trail
const result = await orchestrator.evaluate();

// Audit entry created:
// {
//   timestamp: "2024-01-20T10:30:00Z",
//   hookId: "production-deploy",
//   user: "john@example.com",
//   status: "success",
//   duration: 45000,
//   inputs: {...},
//   outputs: {...}
// }
```

### Query Audit Trail

```sparql
PREFIX audit: <https://gitvan.dev/audit#>

SELECT ?execution ?hookId ?user ?timestamp ?status WHERE {
    ?execution rdf:type audit:HookExecution .
    ?execution audit:hookId ?hookId .
    ?execution audit:user ?user .
    ?execution audit:timestamp ?timestamp .
    ?execution audit:status ?status .
} ORDER BY DESC(?timestamp) LIMIT 100
```

### Compliance Hooks

```turtle
# SOC2 Compliance Hook
ex:soc2-compliance rdf:type gh:Hook ;
    gv:title "SOC2 Compliance Check" ;
    gh:hasPredicate ex:always-run ;
    gh:orderedPipelines ex:compliance-pipeline .

ex:compliance-pipeline rdf:type op:Pipeline ;
    op:steps (ex:check-encryption ex:check-access-logs ex:check-secrets) .

ex:check-encryption rdf:type op:CLIStep ;
    op:command "npm run audit:encryption" ;
    op:failOn "error" .

ex:check-access-logs rdf:type op:CLIStep ;
    op:command "npm run audit:access-logs" ;
    op:dependsOn ex:check-encryption .

ex:check-secrets rdf:type op:CLIStep ;
    op:command "npm run audit:secrets" ;
    op:dependsOn ex:check-access-logs .
```

### Change Tracking

```bash
# Track hook changes
git log --oneline -- hooks/

# Review changes before merge
git diff main..feature -- hooks/
```

---

## Secure Patterns

### Defense in Depth

```turtle
ex:secure-deploy rdf:type op:Pipeline ;
    op:steps (
        ex:validate-inputs
        ex:check-permissions
        ex:verify-approvals
        ex:scan-vulnerabilities
        ex:execute-deploy
        ex:verify-deployment
        ex:log-audit
    ) .
```

### Least Privilege

```turtle
# Minimal permissions for step
ex:read-only-step rdf:type op:SPARQLStep ;
    op:query """SELECT ?item WHERE { ... }""" ;
    op:readOnly true .

# Specific file access
ex:limited-file-step rdf:type gv:TemplateStep ;
    gv:allowedPaths ["./reports/", "./logs/"] .
```

### Input Sanitization

```javascript
// Custom sanitization filter
const template = useTemplate({
  filters: {
    sanitize: (value) => {
      if (typeof value !== 'string') return value;
      return value
        .replace(/[<>]/g, '')
        .replace(/['"]/g, '')
        .substring(0, 1000);
    }
  }
});
```

### Timeout and Resource Limits

```turtle
ex:resource-limited-step rdf:type op:CLIStep ;
    op:command "npm run compute" ;
    op:timeout 60000 ;        # 1 minute max
    op:maxMemory 512 ;        # 512MB
    op:maxCpu 50 ;            # 50% CPU
    op:maxOutputSize 1048576 . # 1MB output
```

### Secure HTTP Requests

```turtle
ex:secure-http rdf:type op:HTTPStep ;
    op:url "https://api.example.com/data" ;
    op:method "POST" ;
    op:validateSSL true ;
    op:timeout 30000 ;
    op:headers """{"Authorization": "Bearer ${API_TOKEN}"}""" ;
    op:allowedDomains ["api.example.com", "auth.example.com"] .
```

---

## Security Checklist

### Hook Development

- [ ] No hardcoded secrets
- [ ] Input validation on all user data
- [ ] Command injection prevention
- [ ] Appropriate timeouts set
- [ ] Resource limits configured
- [ ] SHACL validation for schemas

### Deployment

- [ ] Secrets in environment variables
- [ ] CI/CD secrets properly configured
- [ ] Access control configured
- [ ] Audit logging enabled
- [ ] Protected hooks identified

### Maintenance

- [ ] Regular secrets rotation
- [ ] Hook permission review
- [ ] Audit log review
- [ ] Dependency updates
- [ ] Security scanning

---

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do NOT** open a public issue
2. Email: security@gitvan.dev
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Impact assessment
   - Suggested fix (optional)

Response time: Within 48 hours

---

## Next Steps

- [Testing Strategies](../testing/TESTING-GUIDE.md)
- [Best Practices](../api/BEST-PRACTICES.md)
- [Troubleshooting](../TROUBLESHOOTING.md)
