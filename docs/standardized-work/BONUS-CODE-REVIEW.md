# Procedure: Code Review (Bonus)

## Purpose
Ensure code quality, security, and knowledge sharing through structured peer review before merging changes to the main branch.

## Scope
All code changes submitted via pull requests, from small bug fixes to large feature additions.

## Frequency
Every pull request (daily occurrence for active development)

## Responsible Party
**Primary**: Code reviewer (assigned developer)
**Secondary**: Code author, Team lead

## Prerequisites
- Pull request created with clear description
- All CI checks passing
- Self-review completed by author
- Tests included and passing
- Documentation updated

## Code Review Principles

### The Three C's of Code Review
1. **Constructive**: Focus on improving the code, not criticizing the person
2. **Collaborative**: Work together to find the best solution
3. **Consistent**: Apply the same standards to all reviews

### Blameless Culture
- Review the code, not the person
- Ask questions, don't make demands
- Assume good intent
- Focus on learning and improvement

---

## Step-by-Step Instructions

### Phase 1: Author Preparation

**Step 1.1: Self-Review**
```markdown
Before requesting review, author should:

□ Re-read all changed code
□ Check for debug statements/console.logs
□ Verify tests pass locally
□ Run linting and formatting
□ Update documentation
□ Write clear PR description
```

**Step 1.2: Create Quality PR Description**
```markdown
## Summary
[What does this PR do? Why is it needed?]

## Changes
- [Specific change 1]
- [Specific change 2]
- [Specific change 3]

## Type of Change
- [ ] Bug fix (non-breaking)
- [ ] New feature (non-breaking)
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Coverage ≥ 80%

## Screenshots (if applicable)
[Add before/after screenshots for UI changes]

## Checklist
- [ ] Code follows style guide
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Dependent changes merged

Closes #123
```

### Phase 2: Reviewer Assignment

**Step 2.1: Choose Appropriate Reviewer(s)**
```bash
# Assign reviewer based on:
# - Code ownership (owns the modified area)
# - Expertise (knows the technology/domain)
# - Availability (not overloaded with reviews)
# - Learning opportunity (junior devs reviewing senior code)

# For critical changes, assign 2+ reviewers

gh pr review --request @senior-dev
```

**Step 2.2: Reviewer Acknowledges**
```markdown
# Reviewer responds within 4 hours (same business day)
# Comment: "I'll review this by [time]"

# If can't review in reasonable time:
# - Reassign to another reviewer
# - Comment on why and when you can review
```

### Phase 3: Code Review Process

**Step 3.1: High-Level Review (5 minutes)**
```markdown
# Before diving into details, ask:

1. Does this PR have a clear purpose?
2. Is the approach reasonable?
3. Is it appropriately sized? (< 400 lines preferred)
4. Are tests included?
5. Is documentation updated?

# If major issues, stop here and request clarification
```

**Step 3.2: Detailed Code Review (15-30 minutes)**

**Functionality Review**
```markdown
□ Does the code do what it's supposed to do?
□ Are requirements met?
□ Are edge cases handled?
□ Are error scenarios covered?
□ Is business logic correct?
```

**Security Review**
```markdown
□ No hardcoded secrets
□ Input validation present
□ Output encoding (prevent XSS)
□ SQL injection prevention (parameterized queries)
□ Authentication/authorization checks
□ No sensitive data in logs
□ Rate limiting (if applicable)
```

**Code Quality Review**
```markdown
□ Follows SOLID principles
□ DRY (Don't Repeat Yourself)
□ KISS (Keep It Simple, Stupid)
□ Clear and consistent naming
□ Appropriate abstractions
□ Functions are focused (single responsibility)
□ Code is readable
```

**Performance Review**
```markdown
□ No obvious performance issues
□ Database queries optimized
□ Appropriate use of async/await
□ No memory leaks
□ Caching considered where appropriate
```

**Testing Review**
```markdown
□ Tests included
□ Tests are meaningful
□ Coverage ≥ 80%
□ Tests follow TDD
□ Edge cases tested
□ Error cases tested
□ No brittle tests (flaky)
```

**Documentation Review**
```markdown
□ README updated (if needed)
□ API docs updated
□ Comments added (only where needed)
□ CHANGELOG updated
□ Complex logic explained
```

**Git History Review**
```markdown
□ Commit messages clear
□ Commits are atomic
□ No unnecessary files committed
□ Branch name appropriate
```

**Step 3.3: Leave Constructive Comments**

**Good Comment Examples:**
```markdown
✓ "Consider extracting this into a separate function for better reusability"
✓ "This could be more efficient using Promise.all() for parallel execution"
✓ "Great error handling! One suggestion: could we make the error message more specific?"
✓ "This is clever, but might be hard to understand. Could we add a comment explaining the algorithm?"
✓ "I like the approach. Have you considered the case where X is null?"
```

