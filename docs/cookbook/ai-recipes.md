# AI-Powered Development Recipes

This cookbook contains AI-powered automation recipes using GitVan v2's built-in AI capabilities and external AI integrations.

## Recipe 1: Automated Changelog Generation

### Use Case
Automatically generate professional changelogs from commit messages using AI to categorize and format changes.

### Configuration
```javascript
// .gitvan/hooks/changelog.mjs
export default {
  name: 'ai-changelog',
  triggers: ['tag:created'],
  action: async ({ git, ai, logger }) => {
    const lastTag = await git.getLastTag();
    const commits = await git.getCommitsSince(lastTag);

    const changelog = await ai.prompt(`
      Analyze these commits and create a changelog:
      ${commits.map(c => `- ${c.message}`).join('\n')}

      Format as:
      ## Features
      ## Bug Fixes
      ## Breaking Changes
      ## Dependencies
    `);

    await git.writeFile('CHANGELOG.md', changelog);
    logger.info('Changelog updated automatically');
  }
};
```

### Usage
```bash
# Create a new tag to trigger changelog generation
git tag v1.2.0
gitvan push --with-tags

# Or manually trigger
gitvan hook run ai-changelog
```

### Expected Results
- Professional changelog in CHANGELOG.md
- Commits categorized by type (features, fixes, etc.)
- Clear, user-friendly descriptions
- Automatic formatting and organization

---

## Recipe 2: Release Notes from Commits

### Use Case
Generate detailed release notes that explain the impact of changes to users and developers.

### Configuration
```javascript
// .gitvan/hooks/release-notes.mjs
export default {
  name: 'release-notes',
  triggers: ['pre-release'],
  action: async ({ git, ai, config }) => {
    const version = config.get('release.version');
    const commits = await git.getCommitsSinceLastRelease();

    const releaseNotes = await ai.prompt(`
      Create release notes for version ${version} from these commits:
      ${commits.map(c => `${c.hash}: ${c.message}`).join('\n')}

      Include:
      - What's New section for users
      - Developer Changes section
      - Migration guide if needed
      - Known issues

      Use friendly, accessible language.
    `);

    await git.writeFile(`releases/v${version}.md`, releaseNotes);

    // Also create GitHub release
    if (config.get('github.enabled')) {
      await git.createGitHubRelease(version, releaseNotes);
    }
  }
};
```

### Template Configuration
```yaml
# .gitvan/config.yaml
release:
  ai:
    model: 'gpt-4'
    temperature: 0.3
  github:
    enabled: true
    draft: false
```

### Expected Results
- Comprehensive release notes in releases/ directory
- Automatic GitHub release creation
- User-focused change descriptions
- Migration guidance when needed

---

## Recipe 3: PR Summary Generation

### Use Case
Automatically generate pull request descriptions that explain changes, impact, and testing requirements.

### Configuration
```javascript
// .gitvan/hooks/pr-summary.mjs
export default {
  name: 'pr-summary',
  triggers: ['branch:push'],
  condition: ({ branch }) => branch.startsWith('feature/') || branch.startsWith('fix/'),
  action: async ({ git, ai, github }) => {
    const diff = await git.getDiffAgainstMain();
    const commits = await git.getCommitsOnBranch();

    const summary = await ai.prompt(`
      Generate a PR description for these changes:

      Commits:
      ${commits.map(c => `- ${c.message}`).join('\n')}

      Key file changes:
      ${diff.files.map(f => `- ${f.path}: ${f.changes} changes`).join('\n')}

      Include:
      ## What Changed
      ## Why
      ## Testing
      ## Breaking Changes (if any)
      ## Screenshots (if UI changes)
    `);

    // Create draft PR
    const pr = await github.createPullRequest({
      title: git.getCurrentBranch().replace(/^(feature|fix)\//, '').replace(/-/g, ' '),
      body: summary,
      draft: true
    });

    console.log(`Draft PR created: ${pr.url}`);
  }
};
```

### Expected Results
- Automatic draft PR creation
- Comprehensive change descriptions
- Testing guidance included
- Breaking changes highlighted

---

## Recipe 4: Daily Development Diary

### Use Case
Automatically generate daily summaries of development work for team updates and personal tracking.

### Configuration
```javascript
// .gitvan/hooks/daily-diary.mjs
export default {
  name: 'daily-diary',
  schedule: '0 18 * * 1-5', // 6 PM weekdays
  action: async ({ git, ai, config }) => {
    const today = new Date().toISOString().split('T')[0];
    const commits = await git.getCommitsToday();
    const branches = await git.getBranchesWorkedOnToday();

    if (commits.length === 0) return;

    const diary = await ai.prompt(`
      Create a daily development summary for ${today}:

      Commits made:
      ${commits.map(c => `- ${c.time}: ${c.message}`).join('\n')}

      Branches worked on: ${branches.join(', ')}

      Format as a brief, professional summary including:
      - Key accomplishments
      - Progress made
      - Challenges encountered
      - Next steps
    `);

    const diaryPath = `diary/${today}.md`;
    await git.writeFile(diaryPath, diary);

    // Optional: Send to team chat
    if (config.get('diary.sendToSlack')) {
      await sendToSlack(diary);
    }
  }
};
```

