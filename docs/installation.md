# GitVan Installation Guide

Complete installation guide for GitVan on all platforms.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Global Installation](#global-installation)
3. [Local Installation](#local-installation)
4. [Development Installation](#development-installation)
5. [Verification](#verification)
6. [Troubleshooting](#troubleshooting)
7. [Upgrading](#upgrading)
8. [Uninstallation](#uninstallation)

## System Requirements

### Minimum Requirements

- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher (comes with Node.js)
- **Git**: 2.20.0 or higher
- **Operating System**: Linux, macOS, or Windows
- **Disk Space**: ~5MB for package, ~20MB with node_modules

### Recommended Requirements

- **Node.js**: 20.0.0 or higher (LTS version)
- **npm**: 9.0.0 or higher
- **Git**: 2.35.0 or higher

### Check Your Environment

```bash
# Check Node.js version
node --version
# Should output: v18.x.x or higher

# Check npm version
npm --version
# Should output: 8.x.x or higher

# Check Git version
git --version
# Should output: git version 2.20.x or higher
```

## Global Installation

Global installation makes the `gitvan` command available system-wide.

### Using npm

```bash
npm install -g gitvan
```

### Using pnpm

```bash
pnpm add -g gitvan
```

### Using yarn

```bash
yarn global add gitvan
```

### Verify Installation

```bash
# Check gitvan is installed
gitvan --version

# Should output: 3.1.0 (or current version)

# Check gitvan help
gitvan --help
```

## Local Installation

Local installation adds gitvan as a project dependency.

### Using npm

```bash
# Install as dependency
npm install gitvan

# Or as dev dependency
npm install --save-dev gitvan
```

### Using pnpm

```bash
pnpm add gitvan
```

### Using yarn

```bash
yarn add gitvan
```

### Using in Project

After local installation, use via npm scripts:

```json
{
  "scripts": {
    "workflow:list": "gitvan workflow list",
    "workflow:run": "gitvan workflow run"
  }
}
```

Then run:

```bash
npm run workflow:list
```

Or use npx:

```bash
npx gitvan workflow list
```

## Development Installation

For contributing to GitVan or local development.

### Clone Repository

```bash
# Clone the repository
git clone https://github.com/seanchatmangpt/gitvan.git
cd gitvan

# Install dependencies
npm install
```

### Build from Source

```bash
# Build the project
npm run build

# Output will be in dist/ directory
```

### Run Development Version

```bash
# Run CLI directly
node bin/gitvan.mjs --help

# Or use npm script
npm run dev
```

### Link for Local Testing

```bash
# Create global symlink
npm link

# Now 'gitvan' command uses your local development version
gitvan --version

# To unlink
npm unlink -g gitvan
```

## Verification

### Basic Verification

```bash
# 1. Check version
gitvan --version

# 2. List commands
gitvan --help

# 3. Initialize workflow (creates .gitvan/ directory)
gitvan workflow init

# 4. List workflows
gitvan workflow list
```

### Advanced Verification

```bash
# Create a test workflow
cat > .gitvan/workflows/hello.ttl << 'EOF'
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

gh:HelloWorld a gh:Hook ;
  rdfs:label "Hello World" ;
  op:hasPipeline [
    op:hasStep [ a op:CLIStep ; op:command "echo Hello, GitVan!" ]
  ] .
EOF

# Run the workflow
gitvan workflow run HelloWorld

# Should output: Hello, GitVan!
```

## Troubleshooting

### Common Issues

#### 1. Command not found: gitvan

**Problem**: After installation, `gitvan` command not found.

**Solutions**:

```bash
# Check if npm global bin is in PATH
npm config get prefix

# Add to PATH (Linux/macOS)
export PATH="$(npm config get prefix)/bin:$PATH"

# Add to PATH permanently (Linux/macOS)
echo 'export PATH="$(npm config get prefix)/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Windows: Add npm global directory to System PATH
# Default: C:\Users\<username>\AppData\Roaming\npm
```

#### 2. Permission denied (Linux/macOS)

**Problem**: EACCES error during installation.

**Solutions**:

```bash
# Option 1: Fix npm permissions (recommended)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc

# Then install again
npm install -g gitvan

# Option 2: Use sudo (not recommended)
sudo npm install -g gitvan
```

#### 3. Node version incompatibility

**Problem**: GitVan requires Node.js 18+.

**Solutions**:

```bash
# Check current version
node --version

# Install/update Node.js using nvm (recommended)
# Install nvm: https://github.com/nvm-sh/nvm
nvm install 20
nvm use 20

# Or download from nodejs.org
# https://nodejs.org/
```

#### 4. Build failures

**Problem**: Build errors during installation.

**Solutions**:

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Try with different registry
npm install -g gitvan --registry https://registry.npmjs.org/
```

#### 5. Git not found

**Problem**: GitVan requires Git to be installed.

**Solutions**:

```bash
# Linux (Debian/Ubuntu)
sudo apt-get install git

# Linux (Fedora/RHEL)
sudo yum install git

# macOS
brew install git

# Windows
# Download from https://git-scm.com/download/win
```

### Platform-Specific Issues

#### Windows

1. **Long Path Issues**:
   ```powershell
   # Enable long paths
   git config --system core.longpaths true
   ```

2. **PowerShell Execution Policy**:
   ```powershell
   # Allow script execution
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

#### macOS

1. **Homebrew Alternative**:
   ```bash
   # Coming soon
   # brew install gitvan
   ```

2. **Permissions**:
   ```bash
   # Fix permissions
   sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}
   ```

#### Linux

1. **Snap Alternative**:
   ```bash
   # Coming soon
   # snap install gitvan
   ```

## Upgrading

### Upgrade to Latest Version

```bash
# Global installation
npm update -g gitvan

# Or reinstall
npm uninstall -g gitvan
npm install -g gitvan

# Local installation
npm update gitvan

# Check new version
gitvan --version
```

### Upgrade from 3.0.x to 3.1.x

No breaking changes. Simply upgrade:

```bash
npm update -g gitvan
```

### View Changelog

```bash
# View changes
cat $(npm root -g)/gitvan/CHANGELOG.md

# Or online
# https://github.com/seanchatmangpt/gitvan/blob/main/CHANGELOG.md
```

## Uninstallation

### Remove Global Installation

```bash
# Using npm
npm uninstall -g gitvan

# Using pnpm
pnpm remove -g gitvan

# Using yarn
yarn global remove gitvan
```

### Remove Local Installation

```bash
# Using npm
npm uninstall gitvan

# Using pnpm
pnpm remove gitvan

# Using yarn
yarn remove gitvan
```

### Clean Up Configuration

```bash
# Remove .gitvan directory from projects
rm -rf .gitvan/

# Note: This will remove all workflows
# Backup first if needed
```

## Next Steps

After installation:

1. **Initialize**: `gitvan workflow init`
2. **Read Tutorials**: [docs/TUTORIALS.md](TUTORIALS.md)
3. **Create Workflows**: [docs/HOW-TO-GUIDES.md](HOW-TO-GUIDES.md)
4. **Explore Examples**: [examples/](../examples/)

## Getting Help

- **Documentation**: [docs/](.)
- **GitHub Issues**: [Report a bug](https://github.com/seanchatmangpt/gitvan/issues)
- **Support**: [SUPPORT.md](../SUPPORT.md)
- **Contributing**: [CONTRIBUTING.md](../CONTRIBUTING.md)

## Additional Resources

- **npm Package**: [npmjs.com/package/gitvan](https://www.npmjs.com/package/gitvan)
- **GitHub**: [github.com/seanchatmangpt/gitvan](https://github.com/seanchatmangpt/gitvan)
- **Documentation**: [Full docs](https://github.com/seanchatmangpt/gitvan#readme)
