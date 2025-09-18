# GitHub Integration for GitVan Pack Registry

The GitVan Pack Registry includes comprehensive GitHub integration that allows fetching packs directly from GitHub repositories with advanced features like metadata enrichment, rate limiting, authentication, and caching.

## Features

### 🎯 Pack ID Format Support

The GitHub integration supports multiple pack ID formats for maximum flexibility:

```javascript
// Basic repository
'octocat/Hello-World'

// Specific branch, tag, or commit
'octocat/Hello-World#v1.0.0'
'octocat/Hello-World#develop'
'octocat/Hello-World#abc123'

// Subdirectory path (monorepo support)
'octocat/Hello-World/packages/my-pack'

// Branch/tag with subdirectory
'microsoft/vscode#release/1.85/extensions/typescript'
```

### 🔍 GitHub API Metadata Fetching

Automatically fetches repository metadata from the GitHub API:

- **Repository statistics**: Stars, forks, open issues
- **Repository info**: Description, license, homepage, primary language
- **Topics and tags**: Automatically adds GitHub topics as pack tags
- **Last updated**: Tracks repository update timestamps
- **Default branch**: Respects repository's default branch setting

### 🔐 Authentication Support

Supports GitHub authentication for private repositories and higher rate limits:

```javascript
// Via environment variable
export GITHUB_TOKEN=ghp_your_token_here

// Via registry options
const registry = new PackRegistry({
  githubToken: 'ghp_your_token_here'
});
```

**Rate Limits:**
- **Without token**: 60 requests per hour
- **With token**: 5,000 requests per hour

### ⚡ Intelligent Caching

- **API response caching**: 5-minute cache for GitHub API responses
- **Pack caching**: Downloaded packs are cached locally
- **Cache key generation**: Intelligent cache keys based on repo, ref, and path
- **Cache invalidation**: Automatic cleanup and refresh mechanisms

### 🛡️ Rate Limiting & Error Handling

- **Rate limit monitoring**: Tracks remaining API calls and reset times
- **Automatic throttling**: Waits when approaching rate limits
- **Graceful degradation**: Handles API errors and network issues
- **Retry mechanisms**: Automatic retries with exponential backoff

## Usage Examples

### Basic GitHub Pack Resolution

```javascript
import { PackRegistry } from './src/pack/registry.mjs';

const registry = new PackRegistry();

// Resolve a GitHub pack
const packPath = await registry.resolve('octocat/Hello-World');
if (packPath) {
  console.log(`Pack resolved to: ${packPath}`);
}
```

### Advanced Configuration

```javascript
const registry = new PackRegistry({
  githubToken: process.env.GITHUB_TOKEN,
  cacheDir: './my-pack-cache',
  timeout: 30000,
  maxRetries: 3
});

// Resolve with specific branch and subdirectory
const packPath = await registry.resolve('microsoft/vscode#main/extensions/typescript');
```

### Pack Information with GitHub Data

```javascript
const packInfo = await registry.info('octocat/Hello-World');
console.log(packInfo);

/*
Output includes:
{
  id: 'octocat/Hello-World',
  name: 'Hello World',
  description: 'My first repository on GitHub!',
  github: {
    owner: 'octocat',
    repo: 'Hello-World',
    stars: 1500,
    forks: 300,
    language: 'JavaScript',
    lastUpdated: '2023-12-01T10:00:00Z'
  },
  tags: ['javascript', 'git', 'tutorial', 'github'],
  // ... other pack info
}
*/
```

## Implementation Details

### Pack ID Parsing

The `parseGitHubPackId()` method supports complex parsing logic:

```javascript
const parsed = registry.parseGitHubPackId('microsoft/vscode#release/1.85/extensions/typescript');
// Returns:
// {
//   owner: 'microsoft',
//   repo: 'vscode',
//   ref: 'release',
//   path: '1.85/extensions/typescript'
// }
```

### Cache Key Generation

Cache keys are generated to avoid conflicts:

```javascript
const cacheKey = registry.generateGitHubCacheKey('microsoft', 'vscode', 'v1.85', 'extensions/typescript');
// Returns: 'github-microsoft-vscode-v1.85-extensions-typescript'
```

### Manifest Enhancement

Downloaded packs have their `pack.json` manifest enhanced with GitHub metadata:

```json
{
  "id": "octocat/hello-world-pack",
  "name": "Hello World Pack",
  "version": "1.0.0",
  "description": "Enhanced from GitHub description",
  "license": "MIT",
  "tags": ["original-tag", "github", "javascript", "git"],
  "github": {
    "owner": "octocat",
    "repo": "Hello-World",
    "stars": 1500,
    "forks": 300,
    "issues": 25,
    "lastUpdated": "2023-12-01T10:00:00Z",
    "defaultBranch": "main",
    "license": "MIT",
    "homepage": "https://octocat.github.io/Hello-World",
    "cloneUrl": "https://github.com/octocat/Hello-World.git",
    "language": "JavaScript"
  }
}
```

