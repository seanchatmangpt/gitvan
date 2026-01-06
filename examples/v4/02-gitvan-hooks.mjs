/**
 * GitVan V4 Example: GitVan-Specific Hooks
 *
 * Demonstrates useGit, useJob, useTemplate, useWorkflow hooks.
 */

import {
  initGitVan,
  runInContextAsync,
  useGit,
  useJob,
  useTemplate,
  useWorkflow,
  useErrorBoundary,
  signal,
  effect,
} from '../../src/v4/index.ts';

console.log('=== GitVan V4: GitVan Hooks Example ===\n');

// ============================================================================
// Initialize GitVan
// ============================================================================

const { context, cleanup } = await initGitVan({
  root: process.cwd(),
  config: {
    logging: { level: 'info' },
  },
});

// ============================================================================
// 1. useGit() - Git Operations
// ============================================================================

console.log('1. Git Operations with useGit():');

await runInContextAsync(context, async () => {
  const git = useGit();

  console.log('Repository root:', git.root);
  console.log('Current branch:', git.branch);
  console.log('Current HEAD:', git.head);
  console.log('Has uncommitted changes:', git.isDirty);
  console.log('Loading state:', git.isLoading);

  // Listen for commit events
  git.onCommit((commit) => {
    console.log('New commit detected:', commit.hash, commit.message);
  });

  // Listen for branch changes
  git.onBranchChange((change) => {
    console.log('Branch changed from', change.from, 'to', change.to);
  });

  // Refresh git state
  await git.refresh();
  console.log('State refreshed');
});

console.log();

// ============================================================================
// 2. useJob() - Job Execution
// ============================================================================

console.log('2. Job Execution with useJob():');

await runInContextAsync(context, async () => {
  const { run, state, cancel, onProgress } = useJob();

  // Create a mock job
  const testJob = {
    meta: {
      name: 'test-job',
      desc: 'A test job',
    },
    async run(ctx) {
      console.log('Job running in context:', ctx.cwd);
      return { success: true, data: 'Job completed' };
    },
  };

  // Listen for progress
  onProgress((event) => {
    console.log('Job progress:', event.progress);
  });

  // Execute job
  console.log('Starting job...');
  const result = await run(testJob);

  console.log('Job state:');
  console.log('  - Running:', state.isRunning);
  console.log('  - Result:', state.result);
  console.log('  - Error:', state.error);
});

console.log();

// ============================================================================
// 3. useTemplate() - Template Rendering
// ============================================================================

console.log('3. Template Rendering with useTemplate():');

await runInContextAsync(context, async () => {
  const template = useTemplate();

  // Render inline template
  const html = template.render(
    '<h1>{{ title }}</h1><p>{{ description }}</p>',
    {
      title: 'GitVan V4',
      description: 'Modern hooks-based reactive API',
    }
  );

  console.log('Rendered HTML:');
  console.log(html);

  console.log('\nTemplate state:');
  console.log('  - Loading:', template.isLoading);
  console.log('  - Error:', template.error);
});

console.log();

// ============================================================================
// 4. useWorkflow() - Workflow Execution
// ============================================================================

console.log('4. Workflow Execution with useWorkflow():');

await runInContextAsync(context, async () => {
  // Define workflow steps
  const steps = [
    {
      id: 'validate',
      name: 'Validate Input',
      async handler(context) {
        console.log('Step 1: Validating...');
        return { valid: true };
      },
    },
    {
      id: 'process',
      name: 'Process Data',
      async handler(context) {
        console.log('Step 2: Processing...');
        const validateResult = context.previousResults.get('validate');
        return { processed: validateResult.valid };
      },
    },
    {
      id: 'complete',
      name: 'Complete',
      async handler(context) {
        console.log('Step 3: Completing...');
        const processResult = context.previousResults.get('process');
        return { done: processResult.processed };
      },
    },
  ];

  const workflow = useWorkflow(steps);

  console.log('Starting workflow...');
  const results = await workflow.run();

  console.log('\nWorkflow completed!');
  console.log('Results:', Object.fromEntries(results));
  console.log('\nWorkflow state:');
  console.log('  - Running:', workflow.state.isRunning);
  console.log('  - Current step:', workflow.state.currentStep);
  console.log('  - Completed steps:', workflow.state.completedSteps);
  console.log('  - Errors:', workflow.state.errors.size);
});

console.log();

// ============================================================================
// 5. Error Boundaries
// ============================================================================

console.log('5. Error Boundaries:');

await runInContextAsync(context, async () => {
  const { wrap, state, retry } = useErrorBoundary({
    maxRetries: 3,
    retryDelay: 100,
    onError: (err) => {
      console.log('Error caught:', err.message);
    },
  });

  // Simulate a failing operation
  let attemptCount = 0;

  const result = await wrap(async () => {
    attemptCount++;
    console.log(`Attempt ${attemptCount}...`);

    if (attemptCount < 3) {
      throw new Error('Temporary failure');
    }

    return 'Success!';
  });

  console.log('Final result:', result);
  console.log('Total attempts:', attemptCount);
  console.log('Error state:');
  console.log('  - Has error:', state.hasError);
  console.log('  - Retry count:', state.retryCount);
  console.log('  - Is retrying:', state.isRetrying);
});

console.log();

// ============================================================================
// 6. Reactive Git Watching
// ============================================================================

console.log('6. Reactive Git Watching:');

await runInContextAsync(context, async () => {
  const git = useGit();

  // Watch for repository changes
  effect(() => {
    if (git.isDirty) {
      console.log('⚠️  Repository has uncommitted changes');
    } else {
      console.log('✓ Repository is clean');
    }
  });

  console.log('Initial state checked');

  // Simulate refresh (in real usage, this might be on an interval)
  await git.refresh();
  console.log('State refreshed');
});

console.log();

// ============================================================================
// 7. Composing Hooks
// ============================================================================

console.log('7. Composing Hooks:');

await runInContextAsync(context, async () => {
  // Create a custom hook that combines multiple hooks
  function useGitStatus() {
    const git = useGit();
    const { wrap } = useErrorBoundary();

    const commitIfDirty = async (message) => {
      return wrap(async () => {
        if (git.isDirty) {
          await git.run(['commit', '-m', message]);
          console.log('✓ Changes committed');
        } else {
          console.log('✓ No changes to commit');
        }
      });
    };

    return {
      branch: git.branch,
      isDirty: git.isDirty,
      commitIfDirty,
    };
  }

  const gitStatus = useGitStatus();

  console.log('Current branch:', gitStatus.branch);
  console.log('Has changes:', gitStatus.isDirty);

  // Would commit if dirty
  // await gitStatus.commitIfDirty('Auto-commit');
});

console.log();

// ============================================================================
// Cleanup
// ============================================================================

await cleanup();

console.log('=== Summary ===');
console.log('✓ useGit() provides reactive Git operations');
console.log('✓ useJob() manages job execution with state tracking');
console.log('✓ useTemplate() handles template rendering');
console.log('✓ useWorkflow() executes multi-step workflows');
console.log('✓ useErrorBoundary() provides robust error handling');
console.log('✓ Hooks can be composed for complex functionality');
console.log('✓ All hooks integrate seamlessly with reactivity system');
