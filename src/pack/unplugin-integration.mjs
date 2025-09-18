/**
 * GitVan Pack System - Unplugin Integration
 * 
 * This module integrates unplugin with GitVan's pack system to enable:
 * - Build tool plugin generation from packs
 * - Cross-framework compatibility
 * - Automatic plugin discovery and registration
 * - Marketplace integration for plugin-enabled packs
 */

import { createLogger } from "../utils/logger.mjs";
import { join, resolve } from "pathe";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";

const logger = createLogger("pack:unplugin");

// Unplugin integration schemas
const UnpluginConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  frameworks: z.array(z.enum(["vite", "webpack", "rollup", "esbuild", "rspack"])).optional(),
  hooks: z.object({
    buildStart: z.function().optional(),
    resolveId: z.function().optional(),
    load: z.function().optional(),
    transform: z.function().optional(),
    buildEnd: z.function().optional(),
  }).optional(),
  options: z.record(z.any()).optional(),
  dependencies: z.array(z.string()).optional(),
});

const PackUnpluginSchema = z.object({
  unplugin: UnpluginConfigSchema,
  buildTargets: z.array(z.enum(["browser", "node", "worker", "universal"])).optional(),
  outputFormats: z.array(z.enum(["esm", "cjs", "umd", "iife"])).optional(),
});

/**
 * Unplugin Integration Manager
 * Handles the integration between GitVan packs and unplugin
 */
export class UnpluginIntegration {
  constructor(options = {}) {
    this.options = {
      outputDir: options.outputDir || "dist/plugins",
      frameworks: options.frameworks || ["vite", "webpack", "rollup"],
      ...options,
    };
    this.logger = createLogger("pack:unplugin");
  }

