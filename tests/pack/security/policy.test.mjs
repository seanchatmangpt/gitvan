import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyEnforcer } from '../../../src/pack/security/policy.mjs';

describe('PolicyEnforcer', () => {
  let policy;
  let mockPack;

  beforeEach(() => {
    policy = new PolicyEnforcer({
      policies: {
        requireSignature: false,
        allowedCapabilities: ['read', 'write'],
        blockedCapabilities: ['admin', 'root'],
        allowedModes: ['existing-repo'],
        allowSystemCommands: false,
        allowNetworkAccess: false,
        requireReceipts: true
      }
    });

    mockPack = {
      path: '/test/pack',
      manifest: {
        id: 'test-pack',
        version: '1.0.0',
        capabilities: ['read'],
        modes: ['existing-repo'],
        postInstall: [],
        hooks: {},
        templates: {},
        environment: {}
      }
    };
  });

  describe('enforce', () => {
    it('should allow pack that meets all policies', async () => {
      const result = await policy.enforce(mockPack);

      expect(result.allowed).toBe(true);
      expect(result.pack).toBe('test-pack');
      expect(result.violations).toBeUndefined();
    });

    it('should reject pack with blocked capabilities', async () => {
      mockPack.manifest.capabilities = ['read', 'admin'];

      const result = await policy.enforce(mockPack);

      expect(result.allowed).toBe(false);
      expect(result.violations).toContain('Capability blocked: admin');
    });

    it('should reject pack with disallowed capabilities', async () => {
      policy = new PolicyEnforcer({
        policies: {
          allowedCapabilities: ['read'],
          blockedCapabilities: []
        }
      });

      mockPack.manifest.capabilities = ['write'];

      const result = await policy.enforce(mockPack);

      expect(result.allowed).toBe(false);
      expect(result.violations).toContain('Capability not allowed: write');
    });

    it('should reject pack with disallowed modes', async () => {
      mockPack.manifest.modes = ['new-repo'];

      const result = await policy.enforce(mockPack);

      expect(result.allowed).toBe(false);
      expect(result.violations).toContain('Mode not allowed: new-repo');
    });

    it('should reject pack with too many jobs', async () => {
      policy = new PolicyEnforcer({
        policies: { maxJobCount: 2 }
      });

      mockPack.manifest.jobs = [
        { name: 'job1' },
        { name: 'job2' },
        { name: 'job3' }
      ];

      const result = await policy.enforce(mockPack);

      expect(result.allowed).toBe(false);
      expect(result.violations).toContain('Too many jobs: 3 > 2');
    });

    it('should reject pack with too many hooks', async () => {
      policy = new PolicyEnforcer({
        policies: { maxHookCount: 1 }
      });

      mockPack.manifest.hooks = {
        'pre-install': { run: 'echo test' },
        'post-install': { run: 'echo done' }
      };

      const result = await policy.enforce(mockPack);

      expect(result.allowed).toBe(false);
      expect(result.violations).toContain('Too many hooks: 2 > 1');
    });

    it('should reject pack with system commands when disabled', async () => {
      mockPack.manifest.postInstall = [
        { action: 'run', args: ['sudo apt install'] }
      ];

      const result = await policy.enforce(mockPack);

      expect(result.allowed).toBe(false);
      expect(result.violations).toContain('System command not allowed: sudo apt install');
    });

    it('should reject pack with blocked hook commands', async () => {
      mockPack.manifest.hooks = {
        'pre-install': { run: 'rm -rf /' }
      };

      const result = await policy.enforce(mockPack);

      expect(result.allowed).toBe(false);
      expect(result.violations).toContain('Hook command not allowed in pre-install: rm -rf /');
    });

    it('should reject pack with network operations when disabled', async () => {
      mockPack.manifest.templates = {
        'api-client': 'const response = await fetch("https://api.example.com");'
      };

      const result = await policy.enforce(mockPack);

      expect(result.allowed).toBe(false);
      expect(result.violations).toContain('Network access not allowed');
    });

    it('should reject pack with restricted environment variables', async () => {
      policy = new PolicyEnforcer({
        policies: {
          allowEnvironmentVariables: true,
          restrictedEnvironmentVariables: ['PATH', 'HOME']
        }
      });

      mockPack.manifest.environment = {
        API_KEY: 'secret',
        PATH: '/usr/bin'
      };

      const result = await policy.enforce(mockPack);

      expect(result.allowed).toBe(false);
      expect(result.violations).toContain('Restricted environment variable: PATH');
    });

    it('should reject pack requiring approval when not approved', async () => {
      policy = new PolicyEnforcer({
        policies: { requireApproval: true }
      });

      const result = await policy.enforce(mockPack, 'install');

      expect(result.allowed).toBe(false);
      expect(result.violations).toContain('Pack requires approval before install');
    });

    it('should allow pack requiring approval when approved', async () => {
      policy = new PolicyEnforcer({
        policies: { requireApproval: true },
        approved: true
      });

      const result = await policy.enforce(mockPack);

      expect(result.allowed).toBe(true);
    });
  });

  describe('isCommandAllowed', () => {
    it('should block dangerous commands by default', () => {
      expect(policy.isCommandAllowed('rm -rf /')).toBe(false);
      expect(policy.isCommandAllowed('sudo shutdown')).toBe(false);
    });

    it('should allow safe commands', () => {
      expect(policy.isCommandAllowed('echo hello')).toBe(true);
      expect(policy.isCommandAllowed('cat file.txt')).toBe(true);
    });

    it('should respect allowed commands list', () => {
      policy = new PolicyEnforcer({
        policies: {
          allowedCommands: ['echo', 'cat'],
          blockedCommands: []
        }
      });

      expect(policy.isCommandAllowed('echo test')).toBe(true);
      expect(policy.isCommandAllowed('cat file')).toBe(true);
      expect(policy.isCommandAllowed('ls -la')).toBe(false);
    });

    it('should block commands in blocked list', () => {
      policy = new PolicyEnforcer({
        policies: {
          allowedCommands: [],
          blockedCommands: ['rm', 'sudo']
        }
      });

      expect(policy.isCommandAllowed('rm file')).toBe(false);
      expect(policy.isCommandAllowed('sudo echo')).toBe(false);
      expect(policy.isCommandAllowed('echo test')).toBe(true);
    });
  });

  describe('hasNetworkOperations', () => {
    it('should detect network keywords in manifest', () => {
      mockPack.manifest.description = 'This pack fetches data from API';
      expect(policy.hasNetworkOperations(mockPack)).toBe(true);
    });

    it('should detect network keywords in templates', () => {
      mockPack.manifest.templates = {
        client: 'import axios from "axios"; axios.get("/api");'
      };
      expect(policy.hasNetworkOperations(mockPack)).toBe(true);
    });

    it('should not flag packs without network operations', () => {
      mockPack.manifest.description = 'Simple file operations';
      expect(policy.hasNetworkOperations(mockPack)).toBe(false);
    });
  });

  describe('checkFileTypes', () => {
    it('should allow permitted file types', () => {
      const template = {
        files: {
          'script.js': 'console.log("hello");',
          'config.json': '{"name": "test"}',
          'readme.md': '# Test'
        }
      };

      const violations = policy.checkFileTypes(template);
      expect(violations).toEqual([]);
    });

    it('should block dangerous file types', () => {
      policy = new PolicyEnforcer({
        policies: {
          blockedFileTypes: ['.exe', '.bat']
        }
      });

      const template = {
        files: {
          'malware.exe': 'binary content',
          'script.bat': 'del /q /s *'
        }
      };

      const violations = policy.checkFileTypes(template);
      expect(violations).toContain('Blocked file type: malware.exe');
      expect(violations).toContain('Blocked file type: script.bat');
    });

    it('should reject files not in allowed types', () => {
      policy = new PolicyEnforcer({
        policies: {
          allowedFileTypes: ['.js', '.json']
        }
      });

      const template = {
        files: {
          'script.py': 'print("hello")',
          'config.xml': '<config></config>'
        }
      };

      const violations = policy.checkFileTypes(template);
      expect(violations).toContain('File type not allowed: script.py');
      expect(violations).toContain('File type not allowed: config.xml');
    });

    it('should reject oversized templates', () => {
      policy = new PolicyEnforcer({
        policies: { maxTemplateSize: 100 }
      });

      const largeContent = 'x'.repeat(200);
      const template = {
        files: {
          'large.txt': largeContent
        }
      };

      const violations = policy.checkFileTypes(template);
      expect(violations).toContain('Template file too large: large.txt (200 bytes)');
    });
  });

  describe('audit', () => {
    it('should create audit entry', async () => {
      const result = { status: 'allowed', violations: [] };
      const auditEntry = await policy.audit(mockPack, 'install', result);

      expect(auditEntry.timestamp).toBeTruthy();
      expect(auditEntry.pack).toBe('test-pack');
      expect(auditEntry.version).toBe('1.0.0');
      expect(auditEntry.operation).toBe('install');
      expect(auditEntry.result).toBe('allowed');
      expect(auditEntry.violations).toEqual([]);
      expect(auditEntry.user).toBeTruthy();
      expect(auditEntry.environment).toBeTruthy();
    });
  });

  describe('validatePolicyConfiguration', () => {
    it('should validate correct policy configuration', async () => {
      const result = await policy.validatePolicyConfiguration();
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect conflicting capability policies', async () => {
      policy = new PolicyEnforcer({
        policies: {
          allowedCapabilities: ['read', 'write'],
          blockedCapabilities: ['write', 'admin']
        }
      });

      const result = await policy.validatePolicyConfiguration();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Conflicting capability policies: write');
    });

    it('should detect invalid numeric limits', async () => {
      policy = new PolicyEnforcer({
        policies: {
          maxFileSize: -1,
          maxTemplateSize: 0,
          maxJobCount: -5
        }
      });

      const result = await policy.validatePolicyConfiguration();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('maxFileSize must be positive');
      expect(result.errors).toContain('maxTemplateSize must be positive');
      expect(result.errors).toContain('maxJobCount must be positive');
    });
  });

  describe('createRestrictivePolicy', () => {
    it('should create secure restrictive policy', () => {
      const restrictive = policy.createRestrictivePolicy();

      expect(restrictive.requireSignature).toBe(true);
      expect(restrictive.requireApproval).toBe(true);
      expect(restrictive.allowNetworkAccess).toBe(false);
      expect(restrictive.allowSystemCommands).toBe(false);
      expect(restrictive.allowedCapabilities).toEqual(['read-only']);
      expect(restrictive.blockedCapabilities).toContain('write');
      expect(restrictive.allowedCommands).toEqual(['echo', 'cat', 'ls']);
      expect(restrictive.blockedCommands).toContain('rm');
    });
  });

  describe('createPermissivePolicy', () => {
    it('should create permissive policy', () => {
      const permissive = policy.createPermissivePolicy();

      expect(permissive.requireSignature).toBe(false);
      expect(permissive.requireApproval).toBe(false);
      expect(permissive.allowNetworkAccess).toBe(true);
      expect(permissive.allowSystemCommands).toBe(true);
      expect(permissive.allowedCapabilities).toEqual([]);
      expect(permissive.blockedCapabilities).toEqual([]);
      expect(permissive.maxFileSize).toBeGreaterThan(100000000);
    });
  });

  describe('summarizePolicies', () => {
    it('should create policy summary', () => {
      const summary = policy.summarizePolicies();

      expect(summary).toHaveProperty('requireSignature');
      expect(summary).toHaveProperty('allowSystemCommands');
      expect(summary).toHaveProperty('allowNetworkAccess');
      expect(summary).toHaveProperty('capabilityCount');
      expect(summary).toHaveProperty('commandCount');
      expect(summary.capabilityCount).toHaveProperty('allowed');
      expect(summary.capabilityCount).toHaveProperty('blocked');
    });
  });
});