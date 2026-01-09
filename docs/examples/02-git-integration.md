# Example 2: Git Integration

This example demonstrates using GitVan's Git composable to automate Git operations and create custom workflows.

## Scenario: Automated Feature Branch Workflow

Create a script that automates the feature branch workflow:
1. Create feature branch
2. Make changes
3. Commit with conventional message
4. Run tests
5. Push to remote
6. Create pull request

## Implementation

Create `feature-workflow.mjs`:

```javascript
import { withGitVan, useGit, useWorkflow, useTemplate } from 'gitvan';
import { readFileSync } from 'fs';

const context = {
  repo: process.cwd(),
  config: {}
};

async function createFeature(featureName, description) {
  await withGitVan(context, async () => {
    const git = useGit();
    const workflow = useWorkflow();
    const template = useTemplate();

    console.log(`Creating feature: ${featureName}`);

    // 1. Ensure clean working directory
    const status = await git.status();
    if (status.modified.length > 0 || status.staged.length > 0) {
      throw new Error('Working directory not clean. Commit or stash changes first.');
    }

    // 2. Update main branch
    console.log('Updating main branch...');
    await git.checkout('main');
    await git.pull({ remote: 'origin', branch: 'main' });

    // 3. Create feature branch
    const branchName = `feature/${featureName}`;
    console.log(`Creating branch: ${branchName}`);
    await git.branch(branchName, { checkout: true });

    // 4. Generate initial files from template
    console.log('Generating initial files...');
    const featureCode = await template.render('feature-template.njk', {
      name: featureName,
      description: description
    });

    // Write generated code
    const fs = useFileSystem();
    await fs.write(`src/features/${featureName}.js`, featureCode);

    // 5. Stage and commit
    console.log('Committing changes...');
    await git.add([`src/features/${featureName}.js`]);
    await git.commit(`feat: add ${featureName} feature\n\n${description}`);

    // 6. Run tests
    console.log('Running tests...');
    const testResult = await workflow.execute('test-suite');

    if (testResult.status !== 'success') {
      console.error('Tests failed. Fix issues before pushing.');
      return;
    }

    // 7. Push to remote
    console.log('Pushing to remote...');
    await git.push({
      remote: 'origin',
      branch: branchName,
      setUpstream: true
    });

    // 8. Show next steps
    console.log('✓ Feature branch created successfully!');
    console.log(`\nNext steps:`);
    console.log(`  1. Continue development on branch: ${branchName}`);
    console.log(`  2. Create pull request when ready`);
    console.log(`  3. Branch URL: https://github.com/user/repo/tree/${branchName}`);
  });
}

// Run
const featureName = process.argv[2];
const description = process.argv[3];

if (!featureName || !description) {
  console.error('Usage: node feature-workflow.mjs <feature-name> <description>');
  process.exit(1);
}

await createFeature(featureName, description);
```

## Usage

```bash
node feature-workflow.mjs user-authentication "Add JWT-based user authentication"
```

Output:
```
Creating feature: user-authentication
Updating main branch...
Creating branch: feature/user-authentication
Generating initial files...
Committing changes...
Running tests...
  ✓ Install Dependencies (1.2s)
  ✓ Run Tests (2.8s)
Pushing to remote...
✓ Feature branch created successfully!

Next steps:
  1. Continue development on branch: feature/user-authentication
  2. Create pull request when ready
  3. Branch URL: https://github.com/user/repo/tree/feature/user-authentication
```

## Git Operations Reference

### Check Repository Status

```javascript
import { withGitVan, useGit } from 'gitvan';

await withGitVan(context, async () => {
  const git = useGit();

  const status = await git.status();

  console.log('Branch:', status.branch);
  console.log('Commit:', status.commit);
  console.log('Modified files:', status.modified);
  console.log('Staged files:', status.staged);
  console.log('Untracked files:', status.untracked);
  console.log('Commits ahead:', status.ahead);
  console.log('Commits behind:', status.behind);
});
```

### Branch Management

```javascript
const git = useGit();

// Create branch
await git.branch('feature/new-feature');

// Create from specific commit
await git.branch('hotfix/bug', {
  from: 'abc123',
  checkout: true
});

// Delete branch
await git.deleteBranch('feature/old-feature');

// List branches
const branches = await git.listBranches();
console.log('Local branches:', branches.local);
console.log('Remote branches:', branches.remote);
```

### Commit Operations

```javascript
const git = useGit();

