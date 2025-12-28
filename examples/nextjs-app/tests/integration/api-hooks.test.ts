/**
 * Integration Tests - Hooks API
 *
 * Tests for /api/gitvan/hooks endpoint with full request/response cycle.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '@/app/api/gitvan/hooks/route';
import { createMockNextRequest, createMockAPIResponse } from '../utils/test-utils';
import { MockGitVanIntegration } from '../utils/mocks';
import { HOOK_FIXTURES, JTBD_SCENARIO_FIXTURES } from '../fixtures';

// Mock the gitvan integration module
vi.mock('@/lib/gitvan-integration', () => {
  const mockIntegration = new MockGitVanIntegration();
  return {
    gitvanIntegration: mockIntegration,
    jtbdHookDefinitions: {
      'semantic-commit': '@prefix jtbd: <test#> .',
      'code-review': '@prefix jtbd: <test#> .',
      'deployment': '@prefix jtbd: <test#> .',
      'metrics': '@prefix jtbd: <test#> .',
    },
    GitVanIntegration: vi.fn(() => mockIntegration),
  };
});

describe('Hooks API - GET', () => {
  // ============================================================================
  // List Hooks Tests
  // ============================================================================

  describe('action: list', () => {
    it('should return list of hooks', async () => {
      const request = new NextRequest('http://localhost:3000/api/gitvan/hooks?action=list');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('hooks');
      expect(data).toHaveProperty('jtbdHooks');
      expect(data).toHaveProperty('timestamp');
    });

    it('should return jtbd hook definitions', async () => {
      const request = new NextRequest('http://localhost:3000/api/gitvan/hooks?action=list');
      const response = await GET(request);
      const data = await response.json();

      expect(data.jtbdHooks).toContain('semantic-commit');
      expect(data.jtbdHooks).toContain('code-review');
    });

    it('should use list as default action', async () => {
      const request = new NextRequest('http://localhost:3000/api/gitvan/hooks');
      const response = await GET(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data).toHaveProperty('hooks');
    });

    it('should include timestamp in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/gitvan/hooks?action=list');
      const response = await GET(request);
      const data = await response.json();

      expect(data.timestamp).toBeDefined();
      expect(new Date(data.timestamp).getTime()).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Status Action Tests
  // ============================================================================

  describe('action: status', () => {
    it('should return automation status', async () => {
      const request = new NextRequest('http://localhost:3000/api/gitvan/hooks?action=status');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('status');
    });
  });

  // ============================================================================
  // Registry Action Tests
  // ============================================================================

  describe('action: registry', () => {
    it('should return knowledge registry', async () => {
      const request = new NextRequest('http://localhost:3000/api/gitvan/hooks?action=registry');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('registry');
    });
  });

  // ============================================================================
  // Unknown Action Tests
  // ============================================================================

  describe('unknown action', () => {
    it('should return 400 for unknown action', async () => {
      const request = new NextRequest('http://localhost:3000/api/gitvan/hooks?action=invalid');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unknown action');
    });
  });
});

describe('Hooks API - POST', () => {
  // ============================================================================
  // Execute Hook Tests
  // ============================================================================

  describe('action: execute', () => {
    it('should execute a hook', async () => {
      const body = {
        action: 'execute',
        hookName: 'test-hook',
        context: { environment: 'test' },
      };

      const request = new NextRequest('http://localhost:3000/api/gitvan/hooks', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.hook).toBe('test-hook');
      expect(data).toHaveProperty('result');
    });

    it('should handle empty context', async () => {
      const body = {
        action: 'execute',
        hookName: 'simple-hook',
      };

      const request = new NextRequest('http://localhost:3000/api/gitvan/hooks', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  // ============================================================================
  // Register Hook Tests
  // ============================================================================

  describe('action: register', () => {
    it('should register predefined JTBD hook', async () => {
      const body = {
        action: 'register',
        scenarioId: 'semantic-commit',
      };

      const request = new NextRequest('http://localhost:3000/api/gitvan/hooks', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.scenarioId).toBe('semantic-commit');
      expect(data.message).toContain('Registered hook');
    });

    it('should register custom hook definition', async () => {
      const body = {
        action: 'register',
        scenarioId: 'custom-hook',
        definition: '@prefix custom: <http://custom.org#> . custom:Hook a custom:Type .',
      };

      const request = new NextRequest('http://localhost:3000/api/gitvan/hooks', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('custom hook');
    });

    it('should return 400 when missing scenarioId', async () => {
      const body = {
        action: 'register',
      };

      const request = new NextRequest('http://localhost:3000/api/gitvan/hooks', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('scenarioId');
    });

    it('should register all predefined JTBD hooks', async () => {
      const scenarios = ['semantic-commit', 'code-review', 'deployment', 'metrics'];

      for (const scenarioId of scenarios) {
        const body = { action: 'register', scenarioId };
        const request = new NextRequest('http://localhost:3000/api/gitvan/hooks', {
          method: 'POST',
          body: JSON.stringify(body),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      }
    });
  });

  // ============================================================================
  // Retrieve Learning Tests
  // ============================================================================

  describe('action: retrieve-learning', () => {
    it('should retrieve scenario learning', async () => {
      const body = {
        action: 'retrieve-learning',
        scenarioId: 'test-scenario',
      };

      const request = new NextRequest('http://localhost:3000/api/gitvan/hooks', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.scenarioId).toBe('test-scenario');
      expect(data).toHaveProperty('learning');
    });
  });

  // ============================================================================
  // Store Learning Tests
  // ============================================================================

  describe('action: store-learning', () => {
    it('should store scenario learning', async () => {
      const body = {
        action: 'store-learning',
        scenarioId: 'test-scenario',
        context: { result: 'success', metrics: { accuracy: 0.95 } },
      };

      const request = new NextRequest('http://localhost:3000/api/gitvan/hooks', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('Stored learning');
    });
  });

  // ============================================================================
  // Unknown Action Tests
  // ============================================================================

  describe('unknown action', () => {
    it('should return 400 for unknown action', async () => {
      const body = {
        action: 'unknown-action',
      };

      const request = new NextRequest('http://localhost:3000/api/gitvan/hooks', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
});

describe('Hooks API - DELETE', () => {
  it('should delete a hook', async () => {
    const body = {
      hookName: 'hook-to-delete',
    };

    const request = new NextRequest('http://localhost:3000/api/gitvan/hooks', {
      method: 'DELETE',
      body: JSON.stringify(body),
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('removed');
    expect(data.hookName).toBe('hook-to-delete');
  });

  it('should return 400 when hookName is missing', async () => {
    const body = {};

    const request = new NextRequest('http://localhost:3000/api/gitvan/hooks', {
      method: 'DELETE',
      body: JSON.stringify(body),
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('hookName required');
  });
});

describe('Hooks API - Error Handling', () => {
  it('should handle malformed JSON in POST', async () => {
    const request = new NextRequest('http://localhost:3000/api/gitvan/hooks', {
      method: 'POST',
      body: 'not-json',
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.success).toBe(false);
  });

  it('should handle malformed JSON in DELETE', async () => {
    const request = new NextRequest('http://localhost:3000/api/gitvan/hooks', {
      method: 'DELETE',
      body: 'invalid-json',
    });

    const response = await DELETE(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.success).toBe(false);
  });
});

describe('Hooks API - Multi-Hook Interaction', () => {
  it('should handle multiple hook registrations', async () => {
    const scenarios = ['semantic-commit', 'code-review'];
    const results = [];

    for (const scenarioId of scenarios) {
      const body = { action: 'register', scenarioId };
      const request = new NextRequest('http://localhost:3000/api/gitvan/hooks', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const response = await POST(request);
      results.push(await response.json());
    }

    expect(results.every((r) => r.success)).toBe(true);
  });

  it('should handle store then retrieve learning flow', async () => {
    // Store learning
    const storeBody = {
      action: 'store-learning',
      scenarioId: 'flow-test',
      context: { data: 'test-data' },
    };

    const storeRequest = new NextRequest('http://localhost:3000/api/gitvan/hooks', {
      method: 'POST',
      body: JSON.stringify(storeBody),
    });

    const storeResponse = await POST(storeRequest);
    expect((await storeResponse.json()).success).toBe(true);

    // Retrieve learning
    const retrieveBody = {
      action: 'retrieve-learning',
      scenarioId: 'flow-test',
    };

    const retrieveRequest = new NextRequest('http://localhost:3000/api/gitvan/hooks', {
      method: 'POST',
      body: JSON.stringify(retrieveBody),
    });

    const retrieveResponse = await POST(retrieveRequest);
    const retrieveData = await retrieveResponse.json();

    expect(retrieveData.success).toBe(true);
    expect(retrieveData.scenarioId).toBe('flow-test');
  });
});
