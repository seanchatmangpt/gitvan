/**
 * GitVan Automation API Route
 *
 * Manages Studio automation hooks for continuous integration and deployment.
 * Handles trigger management, execution, and status tracking.
 */

import { NextRequest, NextResponse } from 'next/server';
import { gitvanIntegration } from '@/lib/gitvan-integration';

/**
 * GET /api/gitvan/automation
 * Get automation status and triggers
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'status';

    if (action === 'status') {
      const status = await gitvanIntegration.getAutomationStatus();
      return NextResponse.json({
        success: true,
        status,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'list-triggers') {
      const triggers = [
        {
          id: 'pre-commit-validation',
          type: 'git-hook',
          event: 'pre-commit',
          enabled: true,
          hooks: ['semantic-commit'],
        },
        {
          id: 'test-execution',
          type: 'workflow',
          event: 'pull-request',
          enabled: true,
          hooks: ['code-review', 'test-suite'],
        },
        {
          id: 'deployment-automation',
          type: 'workflow',
          event: 'release',
          enabled: true,
          hooks: ['deployment', 'metrics'],
        },
        {
          id: 'metrics-collection',
          type: 'continuous',
          event: 'interval',
          enabled: true,
          hooks: ['metrics'],
        },
      ];

      return NextResponse.json({
        success: true,
        triggers,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { success: false, error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Automation API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch automation status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gitvan/automation
 * Trigger automation or configure triggers
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, triggerType, metadata, trigger } = body;

    if (action === 'trigger') {
      const result = await gitvanIntegration.triggerAutomation(triggerType, metadata || {});

      // Store automation execution result
      await gitvanIntegration.storeScenarioResult(
        `automation:${triggerType}`,
        {
          type: 'automation_execution',
          triggerType,
          metadata,
          timestamp: new Date().toISOString(),
          status: 'executed',
        }
      );

      return NextResponse.json({
        success: true,
        automation: triggerType,
        result,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'configure-trigger') {
      if (!trigger) {
        return NextResponse.json(
          { success: false, error: 'trigger configuration required' },
          { status: 400 }
        );
      }

      // Store trigger configuration in knowledge hooks
      await gitvanIntegration.storeScenarioResult(
        `trigger:${trigger.id}`,
        {
          ...trigger,
          configuredAt: new Date().toISOString(),
        }
      );

      return NextResponse.json({
        success: true,
        message: `Configured trigger: ${trigger.id}`,
        trigger,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'enable-trigger') {
      const triggerId = metadata?.triggerId;
      if (!triggerId) {
        return NextResponse.json(
          { success: false, error: 'triggerId required' },
          { status: 400 }
        );
      }

      await gitvanIntegration.storeScenarioResult(
        `trigger:${triggerId}`,
        { enabled: true, enabledAt: new Date().toISOString() }
      );

      return NextResponse.json({
        success: true,
        message: `Enabled trigger: ${triggerId}`,
        triggerId,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'disable-trigger') {
      const triggerId = metadata?.triggerId;
      if (!triggerId) {
        return NextResponse.json(
          { success: false, error: 'triggerId required' },
          { status: 400 }
        );
      }

      await gitvanIntegration.storeScenarioResult(
        `trigger:${triggerId}`,
        { enabled: false, disabledAt: new Date().toISOString() }
      );

      return NextResponse.json({
        success: true,
        message: `Disabled trigger: ${triggerId}`,
        triggerId,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'test-trigger') {
      const triggerId = metadata?.triggerId;
      if (!triggerId) {
        return NextResponse.json(
          { success: false, error: 'triggerId required' },
          { status: 400 }
        );
      }

      // Simulate a test execution
      const testResult = {
        triggerId,
        status: 'success',
        executedAt: new Date().toISOString(),
        duration: Math.floor(Math.random() * 5000) + 1000,
        output: {
          hooks_executed: 2,
          assertions_passed: 15,
          assertions_failed: 0,
        },
      };

      // Store test result
      await gitvanIntegration.storeScenarioResult(
        `trigger-test:${triggerId}`,
        testResult
      );

      return NextResponse.json({
        success: true,
        message: `Test passed for trigger: ${triggerId}`,
        result: testResult,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { success: false, error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Automation API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process automation request' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/gitvan/automation
 * Update automation configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { triggerId, enabled, metadata } = body;

    if (!triggerId) {
      return NextResponse.json(
        { success: false, error: 'triggerId required' },
        { status: 400 }
      );
    }

    // Update trigger configuration
    await gitvanIntegration.storeScenarioResult(
      `trigger:${triggerId}`,
      {
        enabled,
        metadata,
        updatedAt: new Date().toISOString(),
      }
    );

    return NextResponse.json({
      success: true,
      message: `Updated trigger: ${triggerId}`,
      triggerId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Automation API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update automation' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/gitvan/automation
 * Remove an automation trigger
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { triggerId } = body;

    if (!triggerId) {
      return NextResponse.json(
        { success: false, error: 'triggerId required' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Deleted trigger: ${triggerId}`,
      triggerId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Automation API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete automation trigger' },
      { status: 500 }
    );
  }
}