// Stage files
await git.add(['src/index.js', 'src/utils.js']);

// Stage all changes
await git.add(['.']);

// Create commit
const sha = await git.commit('feat: add new feature');

// Create signed commit
await git.commit('fix: security patch', {
  sign: true,
  author: {
    name: 'John Doe',
    email: 'john@example.com'
  }
});

// Amend last commit
await git.commit('feat: add feature (updated)', {
  amend: true
});
```

### Remote Operations

```javascript
const git = useGit();

// Pull latest changes
await git.pull({
  remote: 'origin',
  branch: 'main',
  rebase: true
});

// Push changes
await git.push({
  remote: 'origin',
  branch: 'feature/new-feature',
  setUpstream: true
});

// Force push (use with caution!)
await git.push({
  remote: 'origin',
  branch: 'feature/rebased',
  force: true
});

// Fetch
await git.fetch({ remote: 'origin' });
```

### Merge Operations

```javascript
const git = useGit();

// Merge branch
const result = await git.merge('feature/new-feature', {
  strategy: 'recursive'
});

if (result.conflicts.length > 0) {
  console.error('Merge conflicts:', result.conflicts);
  // Handle conflicts
} else {
  console.log('Merge successful:', result.sha);
}

// Squash merge
await git.merge('feature/to-squash', {
  squash: true
});
```

### Worktree Operations

```javascript
const git = useGit();
const worktree = git.worktree();

// Create worktree for parallel work
await worktree.create('/tmp/hotfix-worktree', {
  branch: 'hotfix/critical-bug'
});

// Work in worktree...
// (separate working directory)

// Remove worktree when done
await worktree.remove('/tmp/hotfix-worktree');

// List all worktrees
const trees = await worktree.list();
console.log('Active worktrees:', trees);
```

## Advanced Example: Release Automation

Create `release.mjs`:

```javascript
import { withGitVan, useGit, useWorkflow, useTemplate } from 'gitvan';
import { execSync } from 'child_process';

const context = {
  repo: process.cwd(),
  config: {}
};

async function createRelease(version) {
  await withGitVan(context, async () => {
    const git = useGit();
    const workflow = useWorkflow();
    const template = useTemplate();

    console.log(`Creating release: v${version}`);

    // 1. Ensure on main branch
    const status = await git.status();
    if (status.branch !== 'main') {
      throw new Error('Must be on main branch for releases');
    }

    // 2. Pull latest changes
    console.log('Pulling latest changes...');
    await git.pull({ remote: 'origin', branch: 'main' });

    // 3. Run full test suite
    console.log('Running tests...');
    const testResult = await workflow.execute('full-test-suite');
    if (testResult.status !== 'success') {
      throw new Error('Tests failed. Fix before release.');
    }

    // 4. Update version in package.json
    console.log('Updating version...');
    const packageJson = JSON.parse(
      await fs.read('package.json')
    );
    packageJson.version = version;
    await fs.write('package.json', JSON.stringify(packageJson, null, 2));

    // 5. Generate changelog
    console.log('Generating changelog...');
    const changelog = await template.render('changelog.njk', {
      version,
      date: new Date().toISOString().split('T')[0],
      commits: await getCommitsSinceLastTag()
    });
    await fs.write('CHANGELOG.md', changelog, { append: true });

    // 6. Commit version bump
    await git.add(['package.json', 'CHANGELOG.md']);
    await git.commit(`chore: release v${version}`, { sign: true });

    // 7. Create tag
    console.log('Creating tag...');
    await git.tag(`v${version}`, {
      message: `Release v${version}`,
      sign: true
    });

    // 8. Push to remote
    console.log('Pushing to remote...');
    await git.push({ remote: 'origin', branch: 'main', tags: true });

    // 9. Run build and publish workflow
    console.log('Building and publishing...');
    await workflow.execute('build-and-publish', {
      variables: { VERSION: version }
    });

    console.log(`✓ Release v${version} created successfully!`);
    console.log(`Tag: v${version}`);
    console.log(`Commit: ${await git.getCurrentCommit()}`);
  });
}

async function getCommitsSinceLastTag() {
  const git = useGit();
  const tags = await git.listTags();
  const lastTag = tags[tags.length - 1];

  if (!lastTag) {
    return git.log();
  }

  return git.log({ from: lastTag, to: 'HEAD' });
}

