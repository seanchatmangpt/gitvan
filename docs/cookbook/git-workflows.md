# Git Workflow Recipes

This cookbook contains advanced Git workflow automation recipes using GitVan v2's Git-native features and hook system.

## Recipe 1: Branch Protection Workflows

### Use Case
Automatically enforce branch protection rules, quality gates, and approval processes for critical branches.

### Configuration
```javascript
// .gitvan/hooks/branch-protection.mjs
export default {
  name: 'branch-protection',
  triggers: ['pre-push', 'pr:created'],
  action: async ({ git, github, context, logger }) => {
    const branch = context.branch || await git.getCurrentBranch();
    const protectionRules = await getProtectionRules(branch);

    if (!protectionRules) {
      logger.info(`No protection rules for branch: ${branch}`);
      return;
    }

    // Enforce protection rules
    await enforceProtectionRules(protectionRules, { git, github, context });
  }
};

async function getProtectionRules(branch) {
  const rules = {
    'main': {
      requirePR: true,
      requireReviews: 2,
      requireTests: true,
      requireLinearHistory: true,
      allowedUsers: ['admin', 'lead-dev'],
      blockDirectPush: true
    },
    'develop': {
      requirePR: true,
      requireReviews: 1,
      requireTests: true,
      requireLinearHistory: false,
      allowedUsers: ['admin', 'lead-dev', 'senior-dev']
    },
    'release/*': {
      requirePR: true,
      requireReviews: 2,
      requireTests: true,
      requireChangeLog: true,
      requireVersionBump: true
    }
  };

  // Match branch patterns
  for (const [pattern, rule] of Object.entries(rules)) {
    if (branch === pattern || minimatch(branch, pattern)) {
      return rule;
    }
  }

  return null;
}

async function enforceProtectionRules(rules, { git, github, context }) {
  // Block direct push to protected branches
  if (rules.blockDirectPush && context.trigger === 'pre-push') {
    const currentUser = await git.getConfigValue('user.name');
    if (!rules.allowedUsers.includes(currentUser)) {
      throw new Error(`Direct push blocked. Create a pull request instead.`);
    }
  }

  // Require PR for protected branches
  if (rules.requirePR && !context.pr) {
    const currentBranch = await git.getCurrentBranch();
    const remoteBranch = await git.getRemoteBranch();

    if (currentBranch !== remoteBranch) {
      // Auto-create PR if pushing new branch
      await github.createPullRequest({
        title: `feat: ${currentBranch.replace(/^feature\//, '').replace(/-/g, ' ')}`,
        head: currentBranch,
        base: 'main',
        draft: true,
        body: 'Auto-created PR for protected branch push.'
      });
    }
  }

  // Require tests to pass
  if (rules.requireTests) {
    const testResult = await runRequiredTests();
    if (!testResult.passed) {
      throw new Error(`Tests must pass before push. Failed: ${testResult.failed}`);
    }
  }

  // Require linear history
  if (rules.requireLinearHistory) {
    const hasLinearHistory = await git.hasLinearHistory();
    if (!hasLinearHistory) {
      throw new Error('Linear history required. Please rebase your branch.');
    }
  }
}
```

### GitHub Integration
```javascript
// .gitvan/hooks/github-protection.mjs
export default {
  name: 'github-protection',
  triggers: ['repo:init'],
  action: async ({ github, config }) => {
    const protectionConfig = config.get('github.branchProtection');

    // Set up branch protection on GitHub
    for (const [branch, rules] of Object.entries(protectionConfig)) {
      await github.updateBranchProtection(branch, {
        required_status_checks: {
          strict: true,
          contexts: rules.requiredChecks || ['ci/tests', 'ci/lint']
        },
        enforce_admins: rules.enforceAdmins || false,
        required_pull_request_reviews: {
          required_approving_review_count: rules.requireReviews || 1,
          dismiss_stale_reviews: true,
          require_code_owner_reviews: rules.requireCodeOwners || false
        },
        restrictions: null
      });
    }
  }
};
```

### Expected Results
- Automatic branch protection enforcement
- PR creation for protected branches
- Quality gate validation
- GitHub branch protection sync

---

## Recipe 2: Semantic Versioning Automation

### Use Case
Automatically determine version bumps based on conventional commits and manage releases with proper semantic versioning.

### Configuration
```javascript
// .gitvan/hooks/semantic-versioning.mjs
export default {
  name: 'semantic-versioning',
  triggers: ['tag:requested', 'release:prepare'],
  action: async ({ git, config, logger }) => {
    const currentVersion = await getCurrentVersion();
    const commits = await git.getCommitsSinceLastTag();
    const versionBump = analyzeCommitsForVersionBump(commits);

    const newVersion = calculateNewVersion(currentVersion, versionBump);

    // Update version in files
    await updateVersionFiles(newVersion);

    // Create changelog
    await generateChangelog(commits, newVersion);

    // Commit version updates
    await git.add(['package.json', 'CHANGELOG.md']);
    await git.commit(`chore: release v${newVersion}`);

    // Create and push tag
    await git.createTag(`v${newVersion}`, `Release v${newVersion}`);
    await git.push('origin', 'main', { tags: true });

    logger.info(`Released version ${newVersion}`);
  }
};

