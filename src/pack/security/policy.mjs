import { createLogger } from '../../utils/logger.mjs';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'pathe';

export class PolicyEnforcer {
  constructor(options = {}) {
    this.options = options;
    this.logger = createLogger('pack:policy');
    this.policies = this.loadPolicies();
  }

  loadPolicies() {
    const policies = {
      ...this.getDefaultPolicies(),
      ...this.options.policies
    };

    // Load from file if specified
    if (this.options.policyFile && existsSync(this.options.policyFile)) {
      try {
        const filePolicies = JSON.parse(readFileSync(this.options.policyFile, 'utf8'));
        Object.assign(policies, filePolicies);
        this.logger.debug('Loaded policies from file:', this.options.policyFile);
      } catch (error) {
        this.logger.warn('Failed to load policy file:', error.message);
      }
    }

    return policies;
  }

  getDefaultPolicies() {
    return {
      requireSignature: false,
      allowedCapabilities: [],
      blockedCapabilities: [],
      maxFileSize: 100 * 1024 * 1024, // 100MB
      allowedModes: ['existing-repo', 'new-repo'],
      requireApproval: false,
      allowedRegistries: [],
      allowNetworkAccess: true,
      allowSystemCommands: false,
      allowedCommands: [],
      blockedCommands: ['rm -rf', 'sudo', 'su', 'chmod 777'],
      requireReceipts: true,
      maxTemplateSize: 10 * 1024 * 1024, // 10MB
      allowedFileTypes: ['.js', '.mjs', '.json', '.md', '.txt', '.yml', '.yaml'],
      blockedFileTypes: ['.exe', '.bat', '.sh', '.ps1'],
      allowEnvironmentVariables: true,
      restrictedEnvironmentVariables: ['PATH', 'HOME', 'USER'],
      maxJobCount: 50,
      maxHookCount: 20
    };
  }

  async enforce(pack, operation = 'apply') {
    const violations = [];

    // Check signature requirement
    if (this.policies.requireSignature) {
      const signaturePath = join(pack.path, 'SIGNATURE');
      if (!existsSync(signaturePath)) {
        violations.push('Pack signature required but not found');
      }
    }

    // Check capabilities
    if (this.policies.allowedCapabilities?.length > 0) {
      for (const cap of pack.manifest.capabilities || []) {
        if (!this.policies.allowedCapabilities.includes(cap)) {
          violations.push(`Capability not allowed: ${cap}`);
        }
      }
    }

    if (this.policies.blockedCapabilities?.length > 0) {
      for (const cap of pack.manifest.capabilities || []) {
        if (this.policies.blockedCapabilities.includes(cap)) {
          violations.push(`Capability blocked: ${cap}`);
        }
      }
    }

    // Check modes
    if (this.policies.allowedModes?.length > 0) {
      for (const mode of pack.manifest.modes || []) {
        if (!this.policies.allowedModes.includes(mode)) {
          violations.push(`Mode not allowed: ${mode}`);
        }
      }
    }

    // Check job count limits
    if (pack.manifest.jobs && pack.manifest.jobs.length > this.policies.maxJobCount) {
      violations.push(`Too many jobs: ${pack.manifest.jobs.length} > ${this.policies.maxJobCount}`);
    }

    // Check hook count limits
    if (pack.manifest.hooks && Object.keys(pack.manifest.hooks).length > this.policies.maxHookCount) {
      violations.push(`Too many hooks: ${Object.keys(pack.manifest.hooks).length} > ${this.policies.maxHookCount}`);
    }

    // Check post-install commands
    if (!this.policies.allowSystemCommands) {
      for (const post of pack.manifest.postInstall || []) {
        if (post.action === 'run') {
          const command = post.args[0];
          if (!this.isCommandAllowed(command)) {
            violations.push(`System command not allowed: ${command}`);
          }
        }
      }
    }

    // Check pre/post hooks for commands
    if (pack.manifest.hooks) {
      for (const [hookName, hookConfig] of Object.entries(pack.manifest.hooks)) {
        if (hookConfig.run && !this.isCommandAllowed(hookConfig.run)) {
          violations.push(`Hook command not allowed in ${hookName}: ${hookConfig.run}`);
        }
      }
    }

    // Check network access
    if (!this.policies.allowNetworkAccess) {
      if (this.hasNetworkOperations(pack)) {
        violations.push('Network access not allowed');
      }
    }

    // Check file types in templates
    if (pack.manifest.templates) {
      for (const template of Object.values(pack.manifest.templates)) {
        const fileViolations = this.checkFileTypes(template);
        violations.push(...fileViolations);
      }
    }

    // Check environment variable restrictions
    if (pack.manifest.environment && !this.policies.allowEnvironmentVariables) {
      violations.push('Environment variables not allowed');
    }

    if (pack.manifest.environment && this.policies.restrictedEnvironmentVariables?.length > 0) {
      for (const envVar of Object.keys(pack.manifest.environment)) {
        if (this.policies.restrictedEnvironmentVariables.includes(envVar)) {
          violations.push(`Restricted environment variable: ${envVar}`);
        }
      }
    }

    // Check approval requirement
    if (this.policies.requireApproval && !this.options.approved) {
      violations.push(`Pack requires approval before ${operation}`);
    }

    // Check registry restrictions
    if (this.policies.allowedRegistries?.length > 0 && pack.manifest.registry) {
      if (!this.policies.allowedRegistries.includes(pack.manifest.registry)) {
        violations.push(`Registry not allowed: ${pack.manifest.registry}`);
      }
    }

    if (violations.length > 0) {
      this.logger.warn('Policy violations:', violations);
      return {
        allowed: false,
        violations,
        pack: pack.manifest.id,
        operation
      };
    }

    this.logger.debug(`Policy check passed for ${pack.manifest.id}@${pack.manifest.version}`);
    return {
      allowed: true,
      pack: pack.manifest.id,
      operation
    };
  }

