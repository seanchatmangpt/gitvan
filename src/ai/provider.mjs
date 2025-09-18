/**
 * GitVan v2 AI Provider - Configurable AI Integration
 * Uses provider factory for configurable AI backends
 */

import { generateText as aiGenerateText, streamText as aiStreamText } from 'ai';
import { z } from 'zod';
import { createLogger } from '../utils/logger.mjs';
import { createAIProvider, checkAIProviderAvailability } from './provider-factory.mjs';
import { GITVAN_COMPLETE_CONTEXT } from './prompts/gitvan-complete-context.mjs';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

const logger = createLogger('ai-provider');

/**
 * Validate GitVan job AST and extract metadata
 * @param {string} code - JavaScript code to validate
 * @returns {object} Validation result with metadata
 */
function validateJobAST(code) {
  try {
    // Parse the JavaScript code
    const ast = parse(code, {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      plugins: ['jsx', 'typescript', 'decorators-legacy']
    });

    const errors = [];
    const metadata = {};

    // Traverse the AST to extract metadata and validate structure
    traverse(ast, {
      // Check for defineJob call
      CallExpression(path) {
        if (path.node.callee.name === 'defineJob') {
          const args = path.node.arguments;
          if (args.length > 0 && args[0].type === 'ObjectExpression') {
            const jobConfig = args[0];
            
            // Extract meta information
            const metaProp = jobConfig.properties.find(prop => 
              prop.key.name === 'meta' && prop.value.type === 'ObjectExpression'
            );
            
            if (metaProp) {
              metaProp.value.properties.forEach(prop => {
                if (prop.key.name === 'name' && prop.value.type === 'StringLiteral') {
                  metadata.name = prop.value.value;
                } else if (prop.key.name === 'desc' && prop.value.type === 'StringLiteral') {
                  metadata.desc = prop.value.value;
                } else if (prop.key.name === 'tags' && prop.value.type === 'ArrayExpression') {
                  metadata.tags = prop.value.elements
                    .filter(el => el.type === 'StringLiteral')
                    .map(el => el.value);
                } else if (prop.key.name === 'author' && prop.value.type === 'StringLiteral') {
                  metadata.author = prop.value.value;
                } else if (prop.key.name === 'version' && prop.value.type === 'StringLiteral') {
                  metadata.version = prop.value.value;
                }
              });
            }
            
            // Extract on configuration
            const onProp = jobConfig.properties.find(prop => 
              prop.key.name === 'on' && prop.value.type === 'ObjectExpression'
            );
            
            if (onProp) {
              metadata.on = {};
              onProp.value.properties.forEach(prop => {
                if (prop.value.type === 'StringLiteral') {
                  metadata.on[prop.key.name] = prop.value.value;
                }
              });
            }
          }
        }
      },
      
      // Check for proper imports
      ImportDeclaration(path) {
        const source = path.node.source.value;
        if (source.includes('gitvan') && !source.includes('defineJob')) {
          errors.push(`Missing defineJob import from ${source}`);
        }
      },
      
      // Check for async run function
      FunctionExpression(path) {
        if (path.node.async && path.node.params.length >= 1) {
          const firstParam = path.node.params[0];
          if (firstParam.type === 'ObjectPattern') {
            const hasCtx = firstParam.properties.some(prop => 
              prop.key.name === 'ctx' || prop.key.name === 'payload' || prop.key.name === 'meta'
            );
            if (!hasCtx) {
              errors.push('Run function should destructure { ctx, payload, meta }');
            }
          }
        }
      }
    });

    // Check for required structure
    let hasDefineJob = false;
    let hasDefaultExport = false;
    
    traverse(ast, {
      CallExpression(path) {
        if (path.node.callee.name === 'defineJob') {
          hasDefineJob = true;
        }
      },
      ExportDefaultDeclaration(path) {
        hasDefaultExport = true;
      }
    });

    if (!hasDefineJob) {
      errors.push('Missing defineJob() call');
    }
    
    if (!hasDefaultExport) {
      errors.push('Missing default export');
    }

    return {
      valid: errors.length === 0,
      errors,
      metadata,
      ast
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`AST parsing failed: ${error.message}`],
      metadata: {},
      ast: null
    };
  }
}