function analyzeCommitsForVersionBump(commits) {
  let hasMajor = false;
  let hasMinor = false;
  let hasPatch = false;

  for (const commit of commits) {
    const message = commit.message.toLowerCase();

    // Breaking changes
    if (message.includes('breaking change') || message.includes('!:')) {
      hasMajor = true;
    }
    // New features
    else if (message.startsWith('feat:') || message.startsWith('feat(')) {
      hasMinor = true;
    }
    // Bug fixes
    else if (message.startsWith('fix:') || message.startsWith('fix(')) {
      hasPatch = true;
    }
  }

  if (hasMajor) return 'major';
  if (hasMinor) return 'minor';
  if (hasPatch) return 'patch';
  return null; // No version bump needed
}

function calculateNewVersion(current, bump) {
  const [major, minor, patch] = current.split('.').map(Number);

  switch (bump) {
    case 'major': return `${major + 1}.0.0`;
    case 'minor': return `${major}.${minor + 1}.0`;
    case 'patch': return `${major}.${minor}.${patch + 1}`;
    default: return current;
  }
}

async function updateVersionFiles(version) {
  // Update package.json
  const packageJson = await readJSON('package.json');
  packageJson.version = version;
  await writeJSON('package.json', packageJson);

  // Update other version files
  const versionFiles = [
    'src/version.js',
    'docs/version.txt',
    'helm/Chart.yaml'
  ];

  for (const file of versionFiles) {
    if (await fileExists(file)) {
      await updateVersionInFile(file, version);
    }
  }
}
```

### Conventional Commits Configuration
```yaml
# .gitvan/config.yaml
versioning:
  enabled: true
  conventional: true
  prerelease: false
  versionFiles:
    - 'package.json'
    - 'src/version.js'
    - 'Chart.yaml'
  changelog:
    enabled: true
    sections:
      - { type: 'feat', section: 'Features' }
      - { type: 'fix', section: 'Bug Fixes' }
      - { type: 'perf', section: 'Performance' }
      - { type: 'docs', section: 'Documentation' }
```

### Release Workflow
```javascript
// .gitvan/hooks/release-workflow.mjs
export default {
  name: 'release-workflow',
  triggers: ['tag:created'],
  action: async ({ git, github, exec, context }) => {
    const tag = context.tag;
    const isPrerelease = tag.includes('alpha') || tag.includes('beta');

    // Build release artifacts
    await exec.run('npm', ['run', 'build:prod']);
    await exec.run('npm', ['run', 'package']);

    // Create GitHub release
    const releaseNotes = await generateReleaseNotes(tag);
    const release = await github.createRelease({
      tag_name: tag,
      name: `Release ${tag}`,
      body: releaseNotes,
      draft: false,
      prerelease: isPrerelease
    });

    // Upload artifacts
    const artifacts = ['dist.zip', 'checksums.txt'];
    for (const artifact of artifacts) {
      if (await fileExists(artifact)) {
        await github.uploadReleaseAsset(release.id, artifact);
      }
    }

    // Publish to npm if stable release
    if (!isPrerelease) {
      await exec.run('npm', ['publish']);
    }
  }
};
```

### Expected Results
- Automatic version calculation from commits
- Semantic version compliance
- Changelog generation
- Release artifact creation

---

## Recipe 3: Git Flow Automation

### Use Case
Automate Git Flow workflow with feature branches, releases, and hotfixes including automatic merging and cleanup.

### Configuration
```javascript
// .gitvan/hooks/gitflow-automation.mjs
export default {
  name: 'gitflow-automation',
  triggers: ['branch:created', 'pr:merged', 'hotfix:needed'],
  action: async ({ git, context, config, logger }) => {
    const branch = context.branch;
    const action = determineGitFlowAction(branch, context);

    switch (action) {
      case 'feature-start':
        await startFeatureBranch(branch, git);
        break;
      case 'feature-finish':
        await finishFeatureBranch(branch, git);
        break;
      case 'release-start':
        await startReleaseBranch(branch, git);
        break;
      case 'release-finish':
        await finishReleaseBranch(branch, git);
        break;
      case 'hotfix-start':
        await startHotfixBranch(context.hotfix, git);
        break;
      case 'hotfix-finish':
        await finishHotfixBranch(branch, git);
        break;
    }
  }
};

