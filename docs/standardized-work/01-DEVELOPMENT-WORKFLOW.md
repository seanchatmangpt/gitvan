# Procedure 01: Development Workflow

## Purpose
Ensure consistent, high-quality code contributions through a standardized development process that minimizes errors and maximizes collaboration.

## Scope
Covers the complete development cycle from cloning the repository to merging code into the main branch.

## Frequency
Daily - every code contribution follows this workflow

## Responsible Party
**Primary**: All developers
**Secondary**: Code reviewers, Team lead

## Prerequisites
- Git installed (v2.30+)
- Node.js 18+ installed
- GitHub account with repository access
- Development environment set up
- SSH keys configured for GitHub

## Step-by-Step Instructions

### Phase 1: Environment Setup (First Time Only)

**Step 1.1: Clone Repository**
```bash
cd ~/workspace
git clone git@github.com:your-org/gitvan.git
cd gitvan
```
**Expected Outcome**: Repository cloned to local machine
**Verification**: `ls -la` shows `.git` directory

**Step 1.2: Install Dependencies**
```bash
npm install
```
**Expected Outcome**: All dependencies installed without errors
**Verification**: `node_modules/` directory exists with 300+ packages

**Step 1.3: Verify Environment**
```bash
npm test
npm run build
```
**Expected Outcome**: All tests pass, build succeeds
**Verification**: See "Tests Passed" message, `dist/` directory created

**Step 1.4: Configure Git**
```bash
git config user.name "Your Name"
git config user.email "your.email@company.com"
git config core.autocrlf input
git config pull.rebase true
```
**Expected Outcome**: Git configured for team standards
**Verification**: `git config --list` shows your settings

### Phase 2: Start New Work

**Step 2.1: Update Local Repository**
```bash
git checkout main
git pull origin main
```
**Expected Outcome**: Local main branch is up to date
**Verification**: See "Already up to date" or commit messages

**Step 2.2: Create Feature Branch**
```bash
# Format: feature/descriptive-name or fix/issue-number
git checkout -b feature/add-new-composable
```
**Expected Outcome**: New branch created and checked out
**Verification**: `git branch --show-current` shows your branch name

**Step 2.3: Verify Clean State**
```bash
git status
```
**Expected Outcome**: "nothing to commit, working tree clean"
**Verification**: No uncommitted changes shown

### Phase 3: Development (TDD - Test Driven Development)

**Step 3.1: Write Test First**
```bash
# Create test file first
touch tests/composables/my-feature.test.mjs
```
**Expected Outcome**: Test file created
**Verification**: File exists in tests/ directory

**Step 3.2: Write Failing Test**
```javascript
// tests/composables/my-feature.test.mjs
import { describe, it, expect } from "vitest";
import { useMyFeature } from "@/composables/my-feature.mjs";

describe("useMyFeature", () => {
  it("should do something", () => {
    const feature = useMyFeature();
    expect(feature.doSomething()).toBe(true);
  });
});
```
**Expected Outcome**: Test defined but fails
**Verification**: `npm test my-feature.test.mjs` shows failure

**Step 3.3: Implement Feature**
```bash
# Create implementation file
touch src/composables/my-feature.mjs
```
**Expected Outcome**: Implementation file created
**Verification**: File exists in src/ directory

**Step 3.4: Write Minimal Code to Pass Test**
```javascript
// src/composables/my-feature.mjs
import { useGitVan } from "../core/context.mjs";

export function useMyFeature() {
  const { repo, config } = useGitVan();

  return {
    doSomething() {
      return true;
    }
  };
}
```
**Expected Outcome**: Test passes
**Verification**: `npm test my-feature.test.mjs` shows success

**Step 3.5: Refactor and Add More Tests**
```bash
npm test my-feature.test.mjs -- --watch
```
**Expected Outcome**: Tests run in watch mode, all pass
**Verification**: See green checkmarks for all tests

### Phase 4: Code Quality

**Step 4.1: Run Linter**
```bash
npm run lint
```
**Expected Outcome**: No linting errors
**Verification**: See "✓ 0 problems"