// Run
const version = process.argv[2];
if (!version) {
  console.error('Usage: node release.mjs <version>');
  process.exit(1);
}

await createRelease(version);
```

Usage:
```bash
node release.mjs 1.2.0
```

## Git Event Hooks

Listen for Git events and trigger workflows:

Create `git-hooks.mjs`:

```javascript
import { withGitVan, useEvent, useWorkflow, useGit } from 'gitvan';

const context = {
  repo: process.cwd(),
  config: {}
};

await withGitVan(context, async () => {
  const event = useEvent();
  const workflow = useWorkflow();
  const git = useGit();

  // On every commit
  event.on('git:commit', async ({ sha, message }) => {
    console.log(`Commit ${sha}: ${message}`);

    // Run CI on commits to main
    const status = await git.status();
    if (status.branch === 'main') {
      await workflow.execute('ci-pipeline');
    }
  });

  // On push
  event.on('git:push', async ({ remote, branch, commits }) => {
    console.log(`Pushed ${commits.length} commits to ${remote}/${branch}`);

    // Deploy on push to main
    if (branch === 'main') {
      await workflow.execute('deploy-staging');
    }

    // Deploy to production on push to production branch
    if (branch === 'production') {
      await workflow.execute('deploy-production');
    }
  });

  // On merge
  event.on('git:merge', async ({ source, target, sha }) => {
    console.log(`Merged ${source} into ${target}`);

    // Run integration tests after merge
    await workflow.execute('integration-tests');
  });

  // On tag creation
  event.on('git:tag', async ({ name, sha }) => {
    console.log(`Tag created: ${name} at ${sha}`);

    // Build release on tag
    if (name.startsWith('v')) {
      await workflow.execute('build-release', {
        variables: { VERSION: name }
      });
    }
  });

  console.log('Listening for Git events...');
});
```

## Git Notes for Metadata

Store metadata in Git notes:

```javascript
import { withGitVan, useGit } from 'gitvan';

await withGitVan(context, async () => {
  const git = useGit();

  // Add note to commit
  await git.addNote('abc123', 'refs/notes/gitvan/metadata', {
    buildStatus: 'passed',
    coverage: '95%',
    timestamp: new Date().toISOString()
  });

  // Read notes
  const notes = await git.notes('refs/notes/gitvan/metadata');
  for (const [commit, note] of Object.entries(notes)) {
    console.log(`${commit}:`, JSON.parse(note));
  }
});
```

## Audit Trail with Git

```javascript
import { withGitVan, useGit, useReceipt } from 'gitvan';

await withGitVan(context, async () => {
  const git = useGit();
  const receipt = useReceipt();

  // Record workflow execution in Git notes
  const status = await git.status();

  await receipt.write({
    action: 'workflow:execute',
    workflow: 'deploy',
    status: 'success',
    commit: status.commit,
    branch: status.branch,
    timestamp: new Date().toISOString()
  });

  // Verify audit trail
  const records = await receipt.read();
  const isValid = await receipt.verify(records);

  console.log('Audit trail valid:', isValid);
  console.log('Total records:', records.length);
});
```

## Best Practices

### 1. Always Check Status First

```javascript
const status = await git.status();
if (status.modified.length > 0) {
  throw new Error('Uncommitted changes');
}
```

### 2. Use Signed Commits for Security

```javascript
await git.commit('feat: add feature', {
  sign: true
});
```

### 3. Pull Before Push

```javascript
await git.pull({ remote: 'origin', branch: 'main' });
// Make changes
await git.push({ remote: 'origin', branch: 'main' });
```

### 4. Handle Merge Conflicts

```javascript
const result = await git.merge('feature-branch');
if (result.conflicts.length > 0) {
  console.error('Conflicts:', result.conflicts);
  // Abort merge or resolve conflicts
  await git.abortMerge();
}
```

### 5. Use Worktrees for Parallel Work

```javascript
// Don't switch branches - use worktrees
await worktree.create('/tmp/hotfix', {
  branch: 'hotfix/critical'
});
```

## Next Steps

- [Example 3: Template Usage](./03-template-usage.md)
- [Example 4: Job Scheduling](./04-job-scheduling.md)
- [Example 5: Error Handling](./05-error-handling.md)

---

**Key Takeaways:**

1. Use `useGit()` composable for all Git operations
2. Always work within `withGitVan()` context
3. Check repository status before operations
4. Use Git notes for metadata storage
5. Listen to Git events for automation
