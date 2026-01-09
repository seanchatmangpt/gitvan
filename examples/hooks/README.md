# GitVan Hook Examples

This directory contains practical, real-world examples of GitVan hooks that demonstrate the integration of @unrdf/hooks with Husky and Bree. These examples show how to create powerful Git automation workflows that enforce policies, send notifications, and automate common development tasks.

## Overview

GitVan's hook system bridges three powerful technologies:

- **Husky**: Git hooks manager
- **@unrdf/hooks**: RDF-based reactive hook system
- **Bree**: Background job scheduler for async operations

Together, they enable:
- ✅ Git-native automation (no external databases)
- ✅ Semantic graph-based triggering (RDF/Turtle)
- ✅ Async background processing (non-blocking)
- ✅ Immutable audit trails (Git Notes)

## Examples Included

### 1. Pre-commit Linting (`pre-commit-linting.mjs`)

**Purpose**: Enforce code quality by linting staged files before commits.

**Features**:
- Lints only staged JavaScript/TypeScript files
- Fails commit if linting errors found
- Supports ESLint with configurable rules
- Shows auto-fix suggestions

**Use Cases**:
- Prevent committing poorly formatted code
- Enforce team coding standards
- Catch common errors before CI/CD

**Performance**: 100-500ms (only staged files)

**Example Output**:
```
🔍 Running pre-commit linting...
   📁 Found 5 staged file(s)
   🔎 Linting 5 file(s)...
   ✅ All files passed linting (234ms)
```

### 2. Post-commit Notifications (`post-commit-notifications.mjs`)

**Purpose**: Send notifications to Slack/Discord after successful commits and log to audit trail.

**Features**:
- Sends rich notifications with commit details
- Logs to immutable audit trail (Git Notes)
- Schedules async jobs with Bree (non-blocking)
- Supports multiple notification channels

**Use Cases**:
- Keep team informed of commits
- Track development velocity
- Create audit logs for compliance
- Trigger CI/CD pipelines

**Performance**: 50-100ms (schedules background job)

**Example Output**:
```
📬 Post-commit notifications...
   📝 Commit: a3f2c1b
   👤 Author: John Doe
   📁 Files: 3
   📋 Audit logged: .gitvan/audit/commit-a3f2c1b.json
   📱 Slack notification scheduled: slack-notification-a3f2c1b
   ✅ Notifications scheduled (2 job(s), 87ms)
```

### 3. Post-merge Dependencies (`post-merge-dependencies.mjs`)

**Purpose**: Automatically update dependencies after merging branches.

**Features**:
- Detects package.json/lock file changes
- Smart package manager detection (npm/pnpm/yarn/bun)
- Runs only when dependencies actually changed
- Updates lock files to prevent conflicts

**Use Cases**:
- Keep dependencies in sync after merges
- Prevent dependency conflicts
- Automate `npm install` after pulling
- Reduce manual maintenance

**Performance**: 2-10s (only when needed)

**Example Output**:
```
📦 Post-merge dependency check...
   🔀 Merged from: main
   🌿 Current branch: feature/add-auth
   📝 Dependency files changed: package.json, package-lock.json
   📦 Package manager: npm
   ⚙️  Running: npm install
   ✅ Dependencies updated successfully (3421ms)
   💡 Lock file updated - remember to commit the changes!
```

### 4. Custom Validation (`custom-validation-hook.mjs`)

**Purpose**: Enforce custom business logic and validation rules before commits.

**Features**:
- Commit message format validation (Conventional Commits)
- Branch naming convention enforcement
- File size limits (prevent large files)
- Secret detection (prevent credential leaks)
- Breaking change detection
- Customizable severity levels (error/warning)

**Use Cases**:
- Enforce team policies and standards
- Prevent security issues (secrets in code)
- Ensure commit message consistency
- Validate file changes against tickets
- Block commits that violate policies

**Performance**: 50-200ms (multiple checks)