**Step 4.2: Fix Linting Issues**
```bash
npm run lint:fix
```
**Expected Outcome**: Auto-fixable issues resolved
**Verification**: `npm run lint` shows 0 problems

**Step 4.3: Format Code**
```bash
npm run format
```
**Expected Outcome**: All files formatted consistently
**Verification**: `npm run format:check` shows no changes needed

**Step 4.4: Run Full Test Suite**
```bash
npm test
```
**Expected Outcome**: All tests pass (not just your new ones)
**Verification**: See "Tests passed" with 0 failures

**Step 4.5: Check Coverage**
```bash
npm run test:coverage
```
**Expected Outcome**: Coverage ≥ 80% for all metrics
**Verification**: Coverage report shows:
- Branches: ≥ 80%
- Functions: ≥ 80%
- Lines: ≥ 80%
- Statements: ≥ 80%

### Phase 5: Commit Changes

**Step 5.1: Review Changes**
```bash
git status
git diff
```
**Expected Outcome**: Only intended files changed
**Verification**: Review diff output for accuracy

**Step 5.2: Stage Changes**
```bash
git add src/composables/my-feature.mjs
git add tests/composables/my-feature.test.mjs
```
**Expected Outcome**: Files staged for commit
**Verification**: `git status` shows files in "Changes to be committed"

**Step 5.3: Write Commit Message**
```bash
git commit -m "feat: add useMyFeature composable

- Implements new feature composable
- Adds comprehensive test coverage
- Follows unctx context pattern
- Updates exports in index file

Relates to #123"
```
**Expected Outcome**: Commit created with descriptive message
**Verification**: `git log -1` shows your commit

**Commit Message Format**:
```
<type>: <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, no logic change)
- `refactor`: Code restructuring (no feature/fix)
- `test`: Adding/updating tests
- `chore`: Build process, dependencies, etc.

### Phase 6: Push and Create PR

**Step 6.1: Push Branch**
```bash
git push -u origin feature/add-new-composable
```
**Expected Outcome**: Branch pushed to remote
**Verification**: See "Branch 'feature/add-new-composable' set up to track remote branch"

**Step 6.2: Create Pull Request**
```bash
# Use GitHub CLI (recommended)
gh pr create --title "feat: add useMyFeature composable" --body "$(cat <<'EOF'
## Summary
- Adds new useMyFeature composable
- Provides [specific functionality]
- Follows established patterns

## Changes
- New composable: src/composables/my-feature.mjs
- Tests: tests/composables/my-feature.test.mjs
- Coverage: 95% (above 80% threshold)

## Testing
- [x] Unit tests pass
- [x] Integration tests pass
- [x] Linting passes
- [x] Coverage ≥ 80%
- [x] Manual testing completed

## Checklist
- [x] Tests written before implementation (TDD)
- [x] Code follows style guide
- [x] Documentation updated
- [x] No breaking changes
- [x] Backward compatible

Closes #123
EOF
)"
```
**Expected Outcome**: PR created on GitHub
**Verification**: PR URL returned, visible on GitHub

**Step 6.3: Request Review**
```bash
gh pr review --request @reviewer-username
```
**Expected Outcome**: Review requested
**Verification**: Reviewer notified

### Phase 7: Code Review Process

**Step 7.1: Address Review Comments**
- Review feedback from teammates
- Make requested changes
- Add commits to same branch
- Push changes

**Step 7.2: Update PR**
```bash
# Make changes based on feedback
git add .
git commit -m "fix: address review feedback

