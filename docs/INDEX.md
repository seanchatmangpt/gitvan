# 📚 GitVan Documentation Hub

**Welcome to GitVan v2.2.0 documentation!** Use this guide to find exactly what you need—whether you're just starting out or diving deep into advanced topics.

---

## 🚀 Getting Started (Start Here!)

**New to GitVan?** Start with one of these:

### **5-Minute Quick Start**
→ [Quick Start Guide](./getting-started.md#quick-start)
- Install GitVan
- Initialize your first project
- Run your first job

### **Step-by-Step Tutorials**
→ [Complete Tutorials](./tutorials/index.md)
- [Tutorial 1: Getting Started](./getting-started.md#your-first-gitvan-job)
- [Tutorial 2: Auto-Scaffold a React App](./tutorials/index.md#tutorial-1-auto-scaffold-a-react-app)
- [Tutorial 3: Automated Release Notes](./tutorials/index.md#tutorial-2-automated-release-notes)
- [Tutorial 4: CI/CD Integration](./tutorials/index.md#tutorial-3-cicd-integration)

### **Interactive Examples**
→ [Code Examples & Playground](./playground/README.md)
- [Composables Examples](./examples/composables-examples.md)
- [Job Examples](./playground/job-examples.md)
- [Testing Examples](./testing-gitvan/examples.md)

---

## 📖 Learn by Topic

### **I want to...**

#### **Use GitVan Day-to-Day**
→ [How-To Guides](README-HOWTO.md)
- [How to Create Custom Workflows](./cookbook/README.md)
- [How to Define Custom Hooks](./getting-started.md#understanding-events-and-predicates)
- [How to Use the CLI](./cli/README.md)
- [How to Use Composables](./composables/quick-reference.md)
- [How to Run & Debug Tests](./testing-gitvan/getting-started.md)

#### **Understand Core Concepts**
→ [Explanations & Architecture](README-EXPLANATIONS.md)
- [What is Git-Native Automation?](./architecture/README.md#core-architecture-principles)
- [Understanding the Knowledge Hook Engine](./architecture/README.md#plugin-architecture-with-hooks)
- [Understanding Workflows & Jobs](./architecture/README.md#workflow-patterns-support)
- [How Configuration Works](./reference/configuration.md#configuration-file)
- [System Architecture Deep-Dive](./architecture/system-overview.md)

#### **Look Up Specific Syntax**
→ [Reference Documentation](README-REFERENCE.md)
- [CLI Commands Reference](./cli/README.md)
- [Composables API Reference](./api/composables.md)
- [Git API Reference](./composables/git-api.md)
- [Configuration Reference](./reference/configuration.md)
- [Hook Predicates Reference](./api/hooks-autonomous-intelligence.md)

#### **Migrate from Another Tool**
→ [Migration Guides](./migration/from-github-actions.md)
- [Migrate from GitHub Actions](./migration/from-github-actions.md)
- [Migrate from Husky](./migration/from-husky.md)

#### **Set Up Security**
→ [Security Guide](./security/README.md)
- [Security Model](./security/README.md#core-security-principles)
- [Access Control](./security/README.md#access-control-model)
- [Secrets Management](./security/README.md#secret-management)
- [Best Practices](./security/best-practices.md)

#### **Optimize Performance**
→ [Performance Guide](./performance/README.md)
- [Performance Benchmarks](./performance/README.md#performance-benchmarks)
- [Optimization Strategies](./performance/README.md#optimization-strategies)
- [Caching Mechanisms](./performance/README.md#caching-mechanisms)
- [Performance Tuning](./performance/tuning.md)

#### **Extend GitVan**
→ [Plugin Development](./plugins/README.md)
- [Plugin Architecture](./plugins/README.md#architecture)
- [Creating Plugins](./plugins/README.md#creating-your-first-plugin)
- [Plugin Examples](./plugins/examples.md)
- [Available Hooks](./plugins/hooks-reference.md)

#### **Develop with Packs**
→ [Pack Authoring Guide](./guides/pack-authoring.md)
- [Creating Packs](./guides/pack-authoring.md#creating-your-first-pack)
- [Pack Manifest Schema](./guides/pack-authoring.md#pack-manifest-schema)
- [Pack Development](./guides/pack-authoring.md#pack-development)
- [Pack Best Practices](./guides/pack-authoring.md#pack-best-practices)

#### **Test GitVan Applications**
→ [Testing Guide](./testing-gitvan/README.md)
- [Getting Started with Testing](./testing-gitvan/getting-started.md)
- [Core Testing Concepts](./testing-gitvan/core-concepts.md)
- [Local Testing](./testing-gitvan/local-testing.md)
- [Cleanroom Testing](./testing-gitvan/cleanroom-testing.md)
- [BDD Testing](./bdd/london-bdd-implementation.md)
- [Advanced Testing Patterns](./testing-gitvan/advanced-patterns.md)

#### **Test Behavior with BDD**
→ [London BDD Testing](./bdd/london-bdd-implementation.md)
- [BDD Structure](./bdd/london-bdd-implementation.md#bdd-structure)
- [Feature Files](./bdd/london-bdd-implementation.md#feature-files)
- [Step Definitions](./bdd/london-bdd-implementation.md#step-definitions)
- [Running BDD Tests](./bdd/london-bdd-implementation.md#running-bdd-tests)

---

## 🔍 Documentation Structure (Diataxis Framework)

This documentation follows the **Diataxis framework**, which organizes knowledge into four essential sections:

### 🎓 **Tutorials** (Learning-oriented)
**Step-by-step guides for learning by doing**
- [Getting Started Tutorial](./getting-started.md)
- [Tutorial Collection](./tutorials/index.md)
- [BDD Testing Tutorial](./bdd/london-bdd-implementation.md)
- [Playground Examples](./playground/README.md)

### 📝 **How-To Guides** (Problem-oriented)
**Practical guides for solving specific problems**
- [Cookbook: Practical Recipes](./cookbook/README.md)
- [Migration Guide: GitHub Actions to GitVan](./migration/from-github-actions.md)
- [Migration Guide: Husky to GitVan](./migration/from-husky.md)
- [Security Implementation Guide](./security/README.md)
- [Performance Tuning Guide](./performance/README.md)
- [Plugin Development Guide](./plugins/README.md)
- [Pack Authoring Guide](./guides/pack-authoring.md)
- [Testing Guide](./testing-gitvan/README.md)

### 📚 **Reference** (Information-oriented)
**Complete technical specifications and APIs**
- [CLI Commands Reference](./cli/README.md)
- [Composables API Reference](./api/composables.md)
- [Git API Reference](./composables/git-api.md)
- [Configuration Reference](./reference/configuration.md)
- [Hook Predicates Reference](./api/hooks-autonomous-intelligence.md)
- [Validation Reference](./validation/README.md)
- [Plugin Hooks Reference](./plugins/hooks-reference.md)

### 💭 **Explanations** (Understanding-oriented)
**Conceptual understanding and architecture**
- [Architecture Overview](./architecture/README.md)
- [System Architecture Deep-Dive](./architecture/system-overview.md)
- [Git-Native Design Philosophy](./architecture/README.md#core-architecture-principles)
- [Plugin Architecture](./architecture/README.md#plugin-architecture-with-hooks)
- [Configuration Deep-Dive](./reference/configuration.md)

---

## 🎯 Common Scenarios

### **I'm starting a new project with GitVan**
1. Read: [Getting Started Tutorial](./getting-started.md)
2. Choose: [A quick-start pack or template](./guides/pack-authoring.md)
3. Reference: [CLI Commands](./cli/README.md)
4. Learn: [Composables API](./api/composables.md)

### **I'm migrating from GitHub Actions**
1. Read: [Migration Guide: GitHub Actions to GitVan](./migration/from-github-actions.md)
2. Reference: [Conceptual Mapping](./migration/from-github-actions.md#conceptual-mapping)
3. Study: [Migration Examples](./migration/from-github-actions.md#migration-examples)
4. Learn: [How to Create Workflows](./cookbook/README.md)

### **I'm concerned about security**
1. Understand: [Security Model](./security/README.md#core-security-principles)
2. Read: [Best Practices](./security/best-practices.md)
3. Implement: [Access Control](./security/README.md#access-control-model)
4. Reference: [Compliance Guide](./security/compliance.md)

### **I need better performance**
1. Check: [Performance Benchmarks](./performance/README.md#performance-benchmarks)
2. Learn: [Optimization Strategies](./performance/README.md#optimization-strategies)
3. Implement: [Caching Mechanisms](./performance/README.md#caching-mechanisms)
4. Tune: [Performance Tuning Guide](./performance/tuning.md)

### **I want to extend GitVan**
1. Learn: [Plugin Architecture](./plugins/README.md#architecture)
2. Tutorial: [Creating Your First Plugin](./plugins/README.md#quick-start)
3. Reference: [Available Hooks](./plugins/hooks-reference.md)
4. Study: [Plugin Examples](./plugins/examples.md)

### **I want to create reusable packs**
1. Learn: [What are Packs?](./guides/pack-authoring.md#what-are-packs)
2. Follow: [Creating Your First Pack](./guides/pack-authoring.md#creating-your-first-pack)
3. Reference: [Pack Manifest Schema](./guides/pack-authoring.md#pack-manifest-schema)
4. Study: [Best Practices](./guides/pack-authoring.md#pack-best-practices)

### **I need to test my automation**
1. Learn: [Testing Concepts](./testing-gitvan/core-concepts.md)
2. Tutorial: [Getting Started with Testing](./testing-gitvan/getting-started.md)
3. Choose: [Local Testing](./testing-gitvan/local-testing.md) or [Cleanroom Testing](./testing-gitvan/cleanroom-testing.md)
4. Study: [Advanced Patterns](./testing-gitvan/advanced-patterns.md)

---

## 📊 Quick Reference Cards

### **CLI Cheat Sheet**
```bash
# Job management
gitvan job list
gitvan job run --name changelog

# Daemon
gitvan daemon start
gitvan daemon status

# Events
gitvan event list
gitvan event simulate --files "src/**"

# Cron
gitvan cron list
gitvan cron start
```
→ [Full CLI Reference](./cli/README.md)

### **Composables Cheat Sheet**
```javascript
import { useGit, useTemplate, useJob } from 'gitvan/composables';

const git = useGit();
const template = useTemplate();
const job = useJob();
```
→ [Composables API Reference](./api/composables.md)

### **Job Definition Template**
```javascript
export default {
  meta: { desc: 'My Job' },
  on: { pathChanged: ['src/**'] },
  async run({ payload, ctx }) {
    // Your automation logic
    return { ok: true };
  }
};
```
→ [Job Definition Tutorial](./getting-started.md#your-first-gitvan-job)

---

## 🆘 Troubleshooting & FAQ

### **Common Issues**
→ [Troubleshooting Guide](./tutorials/troubleshooting/README.md)
- [FAQ](./tutorials/troubleshooting/faq.md)
- [Common Errors](./tutorials/troubleshooting/common-errors.md)
- [Debug Tips](./tutorials/troubleshooting/debug-tips.md)

### **Performance Problems?**
→ [Performance Tuning](./performance/README.md)

### **Security Concerns?**
→ [Security Audit Report](./validation/SECURITY_AUDIT_REPORT.md)

### **Still Need Help?**
- Check: [Frequently Asked Questions](./tutorials/troubleshooting/faq.md)
- Search: [Full documentation search](#search) (top of every page)
- Ask: [GitHub Discussions](https://github.com/seanchatmangpt/gitvan/discussions)
- Report: [GitHub Issues](https://github.com/seanchatmangpt/gitvan/issues)

---

## 🌟 Quick Links

### **Key Documents**
- [Main README](../README.md) - Project overview and features
- [Getting Started](./getting-started.md) - Installation and first steps
- [Changelog](./CHANGELOG.md) - What's new in each version
- [Contributing Guide](../CONTRIBUTING.md) - How to contribute

### **External Resources**
- [GitHub Repository](https://github.com/seanchatmangpt/gitvan)
- [NPM Package](https://www.npmjs.com/package/gitvan)
- [Website](https://gitvan.dev)
- [Community Discussions](https://github.com/seanchatmangpt/gitvan/discussions)

---

## 📋 Documentation Map

```
docs/
├── INDEX.md ✨ (YOU ARE HERE)
├── README.md
├── CHANGELOG.md
│
├── 🎓 TUTORIALS
│   ├── getting-started.md
│   ├── tutorials/
│   │   └── index.md
│   ├── playground/
│   │   └── README.md
│   ├── examples/
│   │   └── composables-examples.md
│   └── bdd/
│       └── london-bdd-implementation.md
│
├── 📝 HOW-TO GUIDES
│   ├── cookbook/
│   │   └── README.md (recipe index)
│   ├── migration/
│   │   ├── from-github-actions.md
│   │   ├── from-husky.md
│   │   └── v2-upgrade.md
│   ├── security/
│   │   ├── README.md
│   │   ├── best-practices.md
│   │   └── compliance.md
│   ├── performance/
│   │   ├── README.md
│   │   └── tuning.md
│   ├── guides/
│   │   └── pack-authoring.md
│   ├── plugins/
│   │   ├── README.md
│   │   └── examples.md
│   └── testing-gitvan/
│       ├── README.md
│       ├── getting-started.md
│       └── ...
│
├── 📚 REFERENCE
│   ├── cli/
│   │   └── README.md
│   ├── api/
│   │   ├── composables.md
│   │   ├── hooks-autonomous-intelligence.md
│   │   ├── jobs.md
│   │   ├── git-8020.md
│   │   └── events.md
│   ├── composables/
│   │   ├── git-api.md
│   │   ├── index.md
│   │   └── quick-reference.md
│   ├── reference/
│   │   └── configuration.md
│   ├── validation/
│   │   └── README.md
│   └── plugins/
│       └── hooks-reference.md
│
├── 💭 EXPLANATIONS
│   ├── architecture/
│   │   ├── README.md
│   │   ├── system-overview.md
│   │   ├── adr-*.md (decisions)
│   │   └── patterns.md
│   └── reference/
│       └── configuration.md (deep-dive section)
│
└── 🎯 ADDITIONAL
    ├── tutorials/
    │   └── troubleshooting/
    │       ├── README.md
    │       ├── faq.md
    │       └── ...
    └── validation/
        ├── ESSENTIALS.md
        ├── QUICK_REFERENCE.md
        └── ...
```

---

## 🎓 Learning Path

### **Level 1: Beginner** (2-3 hours)
- [ ] Read: [Getting Started](./getting-started.md)
- [ ] Follow: Tutorial 1: Your First Job
- [ ] Try: Create a simple job in your project
- [ ] Reference: [CLI Commands](./cli/README.md)

### **Level 2: Intermediate** (4-6 hours)
- [ ] Follow: [How-To Guides](./cookbook/README.md)
- [ ] Choose 2-3 recipes to implement
- [ ] Read: [Plugin Architecture](./plugins/README.md)
- [ ] Create: Your first plugin

### **Level 3: Advanced** (8-12 hours)
- [ ] Study: [Architecture Overview](./architecture/README.md)
- [ ] Read: [Security Model](./security/README.md)
- [ ] Read: [Performance Guide](./performance/README.md)
- [ ] Create: Custom pack or advanced integration

### **Level 4: Expert** (16+ hours)
- [ ] Deep-dive: [System Architecture](./architecture/system-overview.md)
- [ ] Study: All API References
- [ ] Contribute: To GitVan core
- [ ] Share: Your plugins and packs with community

---

## ⭐ Best Practices

1. **Start with Tutorials** - Don't skip the learning phase
2. **Use How-To Guides** - For solving specific problems
3. **Keep References Handy** - For quick lookups
4. **Understand Concepts** - Read explanations to deepen knowledge
5. **Ask Questions** - Community is here to help

---

**Happy automating!** 🚀

*Last updated: 2024-01-15*
