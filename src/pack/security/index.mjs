import { PackSigner } from './signature.mjs';
import { ReceiptManager } from './receipt.mjs';
import { PolicyEnforcer } from './policy.mjs';

export { PackSigner, ReceiptManager, PolicyEnforcer };

// Security utility functions
export function createSecurityContext(options = {}) {
  return {
    signer: new PackSigner(options.signer),
    receipts: new ReceiptManager(options.receipts),
    policy: new PolicyEnforcer(options.policy)
  };
}

export function validateSecurityConfiguration(config) {
  const errors = [];

  // Validate signer configuration
  if (config.signer) {
    if (config.signer.algorithm && !['RSA-SHA256', 'RSA-SHA512'].includes(config.signer.algorithm)) {
      errors.push(`Unsupported signing algorithm: ${config.signer.algorithm}`);
    }
  }

  // Validate receipt configuration
  if (config.receipts) {
    if (config.receipts.receiptsRef && !config.receipts.receiptsRef.startsWith('refs/notes/')) {
      errors.push('Receipt ref must be in refs/notes/ namespace');
    }
  }

  // Validate policy configuration
  if (config.policy) {
    const policyValidator = new PolicyEnforcer(config.policy);
    const policyValidation = policyValidator.validatePolicyConfiguration();
    if (!policyValidation.valid) {
      errors.push(...policyValidation.errors);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}