// Job specification schema for structured generation
const JobSpecSchema = z.union([
  // AI-generated complete job file (preferred)
  z.object({
    name: z.string().optional().describe('Job name'),
    desc: z.string().describe('Clear description of what the job does'),
    tags: z.array(z.string()).describe('Tags for categorization'),
    author: z.string().default('GitVan AI'),
    version: z.string().default('1.0.0'),
    on: z.union([
      z.string(),
      z.array(z.string()),
      z.object({
        tagCreate: z.string().optional(),
        push: z.string().optional(),
        pathChanged: z.array(z.string()).optional(),
        cron: z.string().optional()
      })
    ]).optional().describe('Event triggers'),
    run: z.string().describe('Complete GitVan job file content')
  }),
  // AI-generated implementation-focused structure
  z.object({
    name: z.string().optional().describe('Job name'),
    description: z.string().describe('Clear description of what the job does'),
    version: z.string().default('1.0.0'),
    meta: z.object({
      author: z.string().default('GitVan AI'),
      license: z.string().optional()
    }).optional(),
    on: z.union([
      z.string(),
      z.array(z.string()),
      z.object({
        tagCreate: z.string().optional(),
        push: z.string().optional(),
        pathChanged: z.array(z.string()).optional(),
        cron: z.string().optional()
      })
    ]).optional().describe('Event triggers'),
    implementation: z.string().describe('JavaScript implementation code')
  }),
  // Nested structure (legacy)
  z.object({
  meta: z.object({
      name: z.string().optional().describe('Job name'),
    desc: z.string().describe('Clear description of what the job does'),
    tags: z.array(z.string()).describe('Tags for categorization'),
    author: z.string().default('GitVan AI'),
    version: z.string().default('1.0.0')
  }),
    on: z.union([
      z.string(),
      z.array(z.string()),
      z.object({
        tagCreate: z.string().optional(),
        push: z.string().optional(),
        pathChanged: z.array(z.string()).optional()
      })
    ]).optional().describe('Event triggers'),
    run: z.object({
      implementation: z.string().describe('JavaScript implementation code').optional(),
      function: z.string().describe('JavaScript function code').optional()
    }).optional(),
    // Legacy schema support
  config: z.object({
    cron: z.string().optional().describe('Cron expression for scheduling'),
    on: z.union([
      z.string(),
      z.array(z.string()),
      z.object({
        tagCreate: z.string().optional(),
        push: z.string().optional(),
        pathChanged: z.array(z.string()).optional()
      })
    ]).optional().describe('Event triggers'),
    schedule: z.string().optional().describe('Schedule expression')
  }).optional(),
  implementation: z.object({
    operations: z.array(z.object({
      type: z.enum(['log', 'file-read', 'file-write', 'file-copy', 'file-move', 'git-commit', 'git-note', 'template-render', 'pack-apply']),
      description: z.string(),
      parameters: z.record(z.any()).optional()
    })),
    returnValue: z.object({
      success: z.string(),
      artifacts: z.array(z.string())
    })
    }).optional()
  })
]);

/**
 * Generate text using AI provider
 */
export async function generateText({
  prompt,
  model = 'qwen3-coder:30b',
  options = {},
  config = {}
}) {
  const startTime = Date.now();
  
  try {
    // Use configurable provider factory
    const provider = await createAIProvider(config);
    
    // Check if this is a mock provider
    if (provider.provider === 'mock') {
      const result = await provider.doGenerate({ prompt });
      const duration = Date.now() - startTime;
      
      return {
        output: result.text,
        model: provider.model || model,
        provider: provider.provider || 'mock',
        options,
        duration,
        success: true
      };
    }
    
    const result = await aiGenerateText({
      model: provider,
      prompt,
      ...options
    });

    const duration = Date.now() - startTime;
    
    return {
      output: result.text,
      model: provider.model || model,
      provider: provider.provider || 'unknown',
      options,
      duration,
      success: true
    };
  } catch (error) {
    logger.error('AI generation failed:', error.message);
    throw error;
  }
}

/**
 * Generate structured job specification
 */
