# Error Handling

## 🎯 **Recipe Overview**

**Category**: Foundation  
**Difficulty**: Intermediate  
**Time**: 40 minutes  
**Prerequisites**: Basic GitVan knowledge, error handling experience

## 📋 **Problem**

You need to implement robust error handling in your GitVan jobs to ensure graceful failures, proper logging, and recovery mechanisms. You want to handle various types of errors including git operations, file system issues, and external service failures.

## 🍳 **Solution**

### **Step 1: Create Error Handling Utilities**

```javascript
// utils/error-handler.mjs
export class GitVanError extends Error {
  constructor(message, code, context = {}) {
    super(message);
    this.name = 'GitVanError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

export class GitOperationError extends GitVanError {
  constructor(message, gitCommand, context = {}) {
    super(message, 'GIT_OPERATION_ERROR', { gitCommand, ...context });
    this.name = 'GitOperationError';
  }
}

export class FileSystemError extends GitVanError {
  constructor(message, filePath, context = {}) {
    super(message, 'FILE_SYSTEM_ERROR', { filePath, ...context });
    this.name = 'FileSystemError';
  }
}

export class ValidationError extends GitVanError {
  constructor(message, field, value, context = {}) {
    super(message, 'VALIDATION_ERROR', { field, value, ...context });
    this.name = 'ValidationError';
  }
}

export class ExternalServiceError extends GitVanError {
  constructor(message, service, context = {}) {
    super(message, 'EXTERNAL_SERVICE_ERROR', { service, ...context });
    this.name = 'ExternalServiceError';
  }
}

export function createErrorHandler(ctx) {
  return {
    handleGitError(error, command) {
      ctx.logger.error(`Git operation failed: ${command}`, error.message);
      throw new GitOperationError(error.message, command, {
        originalError: error,
        stderr: error.stderr,
        stdout: error.stdout
      });
    },
    
    handleFileSystemError(error, filePath) {
      ctx.logger.error(`File system operation failed: ${filePath}`, error.message);
      throw new FileSystemError(error.message, filePath, {
        originalError: error,
        code: error.code
      });
    },
    
    handleValidationError(message, field, value) {
      ctx.logger.error(`Validation failed: ${field}`, message);
      throw new ValidationError(message, field, value);
    },
    
    handleExternalServiceError(error, service) {
      ctx.logger.error(`External service failed: ${service}`, error.message);
      throw new ExternalServiceError(error.message, service, {
        originalError: error,
        statusCode: error.statusCode,
        response: error.response
      });
    }
  };
}
```

### **Step 2: Create Robust Job with Error Handling**