function determineGitFlowAction(branch, context) {
  if (branch.startsWith('feature/') && context.trigger === 'branch:created') {
    return 'feature-start';
  }
  if (branch.startsWith('feature/') && context.trigger === 'pr:merged') {
    return 'feature-finish';
  }
  if (branch.startsWith('release/') && context.trigger === 'branch:created') {
    return 'release-start';
  }
  if (branch.startsWith('release/') && context.trigger === 'pr:merged') {
    return 'release-finish';
  }
  if (context.trigger === 'hotfix:needed') {
    return 'hotfix-start';
  }
  if (branch.startsWith('hotfix/') && context.trigger === 'pr:merged') {
    return 'hotfix-finish';
  }
  return null;
}

async function startFeatureBranch(branch, git) {
  // Ensure branch is created from develop
  const baseBranch = await git.getBaseBranch(branch);
  if (baseBranch !== 'develop') {
    logger.warn(`Feature branch should be based on 'develop', currently on '${baseBranch}'`);
  }

  // Set up branch tracking
  await git.setUpstreamBranch(branch, 'origin');

  // Create feature branch prefix if needed
  if (!branch.startsWith('feature/')) {
    const newBranchName = `feature/${branch}`;
    await git.renameBranch(branch, newBranchName);
  }
}

async function finishFeatureBranch(branch, git) {
  // Merge feature back to develop
  await git.checkout('develop');
  await git.pull('origin', 'develop');
  await git.merge(branch, { noFf: true });
  await git.push('origin', 'develop');

  // Clean up feature branch
  await git.deleteBranch(branch);
  await git.deleteRemoteBranch('origin', branch);

  logger.info(`Feature branch ${branch} merged and cleaned up`);
}

async function startReleaseBranch(branch, git) {
  const version = extractVersionFromBranch(branch);

  // Create release branch from develop
  await git.checkout('develop');
  await git.pull('origin', 'develop');
  await git.createBranch(`release/${version}`);

  // Update version files
  await updateVersionFiles(version);
  await git.add('.');
  await git.commit(`chore: prepare release ${version}`);

  logger.info(`Release branch created for version ${version}`);
}

async function finishReleaseBranch(branch, git) {
  const version = extractVersionFromBranch(branch);

  // Merge to main
  await git.checkout('main');
  await git.pull('origin', 'main');
  await git.merge(branch, { noFf: true });

  // Create release tag
  await git.createTag(`v${version}`, `Release ${version}`);
  await git.push('origin', 'main', { tags: true });

  // Merge back to develop
  await git.checkout('develop');
  await git.merge(branch, { noFf: true });
  await git.push('origin', 'develop');

  // Clean up release branch
  await git.deleteBranch(branch);
  await git.deleteRemoteBranch('origin', branch);

  logger.info(`Release ${version} finished and deployed`);
}
```

### GitFlow Branch Management
```javascript
// .gitvan/hooks/branch-management.mjs
export default {
  name: 'branch-management',
  schedule: '0 2 * * 0', // Weekly cleanup
  action: async ({ git, github, logger }) => {
    // Clean up merged feature branches
    const mergedBranches = await git.getMergedBranches('develop');
    const featureBranches = mergedBranches.filter(b => b.startsWith('feature/'));

    for (const branch of featureBranches) {
      const daysSinceMerge = await git.getDaysSinceMerge(branch);
      if (daysSinceMerge > 7) {
        await git.deleteBranch(branch);
        await git.deleteRemoteBranch('origin', branch);
        logger.info(`Cleaned up old feature branch: ${branch}`);
      }
    }

    // Clean up stale branches
    const staleBranches = await findStaleBranches(git, github);
    for (const branch of staleBranches) {
      await notifyBranchOwner(branch, github);
    }
  }
};