  /**
   * Generate unplugin-compatible plugins from GitVan packs
   */
  async generatePlugins(packManifest, packPath) {
    try {
      // Validate pack has unplugin configuration
      const validation = PackUnpluginSchema.safeParse(packManifest);
      if (!validation.success) {
        this.logger.warn(`Pack ${packManifest.id} does not have unplugin configuration`);
        return null;
      }

      const config = validation.data.unplugin;
      const plugins = [];

      // Generate plugins for each supported framework
      for (const framework of this.options.frameworks) {
        const plugin = await this.generateFrameworkPlugin(config, framework, packManifest, packPath);
        if (plugin) {
          plugins.push(plugin);
        }
      }

      return {
        packId: packManifest.id,
        plugins,
        metadata: {
          generatedAt: new Date().toISOString(),
          frameworks: this.options.frameworks,
          packVersion: packManifest.version,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to generate plugins for pack ${packManifest.id}:`, error);
      throw error;
    }
  }

  /**
   * Generate a plugin for a specific framework
   */
  async generateFrameworkPlugin(config, framework, packManifest, packPath) {
    const pluginCode = this.generatePluginCode(config, framework, packManifest, packPath);
    
    const pluginPath = join(
      this.options.outputDir,
      `${packManifest.id.replace(/[^a-z0-9-]/gi, "-")}-${framework}.mjs`
    );

    // Ensure output directory exists
    const { mkdirSync } = await import("node:fs");
    const { dirname } = await import("pathe");
    mkdirSync(dirname(pluginPath), { recursive: true });

    writeFileSync(pluginPath, pluginCode);

    return {
      framework,
      path: pluginPath,
      config: {
        name: config.name,
        description: config.description,
        hooks: Object.keys(config.hooks || {}),
        options: config.options || {},
      },
    };
  }

  /**
   * Generate the actual plugin code for a framework
   */
  generatePluginCode(config, framework, packManifest, packPath) {
    const pluginName = config.name || `${packManifest.id}-plugin`;
    const hooks = config.hooks || {};

    // Generate framework-specific plugin code
    switch (framework) {
      case "vite":
        return this.generateVitePlugin(pluginName, hooks, config, packManifest, packPath);
      case "webpack":
        return this.generateWebpackPlugin(pluginName, hooks, config, packManifest, packPath);
      case "rollup":
        return this.generateRollupPlugin(pluginName, hooks, config, packManifest, packPath);
      case "esbuild":
        return this.generateEsbuildPlugin(pluginName, hooks, config, packManifest, packPath);
      case "rspack":
        return this.generateRspackPlugin(pluginName, hooks, config, packManifest, packPath);
      default:
        throw new Error(`Unsupported framework: ${framework}`);
    }
  }

  /**
   * Generate Vite plugin code
   */
  generateVitePlugin(pluginName, hooks, config, packManifest, packPath) {
    return `/**
 * ${pluginName} - Vite Plugin
 * Generated from GitVan pack: ${packManifest.id} v${packManifest.version}
 * 
 * This plugin integrates GitVan pack functionality into Vite builds
 */

import { createUnplugin } from 'unplugin';

export default createUnplugin((options = {}) => {
  return {
    name: '${pluginName}',
    framework: 'vite',
    
    // Plugin configuration
    config: {
      ${this.generateConfigObject(config.options || {})}
    },

    // Build hooks
    ${this.generateHooks(hooks)}

    // Plugin-specific methods
    ${this.generatePluginMethods(config, packManifest, packPath)}
  };
});

// Export plugin factory for manual usage
export const create${this.toPascalCase(pluginName)} = (options) => {
  return createUnplugin((pluginOptions = {}) => {
    return {
      name: '${pluginName}',
      framework: 'vite',
      ...options,
    };
  });
};
`;
  }

  /**
   * Generate Webpack plugin code
   */
  generateWebpackPlugin(pluginName, hooks, config, packManifest, packPath) {
    return `/**
 * ${pluginName} - Webpack Plugin
 * Generated from GitVan pack: ${packManifest.id} v${packManifest.version}
 */

import { createUnplugin } from 'unplugin';

export default createUnplugin((options = {}) => {
  return {
    name: '${pluginName}',
    framework: 'webpack',
    
    // Webpack-specific configuration
    webpack: (config) => {
      ${this.generateWebpackConfig(config.options || {})}
      return config;
    },

    // Build hooks
    ${this.generateHooks(hooks)}

    // Plugin-specific methods
    ${this.generatePluginMethods(config, packManifest, packPath)}
  };
});
`;
  }

  /**
   * Generate Rollup plugin code
   */
  generateRollupPlugin(pluginName, hooks, config, packManifest, packPath) {
    return `/**
 * ${pluginName} - Rollup Plugin
 * Generated from GitVan pack: ${packManifest.id} v${packManifest.version}
 */

import { createUnplugin } from 'unplugin';

export default createUnplugin((options = {}) => {
  return {
    name: '${pluginName}',
    framework: 'rollup',
    
    // Rollup-specific configuration
    rollup: {
      ${this.generateRollupConfig(config.options || {})}
    },

    // Build hooks
    ${this.generateHooks(hooks)}

    // Plugin-specific methods
    ${this.generatePluginMethods(config, packManifest, packPath)}
  };
});
`;
  }

  /**
   * Generate ESBuild plugin code
   */
  generateEsbuildPlugin(pluginName, hooks, config, packManifest, packPath) {
    return `/**
 * ${pluginName} - ESBuild Plugin
 * Generated from GitVan pack: ${packManifest.id} v${packManifest.version}
 */

import { createUnplugin } from 'unplugin';

export default createUnplugin((options = {}) => {
  return {
    name: '${pluginName}',
    framework: 'esbuild',
    
    // ESBuild-specific configuration
    esbuild: {
      ${this.generateEsbuildConfig(config.options || {})}
    },

    // Build hooks
    ${this.generateHooks(hooks)}

    // Plugin-specific methods
    ${this.generatePluginMethods(config, packManifest, packPath)}
  };
});
`;
  }

  /**
   * Generate Rspack plugin code
   */
  generateRspackPlugin(pluginName, hooks, config, packManifest, packPath) {
    return `/**
 * ${pluginName} - Rspack Plugin
 * Generated from GitVan pack: ${packManifest.id} v${packManifest.version}
 */

import { createUnplugin } from 'unplugin';

export default createUnplugin((options = {}) => {
  return {
    name: '${pluginName}',
    framework: 'rspack',
    
    // Rspack-specific configuration
    rspack: {
      ${this.generateRspackConfig(config.options || {})}
    },

    // Build hooks
    ${this.generateHooks(hooks)}

    // Plugin-specific methods
    ${this.generatePluginMethods(config, packManifest, packPath)}
  };
});
`;
  }

  /**
   * Generate hooks code from configuration
   */
  generateHooks(hooks) {
    if (!hooks || Object.keys(hooks).length === 0) {
      return `// No custom hooks defined`;
    }

    return Object.entries(hooks)
      .map(([hookName, hookFunction]) => {
        return `${hookName}: ${hookFunction.toString()},`;
      })
      .join('\n    ');
  }

  /**
   * Generate plugin-specific methods
   */
  generatePluginMethods(config, packManifest, packPath) {
    return `
    // GitVan pack integration methods
    getPackInfo: () => ({
      id: '${packManifest.id}',
      name: '${packManifest.name}',
      version: '${packManifest.version}',
      description: '${packManifest.description || ''}',
      path: '${packPath}',
    }),

    // Pack-specific utilities
    loadPackResources: async () => {
      // Load pack resources (templates, files, jobs)
      return {
        templates: [],
        files: [],
        jobs: [],
      };
    },

    // Integration with GitVan runtime
    integrateWithGitVan: async (context) => {
      // Integrate pack functionality with GitVan runtime
      return {
        success: true,
        context,
      };
    },
`;
  }

  /**
   * Generate configuration objects for different frameworks
   */
  generateConfigObject(options) {
    if (!options || Object.keys(options).length === 0) {
      return `// No configuration options defined`;
    }

    return Object.entries(options)
      .map(([key, value]) => {
        if (typeof value === 'string') {
          return `${key}: '${value}',`;
        } else if (typeof value === 'boolean') {
          return `${key}: ${value},`;
        } else if (typeof value === 'number') {
          return `${key}: ${value},`;
        } else {
          return `${key}: ${JSON.stringify(value)},`;
        }
      })
      .join('\n      ');
  }

  generateWebpackConfig(options) {
    return `// Webpack configuration
      if (options.webpack) {
        Object.assign(config, options.webpack);
      }`;
  }

  generateRollupConfig(options) {
    return `// Rollup configuration
      plugins: [],
      external: [],
      ...options.rollup || {}`;
  }

  generateEsbuildConfig(options) {
    return `// ESBuild configuration
      plugins: [],
      external: [],
      ...options.esbuild || {}`;
  }

  generateRspackConfig(options) {
    return `// Rspack configuration
      plugins: [],
      external: [],
      ...options.rspack || {}`;
  }

  /**
   * Convert string to PascalCase
   */
  toPascalCase(str) {
    return str
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Discover packs with unplugin support
   */
  async discoverUnpluginPacks(packRegistry) {
    const packs = await packRegistry.list();
    const unpluginPacks = [];

    for (const pack of packs.packs) {
      try {
        const packInfo = await packRegistry.info(pack.id);
        if (packInfo && packInfo.unplugin) {
          unpluginPacks.push({
            ...pack,
            unplugin: packInfo.unplugin,
          });
        }
      } catch (error) {
        this.logger.debug(`Skipping pack ${pack.id}: ${error.message}`);
      }
    }

    return unpluginPacks;
  }

  /**
   * Generate plugin registry for marketplace
   */
  async generatePluginRegistry(packRegistry) {
    const unpluginPacks = await this.discoverUnpluginPacks(packRegistry);
    const registry = {
      version: "1.0.0",
      generatedAt: new Date().toISOString(),
      plugins: [],
    };

    for (const pack of unpluginPacks) {
      try {
        const pluginInfo = await this.generatePlugins(pack, pack.path);
        if (pluginInfo) {
          registry.plugins.push({
            packId: pack.id,
            packName: pack.name,
            packVersion: pack.version,
            frameworks: pluginInfo.plugins.map(p => p.framework),
            plugins: pluginInfo.plugins,
            metadata: pluginInfo.metadata,
          });
        }
      } catch (error) {
        this.logger.error(`Failed to generate plugins for pack ${pack.id}:`, error);
      }
    }

    return registry;
  }

  /**
   * Install unplugin dependencies
   */
  async installDependencies() {
    const dependencies = [
      'unplugin',
      '@unplugin/rollup',
      '@unplugin/webpack',
      '@unplugin/vite',
    ];

    this.logger.info('Installing unplugin dependencies...');
    
    // This would typically use a package manager
    // For now, we'll just log the dependencies
    this.logger.info(`Required dependencies: ${dependencies.join(', ')}`);
    
    return dependencies;
  }
}

/**
 * Unplugin Pack Extension
 * Extends existing packs with unplugin capabilities
 */
export class UnpluginPackExtension {
  constructor(pack, unpluginConfig) {
    this.pack = pack;
    this.unpluginConfig = unpluginConfig;
    this.logger = createLogger(`pack:unplugin:${pack.id}`);
  }

  /**
   * Enhance pack manifest with unplugin configuration
   */
  enhanceManifest() {
    return {
      ...this.pack.manifest,
      unplugin: this.unpluginConfig,
      capabilities: [
        ...(this.pack.manifest.capabilities || []),
        'unplugin',
        'build-integration',
      ],
    };
  }

  /**
   * Generate build configurations for different frameworks
   */
  generateBuildConfigs() {
    const configs = {};

    for (const framework of this.unpluginConfig.frameworks || ['vite', 'webpack', 'rollup']) {
      configs[framework] = this.generateFrameworkConfig(framework);
    }

    return configs;
  }

  generateFrameworkConfig(framework) {
    const baseConfig = {
      packId: this.pack.id,
      packVersion: this.pack.version,
      framework,
      options: this.unpluginConfig.options || {},
    };

    switch (framework) {
      case 'vite':
        return {
          ...baseConfig,
          vite: {
            plugins: [`${this.pack.id}-vite-plugin`],
            ...this.unpluginConfig.options?.vite || {},
          },
        };
      case 'webpack':
        return {
          ...baseConfig,
          webpack: {
            plugins: [`${this.pack.id}-webpack-plugin`],
            ...this.unpluginConfig.options?.webpack || {},
          },
        };
      case 'rollup':
        return {
          ...baseConfig,
          rollup: {
            plugins: [`${this.pack.id}-rollup-plugin`],
            ...this.unpluginConfig.options?.rollup || {},
          },
        };
      default:
        return baseConfig;
    }
  }
}

export { UnpluginConfigSchema, PackUnpluginSchema };
