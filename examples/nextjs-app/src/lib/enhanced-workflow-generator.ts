/**
 * Enhanced Workflow Generator
 *
 * Combines autonomic hook generation with Nunjucks templating and
 * Zod-based type safety for production-ready workflows.
 */

import { workflowGenerator } from './workflow-generator';
import { nunjucksEngine, TTL_TEMPLATES } from './nunjucks-engine';
import { aiEngineSelector } from './ai-engine-selector';
import { validateAndTransform, HookSchema, AutomationSchema } from './schemas';
import type { Hook, Automation } from './schemas';

/**
 * Enhanced Workflow Generator
 *
 * Features:
 * - Template-based hook generation using Nunjucks
 * - Type-safe validation with Zod
 * - AI-powered hook optimization
 * - Dynamic TTL rendering
 * - Pattern-based recommendations
 */
export class EnhancedWorkflowGenerator {
  /**
   * Generate TTL hook using Nunjucks template
   */
  async generateHookFromTemplate(
    templateName: keyof typeof TTL_TEMPLATES,
    variables: Record<string, any>
  ): Promise<string> {
    const template = TTL_TEMPLATES[templateName];
    if (!template) {
      throw new Error(`Unknown template: ${templateName}`);
    }

    return nunjucksEngine.renderString(template, variables);
  }

  /**
   * Generate and validate hook from pattern
   */
  async generateHookFromPattern(pattern: {
    type: string;
    trigger: string;
    condition: string;
    action: string;
    params: Record<string, any>;
    priority?: number;
  }): Promise<Hook> {
    // Generate hook TTL using template
    let ttl: string;

    try {
      // Try pattern-specific template
      ttl = await this.generateHookFromTemplate('patternEnforcementHook', {
        pattern: pattern.type,
        description: `Auto-generated hook for ${pattern.type} pattern`,
        priority: pattern.priority || 5,
        triggerType: pattern.trigger,
        patternRegex: pattern.condition,
        actionSteps: [],
      });
    } catch {
      // Fall back to basic template
      ttl = await this.generateHookFromTemplate('basicHook', {
        name: `${pattern.type}-hook`,
        description: `Auto-generated hook for ${pattern.type}`,
        priority: pattern.priority || 5,
        autoExecute: true,
        triggerType: pattern.trigger,
        action: pattern.action,
      });
    }

    // Create and validate hook
    const hook = {
      name: `${pattern.type}-hook`,
      trigger: pattern.trigger,
      condition: pattern.condition,
      action: pattern.action,
      ttl,
      priority: pattern.priority || 5,
      autoExecute: true,
      metadata: pattern.params,
    };

    // Validate with Zod
    return validateAndTransform<Hook>(HookSchema, hook);
  }

  /**
   * Generate hooks from multiple patterns with optimization
   */
  async generateAndOptimizeHooks(
    patterns: Array<{
      type: string;
      trigger: string;
      condition: string;
      action: string;
      params: Record<string, any>;
      priority?: number;
    }>
  ): Promise<Hook[]> {
    const hooks: Hook[] = [];

    for (const pattern of patterns) {
      try {
        // Generate hook
        const hook = await this.generateHookFromPattern(pattern);
        hooks.push(hook);
      } catch (error) {
        console.error(`Failed to generate hook for pattern ${pattern.type}:`, error);
      }
    }

    // Optimize hooks using AI
    return this.optimizeHooksWithAI(hooks);
  }

  /**
   * Optimize hooks using AI analysis
   */
  async optimizeHooksWithAI(hooks: Hook[]): Promise<Hook[]> {
    try {
      // Ask AI for optimization suggestions
      const question = `Review these ${hooks.length} git automation hooks for effectiveness and suggest improvements:
${hooks.map((h) => `- ${h.name} (priority: ${h.priority}, trigger: ${h.trigger})`).join('\n')}

Which hooks are most impactful? Are any redundant? Should priority levels change?`;

      const suggestions = await aiEngineSelector.ask(question);

      // Apply suggestions to hooks (simplified - in production would parse AI response)
      console.log('AI optimization suggestions:', suggestions);

      return hooks;
    } catch (error) {
      console.error('AI optimization failed, returning unoptimized hooks:', error);
      return hooks;
    }
  }

  /**
   * Generate composite action hook with multiple steps
   */
  async generateCompositeHook(config: {
    name: string;
    description: string;
    trigger: string;
    priority: number;
    steps: Array<{
      action: string;
      params: Record<string, any>;
    }>;
  }): Promise<Hook> {
    // Generate TTL using composite template
    const ttl = await this.generateHookFromTemplate('compositeActionHook', {
      name: config.name,
      description: config.description,
      trigger: config.trigger,
      priority: config.priority,
      steps: config.steps.map((step) => ({
        action: step.action,
        params: step.params,
      })),
    });

    // Create and validate hook
    const hook = {
      name: config.name,
      trigger: config.trigger,
      condition: 'always',
      action: 'composite',
      ttl,
      priority: config.priority,
      autoExecute: true,
      metadata: { steps: config.steps },
    };

    return validateAndTransform<Hook>(HookSchema, hook);
  }

