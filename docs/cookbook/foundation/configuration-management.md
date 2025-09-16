# Configuration Management

## 🎯 **Recipe Overview**

**Category**: Foundation  
**Difficulty**: Intermediate  
**Time**: 30 minutes  
**Prerequisites**: Basic GitVan knowledge, environment management experience

## 📋 **Problem**

You need to manage different configurations for development, staging, and production environments. You want a flexible system that allows environment-specific settings while maintaining consistency across deployments.

## 🍳 **Solution**

### **Step 1: Create Environment-Specific Configurations**

```javascript
// config/development.js
export default {
  root: process.cwd(),
  jobs: { dir: "jobs" },
  templates: { 
    engine: "nunjucks", 
    dirs: ["templates"],
    noCache: true  // Disable caching for development
  },
  receipts: { ref: "refs/notes/gitvan/results" },
  hooks: {
    "job:before"({ id, payload }) {
      console.log(`🚀 [DEV] Starting job: ${id}`);
      if (payload && Object.keys(payload).length > 0) {
        console.log(`📦 [DEV] Payload:`, payload);
      }
    },
    "job:after"({ id, result }) {
      console.log(`✅ [DEV] Job completed: ${id} (${result.ok ? "SUCCESS" : "FAILED"})`);
    },
    "job:error"({ id, error }) {
      console.error(`❌ [DEV] Job failed: ${id}`, error.message);
    }
  },
  runtimeConfig: {
    app: {
      name: "GitVan Development",
      environment: "development",
      debug: true
    },
    gitvan: {
      notesRef: "refs/notes/gitvan/results",
      logLevel: "debug"
    }
  }
};
```

```javascript
// config/production.js
export default {
  root: process.cwd(),
  jobs: { dir: "jobs" },
  templates: { 
    engine: "nunjucks", 
    dirs: ["templates"],
    noCache: false  // Enable caching for production
  },
  receipts: { ref: "refs/notes/gitvan/results" },
  hooks: {
    "job:before"({ id, payload }) {
      // Log to production logging system
      logger.info(`Job started: ${id}`, { 
        payload: payload || {},
        timestamp: new Date().toISOString()
      });
    },
    "job:after"({ id, result }) {
      // Log to production logging system
      logger.info(`Job completed: ${id}`, { 
        success: result.ok,
        artifacts: result.artifacts?.length || 0,
        timestamp: new Date().toISOString()
      });
    },
    "job:error"({ id, error }) {
      // Log to production logging system
      logger.error(`Job failed: ${id}`, { 
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
  },
  runtimeConfig: {
    app: {
      name: "GitVan Production",
      environment: "production",
      debug: false
    },
    gitvan: {
      notesRef: "refs/notes/gitvan/results",
      logLevel: "info"
    }
  }
};
```

### **Step 2: Create Configuration Loader**

```javascript
// config/loader.mjs
import { loadOptions } from "gitvan/config/loader";
import { promises as fs } from "node:fs";
import { join } from "pathe";

export async function loadEnvironmentConfig(environment = "development") {
  const configPath = join(process.cwd(), "config", `${environment}.js`);
  
  try {
    // Check if environment-specific config exists
    await fs.access(configPath);
    
    // Load environment-specific config
    const envConfig = await import(configPath);
    const baseConfig = await loadOptions();
    
    // Merge configurations
    return {
      ...baseConfig,
      ...envConfig.default,
      runtimeConfig: {
        ...baseConfig.runtimeConfig,
        ...envConfig.default.runtimeConfig
      }
    };
  } catch (error) {
    console.warn(`Environment config not found: ${configPath}`);
    
    // Fall back to base config
    return await loadOptions();
  }
}

export function getEnvironment() {
  return process.env.NODE_ENV || process.env.GITVAN_ENV || "development";
}

export function isProduction() {
  return getEnvironment() === "production";
}

export function isDevelopment() {
  return getEnvironment() === "development";
}
```

### **Step 3: Create Environment-Aware Job**

