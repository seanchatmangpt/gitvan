# Getting Started with GitVan: Your First Automation

Welcome! In this tutorial, you'll install GitVan, initialize your first project, and create a working automation in about 15 minutes. Let's go!

## What You'll Build

By the end of this tutorial, you will have:
- ✅ Installed GitVan
- ✅ Initialized your first project
- ✅ Created your first working job
- ✅ Run it successfully from the command line

No complex concepts. Just working automation that you built yourself.

## Prerequisites

You need:
- **Node.js 18+** - [Install here](https://nodejs.org) if needed
- **Git 2.30+** - [Install here](https://git-scm.com) if needed
- A code editor (VS Code, vim, etc.)
- 15 minutes of your time

Check you have everything:
```bash
node --version    # Should show v18 or higher
git --version     # Should show 2.30 or higher
```

## Step 1: Install GitVan (2 minutes)

Open your terminal and install GitVan globally:

```bash
npm install -g gitvan@2.2.0
```

Verify it installed:

```bash
gitvan --version
# Output: 2.2.0
```

Perfect! You now have GitVan ready to use.

## Step 2: Create Your First Project (2 minutes)

Create a new directory for your GitVan project:

```bash
mkdir my-gitvan-project
cd my-gitvan-project
```

Initialize a Git repository (GitVan needs this):

```bash
git init
git config user.name "Your Name"
git config user.email "your@email.com"
```

Initialize GitVan:

```bash
gitvan init
```

You'll see output like:
```
✅ GitVan initialized!
📁 Created .gitvan/ directory
📝 Created gitvan.config.js
🎯 Ready to create your first job!
```

Congratulations! Your project is initialized. Let's make your first commit:

```bash
git add .
git commit -m "init: initialize GitVan project"
```

## Step 3: Create Your First Job (5 minutes)

Jobs are the core of GitVan. Let's create one that does something simple and useful.

Create the jobs directory:

```bash
mkdir jobs
```

Create a new file `jobs/hello.mjs` with this content:

```javascript
/**
 * A simple greeting job
 * Shows basic GitVan concepts
 */

export default {
  meta: {
    name: 'hello',
    desc: 'Greet the user and show system info'
  },

  async run({ ctx }) {
    console.log('\n🎉 Hello from GitVan!\n');

    // Show current time
    console.log('📅 Current time:', new Date().toLocaleString());

    // Show current directory
    console.log('📁 Working directory:', process.cwd());

    // Show a success message
    console.log('\n✨ Your first job ran successfully!\n');

    return {
      ok: true,
      message: 'Job completed successfully'
    };
  }
};
```

That's it! You've created your first job.

## Step 4: Run Your First Job (3 minutes)

List all your jobs:

```bash
gitvan job list
```

You should see:
```
📋 Available jobs (1):

  hello - Greet the user and show system info
```

Now run it:

```bash
gitvan job run --name hello
```

You should see:
```
🎉 Hello from GitVan!

📅 Current time: [your current time]
📁 Working directory: /path/to/my-gitvan-project

✨ Your first job ran successfully!
```

**Congratulations!** 🎊 You just ran your first GitVan automation!

Let's commit this:

```bash
git add jobs/
git commit -m "feat: add hello job"
```

## Step 5: Create a Useful Second Job (3 minutes)

Now let's create something actually useful. Create `jobs/project-info.mjs`:

```javascript
/**
 * Show information about your project
 */

import { readFileSync } from 'fs';

export default {
  meta: {
    name: 'project-info',
    desc: 'Display your project information'
  },

  async run({ ctx }) {
    try {
      // Read package.json if it exists
      const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

      console.log('\n📦 Project Information:\n');
      console.log(`  Name: ${pkg.name}`);
      console.log(`  Version: ${pkg.version}`);
      console.log(`  Description: ${pkg.description || 'No description'}`);
      console.log('');

      return { ok: true };
    } catch (error) {
      console.log('\n⚠️  No package.json found. Create one to use this job!');
      console.log('   Run: npm init -y\n');

      return { ok: false, error: error.message };
    }
  }
};
```

Run it:

```bash
gitvan job run --name project-info
```

This job demonstrates:
- ✅ Reading files
- ✅ Error handling
- ✅ Helpful user messages
- ✅ Returning status information

## Step 6: Understand What You've Built

You've created:

1. **A project directory** with Git initialized (required by GitVan)
2. **A configuration file** (`gitvan.config.js`) that tells GitVan how to behave
3. **Job files** that define automations you can run on demand

Your structure looks like:
```
my-gitvan-project/
├── .git/                    # Git repository
├── .gitvan/                 # GitVan data (configuration, state)
├── jobs/                    # Your automation jobs
│   ├── hello.mjs
│   └── project-info.mjs
├── gitvan.config.js         # GitVan configuration
└── package.json             # (if you created one)
```

## What's Happening Under the Hood?

When you run `gitvan job run --name hello`:

1. GitVan loads your configuration from `gitvan.config.js`
2. It scans the `jobs/` directory for job files
3. It finds `hello.mjs` and loads it
4. It executes the `run()` function inside
5. The function runs and prints output
6. GitVan returns the result

Simple as that! Jobs are just JavaScript files that export a function.

## Success! What's Next?

You've learned:
- ✅ How to install GitVan
- ✅ How to initialize a project
- ✅ How to create a job
- ✅ How to run a job

### Ready to Level Up?

Choose your next adventure:

**🎓 Learn More Tutorials**
- [Create Your First Hook](./tutorial-first-hook.md) - Automation that triggers automatically
- [Create Your First Pack](./tutorial-first-pack.md) - Reusable project templates

**🔧 Solve Real Problems**
- [How to Migrate from GitHub Actions](../migration/from-github-actions.md) - If you use GitHub Actions
- [How to Create a CI/CD Pipeline](../cookbook/README.md) - Automate testing and building

**📚 Understand Concepts**
- [What is Git-Native Automation?](../architecture/git-native-philosophy.md) - Why this approach?
- [Understanding Jobs and Composables](../composables/api-reference.md) - Deeper dive

**🚀 Explore More**
- [All Tutorials](./index.md) - See what else you can build
- [CLI Commands Reference](../cli/commands-reference.md) - All GitVan commands

### Pro Tips

1. **Jobs are just JavaScript files** - Use any Node.js library or feature
2. **Copy-paste works** - Take recipes from the cookbook and adapt them
3. **Test locally** - Run jobs before committing them to see if they work
4. **Ask for help** - [GitHub Discussions](https://github.com/seanchatmangpt/gitvan/discussions) is friendly

---

## Troubleshooting

### "gitvan: command not found"
You need to install GitVan first:
```bash
npm install -g gitvan@2.2.0
```

### "Cannot find module" error
Make sure your job file is in the `jobs/` directory and uses `.mjs` extension:
```
jobs/
├── hello.mjs         ✅ Correct
├── my-job.mjs        ✅ Correct
└── not-a-job.js      ❌ Wrong extension
```

### Job runs but produces no output
Jobs are silent by default. Add `console.log()` to see output:
```javascript
export default {
  async run() {
    console.log('This message will appear');
    return { ok: true };
  }
};
```

---

**You did it!** 🎉 You now have a working GitVan setup with real automation. This is just the beginning.

**Next step:** Read [Create Your First Hook](./tutorial-first-hook.md) to learn how to make jobs run automatically.

Happy automating! 🚀