## Error Handling

The GitHub integration handles various error scenarios gracefully:

### Repository Not Found
```javascript
const result = await registry.resolveGitHub('nonexistent/repo');
// Returns: null (logged as warning)
```

### Rate Limit Exceeded
```javascript
// Automatically waits or returns null if rate limited
await registry.checkGitHubRateLimit();
```

### Network Errors
```javascript
// All network errors are caught and logged
// Returns null instead of throwing exceptions
```

### Invalid Pack Structure
```javascript
// Validates pack.json existence
// Searches subdirectories for monorepo support
// Cleans up failed downloads automatically
```

## Configuration Options

### Registry Options

```javascript
const registry = new PackRegistry({
  // GitHub-specific options
  githubToken: 'ghp_token',      // GitHub personal access token

  // General options
  cacheDir: './cache',           // Cache directory
  timeout: 30000,                // Git clone timeout (ms)
  maxRetries: 3,                 // Max retry attempts

  // Local options
  localPacksDir: './packs',      // Local packs directory
  registryUrl: 'custom-registry' // Custom registry URL
});
```

### Environment Variables

```bash
# GitHub authentication
export GITHUB_TOKEN=ghp_your_token_here

# Registry cache location
export GITVAN_CACHE_DIR=/custom/cache/path
```

## Security Considerations

### Token Security
- Store tokens in environment variables, not code
- Use fine-grained personal access tokens when possible
- Regularly rotate authentication tokens

### Repository Validation
- All repositories are validated before cloning
- Invalid pack structures are rejected
- Failed downloads are cleaned up automatically

### Rate Limiting
- Automatic rate limit respect prevents API abuse
- Configurable timeouts prevent hanging operations
- Exponential backoff for retry attempts

## Monorepo Support

The GitHub integration includes comprehensive monorepo support:

### Automatic Detection
- Searches subdirectories for `pack.json` files
- Supports up to 3 levels of nesting
- Moves pack contents to cache root automatically

### Explicit Subdirectory Paths
```javascript
// Explicitly specify subdirectory
await registry.resolve('facebook/react/packages/react');
await registry.resolve('vercel/next.js/examples/blog');
```

### Branch + Subdirectory
```javascript
// Combine branch/tag with subdirectory
await registry.resolve('microsoft/vscode#release/1.85/extensions/typescript');
```

## Testing

Run the GitHub integration tests:

```bash
# Run tests
pnpm test tests/pack-registry-github.test.mjs

# Run interactive demo
node tests/github-integration-demo.mjs
```

The test suite covers:
- Pack ID parsing for all supported formats
- GitHub API metadata fetching and error handling
- Rate limiting and authentication scenarios
- Cache key generation and collision avoidance
- Manifest enhancement with GitHub data
- Error scenarios and graceful degradation

## Best Practices

### Performance
- Enable authentication for higher rate limits
- Use specific refs (tags/commits) for reproducible builds
- Leverage caching by avoiding unnecessary cache clears

### Reliability
- Always handle the case where `resolveGitHub()` returns `null`
- Implement fallback mechanisms for network failures
- Monitor rate limit usage in production environments

### Security
- Validate pack contents before use
- Use read-only tokens when possible
- Implement pack verification/signing for critical environments

## Future Enhancements

Planned improvements for the GitHub integration:

1. **GitHub App Authentication**: Support GitHub Apps for better rate limits
2. **Webhook Integration**: Real-time pack updates via GitHub webhooks
3. **Release Integration**: Automatic pack versioning from GitHub releases
4. **Security Scanning**: Integration with GitHub security advisories
5. **Metrics Collection**: Pack usage analytics and repository insights

## Troubleshooting

### Common Issues

**Pack not found**
```
Repository not found or not accessible: owner/repo
```
- Verify repository exists and is accessible
- Check authentication for private repositories
- Confirm repository name spelling

**Rate limit exceeded**
```
GitHub API rate limit exceeded or access forbidden
```
- Add GITHUB_TOKEN environment variable
- Wait for rate limit reset (shown in logs)
- Use authenticated requests for higher limits

**No pack.json found**
```
No pack.json found in repository or subdirectories
```
- Ensure repository contains a valid GitVan pack
- Check subdirectories for monorepo structures
- Verify pack.json format and structure

**Clone timeout**
```
Failed to fetch GitHub pack: timeout
```
- Increase timeout in registry options
- Check network connectivity
- Verify repository size (large repos take longer)

### Debug Mode

Enable debug logging:

```javascript
const registry = new PackRegistry({
  // ... other options
});

// Registry logs are automatically enabled with DEBUG level
// Check console output for detailed GitHub integration logs
```

The GitHub integration provides comprehensive logging for:
- API calls and responses
- Rate limit status
- Cache operations
- Error conditions
- Performance metrics