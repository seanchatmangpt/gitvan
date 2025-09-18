# Git Operations Cookbook

## Overview

This cookbook provides practical recipes for common Git operations using GitVan's composables.

## Basic Git Operations

### Initialize Repository

```javascript
// .gitvan/jobs/init-repo.mjs
export default {
  name: 'init-repo',
  description: 'Initialize a new Git repository',

  async run({ useGit }) {
    const git = useGit();

    // Initialize repository
    await git.init({ initialBranch: 'main' });

    // Configure user
    await git.config({ key: 'user.name', value: 'GitVan Bot' });
    await git.config({ key: 'user.email', value: 'bot@gitvan.dev' });

    // Create initial commit
    await git.add({ all: true });
    await git.commit({ message: 'Initial commit' });

    return { initialized: true };
  }
};
```

### Auto-commit Changes

```javascript
// .gitvan/jobs/auto-commit.mjs
export default {
  name: 'auto-commit',
  description: 'Automatically commit pending changes',

  async run({ useGit }) {
    const git = useGit();

    // Check for changes
    const status = await git.status();

    if (status.isClean) {
      console.log('No changes to commit');
      return { committed: false };
    }

    // Stage all changes
    await git.add({ all: true });

    // Generate commit message
    const files = status.files.map(f => f.path);
    const message = `Auto-commit: Update ${files.length} files`;

    // Commit changes
    await git.commit({ message });

    console.log(`✅ Committed ${files.length} files`);
    return { committed: true, files };
  }
};
```

## Branch Management

### Create Feature Branch

```javascript
// .gitvan/jobs/create-feature.mjs
export default {
  name: 'create-feature',
  description: 'Create a new feature branch',

  inputs: {
    feature: {
      type: 'string',
      required: true,
      description: 'Feature name'
    }
  },

  async run({ input, useGit }) {
    const git = useGit();
    const { feature } = input;

    // Create branch name
    const branchName = `feature/${feature.toLowerCase().replace(/\s+/g, '-')}`;

    // Get current branch
    const currentBranch = await git.currentBranch();

    // Create and checkout new branch
    await git.checkout({ branch: branchName, create: true });

    console.log(`✅ Created branch: ${branchName} from ${currentBranch}`);

    return { branch: branchName, from: currentBranch };
  }
};
```

### Merge Feature Branch

```javascript
// .gitvan/jobs/merge-feature.mjs
export default {
  name: 'merge-feature',
  description: 'Merge feature branch to main',

  inputs: {
    branch: {
      type: 'string',
      required: true,
      description: 'Branch to merge'
    }
  },

  async run({ input, useGit }) {
    const git = useGit();
    const { branch } = input;

    // Ensure we're on main
    await git.checkout({ branch: 'main' });

    // Pull latest changes
    await git.pull({ remote: 'origin', branch: 'main' });

    // Merge feature branch
    await git.merge({ branch, squash: true });

    // Commit the merge
    await git.commit({
      message: `feat: merge ${branch} into main`
    });

    // Delete merged branch
    await git.deleteBranch({ branch, force: true });

    // Push changes
    await git.push({ remote: 'origin', branch: 'main' });

    console.log(`✅ Merged ${branch} into main`);

    return { merged: branch };
  }
};
```

## Tag Management

### Create Release Tag

```javascript
// .gitvan/jobs/create-tag.mjs
export default {
  name: 'create-tag',
  description: 'Create a release tag',

  inputs: {
    version: {
      type: 'string',
      required: true,
      pattern: '^v\\d+\\.\\d+\\.\\d+$'
    }
  },

  async run({ input, useGit }) {
    const git = useGit();
    const { version } = input;

    // Get recent commits for tag message
    const commits = await git.log({ maxCount: 10, oneline: true });

    // Create annotated tag
    await git.tag({
      name: version,
      message: `Release ${version}\n\nChanges:\n${commits.map(c => `- ${c.message}`).join('\n')}`,
      annotated: true
    });

    // Push tag
    await git.push({ remote: 'origin', tags: true });

    console.log(`✅ Created tag: ${version}`);

    return { tag: version };
  }
};
```

## Remote Operations

### Sync with Upstream

