# Procedure 09: Documentation Procedures

## Purpose
Maintain comprehensive, accurate, and accessible documentation that enables users and developers to effectively use and contribute to GitVan.

## Scope
User documentation, API documentation, developer guides, changelog maintenance, and documentation quality assurance.

## Frequency
- **Update with Code Changes**: Every PR
- **Documentation Review**: Weekly
- **Major Doc Updates**: Every release
- **Documentation Audit**: Quarterly
- **Link Validation**: Monthly

## Responsible Party
**Primary**: All developers (inline docs), Technical writer (user docs)
**Secondary**: Team lead, Product manager

## Documentation Types

### User Documentation
- Getting Started Guide
- Installation Instructions
- Configuration Reference
- User Guide
- Troubleshooting Guide
- FAQ

### Developer Documentation
- Architecture Overview (CLAUDE.md)
- API Reference
- Contributing Guide
- Development Setup
- Testing Guide
- Deployment Guide

### Code Documentation
- Inline comments (when needed)
- JSDoc/TSDoc
- README files
- Example code

## Step-by-Step Instructions

### Phase 1: Documentation Planning

**Step 1.1: Identify Documentation Needs**
```bash
# For new feature
# Questions to answer:
# - What does this feature do?
# - Who will use it?
# - How do they use it?
# - What can go wrong?
# - What are common questions?

# Create documentation ticket
gh issue create \
  --title "Docs: Document new useMyFeature composable" \
  --label documentation \
  --body "Document the new useMyFeature composable including usage examples and common patterns"
```
**Expected Outcome**: Documentation scope defined
**Verification**: Ticket created with clear requirements

**Step 1.2: Choose Documentation Type**
| Feature Type | Documentation Needed |
|--------------|---------------------|
| New API/Composable | API docs, examples, tests |
| New CLI Command | CLI help, user guide section |
| Configuration Option | Config reference, examples |
| Bug Fix | Update troubleshooting guide |
| Breaking Change | Migration guide, changelog |

**Expected Outcome**: Documentation type identified
**Verification**: Know what to write

### Phase 2: Writing Documentation

**Step 2.1: User Documentation Structure**
```markdown
# Feature Name

## Overview
[1-2 sentences describing what this does]

## Prerequisites
- What users need before using this feature

## Quick Start
\```bash
# Minimal example to get started
gitvan my-command --option value
\```

## Usage

### Basic Usage
[Simple example with explanation]

### Advanced Usage
[More complex examples]

### Options
| Option | Description | Default | Required |
|--------|-------------|---------|----------|
| --option | What it does | default | No |

## Examples

### Example 1: Common Use Case
[Real-world example with explanation]

### Example 2: Advanced Pattern
[More complex real-world example]

## Troubleshooting

### Issue: Common Problem
**Cause**: Why this happens
**Solution**: How to fix it

## See Also
- [Related Feature](link)
- [API Reference](link)
```
**Expected Outcome**: Structured documentation
**Verification**: Follows template

**Step 2.2: API Documentation**
```javascript
/**
 * Manages Git operations for GitVan workflows.
 *
 * @example
 * ```javascript
 * import { withGitVan, useGit } from 'gitvan';
 *
 * await withGitVan(context, async () => {
 *   const git = useGit();
 *   const status = await git.status();
 *   console.log(status.branch);
 * });
 * ```
 *
 * @returns {Object} Git operations interface
 * @returns {Function} returns.status - Get repository status
 * @returns {Function} returns.commit - Create a commit
 * @returns {Function} returns.push - Push to remote
 */
export function useGit() {
  const { repo, config } = useGitVan();

  return {
    /**
     * Get repository status
     *
     * @returns {Promise<Object>} Repository status
     * @returns {string} returns.branch - Current branch name
     * @returns {Array} returns.files - Modified files
     * @example
     * ```javascript
     * const status = await git.status();
     * console.log(status.branch); // "main"
     * ```
     */
    async status() {
      // Implementation
    },

    /**
     * Create a commit
     *
     * @param {string} message - Commit message
     * @param {Object} [options] - Commit options
     * @param {boolean} [options.amend=false] - Amend previous commit
     * @returns {Promise<string>} Commit SHA
     * @throws {Error} If working tree is clean
     * @example
     * ```javascript
     * const sha = await git.commit("feat: add feature");
     * console.log(sha); // "abc123..."
     * ```
     */
    async commit(message, options = {}) {
      // Implementation
    }
  };
}
```
**Expected Outcome**: Well-documented API
**Verification**: JSDoc complete with examples

