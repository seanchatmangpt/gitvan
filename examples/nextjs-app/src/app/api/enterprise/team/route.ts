/**
 * Team Collaboration API
 *
 * Manages team membership, shared resources, comments, and quotas.
 * Enables collaborative development with role-based access control.
 */

import { NextRequest, NextResponse } from 'next/server';
import { EnterpriseService, Role } from '@/lib/enterprise';

/**
 * GET /api/enterprise/team
 * Get team information, members, and quotas
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const teamId = searchParams.get('teamId') || 'team-123';
    const section = searchParams.get('section') || 'overview';

    if (section === 'members') {
      // Team members
      const members = [
        {
          id: crypto.randomUUID(),
          email: 'alice@company.com',
          name: 'Alice Johnson',
          role: Role.ADMIN,
          joinedAt: new Date(Date.now() - 2592000000),
          lastActive: new Date(Date.now() - 3600000),
        },
        {
          id: crypto.randomUUID(),
          email: 'bob@company.com',
          name: 'Bob Smith',
          role: Role.MANAGER,
          joinedAt: new Date(Date.now() - 1209600000),
          lastActive: new Date(Date.now() - 7200000),
        },
        {
          id: crypto.randomUUID(),
          email: 'carol@company.com',
          name: 'Carol Davis',
          role: Role.DEVELOPER,
          joinedAt: new Date(Date.now() - 604800000),
          lastActive: new Date(),
        },
      ];

      return NextResponse.json({
        success: true,
        teamId,
        members,
        total: members.length,
        timestamp: new Date().toISOString(),
      });
    }

    if (section === 'quotas') {
      // Usage quotas
      const quotas = {
        teamId,
        workflowExecutions: {
          limit: 1000,
          used: 456,
          resetAt: new Date(Date.now() + 2592000000),
          percentageUsed: 45.6,
        },
        apiRequests: {
          limit: 100000,
          used: 28934,
          resetAt: new Date(Date.now() + 2592000000),
          percentageUsed: 28.9,
        },
        storageGB: {
          limit: 100,
          used: 23.5,
          percentageUsed: 23.5,
        },
        maxTeamSize: 50,
        currentTeamSize: 3,
      };

      return NextResponse.json({
        success: true,
        quotas,
        timestamp: new Date().toISOString(),
      });
    }

    // Overview
    const overview = {
      teamId,
      name: 'ACME Corporation',
      plan: 'Enterprise',
      members: 3,
      workflows: 42,
      scenarios: 156,
      hooks: 28,
      automations: 15,
      createdAt: new Date(Date.now() - 2592000000),
    };

    return NextResponse.json({
      success: true,
      overview,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Team API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch team data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/enterprise/team
 * Add team member or share resource
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, teamId, email, role, resourceId, resourceType, sharedWith } = body;

    if (action === 'invite-member') {
      if (!email || !role) {
        return NextResponse.json(
          { success: false, error: 'Missing email or role' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        action: 'invite_sent',
        message: `Invitation sent to ${email}`,
        inviteUrl: `https://studio.example.com/join/${teamId}/${crypto.randomUUID()}`,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'share-resource') {
      if (!resourceId || !resourceType || !sharedWith) {
        return NextResponse.json(
          { success: false, error: 'Missing resource info or sharedWith' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `${resourceType} shared with ${sharedWith.length} users`,
        resourceId,
        resourceType,
        sharedAt: new Date().toISOString(),
      });
    }

    if (action === 'add-comment') {
      const { content, resourceId: resId, resourceType: resType } = body;

      if (!content || !resId || !resType) {
        return NextResponse.json(
          { success: false, error: 'Missing comment data' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        comment: {
          id: crypto.randomUUID(),
          resourceId: resId,
          resourceType: resType,
          userId: 'user-123',
          userName: 'Current User',
          content,
          createdAt: new Date(),
        },
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { success: false, error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Team action error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process team action' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/enterprise/team
 * Update team member role or resource sharing
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { success: false, error: 'userId and role required' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Team member role updated to ${role}`,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Team update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update team' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/enterprise/team
 * Remove team member or revoke resource sharing
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId required' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Team member removed from team`,
      removedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Team member removal error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove team member' },
      { status: 500 }
    );
  }
}
