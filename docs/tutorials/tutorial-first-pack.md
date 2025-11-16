# Your First Pack: Reusable Project Templates

In previous tutorials, you created jobs and hooks for a single project. But what if you wanted to reuse the same setup in multiple projects? That's what packs do.

A **pack** is a reusable template that includes jobs, hooks, and project structure. Create it once, use it everywhere.

In this 12-minute tutorial, you'll create your first pack—a reusable Node.js project template.

## What You'll Build

A pack that:
- Creates a complete Node.js project structure
- Includes a working `package.json`
- Sets up basic testing
- Includes validation jobs
- Can be used to scaffold new projects instantly

## Prerequisites

- Completed [Getting Started tutorial](./getting-started-tutorial.md)
- Understanding of how jobs work
- 12 minutes

## Step 1: Create Pack Structure (3 minutes)

Create a pack directory in your project:

```bash
mkdir -p packs/nodejs-starter
cd packs/nodejs-starter
```

A pack needs a `pack.json` manifest. Create `pack.json`:

```json
{
  "name": "nodejs-starter",
  "version": "1.0.0",
  "description": "A complete Node.js starter pack with testing and validation",
  "author": "You <you@example.com>",
  "license": "MIT",
  "keywords": ["nodejs", "typescript", "testing"],
  "categories": ["backend", "nodejs"],

  "gitvan": {
    "jobs": [
      {
        "id": "validate",
        "name": "Validate Project",
        "description": "Validate code and dependencies",
        "file": "jobs/validate.mjs"
      },
      {
        "id": "test",
        "name": "Run Tests",
        "description": "Run the test suite",
        "file": "jobs/test.mjs"
      }
    ],
    "templates": [
      {
        "id": "node-project",
        "name": "Node.js Project Template",
        "description": "Complete Node.js project structure",
        "path": "templates/project/"
      }
    ]
  }
}
```

## Step 2: Create Pack Template Files (4 minutes)

Create the template directory structure:

```bash
mkdir -p templates/project/src
mkdir -p templates/project/tests
```

Create `templates/project/package.json` (this is a template):

```json
{
  "name": "{{ projectName }}",
  "version": "1.0.0",
  "description": "{{ description }}",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "dev": "node src/index.mjs",
    "test": "node --test tests/**/*.test.mjs",
    "lint": "echo 'Linting...'",
    "build": "echo 'Building...'"
  },
  "keywords": [],
  "author": "{{ author }}",
  "license": "MIT",
  "devDependencies": {}
}
```

Create `templates/project/src/index.mjs`:

```javascript
/**
 * Entry point for {{ projectName }}
 */

export function hello(name = 'World') {
  return `Hello, ${name}!`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(hello('{{ projectName }}'));
}
```

Create `templates/project/tests/index.test.mjs`:

```javascript
/**
 * Tests for {{ projectName }}
 */

import { strict as assert } from 'assert';
import { hello } from '../src/index.mjs';

console.log('Testing hello function...');
assert.equal(hello(), 'Hello, World!');
assert.equal(hello('Pack'), 'Hello, Pack!');
console.log('✅ All tests passed!');
```

Create `templates/project/.gitignore`:

```
node_modules/
dist/
.env
.DS_Store
```

Create `templates/project/README.md`:

```markdown
# {{ projectName }}

{{ description }}

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

## Testing

```bash
npm test
```

Created with GitVan {{ projectName }} pack.
```

## Step 3: Create Pack Jobs (3 minutes)

Create `packs/nodejs-starter/jobs/validate.mjs`:

```javascript
/**
 * Validate the project
 */

export default {
  meta: {
    name: 'validate',
    desc: 'Validate code quality and structure'
  },

  async run({ ctx }) {
    console.log('\n🔍 Validating project...\n');

    const { execSync } = require('child_process');

    try {
      // Check if package.json exists
      require('fs').readFileSync('./package.json');
      console.log('✅ package.json found');

      // Check if src/ exists
      require('fs').readdirSync('./src');
      console.log('✅ src/ directory found');

      // Check if tests exist
      require('fs').readdirSync('./tests');
      console.log('✅ tests/ directory found');

      console.log('\n✅ All validations passed!\n');
      return { ok: true };
    } catch (error) {
      console.log('\n❌ Validation failed:', error.message, '\n');
      return { ok: false };
    }
  }
};
```

