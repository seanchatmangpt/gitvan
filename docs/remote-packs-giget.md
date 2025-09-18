# GitVan Remote Pack Support with Giget

GitVan now supports remote pack installation using [giget](https://unjs.io/packages/giget), enabling you to install packs directly from GitHub, GitLab, Bitbucket, Sourcehut, and custom registries.

## Features

✨ **Multi-Provider Support**: Install packs from GitHub, GitLab, Bitbucket, and Sourcehut  
✨ **Template Registry**: Built-in registry support with custom registry capabilities  
✨ **Fast Installation**: Uses tarball downloads without requiring local `git` and `tar`  
✨ **Offline Support**: Works offline with disk cache support  
✨ **Authentication**: Support for private repositories with tokens  
✨ **Dependency Management**: Automatic dependency installation after pack installation  
✨ **Unplugin Integration**: Generate build tool plugins from remote packs  

## Installation

Giget is automatically included with GitVan v2.1.0+. If you need to install it separately:

```bash
pnpm add giget
```

## Usage

### Basic Remote Pack Installation

```bash
# Install from GitHub
gitvan marketplace install github:unjs/template

# Install from GitLab
gitvan marketplace install gitlab:unjs/template

# Install from Bitbucket
gitvan marketplace install bitbucket:unjs/template

# Install from Sourcehut
gitvan marketplace install sourcehut:pi0/unjs-template
```

### Advanced Installation Options

```bash
# Install specific branch
gitvan marketplace install github:unjs/template#dev

# Install from subdirectory
gitvan marketplace install github:unjs/template/packages/core

# Install with branch and subdirectory
gitvan marketplace install github:unjs/template#dev/packages/core

# Force installation (overwrite existing)
gitvan marketplace install github:unjs/template --force

# Clean installation (remove existing directory first)
gitvan marketplace install github:unjs/template --force-clean

# Install dependencies after pack installation
gitvan marketplace install github:unjs/template --install-deps

# Use cached version only
gitvan marketplace install github:unjs/template --offline

# Prefer cached version, download if not available
gitvan marketplace install github:unjs/template --prefer-offline
```

### Private Repository Support

```bash
# Using environment variable
export GIGET_AUTH=your_github_token
gitvan marketplace install github:private-org/private-repo

# Using command line option
gitvan marketplace install github:private-org/private-repo --auth your_token
```

### Registry Support

```bash
# Install from built-in registry
gitvan marketplace install registry:nuxt

# Install from custom registry
gitvan marketplace install registry:my-pack --registry https://custom-registry.com
```

## Remote Pack Management

### List Remote Packs

```bash
# List all installed remote packs
gitvan marketplace remote list
```

### Update Remote Packs

```bash
# Update a specific remote pack
gitvan marketplace remote update pack-id

# Force update even if no changes
gitvan marketplace remote update pack-id --force
```

### Remove Remote Packs

```bash
# Remove a remote pack
gitvan marketplace remote remove pack-id
```

### Search Remote Packs

```bash
# Search remote packs from registry
gitvan marketplace remote search "react"

# Search with custom registry
gitvan marketplace remote search "vue" --registry https://custom-registry.com
```

## Unplugin Integration

Remote packs can include unplugin configuration to generate build tool plugins:

```bash
# Generate unplugin plugins for all compatible packs
gitvan marketplace unplugin generate-all

# Generate plugins for specific frameworks
gitvan marketplace unplugin generate-all --frameworks vite,webpack,rollup

# Test unplugin integration
gitvan marketplace unplugin test pack-id --framework vite
```

## Pack Configuration

Remote packs should include a `pack.json` manifest with the following structure:

```json
{
  "id": "remote-pack-id",
  "name": "Remote Pack Name",
  "version": "1.0.0",
  "description": "Description of the remote pack",
  "author": "Author Name",
  "license": "MIT",
  "keywords": ["keyword1", "keyword2"],
  "jobs": [
    {
      "name": "job:name",
      "file": "jobs/job.mjs",
      "description": "Job description"
    }
  ],
  "dependencies": {
    "dependency-name": "^1.0.0"
  },
  "unplugin": {
    "name": "pack-plugin",
    "description": "Build tool plugin description",
    "frameworks": ["vite", "webpack", "rollup"],
    "hooks": {
      "buildStart": "function() { console.log('Build started'); }",
      "transform": "function(code, id) { return code; }"
    },
    "options": {
      "watchMode": true,
      "generateTypes": true
    }
  },
  "gitvan": {
    "packType": "automation",
    "version": "2.0.0",
    "compatibility": {
      "gitvan": ">=2.0.0"
    }
  }
}
```

## Custom Registry

You can create custom registries for your organization:

### Registry Structure

A custom registry should provide an endpoint with the dynamic path `/:template.json` that returns a JSON response:

```json
{
  "name": "template-name",
  "tar": "https://api.github.com/repos/owner/repo/tarball/main",
  "defaultDir": "template-name",
  "url": "https://github.com/owner/repo",
  "subdir": "packages/template",
  "headers": {
    "Authorization": "token your_token"
  }
}
```

### Using Custom Registry

```bash
# Set custom registry URL
export GIGET_REGISTRY=https://your-registry.com

# Or use command line option
gitvan marketplace install registry:template --registry https://your-registry.com
```

## Examples

### Complete Workflow

```bash
# 1. Browse available packs
gitvan marketplace browse --source remote

# 2. Search for specific packs
gitvan marketplace search "react" --source remote

# 3. Install a remote pack
gitvan marketplace install github:unjs/react-template

# 4. List installed remote packs
gitvan marketplace remote list

# 5. Generate unplugin plugins
gitvan marketplace unplugin generate-all

# 6. Update the pack
gitvan marketplace remote update unjs-react-template

# 7. Remove when no longer needed
gitvan marketplace remote remove unjs-react-template
```

### Private Repository Workflow

```bash
# 1. Set up authentication
export GIGET_AUTH=ghp_your_github_token

# 2. Install private pack
gitvan marketplace install github:your-org/private-pack

# 3. Install with dependencies
gitvan marketplace install github:your-org/private-pack --install-deps
```

### Custom Registry Workflow

```bash
# 1. Set up custom registry
export GIGET_REGISTRY=https://your-company.com/pack-registry

# 2. Search packs in custom registry
gitvan marketplace remote search "internal" --registry https://your-company.com/pack-registry

# 3. Install from custom registry
gitvan marketplace install registry:internal-pack
```

## Configuration

### Environment Variables

- `GIGET_AUTH`: Authentication token for private repositories
- `GIGET_REGISTRY`: Custom registry URL
- `GIGET_CACHE`: Custom cache directory (default: `.gitvan/cache/remote-packs`)

### CLI Options

- `--auth`: Authentication token for private repositories
- `--registry`: Custom registry URL
- `--force`: Force installation even if pack exists
- `--force-clean`: Remove existing directory before installation
- `--offline`: Use cached version only
- `--prefer-offline`: Use cache if available, otherwise download
- `--install-deps`: Install pack dependencies after installation

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Ensure your token has the correct permissions
2. **Network Issues**: Use `--offline` or `--prefer-offline` for cached versions
3. **Invalid Pack Structure**: Ensure the remote repository has a valid `pack.json`
4. **Dependency Installation Failures**: Check that the pack has a valid `package.json`

### Debug Mode

```bash
# Enable verbose logging
gitvan marketplace install github:unjs/template --verbose
```

## Integration with Existing Workflows

Remote packs integrate seamlessly with GitVan's existing pack system:

- Remote packs appear in `gitvan marketplace browse`
- They can be used in job definitions and templates
- Unplugin integration works with remote packs
- All existing pack management commands work with remote packs

## Best Practices

1. **Use Semantic Versioning**: Tag your remote packs with proper versions
2. **Include Documentation**: Add comprehensive README files to your pack repositories
3. **Test Locally**: Test packs locally before publishing to remote repositories
4. **Use Private Repositories**: Keep sensitive packs in private repositories with proper authentication
5. **Leverage Caching**: Use `--prefer-offline` for faster installations in CI/CD environments

## Related Commands

- `gitvan marketplace browse` - Browse all packs (local and remote)
- `gitvan marketplace search` - Search packs with filters
- `gitvan marketplace install` - Install packs from any source
- `gitvan marketplace remote list` - List remote packs
- `gitvan marketplace remote update` - Update remote packs
- `gitvan marketplace remote remove` - Remove remote packs
- `gitvan marketplace unplugin generate-all` - Generate build tool plugins
- `gitvan marketplace examples` - Show usage examples
