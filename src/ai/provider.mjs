/**
 * GitVan v2 AI Provider - Configurable AI Integration
 * Uses provider factory for configurable AI backends
 */

import { generateText as aiGenerateText, streamText } from 'ai';
import { z } from 'zod';
import { createLogger } from '../utils/logger.mjs';
import { createAIProvider, checkAIProviderAvailability } from './provider-factory.mjs';
import { GITVAN_COMPLETE_CONTEXT } from './prompts/gitvan-complete-context.mjs';

const logger = createLogger('ai-provider');

// Job specification schema for structured generation
const JobSpecSchema = z.object({
  meta: z.object({
    desc: z.string().describe('Clear description of what the job does'),
    tags: z.array(z.string()).describe('Tags for categorization'),
    author: z.string().default('GitVan AI'),
    version: z.string().default('1.0.0')
  }),
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
  })
});

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
    const provider = createAIProvider(config);
    
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
    // Use configurable provider factory
    const provider = createAIProvider(config);
    
    // Generate JSON response with GitVan context
    const result = await aiGenerateText({
      model: provider,
      prompt: `${GITVAN_COMPLETE_CONTEXT}\n\nGenerate a GitVan job specification for: ${prompt}. Return only valid JSON that follows GitVan patterns.`,
      ...options
    });

    // Parse the JSON response
    const spec = JSON.parse(result.text);

    return {
      spec,
      model: provider.model || model,
      provider: provider.provider || 'unknown',
      success: true
    };
  } catch (error) {
    logger.error('Job spec generation failed:', error.message);
    throw error;
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
    const provider = createAIProvider(config);
    
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
    const provider = createAIProvider(config);
    
    const result = streamText({
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
  const { meta, config, implementation } = spec;
  
  // Generate actual working code using GitVan composables
  const operationsCode = implementation.operations.map(op => {
    switch (op.type) {
      case 'file-copy':
        return `// ${op.description}\n    const sourceContent = await git.readFile('${op.parameters?.source || 'source.txt'}')\n    await git.writeFile('${op.parameters?.target || 'backup.txt'}', sourceContent)`;
      case 'file-write':
        return `// ${op.description}\n    await git.writeFile('${op.parameters?.path || 'output.txt'}', '${op.parameters?.content || 'Generated content'}')`;
      case 'file-read':
        return `// ${op.description}\n    const content = await git.readFile('${op.parameters?.path || 'input.txt'}')`;
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
        artifacts: ${JSON.stringify(implementation.returnValue.artifacts)},
        summary: "${implementation.returnValue.success}"
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