```javascript
// jobs/error-handling/robust-job.mjs
import { defineJob } from "gitvan/define";
import { useGit } from "gitvan/useGit";
import { useTemplate } from "gitvan/useTemplate";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { 
  createErrorHandler, 
  GitVanError, 
  GitOperationError, 
  FileSystemError, 
  ValidationError 
} from "../../utils/error-handler.mjs";

export default defineJob({
  meta: {
    desc: "Demonstrate robust error handling patterns in GitVan jobs",
    tags: ["error-handling", "robust", "patterns"]
  },
  async run({ ctx, payload }) {
    const git = useGit();
    const template = await useTemplate();
    const errorHandler = createErrorHandler(ctx);
    
    try {
      // Validate input payload
      if (!payload || typeof payload !== 'object') {
        errorHandler.handleValidationError('Payload must be an object', 'payload', payload);
      }
      
      if (payload.requiredField && typeof payload.requiredField !== 'string') {
        errorHandler.handleValidationError('requiredField must be a string', 'requiredField', payload.requiredField);
      }
      
      ctx.logger.log("✅ Input validation passed");
      
      // Safe git operations with error handling
      let repositoryInfo;
      try {
        const head = await git.head();
        const branch = await git.getCurrentBranch();
        const isClean = await git.isClean();
        
        repositoryInfo = {
          head: head.substring(0, 8),
          branch,
          isClean,
          timestamp: ctx.nowISO
        };
        
        ctx.logger.log("✅ Git operations completed successfully");
      } catch (error) {
        errorHandler.handleGitError(error, 'repository-info');
      }
      
      // Safe file operations with error handling
      let outputPath;
      try {
        const distDir = join(ctx.root, "dist");
        await fs.mkdir(distDir, { recursive: true });
        
        outputPath = join(distDir, "robust-job-output.json");
        
        const outputData = {
          success: true,
          repository: repositoryInfo,
          payload: payload,
          generatedAt: ctx.nowISO,
          jobId: ctx.jobId || 'unknown'
        };
        
        await fs.writeFile(outputPath, JSON.stringify(outputData, null, 2));
        
        ctx.logger.log(`✅ Output file created: ${outputPath}`);
      } catch (error) {
        errorHandler.handleFileSystemError(error, outputPath);
      }
      
      // Safe template operations with error handling
      let templatePath;
      try {
        templatePath = await template.renderToFile(
          "robust-job.njk",
          "dist/robust-job-report.html",
          {
            title: "Robust Job Report",
            repository: repositoryInfo,
            payload: payload,
            generatedAt: ctx.nowISO,
            success: true
          }
        );
        
        ctx.logger.log(`✅ Template rendered: ${templatePath}`);
      } catch (error) {
        // Template errors are not critical, log and continue
        ctx.logger.warn(`⚠️ Template rendering failed: ${error.message}`);
        templatePath = null;
      }
      
      // Return success result
      return {
        ok: true,
        artifacts: [outputPath, templatePath].filter(Boolean),
        data: {
          repository: repositoryInfo,
          payload: payload,
          outputPath,
          templatePath,
          success: true
        }
      };
      
    } catch (error) {
      // Handle any unexpected errors
      ctx.logger.error(`❌ Job failed with error: ${error.message}`);
      
      // Create error report
      const errorReport = {
        success: false,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          context: error.context,
          timestamp: ctx.nowISO,
          stack: error.stack
        },
        jobId: ctx.jobId || 'unknown',
        payload: payload
      };
      
      // Try to save error report
      try {
        const errorPath = join(ctx.root, "dist", "error-report.json");
        await fs.mkdir(join(ctx.root, "dist"), { recursive: true });
        await fs.writeFile(errorPath, JSON.stringify(errorReport, null, 2));
        
        ctx.logger.log(`📝 Error report saved: ${errorPath}`);
        
        return {
          ok: false,
          artifacts: [errorPath],
          data: errorReport
        };
      } catch (saveError) {
        ctx.logger.error(`❌ Failed to save error report: ${saveError.message}`);
        
        // Re-throw original error
        throw error;
      }
    }
  }
});
```

### **Step 3: Create Retry Mechanism**

```javascript
// jobs/error-handling/retry-job.mjs
import { defineJob } from "gitvan/define";
import { useGit } from "gitvan/useGit";
import { createErrorHandler, ExternalServiceError } from "../../utils/error-handler.mjs";

export default defineJob({
  meta: {
    desc: "Demonstrate retry mechanism for unreliable operations",
    tags: ["error-handling", "retry", "resilience"]
  },
  async run({ ctx, payload }) {
    const git = useGit();
    const errorHandler = createErrorHandler(ctx);
    
    const maxRetries = payload?.maxRetries || 3;
    const retryDelay = payload?.retryDelay || 1000;
    
    // Simulate unreliable operation
    const unreliableOperation = async (attempt) => {
      ctx.logger.log(`🔄 Attempt ${attempt}/${maxRetries}`);
      
      // Simulate random failures
      if (Math.random() < 0.7) {
        throw new ExternalServiceError(`Simulated failure on attempt ${attempt}`, 'mock-service');
      }
      
      return {
        success: true,
        attempt,
        timestamp: ctx.nowISO
      };
    };
    
    let lastError;
    let result;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        result = await unreliableOperation(attempt);
        ctx.logger.log(`✅ Operation succeeded on attempt ${attempt}`);
        break;
      } catch (error) {
        lastError = error;
        ctx.logger.warn(`⚠️ Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < maxRetries) {
          const delay = retryDelay * attempt; // Exponential backoff
          ctx.logger.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    if (!result) {
      ctx.logger.error(`❌ All ${maxRetries} attempts failed`);
      throw lastError;
    }
    
    return {
      ok: true,
      artifacts: [],
      data: {
        ...result,
        totalAttempts: maxRetries,
        finalAttempt: result.attempt
      }
    };
  }
});
```

### **Step 4: Create Circuit Breaker Pattern**

```javascript
// jobs/error-handling/circuit-breaker-job.mjs
import { defineJob } from "gitvan/define";
import { createErrorHandler, ExternalServiceError } from "../../utils/error-handler.mjs";

