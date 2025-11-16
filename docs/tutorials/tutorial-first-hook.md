# Your First Hook: Automation That Triggers Automatically

In the Getting Started tutorial, you learned to run jobs manually with `gitvan job run`. But what if your jobs could run automatically when something happens? That's what hooks do.

In this 10-minute tutorial, you'll create your first hook—automation that triggers when you push code.

## What You'll Build

A hook that automatically runs a job whenever you commit code to your repository.

When you're done:
```bash
git commit -m "my change"
# → Hook detects the commit
# → Job runs automatically
# → You see the results
```

## Prerequisites

- Completed the [Getting Started tutorial](./getting-started-tutorial.md)
- Your `my-gitvan-project` directory with jobs you created
- Understanding of what jobs are

## Step 1: Create an Event-Triggered Job (3 minutes)

Create a new job that will run automatically. Add to `jobs/on-commit.mjs`:

```javascript
/**
 * Job that runs automatically after each commit
 */

import { readFileSync } from 'fs';

export default {
  meta: {
    name: 'on-commit',
    desc: 'Runs automatically after each commit'
  },

  // This configuration defines when the job should run
  on: {
    // Trigger after every commit
    events: ['commit']
  },

  async run({ ctx }) {
    console.log('\n🎯 Hook triggered! A commit just happened.\n');

    // Read git log to show what was committed
    const gitOutput = require('child_process')
      .execSync('git log -1 --oneline', { encoding: 'utf8' })
      .trim();

    console.log('📝 Latest commit:', gitOutput);
    console.log('✅ Hook job executed!\n');

    return {
      ok: true,
      triggeredBy: 'commit-event'
    };
  }
};
```

This job has an important new property: `on: { events: ['commit'] }`. This tells GitVan to run this job automatically when a commit happens.

## Step 2: Start the GitVan Daemon (3 minutes)

Hooks work by running a daemon (background process) that watches for events. Start it:

```bash
gitvan daemon start
```

You should see:
```
🚀 GitVan Daemon started
📡 Listening for Git events...
```

The daemon runs in the background and watches your repository for Git events.

## Step 3: Trigger Your Hook (4 minutes)

Make a change to any file:

```bash
echo "# My Project" > README.md
git add README.md
git commit -m "docs: add readme"
```

When you commit, your hook should trigger! You'll see output similar to:

```
🎯 Hook triggered! A commit just happened.

📝 Latest commit: abc1234 docs: add readme
✅ Hook job executed!
```

**Amazing!** Your hook just ran automatically! 🎉

## Understanding What Happened

1. You ran `gitvan daemon start` - Started the background daemon
2. You created a commit - Git executed the commit
3. The daemon detected the commit - It noticed the change
4. Your hook job ran - The job executed automatically
5. You saw the output - The job printed its results

The workflow looked like:
```
Git commit happens
        ↓
GitVan daemon detects it
        ↓
Daemon checks all hooks
        ↓
Your hook matches (events: ['commit'])
        ↓
Daemon runs your job
        ↓
Job completes and prints output
```

## Making Hooks More Useful

Let's create a more realistic hook. Create `jobs/validate-on-commit.mjs`:

```javascript
/**
 * Validate code whenever someone commits
 */

export default {
  meta: {
    name: 'validate-on-commit',
    desc: 'Validates code after each commit'
  },

  on: {
    events: ['commit']
  },

  async run({ ctx }) {
    console.log('\n🔍 Validating your commit...\n');

    // Count changed files
    const { execSync } = require('child_process');
    const changedFiles = execSync('git diff --name-only HEAD~1..HEAD', {
      encoding: 'utf8'
    }).trim().split('\n').length;

    console.log(`📊 Files changed: ${changedFiles}`);

    // Show commit message
    const message = execSync('git log -1 --format=%B', {
      encoding: 'utf8'
    }).trim();
    console.log(`💬 Commit message: "${message}"`);

    // Validate message format (optional)
    if (!message.includes(':')) {
      console.log('⚠️  Tip: Use "type: description" format for commit messages');
    }

    console.log('✅ Validation complete!\n');

    return { ok: true };
  }
};
```

Now when you commit, BOTH hooks will run:
```bash
git commit -m "fix: improve validation"

# Both on-commit.mjs and validate-on-commit.mjs run automatically!
```

## Controlling the Daemon

While developing, you might want to stop and restart the daemon:

```bash
# See if daemon is running
gitvan daemon status

# Stop the daemon
gitvan daemon stop

# Restart it
gitvan daemon start
```

## What's Happening Behind the Scenes?

GitVan uses Git's native hook system:

1. **Git Hooks** are files that Git runs at certain points (before/after commit, push, etc.)
2. **GitVan installs** a Git hook that detects the event
3. **Your hooks** (the jobs you defined) respond to that event
4. **The daemon** watches for these events and runs your jobs

This means:
- ✅ Works offline - No external service needed
- ✅ Uses Git's native system - No extra tools to learn
- ✅ Automatic - Runs without manual intervention
- ✅ Transparent - You know exactly what's happening

## Hook Event Types

GitVan detects many different events:

| Event | When It Triggers | Use Case |
|-------|------------------|----------|
| `commit` | After every commit | Validation, notifications |
| `push` | After pushing to remote | Deploy, release checks |
| `merge` | After merging branches | Update documentation |
| `tag` | When creating tags | Release automation |

You can also trigger on specific branches or file patterns—but that's an advanced topic we'll skip for now.

## Success! What's Next?

You've learned:
- ✅ How hooks work
- ✅ How to create an event-triggered job
- ✅ How to start the daemon
- ✅ How to verify hooks are running

### Next Adventures

**🎓 More Tutorials**
- [Create Your First Pack](./tutorial-first-pack.md) - Reusable project templates
- [Create Your First Test](./tutorial-first-test.md) - Test your automation

**🔧 Real-World Hooks**
- [How to Set Up CI/CD with Hooks](../cookbook/README.md) - Automate testing
- [How to Create Pre-Commit Validations](../guides/validation-setup.md) - Code quality

**📚 Understanding Hooks**
- [How Hooks Work (Detailed)](../architecture/knowledge-hooks.md) - Deep dive
- [Hooks Reference](../api/hooks-reference.md) - All hook options

### Important Note

**The daemon is development-only.** For production, you'd use:
- GitHub Actions (for GitHub repos)
- GitLab CI (for GitLab repos)
- Your own server running `gitvan daemon start`

This tutorial shows you the core concept, which is the same no matter the deployment.

---

## Troubleshooting

### Daemon doesn't seem to be running
Check the status:
```bash
gitvan daemon status
```

If it's not running:
```bash
gitvan daemon start
```

### Hook ran but I didn't see output
The daemon runs in the background. Check the logs:
```bash
gitvan daemon status
```

Or check output manually by running the job:
```bash
gitvan job run --name on-commit
```

### "Cannot find module" in hook job
Hooks run in the project directory. Make sure imports are correct:
```javascript
// ✅ Correct: relative to project root
import { someFunc } from './src/lib.mjs';

// ❌ Wrong: doesn't work in hooks
import { someFunc } from '/absolute/path/lib.mjs';
```

---

**You did it!** 🎉 You now have your first automated hook running!

This is powerful stuff. You've gone from manual jobs to automatic automation.

**Ready for packs?** → [Create Your First Pack](./tutorial-first-pack.md)