**Poor Comment Examples:**
```markdown
✗ "This is wrong"
✗ "Why did you do it this way?"
✗ "This makes no sense"
✗ "Obviously this won't work"
✗ "Bad code"
```

**Comment Tags:**
```markdown
**[BLOCKING]**: Must be fixed before merge
**[SUGGESTION]**: Nice to have, not required
**[QUESTION]**: Seeking clarification
**[PRAISE]**: Acknowledging good work
**[NIT]**: Nitpick, very minor style issue
```

**Step 3.4: Provide Overall Assessment**
```markdown
# Three possible outcomes:

1. **APPROVE**: Code is ready to merge
   Comment: "LGTM! 🚀 Nice work on the error handling."

2. **REQUEST CHANGES**: Issues must be addressed
   Comment: "Great start! A few things to address before merge: [list]"

3. **COMMENT**: Feedback without approval/blocking
   Comment: "Some suggestions for improvement, but not blocking merge."
```

### Phase 4: Author Response

**Step 4.1: Respond to All Comments**
```markdown
# For each comment, author should:

1. **Agree and fix**:
   "Good catch! Fixed in commit abc123"

2. **Agree but defer**:
   "Great idea. Created issue #456 to address separately"

3. **Disagree respectfully**:
   "I considered that, but chose this approach because [reason]. What do you think?"

4. **Ask for clarification**:
   "Can you explain what you mean by [unclear point]?"
```

**Step 4.2: Make Requested Changes**
```bash
# Make changes based on feedback
git add .
git commit -m "fix: address code review feedback

- Extracted function for reusability
- Added error handling for null case
- Improved variable naming
- Added test for edge case"

git push
```

**Step 4.3: Request Re-Review**
```bash
# After making changes, request re-review
gh pr review --request @reviewer

# Add comment
# "Changes made! @reviewer please re-review when you have a chance"
```

### Phase 5: Final Approval and Merge

**Step 5.1: Verify All Feedback Addressed**
```markdown
□ All blocking comments resolved
□ All questions answered
□ Suggestions considered (implemented or deferred)
□ Re-review completed if requested
□ All reviewers approved
□ CI checks passing
```

**Step 5.2: Merge Pull Request**
```bash
# Preferred: Squash merge (clean history)
gh pr merge --squash --delete-branch

# Alternative: Merge commit (preserve history)
gh pr merge --merge --delete-branch

# Rebase merge (linear history)
gh pr merge --rebase --delete-branch
```

**Step 5.3: Post-Merge Actions**
```bash
# Author:
# - Verify deployment (if auto-deploy)
# - Close related issues
# - Update documentation (if needed)
# - Notify stakeholders (if needed)

# Reviewer:
# - Monitor for issues
# - Follow up if problems arise
```

---

## Code Review Checklist

### Functionality
- [ ] Code does what it's supposed to do
- [ ] Requirements met
- [ ] Edge cases handled
- [ ] Error scenarios covered

### Security
- [ ] No secrets committed
- [ ] Input validation
- [ ] Output encoding
- [ ] Authentication/authorization
- [ ] No SQL injection vulnerabilities

### Code Quality
- [ ] Readable and maintainable
- [ ] Clear naming
- [ ] Appropriate abstractions
- [ ] No duplication
- [ ] Functions are focused

### Performance
- [ ] No obvious bottlenecks
- [ ] Queries optimized
- [ ] Appropriate async usage
- [ ] No memory leaks

### Testing
- [ ] Tests included
- [ ] Coverage ≥ 80%
- [ ] Tests are meaningful
- [ ] Edge cases tested

### Documentation
- [ ] README updated
- [ ] API docs updated
- [ ] CHANGELOG updated
- [ ] Complex code commented

### Git
- [ ] Commit messages clear
- [ ] Commits atomic
- [ ] Branch name appropriate
- [ ] No unnecessary files

---

## Review Time Expectations

| PR Size | Expected Review Time | Notes |
|---------|---------------------|-------|
| Tiny (< 50 lines) | 5 minutes | Quick fix, documentation |
| Small (50-200 lines) | 15 minutes | Bug fix, small feature |
| Medium (200-400 lines) | 30 minutes | Moderate feature |
| Large (400-800 lines) | 1 hour | Large feature, consider splitting |
| Huge (> 800 lines) | Request split | Too large for effective review |

**First response**: Within 4 hours (same business day)
**Final review**: Within 24 hours of request

---

## Review Guidelines by PR Type

### Bug Fix Review
```markdown
Focus on:
- Root cause addressed (not just symptom)
- Fix is minimal and targeted
- Tests prevent regression
- No new bugs introduced
```

### New Feature Review
```markdown
Focus on:
- Follows architecture patterns
- Appropriately abstracted
- Well-tested (≥ 80% coverage)
- Documentation complete
- Performance acceptable
```

### Refactoring Review
```markdown
Focus on:
- Behavior unchanged
- Tests still pass
- Complexity reduced
- Readability improved
- No premature optimization
```

