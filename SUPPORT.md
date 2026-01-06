# Support

Need help with GitVan? This document provides guidance on how to get support.

## Documentation

Before reaching out for support, please check our comprehensive documentation:

### Quick Start

- **[README.md](README.md)** - Project overview and quick start
- **[Installation Guide](docs/installation.md)** - Detailed installation instructions
- **[Tutorials](docs/TUTORIALS.md)** - Step-by-step learning guides
- **[How-To Guides](docs/HOW-TO-GUIDES.md)** - Solve specific problems
- **[Reference](docs/REFERENCE.md)** - Complete API reference

### Advanced Topics

- **[Architecture](docs/80-20-ARCHITECTURE.md)** - System architecture
- **[Explanation](docs/EXPLANATION.md)** - Conceptual understanding
- **[Developer Guide](CLAUDE.md)** - For contributors

## Common Issues

### Installation Issues

**Problem**: `command not found: gitvan` after installation

**Solution**: See [Installation Troubleshooting](docs/installation.md#troubleshooting)

**Problem**: Permission denied during installation

**Solution**: See [Permission Issues](docs/installation.md#2-permission-denied-linuxmacos)

**Problem**: Node version incompatibility

**Solution**: GitVan requires Node.js 18+. See [Node Version](docs/installation.md#3-node-version-incompatibility)

### Usage Issues

**Problem**: Workflow not running

**Solution**:
1. Check workflow syntax: `gitvan workflow validate <name>`
2. Check workflow exists: `gitvan workflow list`
3. Check logs for errors

**Problem**: Git hooks not triggering

**Solution**:
1. Verify installation: `gitvan hook list`
2. Reinstall hook: `gitvan hook install <hook> <workflow>`
3. Check hook permissions: `ls -la .git/hooks/`

## Getting Help

### 1. Search Existing Issues

Before creating a new issue, search existing ones:

[Search Issues](https://github.com/seanchatmangpt/gitvan/issues)

Someone may have already encountered and solved your problem.

### 2. GitHub Discussions

For questions, ideas, or general discussion:

[GitHub Discussions](https://github.com/seanchatmangpt/gitvan/discussions)

**Use Discussions for**:
- Questions about how to use GitVan
- Feature ideas and brainstorming
- Showing off what you built
- General conversation

### 3. GitHub Issues

For bugs and feature requests:

[Create an Issue](https://github.com/seanchatmangpt/gitvan/issues/new/choose)

**Use Issues for**:
- Bug reports
- Feature requests
- Documentation improvements

**Before creating an issue**:
1. Search existing issues
2. Check documentation
3. Prepare detailed information

### 4. Stack Overflow

Tag your questions with `gitvan`:

[Stack Overflow - gitvan tag](https://stackoverflow.com/questions/tagged/gitvan)

**Best for**:
- How-to questions
- Troubleshooting specific errors
- Integration questions

## Bug Reports

When reporting a bug, include:

### Required Information

1. **GitVan Version**: `gitvan --version`
2. **Node.js Version**: `node --version`
3. **Operating System**: Linux/macOS/Windows + version
4. **Description**: Clear description of the bug
5. **Steps to Reproduce**: Exact steps to reproduce
6. **Expected Behavior**: What should happen
7. **Actual Behavior**: What actually happens

### Bug Report Template

```markdown
## Bug Description
[Clear description of the bug]

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- GitVan version: [output of `gitvan --version`]
- Node.js version: [output of `node --version`]
- OS: [Linux/macOS/Windows + version]
- Git version: [output of `git --version`]

## Additional Context
[Any other relevant information, logs, screenshots]

## Workflow File (if applicable)
```turtle
[Paste your workflow file here]
```

## Logs (if applicable)
```
[Paste relevant logs here]
```
```

## Feature Requests

We welcome feature suggestions!

### Feature Request Template

```markdown
## Feature Description
[Clear description of the proposed feature]

## Use Case
[Why is this feature needed? What problem does it solve?]

## Proposed Solution
[How should this feature work?]

## Alternatives Considered
[Other approaches you considered]

## Additional Context
[Any other relevant information, mockups, examples]
```

## Contributing

Want to contribute? See our [Contributing Guide](CONTRIBUTING.md).

### Ways to Contribute

- **Code**: Submit pull requests
- **Documentation**: Improve docs
- **Testing**: Report bugs, test features
- **Examples**: Share workflow examples
- **Support**: Help others in Discussions

## Response Times

We aim to respond to:

- **Critical bugs**: Within 24-48 hours
- **Other issues**: Within 3-5 days
- **Discussions**: Within 1 week
- **Pull requests**: Within 1 week

Note: GitVan is maintained by volunteers. Response times may vary.

## Community Guidelines

When seeking support:

- **Be respectful** and professional
- **Search first** before asking
- **Provide details** when reporting issues
- **Be patient** while waiting for responses
- **Thank contributors** for their help
- **Pay it forward** by helping others

## Security Issues

**Do not** report security vulnerabilities publicly.

Instead, email security concerns to:
[Add security email when available]

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We take security seriously and will respond promptly.

## Resources

### Official Resources

- **Website**: [GitHub Repository](https://github.com/seanchatmangpt/gitvan)
- **npm Package**: [npmjs.com/package/gitvan](https://www.npmjs.com/package/gitvan)
- **Documentation**: [docs/](docs/)
- **Changelog**: [CHANGELOG.md](CHANGELOG.md)

### Community Resources

- **Examples**: [examples/](examples/)
- **Packs**: [packs/](packs/)
- **Templates**: [templates/](templates/)

### External Resources

- **RDF/Turtle**: [W3C Turtle Specification](https://www.w3.org/TR/turtle/)
- **SPARQL**: [W3C SPARQL Specification](https://www.w3.org/TR/sparql11-query/)
- **Git Hooks**: [Git Hooks Documentation](https://git-scm.com/docs/githooks)

## Paid Support

Commercial support options coming soon.

For enterprise support inquiries:
[Add enterprise contact when available]

## Acknowledgments

Thank you for using GitVan! We appreciate your patience and understanding as we work to improve the project.

The GitVan Development Team
