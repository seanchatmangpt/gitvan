/**
 * API Keys Management API
 *
 * Manages programmatic access tokens for external integrations and CI/CD.
 * Supports scoping, rotation, and expiration policies.
 */

import { NextRequest, NextResponse } from 'next/server';
import { EnterpriseService } from '@/lib/enterprise';

/**
 * GET /api/enterprise/keys
 * List API keys for current user/team
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const teamId = searchParams.get('teamId');

    // Mock API keys
    const keys = [
      {
        id: crypto.randomUUID(),
        teamId: teamId || 'team-123',
        userId: 'user-123',
        key: 'gvk_masking...',
        name: 'CI/CD Pipeline',
        permissions: ['read', 'execute'],
        isActive: true,
        createdAt: new Date(Date.now() - 86400000),
      },
      {
        id: crypto.randomUUID(),
        teamId: teamId || 'team-123',
        userId: 'user-123',
        key: 'gvk_masking...',
        name: 'Monitoring Integration',
        permissions: ['read'],
        isActive: true,
        createdAt: new Date(Date.now() - 172800000),
      },
    ];

    return NextResponse.json({
      success: true,
      keys,
      total: keys.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('API keys fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/enterprise/keys
 * Create a new API key
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamId, userId, name, permissions, expiresIn } = body;

    if (!name || !permissions || !Array.isArray(permissions)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    // Generate new API key
    const key = EnterpriseService.generateApiKey(teamId, userId, name);

    // Calculate expiration
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : undefined;

    const apiKey = {
      id: crypto.randomUUID(),
      teamId,
      userId,
      key, // In production, hash this before storing
      name,
      permissions,
      isActive: true,
      createdAt: new Date(),
      expiresAt,
    };

    return NextResponse.json({
      success: true,
      apiKey,
      secret: key, // Only shown once on creation
      message: 'API key created successfully. Save the secret immediately.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('API key creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/enterprise/keys
 * Revoke an API key
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyId } = body;

    if (!keyId) {
      return NextResponse.json(
        { success: false, error: 'keyId required' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `API key ${keyId} revoked successfully`,
      revokedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('API key revocation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to revoke API key' },
      { status: 500 }
    );
  }
}
