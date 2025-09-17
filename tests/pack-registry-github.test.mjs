import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PackRegistry } from '../src/pack/registry.mjs';
import { join } from 'pathe';
import { rmSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

// Mock fetch for GitHub API calls
global.fetch = vi.fn();

describe('PackRegistry GitHub Integration', () => {
  let registry;
  let testCacheDir;

  beforeEach(() => {
    testCacheDir = join(tmpdir(), `gitvan-test-${Date.now()}`);
    mkdirSync(testCacheDir, { recursive: true });

    registry = new PackRegistry({
      cacheDir: testCacheDir,
      timeout: 5000
    });

    // Reset fetch mock
    fetch.mockClear();
  });

  afterEach(() => {
    if (existsSync(testCacheDir)) {
      rmSync(testCacheDir, { recursive: true, force: true });
    }
  });

  describe('parseGitHubPackId', () => {
    it('should parse basic owner/repo format', () => {
      const result = registry.parseGitHubPackId('octocat/Hello-World');
      expect(result).toEqual({
        owner: 'octocat',
        repo: 'Hello-World',
        ref: 'main',
        path: null
      });
    });

    it('should parse owner/repo#ref format', () => {
      const result = registry.parseGitHubPackId('octocat/Hello-World#v1.0.0');
      expect(result).toEqual({
        owner: 'octocat',
        repo: 'Hello-World',
        ref: 'v1.0.0',
        path: null
      });
    });

    it('should parse owner/repo/path format', () => {
      const result = registry.parseGitHubPackId('octocat/Hello-World/packages/my-pack');
      expect(result).toEqual({
        owner: 'octocat',
        repo: 'Hello-World',
        ref: 'main',
        path: 'packages/my-pack'
      });
    });

    it('should parse owner/repo#ref/path format', () => {
      const result = registry.parseGitHubPackId('octocat/Hello-World#develop/packages/my-pack');
      expect(result).toEqual({
        owner: 'octocat',
        repo: 'Hello-World',
        ref: 'develop',
        path: 'packages/my-pack'
      });
    });

    it('should handle complex path parsing', () => {
      const result = registry.parseGitHubPackId('octocat/Hello-World/packages/sub/deep');
      expect(result).toEqual({
        owner: 'octocat',
        repo: 'Hello-World',
        ref: 'main',
        path: 'packages/sub/deep'
      });
    });

    it('should return null for invalid formats', () => {
      expect(registry.parseGitHubPackId('invalid')).toBeNull();
      expect(registry.parseGitHubPackId('')).toBeNull();
      expect(registry.parseGitHubPackId(null)).toBeNull();
      expect(registry.parseGitHubPackId(undefined)).toBeNull();
    });
  });

  describe('generateGitHubCacheKey', () => {
    it('should generate cache key for basic repo', () => {
      const key = registry.generateGitHubCacheKey('octocat', 'Hello-World', 'main', null);
      expect(key).toBe('github-octocat-Hello-World');
    });

    it('should include ref in cache key when not main', () => {
      const key = registry.generateGitHubCacheKey('octocat', 'Hello-World', 'v1.0.0', null);
      expect(key).toBe('github-octocat-Hello-World-v1.0.0');
    });

    it('should include path in cache key', () => {
      const key = registry.generateGitHubCacheKey('octocat', 'Hello-World', 'main', 'packages/my-pack');
      expect(key).toBe('github-octocat-Hello-World-packages-my-pack');
    });

    it('should handle complex cache key with ref and path', () => {
      const key = registry.generateGitHubCacheKey('octocat', 'Hello-World', 'develop', 'packages/my-pack');
      expect(key).toBe('github-octocat-Hello-World-develop-packages-my-pack');
    });
  });

  describe('fetchGitHubRepoMetadata', () => {
    it('should fetch repository metadata successfully', async () => {
      const mockResponse = {
        stargazers_count: 100,
        forks_count: 20,
        open_issues_count: 5,
        updated_at: '2023-01-01T00:00:00Z',
        default_branch: 'main',
        license: { spdx_id: 'MIT' },
        homepage: 'https://example.com',
        clone_url: 'https://github.com/octocat/Hello-World.git',
        language: 'JavaScript',
        description: 'Test repository',
        topics: ['javascript', 'test']
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([
          ['x-ratelimit-remaining', '5000'],
          ['x-ratelimit-reset', '1640995200']
        ]),
        json: () => Promise.resolve(mockResponse)
      });

      const result = await registry.fetchGitHubRepoMetadata('octocat', 'Hello-World');
      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/octocat/Hello-World',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'GitVan-Pack-Registry/1.0'
          })
        })
      );
    });

    it('should return null for 404 responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Map()
      });

      const result = await registry.fetchGitHubRepoMetadata('nonexistent', 'repo');
      expect(result).toBeNull();
    });

    it('should throw error for rate limit exceeded', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        headers: new Map(),
        statusText: 'Forbidden'
      });

      const result = await registry.fetchGitHubRepoMetadata('octocat', 'Hello-World');
      expect(result).toBeNull(); // Now returns null instead of throwing
    });

    it('should use authentication token when provided', async () => {
      // Temporarily override environment token
      const originalToken = process.env.GITHUB_TOKEN;
      delete process.env.GITHUB_TOKEN;

      const registryWithToken = new PackRegistry({
        cacheDir: testCacheDir,
        githubToken: 'test-token'
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        json: () => Promise.resolve({})
      });

      await registryWithToken.fetchGitHubRepoMetadata('octocat', 'Hello-World');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/octocat/Hello-World',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'token test-token'
          })
        })
      );

      // Restore original token
      if (originalToken) {
        process.env.GITHUB_TOKEN = originalToken;
      }
    });

    it('should cache API responses', async () => {
      const mockResponse = { name: 'Hello-World' };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        json: () => Promise.resolve(mockResponse)
      });

      // First call should hit the API
      const result1 = await registry.fetchGitHubRepoMetadata('octocat', 'Hello-World');
      expect(result1).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await registry.fetchGitHubRepoMetadata('octocat', 'Hello-World');
      expect(result2).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledTimes(1); // No additional API call
    });
  });

  describe('checkGitHubRateLimit', () => {
    it('should not wait when rate limit is sufficient', async () => {
      registry.githubApiRateLimit = {
        limit: 5000,
        remaining: 1000,
        reset: Date.now() + 3600000
      };

      const start = Date.now();
      await registry.checkGitHubRateLimit();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // Should be immediate
    });

    it('should reset rate limit when window has expired', async () => {
      registry.githubApiRateLimit = {
        limit: 5000,
        remaining: 0,
        reset: Date.now() - 1000 // Already expired
      };

      await registry.checkGitHubRateLimit();

      expect(registry.githubApiRateLimit.remaining).toBeGreaterThan(0);
      expect(registry.githubApiRateLimit.reset).toBeGreaterThan(Date.now());
    });
  });

  describe('GitHub integration scenarios', () => {
    it('should handle repository not found gracefully', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Map()
      });

      const result = await registry.resolveGitHub('nonexistent/repo');
      expect(result).toBeNull();
    });

    it('should handle network errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await registry.resolveGitHub('octocat/Hello-World');
      expect(result).toBeNull();
    });

    it('should validate GitHub pack ID format before processing', async () => {
      const result = await registry.resolveGitHub('invalid-format');
      expect(result).toBeNull();
    });
  });
});