### Configuration
```yaml
# .gitvan/config.yaml
diary:
  enabled: true
  sendToSlack: false
  slackChannel: '#dev-updates'
```

### Expected Results
- Daily summary in diary/ directory
- Professional format for sharing
- Automatic scheduling
- Optional team notifications

---

## Recipe 5: Code Review Assistance

### Use Case
AI-powered code review that provides feedback on code quality, potential issues, and suggestions.

### Configuration
```javascript
// .gitvan/hooks/code-review.mjs
export default {
  name: 'ai-code-review',
  triggers: ['pr:created', 'pr:updated'],
  action: async ({ git, ai, github, pr }) => {
    const diff = await git.getPRDiff(pr.number);
    const largeFiles = diff.files.filter(f => f.changes > 100);

    // Review large files only to avoid token limits
    for (const file of largeFiles) {
      const review = await ai.prompt(`
        Review this code change for:
        - Code quality and best practices
        - Potential bugs or issues
        - Performance considerations
        - Security concerns
        - Maintainability

        File: ${file.path}
        Changes:
        ${file.patch}

        Provide specific, actionable feedback.
      `);

      if (review.includes('ISSUE:') || review.includes('WARNING:')) {
        await github.addPRComment(pr.number, {
          path: file.path,
          body: `🤖 **AI Code Review**\n\n${review}`,
          line: file.changedLines[0]
        });
      }
    }

    // Overall PR review
    const overallReview = await ai.prompt(`
      Provide an overall assessment of this PR:
      - Architecture decisions
      - Test coverage
      - Documentation needs
      - Deployment considerations

      Files changed: ${diff.files.length}
      Total changes: ${diff.totalChanges}
    `);

    await github.addPRReview(pr.number, {
      event: 'COMMENT',
      body: `🤖 **AI PR Review**\n\n${overallReview}`
    });
  }
};
```

### Expected Results
- Automated code quality feedback
- Security and performance warnings
- Architecture guidance
- Test coverage suggestions

---

## Recipe 6: Intelligent Commit Message Suggestions

### Use Case
AI-powered commit message suggestions based on file changes and patterns.

### Configuration
```javascript
// .gitvan/hooks/commit-assist.mjs
export default {
  name: 'commit-assist',
  triggers: ['pre-commit'],
  action: async ({ git, ai }) => {
    const staged = await git.getStagedChanges();
    const diff = await git.getStagedDiff();

    const suggestion = await ai.prompt(`
      Suggest a commit message for these changes:

      Files modified:
      ${staged.map(f => `- ${f.path} (${f.type})`).join('\n')}

      Key changes:
      ${diff.summary}

      Follow conventional commit format:
      type(scope): description

      Types: feat, fix, docs, style, refactor, test, chore
    `);

    console.log(`\n🤖 Suggested commit message:`);
    console.log(`   ${suggestion.trim()}`);
    console.log(`\nUse: git commit -m "${suggestion.trim()}"`);
  }
};
```

### Expected Results
- Smart commit message suggestions
- Conventional commit format
- Context-aware descriptions
- Consistent messaging patterns

---

## Advanced AI Integration

### Custom AI Models
```javascript
// .gitvan/ai/custom-model.mjs
export const customAI = {
  model: 'claude-3-sonnet',
  apiKey: process.env.ANTHROPIC_API_KEY,
  prompts: {
    changelog: './prompts/changelog.txt',
    review: './prompts/code-review.txt'
  }
};
```

### Prompt Templates
```text
# prompts/changelog.txt
You are a technical writer creating a changelog for developers.

Analyze the following commits and create a well-structured changelog:

{commits}

Rules:
- Group by type (Features, Bug Fixes, etc.)
- Use action verbs (Add, Fix, Update)
- Include breaking changes prominently
- Keep descriptions concise but informative
```

### Error Handling
```javascript
// Add to any AI hook
try {
  const result = await ai.prompt(prompt);
  return result;
} catch (error) {
  logger.warn('AI service unavailable, falling back to manual process');
  return null;
}
```

## Best Practices

1. **Token Management**: Limit input size for large diffs
2. **Fallback Plans**: Always have manual alternatives
3. **Rate Limiting**: Respect AI service limits
4. **Cost Control**: Monitor API usage
5. **Privacy**: Avoid sending sensitive data to external AI
6. **Quality Control**: Review AI outputs before committing

## Troubleshooting

### Common Issues
- **API Rate Limits**: Implement exponential backoff
- **Large Diffs**: Split into smaller chunks
- **Poor Quality**: Improve prompts with examples
- **Cost Overruns**: Set usage limits and monitoring

### Debugging
```bash
# Test AI hooks in isolation
gitvan hook test ai-changelog --verbose

# Check AI service status
gitvan ai status

# View AI usage metrics
gitvan ai usage --last-30-days
```