  isCommandAllowed(command) {
    if (!command) return true;

    // Check against blocked list first
    if (this.policies.blockedCommands?.length > 0) {
      for (const blocked of this.policies.blockedCommands) {
        if (command.includes(blocked)) {
          return false;
        }
      }
    }

    // Check against allowed list
    if (this.policies.allowedCommands?.length > 0) {
      return this.policies.allowedCommands.some(allowed =>
        command.startsWith(allowed) || command.includes(allowed)
      );
    }

    // If no allowed list, allow unless blocked
    return true;
  }

  hasNetworkOperations(pack) {
    // Network operation keywords
    const networkKeywords = [
      'fetch', 'http', 'https', 'curl', 'wget', 'axios',
      'request', 'download', 'upload', 'api', 'rest',
      'graphql', 'websocket', 'socket.io'
    ];

    // Check in manifest
    const manifestStr = JSON.stringify(pack.manifest).toLowerCase();
    const hasKeywords = networkKeywords.some(keyword => manifestStr.includes(keyword));

    if (hasKeywords) {
      this.logger.debug('Network operations detected in pack manifest');
      return true;
    }

    // Check in templates
    if (pack.manifest.templates) {
      for (const template of Object.values(pack.manifest.templates)) {
        if (typeof template === 'string') {
          const templateStr = template.toLowerCase();
          if (networkKeywords.some(keyword => templateStr.includes(keyword))) {
            this.logger.debug('Network operations detected in pack template');
            return true;
          }
        }
      }
    }

    return false;
  }

  checkFileTypes(template) {
    const violations = [];

    if (typeof template === 'string') {
      // Simple template string check
      return violations;
    }

    if (template.files) {
      for (const [filePath, content] of Object.entries(template.files)) {
        const ext = filePath.split('.').pop();

        // Check blocked file types
        if (this.policies.blockedFileTypes?.length > 0) {
          if (this.policies.blockedFileTypes.some(blocked => filePath.endsWith(blocked))) {
            violations.push(`Blocked file type: ${filePath}`);
          }
        }

        // Check allowed file types
        if (this.policies.allowedFileTypes?.length > 0) {
          if (!this.policies.allowedFileTypes.some(allowed => filePath.endsWith(allowed))) {
            violations.push(`File type not allowed: ${filePath}`);
          }
        }

        // Check template size
        if (typeof content === 'string' && content.length > this.policies.maxTemplateSize) {
          violations.push(`Template file too large: ${filePath} (${content.length} bytes)`);
        }
      }
    }

    return violations;
  }

