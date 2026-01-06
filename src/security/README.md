# GitVan Security Module

Comprehensive security utilities for GitVan v3.0.0+

## Overview

This module provides defense-in-depth security for GitVan through:

- **Input Sanitization** - Validate and sanitize all user inputs
- **Code Generation Security** - Safe code generation without injection
- **Secrets Management** - Centralized, validated secrets handling
- **Template Security** - SSTI prevention for Nunjucks templates
- **Secrets Detection** - Pre-commit scanning to prevent secret commits
- **Startup Validation** - Environment and configuration validation

## Modules

### 1. Input Sanitizer (`input-sanitizer.mjs`)

Sanitizes and validates all user inputs to prevent injection attacks.

**Functions:**
- `sanitizeString(input, options)` - Remove dangerous characters
- `sanitizeIdentifier(identifier)` - Validate variable/function names
- `sanitizeJobSpec(spec)` - Validate job specifications
- `validateFilePath(filePath, basePath)` - Prevent directory traversal
- `sanitizeEnvVar(value)` - Clean environment variables
- `containsSecrets(input)` - Detect potential secrets
- `validateSparqlQuery(query)` - Prevent SPARQL injection
- `validateCronExpression(cronExpr)` - Validate cron syntax
- `validateGitRef(ref)` - Validate Git references

**Example:**
```javascript
import { sanitizeString, validateFilePath } from './input-sanitizer.mjs';

const userInput = "user input with \0 null bytes";
const safe = sanitizeString(userInput); // ✅ Sanitized

validateFilePath('../../../etc/passwd'); // ❌ Throws error
validateFilePath('templates/safe.njk');  // ✅ Allowed
```

### 2. Code Generator (`code-generator.mjs`)

Generates safe JavaScript code without injection vulnerabilities.

**Functions:**
- `getGitVanImportPath()` - Dynamic import path resolution
- `generateSafeJobCode(spec)` - Generate safe job code
- `validateGeneratedCode(code)` - Validate code before execution

**Example:**
```javascript
import { generateSafeJobCode, validateGeneratedCode } from './code-generator.mjs';

const spec = {
  name: 'my-job',
  desc: 'Job description',
  tags: ['automation']
};

const code = generateSafeJobCode(spec);
const validation = validateGeneratedCode(code);

if (!validation.valid) {
  throw new Error('Code validation failed');
}
```

### 3. Secrets Manager (`secrets-manager.mjs`)

Centralized secrets management with validation.

**Classes:**
- `SecretsManager` - Main secrets manager

**Functions:**
- `getSecretsManager()` - Get global instance
- `resetSecretsManager()` - Reset (for testing)
- `validateEnvironmentOnStartup(options)` - Startup validation

**Example:**
```javascript
import { getSecretsManager, validateEnvironmentOnStartup } from './secrets-manager.mjs';

// Validate on startup
validateEnvironmentOnStartup({
  requireGitHub: true,
  requireAI: true,
  failOnMissing: true
});

// Use secrets
const manager = getSecretsManager();
const token = manager.get('GITHUB_TOKEN');
```

### 4. Template Sanitizer (`template-sanitizer.mjs`)

Prevents Server-Side Template Injection (SSTI) in Nunjucks templates.

**Functions:**
- `sanitizeTemplateContext(context, options)` - Remove dangerous properties
- `validateTemplateString(templateString, options)` - Detect dangerous patterns
- `createSafeNunjucksConfig(options)` - Safe Nunjucks configuration
- `addSafeFilter(env, name, filterFn, options)` - Add filters safely
- `sanitizeTemplatePath(templatePath, basePath)` - Validate template paths
- `createSecureRenderFunction(env, options)` - Secure rendering wrapper
- `auditTemplate(templateString)` - Security audit

