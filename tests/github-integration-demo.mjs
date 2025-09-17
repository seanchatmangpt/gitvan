#!/usr/bin/env node

/**
 * GitHub Integration Demo Script
 *
 * This script demonstrates the complete GitHub pack fetching functionality
 * including various pack ID formats, rate limiting, authentication, and caching.
 */

import { PackRegistry } from '../src/pack/registry.mjs';
import { join } from 'pathe';
import { rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';

// Mock fetch to simulate GitHub API for demo
function createMockFetch() {
  let callCount = 0;

  return function mockFetch(url, options) {
    callCount++;
    console.log(`🌐 GitHub API Call #${callCount}: ${url}`);

    if (options?.headers?.Authorization) {
      console.log('🔑 Using authentication token');
    }

    // Simulate different repositories
    if (url.includes('/octocat/Hello-World')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Map([
          ['x-ratelimit-remaining', '4999'],
          ['x-ratelimit-reset', '1640995200']
        ]),
        json: () => Promise.resolve({
          stargazers_count: 1500,
          forks_count: 300,
          open_issues_count: 25,
          updated_at: '2023-12-01T10:00:00Z',
          default_branch: 'main',
          license: { spdx_id: 'MIT' },
          homepage: 'https://octocat.github.io/Hello-World',
          clone_url: 'https://github.com/octocat/Hello-World.git',
          language: 'JavaScript',
          description: 'My first repository on GitHub!',
          topics: ['javascript', 'git', 'tutorial']
        })
      });
    }

    if (url.includes('/microsoft/vscode')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Map([
          ['x-ratelimit-remaining', '4998'],
          ['x-ratelimit-reset', '1640995200']
        ]),
        json: () => Promise.resolve({
          stargazers_count: 145000,
          forks_count: 25000,
          open_issues_count: 5000,
          updated_at: '2023-12-01T15:30:00Z',
          default_branch: 'main',
          license: { spdx_id: 'MIT' },
          homepage: 'https://code.visualstudio.com',
          clone_url: 'https://github.com/microsoft/vscode.git',
          language: 'TypeScript',
          description: 'Visual Studio Code',
          topics: ['typescript', 'editor', 'vscode', 'electron']
        })
      });
    }

    if (url.includes('/nonexistent/repo')) {
      return Promise.resolve({
        ok: false,
        status: 404,
        headers: new Map()
      });
    }

    // Default fallback
    return Promise.resolve({
      ok: false,
      status: 404,
      headers: new Map()
    });
  };
}