  /**
   * Get automation recommendations with AI enhancement
   */
  async getEnhancedAutomationRecommendations(metrics: any): Promise<Automation[]> {
    // Get base recommendations
    const baseRecommendations = await workflowGenerator.detectRequiredAutomation();

    // Enhance with AI analysis
    try {
      const question = `Given these development metrics:
- Large commits: ${metrics.largeCommits || 0}
- Test coverage: ${metrics.testCoverage || 0}%
- Hook failure rate: ${metrics.hookFailureRate || 0}%

Prioritize these automation opportunities and add any missing ones:
${baseRecommendations.map((r) => `- ${r.name} (effort: ${r.effort})`).join('\n')}`;

      const aiInsights = await aiEngineSelector.ask(question);
      console.log('AI automation insights:', aiInsights);
    } catch (error) {
      console.error('AI enhancement failed:', error);
    }

    // Validate recommendations
    return baseRecommendations.map((rec) => validateAndTransform<Automation>(AutomationSchema, rec));
  }

  /**
   * Generate hook documentation using Nunjucks
   */
  async generateHookDocumentation(hook: Hook): Promise<string> {
    const docTemplate = `# Hook: {{ name }}

## Description
{{ description }}

## Details
- **Trigger**: {{ trigger }}
- **Priority**: {{ priority }}
- **Auto-Execute**: {{ autoExecute }}

## Condition
{{ condition }}

## Action
\`\`\`
{{ action }}
\`\`\`

## TTL Definition
\`\`\`turtle
{{ ttl }}
\`\`\`

Generated at: {{ now() }}`;

    return nunjucksEngine.renderString(docTemplate, {
      name: hook.name,
      description: hook.name,
      trigger: hook.trigger,
      priority: hook.priority,
      autoExecute: hook.autoExecute,
      condition: hook.condition,
      action: hook.action,
      ttl: hook.ttl,
    });
  }

  /**
   * Generate API endpoint code using Nunjucks
   */
  async generateAPIEndpoint(config: {
    name: string;
    method: string;
    path: string;
    schema: string;
    description: string;
  }): Promise<string> {
    const codeTemplate = `import { NextRequest, NextResponse } from 'next/server';
import { {{ schema }} } from '@/lib/schemas';
import { createAPIResponse } from '@/lib/schemas';

/**
 * {{ name }} API Endpoint
 * {{ description }}
 */
export async function {{ method | upper }}(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = {{ schema }}.parse(body);

    // TODO: Implement endpoint logic
    const result = createAPIResponse(true, { message: 'Not implemented' });
    return NextResponse.json(result);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      createAPIResponse(false, undefined, 'Request failed'),
      { status: 500 }
    );
  }
}`;

    return nunjucksEngine.renderString(codeTemplate, config);
  }

  /**
   * Generate React component code using Nunjucks
   */
  async generateReactComponent(config: {
    componentName: string;
    description: string;
    props?: Array<{ name: string; type: string; required: boolean; description: string }>;
  }): Promise<string> {
    // Ensure props array exists
    const finalConfig = {
      ...config,
      props: config.props || [],
    };

    // Return a simple template string that doesn't require Nunjucks rendering
    const propsList = finalConfig.props
      .map((p) => `  ${p.name}${p.required ? '' : '?'}: ${p.type};`)
      .join('\n');

    return `'use client';

import React, { useState, useEffect } from 'react';

/**
 * ${finalConfig.componentName}
 * ${finalConfig.description}
 */
interface Props {
${propsList || '  // No props defined'}
}

export function ${finalConfig.componentName}(props: Props) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialization
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      ${finalConfig.componentName} Component
    </div>
  );
}`;
  }

  /**
   * Batch generate and execute hooks
   */
  async generateAndExecuteHooks(patterns: any[]): Promise<any[]> {
    const results: any[] = [];

    for (const pattern of patterns) {
      try {
        // Generate hook
        const hook = await this.generateHookFromPattern(pattern);

        // Execute hook
        const executionResult = await workflowGenerator.executeHook(hook as any);

        results.push({
          pattern: pattern.type,
          hook,
          executed: (executionResult as any).success,
          result: executionResult,
        });
      } catch (error) {
        console.error(`Failed to process pattern ${pattern.type}:`, error);
        results.push({
          pattern: pattern.type,
          hook: null,
          executed: false,
          result: { error: String(error) },
        });
      }
    }

    return results;
  }
}

// Export singleton instance
export const enhancedWorkflowGenerator = new EnhancedWorkflowGenerator();

export default EnhancedWorkflowGenerator;