async function findStaleBranches(git, github) {
  const allBranches = await git.getAllBranches();
  const staleBranches = [];

  for (const branch of allBranches) {
    if (branch === 'main' || branch === 'develop') continue;

    const lastActivity = await git.getLastActivity(branch);
    const daysSinceActivity = (Date.now() - lastActivity) / (1000 * 60 * 60 * 24);

    if (daysSinceActivity > 30) {
      staleBranches.push({
        name: branch,
        lastActivity,
        daysSinceActivity: Math.floor(daysSinceActivity)
      });
    }
  }

  return staleBranches;
}
```

### Expected Results
- Automated Git Flow workflow
- Proper branch management
- Version updates and tagging
- Branch cleanup and maintenance

---

## Recipe 4: Monorepo Management

### Use Case
Manage multiple packages in a monorepo with independent versioning, selective builds, and coordinated releases.

### Configuration
```javascript
// .gitvan/hooks/monorepo-management.mjs
export default {
  name: 'monorepo-management',
  triggers: ['pre-commit', 'post-commit', 'pre-push'],
  action: async ({ git, exec, context, logger }) => {
    const changedFiles = await git.getChangedFiles();
    const affectedPackages = detectAffectedPackages(changedFiles);

    if (affectedPackages.length === 0) {
      logger.info('No packages affected by changes');
      return;
    }

    logger.info(`Affected packages: ${affectedPackages.join(', ')}`);

    switch (context.trigger) {
      case 'pre-commit':
        await runPackageTests(affectedPackages, exec);
        await lintAffectedPackages(affectedPackages, exec);
        break;
      case 'post-commit':
        await updatePackageDependencies(affectedPackages);
        break;
      case 'pre-push':
        await buildAffectedPackages(affectedPackages, exec);
        await validatePackageVersions(affectedPackages);
        break;
    }
  }
};

function detectAffectedPackages(changedFiles) {
  const packages = [];
  const packageDirs = ['packages/', 'apps/', 'libs/'];

  for (const file of changedFiles) {
    for (const dir of packageDirs) {
      if (file.startsWith(dir)) {
        const parts = file.split('/');
        const packageName = parts[1];
        if (!packages.includes(packageName)) {
          packages.push(packageName);
        }
        break;
      }
    }
  }

  return packages;
}

async function runPackageTests(packages, exec) {
  const testPromises = packages.map(pkg =>
    exec.run('pnpm', ['--filter', pkg, 'test'], {
      cwd: process.cwd()
    })
  );

  await Promise.all(testPromises);
}

async function buildAffectedPackages(packages, exec) {
  // Build packages in dependency order
  const buildOrder = await calculateBuildOrder(packages);

  for (const pkg of buildOrder) {
    await exec.run('pnpm', ['--filter', pkg, 'build']);
    logger.info(`Built package: ${pkg}`);
  }
}

async function calculateBuildOrder(packages) {
  // Read package.json files to understand dependencies
  const packageInfo = new Map();

  for (const pkg of packages) {
    const packageJson = await readJSON(`packages/${pkg}/package.json`);
    const deps = [
      ...Object.keys(packageJson.dependencies || {}),
      ...Object.keys(packageJson.devDependencies || {})
    ];
    packageInfo.set(pkg, deps);
  }

  // Topological sort
  return topologicalSort(packageInfo);
}
```

### Lerna/Rush Integration
```javascript
// .gitvan/hooks/lerna-integration.mjs
export default {
  name: 'lerna-integration',
  triggers: ['tag:created'],
  action: async ({ exec, context, logger }) => {
    const tag = context.tag;

    // Use Lerna for coordinated publishing
    if (tag.includes('alpha') || tag.includes('beta')) {
      await exec.run('lerna', ['publish', 'prerelease', '--preid', 'alpha']);
    } else {
      await exec.run('lerna', ['publish', 'patch', '--yes']);
    }

    // Update changelog for all packages
    await exec.run('lerna', ['exec', '--', 'npm', 'run', 'changelog:update']);

    logger.info('Monorepo packages published successfully');
  }
};
```

### Workspace Configuration
```json
// package.json
{
  "name": "monorepo",
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "affected:test": "nx affected:test",
    "affected:build": "nx affected:build"
  }
}
```

### Expected Results
- Selective package building and testing
- Coordinated package releases
- Dependency-aware build order
- Efficient CI/CD for large repos

---

## Recipe 5: Cross-Repository Synchronization

### Use Case
Synchronize changes across multiple repositories, maintain shared configurations, and coordinate releases.

### Configuration
```javascript
// .gitvan/hooks/cross-repo-sync.mjs
export default {
  name: 'cross-repo-sync',
  triggers: ['push:main', 'config:updated'],
  action: async ({ git, github, config, context, logger }) => {
    const syncConfig = config.get('crossRepo.sync');
    const changedFiles = await git.getChangedFiles();

    // Determine what needs syncing
    const syncActions = determineSyncActions(changedFiles, syncConfig);

    for (const action of syncActions) {
      await executeSyncAction(action, { git, github, config });
    }
  }
};

