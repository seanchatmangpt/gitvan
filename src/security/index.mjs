/**
 * GitVan Security Module
 * Centralized security utilities and functions
 */

// Input sanitization
export {
  sanitizeString,
  sanitizeIdentifier,
  sanitizeJobSpec,
  validateFilePath,
  sanitizeEnvVar,
  containsSecrets,
  validateSparqlQuery,
  validateCronExpression,
  validateGitRef
} from './input-sanitizer.mjs';

// Secure code generation
export {
  getGitVanImportPath,
  generateSafeJobCode,
  validateGeneratedCode
} from './code-generator.mjs';

// Secrets management
export {
  SecretsManager,
  getSecretsManager,
  resetSecretsManager,
  validateEnvironmentOnStartup
} from './secrets-manager.mjs';

// Template security
export {
  sanitizeTemplateContext,
  validateTemplateString,
  createSafeNunjucksConfig,
  addSafeFilter,
  sanitizeTemplatePath,
  createSecureRenderFunction,
  auditTemplate
} from './template-sanitizer.mjs';

// Secrets scanning
export {
  scanContentForSecrets,
  scanFile,
  scanFiles,
  formatScanResults,
  preCommitHook
} from './secrets-scanner.mjs';

// Startup validation
export {
  validateSecurityOnStartup,
  runSecurityAudit,
  initializeSecurity
} from './startup-validation.mjs';

/**
 * Initialize all security features
 * Call this at application startup
 */
export async function initializeAllSecurity(config = {}) {
  // 1. Load and validate secrets
  const secretsManager = getSecretsManager();

  // 2. Validate environment
  const envValidation = validateEnvironmentOnStartup({
    requireGitHub: config.integrations?.github?.enabled,
    requireSlack: config.integrations?.slack?.enabled,
    requireAI: config.ai?.enabled !== false,
    failOnMissing: config.security?.strictMode === true
  });

  // 3. Run security audit
  const audit = runSecurityAudit(config);

  // 4. Return results
  return {
    initialized: true,
    secrets: secretsManager.getSummary(),
    environment: envValidation,
    audit,
    securityScore: audit.score,
    ready: audit.passed && envValidation.valid
  };
}

/**
 * Quick security check (for health checks)
 */
export function quickSecurityCheck() {
  const secretsManager = getSecretsManager();

  return {
    secretsLoaded: secretsManager.validated,
    secretsCount: secretsManager.secrets.size,
    status: secretsManager.validated ? 'ok' : 'not_initialized'
  };
}