export default defineJob({
  meta: {
    desc: "Demonstrate circuit breaker pattern for external services",
    tags: ["error-handling", "circuit-breaker", "resilience"]
  },
  async run({ ctx, payload }) {
    const errorHandler = createErrorHandler(ctx);
    
    // Circuit breaker state
    const circuitBreaker = {
      state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      failureCount: 0,
      lastFailureTime: null,
      successCount: 0,
      threshold: payload?.failureThreshold || 5,
      timeout: payload?.timeout || 60000, // 1 minute
      resetTimeout: payload?.resetTimeout || 30000 // 30 seconds
    };
    
    const callExternalService = async () => {
      // Simulate external service call
      if (Math.random() < 0.3) {
        throw new ExternalServiceError('External service unavailable', 'mock-service');
      }
      
      return {
        data: 'Service response',
        timestamp: ctx.nowISO
      };
    };
    
    const executeWithCircuitBreaker = async () => {
      const now = Date.now();
      
      // Check circuit breaker state
      if (circuitBreaker.state === 'OPEN') {
        if (now - circuitBreaker.lastFailureTime > circuitBreaker.resetTimeout) {
          circuitBreaker.state = 'HALF_OPEN';
          circuitBreaker.successCount = 0;
          ctx.logger.log('🔄 Circuit breaker: HALF_OPEN');
        } else {
          throw new ExternalServiceError('Circuit breaker is OPEN', 'circuit-breaker');
        }
      }
      
      try {
        const result = await callExternalService();
        
        // Success
        circuitBreaker.failureCount = 0;
        circuitBreaker.successCount++;
        
        if (circuitBreaker.state === 'HALF_OPEN') {
          if (circuitBreaker.successCount >= 2) {
            circuitBreaker.state = 'CLOSED';
            ctx.logger.log('✅ Circuit breaker: CLOSED');
          }
        }
        
        return result;
      } catch (error) {
        // Failure
        circuitBreaker.failureCount++;
        circuitBreaker.lastFailureTime = now;
        
        if (circuitBreaker.failureCount >= circuitBreaker.threshold) {
          circuitBreaker.state = 'OPEN';
          ctx.logger.warn('⚠️ Circuit breaker: OPEN');
        }
        
        throw error;
      }
    };
    
    try {
      const result = await executeWithCircuitBreaker();
      
      return {
        ok: true,
        artifacts: [],
        data: {
          ...result,
          circuitBreaker: {
            state: circuitBreaker.state,
            failureCount: circuitBreaker.failureCount,
            successCount: circuitBreaker.successCount
          }
        }
      };
    } catch (error) {
      ctx.logger.error(`❌ Circuit breaker operation failed: ${error.message}`);
      
      return {
        ok: false,
        artifacts: [],
        data: {
          error: error.message,
          circuitBreaker: {
            state: circuitBreaker.state,
            failureCount: circuitBreaker.failureCount,
            successCount: circuitBreaker.successCount
          }
        }
      };
    }
  }
});
```

### **Step 5: Create Error Recovery Job**

```javascript
// jobs/error-handling/recovery-job.mjs
import { defineJob } from "gitvan/define";
import { useGit } from "gitvan/useGit";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { createErrorHandler, FileSystemError } from "../../utils/error-handler.mjs";

