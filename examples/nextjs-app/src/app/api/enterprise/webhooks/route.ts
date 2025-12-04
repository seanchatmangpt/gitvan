/**
 * Webhooks API
 *
 * Manages event webhooks for external system integration.
 * Enables real-time notifications for Studio events to third-party services.
 */

import { NextRequest, NextResponse } from 'next/server';
import { WebhookSchema } from '@/lib/enterprise';

/**
 * GET /api/enterprise/webhooks
 * List webhooks for team
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const teamId = searchParams.get('teamId');
    const isActive = searchParams.get('isActive') === 'true';

    // Mock webhooks
    const webhooks = [
      {
        id: crypto.randomUUID(),
        teamId: teamId || 'team-123',
        name: 'Slack Notifications',
        url: 'https://hooks.slack.com/services/xxx/yyy/zzz',
        events: ['workflow.executed', 'automation.failed'],
        isActive: true,
        createdAt: new Date(Date.now() - 604800000),
        lastTriggered: new Date(Date.now() - 3600000),
      },
      {
        id: crypto.randomUUID(),
        teamId: teamId || 'team-123',
        name: 'GitHub Status Updates',
        url: 'https://github.com/repos/owner/repo/dispatches',
        events: ['scenario.completed'],
        isActive: true,
        createdAt: new Date(Date.now() - 1209600000),
      },
      {
        id: crypto.randomUUID(),
        teamId: teamId || 'team-123',
        name: 'DataDog Metrics',
        url: 'https://api.datadoghq.com/api/v1/events',
        events: ['workflow.created', 'hook.triggered'],
        isActive: false,
        createdAt: new Date(Date.now() - 1814400000),
      },
    ];

    const filtered = isActive ? webhooks.filter((w) => w.isActive) : webhooks;

    return NextResponse.json({
      success: true,
      webhooks: filtered,
      total: webhooks.length,
      activeCount: webhooks.filter((w) => w.isActive).length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Webhooks fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch webhooks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/enterprise/webhooks
 * Create a new webhook
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamId, name, url, events, retryPolicy } = body;

    if (!teamId || !name || !url || !events) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const webhook = WebhookSchema.parse({
      id: crypto.randomUUID(),
      teamId,
      name,
      url,
      events,
      isActive: true,
      retryPolicy: retryPolicy || { maxRetries: 3, retryDelay: 5000 },
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      webhook,
      message: `Webhook '${name}' created successfully`,
      testEndpoint: `/api/enterprise/webhooks/${webhook.id}/test`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Webhook creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create webhook' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/enterprise/webhooks
 * Update webhook configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { webhookId, isActive, events, retryPolicy } = body;

    if (!webhookId) {
      return NextResponse.json(
        { success: false, error: 'webhookId required' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Webhook ${webhookId} updated successfully`,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Webhook update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update webhook' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/enterprise/webhooks
 * Delete a webhook
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { webhookId } = body;

    if (!webhookId) {
      return NextResponse.json(
        { success: false, error: 'webhookId required' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Webhook ${webhookId} deleted successfully`,
      deletedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Webhook deletion error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete webhook' },
      { status: 500 }
    );
  }
}