**Step 2.3: Write Examples**
```javascript
// examples/use-git-example.mjs
/**
 * Example: Using useGit composable for Git operations
 *
 * This example demonstrates:
 * - Creating a Git context
 * - Checking repository status
 * - Making commits
 * - Pushing changes
 */

import { withGitVan, useGit } from 'gitvan';
import { createContext } from './helpers.mjs';

async function example() {
  const context = await createContext({ repo: './my-repo' });

  await withGitVan(context, async () => {
    const git = useGit();

    // Check status
    const status = await git.status();
    console.log(`Current branch: ${status.branch}`);
    console.log(`Modified files: ${status.files.length}`);

    // Create commit
    if (status.files.length > 0) {
      const sha = await git.commit("feat: add new feature");
      console.log(`Created commit: ${sha}`);

      // Push to remote
      await git.push({ remote: 'origin', branch: status.branch });
      console.log('Pushed to remote');
    }
  });
}

example().catch(console.error);
```
**Expected Outcome**: Working example code
**Verification**: Example runs successfully

### Phase 3: Documentation Review

**Step 3.1: Self-Review Checklist**
```markdown
## Documentation Self-Review

### Content
- [ ] Accurate and up-to-date
- [ ] Clear and concise
- [ ] Appropriate level of detail
- [ ] Examples work as written
- [ ] No jargon or explained jargon
- [ ] Complete (covers all features)

### Structure
- [ ] Logical flow
- [ ] Proper headings hierarchy
- [ ] Table of contents (if long)
- [ ] Cross-references included
- [ ] "See Also" section added

### Technical
- [ ] Code examples tested
- [ ] Links all work
- [ ] Images load correctly
- [ ] Markdown properly formatted
- [ ] No spelling errors

### Accessibility
- [ ] Alt text for images
- [ ] Descriptive link text (not "click here")
- [ ] Proper heading structure
- [ ] Code blocks have language hints
```
**Expected Outcome**: Quality documentation
**Verification**: Checklist complete

**Step 3.2: Peer Review**
```bash
# Request documentation review
gh pr review --request @tech-writer

# Reviewers check:
# - Technical accuracy
# - Clarity
# - Completeness
# - Consistency with existing docs
```
**Expected Outcome**: Feedback received
**Verification**: Review comments addressed

**Step 3.3: Test Documentation**
```bash
# Run all code examples
./scripts/test-documentation.sh

# Check links
npm run docs:check-links

# Verify all examples work
cd examples/
for example in *.mjs; do
  echo "Testing $example"
  node "$example" || echo "FAILED: $example"
done
```
**Expected Outcome**: All examples work
**Verification**: No broken examples or links

### Phase 4: Changelog Maintenance

**Step 4.1: Update CHANGELOG.md**
```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New `useMyFeature` composable for advanced operations
- Support for custom templates in job definitions

### Changed
- Improved error messages in `useGit` composable
- Updated default timeout from 30s to 60s

### Fixed
- Fixed memory leak in template rendering
- Fixed race condition in lock acquisition

### Security
- Updated dependencies to patch CVE-2024-12345
- Improved input validation in CLI commands

## [4.0.0] - 2026-01-08

### Added
- Complete rewrite with 10-agent release system
- Comprehensive standardized work procedures
- Enhanced security scanning and monitoring

[Rest of changelog...]
```
**Expected Outcome**: Changelog current
**Verification**: All changes documented

**Step 4.2: Follow Changelog Conventions**
```bash
# Categories (in order):
# - Added: New features
# - Changed: Changes in existing functionality
# - Deprecated: Soon-to-be removed features
# - Removed: Removed features
# - Fixed: Bug fixes
# - Security: Security fixes

# Entry format:
# - Brief description of change
# - Reference to PR/issue if applicable
# - Breaking changes marked with ⚠️ BREAKING

# Example:
# ### Changed
# - ⚠️ BREAKING: Renamed `useTemplate` to `useTemplateEngine` (#123)
# - Improved performance of job execution by 50% (#124)
```
**Expected Outcome**: Consistent changelog
**Verification**: Format followed

### Phase 5: Publishing Documentation

**Step 5.1: Build Documentation**
```bash
# If using documentation generator
npm run docs:build

# Output to docs/ or dist/docs/
# Verify build successful
ls -la docs/
```
**Expected Outcome**: Documentation built
**Verification**: HTML files generated

**Step 5.2: Deploy Documentation**
```bash
# Deploy to GitHub Pages
npm run docs:deploy

# Or to custom domain
./scripts/deploy-docs.sh --env production

# Verify deployment
curl https://docs.gitvan.example.com | grep "GitVan Documentation"
```
**Expected Outcome**: Docs published
**Verification**: Accessible at public URL