export default defineJob({
  meta: {
    desc: "Demonstrate error recovery and cleanup patterns",
    tags: ["error-handling", "recovery", "cleanup"]
  },
  async run({ ctx, payload }) {
    const git = useGit();
    const errorHandler = createErrorHandler(ctx);
    
    let tempFiles = [];
    let resources = [];
    
    try {
      // Create temporary resources
      const tempDir = join(ctx.root, "temp", `job-${Date.now()}`);
      await fs.mkdir(tempDir, { recursive: true });
      resources.push(tempDir);
      
      // Create temporary files
      const tempFile1 = join(tempDir, "temp1.txt");
      const tempFile2 = join(tempDir, "temp2.txt");
      
      await fs.writeFile(tempFile1, "Temporary data 1");
      await fs.writeFile(tempFile2, "Temporary data 2");
      
      tempFiles.push(tempFile1, tempFile2);
      resources.push(tempFile1, tempFile2);
      
      ctx.logger.log("✅ Temporary resources created");
      
      // Simulate some work that might fail
      if (payload?.shouldFail) {
        throw new Error("Simulated failure for recovery demonstration");
      }
      
      // Process the temporary files
      const results = [];
      for (const tempFile of tempFiles) {
        const content = await fs.readFile(tempFile, 'utf-8');
        results.push({
          file: tempFile,
          content,
          processed: true
        });
      }
      
      // Create final output
      const outputPath = join(ctx.root, "dist", "recovery-job-output.json");
      await fs.mkdir(join(ctx.root, "dist"), { recursive: true });
      
      const outputData = {
        success: true,
        results,
        timestamp: ctx.nowISO
      };
      
      await fs.writeFile(outputPath, JSON.stringify(outputData, null, 2));
      
      ctx.logger.log("✅ Job completed successfully");
      
      return {
        ok: true,
        artifacts: [outputPath],
        data: outputData
      };
      
    } catch (error) {
      ctx.logger.error(`❌ Job failed: ${error.message}`);
      
      // Recovery: try to salvage what we can
      const recoveryData = {
        success: false,
        error: error.message,
        timestamp: ctx.nowISO,
        recoveredData: []
      };
      
      // Try to recover data from temporary files
      for (const tempFile of tempFiles) {
        try {
          const content = await fs.readFile(tempFile, 'utf-8');
          recoveryData.recoveredData.push({
            file: tempFile,
            content,
            recovered: true
          });
        } catch (recoveryError) {
          ctx.logger.warn(`⚠️ Could not recover data from ${tempFile}`);
        }
      }
      
      // Save recovery data
      const recoveryPath = join(ctx.root, "dist", "recovery-data.json");
      await fs.mkdir(join(ctx.root, "dist"), { recursive: true });
      await fs.writeFile(recoveryPath, JSON.stringify(recoveryData, null, 2));
      
      return {
        ok: false,
        artifacts: [recoveryPath],
        data: recoveryData
      };
      
    } finally {
      // Cleanup: always clean up resources
      ctx.logger.log("🧹 Cleaning up resources...");
      
      for (const resource of resources) {
        try {
          const stat = await fs.stat(resource);
          if (stat.isDirectory()) {
            await fs.rmdir(resource, { recursive: true });
          } else {
            await fs.unlink(resource);
          }
          ctx.logger.log(`✅ Cleaned up: ${resource}`);
        } catch (cleanupError) {
          ctx.logger.warn(`⚠️ Could not clean up ${resource}: ${cleanupError.message}`);
        }
      }
      
      ctx.logger.log("✅ Cleanup completed");
    }
  }
});
```

## 🔍 **Explanation**

### **Error Types**

1. **`GitVanError`**: Base error class with context
2. **`GitOperationError`**: Git-specific errors
3. **`FileSystemError`**: File system operation errors
4. **`ValidationError`**: Input validation errors
5. **`ExternalServiceError`**: External service failures

### **Error Handling Patterns**

1. **Try-Catch Blocks**: Wrap risky operations
2. **Error Context**: Provide context for debugging
3. **Graceful Degradation**: Continue with reduced functionality
4. **Recovery Mechanisms**: Attempt to recover from failures
5. **Cleanup**: Always clean up resources

### **Resilience Patterns**

1. **Retry Logic**: Retry failed operations with backoff
2. **Circuit Breaker**: Prevent cascading failures
3. **Timeout Handling**: Prevent hanging operations
4. **Resource Cleanup**: Ensure resources are released

## 🔄 **Variations**

### **Variation 1: Timeout Handling**

```javascript
// jobs/error-handling/timeout-job.mjs
import { defineJob } from "gitvan/define";
import { createErrorHandler, ExternalServiceError } from "../../utils/error-handler.mjs";