```javascript
// jobs/config/environment-info.mjs
import { defineJob } from "gitvan/define";
import { useGit } from "gitvan/useGit";
import { loadEnvironmentConfig, getEnvironment, isProduction } from "../../config/loader.mjs";

export default defineJob({
  meta: {
    desc: "Display environment configuration and information",
    tags: ["config", "environment", "info"]
  },
  async run({ ctx }) {
    const git = useGit();
    const environment = getEnvironment();
    const config = await loadEnvironmentConfig(environment);
    
    // Get repository information
    const head = await git.head();
    const branch = await git.getCurrentBranch();
    
    // Create environment report
    const report = {
      environment,
      timestamp: ctx.nowISO,
      repository: {
        head: head.substring(0, 8),
        branch,
        isClean: await git.isClean()
      },
      configuration: {
        app: config.runtimeConfig.app,
        gitvan: config.runtimeConfig.gitvan,
        templates: {
          engine: config.templates.engine,
          noCache: config.templates.noCache
        },
        receipts: {
          ref: config.receipts.ref
        }
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        isProduction: isProduction(),
        environmentVariables: {
          NODE_ENV: process.env.NODE_ENV,
          GITVAN_ENV: process.env.GITVAN_ENV
        }
      }
    };
    
    // Log environment information
    ctx.logger.log(`🌍 Environment: ${environment}`);
    ctx.logger.log(`📦 App: ${config.runtimeConfig.app.name}`);
    ctx.logger.log(`🔧 Debug: ${config.runtimeConfig.app.debug}`);
    ctx.logger.log(`📝 Log Level: ${config.runtimeConfig.gitvan.logLevel}`);
    
    return {
      ok: true,
      artifacts: [],
      data: report
    };
  }
});
```

### **Step 4: Create Configuration Validation Job**

```javascript
// jobs/config/validate-config.mjs
import { defineJob } from "gitvan/define";
import { loadEnvironmentConfig, getEnvironment } from "../../config/loader.mjs";

export default defineJob({
  meta: {
    desc: "Validate configuration for current environment",
    tags: ["config", "validation", "environment"]
  },
  async run({ ctx }) {
    const environment = getEnvironment();
    const config = await loadEnvironmentConfig(environment);
    
    const validation = {
      environment,
      timestamp: ctx.nowISO,
      checks: []
    };
    
    // Validate required configuration
    const requiredFields = [
      'root',
      'jobs.dir',
      'templates.engine',
      'receipts.ref',
      'runtimeConfig.app.name',
      'runtimeConfig.gitvan.notesRef'
    ];
    
    for (const field of requiredFields) {
      const value = field.split('.').reduce((obj, key) => obj?.[key], config);
      validation.checks.push({
        field,
        required: true,
        present: value !== undefined,
        value: value
      });
    }
    
    // Validate environment-specific settings
    if (environment === "production") {
      validation.checks.push({
        field: "templates.noCache",
        required: false,
        present: true,
        value: config.templates.noCache,
        recommendation: config.templates.noCache ? "Consider enabling caching for production" : "Good"
      });
    }
    
    if (environment === "development") {
      validation.checks.push({
        field: "templates.noCache",
        required: false,
        present: true,
        value: config.templates.noCache,
        recommendation: config.templates.noCache ? "Good for development" : "Consider disabling caching for development"
      });
    }
    
    // Calculate validation results
    const passed = validation.checks.filter(check => check.present).length;
    const total = validation.checks.length;
    const isValid = validation.checks.every(check => check.present);
    
    validation.summary = {
      passed,
      total,
      isValid,
      score: Math.round((passed / total) * 100)
    };
    
    // Log validation results
    ctx.logger.log(`🔍 Configuration validation: ${isValid ? "PASSED" : "FAILED"}`);
    ctx.logger.log(`📊 Score: ${validation.summary.score}% (${passed}/${total})`);
    
    if (!isValid) {
      const failed = validation.checks.filter(check => !check.present);
      ctx.logger.error("❌ Missing required configuration:");
      failed.forEach(check => {
        ctx.logger.error(`  - ${check.field}`);
      });
    }
    
    return {
      ok: isValid,
      artifacts: [],
      data: validation
    };
  }
});
```

## 🔍 **Explanation**

### **Configuration Hierarchy**

1. **Base Configuration**: Default GitVan settings
2. **Environment Configuration**: Environment-specific overrides
3. **Runtime Configuration**: Dynamic configuration at runtime
4. **Environment Variables**: System-level configuration

### **Environment Detection**

- **`NODE_ENV`**: Standard Node.js environment variable
- **`GITVAN_ENV`**: GitVan-specific environment variable
- **Fallback**: Defaults to "development"

### **Configuration Merging**

- **Base config**: Loaded first as foundation
- **Environment config**: Merged on top for overrides
- **Runtime config**: Merged for dynamic settings

## 🔄 **Variations**

### **Variation 1: Multi-Environment Deployment**

