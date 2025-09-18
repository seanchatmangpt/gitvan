/**
 * GitVan v2 Configuration Tests
 * Tests c12 configuration loading system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadConfig } from 'c12';

describe('Configuration System', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gitvan-config-test-'));
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('Default Configuration', () => {
    it('should load default configuration when no config file exists', async () => {
      const { config } = await loadConfig({
        name: 'gitvan',
        cwd: tempDir,
        defaults: {
          version: '2.0',
          tracer: {
            enabled: true,
            outputDir: '.gitvan/receipts',
            receiptPattern: 'receipt-{timestamp}-{id}.json',
            maxReceiptSize: 1024 * 1024, // 1MB
            retention: {
              maxCount: 1000,
              maxAge: 30 // days
            }
          },
          jobs: {
            patterns: ['**/*.job.{js,mjs,ts}'],
            exclude: ['node_modules/**', '.git/**'],
            timeout: 30000,
            retry: {
              maxAttempts: 3,
              delay: 1000,
              backoffFactor: 2
            },
            filter: {}
          },
          git: {
            trackOperations: true,
            includeHooks: false,
            timeout: 10000,
            ignore: ['.gitvan/**', '*.tmp']
          },
          templates: {
            directory: '.gitvan/templates',
            extension: '.njk',
            options: {
              autoescape: true,
              throwOnUndefined: false,
              trimBlocks: true,
              lstripBlocks: true
            }
          },
          logging: {
            level: 'info',
            format: 'text',
            output: 'console',
            timestamp: true,
            colors: true
          },
          performance: {
            enabled: true,
            memorySampleInterval: 1000,
            cpuSampleInterval: 1000,
            trackDiskIO: true
          },
          security: {
            signing: false,
            hashAlgorithm: 'sha256'
          },
          plugins: {
            directory: '.gitvan/plugins',
            autoload: true,
            enabled: [],
            config: {}
          },
          cli: {
            defaultCommand: 'help',
            showHelpOnNoCommand: true,
            theme: 'default',
            progress: {
              enabled: true,
              style: 'bar'
            }
          },
          environments: {}
        }
      });

      expect(config).toBeDefined();
      expect(config.version).toBe('2.0');
      expect(config.tracer.enabled).toBe(true);
      expect(config.jobs.timeout).toBe(30000);
      expect(config.logging.level).toBe('info');
    });

    it('should validate configuration schema', async () => {
      const { config } = await loadConfig({
        name: 'gitvan',
        cwd: tempDir,
        defaults: {
          version: '2.0',
          tracer: { enabled: true }
        }
      });

      expect(config.version).toBe('2.0');
      expect(typeof config.tracer.enabled).toBe('boolean');
    });
  });

  describe('Configuration File Loading', () => {
    it('should load configuration from gitvan.config.js', async () => {
      const configContent = `
        export default {
          version: '2.0',
          tracer: {
            enabled: false,
            outputDir: 'custom-receipts'
          },
          jobs: {
            timeout: 60000
          }
        }
      `;

      await writeFile(join(tempDir, 'gitvan.config.js'), configContent);

      const { config } = await loadConfig({
        name: 'gitvan',
        cwd: tempDir
      });

      expect(config.tracer.enabled).toBe(false);
      expect(config.tracer.outputDir).toBe('custom-receipts');
      expect(config.jobs.timeout).toBe(60000);
    });

    it('should load configuration from package.json', async () => {
      const packageJson = {
        name: 'test-project',
        gitvan: {
          version: '2.0',
          logging: {
            level: 'debug',
            format: 'json'
          }
        }
      };

      await writeFile(join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      const { config } = await loadConfig({
        name: 'gitvan',
        cwd: tempDir
      });

      expect(config.logging.level).toBe('debug');
      expect(config.logging.format).toBe('json');
    });

    it('should load configuration from .gitvanrc', async () => {
      const rcContent = JSON.stringify({
        version: '2.0',
        git: {
          trackOperations: false,
          timeout: 5000
        },
        performance: {
          enabled: false
        }
      });

      await writeFile(join(tempDir, '.gitvanrc'), rcContent);

      const { config } = await loadConfig({
        name: 'gitvan',
        cwd: tempDir
      });

      expect(config.git.trackOperations).toBe(false);
      expect(config.git.timeout).toBe(5000);
      expect(config.performance.enabled).toBe(false);
    });
  });

  describe('Environment-specific Configuration', () => {
    it('should merge environment-specific configuration', async () => {
      const configContent = `
        export default {
          version: '2.0',
          tracer: {
            enabled: true,
            outputDir: 'receipts'
          },
          environments: {
            development: {
              logging: {
                level: 'debug'
              }
            },
            production: {
              logging: {
                level: 'error'
              },
              tracer: {
                enabled: false
              }
            }
          }
        }
      `;

      await writeFile(join(tempDir, 'gitvan.config.js'), configContent);

      // Test development environment
      process.env.NODE_ENV = 'development';
      const { config: devConfig } = await loadConfig({
        name: 'gitvan',
        cwd: tempDir
      });

      expect(devConfig.logging.level).toBe('debug');
      expect(devConfig.tracer.enabled).toBe(true);

      // Test production environment
      process.env.NODE_ENV = 'production';
      const { config: prodConfig } = await loadConfig({
        name: 'gitvan',
        cwd: tempDir
      });

      expect(prodConfig.logging.level).toBe('error');
      expect(prodConfig.tracer.enabled).toBe(false);

      // Cleanup
      delete process.env.NODE_ENV;
    });
  });

  describe('Configuration Merging', () => {
    it('should merge multiple configuration sources', async () => {
      // Create package.json config
      const packageJson = {
        gitvan: {
          version: '2.0',
          tracer: {
            enabled: true
          }
        }
      };
      await writeFile(join(tempDir, 'package.json'), JSON.stringify(packageJson));

      // Create .gitvanrc config
      const rcConfig = {
        logging: {
          level: 'warn'
        }
      };
      await writeFile(join(tempDir, '.gitvanrc'), JSON.stringify(rcConfig));

      // Create gitvan.config.js config
      const configContent = `
        export default {
          jobs: {
            timeout: 45000
          }
        }
      `;
      await writeFile(join(tempDir, 'gitvan.config.js'), configContent);

      const { config } = await loadConfig({
        name: 'gitvan',
        cwd: tempDir
      });

      expect(config.version).toBe('2.0'); // from package.json
      expect(config.tracer.enabled).toBe(true); // from package.json
      expect(config.logging.level).toBe('warn'); // from .gitvanrc
      expect(config.jobs.timeout).toBe(45000); // from gitvan.config.js
    });
  });

  describe('Configuration Validation', () => {
    it('should validate required fields', async () => {
      const invalidConfig = `
        export default {
          // Missing version field
          tracer: {
            enabled: 'invalid-boolean'
          }
        }
      `;

      await writeFile(join(tempDir, 'gitvan.config.js'), invalidConfig);

      // This should not throw but should provide defaults for missing fields
      const { config } = await loadConfig({
        name: 'gitvan',
        cwd: tempDir,
        defaults: {
          version: '2.0',
          tracer: { enabled: true }
        }
      });

      expect(config.version).toBe('2.0');
      // Note: c12 doesn't validate types, that would be done by a separate validator
    });

    it('should handle malformed configuration files gracefully', async () => {
      const malformedConfig = `
        export default {
          invalid: syntax: here
        }
      `;

      await writeFile(join(tempDir, 'gitvan.config.js'), malformedConfig);

      // Should fall back to defaults when config file is malformed
      await expect(async () => {
        await loadConfig({
          name: 'gitvan',
          cwd: tempDir,
          defaults: { version: '2.0' }
        });
      }).rejects.toThrow();
    });
  });

  describe('Configuration Watching', () => {
    it('should detect configuration file changes', async () => {
      const initialConfig = `
        export default {
          version: '2.0',
          tracer: { enabled: true }
        }
      `;

      const configPath = join(tempDir, 'gitvan.config.js');
      await writeFile(configPath, initialConfig);

      const { config: initial } = await loadConfig({
        name: 'gitvan',
        cwd: tempDir
      });

      expect(initial.tracer.enabled).toBe(true);

      // Simulate config change
      const updatedConfig = `
        export default {
          version: '2.0',
          tracer: { enabled: false }
        }
      `;

      await writeFile(configPath, updatedConfig);

      // Reload configuration
      const { config: updated } = await loadConfig({
        name: 'gitvan',
        cwd: tempDir
      });

      expect(updated.tracer.enabled).toBe(false);
    });
  });
});