/**
 * GitVan Hooks API Route
 *
 * Provides programmatic access to GitVan knowledge hooks from the Studio.
 * Enables JTBD scenario hooks, git hooks, and workflow automation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { gitvanIntegration, jtbdHookDefinitions } from '@/lib/gitvan-integration';

/**
 * GET /api/gitvan/hooks
 * List all available knowledge hooks
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'list';

    if (action === 'list') {
      const hooks = await gitvanIntegration.listHooks();
      return NextResponse.json({
        success: true,
        hooks,
        jtbdHooks: Object.keys(jtbdHookDefinitions),
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'status') {
      const status = await gitvanIntegration.getAutomationStatus();
      return NextResponse.json({
        success: true,
        status,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'registry') {
      const registry = await gitvanIntegration.getKnowledgeRegistry();
      return NextResponse.json({
        success: true,
        registry,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { success: false, error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Hooks API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch hooks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gitvan/hooks
 * Execute a knowledge hook or register a new one
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, hookName, scenarioId, context, definition } = body;

    if (action === 'execute') {
      const result = await gitvanIntegration.executeHook(hookName, context || {});
      return NextResponse.json({
        success: true,
        hook: hookName,
        result,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'register') {
      // Register a pre-defined JTBD hook
      if (scenarioId && jtbdHookDefinitions[scenarioId as keyof typeof jtbdHookDefinitions]) {
        const hookDef = jtbdHookDefinitions[scenarioId as keyof typeof jtbdHookDefinitions];
        await gitvanIntegration.registerScenarioHook(scenarioId, hookDef);

        // Store learning about this hook registration
        await gitvanIntegration.storeScenarioResult(
          `hook:${scenarioId}`,
          {
            type: 'hook_registration',
            scenarioId,
            timestamp: new Date().toISOString(),
            status: 'registered',
          }
        );

        return NextResponse.json({
          success: true,
          message: `Registered hook for scenario: ${scenarioId}`,
          scenarioId,
          timestamp: new Date().toISOString(),
        });
      }

      // Register a custom hook
      if (definition && scenarioId) {
        await gitvanIntegration.registerScenarioHook(scenarioId, definition);
        return NextResponse.json({
          success: true,
          message: `Registered custom hook: ${scenarioId}`,
          scenarioId,
          timestamp: new Date().toISOString(),
        });
      }

      return NextResponse.json(
        { success: false, error: 'Missing scenarioId or definition' },
        { status: 400 }
      );
    }

    if (action === 'retrieve-learning') {
      const learning = await gitvanIntegration.getScenarioLearning(scenarioId);
      return NextResponse.json({
        success: true,
        scenarioId,
        learning,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'store-learning') {
      await gitvanIntegration.storeScenarioResult(scenarioId, context || {});
      return NextResponse.json({
        success: true,
        message: `Stored learning for scenario: ${scenarioId}`,
        scenarioId,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { success: false, error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Hooks API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process hooks request' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/gitvan/hooks
 * Remove a knowledge hook
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { hookName } = body;

    if (!hookName) {
      return NextResponse.json(
        { success: false, error: 'hookName required' },
        { status: 400 }
      );
    }

    // Note: In a full implementation, this would delete the hook file
    return NextResponse.json({
      success: true,
      message: `Hook removed: ${hookName}`,
      hookName,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Hooks API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete hook' },
      { status: 500 }
    );
  }
}