```javascript
// config/staging.js
export default {
  root: process.cwd(),
  jobs: { dir: "jobs" },
  templates: { 
    engine: "nunjucks", 
    dirs: ["templates"],
    noCache: false
  },
  receipts: { ref: "refs/notes/gitvan/results" },
  hooks: {
    "job:before"({ id }) {
      console.log(`🚀 [STAGING] Starting job: ${id}`);
    },
    "job:after"({ id, result }) {
      console.log(`✅ [STAGING] Job completed: ${id}`);
    }
  },
  runtimeConfig: {
    app: {
      name: "GitVan Staging",
      environment: "staging",
      debug: false
    },
    gitvan: {
      notesRef: "refs/notes/gitvan/results",
      logLevel: "warn"
    }
  }
};
```

### **Variation 2: Feature Flags**

```javascript
// config/feature-flags.js
export default {
  runtimeConfig: {
    app: {
      features: {
        enableAdvancedLogging: process.env.ENABLE_ADVANCED_LOGGING === "true",
        enableMetrics: process.env.ENABLE_METRICS === "true",
        enableDebugMode: process.env.ENABLE_DEBUG_MODE === "true"
      }
    }
  }
};
```

### **Variation 3: Dynamic Configuration**

```javascript
// jobs/config/dynamic-config.mjs
import { defineJob } from "gitvan/define";
import { loadEnvironmentConfig } from "../../config/loader.mjs";

export default defineJob({
  meta: {
    desc: "Update configuration dynamically based on environment",
    tags: ["config", "dynamic", "environment"]
  },
  async run({ ctx }) {
    const config = await loadEnvironmentConfig();
    
    // Dynamic configuration based on environment
    if (config.runtimeConfig.app.environment === "production") {
      // Production-specific settings
      config.templates.noCache = false;
      config.runtimeConfig.gitvan.logLevel = "info";
    } else if (config.runtimeConfig.app.environment === "development") {
      // Development-specific settings
      config.templates.noCache = true;
      config.runtimeConfig.gitvan.logLevel = "debug";
    }
    
    // Apply dynamic configuration
    const updatedConfig = {
      ...config,
      templates: {
        ...config.templates,
        noCache: config.templates.noCache
      },
      runtimeConfig: {
        ...config.runtimeConfig,
        gitvan: {
          ...config.runtimeConfig.gitvan,
          logLevel: config.runtimeConfig.gitvan.logLevel
        }
      }
    };
    
    ctx.logger.log("🔧 Dynamic configuration applied");
    ctx.logger.log(`📝 Cache enabled: ${!updatedConfig.templates.noCache}`);
    ctx.logger.log(`📊 Log level: ${updatedConfig.runtimeConfig.gitvan.logLevel}`);
    
    return {
      ok: true,
      artifacts: [],
      data: {
        originalConfig: config,
        updatedConfig,
        changes: {
          noCache: config.templates.noCache !== updatedConfig.templates.noCache,
          logLevel: config.runtimeConfig.gitvan.logLevel !== updatedConfig.runtimeConfig.gitvan.logLevel
        }
      }
    };
  }
});
```

## 🎯 **Best Practices**

### **Configuration Management**
- **Environment separation**: Keep configurations separate by environment
- **Validation**: Always validate configuration before use
- **Defaults**: Provide sensible defaults for all settings
- **Documentation**: Document all configuration options

### **Security**
- **Secrets management**: Never commit secrets to configuration files
- **Environment variables**: Use environment variables for sensitive data
- **Access control**: Restrict access to production configurations

### **Performance**
- **Caching**: Enable caching in production, disable in development
- **Logging levels**: Use appropriate logging levels per environment
- **Resource limits**: Set appropriate resource limits per environment

### **Maintenance**
- **Version control**: Keep configurations in version control
- **Change tracking**: Track configuration changes
- **Rollback capability**: Maintain ability to rollback configurations

## 🔗 **Related Recipes**

- [Basic Job Setup](./basic-job-setup.md) - Getting started with jobs
- [Template System](./template-system.md) - Advanced template usage
- [Error Handling](./error-handling.md) - Robust error handling patterns

## 📚 **Resources**

- [GitVan Configuration Guide](../../docs/configuration.md)
- [Environment Variables](../../docs/environment-variables.md)
- [Security Best Practices](../../docs/security.md)

## 🤝 **Contributors**

- **Author**: GitVan Team
- **Last Updated**: 2024-09-16
- **Version**: 1.0.0

---

**Next Recipe**: [Template System](./template-system.md)