function determineSyncActions(changedFiles, syncConfig) {
  const actions = [];

  for (const [pattern, repos] of Object.entries(syncConfig.patterns)) {
    const matchingFiles = changedFiles.filter(file =>
      minimatch(file, pattern)
    );

    if (matchingFiles.length > 0) {
      actions.push({
        type: 'file-sync',
        files: matchingFiles,
        targetRepos: repos,
        pattern
      });
    }
  }

  // Check for configuration updates
  if (changedFiles.some(f => f.includes('.gitvan/'))) {
    actions.push({
      type: 'config-sync',
      files: changedFiles.filter(f => f.includes('.gitvan/')),
      targetRepos: syncConfig.configRepos
    });
  }

  return actions;
}

async function executeSyncAction(action, { git, github, config }) {
  switch (action.type) {
    case 'file-sync':
      await syncFilesToRepos(action, { git, github });
      break;
    case 'config-sync':
      await syncConfigToRepos(action, { git, github });
      break;
    case 'version-sync':
      await syncVersionAcrossRepos(action, { git, github });
      break;
  }
}

async function syncFilesToRepos(action, { git, github }) {
  const sourceRepo = await git.getRepoName();

  for (const targetRepo of action.targetRepos) {
    // Clone or update target repo
    const tempDir = await git.cloneRepo(targetRepo, { temp: true });

    try {
      // Copy files
      for (const file of action.files) {
        const content = await git.readFile(file);
        await writeFile(path.join(tempDir, file), content);
      }

      // Create sync commit
      await git.add('.', { cwd: tempDir });

      const hasChanges = await git.hasUncommittedChanges({ cwd: tempDir });
      if (hasChanges) {
        await git.commit(
          `sync: update from ${sourceRepo}\n\nSynced files:\n${action.files.map(f => `- ${f}`).join('\n')}`,
          { cwd: tempDir }
        );

        // Create PR for sync
        const branchName = `sync/${sourceRepo}-${Date.now()}`;
        await git.createBranch(branchName, { cwd: tempDir });
        await git.push('origin', branchName, { cwd: tempDir });

        await github.createPullRequest({
          repo: targetRepo,
          title: `Sync files from ${sourceRepo}`,
          head: branchName,
          base: 'main',
          body: generateSyncPRBody(action)
        });
      }
    } finally {
      await fs.rmdir(tempDir, { recursive: true });
    }
  }
}
```

### Shared Configuration Management
```javascript
// .gitvan/hooks/shared-config.mjs
export default {
  name: 'shared-config',
  triggers: ['config:template:updated'],
  action: async ({ git, github, config }) => {
    const sharedConfigs = config.get('sharedConfigs');

    for (const [configType, repos] of Object.entries(sharedConfigs)) {
      const templatePath = `templates/${configType}`;
      const template = await git.readFile(templatePath);

      // Update each repository
      for (const repo of repos) {
        await updateRepoConfig(repo, configType, template, { git, github });
      }
    }
  }
};