**Example:**
```javascript
import {
  sanitizeTemplateContext,
  validateTemplateString,
  createSafeNunjucksConfig
} from './template-sanitizer.mjs';
import nunjucks from 'nunjucks';

// Validate template
const template = '{{ userName }}';
const validation = validateTemplateString(template);

if (!validation.valid) {
  throw new Error('Template validation failed');
}

// Sanitize context
const context = { userName: 'Alice', adminAccess: true };
const safeContext = sanitizeTemplateContext(context);

// Configure safely
const config = createSafeNunjucksConfig({ autoescape: true });
const env = nunjucks.configure('templates', config);

// Render
const output = env.renderString(template, safeContext);
```

### 5. Secrets Scanner (`secrets-scanner.mjs`)

Scans code for secrets before commits.

**Functions:**
- `scanContentForSecrets(content, filePath)` - Scan text
- `scanFile(filePath)` - Scan a file
- `scanFiles(filePaths)` - Scan multiple files
- `formatScanResults(results)` - Format output
- `preCommitHook(stagedFiles)` - Pre-commit handler

**Detects:**
- AWS Access Keys
- GitHub Tokens
- Slack Tokens
- Anthropic API Keys
- OpenAI API Keys
- SSH Private Keys
- JWT Tokens
- Database Connection Strings
- Generic API Keys & Secrets

**Example:**
```javascript
import { scanFile, formatScanResults } from './secrets-scanner.mjs';

const findings = await scanFile('config.js');

if (findings.length > 0) {
  console.error('Secrets detected!');
  console.error(formatScanResults({ findings }));
}
```

### 6. Startup Validation (`startup-validation.mjs`)

Validates security configuration on application startup.

**Functions:**
- `validateSecurityOnStartup(config)` - Main validation
- `runSecurityAudit(config)` - Full security audit
- `initializeSecurity(config)` - Initialize security subsystem

**Example:**
```javascript
import { initializeSecurity } from './startup-validation.mjs';

const config = {
  security: { strictMode: true },
  integrations: { github: { enabled: true } }
};

const result = initializeSecurity(config);

if (!result.success) {
  console.error('Security initialization failed');
  process.exit(1);
}

console.log('Security initialized:', result.audit);
```

## Quick Start

### Import All Security Functions

```javascript
import {
  // Input sanitization
  sanitizeString,
  sanitizeJobSpec,
  validateFilePath,

  // Code generation
  generateSafeJobCode,
  validateGeneratedCode,

  // Secrets management
  getSecretsManager,
  validateEnvironmentOnStartup,

  // Template security
  sanitizeTemplateContext,
  validateTemplateString,

  // Secrets scanning
  scanFile,
  preCommitHook,

  // Startup validation
  initializeSecurity
} from './security/index.mjs';
```

### Initialize Security on Startup

```javascript
import { initializeAllSecurity } from './security/index.mjs';

async function main() {
  // Initialize security
  const security = await initializeAllSecurity(config);

  if (!security.ready) {
    console.error('Security initialization failed');
    process.exit(1);
  }

  console.log('Security Score:', security.securityScore);

  // Start application
  // ...
}

main();
```

## Security Checklist

Before deployment:

- [ ] All inputs sanitized
- [ ] All secrets in environment variables
- [ ] Templates validated and autoescape enabled
- [ ] Pre-commit hook installed
- [ ] Environment validated on startup
- [ ] Dependencies audited (`npm audit`)
- [ ] Security tests passing

## Documentation

- [SECURITY.md](/home/user/gitvan/SECURITY.md) - Comprehensive security guide
- [SECURITY_REVIEW_CHECKLIST.md](/home/user/gitvan/SECURITY_REVIEW_CHECKLIST.md) - Code review checklist
- [SECURITY_HARDENING_SUMMARY.md](/home/user/gitvan/SECURITY_HARDENING_SUMMARY.md) - Hardening summary

## License

Same as GitVan project.

---

**Last Updated:** January 6, 2026
**Version:** v3.0.0-hardened