**Example Output**:
```
🔐 Running custom validation checks...
   🔍 Checking: Commit Message Format...
   ✅ Commit Message Format: passed
   🔍 Checking: File Changes...
   ✅ File Changes: passed
   🔍 Checking: Branch Naming...
   ✅ Branch Naming: passed
   🔍 Checking: File Size...
   ✅ File Size: passed
   🔍 Checking: Secret Detection...
   ✅ Secret Detection: passed
   🔍 Checking: Breaking Changes...
   ⚠️  Breaking Changes: Breaking change detected
   ✅ All validation checks passed (127ms)
```

## Installation

### Option 1: Copy Individual Hooks

Copy any example to your `hooks/` directory:

```bash
cp examples/hooks/pre-commit-linting.mjs hooks/
cp examples/hooks/post-commit-notifications.mjs hooks/
cp examples/hooks/post-merge-dependencies.mjs hooks/
cp examples/hooks/custom-validation-hook.mjs hooks/
```

GitVan will automatically discover and register them.

### Option 2: Symlink Examples

Symlink the examples directory:

```bash
ln -s $(pwd)/examples/hooks hooks/examples
```

### Option 3: Use as Reference

Browse the code to understand patterns and create your own custom hooks.

## Configuration

### Pre-commit Linting

Requires ESLint to be installed:

```bash
npm install -D eslint
```

Create `.eslintrc.js` with your rules:

```javascript
module.exports = {
  extends: ["eslint:recommended"],
  rules: {
    // Your rules here
  }
};
```

### Post-commit Notifications

Set environment variables for notification services:

```bash
# Slack webhook URL (get from Slack app settings)
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Discord webhook URL (get from Discord server settings)
export DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/WEBHOOK/URL
```

Or add to `.env` file:

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

### Post-merge Dependencies

No configuration needed! Automatically detects package manager.

To customize behavior, edit the hook and add conditions:

```javascript
// Only run for specific branches
if (mergeInfo.sourceBranch !== 'main') {
  return { success: true, skipped: true };
}
```

### Custom Validation

Customize validation rules in the hook:

```javascript
// Require ticket number in commit message
async validateTicketInMessage() {
  const message = await this.getCommitMessage();
  if (!/[A-Z]+-\d+/.test(message)) {
    return {
      valid: false,
      severity: "error",
      message: "Commit message must include ticket number"
    };
  }
  return { valid: true };
}
```

## Testing

Run the test suite:

```bash
npm test examples/hooks/hooks-examples.test.mjs
```

Individual tests:

```bash
# Test hook structure
npm test examples/hooks/hooks-examples.test.mjs -- -t "Hook Examples - Structure"

# Test pre-commit linting
npm test examples/hooks/hooks-examples.test.mjs -- -t "Pre-commit Linting"

# Test post-commit notifications
npm test examples/hooks/hooks-examples.test.mjs -- -t "Post-commit Notifications"

# Test post-merge dependencies
npm test examples/hooks/hooks-examples.test.mjs -- -t "Post-merge Dependencies"

# Test custom validation
npm test examples/hooks/hooks-examples.test.mjs -- -t "Custom Validation"

# Performance tests
npm test examples/hooks/hooks-examples.test.mjs -- -t "Performance"
```

## Performance Analysis

### Line Counts

| Hook | Lines | Complexity | Performance |
|------|-------|------------|-------------|
| `pre-commit-linting.mjs` | 238 | Low-Medium | 100-500ms |
| `post-commit-notifications.mjs` | 386 | Medium-High | 50-100ms (async) |
| `post-merge-dependencies.mjs` | 365 | Medium | 2-10s (conditional) |
| `custom-validation-hook.mjs` | 514 | High | 50-200ms |
| **Total** | **1,503** | - | - |

### Complexity Analysis

**Pre-commit Linting** (Low-Medium):
- Simple file filtering
- Linear execution
- External tool dependency (ESLint)

