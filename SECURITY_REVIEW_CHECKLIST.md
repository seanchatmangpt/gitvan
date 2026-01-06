# Security Review Checklist

Use this checklist when reviewing code for security issues.

## Pre-Deployment Security Checklist

### Input Validation & Sanitization

- [ ] All user inputs are validated using Zod schemas
- [ ] String inputs are sanitized before use
- [ ] File paths are validated to prevent directory traversal
- [ ] SPARQL queries are validated
- [ ] Cron expressions are validated
- [ ] Git references are validated
- [ ] CLI arguments are validated
- [ ] API request bodies are validated

### Secrets Management

- [ ] No hardcoded secrets in code
- [ ] All secrets loaded from environment variables
- [ ] Environment variables validated on startup
- [ ] Required secrets checked before use
- [ ] Secrets never logged or exposed in error messages
- [ ] `.env` files added to `.gitignore`
- [ ] Pre-commit hook prevents secret commits

### Code Injection Prevention

- [ ] No `eval()` or `Function()` constructor
- [ ] No template string injection
- [ ] Generated code is validated before execution
- [ ] User input properly escaped in code generation
- [ ] No direct string concatenation for code building
- [ ] Dynamic paths resolved safely

### Template Security (Nunjucks)

- [ ] Autoescape enabled for all templates
- [ ] Template strings validated before rendering
- [ ] Template context sanitized (no functions/dangerous properties)
- [ ] Only safe filters allowed
- [ ] Template paths validated to prevent traversal
- [ ] No user-supplied template code execution

### Path Validation

- [ ] No hardcoded absolute paths
- [ ] All paths resolved dynamically
- [ ] Directory traversal prevented (`..` blocked)
- [ ] Paths restricted to appropriate base directories
- [ ] Suspicious patterns detected (`;`, `|`, `&&`, etc.)

### Authentication & Authorization

- [ ] Authentication required for sensitive operations
- [ ] Authorization checks before data access
- [ ] Session management secure (if applicable)
- [ ] Password requirements enforced (if applicable)
- [ ] Rate limiting implemented (if applicable)

### Dependencies & Updates

- [ ] `package-lock.json` present
- [ ] `npm audit` run with no critical/high vulnerabilities
- [ ] Dependencies up-to-date
- [ ] Known vulnerabilities addressed
- [ ] Transitive dependencies reviewed

### Error Handling

- [ ] Errors logged appropriately
- [ ] Error messages don't leak sensitive information
- [ ] Stack traces not exposed to users in production
- [ ] Proper error recovery mechanisms
- [ ] Failed operations handled gracefully

### Data Protection

- [ ] Sensitive data encrypted at rest (if applicable)
- [ ] Sensitive data encrypted in transit (HTTPS)
- [ ] PII handled according to privacy requirements
- [ ] Data retention policies followed
- [ ] Secure data disposal

### Git Security

- [ ] No `.git` directory in production deployments
- [ ] Git hooks execute safely
- [ ] No `--no-verify` or `--skip-hooks` flags
- [ ] GPG signing enforced (if configured)
- [ ] Commit signatures validated

### Configuration Security

- [ ] Secure defaults for all configuration
- [ ] Debug mode disabled in production
- [ ] Verbose logging disabled in production
- [ ] HTTPS enforced in production
- [ ] CORS properly configured (if applicable)

### Testing

- [ ] Security tests included
- [ ] Injection attack tests
- [ ] Authentication/authorization tests
- [ ] Input validation tests
- [ ] Error handling tests

---

## Code Review Security Checklist

### During Code Review

**Input Handling:**
- [ ] Check for missing input validation
- [ ] Verify sanitization functions used correctly
- [ ] Look for SQL/NoSQL injection risks
- [ ] Check for command injection risks
- [ ] Verify SPARQL query validation

**Secrets:**
- [ ] No API keys in code
- [ ] No passwords in code
- [ ] No tokens in code
- [ ] Environment variables used correctly
- [ ] No secrets in logs

**Template Usage:**
- [ ] Nunjucks autoescape enabled
- [ ] Context sanitized before rendering
- [ ] Template paths validated
- [ ] No user-supplied templates executed

**Code Generation:**
- [ ] Safe code generation functions used
- [ ] No string concatenation for code
- [ ] Generated code validated
- [ ] Inputs properly escaped

**File Operations:**
- [ ] Path validation present
- [ ] No directory traversal
- [ ] Permissions checked
- [ ] Error handling present

**Dependencies:**
- [ ] New dependencies justified
- [ ] License compatibility checked
- [ ] Security advisory checked
- [ ] Alternatives considered