  async audit(pack, operation, result) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      pack: pack.manifest.id,
      version: pack.manifest.version,
      operation,
      result: result.status || (result.allowed ? 'allowed' : 'denied'),
      policies: this.summarizePolicies(),
      violations: result.violations || [],
      approved: this.options.approved || false,
      user: process.env.USER || process.env.USERNAME || 'unknown',
      environment: {
        node: process.version,
        platform: process.platform,
        ci: process.env.CI === 'true'
      }
    };

    // Log audit entry
    this.logger.info('Policy audit:', {
      pack: auditEntry.pack,
      version: auditEntry.version,
      operation: auditEntry.operation,
      result: auditEntry.result,
      violations: auditEntry.violations.length
    });

    return auditEntry;
  }

  summarizePolicies() {
    return {
      requireSignature: this.policies.requireSignature,
      allowSystemCommands: this.policies.allowSystemCommands,
      allowNetworkAccess: this.policies.allowNetworkAccess,
      requireApproval: this.policies.requireApproval,
      requireReceipts: this.policies.requireReceipts,
      capabilityCount: {
        allowed: this.policies.allowedCapabilities?.length || 0,
        blocked: this.policies.blockedCapabilities?.length || 0
      },
      commandCount: {
        allowed: this.policies.allowedCommands?.length || 0,
        blocked: this.policies.blockedCommands?.length || 0
      }
    };
  }

  async validatePolicyConfiguration() {
    const errors = [];

    // Check for conflicting capability policies
    if (this.policies.allowedCapabilities?.length > 0 && this.policies.blockedCapabilities?.length > 0) {
      const overlap = this.policies.allowedCapabilities.filter(cap =>
        this.policies.blockedCapabilities.includes(cap)
      );
      if (overlap.length > 0) {
        errors.push(`Conflicting capability policies: ${overlap.join(', ')}`);
      }
    }

    // Check for conflicting command policies
    if (this.policies.allowedCommands?.length > 0 && this.policies.blockedCommands?.length > 0) {
      for (const allowed of this.policies.allowedCommands) {
        for (const blocked of this.policies.blockedCommands) {
          if (allowed.includes(blocked) || blocked.includes(allowed)) {
            errors.push(`Conflicting command policies: ${allowed} vs ${blocked}`);
          }
        }
      }
    }

    // Check numeric limits
    if (this.policies.maxFileSize <= 0) {
      errors.push('maxFileSize must be positive');
    }

    if (this.policies.maxTemplateSize <= 0) {
      errors.push('maxTemplateSize must be positive');
    }

    if (this.policies.maxJobCount <= 0) {
      errors.push('maxJobCount must be positive');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  createRestrictivePolicy() {
    return {
      requireSignature: true,
      allowedCapabilities: ['read-only'],
      blockedCapabilities: ['write', 'execute', 'network'],
      allowedModes: ['existing-repo'],
      requireApproval: true,
      allowNetworkAccess: false,
      allowSystemCommands: false,
      allowedCommands: ['echo', 'cat', 'ls'],
      blockedCommands: ['rm', 'sudo', 'curl', 'wget', 'sh', 'bash'],
      requireReceipts: true,
      maxFileSize: 1024 * 1024, // 1MB
      maxTemplateSize: 100 * 1024, // 100KB
      allowedFileTypes: ['.md', '.txt', '.json'],
      allowEnvironmentVariables: false,
      maxJobCount: 5,
      maxHookCount: 3
    };
  }

  createPermissivePolicy() {
    return {
      requireSignature: false,
      allowedCapabilities: [],
      blockedCapabilities: [],
      allowedModes: ['existing-repo', 'new-repo'],
      requireApproval: false,
      allowNetworkAccess: true,
      allowSystemCommands: true,
      allowedCommands: [],
      blockedCommands: ['rm -rf /', 'sudo rm', 'format'],
      requireReceipts: true,
      maxFileSize: 500 * 1024 * 1024, // 500MB
      maxTemplateSize: 50 * 1024 * 1024, // 50MB
      allowedFileTypes: [],
      allowEnvironmentVariables: true,
      restrictedEnvironmentVariables: [],
      maxJobCount: 100,
      maxHookCount: 50
    };
  }
}