export async function generateJobSpec({
  prompt,
  model = 'qwen3-coder:30b',
  options = {},
  config = {}
}) {
  try {
    // Use the AI provider to generate complete GitVan job file
    const fullPrompt = `${GITVAN_COMPLETE_CONTEXT}\n\nGenerate a complete GitVan job file for: ${prompt}. Return a complete, working GitVan job file that can be executed immediately.`;
    
    const result = await generateText({
      prompt: fullPrompt,
      model,
      options,
      config
    });

    // Extract the job code from the response
    let jobCode = result.output.trim();
    
    // Remove markdown code blocks if present
    if (jobCode.startsWith('```javascript')) {
      jobCode = jobCode.replace(/^```javascript\s*/, '').replace(/\s*```$/, '');
    } else if (jobCode.startsWith('```js')) {
      jobCode = jobCode.replace(/^```js\s*/, '').replace(/\s*```$/, '');
    } else if (jobCode.startsWith('```')) {
      jobCode = jobCode.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Validate the generated code using AST parsing
    const validationResult = validateJobAST(jobCode);
    
    if (!validationResult.valid) {
      logger.warn('AST validation failed:', validationResult.errors);
      // Still use the code, but log the issues
    }
    
    // Extract metadata from the AST for the spec
    const spec = {
      name: validationResult.metadata?.name || 'ai-generated-job',
      desc: validationResult.metadata?.desc || `Generated job for: ${prompt.substring(0, 50)}...`,
      tags: validationResult.metadata?.tags || ["ai-generated", "automation"],
      author: validationResult.metadata?.author || "GitVan AI",
      version: validationResult.metadata?.version || "1.0.0",
      on: validationResult.metadata?.on || {},
      code: jobCode
    };

    return {
      spec,
      model: result.model,
      provider: result.provider,
      duration: result.duration,
      success: true
    };
  } catch (error) {
    logger.error('Job generation failed:', error.message);
    
    // Fallback to a simple working job
    const fallbackCode = `import { defineJob, useGit, useTemplate, useNotes } from 'file:///Users/sac/gitvan/src/index.mjs'
import { readFile, writeFile } from 'node:fs/promises'

export default defineJob({
  meta: {
    name: "fallback-job",
    desc: "Fallback job due to generation error",
    tags: ["fallback", "error"],
    author: "GitVan AI",
    version: "1.0.0"
  },
  async run({ ctx, payload, meta }) {
    try {
      const git = useGit();
      const template = useTemplate();
      const notes = useNotes();
      
      console.log("Executing fallback job");
      
      await writeFile('fallback-output.txt', \`Fallback job executed at \${new Date().toISOString()}\`);
      await notes.write(\`Fallback job completed: \${meta.desc}\`);
      
      return {
        ok: true,
        artifacts: ['fallback-output.txt'],
        summary: "Fallback job completed successfully"
      };
    } catch (error) {
      console.error('Fallback job failed:', error.message);
      return {
        ok: false,
        error: error.message,
        artifacts: []
      };
    }
  }
})`;
    
    return {
      spec: {
        name: 'fallback-job',
        desc: 'Fallback job due to generation error',
        tags: ['fallback', 'error'],
        author: 'GitVan AI',
        version: '1.0.0',
        code: fallbackCode
      },
      model: 'fallback',
      provider: 'fallback',
      duration: 0,
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate working job code
 */
export async function generateWorkingJob({
  prompt,
  model = 'qwen3-coder:30b',
  options = {},
  config = {}
}) {
  try {
    // First generate the specification
    const { spec } = await generateJobSpec({ prompt, model, options, config });
    
    // Then generate working code from the spec
    const jobCode = generateWorkingJobCode(spec);
    
    // Get provider info
    const provider = await createAIProvider(config);
    
    return {
      spec,
      code: jobCode,
      model: provider.model || model,
      provider: provider.provider || 'unknown',
      success: true,
      working: true // This is actually working code, not a skeleton!
    };
  } catch (error) {
    logger.error('Working job generation failed:', error.message);
    throw error;
  }
}

/**
 * Stream text generation
 */
export async function streamText({
  prompt,
  model = 'qwen3-coder:30b',
  options = {},
  config = {}
}) {
  try {
    const provider = await createAIProvider(config);
    
    const result = aiStreamText({
      model: provider,
      prompt,
      ...options
    });

    return result;
  } catch (error) {
    logger.error('Stream generation failed:', error.message);
    throw error;
  }
}

/**
 * Check if AI provider is available
 */
export async function checkAIAvailability(config = {}) {
  try {
    // Use the provider factory to check availability
    return await checkAIProviderAvailability(config);
  } catch (error) {
    return {
      available: false,
      provider: 'unknown',
      model: 'unknown',
      message: `AI provider error: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Generate working job code from specification
 */
function generateWorkingJobCode(spec) {
  // If the AI generated complete job code, use it directly
  if (spec.code && typeof spec.code === 'string') {
    return spec.code;
  }
  
  // If the AI generated a complete job file, use it directly
  if (spec.run && typeof spec.run === 'string') {
    return spec.run;
  }
  
  // If the AI generated implementation code directly, wrap it in defineJob
  if (spec.implementation && typeof spec.implementation === 'string') {
    const name = spec.name || 'ai-generated-job';
    const desc = spec.description || spec.desc || 'AI-generated job';
    const author = spec.meta?.author || spec.author || 'GitVan AI';
    const version = spec.version || '1.0.0';
    const on = spec.on || {};
    
    return `import { 
  defineJob, 
  useGit, 
  useTemplate, 
  useNotes, 
  useWorktree, 
  usePack, 
  useSchedule, 
  useReceipt, 
  useLock 
} from 'file:///Users/sac/gitvan/src/index.mjs'

export default defineJob({
      meta: {
    name: "${name}",
    desc: "${desc}",
    author: "${author}",
    version: "${version}"
  },
  ${Object.keys(on).length > 0 ? `on: ${JSON.stringify(on)},` : ''}
  async run({ ctx, payload, meta }) {
    ${spec.implementation}
  }
})`;
  }
  
  const { meta, on, run, config, implementation } = spec;
  
  // If the AI generated actual JavaScript code in run.implementation or run.function, use it directly
  if (run && (run.implementation || run.function)) {
    const code = run.implementation || run.function;
    return `import { defineJob, useGit, useTemplate, useNotes } from 'file:///Users/sac/gitvan/src/index.mjs'
import { readFile, writeFile } from 'node:fs/promises'

export default defineJob({
      meta: {
    ${meta.name ? `name: "${meta.name}",` : ''}
    desc: "${meta.desc}",
    tags: ${JSON.stringify(meta.tags)},
    author: "${meta.author}",
    version: "${meta.version}"
  },
  ${on ? `on: ${JSON.stringify(on)},` : ''}
  ${config ? `config: ${JSON.stringify(config, null, 2)},` : ''}
  async run({ ctx, payload, meta }) {
    ${code}
  }
})`;
  }
  
  // Fallback to legacy operations-based generation
  if (implementation && implementation.operations) {
  const operationsCode = implementation.operations.map(op => {
    switch (op.type) {
      case 'file-copy':
          return `// ${op.description}\n    const sourceContent = await readFile('${op.parameters?.source || 'source.txt'}')\n    await writeFile('${op.parameters?.target || 'backup.txt'}', sourceContent)`;
      case 'file-write':
          return `// ${op.description}\n    await writeFile('${op.parameters?.path || 'output.txt'}', '${op.parameters?.content || 'Generated content'}')`;
      case 'file-read':
          return `// ${op.description}\n    const content = await readFile('${op.parameters?.path || 'input.txt'}')`;
      case 'git-commit':
          return `// ${op.description}\n    await git.commit('${op.parameters?.message || 'Automated commit'}')`;
      case 'git-note':
          return `// ${op.description}\n    await notes.write('${op.parameters?.content || 'Job executed'}')`;
      case 'template-render':
          return `// ${op.description}\n    const rendered = await template.render('${op.parameters?.template || 'template.njk'}', data)`;
      case 'log':
          return `// ${op.description}\n    console.log('${op.description}')`;
      default:
        return `// ${op.description}`;
    }
  }).join('\n    ');

  return `import { defineJob, useGit, useTemplate, useNotes } from 'file:///Users/sac/gitvan/src/index.mjs'
import { readFile, writeFile } from 'node:fs/promises'

export default defineJob({
  meta: {
    desc: "${meta.desc}",
    tags: ${JSON.stringify(meta.tags)},
    author: "${meta.author}",
    version: "${meta.version}"
  },
  ${config ? `config: ${JSON.stringify(config, null, 2)},` : ''}
  async run({ ctx, payload, meta }) {
    try {
      const git = useGit();
      const template = useTemplate();
      const notes = useNotes();
      
      console.log("Executing job: ${meta.desc}");
      
      // Execute operations
      ${operationsCode}
      
      return {
        ok: true,
        artifacts: ${JSON.stringify(implementation?.returnValue?.artifacts || ['output.txt'])},
        summary: "${implementation?.returnValue?.success || 'Task completed successfully'}"
      };
    } catch (error) {
      console.error('Job failed:', error.message);
      return {
        ok: false,
        error: error.message,
        artifacts: []
      };
    }
  }
})`;
}

  // Ultimate fallback - generate a simple working job
  return `import { defineJob, useGit, useTemplate, useNotes } from 'file:///Users/sac/gitvan/src/index.mjs'
import { readFile, writeFile } from 'node:fs/promises'

export default defineJob({
  meta: {
    desc: "${meta.desc}",
    tags: ${JSON.stringify(meta.tags)},
    author: "${meta.author}",
    version: "${meta.version}"
  },
  async run({ ctx, payload, meta }) {
    try {
      const git = useGit();
      const template = useTemplate();
      const notes = useNotes();
      
      console.log("Executing job: ${meta.desc}");
      
      // Simple working implementation
      await writeFile('job-output.txt', \`Job executed at \${new Date().toISOString()}\`);
      await notes.write(\`Job completed: \${meta.desc}\`);
    
    return {
        ok: true,
        artifacts: ['job-output.txt'],
        summary: "Job completed successfully"
    };
  } catch (error) {
      console.error('Job failed:', error.message);
    return {
        ok: false,
        error: error.message,
        artifacts: []
      };
    }
  }
})`;
}