async function updateRepoConfig(repo, configType, template, { git, github }) {
  const configPaths = {
    'eslint': '.eslintrc.js',
    'prettier': '.prettierrc',
    'tsconfig': 'tsconfig.json',
    'gitvan': '.gitvan/config.yaml'
  };

  const targetPath = configPaths[configType];
  if (!targetPath) return;

  // Create update branch
  const branchName = `config/update-${configType}`;

  await github.createBranch(repo, branchName, 'main');
  await github.updateFile(repo, targetPath, template, {
    branch: branchName,
    message: `config: update ${configType} configuration`
  });

  // Create PR
  await github.createPullRequest({
    repo,
    title: `Update ${configType} configuration`,
    head: branchName,
    base: 'main',
    body: `Auto-update ${configType} configuration from shared template.`
  });
}
```

### Release Coordination
```javascript
// .gitvan/hooks/coordinated-release.mjs
export default {
  name: 'coordinated-release',
  triggers: ['release:coordinate'],
  action: async ({ git, github, config, context }) => {
    const releaseConfig = config.get('coordinatedRelease');
    const version = context.version;

    // Prepare all repositories
    const preparePromises = releaseConfig.repositories.map(repo =>
      prepareRepoForRelease(repo, version, { git, github })
    );

    await Promise.all(preparePromises);

    // Create coordinated release
    await createCoordinatedRelease(releaseConfig, version, { git, github });
  }
};

async function prepareRepoForRelease(repo, version, { git, github }) {
  // Update version in package.json
  await github.updateFile(repo, 'package.json', content => {
    const pkg = JSON.parse(content);
    pkg.version = version;
    return JSON.stringify(pkg, null, 2);
  });

  // Create release branch
  const branchName = `release/v${version}`;
  await github.createBranch(repo, branchName, 'main');

  // Trigger CI/CD
  await github.triggerWorkflow(repo, 'release.yml', {
    version,
    ref: branchName
  });
}
```

### Sync Configuration
```yaml
# .gitvan/config.yaml
crossRepo:
  sync:
    patterns:
      'docs/**': ['org/frontend-app', 'org/mobile-app']
      '.github/workflows/**': ['org/backend-api', 'org/frontend-app']
      'scripts/**': ['org/backend-api', 'org/worker-service']
    configRepos:
      - 'org/shared-configs'
      - 'org/docs-site'

coordinatedRelease:
  repositories:
    - 'org/backend-api'
    - 'org/frontend-app'
    - 'org/mobile-app'
  releaseOrder:
    - 'org/backend-api'    # Deploy API first
    - 'org/frontend-app'   # Then frontend
    - 'org/mobile-app'     # Finally mobile
```

### Expected Results
- Automatic file synchronization across repos
- Shared configuration management
- Coordinated multi-repo releases
- Cross-repository consistency

---

## Advanced Git Workflows

### Git LFS Integration
```javascript
// .gitvan/hooks/lfs-management.mjs
export default {
  name: 'lfs-management',
  triggers: ['pre-commit'],
  action: async ({ git, exec, logger }) => {
    const stagedFiles = await git.getStagedFiles();
    const largeFiles = await findLargeFiles(stagedFiles);

    if (largeFiles.length > 0) {
      // Auto-track large files with LFS
      for (const file of largeFiles) {
        await exec.run('git', ['lfs', 'track', file]);
      }

      await git.add('.gitattributes');
      logger.info(`Added ${largeFiles.length} files to Git LFS tracking`);
    }
  }
};
```

### Submodule Management
```javascript
// .gitvan/hooks/submodule-sync.mjs
export default {
  name: 'submodule-sync',
  triggers: ['post-pull', 'post-checkout'],
  action: async ({ git, exec }) => {
    // Update submodules automatically
    await exec.run('git', ['submodule', 'update', '--init', '--recursive']);

    // Check for submodule updates
    const submodules = await git.getSubmodules();
    for (const submodule of submodules) {
      await checkSubmoduleUpdates(submodule, { git, exec });
    }
  }
};
```

## Best Practices

1. **Branch Naming**: Use consistent naming conventions
2. **Commit Messages**: Follow conventional commit format
3. **Linear History**: Prefer rebase over merge for cleaner history
4. **Protection Rules**: Implement branch protection on critical branches
5. **Automation**: Automate repetitive Git tasks
6. **Documentation**: Document workflow processes

## Troubleshooting

### Common Issues
```bash
# Fix merge conflicts automatically
gitvan resolve conflicts --strategy=ours

# Recover from failed rebase
gitvan rebase abort && gitvan rebase --continue

# Clean up repository
gitvan cleanup --aggressive

# Sync with upstream
gitvan sync upstream main
```

### Workflow Debugging
```bash
# Test workflow hooks
gitvan hook test gitflow-automation --branch=feature/test

# Validate branch protection
gitvan validate branch-protection main

# Check repository health
gitvan health check --full
```