```javascript
// .gitvan/jobs/sync-upstream.mjs
export default {
  name: 'sync-upstream',
  description: 'Sync fork with upstream repository',

  async run({ useGit }) {
    const git = useGit();

    // Add upstream if not exists
    const remotes = await git.remotes();
    if (!remotes.includes('upstream')) {
      await git.addRemote({
        name: 'upstream',
        url: 'https://github.com/original/repo.git'
      });
    }

    // Fetch upstream
    await git.fetch({ remote: 'upstream', all: true });

    // Checkout main
    await git.checkout({ branch: 'main' });

    // Merge upstream
    await git.merge({ branch: 'upstream/main' });

    // Push to origin
    await git.push({ remote: 'origin', branch: 'main' });

    console.log('✅ Synced with upstream');

    return { synced: true };
  }
};
```

## Advanced Operations

### Interactive Rebase

```javascript
// .gitvan/jobs/clean-history.mjs
export default {
  name: 'clean-history',
  description: 'Clean up commit history',

  inputs: {
    count: {
      type: 'number',
      default: 5,
      description: 'Number of commits to squash'
    }
  },

  async run({ input, useGit }) {
    const git = useGit();
    const { count } = input;

    // Get recent commits
    const commits = await git.log({ maxCount: count });

    // Create squash message
    const message = commits.map(c => c.message).join('\n');

    // Reset to N commits ago
    await git.reset({ mode: 'soft', commit: `HEAD~${count}` });

    // Create single commit
    await git.commit({
      message: `chore: squash ${count} commits\n\n${message}`
    });

    console.log(`✅ Squashed ${count} commits`);

    return { squashed: count };
  }
};
```

### Cherry-pick Commits

```javascript
// .gitvan/jobs/cherry-pick.mjs
export default {
  name: 'cherry-pick',
  description: 'Cherry-pick commits from another branch',

  inputs: {
    commits: {
      type: 'array',
      required: true,
      description: 'Commit SHAs to cherry-pick'
    }
  },

  async run({ input, useGit }) {
    const git = useGit();
    const { commits } = input;

    const picked = [];

    for (const commit of commits) {
      try {
        await git.cherryPick({ commits: [commit] });
        picked.push(commit);
        console.log(`✅ Cherry-picked: ${commit}`);
      } catch (error) {
        console.error(`❌ Failed to cherry-pick ${commit}: ${error.message}`);
      }
    }

    return { picked };
  }
};
```

## Git Notes

### Add Build Status

```javascript
// .gitvan/jobs/add-build-status.mjs
export default {
  name: 'add-build-status',
  description: 'Add build status to commit',

  inputs: {
    status: {
      type: 'string',
      enum: ['success', 'failure', 'pending']
    }
  },

  async run({ input, useGit }) {
    const git = useGit();
    const { status } = input;

    // Get current commit
    const commit = await git.headSha();

    // Add note
    await git.addNote({
      ref: 'refs/notes/builds',
      object: commit,
      message: JSON.stringify({
        status,
        timestamp: new Date().toISOString(),
        runner: 'gitvan'
      })
    });

    console.log(`✅ Added build status: ${status}`);

    return { commit, status };
  }
};
```

## Worktrees

### Create Review Worktree

```javascript
// .gitvan/jobs/review-pr.mjs
export default {
  name: 'review-pr',
  description: 'Create worktree for PR review',

  inputs: {
    pr: {
      type: 'number',
      required: true,
      description: 'PR number'
    }
  },

  async run({ input, useGit }) {
    const git = useGit();
    const { pr } = input;

    const path = `../review-pr-${pr}`;
    const branch = `pr/${pr}`;

    // Fetch PR branch
    await git.fetch({
      remote: 'origin',
      refspec: `pull/${pr}/head:${branch}`
    });

    // Create worktree
    await git.addWorktree({ path, branch });

    console.log(`✅ Created review worktree at ${path}`);

    return { path, branch };
  }
};
```

## Best Practices

1. **Always check repository state** before operations
2. **Use atomic operations** for consistency
3. **Handle merge conflicts** gracefully
4. **Validate inputs** before Git operations
5. **Use descriptive commit messages**
6. **Clean up temporary branches** after merging
7. **Push with lease** for safety
8. **Use notes** for metadata

## See Also

- [Git Composable API](../../api/composables.md#usegit)
- [Workflow Recipes](../git-workflows.md)
- [CI/CD Automation](../cicd/build-automation.md)