export default defineJob({
  meta: {
    desc: "Demonstrate timeout handling for long-running operations",
    tags: ["error-handling", "timeout", "async"]
  },
  async run({ ctx, payload }) {
    const errorHandler = createErrorHandler(ctx);
    const timeout = payload?.timeout || 5000; // 5 seconds
    
    const longRunningOperation = () => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() < 0.5) {
            resolve({ success: true, duration: timeout });
          } else {
            reject(new ExternalServiceError('Operation timed out', 'timeout-service'));
          }
        }, timeout + 1000); // Simulate operation that takes longer than timeout
      });
    };
    
    try {
      const result = await Promise.race([
        longRunningOperation(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new ExternalServiceError('Operation timeout', 'timeout')), timeout)
        )
      ]);
      
      return {
        ok: true,
        artifacts: [],
        data: result
      };
    } catch (error) {
      ctx.logger.error(`❌ Operation failed: ${error.message}`);
      
      return {
        ok: false,
        artifacts: [],
        data: {
          error: error.message,
          timeout
        }
      };
    }
  }
});
```

### **Variation 2: Bulk Operation with Partial Success**

```javascript
// jobs/error-handling/bulk-operation.mjs
import { defineJob } from "gitvan/define";
import { createErrorHandler } from "../../utils/error-handler.mjs";

export default defineJob({
  meta: {
    desc: "Demonstrate handling partial failures in bulk operations",
    tags: ["error-handling", "bulk", "partial-success"]
  },
  async run({ ctx, payload }) {
    const errorHandler = createErrorHandler(ctx);
    const items = payload?.items || ['item1', 'item2', 'item3', 'item4', 'item5'];
    
    const results = {
      successful: [],
      failed: [],
      total: items.length
    };
    
    for (const item of items) {
      try {
        // Simulate processing that might fail
        if (Math.random() < 0.3) {
          throw new Error(`Processing failed for ${item}`);
        }
        
        const result = {
          item,
          processed: true,
          timestamp: ctx.nowISO
        };
        
        results.successful.push(result);
        ctx.logger.log(`✅ Processed: ${item}`);
        
      } catch (error) {
        const failure = {
          item,
          error: error.message,
          timestamp: ctx.nowISO
        };
        
        results.failed.push(failure);
        ctx.logger.warn(`⚠️ Failed to process: ${item} - ${error.message}`);
      }
    }
    
    const successRate = (results.successful.length / results.total) * 100;
    const isSuccess = successRate >= 50; // Consider success if 50% or more succeed
    
    ctx.logger.log(`📊 Bulk operation completed: ${successRate.toFixed(1)}% success rate`);
    
    return {
      ok: isSuccess,
      artifacts: [],
      data: {
        ...results,
        successRate,
        isSuccess
      }
    };
  }
});
```

## 🎯 **Best Practices**

### **Error Handling**
- **Specific Error Types**: Use specific error classes for different failure modes
- **Error Context**: Include context information for debugging
- **Graceful Degradation**: Continue operation with reduced functionality when possible
- **Error Recovery**: Implement recovery mechanisms where appropriate

### **Logging**
- **Structured Logging**: Use consistent log formats
- **Error Levels**: Use appropriate log levels (error, warn, info, debug)
- **Context Information**: Include relevant context in log messages
- **Sensitive Data**: Avoid logging sensitive information

### **Resource Management**
- **Cleanup**: Always clean up resources in finally blocks
- **Resource Tracking**: Keep track of created resources
- **Error Recovery**: Attempt to recover resources on failure
- **Timeout Handling**: Set appropriate timeouts for operations

### **Testing**
- **Error Scenarios**: Test error handling paths
- **Recovery Testing**: Verify recovery mechanisms work
- **Resource Cleanup**: Ensure resources are properly cleaned up
- **Edge Cases**: Test edge cases and boundary conditions

## 🔗 **Related Recipes**

- [Basic Job Setup](./basic-job-setup.md) - Getting started with jobs
- [Configuration Management](./configuration-management.md) - Managing configurations
- [Template System](./template-system.md) - Advanced template usage

## 📚 **Resources**

- [Error Handling Best Practices](../../docs/error-handling.md)
- [GitVan Error Types](../../docs/error-types.md)
- [Resilience Patterns](../../docs/resilience-patterns.md)

## 🤝 **Contributors**

- **Author**: GitVan Team
- **Last Updated**: 2024-09-16
- **Version**: 1.0.0

---

**Next Recipe**: [Changelog Generation](../documentation/changelog-generation.md)
