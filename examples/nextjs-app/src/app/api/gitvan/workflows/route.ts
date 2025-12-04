/**
 * Workflows API Route
 *
 * Handles workflow generation, execution, and status tracking for autonomic hooks.
 * Now integrated with enhanced workflow generator for Zod validation and AI optimization.
 */

import { workflowGenerator } from '@/lib/workflow-generator';
import { enhancedWorkflowGenerator } from '@/lib/enhanced-workflow-generator';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'automation';

    if (action === 'automation') {
      const automations = await workflowGenerator.detectRequiredAutomation();
      return NextResponse.json({
        success: true,
        automations,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { success: false, error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Workflows API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch workflows' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, patterns, hooks } = body;

    if (action === 'generate') {
      const mockPatterns = patterns || [
        {
          type: 'enforce-pattern',
          trigger: 'CommitEvent',
          condition: 'message matches semantic format',
          action: 'validate and pass',
          params: { patternName: 'SemanticCommit', description: 'Enforce semantic commits' },
        },
      ];

      const generatedHooks = await workflowGenerator.generateHooksFromPatterns(mockPatterns);
      return NextResponse.json({
        success: true,
        hooks: generatedHooks,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'execute') {
      if (!hooks || hooks.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No hooks provided' },
          { status: 400 }
        );
      }

      const results = await workflowGenerator.executeHookBatch(hooks);
      return NextResponse.json({
        success: true,
        results,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { success: false, error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Workflows API error:', error);
    return NextResponse.json(
      { success: false, error: 'Workflow execution failed' },
      { status: 500 }
    );
  }
}
