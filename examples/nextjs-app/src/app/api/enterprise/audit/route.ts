/**
 * Audit Log API
 *
 * Provides compliance audit trails for all actions in Studio.
 * Tracks user activities, changes, and system events for security and compliance.
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuditEventSchema } from '@/lib/enterprise';

/**
 * GET /api/enterprise/audit
 * List audit logs with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const resource = searchParams.get('resource');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Mock audit log data
    const auditLogs = [
      {
        id: crypto.randomUUID(),
        timestamp: new Date(Date.now() - 3600000),
        userId: userId || 'user-123',
        action: action || 'workflow.created',
        resource: resource || 'workflows',
        resourceId: 'wf-456',
        status: 'success' as const,
      },
      {
        id: crypto.randomUUID(),
        timestamp: new Date(Date.now() - 1800000),
        userId: userId || 'user-123',
        action: action || 'scenario.executed',
        resource: resource || 'scenarios',
        resourceId: 'sc-789',
        status: 'success' as const,
      },
      {
        id: crypto.randomUUID(),
        timestamp: new Date(Date.now() - 900000),
        userId: userId || 'user-123',
        action: action || 'hook.triggered',
        resource: resource || 'hooks',
        resourceId: 'hk-012',
        status: 'success' as const,
      },
    ];

    return NextResponse.json({
      success: true,
      logs: auditLogs.slice(offset, offset + limit),
      total: auditLogs.length,
      limit,
      offset,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Audit API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/enterprise/audit
 * Log an audit event
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, resource, resourceId, status, errorMessage } = body;

    // Validate using Zod schema
    const auditEvent = AuditEventSchema.parse({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      userId,
      action,
      resource,
      resourceId,
      status,
      errorMessage,
    });

    return NextResponse.json({
      success: true,
      event: auditEvent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Audit logging error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to log audit event' },
      { status: 500 }
    );
  }
}