**Post-commit Notifications** (Medium-High):
- Multiple notification channels
- Bree job scheduling
- Audit trail logging
- Async webhook calls

**Post-merge Dependencies** (Medium):
- Package manager detection
- Conditional execution
- External tool calls (npm/pnpm/yarn)

**Custom Validation** (High):
- Multiple validation rules
- Sequential check execution
- Complex regex patterns
- File system operations

## Architecture Patterns

### 1. Job Definition Pattern

All hooks use `defineJob()` from the job registry:

```javascript
export default defineJob({
  meta: {
    name: "my-hook",
    desc: "What it does",
    tags: ["hook-type", "category"],
    version: "1.0.0"
  },

  hooks: ["pre-commit"], // Git hooks to trigger on

  async run(context) {
    // Hook implementation
  }
});
```

### 2. Error Handling Pattern

Hooks handle errors gracefully:

```javascript
try {
  // Do work
  return {
    success: true,
    // ... results
  };
} catch (error) {
  console.error("Error:", error.message);

  // Pre-commit hooks: fail commit
  if (hookType === 'pre-commit') {
    return { success: false, error: error.message, exitCode: 1 };
  }

  // Post-hooks: don't fail (commit already succeeded)
  return { success: true, error: error.message, note: "Hook failed but commit succeeded" };
}
```

### 3. Async Job Scheduling Pattern

Use Bree for background jobs:

```javascript
import { useJob } from "../../src/composables/job.mjs";

const job = useJob();

// Schedule async job (non-blocking)
const jobId = await job.schedule({
  name: 'notification-job',
  interval: 'at 0:00am', // Run once immediately
  job: async () => {
    await sendNotification();
  }
});
```

### 4. Validation Pattern

Validate with severity levels:

```javascript
async validateSomething() {
  if (somethingWrong) {
    return {
      valid: false,
      severity: "error", // or "warning"
      message: "What went wrong",
      details: "How to fix it"
    };
  }
  return { valid: true };
}
```

## Customization Guide

### Adding New Validation Rules

Edit `custom-validation-hook.mjs`:

```javascript
async run(context) {
  const checks = [
    // Add your custom check
    {
      name: "My Custom Check",
      fn: () => this.validateMyThing()
    },
    // ... existing checks
  ];
}

async validateMyThing() {
  // Your validation logic
  if (invalid) {
    return {
      valid: false,
      severity: "error",
      message: "Validation failed"
    };
  }
  return { valid: true };
}
```

### Adding New Notification Channels

Edit `post-commit-notifications.mjs`:

```javascript
async scheduleNotifications(commitInfo) {
  const scheduledJobs = [];

  // Add your notification channel
  if (process.env.TEAMS_WEBHOOK_URL) {
    const teamsJobId = await this.scheduleTeamsNotification(job, commitInfo);
    scheduledJobs.push(teamsJobId);
  }

  return scheduledJobs;
}

async scheduleTeamsNotification(job, commitInfo) {
  // Implement Teams notification
}
```

### Changing Linting Rules

Edit `pre-commit-linting.mjs`:

```javascript
async runLinter(files) {
  // Change ESLint command
  const command = `npx eslint --fix --max-warnings 0 ${filesArg}`;

  // Or use different linter
  const command = `npx prettier --check ${filesArg}`;

  // Or chain multiple linters
  await this.runESLint(files);
  await this.runPrettier(files);
  await this.runTypeScript(files);
}
```

## Best Practices

### 1. Performance

✅ **DO**:
- Only process staged/changed files
- Use Bree for long-running operations
- Cache validation results when possible
- Skip expensive checks if cheap ones fail

❌ **DON'T**:
- Lint entire codebase on every commit
- Block commits with slow operations
- Run network calls synchronously
- Duplicate work across hooks

### 2. Error Handling

✅ **DO**:
- Return appropriate exit codes
- Provide clear error messages
- Suggest fixes for validation failures
- Log errors for debugging