async function demonstrateGitHubIntegration() {
  console.log('🚀 GitHub Integration Demo for GitVan Pack Registry\n');

  // Setup demo environment
  const demoDir = join(tmpdir(), `gitvan-github-demo-${Date.now()}`);
  global.fetch = createMockFetch();

  const registry = new PackRegistry({
    cacheDir: demoDir,
    githubToken: 'demo-token-12345',
    timeout: 10000
  });

  console.log(`📁 Demo cache directory: ${demoDir}\n`);

  try {
    // Demo 1: Basic pack ID parsing
    console.log('📋 Demo 1: Pack ID Parsing\n');

    const testCases = [
      'octocat/Hello-World',
      'octocat/Hello-World#v1.0.0',
      'octocat/Hello-World/packages/my-pack',
      'microsoft/vscode#release/1.85/extensions/typescript',
      'invalid-format'
    ];

    for (const packId of testCases) {
      const parsed = registry.parseGitHubPackId(packId);
      console.log(`  ${packId}`);
      if (parsed) {
        console.log(`    ✅ Owner: ${parsed.owner}, Repo: ${parsed.repo}`);
        console.log(`    📝 Ref: ${parsed.ref}, Path: ${parsed.path || 'none'}`);
      } else {
        console.log(`    ❌ Invalid format`);
      }
      console.log();
    }

    // Demo 2: GitHub API metadata fetching
    console.log('🔍 Demo 2: GitHub API Metadata Fetching\n');

    const repos = [
      { owner: 'octocat', repo: 'Hello-World' },
      { owner: 'microsoft', repo: 'vscode' },
      { owner: 'nonexistent', repo: 'repo' }
    ];

    for (const { owner, repo } of repos) {
      console.log(`  Fetching metadata for ${owner}/${repo}...`);
      const metadata = await registry.fetchGitHubRepoMetadata(owner, repo);

      if (metadata) {
        console.log(`    ⭐ Stars: ${metadata.stargazers_count}`);
        console.log(`    🍴 Forks: ${metadata.forks_count}`);
        console.log(`    📝 Language: ${metadata.language}`);
        console.log(`    📅 Last Updated: ${metadata.updated_at}`);
        console.log(`    🏷️  Topics: ${metadata.topics?.join(', ') || 'none'}`);
      } else {
        console.log(`    ❌ Repository not found or not accessible`);
      }
      console.log();
    }

    // Demo 3: Cache key generation
    console.log('🗂️  Demo 3: Cache Key Generation\n');

    const cacheTestCases = [
      { owner: 'octocat', repo: 'Hello-World', ref: 'main', path: null },
      { owner: 'microsoft', repo: 'vscode', ref: 'v1.85', path: null },
      { owner: 'facebook', repo: 'react', ref: 'main', path: 'packages/react' },
      { owner: 'vercel', repo: 'next.js', ref: 'canary', path: 'examples/blog' }
    ];

    for (const { owner, repo, ref, path } of cacheTestCases) {
      const cacheKey = registry.generateGitHubCacheKey(owner, repo, ref, path);
      console.log(`  ${owner}/${repo}${ref !== 'main' ? `#${ref}` : ''}${path ? `/${path}` : ''}`);
      console.log(`    🔑 Cache Key: ${cacheKey}`);
      console.log();
    }

    // Demo 4: Rate limiting demonstration
    console.log('⏱️  Demo 4: Rate Limiting\n');

    // Show initial rate limit state
    console.log('  Initial rate limit state:');
    console.log(`    Remaining: ${registry.githubApiRateLimit.remaining}`);
    console.log(`    Reset time: ${new Date(registry.githubApiRateLimit.reset).toISOString()}`);
    console.log();

    // Simulate rate limit check
    console.log('  Checking rate limit before API call...');
    await registry.checkGitHubRateLimit();
    console.log('    ✅ Rate limit check passed');
    console.log();

    // Demo 5: Manifest enhancement
    console.log('📦 Demo 5: Manifest Enhancement with GitHub Data\n');

    const sampleManifest = {
      id: 'octocat/hello-world-pack',
      name: 'Hello World Pack',
      version: '1.0.0',
      tags: ['example']
    };

    console.log('  Original manifest:');
    console.log(`    ${JSON.stringify(sampleManifest, null, 4)}`);
    console.log();

    // Simulate enhancement (we can't actually write files in demo)
    const mockRepoMetadata = await registry.fetchGitHubRepoMetadata('octocat', 'Hello-World');
    if (mockRepoMetadata) {
      const enhanced = {
        ...sampleManifest,
        github: {
          owner: 'octocat',
          repo: 'Hello-World',
          stars: mockRepoMetadata.stargazers_count,
          forks: mockRepoMetadata.forks_count,
          language: mockRepoMetadata.language,
          lastUpdated: mockRepoMetadata.updated_at
        },
        description: sampleManifest.description || mockRepoMetadata.description,
        license: sampleManifest.license || mockRepoMetadata.license?.spdx_id,
        tags: [
          ...sampleManifest.tags,
          'github',
          ...(mockRepoMetadata.topics || [])
        ]
      };

      console.log('  Enhanced manifest with GitHub data:');
      console.log(`    ${JSON.stringify(enhanced, null, 4)}`);
    }
    console.log();

    // Demo 6: Authentication scenarios
    console.log('🔐 Demo 6: Authentication Scenarios\n');

    console.log('  Testing with token:');
    const authRegistry = new PackRegistry({
      cacheDir: demoDir,
      githubToken: 'ghp_example123456789'
    });
    console.log(`    ✅ Token configured: ${authRegistry.githubToken.substring(0, 10)}...`);
    console.log();

    console.log('  Testing without token:');
    const noAuthRegistry = new PackRegistry({
      cacheDir: demoDir
    });
    console.log(`    ⚠️  No token configured (rate limits apply)`);
    console.log();

    console.log('✅ GitHub Integration Demo Complete!\n');

    console.log('📊 Summary of Features Demonstrated:');
    console.log('  ✅ Pack ID parsing for multiple formats');
    console.log('  ✅ GitHub API metadata fetching');
    console.log('  ✅ Rate limiting and error handling');
    console.log('  ✅ Authentication token support');
    console.log('  ✅ Cache key generation');
    console.log('  ✅ Manifest enhancement with GitHub data');
    console.log('  ✅ Support for branches, tags, and subdirectories');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  } finally {
    // Cleanup
    if (existsSync(demoDir)) {
      rmSync(demoDir, { recursive: true, force: true });
      console.log(`🧹 Cleaned up demo directory`);
    }
  }
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateGitHubIntegration().catch(console.error);
}