- Updated error handling
- Added edge case tests
- Improved documentation"
git push
```
**Expected Outcome**: PR updated automatically
**Verification**: New commits visible in PR

**Step 7.3: Wait for Approval**
**Expected Outcome**: PR approved by required reviewers
**Verification**: Green checkmark on PR, "Approved" status

### Phase 8: Merge to Main

**Step 8.1: Ensure CI Passes**
**Expected Outcome**: All CI checks pass (tests, linting, build)
**Verification**: Green checkmarks on all CI jobs

**Step 8.2: Rebase if Needed**
```bash
git checkout main
git pull origin main
git checkout feature/add-new-composable
git rebase main
git push --force-with-lease
```
**Expected Outcome**: Branch rebased on latest main
**Verification**: PR shows "This branch has no conflicts with main"

**Step 8.3: Merge PR**
```bash
# Use squash merge (preferred)
gh pr merge --squash --delete-branch
```
**Expected Outcome**: PR merged, branch deleted
**Verification**: PR shows "Merged" status, branch deleted from remote

**Step 8.4: Update Local Repository**
```bash
git checkout main
git pull origin main
git branch -d feature/add-new-composable
```
**Expected Outcome**: Local main updated, feature branch deleted
**Verification**: `git branch` doesn't show feature branch

## Success Criteria

- [ ] All tests pass (100%)
- [ ] Code coverage ≥ 80% (all metrics)
- [ ] Linting passes with 0 errors
- [ ] Build succeeds without warnings
- [ ] PR approved by ≥ 1 reviewer
- [ ] All CI checks pass
- [ ] No merge conflicts
- [ ] Branch deleted after merge
- [ ] Local main branch updated

## Troubleshooting

### Issue: Tests Fail After Pulling Main
**Cause**: Dependencies or code changed
**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
npm test
```

### Issue: Merge Conflicts
**Cause**: Same files modified in main and your branch
**Solution**:
```bash
git checkout main
git pull origin main
git checkout your-branch
git rebase main
# Resolve conflicts in editor
git add .
git rebase --continue
git push --force-with-lease
```

### Issue: Linting Errors
**Cause**: Code doesn't follow style guide
**Solution**:
```bash
npm run lint:fix
# Manual fixes for remaining issues
npm run lint
```

### Issue: Low Coverage
**Cause**: Insufficient tests
**Solution**:
```bash
npm run test:coverage
# Review coverage report in coverage/index.html
# Add tests for uncovered lines/branches
```

### Issue: Build Fails
**Cause**: Syntax errors or missing dependencies
**Solution**:
```bash
npm run build 2>&1 | less
# Review error messages
# Fix syntax errors
# Add missing imports
npm run build
```

### Issue: Context Lost Error
**Cause**: Not using `withGitVan()` wrapper
**Solution**:
```javascript
// ✗ WRONG
const git = useGit();
await someAsyncCall();
await git.commit(); // Context lost!

// ✓ CORRECT
await withGitVan(context, async () => {
  const git = useGit();
  await someAsyncCall();
  await git.commit(); // Context preserved!
});
```

## References
- [CLAUDE.md](/home/user/gitvan/CLAUDE.md) - Complete development guide
- [Testing Procedure](02-TESTING-PROCEDURE.md) - Detailed testing process
- [Code Review Checklist](BONUS-CODE-REVIEW.md) - What reviewers check
- [Troubleshooting Guide](TROUBLESHOOTING-GUIDE.md) - Common issues

## Training Requirements

**Who Needs This Training**: All developers

**Training Duration**: 2 hours

**Training Method**:
1. Read this procedure (30 min)
2. Watch recorded walkthrough (30 min)
3. Pair with experienced developer (1 hour)
4. Complete first PR with supervision

**Competency Check**:
- [ ] Can clone and set up repository
- [ ] Can create feature branch
- [ ] Can write tests before code (TDD)
- [ ] Can run linting and formatting
- [ ] Can commit with proper messages
- [ ] Can create and manage PR
- [ ] Can handle merge conflicts
- [ ] Can clean up after merge

## Related Procedures
- [02-TESTING-PROCEDURE.md](02-TESTING-PROCEDURE.md)
- [03-BUILD-PROCEDURE.md](03-BUILD-PROCEDURE.md)
- [BONUS-CODE-REVIEW.md](BONUS-CODE-REVIEW.md)

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-01-08 | 1.0 | Initial creation | GitVan Team |

## Approval

**Approved By**: Team Lead
**Date**: 2026-01-08
**Next Review**: 2026-04-08 (Quarterly)

---

**Remember**: TDD (Test-Driven Development) is not optional. Write tests first, then code to make them pass.