**Step 5.3: Update Documentation Index**
```markdown
# GitVan Documentation

## Getting Started
- [Installation Guide](getting-started/installation.md)
- [Quick Start](getting-started/quick-start.md)
- [Configuration](getting-started/configuration.md)

## User Guide
- [Using Jobs](user-guide/jobs.md)
- [Using Templates](user-guide/templates.md)
- [Using Workflows](user-guide/workflows.md)

## Developer Guide
- [Architecture](developer-guide/architecture.md)
- [Composables](developer-guide/composables.md)
- [Testing](developer-guide/testing.md)

## API Reference
- [Composables API](api/composables.md)
- [CLI Reference](api/cli.md)
- [Configuration API](api/configuration.md)

## Standardized Work
- [All Procedures](standardized-work/README.md)
- [Development Workflow](standardized-work/01-DEVELOPMENT-WORKFLOW.md)
- [Testing Procedure](standardized-work/02-TESTING-PROCEDURE.md)
```
**Expected Outcome**: Documentation organized
**Verification**: Easy to navigate

### Phase 6: Documentation Maintenance

**Step 6.1: Monthly Link Validation**
```bash
# Check for broken links
npm run docs:check-links

# Or use external tool
wget --spider -r -nd -nv -o links.log https://docs.gitvan.example.com

# Review broken links
grep -B 2 "404" links.log

# Fix broken links
# Update documentation with correct links
```
**Expected Outcome**: No broken links
**Verification**: All links work

**Step 6.2: Quarterly Documentation Audit**
```markdown
## Documentation Audit Checklist

### Coverage
- [ ] All features documented
- [ ] All APIs documented
- [ ] All CLI commands documented
- [ ] Common errors documented

### Accuracy
- [ ] Examples still work
- [ ] Screenshots up to date
- [ ] Version numbers current
- [ ] Links all valid

### Quality
- [ ] Clear and concise
- [ ] No spelling errors
- [ ] Consistent terminology
- [ ] Proper grammar

### Organization
- [ ] Logical structure
- [ ] Easy to find information
- [ ] Good cross-referencing
- [ ] Search works well
```
**Expected Outcome**: Documentation health known
**Verification**: Audit complete

**Step 6.3: Deprecation Notices**
```markdown
## Deprecated Features

### useOldFunction (Deprecated in v4.0.0)

⚠️ **DEPRECATED**: This function will be removed in v5.0.0. Use `useNewFunction` instead.

**Migration**:
\```javascript
// Old (deprecated)
const result = useOldFunction({ option: true });

// New (recommended)
const result = useNewFunction({ option: true });
\```

See [Migration Guide](migration/v4-to-v5.md) for details.
```
**Expected Outcome**: Users warned of deprecations
**Verification**: Migration path clear

## Success Criteria

- [ ] All features documented
- [ ] API documentation complete
- [ ] Examples work correctly
- [ ] No broken links
- [ ] CHANGELOG current
- [ ] Documentation builds successfully
- [ ] Documentation published
- [ ] Peer review completed
- [ ] Users can find information easily

## Troubleshooting

### Issue: Documentation Build Fails
```bash
# Check for syntax errors
npm run docs:lint

# Validate markdown
npx markdownlint docs/**/*.md

# Check for missing files
npm run docs:build -- --verbose
```

### Issue: Examples Don't Work
```bash
# Test all examples
cd examples/
for example in *.mjs; do
  node "$example" 2>&1 | tee "$example.log"
done

# Fix broken examples
# Update code to match current API
```

### Issue: Users Can't Find Documentation
```bash
# Improve search
# Add more cross-references
# Better organize navigation
# Add FAQ section
# Create "Common Tasks" guide
```

## Documentation Standards

### Markdown Style
- Use ATX-style headers (`#` not `===`)
- One sentence per line (easy to diff)
- Code blocks with language hints
- Tables for structured data
- Lists for unordered items

### Code Examples
- Self-contained (can copy-paste and run)
- Include imports
- Show expected output
- Handle errors
- Use realistic data

### Tone
- Professional but friendly
- Active voice
- Present tense
- Second person ("you")
- Avoid jargon or explain it

## References
- [Keep a Changelog](https://keepachangelog.com/)
- [Semantic Versioning](https://semver.org/)
- [Write the Docs](https://www.writethedocs.org/)
- [Google Developer Documentation Style Guide](https://developers.google.com/style)

## Training Requirements
**Duration**: 2 hours
**Competency**: Can write clear documentation, follow templates, maintain changelog

## Revision History
| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-01-08 | 1.0 | Initial creation | GitVan Team |

---

**Remember**: Good documentation is as important as good code. If it's not documented, it doesn't exist.