---

## Vulnerability Assessment

### Command Injection
**Check for:**
- `eval()`
- `Function()`
- `child_process.exec()` with user input
- Template strings with user input
- String concatenation for code generation

**Mitigation:**
- Use safe code generation utilities
- Validate and sanitize all inputs
- Use AST builders instead of strings
- Validate generated code

### Path Traversal
**Check for:**
- `..` in file paths
- Absolute paths from user input
- `~` expansion
- Variable expansion (`${...}`)

**Mitigation:**
- Use `validateFilePath()` function
- Restrict to base directories
- Reject suspicious patterns
- Use `path.resolve()` and check result

### Template Injection (SSTI)
**Check for:**
- User-supplied template strings
- Unescaped template output
- Functions in template context
- Constructor/prototype access

**Mitigation:**
- Enable autoescape
- Validate template strings
- Sanitize context data
- Use safe filter allowlist

### Secret Exposure
**Check for:**
- Hardcoded API keys
- Passwords in source
- Tokens in configuration
- Secrets in logs
- Secrets in error messages

**Mitigation:**
- Use environment variables
- Secrets manager
- Pre-commit scanning
- Never log sensitive data

### XSS (Cross-Site Scripting)
**Check for:**
- Unescaped user input in HTML
- `|safe` filter usage
- Raw blocks in templates
- innerHTML with user data

**Mitigation:**
- Use autoescape
- Sanitize HTML input
- Content Security Policy
- Validate output encoding

---

## Security Testing

### Test Categories

**1. Input Validation Tests**
```javascript
// Test SQL injection
const maliciousInput = "'; DROP TABLE users; --";
expect(() => sanitizeString(maliciousInput)).not.toThrow();

// Test path traversal
const traversalPath = "../../../etc/passwd";
expect(() => validateFilePath(traversalPath)).toThrow();

// Test command injection
const commandInjection = "; rm -rf /";
expect(() => sanitizeString(commandInjection)).not.toThrow();
```

**2. Template Injection Tests**
```javascript
// Test SSTI
const sstiPayload = "{{ constructor.constructor('return process')() }}";
const validation = validateTemplateString(sstiPayload);
expect(validation.valid).toBe(false);
```

**3. Secrets Detection Tests**
```javascript
// Test secrets scanner
const codeWithSecret = 'const apiKey = "sk-ant-api03-xxxxx";';
const findings = scanContentForSecrets(codeWithSecret);
expect(findings.length).toBeGreaterThan(0);
```

**4. Authorization Tests**
```javascript
// Test unauthorized access
const result = await unauthorizedRequest();
expect(result.status).toBe(403);
```

---

## Incident Response

### If Security Issue Found

1. **Assess Impact**
   - Determine severity (Critical/High/Medium/Low)
   - Identify affected systems
   - Estimate user impact

2. **Contain**
   - Disable affected functionality
   - Revoke compromised credentials
   - Block malicious activity

3. **Fix**
   - Develop and test patch
   - Review fix with security team
   - Deploy to production

4. **Notify**
   - Inform affected users
   - Publish security advisory
   - Report to appropriate authorities

5. **Document**
   - Root cause analysis
   - Lessons learned
   - Process improvements

---

## Security Tools

### Recommended Tools

- **Secrets Detection**: [git-secrets](https://github.com/awslabs/git-secrets), [truffleHog](https://github.com/trufflesecurity/trufflehog)
- **Dependency Scanning**: `npm audit`, [Snyk](https://snyk.io)
- **SAST**: [SonarQube](https://www.sonarqube.org), [ESLint security plugins](https://github.com/nodesecurity/eslint-plugin-security)
- **DAST**: [OWASP ZAP](https://www.zaproxy.org)
- **Container Scanning**: [Trivy](https://github.com/aquasecurity/trivy)

---

## Compliance

### Standards to Follow

- **OWASP Top 10** - Common web vulnerabilities
- **CWE Top 25** - Common software weaknesses
- **SANS Top 25** - Most dangerous software errors
- **Node.js Security Best Practices**

---

## Sign-Off

**Security Reviewer:** _________________________
**Date:** _________________________
**Reviewed Version:** _________________________

**Findings:**
- [ ] No critical issues
- [ ] No high issues
- [ ] Medium issues documented and accepted
- [ ] Low issues documented

**Approval:**
- [ ] Approved for production deployment
- [ ] Conditional approval (see findings)
- [ ] Rejected (must address findings)

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________

---

**Last Updated:** January 6, 2026
**Security Version:** v3.0.0-hardened