Create `packs/nodejs-starter/jobs/test.mjs`:

```javascript
/**
 * Run the test suite
 */

export default {
  meta: {
    name: 'test',
    desc: 'Run the project test suite'
  },

  async run({ ctx }) {
    console.log('\n🧪 Running tests...\n');

    const { execSync } = require('child_process');

    try {
      execSync('npm test', { stdio: 'inherit' });
      console.log('\n✅ All tests passed!\n');
      return { ok: true };
    } catch (error) {
      console.log('\n❌ Tests failed!\n');
      return { ok: false };
    }
  }
};
```

## Step 4: Use Your Pack (2 minutes)

Now you have a complete pack! Let's use it. Navigate back to your project root:

```bash
cd ../..  # Back to my-gitvan-project
```

List available packs:

```bash
gitvan pack list
```

You should see your `nodejs-starter` pack listed.

## Step 5: Understand What You've Created

Your pack structure looks like:

```
packs/nodejs-starter/
├── pack.json                    # Pack metadata
├── jobs/                        # Jobs available in this pack
│   ├── validate.mjs
│   └── test.mjs
├── templates/                   # Project templates
│   └── project/
│       ├── src/
│       ├── tests/
│       ├── package.json
│       ├── README.md
│       └── .gitignore
└── README.md                    # (optional) Documentation
```

Your pack includes:

| Component | Purpose |
|-----------|---------|
| **pack.json** | Metadata about the pack |
| **jobs/** | Automation that runs in projects using this pack |
| **templates/** | Project structure and files to scaffold |

## How Packs Work

When someone uses your pack (in a future tutorial), they would:

1. Run: `gitvan pack apply nodejs-starter`
2. GitVan scaffolds files from `templates/project/`
3. GitVan makes `validate` and `test` jobs available
4. They can now use those jobs in their project

Simple and powerful!

## Adding More to Your Pack

You can expand your pack with:

**More jobs:**
```
jobs/
├── validate.mjs
├── test.mjs
├── lint.mjs        ← New
└── build.mjs       ← New
```

**More templates:**
```
templates/
├── project/        ← Main template
├── docker/         ← Docker configuration
└── ci/             ← CI/CD setup
```

**Configuration:**
```
pack.json
{
  "gitvan": {
    "config": {
      "defaults": {
        "typescript": true,
        "testing": "jest"
      }
    }
  }
}
```

## Publishing Your Pack

To share your pack with others, you would:

1. Push it to GitHub
2. Submit to the GitVan registry
3. Others can install it with: `gitvan pack install username/nodejs-starter`

(We'll skip the details here, but see [Pack Authoring Guide](../guides/pack-authoring.md) for complete info.)

## Success! What's Next?

You've learned:
- ✅ Pack structure and purpose
- ✅ How to create reusable templates
- ✅ How to include jobs in packs
- ✅ How to make packs discoverable

### Continue Learning

**🎓 More Tutorials**
- [Create Your First Test](./tutorial-first-test.md) - Test your automation

**🔧 Practical Guides**
- [Complete Pack Authoring Guide](../guides/pack-authoring.md) - All the details
- [How to Publish a Pack](../guides/pack-publishing.md) - Share with the world
- [Pack Best Practices](../guides/pack-best-practices.md) - Do it right

**📚 Understanding Packs**
- [Pack System Architecture](../architecture/pack-system.md) - How they work
- [Pack Manifest Reference](../reference/pack-manifest-reference.md) - Complete schema

### Key Takeaway

Packs are how you **share and reuse** automation. Create them once, use them infinite times.

---

## Troubleshooting

### Pack doesn't appear in `gitvan pack list`
Make sure it's in the `packs/` directory with a `pack.json` file:
```bash
ls packs/nodejs-starter/pack.json
# Should show: packs/nodejs-starter/pack.json
```

### Jobs in pack don't work
Make sure job files are in the correct path:
```bash
ls packs/nodejs-starter/jobs/validate.mjs
# Should exist
```

### Template variables not working
Make sure you're using `{{ variableName }}` syntax in templates:
```json
{
  "name": "{{ projectName }}"  ← Correct
}
```

---

**You did it!** 🎉 You've created your first reusable pack!

This pack can now be used to scaffold multiple projects with the same structure and jobs.

**Ready for testing?** → [Create Your First Test](./tutorial-first-test.md)
