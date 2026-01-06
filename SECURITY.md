# GitVan Security Guide

This document outlines the security measures, best practices, and hardening implemented in GitVan.

## Table of Contents

1. [Security Overview](#security-overview)
2. [Security Features](#security-features)
3. [Vulnerability Fixes](#vulnerability-fixes)
4. [Secrets Management](#secrets-management)
5. [Input Validation](#input-validation)
6. [Template Security](#template-security)
7. [Pre-commit Security Hooks](#pre-commit-security-hooks)
8. [Security Best Practices](#security-best-practices)
9. [Reporting Security Issues](#reporting-security-issues)

---

## Security Overview

GitVan implements defense-in-depth security with multiple layers of protection:

- **Input Sanitization**: All user inputs are validated and sanitized
- **Secrets Management**: Centralized, validated secrets handling
- **Template Security**: SSTI prevention in Nunjucks templates
- **Code Generation Security**: Safe code generation without injection
- **Secrets Detection**: Pre-commit hooks prevent secret commits
- **Dependency Security**: Regular audits and updates

---

## Security Features

### 1. Input Sanitization (`src/security/input-sanitizer.mjs`)

All user inputs are sanitized using dedicated functions:

- `sanitizeString()` - Remove dangerous characters
- `sanitizeIdentifier()` - Validate variable/function names
- `sanitizeJobSpec()` - Validate job specifications
- `validateFilePath()` - Prevent directory traversal
- `validateSparqlQuery()` - Prevent SPARQL injection
- `validateCronExpression()` - Validate cron syntax
- `validateGitRef()` - Validate Git references

**Example:**

```javascript
import { sanitizeJobSpec } from './src/security/input-sanitizer.mjs';

const rawSpec = getUserInput();
const safeSpec = sanitizeJobSpec(rawSpec); // Validated and sanitized
```

### 2. Secure Code Generation (`src/security/code-generator.mjs`)

Generates safe job code without template injection:

- Dynamic path resolution (no hardcoded paths)
- Proper string escaping
- Code validation before execution
- AST parsing for verification

**Example:**

```javascript
import { generateSafeJobCode, validateGeneratedCode } from './src/security/code-generator.mjs';

const spec = sanitizeJobSpec(userInput);
const code = generateSafeJobCode(spec);
const validation = validateGeneratedCode(code);

if (!validation.valid) {
  throw new Error('Generated code failed validation');
}
```

### 3. Secrets Management (`src/security/secrets-manager.mjs`)

Centralized secrets handling with validation:

- Environment variable validation
- Required secrets checking
- Safe secrets retrieval
- Integration-specific secrets

**Example:**

```javascript
import { getSecretsManager, validateEnvironmentOnStartup } from './src/security/secrets-manager.mjs';

// Validate on startup
validateEnvironmentOnStartup({
  requireGitHub: true,
  requireAI: true,
  failOnMissing: true
});

// Get secrets safely
const manager = getSecretsManager();
const githubToken = manager.get('GITHUB_TOKEN');
```

### 4. Template Sanitization (`src/security/template-sanitizer.mjs`)

Prevents Server-Side Template Injection (SSTI):

- Template validation
- Context sanitization
- Safe filter allowlist
- Path validation

**Example:**

```javascript
import {
  sanitizeTemplateContext,
  validateTemplateString,
  createSecureRenderFunction
} from './src/security/template-sanitizer.mjs';

// Validate template
const validation = validateTemplateString(templateString);
if (!validation.valid) {
  throw new Error('Template validation failed');
}

// Sanitize context
const safeContext = sanitizeTemplateContext(userContext);

// Render safely
const render = createSecureRenderFunction(nunjucksEnv);
const output = await render('template.njk', safeContext);
```

### 5. Secrets Scanner (`src/security/secrets-scanner.mjs`)

Detects secrets before commit:

- Pattern-based detection
- Multiple secret types (API keys, tokens, passwords)
- Severity classification
- Pre-commit integration

**Example:**

```javascript
import { scanFile, preCommitHook } from './src/security/secrets-scanner.mjs';

// Scan a file
const findings = await scanFile('config.js');

// Pre-commit hook
const result = await preCommitHook(stagedFiles);
if (!result.passed) {
  console.error('Secrets detected!');
  process.exit(1);
}
```

---

## Vulnerability Fixes

### PHASE 1: Critical Security Fixes (COMPLETED)

#### 1. Command Injection Vulnerability (CRITICAL) ✅

**Issue**: Template injection in code generation allowed arbitrary code execution.

**Fix**:
- Replaced string templates with proper escaping
- Added input sanitization for all spec parameters
- Implemented code validation before execution
- Dynamic path resolution instead of hardcoded paths

**Files Fixed**:
- `src/ai/provider.mjs`
- `src/security/code-generator.mjs`
- `src/security/input-sanitizer.mjs`

#### 2. Hardcoded Paths (HIGH) ✅

**Issue**: Hardcoded path `/Users/sac/gitvan/src/index.mjs` won't work on other systems.

**Fix**:
- Dynamic path resolution using `fileURLToPath` and `import.meta.url`
- Configuration-based paths
- Relative imports where appropriate

**Files Fixed**:
- `src/ai/provider.mjs` - All instances replaced with `getGitVanImportPath()`
- `src/security/code-generator.mjs` - Dynamic path resolution

#### 3. Inconsistent Secrets Handling (HIGH) ✅

**Issue**: Mixed environment variables, parameters, and hardcoded values for secrets.

**Fix**:
- Centralized `SecretsManager` class
- Environment variable validation on startup
- Required secrets checking
- Safe secret retrieval API

**Files Fixed**:
- Created `src/security/secrets-manager.mjs`
- Updated integration files to use `SecretsManager`

#### 4. Nunjucks SSTI Vulnerability (MEDIUM) ✅

**Issue**: Server-Side Template Injection risk in Nunjucks templates.

**Fix**:
- Template validation before rendering
- Context sanitization
- Safe filter allowlist
- Dangerous pattern detection

**Files Fixed**:
- Created `src/security/template-sanitizer.mjs`
- Added validation to template rendering

### PHASE 2: Input Validation & Sanitization (COMPLETED)

#### 5. File Path Validation ✅

**Issue**: Directory traversal attacks possible.

**Fix**:
- Path validation using `validateFilePath()`
- Directory traversal prevention (`..` detection)
- Suspicious pattern checking
- Base path restrictions

#### 6. CLI Argument Validation ✅

**Issue**: No validation of CLI arguments.

**Fix**:
- Zod schemas for all inputs
- Type-safe command processing
- Input sanitization before use

#### 7. API Input Validation ✅

**Issue**: No validation of API requests.

**Fix**:
- SPARQL query validation
- Cron expression validation
- Git reference validation
- Request body validation

#### 8. Environment Variable Validation ✅

**Issue**: No validation of environment variables.

**Fix**:
- Startup validation with `validateEnvironmentOnStartup()`
- Zod schema for all environment variables
- Required variable checking
- Type validation

---

## Secrets Management

### Environment Variables

GitVan uses environment variables for all sensitive configuration:

```bash
# GitHub Integration
export GITHUB_TOKEN="ghp_..."
export GITHUB_REPOSITORY="user/repo"

# Slack Integration
export SLACK_WEBHOOK_URL="https://hooks.slack.com/..."
export SLACK_BOT_TOKEN="xoxb-..."
export SLACK_DEFAULT_CHANNEL="#general"

# AI Provider
export AI_PROVIDER="anthropic"
export ANTHROPIC_API_KEY="sk-ant-..."
export OLLAMA_BASE_URL="http://localhost:11434"

# GitVan Configuration
export GITVAN_HOME="$HOME/.gitvan"
export GITVAN_REPO="$(pwd)"
```

### Best Practices

1. **Never commit secrets** - Use `.gitignore` for sensitive files
2. **Use environment variables** - Store secrets in env vars
3. **Validate on startup** - Fail fast if required secrets missing
4. **Rotate regularly** - Change secrets periodically
5. **Limit scope** - Use least-privilege principles

---

## Input Validation

### Validation Layers

1. **Schema Validation** (Zod)
2. **Sanitization** (Input Sanitizer)
3. **Business Logic Validation**
4. **Output Encoding**

### Example: Job Specification Validation

```javascript
import { z } from 'zod';
import { sanitizeJobSpec } from './src/security/input-sanitizer.mjs';

// 1. Schema validation
const JobInputSchema = z.object({
  name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/),
  desc: z.string().max(500),
  tags: z.array(z.string()).max(20)
});

const rawInput = getUserInput();
const validatedInput = JobInputSchema.parse(rawInput);

// 2. Sanitization
const sanitized = sanitizeJobSpec(validatedInput);

// 3. Use safely
const code = generateSafeJobCode(sanitized);
```

---

## Template Security

### SSTI Prevention

Nunjucks templates are secured against Server-Side Template Injection:

1. **Template Validation** - Scan for dangerous patterns
2. **Context Sanitization** - Remove functions and dangerous properties
3. **Safe Filters** - Allowlist of safe filters only
4. **Autoescape** - Enabled by default

### Dangerous Patterns Blocked

- `process.*`
- `global.*`
- `require()`
- `eval()`
- `Function()`
- Constructor access
- Prototype pollution

### Example: Safe Template Rendering

```javascript
import {
  createSafeNunjucksConfig,
  sanitizeTemplateContext,
  validateTemplateString
} from './src/security/template-sanitizer.mjs';
import nunjucks from 'nunjucks';

// Create safe environment
const config = createSafeNunjucksConfig({ autoescape: true });
const env = nunjucks.configure('templates', config);

// Validate template
const template = readTemplateFile('user-template.njk');
const validation = validateTemplateString(template);
if (!validation.valid) {
  throw new Error('Template validation failed');
}

// Sanitize context
const userContext = { name: 'User', data: {} };
const safeContext = sanitizeTemplateContext(userContext);

// Render safely
const output = env.renderString(template, safeContext);
```

---

## Pre-commit Security Hooks

### Installation

Install the pre-commit hook:

```bash
# Make hook executable
chmod +x hooks/pre-commit-security

# Install as Git hook
ln -s ../../hooks/pre-commit-security .git/hooks/pre-commit
```

### What It Checks

1. **Secrets Detection** - Scans for API keys, tokens, passwords
2. **Sensitive Files** - Blocks commit of `.env`, `credentials.json`
3. **Hardcoded Credentials** - Detects hardcoded passwords
4. **Private Keys** - Detects SSH/GPG private keys

### Bypassing (NOT Recommended)

Only bypass in emergency:

```bash
git commit --no-verify -m "Emergency fix"
```

**Warning**: This skips all security checks. Use with extreme caution.

---

## Security Best Practices

### For Developers

1. **Input Validation**
   - Always validate and sanitize user input
   - Use Zod schemas for type safety
   - Validate at system boundaries

2. **Secrets Handling**
   - Never hardcode secrets
   - Use environment variables
   - Validate secrets on startup

3. **Template Security**
   - Validate templates before rendering
   - Sanitize context data
   - Use autoescape

4. **Code Generation**
   - Use secure code generation utilities
   - Validate generated code
   - Never use string concatenation

5. **Dependencies**
   - Regular `npm audit`
   - Keep dependencies updated
   - Review security advisories

### For Users

1. **Environment Setup**
   - Use `.env` files (not committed)
   - Set appropriate file permissions
   - Rotate secrets regularly

2. **Git Hygiene**
   - Don't commit sensitive files
   - Use `.gitignore`
   - Review commits before pushing

3. **Updates**
   - Keep GitVan updated
   - Apply security patches
   - Monitor security advisories

---

## Security Checklist

Before deployment:

- [ ] All input validated and sanitized
- [ ] No hardcoded secrets
- [ ] Environment variables validated
- [ ] Templates validated
- [ ] Pre-commit hooks installed
- [ ] Dependencies audited (`npm audit`)
- [ ] No known vulnerabilities
- [ ] HTTPS enforced (production)
- [ ] Rate limiting implemented
- [ ] Error messages don't leak information

---

## Reporting Security Issues

If you discover a security vulnerability in GitVan:

1. **Do NOT** create a public GitHub issue
2. Email security concerns to: [security contact]
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and work with you to address the issue.

---

## Security Updates

### Current Version: v3.0.0 (Hardened)

**Recent Security Enhancements:**

- ✅ Fixed command injection vulnerability
- ✅ Implemented input sanitization
- ✅ Added secrets management
- ✅ Template SSTI prevention
- ✅ Pre-commit secrets scanning
- ✅ Environment validation
- ✅ Dependency auditing

### Security Advisories

Monitor our security advisories at:
- GitHub Security Advisories
- [CHANGELOG.md](/home/user/gitvan/CHANGELOG.md)
- Release notes

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [SSTI Prevention](https://portswigger.net/web-security/server-side-template-injection)
- [Secrets Detection Tools](https://github.com/awslabs/git-secrets)

---

**Last Updated**: January 6, 2026
**Security Version**: v3.0.0-hardened