### Documentation Review
```markdown
Focus on:
- Accurate and up-to-date
- Clear and concise
- Examples work
- Links valid
- Appropriate detail level
```

### Configuration Review
```markdown
Focus on:
- No secrets in code
- Backward compatible
- Tested in staging
- Rollback plan
- Documentation updated
```

---

## Handling Disagreements

### Step 1: Understand Perspectives
```markdown
# Reviewer and author should each explain:
- What is the concern?
- Why does it matter?
- What are the alternatives?
```

### Step 2: Find Common Ground
```markdown
# Look for:
- Shared goals
- Trade-offs acceptable to both
- Hybrid approaches
```

### Step 3: Escalate if Needed
```markdown
# If no agreement after discussion:
1. Bring in third developer for opinion
2. Consult team lead
3. Discuss in team meeting
4. Document decision for future reference
```

### Step 4: Move Forward
```markdown
# Once decided:
- Document the decision
- Update style guide if applicable
- No hard feelings
- Learn from the discussion
```

---

## Common Code Smells

### Structural Issues
```javascript
// ✗ Function too long (> 50 lines)
function doEverything() {
  // 200 lines of code
}

// ✓ Break into smaller functions
function doEverything() {
  doStepOne();
  doStepTwo();
  doStepThree();
}

// ✗ Too many parameters (> 4)
function process(a, b, c, d, e, f) { }

// ✓ Use object parameter
function process({ param1, param2, param3, options }) { }
```

### Naming Issues
```javascript
// ✗ Unclear naming
function proc(u) {
  return u.pts > 100 ? d(u) : 0;
}

// ✓ Clear naming
function calculateUserDiscount(user) {
  return user.points > 100
    ? applyDiscount(user)
    : 0;
}
```

### Duplication
```javascript
// ✗ Code duplication
function getUserName(id) {
  const user = db.query('SELECT * FROM users WHERE id = ?', id);
  return user.name;
}
function getUserEmail(id) {
  const user = db.query('SELECT * FROM users WHERE id = ?', id);
  return user.email;
}

// ✓ Extract common code
function getUser(id) {
  return db.query('SELECT * FROM users WHERE id = ?', id);
}
function getUserName(id) {
  return getUser(id).name;
}
```

### Error Handling
```javascript
// ✗ Swallowing errors
try {
  riskyOperation();
} catch (e) {
  // Silent failure
}

// ✓ Proper error handling
try {
  riskyOperation();
} catch (error) {
  logger.error('Operation failed:', error);
  throw new ApplicationError('Failed to complete operation', { cause: error });
}
```

---

## Success Criteria

- [ ] Review completed within expected timeframe
- [ ] All review checklist items considered
- [ ] Constructive feedback provided
- [ ] Author responded to all comments
- [ ] All blocking issues resolved
- [ ] Final approval given
- [ ] PR merged successfully
- [ ] No post-merge issues
- [ ] Knowledge shared

---

## Tips for Effective Reviews

### For Reviewers
1. **Start with positives**: Acknowledge good work
2. **Be specific**: Point to exact lines, explain why
3. **Suggest alternatives**: Don't just criticize
4. **Ask questions**: Seek to understand
5. **Prioritize feedback**: Blocking vs. suggestions
6. **Be timely**: Review within 4 hours
7. **Be thorough**: Check all aspects
8. **Be kind**: Constructive tone

### For Authors
1. **Small PRs**: Keep PRs focused and small
2. **Self-review**: Review your own code first
3. **Clear description**: Explain what and why
4. **Welcome feedback**: View reviews as learning
5. **Respond promptly**: Don't let reviews stall
6. **Explain decisions**: Help reviewers understand
7. **Be open**: Consider all feedback
8. **Say thanks**: Appreciate reviewer's time

---

## Metrics to Track

### Review Speed
- Time to first review
- Time to approval
- Number of review cycles

### Review Quality
- Bugs caught in review
- Post-merge issues
- Code quality improvements

### Review Distribution
- Reviews per developer
- Review load balance
- Backlog of pending reviews

---

## Training Requirements

**Who Needs This Training**: All developers

**Training Duration**: 1 hour

**Training Method**:
1. Read this procedure (20 min)
2. Shadow experienced reviewer (20 min)
3. Conduct review with supervision (20 min)

**Competency Check**:
- [ ] Can perform thorough review
- [ ] Provides constructive feedback
- [ ] Understands what to look for
- [ ] Responds appropriately to feedback
- [ ] Completes reviews in timely manner

---

## References
- [Development Workflow](01-DEVELOPMENT-WORKFLOW.md)
- [Testing Procedure](02-TESTING-PROCEDURE.md)
- [Security Procedures](08-SECURITY-PROCEDURES.md)
- [Google Code Review Developer Guide](https://google.github.io/eng-practices/review/)

---

**Remember**: Code review is a conversation, not a judgment. The goal is better code and a better team.

**Last Updated**: 2026-01-08
**Version**: 1.0