❌ **DON'T**:
- Fail silently
- Block commits on infrastructure failures
- Use generic error messages
- Throw uncaught exceptions

### 3. User Experience

✅ **DO**:
- Show progress indicators
- Provide actionable feedback
- Skip when not applicable
- Print execution time

❌ **DON'T**:
- Print excessive output
- Block commits unnecessarily
- Hide errors from users
- Require manual intervention for automation

### 4. Maintainability

✅ **DO**:
- Document configuration options
- Use descriptive variable names
- Add code comments for complex logic
- Include usage examples

❌ **DON'T**:
- Hardcode values
- Use magic numbers
- Create tight coupling
- Skip documentation

## Troubleshooting

### Hook Not Running

Check:
1. Is the hook file in `hooks/` directory?
2. Does it export a valid job definition?
3. Is the `hooks` property correct? (`["pre-commit"]`)
4. Is Husky properly installed?

### Linting Fails

Check:
1. Is ESLint installed? (`npm install -D eslint`)
2. Is `.eslintrc.js` configured?
3. Are there actual linting errors?
4. Run `npx eslint --fix` to auto-fix

### Notifications Not Sending

Check:
1. Are webhook URLs configured in environment?
2. Are URLs valid and accessible?
3. Check Bree job logs for errors
4. Test webhooks manually with curl

### Dependencies Not Updating

Check:
1. Did package.json actually change?
2. Is the correct package manager installed?
3. Are there network issues?
4. Check npm/pnpm/yarn logs

### Validation Blocking Commits

Check:
1. What specific validation failed?
2. Is the validation rule correct?
3. Can you fix the issue or bypass?
4. Consider changing severity to "warning"

## Advanced Topics

### RDF Predicate Evaluation

For complex validation rules, use RDF predicates:

```turtle
# policy.ttl
@prefix policy: <http://example.com/policy/> .

policy:MaxFileSize a policy:Rule ;
  policy:threshold 5000000 ;
  policy:severity "error" ;
  policy:message "File size exceeds limit" .
```

```javascript
import { PredicateEvaluator } from "../../src/hooks/PredicateEvaluator.mjs";

async validateWithRDF() {
  const evaluator = new PredicateEvaluator();
  const result = await evaluator.evaluate(hook, graph);
  return result;
}
```

### Knowledge Hooks

Create knowledge hooks that trigger on semantic graph changes:

```turtle
# hook.ttl
@prefix hook: <http://gitvan.dev/hook/> .

hook:OnDependencyChange a hook:KnowledgeHook ;
  hook:predicate [
    a hook:GraphChange ;
    hook:pattern "?s npm:hasDependency ?dep" ;
    hook:when "added"
  ] ;
  hook:workflow hook:UpdateDependenciesWorkflow .
```

### Bree Job Scheduling

Advanced Bree scheduling:

```javascript
await job.schedule({
  name: 'complex-job',
  interval: '0 */6 * * *', // Every 6 hours
  timeout: '5m',
  retries: 3,
  job: async () => {
    // Complex async work
  }
});
```

## Contributing

To contribute new hook examples:

1. Create hook in `examples/hooks/`
2. Add tests to `hooks-examples.test.mjs`
3. Update this README
4. Submit PR with:
   - Description of use case
   - Performance characteristics
   - Configuration requirements
   - Example output

## Resources

- [GitVan Documentation](../../README.md)
- [Husky Documentation](https://typicode.github.io/husky/)
- [Bree Documentation](https://github.com/breejs/bree)
- [@unrdf/hooks Documentation](../../vendor/unrdf/packages/hooks/README.md)
- [Conventional Commits](https://www.conventionalcommits.org/)

## License

Apache-2.0 - See [LICENSE](../../LICENSE) for details.

---

**Questions?** Open an issue or check the GitVan documentation.

**Need help?** The examples include extensive inline comments and documentation.
